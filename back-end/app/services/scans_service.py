from pathlib import Path

from pymongo import ReturnDocument

from app.core.config import settings
from app.database.mongodb import get_database, get_scan_collection_name
from app.models.scan import build_scan_document
from app.schemas.analysis import ScanUploadResponse
from app.services.analyses_service import persist_analysis_for_scan


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

    scan_document = build_scan_document(
        doctor_id=doctor_id,
        file_name=file_name,
        file_type=file_type or "application/octet-stream",
        file_size=len(file_bytes),
        analysis_status="pending",
    )

    database = get_database()
    scans_collection = database[get_scan_collection_name()]
    insert_result = await scans_collection.insert_one(scan_document)
    scan_document["_id"] = insert_result.inserted_id

    try:
        analysis_document = await persist_analysis_for_scan(
            doctor_id=doctor_id,
            scan_document=scan_document,
            file_bytes=file_bytes,
        )
    except Exception:
        await scans_collection.find_one_and_update(
            {"_id": scan_document["_id"]},
            {
                "$set": {
                    "analysis_status": "failed",
                },
            },
        )
        raise

    updated_scan_document = await scans_collection.find_one_and_update(
        {"_id": scan_document["_id"]},
        {
            "$set": {
                "analysis_status": "completed",
                "latest_analysis_id": str(analysis_document["_id"]),
            },
        },
        return_document=ReturnDocument.AFTER,
    )

    return build_scan_upload_response(updated_scan_document or scan_document)