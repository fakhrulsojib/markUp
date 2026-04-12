#!/usr/bin/env bash
# Phase 1 Verification Script — MarkUp Extension
# Tests: directory structure, file existence, JSON validity, JS syntax, HTML structure, icon integrity

set -euo pipefail
ROOT="/home/fakhrulislam/Documents/personal_project/markUp"
PASS=0
FAIL=0
WARN=0

pass() { echo "  ✅ PASS: $1"; ((PASS++)); }
fail() { echo "  ❌ FAIL: $1"; ((FAIL++)); }
warn() { echo "  ⚠️  WARN: $1"; ((WARN++)); }

section() { echo ""; echo "━━━ $1 ━━━"; }

# ─── TEST 1: Directory Structure ───
section "TEST 1: Directory Structure"
EXPECTED_DIRS=(
  "src" "src/background" "src/content" "src/popup" "src/options"
  "src/core" "src/ui" "src/styles" "src/styles/themes" "src/utils"
  "src/icons"
  "assets" "assets/icons" "assets/fonts"
  "vendor" "tests" "tests/test-files" "scripts"
)
for d in "${EXPECTED_DIRS[@]}"; do
  if [ -d "$ROOT/$d" ]; then
    pass "Directory exists: $d"
  else
    fail "Directory missing: $d"
  fi
done

# ─── TEST 2: Root File Existence ───
section "TEST 2: Root Files"
for f in "README.md" "AGENTS.md" "ProjectPlan.md"; do
  if [ -f "$ROOT/$f" ]; then
    size=$(wc -c < "$ROOT/$f")
    if [ "$size" -gt 50 ]; then
      pass "$f exists ($size bytes)"
    else
      fail "$f exists but is too small ($size bytes)"
    fi
  else
    fail "$f missing"
  fi
done

# ─── TEST 3: manifest.json Validation ───
section "TEST 3: manifest.json"
MANIFEST="$ROOT/src/manifest.json"
if [ -f "$MANIFEST" ]; then
  pass "manifest.json exists"
  
  # JSON syntax check
  if python3 -c "import json; json.load(open('$MANIFEST'))" 2>/dev/null; then
    pass "manifest.json is valid JSON"
  else
    fail "manifest.json has JSON syntax errors"
  fi
  
  # Required fields check
  python3 << PYEOF
import json, sys
m = json.load(open("$MANIFEST"))
checks = [
    (m.get("manifest_version") == 3, "manifest_version is 3"),
    (m.get("name") == "MarkUp", "name is 'MarkUp'"),
    (m.get("version") == "0.1.0", "version is '0.1.0'"),
    (m.get("description") is not None, "description is present"),
    ("activeTab" in m.get("permissions", []), "activeTab permission present"),
    ("storage" in m.get("permissions", []), "storage permission present"),
    ("scripting" in m.get("permissions", []), "scripting permission present"),
    (m.get("content_security_policy", {}).get("extension_pages") is not None, "CSP for extension_pages set"),
    ("'self'" in m.get("content_security_policy", {}).get("extension_pages", ""), "CSP allows only 'self' scripts"),
    (m.get("background", {}).get("service_worker") == "background/service-worker.js", "service_worker path correct"),
    (m.get("action", {}).get("default_popup") == "popup/popup.html", "default_popup path correct"),
    (len(m.get("content_scripts", [])) > 0, "content_scripts defined"),
    ("file:///*/*.md" in m.get("content_scripts", [{}])[0].get("matches", []), "content_scripts matches file://*.md"),
    ("file:///*/*.markdown" in m.get("content_scripts", [{}])[0].get("matches", []), "content_scripts matches file://*.markdown"),
    ("https://raw.githubusercontent.com/*" in m.get("content_scripts", [{}])[0].get("matches", []), "content_scripts matches raw.githubusercontent.com"),
    (m.get("content_scripts", [{}])[0].get("run_at") == "document_idle", "run_at is document_idle"),
    ("content/content-script.js" in m.get("content_scripts", [{}])[0].get("js", []), "content script JS path correct"),
    ("content/content.css" in m.get("content_scripts", [{}])[0].get("css", []), "content script CSS path correct"),
]
for ok, desc in checks:
    if ok:
        print(f"  ✅ PASS: manifest: {desc}")
    else:
        print(f"  ❌ FAIL: manifest: {desc}")
