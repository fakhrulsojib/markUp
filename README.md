# MarkUp ✨

> Render Markdown files beautifully — right in your browser.

**MarkUp** is a Chrome Extension that transforms raw `.md` and `.markdown` files into clean, styled, interactive documents. Open a Markdown file locally or on GitHub, and MarkUp does the rest.

![Under Construction](https://img.shields.io/badge/status-v0.2.0-blue)

---

## Why MarkUp?

Chrome displays Markdown files as plain text. MarkUp fixes that — giving you a **rich reading experience** with themes, syntax highlighting, a table of contents, and more. No apps to install, no copying into an online viewer. Just open your file.

---

## Highlights

- 🎨 **3 themes** — Light, Dark, and Sepia with one-click switching
- 📑 **Auto-generated Table of Contents** — collapsible sidebar with scroll-spy
- 🔍 **In-document search** — find-as-you-type with match highlighting
- 🖨️ **Print-ready output** — clean layout optimized for PDF/paper
- ⌨️ **Keyboard shortcuts** — TOC, search, theme cycle, and print
- ⚙️ **Live settings** — font size, line height, and font family update in real time
- 🧲 **Draggable toolbar** — reposition anywhere on screen; position persists
- 🌐 **Works everywhere** — local `file://` paths, GitHub raw URLs, and more

---

## Getting Started

### Install

1. Clone or download this repo
2. Open `chrome://extensions` → enable **Developer mode**
3. Click **Load unpacked** → select the `src/` folder
4. (For local files) Click extension **Details** → enable **Allow access to file URLs**

### Use

Open any `.md`, `.markdown`, `.mdown`, `.mkd`, or `.mdx` file in Chrome. MarkUp renders it automatically.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Toggle Table of Contents |
| `Ctrl+Shift+F` | Search in document |
| `Ctrl+Shift+D` | Cycle theme |
| `Ctrl+P` | Print |

---

## Themes

| Light | Dark | Sepia |
|-------|------|-------|
| Clean white inspired by GitHub | Deep charcoal for low-light | Warm paper tones for long reads |

Theme preference syncs across devices via `chrome.storage.sync`.

---

## Tech Stack

- **Manifest V3** Chrome Extension — vanilla JS, no build step required
- [marked](https://github.com/markedjs/marked) v15.0.12 for CommonMark + GFM parsing
- [highlight.js](https://highlightjs.org/) v11.11.1 for syntax highlighting
- DOMParser-based HTML sanitizer (no `innerHTML`)
- Event-driven architecture with decoupled components

---

## Project Structure

```
src/
├── manifest.json         # Extension config
├── background/           # Service worker
├── content/              # Content script & styles
├── popup/                # Quick-settings popup
├── options/              # Full settings page
├── core/                 # Parser, renderer, theme, storage, etc.
├── ui/                   # Toolbar, TOC, search, settings components
└── styles/               # Themes & typography
```

---

## Package for Distribution

```bash
bash scripts/package.sh
```

Creates `markup-extension-v0.2.0.zip` ready for Chrome Web Store or sideloading.

---

## License

TBD
