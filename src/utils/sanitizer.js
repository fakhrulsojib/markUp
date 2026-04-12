/**
 * MarkUp — Sanitizer
 *
 * HTML sanitization layer using a DOMParser-based approach.
 * Parses untrusted HTML, walks the DOM tree, and strips any elements
 * or attributes not on the configured whitelist.
 *
 * @class Sanitizer
 */

'use strict';

class Sanitizer {
  /**
   * Default whitelist of allowed HTML tags.
   * Covers standard Markdown output elements.
   * @type {Set<string>}
   * @static
   */
  static DEFAULT_ALLOWED_TAGS = new Set([
    'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'img',
    'code', 'pre',
    'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    'blockquote',
    'em', 'strong', 'del', 's',
    'hr', 'br',
    'input',
    'div', 'span',
    'dl', 'dt', 'dd',
    'sup', 'sub',
    'abbr', 'mark',
    'details', 'summary',
    'figure', 'figcaption',
    'caption', 'colgroup', 'col',
  ]);

  /**
   * Default whitelist of allowed attributes per tag.
   * '*' key applies to all tags.
   * @type {Object<string, Set<string>>}
   * @static
   */
  static DEFAULT_ALLOWED_ATTRIBUTES = {
    '*': new Set(['id', 'class', 'title', 'lang', 'dir']),
    'a': new Set(['href', 'target', 'rel']),
    'img': new Set(['src', 'alt', 'width', 'height', 'loading']),
    'input': new Set(['type', 'checked', 'disabled']),
    'td': new Set(['colspan', 'rowspan', 'align']),
    'th': new Set(['colspan', 'rowspan', 'align', 'scope']),
    'code': new Set(['class']),    // for language-* classes
    'pre': new Set(['class']),
    'ol': new Set(['start', 'type']),
    'col': new Set(['span']),
    'colgroup': new Set(['span']),
  };

  /**
   * Attributes whose values must be validated as safe URLs.
   * @type {Set<string>}
   * @static
   */
  static URL_ATTRIBUTES = new Set(['href', 'src']);

  /**
   * Allowed URL protocols for href/src attributes.
   * @type {Set<string>}
   * @static
   */
  static SAFE_URL_PROTOCOLS = new Set([
    'http:', 'https:', 'mailto:', 'tel:', 'data:',
    'file:',
  ]);

  /**
   * Create a new Sanitizer instance.
   *
   * @param {Object} [config={}] - Configuration overrides.
   * @param {Set<string>} [config.allowedTags] - Override allowed tag set.
   * @param {Object<string, Set<string>>} [config.allowedAttributes] - Override allowed attributes.
   */
  constructor(config = {}) {
    /** @private */
    this._allowedTags = config.allowedTags || Sanitizer.DEFAULT_ALLOWED_TAGS;

    /** @private */
    this._allowedAttributes = config.allowedAttributes || Sanitizer.DEFAULT_ALLOWED_ATTRIBUTES;

    /** @private */
    this._parser = new DOMParser();
  }

  /**
   * Sanitize an HTML string by parsing it, walking the tree, and stripping
   * any elements or attributes not on the whitelist.
   *
   * @param {string} htmlString - The untrusted HTML string to sanitize.
   * @returns {string} Cleaned HTML string safe for rendering.
   */
  sanitize(htmlString) {
    if (!htmlString || typeof htmlString !== 'string') {
      return '';
    }

    const doc = this._parser.parseFromString(htmlString, 'text/html');
    const body = doc.body;

    if (!body) {
      return '';
    }

    this._walkAndSanitize(body);

    return body.innerHTML;
  }

  /**
   * Recursively walk the DOM tree and remove disallowed nodes and attributes.
   * Disallowed elements are removed entirely (with their children).
   * Text nodes are always preserved.
   *
   * @param {Node} node - The node to process.
   * @private
   */
  _walkAndSanitize(node) {
    // Collect children into an array first to avoid live NodeList mutation issues
    const children = Array.from(node.childNodes);

    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) {
        // Text nodes are always safe — keep them
        continue;
      }

      if (child.nodeType === Node.COMMENT_NODE) {
        // Remove HTML comments
        node.removeChild(child);
        continue;
      }

      if (child.nodeType !== Node.ELEMENT_NODE) {
        // Remove any other unexpected node types
        node.removeChild(child);
        continue;
      }

      const tagName = child.tagName.toLowerCase();

      if (!this._allowedTags.has(tagName)) {
        // Disallowed tag — remove entirely (including children)
        node.removeChild(child);
        continue;
      }

      // Special case: input elements — only allow checkboxes
      if (tagName === 'input') {
        const type = child.getAttribute('type');
        if (type !== 'checkbox') {
          node.removeChild(child);
          continue;
        }
      }

      // Strip disallowed attributes
      this._sanitizeAttributes(child, tagName);

      // Recurse into children
      this._walkAndSanitize(child);
    }
  }

  /**
   * Remove any attributes not on the whitelist for the given tag.
   * Also validates URL-type attributes against safe protocols.
   *
   * @param {HTMLElement} element - The element to sanitize attributes on.
   * @param {string} tagName - The lowercase tag name.
   * @private
   */
  _sanitizeAttributes(element, tagName) {
    const globalAllowed = this._allowedAttributes['*'] || new Set();
    const tagAllowed = this._allowedAttributes[tagName] || new Set();

    // Collect attribute names first to avoid live NamedNodeMap mutation issues
    const attrNames = Array.from(element.attributes).map((attr) => attr.name);

    for (const attrName of attrNames) {
      const attrLower = attrName.toLowerCase();

      // Remove event handler attributes (onclick, onload, etc.)
      if (attrLower.startsWith('on')) {
        element.removeAttribute(attrName);
        continue;
      }

      // Check if attribute is allowed globally or for this specific tag
      if (!globalAllowed.has(attrLower) && !tagAllowed.has(attrLower)) {
        element.removeAttribute(attrName);
        continue;
      }

      // Validate URL attributes against safe protocols
      if (Sanitizer.URL_ATTRIBUTES.has(attrLower)) {
        const value = element.getAttribute(attrName);
        if (!this._isSafeUrl(value)) {
          element.removeAttribute(attrName);
        }
      }
    }
  }

  /**
   * Check if a URL string uses a safe protocol.
   * Rejects javascript:, vbscript:, and other dangerous schemes.
   *
   * @param {string} url - The URL value to validate.
   * @returns {boolean} True if the URL uses a safe protocol.
   * @private
   */
  _isSafeUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }

    const trimmed = url.trim();

    // Allow relative URLs (no protocol)
    if (trimmed.startsWith('/') || trimmed.startsWith('#') || trimmed.startsWith('?') || trimmed.startsWith('.')) {
      return true;
    }

    // Check for known safe protocols
    try {
      const parsed = new URL(trimmed, 'https://placeholder.invalid');
      return Sanitizer.SAFE_URL_PROTOCOLS.has(parsed.protocol);
    } catch {
      // If URL parsing fails, reject it
      return false;
    }
  }
}

// Export for use in other modules
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_SANITIZER = Sanitizer;
}
