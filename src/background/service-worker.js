/**
 * MarkUp — Background Service Worker
 *
 * Event-driven service worker for the MarkUp Chrome Extension.
 * Manifest V3 compliant — no persistent background page.
 *
 * Responsibilities:
 * - Lifecycle management (install, update)
 * - Dynamic content script injection for Markdown URLs not covered by static matches
 * - Message routing via MessageBus
 */

// Import core modules
// In MV3 service workers, importScripts() is used for non-module scripts.
importScripts(
  '../utils/constants.js',
  '../core/FileDetector.js',
  '../core/MessageBus.js'
);

// --- Instances ---

/**
 * FileDetector instance for URL pattern matching.
 * @type {FileDetector}
 */
const fileDetector = new MARKUP_FILE_DETECTOR();

/**
 * MessageBus instance for cross-context messaging.
 * @type {MessageBus}
 */
const messageBus = new MARKUP_MESSAGE_BUS();

// --- Lifecycle Events ---

/**
 * Fired when the extension is first installed, updated, or Chrome is updated.
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('MarkUp installed.', `Reason: ${details.reason}`);
});

// --- Dynamic Content Script Injection ---

/**
 * Track tabs that have already been injected to avoid duplicate injection.
 * Uses a Set of tabId values. Cleared when tabs are closed.
 * @type {Set<number>}
 */
const injectedTabs = new Set();

/**
 * Listen for tab URL changes. When a tab navigates to a Markdown URL
 * that is NOT covered by the static content_scripts matches,
 * dynamically inject the content script.
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Only act when the page has completed loading
  if (changeInfo.status !== 'complete' || !tab.url) {
    return;
  }

  // Skip if already injected in this tab
  if (injectedTabs.has(tabId)) {
    return;
  }

  // Check if the URL is a Markdown file
  if (!fileDetector.isMarkdownUrl(tab.url)) {
    return;
  }

  // Skip URLs already covered by static content_scripts matches
  // (file://*/*.md, file://*/*.markdown, https://raw.githubusercontent.com/*)
  if (_isCoveredByStaticMatches(tab.url)) {
    return;
  }

  // Dynamically inject the content script
  console.log('MarkUp: Dynamic injection for:', tab.url);

  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: [
        'vendor/marked.min.js',
        'vendor/highlight.min.js',
        'utils/constants.js',
        'utils/dom-helpers.js',
        'utils/sanitizer.js',
        'core/EventEmitter.js',
        'core/FileDetector.js',
        'core/StorageManager.js',
        'core/Renderer.js',
        'core/MarkdownParser.js',
        'core/HtmlRenderer.js',
        'core/SyntaxHighlighter.js',
        'core/TocGenerator.js',
        'core/ThemeManager.js',
        'core/SearchController.js',
        'core/PrintManager.js',
        'core/KeyboardManager.js',
        'ui/BaseComponent.js',
        'ui/ToolbarComponent.js',
        'ui/TocPanelComponent.js',
        'ui/SearchBarComponent.js',
        'ui/SettingsPanelComponent.js',
        'content/content-script.js',
      ],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn('MarkUp: Script injection failed:', chrome.runtime.lastError.message);
        return;
      }
      injectedTabs.add(tabId);
      console.log('MarkUp: Content script injected into tab', tabId);
    }
  );

  // Also inject the content CSS
  chrome.scripting.insertCSS(
    {
      target: { tabId: tabId },
      files: [
        'styles/variables.css',
        'styles/themes/light.css',
        'styles/themes/dark.css',
        'styles/themes/sepia.css',
        'styles/typography.css',
        'content/content.css',
        'styles/code-highlight.css',
        'styles/ui-components.css',
        'styles/print.css',
      ],
    },
    () => {
      if (chrome.runtime.lastError) {
        console.warn('MarkUp: CSS injection failed:', chrome.runtime.lastError.message);
      }
    }
  );
});

/**
 * Clean up tracking when a tab is closed.
 */
chrome.tabs.onRemoved.addListener((tabId) => {
  injectedTabs.delete(tabId);
});

// --- Message Handlers ---

/**
 * Handle 'ping' action — used for connectivity testing.
 */
messageBus.listen('ping', (payload, sender) => {
  console.log('MarkUp: Received ping from', sender.tab ? sender.tab.url : 'extension');
  return { status: 'pong', timestamp: Date.now() };
});

// --- Utility Functions ---

/**
 * Check if a URL is already covered by the static content_scripts matches
 * defined in manifest.json. If so, we skip dynamic injection to avoid
 * running the content script twice.
 *
 * @param {string} url - The URL to check.
 * @returns {boolean} True if the URL matches a static content_scripts pattern.
 * @private
 */
function _isCoveredByStaticMatches(url) {
  // Static patterns from manifest.json:
  // - file:///*/*.md
  // - file:///*/*.markdown
  // - https://raw.githubusercontent.com/*

  // file:// with .md extension
  if (url.startsWith('file://') && /\.md$/i.test(url.split('?')[0].split('#')[0])) {
    return true;
  }

  // file:// with .markdown extension
  if (url.startsWith('file://') && /\.markdown$/i.test(url.split('?')[0].split('#')[0])) {
    return true;
  }

  // raw.githubusercontent.com
  if (url.startsWith('https://raw.githubusercontent.com/')) {
    return true;
  }

  return false;
}
