import base64
import hashlib
from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO
from pathlib import Path
from tempfile import NamedTemporaryFile

import numpy as np
from PIL import Image
from pydicom import dcmread
from pydicom.errors import InvalidDicomError
from ultralytics import YOLO

from app.core.config import settings


TUMOR_TYPES = ["glioma", "meningioma", "pituitary", None]
TUMOR_LOCATIONS = [
    "frontal lobe",
    "temporal lobe",
    "parietal lobe",
    "occipital lobe",
    "cerebellum",
]
TUMOR_VOLUMES = ["0.9 cm3", "1.6 cm3", "2.8 cm3", "4.1 cm3"]


class UnsupportedModelProviderError(Exception):
    pass


class ModelConfigurationError(Exception):
    pass


class InferenceInputError(Exception):
    pass


@dataclass(frozen=True)
class PhysicalScale:
    row_spacing_mm: float
    column_spacing_mm: float
    slice_thickness_mm: float | None = None


@lru_cache
def get_yolo_model() -> YOLO:
    weights_path = Path(settings.model_weights_path)
    if not weights_path.is_file():
        raise ModelConfigurationError(
            f"Model weights not found at '{weights_path}'.",
        )
    return YOLO(str(weights_path))


def build_stub_response(*, file_bytes: bytes, file_name: str, file_type: str) -> dict:
    digest = hashlib.sha256(file_bytes + file_name.encode("utf-8") + file_type.encode("utf-8")).digest()
    positive = digest[0] % 100 < 28

    if positive:
        tumor_type = TUMOR_TYPES[digest[1] % (len(TUMOR_TYPES) - 1)]
        tumor_location = TUMOR_LOCATIONS[digest[3] % len(TUMOR_LOCATIONS)]
        tumor_volume = TUMOR_VOLUMES[digest[5] % len(TUMOR_VOLUMES)]
        confidence = round(78 + (digest[6] / 255) * 20, 1)
        report_text = (
            "Suspicious intracranial lesion detected on the uploaded MRI. "
            f"Likely {tumor_type} located in the {tumor_location}. "
            "Clinical correlation and specialist review are recommended."
        )
        return {
            "result": "positive",
            "confidence": confidence,
            "tumor_detected": True,
            "tumor_type": tumor_type,
            "tumor_location": tumor_location,
            "tumor_volume": tumor_volume,
            "report_text": report_text,
            "model_version": "stub-heuristic-v1",
        }

    confidence = round(82 + (digest[6] / 255) * 17, 1)
    return {
        "result": "negative",
        "confidence": confidence,
        "tumor_detected": False,
        "tumor_type": None,
        "tumor_location": None,
        "tumor_volume": None,
        "report_text": (
            "No suspicious intracranial lesion was detected on the uploaded MRI. "
            "Clinical follow-up remains recommended when symptoms persist."
        ),
        "model_version": "stub-heuristic-v1",
    }


def is_positive_label(label: str) -> bool:
    normalized = label.strip().lower().replace("-", " ").replace("_", " ")
    negative_tokens = {
        "no",
        "none",
        "normal",
        "negative",
        "notumor",
        "no tumor",
        "healthy",
        "background",
    }
    return normalized not in negative_tokens and "no tumor" not in normalized


def infer_region_label(x_center: float, y_center: float) -> str:
    vertical = "upper" if y_center < 0.5 else "lower"
    horizontal = "left" if x_center < 0.5 else "right"
    return f"{vertical}-{horizontal} brain region"


def parse_positive_float(value) -> float | None:
    try:
        parsed_value = float(value)
    except (TypeError, ValueError):
        return None

    return parsed_value if parsed_value > 0 else None


def extract_physical_scale(dataset) -> PhysicalScale | None:
    for attribute_name in ("PixelSpacing", "ImagerPixelSpacing", "NominalScannedPixelSpacing"):
        spacing = getattr(dataset, attribute_name, None)
        if spacing is None or len(spacing) < 2:
            continue

        row_spacing_mm = parse_positive_float(spacing[0])
        column_spacing_mm = parse_positive_float(spacing[1])
        if row_spacing_mm is None or column_spacing_mm is None:
            continue

        return PhysicalScale(
            row_spacing_mm=row_spacing_mm,
            column_spacing_mm=column_spacing_mm,
            slice_thickness_mm=parse_positive_float(getattr(dataset, "SliceThickness", None)),
        )

    return None


