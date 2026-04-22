from pydantic import AliasChoices, BaseModel, ConfigDict, EmailStr, Field, field_validator


DOCTOR_NAME_PATTERN = r"^Dr\.[A-Za-zÀ-ÖØ-öø-ÿ]+([ '-][A-Za-zÀ-ÖØ-öø-ÿ]+)*$"


class RegisterRequest(BaseModel):
    full_name: str = Field(..., alias="fullName", min_length=4, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        candidate = value.strip()
        if not candidate:
            raise ValueError("Le nom complet est obligatoire.")
        import re
        if not re.match(DOCTOR_NAME_PATTERN, candidate):
            raise ValueError("Le nom doit respecter le format Dr.NomComplet.")
        return candidate

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return value.strip().lower()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return value.strip().lower()


class UpdateCurrentUserRequest(BaseModel):
    full_name: str | None = Field(
        None,
        alias="fullName",
        validation_alias=AliasChoices("fullName", "displayName"),
        min_length=2,
        max_length=120,
    )
    specialty: str | None = Field(None, min_length=2, max_length=120)
    hospital: str | None = Field(None, min_length=2, max_length=160)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        candidate = value.strip()
        if not candidate:
            raise ValueError("Le nom complet est obligatoire.")
        return candidate

    @field_validator("specialty", "hospital")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        candidate = value.strip()
        return candidate or None


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str = Field(..., alias="fullName")
    specialty: str | None = None
    hospital: str | None = None
    avatar_url: str | None = Field(None, alias="avatarUrl")

    model_config = ConfigDict(populate_by_name=True)


class AuthResponse(BaseModel):
    access_token: str = Field(..., alias="accessToken")
    token_type: str = Field(default="bearer", alias="tokenType")
    user: UserResponse

    model_config = ConfigDict(populate_by_name=True)