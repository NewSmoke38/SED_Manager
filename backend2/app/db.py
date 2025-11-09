from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.database import Database
from typing import Optional
from .config import get_settings

settings = get_settings()     # reads .env via pydantic

_client: Optional[MongoClient] = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(settings.mongo_uri)
    return _client

def get_database() -> Database:
    client = get_client()
    return client[settings.database_name]

def get_devices_collection() -> Collection:
    return get_database().get_collection("devices")
