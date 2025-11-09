from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from ..utils.ssh import (
    SSHError,
    check_device_status,
    detect_os,
    execute_ssh_command,
)


def _parse_linux_memory(output: str) -> Dict[str, Any]:
    lines = output.splitlines()
    for line in lines:
        if "Mem:" in line:
            parts = line.split()
            total = int(parts[1])
            used = int(parts[2])
            free = int(parts[3])
            available = int(parts[6] if len(parts) > 6 else parts[3])
            used_percent = round((used / total) * 100) if total else 0
            return {
                "total": f"{total / 1024:.2f} GB",
                "used": f"{used / 1024:.2f} GB",
                "free": f"{free / 1024:.2f} GB",
                "available": f"{available / 1024:.2f} GB",
                "usedPercent": f"{used_percent}%",
            }
    return {"total": "N/A", "used": "N/A", "free": "N/A", "available": "N/A", "usedPercent": "N/A"}


def _parse_linux_cpu(top_output: str, load_output: str) -> Dict[str, Any]:
    cpu_info = {
        "usedPercent": "N/A",
        "userPercent": "N/A",
        "systemPercent": "N/A",
        "loadAverage": {"1min": "N/A", "5min": "N/A", "15min": "N/A"},
        "processes": [],
    }

    lines = top_output.splitlines()
    cpu_line = next((line for line in lines if "Cpu" in line or "CPU:" in line), "")
    if cpu_line:
        parts = cpu_line.replace(",", "").split()
        try:
            user_idx = parts.index("us") - 1 if "us" in parts else None
            sys_idx = parts.index("sy") - 1 if "sy" in parts else None
            idle_idx = parts.index("id") - 1 if "id" in parts else None

            user_percent = float(parts[user_idx]) if user_idx is not None else 0.0
            system_percent = float(parts[sys_idx]) if sys_idx is not None else 0.0
            idle_percent = float(parts[idle_idx]) if idle_idx is not None else 0.0
            used_percent = 100.0 - idle_percent if idle_idx is not None else user_percent + system_percent

            cpu_info.update(
                {
                    "usedPercent": f"{used_percent:.1f}%",
                    "userPercent": f"{user_percent:.1f}%",
                    "systemPercent": f"{system_percent:.1f}%",
                }
            )
        except (ValueError, IndexError):
            pass

    load_parts = load_output.split()
    if len(load_parts) >= 3:
        cpu_info["loadAverage"] = {
            "1min": load_parts[0],
            "5min": load_parts[1],
            "15min": load_parts[2],
        }

    proc_section = False
    for line in lines:
        if line.strip().startswith("PID") and ("USER" in line or "Command" in line):
            proc_section = True
            continue
        if proc_section and line.strip():
            proc_parts = line.split()
            if len(proc_parts) >= 12:
                cpu_info["processes"].append(
                    {
                        "pid": proc_parts[0],
                        "user": proc_parts[1],
                        "cpu": f"{proc_parts[8]}%",
                        "memory": f"{proc_parts[9]}%",
                        "command": " ".join(proc_parts[11:]) or proc_parts[-1],
                    }
                )
            if len(cpu_info["processes"]) >= 5:
                break

    return cpu_info


def _parse_linux_disk(output: str) -> Dict[str, Any]:
    filesystems: List[Dict[str, str]] = []
    lines = output.splitlines()[1:]
    for line in lines:
        parts = line.split()
        if len(parts) >= 6:
            filesystems.append(
                {
                    "filesystem": parts[0],
                    "size": parts[1],
                    "used": parts[2],
                    "available": parts[3],
                    "usedPercent": parts[4],
                    "mountedOn": parts[5],
                }
            )
    return {"filesystems": filesystems}


def _parse_linux_network(output: str) -> Dict[str, Any]:
    interfaces: List[Dict[str, str]] = []
    current_name = None
    for line in output.splitlines():
        if line and not line.startswith(" "):
            current_name = line.split(":")[0]
            if current_name != "lo":
                interfaces.append({"name": current_name, "rx": "N/A", "tx": "N/A"})
        elif current_name and "RX packets" in line:
            bytes_val = line.split("bytes")[-1].strip().split()[0]
            interfaces[-1]["rx"] = f"{int(bytes_val) / (1024 * 1024):.2f} MB"
        elif current_name and "TX packets" in line:
            bytes_val = line.split("bytes")[-1].strip().split()[0]
            interfaces[-1]["tx"] = f"{int(bytes_val) / (1024 * 1024):.2f} MB"
    return {"interfaces": interfaces}


