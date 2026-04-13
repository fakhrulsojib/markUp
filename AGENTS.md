# AGENTS.md — MarkUp Development Log

> **Purpose:** Compact audit trail of every implementation phase. Future agents should read this **before** implementing any PLAN.md step to understand existing architecture, conventions, and deviations.

---

## Quick Reference

| Phase | Status | Date | Summary |
|-------|--------|------|---------|
| 1 | ✅ Done | 2026-04-12 | Project scaffolding, manifest, icons, skeletons |
| 2 | ✅ Done | 2026-04-12 | Core utilities: constants, DOM helpers, sanitizer, EventEmitter |
| 3 | ✅ Done | 2026-04-12 | Storage, messaging, file detection, service worker wiring |
| 4 | ✅ Done | 2026-04-12 | Markdown parsing & rendering pipeline (marked + hljs) |
| 5 | ✅ Done | 2026-04-12 | CSS design tokens, 3 themes, typography, print, ThemeManager |
| 6 | ✅ Done | 2026-04-12 | UI components: toolbar, TOC, search, settings, keyboard, print |
| 7 | ✅ Done | 2026-04-12 | Popup, options page, recent files, UX polish, a11y, packaging |
| 8 | ✅ Done | 2026-04-13 | Theme-aware UI, draggable toolbar, live settings relay |
| 9 | ✅ Done | 2026-04-13 | Settings backend wiring (enabled, debugLog, extensions, cspStrict) |

---

## Architecture at a Glance

```
Extension Root: src/

Content Script Pipeline (content-script.js → MarkUpApp class):
  detect → extract → parse(marked) → render(HtmlRenderer+Sanitizer)
  → highlight(hljs) → TOC(TocGenerator) → theme(ThemeManager)
  → mount UI(Toolbar, TOC Panel, Search, Settings) → keyboard shortcuts

Service Worker (service-worker.js):
  importScripts → FileDetector + MessageBus + StorageManager + Logger
  → tabs.onUpdated (dynamic injection, gated by `enabled` setting)
  → MessageBus relays (theme, font, extensions, cspStrict, etc.)

Communication:  popup/options → MessageBus.send() → service-worker relay
                → chrome.tabs.sendMessage() → content-script MessageBus.listen()

Global Exports:  All modules export via globalThis.MARKUP_* (classic scripts, no ES modules in content scripts)
```

---

## Conventions & Patterns

| Convention | Detail |
|-----------|--------|
| **No `innerHTML`** | All DOM via `createElement()` + `Sanitizer` for parsed HTML |
| **No `eval`/`new Function`** | MV3 CSP compliant throughout |
| **CSS namespace** | All classes prefixed `markup-` (from `CSS_PREFIX` constant) |
| **Storage namespace** | All keys prefixed `markup_` (from `StorageManager._prefixKey()`) |
| **Error handling** | All `chrome.*` calls wrapped in try/catch + `lastError` checks |
| **Private members** | Prefixed with `_` |
| **File naming** | PascalCase matching class name (e.g., `ThemeManager.js`) |
| **Constants** | SCREAMING_SNAKE_CASE, `Object.freeze()`-d |
| **Logger** | `Logger.debug()` for verbose output (gated by `debugLog` setting), `Logger.warn()`/`Logger.error()` always output |
| **Test suites** | `tests/phase{N}-browser-verify.html` — browser-runnable, mock chrome APIs |

---

## Settings Model (Final)

| Setting | Storage Key | Default | Location | Consumer |
|---------|-------------|---------|----------|----------|
| Enable MarkUp | `enabled` | `true` | Popup + Options | content-script (render gate) + service-worker (injection gate) |
| Theme | `theme` | `'light'` | Popup + Options + In-page | ThemeManager |
| Font Size | `fontSize` | `16` | Options + In-page | CSS `--markup-font-size-base` |
| Line Height | `lineHeight` | `1.6` | Options + In-page | CSS `--markup-line-height` |
| Font Family | `fontFamily` | `'system-ui'` | Options + In-page | CSS `--markup-font-body` |
| Custom Extensions | `extensions` | `'.md, .markdown, .mdown, .mkd, .mdx'` | Options | FileDetector.setCustomExtensions() |
| Strict CSP Mode | `cspStrict` | `false` | Options | Sanitizer strict config → re-render |
| Debug Logging | `debugLog` | `false` | Options | Logger._enabled flag |

### MessageBus Actions (Settings Relay)

