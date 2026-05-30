"""
run_bg.pyw — Start Action Item Translator silently (no console window).
Launches Streamlit on port 8502 and opens an ngrok tunnel.
Writes the public URL to mobile_url.txt.
"""
import subprocess, sys, time, os, traceback
from pathlib import Path

BASE = Path(__file__).resolve().parent
LOG_FILE = BASE / "run_bg_log.txt"
URL_FILE = BASE / "mobile_url.txt"

def log(msg):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(msg + "\n")

try:
    from dotenv import load_dotenv
    load_dotenv(BASE / ".env")
    log("dotenv loaded")
except Exception as e:
    log(f"dotenv error: {e}")

URL_FILE.write_text("STARTING...\n", encoding="utf-8")
log(f"Python: {sys.executable}")

# Start Streamlit on port 8502 (different from GmailManager on 8501)
log("Starting Streamlit...")
proc = subprocess.Popen(
    [
        sys.executable, "-m", "streamlit", "run", str(BASE / "app.py"),
        "--server.port", "8502",
        "--server.headless", "true",
        "--server.address", "0.0.0.0",
        "--browser.gatherUsageStats", "false",
    ],
    cwd=BASE,
    stdout=open(BASE / "streamlit_out.txt", "w"),
    stderr=open(BASE / "streamlit_err.txt", "w"),
)
log(f"Streamlit PID: {proc.pid}")

time.sleep(5)

log("Waiting 5s for Streamlit to start...")
# Open ngrok tunnel
try:
    from pyngrok import ngrok, conf
    token = os.getenv("NGROK_AUTHTOKEN", "")
    if token:
        conf.get_default().auth_token = token
    tunnel = ngrok.connect(8502, "http")
    url = tunnel.public_url
    if url.startswith("http://"):
        url = "https://" + url[7:]
    URL_FILE.write_text(f"READY\n{url}\n", encoding="utf-8")
    log(f"URL: {url}")
except Exception as e:
    log(f"ngrok error: {e}\n{traceback.format_exc()}")
    URL_FILE.write_text(f"READY (local only)\nhttp://localhost:8502\n", encoding="utf-8")

log("Waiting for Streamlit process...")
proc.wait()
