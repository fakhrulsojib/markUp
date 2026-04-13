/**
 * MarkUp — Options Page Controller
 *
 * Controls the full settings page. Manages:
 * - Appearance settings (theme, font size, line height, font family)
 * - Behavior settings (auto-render, file extensions)
 * - Advanced settings (CSP mode, debug logging)
 * - Reset to defaults
 *
 * All settings are persisted via StorageManager and content scripts
 * are notified via MessageBus.
 */

'use strict';

(function optionsController() {

  /** @type {StorageManager} */
  let storage = null;

  /** @type {MessageBus} */
  let messageBus = null;

  const DEFAULTS = (typeof MARKUP_CONSTANTS !== 'undefined')
    ? MARKUP_CONSTANTS.DEFAULTS
    : { THEME: 'light', FONT_SIZE: 16, LINE_HEIGHT: 1.6, FONT_FAMILY: 'system-ui' };

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
    const LoggerClass = (typeof MARKUP_LOGGER !== 'undefined')
      ? MARKUP_LOGGER
      : null;

    if (StorageManagerClass) {
      storage = new StorageManagerClass();
    }
    if (MessageBusClass) {
      messageBus = new MessageBusClass();
    }

    if (LoggerClass) {
      await LoggerClass.init();
    }

    await _applyThemeOnLoad();

    await _loadAllSettings();

    _wireAppearanceControls();
    _wireBehaviorControls();
    _wireAdvancedControls();
    _wireResetButton();
    _wireThemeRelay();
  }

  /**
   * Load all settings from storage and populate the UI.
   * @private
   */
  async function _loadAllSettings() {
    if (!storage) return;

    try {
      const theme = await storage.get('theme') || DEFAULTS.THEME;
      const fontSize = await storage.get('fontSize') || DEFAULTS.FONT_SIZE;
      const lineHeight = await storage.get('lineHeight') || DEFAULTS.LINE_HEIGHT;
      const fontFamily = await storage.get('fontFamily') || DEFAULTS.FONT_FAMILY;

      _setSelectValue('markup-opt-theme', theme);
      _setRangeValue('markup-opt-fontsize', fontSize, 'markup-opt-fontsize-value', v => `${v}`);
      _setRangeValue('markup-opt-lineheight', lineHeight, 'markup-opt-lineheight-value', v => `${v}`);
      _setSelectValue('markup-opt-fontfamily', fontFamily);

      const enabled = await storage.get('enabled');
      const interceptDownloads = await storage.get('interceptDownloads');
      const extensions = await storage.get('extensions');

      const enabledEl = document.getElementById('markup-opt-enabled');
      if (enabledEl) enabledEl.checked = enabled !== false;

      const interceptEl = document.getElementById('markup-opt-intercept-downloads');
      if (interceptEl) interceptEl.checked = interceptDownloads !== false;

      const extensionsEl = document.getElementById('markup-opt-extensions');
      if (extensionsEl && extensions) extensionsEl.value = extensions;

      const cspStrict = await storage.get('cspStrict');
      const debugLog = await storage.get('debugLog');

      const cspEl = document.getElementById('markup-opt-csp-strict');
      if (cspEl) cspEl.checked = cspStrict === true;

      const debugEl = document.getElementById('markup-opt-debug');
      if (debugEl) debugEl.checked = debugLog === true;

    } catch (err) {
      console.warn('Options: Failed to load settings:', err);
    }
  }

  /**
   * Wire appearance control events.
   * @private
   */
  function _wireAppearanceControls() {
    _wireSelect('markup-opt-theme', async (value) => {
      await _saveSetting('theme', value);
      _applyThemeToBody(value);
      await _notifyContentScript('APPLY_THEME', { theme: value });
    });

    _wireRange('markup-opt-fontsize', 'markup-opt-fontsize-value', v => `${v}`, async (value) => {
      const numValue = parseInt(value, 10);
      await _saveSetting('fontSize', numValue);
      await _notifyContentScript('APPLY_FONT_SIZE', { fontSize: numValue });
    });

    _wireRange('markup-opt-lineheight', 'markup-opt-lineheight-value', v => `${v}`, async (value) => {
      const numValue = parseFloat(value);
      await _saveSetting('lineHeight', numValue);
      await _notifyContentScript('APPLY_LINE_HEIGHT', { lineHeight: numValue });
    });

    _wireSelect('markup-opt-fontfamily', async (value) => {
      await _saveSetting('fontFamily', value);
      await _notifyContentScript('APPLY_FONT_FAMILY', { fontFamily: value });
    });
  }

  /**
   * Wire behavior control events.
   * @private
   */
  function _wireBehaviorControls() {
    _wireToggle('markup-opt-enabled', async (checked) => {
      await _saveSetting('enabled', checked);
      await _notifyContentScript('APPLY_ENABLED', { enabled: checked });
    });

    _wireToggle('markup-opt-intercept-downloads', async (checked) => {
      await _saveSetting('interceptDownloads', checked);
      await _notifyContentScript('APPLY_INTERCEPT_DOWNLOADS', { interceptDownloads: checked });
    });

    const extensionsEl = document.getElementById('markup-opt-extensions');
    if (extensionsEl) {
      extensionsEl.addEventListener('change', async () => {
        await _saveSetting('extensions', extensionsEl.value);
        await _notifyContentScript('APPLY_EXTENSIONS', { extensions: extensionsEl.value });
      });
    }
  }

  /**
   * Wire advanced control events.
   * @private
   */
  function _wireAdvancedControls() {
    _wireToggle('markup-opt-csp-strict', async (checked) => {
      await _saveSetting('cspStrict', checked);
      await _notifyContentScript('APPLY_CSP_STRICT', { cspStrict: checked });
    });

    _wireToggle('markup-opt-debug', async (checked) => {
      await _saveSetting('debugLog', checked);
      await _notifyContentScript('APPLY_DEBUG_LOG', { debugLog: checked });
    });
  }

  /**
   * Wire the reset button.
   * @private
   */
  function _wireResetButton() {
    const resetBtn = document.getElementById('markup-opt-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', _onReset);
    }
  }

  /**
   * Reset all settings to defaults.
   * @param {MouseEvent} event
   * @private
   */
  async function _onReset(event) {
    if (!storage) return;

    try {
      await storage.set('theme', DEFAULTS.THEME);
      await storage.set('fontSize', DEFAULTS.FONT_SIZE);
      await storage.set('lineHeight', DEFAULTS.LINE_HEIGHT);
      await storage.set('fontFamily', DEFAULTS.FONT_FAMILY);
      await storage.set('enabled', true);
      await storage.set('interceptDownloads', true);
      await storage.set('extensions', '');
      await storage.set('cspStrict', false);
      await storage.set('debugLog', false);

      await _loadAllSettings();
      _applyThemeToBody(DEFAULTS.THEME);
      _showSaveStatus();
    } catch (err) {
      console.warn('Options: Failed to reset settings:', err);
    }
  }

  /**
   * Save a single setting to storage and show feedback.
   * @param {string} key
   * @param {*} value
   * @private
   */
  async function _saveSetting(key, value) {
    if (!storage) return;
    try {
      await storage.set(key, value);
      _showSaveStatus();
    } catch (err) {
      console.warn(`Options: Failed to save ${key}:`, err);
    }
  }

  /**
   * Notify the content script of a setting change.
   * @param {string} action
   * @param {Object} payload
   * @private
   */
  async function _notifyContentScript(action, payload) {
    if (!messageBus) return;
    try {
      await messageBus.send(action, payload);
    } catch (err) {
      const LoggerRef = (typeof MARKUP_LOGGER !== 'undefined') ? MARKUP_LOGGER : null;
      if (LoggerRef) {
        LoggerRef.debug('Options', `Notification ${action} sent.`);
      }
    }
  }

  /**
   * Apply the persisted theme to the options page body on load.
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
   * Apply a theme class to the options page body.
   * @param {string} themeName - The theme to apply.
   * @private
   */
  function _applyThemeToBody(themeName) {
    document.body.classList.remove('markup-theme-light', 'markup-theme-dark', 'markup-theme-sepia');
    document.body.classList.add('markup-theme-' + themeName);
  }

  /**
   * Wire MessageBus listener for live APPLY_THEME relay.
   * When the popup or content script changes the theme,
   * the options page updates to match.
   * @private
   */
  function _wireThemeRelay() {
    if (!messageBus) return;

    messageBus.listen('APPLY_THEME', (payload) => {
      if (payload && payload.theme) {
        _applyThemeToBody(payload.theme);
        _setSelectValue('markup-opt-theme', payload.theme);
      }
      return { success: true };
    });
  }

  // --- Helpers ---

  /**
   * Show the "Saved" status bar briefly.
   * @private
   */
  function _showSaveStatus() {
    const statusEl = document.getElementById('markup-options-status');
    if (!statusEl) return;

    statusEl.classList.remove('hidden');
    statusEl.classList.add('visible');

    clearTimeout(statusEl._hideTimeout);
    statusEl._hideTimeout = setTimeout(() => {
      statusEl.classList.remove('visible');
      statusEl.classList.add('hidden');
    }, 2000);
  }

  /**
   * Set a select element's value.
   * @param {string} id
   * @param {string} value
   * @private
   */
  function _setSelectValue(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
  }

  /**
   * Set a range input's value and update its display span.
   * @param {string} inputId
   * @param {number} value
   * @param {string} displayId
   * @param {Function} formatter
   * @private
   */
  function _setRangeValue(inputId, value, displayId, formatter) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(displayId);
    if (input) input.value = value;
    if (display) display.textContent = formatter(value);
  }

  /**
   * Wire a select element to a callback.
   * @param {string} id
   * @param {Function} callback
   * @private
   */
  function _wireSelect(id, callback) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => callback(el.value));
    }
  }

  /**
   * Wire a range input to a callback with live display updates.
   * @param {string} inputId
   * @param {string} displayId
   * @param {Function} formatter
   * @param {Function} callback
   * @private
   */
  function _wireRange(inputId, displayId, formatter, callback) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(displayId);
    if (input) {
      input.addEventListener('input', () => {
        if (display) display.textContent = formatter(input.value);
      });
      input.addEventListener('change', () => {
        callback(input.value);
      });
    }
  }

  /**
   * Wire a toggle switch to a callback.
   * @param {string} id
   * @param {Function} callback
   * @private
   */
  function _wireToggle(id, callback) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => callback(el.checked));
    }
  }

})();
