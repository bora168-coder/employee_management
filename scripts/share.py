#!/usr/bin/env python3
"""
Share the app on a temporary public HTTPS link (Cloudflare Quick Tunnel),
so a client can test it. Your computer must stay on while they test.

Usage (from the project root):
    python3 scripts/share.py           # use the existing build
    python3 scripts/share.py --build   # build first (after code changes)

Press Ctrl+C to stop. The link stops working, and it changes on every start.
Only the standard library is used. cloudflared is downloaded once to ~/.cache/csbms/.
"""
import argparse
import os
import platform
import re
import shutil
import signal
import socket
import stat
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
API_DIR = ROOT / "apps" / "api"
WEB_DIR = ROOT / "apps" / "web"
WEB_PORT, API_PORT = 3000, 4000
CACHE = Path.home() / ".cache" / "csbms"
URL_RE = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")

procs: list[subprocess.Popen] = []


def say(msg: str) -> None:
    print(f"[share] {msg}", flush=True)


def fail(msg: str) -> None:
    say(f"ERROR: {msg}")
    stop_all()
    sys.exit(1)


def port_busy(port: int) -> bool:
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def cloudflared_path() -> str:
    found = shutil.which("cloudflared")
    if found:
        return found
    target = CACHE / "cloudflared"
    if target.exists():
        return str(target)
    arch = {"x86_64": "amd64", "aarch64": "arm64", "arm64": "arm64"}.get(platform.machine())
    if platform.system() != "Linux" or not arch:
        fail("Automatic download works on Linux only. Install cloudflared yourself first.")
    url = f"https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-{arch}"
    say(f"Downloading cloudflared (only the first time) ...")
    CACHE.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, target)
    target.chmod(target.stat().st_mode | stat.S_IEXEC)
    return str(target)


def start(cmd: list[str], cwd: Path, env: dict | None = None, capture: bool = False) -> subprocess.Popen:
    p = subprocess.Popen(
        cmd, cwd=cwd, env={**os.environ, **(env or {})},
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.STDOUT if capture else None,
        text=True, start_new_session=True,  # own process group, so we can stop its children too
    )
    procs.append(p)
    return p


def stop_all() -> None:
    for p in reversed(procs):
        if p.poll() is None:
            try:
                os.killpg(p.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
    for p in procs:
        try:
            p.wait(timeout=10)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid, signal.SIGKILL)


def wait_http(url: str, seconds: int) -> bool:
    end = time.time() + seconds
    while time.time() < end:
        try:
            with urllib.request.urlopen(url, timeout=3) as r:
                if r.status < 500:
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Share the app on a temporary public link.")
    parser.add_argument("--build", action="store_true", help="run 'npm run build' first")
    args = parser.parse_args()

    for port, name in ((WEB_PORT, "web"), (API_PORT, "API")):
        if port_busy(port):
            fail(f"Port {port} ({name}) is in use. Stop 'npm run dev' first (Ctrl+C).")
    if not (API_DIR / ".env").exists():
        fail("apps/api/.env not found.")

    if args.build or not (API_DIR / "dist" / "main.js").exists() or not (WEB_DIR / ".next" / "BUILD_ID").exists():
        say("Building the app (this takes a few minutes) ...")
        if subprocess.run(["npm", "run", "build"], cwd=ROOT).returncode != 0:
            fail("Build failed. See the errors above.")

    # 1. Tunnel first: we need its link before the API starts (WEB_ORIGIN must match it).
    say("Starting the tunnel ...")
    tunnel = start([cloudflared_path(), "tunnel", "--no-autoupdate", "--url", f"http://localhost:{WEB_PORT}"],
                   ROOT, capture=True)
    public_url = None
    end = time.time() + 60
    while time.time() < end and public_url is None:
        line = tunnel.stdout.readline()
        if not line and tunnel.poll() is not None:
            break
        m = URL_RE.search(line)
        if m:
            public_url = m.group(0)
    if not public_url:
        fail("Could not get a tunnel link. Check your internet connection and try again.")

    # 2. API: production mode, and only accept requests from the tunnel link.
    say("Starting the API ...")
    start(["node", "--env-file=.env", "dist/main.js"], API_DIR,
          env={"NODE_ENV": "production", "WEB_ORIGIN": public_url, "COOKIE_SECURE": "true"})
    if not wait_http(f"http://127.0.0.1:{API_PORT}/api/v1/health", 60):
        fail("The API did not start. See the log above (is the database running? 'docker compose up -d postgres').")

    # 3. Web app.
    say("Starting the web app ...")
    start(["npx", "next", "start", "-p", str(WEB_PORT)], WEB_DIR)
    if not wait_http(f"http://127.0.0.1:{WEB_PORT}/login", 60):
        fail("The web app did not start. See the log above.")

    print(flush=True)
    say("=" * 60)
    say(f"Ready. Send this link to your client:  {public_url}")
    say("It can take up to 1 minute before the link works on the internet.")
    say("Press Ctrl+C to stop sharing.")
    say("=" * 60)

    # Keep reading the tunnel output, so its pipe never fills up.
    threading.Thread(target=lambda: [None for _ in tunnel.stdout], daemon=True).start()
    while all(p.poll() is None for p in procs):
        time.sleep(1)
    fail("A process stopped unexpectedly. See the log above.")


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(KeyboardInterrupt()))
    try:
        main()
    except KeyboardInterrupt:
        print(flush=True)
        say("Stopping ...")
        stop_all()
        say("Stopped. The link does not work anymore.")
