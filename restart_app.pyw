"""Kill existing processes and relaunch run_bg.pyw."""
import subprocess, sys, time, os, shutil
from pathlib import Path

BASE = Path(__file__).resolve().parent
URL_FILE = BASE / "mobile_url.txt"

# Kill ngrok
try:
    from pyngrok import ngrok
    ngrok.kill()
except Exception:
    pass
subprocess.run(["taskkill", "/F", "/IM", "ngrok.exe"], capture_output=True)

# Kill streamlit + run_bg processes (both pythonw and python)
my_pid = str(os.getpid())
for proc_name in ("pythonw.exe", "python.exe"):
    result = subprocess.run(
        ["wmic", "process", "where", f"name='{proc_name}'", "get", "processid,commandline"],
        capture_output=True, text=True,
    )
    for line in result.stdout.splitlines():
        line_lower = line.lower()
        if (("streamlit" in line_lower and "app.py" in line_lower and "8502" in line_lower)
                or "run_bg" in line_lower) and my_pid not in line:
            parts = line.strip().split()
            if parts:
                subprocess.run(["taskkill", "/F", "/PID", parts[-1]], capture_output=True)

URL_FILE.write_text("RESTARTING...\n", encoding="utf-8")
time.sleep(3)

subprocess.Popen(
    [sys.executable, str(BASE / "run_bg.pyw")],
    cwd=BASE,
    creationflags=0x00000008,  # DETACHED_PROCESS
)
