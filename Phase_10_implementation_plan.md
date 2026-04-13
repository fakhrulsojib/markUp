# Phase 10: Download Interception — Render Instead of Download

Intercept `.md` file downloads (from Google Chat, Slack, email, etc.) and render them in a new tab using the existing MarkUp pipeline instead of saving to disk.

## User Review Required

> [!IMPORTANT]
> **New Permission: `downloads`** — Adding this to `manifest.json` will trigger a permission prompt for existing users on update. This is unavoidable — Chrome requires this permission for `chrome.downloads.onDeterminingFilename`. ✅ Accepted.

> [!WARNING]
> **viewer.html MessageBus wiring** — The viewer runs as an extension page, NOT a content script. It cannot receive `chrome.tabs.sendMessage()` because it's not injected into a tab — it IS the tab. Therefore:
> - Settings listeners (`APPLY_THEME`, `APPLY_FONT_SIZE`, etc.) must use `chrome.runtime.onMessage` directly via `MessageBus.listen()` — same as how the content script does it.
> - The viewer does NOT need the service-worker relay hop for *receiving* messages. The popup/options → SW relay → `chrome.tabs.sendMessage()` path will NOT reach the viewer. Instead, the SW relay must also broadcast via `chrome.runtime.sendMessage()` (which extension pages DO receive).
> - **Implementation note:** We will add a parallel `chrome.runtime.sendMessage()` call in the existing SW relay handlers so extension pages (viewer) also get notified. This is a safe additive change — content scripts already listen via `chrome.runtime.onMessage` too.

> [!NOTE]
> **`viewer.html` is an extension page, NOT a content script.** Unlike the content script that replaces an existing page's DOM, the viewer creates its own DOM from scratch with `fetch()` content. The pipeline is similar but the entry point differs: **viewer.js fetches → injects raw text → runs parse/render/highlight/theme pipeline directly.** ✅ Acknowledged.

## Proposed Changes

### Step 10.1 — Add `downloads` Permission & Setting

---

#### [MODIFY] [constants.js](file:///home/fakhrulislam/Documents/personal_project/markUp/src/utils/constants.js)

- Add `INTERCEPT_DOWNLOADS: true` to `DEFAULTS` object (line 60-71).
- This follows the pattern of existing defaults (`ENABLED`, `DEBUGLOG`, `CSPSTRICT`).

```diff
 const DEFAULTS = Object.freeze({
   ...
   CSPSTRICT: false,
+  INTERCEPT_DOWNLOADS: true,
 });
```

#### [MODIFY] [manifest.json](file:///home/fakhrulislam/Documents/personal_project/markUp/src/manifest.json)

- Add `"downloads"` to the `permissions` array (line 7-12).
- **No other manifest changes needed for Step 10.1.** The `viewer.html` additions come in Step 10.3.

```diff
 "permissions": [
   "activeTab",
   "storage",
   "scripting",
-  "tabs"
+  "tabs",
+  "downloads"
 ],
```

#### [MODIFY] [options.html](file:///home/fakhrulislam/Documents/personal_project/markUp/src/options/options.html)

- Add toggle to the **Behavior** section (after the Enable MarkUp toggle, before extensions):

```html
<div class="markup-options-field markup-options-toggle-field">
  <label for="markup-opt-intercept-downloads">Render Markdown downloads</label>
  <input type="checkbox" id="markup-opt-intercept-downloads" class="markup-options-toggle" checked>
</div>
<p class="markup-options-help">
  📥 When you click a <code>.md</code> file link that would normally download, MarkUp opens it in a new tab instead.
</p>
```

#### [MODIFY] [options.js](file:///home/fakhrulislam/Documents/personal_project/markUp/src/options/options.js)

- **`_loadAllSettings()`**: Add read for `interceptDownloads` setting (default: true).
- **`_wireBehaviorControls()`**: Wire the toggle with `APPLY_INTERCEPT_DOWNLOADS` action.
- **`_onReset()`**: Add `interceptDownloads: true` to the reset list.

#### [MODIFY] [popup.html](file:///home/fakhrulislam/Documents/personal_project/markUp/src/popup/popup.html)

