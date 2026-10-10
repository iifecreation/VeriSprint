"""PR Workflow Automation classification (Phase 4) — app/pr_policy.py. Pure functions, no DB."""
from app.pr_policy import _is_safe_path, classify_pull_request


def test_safe_doc_only_small_pr_is_auto_approvable():
    d = classify_pull_request(touched_file_paths=["README.md"], total_changed_lines=5, is_new_contributor=False)
    assert d.labels == ["safe-changes"]
    assert d.is_safe_to_auto_approve is True


def test_large_sensitive_pr_from_new_contributor_without_tests():
    d = classify_pull_request(
        touched_file_paths=["app/auth/security.py", "app/auth/login.py"],
        total_changed_lines=500,
        is_new_contributor=True,
    )
    assert set(d.labels) == {"new-contributor", "missing-tests", "needs-security-review", "large-pr"}
    assert d.is_safe_to_auto_approve is False


def test_code_change_with_a_test_file_has_no_missing_tests_label():
    d = classify_pull_request(
        touched_file_paths=["app/foo.py", "tests/test_foo.py"], total_changed_lines=30, is_new_contributor=False
    )
    assert "missing-tests" not in d.labels
    assert d.is_safe_to_auto_approve is False  # app/foo.py isn't a "safe" path


def test_safe_changes_requires_every_touched_path_to_be_safe():
    d = classify_pull_request(
        touched_file_paths=["README.md", "app/foo.py"], total_changed_lines=5, is_new_contributor=False
    )
    assert "safe-changes" not in d.labels
    assert d.is_safe_to_auto_approve is False


def test_safe_changes_requires_small_line_count():
    d = classify_pull_request(touched_file_paths=["README.md"], total_changed_lines=1000, is_new_contributor=False)
    assert "safe-changes" not in d.labels
    assert "large-pr" in d.labels


def test_empty_pr_is_never_marked_safe():
    d = classify_pull_request(touched_file_paths=[], total_changed_lines=0, is_new_contributor=False)
    assert d.is_safe_to_auto_approve is False


def test_code_file_whose_name_merely_contains_a_safe_substring_is_not_safe():
    # Regression for a substring-matching bypass: these are real code files,
    # not docs, even though their paths contain ".md" / "docs/" as substrings.
    assert _is_safe_path("mydocs/payload.py") is False
    assert _is_safe_path("exploit.md.sh") is False
    assert _is_safe_path("app/licensed_endpoints.py") is False


def test_docs_directory_and_license_file_are_still_recognized_as_safe():
    assert _is_safe_path("docs/architecture.md") is True
    assert _is_safe_path("apps/api/docs/schema.yaml") is True
    assert _is_safe_path("LICENSE") is True
    assert _is_safe_path("CHANGELOG.md") is True
    assert _is_safe_path(".gitignore") is True
    assert _is_safe_path(".github/ISSUE_TEMPLATE/bug_report.yml") is True


def test_bypass_paths_are_not_auto_approvable_end_to_end():
    d = classify_pull_request(
        touched_file_paths=["mydocs/payload.py"], total_changed_lines=5, is_new_contributor=False
    )
    assert d.is_safe_to_auto_approve is False
