from bson import ObjectId
from pymongo import ReturnDocument

from app.database.mongodb import get_database, get_scan_collection_name


async def insert(document: dict) -> dict:
    result = await get_database()[get_scan_collection_name()].insert_one(document)
    document["_id"] = result.inserted_id
    return document


async def find_by_id_and_doctor(scan_id: str, doctor_id: str) -> dict | None:
    return await get_database()[get_scan_collection_name()].find_one(
        {"_id": ObjectId(scan_id), "doctor_id": doctor_id}
    )


async def update(scan_object_id: ObjectId, updates: dict) -> dict | None:
    return await get_database()[get_scan_collection_name()].find_one_and_update(
        {"_id": scan_object_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