- Add toggle in the Toggles section:

```html
<div class="markup-popup-toggle-row">
  <label for="markup-toggle-intercept">Render downloads</label>
  <input type="checkbox" id="markup-toggle-intercept" class="markup-toggle">
</div>
```

#### [MODIFY] [popup.js](file:///home/fakhrulislam/Documents/personal_project/markUp/src/popup/popup.js)

- **`_loadToggleStates()`**: Add read for `interceptDownloads` setting.
- **`_wireToggleSwitches()`**: Wire the new toggle with `APPLY_INTERCEPT_DOWNLOADS` action.

#### [MODIFY] [service-worker.js](file:///home/fakhrulislam/Documents/personal_project/markUp/src/background/service-worker.js)

- Add `APPLY_INTERCEPT_DOWNLOADS` MessageBus listener (no relay needed — setting is consumed locally by the service worker).

> ✅ **Verify:** Extension loads with new permission. Toggle visible in Options (Behavior) and Popup. Setting persists across sessions. `DEFAULTS.INTERCEPT_DOWNLOADS` equals `true`.

---

### Step 10.2 — Implement Download Listener in Service Worker

---

#### [MODIFY] [service-worker.js](file:///home/fakhrulislam/Documents/personal_project/markUp/src/background/service-worker.js)

Add `chrome.downloads.onDeterminingFilename` listener:

1. **Check filename** — Extract extension from `downloadItem.filename`, test against `fileDetector.isMarkdownUrl()` by building a synthetic `file:///test/{filename}` URL.
2. **Read setting** — `await settingsStorage.get('interceptDownloads')`. If `false`, call `suggest()` with no changes (allow download).
3. **Read enabled** — Also check `enabled` gate. If disabled, allow download.
4. **Suggest empty** — Call `suggest()` immediately (synchronous requirement of `onDeterminingFilename`). Then cancel the download asynchronously.
5. **Cancel download** — `chrome.downloads.cancel(downloadItem.id)`.
6. **Remove entry** — `chrome.downloads.erase({ id: downloadItem.id })` to clean up the downloads bar.
7. **Open viewer** — `chrome.tabs.create({ url: chrome.runtime.getURL('viewer/viewer.html') + '?url=' + encodeURIComponent(downloadItem.finalUrl || downloadItem.url) + '&filename=' + encodeURIComponent(downloadItem.filename) })`.
8. **Add to recent files** — Call `_addRecentFile()` with the download URL.

**Critical implementation detail:** `onDeterminingFilename` requires calling `suggest()` synchronously to claim the download. The async setting check happens *after* suggesting — if the setting is off, we allow the download to proceed by not canceling. **If we do cancel, we must clean up the partial file from disk.**

**Partial file cleanup strategy (3-step):**
1. `chrome.downloads.cancel(id)` — stops the download.
2. `chrome.downloads.removeFile(id)` — **deletes the partial file from disk** (must be called before `erase`).
3. `chrome.downloads.erase({ id })` — removes the entry from Chrome's download bar/history.

> [!IMPORTANT]
> **Order matters:** `removeFile()` must be called before `erase()`. If `erase()` runs first, Chrome loses the `downloadId` → `removeFile()` will fail and leave the partial file on disk.

