#!/usr/bin/env python3
"""BookReader cleanup protocol.

Kills STRAY expo / metro / hermes-verify / http.server dev servers bound to
dev ports and removes session-created junk from C:/Users/DELL/BookReader.

Safety:
- Only node.exe processes are ever considered for killing.
- Any process whose command line references the Hermes AGENT launcher
  (hermes-agent / hermes.exe) is PROTECTED and never killed, so the
  live agent and any parallel agent subprocesses survive.
- Only specific, known-junk caches/scratch dirs and root *.log files are
  removed. Source, node_modules, dist are NEVER touched.
"""

import json
import os
import shutil
import subprocess
import sys

PROJECT = r"C:\Users\DELL\BookReader"

# Patterns that mark a STRAY dev server we may kill.
KILL_PATTERNS = ("expo", "metro", "http.server", "hermes verify")
# Patterns that mark a PROTECTED agent process (never kill).
PROTECT_PATTERNS = ("hermes-agent", "hermes.exe", r"hermes\agent")

# Known-safe junk to remove (session/verify artifacts only).
JUNK_DIRS = [".expo", "dist-web", "tmp", "node_modules/.cache"]
JUNK_ROOT_FILE_GLOB = "*.log"


def list_node_processes():
    ps = (
        "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" "
        "| Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress"
    )
    res = subprocess.run(
        ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass",
         "-Command", ps],
        capture_output=True, text=True,
    )
    if not res.stdout.strip():
        return []
    try:
        data = json.loads(res.stdout)
    except json.JSONDecodeError:
        return []
    if isinstance(data, dict):
        data = [data]
    out = []
    for item in data:
        pid = item.get("ProcessId")
        cmd = item.get("CommandLine") or ""
        if pid:
            out.append((int(pid), cmd))
    return out


def kill_stray_servers():
    killed = []
    for pid, cmd in list_node_processes():
        low = cmd.lower()
        if any(p in low for p in PROTECT_PATTERNS):
            continue
        if any(p in low for p in KILL_PATTERNS):
            r = subprocess.run(
                ["taskkill.exe", "/PID", str(pid), "/T", "/F"],
                capture_output=True, text=True,
            )
            if r.returncode == 0:
                killed.append(pid)
    return killed


def remove_junk():
    removed = []
    for d in JUNK_DIRS:
        path = os.path.join(PROJECT, d)
        if os.path.isdir(path):
            shutil.rmtree(path)
            removed.append(d)
    # root-level scratch logs only
    import glob
    for f in glob.glob(os.path.join(PROJECT, JUNK_ROOT_FILE_GLOB)):
        try:
            os.remove(f)
            removed.append(os.path.basename(f))
        except OSError:
            pass
    return removed


def main():
    killed = kill_stray_servers()
    removed = remove_junk()
    if not killed and not removed:
        print("nothing to do")
        return 0
    parts = []
    if killed:
        parts.append(f"killed {len(killed)} stray dev server(s) [{','.join(map(str, killed))}]")
    if removed:
        parts.append(f"removed junk: {', '.join(removed)}")
    print("BookReader cleanup: " + "; ".join(parts))
    return 0


if __name__ == "__main__":
    sys.exit(main())
