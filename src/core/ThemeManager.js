/**
 * MarkUp — ThemeManager
 *
 * Manages theme state, switching, and persistence for the MarkUp extension.
 * Applies theme-specific CSS classes to the .markup-content element and
 * persists the user's preference via StorageManager.
 *
 * Dependencies:
 *   - MARKUP_CONSTANTS (constants.js) — THEMES, EVENTS, DEFAULTS
 *   - StorageManager instance — for theme persistence
 *   - EventEmitter instance — for broadcasting theme change events
 *
 * @class ThemeManager
 */

'use strict';

class ThemeManager {
  /**
   * Create a ThemeManager instance.
   *
   * @param {StorageManager} storageManager - An instance of StorageManager for persistence.
   * @param {EventEmitter} [eventEmitter=null] - An optional EventEmitter for broadcasting events.
   */
  constructor(storageManager, eventEmitter = null) {
    if (!storageManager) {
      throw new TypeError('ThemeManager requires a StorageManager instance');
    }

    /** @private */
    this._storageManager = storageManager;

    /** @private */
    this._eventEmitter = eventEmitter;

    /** @private @type {string|null} */
    this._currentTheme = null;

    /** @private @type {HTMLElement|null} */
    this._rootElement = null;

    /** @private @type {string} */
    this._themeClassPrefix = 'markup-theme-';

    // Load constants
    const constants =
      typeof MARKUP_CONSTANTS !== 'undefined' ? MARKUP_CONSTANTS : null;

    /**
     * Valid theme enum values.
     * @private @type {Object}
     */
    this._THEMES = constants ? constants.THEMES : { LIGHT: 'light', DARK: 'dark', SEPIA: 'sepia' };

    /**
     * Event name constants.
     * @private @type {Object}
     */
    this._EVENTS = constants ? constants.EVENTS : { THEME_CHANGED: 'theme:changed' };

    /**
     * Default values.
     * @private @type {Object}
     */
    this._DEFAULTS = constants ? constants.DEFAULTS : { THEME: 'light' };
  }

  /**
   * Initialize the ThemeManager by loading the persisted theme from storage
   * and applying it to the DOM. If no persisted theme is found, the default
   * theme (light) is applied.
   *
   * This method should be called after the .markup-content element is rendered.
   *
   * @returns {Promise<void>}
   */
  async init() {
    try {
      const savedTheme = await this._storageManager.get('theme');
      const theme = this._isValidTheme(savedTheme) ? savedTheme : this._DEFAULTS.THEME;
      this.applyTheme(theme);
    } catch (err) {
      console.warn('ThemeManager: Failed to load persisted theme, using default:', err);
      this.applyTheme(this._DEFAULTS.THEME);
    }
  }

  /**
   * Apply a theme by name. Validates the theme, removes any existing theme
   * classes, adds the new one, persists the choice, and emits an event.
   *
   * @param {string} themeName - The theme to apply ('light', 'dark', or 'sepia').
   * @returns {void}
   */
  applyTheme(themeName) {
    if (!this._isValidTheme(themeName)) {
      console.warn(
        `ThemeManager: Invalid theme "${themeName}". Valid themes: ${this.getAvailableThemes().join(', ')}`
      );
      return;
    }

    const root = this._resolveRootElement();
    if (!root) {
      console.warn('ThemeManager: Cannot apply theme — root element not found');
      return;
    }

    this._removeAllThemeClasses(root);

    root.classList.add(`${this._themeClassPrefix}${themeName}`);

    this._currentTheme = themeName;

    // Also update the body class for the body reset in content.css
    // AND for body-level CSS custom properties (used by fixed-position UI chrome)
    if (document.body) {
      if (!document.body.classList.contains('markup-body')) {
        document.body.classList.add('markup-body');
      }
      this._removeAllThemeClasses(document.body);
      document.body.classList.add(`${this._themeClassPrefix}${themeName}`);
    }

    try {
      this._storageManager.set('theme', themeName).catch((err) => {
        console.warn('ThemeManager: Failed to persist theme:', err);
      });
    } catch (err) {
      console.warn('ThemeManager: Failed to persist theme:', err);
    }

    if (this._eventEmitter) {
      try {
        this._eventEmitter.emit(this._EVENTS.THEME_CHANGED, {
          theme: themeName,
          previousTheme: this._currentTheme,
        });
      } catch (err) {
        console.warn('ThemeManager: Failed to emit theme change event:', err);
      }
    }

    const _Log = (typeof MARKUP_LOGGER !== 'undefined') ? MARKUP_LOGGER : null;
    if (_Log) { _Log.debug('ThemeManager', `Applied theme "${themeName}"`); }
  }

  /**
   * Get the currently active theme name.
   *
   * @returns {string|null} The current theme name, or null if not initialized.
   */
  getTheme() {
    return this._currentTheme;
  }

  /**
   * Get a list of all available theme names.
   *
   * @returns {string[]} Array of theme name strings.
   */
  getAvailableThemes() {
    return Object.values(this._THEMES);
  }

  // --- Private Methods ---

  /**
   * Check if a theme name is valid (exists in the THEMES enum).
   *
   * @param {string} name - The theme name to validate.
   * @returns {boolean} True if valid.
   * @private
   */
  _isValidTheme(name) {
    if (typeof name !== 'string') {
      return false;
    }
    return Object.values(this._THEMES).includes(name);
  }

  /**
   * Find and cache the root element for theme class application.
   * Uses the .markup-content article element created by HtmlRenderer.
   * Falls back to document.documentElement if not found.
   *
   * @returns {HTMLElement|null} The root element, or null if unavailable.
   * @private
   */
  _resolveRootElement() {
    if (this._rootElement && this._rootElement.isConnected) {
      return this._rootElement;
    }

    this._rootElement =
      document.querySelector('.markup-content') || document.documentElement;

    return this._rootElement;
  }

  /**
   * Remove all theme classes from the given element.
   *
   * @param {HTMLElement} element - The element to clean.
   * @private
   */
  _removeAllThemeClasses(element) {
    const themes = this.getAvailableThemes();
    for (const theme of themes) {
      element.classList.remove(`${this._themeClassPrefix}${theme}`);
    }
  }
}

// Export for use across extension contexts
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_THEME_MANAGER = ThemeManager;
}
