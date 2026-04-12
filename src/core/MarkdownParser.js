/**
 * MarkUp — MarkdownParser
 *
 * Parsing engine that wraps the `marked` library to convert raw Markdown
 * strings into HTML. Supports GFM (GitHub Flavored Markdown) with tables,
 * task lists, strikethrough, and fenced code blocks.
 *
 * @class MarkdownParser
 */

'use strict';

class MarkdownParser {
  /**
   * Default parser options.
   * @type {Object}
   * @static
   */
  static DEFAULT_OPTIONS = Object.freeze({
    gfm: true,
    breaks: false,
    pedantic: false,
    async: false,
    silent: true,
  });

  /**
   * Create a new MarkdownParser instance.
   *
   * @param {Object} [options={}] - Configuration options for the parser.
   * @param {boolean} [options.gfm=true] - Enable GitHub Flavored Markdown.
   * @param {boolean} [options.breaks=false] - Convert line breaks to <br>.
   * @param {boolean} [options.pedantic=false] - Conform to original markdown.pl.
   * @param {boolean} [options.silent=true] - Suppress error output, render error HTML.
   */
  constructor(options = {}) {
    /**
     * Merged parser options.
     * @type {Object}
     * @private
     */
    this._options = { ...MarkdownParser.DEFAULT_OPTIONS, ...options };

    /**
     * The marked library instance (Marked class for isolated configuration).
     * @type {Object}
     * @private
     */
    this._parserInstance = null;

    this._initializeParser();
  }

  /**
   * Initialize the marked parser with configured options.
   * Creates an isolated Marked instance to avoid polluting the global marked state.
   * Configures marked to NOT use eval or new Function (MV3 CSP compliance).
   *
   * @private
   */
  _initializeParser() {
    // Get a reference to the marked library
    const markedLib = (typeof marked !== 'undefined') ? marked : null;

    if (!markedLib) {
      console.error('MarkdownParser: marked library not found. Ensure marked.min.js is loaded.');
      return;
    }

    // Use the Marked class for an isolated instance if available,
    // otherwise use the global marked API.
    if (markedLib.Marked) {
      this._parserInstance = new markedLib.Marked(this._options);
    } else {
      // Fallback: configure global marked
      this._parserInstance = markedLib;
      this._parserInstance.setOptions(this._options);
    }
  }

  /**
   * Parse a raw Markdown string into an HTML string.
   *
   * @param {string} rawMarkdown - The raw Markdown text to parse.
   * @returns {string} The parsed HTML string.
   * @throws {Error} If parsing fails and silent mode is off.
   */
  parse(rawMarkdown) {
    if (!rawMarkdown || typeof rawMarkdown !== 'string') {
      return '';
    }

    // Check document size limit
    const maxSize = (typeof MARKUP_CONSTANTS !== 'undefined')
      ? MARKUP_CONSTANTS.MAX_DOCUMENT_SIZE
      : 500000;

    if (rawMarkdown.length > maxSize) {
      console.warn(
        `MarkdownParser: Document exceeds size limit (${rawMarkdown.length} > ${maxSize} chars). ` +
        'Parsing may be slow.'
      );
    }

    if (!this._parserInstance) {
      console.error('MarkdownParser: Parser not initialized.');
      return '<p>Error: Markdown parser not initialized.</p>';
    }

    try {
      const html = this._parserInstance.parse(rawMarkdown);
      return html;
    } catch (error) {
      console.error('MarkdownParser: Parse error:', error);

      if (this._options.silent) {
        return '<p>Error parsing Markdown content.</p>';
      }
      throw error;
    }
  }

  /**
   * Update a parser configuration option dynamically.
   * Re-initializes the parser with the updated options.
   *
   * @param {string} key - The option key to update.
   * @param {*} value - The new value for the option.
   */
  setOption(key, value) {
    this._options[key] = value;
    this._initializeParser();
  }

  /**
   * Get the current parser options.
   *
   * @returns {Object} A copy of the current options.
   */
  getOptions() {
    return { ...this._options };
  }
}

// Export for use in other modules
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_MARKDOWN_PARSER = MarkdownParser;
}
