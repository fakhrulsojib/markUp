/**
 * MarkUp — SearchController
 *
 * Pure logic class for in-document text search. Not a UI component.
 * Uses TreeWalker to find text nodes matching a query, wraps matches
 * in <mark> elements, and provides next/prev navigation.
 *
 * @class SearchController
 */

'use strict';

class SearchController {
  /**
   * Create a SearchController instance.
   *
   * @param {Object} [options={}] - Configuration options.
   * @param {boolean} [options.caseSensitive=false] - Whether search is case-sensitive.
   */
  constructor(options = {}) {
    /** @private @type {boolean} */
    this._caseSensitive = options.caseSensitive || false;

    /** @private @type {string} */
    this._query = '';

    /** @private @type {HTMLElement[]} */
    this._matches = [];

    /** @private @type {number} */
    this._currentIndex = -1;

    /** @private */
    this._prefix = (typeof MARKUP_CONSTANTS !== 'undefined')
      ? MARKUP_CONSTANTS.CSS_PREFIX
      : 'markup';
  }

  /**
   * Search for a query within the given container.
   * Clears any previous highlights before starting a new search.
   * Uses TreeWalker to find text nodes matching the query.
   *
   * @param {string} query - The search query.
   * @param {HTMLElement} container - The DOM container to search within.
   * @returns {number} The number of matches found.
   */
  search(query, container) {
    this.clearHighlights();

    if (!query || !container) {
      return 0;
    }

    this._query = query;
    this._matches = [];
    this._currentIndex = -1;

    const searchStr = this._caseSensitive ? query : query.toLowerCase();

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (tag === 'script' || tag === 'style' || tag === 'mark') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      }
    );

    const textNodes = [];
    let currentNode;
    while ((currentNode = walker.nextNode())) {
      textNodes.push(currentNode);
    }

    for (const textNode of textNodes) {
      this._highlightInTextNode(textNode, searchStr);
    }

    if (this._matches.length > 0) {
      this._currentIndex = 0;
      this._setActiveMatch(0);
    }

    return this._matches.length;
  }

  /**
   * Navigate to the next match.
   *
   * @returns {number} The new current index (0-based), or -1 if no matches.
   */
  nextMatch() {
    if (this._matches.length === 0) {
      return -1;
    }

    if (this._currentIndex >= 0) {
      this._matches[this._currentIndex].classList.remove(`${this._prefix}-search-active`);
    }

    this._currentIndex = (this._currentIndex + 1) % this._matches.length;
    this._setActiveMatch(this._currentIndex);

    return this._currentIndex;
  }

  /**
   * Navigate to the previous match.
   *
   * @returns {number} The new current index (0-based), or -1 if no matches.
   */
  prevMatch() {
    if (this._matches.length === 0) {
      return -1;
    }

    if (this._currentIndex >= 0) {
      this._matches[this._currentIndex].classList.remove(`${this._prefix}-search-active`);
    }

    this._currentIndex = (this._currentIndex - 1 + this._matches.length) % this._matches.length;
    this._setActiveMatch(this._currentIndex);

    return this._currentIndex;
  }

  /**
   * Clear all search highlights, restoring original text nodes.
   */
  clearHighlights() {
    const marks = document.querySelectorAll(`.${this._prefix}-search-highlight`);
    for (const mark of marks) {
      const parent = mark.parentNode;
      if (parent) {
        const textNode = document.createTextNode(mark.textContent);
        parent.replaceChild(textNode, mark);
        parent.normalize();
      }
    }

    this._matches = [];
    this._currentIndex = -1;
    this._query = '';
  }

  /**
   * Get the current match index (0-based).
   *
   * @returns {number} Current index, or -1 if no active match.
   */
  getCurrentIndex() {
    return this._currentIndex;
  }

  /**
   * Get the total number of matches.
   *
   * @returns {number} Total match count.
   */
  getMatchCount() {
    return this._matches.length;
  }

  // --- Private Methods ---

  /**
   * Find and highlight matches within a single text node.
   *
   * @param {Text} textNode - The text node to search within.
   * @param {string} searchStr - The normalized search string.
   * @private
   */
  _highlightInTextNode(textNode, searchStr) {
    const text = textNode.textContent;
    const compareText = this._caseSensitive ? text : text.toLowerCase();

    let offset = 0;
    let index = compareText.indexOf(searchStr, offset);

    if (index === -1) {
      return;
    }

    const parent = textNode.parentNode;
    const fragment = document.createDocumentFragment();
    let lastEnd = 0;

    while (index !== -1) {
      if (index > lastEnd) {
        fragment.appendChild(document.createTextNode(text.substring(lastEnd, index)));
      }

      const mark = document.createElement('mark');
      mark.className = `${this._prefix}-search-highlight`;
      mark.textContent = text.substring(index, index + searchStr.length);
      fragment.appendChild(mark);
      this._matches.push(mark);

      lastEnd = index + searchStr.length;
      index = compareText.indexOf(searchStr, lastEnd);
    }

    if (lastEnd < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastEnd)));
    }

    parent.replaceChild(fragment, textNode);
  }

  /**
   * Set the active match and scroll it into view.
   *
   * @param {number} index - The match index to activate.
   * @private
   */
  _setActiveMatch(index) {
    if (index < 0 || index >= this._matches.length) {
      return;
    }

    const mark = this._matches[index];
    mark.classList.add(`${this._prefix}-search-active`);
    mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// Export for use across extension contexts
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_SEARCH_CONTROLLER = SearchController;
}
