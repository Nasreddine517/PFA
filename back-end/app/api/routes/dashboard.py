from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user_document
from app.schemas.dashboard import DashboardStatsResponse
from app.services.dashboard_service import get_dashboard_stats

router = APIRouter()


@router.get(
    "/stats",
    response_model=DashboardStatsResponse,
    summary="Get dashboard statistics for the current doctor",
)
async def get_dashboard_overview(
    current_user_document: dict = Depends(get_current_user_document),
) -> DashboardStatsResponse:
    return await get_dashboard_stats(
        doctor_id=str(current_user_document["_id"]),
    )