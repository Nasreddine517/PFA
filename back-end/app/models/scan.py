from datetime import UTC, datetime
from typing import Any


def build_scan_document(
    *,
    doctor_id: str,
    file_name: str,
    file_type: str,
    file_size: int,
    analysis_status: str = "pending",
    latest_analysis_id: str | None = None,
) -> dict[str, Any]:
    now = datetime.now(UTC)
    return {
        "doctor_id": doctor_id,
        "file_name": file_name,
        "file_type": file_type,
        "file_size": file_size,
        "upload_status": "completed",
        "analysis_status": analysis_status,
        "latest_analysis_id": latest_analysis_id,
        "created_at": now,
        "updated_at": now,
    }