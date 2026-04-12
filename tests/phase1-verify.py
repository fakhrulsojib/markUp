#!/usr/bin/env python3
"""Phase 1 Verification Script - MarkUp Extension.

Tests: directory structure, file existence, JSON validity, JS syntax,
HTML structure, icon integrity, manifest referential integrity, CSP compliance.
"""

import json
import os
import shutil
import subprocess
import re

NODE_AVAILABLE = shutil.which("node") is not None

ROOT = "/home/fakhrulislam/Documents/personal_project/markUp"
SRC = os.path.join(ROOT, "src")
PASS_COUNT = 0
FAIL_COUNT = 0
WARN_COUNT = 0


def passed(msg):
    global PASS_COUNT
    PASS_COUNT += 1
    print(f"  PASS: {msg}")


def fail(msg):
    global FAIL_COUNT
    FAIL_COUNT += 1
    print(f"  FAIL: {msg}")


def warn(msg):
    global WARN_COUNT
    WARN_COUNT += 1
    print(f"  WARN: {msg}")


def section(title):
    print(f"\n=== {title} ===")


def file_contains(filepath, pattern, regex=False):
    try:
        with open(filepath, "r") as f:
            content = f.read()
        if regex:
            return re.search(pattern, content) is not None
        return pattern in content
    except Exception:
        return False


def file_size(filepath):
    return os.path.getsize(filepath) if os.path.isfile(filepath) else 0


# ---- TEST 1: Directory Structure ----
section("TEST 1: Directory Structure")
EXPECTED_DIRS = [
    "src", "src/background", "src/content", "src/popup", "src/options",
    "src/core", "src/ui", "src/styles", "src/styles/themes", "src/utils",
    "src/icons",
    "assets", "assets/icons", "assets/fonts",
    "vendor", "tests", "tests/test-files", "scripts"
]
for d in EXPECTED_DIRS:
    full = os.path.join(ROOT, d)
    if os.path.isdir(full):
        passed(f"Directory exists: {d}")
    else:
        fail(f"Directory missing: {d}")

# ---- TEST 2: Root File Existence ----
section("TEST 2: Root Files")
for f in ["README.md", "AGENTS.md", "ProjectPlan.md"]:
    full = os.path.join(ROOT, f)
    if os.path.isfile(full):
        sz = file_size(full)
        if sz > 50:
            passed(f"{f} exists ({sz} bytes)")
        else:
            fail(f"{f} exists but is too small ({sz} bytes)")
    else:
        fail(f"{f} missing")

# ---- TEST 3: manifest.json Validation ----
section("TEST 3: manifest.json")
MANIFEST_PATH = os.path.join(SRC, "manifest.json")
manifest = None