| Action | Sender | Handler |
|--------|--------|---------|
| `APPLY_ENABLED` | Popup/Options | SW relay → content-script reload |
| `APPLY_THEME` | Popup/Options/In-page | SW relay → ThemeManager.applyTheme() |
| `APPLY_FONT_SIZE` | Options/In-page | SW relay → CSS custom property |
| `APPLY_LINE_HEIGHT` | Options/In-page | SW relay → CSS custom property |
| `APPLY_FONT_FAMILY` | Options/In-page | SW relay → CSS custom property |
| `APPLY_EXTENSIONS` | Options | SW relay → FileDetector + broadcast all tabs |
| `APPLY_CSP_STRICT` | Options | SW relay → _reRender() with new sanitizer config |
| `APPLY_DEBUG_LOG` | Options | SW relay → Logger.setEnabled() |

---

## Phase 1 — Project Scaffolding & Infrastructure
**Steps 1.1–1.6 · All Completed**

### Files Created
| File | Purpose |
|------|---------|
| `src/manifest.json` | MV3 manifest — permissions: `activeTab`, `storage`, `scripting`, `tabs` |
| `src/background/service-worker.js` | Skeleton with `onInstalled` + `onMessage` listeners |
| `src/content/content-script.js` | Skeleton with injection proof |
| `src/content/content.css` | Empty placeholder |
| `src/popup/popup.html` | Minimal placeholder (required by manifest `default_popup`) |
| `assets/icons/icon-{16,32,48,128}.png` | Custom "M" icon, blue-to-violet gradient |
| `src/icons/icon-{16,32,48,128}.png` | Copies for extension runtime |

### Key Decisions
- **Extension root = `src/`** — Chrome cannot reference files outside extension root, so icons and vendor files are copied into `src/`.
- Content scripts `run_at: document_idle`.
- `popup.html` added ahead of Phase 7 schedule to satisfy manifest validation.

---

## Phase 2 — Core Utility & Foundation Classes
**Steps 2.1–2.5 · All Completed**

### Files Created
| File | Export | API Surface |
|------|--------|-------------|
| `src/utils/constants.js` | `MARKUP_CONSTANTS` | `THEMES`, `STORAGE_KEYS`, `EVENTS`, `DEFAULTS`, `MD_URL_PATTERNS`, `MD_MIME_TYPES`, `CSS_PREFIX`, `MAX_DOCUMENT_SIZE` |
| `src/utils/dom-helpers.js` | `MARKUP_DOM_HELPERS` | `createElement()`, `createFragment()`, `removeAllChildren()`, `addStyles()` |
| `src/utils/sanitizer.js` | `MARKUP_SANITIZER` | `Sanitizer` class — DOMParser-based whitelist. `createStrictConfig()` factory. Blocks `<script>`, `<iframe>`, `on*` attrs, `javascript:` URLs |
| `src/core/EventEmitter.js` | `MARKUP_EVENT_EMITTER` | `on()`, `off()`, `emit()`, `once()`, `removeAllListeners()`, `listenerCount()` |

### Key Decisions
- **Sanitizer whitelist** broader than plan minimum — includes `dl/dt/dd`, `details/summary`, `sup/sub`, `mark`, `figure/figcaption`.
- **EventEmitter** uses `Set` (not `Array`) for O(1) dedup. Spread-copy iteration in `emit()` for safe mid-emission removal.

---

## Phase 3 — Storage, Messaging & Detection
**Steps 3.1–3.5 · All Completed**

### Files Created
| File | Export | API Surface |
|------|--------|-------------|
| `src/core/StorageManager.js` | `MARKUP_STORAGE_MANAGER` | `get()`, `set()`, `remove()`, `getAll()` — namespaced, async, default-fallback |
| `src/core/MessageBus.js` | `MARKUP_MESSAGE_BUS` | `send()`, `listen()`, `unlisten()`, `destroy()` — action-based routing |
| `src/core/FileDetector.js` | `MARKUP_FILE_DETECTOR` | `isMarkdownUrl()`, `isMarkdownMime()`, `getFileNameFromUrl()`, `setCustomExtensions()` — 5 built-in extensions (.md/.markdown/.mdown/.mkd/.mdx) |

### Service Worker Wiring
- `importScripts()` loads constants, FileDetector, MessageBus, StorageManager, Logger.
- `chrome.tabs.onUpdated` → dynamic injection for URLs not in static `content_scripts` matches.
- `injectedTabs` Set tracks already-injected tabs. Cleaned on `tabs.onRemoved`.

