from datetime import UTC, datetime

from pymongo import ReturnDocument

from app.database.mongodb import get_database, get_user_collection_name
from app.schemas.auth import UpdateCurrentUserRequest, UserResponse
from app.services.auth_service import build_user_response


async def update_current_user(
    current_user_document: dict,
    payload: UpdateCurrentUserRequest,
) -> UserResponse:
    updates = payload.model_dump(exclude_unset=True, by_alias=False)
    if not updates:
        return build_user_response(current_user_document)

    updates["updated_at"] = datetime.now(UTC)

    database = get_database()
    users_collection = database[get_user_collection_name()]
    updated_user_document = await users_collection.find_one_and_update(
        {"_id": current_user_document["_id"]},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )

    if updated_user_document is None:
        return build_user_response(current_user_document)

    return build_user_response(updated_user_document)