/**
 * MarkUp — Logger Utility
 *
 * Centralized logging utility that gates debug output behind the
 * `debugLog` storage setting. Warnings and errors always output
 * regardless of the toggle.
 *
 * Usage:
 *   Logger.debug('ContentScript', 'Rendering complete');
 *   Logger.warn('ThemeManager', 'Failed to persist theme:', err);
 *   Logger.error('Parser', 'Parse error:', error);
 *
 * Output format:
 *   [MarkUp:ContentScript] Rendering complete
 *
 * The `_enabled` flag is cached and refreshed via:
 *   - Logger.init()        — reads from StorageManager on startup
 *   - Logger.setEnabled()  — called by APPLY_DEBUG_LOG MessageBus handler
 */

'use strict';

/**
 * @class Logger
 * Static logger class — all methods are static, no instantiation needed.
 */
class Logger {
  /** @private {boolean} Cached debug-enabled flag. Default: false (silent). */
  static _enabled = false;

  /** @private {boolean} Whether init() has been called. */
  static _initialized = false;

  /**
   * Initialize the Logger by reading the `debugLog` setting from storage.
   * Should be called once at startup after StorageManager is available.
   *
   * @returns {Promise<void>}
   */
  static async init() {
    try {
      const StorageManagerClass = (typeof MARKUP_STORAGE_MANAGER !== 'undefined')
        ? MARKUP_STORAGE_MANAGER
        : null;

      if (StorageManagerClass) {
        const storage = new StorageManagerClass();
        const debugLog = await storage.get('debugLog');
        Logger._enabled = debugLog === true;
      }
    } catch (err) {
      // Silently fail — default to disabled
      Logger._enabled = false;
    }
    Logger._initialized = true;
  }

  /**
   * Log a debug message. Only outputs when debug logging is enabled.
   *
   * @param {string} context - The module/class name for context prefix.
   * @param {...*} args - Values to log.
   */
  static debug(context, ...args) {
    if (!Logger._enabled) {
      return;
    }
    console.log(`[MarkUp:${context}]`, ...args);
  }

  /**
   * Log a warning. Always outputs regardless of debug toggle.
   *
   * @param {string} context - The module/class name for context prefix.
   * @param {...*} args - Values to log.
   */
  static warn(context, ...args) {
    console.warn(`[MarkUp:${context}]`, ...args);
  }

  /**
   * Log an error. Always outputs regardless of debug toggle.
   *
   * @param {string} context - The module/class name for context prefix.
   * @param {...*} args - Values to log.
   */
  static error(context, ...args) {
    console.error(`[MarkUp:${context}]`, ...args);
  }

  /**
   * Set the enabled flag directly. Used by APPLY_DEBUG_LOG MessageBus handler
   * for live toggling without reloading.
   *
   * @param {boolean} value - Whether debug logging should be enabled.
   */
  static setEnabled(value) {
    Logger._enabled = value === true;
  }

  /**
   * Check if debug logging is currently enabled.
   *
   * @returns {boolean}
   */
  static isEnabled() {
    return Logger._enabled;
  }
}

// Export for use in other modules
// In MV3 content scripts (non-module), accessed via global scope.
// In extension pages, included via <script> tag.
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_LOGGER = Logger;
}
