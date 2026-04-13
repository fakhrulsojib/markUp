/**
 * MarkUp — Popup Controller
 *
 * Controls the extension popup UI. Manages:
 * - Theme quick-switch
 * - Toggle switch (Enable MarkUp)
 * - Recent files list (from service worker via MessageBus)
 * - Options page link
 *
 * Runs as an extension page — has direct access to chrome.* APIs.
 * Scripts loaded via <script> tags: constants.js, StorageManager.js, MessageBus.js.
 */

'use strict';

(function popupController() {

  /** @type {StorageManager} */
  let storage = null;

  /** @type {MessageBus} */
  let messageBus = null;

  const THEMES = (typeof MARKUP_CONSTANTS !== 'undefined')
    ? MARKUP_CONSTANTS.THEMES
    : { LIGHT: 'light', DARK: 'dark', SEPIA: 'sepia' };

  /**
   * Initialize the popup on DOMContentLoaded.
   */
  document.addEventListener('DOMContentLoaded', _init);

  /**
   * Main initialization function.
   * @private
   */
  async function _init() {
    const StorageManagerClass = (typeof MARKUP_STORAGE_MANAGER !== 'undefined')
      ? MARKUP_STORAGE_MANAGER
      : null;
    const MessageBusClass = (typeof MARKUP_MESSAGE_BUS !== 'undefined')
      ? MARKUP_MESSAGE_BUS
      : null;

    if (StorageManagerClass) {
      storage = new StorageManagerClass();
    }
    if (MessageBusClass) {
      messageBus = new MessageBusClass();
    }

    const LoggerClass = (typeof MARKUP_LOGGER !== 'undefined') ? MARKUP_LOGGER : null;
    if (LoggerClass) {
      await LoggerClass.init();
    }

    await _applyThemeOnLoad();

    await _loadThemeState();
    await _loadToggleStates();
    await _loadRecentFiles();
    await _checkLastIntercepted();

    _wireThemeButtons();
    _wireToggleSwitches();
    _wireOptionsLink();
    _wireClearRecentButton();
    _wireThemeRelay();
  }

  /**
   * Load the current theme from storage and highlight the active button.
   * @private
   */
  async function _loadThemeState() {
    if (!storage) return;

    try {
      const currentTheme = await storage.get('theme') || 'light';
      _setActiveThemeButton(currentTheme);
    } catch (err) {
      console.warn('Popup: Failed to load theme:', err);
      _setActiveThemeButton('light');
    }
  }

  /**
   * Highlight the active theme button and remove active state from others.
   * @param {string} themeName - The active theme name.
   * @private
   */
  function _setActiveThemeButton(themeName) {
    const buttons = document.querySelectorAll('.markup-theme-btn');
    buttons.forEach((btn) => {
      if (btn.dataset.theme === themeName) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  /**
   * Wire click events to theme buttons.
   * @private
   */
  function _wireThemeButtons() {
    const buttons = document.querySelectorAll('.markup-theme-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', _onThemeButtonClick);
    });
  }

  /**
   * Handle theme button click.
   * @param {MouseEvent} event
   * @private
   */
  async function _onThemeButtonClick(event) {
    const btn = event.currentTarget;
    const themeName = btn.dataset.theme;

    if (!themeName) return;

    _setActiveThemeButton(themeName);
    _applyThemeToBody(themeName);

    if (storage) {
      try {
        await storage.set('theme', themeName);
      } catch (err) {
        console.warn('Popup: Failed to save theme:', err);
      }
    }

    if (messageBus) {
      try {
        await messageBus.send('APPLY_THEME', { theme: themeName });
      } catch (err) {
        const _Log = (typeof MARKUP_LOGGER !== 'undefined') ? MARKUP_LOGGER : null;
        if (_Log) { _Log.debug('Popup', 'Theme change notification sent (content script may not be active).'); }
      }
    }
  }

  /**
   * Load toggle states from storage.
   * @private
   */
  async function _loadToggleStates() {
    if (!storage) return;

    try {
      const enabled = await storage.get('enabled');
      const interceptDownloads = await storage.get('interceptDownloads');

      const enabledToggle = document.getElementById('markup-toggle-enabled');
      const interceptToggle = document.getElementById('markup-toggle-intercept');

      if (enabledToggle) {
        enabledToggle.checked = enabled !== false;
      }
      if (interceptToggle) {
        interceptToggle.checked = interceptDownloads !== false;
      }
    } catch (err) {
      console.warn('Popup: Failed to load toggle states:', err);
    }
  }

  /**
   * Wire change events to toggle switches.
   * @private
   */
  function _wireToggleSwitches() {
    const enabledToggle = document.getElementById('markup-toggle-enabled');
    const interceptToggle = document.getElementById('markup-toggle-intercept');

    if (enabledToggle) {
      enabledToggle.addEventListener('change', _onEnabledToggle);
    }
    if (interceptToggle) {
      interceptToggle.addEventListener('change', _onInterceptToggle);
    }
  }

  /**
   * Handle Enable MarkUp toggle change.
   * @param {Event} event
   * @private
   */
  async function _onEnabledToggle(event) {
    const isEnabled = event.target.checked;
    if (storage) {
      try {
        await storage.set('enabled', isEnabled);
      } catch (err) {
        console.warn('Popup: Failed to save enabled toggle:', err);
      }
    }
    if (messageBus) {
      try {
        await messageBus.send('APPLY_ENABLED', { enabled: isEnabled });
      } catch (err) {
        const _Log = (typeof MARKUP_LOGGER !== 'undefined') ? MARKUP_LOGGER : null;
        if (_Log) { _Log.debug('Popup', 'Enabled toggle notification sent.'); }
      }
    }
  }

  /**
   * Handle Render Downloads toggle change.
   * @param {Event} event
   * @private
   */
  async function _onInterceptToggle(event) {
    const isEnabled = event.target.checked;
    if (storage) {
      try {
        await storage.set('interceptDownloads', isEnabled);
      } catch (err) {
        console.warn('Popup: Failed to save intercept toggle:', err);
      }
    }
    if (messageBus) {
      try {
        await messageBus.send('APPLY_INTERCEPT_DOWNLOADS', { interceptDownloads: isEnabled });
      } catch (err) {
        const _Log = (typeof MARKUP_LOGGER !== 'undefined') ? MARKUP_LOGGER : null;
        if (_Log) { _Log.debug('Popup', 'Intercept toggle notification sent.'); }
      }
    }
  }

  /**
   * Check for recently intercepted downloads and show notification.
   * @private
   */
  async function _checkLastIntercepted() {
    if (!messageBus) return;

    try {
      const response = await messageBus.send('GET_LAST_INTERCEPTED');
      if (response && response.filename) {
        _showInterceptNotice(response.filename);
      }
    } catch (err) {
    }
  }

  /**
   * Show an ephemeral notification about an intercepted download.
   * @param {string} filename - The intercepted filename.
   * @private
   */
  function _showInterceptNotice(filename) {
    const noticeEl = document.getElementById('markup-popup-intercept-notice');
    if (!noticeEl) return;

    noticeEl.textContent = '📥 Rendered ' + filename + ' instead of downloading';
    noticeEl.classList.remove('hidden');
    noticeEl.classList.add('visible');

    setTimeout(() => {
      noticeEl.classList.remove('visible');
      noticeEl.classList.add('fade-out');
      setTimeout(() => {
        noticeEl.classList.add('hidden');
        noticeEl.classList.remove('fade-out');
      }, 300);
    }, 5000);
  }

  /**
   * Load recent files from the service worker via MessageBus.
   * @private
   */
  async function _loadRecentFiles() {
    if (!messageBus) return;

    try {
      const response = await messageBus.send('GET_RECENT_FILES');
      if (response && Array.isArray(response.files)) {
        _renderRecentFiles(response.files.slice(0, 5));
      }
    } catch (err) {
      const _Log = (typeof MARKUP_LOGGER !== 'undefined') ? MARKUP_LOGGER : null;
      if (_Log) { _Log.debug('Popup', 'Could not load recent files:', err.message); }
    }
  }

  /**
   * Render the recent files list in the popup.
   * @param {Array<{url: string, title: string, timestamp: number}>} files
   * @private
   */
  function _renderRecentFiles(files) {
    const listEl = document.getElementById('markup-recent-list');
    if (!listEl) return;

    while (listEl.firstChild) {
      listEl.removeChild(listEl.firstChild);
    }

    if (!files || files.length === 0) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'markup-recent-empty';
      emptyLi.textContent = 'No recent files';
      listEl.appendChild(emptyLi);
      return;
    }

    files.forEach((file) => {
      const li = document.createElement('li');

      const link = document.createElement('a');
      link.className = 'markup-recent-link';
      link.href = file.url;
      link.title = file.url;
      link.addEventListener('click', _onRecentFileClick);

      const titleSpan = document.createElement('span');
      titleSpan.className = 'markup-recent-title';
      titleSpan.textContent = file.title || _extractFileName(file.url);

      const urlSpan = document.createElement('span');
      urlSpan.className = 'markup-recent-url';
      urlSpan.textContent = _shortenUrl(file.url);

      const timeSpan = document.createElement('span');
      timeSpan.className = 'markup-recent-time';
      timeSpan.textContent = _formatTimestamp(file.timestamp);

      link.appendChild(titleSpan);
      link.appendChild(urlSpan);
      link.appendChild(timeSpan);
      li.appendChild(link);
      listEl.appendChild(li);
    });
  }

  /**
   * Handle recent file click — open in a new tab.
   * @param {MouseEvent} event
   * @private
   */
  function _onRecentFileClick(event) {
    event.preventDefault();
    const url = event.currentTarget.href;
    if (url) {
      chrome.tabs.create({ url: url });
    }
  }

  /**
   * Wire the clear recent files button.
   * Sends CLEAR_RECENT_FILES to the service worker and resets the list.
   * @private
   */
  function _wireClearRecentButton() {
    const btn = document.getElementById('markup-clear-recent');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (!messageBus) return;

      try {
        await messageBus.send('CLEAR_RECENT_FILES');
        _renderRecentFiles([]);
      } catch (err) {
        console.warn('Popup: Failed to clear recent files:', err);
      }
    });
  }

  /**
   * Wire the options page link.
   * @private
   */
  function _wireOptionsLink() {
    const optionsLink = document.getElementById('markup-open-options');
    if (optionsLink) {
      optionsLink.addEventListener('click', _onOptionsClick);
    }
  }

  /**
   * Open the options page.
   * @param {MouseEvent} event
   * @private
   */
  function _onOptionsClick(event) {
    event.preventDefault();
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  }

  /**
   * Apply the persisted theme to the popup body on load.
   * Reads the theme from storage and applies the CSS class.
   * Also removes the flash-prevention loading class.
   * @private
   */
  async function _applyThemeOnLoad() {
    let themeName = 'light';

    if (storage) {
      try {
        const savedTheme = await storage.get('theme');
        if (savedTheme && typeof savedTheme === 'string') {
          themeName = savedTheme;
        }
      } catch (err) {
      }
    }

    _applyThemeToBody(themeName);

    document.body.classList.remove('markup-theme-loading');
  }

  /**
   * Apply a theme class to the popup body.
   * Removes all existing theme classes and adds the new one.
   * @param {string} themeName - The theme to apply.
   * @private
   */
  function _applyThemeToBody(themeName) {
    document.body.classList.remove('markup-theme-light', 'markup-theme-dark', 'markup-theme-sepia');
    document.body.classList.add('markup-theme-' + themeName);
  }

  /**
   * Wire MessageBus listener for live APPLY_THEME relay.
   * When the options page or content script changes the theme,
   * the popup (if open) updates to match.
   * @private
   */
  function _wireThemeRelay() {
    if (!messageBus) return;

    messageBus.listen('APPLY_THEME', (payload) => {
      if (payload && payload.theme) {
        _applyThemeToBody(payload.theme);
        _setActiveThemeButton(payload.theme);
      }
      return { success: true };
    });
  }

  /**
   * Extract filename from a URL.
   * @param {string} url
   * @returns {string}
   * @private
   */
  function _extractFileName(url) {
    try {
      const pathname = new URL(url).pathname;
      const parts = pathname.split('/');
      return decodeURIComponent(parts[parts.length - 1] || 'Untitled');
    } catch {
      return 'Untitled';
    }
  }

  /**
   * Shorten a URL for display.
   * @param {string} url
   * @returns {string}
   * @private
   */
  function _shortenUrl(url) {
    if (!url) return '';
    // Remove protocol
    let shortened = url.replace(/^(https?:\/\/|file:\/\/\/)/, '');
    // Truncate if too long
    if (shortened.length > 45) {
      shortened = shortened.substring(0, 20) + '…' + shortened.substring(shortened.length - 22);
    }
    return shortened;
  }

  /**
   * Format a timestamp as relative time.
   * @param {number} timestamp
   * @returns {string}
   * @private
   */
  function _formatTimestamp(timestamp) {
    if (!timestamp) return '';

    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(timestamp).toLocaleDateString();
  }

})();
