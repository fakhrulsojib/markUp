/**
 * MarkUp — ToolbarComponent
 *
 * Floating toolbar UI that provides quick access to all MarkUp features.
 * Extends BaseComponent and renders a fixed-position button bar.
 *
 * Buttons: TOC toggle, Theme cycle, Search toggle, Print, Settings.
 * Each button emits an event via EventEmitter — does NOT directly
 * call other classes (decoupled by design).
 *
 * Features:
 * - Auto-hides on scroll down, reveals on scroll up (configurable)
 * - Smooth fade animation on show/hide
 * - All DOM built via _createElement / MARKUP_DOM_HELPERS
 *
 * @class ToolbarComponent
 * @extends BaseComponent
 */

'use strict';

class ToolbarComponent extends BaseComponent {
  /**
   * Create a ToolbarComponent instance.
   *
   * @param {EventEmitter} eventEmitter - EventEmitter for broadcasting button events.
   * @param {Object} [options={}] - Configuration options.
   * @param {boolean} [options.autoHide=true] - Auto-hide on scroll down.
   * @param {string} [options.position='top-right'] - Toolbar position.
   */
  constructor(eventEmitter, options = {}) {
    const prefix = (typeof MARKUP_CONSTANTS !== 'undefined')
      ? MARKUP_CONSTANTS.CSS_PREFIX
      : 'markup';

    super(`${prefix}-toolbar`);

    if (!eventEmitter) {
      throw new TypeError('ToolbarComponent requires an EventEmitter instance');
    }

    /** @private */
    this._emitter = eventEmitter;

    /** @private */
    this._prefix = prefix;

    /** @private */
    this._autoHide = options.autoHide !== false;

    /** @private */
    this._position = options.position || 'top-right';

    /** @private @type {number} */
    this._lastScrollY = 0;

    /** @private @type {boolean} */
    this._isHiddenByScroll = false;

    // Load event constants
    const constants = (typeof MARKUP_CONSTANTS !== 'undefined') ? MARKUP_CONSTANTS : null;
    /** @private */
    this._EVENTS = constants ? constants.EVENTS : {
      TOC_TOGGLED: 'tocToggled',
      THEME_CHANGED: 'themeChanged',
      SEARCH_TOGGLED: 'searchToggled',
      PRINT_REQUESTED: 'printRequested',
      SETTINGS_TOGGLED: 'settingsToggled',
    };

    // Bound handlers for proper cleanup
    /** @private */
    this._boundOnScroll = this._onScroll.bind(this);

    /** @private @type {Object.<string, Function>} */
    this._buttonHandlers = {};
  }

  /**
   * Mount the toolbar into a parent element.
   *
   * @param {HTMLElement} parentElement - The DOM element to mount into.
   */
  mount(parentElement) {
    if (this._mounted) {
      return;
    }

    if (!parentElement) {
      console.warn('ToolbarComponent: Cannot mount — parent element is null');
      return;
    }

    // Build the toolbar DOM
    this._element = this._buildToolbar();

    // Append to parent
    parentElement.appendChild(this._element);

    // Attach scroll listener for auto-hide
    if (this._autoHide) {
      window.addEventListener('scroll', this._boundOnScroll, { passive: true });
    }

    this._mounted = true;
  }

  /**
   * Unmount the toolbar from the DOM. Removes all event listeners.
   */
  unmount() {
    if (!this._mounted) {
      return;
    }

    // Remove scroll listener
    window.removeEventListener('scroll', this._boundOnScroll);

    // Remove the toolbar element from the DOM
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }

    this._element = null;
    this._mounted = false;
    this._buttonHandlers = {};
  }

  // --- Private Methods ---

  /**
   * Build the toolbar DOM structure.
   *
   * @returns {HTMLElement} The toolbar root element.
   * @private
   */
  _buildToolbar() {
    const p = this._prefix;

    // Define buttons
    const buttonDefs = [
      { id: 'toc',      label: 'Table of Contents', icon: '☰', event: this._EVENTS.TOC_TOGGLED },
      { id: 'theme',    label: 'Toggle Theme',      icon: '◑', event: this._EVENTS.THEME_CHANGED },
      { id: 'search',   label: 'Search',            icon: '⌕', event: this._EVENTS.SEARCH_TOGGLED },
      { id: 'print',    label: 'Print',             icon: '🖨', event: this._EVENTS.PRINT_REQUESTED },
      { id: 'settings', label: 'Settings',          icon: '⚙', event: this._EVENTS.SETTINGS_TOGGLED },
    ];

    const buttons = buttonDefs.map((def) => {
      const handler = this._createButtonHandler(def.event);
      this._buttonHandlers[def.id] = handler;

      const attrs = {
        classList: [`${p}-toolbar-btn`, `${p}-toolbar-btn-${def.id}`],
        'aria-label': def.label,
        title: def.label,
        'data-action': def.id,
        tabindex: '0',
        events: { click: handler },
      };

      // Add aria-expanded for toggle buttons
      if (def.id === 'toc' || def.id === 'search' || def.id === 'settings') {
        attrs['aria-expanded'] = 'false';
      }

      return this._createElement('button', attrs, [def.icon]);
    });

    const toolbar = this._createElement('div', {
      classList: [`${p}-toolbar`],
      id: this._id,
      'role': 'toolbar',
      'aria-label': 'MarkUp Toolbar',
    }, buttons);

    return toolbar;
  }

  /**
   * Create a click handler for a toolbar button that emits the given event.
   *
   * @param {string} eventName - The event to emit on click.
   * @returns {Function} The click handler.
   * @private
   */
  _createButtonHandler(eventName) {
    return (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._emitter.emit(eventName);
    };
  }

  /**
   * Handle scroll events for auto-hide behavior.
   * Hides toolbar on scroll down, reveals on scroll up.
   *
   * @private
   */
  _onScroll() {
    if (!this._element || !this._autoHide) {
      return;
    }

    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - this._lastScrollY;

    // Scroll down → hide
    if (scrollDelta > 10 && !this._isHiddenByScroll) {
      this._element.classList.add(`${this._prefix}-toolbar-hidden`);
      this._isHiddenByScroll = true;
    }

    // Scroll up → reveal
    if (scrollDelta < -10 && this._isHiddenByScroll) {
      this._element.classList.remove(`${this._prefix}-toolbar-hidden`);
      this._isHiddenByScroll = false;
    }

    // At top of page → always show
    if (currentScrollY <= 0) {
      this._element.classList.remove(`${this._prefix}-toolbar-hidden`);
      this._isHiddenByScroll = false;
    }

    this._lastScrollY = currentScrollY;
  }
}

// Export for use across extension contexts
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_TOOLBAR_COMPONENT = ToolbarComponent;
}
