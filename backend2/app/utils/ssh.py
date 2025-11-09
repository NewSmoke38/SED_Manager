from __future__ import annotations

import socket
from datetime import datetime
from typing import Any, Dict

import paramiko

from ..config import get_settings

settings = get_settings()


class SSHError(Exception):
    pass


def create_ssh_client(device: Dict[str, Any]) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(
            hostname=device["host"],
            port=int(device.get("port", 22)),
            username=device["username"],
            password=device["password"],
            timeout=settings.ssh_connect_timeout,
            allow_agent=False,
            look_for_keys=False,
        )
        return client
    except (socket.error, paramiko.SSHException) as exc:
        raise SSHError(str(exc)) from exc


def execute_ssh_command(device: Dict[str, Any], command: str) -> str:
    client = None
    try:
        client = create_ssh_client(device)
        stdin, stdout, stderr = client.exec_command(command)
        stdout.channel.settimeout(20)
        output = stdout.read().decode("utf-8", "ignore")
        error_output = stderr.read().decode("utf-8", "ignore")
        return output if output else error_output
    finally:
        if client:
            client.close()


def detect_os(device: Dict[str, Any]) -> str:
    try:
        result = execute_ssh_command(device, "uname -s 2>/dev/null || echo Windows")
        os_name = result.strip().lower()
        if "linux" in os_name:
            return "linux"
        if "darwin" in os_name:
            return "macos"
        if "windows" in os_name:
            return "windows"
    except SSHError:
        pass

    try:
        result = execute_ssh_command(device, "ver")
        if "windows" in result.lower():
            return "windows"
    except SSHError:
        pass

    return "linux"


def check_device_status(device: Dict[str, Any]) -> Dict[str, Any]:
    try:
        execute_ssh_command(device, "echo ping")
        return {"online": True, "lastSeen": datetime.utcnow().isoformat()}
    except SSHError as exc:
        return {"online": False, "error": str(exc), "lastSeen": None}
