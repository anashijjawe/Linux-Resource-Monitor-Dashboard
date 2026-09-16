from __future__ import annotations

import os
import socket
import time
from datetime import datetime, timezone

import psutil
from flask import Flask, jsonify, render_template


app = Flask(__name__)
APP_START_TIME = time.time()


def bytes_to_human(value: int | float) -> str:
    """Convert a byte count to a compact human-readable string."""
    units = ("B", "KB", "MB", "GB", "TB", "PB")
    size = float(value)
    for unit in units:
        if abs(size) < 1024.0 or unit == units[-1]:
            return f"{size:.1f} {unit}"
        size /= 1024.0
    return f"{size:.1f} PB"


def safe_loadavg() -> tuple[float | None, float | None, float | None]:
    """Return 1/5/15 minute load averages when the platform supports them."""
    try:
        return tuple(round(value, 2) for value in os.getloadavg())  # type: ignore[return-value]
    except (AttributeError, OSError):
        return (None, None, None)


def collect_metrics() -> dict:
    """Collect current operating-system resource metrics."""
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    network = psutil.net_io_counters()
    load_1, load_5, load_15 = safe_loadavg()

    boot_time = psutil.boot_time()
    uptime_seconds = max(0, int(time.time() - boot_time))

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "host": {
            "hostname": socket.gethostname(),
            "cpu_count_logical": psutil.cpu_count(logical=True),
            "cpu_count_physical": psutil.cpu_count(logical=False),
            "process_count": len(psutil.pids()),
            "uptime_seconds": uptime_seconds,
            "app_uptime_seconds": max(0, int(time.time() - APP_START_TIME)),
            "load_average": {
                "1m": load_1,
                "5m": load_5,
                "15m": load_15,
            },
        },
        "cpu": {
            "usage_percent": round(psutil.cpu_percent(interval=0.15), 1),
        },
        "memory": {
            "total_bytes": memory.total,
            "used_bytes": memory.used,
            "available_bytes": memory.available,
            "usage_percent": round(memory.percent, 1),
            "total_human": bytes_to_human(memory.total),
            "used_human": bytes_to_human(memory.used),
            "available_human": bytes_to_human(memory.available),
        },
        "disk": {
            "total_bytes": disk.total,
            "used_bytes": disk.used,
            "free_bytes": disk.free,
            "usage_percent": round(disk.percent, 1),
            "total_human": bytes_to_human(disk.total),
            "used_human": bytes_to_human(disk.used),
            "free_human": bytes_to_human(disk.free),
        },
        "network": {
            "bytes_sent": network.bytes_sent,
            "bytes_received": network.bytes_recv,
            "sent_human": bytes_to_human(network.bytes_sent),
            "received_human": bytes_to_human(network.bytes_recv),
        },
    }


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/metrics")
def metrics():
    return jsonify(collect_metrics())


@app.get("/health")
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)
