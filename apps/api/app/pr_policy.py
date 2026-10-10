"""
PR Workflow Automation policy engine (Phase 4 competitor-parity — VeriSprint's
equivalent of gitStream's "PR-policy-as-code"): a small, fixed, documented
rule set — not a DSL editor, and not configurable per workspace yet. Every
function here is pure (no DB/GitHub I/O), so it's independently testable;
app/workers/pr_policy.py does the actual GitHub writes based on what this
returns, each gated behind its own FeatureFlag.

Deliberately decoupled from the LLM evidence pipeline (EvidenceItem/
ANTHROPIC_API_KEY) — everything here classifies off file paths and line
counts the `pull_request` webhook (plus one GitHub Files API call) already
gives us immediately, so a PR gets labeled/routed the moment it opens, not
whenever LLM analysis happens to finish (or not at all, if the LLM isn't
configured — see README's "Private/On-Prem LLM" section).
"""
from dataclasses import dataclass, field

# Checked against the lowercased file path — a substring match, not a glob,
# same lightweight-heuristic discipline as app/capitalization.py's keyword
# classifier and app/routers/allocation.py's investment categories.
_TEST_PATH_HINTS = ("test", "spec", "__tests__", "__mocks__")
_SAFE_PATH_PATTERNS = (
    ".md", "docs/", "license", ".gitignore", "changelog",
    ".github/issue_template", ".github/pull_request_template",
)
_SENSITIVE_PATH_HINTS = (
    "auth", "security", "secret", "credential", "password", "token", "payment",
    "billing", "stripe", "permission", "rbac", "crypto", "encrypt",
)

# Same "needs_focus" cutoff the Git Efficiency Metrics panel uses for PR Size
# — see app/benchmarks.py's pr_size_lines threshold.
LARGE_PR_LINE_THRESHOLD = 218
# Deliberately much stricter than "large" — small AND exclusively
# non-functional files is the bar for ever auto-approving anything.
SAFE_PR_LINE_THRESHOLD = 20


def _is_test_file(path: str) -> bool:
    lower = path.lower()
    return any(hint in lower for hint in _TEST_PATH_HINTS)


def _is_safe_path(path: str) -> bool:
    lower = path.lower()
    return any(pattern in lower for pattern in _SAFE_PATH_PATTERNS)


def _is_sensitive_path(path: str) -> bool:
    lower = path.lower()
    return any(hint in lower for hint in _SENSITIVE_PATH_HINTS)


@dataclass
class PolicyDecision:
    labels: list[str] = field(default_factory=list)
    is_safe_to_auto_approve: bool = False


def classify_pull_request(
    *, touched_file_paths: list[str], total_changed_lines: int, is_new_contributor: bool
) -> PolicyDecision:
    """
    Labels (first-match-wins doesn't apply here — a PR can carry several):
      - new-contributor: author has no prior merged PR in this repo.
      - missing-tests: touches at least one non-"safe" (i.e. code) path and
        none of the touched paths look like a test file.
      - needs-security-review: touches a path matching a sensitive-area hint.
      - large-pr: total changed lines exceeds LARGE_PR_LINE_THRESHOLD.
      - safe-changes: every touched path is a "safe" (non-functional) path,
        total changed lines is small, and nothing sensitive is touched —
        also the exact condition is_safe_to_auto_approve reports.
    """
    labels: list[str] = []

    if is_new_contributor:
        labels.append("new-contributor")

    code_paths = [p for p in touched_file_paths if not _is_safe_path(p)]
    has_test_file = any(_is_test_file(p) for p in touched_file_paths)
    if code_paths and not has_test_file:
        labels.append("missing-tests")

    touches_sensitive = any(_is_sensitive_path(p) for p in touched_file_paths)
    if touches_sensitive:
        labels.append("needs-security-review")

    if total_changed_lines > LARGE_PR_LINE_THRESHOLD:
        labels.append("large-pr")

    is_safe = (
        bool(touched_file_paths)
        and all(_is_safe_path(p) for p in touched_file_paths)
        and total_changed_lines <= SAFE_PR_LINE_THRESHOLD
        and not touches_sensitive
    )
    if is_safe:
        labels.append("safe-changes")

    return PolicyDecision(labels=labels, is_safe_to_auto_approve=is_safe)
