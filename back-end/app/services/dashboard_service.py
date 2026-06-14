from app.repositories import analysis_repository
from app.schemas.dashboard import DashboardAnalysisSummary, DashboardStatsResponse


async def get_dashboard_stats(*, doctor_id: str) -> DashboardStatsResponse:
    analysis_documents = await analysis_repository.find_all_by_doctor(doctor_id)

    analyses = [
        DashboardAnalysisSummary(
            id=str(document["_id"]),
            result=document["result"],
            confidence=float(document["confidence"]),
            createdAt=document["created_at"],
        )
        for document in analysis_documents
    ]

    total_scans = len(analyses)
    positive_scans = sum(1 for analysis in analyses if analysis.result == "positive")
    negative_scans = sum(1 for analysis in analyses if analysis.result == "negative")
    avg_confidence = round(
        sum(analysis.confidence for analysis in analyses) / total_scans,
        1,
    ) if total_scans else 0.0

    return DashboardStatsResponse(
        totalScans=total_scans,
        positiveScans=positive_scans,
        negativeScans=negative_scans,
        avgConfidence=avg_confidence,
        analyses=analyses,
    )