### Key Decisions
- ⚠️ **Added `"tabs"` permission** to manifest — required for `chrome.tabs.onUpdated`.
- `StorageManager.get()` resolves with default on error (never rejects).
- `MessageBus._onMessage` returns `false` for unknown actions — does not consume messages meant for other listeners.

---

## Phase 4 — Markdown Parsing & Rendering Pipeline
**Steps 4.1–4.8 · All Completed**

### Files Created
| File | Export | Purpose |
|------|--------|---------|
| `vendor/marked.min.js` (v15.0.12) | `marked` global | Markdown parser (MIT) |
| `vendor/highlight.min.js` (v11.11.1) | `hljs` global | Syntax highlighter (BSD-3-Clause) |
| `src/styles/code-highlight.css` | — | GitHub-style highlight.js theme |
| `src/core/MarkdownParser.js` | `MARKUP_MARKDOWN_PARSER` | GFM-enabled parser wrapping `new marked.Marked()` |
| `src/core/Renderer.js` | `MARKUP_RENDERER` | Abstract base with `render()`, `clear()`, `getContainer()` |
| `src/core/HtmlRenderer.js` | `MARKUP_HTML_RENDERER` | Sanitize → DOMParser → `importNode()` → mount |
| `src/core/SyntaxHighlighter.js` | `MARKUP_SYNTAX_HIGHLIGHTER` | `highlightAll()`, `highlightElement()` wrapping hljs |
| `src/core/TocGenerator.js` | `MARKUP_TOC_GENERATOR` | Heading extraction, slug generation, stack-based tree building |

### Content Script Pipeline
1. Detect raw Markdown page (`contentType` + `<pre>` check)
2. Extract raw text
3. Parse → HTML (MarkdownParser)
4. Render → safe DOM (HtmlRenderer + Sanitizer)
5. Highlight code blocks (SyntaxHighlighter)
6. Generate TOC data
7. Set page title from first `<h1>` or filename

### Key Decisions
- **No Shadow DOM** — deferred; using `markup-*` CSS class namespacing instead.
- `new marked.Marked()` for isolated instance — prevents option leakage.
- Vendor files in both `vendor/` (source of truth) and `src/vendor/` (extension runtime).
- Error fallback shows styled error with collapsible raw Markdown.

---

## Phase 5 — Theming & Styling System
**Steps 5.1–5.7 · All Completed**

### Files Created
| File | Purpose |
|------|---------|
| `src/styles/variables.css` | 60+ CSS custom properties scoped under `.markup-content` |
| `src/styles/themes/light.css` | GitHub-inspired light palette |
| `src/styles/themes/dark.css` | GitHub Dark Dimmed palette |
| `src/styles/themes/sepia.css` | Warm paper-like reading palette |
| `src/styles/typography.css` | Heading scale (~1.25 ratio), text elements, a11y focus styles |
| `src/content/content.css` | Master stylesheet — layout, tables, code, images, transitions |
| `src/styles/print.css` | `@media print` — forces light, hides UI, page break control |
| `src/core/ThemeManager.js` | Theme switching + `StorageManager` persistence + `EventEmitter` emission |

### Manifest CSS Load Order
`variables.css` → `light.css` → `dark.css` → `sepia.css` → `typography.css` → `content.css` → `code-highlight.css` → `print.css`

### Key Decisions
- No `@import` — CSS files listed individually in manifest (Chrome docs mandate).
- Theme selectors: `.markup-content.markup-theme-{name}` (compound class for specificity).
- `_runPipeline()` changed from sync → async (needed for `StorageManager.get()` in ThemeManager init).
- System font stacks used — zero bundled font overhead.

---

## Phase 6 — UI Components & Interactive Features
**Steps 6.1–6.10 · All Completed**

