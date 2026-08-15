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
from pydicom.dataset import FileMetaDataset
from pydicom.errors import InvalidDicomError
from pydicom.uid import ExplicitVRLittleEndian, ImplicitVRLittleEndian
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


@dataclass
class SliceDetection:
    """One YOLO detection (or classification top-1) on a single slice."""
    slice_idx: int          # sequential index of the processed frame
    class_name: str         # tumour class label
    confidence: float       # 0.0 – 1.0
    # Normalised bounding box [0,1]. Classification models have no spatial
    # info — use (0, 0, 1, 1) as a sentinel for "whole image".
    x1: float
    y1: float
    x2: float
    y2: float


@dataclass
class DetectionCluster:
    """A group of spatially and temporally coherent tumour detections."""
    class_name: str
    detections: list  # list[SliceDetection]

    @property
    def slice_count(self) -> int:
        """Number of distinct slices that contain at least one detection."""
        return len({d.slice_idx for d in self.detections})

    @property
    def max_confidence(self) -> float:
        return max(d.confidence for d in self.detections)

    @property
    def avg_confidence(self) -> float:
        return sum(d.confidence for d in self.detections) / len(self.detections)

    @property
    def representative(self) -> "SliceDetection":
        """Highest-confidence detection — used for location / volume / bbox output."""
        return max(self.detections, key=lambda d: d.confidence)

    def score(self) -> float:
        """
        Cluster quality score:
            score = max_confidence × avg_confidence × log2(1 + slice_count)

        • max_confidence   : the model must have been confident at least once
                             (strong single-slice evidence is not discarded)
        • avg_confidence   : rewards consistent quality across all detections
        • log2(1+n)        : rewards spatial extent but with diminishing returns,
                             preventing large uncertain clusters from beating
                             small but highly-confident ones (e.g. meningioma
                             visible on 4 clear slices vs glioma noise on 15)
        """
        import math
        return self.max_confidence * self.avg_confidence * math.log2(1 + self.slice_count)


@lru_cache
def get_yolo_model() -> YOLO:
    weights_path = Path(settings.model_weights_path)
    if not weights_path.is_file():
        raise ModelConfigurationError(
            f"Model weights not found at '{weights_path}'.",
        )
    return YOLO(str(weights_path))


@lru_cache
def get_efficientnet_model():
    """Load the EfficientNetB0 Keras model for false-positive filtering.

    Uses the PyTorch backend (KERAS_BACKEND=torch) so that TensorFlow is not
    required — only the 'keras' package and the already-present 'torch' are
    needed.  The model is cached for the lifetime of the process.
    """
    import os
    os.environ.setdefault("KERAS_BACKEND", "torch")
    import keras  # lazy import — heavy, only loaded when EfficientNet is first needed

    path = Path(settings.efficientnet_weights_path)
    if not path.is_file():
        raise ModelConfigurationError(
            f"EfficientNet weights not found at '{path}'.",
        )
    return keras.models.load_model(str(path))


def _efficientnet_is_suspect(
    image_bytes: bytes,
    x1: float,
    y1: float,
    x2: float,
    y2: float,
) -> bool:
    """Pass the full MRI slice to EfficientNet to confirm or reject a YOLO detection.

    The model was trained on complete MRI images (not crops), so the full slice
    is resized to 224×224 and sent as-is.  The bounding box coordinates are
    accepted as parameters for API consistency but are not used for cropping.

    The model outputs a single sigmoid value:
      ≥ efficientnet_threshold  →  Suspect  (keep the YOLO detection)
      <  efficientnet_threshold  →  Healthy  (false positive — reject)

    Any error falls back to True (accept) so a broken EfficientNet never
    silently drops all detections.
    """
    try:
        img = Image.open(BytesIO(image_bytes)).convert("RGB").resize((224, 224), Image.LANCZOS)
        # The model includes an internal Rescaling layer and expects raw pixels
        # in [0, 255].  Do NOT divide by 255 here — the model handles it.
        arr = np.array(img, dtype=np.float32)
        arr = np.expand_dims(arr, axis=0)  # (1, 224, 224, 3)

        efficientnet = get_efficientnet_model()
        pred = float(efficientnet.predict(arr, verbose=0)[0][0])

        is_suspect = pred >= settings.efficientnet_threshold
        verdict = "Suspect ✓" if is_suspect else "Healthy — FP rejected"
        print(f"  [EfficientNet] pred={pred:.3f} → {verdict}")
        return is_suspect

    except Exception as exc:
        print(f"  [EfficientNet] validation error: {type(exc).__name__}: {exc} → accepting detection")
        return True  # fail-open: never silently discard when EfficientNet errors


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


def _ensure_transfer_syntax(dataset) -> None:
    """Inject a TransferSyntaxUID when missing (pydicom 3.x requires it).

    Files read with force=True that have no DICOM meta header lack
    TransferSyntaxUID, causing pixel_array to raise AttributeError.
    We detect the actual VR encoding pydicom used while reading the file
    (via dataset.read_implicit_vr) to pick the correct UID.
    """
    try:
        if dataset.file_meta.TransferSyntaxUID:
            return
    except AttributeError:
        pass

    if not hasattr(dataset, "file_meta") or dataset.file_meta is None:
        dataset.file_meta = FileMetaDataset()

    # read_implicit_vr reflects how pydicom actually decoded the file.
    # True  → Implicit VR Little Endian (old DICOM, no meta header)
    # False → Explicit VR Little Endian (modern DICOM, no meta header)
    # Missing → default to Implicit VR (the pre-1995 standard)
    if getattr(dataset, "read_implicit_vr", True):
        dataset.file_meta.TransferSyntaxUID = ImplicitVRLittleEndian
    else:
        dataset.file_meta.TransferSyntaxUID = ExplicitVRLittleEndian


def normalize_dicom_pixels(dataset) -> np.ndarray:
    _ensure_transfer_syntax(dataset)
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


def _normalize_frame(
    raw_frame: np.ndarray,
    *,
    rescale_slope: float,
    rescale_intercept: float,
    monochrome1: bool,
    window_center: float | None = None,
    window_width: float | None = None,
) -> np.ndarray:
    arr = raw_frame.astype(np.float32)
    arr = arr * rescale_slope + rescale_intercept

    # Apply Window Center / Window Width when available.
    # This matches the preprocessing used in analyze_patient.py during training,
    # ensuring inference images look the same as training images for EfficientNet.
    if window_center is not None and window_width is not None and window_width > 0:
        arr = np.clip(arr, window_center - window_width / 2, window_center + window_width / 2)

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


def _decode_pixel_array_raw(dataset) -> np.ndarray:
    """Raw-numpy fallback: decode uncompressed DICOM pixels without pydicom handlers.

    Works for all uncompressed transfer syntaxes (implicit/explicit VR, big/little
    endian) regardless of pydicom version quirks.  Raises AttributeError / ValueError
    if the dataset is missing required attributes or the data appears compressed.
    """
    rows = int(dataset.Rows)
    cols = int(dataset.Columns)
    bits = int(dataset.BitsAllocated)
    rep = int(getattr(dataset, "PixelRepresentation", 0))
    samples = int(getattr(dataset, "SamplesPerPixel", 1))

    dtype_map = {
        (8,  0): np.uint8,  (8,  1): np.int8,
        (16, 0): np.uint16, (16, 1): np.int16,
        (32, 0): np.uint32, (32, 1): np.int32,
    }
    dtype = dtype_map.get((bits, rep), np.uint16)

    raw = bytes(dataset.PixelData)
    bytes_per_px = bits // 8
    frame_bytes = rows * cols * samples * bytes_per_px
    if frame_bytes == 0:
        raise ValueError("Zero-sized frame (Rows/Columns/BitsAllocated is 0).")

    # Heuristic: if the raw data is much smaller than one uncompressed frame
    # the pixel data is likely compressed (encapsulated) — refuse to guess.
    if len(raw) < frame_bytes // 2:
        raise ValueError(
            f"PixelData too small ({len(raw)} B) for an uncompressed "
            f"{rows}x{cols} frame ({frame_bytes} B expected). "
            "Data may be compressed."
        )

    n_frames = max(1, len(raw) // frame_bytes)
    arr = np.frombuffer(raw[: n_frames * frame_bytes], dtype=dtype).copy()

    if samples == 1:
        return arr.reshape(n_frames, rows, cols) if n_frames > 1 else arr.reshape(rows, cols)
    return arr.reshape(n_frames, rows, cols, samples) if n_frames > 1 else arr.reshape(rows, cols, samples)


def extract_all_dicom_frames(dataset) -> list[np.ndarray]:
    """Return all slices of a DICOM dataset as a list of normalized uint8 arrays."""
    _ensure_transfer_syntax(dataset)

    pixel_array = None
    primary_exc: Exception | None = None

    # ── Attempt 1: standard pydicom handler pipeline ──────────────────────────
    try:
        pixel_array = dataset.pixel_array
    except Exception as exc:
        primary_exc = exc
        ts = getattr(getattr(dataset, "file_meta", None), "TransferSyntaxUID", "?")
        print(
            f"  [NeuroScan] pixel_array failed (TS={ts}) "
            f"{type(exc).__name__}: {exc}"
        )

    # ── Attempt 2: raw-numpy fallback (uncompressed only) ────────────────────
    if pixel_array is None:
        try:
            pixel_array = _decode_pixel_array_raw(dataset)
            print("  [NeuroScan] pixel_array: using raw-numpy fallback")
        except Exception as exc2:
            print(f"  [NeuroScan] raw fallback also failed: {type(exc2).__name__}: {exc2}")
            raise InferenceInputError(
                "The DICOM image could not be decoded into pixel data.",
            ) from primary_exc

    rescale_slope = parse_positive_float(getattr(dataset, "RescaleSlope", 1)) or 1.0
    rescale_intercept = float(getattr(dataset, "RescaleIntercept", 0) or 0)
    monochrome1 = str(getattr(dataset, "PhotometricInterpretation", "")).upper() == "MONOCHROME1"

    # Extract Window Center / Width for contrast normalisation (matches analyze_patient.py)
    window_center: float | None = None
    window_width: float | None = None
    _wc = getattr(dataset, "WindowCenter", None)
    _ww = getattr(dataset, "WindowWidth", None)
    if _wc is not None and _ww is not None:
        try:
            from pydicom.multival import MultiValue as _MV
            window_center = float(_wc[0] if isinstance(_wc, _MV) else _wc)
            window_width  = float(_ww[0] if isinstance(_ww, _MV) else _ww)
        except Exception:
            pass  # If parsing fails, fall back to global min-max

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
        _normalize_frame(
            f,
            rescale_slope=rescale_slope,
            rescale_intercept=rescale_intercept,
            monochrome1=monochrome1,
            window_center=window_center,
            window_width=window_width,
        )
        for f in raw_frames
    ]


