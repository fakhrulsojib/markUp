<p align="center">
  <img src="assets/icons/icon-128.png" alt="MarkUp Logo" width="96" height="96">
</p>

<h1 align="center">MarkUp</h1>

<p align="center">
  <strong>Render Markdown files beautifully — right in your browser.</strong>
</p>

<p align="center">
  <a href="#install"><img src="https://img.shields.io/badge/chrome-extension-4285F4?logo=googlechrome&logoColor=white" alt="Chrome Extension"></a>
  <img src="https://img.shields.io/badge/version-0.3.0-blue" alt="Version">
  <img src="https://img.shields.io/badge/manifest-V3-orange" alt="Manifest V3">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License"></a>
</p>

---

## Why MarkUp?

Chrome displays Markdown files as plain text. **MarkUp** fixes that — transforming raw `.md` files into clean, styled, interactive documents with themes, syntax highlighting, a table of contents, and more.

No apps to install, no copying into an online viewer. Just open your file.

---

## ✨ Features

- 🎨 **3 Themes** — Light, Dark, and Sepia with one-click switching
- 📑 **Auto-generated Table of Contents** — collapsible sidebar with scroll-spy
- 🔍 **In-document Search** — find-as-you-type with match highlighting
- 💻 **Syntax Highlighting** — auto-detected language coloring for code blocks
- 🖨️ **Print-ready Output** — clean layout optimized for PDF/paper
- ⌨️ **Keyboard Shortcuts** — TOC, search, theme cycle, and print
- ⚙️ **Live Settings** — font size, line height, and font family update in real time
- 🧲 **Draggable Toolbar** — reposition anywhere on screen; position persists
- 🌐 **Works Everywhere** — local `file://` paths, GitHub raw URLs, and more
- 🔒 **Strict CSP Mode** — block external images and links for untrusted files
- 📂 **Custom File Extensions** — add `.txt`, `.rst`, or any extension for detection
- 📥 **Download Interception** — open `.md` downloads from Slack, email, etc. in a rendered tab instead of saving to disk
- 🖼️ **Branded Favicon** — MarkUp logo displayed in the browser tab for all rendered pages
- 🗑️ **Clear File History** — one-click clear of recent files list in the popup

---

## 🚀 Getting Started

### Install

1. Clone or download this repo:
   ```bash
   git clone https://github.com/fakhrulsojib/markUp.git
   ```
2. Open `chrome://extensions` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `src/` folder
5. *(For local files)* Click extension **Details** → enable **Allow access to file URLs**

### Use

Open any `.md`, `.markdown`, `.mdown`, `.mkd`, or `.mdx` file in Chrome — MarkUp renders it automatically.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+T` | Toggle Table of Contents |
| `Alt+F` | Search in document |
| `Alt+D` | Cycle theme (Light → Dark → Sepia) |
| `Alt+P` | Print |

---

## ⚙️ Settings

Configure MarkUp via the **popup** (click extension icon) or the **Options page** (right-click extension → Options).

| Setting | Location | Description |
|---------|----------|-------------|
| **Enable MarkUp** | Popup + Options | Master on/off toggle |
| **Theme** | Popup + Options + In-page | Light, Dark, or Sepia |
| **Font Size** | Options + In-page | 12–24px (default: 16px) |
| **Line Height** | Options + In-page | 1.2–2.0 (default: 1.6) |
| **Font Family** | Options + In-page | System, Serif, Sans-Serif, Monospace |
| **Custom Extensions** | Options | Additional file extensions (e.g. `.txt, .rst`) |
| **Strict CSP Mode** | Options | Blocks external images and links |
| **Debug Logging** | Options | Enables verbose console output |
| **Render Downloads** | Popup + Options | Intercept `.md` downloads and render instead |

All settings sync via `chrome.storage.sync` and apply in real time — no page refresh needed.

---

## 🎨 Themes

| Light | Dark | Sepia |
|-------|------|-------|
| Clean white, inspired by GitHub | Deep charcoal for low-light reading | Warm paper tones for long reads |

---

## 🏗️ Architecture

```
src/
├── manifest.json          # Manifest V3 config
├── background/            # Service worker (event-driven)
│   └── service-worker.js
├── content/               # Content script & styles
│   ├── content-script.js  # MarkUpApp orchestrator class
│   └── content.css
├── popup/                 # Quick-settings popup
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── options/               # Full settings page
│   ├── options.html
│   ├── options.css
│   └── options.js
├── viewer/                # Download viewer page
│   ├── viewer.html
│   ├── viewer.js
│   └── viewer.css
├── core/                  # Core modules
│   ├── MarkdownParser.js  # marked wrapper (GFM)
│   ├── Renderer.js        # Abstract base
│   ├── HtmlRenderer.js    # Safe DOM rendering
│   ├── TocGenerator.js    # TOC builder
│   ├── SyntaxHighlighter.js # hljs wrapper
│   ├── ThemeManager.js    # Theme state & CSS
│   ├── StorageManager.js  # chrome.storage wrapper
│   ├── MessageBus.js      # Messaging wrapper
│   ├── FileDetector.js    # URL/MIME detection
│   ├── SearchController.js
│   ├── PrintManager.js
│   ├── KeyboardManager.js
│   └── EventEmitter.js
├── ui/                    # UI components
│   ├── BaseComponent.js
│   ├── ToolbarComponent.js
│   ├── TocPanelComponent.js
│   ├── SearchBarComponent.js
│   └── SettingsPanelComponent.js
├── styles/                # Design tokens & themes
│   ├── variables.css
│   ├── themes/
│   │   ├── light.css
│   │   ├── dark.css
│   │   └── sepia.css
│   ├── typography.css
│   ├── ui-components.css
│   ├── code-highlight.css
│   └── print.css
├── utils/
│   ├── constants.js
│   ├── dom-helpers.js
│   ├── sanitizer.js
│   └── logger.js
└── vendor/
    ├── marked.min.js
    └── highlight.min.js