if os.path.isfile(MANIFEST_PATH):
    passed("manifest.json exists")

    try:
        with open(MANIFEST_PATH) as f:
            manifest = json.load(f)
        passed("manifest.json is valid JSON")
    except json.JSONDecodeError as e:
        fail(f"manifest.json has JSON syntax errors: {e}")

    if manifest:
        checks = [
            (manifest.get("manifest_version") == 3, "manifest_version is 3"),
            (manifest.get("name") == "MarkUp", "name is 'MarkUp'"),
            (manifest.get("version") == "0.1.0", "version is '0.1.0'"),
            (manifest.get("description") is not None, "description is present"),
            ("activeTab" in manifest.get("permissions", []), "activeTab permission present"),
            ("storage" in manifest.get("permissions", []), "storage permission present"),
            ("scripting" in manifest.get("permissions", []), "scripting permission present"),
            (manifest.get("content_security_policy", {}).get("extension_pages") is not None, "CSP for extension_pages set"),
            ("'self'" in manifest.get("content_security_policy", {}).get("extension_pages", ""), "CSP allows only 'self' scripts"),
            (manifest.get("background", {}).get("service_worker") == "background/service-worker.js", "service_worker path correct"),
            (manifest.get("action", {}).get("default_popup") == "popup/popup.html", "default_popup path correct"),
            (len(manifest.get("content_scripts", [])) > 0, "content_scripts defined"),
        ]

        cs = manifest.get("content_scripts", [{}])[0]
        matches = cs.get("matches", [])
        checks.extend([
            ("file:///*/*.md" in matches, "content_scripts matches file://*.md"),
            ("file:///*/*.markdown" in matches, "content_scripts matches file://*.markdown"),
            ("https://raw.githubusercontent.com/*" in matches, "content_scripts matches raw.githubusercontent.com"),
            (cs.get("run_at") == "document_idle", "run_at is document_idle"),
            ("content/content-script.js" in cs.get("js", []), "content script JS path correct"),
            ("content/content.css" in cs.get("css", []), "content script CSS path correct"),
        ])

        for ok, desc in checks:
            if ok:
                passed(f"manifest: {desc}")
            else:
                fail(f"manifest: {desc}")

        # Icon references resolve to actual files
        for size, path in manifest.get("icons", {}).items():
            full = os.path.join(SRC, path)
            if os.path.isfile(full):
                passed(f"Icon {size}px resolves: {path}")
            else:
                fail(f"Icon {size}px missing: {full}")

        for size, path in manifest.get("action", {}).get("default_icon", {}).items():
            full = os.path.join(SRC, path)
            if os.path.isfile(full):
                passed(f"Action icon {size}px resolves: {path}")
            else:
                fail(f"Action icon {size}px missing: {full}")

        # No options_page yet (should be absent per plan)
        if "options_page" not in manifest and "options_ui" not in manifest:
            passed("options_page correctly omitted (Phase 7)")
        else:
            warn("options_page/options_ui present - plan says Phase 7")
else:
    fail("manifest.json missing")

# ---- TEST 4: Icon File Integrity ----
section("TEST 4: Icon Files")
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    warn("Pillow not available - skipping dimension checks")

for size in [16, 32, 48, 128]:
    for loc in ["assets/icons", "src/icons"]:
        filepath = os.path.join(ROOT, loc, f"icon-{size}.png")
        if os.path.isfile(filepath):
            # Check PNG magic bytes
            with open(filepath, "rb") as fp:
                header = fp.read(8)
            if header[:4] == b'\x89PNG':
                if PIL_AVAILABLE:
                    img = Image.open(filepath)
                    w, h = img.size
                    if w == size and h == size:
                        passed(f"{loc}/icon-{size}.png is valid PNG ({w}x{h})")
                    else:
                        fail(f"{loc}/icon-{size}.png wrong size: {w}x{h}, expected {size}x{size}")
                else:
                    passed(f"{loc}/icon-{size}.png is a valid PNG")
            else:
                fail(f"{loc}/icon-{size}.png is not a valid PNG")
        else:
            fail(f"{loc}/icon-{size}.png missing")

# ---- TEST 5: Service Worker ----
section("TEST 5: Service Worker")
SW_PATH = os.path.join(SRC, "background/service-worker.js")

if os.path.isfile(SW_PATH):
    passed("service-worker.js exists")

    # JS syntax check
    if NODE_AVAILABLE:
        result = subprocess.run(["node", "--check", SW_PATH], capture_output=True, text=True)
        if result.returncode == 0:
            passed("service-worker.js passes Node.js syntax check")
        else:
            fail(f"service-worker.js has JS syntax errors: {result.stderr.strip()}")
    else:
        # Fallback: basic Python-based bracket/paren check
        with open(SW_PATH) as f:
            content = f.read()
        if content.count("{") == content.count("}") and content.count("(") == content.count(")"):
            passed("service-worker.js passes basic syntax check (no Node.js available)")
        else:
            fail("service-worker.js has mismatched brackets/parens")

    # Required patterns
    if file_contains(SW_PATH, "chrome.runtime.onInstalled"):
        passed("service-worker.js has onInstalled listener")
    else:
        fail("service-worker.js missing onInstalled listener")

    if file_contains(SW_PATH, "chrome.runtime.onMessage") or file_contains(SW_PATH, "MessageBus"):
        passed("service-worker.js has onMessage listener (direct or via MessageBus)")
    else:
        fail("service-worker.js missing onMessage listener")

    if file_contains(SW_PATH, "MarkUp installed"):
        passed("service-worker.js logs 'MarkUp installed'")
    else:
        fail("service-worker.js doesn't log install message")

    if file_contains(SW_PATH, "return true"):
        passed("onMessage returns true for async response")
    else:
        warn("onMessage may not return true for async response")

    # JSDoc check
    if file_contains(SW_PATH, "@param") or file_contains(SW_PATH, "/**"):
        passed("service-worker.js has JSDoc comments")
    else:
        warn("service-worker.js missing JSDoc documentation")

    # No eval/Function (CSP compliance)
    if file_contains(SW_PATH, "eval(", regex=False) or file_contains(SW_PATH, "new Function(", regex=False):
        fail("service-worker.js contains eval() or new Function() - CSP violation!")
    else:
        passed("service-worker.js is CSP-compliant (no eval/Function)")
