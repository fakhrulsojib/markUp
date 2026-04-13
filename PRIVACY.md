# Privacy Policy — MarkUp Chrome Extension

**Last updated:** April 13, 2026

## Overview

MarkUp is a browser extension that renders Markdown files in your browser. Your privacy is important — this extension is designed to work entirely locally with **no data collection, no tracking, and no external communication**.

## Data Collection

**MarkUp does not collect, transmit, or store any personal data.**

Specifically:

- ❌ No analytics or telemetry
- ❌ No user tracking or fingerprinting
- ❌ No cookies or third-party scripts
- ❌ No data sent to external servers
- ❌ No account registration required

## Local Storage

MarkUp uses Chrome's built-in storage APIs (`chrome.storage.sync` and `chrome.storage.local`) to save your **preferences only**:

- Theme selection (light, dark, or sepia)
- Font size, line height, and font family
- Custom file extensions
- Feature toggles (e.g., download interception, CSP strict mode)
- A list of recently opened file URLs (stored locally, never transmitted)

This data stays on your device (and syncs to your other Chrome instances via your Google account if Chrome sync is enabled — this is a built-in Chrome feature, not controlled by MarkUp).

## Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` | Detect and render Markdown on the current tab |
| `storage` | Save your preferences locally |
| `scripting` | Inject the rendering pipeline into Markdown pages |
| `tabs` | Detect when tabs navigate to Markdown URLs |
| `downloads` | Intercept `.md` downloads to render instead of saving |
| `host_permissions: <all_urls>` | Fetch Markdown content from any URL when intercepting downloads (e.g., from Slack, Google Chat) |

No permission is used to collect or transmit user data.

## Network Requests

MarkUp makes **no network requests** except:

- Fetching the content of a Markdown file that was intercepted as a download (using the original download URL)

This fetch is performed locally by the extension's viewer page. The content is rendered in your browser and never sent anywhere.

## Third-Party Libraries

MarkUp includes two open-source libraries, bundled locally (not loaded from CDNs):

- **marked** (v15.0.12, MIT License) — Markdown parser
- **highlight.js** (v11.11.1, BSD-3-Clause License) — Syntax highlighter

These libraries run entirely in your browser and make no external requests.

## Children's Privacy

MarkUp does not collect data from any user, including children under 13.

## Changes to This Policy

If this policy changes, the updated version will be published here with a new "Last updated" date.

## Contact

If you have questions about this privacy policy, please open an issue on the [GitHub repository](https://github.com/fakhrulsojib/markUp).

---

*MarkUp is open source under the [MIT License](LICENSE).*
