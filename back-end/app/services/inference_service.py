import hashlib
from functools import lru_cache
from pathlib import Path
from tempfile import mkstemp

from ultralytics import YOLO

from app.core.config import settings


TUMOR_TYPES = ["glioma", "meningioma", "pituitary", None]
TUMOR_GRADES = ["grade II", "grade III", "grade IV"]
TUMOR_LOCATIONS = [
    "frontal lobe",
    "temporal lobe",
    "parietal lobe",
    "occipital lobe",
    "cerebellum",
]
TUMOR_SIZES = ["8 mm", "12 mm", "18 mm", "24 mm"]
TUMOR_VOLUMES = ["0.9 cm3", "1.6 cm3", "2.8 cm3", "4.1 cm3"]


class UnsupportedModelProviderError(Exception):
    pass


class ModelConfigurationError(Exception):
    pass


class InferenceInputError(Exception):
    pass


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
        tumor_grade = TUMOR_GRADES[digest[2] % len(TUMOR_GRADES)]
        tumor_location = TUMOR_LOCATIONS[digest[3] % len(TUMOR_LOCATIONS)]
        tumor_size = TUMOR_SIZES[digest[4] % len(TUMOR_SIZES)]
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
            "tumor_grade": tumor_grade,
            "tumor_location": tumor_location,
            "tumor_size": tumor_size,
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
        "tumor_grade": None,
        "tumor_location": None,
        "tumor_size": None,
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


def build_detection_response(result, file_name: str) -> dict:
    names = result.names or {}
    boxes = result.boxes
    if boxes is None or len(boxes) == 0:
        return {
            "result": "negative",
            "confidence": 0.0,
            "tumor_detected": False,
            "tumor_type": None,
            "tumor_grade": None,
            "tumor_location": None,
            "tumor_size": None,
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
            "tumor_grade": None,
            "tumor_location": None,
            "tumor_size": None,
            "tumor_volume": None,
            "bounding_box": None,
            "report_text": (
                f"The YOLO model did not confirm a tumor finding on {file_name}."
            ),
            "model_version": Path(settings.model_weights_path).name,
        }

    tumor_size = f"{width * 100:.1f}% x {height * 100:.1f}% of image"
    tumor_volume = f"approx. {(width * height) * 100:.1f}% image area"
    tumor_location = infer_region_label(x_center, y_center)

    return {
        "result": "positive",
        "confidence": confidence,
        "tumor_detected": True,
        "tumor_type": label,
        "tumor_grade": None,
        "tumor_location": tumor_location,
        "tumor_size": tumor_size,
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
        "tumor_grade": None,
        "tumor_location": None,
        "tumor_size": None,
        "tumor_volume": None,
        "bounding_box": None,
        "report_text": (
            f"YOLO classified {file_name} as {label} with {confidence}% confidence."
        ),
        "model_version": Path(settings.model_weights_path).name,
    }


def run_yolo_inference(*, file_bytes: bytes, file_name: str) -> dict:
    suffix = Path(file_name).suffix.lower()
    if suffix not in {".jpeg", ".jpg", ".png"}:
        raise InferenceInputError(
            "The current YOLO pipeline only supports PNG and JPEG MRI images.",
        )

    model = get_yolo_model()
    file_descriptor, temp_path = mkstemp(suffix=suffix)
    try:
        with open(file_descriptor, "wb") as temp_file:
            temp_file.write(file_bytes)
        results = model.predict(
            source=temp_path,
            conf=settings.model_confidence_threshold,
            verbose=False,
        )
    finally:
        Path(temp_path).unlink(missing_ok=True)

    if not results:
        raise InferenceInputError("The YOLO model returned no prediction.")

    first_result = results[0]
    if getattr(first_result, "probs", None) is not None:
        return build_classification_response(first_result, file_name)

    return build_detection_response(first_result, file_name)


def run_inference(*, file_bytes: bytes, file_name: str, file_type: str) -> dict:
    if settings.model_provider == "stub":
        return build_stub_response(
            file_bytes=file_bytes,
            file_name=file_name,
            file_type=file_type,
        )

    if settings.model_provider == "yolo":
        return run_yolo_inference(file_bytes=file_bytes, file_name=file_name)

    if settings.model_provider != "stub":
        raise UnsupportedModelProviderError(
            f"Unsupported MODEL_PROVIDER '{settings.model_provider}'.",
        )

    raise UnsupportedModelProviderError(
        f"Unsupported MODEL_PROVIDER '{settings.model_provider}'.",
    )