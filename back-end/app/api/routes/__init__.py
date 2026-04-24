from fastapi import APIRouter

from app.api.routes.analyses import router as analyses_router
from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.scans import router as scans_router
from app.api.routes.users import router as users_router

api_router = APIRouter()
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(health_router, tags=["health"])
api_router.include_router(scans_router, prefix="/scans", tags=["scans"])
api_router.include_router(analyses_router, prefix="/analyses", tags=["analyses"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