def write_temp_input_file(*, suffix: str, file_bytes: bytes) -> str:
    with NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
        temp_file.write(file_bytes)
        return temp_file.name


def _raw_dicom_pixel_scan(file_bytes: bytes) -> np.ndarray | None:
    """Last-resort: scan the raw binary for standard DICOM pixel-data tags.

    Handles both Implicit VR and Explicit VR layouts, in Little-Endian and
    Big-Endian byte orders.  Works for files where pydicom stops parsing early.
    """
    import struct

    LONG_VRS = {b'OB', b'OD', b'OF', b'OL', b'OW', b'SQ', b'UC', b'UN', b'UR', b'UT'}

    def _read_uint_at(data: bytes, offset: int, size: int, big: bool) -> int | None:
        fmt = (">" if big else "<") + ("H" if size == 2 else "I")
        try:
            (v,) = struct.unpack_from(fmt, data, offset)
            return v
        except struct.error:
            return None

    def _is_vr(b0: int, b1: int) -> bool:
        """Two uppercase ASCII letters = Explicit VR marker."""
        return 65 <= b0 <= 90 and 65 <= b1 <= 90

    def _find_attr_uint16(data: bytes, tag: bytes, big: bool) -> int | None:
        """Search for a simple uint16 DICOM attribute in both VR modes."""
        idx = 0
        ec = ">" if big else "<"
        while True:
            pos = data.find(tag, idx)
            if pos == -1 or pos + 10 > len(data):
                break
            b4, b5 = data[pos + 4], data[pos + 5]
            try:
                if _is_vr(b4, b5):
                    # Explicit VR — short form (US/SS/…): length at +6 (2 B)
                    length, = struct.unpack_from(ec + "H", data, pos + 6)
                    val_off = pos + 8
                else:
                    # Implicit VR — length at +4 (4 B)
                    length, = struct.unpack_from(ec + "I", data, pos + 4)
                    val_off = pos + 8
                if length == 2:
                    (val,) = struct.unpack_from(ec + "H", data, val_off)
                    if val > 0:
                        return val
                if length == 4:
                    (val,) = struct.unpack_from(ec + "I", data, val_off)
                    if val > 0:
                        return val
            except struct.error:
                pass
            idx = pos + 1
        return None

    for big_endian in (False, True):
        ec = ">" if big_endian else "<"
        if big_endian:
            rows_tag   = b'\x00\x28\x00\x10'
            cols_tag   = b'\x00\x28\x00\x11'
            bits_tag   = b'\x00\x28\x01\x00'
            pixel_tag  = b'\x7F\xE0\x00\x10'
        else:
            rows_tag   = b'\x28\x00\x10\x00'
            cols_tag   = b'\x28\x00\x11\x00'
            bits_tag   = b'\x28\x00\x00\x01'
            pixel_tag  = b'\xE0\x7F\x10\x00'

        rows = _find_attr_uint16(file_bytes, rows_tag, big_endian)
        cols = _find_attr_uint16(file_bytes, cols_tag, big_endian)
        bits = _find_attr_uint16(file_bytes, bits_tag, big_endian) or 16

        if not (rows and cols):
            continue

        # Find last occurrence of pixel-data tag
        pix_pos = file_bytes.rfind(pixel_tag)
        if pix_pos == -1 or pix_pos + 8 > len(file_bytes):
            continue

        b4 = file_bytes[pix_pos + 4] if pix_pos + 4 < len(file_bytes) else 0
        b5 = file_bytes[pix_pos + 5] if pix_pos + 5 < len(file_bytes) else 0

        if _is_vr(b4, b5):
            vr_bytes = bytes([b4, b5])
            if vr_bytes in LONG_VRS:
                # Long Explicit VR: 2 reserved + 4-byte length
                length_val = _read_uint_at(file_bytes, pix_pos + 8, 4, big_endian)
                data_start = pix_pos + 12
            else:
                # Short Explicit VR: 2-byte length
                length_val = _read_uint_at(file_bytes, pix_pos + 6, 2, big_endian)
                data_start = pix_pos + 8
        else:
            # Implicit VR: 4-byte length
            length_val = _read_uint_at(file_bytes, pix_pos + 4, 4, big_endian)
            data_start = pix_pos + 8

        if length_val is None:
            continue

        if length_val == 0xFFFFFFFF:
            pixel_data = file_bytes[data_start:]
        else:
            pixel_data = file_bytes[data_start: data_start + length_val]

        bytes_per_px = bits // 8
        expected = rows * cols * bytes_per_px
        if len(pixel_data) < expected:
            print(
                f"  [NeuroScan] raw-scan: pixel buffer too small "
                f"({len(pixel_data)} B < {expected} B for {rows}x{cols} {bits}-bit)"
            )
            continue

        dtype_map = {8: np.uint8, 16: np.uint16, 32: np.uint32}
        dtype = dtype_map.get(bits, np.uint16)
        arr = np.frombuffer(
            pixel_data[:expected],
            dtype=np.dtype(f"{'>' if big_endian else '<'}u{dtype().itemsize}"),
        ).copy()
        try:
            return arr.reshape(rows, cols)
        except ValueError:
            continue

    return None


