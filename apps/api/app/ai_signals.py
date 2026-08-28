"""
Shared AI-assistance detection: self-disclosed `Co-Authored-By:`/"Generated
with" trailers naming a known AI tool in a commit message — a real,
verifiable signal, not a behavioral/stylometric guess at who or what wrote
the code. Originally lived only in app/routers/contributions.py; factored out
here so app/routers/ai_cost.py can cross-reference the same real adoption
number instead of re-deriving (and risking drift from) its own copy.
"""
import re

_AI_PATTERNS = [
    re.compile(r"co-authored-by:.*\b(claude|copilot|codex|gemini|cursor|devin|chatgpt|openai|anthropic)\b", re.IGNORECASE),
    re.compile(r"generated (with|by)\b.*\b(claude|copilot|codex|gemini|cursor|devin|chatgpt|ai)\b", re.IGNORECASE),
]


def is_ai_assisted(message: str) -> bool:
    return any(p.search(message) for p in _AI_PATTERNS)
