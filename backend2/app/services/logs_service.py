from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from ..utils.ssh import SSHError, execute_ssh_command


def fetch_logs(device: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
    commands = [
        "dmesg | tail -50",
        "tail -50 /var/log/messages 2>/dev/null || tail -50 /var/log/syslog 2>/dev/null",
        "Get-EventLog -LogName System -Newest 50",
    ]

    output = ""
    for command in commands:
        try:
            output = execute_ssh_command(device, command)
            if output and "not recognized" not in output.lower():
                break
        except SSHError:
            continue

    logs = []
    for line in output.splitlines():
        if not line.strip():
            continue
        level = "info"
        lower = line.lower()
        if "error" in lower or "fail" in lower:
            level = "error"
        elif "warn" in lower:
            level = "warning"
        logs.append(
            {
                "level": level,
                "message": line.strip(),
                "timestamp": datetime.utcnow().isoformat(),
            }
        )
    return {"logs": logs[-50:]}
