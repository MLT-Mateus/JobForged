#!/usr/bin/env python3
"""Export approved operational fields from fixed JBFD containers."""
import datetime
import json
import os
import re
import subprocess
import tempfile
import urllib.request
from pathlib import Path

ROOT = Path("/opt/jbfd/mcp/snapshots")
ENVIRONMENTS = {"test": ("jbfd-test-app-1", 3101), "live": ("jbfd-live-app-1", 3100)}
STATES = {"running", "exited", "restarting", "created", "paused", "dead", "removing"}
HEALTH = {"healthy", "unhealthy", "starting", "none"}

def run_bounded(arguments, merge_stderr=False):
    with tempfile.TemporaryFile() as output:
        result = subprocess.run(arguments, stdout=output,
                                stderr=subprocess.STDOUT if merge_stderr else subprocess.DEVNULL,
                                timeout=10, check=False)
        length = output.tell()
        output.seek(0)
        return result.returncode, output.read(131072).decode("utf-8", errors="replace"), length > 131072

def container_summary(container):
    fallback = {"state": "unknown", "health": "unknown", "restarts": 0}
    try:
        code, text, _ = run_bounded(["docker", "inspect", "--format",
                                    '{"state":{{json .State}},"restarts":{{.RestartCount}}}', container])
        if code:
            return fallback
        data = json.loads(text)
        state = data.get("state", {}).get("Status")
        health = data.get("state", {}).get("Health", {}).get("Status", "none")
        restarts = data.get("restarts", 0)
        return {"state": state if state in STATES else "unknown",
                "health": health if health in HEALTH else "unknown",
                "restarts": min(max(restarts, 0), 1000000) if type(restarts) is int else 0}
    except (OSError, ValueError, subprocess.TimeoutExpired):
        return fallback

def application_summary(environment, port):
    fallback = {"reachable": False, "version": None, "commit": None}
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        with opener.open(f"http://127.0.0.1:{port}/api/health", timeout=3) as response:
            data = json.loads(response.read(4096))
        if data.get("status") != "ok" or data.get("environment") != environment:
            return fallback
        version, commit = data.get("version"), data.get("commit")
        return {"reachable": True,
                "version": version if isinstance(version, str) and re.fullmatch(r"[0-9A-Za-z._-]{1,40}", version) else None,
                "commit": commit if isinstance(commit, str) and re.fullmatch(r"[0-9a-f]{40}", commit) else None}
    except (OSError, ValueError):
        return fallback

def summarize_logs(text, available=True, truncated=False):
    lines = text.splitlines()[:200]
    counts = {"error": 0, "warning": 0, "other": 0}
    for line in lines:
        if re.search(r"\b(error|fatal|exception|panic)\b", line, re.I):
            counts["error"] += 1
        elif re.search(r"\b(warn|warning)\b", line, re.I):
            counts["warning"] += 1
        else:
            counts["other"] += 1
    return {"available": available, "windowMinutes": 15, "examinedLines": len(lines),
            "truncated": truncated, "counts": counts}

def diagnostics(container):
    try:
        code, text, truncated = run_bounded(["docker", "logs", "--since", "15m", "--tail", "200", container], True)
        return summarize_logs(text if code == 0 else "", code == 0, truncated)
    except (OSError, subprocess.TimeoutExpired):
        return summarize_logs("", False)

def collect():
    return {"schemaVersion": 1,
            "collectedAt": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
            "environments": {environment: {
                "container": container_summary(container),
                "application": application_summary(environment, port),
                "diagnostics": diagnostics(container)
            } for environment, (container, port) in ENVIRONMENTS.items()}}

def main():
    ROOT.mkdir(mode=0o755, parents=True, exist_ok=True)
    state = collect()
    descriptor, temporary = tempfile.mkstemp(prefix=".state-", dir=ROOT)
    try:
        with os.fdopen(descriptor, "w") as target:
            json.dump(state, target, separators=(",", ":"))
            target.flush()
            os.fsync(target.fileno())
        os.chmod(temporary, 0o644)
        os.replace(temporary, ROOT / "state.json")
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

if __name__ == "__main__":
    main()