### Files Created
| File | Export | Purpose |
|------|--------|---------|
| `src/ui/BaseComponent.js` | `MARKUP_BASE_COMPONENT` | Abstract lifecycle: `mount()`, `unmount()`, `show()`, `hide()`, `toggle()` |
| `src/ui/ToolbarComponent.js` | `MARKUP_TOOLBAR_COMPONENT` | Floating bar — TOC, Theme, Search, Print, Settings buttons. Auto-hide on scroll |
| `src/ui/TocPanelComponent.js` | `MARKUP_TOC_PANEL_COMPONENT` | Left sidebar, IntersectionObserver scroll-spy, collapsible sections |
| `src/ui/SearchBarComponent.js` | `MARKUP_SEARCH_BAR_COMPONENT` | Search overlay, debounced input (200ms), keyboard nav |
| `src/ui/SettingsPanelComponent.js` | `MARKUP_SETTINGS_PANEL_COMPONENT` | Right sidebar — theme radios, font/line-height sliders, font family dropdown |
| `src/core/SearchController.js` | `MARKUP_SEARCH_CONTROLLER` | TreeWalker text search, `<mark>` highlighting, DOM restoration |
| `src/core/PrintManager.js` | `MARKUP_PRINT_MANAGER` | `preparePrintView()` → `window.print()` → auto-restore via `afterprint` |
| `src/core/KeyboardManager.js` | `MARKUP_KEYBOARD_MANAGER` | Combo normalization, capture-phase listener, skips input/textarea |
| `src/styles/ui-components.css` | — | Toolbar glassmorphism, sidebars, search bar, highlights |

### Key Decisions
- UI components mount to `document.body` (fixed-position chrome above content).
- All buttons emit events via EventEmitter — no direct cross-component calls.
- Keyboard shortcuts: `Alt+T` (TOC), `Alt+F` (search), `Alt+D` (theme), `Alt+P` (print).

---

## Phase 7 — Popup, Options Page & Polish
**Steps 7.1–7.9 · All Completed**

### Files Created
| File | Purpose |
|------|---------|
| `src/popup/popup.html` | Theme quick-switch, toggles, recent files list |
| `src/popup/popup.css` | 320px-wide compact layout |
| `src/popup/popup.js` | IIFE controller — StorageManager + MessageBus |
| `src/options/options.html` | 4 sections: Appearance, Behavior, Advanced, About |
| `src/options/options.css` | Card-based layout, custom sliders/toggles |
| `src/options/options.js` | IIFE controller — live save, reset to defaults |
| `scripts/package.sh` | Zip builder → `markup-extension-v{version}.zip` |
| `scripts/build.sh` | No-op placeholder for future build steps |
| `tests/test-files/large-document.md` | 500+ lines, 13 sections, 8 languages |
| `tests/test-checklist.md` | 80+ item manual QA checklist |

### UX Polish
- Loading spinner (3-dot bounce) for files >50KB.
- Raw/rendered toggle button (bottom-left, `aria-pressed`).

### Edge Cases
- Empty file → styled "empty" card.
- Binary file → detection via null-byte check + non-printable ratio → warning card.
- Large file (>1MB) → sticky warning bar, render first 500 lines, "Load All" button.

### Key Decisions
- Popup sends `APPLY_THEME` via MessageBus → service worker relays to content scripts.
- Recent files: `chrome.storage.local` (not sync — sync has 100KB quota). Capped at 10 FIFO.

---

## Phase 8 — UI Refinements & Live Settings
**Steps 8.1–8.3 · All Completed**

| Area | Change |
|------|--------|
| **Theme-aware UI (8.1)** | `body.markup-body` CSS variables + theme overrides. ThemeManager toggles classes on both `.markup-content` and `body`. |
| **Draggable toolbar (8.2)** | 6th button (drag handle `⠿`). PointerEvents API with `setPointerCapture()`. Position persisted. Viewport clamping. |
| **Live settings relay (8.3)** | Service worker relays: `APPLY_THEME`, `APPLY_FONT_SIZE`, `APPLY_LINE_HEIGHT`, `APPLY_FONT_FAMILY`. Content script applies CSS custom properties immediately. |

### Key Decisions
- UI elements are `body` children, not inside `.markup-content` — CSS variables duplicated at `body.markup-body` level.
- PointerEvents over MouseEvents for touch compatibility.

---

## Phase 9 — Settings Backend Wiring
**Steps 9.1–9.6 · All Completed**

### Step 9.1 — `enabled` Master Toggle ✅

- Content script: `enabled` gate at start of `run()`. Info banner with "Enable" button when disabled.
- Service worker: `enabled` gate wrapping dynamic injection in async IIFE.
- Gates use `=== false` — `undefined` treated as enabled (backward compat).
- `earlyStorage` created at top of `run()` for settings checks — separate from `this._storage`.

### Step 9.2 — `debugLog` → Logger Utility ✅

