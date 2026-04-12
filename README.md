# MarkUp

> **v0.1.0** — Render Markdown files beautifully in your browser.

**MarkUp** is a Chrome Extension that renders Markdown files (`.md`, `.markdown`) as beautifully styled, interactive HTML documents — directly in the browser tab.

## Features

### ✅ Implemented
- Intercept & render local/remote `.md` files in-tab
- Full CommonMark + GFM spec parsing (tables, task lists, strikethrough)
- Syntax-highlighted fenced code blocks (language auto-detect)
- Light / Dark / Sepia theme toggle with persistence
- **Floating toolbar** — quick access to all features (TOC, Theme, Search, Print, Settings)
- **Table of Contents sidebar** — auto-generated TOC, click-to-scroll, scroll-spy highlighting
- **In-document search** — Ctrl+F style overlay with match highlighting and keyboard navigation
- **Settings panel** — live typography controls (font size, line height, font family)
- **Print-optimized view** — clean print layout with UI chrome hidden
- **Keyboard shortcuts** — full shortcut support (see table below)
- **Extension popup** — quick theme switch, toggles, recent files list
- **Options page** — full settings with appearance, behavior, and advanced configuration
- **Recent files tracking** — automatically tracks last 10 opened Markdown files
- **Raw/Rendered toggle** — switch between styled and raw Markdown view
- **Edge case handling** — empty files, binary detection, large file warnings
- **Accessibility** — WCAG AA compliant with aria attributes and keyboard navigation

### 🎨 Themes

MarkUp ships with 3 carefully crafted themes:

| Theme | Description |
|-------|-------------|
| **Light** | Clean white/gray palette inspired by GitHub |
| **Dark** | Deep charcoal with cyan accents for low-light reading |
| **Sepia** | Warm paper-like tones for comfortable extended reading |

Your theme preference is automatically saved via `chrome.storage.sync` and persists across sessions.

### ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Toggle Table of Contents |
| `Ctrl+Shift+F` | Toggle Search |
| `Ctrl+Shift+D` | Cycle Theme (Light → Dark → Sepia) |
| `Ctrl+P` | Print (MarkUp formatted) |

## Supported Markdown Syntax

Powered by [marked](https://github.com/markedjs/marked) v15.0.12 with GFM extensions:

| Syntax | Support |
|--------|---------| 
| Headings (h1-h6) | ✅ |
| Bold, italic, strikethrough | ✅ |
| Links & images | ✅ |
| Ordered & unordered lists | ✅ |
| Task lists (checkboxes) | ✅ |
| GFM tables (with alignment) | ✅ |
| Fenced code blocks | ✅ |
| Blockquotes | ✅ |
| Horizontal rules | ✅ |
| Inline code | ✅ |

### Syntax Highlighting

Code blocks are highlighted via [highlight.js](https://highlightjs.org/) v11.11.1 with auto-detection.
Supported languages include JavaScript, Python, Bash, HTML, CSS, JSON, Ruby, Java, Go, Rust, TypeScript, and many more.

## Supported File Types

MarkUp detects and renders Markdown files by URL extension and MIME type:

| Extension | Example |
|-----------|---------|
| `.md` | `README.md`, `notes.md` |
| `.markdown` | `document.markdown` |
| `.mdown` | `file.mdown` |
| `.mkd` | `file.mkd` |
| `.mdx` | `component.mdx` |

**MIME types:** `text/markdown`, `text/x-markdown`

**Static match patterns** (auto-injected via manifest):
- `file:///*/*.md`, `file:///*/*.markdown`
- `https://raw.githubusercontent.com/*`

**Dynamic injection** (via service worker): Any URL with a supported Markdown extension is detected at runtime and the content script is injected dynamically.

## Architecture

```
MarkUpApp (Orchestrator)
├── MarkdownParser (marked.js wrapper)
├── HtmlRenderer (sanitized DOM output)
├── SyntaxHighlighter (highlight.js wrapper)
├── TocGenerator (heading extraction)
├── ThemeManager (theme state + CSS vars)
├── StorageManager (chrome.storage abstraction)
├── SearchController (search logic)
├── PrintManager (print layout)
├── KeyboardManager (shortcut routing)
├── EventEmitter (pub/sub communication)
└── UI Components
    ├── BaseComponent (abstract base)
    ├── ToolbarComponent (floating toolbar)
    ├── TocPanelComponent (sidebar TOC)
    ├── SearchBarComponent (search overlay)
    └── SettingsPanelComponent (settings sidebar)
```

## Loading the Extension

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `src/` directory inside this project.
5. The MarkUp extension icon should appear in your toolbar.

### Enabling File Access

To render local `.md` files (`file://` URLs):

1. On the `chrome://extensions` page, find **MarkUp**.
2. Click **Details**.
3. Enable **Allow access to file URLs**.

## Project Structure

```
markUp/
├── ProjectPlan.md          # Project roadmap (source of truth)
├── README.md               # This file
├── AGENTS.md               # Development log
├── src/                    # Extension source (load this as unpacked)
│   ├── manifest.json       # Manifest V3 configuration
│   ├── background/         # Service worker
│   ├── content/            # Content script & styles
│   ├── popup/              # Extension popup UI
│   ├── options/            # Full options page
│   ├── core/               # OOP core modules
│   ├── ui/                 # UI component classes
│   ├── styles/             # Theme stylesheets
│   └── utils/              # Utilities & constants
├── assets/                 # Icons & fonts (source)
├── vendor/                 # Vendored third-party libs
├── tests/                  # Test files & checklists
└── scripts/                # Build & package scripts
```

## Building

No build step is required — MarkUp uses vanilla JavaScript.

To create a distributable package:
```bash
bash scripts/package.sh
```

This creates `markup-extension-v0.1.0.zip` ready for installation.

## License

TBD
