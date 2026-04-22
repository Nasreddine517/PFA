from fastapi import APIRouter, Depends

from app.api.dependencies.auth import get_current_user, get_current_user_document
from app.schemas.auth import UpdateCurrentUserRequest, UserResponse
from app.services.users_service import update_current_user

router = APIRouter()


@router.get("/me", response_model=UserResponse, summary="Get current user profile")
async def get_me(current_user: UserResponse = Depends(get_current_user)) -> UserResponse:
    return current_user


@router.put("/me", response_model=UserResponse, summary="Update current user profile")
async def update_me(
    payload: UpdateCurrentUserRequest,
    current_user_document: dict = Depends(get_current_user_document),
) -> UserResponse:
    return await update_current_user(current_user_document, payload)