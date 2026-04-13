/**
 * MarkUp — ToolbarComponent
 *
 * Floating toolbar UI that provides quick access to all MarkUp features.
 * Extends BaseComponent and renders a fixed-position button bar.
 *
 * Buttons: TOC toggle, Theme cycle, Search toggle, Print, Settings, Drag handle.
 * Each button emits an event via EventEmitter — does NOT directly
 * call other classes (decoupled by design).
 *
 * Features:
 * - Auto-hides on scroll down, reveals on scroll up (configurable)
 * - Smooth fade animation on show/hide
 * - Draggable via drag handle — persists position via StorageManager
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
   * @param {StorageManager} [options.storageManager=null] - StorageManager for position persistence.
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

    /** @private @type {StorageManager|null} */
    this._storageManager = options.storageManager || null;

    /** @private @type {number} */
    this._lastScrollY = 0;

    /** @private @type {boolean} */
    this._isHiddenByScroll = false;

    /** @private @type {boolean} */
    this._isDragging = false;

    /** @private @type {number} */
    this._dragStartX = 0;

    /** @private @type {number} */
    this._dragStartY = 0;

    /** @private @type {number} */
    this._dragOffsetX = 0;

    /** @private @type {number} */
    this._dragOffsetY = 0;

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

    /** @private */
    this._boundOnDragMove = this._onDragMove.bind(this);

    /** @private */
    this._boundOnDragEnd = this._onDragEnd.bind(this);

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

    this._element = this._buildToolbar();

    parentElement.appendChild(this._element);

    if (this._autoHide) {
      window.addEventListener('scroll', this._boundOnScroll, { passive: true });
    }

    this._mounted = true;

    this._loadPersistedPosition();
  }

  /**
   * Unmount the toolbar from the DOM. Removes all event listeners.
   */
  unmount() {
    if (!this._mounted) {
      return;
    }

    window.removeEventListener('scroll', this._boundOnScroll);

    document.removeEventListener('pointermove', this._boundOnDragMove);
    document.removeEventListener('pointerup', this._boundOnDragEnd);

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

    // Add drag handle button
    const dragHandler = this._onDragStart.bind(this);
    this._buttonHandlers['drag'] = dragHandler;
    const dragBtn = this._createElement('button', {
      classList: [`${p}-toolbar-btn`, `${p}-toolbar-btn-drag`],
      'aria-label': 'Drag to reposition toolbar',
      title: 'Drag to reposition',
      'data-action': 'drag',
      tabindex: '0',
      events: { pointerdown: dragHandler },
    }, ['⠿']);
    buttons.push(dragBtn);

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
    if (!this._element || !this._autoHide || this._isDragging) {
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

  // --- Drag & Drop ---

  /**
   * Start dragging the toolbar.
   *
   * @param {PointerEvent} event
   * @private
   */
  _onDragStart(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this._element) return;

    this._isDragging = true;

    event.target.setPointerCapture(event.pointerId);

    const rect = this._element.getBoundingClientRect();
    this._dragOffsetX = event.clientX - rect.left;
    this._dragOffsetY = event.clientY - rect.top;

    this._element.classList.add(`${this._prefix}-toolbar-dragging`);

    // Switch to explicit position (remove right, use left)
    this._element.style.right = 'auto';
    this._element.style.left = `${rect.left}px`;
    this._element.style.top = `${rect.top}px`;

    document.addEventListener('pointermove', this._boundOnDragMove);
    document.addEventListener('pointerup', this._boundOnDragEnd);
  }

  /**
   * Handle drag movement.
   *
   * @param {PointerEvent} event
   * @private
   */
  _onDragMove(event) {
    if (!this._isDragging || !this._element) return;

    event.preventDefault();

    const newLeft = event.clientX - this._dragOffsetX;
    const newTop = event.clientY - this._dragOffsetY;

    // Clamp to viewport bounds
    const maxLeft = window.innerWidth - this._element.offsetWidth;
    const maxTop = window.innerHeight - this._element.offsetHeight;
    const clampedLeft = Math.max(0, Math.min(newLeft, maxLeft));
    const clampedTop = Math.max(0, Math.min(newTop, maxTop));

    this._element.style.left = `${clampedLeft}px`;
    this._element.style.top = `${clampedTop}px`;
  }

  /**
   * End dragging the toolbar and persist position.
   *
   * @param {PointerEvent} event
   * @private
   */
  _onDragEnd(event) {
    if (!this._isDragging) return;

    this._isDragging = false;

    try {
      const dragBtn = this._element ? this._element.querySelector(`.${this._prefix}-toolbar-btn-drag`) : null;
      if (dragBtn && typeof dragBtn.releasePointerCapture === 'function') {
        dragBtn.releasePointerCapture(event.pointerId);
      }
    } catch (_) {
    }

    if (this._element) {
      this._element.classList.remove(`${this._prefix}-toolbar-dragging`);
    }

    document.removeEventListener('pointermove', this._boundOnDragMove);
    document.removeEventListener('pointerup', this._boundOnDragEnd);

    this._savePosition();
  }

  /**
   * Load persisted toolbar position from StorageManager.
   *
   * @private
   */
  async _loadPersistedPosition() {
    if (!this._storageManager || !this._element) return;

    try {
      const position = await this._storageManager.get('toolbarPosition');
      if (position && typeof position === 'object' && typeof position.top === 'number' && typeof position.left === 'number') {
        // Validate position is within viewport
        const maxLeft = window.innerWidth - this._element.offsetWidth;
        const maxTop = window.innerHeight - this._element.offsetHeight;
        const clampedLeft = Math.max(0, Math.min(position.left, maxLeft));
        const clampedTop = Math.max(0, Math.min(position.top, maxTop));

        this._element.style.right = 'auto';
        this._element.style.left = `${clampedLeft}px`;
        this._element.style.top = `${clampedTop}px`;
      }
    } catch (err) {
      const _Log = (typeof MARKUP_LOGGER !== 'undefined') ? MARKUP_LOGGER : null;
      if (_Log) { _Log.debug('Toolbar', 'Could not load persisted position.'); }
    }
  }

  /**
   * Save current toolbar position to StorageManager.
   *
   * @private
   */
  _savePosition() {
    if (!this._storageManager || !this._element) return;

    const rect = this._element.getBoundingClientRect();
    const position = {
      top: Math.round(rect.top),
      left: Math.round(rect.left),
    };

    this._storageManager.set('toolbarPosition', position).catch((err) => {
      console.warn('ToolbarComponent: Failed to save position:', err);
    });
  }
}

// Export for use across extension contexts
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_TOOLBAR_COMPONENT = ToolbarComponent;
}