```js
// Pseudocode — actual implementation will follow this flow
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  // Always suggest immediately (required synchronously)
  suggest();
  
  // Async check — cancel, cleanup, and redirect if appropriate
  _handleMarkdownDownload(downloadItem);
});

async function _handleMarkdownDownload(downloadItem) {
  const filename = downloadItem.filename || '';
  // Build synthetic URL for FileDetector
  if (!fileDetector.isMarkdownUrl('file:///test/' + filename)) return;
  
  const interceptEnabled = await settingsStorage.get('interceptDownloads');
  if (interceptEnabled === false) return;
  
  const enabled = await settingsStorage.get('enabled');
  if (enabled === false) return;
  
  // Step 1: Cancel the download
  try {
    await chrome.downloads.cancel(downloadItem.id);
  } catch (err) {
    // Download may have already completed — log and continue
    MARKUP_LOGGER.debug('ServiceWorker', 'Download cancel race:', err.message);
  }
  
  // Step 2: Delete partial file from disk
  try {
    await chrome.downloads.removeFile(downloadItem.id);
  } catch (err) {
    // File may not exist if download hadn't started writing yet
    MARKUP_LOGGER.debug('ServiceWorker', 'Partial file cleanup:', err.message);
  }
  
  // Step 3: Remove from download bar/history
  try {
    await chrome.downloads.erase({ id: downloadItem.id });
  } catch (err) {
    MARKUP_LOGGER.debug('ServiceWorker', 'Download erase:', err.message);
  }
  
  // Open viewer
  const viewerUrl = chrome.runtime.getURL('viewer/viewer.html') 
    + '?url=' + encodeURIComponent(downloadItem.finalUrl || downloadItem.url)
    + '&filename=' + encodeURIComponent(filename);
  chrome.tabs.create({ url: viewerUrl });
  
  // Track as recent file
  _addRecentFile(
    downloadItem.finalUrl || downloadItem.url,
    filename.replace(/\.[^.]+$/, '') // title without extension
  );
}
```

**Regression concerns:**
- The `onDeterminingFilename` listener is additive — it does not modify any existing service worker behavior.
- The `FileDetector` instance is shared but only read (pattern matching), never mutated here.
- `settingsStorage.get()` is read-only with default fallback — safe.
- All 3 cleanup calls are wrapped in try/catch — race conditions (download completing before cancel) are handled gracefully.

> ✅ **Verify:** Download a `.md` file from any web source → download gets cancelled, viewer tab opens. Toggle OFF → `.md` file downloads normally. Non-`.md` files always download normally.

---

### Step 10.3 — Create `viewer.html` Extension Page

---

#### [NEW] [viewer.html](file:///home/fakhrulislam/Documents/personal_project/markUp/src/viewer/viewer.html)

Minimal extension page that:
- Loads all CSS files (same order as manifest content_scripts CSS).
- Loads all JS files via `<script>` tags (same order as manifest content_scripts JS, minus `content-script.js`).
- Loads `viewer.js` as the controller.
- Has a `<body>` with a loading spinner and a hidden `<pre>` element for raw content injection.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MarkUp Viewer</title>
  <!-- CSS: same order as manifest -->
  <link rel="stylesheet" href="../styles/variables.css">
  <link rel="stylesheet" href="../styles/themes/light.css">
  <link rel="stylesheet" href="../styles/themes/dark.css">
  <link rel="stylesheet" href="../styles/themes/sepia.css">
  <link rel="stylesheet" href="../styles/typography.css">
  <link rel="stylesheet" href="../content/content.css">
  <link rel="stylesheet" href="../styles/code-highlight.css">
  <link rel="stylesheet" href="../styles/ui-components.css">
  <link rel="stylesheet" href="../styles/print.css">
  <link rel="stylesheet" href="viewer.css">
</head>
<body>
  <!-- Scripts: vendor + core (same order as manifest) -->
  <script src="../vendor/marked.min.js"></script>
  <script src="../vendor/highlight.min.js"></script>
  <script src="../utils/constants.js"></script>
  <script src="../utils/dom-helpers.js"></script>
  <script src="../utils/sanitizer.js"></script>
  <script src="../utils/logger.js"></script>
  <script src="../core/EventEmitter.js"></script>
  <script src="../core/FileDetector.js"></script>
  <script src="../core/StorageManager.js"></script>
  <script src="../core/Renderer.js"></script>
  <script src="../core/MarkdownParser.js"></script>
  <script src="../core/HtmlRenderer.js"></script>
  <script src="../core/SyntaxHighlighter.js"></script>
  <script src="../core/TocGenerator.js"></script>
  <script src="../core/ThemeManager.js"></script>
  <script src="../core/SearchController.js"></script>
  <script src="../core/PrintManager.js"></script>
  <script src="../core/KeyboardManager.js"></script>
  <script src="../core/MessageBus.js"></script>
  <script src="../ui/BaseComponent.js"></script>
  <script src="../ui/ToolbarComponent.js"></script>
  <script src="../ui/TocPanelComponent.js"></script>
  <script src="../ui/SearchBarComponent.js"></script>
  <script src="../ui/SettingsPanelComponent.js"></script>
  <script src="viewer.js"></script>
