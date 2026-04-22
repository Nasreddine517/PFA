from pymongo.errors import DuplicateKeyError

from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.database.mongodb import get_database, get_user_collection_name
from app.models.user import build_user_document
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    UserResponse,
)


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


def build_user_response(user_document: dict) -> UserResponse:
    return UserResponse(
        id=str(user_document["_id"]),
        email=user_document["email"],
        fullName=user_document["full_name"],
        specialty=user_document["specialty"],
        hospital=user_document["hospital"],
        avatarUrl=user_document["avatar_url"],
    )


async def register_user(payload: RegisterRequest) -> AuthResponse:
    database = get_database()
    users_collection = database[get_user_collection_name()]

    user_document = build_user_document(
        email=str(payload.email),
        full_name=payload.full_name,
        password_hash=hash_password(payload.password),
    )

    try:
        insert_result = await users_collection.insert_one(user_document)
    except DuplicateKeyError as exc:
        raise EmailAlreadyRegisteredError from exc

    user_document["_id"] = insert_result.inserted_id
    user = build_user_response(user_document)
    access_token = create_access_token(user.id)

    return AuthResponse(accessToken=access_token, user=user)


async def login_user(payload: LoginRequest) -> AuthResponse:
    database = get_database()
    users_collection = database[get_user_collection_name()]

    user_document = await users_collection.find_one({"email": str(payload.email)})
    if user_document is None:
        raise InvalidCredentialsError()

    if not verify_password(payload.password, user_document["password_hash"]):
        raise InvalidCredentialsError()

    user = build_user_response(user_document)
    access_token = create_access_token(user.id)

    return AuthResponse(accessToken=access_token, user=user)