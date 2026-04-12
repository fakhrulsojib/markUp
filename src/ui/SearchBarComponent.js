/**
 * MarkUp — SearchBarComponent
 *
 * Dropdown search overlay UI (Ctrl+F style) that wires to SearchController
 * for actual search logic. Extends BaseComponent.
 *
 * Features:
 * - Input field + match count + prev/next buttons + close button
 * - Keyboard: Enter → next, Shift+Enter → prev, Escape → close
 * - Debounced input triggers SearchController.search()
 * - Auto-focus on show
 *
 * @class SearchBarComponent
 * @extends BaseComponent
 */

'use strict';

class SearchBarComponent extends BaseComponent {
  /**
   * Create a SearchBarComponent instance.
   *
   * @param {SearchController} searchController - The SearchController for search logic.
   * @param {HTMLElement} contentContainer - The content container to search within.
   * @param {Object} [options={}] - Configuration options.
   */
  constructor(searchController, contentContainer, options = {}) {
    const prefix = (typeof MARKUP_CONSTANTS !== 'undefined')
      ? MARKUP_CONSTANTS.CSS_PREFIX
      : 'markup';

    super(`${prefix}-search-bar`);

    if (!searchController) {
      throw new TypeError('SearchBarComponent requires a SearchController instance');
    }

    /** @private */
    this._searchController = searchController;

    /** @private */
    this._contentContainer = contentContainer;

    /** @private */
    this._prefix = prefix;

    /** @private @type {HTMLInputElement|null} */
    this._inputElement = null;

    /** @private @type {HTMLElement|null} */
    this._countElement = null;

    /** @private @type {number|null} */
    this._debounceTimer = null;

    /** @private @type {number} */
    this._debounceMs = options.debounceMs || 200;

    // Bound handlers for cleanup
    /** @private */
    this._boundOnInput = this._onInput.bind(this);
    /** @private */
    this._boundOnKeyDown = this._onKeyDown.bind(this);
    /** @private */
    this._boundOnCloseClick = this._onCloseClick.bind(this);
    /** @private */
    this._boundOnPrevClick = this._onPrevClick.bind(this);
    /** @private */
    this._boundOnNextClick = this._onNextClick.bind(this);
  }

  /**
   * Mount the search bar into a parent element.
   *
   * @param {HTMLElement} parentElement - The DOM element to mount into.
   */
  mount(parentElement) {
    if (this._mounted) {
      return;
    }

    if (!parentElement) {
      console.warn('SearchBarComponent: Cannot mount — parent element is null');
      return;
    }

    this._element = this._buildSearchBar();

    // Start hidden
    this._element.style.display = 'none';
    this._previousDisplay = '';

    parentElement.appendChild(this._element);
    this._mounted = true;
  }

  /**
   * Unmount the search bar. Removes all listeners and DOM.
   */
  unmount() {
    if (!this._mounted) {
      return;
    }

    // Clear debounce timer
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }

    // Clear search highlights
    this._searchController.clearHighlights();

    // Remove element
    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }

    this._inputElement = null;
    this._countElement = null;
    this._element = null;
    this._mounted = false;
  }

  /**
   * Override show to auto-focus the input.
   */
  show() {
    if (this._element) {
      this._element.style.display = this._previousDisplay || '';
      // Auto-focus input
      if (this._inputElement) {
        setTimeout(() => {
          if (this._inputElement) {
            this._inputElement.focus();
            this._inputElement.select();
          }
        }, 50);
      }
    }
  }

  /**
   * Override hide to clear highlights and input.
   */
  hide() {
    if (this._element) {
      const currentDisplay = this._element.style.display;
      if (currentDisplay !== 'none') {
        this._previousDisplay = currentDisplay;
      }
      this._element.style.display = 'none';

      // Clear search when hiding
      this._searchController.clearHighlights();
      if (this._inputElement) {
        this._inputElement.value = '';
      }
      this._updateCount(0, 0);
    }
  }

  // --- Private Methods ---

  /**
   * Build the search bar DOM structure.
   *
   * @returns {HTMLElement} The search bar root element.
   * @private
   */
  _buildSearchBar() {
    const p = this._prefix;

    // Input field
    this._inputElement = this._createElement('input', {
      classList: [`${p}-search-input`],
      'type': 'text',
      'placeholder': 'Search in document...',
      'aria-label': 'Search in document',
      events: {
        input: this._boundOnInput,
        keydown: this._boundOnKeyDown,
      },
    });

    // Match count display
    this._countElement = this._createElement('span', {
      classList: [`${p}-search-count`],
      textContent: '0/0',
    });

    // Previous button
    const prevBtn = this._createElement('button', {
      classList: [`${p}-search-prev`],
      'aria-label': 'Previous match',
      title: 'Previous (Shift+Enter)',
      events: { click: this._boundOnPrevClick },
    }, ['▲']);

    // Next button
    const nextBtn = this._createElement('button', {
      classList: [`${p}-search-next`],
      'aria-label': 'Next match',
      title: 'Next (Enter)',
      events: { click: this._boundOnNextClick },
    }, ['▼']);

    // Close button
    const closeBtn = this._createElement('button', {
      classList: [`${p}-search-close`],
      'aria-label': 'Close search',
      title: 'Close (Escape)',
      events: { click: this._boundOnCloseClick },
    }, ['×']);

    // Container
    const bar = this._createElement('div', {
      classList: [`${p}-search-bar`],
      id: this._id,
      'role': 'search',
      'aria-label': 'Document search',
    }, [this._inputElement, this._countElement, prevBtn, nextBtn, closeBtn]);

    return bar;
  }

  /**
   * Handle input changes with debounce.
   *
   * @private
   */
  _onInput() {
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
    }

    this._debounceTimer = setTimeout(() => {
      const query = this._inputElement ? this._inputElement.value : '';
      if (query.trim() === '') {
        this._searchController.clearHighlights();
        this._updateCount(0, 0);
        return;
      }

      const count = this._searchController.search(query, this._contentContainer);
      this._updateCount(count > 0 ? 1 : 0, count);
    }, this._debounceMs);
  }

  /**
   * Handle keyboard events in the search input.
   *
   * @param {KeyboardEvent} e - The keyboard event.
   * @private
   */
  _onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        this._onPrevClick();
      } else {
        this._onNextClick();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.hide();
    }
  }

  /**
   * Handle previous button click.
   *
   * @private
   */
  _onPrevClick() {
    const idx = this._searchController.prevMatch();
    const total = this._searchController.getMatchCount();
    if (idx >= 0) {
      this._updateCount(idx + 1, total);
    }
  }

  /**
   * Handle next button click.
   *
   * @private
   */
  _onNextClick() {
    const idx = this._searchController.nextMatch();
    const total = this._searchController.getMatchCount();
    if (idx >= 0) {
      this._updateCount(idx + 1, total);
    }
  }

  /**
   * Handle close button click.
   *
   * @private
   */
  _onCloseClick() {
    this.hide();
  }

  /**
   * Update the match count display.
   *
   * @param {number} current - Current match number (1-based).
   * @param {number} total - Total match count.
   * @private
   */
  _updateCount(current, total) {
    if (this._countElement) {
      this._countElement.textContent = `${current}/${total}`;
    }
  }
}

// Export for use across extension contexts
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_SEARCH_BAR_COMPONENT = SearchBarComponent;
}