</body>
</html>
```

#### [NEW] [viewer.js](file:///home/fakhrulislam/Documents/personal_project/markUp/src/viewer/viewer.js)

IIFE controller that:
1. Parses `?url=` and `?filename=` query params.
2. Shows loading spinner with filename.
3. Calls `fetch(url)` from the extension context (relaxed CORS for extension pages).
4. On success:
   - Gets the response text.
   - Runs the same pipeline as `MarkUpApp`: parse → render → highlight → TOC → theme → typography → toolbar → keyboard.
   - **Reuses the same global classes** (`MARKUP_MARKDOWN_PARSER`, `MARKUP_HTML_RENDERER`, etc.) — identical to how the content script uses them.
   - Sets `document.title` to `filename — MarkUp`.
   - Adds a "Save file" button (bottom-left, near raw toggle position) that calls `chrome.downloads.download({ url })`.
   - Tracks as recent file via MessageBus `ADD_RECENT_FILE`.
5. On failure (401/403/network error):
   - Shows styled error card:
     - "This file requires authentication" or "Could not load file"
     - "Download instead" button → `chrome.downloads.download({ url })`
     - "Try again" button → `location.reload()`
6. Checks binary content, empty file, large file — same edge case handling as content script.

**Key design decision:** Rather than duplicating the `MarkUpApp` class, `viewer.js` orchestrates the same individual modules in a linear fashion. This avoids the content-script detection logic (`_isRawMarkdownPage()`) that doesn't apply here.

#### [NEW] [viewer.css](file:///home/fakhrulislam/Documents/personal_project/markUp/src/viewer/viewer.css)

Minimal viewer-specific styles:
- Loading state, error card, "Save file" button.
- All content styling comes from existing CSS files (variables, themes, typography, content, ui-components).

#### [MODIFY] [manifest.json](file:///home/fakhrulislam/Documents/personal_project/markUp/src/manifest.json)

- Add `viewer/viewer.html` to `web_accessible_resources` (not strictly needed since it's opened via `chrome.runtime.getURL()`, but ensures compatibility).
- Alternatively: no `web_accessible_resources` change may be needed — extension pages at `chrome-extension://<id>/viewer/viewer.html` are accessible by the extension itself without explicit WAR entries. **Will verify during implementation.**

> ✅ **Verify:** Navigate to `chrome-extension://<id>/viewer/viewer.html?url=<markdown-url>` → content loads, renders, respects theme. "Save file" button downloads the original file.

---

### Step 10.4 — Handle Edge Cases & Auth Failures

---

#### [MODIFY] [viewer.js](file:///home/fakhrulislam/Documents/personal_project/markUp/src/viewer/viewer.js)

Add edge case handling:

| Case | Detection | Behavior |
|------|-----------|----------|
| **Auth failure (401/403)** | `fetch()` response status | Error card: "This file requires authentication. [Download instead] [Try again]" |
| **Network error / CORS** | `fetch()` throws | Error card: "Could not load file. [Download instead] [Try again]" |
| **Large file (>1MB)** | `response.text().length > 1_000_000` | Same warning bar + "Load All" as content script |
| **Binary file** | `_isBinaryContent()` check | Error card: "Not a valid Markdown file. [Download instead]" |
| **Empty file** | `text.trim().length === 0` | Styled "This file is empty" card |
| **Non-Markdown false positive** | Binary check catches this | Resume download via `chrome.downloads.download()` |
| **User wants to download** | "Save file" button always visible | `chrome.downloads.download({ url, filename })` |

**"Download instead" button implementation:**
```js
chrome.downloads.download({
  url: originalUrl,
  filename: suggestedFilename, // from query param
  saveAs: true
});
```

#### [MODIFY] [service-worker.js](file:///home/fakhrulislam/Documents/personal_project/markUp/src/background/service-worker.js)