def _parse_windows_memory(output: str) -> Dict[str, Any]:
    total = free = 0
    for line in output.splitlines():
        if "TotalVisibleMemorySize=" in line:
            total = int(line.split("=")[-1])
        if "FreePhysicalMemory=" in line:
            free = int(line.split("=")[-1])
    if total:
        used = total - free
        return {
            "total": f"{total / (1024 * 1024):.2f} GB",
            "used": f"{used / (1024 * 1024):.2f} GB",
            "free": f"{free / (1024 * 1024):.2f} GB",
            "available": f"{free / (1024 * 1024):.2f} GB",
            "usedPercent": f"{(used / total) * 100:.0f}%",
        }
    return {"total": "N/A", "used": "N/A", "free": "N/A", "available": "N/A", "usedPercent": "N/A"}


def _parse_windows_cpu(output: str, processes_output: str) -> Dict[str, Any]:
    cpu_data = {
        "usedPercent": "N/A",
        "userPercent": "N/A",
        "systemPercent": "N/A",
        "loadAverage": {"1min": "N/A", "5min": "N/A", "15min": "N/A"},
        "processes": [],
    }
    for line in output.splitlines():
        if "LoadPercentage=" in line:
            value = float(line.split("=")[-1])
            cpu_data["usedPercent"] = f"{value:.1f}%"
            cpu_data["userPercent"] = f"{value * 0.7:.1f}%"
            cpu_data["systemPercent"] = f"{value * 0.3:.1f}%"
            break

    lines = processes_output.splitlines()[1:]
    for line in lines[:5]:
        parts = line.split()
        if len(parts) >= 6:
            cpu_data["processes"].append(
                {
                    "pid": parts[1],
                    "user": "N/A",
                    "cpu": "N/A",
                    "memory": parts[4] if len(parts) > 4 else "N/A",
                    "command": " ".join(parts[5:]) or parts[0],
                }
            )
    return cpu_data


def _parse_windows_disk(output: str) -> Dict[str, Any]:
    filesystems: List[Dict[str, str]] = []
    current: Dict[str, str] = {}
    for line in output.splitlines():
        if "Caption=" in line:
            if current.get("Caption") and current.get("Size") and current.get("FreeSpace"):
                total = int(current["Size"]) / (1024 ** 3)
                free = int(current["FreeSpace"]) / (1024 ** 3)
                used = total - free
                percent = round((used / total) * 100) if total else 0
                filesystems.append(
                    {
                        "filesystem": current["Caption"],
                        "size": f"{total:.2f}G",
                        "used": f"{used:.2f}G",
                        "available": f"{free:.2f}G",
                        "usedPercent": f"{percent}%",
                        "mountedOn": current["Caption"],
                    }
                )
            current = {"Caption": line.split("=")[-1]}
        elif "Size=" in line:
            current["Size"] = line.split("=")[-1]
        elif "FreeSpace=" in line:
            current["FreeSpace"] = line.split("=")[-1]
    if current.get("Caption") and current.get("Size") and current.get("FreeSpace"):
        total = int(current["Size"]) / (1024 ** 3)
        free = int(current["FreeSpace"]) / (1024 ** 3)
        used = total - free
        percent = round((used / total) * 100) if total else 0
        filesystems.append(
            {
                "filesystem": current["Caption"],
                "size": f"{total:.2f}G",
                "used": f"{used:.2f}G",
                "available": f"{free:.2f}G",
                "usedPercent": f"{percent}%",
                "mountedOn": current["Caption"],
            }
        )
    return {"filesystems": filesystems}


def collect_metrics(device: Dict[str, Any]) -> Dict[str, Any]:
    status = check_device_status(device)
    if not status.get("online"):
        return {
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
        }

    os_type = detect_os(device)

    try:
        if os_type == "windows":
            memory_output = execute_ssh_command(device, "wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /format:list")
            cpu_output = execute_ssh_command(device, "wmic cpu get loadpercentage /format:list")
            processes_output = execute_ssh_command(device, "tasklist")
            disk_output = execute_ssh_command(device, "wmic logicaldisk get caption,freespace,size /format:list")

            metrics = {
                "status": status,
                "memory": _parse_windows_memory(memory_output),
                "cpu": _parse_windows_cpu(cpu_output, processes_output),
                "disk": _parse_windows_disk(disk_output),
                "network": {"interfaces": []},
                "timestamp": datetime.utcnow().isoformat(),
            }
            return metrics

        memory_output = execute_ssh_command(device, "free -m")
        top_output = execute_ssh_command(device, "top -bn1 | head -20")
        load_output = execute_ssh_command(device, "cat /proc/loadavg | awk '{print $1, $2, $3}'")
        disk_output = execute_ssh_command(device, "df -h")
        network_output = execute_ssh_command(device, "ifconfig || ip -s link")

        metrics = {
            "status": status,
            "memory": _parse_linux_memory(memory_output),
            "cpu": _parse_linux_cpu(top_output, load_output),
            "disk": _parse_linux_disk(disk_output),
            "network": _parse_linux_network(network_output),
            "timestamp": datetime.utcnow().isoformat(),
        }
        return metrics

    except SSHError as exc:
        return {
            "status": {"online": False, "error": str(exc)},
            "timestamp": datetime.utcnow().isoformat(),
        }