def build_dicom_temp_images(file_bytes: bytes) -> tuple[list[str], PhysicalScale | None]:
    """Convert every slice of a DICOM *or* plain image file into temp PNGs.

    Strategy
    --------
    1. Try pydicom (handles real DICOM files of any transfer syntax).
    2. If pydicom finds no pixel data, try Pillow (JPEG / PNG / TIFF / BMP …).
    3. If Pillow cannot identify the format, try a raw binary DICOM tag scan
       that searches for Rows / Columns / PixelData tags directly in the bytes.
       Handles both little-endian and big-endian implicit-VR layouts, and files
       where pydicom's sequential parser stops early.
    """
    # ── Attempt 1: pydicom ────────────────────────────────────────────────────
    _frames: list[np.ndarray] | None = None
    _physical_scale: PhysicalScale | None = None

    try:
        _dataset = dcmread(BytesIO(file_bytes), force=True)

        # Detect non-image DICOM files (SR, PR, KO, waveforms…) and fail fast
        # with a human-readable message instead of a confusing pixel-data error.
        _modality = str(getattr(_dataset, "Modality", "")).upper()
        _fm       = getattr(_dataset, "file_meta", None)
        _sop      = str(getattr(_fm, "MediaStorageSOPClassUID", ""))
        _NON_IMAGE_MODALITIES = {"SR", "PR", "KO", "AU", "BI", "DOC", "FID", "PLAN", "REG"}
        _NON_IMAGE_SOP_PREFIXES = (
            "1.2.840.10008.5.1.4.1.1.88",   # Structured Reports
            "1.2.840.10008.5.1.4.1.1.11",   # Presentation States
            "1.2.840.10008.5.1.4.1.1.9",    # Waveforms
        )
        _is_non_image = (
            _modality in _NON_IMAGE_MODALITIES
            or any(_sop.startswith(p) for p in _NON_IMAGE_SOP_PREFIXES)
        )
        if _is_non_image:
            raise InferenceInputError(
                f"Ce fichier DICOM est un rapport ou document (Modality={_modality or 'SR'}), "
                "pas une image IRM. Sélectionnez les fichiers d'images dans le bon dossier série."
            )

        _frames = extract_all_dicom_frames(_dataset)
        _physical_scale = extract_physical_scale(_dataset)
    except InferenceInputError:
        raise   # re-raise SR / non-image errors immediately — don't fall through
    except Exception:
        pass

    if _frames:
        temp_paths: list[str] = []
        for frame_array in _frames:
            image_mode = "L" if frame_array.ndim == 2 else "RGB"
            with NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                Image.fromarray(frame_array, mode=image_mode).save(tmp, format="PNG")
                temp_paths.append(tmp.name)
        return temp_paths, _physical_scale

    # ── Attempt 2: PIL (JPEG / PNG / TIFF / BMP / …) ─────────────────────────
    try:
        img = Image.open(BytesIO(file_bytes))
        if img.mode == "RGBA":
            img = img.convert("RGB")
        elif img.mode not in ("L", "RGB", "I", "F"):
            img = img.convert("L")
        arr = np.array(img)
        normalized = _normalize_frame(
            arr, rescale_slope=1.0, rescale_intercept=0.0, monochrome1=False
        )
        image_mode = "L" if normalized.ndim == 2 else "RGB"
        with NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            Image.fromarray(normalized, mode=image_mode).save(tmp, format="PNG")
            return [tmp.name], None
    except Exception:
        pass

    # ── Attempt 3: raw binary DICOM tag scan ──────────────────────────────────
    raw_arr = _raw_dicom_pixel_scan(file_bytes)
    if raw_arr is not None:
        normalized = _normalize_frame(
            raw_arr, rescale_slope=1.0, rescale_intercept=0.0, monochrome1=False
        )
        with NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            Image.fromarray(normalized, mode="L").save(tmp, format="PNG")
            print("  [NeuroScan] raw-scan succeeded")
            return [tmp.name], None

    # ── Attempt 4: embedded image scan ───────────────────────────────────────
    # JPEG-compressed DICOM stores pixel data as a raw JPEG/JPEG2000 stream
    # inside the binary.  pydicom fails when the transfer syntax is wrong/missing,
    # PIL fails because the DICOM preamble (zeros) is at offset 0.
    # Solution: find the first standard image magic bytes and decode from there.
    _IMAGE_MAGICS = [
        (b"\xFF\xD8\xFF", ".jpg"),   # JPEG / JPEG-LS / JPEG 2000 wrapper
        (b"\x89PNG",       ".png"),
        (b"II*\x00",       ".tif"),  # TIFF little-endian
        (b"MM\x00*",       ".tif"),  # TIFF big-endian
        (b"\x00\x00\x00\x0C\x6A\x50\x20\x20", ".jp2"),  # JPEG 2000
    ]
    for magic, _ext in _IMAGE_MAGICS:
        img_start = file_bytes.find(magic)
        if img_start < 0:
            continue
        print(f"  [NeuroScan] found {_ext[1:].upper()} magic at offset {img_start} — trying PIL")
        try:
            img = Image.open(BytesIO(file_bytes[img_start:]))
            img.load()
            if img.mode == "RGBA":
                img = img.convert("RGB")
            elif img.mode not in ("L", "RGB", "I", "F"):
                img = img.convert("L")
            arr = np.array(img)
            normalized = _normalize_frame(
                arr, rescale_slope=1.0, rescale_intercept=0.0, monochrome1=False
            )
            image_mode = "L" if normalized.ndim == 2 else "RGB"
            with NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                Image.fromarray(normalized, mode=image_mode).save(tmp, format="PNG")
                print(f"  [NeuroScan] embedded-{_ext[1:].upper()} decode succeeded")
                return [tmp.name], None
        except Exception as _emb_exc:
            print(f"  [NeuroScan] embedded-{_ext[1:].upper()} decode failed: {_emb_exc}")

    _magic_found = {
        name: file_bytes.find(magic) for magic, name in [
            (b"\xFF\xD8\xFF", "JPEG"),
            (b"\x89PNG",       "PNG"),
            (b"DICM",          "DICM"),
        ]
    }
    raise InferenceInputError(
        "Le fichier ne peut pas être décodé : ni DICOM, ni image standard, "
        "ni extraction binaire, ni image embarquée. "
        f"[sz={len(file_bytes)} magic={_magic_found}]"
    )


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


def bytes_to_base64_data_uri(image_bytes: bytes) -> str:
    encoded = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def _apply_slice_continuity_filter(
    per_slice: list[tuple[int, dict]],
) -> list[tuple[int, dict]]:
    """Discard isolated positive detections to reduce false positives.

    A positive detection on slice *i* is kept only when at least one other
    positive detection exists within ±2 slice indices (direct neighbour or
    one empty slice in between).  Negative slices always pass through.
    """
    positive_indices = {idx for idx, r in per_slice if r["tumor_detected"]}

    def _has_neighbor(idx: int) -> bool:
        return any(j != idx and abs(j - idx) <= 2 for j in positive_indices)

    return [
        (idx, r)
        for idx, r in per_slice
        if not r["tumor_detected"] or _has_neighbor(idx)
    ]


def run_yolo_inference(*, file_bytes: bytes, file_name: str) -> dict:
    model = get_yolo_model()
    name = Path(file_name).name
    suffix = Path(name).suffix.lower()

    # DICOM files with extension OR with no extension at all (e.g. IMG00001)
    # also accept UID-style names such as 1.2.840.113619... that contain dots but no real file extension.
    if suffix in {".dcm", ".dicom"} or suffix == "":
        temp_paths, physical_scale = build_dicom_temp_images(file_bytes)
    elif suffix in {".jpeg", ".jpg", ".png"}:
        temp_paths = [write_temp_input_file(suffix=suffix, file_bytes=file_bytes)]
        physical_scale = None
    else:
        parts = [part for part in name.split(".") if part]
        if len(parts) >= 3 and all(part.isdigit() for part in parts):
            temp_paths, physical_scale = build_dicom_temp_images(file_bytes)
        else:
            raise InferenceInputError(
                "The current YOLO pipeline only supports DICOM, PNG, and JPEG MRI images.",
            )

    per_slice_results: list[tuple[int, dict]] = []
    preview_image_data: str | None = None

    for slice_idx, temp_path in enumerate(temp_paths):
        try:
            results = model.predict(
                source=temp_path,
                conf=settings.model_confidence_threshold,
                verbose=False,
            )
            with open(temp_path, "rb") as fp:
                frame_bytes = fp.read()
            if preview_image_data is None:
                preview_image_data = bytes_to_base64_data_uri(frame_bytes)
        finally:
            Path(temp_path).unlink(missing_ok=True)

        if not results:
            continue

        first_result = results[0]
        if getattr(first_result, "probs", None) is not None:
            candidate = build_classification_response(first_result, file_name)
        else:
            candidate = build_detection_response(first_result, file_name, physical_scale)
            # ── Stage 2: EfficientNet false-positive filter ───────────────────
            # YOLO detected a tumour region → validate with EfficientNet.
            # If EfficientNet classifies the crop as Healthy, the detection is
            # discarded as a false positive.
            if candidate["tumor_detected"] and candidate.get("bounding_box") is not None:
                bb = candidate["bounding_box"]
                ef_x1 = bb["x"]
                ef_y1 = bb["y"]
                ef_x2 = ef_x1 + bb["width"]
                ef_y2 = ef_y1 + bb["height"]
                if not _efficientnet_is_suspect(frame_bytes, ef_x1, ef_y1, ef_x2, ef_y2):
                    candidate = {
                        "result": "negative",
                        "confidence": candidate["confidence"],
                        "tumor_detected": False,
                        "tumor_type": None,
                        "tumor_location": None,
                        "tumor_volume": None,
                        "bounding_box": None,
                        "report_text": (
                            f"YOLO flagged a suspected {candidate['tumor_type']} but "
                            "EfficientNet classified the region as Healthy "
                            "(false positive rejected)."
                        ),
                        "model_version": candidate["model_version"],
                    }

        per_slice_results.append((slice_idx, candidate))

    if not per_slice_results:
        raise InferenceInputError("The YOLO model returned no prediction.")

    # Apply temporal continuity filter on multi-slice inputs (DICOM) only.
    # A positive detection is kept only when another positive exists within
    # ±2 slice indices; isolated detections are discarded as false positives.
    if len(temp_paths) > 1:
        per_slice_results = _apply_slice_continuity_filter(per_slice_results)

    best_result: dict | None = None
    for _, candidate in per_slice_results:
        if best_result is None:
            best_result = candidate
        elif candidate["tumor_detected"] and not best_result["tumor_detected"]:
            best_result = candidate
        elif candidate["tumor_detected"] and best_result["tumor_detected"] and candidate["confidence"] > best_result["confidence"]:
            best_result = candidate

    if best_result is None:
        raise InferenceInputError("The YOLO model returned no prediction.")

    return {**best_result, "preview_image_data": preview_image_data}


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
        dataset = dcmread(BytesIO(file_bytes), stop_before_pixels=True, force=True)
        return int(getattr(dataset, "InstanceNumber", 0) or 0)
    except Exception:
        return 0