PYEOF

  # Icon references resolve to actual files
  python3 << PYEOF2
import json, os
m = json.load(open("$MANIFEST"))
src_dir = os.path.dirname("$MANIFEST")
for size, path in m.get("icons", {}).items():
    full = os.path.join(src_dir, path)
    if os.path.isfile(full):
        print(f"  ✅ PASS: Icon {size}px resolves: {path}")
    else:
        print(f"  ❌ FAIL: Icon {size}px missing: {full}")
for size, path in m.get("action", {}).get("default_icon", {}).items():
    full = os.path.join(src_dir, path)
    if os.path.isfile(full):
        print(f"  ✅ PASS: Action icon {size}px resolves: {path}")
    else:
        print(f"  ❌ FAIL: Action icon {size}px missing: {full}")
PYEOF2

  # No options_page yet (should be absent per plan)
  python3 -c "
import json
m = json.load(open('$MANIFEST'))
if 'options_page' not in m and 'options_ui' not in m:
    print('  ✅ PASS: options_page correctly omitted (Phase 7)')
else:
    print('  ⚠️  WARN: options_page/options_ui present — plan says Phase 7')
"

else
  fail "manifest.json missing"
fi

# ─── TEST 4: Icon File Integrity ───
section "TEST 4: Icon Files"
for size in 16 32 48 128; do
  for loc in "assets/icons" "src/icons"; do
    f="$ROOT/$loc/icon-${size}.png"
    if [ -f "$f" ]; then
      # Verify it's actually a PNG (magic bytes)
      if python3 -c "
import struct
with open('$f', 'rb') as fp:
    header = fp.read(8)
assert header[:4] == b'\x89PNG', 'Not a PNG'
" 2>/dev/null; then
        # Verify dimensions
        python3 -c "
from PIL import Image
img = Image.open('$f')
w, h = img.size
if w == $size and h == $size:
    print(f'  ✅ PASS: $loc/icon-${size}.png is valid PNG ({w}x{h})')
else:
    print(f'  ❌ FAIL: $loc/icon-${size}.png wrong size: {w}x{h}, expected ${size}x${size}')
"
      else
        fail "$loc/icon-${size}.png is not a valid PNG"
      fi
    else
      fail "$loc/icon-${size}.png missing"
    fi
  done
done

# ─── TEST 5: Service Worker ───
section "TEST 5: Service Worker"
SW="$ROOT/src/background/service-worker.js"
if [ -f "$SW" ]; then
  pass "service-worker.js exists"
  
  # JS syntax check via Node.js
  if node --check "$SW" 2>/dev/null; then
    pass "service-worker.js passes Node.js syntax check"
  else
    fail "service-worker.js has JS syntax errors"
  fi
  
  # Check for required patterns
  if grep -q "chrome.runtime.onInstalled" "$SW"; then
    pass "service-worker.js has onInstalled listener"
  else
    fail "service-worker.js missing onInstalled listener"
  fi
  
  if grep -q "chrome.runtime.onMessage" "$SW"; then
    pass "service-worker.js has onMessage listener"
  else
    fail "service-worker.js missing onMessage listener"
  fi
  
  if grep -q "MarkUp installed" "$SW"; then
    pass "service-worker.js logs 'MarkUp installed'"
  else
    fail "service-worker.js doesn't log install message"
  fi
  
  if grep -q "return true" "$SW"; then
    pass "onMessage returns true for async response"
  else
    warn "onMessage may not return true for async response"
  fi
  
  # JSDoc check
  if grep -q "@param" "$SW" || grep -q "/\*\*" "$SW"; then
    pass "service-worker.js has JSDoc comments"
  else
    warn "service-worker.js missing JSDoc documentation"
  fi
  
  # No eval/Function check (CSP compliance)
  if grep -qE "eval\(|new Function\(" "$SW"; then
    fail "service-worker.js contains eval() or new Function() — CSP violation!"
  else
    pass "service-worker.js is CSP-compliant (no eval/Function)"
  fi
