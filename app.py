"""
app.py — Action Item Translator
Transcribe voice or paste text → get a structured action item list.
"""
import io
import json

import streamlit as st

from config import OLLAMA_MODEL
from analyzer import extract_action_items, is_available

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="Action Item Translator",
    page_icon="✅",
    layout="centered",
    initial_sidebar_state="collapsed",
)

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
html, body, [class*="css"] { font-family: 'Inter', sans-serif; }
.block-container { padding-top: 1.4rem !important; max-width: 680px !important; }

/* Buttons */
.stButton > button {
    border-radius: 8px !important;
    padding: 6px 16px !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    transition: transform .1s ease, opacity .1s ease !important;
    border: 1px solid rgba(255,255,255,0.08) !important;
}
.stButton > button:hover { opacity: .85; }
.stButton > button:active { transform: scale(0.94) !important; }
.stButton > button[kind="primary"] {
    background: linear-gradient(135deg,#4f8ef7,#6c63ff) !important;
    border: none !important; color: #fff !important;
}
.stButton > button[kind="primary"]:active {
    box-shadow: 0 0 0 3px rgba(99,102,241,.4) !important;
}

/* Textarea */
.stTextArea textarea {
    border-radius: 10px !important;
    font-size: 13.5px !important;
    border: 1px solid rgba(255,255,255,0.1) !important;
    background: #161b27 !important;
    line-height: 1.6 !important;
}

/* Priority badges */
.badge {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .03em;
}
.badge-high   { background: rgba(239,68,68,.18);  color: #f87171; }
.badge-medium { background: rgba(251,191,36,.18); color: #fbbf24; }
.badge-low    { background: rgba(34,197,94,.18);  color: #4ade80; }

/* Action item cards */
.action-card {
    background: #161b27;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px;
    padding: 14px 16px;
    margin-bottom: 10px;
}
.action-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 4px;
}
.action-desc {
    font-size: 12.5px;
    opacity: .55;
    margin-bottom: 8px;
    line-height: 1.5;
}
.task-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12.5px;
    padding: 3px 0;
    opacity: .8;
}
.task-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #4f8ef7;
    margin-top: 5px;
    flex-shrink: 0;
}

/* Status bar */
.status-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    opacity: .45;
    margin-bottom: 14px;
}

