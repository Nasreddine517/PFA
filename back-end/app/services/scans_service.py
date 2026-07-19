from pathlib import Path

from app.core.config import settings
from app.models.scan import build_scan_document
from app.repositories import scan_repository
from app.schemas.analysis import ScanUploadResponse
from app.services.analyses_service import persist_analysis_for_scan, persist_analysis_for_series, persist_analysis_for_full_exam


ALLOWED_CONTENT_TYPES = {
    "application/dicom",
    "application/dicom+json",
    "application/octet-stream",
    "image/jpeg",
    "image/jpg",
    "image/png",
}
ALLOWED_EXTENSIONS = {".dcm", ".dicom", ".jpeg", ".jpg", ".png"}


class InvalidScanFileError(Exception):
    pass


class ScanTooLargeError(Exception):
    pass


class SeriesTooManyFilesError(Exception):
    pass


MAX_SERIES_FILES = 800
ALLOWED_SERIES_EXTENSIONS = {".dcm", ".dicom", ".png", ".jpg", ".jpeg"}


def has_supported_file_extension(file_name: str) -> bool:
    name = Path(file_name).name
    if not name:
        return False

    suffix = Path(name).suffix.lower()
    if suffix in ALLOWED_EXTENSIONS:
        return True

    # DICOM files are often uploaded without a standard extension, e.g. IMG00001
    # or with UID-style numeric names such as 1.2.840.113619.2.244....
    if suffix == "":
        return True

    parts = [part for part in name.split(".") if part]
    if len(parts) >= 3 and all(part.isdigit() for part in parts):
        return True

    return False


def validate_scan_file(*, file_name: str, file_type: str, file_bytes: bytes) -> None:
    if not has_supported_file_extension(file_name):
        raise InvalidScanFileError("Unsupported file extension.")

    if file_type and file_type not in ALLOWED_CONTENT_TYPES:
        raise InvalidScanFileError("Unsupported content type.")

    max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(file_bytes) == 0:
        raise InvalidScanFileError("Uploaded scan is empty.")
    if len(file_bytes) > max_size_bytes:
        raise ScanTooLargeError("Uploaded scan is too large.")


def build_scan_upload_response(scan_document: dict, preview_image_data: str | None = None) -> ScanUploadResponse:
    return ScanUploadResponse(
        id=str(scan_document["_id"]),
        fileName=scan_document["file_name"],
        fileType=scan_document["file_type"],
        fileSize=scan_document["file_size"],
        uploadStatus=scan_document["upload_status"],
        analysisStatus=scan_document["analysis_status"],
        imageUrl=scan_document.get("image_url"),
        previewImageData=preview_image_data,
        latestAnalysisId=scan_document.get("latest_analysis_id"),
        createdAt=scan_document["created_at"],
    )


async def create_scan(*, doctor_id: str, file_name: str, file_type: str, file_bytes: bytes) -> ScanUploadResponse:
    validate_scan_file(file_name=file_name, file_type=file_type, file_bytes=file_bytes)

    scan_document = build_scan_document(
        doctor_id=doctor_id,
        file_name=file_name,
        file_type=file_type or "application/octet-stream",
        file_size=len(file_bytes),
        analysis_status="pending",
    )

    scan_document = await scan_repository.insert(scan_document)

    try:
        analysis_document, preview_image_data = await persist_analysis_for_scan(
            doctor_id=doctor_id,
            scan_document=scan_document,
            file_bytes=file_bytes,
        )
    except Exception:
        await scan_repository.update(scan_document["_id"], {"analysis_status": "failed"})
        raise

    updated_scan_document = await scan_repository.update(
        scan_document["_id"],
        {
            "analysis_status": "completed",
            "latest_analysis_id": str(analysis_document["_id"]),
        },
    )

    return build_scan_upload_response(updated_scan_document or scan_document, preview_image_data)