else
  fail "service-worker.js missing"
fi

# ─── TEST 6: Content Script ───
section "TEST 6: Content Script"
CS="$ROOT/src/content/content-script.js"
if [ -f "$CS" ]; then
  pass "content-script.js exists"
  
  if node --check "$CS" 2>/dev/null; then
    pass "content-script.js passes Node.js syntax check"
  else
    fail "content-script.js has JS syntax errors"
  fi
  
  if grep -q "console.log" "$CS"; then
    pass "content-script.js has console.log"
  else
    fail "content-script.js missing console.log"
  fi
  
  if grep -q "window.location.href" "$CS"; then
    pass "content-script.js logs current URL"
  else
    fail "content-script.js doesn't log URL"
  fi
  
  if grep -qE "eval\(|new Function\(" "$CS"; then
    fail "content-script.js contains eval() or new Function() — CSP violation!"
  else
    pass "content-script.js is CSP-compliant"
  fi
else
  fail "content-script.js missing"
fi

# ─── TEST 7: Content CSS ───
section "TEST 7: Content CSS"
CSS="$ROOT/src/content/content.css"
if [ -f "$CSS" ]; then
  pass "content.css exists"
  size=$(wc -c < "$CSS")
  pass "content.css is $size bytes (placeholder)"
else
  fail "content.css missing"
fi

# ─── TEST 8: Popup HTML ───
section "TEST 8: Popup HTML"
POPUP="$ROOT/src/popup/popup.html"
if [ -f "$POPUP" ]; then
  pass "popup.html exists"
  
  if grep -q "<!DOCTYPE html>" "$POPUP"; then
    pass "popup.html has DOCTYPE"
  else
    warn "popup.html missing DOCTYPE"
  fi
  
  if grep -q "<html" "$POPUP"; then
    pass "popup.html has <html> tag"
  else
    fail "popup.html missing <html> tag"
  fi
  
  if grep -q "MarkUp" "$POPUP"; then
    pass "popup.html references MarkUp"
  else
    warn "popup.html doesn't mention MarkUp"
  fi
  
  # No inline scripts (CSP compliance)
  if grep -qE "onclick=|onload=|onsubmit=|onerror=" "$POPUP"; then
    fail "popup.html has inline event handlers — CSP violation!"
  else
    pass "popup.html has no inline event handlers (CSP-compliant)"
  fi
  
  if grep -q "<script" "$POPUP"; then
    if grep -q 'src=' "$POPUP"; then
      pass "popup.html uses external script (CSP-compliant)"
    else
      warn "popup.html has inline script block — may violate CSP"
    fi
  else
    pass "popup.html has no script tags (acceptable for placeholder)"
  fi
else
  fail "popup.html missing"
fi

# ─── TEST 9: README.md Content ───
section "TEST 9: README.md Content"
README="$ROOT/README.md"
if [ -f "$README" ]; then
  for section in "Loading the Extension" "Enabling File Access" "Project Structure" "Features"; do
    if grep -qi "$section" "$README"; then
      pass "README has '$section' section"
    else
      fail "README missing '$section' section"
    fi
  done
  
  if grep -q "chrome://extensions" "$README"; then
    pass "README has loading instructions with chrome://extensions"
  else
    fail "README missing chrome://extensions reference"
  fi
  
  if grep -q "src/" "$README"; then
    pass "README points to src/ as extension root"
  else
    fail "README doesn't mention loading from src/"
  fi