/* Expander */
.streamlit-expanderHeader { font-size: 13px !important; }
</style>
""", unsafe_allow_html=True)

# ── Session state ─────────────────────────────────────────────────────────────
def _init():
    defaults = {
        "action_items": [],
        "input_text": "",
        "voice_key": 0,
        "processing": False,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

_init()

# ── Ollama status ─────────────────────────────────────────────────────────────
_ok, _msg = is_available()

# ── Header ────────────────────────────────────────────────────────────────────
st.markdown("## ✅ Action Item Translator")
st.markdown(
    '<div class="status-bar">'
    f'<span>{"🟢" if _ok else "🔴"} Ollama · {OLLAMA_MODEL}</span>'
    "</div>",
    unsafe_allow_html=True,
)

if not _ok:
    st.error(f"**Ollama not available** — {_msg}")
    st.stop()

# ── Input section ─────────────────────────────────────────────────────────────
st.markdown("#### Input")

# Voice input
try:
    import speech_recognition as _sr
    _sr_ok = True
except ImportError:
    _sr_ok = False

if _sr_ok:
    with st.expander("🎤 Voice input — tap mic, speak, stop", expanded=False):
        audio = st.audio_input(
            "Record your voice memo, meeting notes, or task list",
            key=f"voice_{st.session_state.voice_key}",
        )
        if audio:
            with st.spinner("Transcribing…"):
                try:
                    rec = _sr.Recognizer()
                    with _sr.AudioFile(io.BytesIO(audio.read())) as src:
                        aud = rec.record(src)
                    text = rec.recognize_google(aud)
                    st.session_state.input_text = text
                    st.session_state.voice_key += 1
                    st.rerun()
                except _sr.UnknownValueError:
                    st.warning("Could not understand audio — try again")
                    st.session_state.voice_key += 1
                    st.rerun()
                except Exception as e:
                    st.error(f"Transcription error: {e}")

# Text area
text_input = st.text_area(
    "Or type / paste your text here",
    value=st.session_state.input_text,
    height=160,
    placeholder=(
        "e.g. 'We need to launch the new landing page by Friday. "
        "John should follow up with the design team about the hero image. "
        "Also we need to update the pricing page and set up the email campaign…'"
    ),
    label_visibility="collapsed",
)
st.session_state.input_text = text_input

# Analyse button
_col1, _col2 = st.columns([3, 1])
with _col1:
    analyse = st.button(
        "⚡ Extract Action Items",
        type="primary",
        use_container_width=True,
        disabled=not text_input.strip(),
    )
with _col2:
    if st.button("🗑️ Clear", use_container_width=True):
        st.session_state.action_items = []
        st.session_state.input_text = ""
        st.rerun()

# ── Process ───────────────────────────────────────────────────────────────────
if analyse and text_input.strip():
    with st.spinner("Analysing…"):
        try:
            items = extract_action_items(text_input)
            st.session_state.action_items = items
        except Exception as e:
            st.error(str(e))

# ── Results ───────────────────────────────────────────────────────────────────
items = st.session_state.action_items

if items:
    st.markdown("---")

    # Summary row
    n_high   = sum(1 for i in items if i["priority"] == "high")
    n_medium = sum(1 for i in items if i["priority"] == "medium")
    n_low    = sum(1 for i in items if i["priority"] == "low")
    n_tasks  = sum(len(i["tasks"]) for i in items)

    st.markdown(
        f'<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;font-size:12px;opacity:.6">'
        f'<span>📋 {len(items)} action items</span>'
        f'<span>·</span>'
        f'<span>🔴 {n_high} high</span>'
        f'<span>🟡 {n_medium} medium</span>'
        f'<span>🟢 {n_low} low</span>'
        f'{"<span>·</span><span>📌 " + str(n_tasks) + " sub-tasks</span>" if n_tasks else ""}'
        f'</div>',
        unsafe_allow_html=True,
    )

    # Export button
    _export_col, _ = st.columns([1, 3])
    with _export_col:
        export_md = "\n\n".join(
            f"### {i+1}. {item['title']}\n"
            f"**Priority:** {item['priority'].capitalize()}  \n"
            f"{item['description']}\n"
            + ("\n".join(f"- [ ] {t['task']}" for t in item["tasks"]) if item["tasks"] else "")
            for i, item in enumerate(items)
        )
        st.download_button(
            "⬇️ Export",
            data=export_md,
            file_name="action_items.md",
            mime="text/markdown",
            use_container_width=True,
        )

    # Sort: high → medium → low
    priority_order = {"high": 0, "medium": 1, "low": 2}
    sorted_items = sorted(items, key=lambda x: priority_order.get(x["priority"], 1))

    for i, item in enumerate(sorted_items):
        pri = item["priority"]
        badge_class = f"badge-{pri}"
        tasks = item["tasks"]

        st.markdown(
            f'<div class="action-card">'
            f'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">'
            f'<span class="action-title">{item["title"]}</span>'
            f'<span class="badge {badge_class}">{pri.upper()}</span>'
            f'</div>'
            f'<div class="action-desc">{item["description"]}</div>'
            + (
                "<div>"
                + "".join(
                    f'<div class="task-row"><div class="task-dot"></div><span>{t["task"]}</span></div>'
                    for t in tasks
                )
                + "</div>"
                if tasks else ""
            )
            + "</div>",
            unsafe_allow_html=True,
        )

        # Checkbox interaction for marking tasks done
        if tasks:
            with st.expander(f"Mark tasks done ({len(tasks)} tasks)", expanded=False):
                for j, task in enumerate(tasks):
                    checked = st.checkbox(
                        task["task"],
                        value=task["done"],
                        key=f"task_{i}_{j}",
                    )
                    st.session_state.action_items[
                        items.index(item)
                    ]["tasks"][j]["done"] = checked

elif st.session_state.input_text == "" and not items:
    st.markdown(
        '<div style="text-align:center;opacity:.3;padding:40px 0;font-size:13px">'
        "Paste text or record your voice above, then tap ⚡ Extract Action Items"
        "</div>",
        unsafe_allow_html=True,
    )