SERIES_ACCEPTED_EXTENSIONS = {".dcm", ".dicom", ".ima", ".png", ".jpg", ".jpeg"}

MAX_POSITIVE_SLICES = 500  # Maximum number of positive slices to expose in the UI
SERIES_CONFIDENCE_THRESHOLD = 45.0  # Minimum per-image confidence (%) to count a detection toward the cumulative vote
SERIES_INTEREST_THRESHOLD = 15.0    # Minimum confidence (%) to include a slice in the "slices of interest" display
YOLO_COVERAGE_THRESHOLD = 0.60      # If YOLO flags > 60% of frames as tumour, series is positive (bypasses EfficientNet)
YOLO_COVERAGE_MIN_FRAMES = 10       # Minimum frames processed to apply the coverage track
TUMOR_RATIO_SUSPICIOUS_THRESHOLD = 6.0  # (legacy — kept for reference)
MAX_SERIES_SLICES_TO_PROCESS = 40  # Uniform sample across the full series — balances accuracy and response time
MAX_PACS_SLICES_PER_SERIES: int = 500  # Max slices stored for the PACS viewer (independent of YOLO inference limit)

# ── Cluster-based decision thresholds ──────────────────────────────────────────
# Per-detection minimum confidence to enter the clustering pipeline.
# Detections below this value are considered noise and are discarded.
CLUSTER_MIN_CONFIDENCE: float = 0.20

# Two detections can belong to the same cluster only if they are on slices
# whose sequential indices differ by at most this value.
CLUSTER_MAX_SLICE_GAP: int = 2

# Minimum IoU between bounding boxes for two detections to be considered
# the same lesion.  A low threshold is intentional: tumours shift slightly
# between adjacent slices.
CLUSTER_BBOX_IOU_THRESHOLD: float = 0.05

# Maximum normalised Euclidean distance between bounding-box centres.
# Used as a fallback when IoU is low (e.g. small boxes that barely overlap).
CLUSTER_BBOX_CENTER_MAX_DIST: float = 0.35

# A cluster must span at least this many distinct slices to be considered valid.
CLUSTER_MIN_SLICES: int = 2

# A cluster must have at least this mean confidence to be considered valid.
CLUSTER_MIN_AVG_CONFIDENCE: float = 0.35


def is_supported_series_file(file_name: str) -> bool:
    name = Path(file_name).name
    suffix = Path(name).suffix.lower()
    if suffix in SERIES_ACCEPTED_EXTENSIONS or suffix == "":
        return True

    parts = [part for part in name.split(".") if part]
    if len(parts) >= 3 and all(part.isdigit() for part in parts):
        return True

    return False


# ═══════════════════════════════════════════════════════════════════════════════
# Cluster-based decision algorithm — Step 1: collect detections from YOLO output
# ═══════════════════════════════════════════════════════════════════════════════

def _collect_slice_detections(
    yolo_result,
    slice_idx: int,
    names: dict,
) -> list:  # list[SliceDetection]
    """
    Extract tumour-positive detections from one slice's YOLO result.

    Handles both detection models (bounding boxes) and classification models
    (probabilities).  NO_tumor predictions are discarded here — they never
    enter the clustering pipeline.

    For classification results, every tumour class whose probability exceeds
    CLUSTER_MIN_CONFIDENCE is recorded so that weak but consistent signals
    across many slices can accumulate into a valid cluster.
    """
    detections: list = []

    if getattr(yolo_result, "probs", None) is not None:
        # ── Classification model ──────────────────────────────────────────
        # Only the top-1 TUMOUR class per slice enters the pipeline.
        #
        # Using ALL classes above a threshold was the root cause of the
        # glioma-vs-meningioma confusion: "runner-up" classes (e.g. glioma at
        # 0.35 on a meningioma slice) accumulated across every slice and could
        # outscore the true class whose detections were fewer but stronger.
        #
        # Algorithm:
        #   1. Filter out NO_tumor predictions.
        #   2. Among remaining tumour classes, pick the one with the highest
        #      probability (the model's best tumour guess for this slice).
        #   3. Add it only if its confidence ≥ CLUSTER_MIN_CONFIDENCE so that
        #      very uncertain slices do not add noise.
        probs_list = yolo_result.probs.data.tolist()
        tumor_probs = [
            (float(prob), class_idx)
            for class_idx, prob in enumerate(probs_list)
            if is_positive_label(str(names.get(class_idx, f"class_{class_idx}")))
        ]
        if tumor_probs:
            best_conf, best_cls_idx = max(tumor_probs, key=lambda t: t[0])
            if best_conf >= CLUSTER_MIN_CONFIDENCE:
                class_name = str(names.get(best_cls_idx, f"class_{best_cls_idx}"))
                # No spatial info for classification → sentinel "whole image" bbox
                detections.append(SliceDetection(
                    slice_idx=slice_idx, class_name=class_name,
                    confidence=best_conf, x1=0.0, y1=0.0, x2=1.0, y2=1.0,
                ))
    else:
        # ── Detection model (bounding boxes) ─────────────────────────────
        boxes = yolo_result.boxes
        if boxes is None or len(boxes) == 0:
            return detections
        for box in boxes:
            conf = float(box.conf[0])
            if conf < CLUSTER_MIN_CONFIDENCE:
                continue
            class_idx = int(box.cls[0])
            class_name = str(names.get(class_idx, f"class_{class_idx}"))
            if not is_positive_label(class_name):
                continue
            x1, y1, x2, y2 = [float(v) for v in box.xyxyn[0]]
            detections.append(SliceDetection(
                slice_idx=slice_idx, class_name=class_name,
                confidence=conf, x1=x1, y1=y1, x2=x2, y2=y2,
            ))

    return detections


# ── Step 2: spatial compatibility helpers ────────────────────────────────────

def _compute_iou(a: SliceDetection, b: SliceDetection) -> float:
    """Intersection-over-Union of two normalised bounding boxes."""
    ix1, iy1 = max(a.x1, b.x1), max(a.y1, b.y1)
    ix2, iy2 = min(a.x2, b.x2), min(a.y2, b.y2)
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    union = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter
    return inter / union if union > 0 else 0.0


