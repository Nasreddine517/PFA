from pathlib import Path
from uuid import uuid4

from app.core.config import settings
from app.database.mongodb import get_database, get_scan_collection_name
from app.models.scan import build_scan_document
from app.schemas.analysis import ScanUploadResponse


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


def validate_scan_file(*, file_name: str, file_type: str, file_bytes: bytes) -> None:
    extension = Path(file_name).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise InvalidScanFileError("Unsupported file extension.")

    if file_type and file_type not in ALLOWED_CONTENT_TYPES:
        raise InvalidScanFileError("Unsupported content type.")

    max_size_bytes = settings.max_upload_size_mb * 1024 * 1024
    if len(file_bytes) == 0:
        raise InvalidScanFileError("Uploaded scan is empty.")
    if len(file_bytes) > max_size_bytes:
        raise ScanTooLargeError("Uploaded scan is too large.")


def build_scan_upload_response(scan_document: dict) -> ScanUploadResponse:
    return ScanUploadResponse(
        id=str(scan_document["_id"]),
        fileName=scan_document["file_name"],
        fileType=scan_document["file_type"],
        fileSize=scan_document["file_size"],
        uploadStatus=scan_document["upload_status"],
        analysisStatus=scan_document["analysis_status"],
        imageUrl=scan_document.get("image_url"),
        createdAt=scan_document["created_at"],
    )


async def create_scan(*, doctor_id: str, file_name: str, file_type: str, file_bytes: bytes) -> ScanUploadResponse:
    validate_scan_file(file_name=file_name, file_type=file_type, file_bytes=file_bytes)

    upload_dir = Path(settings.scan_upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file_name).suffix.lower()
    stored_file_name = f"{uuid4().hex}{extension}"
    stored_file_path = upload_dir / stored_file_name
    stored_file_path.write_bytes(file_bytes)

    relative_storage_path = stored_file_path.as_posix()
    image_url = None
    if extension in {".jpeg", ".jpg", ".png"}:
        image_url = f"{settings.upload_mount_prefix}/scans/{stored_file_name}"

    scan_document = build_scan_document(
        doctor_id=doctor_id,
        file_name=file_name,
        file_type=file_type or "application/octet-stream",
        file_size=len(file_bytes),
        storage_path=relative_storage_path,
        image_url=image_url,
    )

    database = get_database()
    scans_collection = database[get_scan_collection_name()]
    insert_result = await scans_collection.insert_one(scan_document)
    scan_document["_id"] = insert_result.inserted_id

    return build_scan_upload_response(scan_document)