- `_handleMarkdownDownload()` race condition safety: all 3 cleanup steps (`cancel`, `removeFile`, `erase`) individually wrapped in try/catch — download may have completed, file may not exist, or entry may already be removed.
- Cleanup order enforced: `cancel()` → `removeFile()` → `erase()` (never reversed).
- Added `_lastIntercepted` state and `GET_LAST_INTERCEPTED` MessageBus listener for ephemeral popup notifications.

> ✅ **Verify:** Test with expired link → error with download fallback. Binary file → normal download. "Save file" button → downloads the rendered file. After interception → no partial file remains on disk, no ghost entry in download bar.

---

### Step 10.5 — Popup Integration

---

#### [MODIFY] [popup.js](file:///home/fakhrulislam/Documents/personal_project/markUp/src/popup/popup.js)

- Intercepted files are tracked via `ADD_RECENT_FILE` (from viewer.js) and appear in Recent Files.
- **Add ephemeral notification widget:** When the popup opens, check for recently intercepted downloads (last 30 seconds) and display a subtle notification banner:
  - Text: "📥 Rendered `notes.md` instead of downloading"
  - Auto-dismiss after 5 seconds with fade-out.
  - Uses a new MessageBus action `GET_LAST_INTERCEPTED` that the service worker responds to with the most recently intercepted filename + timestamp.

**Implementation:**
- **Service worker:** Store last intercepted download info in a module-scoped variable `_lastIntercepted = { filename, timestamp }` (not persisted to storage — ephemeral, lives only while SW is alive).
- **Service worker:** Add `GET_LAST_INTERCEPTED` MessageBus listener that returns `_lastIntercepted` if timestamp < 30s ago, else `null`.
- **popup.js:** On init, call `messageBus.send('GET_LAST_INTERCEPTED')`. If response has data, show the notification banner above the theme section.

#### [MODIFY] [popup.html](file:///home/fakhrulislam/Documents/personal_project/markUp/src/popup/popup.html)

- Add a hidden notification container above the theme section:
```html
<div id="markup-popup-intercept-notice" class="markup-popup-notice hidden"></div>
```

#### [MODIFY] [popup.css](file:///home/fakhrulislam/Documents/personal_project/markUp/src/popup/popup.css)

- Add styles for `.markup-popup-notice` — subtle blue background, icon, fade-out animation.

> ✅ **Verify:** Intercept a download → open popup within 30s → notification banner shows "Rendered X instead of downloading". After 30s → notification no longer appears. Toggle OFF in popup → next download saves normally.

---

### Step 10.6 — Tests & Documentation

---

#### [NEW] [phase10-browser-verify.html](file:///home/fakhrulislam/Documents/personal_project/markUp/tests/phase10-browser-verify.html)

Browser-runnable test suite following the established pattern (mock chrome APIs, assert framework, grouped results):

| Test Group | Tests |
|------------|-------|
| **Constants** | `DEFAULTS.INTERCEPT_DOWNLOADS` exists, equals `true` |
| **FileDetector filename matching** | `.md`, `.markdown`, `.mdown`, `.mkd`, `.mdx` filenames detected; `.txt`, `.pdf`, `.docx` rejected |
| **Download listener filename check** | Synthetic filename → `isMarkdownUrl('file:///test/' + filename)` |
| **Setting toggle** | `interceptDownloads = false` → bypass; `true` → intercept |
| **Master toggle interaction** | `enabled = false` → bypass even when `interceptDownloads = true` |
| **Partial file cleanup** | After cancel → `removeFile()` deletes from disk → `erase()` removes from history |
| **viewer.js URL parsing** | Valid `?url=` parsed correctly; missing `?url=` shows error |
| **viewer.js fetch error handling** | Mock 401 → error card; mock 403 → error card; network error → error card |
| **viewer.js binary detection** | Binary content → error card with download fallback |
| **viewer.js empty file** | Empty response → "file is empty" card |
| **Popup notification** | `GET_LAST_INTERCEPTED` returns data within 30s; returns null after 30s |
| **Regression — existing settings** | All existing settings defaults unchanged |
| **Regression — existing MessageBus actions** | All existing relay actions still registered |
| **Regression — FileDetector** | `isMarkdownUrl()` unchanged for all existing URL patterns |

