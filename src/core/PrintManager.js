/**
 * MarkUp — PrintManager
 *
 * Manages print preparation and restoration for the MarkUp extension.
 * Adds a print-mode CSS class, hides UI chrome, invokes window.print(),
 * and auto-restores the view after printing.
 *
 * @class PrintManager
 */

'use strict';

class PrintManager {
  /**
   * Create a PrintManager instance.
   *
   * @param {Object} [options={}] - Configuration options.
   * @param {HTMLElement} [options.contentContainer] - The content container element.
   */
  constructor(options = {}) {
    /** @private */
    this._prefix = (typeof MARKUP_CONSTANTS !== 'undefined')
      ? MARKUP_CONSTANTS.CSS_PREFIX
      : 'markup';

    /** @private @type {HTMLElement|null} */
    this._contentContainer = options.contentContainer || null;

    /** @private @type {boolean} */
    this._isPrintMode = false;

    /** @private @type {string[]} */
    this._hiddenComponentSelectors = [
      `.${this._prefix}-toolbar`,
      `.${this._prefix}-toc-panel`,
      `.${this._prefix}-search-bar`,
      `.${this._prefix}-settings-panel`,
    ];

    /** @private @type {HTMLElement[]} */
    this._hiddenElements = [];

    /** @private */
    this._boundOnAfterPrint = this._onAfterPrint.bind(this);

    window.addEventListener('afterprint', this._boundOnAfterPrint);
  }

  /**
   * Prepare the view for printing and invoke the print dialog.
   *
   * Steps:
   * 1. Add markup-print-mode CSS class to content root
   * 2. Hide toolbar, TOC, search bar, settings panel
   * 3. Call window.print()
   */
  preparePrintView() {
    if (this._isPrintMode) {
      return;
    }

    this._isPrintMode = true;

    const root = this._resolveContentContainer();
    if (root) {
      root.classList.add(`${this._prefix}-print-mode`);
    }

    this._hideUIComponents();

    window.print();
  }

  /**
   * Restore the view after printing.
   *
   * Steps:
   * 1. Remove markup-print-mode class
   * 2. Restore hidden UI components
   */
  restoreView() {
    if (!this._isPrintMode) {
      return;
    }

    const root = this._resolveContentContainer();
    if (root) {
      root.classList.remove(`${this._prefix}-print-mode`);
    }

    this._restoreUIComponents();

    this._isPrintMode = false;
  }

  /**
   * Clean up — remove the afterprint listener.
   */
  destroy() {
    window.removeEventListener('afterprint', this._boundOnAfterPrint);
  }

  /**
   * Check if currently in print mode.
   *
   * @returns {boolean} True if in print mode.
   */
  isPrintMode() {
    return this._isPrintMode;
  }

  // --- Private Methods ---

  /**
   * Handle the afterprint event to auto-restore the view.
   *
   * @private
   */
  _onAfterPrint() {
    this.restoreView();
  }

  /**
   * Find the content container element.
   *
   * @returns {HTMLElement|null}
   * @private
   */
  _resolveContentContainer() {
    if (this._contentContainer && this._contentContainer.isConnected) {
      return this._contentContainer;
    }
    return document.querySelector(`.${this._prefix}-content`) || document.documentElement;
  }

  /**
   * Hide all UI component elements.
   *
   * @private
   */
  _hideUIComponents() {
    this._hiddenElements = [];

    for (const selector of this._hiddenComponentSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (el.style.display !== 'none') {
          this._hiddenElements.push({ element: el, previousDisplay: el.style.display });
          el.style.display = 'none';
        }
      }
    }
  }

  /**
   * Restore all previously hidden UI component elements.
   *
   * @private
   */
  _restoreUIComponents() {
    for (const item of this._hiddenElements) {
      item.element.style.display = item.previousDisplay;
    }
    this._hiddenElements = [];
  }
}

// Export for use across extension contexts
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_PRINT_MANAGER = PrintManager;
}
