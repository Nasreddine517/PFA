from datetime import UTC, datetime

from app.repositories import user_repository
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

    updated_user_document = await user_repository.update(
        current_user_document["_id"], updates
    )

    if updated_user_document is None:
        return build_user_response(current_user_document)

    return build_user_response(updated_user_document)