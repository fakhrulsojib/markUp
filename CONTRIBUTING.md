# Contributing to MarkUp

Thank you for your interest in contributing to MarkUp! 🎉

Whether you're fixing a bug, adding a feature, improving documentation, or just asking a question — every contribution matters.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Code Style & Conventions](#code-style--conventions)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Code of Conduct](#code-of-conduct)

---

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/markUp.git
   cd markUp
   ```
3. **Load the extension** in Chrome:
   - Open `chrome://extensions`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked** → select the `src/` folder
4. **For local files:** Click the extension's **Details** → enable **"Allow access to file URLs"**

---

## Development Setup

MarkUp intentionally has **zero build dependencies**:

- **No npm/node required** — pure vanilla JavaScript (ES2020+)
- **No build step** — the extension runs directly from `src/`
- **No framework** — all DOM manipulation via native APIs

### Running Tests

Start a local HTTP server and open the test runner:

```bash
python3 -m http.server 8765
# Open http://localhost:8765/tests/run-all.html in your browser
```

All 16 test suites (1234+ tests) run in the browser with mocked Chrome APIs.

### Project Structure

```
src/                  # Extension root (load this as unpacked extension)
├── manifest.json     # Manifest V3 configuration
├── background/       # Service worker
├── content/          # Content script & styles
├── popup/            # Extension popup UI
├── options/          # Full settings page
├── viewer/           # Download viewer page
├── core/             # Core modules (parser, renderer, theme, etc.)
├── ui/               # UI components (toolbar, TOC, search, settings)
├── styles/           # CSS design tokens & themes
├── utils/            # Utility classes (constants, sanitizer, logger)
└── vendor/           # Vendored libraries (marked, highlight.js)
```

---

## Architecture Overview

Before making changes, please read **[AGENTS.md](AGENTS.md)** — it documents:

- Architecture decisions and their rationale
- Module naming and export patterns (`globalThis.MARKUP_*`)
- CSS/storage namespacing rules
- Known deviations from the original plan
- Test suite conventions

Key architectural patterns:

| Pattern | Detail |
|---------|--------|
| **No ES modules** | Content scripts use classic scripts — all exports via `globalThis.MARKUP_*` |
| **No `innerHTML`** | All DOM created via `createElement()` + `Sanitizer` for parsed HTML |
| **No `eval()`** | MV3 CSP compliance — no dynamic code execution |
| **CSS namespacing** | All classes prefixed `markup-` (from `CSS_PREFIX` constant) |
| **Storage namespacing** | All keys prefixed `markup_` (from `StorageManager._prefixKey()`) |
| **Error handling** | All `chrome.*` calls wrapped in try/catch + `lastError` checks |

---

## Code Style & Conventions

| Convention | Example |
|------------|---------|
| Private members | `_myPrivateMethod()`, `_myField` |
| File naming | PascalCase matching class name: `ThemeManager.js` |
| Constants | `SCREAMING_SNAKE_CASE`, wrapped in `Object.freeze()` |
| CSS classes | `markup-toolbar`, `markup-theme-dark` |
| Storage keys | `markup_theme`, `markup_fontSize` |
| Commit messages | Conventional prefixes: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:` |
| JSDoc | Required on all public methods |

### Do

- ✅ Use `document.createElement()` for DOM creation
- ✅ Use the `Sanitizer` class for any user-provided HTML
- ✅ Use `textContent` for plaintext
- ✅ Use `addEventListener` with named functions (for proper cleanup)
- ✅ Implement `unmount()` in any `BaseComponent` subclass

### Don't

- ❌ Use `innerHTML` for user-facing content
- ❌ Use `eval()`, `new Function()`, or inline event handlers
- ❌ Use inline `style` attributes in JS-generated HTML
- ❌ Add npm dependencies (this is a zero-dependency project)
- ❌ Use ES modules (`import`/`export`) in content scripts

---

## Making Changes

1. Create a **feature branch** from `main`:
   ```bash
   git checkout -b feature/my-feature
   # or
   git checkout -b fix/bug-description
   ```

2. Make your changes following the conventions above

3. **Run the relevant test suite(s)** to verify your changes work:
   ```bash
   # Open the specific test file in your browser, e.g.:
   # http://localhost:8765/tests/phase6-browser-verify.html
   ```

4. **Run the full test runner** to check for regressions:
   ```bash
   # http://localhost:8765/tests/run-all.html
   ```

5. **Commit** with a conventional message:
   ```bash
   git commit -m "feat: add mermaid diagram rendering in fenced code blocks"
   ```

6. **Push** and open a Pull Request

---

## Testing

### Test Structure

- Each phase has its own test suite: `tests/phase{N}-browser-verify.html`
- The full runner is at `tests/run-all.html`
- All tests use mocked Chrome APIs and run entirely in the browser
- Test suites must follow the summary format documented in [AGENTS.md](AGENTS.md#test-suite-convention-mandatory)

### Writing Tests

If you add new functionality, add tests to the relevant phase test file (or create a new one). Every test file must:

1. Include a `<div id="summary"></div>` element
2. Use `textContent` (not `innerHTML`) for the summary
3. Output exactly: `"X passed, Y failed"`
4. Use `Promise.all()` for async tests (never `setTimeout`)

See [AGENTS.md — Test Suite Convention](AGENTS.md#test-suite-convention-mandatory) for the full specification.

---

## Submitting a Pull Request

1. Fill out the [Pull Request template](.github/pull_request_template.md)
2. Ensure all tests pass (run `tests/run-all.html`)
3. Describe **what** changed and **why**
4. Link any related issues (e.g., "Fixes #42")
5. Keep PRs focused — one feature or fix per PR

### Review Process

- PRs are reviewed by the maintainer
- Feedback may be given — please don't take it personally!
- Once approved, PRs are squash-merged into `main`

---

## Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- Chrome version and OS
- MarkUp version (shown in popup or options page)
- Steps to reproduce
- Expected vs. actual behavior
- Screenshots if applicable

---

## Suggesting Features

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md).

Check the [Future Roadmap in PLAN.md](PLAN.md#future-phases-pipeline) first — your idea might already be planned!

---

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md). We are committed to providing a welcoming and inclusive experience for everyone.

---

## Thank You! 🙏

Your contributions make MarkUp better for everyone. Whether it's a one-line typo fix or a major feature — it all counts.