async def create_scan_series(
    *,
    doctor_id: str,
    files: list[tuple[bytes, str, str]],
) -> ScanUploadResponse:
    if not files:
        raise InvalidScanFileError("No files provided.")

    if len(files) > MAX_SERIES_FILES:
        raise SeriesTooManyFilesError(
            f"Series exceeds the maximum of {MAX_SERIES_FILES} slices."
        )

    for file_bytes, file_name, _file_type in files:
        if not has_supported_file_extension(file_name):
            raise InvalidScanFileError(
                "Series files must be DICOM (.dcm), PNG, or JPEG images."
            )
        if len(file_bytes) == 0:
            raise InvalidScanFileError(f"Uploaded file is empty: {file_name}")

    total_size = sum(len(fb) for fb, _, _ in files)
    max_series_bytes = settings.max_upload_size_mb * 1024 * 1024 * 20
    if total_size > max_series_bytes:
        raise ScanTooLargeError("Image series exceeds the maximum allowed total size.")

    series_name = f"Image Series ({len(files)} images)"
    scan_document = build_scan_document(
        doctor_id=doctor_id,
        file_name=series_name,
        file_type="application/dicom",
        file_size=total_size,
        analysis_status="pending",
    )

    scan_document = await scan_repository.insert(scan_document)

    try:
        analysis_document, preview_image_data = await persist_analysis_for_series(
            doctor_id=doctor_id,
            scan_document=scan_document,
            files=files,
        )
    except Exception:
        await scan_repository.update(scan_document["_id"], {"analysis_status": "failed"})
        raise

    updated_scan_document = await scan_repository.update(
        scan_document["_id"],
        {
            "analysis_status": "completed",
            "latest_analysis_id": str(analysis_document["_id"]),
        },
    )

    return build_scan_upload_response(updated_scan_document or scan_document, preview_image_data)


async def create_full_exam_scan(
    *,
    doctor_id: str,
    files: list[tuple[bytes, str, str]],
) -> ScanUploadResponse:
    """Upload and analyse a complete MRI exam (multiple series mixed together).

    Files are automatically grouped by SeriesInstanceUID before inference.
    Each series is analysed independently; results are then aggregated.
    """
    if not files:
        raise InvalidScanFileError("No files provided.")

    if len(files) > MAX_SERIES_FILES:
        raise SeriesTooManyFilesError(
            f"Exam exceeds the maximum of {MAX_SERIES_FILES} files."
        )

    for file_bytes, file_name, _file_type in files:
        if not has_supported_file_extension(file_name):
            raise InvalidScanFileError(
                "Exam files must be DICOM (.dcm), PNG, or JPEG images."
            )
        if len(file_bytes) == 0:
            raise InvalidScanFileError(f"Uploaded file is empty: {file_name}")

    total_size = sum(len(fb) for fb, _, _ in files)
    max_exam_bytes = settings.max_upload_size_mb * 1024 * 1024 * 20
    if total_size > max_exam_bytes:
        raise ScanTooLargeError("MRI exam exceeds the maximum allowed total size.")

    exam_name = f"Complete MRI Exam ({len(files)} images)"
    scan_document = build_scan_document(
        doctor_id=doctor_id,
        file_name=exam_name,
        file_type="application/dicom",
        file_size=total_size,
        analysis_status="pending",
    )

    scan_document = await scan_repository.insert(scan_document)

    try:
        analysis_document, preview_image_data = await persist_analysis_for_full_exam(
            doctor_id=doctor_id,
            scan_document=scan_document,
            files=files,
        )
    except Exception:
        await scan_repository.update(scan_document["_id"], {"analysis_status": "failed"})
        raise

    updated_scan_document = await scan_repository.update(
        scan_document["_id"],
        {
            "analysis_status": "completed",
            "latest_analysis_id": str(analysis_document["_id"]),
        },
    )

    return build_scan_upload_response(updated_scan_document or scan_document, preview_image_data)