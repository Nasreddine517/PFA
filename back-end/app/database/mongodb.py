import certifi
from pymongo import ASCENDING
from pymongo.errors import PyMongoError
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

client: AsyncIOMotorClient | None = None
database: AsyncIOMotorDatabase | None = None
connection_error: str | None = None


async def connect_to_mongo() -> None:
    global client, database, connection_error

    if client is not None:
        return

    try:
        client = AsyncIOMotorClient(
            settings.mongo_uri,
            tlsCAFile=certifi.where(),
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000,
            socketTimeoutMS=5000,
        )
        database = client[settings.mongo_db_name]
        await client.admin.command("ping")
        await database["users"].create_index([("email", ASCENDING)], unique=True)
        await database[get_scan_collection_name()].create_index([("doctor_id", ASCENDING)])
        await database[get_analysis_collection_name()].create_index([("doctor_id", ASCENDING)])
        await database[get_analysis_collection_name()].create_index([("scan_id", ASCENDING)])
        connection_error = None
    except PyMongoError as exc:
        if client is not None:
            client.close()
        client = None
        database = None
        connection_error = str(exc)
        raise RuntimeError(f"MongoDB connection failed: {exc}") from exc


async def close_mongo_connection() -> None:
    global client, database, connection_error

    if client is not None:
        client.close()

    client = None
    database = None
    connection_error = None


def get_database() -> AsyncIOMotorDatabase:
    if database is None:
        if connection_error:
            raise RuntimeError(
                f"MongoDB connection is unavailable: {connection_error}",
            )
        raise RuntimeError("MongoDB connection has not been initialized.")

    return database


def get_user_collection_name() -> str:
    return "users"


def get_scan_collection_name() -> str:
    return "scans"


def get_analysis_collection_name() -> str:
    return "analyses"
