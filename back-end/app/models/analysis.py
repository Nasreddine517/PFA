from datetime import UTC, datetime
from typing import Any


def build_analysis_document(
    *,
    doctor_id: str,
    scan_id: str,
    result: str,
    confidence: float,
    tumor_detected: bool | None = None,
    tumor_type: str | None = None,
    tumor_location: str | None = None,
    tumor_volume: str | None = None,
    bounding_box: dict[str, float] | None = None,
    report_text: str | None = None,
    model_version: str | None = None,
) -> dict[str, Any]:
    now = datetime.now(UTC)
    return {
        "doctor_id": doctor_id,
        "scan_id": scan_id,
        "result": result,
        "confidence": confidence,
        "tumor_detected": tumor_detected,
        "tumor_type": tumor_type,
        "tumor_location": tumor_location,
        "tumor_volume": tumor_volume,
        "bounding_box": bounding_box,
        "report_text": report_text,
        "model_version": model_version,
        "created_at": now,
        "updated_at": now,
    }