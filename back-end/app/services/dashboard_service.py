from app.database.mongodb import get_analysis_collection_name, get_database
from app.schemas.dashboard import DashboardAnalysisSummary, DashboardStatsResponse


async def get_dashboard_stats(*, doctor_id: str) -> DashboardStatsResponse:
    database = get_database()
    analyses_collection = database[get_analysis_collection_name()]

    analysis_documents = await analyses_collection.find(
        {"doctor_id": doctor_id},
        {"result": 1, "confidence": 1, "created_at": 1},
    ).sort("created_at", -1).to_list(length=None)

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