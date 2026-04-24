from pathlib import Path

from bson import ObjectId
from fastapi import HTTPException, status
from pymongo import ReturnDocument

from app.database.mongodb import (
    get_analysis_collection_name,
    get_database,
    get_scan_collection_name,
)
from app.models.analysis import build_analysis_document
from app.schemas.analysis import AnalysisResponse, BoundingBoxResponse
from app.services.inference_service import (
    InferenceInputError,
    ModelConfigurationError,
    run_inference,
)


def build_analysis_response(analysis_document: dict, scan_document: dict) -> AnalysisResponse:
    bounding_box = analysis_document.get("bounding_box")
    return AnalysisResponse(
        id=str(analysis_document["_id"]),
        scanId=str(scan_document["_id"]),
        fileName=scan_document["file_name"],
        fileType=scan_document["file_type"],
        imageUrl=scan_document.get("image_url"),
        result=analysis_document["result"],
        confidence=analysis_document["confidence"],
        tumorDetected=analysis_document["tumor_detected"],
        tumorType=analysis_document.get("tumor_type"),
        tumorGrade=analysis_document.get("tumor_grade"),
        tumorLocation=analysis_document.get("tumor_location"),
        tumorSize=analysis_document.get("tumor_size"),
        tumorVolume=analysis_document.get("tumor_volume"),
        boundingBox=BoundingBoxResponse(**bounding_box) if bounding_box else None,
        reportText=analysis_document["report_text"],
        modelVersion=analysis_document["model_version"],
        createdAt=analysis_document["created_at"],
    )


async def create_analysis(*, doctor_id: str, scan_id: str) -> AnalysisResponse:
    if not ObjectId.is_valid(scan_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Scan invalide.")

    database = get_database()
    scans_collection = database[get_scan_collection_name()]
    analyses_collection = database[get_analysis_collection_name()]

    scan_document = await scans_collection.find_one(
        {"_id": ObjectId(scan_id), "doctor_id": doctor_id},
    )
    if scan_document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan introuvable.")

    existing_analysis = await analyses_collection.find_one(
        {"scan_id": scan_id, "doctor_id": doctor_id},
    )
    if existing_analysis is not None:
        return build_analysis_response(existing_analysis, scan_document)

    file_bytes = Path(scan_document["storage_path"]).read_bytes()
    try:
        inference_result = run_inference(
            file_bytes=file_bytes,
            file_name=scan_document["file_name"],
            file_type=scan_document["file_type"],
        )
    except InferenceInputError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le modele IA accepte actuellement uniquement des images PNG ou JPEG exploitables.",
        ) from exc
    except ModelConfigurationError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Le modele IA n'est pas correctement configure sur le serveur.",
        ) from exc

    analysis_document = build_analysis_document(
        doctor_id=doctor_id,
        scan_id=scan_id,
        result=inference_result["result"],
        confidence=inference_result["confidence"],
        tumor_detected=inference_result["tumor_detected"],
        tumor_type=inference_result["tumor_type"],
        tumor_grade=inference_result["tumor_grade"],
        tumor_location=inference_result["tumor_location"],
        tumor_size=inference_result["tumor_size"],
        tumor_volume=inference_result["tumor_volume"],
        bounding_box=inference_result.get("bounding_box"),
        report_text=inference_result["report_text"],
        model_version=inference_result["model_version"],
    )
    insert_result = await analyses_collection.insert_one(analysis_document)
    analysis_document["_id"] = insert_result.inserted_id

    updated_scan_document = await scans_collection.find_one_and_update(
        {"_id": scan_document["_id"]},
        {
            "$set": {
                "analysis_status": "completed",
                "latest_analysis_id": str(insert_result.inserted_id),
            },
        },
        return_document=ReturnDocument.AFTER,
    )

    return build_analysis_response(analysis_document, updated_scan_document or scan_document)


async def get_analysis(*, doctor_id: str, analysis_id: str) -> AnalysisResponse:
    if not ObjectId.is_valid(analysis_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Analyse invalide.")

    database = get_database()
    scans_collection = database[get_scan_collection_name()]
    analyses_collection = database[get_analysis_collection_name()]

    analysis_document = await analyses_collection.find_one(
        {"_id": ObjectId(analysis_id), "doctor_id": doctor_id},
    )
    if analysis_document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analyse introuvable.")

    scan_document = await scans_collection.find_one(
        {"_id": ObjectId(analysis_document["scan_id"]), "doctor_id": doctor_id},
    )
    if scan_document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan introuvable.")

    return build_analysis_response(analysis_document, scan_document)