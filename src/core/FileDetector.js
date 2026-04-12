/**
 * MarkUp — FileDetector
 *
 * URL and MIME sniffing utility for detecting Markdown files.
 * Handles query strings, fragments, and various Markdown file extensions.
 *
 * @class FileDetector
 */

'use strict';

class FileDetector {
  /**
   * Create a new FileDetector instance.
   * Initializes patterns from MARKUP_CONSTANTS if available,
   * otherwise uses built-in defaults.
   */
  constructor() {
    const constants = (typeof globalThis !== 'undefined' && globalThis.MARKUP_CONSTANTS)
      ? globalThis.MARKUP_CONSTANTS
      : null;

    /**
     * Regex patterns for detecting Markdown file extensions in URL pathnames.
     * Matches: .md, .markdown, .mdown, .mkd, .mdx
     * @type {RegExp[]}
     * @private
     */
    this._patterns = constants
      ? constants.MD_URL_PATTERNS
      : [
          /\.md$/i,
          /\.markdown$/i,
          /\.mdown$/i,
          /\.mkd$/i,
          /\.mdx$/i,
        ];

    /**
     * MIME types considered to be Markdown content.
     * @type {string[]}
     * @private
     */
    this._mimeTypes = constants
      ? constants.MD_MIME_TYPES
      : ['text/markdown', 'text/x-markdown'];
  }

  /**
   * Test whether a URL points to a Markdown file based on its pathname.
   * Strips query strings and fragments before matching.
   *
   * @param {string} url - The URL to test.
   * @returns {boolean} True if the URL pathname matches a Markdown extension.
   */
  isMarkdownUrl(url) {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      // Use URL constructor to properly parse the URL
      // For file:// URLs and relative paths, use a dummy base
      let pathname;

      if (url.startsWith('file://') || url.startsWith('http://') || url.startsWith('https://')) {
        const parsed = new URL(url);
        pathname = parsed.pathname;
      } else {
        // Fallback: strip query/fragment manually for non-standard URLs
        pathname = url.split('?')[0].split('#')[0];
      }

      return this._patterns.some((pattern) => pattern.test(pathname));
    } catch (error) {
      // If URL parsing fails, test against the raw URL
      // Strip query string and fragment manually
      const cleanUrl = url.split('?')[0].split('#')[0];
      return this._patterns.some((pattern) => pattern.test(cleanUrl));
    }
  }

  /**
   * Check if a MIME/content-type header indicates Markdown content.
   * Checks against known Markdown MIME types.
   * Also returns true for 'text/plain' if combined with a Markdown URL
   * (caller should provide the URL context separately).
   *
   * @param {string} contentType - The Content-Type header value.
   * @returns {boolean} True if the content type is a known Markdown MIME type.
   */
  isMarkdownMime(contentType) {
    if (!contentType || typeof contentType !== 'string') {
      return false;
    }

    // Extract the MIME type (strip charset and other parameters)
    const mimeType = contentType.split(';')[0].trim().toLowerCase();

    return this._mimeTypes.includes(mimeType);
  }

  /**
   * Extract the filename from a URL path.
   * Handles query strings, fragments, and path traversal.
   *
   * @param {string} url - The URL to extract the filename from.
   * @returns {string} The filename (e.g., 'README.md'), or empty string if not found.
   */
  getFileNameFromUrl(url) {
    if (!url || typeof url !== 'string') {
      return '';
    }

    try {
      let pathname;

      if (url.startsWith('file://') || url.startsWith('http://') || url.startsWith('https://')) {
        const parsed = new URL(url);
        pathname = parsed.pathname;
      } else {
        pathname = url.split('?')[0].split('#')[0];
      }

      // Decode URI components for display
      pathname = decodeURIComponent(pathname);

      // Extract the last segment of the path
      const segments = pathname.split('/');
      const lastSegment = segments[segments.length - 1];

      return lastSegment || '';
    } catch (error) {
      // Fallback: manual extraction
      const cleanUrl = url.split('?')[0].split('#')[0];
      const segments = cleanUrl.split('/');
      return segments[segments.length - 1] || '';
    }
  }
}

// Export for use in other modules
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_FILE_DETECTOR = FileDetector;
}