def normalize_dicom_pixels(dataset) -> np.ndarray:
    try:
        pixel_array = dataset.pixel_array
    except Exception as exc:  # pragma: no cover - depends on transfer syntax support
        raise InferenceInputError(
            "The DICOM image could not be decoded into pixel data.",
        ) from exc

    if pixel_array.ndim == 4:
        pixel_array = pixel_array[0]
    if pixel_array.ndim == 3 and pixel_array.shape[-1] not in {3, 4}:
        pixel_array = pixel_array[0]
    if pixel_array.ndim == 3 and pixel_array.shape[0] in {3, 4} and pixel_array.shape[-1] not in {3, 4}:
        pixel_array = np.transpose(pixel_array, (1, 2, 0))

    pixel_array = pixel_array.astype(np.float32)
    rescale_slope = parse_positive_float(getattr(dataset, "RescaleSlope", 1)) or 1.0
    rescale_intercept = float(getattr(dataset, "RescaleIntercept", 0) or 0)
    pixel_array = (pixel_array * rescale_slope) + rescale_intercept

    pixel_min = float(pixel_array.min())
    pixel_max = float(pixel_array.max())
    if pixel_max <= pixel_min:
        return np.zeros(pixel_array.shape, dtype=np.uint8)

    pixel_array = (pixel_array - pixel_min) / (pixel_max - pixel_min)
    if str(getattr(dataset, "PhotometricInterpretation", "")).upper() == "MONOCHROME1":
        pixel_array = 1.0 - pixel_array

    pixel_array = np.clip(pixel_array * 255, 0, 255).astype(np.uint8)
    if pixel_array.ndim == 3 and pixel_array.shape[-1] == 1:
        pixel_array = pixel_array[:, :, 0]
    if pixel_array.ndim == 3 and pixel_array.shape[-1] > 3:
        pixel_array = pixel_array[:, :, :3]

    return pixel_array


def _normalize_frame(raw_frame: np.ndarray, *, rescale_slope: float, rescale_intercept: float, monochrome1: bool) -> np.ndarray:
    arr = raw_frame.astype(np.float32)
    arr = arr * rescale_slope + rescale_intercept
    mn, mx = float(arr.min()), float(arr.max())
    if mx > mn:
        arr = (arr - mn) / (mx - mn)
        if monochrome1:
            arr = 1.0 - arr
    else:
        arr = np.zeros_like(arr)
    arr = np.clip(arr * 255, 0, 255).astype(np.uint8)
    if arr.ndim == 3 and arr.shape[-1] == 1:
        arr = arr[:, :, 0]
    if arr.ndim == 3 and arr.shape[-1] > 3:
        arr = arr[:, :, :3]
    return arr


def extract_all_dicom_frames(dataset) -> list[np.ndarray]:
    """Return all slices of a DICOM dataset as a list of normalized uint8 arrays."""
    try:
        pixel_array = dataset.pixel_array
    except Exception as exc:  # pragma: no cover
        raise InferenceInputError(
            "The DICOM image could not be decoded into pixel data.",
        ) from exc

    rescale_slope = parse_positive_float(getattr(dataset, "RescaleSlope", 1)) or 1.0
    rescale_intercept = float(getattr(dataset, "RescaleIntercept", 0) or 0)
    monochrome1 = str(getattr(dataset, "PhotometricInterpretation", "")).upper() == "MONOCHROME1"

    # Determine raw frames list
    if pixel_array.ndim == 2:
        raw_frames = [pixel_array]
    elif pixel_array.ndim == 3:
        if pixel_array.shape[-1] in {3, 4}:
            # (H, W, C) — single RGB/RGBA frame
            raw_frames = [pixel_array]
        elif pixel_array.shape[0] in {3, 4} and pixel_array.shape[-1] not in {3, 4}:
            # (C, H, W) — single frame stored channel-first
            raw_frames = [np.transpose(pixel_array, (1, 2, 0))]
        else:
            # (N, H, W) — multi-frame grayscale
            raw_frames = [pixel_array[i] for i in range(pixel_array.shape[0])]
    elif pixel_array.ndim == 4:
        # (N, H, W, C) — multi-frame colour
        raw_frames = [pixel_array[i] for i in range(pixel_array.shape[0])]
    else:
        raw_frames = [pixel_array[0]]

    return [
        _normalize_frame(f, rescale_slope=rescale_slope, rescale_intercept=rescale_intercept, monochrome1=monochrome1)
        for f in raw_frames
    ]