def _compute_center_dist(a: SliceDetection, b: SliceDetection) -> float:
    """Euclidean distance between the centres of two normalised bounding boxes."""
    cxa, cya = (a.x1 + a.x2) / 2, (a.y1 + a.y2) / 2
    cxb, cyb = (b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2
    return ((cxa - cxb) ** 2 + (cya - cyb) ** 2) ** 0.5


def _bbox_compatible(a: SliceDetection, b: SliceDetection) -> bool:
    """
    Return True if two detections likely correspond to the same lesion.

    Uses IoU as primary criterion and centre distance as fallback (IoU can
    be low for small boxes that are nonetheless spatially close).
    Whole-image bboxes (classification model sentinel) are always compatible.
    """
    # Classification model — no spatial information, always spatially compatible
    if a.x1 == 0.0 and a.x2 == 1.0 and a.y1 == 0.0 and a.y2 == 1.0:
        return True
    if b.x1 == 0.0 and b.x2 == 1.0 and b.y1 == 0.0 and b.y2 == 1.0:
        return True
    return (
        _compute_iou(a, b) >= CLUSTER_BBOX_IOU_THRESHOLD
        or _compute_center_dist(a, b) <= CLUSTER_BBOX_CENTER_MAX_DIST
    )


# ── Step 3: build clusters ───────────────────────────────────────────────────

def cluster_detections(detections: list) -> list:  # list[DetectionCluster]
    """
    Greedy clustering algorithm.

    A detection joins the most-recently-updated compatible cluster if:
    • same tumour class,
    • slice-index gap ≤ CLUSTER_MAX_SLICE_GAP,
    • bounding boxes are spatially compatible.

    Otherwise a new cluster is opened.

    Detections are processed in ascending slice-index order so that the
    "latest detection" of each cluster always represents its current frontier.
    """
    if not detections:
        return []

    # Sort ascending by slice index; break ties by descending confidence
    sorted_dets = sorted(detections, key=lambda d: (d.slice_idx, -d.confidence))
    clusters: list = []

    for det in sorted_dets:
        best_cluster = None
        best_gap = CLUSTER_MAX_SLICE_GAP + 1  # sentinel

        for cluster in clusters:
            if cluster.class_name != det.class_name:
                continue
            latest = max(cluster.detections, key=lambda d: d.slice_idx)
            gap = det.slice_idx - latest.slice_idx
            if gap < 0 or gap > CLUSTER_MAX_SLICE_GAP:
                continue
            if not _bbox_compatible(latest, det):
                continue
            # Prefer the cluster whose frontier is closest to this detection
            if gap < best_gap:
                best_gap = gap
                best_cluster = cluster

        if best_cluster is not None:
            best_cluster.detections.append(det)
        else:
            clusters.append(DetectionCluster(class_name=det.class_name, detections=[det]))

    return clusters


# ── Step 4: score and filter clusters ────────────────────────────────────────

def score_and_filter_clusters(clusters: list) -> list:  # list[DetectionCluster]
    """
    Retain only clusters that meet the minimum validity criteria:
    • at least CLUSTER_MIN_SLICES distinct slices,
    • average confidence ≥ CLUSTER_MIN_AVG_CONFIDENCE.

    Returns valid clusters sorted by score (best first).
    """
    valid = [
        c for c in clusters
        if c.slice_count >= CLUSTER_MIN_SLICES
        and c.avg_confidence >= CLUSTER_MIN_AVG_CONFIDENCE
    ]
    return sorted(valid, key=lambda c: c.score(), reverse=True)


# ── Step 5: build the final result dict from the best cluster ─────────────────

def _build_cluster_result(
    best: DetectionCluster,
    physical_scale: PhysicalScale | None,
    total_slices: int,
    model_path: str,
) -> dict:
    """Convert the winning cluster into the standard inference-result dictionary."""
    rep = best.representative
    confidence_pct = round(best.avg_confidence * 100, 1)
    is_classification = rep.x1 == 0.0 and rep.x2 == 1.0 and rep.y1 == 0.0 and rep.y2 == 1.0

    tumor_location = infer_region_label((rep.x1 + rep.x2) / 2, (rep.y1 + rep.y2) / 2)

    if is_classification:
        tumor_volume = "N/A (classification model — no spatial data)"
        bounding_box = None
    else:
        w = rep.x2 - rep.x1
        h = rep.y2 - rep.y1
        tumor_volume = f"approx. {w * h * 100:.1f}% image area"
        if physical_scale is not None:
            area_mm2 = (w * physical_scale.column_spacing_mm) * (h * physical_scale.row_spacing_mm)
            if physical_scale.slice_thickness_mm is not None:
                tumor_volume = format_estimated_volume(area_mm2 * physical_scale.slice_thickness_mm)
            else:
                tumor_volume = format_cross_section_area(area_mm2)
        bounding_box = {
            "x": max(0.0, rep.x1),
            "y": max(0.0, rep.y1),
            "width": w,
            "height": h,
        }

    return {
        "result": "positive",
        "confidence": confidence_pct,
        "tumor_detected": True,
        "tumor_type": best.class_name,
        "tumor_location": tumor_location,
        "tumor_volume": tumor_volume,
        "bounding_box": bounding_box,
        "report_text": (
            f"Cluster-based analysis identified a {best.class_name} spanning "
            f"{best.slice_count} slice(s) out of {total_slices} analysed "
            f"(avg confidence {confidence_pct:.1f}%, peak {best.max_confidence * 100:.1f}%). "
            f"Lesion localised to the {tumor_location}. "
            "Clinical correlation and specialist review are recommended."
        ),
        "model_version": Path(model_path).name,
    }


def run_inference_series(*, files: list[tuple[bytes, str, str]]) -> dict:
    """Run inference on a series of images (DICOM, PNG, JPEG) and return the best result.

    Args:
        files: list of (file_bytes, file_name, file_type) tuples.
    """
    valid_files = [
        (fb, fn, ft)
        for fb, fn, ft in files
        if is_supported_series_file(fn)
    ]
    if not valid_files:
        raise InferenceInputError(
            "No supported image files found in the uploaded series (DICOM, PNG, JPEG)."
        )

    def _sort_key(item: tuple[bytes, str, str]) -> tuple[int, int, str]:
        fn = item[1]
        sfx = Path(fn).suffix.lower()
        name = Path(fn).name
        if sfx in {".dcm", ".dicom", ".ima"} or sfx == "":
            return (0, get_dicom_instance_number(item[0]), name)
        return (1, 0, name)

    sorted_files = sorted(valid_files, key=_sort_key)
    slice_count = len(sorted_files)
    all_sorted_for_pacs = sorted_files  # full list kept for PACS viewer (before YOLO sampling)

    # Sample uniformly across the series so we cover the full volume even for large series.
    # e.g. 320 images → step=8 → 40 evenly-spaced slices analysed.
    step = 1  # sampling step — used to compute real position in the original series
    if slice_count > MAX_SERIES_SLICES_TO_PROCESS:
        step = max(1, slice_count // MAX_SERIES_SLICES_TO_PROCESS)
        sorted_files = sorted_files[::step][:MAX_SERIES_SLICES_TO_PROCESS]

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
        # Slices where any tumour is detected with confidence > SERIES_INTEREST_THRESHOLD
        interest_slices: list = []
        yolo_tumor_frames: int = 0       # frames where YOLO detected tumour (before EfficientNet)
        yolo_only_slices: list = []      # all YOLO-flagged slices, used for coverage-track result
        preview_image_data: str | None = None
        physical_scale: PhysicalScale | None = None
        frame_idx = 0  # sequential index across all processed frames
        _skip_diag: list[str] = []  # diagnostic bytes for skipped files

        for file_loop_idx, (file_bytes, file_name, _) in enumerate(sorted_files):
            suffix = Path(file_name).suffix.lower()
            name = Path(file_name).name
            uid_parts = [p for p in name.split(".") if p]
            is_uid_dicom = len(uid_parts) >= 3 and all(p.isdigit() for p in uid_parts)

            try:
                if suffix in {".dcm", ".dicom", ".ima"} or suffix == "" or is_uid_dicom:
                    temp_paths, file_physical_scale = build_dicom_temp_images(file_bytes)
                    if file_physical_scale is not None:
                        physical_scale = file_physical_scale
                elif suffix in {".jpeg", ".jpg", ".png"}:
                    temp_paths = [write_temp_input_file(suffix=suffix, file_bytes=file_bytes)]
                else:
                    # Unknown extension — skip to avoid crashing YOLO
                    continue
            except (InferenceInputError, Exception) as _decode_err:
                # Skip undecodable or non-image DICOM files (e.g. DICOMDIR,
                # structured reports, or files with unsupported transfer syntax).
                _cause = getattr(_decode_err, "__cause__", None) or _decode_err
                print(
                    f"[NeuroScan] Skipping file '{file_name}': "
                    f"{type(_cause).__name__}: {_cause}"
                )
                _cause_msg = str(_cause)
                _skip_diag.append(
                    f"{file_name}({'SR' if 'SR' in _cause_msg or 'rapport' in _cause_msg else 'ERR'})"
                )
                continue

            for temp_path_idx, temp_path in enumerate(temp_paths):
                try:
                    results = model.predict(
                        source=temp_path,
                        conf=settings.model_confidence_threshold,
                        verbose=False,
                    )
                    with open(temp_path, "rb") as fp:
                        frame_png = fp.read()
                    if preview_image_data is None:
                        preview_image_data = bytes_to_base64_data_uri(frame_png)
                finally:
                    Path(temp_path).unlink(missing_ok=True)

                if not results:
                    frame_idx += 1
                    continue

                first_result = results[0]
                names = first_result.names or {}

                # ── Per-frame cumulative vote ─────────────────────────────────
                if getattr(first_result, "probs", None) is not None:
                    # Classification model — use top-1 class
                    class_idx = int(first_result.probs.top1)
                    conf = float(first_result.probs.top1conf)
                    label = str(names.get(class_idx, f"class_{class_idx}"))
                    x_c, y_c = 0.5, 0.5
                    bbox = None
                else:
                    # Detection model — use highest-confidence box
                    boxes = first_result.boxes
                    if boxes is None or len(boxes) == 0:
                        frame_idx += 1
                        continue
                    top_box = boxes[0]
                    conf = float(top_box.conf[0])
                    class_idx = int(top_box.cls[0])
                    label = str(names.get(class_idx, f"class_{class_idx}"))
                    x_c, y_c, bw, bh = [float(v) for v in top_box.xywhn[0]]
                    bbox = {
                        "x": max(0.0, x_c - bw / 2),
                        "y": max(0.0, y_c - bh / 2),
                        "width": bw,
                        "height": bh,
                    }

                is_tumor = is_positive_label(label)

                # Real position in the original sorted series (1-indexed)
                orig_file_pos = file_loop_idx * step + 1
                slice_position = (
                    f"{orig_file_pos}.{temp_path_idx + 1}/{slice_count}"
                    if len(temp_paths) > 1
                    else f"{orig_file_pos}/{slice_count}"
                )

                # Slice of interest: any tumour detection with confidence > 20%
                # Store frame_idx for the isolation filter applied after the loop.
                if is_tumor and conf > SERIES_INTEREST_THRESHOLD / 100.0:
                    # Track for YOLO-coverage track (counts before EfficientNet)
                    yolo_tumor_frames += 1
                    _slice_data = {
                        "image_data": bytes_to_base64_data_uri(frame_png),
                        "file_name": file_name,
                        "confidence": round(conf * 100, 1),
                        "tumor_type": label,
                        "tumor_location": infer_region_label(x_c, y_c),
                        "bounding_box": bbox,
                        "slice_position": slice_position,
                    }
                    yolo_only_slices.append(_slice_data)

                    # ── Stage 2: EfficientNet false-positive filter ───────────
                    # YOLO detected a tumour → EfficientNet validates to reject
                    # false positives (eyes, glands, brain stem, etc.).
                    # Classification models (bbox is None) skip this step.
                    ef_passes = True
                    if bbox is not None:
                        ef_x1 = bbox["x"]
                        ef_y1 = bbox["y"]
                        ef_x2 = ef_x1 + bbox["width"]
                        ef_y2 = ef_y1 + bbox["height"]
                        ef_passes = _efficientnet_is_suspect(frame_png, ef_x1, ef_y1, ef_x2, ef_y2)

                    if ef_passes:
                        interest_slices.append(_slice_data)

                frame_idx += 1

        # ── Post-loop diagnostics ─────────────────────────────────────────────
        print(
            f"\n[NeuroScan] Series inference — {frame_idx} frame(s) processed, "
            f"{len(interest_slices)} candidate slice(s) above "
            f"{SERIES_INTEREST_THRESHOLD:.0f}% threshold"
        )

        if frame_idx == 0:
            _sr_count = sum(1 for d in _skip_diag if "SR" in d or "rapport" in d)
            if _sr_count > 0:
                raise InferenceInputError(
                    f"{_sr_count} fichier(s) sont des rapports DICOM (Modality=SR), "
                    "pas des images IRM. "
                    "Ouvrez le bon dossier série contenant les images MRI "
                    "(typiquement SRS00002 ou SRS00003 dans ton dossier d'examen)."
                )
            diag = " | ".join(_skip_diag[:5]) or "(aucun fichier traité)"
            raise InferenceInputError(
                "Aucune image de la série n'a pu être décodée. "
                "Vérifiez que les fichiers sont des images DICOM, PNG ou JPEG valides. "
                f"[DIAG: {diag}]"
            )

        # ── Isolation filter removed — every EfficientNet-confirmed slice counts ──
        red_count = len(interest_slices)
        print(f"  → After isolation filter: {red_count} non-isolated red slice(s)")

        # ── YOLO-coverage track ───────────────────────────────────────────────
        # If YOLO detects tumour on > YOLO_COVERAGE_THRESHOLD of all processed
        # frames, the series is positive WITHOUT requiring EfficientNet
        # confirmation. Catches tumour types EfficientNet was not trained on.
        if frame_idx >= YOLO_COVERAGE_MIN_FRAMES and yolo_only_slices:
            yolo_coverage = yolo_tumor_frames / frame_idx
            if yolo_coverage >= YOLO_COVERAGE_THRESHOLD:
                print(
                    f"  → [YOLO-coverage] {yolo_tumor_frames}/{frame_idx} = {yolo_coverage:.0%}"
                    f" ≥ {YOLO_COVERAGE_THRESHOLD:.0%} → POSITIVE (coverage track)"
                )
                cov_scores: dict[str, float] = {}
                for s in yolo_only_slices:
                    cov_scores[s["tumor_type"]] = cov_scores.get(s["tumor_type"], 0.0) + s["confidence"]
                cov_winner = max(cov_scores, key=lambda c: cov_scores[c])
                cov_slices = [s for s in yolo_only_slices if s["tumor_type"] == cov_winner]
                cov_avg = round(sum(s["confidence"] for s in cov_slices) / len(cov_slices), 1)
                cov_rep = max(cov_slices, key=lambda s: s["confidence"])
                cov_result = {
                    "result": "positive",
                    "confidence": cov_avg,
                    "tumor_detected": True,
                    "tumor_type": cov_winner,
                    "tumor_location": cov_rep["tumor_location"],
                    "tumor_volume": "N/A (YOLO-coverage track)",
                    "bounding_box": cov_rep.get("bounding_box"),
                    "report_text": (
                        f"YOLO-coverage: tumour signal on {yolo_tumor_frames}/{frame_idx} frames "
                        f"({yolo_coverage:.0%}). Likely {cov_winner} "
                        f"(avg confidence {cov_avg:.1f}%). "
                        "Clinical correlation and specialist review are recommended."
                    ),
                    "model_version": Path(settings.model_weights_path).name,
                }
                return {
                    **cov_result,
                    "positive_slices": cov_slices[:MAX_POSITIVE_SLICES],
                    "preview_image_data": cov_rep["image_data"],
                    "is_full_exam": True,
                    "exam_series": [],
                }

        # ── Series positivity: ≥1 EfficientNet-confirmed slice ───────────────
        if red_count < 1:
            final_result = {
                "result": "negative",
                "confidence": 0.0,
                "tumor_detected": False,
                "tumor_type": None,
                "tumor_location": None,
                "tumor_volume": None,
                "bounding_box": None,
                "report_text": (
                    f"Analysis found fewer than 2 non-isolated suspicious slices "
                    f"across the {slice_count}-image series."
                ),
                "model_version": Path(settings.model_weights_path).name,
            }
            positive_slices: list = interest_slices
            print("  → Negative (isolated or insufficient suspicious slices)\n")
        else:
            # Determine winner by highest cumulative confidence among non-isolated slices
            class_scores: dict[str, float] = {}
            for s in interest_slices:
                ttype = s["tumor_type"]
                class_scores[ttype] = class_scores.get(ttype, 0.0) + s["confidence"]

            winner_name = max(class_scores, key=lambda c: class_scores[c])
            winner_slices = [s for s in interest_slices if s["tumor_type"] == winner_name]
            avg_conf = sum(s["confidence"] for s in winner_slices) / len(winner_slices)
            confidence_pct = round(avg_conf, 1)
            max_conf_pct = max(s["confidence"] for s in winner_slices)

            # Representative slice: highest-confidence for the winner
            rep_slice = max(winner_slices, key=lambda s: s["confidence"])
            tumor_location = rep_slice["tumor_location"]
            bounding_box = rep_slice.get("bounding_box")

            # Volume estimation (detection model only)
            tumor_volume = "N/A (classification model — no spatial data)"
            if bounding_box is not None and physical_scale is not None:
                w_val = bounding_box["width"]
                h_val = bounding_box["height"]
                area_mm2 = (
                    w_val * physical_scale.column_spacing_mm
                    * h_val * physical_scale.row_spacing_mm
                )
                if physical_scale.slice_thickness_mm is not None:
                    tumor_volume = format_estimated_volume(
                        area_mm2 * physical_scale.slice_thickness_mm
                    )
                else:
                    tumor_volume = format_cross_section_area(area_mm2)
            elif bounding_box is not None:
                tumor_volume = (
                    f"approx. "
                    f"{bounding_box['width'] * bounding_box['height'] * 100:.1f}% image area"
                )

            preview_image_data = rep_slice["image_data"]

            slice_detail_lines = []
            for vs in sorted(winner_slices, key=lambda s: -s["confidence"]):
                bb = vs.get("bounding_box")
                pos = vs.get("slice_position", "?")
                bbox_str = (
                    f"x={bb['x']:.3f} y={bb['y']:.3f} "
                    f"w={bb['width']:.3f} h={bb['height']:.3f}"
                    if bb
                    else "classification (no bbox)"
                )
                slice_detail_lines.append(
                    f"  • Coupe {pos} — confiance : {vs['confidence']:.1f}% "
                    f"— {vs['tumor_location']} — bbox : [{bbox_str}]"
                )

            final_result = {
                "result": "positive",
                "confidence": confidence_pct,
                "tumor_detected": True,
                "tumor_type": winner_name,
                "tumor_location": tumor_location,
                "tumor_volume": tumor_volume,
                "bounding_box": bounding_box,
                "report_text": (
                    f"Analysis identified a {winner_name} "
                    f"({red_count} non-isolated slice(s), "
                    f"avg {confidence_pct:.1f}%, peak {max_conf_pct:.1f}%). "
                    "Clinical correlation and specialist review are recommended.\n\n"
                    "Suspicious slices (non-isolated):\n"
                    + "\n".join(slice_detail_lines)
                ),
                "model_version": Path(settings.model_weights_path).name,
            }
            positive_slices = interest_slices
            print(
                f"  \u2192 Winner: {winner_name} "
                f"(non-isolated={red_count}, avg={confidence_pct:.1f}%)\n"
            )

        subset_note = (
            f" (Processed a representative subset of {len(sorted_files)} images "
            f"from the {slice_count}-image series.)"
        ) if len(sorted_files) < slice_count else ""

        # ── Build PACS all_slices (all frames for the viewer) ─────────────────
        pacs_suspicious_lookup: dict[tuple[int, int], dict] = {}
        for ps in positive_slices:
            pos_str = ps.get("slice_position", "")
            try:
                main_part = pos_str.split("/")[0]
                if "." in main_part:
                    orig_1based, frame_1based = main_part.split(".")
                    orig_idx = int(orig_1based) - 1
                    frame_sub = int(frame_1based) - 1
                else:
                    orig_idx = int(main_part) - 1
                    frame_sub = 0
                pacs_suspicious_lookup[(orig_idx, frame_sub)] = {
                    "confidence": ps.get("confidence"),
                    "bounding_box": ps.get("bounding_box"),
                    "tumor_type": ps.get("tumor_type"),
                }
            except (ValueError, IndexError):
                continue

        if slice_count > MAX_PACS_SLICES_PER_SERIES:
            pacs_step = max(1, slice_count // MAX_PACS_SLICES_PER_SERIES)
            pacs_sorted = all_sorted_for_pacs[::pacs_step][:MAX_PACS_SLICES_PER_SERIES]
        else:
            pacs_step = 1
            pacs_sorted = all_sorted_for_pacs

        pacs_slices: list[dict] = []
        pacs_global_num = 0
        for pacs_enum_idx, (pfb, pfn, _) in enumerate(pacs_sorted):
            pacs_orig_idx = pacs_enum_idx * pacs_step
            frames_b64 = _decode_frames_to_b64_list(pfb, pfn)
            for frame_sub_idx, frame_b64 in enumerate(frames_b64):
                pacs_global_num += 1
                det = pacs_suspicious_lookup.get((pacs_orig_idx, frame_sub_idx))
                is_pos = bool(final_result.get("tumor_detected"))
                pacs_slices.append({
                    "slice_number": pacs_global_num,
                    "image_data": frame_b64,
                    "is_suspicious": det is not None and is_pos,
                    "confidence": det["confidence"] if det and is_pos else None,
                    "bounding_box": det["bounding_box"] if det and is_pos else None,
                    "tumor_type": det["tumor_type"] if det and is_pos else None,
                })

        exam_series_pacs = [{
            "series_uid": "__series__",
            "series_label": f"Série IRM ({slice_count} images)",
            "series_number": 1,
            "total_slices": pacs_global_num,
            "is_positive": bool(final_result.get("tumor_detected")),
            "tumor_type": final_result.get("tumor_type"),
            "confidence": final_result.get("confidence", 0.0),
            "all_slices": pacs_slices,
        }]

        old_report = final_result.get("report_text") or ""
        return {
            **final_result,
            "report_text": f"{old_report}{subset_note}",
            "positive_slices": positive_slices,
            "preview_image_data": preview_image_data,
            "is_full_exam": True,
            "exam_series": exam_series_pacs,
        }

    raise UnsupportedModelProviderError(
        f"Unsupported MODEL_PROVIDER '{settings.model_provider}'.",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Full-exam pipeline — group DICOM files by series, then aggregate results
# ═══════════════════════════════════════════════════════════════════════════════

# Minimum per-series confidence (%) for a positive result to enter the
# inter-series aggregation vote.  A series below this threshold is ignored.
EXAM_SERIES_MIN_CONFIDENCE: float = 40.0

# JPEG quality used when encoding all analyzed slices for PACS storage.
# Lower values keep MongoDB document sizes manageable while preserving
# enough detail for diagnostic review in the PACS viewer.
PACS_JPEG_QUALITY: int = 50


def _encode_frame_to_jpeg_b64(frame_array: "np.ndarray") -> str:
    """Encode a uint8 numpy frame to a JPEG base64 data URI."""
    if frame_array.ndim == 2:
        img = Image.fromarray(frame_array, mode="L").convert("RGB")
    else:
        img = Image.fromarray(frame_array[:, :, :3], mode="RGB")
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=PACS_JPEG_QUALITY)
    encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{encoded}"


def _decode_frames_to_b64_list(file_bytes: bytes, file_name: str) -> list[str]:
    """Decode a DICOM/PNG/JPEG file into a list of JPEG base64 data URIs.

    Returns an empty list if the file cannot be decoded.
    """
    suffix = Path(Path(file_name).name).suffix.lower()
    name = Path(file_name).name
    uid_parts = [p for p in name.split(".") if p]
    is_uid_dicom = len(uid_parts) >= 3 and all(p.isdigit() for p in uid_parts)

    if suffix in {".dcm", ".dicom"} or suffix == "" or is_uid_dicom:
        try:
            dataset = dcmread(BytesIO(file_bytes), force=True)
            frames = extract_all_dicom_frames(dataset)
        except Exception:
            return []
        return [_encode_frame_to_jpeg_b64(f) for f in frames]

    if suffix in {".jpeg", ".jpg", ".png"}:
        try:
            img = Image.open(BytesIO(file_bytes)).convert("RGB")
            arr = np.array(img)
            return [_encode_frame_to_jpeg_b64(arr)]
        except Exception:
            return []

    return []


def group_files_by_series(
    files: list[tuple[bytes, str, str]],
) -> dict[str, list[tuple[bytes, str, str]]]:
    """Group uploaded files by DICOM SeriesInstanceUID.

    For each file we try to read the DICOM header (without pixels) and extract
    the SeriesInstanceUID tag.  Non-DICOM files and files whose header cannot
    be read are placed in a catch-all ``"__unknown__"`` group so they are still
    analysed rather than silently dropped.

    Returns
    -------
    dict[series_uid, list_of_(bytes, name, type)]
        Keys are SeriesInstanceUID strings.  Iteration order matches insertion
        order (Python 3.7+), which preserves the original file ordering within
        each group.
    """
    groups: dict[str, list[tuple[bytes, str, str]]] = {}

    for file_bytes, file_name, file_type in files:
        series_uid = "__unknown__"
        suffix = Path(file_name).suffix.lower()
        name = Path(file_name).name
        uid_parts = [p for p in name.split(".") if p]
        is_uid_dicom = len(uid_parts) >= 3 and all(p.isdigit() for p in uid_parts)

        if suffix in {".dcm", ".dicom"} or suffix == "" or is_uid_dicom:
            try:
                dataset = dcmread(BytesIO(file_bytes), stop_before_pixels=True, force=True)
                raw_uid = getattr(dataset, "SeriesInstanceUID", None)
                if raw_uid:
                    series_uid = str(raw_uid).strip()
            except Exception:
                pass  # fall through to __unknown__

        groups.setdefault(series_uid, []).append((file_bytes, file_name, file_type))

    # Tri déterministe : UIDs connus par ordre alphabétique, __unknown__ en dernier.
    return dict(sorted(groups.items(), key=lambda kv: (kv[0] == "__unknown__", kv[0])))


def run_inference_full_exam(*, files: list[tuple[bytes, str, str]]) -> dict:
    """Analyse a complete MRI exam that may contain multiple mixed series.

    Pipeline
    --------
    1. Group all files by ``SeriesInstanceUID`` (DICOM header, no pixels read).
    2. Run ``run_inference_series`` independently on each group.
    3. Collect per-series results; ignore NO_tumor outcomes.
    4. Keep only positive results whose confidence >= ``EXAM_SERIES_MIN_CONFIDENCE``.
    5. If no series qualifies -> negative.
    6. Otherwise: weighted vote by confidence across qualifying series.
       The class with the highest cumulative confidence score wins.

    Returns the standard inference-result dict (same shape as
    ``run_inference_series``) augmented with a multi-series report.
    """
    if not files:
        raise InferenceInputError("No files provided for full-exam analysis.")

    series_groups = group_files_by_series(files)
    n_series = len(series_groups)

    print(
        f"\n[NeuroScan] Full-exam inference — "
        f"{len(files)} file(s) across {n_series} series"
    )

    all_series_results: list[dict] = []
    all_positive_slices: list[dict] = []
    exam_series: list[dict] = []
    preview_image_data: str | None = None

    for series_idx, (series_uid, series_files) in enumerate(series_groups.items()):
        label = f"Série {series_idx + 1}"
        print(
            f"  [{series_idx + 1}/{n_series}] {label} "
            f"— {len(series_files)} file(s)"
        )

        try:
            result = run_inference_series(files=series_files)
        except InferenceInputError as exc:
            print(f"    -> Skipped (input error: {exc})")
            continue
        except Exception as exc:  # pragma: no cover
            print(f"    -> Skipped (unexpected error: {exc})")
            continue

        # Accumulate positive slices from every series for the UI gallery
        all_positive_slices.extend(result.get("positive_slices") or [])
        if preview_image_data is None:
            preview_image_data = result.get("preview_image_data")

        all_series_results.append({
            "series_uid": series_uid,
            "series_label": label,
            "n_files": len(series_files),
            **result,
        })

        tumor_type = result.get("tumor_type") or "no_tumor"
        confidence = result.get("confidence", 0.0)
        print(f"    -> {tumor_type} ({confidence:.1f}%)")

        # ── Build PACS all_slices for this series ─────────────────────────────
        # Sort files the same way run_inference_series does
        valid_series_files = [f for f in series_files if is_supported_series_file(f[1])]

        def _sort_key_series(item: tuple) -> tuple:
            fn = item[1]
            sfx = Path(fn).suffix.lower()
            name = Path(fn).name
            if sfx in {".dcm", ".dicom", ".ima"} or sfx == "":
                return (0, get_dicom_instance_number(item[0]), name)
            return (1, 0, name)

        all_sorted = sorted(valid_series_files, key=_sort_key_series)

        # Build lookup: (orig_file_idx, frame_sub_idx) → detection info
        suspicious_lookup: dict[tuple[int, int], dict] = {}
        for ps in result.get("positive_slices") or []:
            pos_str = ps.get("slice_position", "")
            try:
                main_part = pos_str.split("/")[0]
                if "." in main_part:
                    orig_1based, frame_1based = main_part.split(".")
                    orig_idx = int(orig_1based) - 1
                    frame_sub = int(frame_1based) - 1
                else:
                    orig_idx = int(main_part) - 1
                    frame_sub = 0
                suspicious_lookup[(orig_idx, frame_sub)] = {
                    "confidence": ps.get("confidence"),
                    "bounding_box": ps.get("bounding_box"),
                    "tumor_type": ps.get("tumor_type"),
                }
            except (ValueError, IndexError):
                continue

        # Show up to MAX_PACS_SLICES_PER_SERIES slices in the viewer — decoupled from
        # the YOLO inference limit so the doctor sees the full volume.
        slice_count_full = len(all_sorted)
        if slice_count_full > MAX_PACS_SLICES_PER_SERIES:
            pacs_step = max(1, slice_count_full // MAX_PACS_SLICES_PER_SERIES)
            pacs_sorted = all_sorted[::pacs_step][:MAX_PACS_SLICES_PER_SERIES]
        else:
            pacs_step = 1
            pacs_sorted = all_sorted

        # Decode every SAMPLED file and build all_slices list.
        # orig_idx = enum_idx * pacs_step → position in the original all_sorted,
        # which is what suspicious_lookup was built from.
        pacs_slices: list[dict] = []
        global_slice_num = 0
        for enum_idx, (fb, fn, _) in enumerate(pacs_sorted):
            orig_idx = enum_idx * pacs_step
            frames_b64 = _decode_frames_to_b64_list(fb, fn)
            for frame_sub_idx, frame_b64 in enumerate(frames_b64):
                global_slice_num += 1
                det = suspicious_lookup.get((orig_idx, frame_sub_idx))
                series_positive = bool(result.get("tumor_detected"))
                pacs_slices.append({
                    "slice_number": global_slice_num,
                    "image_data": frame_b64,
                    "is_suspicious": det is not None and series_positive,
                    "confidence": det["confidence"] if det and series_positive else None,
                    "bounding_box": det["bounding_box"] if det and series_positive else None,
                    "tumor_type": det["tumor_type"] if det and series_positive else None,
                })

        exam_series.append({
            "series_uid": series_uid,
            "series_label": label,
            "series_number": series_idx + 1,
            "total_slices": global_slice_num,
            "is_positive": bool(result.get("tumor_detected")),
            "tumor_type": result.get("tumor_type"),
            "confidence": result.get("confidence", 0.0),
            "all_slices": pacs_slices,
        })

    if not all_series_results:
        return {
            "result": "negative",
            "confidence": 0.0,
            "tumor_detected": False,
            "tumor_type": None,
            "tumor_location": None,
            "tumor_volume": None,
            "bounding_box": None,
            "report_text": "Full-exam analysis produced no valid result from any series.",
            "model_version": Path(settings.model_weights_path).name,
            "positive_slices": [],
            "preview_image_data": None,
            "is_full_exam": True,
            "exam_series": [],
        }

    # ── Step 4: filter qualifying positive series ─────────────────────────────
    qualifying = [
        r for r in all_series_results
        if r.get("tumor_detected")
        and r.get("confidence", 0.0) >= EXAM_SERIES_MIN_CONFIDENCE
    ]

    print(
        f"  {len(qualifying)}/{len(all_series_results)} series qualify "
        f"(positive, conf >= {EXAM_SERIES_MIN_CONFIDENCE:.0f}%)"
    )

    # Per-series summary lines for the report (all series, not just qualifying)
    summary_lines: list[str] = []
    for r in all_series_results:
        uid_short = r["series_uid"][:20] if r["series_uid"] != "__unknown__" else "N/A"
        if r.get("tumor_detected"):
            status_str = f"{r['tumor_type']} ({r['confidence']:.1f}%)"
            qualifier_mark = " [qualifie]" if r in qualifying else " [sous le seuil]"
        else:
            status_str = f"negatif ({r['confidence']:.1f}%)"
            qualifier_mark = ""
        summary_lines.append(
            f"  * {uid_short}... — {r['n_files']} images — {status_str}{qualifier_mark}"
        )

    if not qualifying:
        return {
            "result": "negative",
            "confidence": 0.0,
            "tumor_detected": False,
            "tumor_type": None,
            "tumor_location": None,
            "tumor_volume": None,
            "bounding_box": None,
            "report_text": (
                f"Analyse complete IRM ({n_series} series, {len(files)} images):\n"
                + "\n".join(summary_lines)
                + f"\n\nAucune serie n'a depasse le seuil de {EXAM_SERIES_MIN_CONFIDENCE:.0f}% "
                "de confiance. Resultat: negatif."
            ),
            "model_version": Path(settings.model_weights_path).name,
            "positive_slices": [],
            "preview_image_data": preview_image_data,
            "is_full_exam": True,
            "exam_series": exam_series,
        }

    # ── Step 5: weighted vote across qualifying series ────────────────────────
    # class_name -> cumulative confidence score
    class_scores: dict[str, float] = {}
    for r in qualifying:
        tumor_type = r["tumor_type"]
        class_scores[tumor_type] = class_scores.get(tumor_type, 0.0) + r["confidence"]

    winning_class = max(class_scores, key=lambda c: class_scores[c])

    winner_series_list = [r for r in qualifying if r["tumor_type"] == winning_class]
    best_series = max(winner_series_list, key=lambda r: r["confidence"])
    avg_confidence = round(
        sum(r["confidence"] for r in winner_series_list) / len(winner_series_list), 1
    )

    # Positive slices from the winning class series only, sorted by confidence
    winner_positive_slices = sorted(
        [
            s
            for r in winner_series_list
            for s in (r.get("positive_slices") or [])
        ],
        key=lambda s: -s.get("confidence", 0),
    )[:MAX_POSITIVE_SLICES]

    # Use the most confident positive slice as preview
    if winner_positive_slices:
        preview_image_data = winner_positive_slices[0].get("image_data", preview_image_data)

    print(
        f"  -> Winning class: {winning_class} "
        f"(cumul_score={class_scores[winning_class]:.1f}, "
        f"avg_conf={avg_confidence:.1f}%, "
        f"{len(winner_series_list)} qualifying series)\n"
    )

    report_text = (
        f"Analyse complete IRM multi-series ({n_series} series, {len(files)} images):\n"
        + "\n".join(summary_lines)
        + f"\n\nAggregation: {len(qualifying)} serie(s) ont detecte {winning_class} "
        f"au-dessus du seuil de {EXAM_SERIES_MIN_CONFIDENCE:.0f}% "
        f"(confiance moyenne {avg_confidence:.1f}%). "
        "Correlation clinique et avis specialiste recommandes."
    )

    return {
        "result": "positive",
        "confidence": avg_confidence,
        "tumor_detected": True,
        "tumor_type": winning_class,
        "tumor_location": best_series.get("tumor_location"),
        "tumor_volume": best_series.get("tumor_volume"),
        "bounding_box": best_series.get("bounding_box"),
        "report_text": report_text,
        "model_version": Path(settings.model_weights_path).name,
        "positive_slices": winner_positive_slices,
        "preview_image_data": preview_image_data,
        "is_full_exam": True,
        "exam_series": exam_series,
    }