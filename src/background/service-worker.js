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
  '../utils/logger.js',
  '../core/FileDetector.js',
  '../core/StorageManager.js',
  '../core/MessageBus.js'
);

// --- Instances ---

/**
 * FileDetector instance for URL pattern matching.
 * @type {FileDetector}
 */
const fileDetector = new MARKUP_FILE_DETECTOR();

/**
 * Load custom file extensions from storage on startup.
 * Must be async — wrapping in IIFE since top-level await isn't available.
 */
(async () => {
  try {
    const extensions = await settingsStorage.get('extensions');
    if (extensions && typeof extensions === 'string') {
      fileDetector.setCustomExtensions(extensions);
      MARKUP_LOGGER.debug('ServiceWorker', 'Custom extensions loaded:', extensions);
    }
  } catch (err) {
    console.warn('MarkUp: Failed to load custom extensions:', err);
  }
})();

/**
 * MessageBus instance for cross-context messaging.
 * @type {MessageBus}
 */
const messageBus = new MARKUP_MESSAGE_BUS();

/**
 * StorageManager instance for recent files tracking.
 * Uses 'local' storage area for recent files (larger quota, no sync needed).
 * @type {StorageManager}
 */
const recentStorage = new MARKUP_STORAGE_MANAGER('markup', 'local');

/**
 * StorageManager instance for reading user settings (sync storage).
 * Used to check autoDetect, autoRender, etc.
 * @type {StorageManager}
 */
const settingsStorage = new MARKUP_STORAGE_MANAGER('markup', 'sync');

/**
 * Initialize Logger with debug setting from storage.
 * Runs async — logs before init completes use the default (false = silent).
 */
MARKUP_LOGGER.init();

/**
 * Maximum number of recent files to track.
 * @type {number}
 */
const MAX_RECENT_FILES = 10;

// --- Lifecycle Events ---

/**
 * Fired when the extension is first installed, updated, or Chrome is updated.
 */
chrome.runtime.onInstalled.addListener((details) => {
  MARKUP_LOGGER.debug('ServiceWorker', 'Installed.', `Reason: ${details.reason}`);
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

  // Gate: enabled — if disabled, skip dynamic injection (Step 9.3)
  // Uses a Promise-based check; wrapping in an async IIFE
  (async () => {
    try {
      const enabled = await settingsStorage.get('enabled');
      if (enabled === false) {
        MARKUP_LOGGER.debug('ServiceWorker', 'MarkUp is disabled. Skipping dynamic injection for:', tab.url);
        return;
      }
    } catch (err) {
      // On error, default to injecting (fail-open)
      console.warn('MarkUp: Failed to check enabled setting:', err);
    }

    // Dynamically inject the content script
    MARKUP_LOGGER.debug('ServiceWorker', 'Dynamic injection for:', tab.url);

  chrome.scripting.executeScript(
    {
      target: { tabId: tabId },
      files: [
        'vendor/marked.min.js',
        'vendor/highlight.min.js',
        'utils/constants.js',
        'utils/dom-helpers.js',
        'utils/sanitizer.js',
        'utils/logger.js',
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
      MARKUP_LOGGER.debug('ServiceWorker', 'Content script injected into tab', tabId);
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
  })(); // End of async autoDetect IIFE
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
  MARKUP_LOGGER.debug('ServiceWorker', 'Received ping from', sender.tab ? sender.tab.url : 'extension');
  return { status: 'pong', timestamp: Date.now() };
});

/**
 * Handle 'GET_RECENT_FILES' action — returns the list of recently opened files.
 */
messageBus.listen('GET_RECENT_FILES', async (payload, sender) => {
  try {
    const files = await _getRecentFiles();
    return { files: files };
  } catch (err) {
    console.warn('MarkUp: Failed to get recent files:', err);
    return { files: [] };
  }
});

/**
 * Handle 'ADD_RECENT_FILE' action — adds a file to the recent files list.
 */
messageBus.listen('ADD_RECENT_FILE', async (payload, sender) => {
  if (!payload || !payload.url) {
    return { success: false, error: 'No URL provided' };
  }
  try {
    await _addRecentFile(payload.url, payload.title || '');
    return { success: true };
  } catch (err) {
    console.warn('MarkUp: Failed to add recent file:', err);
    return { success: false, error: err.message };
  }
});

/**
 * Handle 'APPLY_THEME' action — relay to active tabs (from popup/options to content script).
 */
messageBus.listen('APPLY_THEME', async (payload, sender) => {
  // Relay theme change to all Markdown tabs
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && fileDetector.isMarkdownUrl(tab.url || '')) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_THEME', payload: payload }).catch(() => {});
      }
    }
  } catch (err) {
    MARKUP_LOGGER.debug('ServiceWorker', 'Theme relay attempted.');
  }
  return { success: true };
});

