from __future__ import annotations

import asyncio
import json
from typing import Any, Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pymongo import ASCENDING

from .config import get_settings
from .db import get_devices_collection
from .routes.devices import router as devices_router
from .utils.ssh import SSHError, create_ssh_client

settings = get_settings()

app = FastAPI(title="Secure Edge Device Manager API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    collection = get_devices_collection()
    collection.create_index([("host", ASCENDING), ("port", ASCENDING)])


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    from datetime import datetime

    return {
        "status": "ok",
        "message": "Secure Edge Device Manager API",
        "timestamp": datetime.utcnow().isoformat(),
    }


app.include_router(devices_router)


async def _stream_channel(websocket: WebSocket, channel) -> None:
    try:
        while True:
            await asyncio.sleep(0.02)
            if channel.closed:
                break
            if channel.recv_ready():
                data = channel.recv(1024)
                if data:
                    await websocket.send_json({"type": "data", "data": data.decode("utf-8", "ignore")})
    except Exception:
        pass


@app.websocket(settings.websocket_path)
async def terminal_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    ssh_client = None
    channel = None
    stream_task = None

    try:
        while True:
            message = await websocket.receive_text()
            payload = json.loads(message)
            msg_type = payload.get("type")

            if msg_type == "connect":
                device = {
                    "host": payload.get("host"),
                    "port": payload.get("port", 22),
                    "username": payload.get("username"),
                    "password": payload.get("password"),
                }
                try:
                    ssh_client = create_ssh_client(device)
                    channel = ssh_client.invoke_shell()
                    channel.settimeout(0.0)
                    await websocket.send_json({"type": "status", "status": "connected"})
                    stream_task = asyncio.create_task(_stream_channel(websocket, channel))
                except SSHError as exc:
                    await websocket.send_json({"type": "error", "error": str(exc)})
            elif msg_type == "input" and channel:
                data = payload.get("data", "")
                channel.send(data)
            elif msg_type == "resize" and channel:
                rows = payload.get("rows")
                cols = payload.get("cols")
                if rows and cols:
                    try:
                        channel.resize_pty(width=cols, height=rows)
                    except Exception:
                        pass
    except WebSocketDisconnect:
        pass
    finally:
        if stream_task:
            stream_task.cancel()
        if channel:
            try:
                channel.close()
            except Exception:
                pass
        if ssh_client:
            ssh_client.close()
        await websocket.close()
