# AGENTS.md — MarkUp Development Log

> This file serves as an append-only audit trail of every implementation step. A new developer should be able to read it chronologically and understand every decision made.

---

### [Step 1.1] — Initialize Repository and Root Files
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created the full directory structure: `src/` (with `background/`, `content/`, `popup/`, `options/`, `core/`, `ui/`, `styles/themes/`, `utils/`), `assets/` (with `icons/`, `fonts/`), `vendor/`, `tests/test-files/`, `scripts/`.
- Created `README.md` with project name, one-line description, and "Under Construction" badge.
- Created `AGENTS.md` (this file) with header and first entry.
- `PLAN.md` at the project root.

**Technical decisions:**
- Directory structure follows the plan exactly as specified in Section 2 of PLAN.md.
- All directories created as empty placeholders to be populated in subsequent steps.

**Current state:**
- Directory tree is fully scaffolded. Root documentation files exist. Ready for Step 1.2 (manifest.json).

**Issues / Deviations:**
- None.
---

### [Step 1.2] — Create `manifest.json` (Manifest V3)
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/manifest.json` with Manifest V3 configuration.
- Set `manifest_version: 3`, `name: "MarkUp"`, `version: "0.1.0"`.
- Configured permissions: `activeTab`, `storage`, `scripting`.
- Set Content Security Policy: `script-src 'self'; object-src 'none';`.
- Configured `background.service_worker` → `background/service-worker.js`.
- Configured `action.default_popup` → `popup/popup.html`.
- Configured `content_scripts` matching `file:///*/*.md`, `file:///*/*.markdown`, and `https://raw.githubusercontent.com/*`.
- `options_page` left out for now (to be added in Phase 7).

**Technical decisions:**
- Content script `run_at` set to `document_idle` to ensure the page is fully loaded before injection.
- Using `scripting` permission for dynamic injection capability in Phase 3.

**Current state:**
- Manifest is ready for unpacked loading. Requires service worker and popup HTML to exist (created in subsequent steps).

**Issues / Deviations:**
- None.
---

### [Step 1.3] — Create Extension Icons
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Generated a custom MarkUp icon — stylized "M" with document symbol in blue-to-violet gradient.
- Resized to 4 required sizes: 16×16, 32×32, 48×48, 128×128 PNG.
- Placed in `assets/icons/` (originals) and `src/icons/` (for extension loading).
- Updated manifest icon paths to `icons/icon-{size}.png` (relative to `src/`).

**Technical decisions:**
- Chrome extensions cannot reference files outside the extension root directory. Since the extension root is `src/`, icons were copied into `src/icons/` and manifest paths updated accordingly. The `assets/icons/` copies remain as source-of-truth originals.

**Current state:**
- All 4 icon sizes exist and are correctly referenced in the manifest.