def write_temp_input_file(*, suffix: str, file_bytes: bytes) -> str:
    with NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
        temp_file.write(file_bytes)
        return temp_file.name


def build_dicom_temp_image(file_bytes: bytes) -> tuple[str, PhysicalScale | None]:
    try:
        dataset = dcmread(BytesIO(file_bytes))
    except InvalidDicomError as exc:
        raise InferenceInputError("The uploaded DICOM file is invalid.") from exc

    image_array = normalize_dicom_pixels(dataset)
    image_mode = "L" if image_array.ndim == 2 else "RGB"

    with NamedTemporaryFile(suffix=".png", delete=False) as temp_file:
        Image.fromarray(image_array, mode=image_mode).save(temp_file, format="PNG")
        return temp_file.name, extract_physical_scale(dataset)


def build_dicom_temp_images(file_bytes: bytes) -> tuple[list[str], PhysicalScale | None]:
    """Convert every slice of a (possibly multi-frame) DICOM into a temp PNG.

    Returns a list of temp file paths and the shared physical scale.
    """
    try:
        dataset = dcmread(BytesIO(file_bytes))
    except InvalidDicomError as exc:
        raise InferenceInputError("The uploaded DICOM file is invalid.") from exc

    frames = extract_all_dicom_frames(dataset)
    physical_scale = extract_physical_scale(dataset)

    temp_paths: list[str] = []
    for frame_array in frames:
        image_mode = "L" if frame_array.ndim == 2 else "RGB"
        with NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            Image.fromarray(frame_array, mode=image_mode).save(tmp, format="PNG")
            temp_paths.append(tmp.name)

    return temp_paths, physical_scale


def format_cross_section_area(area_mm2: float) -> str:
    if area_mm2 >= 100:
        return f"approx. {area_mm2 / 100:.2f} cm2 cross-sectional area"

    return f"approx. {area_mm2:.1f} mm2 cross-sectional area"


def format_estimated_volume(volume_mm3: float) -> str:
    if volume_mm3 >= 1000:
        return f"approx. {volume_mm3 / 1000:.2f} cm3"

    return f"approx. {volume_mm3:.1f} mm3"


def build_detection_response(result, file_name: str, physical_scale: PhysicalScale | None = None) -> dict:
    names = result.names or {}
    boxes = result.boxes
    if boxes is None or len(boxes) == 0:
        return {
            "result": "negative",
            "confidence": 0.0,
            "tumor_detected": False,
            "tumor_type": None,
            "tumor_location": None,
            "tumor_volume": None,
            "bounding_box": None,
            "report_text": (
                "No lesion was detected by the YOLO model on the uploaded MRI image."
            ),
            "model_version": Path(settings.model_weights_path).name,
        }

    top_box = boxes[0]
    confidence = round(float(top_box.conf[0]) * 100, 1)
    class_index = int(top_box.cls[0])
    label = str(names.get(class_index, f"class_{class_index}"))
    positive = is_positive_label(label)
    x_center, y_center, width, height = [float(value) for value in top_box.xywhn[0]]

    if not positive or confidence < settings.model_confidence_threshold * 100:
        return {
            "result": "negative",
            "confidence": confidence,
            "tumor_detected": False,
            "tumor_type": None,
            "tumor_location": None,
            "tumor_volume": None,
            "bounding_box": None,
            "report_text": (
                f"The YOLO model did not confirm a tumor finding on {file_name}."
            ),
            "model_version": Path(settings.model_weights_path).name,
        }

    tumor_volume = f"approx. {(width * height) * 100:.1f}% image area"
    if physical_scale is not None and getattr(result, "orig_shape", None):
        image_height, image_width = result.orig_shape[:2]
        width_mm = width * image_width * physical_scale.column_spacing_mm
        height_mm = height * image_height * physical_scale.row_spacing_mm

        area_mm2 = width_mm * height_mm
        if physical_scale.slice_thickness_mm is not None:
            tumor_volume = format_estimated_volume(area_mm2 * physical_scale.slice_thickness_mm)
        else:
            tumor_volume = format_cross_section_area(area_mm2)

    tumor_location = infer_region_label(x_center, y_center)

    return {
        "result": "positive",
        "confidence": confidence,
        "tumor_detected": True,
        "tumor_type": label,
        "tumor_location": tumor_location,
        "tumor_volume": tumor_volume,
        "bounding_box": {
            "x": max(0.0, x_center - (width / 2)),
            "y": max(0.0, y_center - (height / 2)),
            "width": width,
            "height": height,
        },
        "report_text": (
            f"YOLO detected a suspected {label} with {confidence}% confidence in the {tumor_location}."
        ),
        "model_version": Path(settings.model_weights_path).name,
    }


