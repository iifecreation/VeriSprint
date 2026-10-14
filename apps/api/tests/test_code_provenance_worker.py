"""
Code Provenance worker (app/workers/code_provenance.py) — the I/O layer
around app/code_provenance.py's pure classification, exercised against a
real seeded Commit + real object-storage diff (local-disk fallback, same as
every other worker test prerequisite in this suite).
"""
from datetime import datetime, timezone

from app.db.models import Commit
from app.integrations.object_storage import put_raw_diff
from app.workers.code_provenance import classify_code_provenance

from conftest import unique_int

FIRST_DIFF = """diff --git a/src/app.py b/src/app.py
--- a/src/app.py
+++ b/src/app.py
@@ -1,0 +1,2 @@
+def start_server(port):
+    return run(host="0.0.0.0", port=port)
"""

# Reuses the first line of FIRST_DIFF verbatim — a real copy-paste-within-
# the-repo scenario the worker should catch via CodeLineFingerprint.
SECOND_DIFF = """diff --git a/src/other.py b/src/other.py
--- a/src/other.py
+++ b/src/other.py
@@ -1,0 +1,2 @@
+def start_server(port):
+    return run(host="127.0.0.1", port=port)
"""


async def _make_commit(db, repo, diff: str, *, message: str = "add feature") -> Commit:
    n = unique_int()
    object_key = f"{repo.id}/test-{n}.diff"
    put_raw_diff(object_key, diff)
    commit = Commit(
        repo_id=repo.id, sha=f"sha-{n}", author_github_login="octocat", message=message,
        committed_at=datetime.now(timezone.utc),
        raw_diff_object_key=object_key, status="ingested",
    )
    db.add(commit)
    await db.flush()
    return commit


async def test_classifies_a_fresh_commit_as_original_engineering(db, repo):
    commit = await _make_commit(db, repo, FIRST_DIFF)
    await db.commit()

    await classify_code_provenance({}, str(commit.id))
    await db.refresh(commit)

    assert commit.original_engineering_lines == 2
    assert commit.ai_disclosed_lines == 0
    assert commit.duplicate_or_boilerplate_lines == 0


async def test_attributes_lines_to_ai_disclosed_when_commit_message_discloses_it(db, repo):
    commit = await _make_commit(
        db, repo, FIRST_DIFF, message="add feature\n\nCo-Authored-By: Claude <noreply@anthropic.com>"
    )
    await db.commit()

    await classify_code_provenance({}, str(commit.id))
    await db.refresh(commit)

    assert commit.ai_disclosed_lines == 2
    assert commit.original_engineering_lines == 0


async def test_a_later_commit_reusing_an_earlier_lines_content_is_flagged_as_duplicate(db, repo):
    first = await _make_commit(db, repo, FIRST_DIFF)
    await db.commit()
    await classify_code_provenance({}, str(first.id))

    second = await _make_commit(db, repo, SECOND_DIFF)
    await db.commit()
    await classify_code_provenance({}, str(second.id))
    await db.refresh(second)

    # "def start_server(port):" is byte-identical to a line first_seen in
    # `first` — the real copy-paste signal. The other line differs (host
    # value), so it's still original.
    assert second.duplicate_or_boilerplate_lines == 1
    assert second.original_engineering_lines == 1


async def test_rerunning_the_same_commit_is_idempotent(db, repo):
    commit = await _make_commit(db, repo, FIRST_DIFF)
    await db.commit()

    await classify_code_provenance({}, str(commit.id))
    await classify_code_provenance({}, str(commit.id))  # must not raise on re-run (ON CONFLICT DO NOTHING)
    await db.refresh(commit)

    assert commit.original_engineering_lines == 2
