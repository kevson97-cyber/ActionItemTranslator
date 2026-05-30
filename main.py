"""
main.py — Action Item Translator backend
FastAPI server: serves the SPA, calls Ollama, persists sessions to JSON.
"""
import json
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from config import OLLAMA_HOST, OLLAMA_MODEL

BASE = Path(__file__).resolve().parent
DATA_FILE = BASE / "data" / "sessions.json"
DATA_FILE.parent.mkdir(exist_ok=True)
if not DATA_FILE.exists():
    DATA_FILE.write_text("[]", encoding="utf-8")

app = FastAPI()

# ── Ollama helpers ────────────────────────────────────────────────────────────

def _ollama_chat(text: str) -> list[dict]:
    import ollama as _ol
    client = _ol.Client(host=OLLAMA_HOST)

    system = (
        "You are an expert productivity assistant. Extract every action item from the text. "
        "Make each item specific and measurable. Break complex items into ordered sub-tasks. "
        "Assign priority: high (urgent/blocking), medium (important soon), low (nice to have). "
        "Respond ONLY with a valid JSON array — no prose, no markdown."
    )
    user = (
        f"Extract all action items from this text:\n\n---\n{text.strip()}\n---\n\n"
        "Return a JSON array. Each element:\n"
        '{"title":"Short title","description":"One sentence context",'
        '"priority":"high"|"medium"|"low","tasks":[{"task":"Sub-task text","done":false}]}\n'
        'Leave "tasks" as [] if the item is a single step. Return ONLY the JSON array.'
    )

    resp = client.chat(
        model=OLLAMA_MODEL,
        messages=[{"role": "system", "content": system},
                  {"role": "user",   "content": user}],
        options={"num_predict": 3000, "temperature": 0.2},
    )
    raw = resp.message.content if hasattr(resp, "message") else resp["message"]["content"]
    return _parse_items(raw)


def _parse_items(text: str) -> list[dict]:
    text = re.sub(r"```(?:json)?", "", text).strip()
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if not m:
        return []
    try:
        items = json.loads(m.group())
    except json.JSONDecodeError:
        return []
    result = []
    for item in items:
        if not isinstance(item, dict):
            continue
        tasks = []
        for t in item.get("tasks", []):
            if isinstance(t, str):
                tasks.append({"task": t, "done": False})
            elif isinstance(t, dict) and "task" in t:
                tasks.append({"task": t["task"], "done": bool(t.get("done", False))})
        result.append({
            "title":       str(item.get("title", "Untitled")),
            "description": str(item.get("description", "")),
            "priority":    str(item.get("priority", "medium")).lower(),
            "tasks":       tasks,
            "done":        False,
        })
    return result

# ── Persistence helpers ───────────────────────────────────────────────────────

def _load_sessions() -> list[dict]:
    try:
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    except Exception:
        return []

def _save_sessions(sessions: list[dict]):
    DATA_FILE.write_text(json.dumps(sessions, indent=2, ensure_ascii=False), encoding="utf-8")

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def index():
    return FileResponse(BASE / "static" / "index.html")

class AnalyzeRequest(BaseModel):
    text: str

@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    if not req.text.strip():
        raise HTTPException(400, "No text provided")
    try:
        items = _ollama_chat(req.text)
    except Exception as e:
        err = str(e).lower()
        if "connection" in err or "refused" in err:
            raise HTTPException(503, "Ollama not running — start it with: ollama serve")
        raise HTTPException(500, str(e))
    return {"items": items}

@app.get("/sessions")
def get_sessions():
    return _load_sessions()

class SaveRequest(BaseModel):
    title: str
    input_text: str
    items: list[dict]

@app.post("/sessions")
def save_session(req: SaveRequest):
    sessions = _load_sessions()
    session = {
        "id":         str(uuid.uuid4()),
        "title":      req.title,
        "input_text": req.input_text,
        "items":      req.items,
        "created_at": datetime.now().isoformat(),
    }
    sessions.insert(0, session)
    _save_sessions(sessions)
    return session

class UpdateSessionRequest(BaseModel):
    items: list[dict]

@app.put("/sessions/{session_id}")
def update_session(session_id: str, req: UpdateSessionRequest):
    sessions = _load_sessions()
    for s in sessions:
        if s["id"] == session_id:
            s["items"] = req.items
            _save_sessions(sessions)
            return s
    raise HTTPException(404, "Session not found")

@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    sessions = _load_sessions()
    sessions = [s for s in sessions if s["id"] != session_id]
    _save_sessions(sessions)
    return {"ok": True}

@app.get("/status")
def status():
    try:
        import ollama as _ol
        client = _ol.Client(host=OLLAMA_HOST)
        models = client.list()
        names = []
        if isinstance(models, dict):
            names = [m.get("name", "") for m in models.get("models", [])]
        elif hasattr(models, "models"):
            names = [getattr(m, "name", "") or getattr(m, "model", "") for m in models.models]
        ready = any(OLLAMA_MODEL.split(":")[0] in n for n in names)
        return {"ollama": ready, "model": OLLAMA_MODEL}
    except Exception:
        return {"ollama": False, "model": OLLAMA_MODEL}

# Serve static files (CSS, JS if ever split out)
static_dir = BASE / "static"
static_dir.mkdir(exist_ok=True)
