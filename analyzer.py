"""
analyzer.py — LLM-powered action item extractor using Ollama.
"""
import json
import re
from typing import Optional

import ollama as _ollama

from config import OLLAMA_HOST, OLLAMA_MODEL


def _client():
    return _ollama.Client(host=OLLAMA_HOST)


def is_available() -> tuple[bool, str]:
    """Check whether Ollama is running and the model is available."""
    try:
        client = _client()
        models = client.list()
        names = []
        if isinstance(models, dict) and "models" in models:
            names = [m.get("name", m.get("model", "")) for m in models["models"]]
        elif hasattr(models, "models"):
            names = [getattr(m, "name", None) or getattr(m, "model", "") for m in models.models]
        if not any(OLLAMA_MODEL.split(":")[0] in n for n in names):
            return False, f"Model '{OLLAMA_MODEL}' not found. Run: ollama pull {OLLAMA_MODEL}"
        return True, f"Ollama ready · {OLLAMA_MODEL}"
    except Exception as e:
        return False, f"Ollama not running — start with: ollama serve\n({e})"


_SYSTEM_PROMPT = """You are an expert productivity assistant that extracts clear, specific action items from any spoken or written text — meeting notes, voice memos, brainstorm sessions, conversations, or task lists.

Your rules:
- Extract EVERY actionable item mentioned, implied, or follow-up needed
- Make each action item specific and measurable (not vague)
- For complex action items (more than one step), break them into ordered sub-tasks
- Assign priority: "high" (urgent/blocking), "medium" (important soon), "low" (nice to have)
- Keep titles concise (under 8 words)
- Sub-tasks should be concrete single actions a person can physically do

Respond ONLY with a valid JSON array. No prose, no markdown, no explanation."""

_USER_TEMPLATE = """Analyze this text and extract all action items:

---
{text}
---

Return a JSON array where each element has:
{{
  "title": "Short action item title",
  "description": "One sentence of context or goal",
  "priority": "high" | "medium" | "low",
  "tasks": [
    {{"task": "Specific sub-task description", "done": false}},
    ...
  ]
}}

If an action item is simple (one step), leave "tasks" as an empty array [].
Return ONLY the JSON array."""


def extract_action_items(text: str) -> list[dict]:
    """
    Send text to Ollama and return a list of structured action items.
    Raises ConnectionError if Ollama is not running.
    Raises ValueError if the model is not installed.
    """
    if not text.strip():
        return []

    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user",   "content": _USER_TEMPLATE.format(text=text.strip())},
    ]

    try:
        client = _client()
        response = client.chat(
            model=OLLAMA_MODEL,
            messages=messages,
            options={"num_predict": 3000, "temperature": 0.2},
        )
        raw = response.message.content if hasattr(response, "message") else response["message"]["content"]
    except Exception as e:
        err = str(e).lower()
        if "connection" in err or "refused" in err:
            raise ConnectionError(
                f"Cannot reach Ollama at {OLLAMA_HOST}. Run: ollama serve"
            ) from e
        if "not found" in err or "unknown model" in err:
            raise ValueError(
                f"Model '{OLLAMA_MODEL}' not installed. Run: ollama pull {OLLAMA_MODEL}"
            ) from e
        raise

    return _parse(raw)


def _parse(text: str) -> list[dict]:
    """Extract and validate the JSON array from the model's response."""
    # Strip markdown code fences if present
    text = re.sub(r"```(?:json)?", "", text).strip()

    match = re.search(r"\[.*\]", text, re.DOTALL)
    if not match:
        return []

    try:
        items = json.loads(match.group())
    except json.JSONDecodeError:
        return []

    result = []
    for item in items:
        if not isinstance(item, dict):
            continue
        tasks = item.get("tasks", [])
        if not isinstance(tasks, list):
            tasks = []
        # Normalise sub-tasks
        clean_tasks = []
        for t in tasks:
            if isinstance(t, str):
                clean_tasks.append({"task": t, "done": False})
            elif isinstance(t, dict) and "task" in t:
                clean_tasks.append({"task": t["task"], "done": bool(t.get("done", False))})

        result.append({
            "title":       str(item.get("title", "Untitled action")),
            "description": str(item.get("description", "")),
            "priority":    str(item.get("priority", "medium")).lower(),
            "tasks":       clean_tasks,
        })

    return result
