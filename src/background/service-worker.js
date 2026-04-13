/**
 * MarkUp — Background Service Worker
 *
 * Event-driven service worker for the MarkUp Chrome Extension.
 * Manifest V3 compliant — no persistent background page.
 *
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
 * Load custom file extensions from storage on startup.
 * Must be async — wrapping in IIFE since top-level await isn't available.
 * Placed after settingsStorage declaration to avoid temporal dead zone.
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
  })();
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
 * Handle 'CLEAR_RECENT_FILES' action — clears the recent files list.
 */
messageBus.listen('CLEAR_RECENT_FILES', async (payload, sender) => {
  try {
    await recentStorage.set('recentFiles', []);
    MARKUP_LOGGER.debug('ServiceWorker', 'Recent files cleared.');
    return { success: true };
  } catch (err) {
    console.warn('MarkUp: Failed to clear recent files:', err);
    return { success: false };
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
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && fileDetector.isMarkdownUrl(tab.url || '')) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_THEME', payload: payload }).catch(() => {});
      }
    }
    // Also broadcast to extension pages (viewer)
    try { chrome.runtime.sendMessage({ action: 'APPLY_THEME', payload: payload }); } catch (_) {}
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
    // Also broadcast to extension pages (viewer)
    try { chrome.runtime.sendMessage({ action: 'APPLY_FONT_SIZE', payload: payload }); } catch (_) {}
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
    // Also broadcast to extension pages (viewer)
    try { chrome.runtime.sendMessage({ action: 'APPLY_LINE_HEIGHT', payload: payload }); } catch (_) {}
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
    // Also broadcast to extension pages (viewer)
    try { chrome.runtime.sendMessage({ action: 'APPLY_FONT_FAMILY', payload: payload }); } catch (_) {}
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
  MARKUP_LOGGER.setEnabled(payload?.debugLog === true);
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && fileDetector.isMarkdownUrl(tab.url || '')) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_DEBUG_LOG', payload: payload }).catch(() => {});
      }
    }
  } catch (err) {
  }
  return { success: true };
});

/**
 * Handle 'APPLY_EXTENSIONS' action — update FileDetector patterns and relay to tabs.
 */
messageBus.listen('APPLY_EXTENSIONS', async (payload, sender) => {
  if (payload && typeof payload.extensions === 'string') {
    fileDetector.setCustomExtensions(payload.extensions);
    MARKUP_LOGGER.debug('ServiceWorker', 'Custom extensions updated:', payload.extensions);
  }
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

/**
 * Handle 'APPLY_CSP_STRICT' action — relay to active Markdown tabs.
 */
messageBus.listen('APPLY_CSP_STRICT', async (payload, sender) => {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.id && fileDetector.isMarkdownUrl(tab.url || '')) {
        chrome.tabs.sendMessage(tab.id, { action: 'APPLY_CSP_STRICT', payload: payload }).catch(() => {});
      }
    }
    // Also broadcast to extension pages (viewer)
    try { chrome.runtime.sendMessage({ action: 'APPLY_CSP_STRICT', payload: payload }); } catch (_) {}
  } catch (err) {
    MARKUP_LOGGER.debug('ServiceWorker', 'CSP strict relay attempted.');
  }
  return { success: true };
});

/**
 * Handle 'APPLY_INTERCEPT_DOWNLOADS' action — consumed locally by service worker.
 */
messageBus.listen('APPLY_INTERCEPT_DOWNLOADS', async (payload, sender) => {
  MARKUP_LOGGER.debug('ServiceWorker', 'Intercept downloads setting updated:', payload?.interceptDownloads);
  return { success: true };
});

/**
 * Handle 'GET_LAST_INTERCEPTED' action — returns the most recently intercepted download info.
 */
messageBus.listen('GET_LAST_INTERCEPTED', (payload, sender) => {
  if (_lastIntercepted && (Date.now() - _lastIntercepted.timestamp < 30000)) {
    return { filename: _lastIntercepted.filename, timestamp: _lastIntercepted.timestamp };
  }
  return { filename: null };
});

// --- Download Interception (Phase 10) ---

/**
 * Ephemeral state for the last intercepted download.
 * Lives only while the service worker is alive — not persisted.
 * @type {{ filename: string, timestamp: number } | null}
 */
let _lastIntercepted = null;

