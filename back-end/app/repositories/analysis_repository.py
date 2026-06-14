from bson import ObjectId
from pymongo import DESCENDING

from app.database.mongodb import get_analysis_collection_name, get_database


async def insert(document: dict) -> dict:
    result = await get_database()[get_analysis_collection_name()].insert_one(document)
    document["_id"] = result.inserted_id
    return document


async def find_by_scan_and_doctor(scan_id: str, doctor_id: str) -> dict | None:
    return await get_database()[get_analysis_collection_name()].find_one(
        {"scan_id": scan_id, "doctor_id": doctor_id}
    )


async def find_by_id_and_doctor(analysis_id: str, doctor_id: str) -> dict | None:
    return await get_database()[get_analysis_collection_name()].find_one(
        {"_id": ObjectId(analysis_id), "doctor_id": doctor_id}
    )


async def find_all_by_doctor(doctor_id: str) -> list[dict]:
    return await get_database()[get_analysis_collection_name()].find(
        {"doctor_id": doctor_id},
        {"result": 1, "confidence": 1, "created_at": 1},
    ).sort("created_at", DESCENDING).to_list(length=None)
