# Changelog

All notable changes to MarkUp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] — 2026-04-13

### Added
- 🎨 3 themes: Light, Dark, Sepia with live switching
- 📑 Auto-generated Table of Contents with scroll-spy
- 🔍 In-document search with match highlighting
- 💻 Syntax highlighting for code blocks (auto-detected)
- 🖨️ Print-ready output optimized for PDF/paper
- ⌨️ Keyboard shortcuts (Alt+T, Alt+F, Alt+D, Alt+P)
- ⚙️ Live settings: font size, line height, font family
- 🧲 Draggable toolbar with persistent position
- 📥 Download interception for .md files from chat/email/etc.
- 🌐 Per-domain site permissions (allow/block)
- 🌗 Themed popup and options pages
- 🔒 Strict CSP mode for untrusted files
- 📂 Custom file extension support
- 🖼️ MarkUp favicon for rendered pages
- 🗑️ Clear file history from popup

### Technical
- Manifest V3 compliant (no eval, no remote code)
- 1234 automated tests across 16 suites
- DOMParser-based HTML sanitizer (no innerHTML)
- Optional host permissions (runtime, not install)
