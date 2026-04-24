from fastapi import APIRouter, Depends, status

from app.api.dependencies.auth import get_current_user_document
from app.schemas.analysis import AnalysisResponse, CreateAnalysisRequest
from app.services.analyses_service import create_analysis, get_analysis

router = APIRouter()


@router.post(
    "",
    response_model=AnalysisResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an MRI analysis from an uploaded scan",
)
async def create_scan_analysis(
    payload: CreateAnalysisRequest,
    current_user_document: dict = Depends(get_current_user_document),
) -> AnalysisResponse:
    return await create_analysis(
        doctor_id=str(current_user_document["_id"]),
        scan_id=payload.scan_id,
    )


@router.get(
    "/{analysis_id}",
    response_model=AnalysisResponse,
    summary="Get analysis result by id",
)
async def get_scan_analysis(
    analysis_id: str,
    current_user_document: dict = Depends(get_current_user_document),
) -> AnalysisResponse:
    return await get_analysis(
        doctor_id=str(current_user_document["_id"]),
        analysis_id=analysis_id,
    )