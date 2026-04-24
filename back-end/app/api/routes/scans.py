from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.api.dependencies.auth import get_current_user_document
from app.schemas.analysis import ScanUploadResponse
from app.services.scans_service import (
    InvalidScanFileError,
    ScanTooLargeError,
    create_scan,
)

router = APIRouter()


@router.post(
    "/upload",
    response_model=ScanUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload an MRI scan",
)
async def upload_scan(
    file: UploadFile = File(...),
    current_user_document: dict = Depends(get_current_user_document),
) -> ScanUploadResponse:
    try:
        file_bytes = await file.read()
        return await create_scan(
            doctor_id=str(current_user_document["_id"]),
            file_name=file.filename or "scan.bin",
            file_type=file.content_type or "application/octet-stream",
            file_bytes=file_bytes,
        )
    except InvalidScanFileError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier IRM doit etre au format DICOM, PNG ou JPEG.",
        ) from exc
    except ScanTooLargeError as exc:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Le fichier IRM depasse la taille maximale autorisee.",
        ) from exc