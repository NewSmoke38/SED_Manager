# Secure Edge Device Manager (Python Backend)

This folder provides a FastAPI-based backend that mirrors the functionality of the original Node.js backend. It offers REST APIs for managing edge devices, collecting live metrics via SSH, fetching system logs, and exposing a WebSocket endpoint for interactive terminal sessions.

## Features

- FastAPI REST endpoints under `/api` for devices and health checks
- MongoDB persistence using `pymongo`
- SSH utilities powered by Paramiko for Linux and Windows hosts
- Metrics collection (CPU, memory, disk, network, processes)
- System log retrieval with fallbacks
- WebSocket terminal bridge compatible with the existing frontend (connect at `/ws/terminal`)

## Getting Started

```bash
# Install dependencies
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env  # or set variables manually

# Start the API server
uvicorn app.main:app --reload --port 8000
```

The WebSocket terminal listens on the same process (default: `ws://localhost:8000/ws/terminal`).

## Environment Variables

- `MONGODB_URI` – Connection string for MongoDB (default: `mongodb://localhost:27017/edge-device-manager`)
- `MONGODB_DB` – Database name (default: `edge-device-manager`)
- `SSH_CONNECT_TIMEOUT` – Optional connection timeout (seconds)

## API Overview

- `GET /api/health` – API health check
- `GET /api/devices` – List devices
- `POST /api/devices` – Add a device
- `GET /api/devices/{id}` – Retrieve device details
- `DELETE /api/devices/{id}` – Remove device
- `GET /api/devices/{id}/metrics` – Collect live metrics over SSH
- `GET /api/devices/{id}/logs` – Fetch recent system logs

All responses follow the same envelope used by the frontend.

## WebSocket Protocol

Connect to `/ws/terminal` and exchange JSON messages with the same shape as the Node.js implementation:

```json
{ "type": "connect", "host": "localhost", "port": 2222, "username": "root", "password": "toor" }
{ "type": "input", "data": "ls -la\n" }
{ "type": "resize", "rows": 24, "cols": 80 }
```

Server messages:

```json
{ "type": "status", "status": "connected" }
{ "type": "data", "data": "..." }
{ "type": "error", "error": "..." }
```

## Directory Structure

```
backend2/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── db.py
│   ├── main.py
│   ├── models.py
│   ├── routes/
│   │   └── devices.py
│   ├── services/
│   │   ├── logs_service.py
│   │   └── metrics_service.py
│   └── utils/
│       └── ssh.py
├── requirements.txt
├── .env.example
└── README.md
```

This backend is a drop-in alternative for the existing frontend. Start it on port `8000` and the frontend will communicate without modifications.
