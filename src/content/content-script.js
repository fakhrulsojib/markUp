/**
 * MarkUp — Content Script (MarkUpApp Orchestrator)
 *
 * Entry point injected into tabs matching .md file URLs.
 * Orchestrates the full Markdown parsing, rendering, and UI pipeline:
 *
 * 1. Detect raw Markdown content on the page.
 * 2. Extract the raw text.
 * 3. Parse Markdown → HTML via MarkdownParser.
 * 4. Render HTML safely via HtmlRenderer.
 * 5. Apply syntax highlighting via SyntaxHighlighter.
 * 6. Generate TOC data via TocGenerator.
 * 7. Apply persisted theme via ThemeManager.
 * 8. Apply persisted typography settings (font size, line height, font family).
 * 9. Mount UI components: Toolbar, TOC Panel, Search Bar, Settings Panel.
 * 10. Register keyboard shortcuts via KeyboardManager.
 * 11. Wire inter-component events.
 * 12. Set the page title.
 *
 * Error handling: if any step fails, a styled error message is shown
 * instead of leaving the page blank.
 */

'use strict';

(function markupContentScript() {
  // Prevent double execution
  if (window.__MARKUP_INITIALIZED__) {
    return;
  }
  window.__MARKUP_INITIALIZED__ = true;

  console.log('MarkUp content script loaded on:', window.location.href);

  // --- Constants ---

  const PREFIX = (typeof MARKUP_CONSTANTS !== 'undefined')
    ? MARKUP_CONSTANTS.CSS_PREFIX
    : 'markup';

  // --- Detection ---

  /**
   * Detect if the current page contains raw Markdown content.
   * Checks document.contentType and the presence of a <pre> element
   * (which browsers use to display plain text files).
   *
   * @returns {boolean} True if the page appears to contain raw Markdown.
   */
  function _isRawMarkdownPage() {
    // Check content type — plain text files are served as text/plain
    const contentType = document.contentType || '';
    const isPlainText = contentType.startsWith('text/plain');
    const isMarkdownMime = contentType.startsWith('text/markdown') ||
                           contentType.startsWith('text/x-markdown');

    // Check for pre element — browsers wrap plain text in <pre>
    const preElement = document.querySelector('pre');
    const hasPreContent = preElement && preElement.textContent.trim().length > 0;

    // For file:// URLs, the browser wraps content in a <pre> tag
    const isFileUrl = window.location.protocol === 'file:';

    // For https:// URLs (like raw.githubusercontent.com), check content type
    const isHttpsRaw = window.location.protocol === 'https:';

    if (isMarkdownMime) {
      return true;
    }

    if ((isFileUrl || isHttpsRaw) && (isPlainText || hasPreContent)) {
      return true;
    }

    // Also detect if the body only contains a <pre> (common for raw text display)
    if (document.body && document.body.children.length <= 2 && hasPreContent) {
      return true;
    }

    return false;
  }

  /**
   * Extract raw Markdown text from the current page.
   * Handles both <pre>-wrapped content and direct body text.
   *
   * @returns {string} The raw Markdown text, or empty string.
   */
  function _extractRawMarkdown() {
    // Try to get content from <pre> element first (browser default for plain text)
    const preElement = document.querySelector('pre');
    if (preElement) {
      return preElement.textContent || '';
    }

    // Fallback: body text content
    if (document.body) {
      return document.body.textContent || '';
    }

    return '';
  }

  /**
   * Get the filename from the current URL for title fallback.
   *
   * @returns {string} The filename, or empty string.
   */
  function _getFileName() {
    if (typeof MARKUP_FILE_DETECTOR !== 'undefined') {
      const detector = new MARKUP_FILE_DETECTOR();
      return detector.getFileNameFromUrl(window.location.href);
    }

    // Fallback: extract from URL path
    try {
      const path = window.location.pathname;
      const parts = path.split('/');
      return decodeURIComponent(parts[parts.length - 1] || '');
    } catch {
      return '';
    }
  }

  /**
   * Set the page title based on rendered content.
   * Uses the first <h1> text, or falls back to the filename.
   *
   * @param {HTMLElement} container - The rendered content container.
   */
  function _setPageTitle(container) {
    const firstH1 = container.querySelector('h1');
    if (firstH1 && firstH1.textContent.trim()) {
      document.title = firstH1.textContent.trim() + ' — MarkUp';
    } else {
      const fileName = _getFileName();
      document.title = (fileName || 'Markdown') + ' — MarkUp';
    }
  }

  /**
   * Show a styled error message when the pipeline fails.
   * Ensures the page is never left blank.
   *
   * @param {Error} error - The error that occurred.
   * @param {string} rawMarkdown - The original raw Markdown (for fallback display).
   */
  function _showError(error, rawMarkdown) {
    console.error('MarkUp: Pipeline error:', error);

    const helpers = (typeof MARKUP_DOM_HELPERS !== 'undefined')
      ? MARKUP_DOM_HELPERS
      : null;

    // Clear body
    if (document.body) {
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
    }

    // Build error container
    const errorContainer = document.createElement('div');
    errorContainer.id = `${PREFIX}-error`;

    const heading = document.createElement('h2');
    heading.textContent = '⚠️ MarkUp: Rendering Error';

    const message = document.createElement('p');
    message.textContent = error.message || 'An unknown error occurred while rendering Markdown.';

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = 'Show raw Markdown';
    const pre = document.createElement('pre');
    pre.textContent = rawMarkdown || '(no content)';

    details.appendChild(summary);
    details.appendChild(pre);

    errorContainer.appendChild(heading);
    errorContainer.appendChild(message);
    errorContainer.appendChild(details);

    // Inject basic error styles
    const errorStyles = `
      #${PREFIX}-error {
        max-width: 800px;
        margin: 40px auto;
        padding: 24px;
        font-family: system-ui, -apple-system, sans-serif;
        color: #721c24;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 8px;
      }
      #${PREFIX}-error h2 {
        margin: 0 0 12px;
        font-size: 18px;
      }
      #${PREFIX}-error p {
        margin: 0 0 16px;
        font-size: 14px;
      }
      #${PREFIX}-error details {
        margin-top: 16px;
      }
      #${PREFIX}-error summary {
        cursor: pointer;
        font-size: 14px;
        color: #856404;
      }
      #${PREFIX}-error pre {
        margin-top: 8px;
        padding: 12px;
        background: #fff3cd;
        border-radius: 4px;
        overflow-x: auto;
        font-size: 12px;
        white-space: pre-wrap;
        word-wrap: break-word;
        max-height: 400px;
        overflow-y: auto;
      }
    `;

    if (helpers) {
      helpers.addStyles(errorStyles, `${PREFIX}-error-styles`);
    } else {
      const style = document.createElement('style');
      style.id = `${PREFIX}-error-styles`;
      style.textContent = errorStyles;
      document.head.appendChild(style);
    }

    document.body.appendChild(errorContainer);
  }

  // --- MarkUpApp Orchestrator ---

  /**
   * MarkUpApp orchestrates all managers and UI components.
   * This is the central controller for the content script.
   *
   * @class MarkUpApp
   */
  class MarkUpApp {
    constructor() {
      // Managers
      /** @private */
      this._storage = null;
      /** @private */
      this._emitter = null;
      /** @private */
      this._themeManager = null;
      /** @private */
      this._searchController = null;
      /** @private */
      this._printManager = null;
      /** @private */
      this._keyboardManager = null;

      // UI Components
      /** @private */
      this._toolbar = null;
      /** @private */
      this._tocPanel = null;
      /** @private */
      this._searchBar = null;
      /** @private */
      this._settingsPanel = null;

      // Render state
      /** @private */
      this._renderer = null;
      /** @private */
      this._contentContainer = null;
      /** @private */
      this._tocData = null;
    }

    /**
     * Run the full MarkUp pipeline.
     */
    async run() {
      // Step 1: Detect raw Markdown content
      if (!_isRawMarkdownPage()) {
        console.log('MarkUp: Page does not contain raw Markdown. Skipping.');
        return;
      }

      // Step 2: Extract raw Markdown text
      const rawMarkdown = _extractRawMarkdown();
      if (!rawMarkdown.trim()) {
        console.log('MarkUp: No Markdown content found. Skipping.');
        return;
      }

      console.log(`MarkUp: Detected Markdown content (${rawMarkdown.length} chars). Rendering...`);

      try {
        // Step 3: Initialize core managers
        this._initializeManagers();

        // Step 4: Parse and render Markdown
        this._contentContainer = await this._parseAndRender(rawMarkdown);

        // Step 5: Apply syntax highlighting
        this._applySyntaxHighlighting(this._contentContainer);

        // Step 6: Generate TOC data
        this._generateTocData(this._contentContainer);

        // Step 7: Apply persisted theme
        await this._applyTheme();

        // Step 8: Apply persisted typography settings
        await this._applyTypographySettings();

        // Step 9: Mount UI components
        this._mountUIComponents();

        // Step 10: Register keyboard shortcuts
        this._registerKeyboardShortcuts();

        // Step 11: Wire inter-component events
        this._wireEvents();

        // Step 12: Set page title
        _setPageTitle(this._contentContainer);

        // Store references for external access
        this._storeGlobalReferences();

        console.log('MarkUp: Rendering complete.');

      } catch (error) {
        _showError(error, rawMarkdown);
      }
    }

    // --- Initialization ---

    /**
     * Initialize core manager instances.
     * @private
     */
    _initializeManagers() {
      const StorageManagerClass = (typeof MARKUP_STORAGE_MANAGER !== 'undefined') ? MARKUP_STORAGE_MANAGER : null;
      const EventEmitterClass = (typeof MARKUP_EVENT_EMITTER !== 'undefined') ? MARKUP_EVENT_EMITTER : null;
      const SearchControllerClass = (typeof MARKUP_SEARCH_CONTROLLER !== 'undefined') ? MARKUP_SEARCH_CONTROLLER : null;
      const PrintManagerClass = (typeof MARKUP_PRINT_MANAGER !== 'undefined') ? MARKUP_PRINT_MANAGER : null;
      const KeyboardManagerClass = (typeof MARKUP_KEYBOARD_MANAGER !== 'undefined') ? MARKUP_KEYBOARD_MANAGER : null;

      if (StorageManagerClass) {
        this._storage = new StorageManagerClass();
      }

      if (EventEmitterClass) {
        this._emitter = new EventEmitterClass();
      }

      if (SearchControllerClass) {
        this._searchController = new SearchControllerClass();
      }

      if (PrintManagerClass) {
        this._printManager = new PrintManagerClass();
      }

      if (KeyboardManagerClass) {
        this._keyboardManager = new KeyboardManagerClass();
      }
    }

    /**
     * Parse raw Markdown and render to the page.
     *
     * @param {string} rawMarkdown - The raw Markdown text.
     * @returns {HTMLElement} The content container element.
     * @private
     */
    async _parseAndRender(rawMarkdown) {
      // Parse
      const MarkdownParserClass = (typeof MARKUP_MARKDOWN_PARSER !== 'undefined') ? MARKUP_MARKDOWN_PARSER : null;
      if (!MarkdownParserClass) {
        throw new Error('MarkdownParser class not available. Ensure MarkdownParser.js is loaded.');
      }

      const parser = new MarkdownParserClass({
        gfm: true,
        breaks: false,
        silent: true,
      });

      const htmlString = parser.parse(rawMarkdown);
      if (!htmlString || htmlString.trim() === '') {
        throw new Error('Markdown parser returned empty HTML.');
      }

      // Render
      const HtmlRendererClass = (typeof MARKUP_HTML_RENDERER !== 'undefined') ? MARKUP_HTML_RENDERER : null;
      if (!HtmlRendererClass) {
        throw new Error('HtmlRenderer class not available. Ensure HtmlRenderer.js is loaded.');
      }

      this._renderer = new HtmlRendererClass('body');
      this._renderer.render(htmlString);

      return this._renderer.getContentContainer();
    }

    /**
     * Apply syntax highlighting to code blocks.
     *
     * @param {HTMLElement} container - The content container.
     * @private
     */
    _applySyntaxHighlighting(container) {
      const SyntaxHighlighterClass = (typeof MARKUP_SYNTAX_HIGHLIGHTER !== 'undefined') ? MARKUP_SYNTAX_HIGHLIGHTER : null;
      if (SyntaxHighlighterClass) {
        const highlighter = new SyntaxHighlighterClass({ autoDetect: true });
        const count = highlighter.highlightAll(container);
        console.log(`MarkUp: Syntax highlighted ${count} code block(s).`);
      } else {
        console.warn('MarkUp: SyntaxHighlighter not available. Code blocks will not be highlighted.');
      }
    }

    /**
     * Generate TOC data from rendered content.
     *
     * @param {HTMLElement} container - The content container.
     * @private
     */
    _generateTocData(container) {
      const TocGeneratorClass = (typeof MARKUP_TOC_GENERATOR !== 'undefined') ? MARKUP_TOC_GENERATOR : null;
      if (TocGeneratorClass) {
        const tocGenerator = new TocGeneratorClass();
        const headings = tocGenerator.generate(container);
        console.log(`MarkUp: Generated TOC with ${headings.length} heading(s).`);

        this._tocData = {
          headings: headings,
          tree: tocGenerator.getTree(),
          html: tocGenerator.toHtml(),
        };

        // Store for external access
        window.__MARKUP_TOC_DATA__ = this._tocData;
      } else {
        console.warn('MarkUp: TocGenerator not available. TOC will not be generated.');
      }
    }

    /**
     * Apply the persisted theme.
     * @private
     */
    async _applyTheme() {
      const ThemeManagerClass = (typeof MARKUP_THEME_MANAGER !== 'undefined') ? MARKUP_THEME_MANAGER : null;
      if (ThemeManagerClass && this._storage) {
        try {
          this._themeManager = new ThemeManagerClass(this._storage, this._emitter);
          await this._themeManager.init();
          console.log(`MarkUp: Theme applied: ${this._themeManager.getTheme()}`);
        } catch (err) {
          console.warn('MarkUp: Theme initialization failed:', err);
        }
      }
    }

    /**
     * Apply persisted typography settings (font size, line height, font family).
     * @private
     */
    async _applyTypographySettings() {
      if (!this._storage || !this._contentContainer) {
        return;
      }

      try {
        const fontSize = await this._storage.get('fontSize');
        if (fontSize && typeof fontSize === 'number') {
          this._contentContainer.style.setProperty('--markup-font-size-base', `${fontSize}px`);
        }

        const lineHeight = await this._storage.get('lineHeight');
        if (lineHeight && typeof lineHeight === 'number') {
          this._contentContainer.style.setProperty('--markup-line-height', String(lineHeight));
        }

        const fontFamily = await this._storage.get('fontFamily');
        if (fontFamily && typeof fontFamily === 'string' && fontFamily !== 'system-ui') {
          this._contentContainer.style.setProperty('--markup-font-body', fontFamily);
        }
      } catch (err) {
        console.warn('MarkUp: Failed to apply typography settings:', err);
      }
    }

    // --- UI Components ---

    /**
     * Mount all UI components.
     * @private
     */
    _mountUIComponents() {
      const mountTarget = document.body;

      // Toolbar
      const ToolbarClass = (typeof MARKUP_TOOLBAR_COMPONENT !== 'undefined') ? MARKUP_TOOLBAR_COMPONENT : null;
      if (ToolbarClass && this._emitter) {
        try {
          this._toolbar = new ToolbarClass(this._emitter);
          this._toolbar.mount(mountTarget);
        } catch (err) {
          console.warn('MarkUp: Toolbar mount failed:', err);
        }
      }

      // TOC Panel
      const TocPanelClass = (typeof MARKUP_TOC_PANEL_COMPONENT !== 'undefined') ? MARKUP_TOC_PANEL_COMPONENT : null;
      if (TocPanelClass) {
        try {
          this._tocPanel = new TocPanelClass({
            tocData: this._tocData,
            contentContainer: this._contentContainer,
          });
          this._tocPanel.mount(mountTarget);
        } catch (err) {
          console.warn('MarkUp: TOC Panel mount failed:', err);
        }
      }

      // Search Bar
      const SearchBarClass = (typeof MARKUP_SEARCH_BAR_COMPONENT !== 'undefined') ? MARKUP_SEARCH_BAR_COMPONENT : null;
      if (SearchBarClass && this._searchController) {
        try {
          this._searchBar = new SearchBarComponent(this._searchController, this._contentContainer);
          this._searchBar.mount(mountTarget);
        } catch (err) {
          console.warn('MarkUp: Search Bar mount failed:', err);
        }
      }

      // Settings Panel
      const SettingsPanelClass = (typeof MARKUP_SETTINGS_PANEL_COMPONENT !== 'undefined') ? MARKUP_SETTINGS_PANEL_COMPONENT : null;
      if (SettingsPanelClass && this._storage && this._themeManager && this._emitter) {
        try {
          this._settingsPanel = new SettingsPanelClass(
            this._storage,
            this._themeManager,
            this._emitter,
            this._contentContainer
          );
          this._settingsPanel.mount(mountTarget);
        } catch (err) {
          console.warn('MarkUp: Settings Panel mount failed:', err);
        }
      }
    }

    /**
     * Register keyboard shortcuts.
     * @private
     */
    _registerKeyboardShortcuts() {
      if (!this._keyboardManager) {
        return;
      }

      const EVENTS = (typeof MARKUP_CONSTANTS !== 'undefined') ? MARKUP_CONSTANTS.EVENTS : {};

      // Ctrl+Shift+T → Toggle TOC
      this._keyboardManager.register('ctrl+shift+t', () => {
        if (this._emitter) {
          this._emitter.emit(EVENTS.TOC_TOGGLED || 'tocToggled');
        }
      });

      // Ctrl+Shift+F → Toggle Search
      this._keyboardManager.register('ctrl+shift+f', () => {
        if (this._emitter) {
          this._emitter.emit(EVENTS.SEARCH_TOGGLED || 'searchToggled');
        }
      });

      // Ctrl+Shift+D → Cycle Theme
      this._keyboardManager.register('ctrl+shift+d', () => {
        if (this._themeManager) {
          const themes = this._themeManager.getAvailableThemes();
          const current = this._themeManager.getTheme();
          const idx = themes.indexOf(current);
          const next = themes[(idx + 1) % themes.length];
          this._themeManager.applyTheme(next);
        }
      });

      // Ctrl+P → Print (intercept browser default)
      this._keyboardManager.register('ctrl+p', () => {
        if (this._printManager) {
          this._printManager.preparePrintView();
        }
      });

      this._keyboardManager.enable();
    }

    /**
     * Wire inter-component events via EventEmitter.
     * @private
     */
    _wireEvents() {
      if (!this._emitter) {
        return;
      }

      const EVENTS = (typeof MARKUP_CONSTANTS !== 'undefined') ? MARKUP_CONSTANTS.EVENTS : {};

      // TOC Toggle
      this._emitter.on(EVENTS.TOC_TOGGLED || 'tocToggled', () => {
        if (this._tocPanel) {
          this._tocPanel.toggle();
        }
      });

      // Theme Cycle (from toolbar button)
      this._emitter.on(EVENTS.THEME_CHANGED || 'themeChanged', (data) => {
        // If data has a theme property, it came from ThemeManager (already applied)
        // If no data, it came from toolbar button — cycle to next theme
        if (!data && this._themeManager) {
          const themes = this._themeManager.getAvailableThemes();
          const current = this._themeManager.getTheme();
          const idx = themes.indexOf(current);
          const next = themes[(idx + 1) % themes.length];
          this._themeManager.applyTheme(next);
        }
      });

      // Search Toggle
      this._emitter.on(EVENTS.SEARCH_TOGGLED || 'searchToggled', () => {
        if (this._searchBar) {
          this._searchBar.toggle();
        }
      });

      // Print
      this._emitter.on(EVENTS.PRINT_REQUESTED || 'printRequested', () => {
        if (this._printManager) {
          this._printManager.preparePrintView();
        }
      });

      // Settings Toggle
      this._emitter.on(EVENTS.SETTINGS_TOGGLED || 'settingsToggled', () => {
        if (this._settingsPanel) {
          this._settingsPanel.toggle();
        }
      });
    }

    /**
     * Store global references for external access and debugging.
     * @private
     */
    _storeGlobalReferences() {
      window.__MARKUP_RENDERER__ = this._renderer;
      window.__MARKUP_THEME_MANAGER__ = this._themeManager;
      window.__MARKUP_EVENT_EMITTER__ = this._emitter;
      window.__MARKUP_APP__ = this;
    }
  }

  // --- Entry Point ---

  const app = new MarkUpApp();
  app.run();

})();
