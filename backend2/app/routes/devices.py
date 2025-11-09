from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status

from ..db import get_devices_collection
from ..models import DeviceCreate
from ..services.metrics_service import collect_metrics
from ..services.logs_service import fetch_logs

router = APIRouter(prefix="/api/devices", tags=["devices"])


def _serialize_device(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": str(doc.get("_id")),
        "name": doc.get("name"),
        "host": doc.get("host"),
        "port": doc.get("port"),
        "username": doc.get("username"),
        "password": doc.get("password"),
        "description": doc.get("description", ""),
        "createdAt": doc.get("createdAt"),
        "updatedAt": doc.get("updatedAt"),
        "status": doc.get("status", "unknown"),
        "lastSeen": doc.get("lastSeen"),
    }


def _get_device_or_404(device_id: str) -> Dict[str, Any]:
    collection = get_devices_collection()
    try:
        doc = collection.find_one({"_id": ObjectId(device_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return doc


@router.get("/")
def list_devices() -> Dict[str, List[Dict[str, Any]]]:
    collection = get_devices_collection()
    devices = [_serialize_device(doc) for doc in collection.find().sort("createdAt", -1)]
    return {"statusCode": 200, "data": devices, "message": "Devices retrieved successfully", "success": True}


@router.get("/{device_id}")
def get_device(device_id: str) -> Dict[str, Any]:
    doc = _get_device_or_404(device_id)
    return {"statusCode": 200, "data": _serialize_device(doc), "message": "Device retrieved successfully", "success": True}


@router.post("/", status_code=status.HTTP_201_CREATED)
def create_device(payload: DeviceCreate) -> Dict[str, Any]:
    collection = get_devices_collection()
    now = datetime.utcnow().isoformat()
    device_data = payload.dict()
    device_data.update({"status": "unknown", "lastSeen": None, "createdAt": now, "updatedAt": now})
    result = collection.insert_one(device_data)
    inserted = collection.find_one({"_id": result.inserted_id})
    return {"statusCode": 201, "data": _serialize_device(inserted), "message": "Device added successfully", "success": True}


@router.delete("/{device_id}")
def delete_device(device_id: str) -> Dict[str, Any]:
    collection = get_devices_collection()
    try:
        result = collection.delete_one({"_id": ObjectId(device_id)})
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return {"statusCode": 200, "data": None, "message": "Device deleted successfully", "success": True}


@router.get("/{device_id}/metrics")
def get_device_metrics(device_id: str) -> Dict[str, Any]:
    collection = get_devices_collection()
    doc = _get_device_or_404(device_id)
    device = _serialize_device(doc)
    metrics = collect_metrics(device)

    status_payload = metrics.get("status", {})
    update_doc = {
        "status": "online" if status_payload.get("online") else "offline",
        "lastSeen": status_payload.get("lastSeen"),
        "updatedAt": datetime.utcnow().isoformat(),
    }
    collection.update_one({"_id": ObjectId(device_id)}, {"$set": update_doc})

    return {"statusCode": 200, "data": metrics, "message": "Metrics retrieved successfully", "success": True}


@router.get("/{device_id}/logs")
def get_device_logs(device_id: str) -> Dict[str, Any]:
    doc = _get_device_or_404(device_id)
    device = _serialize_device(doc)
    logs = fetch_logs(device)
    return {"statusCode": 200, "data": logs, "message": "Logs retrieved successfully", "success": True}