def build_classification_response(result, file_name: str) -> dict:
    probs = result.probs
    if probs is None:
        raise InferenceInputError("The YOLO result did not contain probabilities.")

    names = result.names or {}
    class_index = int(probs.top1)
    confidence = round(float(probs.top1conf) * 100, 1)
    label = str(names.get(class_index, f"class_{class_index}"))
    positive = is_positive_label(label)

    return {
        "result": "positive" if positive else "negative",
        "confidence": confidence,
        "tumor_detected": positive,
        "tumor_type": label if positive else None,
        "tumor_location": None,
        "tumor_volume": None,
        "bounding_box": None,
        "report_text": (
            f"YOLO classified {file_name} as {label} with {confidence}% confidence."
        ),
        "model_version": Path(settings.model_weights_path).name,
    }


def run_yolo_inference(*, file_bytes: bytes, file_name: str) -> dict:
    model = get_yolo_model()
    suffix = Path(file_name).suffix.lower()

    if suffix in {".dcm", ".dicom"}:
        temp_paths, physical_scale = build_dicom_temp_images(file_bytes)
    elif suffix in {".jpeg", ".jpg", ".png"}:
        temp_paths = [write_temp_input_file(suffix=suffix, file_bytes=file_bytes)]
        physical_scale = None
    else:
        raise InferenceInputError(
            "The current YOLO pipeline only supports DICOM, PNG, and JPEG MRI images.",
        )

    best_result: dict | None = None

    for temp_path in temp_paths:
        try:
            results = model.predict(
                source=temp_path,
                conf=settings.model_confidence_threshold,
                verbose=False,
            )
        finally:
            Path(temp_path).unlink(missing_ok=True)

        if not results:
            continue

        first_result = results[0]
        if getattr(first_result, "probs", None) is not None:
            candidate = build_classification_response(first_result, file_name)
        else:
            candidate = build_detection_response(first_result, file_name, physical_scale)

        if best_result is None:
            best_result = candidate
        elif candidate["tumor_detected"] and not best_result["tumor_detected"]:
            # Prefer any positive finding over a negative one
            best_result = candidate
        elif candidate["tumor_detected"] and best_result["tumor_detected"] and candidate["confidence"] > best_result["confidence"]:
            # Among positives, keep the most confident
            best_result = candidate

    if best_result is None:
        raise InferenceInputError("The YOLO model returned no prediction.")

    return best_result


def run_inference(*, file_bytes: bytes, file_name: str, file_type: str) -> dict:
    if settings.model_provider == "stub":
        return build_stub_response(
            file_bytes=file_bytes,
            file_name=file_name,
            file_type=file_type,
        )

    if settings.model_provider == "yolo":
        return run_yolo_inference(file_bytes=file_bytes, file_name=file_name)

    raise UnsupportedModelProviderError(
        f"Unsupported MODEL_PROVIDER '{settings.model_provider}'.",
    )


def get_dicom_instance_number(file_bytes: bytes) -> int:
    """Return the DICOM InstanceNumber for slice ordering (0 if unavailable)."""
    try:
        dataset = dcmread(BytesIO(file_bytes), stop_before_pixels=True)
        return int(getattr(dataset, "InstanceNumber", 0) or 0)
    except Exception:
        return 0


SERIES_ACCEPTED_EXTENSIONS = {".dcm", ".dicom", ".png", ".jpg", ".jpeg"}

MAX_POSITIVE_SLICES = 10  # Maximum number of positive slices to store