/**
 * Intercept Markdown file downloads and redirect to the viewer page.
 */
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  suggest();
  _handleMarkdownDownload(downloadItem);
});

/**
 * Handle a potential Markdown download interception.
 */
async function _handleMarkdownDownload(downloadItem) {
  const downloadUrl = downloadItem.finalUrl || downloadItem.url || '';
  if (downloadUrl.startsWith('blob:') || downloadUrl.startsWith('data:')) {
    return;
  }

  if (downloadItem.byExtensionId === chrome.runtime.id) {
    return;
  }

  const filename = downloadItem.filename || '';
  if (!filename) return;

  const syntheticUrl = 'file:///test/' + filename.split('/').pop().split('\\').pop();
  if (!fileDetector.isMarkdownUrl(syntheticUrl)) {
    return;
  }

  MARKUP_LOGGER.debug('ServiceWorker', 'Markdown download detected:', filename);

  try {
    const interceptEnabled = await settingsStorage.get('interceptDownloads');
    if (interceptEnabled === false) {
      MARKUP_LOGGER.debug('ServiceWorker', 'Download interception is disabled. Allowing download.');
      return;
    }
  } catch (err) {
  }

  try {
    const enabled = await settingsStorage.get('enabled');
    if (enabled === false) {
      MARKUP_LOGGER.debug('ServiceWorker', 'MarkUp is disabled. Allowing download.');
      return;
    }
  } catch (err) {
  }

  // Check if the download origin is blocked by the user
  try {
    const localStore = new MARKUP_STORAGE_MANAGER('markup', 'local');
    const blockedSites = await localStore.get('blockedSites');
    if (Array.isArray(blockedSites)) {
      try {
        const origin = new URL(downloadUrl).origin + '/*';
        if (blockedSites.includes(origin)) {
          MARKUP_LOGGER.debug('ServiceWorker', 'Origin is blocked:', origin, '— allowing normal download.');
          return;
        }
      } catch (_) {}
    }
  } catch (err) {
  }

  try {
    await chrome.downloads.cancel(downloadItem.id);
  } catch (err) {
    MARKUP_LOGGER.debug('ServiceWorker', 'Download cancel race:', err.message);
  }

  try {
    await chrome.downloads.removeFile(downloadItem.id);
  } catch (err) {
    MARKUP_LOGGER.debug('ServiceWorker', 'Partial file cleanup:', err.message);
  }

  try {
    await chrome.downloads.erase({ id: downloadItem.id });
  } catch (err) {
    MARKUP_LOGGER.debug('ServiceWorker', 'Download erase:', err.message);
  }

  const displayFilename = filename.split('/').pop().split('\\').pop();
  const viewerUrl = chrome.runtime.getURL('viewer/viewer.html')
    + '?url=' + encodeURIComponent(downloadUrl)
    + '&filename=' + encodeURIComponent(displayFilename);

  chrome.tabs.create({ url: viewerUrl });

  const titleWithoutExt = displayFilename.replace(/\.[^.]+$/, '');
  _addRecentFile(downloadUrl, titleWithoutExt);

  _lastIntercepted = {
    filename: displayFilename,
    timestamp: Date.now(),
  };

  MARKUP_LOGGER.debug('ServiceWorker', 'Download intercepted — opened viewer for:', displayFilename);
}

// --- Utility Functions ---

/**
 * Check if a URL is already covered by the static content_scripts matches
 * defined in manifest.json.
 */
function _isCoveredByStaticMatches(url) {
  if (url.startsWith('file://') && /\.md$/i.test(url.split('?')[0].split('#')[0])) {
    return true;
  }

  if (url.startsWith('file://') && /\.markdown$/i.test(url.split('?')[0].split('#')[0])) {
    return true;
  }

  if (url.startsWith('https://raw.githubusercontent.com/')) {
    return true;
  }

  return false;
}

// --- Recent Files Management ---

/**
 * Get the list of recently opened Markdown files.
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
 */
async function _addRecentFile(url, title) {
  try {
    let files = await _getRecentFiles();

    files = files.filter(f => f.url !== url);

    files.unshift({
      url: url,
      title: title,
      timestamp: Date.now(),
    });

    if (files.length > MAX_RECENT_FILES) {
      files = files.slice(0, MAX_RECENT_FILES);
    }

    await recentStorage.set('recentFiles', files);
  } catch (err) {
    console.warn('MarkUp: Failed to save recent file:', err);
  }
}