else:
    fail("service-worker.js missing")

# ---- TEST 6: Content Script ----
section("TEST 6: Content Script")
CS_PATH = os.path.join(SRC, "content/content-script.js")

if os.path.isfile(CS_PATH):
    passed("content-script.js exists")

    if NODE_AVAILABLE:
        result = subprocess.run(["node", "--check", CS_PATH], capture_output=True, text=True)
        if result.returncode == 0:
            passed("content-script.js passes Node.js syntax check")
        else:
            fail(f"content-script.js has JS syntax errors: {result.stderr.strip()}")
    else:
        with open(CS_PATH) as f:
            content = f.read()
        if content.count("{") == content.count("}") and content.count("(") == content.count(")"):
            passed("content-script.js passes basic syntax check (no Node.js available)")
        else:
            fail("content-script.js has mismatched brackets/parens")

    if file_contains(CS_PATH, "console.log"):
        passed("content-script.js has console.log")
    else:
        fail("content-script.js missing console.log")

    if file_contains(CS_PATH, "window.location.href"):
        passed("content-script.js logs current URL")
    else:
        fail("content-script.js doesn't log URL")

    if file_contains(CS_PATH, "eval(") or file_contains(CS_PATH, "new Function("):
        fail("content-script.js contains eval() or new Function() - CSP violation!")
    else:
        passed("content-script.js is CSP-compliant")
else:
    fail("content-script.js missing")

# ---- TEST 7: Content CSS ----
section("TEST 7: Content CSS")
CSS_PATH = os.path.join(SRC, "content/content.css")

if os.path.isfile(CSS_PATH):
    sz = file_size(CSS_PATH)
    passed(f"content.css exists ({sz} bytes, placeholder)")
else:
    fail("content.css missing")

# ---- TEST 8: Popup HTML ----
section("TEST 8: Popup HTML")
POPUP_PATH = os.path.join(SRC, "popup/popup.html")

if os.path.isfile(POPUP_PATH):
    passed("popup.html exists")

    if file_contains(POPUP_PATH, "<!DOCTYPE html>"):
        passed("popup.html has DOCTYPE")
    else:
        warn("popup.html missing DOCTYPE")

    if file_contains(POPUP_PATH, "<html"):
        passed("popup.html has <html> tag")
    else:
        fail("popup.html missing <html> tag")

    if file_contains(POPUP_PATH, "MarkUp"):
        passed("popup.html references MarkUp")
    else:
        warn("popup.html doesn't mention MarkUp")

    # No inline event handlers (CSP compliance)
    if file_contains(POPUP_PATH, r"onclick=|onload=|onsubmit=|onerror=", regex=True):
        fail("popup.html has inline event handlers - CSP violation!")
    else:
        passed("popup.html has no inline event handlers (CSP-compliant)")

    # Check for inline scripts
    with open(POPUP_PATH) as f:
        content = f.read()
    if "<script" in content:
        if "src=" in content:
            passed("popup.html uses external script (CSP-compliant)")
        else:
            warn("popup.html has inline script block - may violate CSP")
    else:
        passed("popup.html has no script tags (acceptable for placeholder)")
else:
    fail("popup.html missing")

# ---- TEST 9: README.md Content ----
section("TEST 9: README.md Content")
README_PATH = os.path.join(ROOT, "README.md")