Estimated: ~60-70 tests.

#### [MODIFY] [AGENTS.md](file:///home/fakhrulislam/Documents/personal_project/markUp/AGENTS.md)

- Add Phase 10 entry to Phase table and detailed section.
- Update Architecture diagram to include viewer.html flow.
- Add `INTERCEPT_DOWNLOADS` to Settings Model table.
- Add `APPLY_INTERCEPT_DOWNLOADS` to MessageBus Actions table.

#### [MODIFY] [README.md](file:///home/fakhrulislam/Documents/personal_project/markUp/README.md)

- Add "Download Interception" to Features section.
- Update permissions list.
- Update version reference.

#### [MODIFY] [test-checklist.md](file:///home/fakhrulislam/Documents/personal_project/markUp/tests/test-checklist.md)

- Add Phase 10 QA items to manual checklist.

> ✅ **Verify:** All Phase 10 tests pass. All prior suites (Phase 2–9) pass with zero regressions.

---

## Resolved Review Items

| Item | Resolution |
|------|------------|
| `downloads` permission prompt | ✅ Accepted — unavoidable |
| viewer.html MessageBus wiring | ✅ Direct listeners + SW relay broadcast via `chrome.runtime.sendMessage()` |
| viewer.html is extension page | ✅ Acknowledged — linear pipeline, no `_isRawMarkdownPage()` detection |
| Partial file cleanup | ✅ 3-step: `cancel()` → `removeFile()` (disk) → `erase()` (history). Order matters. |
| Popup notification | ✅ Implementing ephemeral notification widget with 30s window + auto-dismiss |

> No open questions remain.

## Verification Plan

### Automated Tests
- `tests/phase10-browser-verify.html` — ~60-70 tests covering constants, filename detection, setting toggles, viewer URL parsing, error handling, binary detection, and regressions.
- Re-run all existing suites: `phase2` through `phase9-step95` — zero regression tolerance.

### Manual Verification
1. Load unpacked extension — no manifest errors, `downloads` permission granted.
2. Download a `.md` file from a web link → viewer opens, renders correctly.
3. Toggle "Render downloads" OFF → `.md` file downloads normally.
4. Toggle back ON → interception resumes.
5. Test with expired/auth-gated URL → error card with "Download instead" button.
6. Test "Save file" button on rendered view → triggers download dialog.
7. Check popup → intercepted file appears in Recent Files.
8. Verify all existing features work (theme, search, TOC, settings, keyboard shortcuts).

---

## File Change Summary

| Action | File | Step |
|--------|------|------|
| MODIFY | `src/utils/constants.js` | 10.1 |
| MODIFY | `src/manifest.json` | 10.1, 10.3 |
| MODIFY | `src/options/options.html` | 10.1 |
| MODIFY | `src/options/options.js` | 10.1 |
| MODIFY | `src/popup/popup.html` | 10.1, 10.5 |
| MODIFY | `src/popup/popup.css` | 10.5 |
| MODIFY | `src/popup/popup.js` | 10.1, 10.5 |
| MODIFY | `src/background/service-worker.js` | 10.1, 10.2, 10.4, 10.5 |
| **NEW** | `src/viewer/viewer.html` | 10.3 |
| **NEW** | `src/viewer/viewer.js` | 10.3, 10.4 |
| **NEW** | `src/viewer/viewer.css` | 10.3 |
| **NEW** | `tests/phase10-browser-verify.html` | 10.6 |
| MODIFY | `AGENTS.md` | 10.6 |
| MODIFY | `README.md` | 10.6 |
| MODIFY | `tests/test-checklist.md` | 10.6 |

**Files NOT touched (regression safety):**
- All `src/core/*.js` — no changes to core modules
- All `src/ui/*.js` — no changes to UI components  
- All `src/styles/*.css` — no changes to existing styles
- `src/content/content-script.js` — no changes to content script pipeline
- All existing test suites — no modifications, only additions
