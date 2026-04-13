/**
 * MarkUp — HtmlRenderer
 *
 * Concrete renderer that safely injects parsed HTML into the DOM.
 * Extends the abstract Renderer class and integrates with the Sanitizer
 * to ensure all rendered content is safe from XSS attacks.
 *
 * Rendering pipeline:
 * 1. Sanitize the HTML string via the Sanitizer whitelist.
 * 2. Clear the existing container.
 * 3. Parse the sanitized HTML via DOMParser.
 * 4. Walk the parsed DOM and clone nodes into the container using importNode.
 * 5. Append the container to the target mount point.
 *
 * @class HtmlRenderer
 * @extends Renderer
 */

'use strict';

class HtmlRenderer extends Renderer {
  /**
   * Create a new HtmlRenderer instance.
   *
   * @param {string} [targetSelector='body'] - CSS selector for the mount point.
   * @param {Object} [options={}] - Configuration options.
   * @param {Object} [options.sanitizerConfig] - Optional Sanitizer config overrides.
   */
  constructor(targetSelector = 'body', options = {}) {
    super(targetSelector);

    /**
     * The wrapper <article> element for rendered content.
     * @type {HTMLElement}
     * @private
     */
    this._container = null;

    /**
     * Sanitizer instance for cleaning HTML before rendering.
     * @type {Sanitizer}
     * @private
     */
    this._sanitizer = null;

    /**
     * DOMParser instance for parsing HTML strings.
     * @type {DOMParser}
     * @private
     */
    this._domParser = new DOMParser();

    this._initializeSanitizer(options.sanitizerConfig);
    this._createContainer();
  }

  /**
   * Initialize the Sanitizer instance.
   *
   * @param {Object} [config] - Optional sanitizer configuration overrides.
   * @private
   */
  _initializeSanitizer(config) {
    const SanitizerClass = (typeof MARKUP_SANITIZER !== 'undefined')
      ? MARKUP_SANITIZER
      : null;

    if (SanitizerClass) {
      this._sanitizer = new SanitizerClass(config);
    } else {
      console.warn('HtmlRenderer: Sanitizer not available. HTML will be rendered without sanitization.');
    }
  }

  /**
   * Create the wrapper <article> element that contains all rendered content.
   * Uses the CSS_PREFIX for namespaced class names.
   *
   * @private
   */
  _createContainer() {
    const prefix = (typeof MARKUP_CONSTANTS !== 'undefined')
      ? MARKUP_CONSTANTS.CSS_PREFIX
      : 'markup';

    const helpers = (typeof MARKUP_DOM_HELPERS !== 'undefined')
      ? MARKUP_DOM_HELPERS
      : null;

    if (helpers) {
      this._container = helpers.createElement('article', {
        classList: [`${prefix}-content`, `${prefix}-article`],
        id: `${prefix}-rendered-content`,
      });
    } else {
      this._container = document.createElement('article');
      this._container.classList.add(`${prefix}-content`, `${prefix}-article`);
      this._container.id = `${prefix}-rendered-content`;
    }
  }

  /**
   * Render an HTML string into the mount point.
   *
   * Pipeline:
   * 1. Sanitize the HTML string.
   * 2. Clear the existing container.
   * 3. Parse the sanitized HTML via DOMParser.
   * 4. Walk the parsed DOM and import nodes into the container.
   * 5. Append the container to the mount point.
   *
   * @param {string} htmlString - The HTML string to render.
   */
  render(htmlString) {
    if (!htmlString || typeof htmlString !== 'string') {
      return;
    }

    let cleanHtml = htmlString;
    if (this._sanitizer) {
      cleanHtml = this._sanitizer.sanitize(htmlString);
    }

    this.clear();

    const parsedDoc = this._domParser.parseFromString(cleanHtml, 'text/html');
    const parsedBody = parsedDoc.body;

    if (!parsedBody) {
      console.warn('HtmlRenderer: DOMParser returned empty body.');
      return;
    }

    const fragment = document.createDocumentFragment();
    while (parsedBody.firstChild) {
      const importedNode = document.importNode(parsedBody.firstChild, true);
      fragment.appendChild(importedNode);
      parsedBody.removeChild(parsedBody.firstChild);
    }

    this._container.appendChild(fragment);

    const mountPoint = this.getContainer();
    if (mountPoint) {
      const helpers = (typeof MARKUP_DOM_HELPERS !== 'undefined')
        ? MARKUP_DOM_HELPERS
        : null;

      if (helpers) {
        helpers.removeAllChildren(mountPoint);
      } else {
        while (mountPoint.firstChild) {
          mountPoint.removeChild(mountPoint.firstChild);
        }
      }

      mountPoint.appendChild(this._container);
    } else {
      console.warn(
        `HtmlRenderer: Mount point "${this._targetSelector}" not found in DOM.`
      );
    }
  }

  /**
   * Clear all rendered content from the container.
   */
  clear() {
    if (!this._container) {
      return;
    }

    const helpers = (typeof MARKUP_DOM_HELPERS !== 'undefined')
      ? MARKUP_DOM_HELPERS
      : null;

    if (helpers) {
      helpers.removeAllChildren(this._container);
    } else {
      while (this._container.firstChild) {
        this._container.removeChild(this._container.firstChild);
      }
    }
  }

  /**
   * Inject scoped CSS styles for the rendered content.
   * Uses the addStyles helper with deduplication.
   *
   * @param {string} cssText - The CSS text to inject.
   * @param {string} [styleId] - Optional unique ID for the style element.
   */
  injectStyles(cssText, styleId) {
    const prefix = (typeof MARKUP_CONSTANTS !== 'undefined')
      ? MARKUP_CONSTANTS.CSS_PREFIX
      : 'markup';

    const id = styleId || `${prefix}-injected-styles`;

    const helpers = (typeof MARKUP_DOM_HELPERS !== 'undefined')
      ? MARKUP_DOM_HELPERS
      : null;

    if (helpers) {
      helpers.addStyles(cssText, id);
    } else {
      // Fallback: manual style injection
      let existing = document.getElementById(id);
      if (existing) {
        existing.textContent = cssText;
      } else {
        const style = document.createElement('style');
        style.id = id;
        style.textContent = cssText;
        document.head.appendChild(style);
      }
    }
  }

  /**
   * Get the article container element (the wrapper for rendered content).
   *
   * @returns {HTMLElement} The article container element.
   */
  getContentContainer() {
    return this._container;
  }
}

// Export for use in other modules
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_HTML_RENDERER = HtmlRenderer;
}