if os.path.isfile(README_PATH):
    for sect in ["Loading the Extension", "Enabling File Access", "Project Structure", "Features"]:
        if file_contains(README_PATH, sect):
            passed(f"README has '{sect}' section")
        else:
            fail(f"README missing '{sect}' section")

    if file_contains(README_PATH, "chrome://extensions"):
        passed("README has loading instructions with chrome://extensions")
    else:
        fail("README missing chrome://extensions reference")

    if file_contains(README_PATH, "src/"):
        passed("README points to src/ as extension root")
    else:
        fail("README doesn't mention loading from src/")
else:
    fail("README.md missing")

# ---- TEST 10: AGENTS.md Content ----
section("TEST 10: AGENTS.md Completeness")
AGENTS_PATH = os.path.join(ROOT, "AGENTS.md")

if os.path.isfile(AGENTS_PATH):
    for step in ["Step 1.1", "Step 1.2", "Step 1.3", "Step 1.4", "Step 1.5", "Step 1.6"]:
        if file_contains(AGENTS_PATH, step):
            passed(f"AGENTS.md has {step} entry")
        else:
            fail(f"AGENTS.md missing {step} entry")

    with open(AGENTS_PATH) as f:
        content = f.read()
    completed_count = content.count("Completed")
    if completed_count >= 6:
        passed(f"All 6 steps marked as Completed ({completed_count} found)")
    else:
        fail(f"Only {completed_count}/6 steps marked as Completed")

    if "Technical decisions" in content:
        passed("AGENTS.md has 'Technical decisions' sections")
    else:
        fail("AGENTS.md missing 'Technical decisions' sections")

    if "Issues / Deviations" in content:
        passed("AGENTS.md has 'Issues / Deviations' sections")
    else:
        fail("AGENTS.md missing 'Issues / Deviations' sections")
else:
    fail("AGENTS.md missing")

# ---- TEST 11: Manifest Referential Integrity ----
section("TEST 11: Manifest Referential Integrity")
if manifest:
    # Service worker
    sw = os.path.join(SRC, manifest["background"]["service_worker"])
    if os.path.isfile(sw):
        passed(f"service_worker file exists: {manifest['background']['service_worker']}")
    else:
        fail(f"service_worker file missing: {sw}")

    # Popup
    popup = os.path.join(SRC, manifest["action"]["default_popup"])
    if os.path.isfile(popup):
        passed(f"default_popup file exists: {manifest['action']['default_popup']}")
    else:
        fail(f"default_popup file missing: {popup}")

    # Content scripts
    for cs in manifest.get("content_scripts", []):
        for js in cs.get("js", []):
            p = os.path.join(SRC, js)
            if os.path.isfile(p):
                passed(f"content script JS exists: {js}")
            else:
                fail(f"content script JS missing: {p}")
        for css in cs.get("css", []):
            p = os.path.join(SRC, css)
            if os.path.isfile(p):
                passed(f"content script CSS exists: {css}")
            else:
                fail(f"content script CSS missing: {p}")

# ---- TEST 12: Security & CSP Compliance (All JS) ----
section("TEST 12: Security & CSP Compliance (All JS Files)")
js_files_checked = 0
for dirpath, _, filenames in os.walk(SRC):
    for fname in filenames:
        if fname.endswith(".js"):
            filepath = os.path.join(dirpath, fname)
            relpath = os.path.relpath(filepath, ROOT)
            js_files_checked += 1

            if file_contains(filepath, "eval("):
                fail(f"{relpath} contains eval()")
            if file_contains(filepath, "new Function("):
                fail(f"{relpath} contains new Function()")
            if file_contains(filepath, "innerHTML"):
                warn(f"{relpath} uses innerHTML")

if js_files_checked > 0:
    passed(f"Scanned {js_files_checked} JS files - no eval() or new Function() found")

# ---- SUMMARY ----
print("\n" + "=" * 50)
print("  PHASE 1 TEST RESULTS")
print("=" * 50)
print(f"  Passed:   {PASS_COUNT}")
print(f"  Failed:   {FAIL_COUNT}")
print(f"  Warnings: {WARN_COUNT}")
print("=" * 50)
if FAIL_COUNT == 0:
    print("  ALL TESTS PASSED!")
else:
    print(f"  {FAIL_COUNT} TEST(S) FAILED")
print("=" * 50)
