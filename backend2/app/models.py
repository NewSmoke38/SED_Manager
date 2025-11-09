from datetime import datetime
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel, Field

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return v
        try:
            return ObjectId(str(v))
        except Exception as exc:
            raise ValueError("Invalid ObjectId") from exc

class DeviceBase(BaseModel):
    name: str
    host: str
    port: int = Field(ge=1, le=65535)
    username: str
    password: str
    description: Optional[str] = ""

class DeviceCreate(DeviceBase):
    pass

class DeviceResponse(DeviceBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    status: Optional[str] = "unknown"
    lastSeen: Optional[datetime] = None
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class DeviceMetrics(BaseModel):
    status: dict
    memory: dict
    cpu: dict
    disk: dict
    network: dict
    timestamp: datetime

class LogsResponse(BaseModel):
    logs: list
