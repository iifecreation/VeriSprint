"""
Code Provenance: a per-commit line-count breakdown into Original Engineering,
AI-Disclosed, and Duplicate/Boilerplate.

Deliberately does NOT attempt to infer "this specific line was written by
AI" from the code's content — there is no reliable, defensible way to do
that (the same reason AI-text detectors for prose are widely unreliable:
https://edintegrity.biomedcentral.com/articles/10.1007/s40979-023-00146-z),
and claiming otherwise would be exactly the kind of fabricated signal the
Evidence Ledger exists to avoid. Instead:

  - "AI-disclosed" reuses the existing, real signal (app/ai_signals.py's
    is_ai_assisted) — a commit message explicitly naming an AI tool via a
    Co-Authored-By trailer or "Generated with" line. Applied at the commit
    level: if a commit discloses AI assistance, its own net-new lines
    (excluding duplicates/boilerplate) are attributed to this bucket.

  - "Duplicate / boilerplate" is real, deterministic, line-level detection:
    an added line is flagged if its normalized content was already added in
    an earlier commit to this same repo (copy-paste within the codebase,
    see CodeLineFingerprint — never compared across repos), or if it's a
    near-zero-signal line (blank, lone punctuation, or too short to carry
    meaningful content) or belongs to a low-signal file (lockfiles,
    minified bundles, vendored/generated directories).

  - "Original engineering" is everything left over: lines new to this
    repo's tracked history, from a commit that didn't disclose AI
    assistance. This label means exactly that — NOT "verified human-
    written." A developer using an AI tool without disclosing it is
    invisible to this signal, the same inherent limitation the AI
    Contribution Tracker already documents for itself.

  - Cold-start limitation: a repo's first-ever ingested commit has nothing
    to compare against yet, so every (non-boilerplate) line in it looks
    "original" even if it's actually a vendored library or scaffold import
    that predates VeriSprint. Same honest trade-off Code Health Signals'
    own docstring already makes for durable-change tracking.
"""
import hashlib
import re
from dataclasses import dataclass, field
from pathlib import PurePosixPath

_PUNCTUATION_ONLY = re.compile(r"^[{}()\[\];,.\-+*/]+$")
_MIN_MEANINGFUL_LENGTH = 3

# Lockfiles, minified bundles, and vendored/generated directories carry
# effectively zero differentiated engineering signal regardless of content —
# skipped at the file level rather than hashed line-by-line. Matched as
# exact path segments/suffixes (not raw substrings) so "vendor/x.go" and
# "src/vendor/x.go" both match while "myvendor/x.go" correctly doesn't —
# same substring-matching pitfall app/pr_policy.py's _is_safe_path avoids.
_LOW_SIGNAL_DIR_SEGMENTS = ("vendor", "node_modules", "dist", "build", "generated")
_LOW_SIGNAL_SUFFIXES = (".lock", ".min.js", ".min.css")
_LOW_SIGNAL_EXACT_NAMES = ("package-lock.json",)


def _parse_added_lines(diff: str) -> list[tuple[str, str]]:
    """[(file_path, line_content), ...] for every added line in a unified
    diff — skips the "+++ " file-header lines themselves, which also start
    with "+" but aren't diff content."""
    results: list[tuple[str, str]] = []
    current_file = ""
    for raw_line in diff.splitlines():
        if raw_line.startswith("+++ "):
            path = raw_line[4:].strip()
            current_file = path[2:] if path.startswith("b/") else path
            continue
        if raw_line.startswith("+") and not raw_line.startswith("+++"):
            results.append((current_file, raw_line[1:]))
    return results


def _is_low_signal_file(path: str) -> bool:
    lower = PurePosixPath(path.lower())
    if lower.name in _LOW_SIGNAL_EXACT_NAMES:
        return True
    if any(lower.name.endswith(suffix) for suffix in _LOW_SIGNAL_SUFFIXES):
        return True
    if any(part in _LOW_SIGNAL_DIR_SEGMENTS for part in lower.parts):
        return True
    return False


def _is_boilerplate_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    if len(stripped) < _MIN_MEANINGFUL_LENGTH:
        return True
    if _PUNCTUATION_ONLY.match(stripped):
        return True
    return False


def line_hash(line: str) -> str:
    """SHA-256 of a line's normalized (whitespace-trimmed) content — stores
    enough to detect reuse, never enough to reconstruct the source line."""
    return hashlib.sha256(line.strip().encode("utf-8")).hexdigest()


def candidate_line_hashes(diff: str) -> set[str]:
    """Hashes worth checking against CodeLineFingerprint for this diff — i.e.
    every added line that isn't already known-boilerplate/low-signal (those
    are never hashed or stored at all). Callers query the DB for exactly
    this set rather than loading a repo's entire fingerprint history."""
    return {
        line_hash(line)
        for file_path, line in _parse_added_lines(diff)
        if not _is_low_signal_file(file_path) and not _is_boilerplate_line(line)
    }


@dataclass
class ProvenanceResult:
    original_engineering_lines: int = 0
    ai_disclosed_lines: int = 0
    duplicate_or_boilerplate_lines: int = 0
    # Hashes to record as "now seen in this repo" — only for lines that
    # weren't already a known duplicate.
    new_line_hashes: set[str] = field(default_factory=set)


def classify_commit_provenance(*, diff: str, is_ai_assisted: bool, known_hashes: set[str]) -> ProvenanceResult:
    """Pure classification — no DB/network I/O. `known_hashes` is the set of
    this diff's candidate_line_hashes() that the caller already found in
    CodeLineFingerprint for this repo (i.e. lines added in an earlier commit)."""
    result = ProvenanceResult()

    for file_path, line in _parse_added_lines(diff):
        if _is_low_signal_file(file_path) or _is_boilerplate_line(line):
            result.duplicate_or_boilerplate_lines += 1
            continue

        h = line_hash(line)
        if h in known_hashes or h in result.new_line_hashes:
            result.duplicate_or_boilerplate_lines += 1
            continue

        result.new_line_hashes.add(h)
        if is_ai_assisted:
            result.ai_disclosed_lines += 1
        else:
            result.original_engineering_lines += 1

    return result