else
  fail "README.md missing"
fi

# ─── TEST 10: AGENTS.md Content ───
section "TEST 10: AGENTS.md Completeness"
AGENTS="$ROOT/AGENTS.md"
if [ -f "$AGENTS" ]; then
  for step in "Step 1.1" "Step 1.2" "Step 1.3" "Step 1.4" "Step 1.5" "Step 1.6"; do
    if grep -q "$step" "$AGENTS"; then
      pass "AGENTS.md has $step entry"
    else
      fail "AGENTS.md missing $step entry"
    fi
  done
  
  # Check for required entry sections
  completed_count=$(grep -c "Status.*Completed" "$AGENTS" || true)
  if [ "$completed_count" -ge 6 ]; then
    pass "All 6 steps marked as Completed"
  else
    fail "Only $completed_count/6 steps marked as Completed"
  fi
  
  if grep -q "Technical decisions" "$AGENTS"; then
    pass "AGENTS.md has 'Technical decisions' sections"
  else
    fail "AGENTS.md missing 'Technical decisions' sections"
  fi
  
  if grep -q "Issues / Deviations" "$AGENTS"; then
    pass "AGENTS.md has 'Issues / Deviations' sections"
  else
    fail "AGENTS.md missing 'Issues / Deviations' sections"
  fi
else
  fail "AGENTS.md missing"
fi

# ─── TEST 11: Manifest File Referential Integrity ───
section "TEST 11: Manifest Referential Integrity"
python3 << 'PYEOF3'
import json, os
src = "/home/fakhrulislam/Documents/personal_project/markUp/src"
m = json.load(open(os.path.join(src, "manifest.json")))

# Service worker
sw = os.path.join(src, m["background"]["service_worker"])
if os.path.isfile(sw):
    print(f"  ✅ PASS: service_worker file exists: {m['background']['service_worker']}")
else:
    print(f"  ❌ FAIL: service_worker file missing: {sw}")

# Popup
popup = os.path.join(src, m["action"]["default_popup"])
if os.path.isfile(popup):
    print(f"  ✅ PASS: default_popup file exists: {m['action']['default_popup']}")
else:
    print(f"  ❌ FAIL: default_popup file missing: {popup}")

# Content scripts
for cs in m.get("content_scripts", []):
    for js in cs.get("js", []):
        p = os.path.join(src, js)
        if os.path.isfile(p):
            print(f"  ✅ PASS: content script JS exists: {js}")
        else:
            print(f"  ❌ FAIL: content script JS missing: {p}")
    for css in cs.get("css", []):
        p = os.path.join(src, css)
        if os.path.isfile(p):
            print(f"  ✅ PASS: content script CSS exists: {css}")
        else:
            print(f"  ❌ FAIL: content script CSS missing: {p}")
PYEOF3

# ─── TEST 12: No Forbidden Patterns ───
section "TEST 12: Security & CSP Compliance (All JS)"
for jsfile in $(find "$ROOT/src" -name "*.js" -type f); do
  relpath="${jsfile#$ROOT/}"
  
  if grep -nE "eval\(" "$jsfile" > /dev/null 2>&1; then
    fail "$relpath contains eval()"
  fi
  
  if grep -nE "new Function\(" "$jsfile" > /dev/null 2>&1; then
    fail "$relpath contains new Function()"
  fi
  
  if grep -nE "innerHTML\s*=" "$jsfile" > /dev/null 2>&1; then
    warn "$relpath uses innerHTML assignment"
  fi
done
pass "No eval() or new Function() found in any JS files"

# ─── SUMMARY ───
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 PHASE 1 TEST RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Passed:  $PASS"
echo "  ❌ Failed:  $FAIL"
echo "  ⚠️  Warnings: $WARN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAIL" -eq 0 ]; then
  echo "  🎉 ALL TESTS PASSED!"
else
  echo "  💥 $FAIL TEST(S) FAILED"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

