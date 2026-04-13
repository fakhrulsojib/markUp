# MarkUp Extension — Manual QA Test Checklist

> Comprehensive quality assurance checklist covering all features across all phases.
> Mark items with `[x]` when verified.

---

## Phase 1: Infrastructure

- [ ] Extension loads without manifest errors in `chrome://extensions`
- [ ] Custom icon appears in toolbar (all 4 sizes)
- [ ] Service worker starts (check via "Service worker" link)
- [ ] Console shows "MarkUp installed" on first load

## Phase 2: Core Utilities

- [ ] Constants are accessible globally (`MARKUP_CONSTANTS` in console)
- [ ] DOM helpers create elements without innerHTML
- [ ] Sanitizer strips `<script>`, `<iframe>`, `onclick=`
- [ ] Sanitizer allows `<strong>`, `<a href="">`, `<img>`
- [ ] EventEmitter: on/off/emit/once all work correctly

## Phase 3: Storage & Messaging

- [ ] StorageManager: set value → refresh → get returns persisted value
- [ ] MessageBus: content script ping → service worker pong
- [ ] FileDetector detects `.md`, `.markdown`, `.mdown`, `.mkd`, `.mdx`
- [ ] Dynamic injection works for `.mdown` files not in static matches

## Phase 4: Parsing & Rendering

- [ ] Open `basic.md` → headings, paragraphs, bold, italic render correctly
- [ ] Open `gfm-tables.md` → tables with alignment render correctly
- [ ] Open `code-blocks.md` → syntax highlighting applied (colored tokens)
- [ ] Open `edge-cases.md` → nested blockquotes, XSS payloads sanitized
- [ ] Page title set to first `<h1>` or filename
- [ ] Raw Markdown is fully replaced (no raw text visible)

## Phase 5: Theming & Styling

- [ ] Light theme: white background, dark text, blue links
- [ ] Dark theme: charcoal background, light text, cyan accents
- [ ] Sepia theme: warm background, brown text, muted accents
- [ ] Theme persists after page refresh
- [ ] Tables have striped rows and header background
- [ ] Code blocks have proper background and borders
- [ ] Typography: headings are visually distinct hierarchy
- [ ] Print preview (Ctrl+P): clean layout, no UI chrome

## Phase 6: UI Components

### Toolbar
- [ ] Toolbar renders as floating bar (top-right)
- [ ] 5 buttons visible: TOC, Theme, Search, Print, Settings
- [ ] Each button has tooltip on hover
- [ ] Auto-hides on scroll down, reveals on scroll up
- [ ] At page top: always visible

### Table of Contents
- [ ] Toggle TOC → panel slides in from left
- [ ] TOC items correspond to document headings
- [ ] Click TOC item → scrolls to heading
- [ ] Scroll-spy: current heading highlighted in TOC
- [ ] Collapsible nested sections

### Search
- [ ] Toggle search → bar appears at top
- [ ] Type query → matches highlighted in document
- [ ] Match count displayed (e.g., "3/15")
- [ ] Enter → next match, Shift+Enter → previous
- [ ] Escape → close and clear highlights

### Settings Panel
- [ ] Opens as right sidebar
- [ ] Theme radios: switching applies immediately
- [ ] Font size slider: text resizes live (12-24px)
- [ ] Line height slider: spacing changes live (1.2-2.0)
- [ ] Font family dropdown: font changes live
- [ ] Settings persist across page refresh

### Print
- [ ] Print button → print dialog opens
- [ ] Print preview: clean, single-column, light theme
- [ ] After print dialog closes, UI restores

### Keyboard Shortcuts
- [ ] `Ctrl+Shift+T` → Toggle TOC
- [ ] `Ctrl+Shift+F` → Toggle Search
- [ ] `Ctrl+Shift+D` → Cycle Theme
- [ ] `Ctrl+P` → Print (MarkUp formatted)
- [ ] Shortcuts don't fire when typing in search input

## Phase 7: Popup, Options & Polish

### Popup
- [ ] Click extension icon → popup appears (320px wide)
- [ ] Extension logo and "v0.1.0" version displayed
- [ ] Theme quick-switch: 3 buttons (Light, Dark, Sepia)
- [ ] Active theme button highlighted
- [ ] Theme switch persists across popup close/reopen
- [ ] Toggle: "Enable MarkUp"
- [ ] Recent files list shows last 5 files
- [ ] Click recent file → opens in new tab
- [ ] "Options" link → opens options page

### Options Page
- [ ] Right-click extension → Options → page opens
- [ ] **Appearance**: Theme, font size, line height, font family
- [ ] Settings save with visual feedback ("Settings saved ✓")
- [ ] **Behavior**: Auto-render toggle, file extensions field
- [ ] **Advanced**: CSP mode toggle, debug logging toggle
- [ ] **About**: Version, manifest, parser, highlighter info
- [ ] Reset button → all settings return to defaults

### Recent Files
- [ ] Open 3 .md files → popup shows them in recent list
- [ ] Newest files appear first
- [ ] Recent file entries show title, URL, and time
- [ ] Duplicate URL replaces old entry (no duplicates)

### UX Polish
- [ ] Toolbar buttons have hover effects
- [ ] TOC panel slide animation (smooth 300ms)
- [ ] Theme switch is smooth (no abrupt color change)
- [ ] Loading spinner appears for large files
- [ ] "Back to raw" toggle button visible (bottom-left)
- [ ] Click "Raw" → shows raw Markdown text
- [ ] Click "Rendered" → returns to styled view

### Edge Cases
- [ ] Empty `.md` file → "This file is empty" message
- [ ] Large file (>1MB) → warning bar + "Load All" button
- [ ] Click "Load All" → full document renders

### Accessibility
- [ ] All toolbar buttons have `aria-label`
- [ ] TOC panel has `role="navigation"`
- [ ] Search bar has `role="search"`
- [ ] Toggle buttons have `aria-expanded`
- [ ] Tab navigation through toolbar works
- [ ] Focus outline visible on interactive elements

### Build & Package
- [ ] `scripts/package.sh` creates zip file
- [ ] Zip loads as unpacked extension
- [ ] Extension works identically from zip

---

## Cross-Browser Regression

- [ ] All Phase 2 browser tests pass
- [ ] All Phase 3 browser tests pass
- [ ] All Phase 4 browser tests pass
- [ ] All Phase 5 browser tests pass
- [ ] All Phase 6 browser tests pass
- [ ] All Phase 7 browser tests pass

---

*Last updated: Phase 7 completion*