def bytes_to_base64_data_uri(image_bytes: bytes) -> str:
    """Encode raw PNG/JPEG bytes to a base64 data URI."""
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def run_inference_series(*, files: list[tuple[bytes, str, str]]) -> dict:
    """Run inference on a series of images (DICOM, PNG, JPEG) and return the best result.

    Args:
        files: list of (file_bytes, file_name, file_type) tuples.
    """
    valid_files = [
        (fb, fn, ft)
        for fb, fn, ft in files
        if Path(fn).suffix.lower() in SERIES_ACCEPTED_EXTENSIONS
    ]
    if not valid_files:
        raise InferenceInputError(
            "No supported image files found in the uploaded series (DICOM, PNG, JPEG)."
        )

    def _sort_key(item: tuple[bytes, str, str]) -> tuple[int, int]:
        fn = item[1]
        if Path(fn).suffix.lower() in {".dcm", ".dicom"}:
            return (0, get_dicom_instance_number(item[0]))
        return (1, 0)

    sorted_files = sorted(valid_files, key=_sort_key)
    slice_count = len(sorted_files)

    if settings.model_provider == "stub":
        fb, fn, ft = sorted_files[0]
        result = build_stub_response(file_bytes=fb, file_name=fn, file_type=ft)
        old_report = result.get("report_text") or ""
        updated_report = old_report.replace(
            "uploaded MRI", f"image series ({slice_count} images)"
        )
        return {**result, "report_text": updated_report, "positive_slices": []}

    if settings.model_provider == "yolo":
        model = get_yolo_model()
        best_result: dict | None = None
        positive_candidates: list[dict] = []  # collect {result, image_bytes, file_name}

        for file_bytes, file_name, _ in sorted_files:
            suffix = Path(file_name).suffix.lower()
            if suffix in {".dcm", ".dicom"}:
                temp_paths, physical_scale = build_dicom_temp_images(file_bytes)
            else:
                temp_paths = [write_temp_input_file(suffix=suffix, file_bytes=file_bytes)]
                physical_scale = None

            for temp_path in temp_paths:
                try:
                    results = model.predict(
                        source=temp_path,
                        conf=settings.model_confidence_threshold,
                        verbose=False,
                    )
                    # Read image bytes before deleting temp file (for positive slice storage)
                    with open(temp_path, "rb") as fp:
                        frame_bytes = fp.read()
                finally:
                    Path(temp_path).unlink(missing_ok=True)

                if not results:
                    continue

                first_result = results[0]
                if getattr(first_result, "probs", None) is not None:
                    candidate = build_classification_response(first_result, file_name)
                else:
                    candidate = build_detection_response(first_result, file_name, physical_scale)

                if best_result is None:
                    best_result = candidate
                elif candidate["tumor_detected"] and not best_result["tumor_detected"]:
                    best_result = candidate
                elif (
                    candidate["tumor_detected"]
                    and best_result["tumor_detected"]
                    and candidate["confidence"] > best_result["confidence"]
                ):
                    best_result = candidate

                if candidate["tumor_detected"]:
                    positive_candidates.append({
                        "result": candidate,
                        "image_bytes": frame_bytes,
                        "file_name": file_name,
                    })

        if best_result is None:
            raise InferenceInputError("The YOLO model returned no prediction for the series.")

        # Sort positive slices by confidence (best first) and limit count
        positive_candidates.sort(key=lambda x: x["result"]["confidence"], reverse=True)
        top_candidates = positive_candidates[:MAX_POSITIVE_SLICES]
        positive_slices = [
            {
                "image_data": bytes_to_base64_data_uri(c["image_bytes"]),
                "file_name": c["file_name"],
                "confidence": c["result"]["confidence"],
                "tumor_type": c["result"]["tumor_type"],
                "tumor_location": c["result"]["tumor_location"],
                "bounding_box": c["result"]["bounding_box"],
            }
            for c in top_candidates
        ]

        old_report = best_result.get("report_text") or ""
        return {
            **best_result,
            "report_text": f"{old_report} (Series: {slice_count} images analyzed)",
            "positive_slices": positive_slices,
        }

    raise UnsupportedModelProviderError(
        f"Unsupported MODEL_PROVIDER '{settings.model_provider}'.",
    )