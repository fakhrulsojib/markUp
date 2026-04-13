/**
 * MarkUp — KeyboardManager
 *
 * Centralized keyboard shortcut registry. Captures keydown events,
 * normalizes key combos to a canonical string format, and dispatches
 * to registered handlers.
 *
 * Combo format: modifiers sorted alphabetically + key, joined by '+'.
 * Example: "ctrl+shift+f", "ctrl+p", "alt+ctrl+d"
 *
 * @class KeyboardManager
 */

'use strict';

class KeyboardManager {
  /**
   * Create a KeyboardManager instance.
   */
  constructor() {
    /**
     * Map of normalized combo strings to handler functions.
     * @type {Map<string, Function>}
     * @private
     */
    this._bindings = new Map();

    /**
     * Whether the keyboard manager is currently listening for events.
     * @type {boolean}
     * @private
     */
    this._enabled = false;

    /**
     * Bound keydown handler for proper cleanup.
     * @type {Function}
     * @private
     */
    this._boundOnKeyDown = this._onKeyDown.bind(this);
  }

  /**
   * Register a keyboard shortcut handler.
   *
   * @param {string} combo - Shortcut combo (e.g., 'ctrl+shift+f').
   * @param {Function} handler - The function to call when the combo is pressed.
   * @returns {KeyboardManager} This instance for chaining.
   */
  register(combo, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('KeyboardManager.register(): handler must be a function');
    }

    const normalized = this._normalizeCombo(combo);
    this._bindings.set(normalized, handler);
    return this;
  }

  /**
   * Remove a keyboard shortcut handler.
   *
   * @param {string} combo - Shortcut combo to remove.
   * @returns {KeyboardManager} This instance for chaining.
   */
  unregister(combo) {
    const normalized = this._normalizeCombo(combo);
    this._bindings.delete(normalized);
    return this;
  }

  /**
   * Start listening for keyboard events.
   *
   * @returns {KeyboardManager} This instance for chaining.
   */
  enable() {
    if (!this._enabled) {
      document.addEventListener('keydown', this._boundOnKeyDown, true);
      this._enabled = true;
    }
    return this;
  }

  /**
   * Stop listening for keyboard events.
   *
   * @returns {KeyboardManager} This instance for chaining.
   */
  disable() {
    if (this._enabled) {
      document.removeEventListener('keydown', this._boundOnKeyDown, true);
      this._enabled = false;
    }
    return this;
  }

  /**
   * Check if the keyboard manager is currently enabled.
   *
   * @returns {boolean} True if enabled.
   */
  isEnabled() {
    return this._enabled;
  }

  /**
   * Get all registered shortcut combos.
   *
   * @returns {string[]} Array of normalized combo strings.
   */
  getRegisteredCombos() {
    return [...this._bindings.keys()];
  }

  /**
   * Clean up — disable and clear all bindings.
   */
  destroy() {
    this.disable();
    this._bindings.clear();
  }

  // --- Private Methods ---

  /**
   * Handle keydown events. Translates the event to a combo string
   * and dispatches to the registered handler if found.
   *
   * @param {KeyboardEvent} event - The keyboard event.
   * @private
   */
  _onKeyDown(event) {
    // Skip events in input/textarea/select elements (let normal typing work)
    const tagName = event.target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
      // Exception: allow Escape in inputs (for closing search, etc.)
      if (event.key !== 'Escape') {
        return;
      }
    }

    const combo = this._eventToCombo(event);
    const handler = this._bindings.get(combo);

    if (handler) {
      event.preventDefault();
      event.stopPropagation();
      try {
        handler(event);
      } catch (err) {
        console.error('KeyboardManager: Handler error for combo', combo, err);
      }
    }
  }

  /**
   * Convert a KeyboardEvent to a normalized combo string.
   *
   * @param {KeyboardEvent} event - The keyboard event.
   * @returns {string} Normalized combo string.
   * @private
   */
  _eventToCombo(event) {
    const parts = [];

    if (event.altKey) parts.push('alt');
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');

    let key = event.key.toLowerCase();

    if (key === 'control' || key === 'shift' || key === 'alt' || key === 'meta') {
      return '';
    }

    parts.push(key);
    return parts.join('+');
  }

  /**
   * Normalize a combo string to a canonical format.
   * Sorts modifiers alphabetically, converts to lowercase.
   *
   * @param {string} combo - Raw combo string (e.g., 'Shift+Ctrl+F').
   * @returns {string} Normalized combo string (e.g., 'ctrl+shift+f').
   * @private
   */
  _normalizeCombo(combo) {
    if (!combo || typeof combo !== 'string') {
      return '';
    }

    const parts = combo.toLowerCase().split('+').map((p) => p.trim());

    const modifiers = [];
    const keys = [];
    const modifierSet = new Set(['ctrl', 'alt', 'shift', 'meta', 'cmd']);

    for (const part of parts) {
      if (part === 'cmd' || part === 'meta') {
        modifiers.push('ctrl');
      } else if (modifierSet.has(part)) {
        modifiers.push(part);
      } else {
        keys.push(part);
      }
    }

    modifiers.sort();
    return [...modifiers, ...keys].join('+');
  }
}

// Export for use across extension contexts
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_KEYBOARD_MANAGER = KeyboardManager;
}
