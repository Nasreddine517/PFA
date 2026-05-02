from datetime import UTC, datetime
from typing import Any


def build_analysis_document(
    *,
    doctor_id: str,
    scan_id: str,
    result: str,
    confidence: float,
) -> dict[str, Any]:
    now = datetime.now(UTC)
    return {
        "doctor_id": doctor_id,
        "scan_id": scan_id,
        "result": result,
        "confidence": confidence,
        "created_at": now,
        "updated_at": now,
    }