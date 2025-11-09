from functools import lru_cache
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

class Settings(BaseModel):
    mongo_uri: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/edge-device-manager")
    database_name: str = os.getenv("MONGODB_DB", "edge-device-manager")
    api_prefix: str = "/api"
    websocket_path: str = "/ws/terminal"
    ssh_connect_timeout: int = 10

@lru_cache
def get_settings() -> Settings:
    return Settings()
