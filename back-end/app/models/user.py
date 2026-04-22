from datetime import UTC, datetime
from typing import Any


def build_user_document(*, email: str, full_name: str, password_hash: str) -> dict[str, Any]:
    now = datetime.now(UTC)
    return {
        "email": email,
        "full_name": full_name,
        "password_hash": password_hash,
        "specialty": None,
        "hospital": None,
        "avatar_url": None,
        "created_at": now,
        "updated_at": now,
    }