/**
 * Handle 'APPLY_FONT_SIZE' action — relay to active Markdown tabs.
 */
messageBus.listen('APPLY_FONT_SIZE', async (payload, sender) => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && fileDetector.isMarkdownUrl(tab.url || '')) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_FONT_SIZE', payload: payload }).catch(() => {});
      }
    }
  } catch (err) {
    MARKUP_LOGGER.debug('ServiceWorker', 'Font size relay attempted.');
  }
  return { success: true };
});

/**
 * Handle 'APPLY_LINE_HEIGHT' action — relay to active Markdown tabs.
 */
messageBus.listen('APPLY_LINE_HEIGHT', async (payload, sender) => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && fileDetector.isMarkdownUrl(tab.url || '')) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_LINE_HEIGHT', payload: payload }).catch(() => {});
      }
    }
  } catch (err) {
    MARKUP_LOGGER.debug('ServiceWorker', 'Line height relay attempted.');
  }
  return { success: true };
});

/**
 * Handle 'APPLY_FONT_FAMILY' action — relay to active Markdown tabs.
 */
messageBus.listen('APPLY_FONT_FAMILY', async (payload, sender) => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && fileDetector.isMarkdownUrl(tab.url || '')) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_FONT_FAMILY', payload: payload }).catch(() => {});
      }
    }
  } catch (err) {
    MARKUP_LOGGER.debug('ServiceWorker', 'Font family relay attempted.');
  }
  return { success: true };
});

/**
 * Handle 'APPLY_ENABLED' action — relay to active Markdown tabs.
 */
messageBus.listen('APPLY_ENABLED', async (payload, sender) => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && fileDetector.isMarkdownUrl(tab.url || '')) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_ENABLED', payload: payload }).catch(() => {});
      }
    }
  } catch (err) {
    MARKUP_LOGGER.debug('ServiceWorker', 'Enabled relay attempted.');
  }
  return { success: true };
});

/**
 * Handle 'APPLY_DEBUG_LOG' action — update own Logger state and relay to active Markdown tabs.
 */
messageBus.listen('APPLY_DEBUG_LOG', async (payload, sender) => {
  // Update service worker's own Logger state
  MARKUP_LOGGER.setEnabled(payload?.debugLog === true);
  // Relay to all Markdown tabs
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && fileDetector.isMarkdownUrl(tab.url || '')) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_DEBUG_LOG', payload: payload }).catch(() => {});
      }
    }
  } catch (err) {
    // Silent — don't log relay attempts for the logger itself
  }
  return { success: true };
});

/**
 * Handle 'APPLY_EXTENSIONS' action — update FileDetector patterns and relay to tabs.
 * Broadcasts to ALL tabs (not filtered) since new extensions may match previously-unmatched tabs.
 */
messageBus.listen('APPLY_EXTENSIONS', async (payload, sender) => {
  // Update service worker's own FileDetector patterns
  if (payload && typeof payload.extensions === 'string') {
    fileDetector.setCustomExtensions(payload.extensions);
    MARKUP_LOGGER.debug('ServiceWorker', 'Custom extensions updated:', payload.extensions);
  }
  // Relay to all open tabs (future-proofing for content script awareness)
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_EXTENSIONS', payload: payload }).catch(() => {});
      }
    }
  } catch (err) {
    MARKUP_LOGGER.debug('ServiceWorker', 'Extensions relay attempted.');
  }
  return { success: true };
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

// --- Recent Files Management ---

/**
 * Get the list of recently opened Markdown files.
 *
 * @returns {Promise<Array<{url: string, title: string, timestamp: number}>>}
 * @private
 */
async function _getRecentFiles() {
  try {
    const files = await recentStorage.get('recentFiles');
    if (Array.isArray(files)) {
      return files;
    }
    return [];
  } catch (err) {
    console.warn('MarkUp: Failed to retrieve recent files:', err);
    return [];
  }
}

/**
 * Add a file to the recent files list.
 * Maintains a capped FIFO list of MAX_RECENT_FILES entries.
 * Deduplicates by URL (updates timestamp if already present).
 *
 * @param {string} url - The file URL.
 * @param {string} title - The document title.
 * @returns {Promise<void>}
 * @private
 */
async function _addRecentFile(url, title) {
  try {
    let files = await _getRecentFiles();

    // Remove existing entry for this URL (dedup)
    files = files.filter(f => f.url !== url);

    // Add new entry at the beginning
    files.unshift({
      url: url,
      title: title,
      timestamp: Date.now(),
    });

    // Cap the list
    if (files.length > MAX_RECENT_FILES) {
      files = files.slice(0, MAX_RECENT_FILES);
    }

    await recentStorage.set('recentFiles', files);
  } catch (err) {
    console.warn('MarkUp: Failed to save recent file:', err);
  }
}