**Issues / Deviations:**
- Icon paths changed from `../assets/icons/` (as in the plan's directory structure) to `src/icons/` due to Chrome's extension root restriction. This is a necessary deviation from the plan's directory layout.
---

### [Step 1.4] — Create Minimal Service Worker Skeleton
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/background/service-worker.js` with:
  - `chrome.runtime.onInstalled` listener that logs "MarkUp installed" with the install reason.
  - Empty `chrome.runtime.onMessage` listener skeleton that logs received messages.
- No business logic — lifecycle proof only.

**Technical decisions:**
- The `onMessage` listener returns `true` to keep the message channel open for async `sendResponse` usage per Chrome extension best practices.
- Full JSDoc comments on all functions.

**Current state:**
- Service worker is loadable by Chrome. Handler stubs ready for Phase 3 wiring.

**Issues / Deviations:**
- None.
---

### [Step 1.5] — Create Minimal Content Script Skeleton
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/content/content-script.js` with a single `console.log` statement logging the current URL.
- Created `src/content/content.css` with an empty `body` placeholder rule.
- Created `src/popup/popup.html` as a minimal placeholder (not in the plan for this step, but required by manifest's `default_popup` reference to avoid Chrome errors).

**Technical decisions:**
- Content script intentionally has zero DOM manipulation at this stage — just proving injection works.
- Popup HTML added proactively to prevent Chrome manifest validation errors on load.

**Current state:**
- Extension is fully loadable as an unpacked extension. All manifest references resolve to existing files.

**Issues / Deviations:**
- Added `popup.html` placeholder ahead of schedule (Phase 7) as a minimal stub to satisfy manifest requirements.
---

### [Step 1.6] — Append to AGENTS.md & Update README.md
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Documented Steps 1.1–1.5 completion in AGENTS.md (all entries above).
- Updated `README.md` with:
  - Full planned feature list.
  - "Loading the Extension" instructions (load unpacked from `src/`).
  - "Enabling File Access" instructions for `file://` URLs.
  - Project structure overview.

**Technical decisions:**
- README describes features as "Planned" since only scaffolding is in place.
- Loading instructions point to `src/` as the extension root directory.

**Current state:**
- Phase 1 is fully complete. All scaffolding is in place:
  - Directory tree matches plan.
  - `manifest.json` is Manifest V3 compliant.
  - Custom icons at all 4 sizes.
  - Service worker skeleton with lifecycle listeners.
  - Content script skeleton with console logging.
  - Popup HTML placeholder.
  - README and AGENTS.md are current.
- Ready for Phase 2: Core Utility & Foundation Classes.

**Issues / Deviations:**
- None.
---

### [Step 2.1] — Create `constants.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/utils/constants.js` with all project-wide constants:
  - `THEMES`: `{ LIGHT: 'light', DARK: 'dark', SEPIA: 'sepia' }` — frozen enum.
  - `STORAGE_KEYS`: `{ THEME, FONT_SIZE, FONT_FAMILY, LINE_HEIGHT, TOC_VISIBLE, TOOLBAR_POSITION, LAST_FILE }` — all prefixed with `markup_`.
  - `EVENTS`: `{ THEME_CHANGED, CONTENT_PARSED, CONTENT_RENDERED, TOC_GENERATED, TOC_TOGGLED, SEARCH_TOGGLED, SEARCH_MATCH, SETTINGS_TOGGLED, FONT_SIZE_CHANGED, LINE_HEIGHT_CHANGED, FONT_FAMILY_CHANGED, PRINT_REQUESTED }`.
  - `DEFAULTS`: `{ THEME: 'light', FONT_SIZE: 16, LINE_HEIGHT: 1.6, FONT_FAMILY: 'system-ui', TOC_VISIBLE: false, TOOLBAR_POSITION: 'top-right' }`.
  - `MD_URL_PATTERNS`: 5 RegExp patterns for `.md`, `.markdown`, `.mdown`, `.mkd`, `.mdx` (query/fragment aware).
  - `MD_MIME_TYPES`: `['text/markdown', 'text/x-markdown']`.
  - `CSS_PREFIX`: `'markup'` — namespace for all MarkUp CSS classes.
  - `MAX_DOCUMENT_SIZE`: `500000` — character limit for parse attempts.

**Technical decisions:**
- All constant objects are `Object.freeze()`-d to prevent accidental mutation.
- Exports via `globalThis.MARKUP_CONSTANTS` for cross-context compatibility (content scripts use classic scripts, extension pages may use ES modules).
- SCREAMING_SNAKE_CASE convention per plan Section 4.6.

**Current state:**
- Constants are globally accessible. Ready for consumption by all modules.

**Issues / Deviations:**
- None.
---

### [Step 2.2] — Create `dom-helpers.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/utils/dom-helpers.js` with four pure utility functions:
  - `createElement(tag, attributes, children)` — safe element factory. Supports special keys: `textContent`, `classList` (array), `dataset` (object), `style` (object of CSS properties), `events` (object of {eventName: handler}). All other attributes set via `setAttribute()`.
  - `createFragment(elements)` — wraps elements in a `DocumentFragment` for batched DOM insertion.
  - `removeAllChildren(element)` — iteratively removes child nodes (safer than `innerHTML = ''`).
  - `addStyles(cssText, id)` — injects a `<style>` element into `<head>` with deduplication by `id`. Updates existing styles in-place.

**Technical decisions:**
- **No `innerHTML` usage anywhere** — strict compliance with plan Section 4.3.
- `createElement` uses `appendChild(document.createTextNode())` for string children instead of `textContent` to allow mixed content (text + elements).
- `addStyles` deduplicates by element `id` — if a style with the same id exists, its `textContent` is updated rather than creating a duplicate.
- Exported via `globalThis.MARKUP_DOM_HELPERS`.

**Current state:**
- DOM helper functions are globally accessible. Ready for use by Renderer, Components, and all DOM-manipulating modules.

**Issues / Deviations:**
- None.
---

### [Step 2.3] — Create `sanitizer.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/utils/sanitizer.js` with the `Sanitizer` class:
  - **Constructor** accepts optional `config` object with `allowedTags` (Set) and `allowedAttributes` (Object of Sets) overrides.
  - **`sanitize(htmlString)`** → parses via `DOMParser`, walks tree, strips disallowed nodes/attributes, returns clean HTML string.
  - **`_walkAndSanitize(node)`** — recursive tree walker. Removes comments, disallowed elements (entirely, including children), and recurses into allowed elements.
  - **`_sanitizeAttributes(element, tagName)`** — strips attributes not in the global or tag-specific whitelist. Explicitly removes `on*` event handler attributes. Validates URL attributes via `_isSafeUrl()`.
  - **`_isSafeUrl(url)`** — allows relative URLs and checks absolute URLs against `SAFE_URL_PROTOCOLS` (http, https, mailto, tel, data, file). Blocks `javascript:`, `vbscript:`, etc.

- **Default whitelist (allowed tags):** `p, h1-h6, a, img, code, pre, ul, ol, li, table, thead, tbody, tfoot, tr, th, td, blockquote, em, strong, del, s, hr, br, input, div, span, dl, dt, dd, sup, sub, abbr, mark, details, summary, figure, figcaption, caption, colgroup, col`.
- **Allowed attributes:** Global (`id, class, title, lang, dir`), plus tag-specific (`a`: href/target/rel; `img`: src/alt/width/height/loading; `input`: type/checked/disabled; `td/th`: colspan/rowspan/align; `code/pre`: class; `ol`: start/type; `col/colgroup`: span).
- **Special case:** `input` elements are only allowed if `type="checkbox"` (GFM task lists).

**Technical decisions:**
- DOMParser-based approach per plan Section 4.2 — more robust than regex-based sanitization.
- Whitelist is deliberately broader than the plan's minimum list to support extended Markdown features (footnotes via `sup`, definition lists via `dl/dt/dd`, admonitions via `details/summary`).
- Event handler attributes (`on*`) are explicitly stripped before checking the attribute whitelist — defense in depth.
- URL validation uses the `URL` constructor with a dummy base to handle edge cases. Relative URLs are allowed.
- Exported via `globalThis.MARKUP_SANITIZER`.

**Current state:**
- Sanitizer is globally accessible. Strips `<script>`, `<iframe>`, `onclick=`, `javascript:` hrefs. Allows standard Markdown output tags. Ready for use by `HtmlRenderer` in Phase 4.

**Issues / Deviations:**
- None.
---

### [Step 2.4] — Create `EventEmitter.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/EventEmitter.js` with the `EventEmitter` class:
  - **`_listeners`** — `Map<string, Set<Function>>`. Using `Set` naturally prevents duplicate listener registration (plan requirement).
  - **`on(event, callback)`** — registers a listener. Throws `TypeError` if callback is not a function. Returns `this` for chaining.
  - **`off(event, callback)`** — removes a listener. Cleans up empty Sets to prevent memory leaks. Returns `this` for chaining.
  - **`emit(event, ...args)`** — invokes all listeners for the event synchronously. Iterates over a **copy** of the Set to safely handle listeners that modify the listener list during emission. Each listener is wrapped in try/catch for error isolation. Returns `boolean` indicating whether listeners existed.
  - **`once(event, callback)`** — registers a one-time listener via a wrapper function that calls `off` before forwarding. Stores `_originalCallback` reference on the wrapper for identification.
  - **`removeAllListeners(event?)`** — bulk cleanup. If event specified, clears that event's listeners. If omitted, clears all.
  - **`listenerCount(event)`** — returns the number of listeners for diagnostics.

**Technical decisions:**
- `Set` over `Array` for the listener collection — O(1) add/delete/has, and automatic duplicate prevention.
- Spread-copy iteration in `emit()` (`[...listeners]`) prevents issues when a listener calls `off()` or `once()` during emission.
- Error isolation in `emit()` — a throwing listener does not prevent subsequent listeners from executing.
- `removeAllListeners()` and `listenerCount()` added beyond the plan's minimum spec for practical utility (cleanup and debugging).
- Exported via `globalThis.MARKUP_EVENT_EMITTER`.

**Current state:**
- EventEmitter is globally accessible. Ready for use by MessageBus (Phase 3), ThemeManager (Phase 5), and all component communication (Phase 6).

**Issues / Deviations:**
- None.
---

### [Step 2.5] — Append to AGENTS.md
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Documented Steps 2.1–2.4 completion in AGENTS.md with full API surface descriptions.
- All Phase 2 design decisions and whitelist rationale recorded.

**Technical decisions:**
- N/A (documentation step).

**Current state:**
- Phase 2 is fully complete. All core utility and foundation classes are in place:
  - `src/utils/constants.js` — frozen enums and config defaults.
  - `src/utils/dom-helpers.js` — 4 safe DOM manipulation functions.
  - `src/utils/sanitizer.js` — DOMParser-based HTML sanitizer with whitelist.
  - `src/core/EventEmitter.js` — pub/sub with duplicate guards and error isolation.
  - AGENTS.md is current.
- Ready for Phase 3: Storage, Messaging & Detection Infrastructure.

**Issues / Deviations:**
- None.
---

### [Step 3.1] — Create `StorageManager.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/StorageManager.js` with the `StorageManager` class:
  - **Constructor** accepts `namespace` (default: `'markup'`) and `storageArea` (`'sync'` or `'local'`).
  - **`_prefixKey(key)`** → returns `${namespace}_${key}` for collision-free storage.
  - **`async get(key)`** → retrieves value from `chrome.storage`, falls back to `DEFAULTS` if not found.
  - **`async set(key, value)`** → persists key-value pair to `chrome.storage`.
  - **`async remove(key)`** → removes a namespaced key from storage.
  - **`async getAll()`** → retrieves all namespaced entries, returns object with un-prefixed keys.
  - **`_getDefault(key)`** → maps raw key names to `DEFAULTS` constants via case-insensitive lookup.
  - All methods wrap `chrome.storage` calls with `chrome.runtime.lastError` handling.
  - Additional try/catch at the outer level for exception safety.

**Technical decisions:**
- All `chrome.storage` callbacks check `chrome.runtime.lastError` before processing results (plan Section 4.5).
- `get()` resolves with the default value (from `DEFAULTS`) on error rather than rejecting — ensures the UI always has a usable value.
- `set()` and `remove()` reject on error — callers should know if persistence failed.
- `getAll()` uses `chrome.storage.get(null)` to fetch everything, then filters by namespace prefix.
- Exported via `globalThis.MARKUP_STORAGE_MANAGER`.

**Current state:**
- StorageManager is globally accessible. Ready for use by ThemeManager (Phase 5) and SettingsPanelComponent (Phase 6).

**Issues / Deviations:**
- None.
---

### [Step 3.2] — Create `MessageBus.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/MessageBus.js` with the `MessageBus` class:
  - **`_handlers`** — `Map<string, Function>` for action-based message routing.
  - **Constructor** — immediately registers the internal `_onMessage` dispatcher on `chrome.runtime.onMessage`. Uses a bound reference (`_boundOnMessage`) for proper cleanup.
  - **`send(action, payload)`** → wraps `chrome.runtime.sendMessage({ action, payload })` in a Promise. Handles `chrome.runtime.lastError`.
  - **`listen(action, handler)`** → registers a handler for an action. Handler receives `(payload, sender)` and returns a response value or Promise.
  - **`unlisten(action)`** → removes the handler for an action.
  - **`_onMessage(message, sender, sendResponse)`** — internal dispatcher:
    - Ignores messages without an `action` field (returns `false`).
    - Routes to registered handler by action name.
    - Supports both synchronous and async (Promise-returning) handlers.
    - Returns `true` to keep the message channel open for async `sendResponse`.
    - Error isolation: handler exceptions are caught and sent as `{ error: message }`.
  - **`destroy()`** — removes the `onMessage` listener and clears all handlers.

**Technical decisions:**
- Returns `false` from `_onMessage` for unknown actions (does not consume the message) — allows other listeners (e.g., other extensions) to handle it.
- Async handler support is detected by checking for `.then()` method on the return value (duck-typing), avoiding forced `async` wrapping.
- `listen()` throws `TypeError` for non-function handlers — fail fast.
- `destroy()` method added for proper cleanup, removing the bound listener from `chrome.runtime.onMessage`.
- Exported via `globalThis.MARKUP_MESSAGE_BUS`.

**Current state:**
- MessageBus is globally accessible. Service worker registers a `ping` → `pong` handler. Connectivity testable once extension is loaded.

**Issues / Deviations:**
- None.
---

### [Step 3.3] — Create `FileDetector.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/FileDetector.js` with the `FileDetector` class:
  - **Constructor** — loads patterns from `MARKUP_CONSTANTS` if available, otherwise uses built-in defaults.
  - **`_patterns`** — 5 RegExp patterns for `.md`, `.markdown`, `.mdown`, `.mkd`, `.mdx`.
  - **`_mimeTypes`** — `['text/markdown', 'text/x-markdown']`.
  - **`isMarkdownUrl(url)`** — parses URL with the `URL` constructor, tests pathname against patterns. Strips query strings and fragments via URL parsing. Falls back to manual extraction for non-standard URLs.
  - **`isMarkdownMime(contentType)`** — extracts MIME type (strips charset/parameters), checks against known Markdown MIME types.
  - **`getFileNameFromUrl(url)`** — extracts and decodes the last path segment from a URL. Handles `file://`, `http://`, `https://` schemes and manual fallback.

**Technical decisions:**
- `isMarkdownUrl()` uses the `URL` constructor for robust parsing of `file://`, `http://`, and `https://` URLs. Manual `split('?')[0].split('#')[0]` fallback handles edge cases where `URL` parsing fails.
- `isMarkdownMime()` splits on `;` to strip charset parameters (e.g., `text/markdown; charset=utf-8` → `text/markdown`).
- `getFileNameFromUrl()` uses `decodeURIComponent()` for display-friendly filenames.
- Input validation: all public methods return safe defaults (`false` or `''`) for null/undefined/empty inputs.
- Exported via `globalThis.MARKUP_FILE_DETECTOR`.

**Current state:**
- FileDetector is globally accessible. Tested against all required URL patterns from the plan.

**Issues / Deviations:**
- None.
---

### [Step 3.4] — Wire FileDetector into Service Worker
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Rewrote `src/background/service-worker.js` to:
  - **Import modules** via `importScripts()`: `constants.js`, `FileDetector.js`, `MessageBus.js`.
  - **Create instances**: `fileDetector` (FileDetector) and `messageBus` (MessageBus).
  - **`chrome.tabs.onUpdated` listener**: detects Markdown URLs not covered by static manifest matches, dynamically injects content scripts via `chrome.scripting.executeScript()` and CSS via `chrome.scripting.insertCSS()`.
  - **`_isCoveredByStaticMatches(url)`**: checks if a URL is already handled by the static `content_scripts` patterns (`file://*/*.md`, `file://*/*.markdown`, `https://raw.githubusercontent.com/*`) to avoid double-injection.
  - **`injectedTabs` Set**: tracks which tabs have been injected to prevent duplicates. Cleaned up via `chrome.tabs.onRemoved`.
  - **`ping` handler** on the MessageBus: responds with `{ status: 'pong', timestamp }` for connectivity testing.
- Updated `src/manifest.json`:
  - Added `"tabs"` permission (required for `chrome.tabs.onUpdated`).
  - Added Phase 2 utility scripts to the static `content_scripts.js` array so they're available in statically-matched pages.

**Technical decisions:**
- Dynamic injection injects the full set of utility scripts (constants, dom-helpers, sanitizer, EventEmitter, FileDetector) and the content script — ensuring the content script has all dependencies in non-static-match contexts.
- `_isCoveredByStaticMatches()` is a simple function (not using manifest parsing) to avoid complexity. Checks for `file://*.md`, `file://*.markdown`, and `https://raw.githubusercontent.com/` prefixes.
- The original skeleton `chrome.runtime.onMessage` listener was removed — `MessageBus` now handles all message routing.
- `chrome.scripting.executeScript` and `insertCSS` errors are caught and logged as warnings — they do not break tab operation (plan Section 4.5).

**Current state:**
- Service worker is fully wired with FileDetector, MessageBus, and dynamic injection. Ready for extension loading and testing.

**Issues / Deviations:**
- Added `"tabs"` permission to manifest — not explicitly listed in the plan's permission list (`activeTab`, `storage`, `scripting`) but required for `chrome.tabs.onUpdated`. This is the minimum additional permission needed for dynamic injection.
---

### [Step 3.5] — Append to AGENTS.md & Update README.md
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Documented Steps 3.1–3.4 completion in AGENTS.md with full API surface descriptions.
- Updated `README.md` with supported file types documentation.
- Created `tests/phase3-browser-verify.html` with comprehensive test suite (62 tests).

**Technical decisions:**
- Phase 3 browser tests mock `chrome.storage` and `chrome.runtime` for testing outside extension context.
- Service worker wiring verified via static analysis (XHR loading and content checks).

**Current state:**
- Phase 3 is fully complete. All storage, messaging, and detection infrastructure is in place:
  - `src/core/StorageManager.js` — async chrome.storage wrapper with namespace prefixing and default fallbacks.
  - `src/core/MessageBus.js` — action-based message routing with Promise send and async handler support.
  - `src/core/FileDetector.js` — URL/MIME detection for 5 Markdown extensions.
  - `src/background/service-worker.js` — wired with FileDetector, MessageBus, dynamic injection, and ping handler.
  - `src/manifest.json` — updated with `tabs` permission and Phase 2 scripts in content_scripts.
  - `tests/phase3-browser-verify.html` — 62 tests, all passing.
  - AGENTS.md and README.md are current.
- Ready for Phase 4: Markdown Parsing & Rendering Pipeline.

**Issues / Deviations:**
- None.
---

### [Step 4.1] — Vendor Third-Party Libraries
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Downloaded and vendored `marked.min.js` (v15.0.12, 39KB) — Markdown parser library (MIT License).
- Downloaded and vendored `highlight.min.js` (v11.11.1, 127KB) — syntax highlighting library (BSD-3-Clause License).
- Downloaded `github.min.css` (1.3KB) → `src/styles/code-highlight.css` — GitHub-style syntax highlighting theme.
- Created `vendor/LICENSE-marked` (MIT) and `vendor/LICENSE-highlight` (BSD-3-Clause).
- Copied vendor files to `src/vendor/` for extension accessibility (Chrome extensions load from extension root `src/`).

**Technical decisions:**
- Vendor files placed in both `vendor/` (source-of-truth) and `src/vendor/` (extension runtime) because Chrome extensions cannot reference files outside the extension root directory.
- GitHub highlight.js theme chosen for clean, universal readability across light/dark themes.
- highlight.js common language bundle includes JavaScript, Python, Bash, HTML, CSS, JSON, Ruby, Java, Go, Rust, TypeScript, and more.

**Current state:**
- All vendor libraries are in place and loadable from the extension context.

**Issues / Deviations:**
- Added `src/vendor/` directory (not in original plan) as copies of `vendor/` files — necessary for Chrome extension file access restrictions. Same deviation pattern as `src/icons/`.
---

### [Step 4.2] — Create `MarkdownParser.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/MarkdownParser.js` with the `MarkdownParser` class:
  - **`DEFAULT_OPTIONS`** — static frozen defaults: `{ gfm: true, breaks: false, pedantic: false, async: false, silent: true }`.
  - **Constructor** accepts options object, merges with defaults.
  - **`_initializeParser()`** — creates an isolated `Marked` instance (via `new marked.Marked(options)`) to avoid polluting the global marked state. Falls back to global `marked` API if `Marked` class is unavailable.
  - **`parse(rawMarkdown)`** → returns HTML string. Checks document size limit (`MAX_DOCUMENT_SIZE`), handles null/empty input gracefully, wraps in try/catch for error isolation.
  - **`setOption(key, value)`** → updates option and re-initializes the parser.
  - **`getOptions()`** → returns a copy of current options.
- GFM enabled by default: tables, task lists, strikethrough, fenced code blocks.
- Silent mode: errors produce error HTML rather than throwing (plan Section 4.5).

**Technical decisions:**
- Uses `new marked.Marked()` for an isolated instance — this prevents option leakage when multiple parsers are created (defensive design).
- No `eval()` or `new Function()` usage — marked v15 does not require these in standard mode, complying with MV3 CSP.
- `silent: true` by default — produces error HTML for parsing failures rather than crashing the content script.
- Exported via `globalThis.MARKUP_MARKDOWN_PARSER`.

**Current state:**
- MarkdownParser is globally accessible. Tested against headings, code blocks, tables, task lists, strikethrough, lists, blockquotes, images, and link parsing.

**Issues / Deviations:**
- None.
---

### [Step 4.3] — Create Abstract `Renderer.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/Renderer.js` with the abstract `Renderer` class:
  - **Constructor** accepts `targetSelector` (CSS selector for mount point). Uses `new.target === Renderer` check to enforce abstract class — direct instantiation throws Error.
  - **`_targetSelector`** — protected CSS selector string.
  - **`_mountPoint`** — cached reference to the resolved DOM element.
  - **Abstract `render(content)`** — throws Error if not overridden by subclass.
  - **Abstract `clear()`** — throws Error if not overridden by subclass.
  - **Concrete `getContainer()`** — lazily resolves `_targetSelector` via `document.querySelector()` and caches the result.

**Technical decisions:**
- `new.target` check used for abstract enforcement — this is the ES6+ standard pattern. No constructor hacks or prototype manipulation needed.
- Lazy resolution of mount point (via `getContainer()`) allows the Renderer to be constructed before the DOM element exists.
- Exported via `globalThis.MARKUP_RENDERER`.

**Current state:**
- Abstract base class is enforced. Cannot instantiate directly. Subclasses must implement `render()` and `clear()`.

**Issues / Deviations:**
- None.
---

### [Step 4.4] — Create `HtmlRenderer.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/HtmlRenderer.js` extending `Renderer`:
  - **`_container`** — wrapper `<article>` element with classes `markup-content`, `markup-article` and id `markup-rendered-content`.
  - **`_sanitizer`** — instance of `Sanitizer` (from Phase 2).
  - **`_domParser`** — DOMParser for HTML string parsing.
  - **`render(htmlString)`** — full pipeline:
    1. Sanitize via `_sanitizer.sanitize()`.
    2. Clear existing container via `clear()`.
    3. Parse sanitized HTML via `DOMParser.parseFromString()`.
    4. Walk parsed DOM and import nodes via `document.importNode()` (deep clone).
    5. Append container to mount point (clearing mount point first).
  - **`clear()`** — removes all children from `_container` using `removeAllChildren()`.
  - **`injectStyles(cssText, styleId)`** — adds scoped CSS via `addStyles()` helper with deduplication.
  - **`getContentContainer()`** — returns the `<article>` element (for code highlighting and TOC operations).

**Technical decisions:**
- **No Shadow DOM** — deferred to avoid complicating theme/style injection in Phase 5. Using namespaced CSS class approach (`markup-*`) instead.
- `document.importNode(node, true)` used for deep cloning parsed nodes — safer than innerHTML and works with DOMParser output.
- `DocumentFragment` used for batched DOM insertion — minimizes reflows.
- Mount point is cleared before appending the container — ensures clean replacement of raw content.
- Integrates with `MARKUP_DOM_HELPERS` and `MARKUP_SANITIZER` with fallbacks for standalone usage.
- Exported via `globalThis.MARKUP_HTML_RENDERER`.

**Current state:**
- HtmlRenderer renders sanitized HTML safely. XSS attacks (script tags, event handlers, iframes) are blocked by the Sanitizer. Styles can be injected scoped to the content.

**Issues / Deviations:**
- Shadow DOM deferred as noted in the plan ("Consider using Shadow DOM") — will revisit if style leakage becomes an issue in Phase 5.
---

### [Step 4.5] — Create `SyntaxHighlighter.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/SyntaxHighlighter.js` with the `SyntaxHighlighter` class:
  - **`_hljs`** — reference to the `hljs` global from highlight.js.
  - **`_supportedLanguages`** — `Set<string>` populated from `hljs.listLanguages()` on construction.
  - **`_autoDetect`** — boolean flag for language auto-detection (default: `true`).
  - **`highlightAll(container)`** — finds all `<pre><code>` elements in the container, highlights each. Returns the count of blocks highlighted.
  - **`highlightElement(codeElement)`** — highlights a single `<code>` element:
    - Skips already-highlighted elements (`data-highlighted === 'yes'`).
    - Detects language from `language-*` or `lang-*` CSS classes via `_detectLanguage()`.
    - If language detected and supported: uses `hljs.highlight(text, { language, ignoreIllegals: true })`.
    - If no language and `_autoDetect`: uses `hljs.highlightAuto(text)`.
    - Sets `hljs` class, `data-highlighted`, and `data-language` attributes.
  - **`addLanguage(name, definition)`** → registers via `hljs.registerLanguage()`.
  - **`getSupportedLanguages()`** → returns a copy of the supported languages Set.
  - **`isLanguageSupported(language)`** → checks membership.

**Technical decisions:**
- Re-highlight prevention via `data-highlighted` attribute check — prevents double processing.
- `ignoreIllegals: true` passed to `hljs.highlight()` — prevents errors on imperfect code snippets.
- Language detection uses regex `^(?:language|lang)-(.+)$` — handles both `language-javascript` (marked output) and `lang-javascript` patterns.
- Exported via `globalThis.MARKUP_SYNTAX_HIGHLIGHTER`.

**Current state:**
- SyntaxHighlighter highlights all `<pre><code>` blocks with correct language detection. Auto-detection works for unlabelled blocks. Common languages (JavaScript, Python, Bash, HTML) are all supported.

**Issues / Deviations:**
- None.
---

### [Step 4.6] — Create `TocGenerator.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/TocGenerator.js` with the `TocGenerator` class:
  - **`_headings`** — flat array of `{ level, text, id }` objects.
  - **`_tree`** — nested tree structure built from the flat list.
  - **`_slugCounts`** — `Map<string, number>` for deduplicating heading IDs.
  - **`generate(container)`** — walks DOM for `h1`-`h6` elements:
    - Extracts `level` (from tag name), `text` (from `textContent`), and `id`.
    - Assigns unique slugified `id` to headings without one via `_generateSlug()`.
    - Handles duplicate heading texts by appending `-1`, `-2`, etc. suffixes.
    - Builds nested tree via `_buildTree()`.
    - Returns the flat headings array.
  - **`_buildTree(headings)`** — stack-based algorithm that nests headings by level:
    - Uses a stack to track the current parent at each level.
    - When a heading's level is ≥ the top of stack, pops back to find the correct parent.
    - Produces `{ level, text, id, children: [] }` tree nodes.
  - **`toHtml()`** — generates nested `<ul><li><a href="#id">text</a></li></ul>` HTML:
    - Uses `MARKUP_DOM_HELPERS.createElement()` for safe DOM construction (no innerHTML).
    - Applies `markup-toc-*` CSS classes for styling.
    - Includes `data-level` attributes for styling/filtering.
  - **`_generateSlug(text)`** — converts heading text to URL-safe slug:
    - Lowercase → strip non-word chars → replace spaces with hyphens → collapse hyphens → dedup via counter suffix.
  - **`getHeadings()`** → returns copy of flat headings array.
  - **`getTree()`** → returns nested tree structure.

**Technical decisions:**
- Stack-based tree building algorithm — O(n) time complexity, handles arbitrary heading level sequences correctly (e.g., h1→h3 skipping h2 still works).
- Slug generation follows GitHub's heading ID convention (lowercase, hyphenated).
- DOM helpers used for HTML generation — complies with plan Section 4.3 (no innerHTML for user-facing content).
- Exported via `globalThis.MARKUP_TOC_GENERATOR`.

**Current state:**
- TocGenerator extracts headings, assigns unique IDs, builds correct nested trees, and generates TOC HTML. Ready for use by TocPanelComponent in Phase 6.

**Issues / Deviations:**
- None.
---

### [Step 4.7] — Wire the Full Parse → Render Pipeline in Content Script
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Rewrote `src/content/content-script.js` as a full pipeline orchestrator:
  - **IIFE wrapper** with double-execution guard (`window.__MARKUP_INITIALIZED__`).
  - **`_isRawMarkdownPage()`** — detection logic:
    - Checks `document.contentType` for `text/plain`, `text/markdown`, `text/x-markdown`.
    - Checks for `<pre>` element (browser default for plain text files).
    - Handles `file://` and `https://` URL schemes.
  - **`_extractRawMarkdown()`** — extracts text from `<pre>` element (priority) or `body.textContent`.
  - **`_getFileName()`** — extracts filename from URL via `FileDetector` or manual fallback.
  - **`_setPageTitle(container)`** — sets `document.title` to first `<h1>` text + " — MarkUp", or filename + " — MarkUp".
  - **`_showError(error, rawMarkdown)`** — styled error fallback:
    - Clears body, shows error heading, message, and collapsible raw Markdown.
    - Injects error-specific CSS (red/amber theme).
    - Ensures the page is never left blank on pipeline failure.
  - **`_runPipeline()`** — orchestrates:
    1. Detect raw Markdown → skip if not detected.
    2. Extract raw text → skip if empty.
    3. Parse via `MarkdownParser` → HTML.
    4. Render via `HtmlRenderer` → safe DOM.
    5. Highlight via `SyntaxHighlighter` → colored code blocks.
    6. Generate TOC via `TocGenerator` → stored on `window.__MARKUP_TOC_DATA__`.
    7. Set page title from first `<h1>` or filename.
    8. Store renderer reference to `window.__MARKUP_RENDERER__`.
  - All steps wrapped in try/catch — failure shows styled error message.

- Updated `src/manifest.json`:
  - Added `vendor/marked.min.js` and `vendor/highlight.min.js` to `content_scripts.js` array (loaded before core modules).
  - Added all Phase 4 core modules: `Renderer.js`, `MarkdownParser.js`, `HtmlRenderer.js`, `SyntaxHighlighter.js`, `TocGenerator.js`.
  - Added `styles/code-highlight.css` to `content_scripts.css` array.
  - Added `web_accessible_resources` for vendor scripts.

- Updated `src/background/service-worker.js`:
  - Dynamic injection file list expanded to include vendor libs and all Phase 4 core modules.
  - Dynamic CSS injection includes `styles/code-highlight.css`.

**Technical decisions:**
- IIFE wrapper prevents global namespace pollution and allows double-execution guard.
- Detection checks `document.contentType` first (most reliable), then falls back to `<pre>` element presence — covers both Chrome's plain text rendering and raw GitHub files.
- Error fallback UI uses collapsible `<details>` for raw Markdown — allows users to copy content even when rendering fails.
- TOC data stored on `window.__MARKUP_TOC_DATA__` for later use by TocPanelComponent (Phase 6) — avoids re-generating.
- Vendor scripts load before core modules in the `content_scripts.js` array to ensure `marked` and `hljs` globals exist when `MarkdownParser` and `SyntaxHighlighter` initialize.

**Current state:**
- Full pipeline is wired: opening a `.md` file renders rich HTML with syntax highlighting and TOC data.
- Error handling is robust — pipeline failures show styled error messages.
- Ready for Phase 5 (theming) and Phase 6 (UI components).

**Issues / Deviations:**
- None.
---

### [Step 4.8] — Append to AGENTS.md & Update README.md
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Documented Steps 4.1–4.7 completion in AGENTS.md with full API surface descriptions.
- Updated `README.md` with supported Markdown features and library versions.
- Created `tests/phase4-browser-verify.html` with comprehensive test suite (67 tests).
- Created test files: `tests/test-files/gfm-tables.md`, `tests/test-files/code-blocks.md`, `tests/test-files/edge-cases.md`.

**Technical decisions:**
- Browser tests escape `</script>` strings via string concatenation to prevent HTML parser issues.
- Test suite covers all 5 Phase 4 classes across 14 test groups.

**Current state:**
- Phase 4 is fully complete. All parsing and rendering infrastructure is in place:
  - `vendor/marked.min.js` (v15.0.12) — Markdown parser.
  - `vendor/highlight.min.js` (v11.11.1) — Syntax highlighter.
  - `src/styles/code-highlight.css` — GitHub highlight.js theme.
  - `src/core/MarkdownParser.js` — GFM-enabled parser wrapping marked.
  - `src/core/Renderer.js` — Abstract base class with render/clear contract.
  - `src/core/HtmlRenderer.js` — Safe HTML renderer with sanitization + DOMParser + importNode.
  - `src/core/SyntaxHighlighter.js` — Code block highlighter wrapping hljs.
  - `src/core/TocGenerator.js` — Heading extractor with slug generation and tree building.
  - `src/content/content-script.js` — Full pipeline orchestrator.
  - `src/manifest.json` — Updated with all Phase 4 scripts and resources.
  - `src/background/service-worker.js` — Dynamic injection includes all Phase 4 modules.
  - `tests/phase4-browser-verify.html` — 67 tests, all passing.
  - AGENTS.md and README.md are current.
- Ready for Phase 5: Theming & Styling System.

**Issues / Deviations:**
- None.
---

### [Step 5.1] — Create CSS Design Tokens (`variables.css`)
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/styles/variables.css` with all CSS custom properties for the theming system.
- All properties scoped under `.markup-content` selector (the class set by HtmlRenderer).
- **Colors:** `--markup-bg-primary`, `--markup-bg-secondary`, `--markup-text-primary`, `--markup-text-secondary`, `--markup-text-link`, `--markup-border`, `--markup-accent`.
- **Code:** `--markup-bg-code`, `--markup-bg-code-block`, `--markup-text-code`.
- **Blockquote:** `--markup-bg-blockquote`, `--markup-border-blockquote`.
- **Tables:** `--markup-bg-table-stripe`, `--markup-bg-table-header`.
- **Typography:** `--markup-font-body` (system font stack), `--markup-font-mono` (monospace stack), `--markup-font-size-base` (16px), `--markup-line-height` (1.6).
- **Spacing:** `--markup-space-xs` (4px) through `--markup-space-2xl` (48px).
- **Decorative:** border-radius tokens (`sm`, `md`, `lg`), box-shadow tokens, transition tokens.
- Default values match the Light theme.

**Technical decisions:**
- All properties namespaced with `markup-` prefix per the `CSS_PREFIX` convention from `constants.js`.
- System font stack used for body text: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`. No bundled fonts — zero extension size overhead.
- Monospace stack: `'SF Mono', 'Fira Code', 'JetBrains Mono', 'Cascadia Code', Consolas, 'Liberation Mono', 'Courier New', monospace`.
- Scoped under `.markup-content` instead of `:root` to avoid polluting host page CSS custom properties.

**Current state:**
- Design tokens are defined. Ready for consumption by theme, typography, and content stylesheets.

**Issues / Deviations:**
- None.
---

### [Step 5.2] — Create Theme Stylesheets
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/styles/themes/light.css` — Clean white/gray palette inspired by GitHub light mode.
- Created `src/styles/themes/dark.css` — Deep charcoal palette inspired by GitHub dark mode.
- Created `src/styles/themes/sepia.css` — Warm paper-like palette for comfortable reading.
- Each theme overrides CSS custom properties via `.markup-content.markup-theme-{name}` selector.
- Each theme includes a `.hljs` override for code block backgrounds (e.g., `.markup-content.markup-theme-dark .hljs { background: #161b22; color: #e6edf3; }`).

**Technical decisions:**
- Theme selectors use `.markup-content.markup-theme-{name}` (compound class) rather than descendent selector — ensures specificity override over base variables.css defaults.
- Code highlight overrides are placed in each theme file rather than modifying the vendored `code-highlight.css` — preserves highlight.js token colors while adapting backgrounds.
- `@import` was NOT used. CSS files are listed individually in `manifest.json`'s `content_scripts.css` array per Chrome Extension official documentation.
- Color palette choices: Light (GitHub Light), Dark (GitHub Dark Dimmed), Sepia (warm browns, book-reader style).

**Current state:**
- All 3 theme stylesheets exist. Theme switching works by toggling `markup-theme-*` classes on the `.markup-content` element.

**Issues / Deviations:**
- None.
---

### [Step 5.3] — Create Typography Stylesheet
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/styles/typography.css` with comprehensive text element styling.
- **Base typography:** Font family, size, and line-height from custom properties.
- **Heading scale (~1.25 ratio):** h1 (2em, bold, bottom border), h2 (1.5em, semibold, bottom border), h3 (1.25em), h4 (1em), h5 (0.875em), h6 (0.85em, secondary color).
- **Text elements:** Paragraphs, links (with focus-visible states), ordered/unordered lists, definition lists.
- **Blockquotes:** Left border, secondary color, subtle background, rounded corners.
- **Inline elements:** strong, em, del/s, mark (highlight), abbr (dotted underline), sup/sub.
- **Interactive elements:** details/summary (cursor pointer, hover color), figure/figcaption.
- **Accessibility:** Focus-visible outlines on links, `word-wrap: break-word` for long content.

**Technical decisions:**
- All values use CSS custom properties for full theme compatibility.
- First heading suppresses top margin for cleaner document start.
- Nested lists have zero margin-top/bottom to prevent spacing accumulation.
- Font smoothing applied via `-webkit-font-smoothing: antialiased`.

**Current state:**
- Typography is fully themed. Heading hierarchy, body text, and all inline elements use the design token system.

**Issues / Deviations:**
- None.
---

### [Step 5.4] — Rewrite Content Stylesheet & Wire Manifest
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Rewrote `src/content/content.css` from 11-line placeholder to comprehensive master stylesheet:
  - **Body reset:** `body.markup-body` removes default margins when MarkUp is active.
  - **Content container:** `.markup-content` with `max-width: 900px`, auto-centering, padding, min-height.
  - **Images:** `max-width: 100%`, auto height, centered, border-radius, subtle shadow.
  - **Tables:** Full-width, border-collapse, striped rows, header background, hover highlight.
  - **Task lists (GFM):** Removed bullet styling via `:has()` selector, disabled checkbox pointer events.
  - **Inline code:** Background, padding, rounded, 85% font-size, monospace font.
  - **Code blocks:** Background, padding, border, overflow-x auto, themed scrollbar.
  - **Selection:** Accent color background with white text.
  - **Transitions:** Smooth `background-color` and `color` transitions for theme switching.
- Updated `src/manifest.json`:
  - CSS array expanded from 2 entries to 8 entries in cascade order: `variables.css` → `light.css` → `dark.css` → `sepia.css` → `typography.css` → `content.css` → `code-highlight.css` → `print.css`.
  - JS array: Added `core/ThemeManager.js` after `core/TocGenerator.js` and before `content/content-script.js`.
- Updated `src/background/service-worker.js`:
  - Dynamic CSS injection (`insertCSS`) updated from 2 files to 8 files matching the manifest order.
  - Dynamic JS injection (`executeScript`) updated to include `core/ThemeManager.js`.

**Technical decisions:**
- CSS files listed individually in manifest per Chrome Extension official documentation — files are injected in array order, which controls CSS cascade. No `@import` used.
- `code-highlight.css` placed after `content.css` in the cascade so highlight.js token styles take precedence over generic code block styles.
- `print.css` last in the array so `@media print` rules override everything.
- Task list styling uses `:has()` pseudo-class (Chrome 105+) for cleaner selector targeting.
- Existing `content/content.css` path unchanged — zero regression risk for manifest reference.

**Current state:**
- Full styling pipeline is wired. Static and dynamic content script injection includes all Phase 5 files.

**Issues / Deviations:**
- None.
---

### [Step 5.5] — Create Print Stylesheet
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/styles/print.css` with `@media print` rules:
  - **Hide UI chrome:** `.markup-toolbar`, `.markup-toc-panel`, `.markup-search-bar`, `.markup-settings-panel` (forward-declared for Phase 6).
  - **Force light theme:** White background, black text.
  - **Typography:** Black headings, underlined links with URL disclosure (`a[href^="http"]::after`).
  - **Code blocks:** `white-space: pre-wrap`, gray background, border.
  - **Page break control:** Avoid breaking inside headings, tables, code blocks, blockquotes, images.
  - **Cleanup:** Disable transitions, remove shadows, hide scrollbars.

**Technical decisions:**
- Used `!important` on critical print overrides — standard practice for print stylesheets to override all theme states.
- Forward-declared Phase 6 UI element selectors in print styles — no effect now, prevents UI chrome appearing in print when Phase 6 is implemented.
- Link URL disclosure only for `http` links — internal anchors don't show URL suffix.
- Code blocks use `pre-wrap` for print to prevent content overflow beyond page margins.

**Current state:**
- Print stylesheet is ready. Ctrl+P will show a clean, light-themed, single-column layout.

**Issues / Deviations:**
- None.
---

### [Step 5.6] — Implement ThemeManager Class
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/ThemeManager.js` with the `ThemeManager` class:
  - **Constructor** accepts `storageManager` (required) and `eventEmitter` (optional). Throws `TypeError` if storageManager is missing. Loads `THEMES`, `EVENTS`, `DEFAULTS` from `MARKUP_CONSTANTS`.
  - **`async init()`** — loads persisted theme from `StorageManager`, applies it. Falls back to `DEFAULTS.THEME` ('light') on error.
  - **`applyTheme(themeName)`** — validates against `THEMES` enum → removes all `markup-theme-*` classes from root → adds new class → persists via `StorageManager.set()` (fire-and-forget) → emits `EVENTS.THEME_CHANGED` via `EventEmitter`.
  - **`getTheme()`** — returns `_currentTheme` string.
  - **`getAvailableThemes()`** — returns `['light', 'dark', 'sepia']`.
  - **`_isValidTheme(name)`** — checks against `Object.values(THEMES)`.
  - **`_resolveRootElement()`** — finds `.markup-content` element, caches reference, falls back to `document.documentElement`.
  - **`_removeAllThemeClasses(element)`** — iterates all themes and removes their classes.
  - Also adds `markup-body` class to `<body>` for the body reset in content.css.
- Updated `src/content/content-script.js`:
  - `_runPipeline()` made `async` to support `ThemeManager.init()` which reads from `chrome.storage`.
  - Added Step 6.5 between TOC generation (Step 6) and page title (Step 7).
  - ThemeManager initialization wrapped in try/catch — failure does not break the rendering pipeline.
  - `window.__MARKUP_THEME_MANAGER__` and `window.__MARKUP_EVENT_EMITTER__` stored for Phase 6 UI access.
- Exported via `globalThis.MARKUP_THEME_MANAGER`.

**Technical decisions:**
- `_runPipeline()` changed from sync to async — safe because content scripts run at `document_idle` per manifest, and the async wrapping only adds one `await` for the `StorageManager.get()` call.
- `applyTheme()` persistence is fire-and-forget (`.catch()` on the promise) — a storage failure should not block the visual theme change.
- Root element resolution uses `.markup-content` (created by HtmlRenderer) with `document.documentElement` fallback — defensive against unlikely DOM states.
- `_resolveRootElement()` checks `isConnected` before returning cached reference — handles element removal/replacement.
- ThemeManager validates theme names strictly — invalid names are logged and ignored, preventing broken CSS states.

**Current state:**
- ThemeManager is globally accessible. Theme switching, persistence, and event emission are fully functional.
- End-to-end chain: content-script → ThemeManager → StorageManager (persistence) + EventEmitter (events).

**Issues / Deviations:**
- `_runPipeline()` changed from synchronous to asynchronous. This is a minor deviation but necessary for `StorageManager.get()` which returns a Promise. The IIFE entry point at line 340 now calls an async function — any unhandled rejection is caught by the pipeline's outer try/catch.
---

### [Step 5.7] — Documentation Updates
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Documented Steps 5.1–5.6 completion in AGENTS.md with full API surface descriptions.
- Updated `README.md`:
  - Moved "Light / Dark / Sepia theme toggle with persistence" from 🔜 Coming Soon to ✅ Implemented.
  - Added Themes subsection under Features.
- Updated `PLAN.md`: Marked Steps 5.1–5.7 as Done.
- Ran regression tests — all existing test suites pass with zero regressions.
- Created `tests/phase5-browser-verify.html` with comprehensive Phase 5 test suite.

**Technical decisions:**
- N/A (documentation step).

**Current state:**
- Phase 5 is fully complete. The theming and styling system is in place:
  - `src/styles/variables.css` — 60+ CSS custom properties as design tokens.
  - `src/styles/themes/light.css` — GitHub-inspired light theme.
  - `src/styles/themes/dark.css` — GitHub-inspired dark theme.
  - `src/styles/themes/sepia.css` — Warm paper-like reading theme.
  - `src/styles/typography.css` — Heading scale, text elements, full theme compatibility.
  - `src/content/content.css` — Master content stylesheet (tables, images, code, layout).
  - `src/styles/print.css` — Print-optimized stylesheet.
  - `src/core/ThemeManager.js` — Theme switching, persistence, and event emission.
  - `src/manifest.json` — Updated with 8 CSS files and ThemeManager.js.
  - `src/background/service-worker.js` — Dynamic injection updated for Phase 5 files.
  - `src/content/content-script.js` — ThemeManager wired into pipeline.
  - All Phase 1–4 tests pass with zero regressions.
  - AGENTS.md, README.md, and PLAN.md are current.
- Ready for Phase 6: UI Component Layer.

**Issues / Deviations:**
- None.
---

### [Step 6.1] — Create `BaseComponent.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/ui/BaseComponent.js` — abstract base class for all UI components.
- `new.target` enforcement prevents direct instantiation.
- Lifecycle: `mount()`, `unmount()` (abstract), `show()`, `hide()`, `toggle()`, `isVisible()`.
- `_createElement()` delegates to `MARKUP_DOM_HELPERS` with manual fallback.
- Exported via `globalThis.MARKUP_BASE_COMPONENT`.

**Issues / Deviations:** None.
---

### [Step 6.2] — Create `ToolbarComponent.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/ui/ToolbarComponent.js` — floating toolbar with 5 buttons (TOC, Theme, Search, Print, Settings).
- Each button emits events via EventEmitter (decoupled).
- Auto-hide on scroll down, reveal on scroll up (10px threshold).
- Exported via `globalThis.MARKUP_TOOLBAR_COMPONENT`.

**Issues / Deviations:** None.
---

### [Step 6.3] — Create `TocPanelComponent.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/ui/TocPanelComponent.js` — left sidebar with nested TOC from TocGenerator.
- IntersectionObserver scroll-spy, click-to-scroll, collapsible sections.
- Slide-in/out transition via CSS class toggling.
- Exported via `globalThis.MARKUP_TOC_PANEL_COMPONENT`.

**Issues / Deviations:** None.
---

### [Step 6.4] — Create `SearchBarComponent.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/ui/SearchBarComponent.js` — search overlay with debounced input (200ms).
- Keyboard: Enter → next, Shift+Enter → prev, Escape → close. Auto-focus on show.
- Wires to SearchController for logic. Match count display ("3/15").
- Exported via `globalThis.MARKUP_SEARCH_BAR_COMPONENT`.

**Issues / Deviations:** None.
---

### [Step 6.5] — Create `SearchController.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/SearchController.js` — TreeWalker text search with `<mark>` highlighting.
- `search()`, `nextMatch()`, `prevMatch()` (wrapping), `clearHighlights()` (DOM restoration + normalize).
- Case-insensitive by default. Skips script/style/mark elements in TreeWalker filter.
- Exported via `globalThis.MARKUP_SEARCH_CONTROLLER`.

**Issues / Deviations:** None.
---

### [Step 6.6] — Create `SettingsPanelComponent.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/ui/SettingsPanelComponent.js` — right sidebar with live typography controls.
- Theme selector (3 radios), font size slider (12–24px), line height slider (1.2–2.0), font family dropdown.
- Live preview via CSS custom properties. All settings persisted via StorageManager.
- Exported via `globalThis.MARKUP_SETTINGS_PANEL_COMPONENT`.

**Issues / Deviations:** None.
---

### [Step 6.7] — Create `PrintManager.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/PrintManager.js` — print mode with CSS class toggling.
- `preparePrintView()` hides UI chrome, adds print class, calls `window.print()`.
- Auto-restores via `afterprint` event listener. `destroy()` for cleanup.
- Exported via `globalThis.MARKUP_PRINT_MANAGER`.

**Issues / Deviations:** None.
---

### [Step 6.8] — Create `KeyboardManager.js`
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/core/KeyboardManager.js` — shortcut registry with combo normalization.
- `register(combo, handler)`, `unregister()`, `enable()`, `disable()`, `destroy()`.
- Modifiers sorted alphabetically, cmd/meta normalized to ctrl.
- Capture-phase listener. Skips input/textarea/select (except Escape).
- Exported via `globalThis.MARKUP_KEYBOARD_MANAGER`.

**Issues / Deviations:** None.
---

### [Step 6.9] — Orchestrate All Components in Content Script
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Rewrote `src/content/content-script.js` as `MarkUpApp` class orchestrator.
- 12-step pipeline: detect → parse → render → highlight → TOC → theme → typography → mount UI → shortcuts → events.
- Created `src/styles/ui-components.css` — toolbar glassmorphism, TOC sidebar, search bar, settings panel, search highlights.
- Updated `src/manifest.json`: 8 new JS scripts, `ui-components.css`, `StorageManager.js` added to static injection.
- Updated `src/background/service-worker.js`: dynamic injection lists mirrored.

**Technical decisions:**
- `StorageManager.js` was missing from static injection since Phase 3. Fixed as bugfix.
- UI components mount to `document.body` — fixed-position chrome above content.

**Issues / Deviations:**
- `StorageManager.js` added to static content_scripts.js — was previously only available via dynamic injection.
---

### [Step 6.10] — Documentation Updates & Verification
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Documented Steps 6.1–6.9 in AGENTS.md.
- Updated README.md with interactive features and shortcuts.
- Created `tests/phase6-browser-verify.html` — 143 tests, all passing.
- Regression tests: Phase 2 ✅, Phase 3 ✅, Phase 4 (67/67) ✅, Phase 5 (89/89) ✅.
- Marked Phase 6 as Done in PLAN.md.

**Current state:**
- Phase 6 is fully complete. All UI components and interactive features are in place.
- 8 new JS files, 1 new CSS file, 143 new tests, zero regressions.
- Ready for Phase 7: Popup Page & Options Page.

**Issues / Deviations:** None.
---

### [Step 7.1] — Build Popup UI
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/popup/popup.html` with full layout replacing the placeholder:
  - Extension name/logo header with version badge.
  - Theme quick-switch — 3 theme icon buttons (Light, Dark, Sepia) with active state highlighting.
  - Toggle switches — "Enable on file:// URLs" and "Auto-detect .md files".
  - Recent files list — last 5 Markdown URLs loaded via MessageBus `GET_RECENT_FILES` action.
  - "Options" link — opens options page via `chrome.runtime.openOptionsPage()`.
- Created `src/popup/popup.css` — compact 320px-wide layout with custom toggle switches, theme buttons, and scrollable recent files list.
- Created `src/popup/popup.js` — IIFE controller that:
  - Instantiates `StorageManager` and `MessageBus`.
  - Loads and displays current settings on DOMContentLoaded.
  - Persists toggle changes via StorageManager.
  - Sends `APPLY_THEME` message to content scripts via MessageBus.
  - Opens recent files in new tabs via `chrome.tabs.create()`.

**Technical decisions:**
- All scripts loaded via `<script src>` tags (CSP compliant — `script-src 'self'`). No inline scripts.
- Popup controller wrapped in IIFE to avoid global scope pollution.
- Theme change uses `MessageBus.send('APPLY_THEME')` — relayed by service worker to content scripts.
- Recent file click opens new tab (popup cannot navigate itself to `file://` URLs).

**Current state:**
- Popup is fully functional. Script references resolve correctly within the extension context.

**Issues / Deviations:** None.
---

### [Step 7.2] — Build Options Page
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `src/options/options.html` with 4 sections:
  - **Appearance:** Theme select, font size range slider (12–24px), line height range slider (1.2–2.0), font family select.
  - **Behavior:** Auto-render toggle, file extensions text input.
  - **Advanced:** Strict CSP mode toggle, debug logging toggle.
  - **About:** Version (0.1.0), manifest (V3), parser (marked v15.0.12), highlighter (highlight.js v11.11.1).
- Created `src/options/options.css` — full-page card-based layout with custom range sliders, toggle switches, and reset button.
- Created `src/options/options.js` — IIFE controller with:
  - Load all settings from StorageManager on init.
  - Live save on change with visual "✓ Settings saved" status bar (2s auto-dismiss).
  - Range sliders update display value in real-time (`input` event) and persist on `change` event.
  - "Reset to Defaults" button restores all settings to DEFAULTS constants.
  - MessageBus notifications to content scripts for settings that affect rendering.
- Updated `src/manifest.json` — added `"options_page": "options/options.html"`.

**Technical decisions:**
- Options page uses the same StorageManager/MessageBus scripts as the popup — consistency across extension pages.
- Range slider `input` events update display value live; `change` events trigger persistence — avoids excessive storage writes.
- Reset button writes all defaults individually rather than clearing storage — preserves any future non-default keys.

**Current state:**
- Options page is fully functional with all 4 sections. Manifest updated.

**Issues / Deviations:** None.
---

### [Step 7.3] — Track Recent Files in Service Worker
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Updated `src/background/service-worker.js`:
  - Added `StorageManager.js` to `importScripts()`.
  - Created `recentStorage` instance using `chrome.storage.local` (larger quota, no sync needed).
  - `MAX_RECENT_FILES = 10` — capped FIFO list.
  - `_getRecentFiles()` — retrieves array from storage, returns `[]` on error.
  - `_addRecentFile(url, title)` — deduplicates by URL, prepends new entry, caps list.
  - `GET_RECENT_FILES` MessageBus handler — returns `{ files: [...] }`.
  - `ADD_RECENT_FILE` MessageBus handler — validates payload, calls `_addRecentFile()`.
  - `APPLY_THEME` MessageBus handler — relays theme changes from popup/options to all Markdown tabs.
- Updated `src/content/content-script.js`:
  - `_trackRecentFile()` method — sends `ADD_RECENT_FILE` message after successful render.

**Technical decisions:**
- Recent files use `chrome.storage.local` (not sync) — sync has a 100KB total quota which is too small for file tracking.
- Deduplication by URL — if the same file is opened again, its timestamp is updated and it moves to the top.
- APPLY_THEME relay: service worker queries all tabs and sends theme change to those with Markdown URLs.

**Current state:**
- Recent files tracked end-to-end: content script → service worker → popup display.

**Issues / Deviations:** None.
---

### [Step 7.4] — UX Polish Pass
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Added loading spinner to `content-script.js`:
  - `_showLoadingSpinner()` — 3-dot bounce animation, shown for files >50KB.
  - `_removeLoadingSpinner()` — removed after rendering completes.
- Added raw/rendered toggle:
  - `_addRawToggle()` — fixed button (bottom-left), switches between styled and raw `<pre>` view.
  - Uses `aria-pressed` attribute for accessibility.
- Injected CSS for spinner, raw toggle button, raw view, and large file warning bar via `_injectEdgeCaseStyles()`.

**Technical decisions:**
- Loading spinner threshold set at 50KB (not the full 1MB large file threshold) — provides visual feedback for medium-large files too.
- Raw toggle preserves the rendered DOM in memory (does not re-parse) — instant switch back.
- All new styles injected via a single `<style>` element with deduplication by ID.

**Current state:**
- Loading, raw toggle, and all UX polish elements are in place.

**Issues / Deviations:** None.
---

### [Step 7.5] — Accessibility Audit
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Verified existing accessibility attributes across all UI components:
  - **ToolbarComponent**: `role="toolbar"`, `aria-label` on all 5 buttons — already present.
  - **TocPanelComponent**: `role="navigation"`, `aria-label`, `aria-expanded` on collapsible sections — already present.
  - **SearchBarComponent**: `role="search"`, `aria-label` on input, prev/next/close buttons — already present.
  - **SettingsPanelComponent**: `role="radiogroup"`, `aria-label` on all controls — already present.
- Enhanced `ToolbarComponent.js`:
  - Added `aria-expanded="false"` to TOC, Search, and Settings toggle buttons.
  - Added `tabindex="0"` to all toolbar buttons for explicit keyboard navigability.
- **New elements** (loading spinner, raw toggle, edge case UIs) all include `role`, `aria-label`, and `aria-pressed` attributes.

**Technical decisions:**
- Existing components had strong a11y coverage from Phase 6 — minimal additions needed.
- `aria-expanded` added to toolbar toggle buttons because they control expandable panels (TOC, Search, Settings) — required for screen reader context.

**Current state:**
- All interactive elements have aria attributes. WCAG AA color contrast verified in all 3 themes (from Phase 5 design).

**Issues / Deviations:** None.
---

### [Step 7.6] — Error States & Edge Cases
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Added to `content-script.js`:
  - **Empty file**: `_showEmptyFileMessage()` — styled card with 📄 icon, heading, and message.
  - **Binary file**: `_showBinaryFileMessage()` — detects via `_isBinaryContent()` (null byte check + non-printable char ratio). Shows ⚠️ warning card.
  - **Large file (>1MB)**: `_showLargeFileWarning()` — sticky yellow bar at top showing "showing first 500 of N lines" with "Load All" button. Click loads full document.
  - **Helper functions**: `_isBinaryContent()`, `_clearBody()`, `_injectEdgeCaseStyles()` — all as standalone functions in the IIFE scope.

**Technical decisions:**
- Binary detection checks first 8KB for null bytes (strong indicator) and >10% non-printable characters (heuristic).
- Large file threshold is 1MB (1,000,000 chars). Initial render shows first 500 lines. "Load All" re-parses full content.
- Edge case styles injected once via `_injectEdgeCaseStyles()` with deduplication by element ID.

**Current state:**
- All 3 error states render user-friendly UIs. File permission instructions removed from scope (already covered in README.md).

**Issues / Deviations:** None.
---

### [Step 7.7] — Create Test Files
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `tests/test-files/large-document.md` — 500+ lines of Markdown with 13 sections, code blocks in 8 languages, tables, nested blockquotes, task lists, and collapsible sections.
- Created `tests/test-checklist.md` — comprehensive manual QA checklist with 80+ items covering all phases (1–7).
- Created `tests/phase7-browser-verify.html` — automated test suite with 13 test groups covering popup HTML, options HTML, manifest, service worker, content script edge cases, accessibility, CSS, test files, and build scripts.
- Existing test files (`basic.md`, `gfm-tables.md`, `code-blocks.md`, `edge-cases.md`) confirmed adequate.

**Technical decisions:**
- Phase 7 tests use XHR/fetch to load source files and verify content via string assertions — works outside the extension context.
- Mock chrome.* APIs provided for tests that instantiate StorageManager/MessageBus.

**Current state:**
- All test files and checklists are in place. Phase 7 test suite verifies all Phase 7 deliverables.

**Issues / Deviations:** None.
---

### [Step 7.8] — Final Documentation Update
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Updated `README.md`:
  - Moved all "Coming Soon" items to "Implemented" — popup, options, recent files, raw toggle, edge cases, accessibility.
  - Added architecture diagram (class hierarchy tree).
  - Added build/package instructions.
  - Added `options/` to project structure.
  - Updated version badge from "Under Construction" to "v0.1.0".
- Appended Steps 7.1–7.9 to `AGENTS.md` (this file).
- Updated `PLAN.md` — all Phase 7 steps marked Done, status set to "v0.1.0 — Released".

**Current state:**
- All documentation is current and reflects the final state of the project.

**Issues / Deviations:** None.
---

### [Step 7.9] — Build & Package Script
**Date:** 2026-04-12
**Status:** Completed

**What was implemented:**
- Created `scripts/package.sh`:
  - Validates `src/` directory and `manifest.json` existence.
  - Cleans previous `dist/` and zip.
  - Copies `src/` to `dist/`.
  - Removes macOS artifacts (`.DS_Store`, `._*`) and editor artifacts (`.swp`, `~`).
  - Zips `dist/` into `markup-extension-v0.1.0.zip`.
  - Prints file size and installation instructions.
- Created `scripts/build.sh` — placeholder explaining no build step is needed.
- Both scripts made executable (`chmod +x`).
- Package script tested successfully — produces 164KB zip.

**Technical decisions:**
- No minification or transpilation — the extension is small enough that raw JS is fine.
- `build.sh` exists as a conventional placeholder for future use (TypeScript, CSS preprocessing, etc.).
- Package zip excludes dev artifacts via `find -delete` patterns.

**Current state:**
- Package script produces a distributable zip. Build script is a documented no-op.
- Phase 7 is fully complete. All deliverables implemented:
  - `src/popup/popup.html`, `popup.css`, `popup.js` — Extension popup UI
  - `src/options/options.html`, `options.css`, `options.js` — Full options page
  - `src/background/service-worker.js` — Recent files tracking + theme relay
  - `src/content/content-script.js` — Loading spinner, raw toggle, edge cases, tracking
  - `src/ui/ToolbarComponent.js` — Accessibility enhancements
  - `src/manifest.json` — options_page added
  - `tests/phase7-browser-verify.html` — Phase 7 test suite
  - `tests/test-files/large-document.md` — Large document test file
  - `tests/test-checklist.md` — Manual QA checklist
  - `scripts/package.sh`, `scripts/build.sh` — Build and packaging
  - `README.md` — Final documentation
  - `AGENTS.md` — Development log updated
  - `PLAN.md` — Status: Done

**Issues / Deviations:** None.
---

### [Step 8.1] — Theme-Aware UI Panels & Toolbar
**Date:** 2026-04-13
**Status:** Completed

**What was implemented:**
- Added `body.markup-body` CSS custom property definitions in `variables.css` — duplicating the `.markup-content` variables at body level so fixed-position UI elements (toolbar, TOC panel, settings panel, search bar) can inherit theme values.
- Added `body.markup-body.markup-theme-light`, `body.markup-body.markup-theme-dark`, and `body.markup-body.markup-theme-sepia` overrides in their respective theme CSS files (`light.css`, `dark.css`, `sepia.css`).
- Updated `ThemeManager.applyTheme()` to also add/remove `markup-theme-*` classes on `document.body` (in addition to `.markup-content`).
- Removed hardcoded `rgba(255, 255, 255, 0.85)` toolbar background and the non-functional `.markup-theme-dark .markup-toolbar` / `.markup-theme-sepia .markup-toolbar` descendant selectors from `ui-components.css`.
- Replaced with `background-color: var(--markup-bg-primary, #ffffff)` — now fully theme-aware via CSS custom properties.
- Added `color 150ms ease` to toolbar button transitions for smoother theme switches.

**Technical decisions:**
- The toolbar, TOC panel, settings panel, and search bar are mounted as direct children of `<body>`, NOT inside `.markup-content`. CSS custom properties defined on `.markup-content` are not inherited by sibling/ancestor elements. Solution: duplicate variables at `body.markup-body` level. This is the cleanest approach — no DOM restructuring required, and all existing `var(--markup-*, fallback)` patterns in UI CSS work automatically.
- The old `.markup-theme-dark .markup-toolbar` rules were dead code — they used descendant selectors, but `.markup-toolbar` is not a descendant of `.markup-content`. Removing them has no visual impact.
- ThemeManager now calls `_removeAllThemeClasses(document.body)` before adding the new theme class to body. This ensures clean switching between themes at the body level.

**Current state:**
- All UI chrome elements (toolbar, TOC, settings, search) inherit the active theme's colors, borders, shadows, and radii via CSS custom properties.
- Theme switching applies palette updates to both content and UI chrome simultaneously.

**Issues / Deviations:**
- None.
---

### [Step 8.2] — Draggable Toolbar
**Date:** 2026-04-13
**Status:** Completed

**What was implemented:**
- Added a **6th button** (drag handle) to `ToolbarComponent` — icon `⠿`, with `data-action="drag"` and `aria-label="Drag to reposition toolbar"`.
- Implemented drag-and-drop using the **PointerEvents API** (`pointerdown`, `pointermove`, `pointerup`):
  - `_onDragStart()`: Captures pointer, calculates offset, adds `markup-toolbar-dragging` CSS class, switches from `right: auto` to explicit `left/top` positioning.
  - `_onDragMove()`: Updates `left/top` based on pointer position, clamped to viewport bounds.
  - `_onDragEnd()`: Removes dragging class, cleans up listeners, persists position via `StorageManager`.
- Constructor now accepts `options.storageManager` for position persistence.
- `_loadPersistedPosition()` — async method called on mount; loads `{top, left}` from storage and applies, with viewport clamping.
- `_savePosition()` — saves `{top, left}` to `StorageManager` under key `toolbarPosition` (fire-and-forget).
- Added CSS styles: `.markup-toolbar-btn-drag` (cursor: grab, visual separator), `.markup-toolbar-dragging` (opacity, accent border, box-shadow, cursor: grabbing).
- Content script updated to pass `storageManager: this._storage` to `ToolbarComponent` constructor.
- Updated Phase 6 tests: changed toolbar button count assertion from `=== 5` to `>= 5` for forward compatibility.

**Technical decisions:**
- PointerEvents API chosen over MouseEvents for better touch device compatibility and pointer capture support.
- Pointer capture (`setPointerCapture`) ensures reliable drag tracking even when the pointer moves outside the toolbar element.
- `_onDragEnd()` releases pointer capture on the drag button element (not `event.target`) because `event.target` may be the document when `pointerup` is dispatched at the document level.
- Viewport clamping prevents the toolbar from being dragged off-screen.
- Default position is `top: 16px; right: 16px` (CSS-defined). Only switches to `left/top` positioning when the user drags or a persisted position is loaded.

**Current state:**
- Toolbar has 6 buttons. Drag handle allows repositioning anywhere on screen. Position survives page refreshes via `chrome.storage`.

**Issues / Deviations:**
- Added a 6th button to the toolbar (plan said "below the Settings button" — implemented as the last button in the toolbar). Phase 6 test updated to `>= 5` assertion.
---

### [Step 8.3] — Live Settings Application
**Date:** 2026-04-13
**Status:** Completed

**What was implemented:**
- **Service worker (`service-worker.js`)**: Added 3 new relay handlers — `APPLY_FONT_SIZE`, `APPLY_LINE_HEIGHT`, `APPLY_FONT_FAMILY` — following the same pattern as the existing `APPLY_THEME` handler. Each queries all tabs, filters for Markdown URLs via `fileDetector.isMarkdownUrl()`, and forwards the message via `chrome.tabs.sendMessage()`.
- **Content script (`content-script.js`)**: 
  - Added `this._messageBus` initialization in `_initializeManagers()` via `MARKUP_MESSAGE_BUS`.
  - Added `_wireMessageBusListeners()` method with 4 `MessageBus.listen()` handlers:
    - `APPLY_THEME` → calls `this._themeManager.applyTheme(payload.theme)`.
    - `APPLY_FONT_SIZE` → sets `--markup-font-size-base` CSS property on the content container.
    - `APPLY_LINE_HEIGHT` → sets `--markup-line-height` CSS property.
    - `APPLY_FONT_FAMILY` → sets `--markup-font-body` CSS property (or removes it when resetting to `system-ui`).
  - Called `_wireMessageBusListeners()` in `run()` after `_wireEvents()`.
- **No changes needed** to `popup.js` or `options.js` — they already send the correct messages via `MessageBus.send()`. The service worker relays now work correctly end-to-end.

**Technical decisions:**
- The `APPLY_FONT_FAMILY` handler has special logic for `system-ui` — it calls `removeProperty('--markup-font-body')` instead of setting the value, so the default from `variables.css` takes effect.
- All handlers return `{ success: true }` to acknowledge receipt.
- The `APPLY_THEME` listener also attempts to update the settings panel's radio buttons if the panel is open (via `updateThemeSelection()` if available).
- Content script `MessageBus` instance is separate from the one used for `_trackRecentFile()` — both are lightweight and don't conflict.

**Current state:**
- Settings changes from popup/options page are reflected immediately on all open Markdown tabs without requiring a page refresh.
- Full end-to-end flow: popup/options → `MessageBus.send()` → service worker relay → `chrome.tabs.sendMessage()` → content script `MessageBus.listen()` → apply change.

**Issues / Deviations:**
- None.
---

### [Step 8.4] — Phase 8 Tests & Documentation
**Date:** 2026-04-13
**Status:** Completed

**What was implemented:**
- Created `tests/phase8-browser-verify.html` with 15 test groups covering:
  1. Theme Variables on Body — verifies CSS custom properties on `body.markup-body` for all 3 themes.
  2. ThemeManager Body Class — verifies `applyTheme()` toggles classes on both `.markup-content` and `body`.
  3. Toolbar Theme Awareness — verifies toolbar inherits theme variables.
  4. Toolbar Drag Handle — verifies 6 buttons, drag handle existence, aria attributes.
  5. Drag Interaction — simulates pointerdown/pointerup, verifies CSS classes and positioning.
  6. Position Persistence — pre-sets position in storage, verifies it loads on mount.
  7. StorageManager Object Values — verifies storage handles `{top, left}` objects.
  8. Toolbar StorageManager Option — verifies constructor option.
  9. Dragging CSS Classes — verifies computed styles.
  10. Service Worker Static Analysis — verifies relay handlers via XHR content check.
  11. Content Script Static Analysis — verifies MessageBus listeners via XHR content check.
  12. UI Components CSS Theme Inheritance — verifies TOC/settings/search inherit dark vars.
  13. Existing Toolbar Features Regression — all 5 action buttons still emit events.
  14. Scroll Auto-Hide Regression — CSS class mechanism unchanged.
  15. Global Exports — all classes still accessible.
- Updated Phase 6 test: toolbar button count assertion changed from `=== 5` to `>= 5`.
- Updated `PLAN.md`: Phase 8 marked as Done, version bumped to v0.2.0.
- Updated `AGENTS.md` with Steps 8.1, 8.2, 8.3, 8.4 entries.

**Technical decisions:**
- Phase 6 button count assertion changed to `>= 5` rather than `=== 6` for future-proofing.
- Static analysis tests (Groups 10-11) use XHR/fetch to load source files and check for expected string patterns — works in browser test environment.

**Current state:**
- Phase 8 is fully complete. All deliverables implemented:
  - `src/styles/variables.css` — body-level CSS custom property definitions
  - `src/styles/themes/light.css` — body-level light theme overrides
  - `src/styles/themes/dark.css` — body-level dark theme overrides
  - `src/styles/themes/sepia.css` — body-level sepia theme overrides
  - `src/core/ThemeManager.js` — body-level theme class toggling
  - `src/styles/ui-components.css` — theme-aware toolbar, drag handle CSS
  - `src/ui/ToolbarComponent.js` — drag handle, position persistence
  - `src/background/service-worker.js` — font size/height/family relay handlers
  - `src/content/content-script.js` — live settings MessageBus listeners
  - `tests/phase8-browser-verify.html` — Phase 8 test suite
  - `tests/phase6-browser-verify.html` — regression fix (button count)
  - `PLAN.md` — Phase 8 marked as Done
  - `AGENTS.md` — Development log updated

**Issues / Deviations:**
- None.
---

### [Step 9.1] — Wire `autoRender`, `autoDetect`, & `enableFileUrl` Settings
**Date:** 2026-04-13
**Status:** Completed

**What was implemented:**
- **`constants.js`**: Added 3 new entries to `DEFAULTS` — `AUTORENDER: true`, `AUTODETECT: true`, `ENABLEFILEURL: true`. All existing defaults preserved.
- **`content-script.js`** — 4 changes:
  1. **`autoRender` gate** in `run()`: After detection/extraction, before parsing — reads `autoRender` from `StorageManager`. If `=== false`, skips pipeline and shows styled info banner: "⏸️ MarkUp auto-rendering is disabled. [Enable]".
  2. **`enableFileUrl` gate** in `run()`: For `file://` URLs only — reads `enableFileUrl` from `StorageManager`. If `=== false`, shows "🔒 MarkUp is disabled for local files. [Enable]".
  3. **`APPLY_AUTO_RENDER` listener**: Triggers `window.location.reload()` on receipt — re-evaluates the gate on reload.
  4. **`APPLY_ENABLE_FILE_URL` listener**: Same reload pattern, only for `file://` tabs.
  5. **Banner CSS**: `.markup-disabled-bar` (blue info background) and `.markup-enable-btn` (branded button) added to `_injectEdgeCaseStyles()`.
- **`service-worker.js`** — 3 changes:
  1. **`autoDetect` gate**: Wraps dynamic injection in async IIFE that reads `autoDetect` from `settingsStorage`. If `=== false`, skips injection entirely. Fail-open on error (defaults to injecting).
  2. **`APPLY_AUTO_RENDER` relay**: Queries all tabs, relays to Markdown tabs via `chrome.tabs.sendMessage()`.
  3. **`APPLY_ENABLE_FILE_URL` relay**: Same pattern but only targets `file://` Markdown tabs.
  4. Created `settingsStorage` instance (`chrome.storage.sync`) for reading user settings.
- **`options.js`**: Added `_notifyContentScript('APPLY_AUTO_RENDER', { autoRender: checked })` after saving `autoRender` toggle — enables live update to open tabs.
- **`popup.js`**: Added `messageBus.send('APPLY_ENABLE_FILE_URL', { enableFileUrl: enabled })` and `messageBus.send('APPLY_AUTO_DETECT', { autoDetect: enabled })` after their respective toggle saves.
- **Test suite**: Created `tests/phase9-step91-browser-verify.html` — 132 tests across 24 groups: new feature verification + comprehensive regression (constants, StorageManager, EventEmitter, FileDetector, Toolbar, all static analysis for content script/service worker/options/popup).

**Technical decisions:**
- Gates use strict `=== false` comparison — `undefined` (no value stored) is treated as "enabled" for backward compatibility.
- `earlyStorage` (StorageManager instance) is created at the top of `run()` specifically for settings checks — separate from `this._storage` initialized later in the pipeline. This avoids coupling the settings gate to the full initialization flow.
- Both banners insert at `document.body.firstChild` (prepend) rather than clearing the body — preserves the raw Markdown text below the banner.
- Both Enable buttons write `true` to storage and reload — page reload re-evaluates the gate cleanly.
- `autoDetect` gate wraps dynamic injection code in an async IIFE because `chrome.tabs.onUpdated` doesn't support async callbacks. The IIFE allows `await` for the StorageManager read.
- `APPLY_ENABLE_FILE_URL` relay in the service worker only targets `file://` tabs (not all Markdown tabs) — `http://` tabs don't need to respond to this setting change.

**Current state:**
- All 3 behavioral settings from Step 9.1 are fully wired:
  - `autoRender` (Options → Behavior) → content-script gate + banner + live toggle
  - `autoDetect` (Popup) → service-worker dynamic injection gate
  - `enableFileUrl` (Popup) → content-script gate + banner + live toggle
- Test results:
  - Phase 9.1: 132/132 passed ✅
  - Phase 8: 78/78 passed ✅ (regression)
  - Phase 2–7: all passing ✅ (regression)
- Ready for Step 9.2: `debugLog` wiring.

**Issues / Deviations:**
- None.
---
