/**
 * MarkUp — SyntaxHighlighter
 *
 * Code block highlighting manager that wraps the highlight.js (hljs) library.
 * Finds all <pre><code> blocks within a container and applies syntax
 * highlighting based on language detection.
 *
 * @class SyntaxHighlighter
 */

'use strict';

class SyntaxHighlighter {
  /**
   * Create a new SyntaxHighlighter instance.
   *
   * @param {Object} [options={}] - Configuration options.
   * @param {boolean} [options.autoDetect=true] - Enable auto-detection of languages.
   */
  constructor(options = {}) {
    /**
     * Reference to the highlight.js library instance.
     * @type {Object|null}
     * @private
     */
    this._hljs = (typeof hljs !== 'undefined') ? hljs : null;

    /**
     * Set of supported/loaded language names.
     * @type {Set<string>}
     * @private
     */
    this._supportedLanguages = new Set();

    /**
     * Whether to auto-detect language when no class is specified.
     * @type {boolean}
     * @private
     */
    this._autoDetect = options.autoDetect !== false;

    this._loadSupportedLanguages();
  }

  /**
   * Populate the set of supported languages from hljs.
   *
   * @private
   */
  _loadSupportedLanguages() {
    if (!this._hljs) {
      console.warn('SyntaxHighlighter: highlight.js (hljs) not found. Syntax highlighting disabled.');
      return;
    }

    try {
      const languages = this._hljs.listLanguages();
      for (const lang of languages) {
        this._supportedLanguages.add(lang);
      }
    } catch (error) {
      console.warn('SyntaxHighlighter: Failed to load language list:', error);
    }
  }

  /**
   * Highlight all <pre><code> blocks within a container element.
   * Detects language from the `language-*` or `lang-*` CSS class on the <code> element.
   *
   * @param {HTMLElement} container - The container to search for code blocks.
   * @returns {number} The number of code blocks highlighted.
   */
  highlightAll(container) {
    if (!this._hljs || !container) {
      return 0;
    }

    const codeBlocks = container.querySelectorAll('pre code');
    let count = 0;

    for (const codeElement of codeBlocks) {
      try {
        this.highlightElement(codeElement);
        count++;
      } catch (error) {
        console.warn('SyntaxHighlighter: Failed to highlight element:', error);
      }
    }

    return count;
  }

  /**
   * Highlight a single <code> element.
   * Detects the language from CSS classes (language-*, lang-*) or
   * auto-detects if no language class is present.
   *
   * @param {HTMLElement} codeElement - The <code> element to highlight.
   */
  highlightElement(codeElement) {
    if (!this._hljs || !codeElement) {
      return;
    }

    if (codeElement.dataset.highlighted === 'yes') {
      return;
    }

    const language = this._detectLanguage(codeElement);

    try {
      if (language && this._supportedLanguages.has(language)) {
        const result = this._hljs.highlight(codeElement.textContent, {
          language: language,
          ignoreIllegals: true,
        });
        codeElement.innerHTML = result.value;
        codeElement.classList.add('hljs');
        codeElement.dataset.highlighted = 'yes';
        codeElement.dataset.language = language;
      } else if (this._autoDetect) {
        const result = this._hljs.highlightAuto(codeElement.textContent);
        codeElement.innerHTML = result.value;
        codeElement.classList.add('hljs');
        codeElement.dataset.highlighted = 'yes';
        if (result.language) {
          codeElement.dataset.language = result.language;
        }
      }
    } catch (error) {
      console.warn(
        `SyntaxHighlighter: Error highlighting (lang: ${language || 'auto'}):`,
        error
      );
    }
  }

  /**
   * Detect the language of a <code> element from its CSS classes.
   * Looks for `language-*` or `lang-*` class patterns.
   *
   * @param {HTMLElement} codeElement - The code element to inspect.
   * @returns {string|null} The detected language name, or null.
   * @private
   */
  _detectLanguage(codeElement) {
    const classes = codeElement.className.split(/\s+/);

    for (const cls of classes) {
      // Match language-xxx or lang-xxx patterns
      const match = cls.match(/^(?:language|lang)-(.+)$/);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    return null;
  }

  /**
   * Register an additional language with highlight.js.
   *
   * @param {string} name - The language name.
   * @param {Function} definition - The language definition function.
   */
  addLanguage(name, definition) {
    if (!this._hljs) {
      console.warn('SyntaxHighlighter: Cannot add language — hljs not available.');
      return;
    }

    try {
      this._hljs.registerLanguage(name, definition);
      this._supportedLanguages.add(name);
    } catch (error) {
      console.error(`SyntaxHighlighter: Failed to register language "${name}":`, error);
    }
  }

  /**
   * Get the set of supported language names.
   *
   * @returns {Set<string>} A copy of the supported languages set.
   */
  getSupportedLanguages() {
    return new Set(this._supportedLanguages);
  }

  /**
   * Check if a specific language is supported.
   *
   * @param {string} language - The language name to check.
   * @returns {boolean} True if the language is supported.
   */
  isLanguageSupported(language) {
    return this._supportedLanguages.has(language);
  }
}

// Export for use in other modules
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_SYNTAX_HIGHLIGHTER = SyntaxHighlighter;
}