- Created `src/utils/logger.js` — static `Logger` class (`MARKUP_LOGGER`).
- `debug()` gated behind cached `_enabled` flag. `warn()`/`error()` always output.
- Output format: `[MarkUp:Context] message`.
- 28 `console.log()` calls converted across all modules.
- `APPLY_DEBUG_LOG` wired as early bus listener (works even when pipeline short-circuits).

### Step 9.3 — Unified Settings ✅

- Consolidated `autoDetect` + `autoRender` into single `enabled` toggle.
- Removed `enableFileUrl` toggle entirely — global `enabled` is sufficient.
- Fixed bug: `APPLY_AUTO_DETECT` had no service worker listener → consolidated `APPLY_ENABLED` now has proper relay.

### Step 9.4 — Custom File Extensions ✅

- `FileDetector.setCustomExtensions(extensionsString)` — merges with built-in, never replaces.
- `_builtInPatterns` stored separately and frozen at construction.
- Options UI split: readonly built-in + editable custom input + Chrome limitation tooltip.
- Regex injection prevented via special character escaping.
- `APPLY_EXTENSIONS` broadcasts to ALL tabs (new extensions may match previously-unmatched URLs).
- Service worker startup IIFE re-reads `extensions` from storage (restart safety).

### Step 9.5 — `cspStrict` → Strict Sanitizer Mode ✅

- `Sanitizer.createStrictConfig()` — strips `<img>`, blocks external `<a href>` (only `#anchor` preserved), blocks `data:` URLs.
- `_reRender()` method re-runs parse→render→highlight→TOC pipeline using stored `_rawMarkdown`.
- Default is `false` (relaxed) — avoids breaking images/links on install.
- `APPLY_CSP_STRICT` relay broadcasts to all Markdown tabs.

### Step 9.6 — Tests & Documentation ✅

- 5 per-step test suites totaling 345 tests, all passing.
- All prior suites (Phase 2–8) pass with zero regressions.

---

## Test Suite Summary

| Suite | File | Tests |
|-------|------|-------|
| Phase 2 | `tests/phase2-browser-verify.html` | Core utils |
| Phase 3 | `tests/phase3-browser-verify.html` | 62 tests |
| Phase 4 | `tests/phase4-browser-verify.html` | 67 tests |
| Phase 5 | `tests/phase5-browser-verify.html` | 89 tests |
| Phase 6 | `tests/phase6-browser-verify.html` | 143 tests |
| Phase 7 | `tests/phase7-browser-verify.html` | Phase 7 deliverables |
| Phase 8 | `tests/phase8-browser-verify.html` | 78 tests |
| Phase 9.1 | `tests/phase9-step91-browser-verify.html` | 131 tests |
| Phase 9.2 | `tests/phase9-step92-browser-verify.html` | 58 tests |
| Phase 9.3 | `tests/phase9-step93-browser-verify.html` | 54 tests |
| Phase 9.4 | `tests/phase9-step94-browser-verify.html` | 42 tests |
| Phase 9.5 | `tests/phase9-step95-browser-verify.html` | 60 tests |

---

## Known Deviations from PLAN.md

| Deviation | Reason |
|-----------|--------|
| Icons in `src/icons/` instead of only `assets/icons/` | Chrome can't reference files outside extension root |
| Vendor files in `src/vendor/` (copies of `vendor/`) | Same Chrome restriction |
| `"tabs"` permission added | Required for `chrome.tabs.onUpdated` dynamic injection |
| No Shadow DOM | Deferred — using `markup-*` CSS namespacing instead |
| `_runPipeline()` is async (was sync in plan) | Needed for `StorageManager.get()` which returns Promise |
| `StorageManager.js` added to static content_scripts | Was missing since Phase 3 — fixed in Phase 6 as bugfix |
| Toolbar has 6 buttons (plan said 5) | Drag handle added in Phase 8 |
| `autoDetect` + `autoRender` merged into `enabled` | Eliminated dead combos and semantic overlap |
| `enableFileUrl` toggle removed entirely | Global `enabled` toggle is sufficient |
| Extensions UI split into readonly + editable fields | Prevents accidental removal of built-in defaults |
| `CSPSTRICT` default is `false` (plan said `true`) | Relaxed mode avoids breaking images/links on install |

---

> **For future agents:** Always check this file's "Known Deviations" section, the "Settings Model" table, and the relevant Phase entry before implementing a new PLAN.md step. The manifest, service worker, and content script have evolved significantly from their Phase 1 skeletons.