```

### Data Flow

```
User opens .md file
  → Service Worker detects URL (FileDetector)
  → Injects content script (chrome.scripting.executeScript)
  → MarkUpApp.run()
    → Detect → Extract → Parse (marked) → Render (HtmlRenderer + Sanitizer)
    → Highlight (hljs) → Build TOC → Apply Theme → Mount UI

User clicks .md download (Slack, Chat, email)
  → Service Worker intercepts via chrome.downloads.onDeterminingFilename
  → Cancel download → Clean up partial file
  → Open viewer.html?url=<download-url>
    → Fetch → Parse → Render → Highlight → TOC → Theme → UI
```

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Chrome Extension | Manifest V3 | Extension framework |
| [marked](https://github.com/markedjs/marked) | v15.0.12 | CommonMark + GFM parsing |
| [highlight.js](https://highlightjs.org/) | v11.11.1 | Syntax highlighting |
| Vanilla JS | ES2020+ | No build step, no frameworks |
| DOMParser | Native | HTML sanitization (no `innerHTML`) |

---

## 🔐 Permissions

| Permission | Why |
|------------|-----|
| `activeTab` | Access current tab to detect and render Markdown |
| `storage` | Save user preferences (theme, font, etc.) |
| `scripting` | Inject content script into Markdown pages |
| `tabs` | Detect when new tabs navigate to Markdown URLs |
| `downloads` | Intercept `.md` downloads and render instead of saving |
| `host_permissions: <all_urls>` | Fetch Markdown content from any URL (needed for download interception from services like Google Chat, Slack) |

---

## 📦 Package for Distribution

```bash
bash scripts/package.sh
```

Creates `markup-extension-v0.3.0.zip` ready for Chrome Web Store or sideloading.

---

## 🧪 Testing

Browser-runnable test suites (open in Chrome):

```
tests/
├── phase2-browser-verify.html    # Core utilities
├── phase3-browser-verify.html    # Storage, messaging, detection (62 tests)
├── phase4-browser-verify.html    # Parsing & rendering (67 tests)
├── phase5-browser-verify.html    # Theming & styling (89 tests)
├── phase6-browser-verify.html    # UI components (143 tests)
├── phase7-browser-verify.html    # Popup, options, polish
├── phase8-browser-verify.html    # UI refinements (78 tests)
├── phase9-step{91-95}-browser-verify.html  # Settings wiring (345 tests)
└── phase10-browser-verify.html   # Download interception (104 tests)
```

Manual QA checklist: `tests/test-checklist.md`

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes following the patterns in [`AGENTS.md`](AGENTS.md)
4. Run relevant test suites to verify no regressions
5. Submit a pull request

> **Note:** Read `AGENTS.md` before making changes — it documents architecture decisions, conventions, and known deviations from the plan.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
