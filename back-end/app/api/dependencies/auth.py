import jwt
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_access_token
from app.database.mongodb import get_database, get_user_collection_name
from app.schemas.auth import UserResponse
from app.services.auth_service import build_user_response

bearer_scheme = HTTPBearer(auto_error=False)


def build_credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expire.",
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user_document(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    credentials_exception = build_credentials_exception()

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise credentials_exception

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.InvalidTokenError as exc:
        raise credentials_exception from exc

    user_id = payload["sub"]
    if not ObjectId.is_valid(user_id):
        raise credentials_exception

    database = get_database()
    users_collection = database[get_user_collection_name()]
    user_document = await users_collection.find_one({"_id": ObjectId(user_id)})
    if user_document is None:
        raise credentials_exception

    return user_document


async def get_current_user(
    user_document: dict = Depends(get_current_user_document),
) -> UserResponse:
    return build_user_response(user_document)