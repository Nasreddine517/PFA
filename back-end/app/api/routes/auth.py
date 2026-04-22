from fastapi import APIRouter, HTTPException, status

from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
)
from app.services.auth_service import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    login_user,
    register_user,
)

router = APIRouter()


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a doctor account",
)
async def register(payload: RegisterRequest) -> AuthResponse:
    try:
        return await register_user(payload)
    except EmailAlreadyRegisteredError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Un compte avec cet email existe deja.",
        ) from exc


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Authenticate a doctor account",
)
async def login(payload: LoginRequest) -> AuthResponse:
    try:
        return await login_user(payload)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect.",
        ) from exc
