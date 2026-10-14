"""Code Provenance classification (app/code_provenance.py). Pure functions, no DB."""
from app.code_provenance import candidate_line_hashes, classify_commit_provenance, line_hash

SIMPLE_DIFF = """diff --git a/src/handler.py b/src/handler.py
index abc..def 100644
--- a/src/handler.py
+++ b/src/handler.py
@@ -1,3 +1,6 @@
 def handle(request):
+    if request.user is None:
+        raise PermissionError("not authenticated")
+    return process(request)
"""


def test_classifies_genuinely_new_lines_as_original_when_not_ai_disclosed():
    d = classify_commit_provenance(diff=SIMPLE_DIFF, is_ai_assisted=False, known_hashes=set())
    assert d.original_engineering_lines == 3
    assert d.ai_disclosed_lines == 0
    assert d.duplicate_or_boilerplate_lines == 0
    assert len(d.new_line_hashes) == 3


def test_attributes_new_lines_to_ai_disclosed_when_commit_discloses_ai():
    d = classify_commit_provenance(diff=SIMPLE_DIFF, is_ai_assisted=True, known_hashes=set())
    assert d.ai_disclosed_lines == 3
    assert d.original_engineering_lines == 0


def test_a_line_matching_a_known_hash_is_a_duplicate_not_original():
    known = {line_hash('    if request.user is None:')}
    d = classify_commit_provenance(diff=SIMPLE_DIFF, is_ai_assisted=False, known_hashes=known)
    assert d.duplicate_or_boilerplate_lines == 1
    assert d.original_engineering_lines == 2
    # The duplicate line's hash isn't re-recorded as "new" — it was already known.
    assert line_hash('    if request.user is None:') not in d.new_line_hashes


def test_repeating_the_same_new_line_twice_in_one_commit_only_counts_once_as_original():
    diff = """diff --git a/a.py b/a.py
--- a/a.py
+++ b/a.py
@@ -1,0 +1,2 @@
+log.info("starting up sequence now")
+log.info("starting up sequence now")
"""
    d = classify_commit_provenance(diff=diff, is_ai_assisted=False, known_hashes=set())
    assert d.original_engineering_lines == 1
    assert d.duplicate_or_boilerplate_lines == 1


def test_blank_and_punctuation_only_lines_are_boilerplate():
    diff = """diff --git a/a.py b/a.py
--- a/a.py
+++ b/a.py
@@ -1,0 +1,4 @@
+
+}
+);
+{}
"""
    d = classify_commit_provenance(diff=diff, is_ai_assisted=False, known_hashes=set())
    assert d.duplicate_or_boilerplate_lines == 4
    assert d.original_engineering_lines == 0


def test_short_lines_below_the_meaningful_length_threshold_are_boilerplate():
    diff = """diff --git a/a.py b/a.py
--- a/a.py
+++ b/a.py
@@ -1,0 +1,2 @@
+ok
+import real_module_with_actual_meaning
"""
    d = classify_commit_provenance(diff=diff, is_ai_assisted=False, known_hashes=set())
    assert d.duplicate_or_boilerplate_lines == 1
    assert d.original_engineering_lines == 1


def test_lockfile_lines_are_boilerplate_regardless_of_content():
    diff = """diff --git a/package-lock.json b/package-lock.json
--- a/package-lock.json
+++ b/package-lock.json
@@ -1,0 +1,1 @@
+    "resolved": "https://registry.npmjs.org/some-real-package-1.2.3.tgz",
"""
    d = classify_commit_provenance(diff=diff, is_ai_assisted=False, known_hashes=set())
    assert d.duplicate_or_boilerplate_lines == 1
    assert d.original_engineering_lines == 0


def test_vendored_directory_lines_are_boilerplate():
    diff = """diff --git a/vendor/lib/thing.go b/vendor/lib/thing.go
--- a/vendor/lib/thing.go
+++ b/vendor/lib/thing.go
@@ -1,0 +1,1 @@
+func DoSomethingMeaningfulHere() error {
"""
    d = classify_commit_provenance(diff=diff, is_ai_assisted=False, known_hashes=set())
    assert d.duplicate_or_boilerplate_lines == 1


def test_a_path_merely_containing_vendor_as_a_substring_is_not_flagged():
    # Regression: "myvendor/x.go" must not match the "vendor" directory
    # segment just because it contains that substring — same pitfall as
    # app/pr_policy.py's _is_safe_path (see that module's own regression test).
    diff = """diff --git a/myvendor/handler.go b/myvendor/handler.go
--- a/myvendor/handler.go
+++ b/myvendor/handler.go
@@ -1,0 +1,1 @@
+func HandleRealBusinessLogic(ctx context.Context) error {
"""
    d = classify_commit_provenance(diff=diff, is_ai_assisted=False, known_hashes=set())
    assert d.original_engineering_lines == 1
    assert d.duplicate_or_boilerplate_lines == 0


def test_candidate_line_hashes_excludes_boilerplate_and_low_signal_files():
    hashes = candidate_line_hashes(SIMPLE_DIFF)
    assert len(hashes) == 3
    assert line_hash("    return process(request)") in hashes


def test_empty_diff_yields_all_zero_counts():
    d = classify_commit_provenance(diff="", is_ai_assisted=False, known_hashes=set())
    assert d.original_engineering_lines == 0
    assert d.ai_disclosed_lines == 0
    assert d.duplicate_or_boilerplate_lines == 0
