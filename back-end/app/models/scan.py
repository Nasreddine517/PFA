from datetime import UTC, datetime
from typing import Any


def build_scan_document(
    *,
    doctor_id: str,
    file_name: str,
    file_type: str,
    file_size: int,
    storage_path: str,
    image_url: str | None,
) -> dict[str, Any]:
    now = datetime.now(UTC)
    return {
        "doctor_id": doctor_id,
        "file_name": file_name,
        "file_type": file_type,
        "file_size": file_size,
        "storage_path": storage_path,
        "image_url": image_url,
        "upload_status": "completed",
        "analysis_status": "pending",
        "created_at": now,
        "updated_at": now,
    }