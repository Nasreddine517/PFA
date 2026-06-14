from bson import ObjectId
from pymongo import ReturnDocument

from app.database.mongodb import get_database, get_user_collection_name


async def insert(document: dict) -> dict:
    result = await get_database()[get_user_collection_name()].insert_one(document)
    document["_id"] = result.inserted_id
    return document


async def find_by_id(user_id: str) -> dict | None:
    return await get_database()[get_user_collection_name()].find_one({"_id": ObjectId(user_id)})


async def find_by_email(email: str) -> dict | None:
    return await get_database()[get_user_collection_name()].find_one({"email": email})


async def update(user_object_id: ObjectId, updates: dict) -> dict | None:
    return await get_database()[get_user_collection_name()].find_one_and_update(
        {"_id": user_object_id},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
