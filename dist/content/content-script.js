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

      // Edge case: Empty file
      if (!rawMarkdown.trim()) {
        this._showEmptyFileMessage();
        return;
      }

      // Edge case: Binary file detection
      if (_isBinaryContent(rawMarkdown)) {
        this._showBinaryFileMessage();
        return;
      }

      // Store raw markdown for toggle feature
      this._rawMarkdown = rawMarkdown;

      // Edge case: Very large file (>1MB)
      const LARGE_FILE_THRESHOLD = 1000000;
      let markdownToRender = rawMarkdown;
      this._isLargeFile = rawMarkdown.length > LARGE_FILE_THRESHOLD;
      if (this._isLargeFile) {
        const lines = rawMarkdown.split('\n');
        markdownToRender = lines.slice(0, 500).join('\n');
        this._remainingMarkdown = rawMarkdown;
        this._renderedLineCount = 500;
        this._totalLineCount = lines.length;
      }

      console.log(`MarkUp: Detected Markdown content (${rawMarkdown.length} chars). Rendering...`);

      // Show loading spinner for large files
      if (rawMarkdown.length > 50000) {
        this._showLoadingSpinner();
      }

      try {
        // Step 3: Initialize core managers
        this._initializeManagers();

        // Step 4: Parse and render Markdown
        this._contentContainer = await this._parseAndRender(markdownToRender);

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

        // Step 13: Add raw/rendered toggle
        this._addRawToggle();

        // Step 14: Show large file warning if applicable
        if (this._isLargeFile) {
          this._showLargeFileWarning();
        }

        // Remove loading spinner
        this._removeLoadingSpinner();

        // Store references for external access
        this._storeGlobalReferences();

        // Step 15: Track as recent file
        this._trackRecentFile();

        console.log('MarkUp: Rendering complete.');

      } catch (error) {
        this._removeLoadingSpinner();
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

    // --- Recent File Tracking ---

    /**
     * Send ADD_RECENT_FILE message to service worker.
     * @private
     */
    _trackRecentFile() {
      try {
        const MessageBusClass = (typeof MARKUP_MESSAGE_BUS !== 'undefined') ? MARKUP_MESSAGE_BUS : null;
        if (MessageBusClass) {
          const bus = new MessageBusClass();
          bus.send('ADD_RECENT_FILE', {
            url: window.location.href,
            title: document.title.replace(' — MarkUp', ''),
          }).catch(() => {
            // Service worker may not be ready — that's OK
          });
        }
      } catch (err) {
        console.log('MarkUp: Recent file tracking skipped.');
      }
    }

    // --- Loading Spinner ---

    /**
     * Show a loading spinner while parsing.
     * @private
     */
    _showLoadingSpinner() {
      const spinner = document.createElement('div');
      spinner.id = `${PREFIX}-loading-spinner`;
      spinner.setAttribute('role', 'status');
      spinner.setAttribute('aria-label', 'Loading Markdown content');

      const dot1 = document.createElement('div');
      dot1.className = `${PREFIX}-spinner-dot`;
      const dot2 = document.createElement('div');
      dot2.className = `${PREFIX}-spinner-dot`;
      const dot3 = document.createElement('div');
      dot3.className = `${PREFIX}-spinner-dot`;

      const text = document.createElement('p');
      text.className = `${PREFIX}-spinner-text`;
      text.textContent = 'Rendering Markdown…';

      spinner.appendChild(dot1);
      spinner.appendChild(dot2);
      spinner.appendChild(dot3);
      spinner.appendChild(text);

      // Clear body and show spinner
      if (document.body) {
        while (document.body.firstChild) {
          document.body.removeChild(document.body.firstChild);
        }
        document.body.appendChild(spinner);
      }
    }

    /**
     * Remove the loading spinner.
     * @private
     */
    _removeLoadingSpinner() {
      const spinner = document.getElementById(`${PREFIX}-loading-spinner`);
      if (spinner) {
        spinner.remove();
      }
    }

    // --- Raw/Rendered Toggle ---

    /**
     * Add a 'Back to raw' toggle button.
     * @private
     */
    _addRawToggle() {
      const toggleBtn = document.createElement('button');
      toggleBtn.id = `${PREFIX}-raw-toggle`;
      toggleBtn.className = `${PREFIX}-raw-toggle-btn`;
      toggleBtn.textContent = '📄 Raw';
      toggleBtn.title = 'Toggle between rendered and raw Markdown';
      toggleBtn.setAttribute('aria-label', 'Toggle raw Markdown view');
      toggleBtn.setAttribute('aria-pressed', 'false');

      this._isRawView = false;
      this._savedRenderedContent = null;

      const self = this;
      toggleBtn.addEventListener('click', function _onRawToggle() {
        if (self._isRawView) {
          // Switch back to rendered view
          if (self._savedRenderedContent && document.body) {
            while (document.body.firstChild) {
              document.body.removeChild(document.body.firstChild);
            }
            document.body.appendChild(self._savedRenderedContent);
            document.body.appendChild(toggleBtn);
          }
          toggleBtn.textContent = '📄 Raw';
          toggleBtn.setAttribute('aria-pressed', 'false');
          self._isRawView = false;
        } else {
          // Switch to raw view
          self._savedRenderedContent = document.body.querySelector(`.${PREFIX}-content`);
          const rawPre = document.createElement('pre');
          rawPre.className = `${PREFIX}-raw-view`;
          rawPre.textContent = self._rawMarkdown || '';

          // Hide all body children except toggle
          const children = Array.from(document.body.children);
          children.forEach(child => {
            if (child !== toggleBtn) {
              child.style.display = 'none';
            }
          });
          document.body.appendChild(rawPre);
          toggleBtn.textContent = '✨ Rendered';
          toggleBtn.setAttribute('aria-pressed', 'true');
          self._isRawView = true;
        }
      });

      document.body.appendChild(toggleBtn);
    }

    // --- Edge Case UIs ---

    /**
     * Show styled message for empty files.
     * @private
     */
    _showEmptyFileMessage() {
      _clearBody();
      const container = document.createElement('div');
      container.id = `${PREFIX}-empty-file`;
      container.className = `${PREFIX}-edge-case-msg`;

      const icon = document.createElement('div');
      icon.className = `${PREFIX}-edge-icon`;
      icon.textContent = '📄';

      const heading = document.createElement('h2');
      heading.textContent = 'This file is empty';

      const message = document.createElement('p');
      message.textContent = 'This Markdown file doesn\'t contain any content yet.';

      container.appendChild(icon);
      container.appendChild(heading);
      container.appendChild(message);

      _injectEdgeCaseStyles();
      document.body.appendChild(container);
    }

    /**
     * Show styled message for binary files.
     * @private
     */
    _showBinaryFileMessage() {
      _clearBody();
      const container = document.createElement('div');
      container.id = `${PREFIX}-binary-file`;
      container.className = `${PREFIX}-edge-case-msg`;

      const icon = document.createElement('div');
      icon.className = `${PREFIX}-edge-icon`;
      icon.textContent = '⚠️';

      const heading = document.createElement('h2');
      heading.textContent = 'Not a valid Markdown file';

      const message = document.createElement('p');
      message.textContent = 'This file appears to contain binary data and cannot be rendered as Markdown.';

      container.appendChild(icon);
      container.appendChild(heading);
      container.appendChild(message);

      _injectEdgeCaseStyles();
      document.body.appendChild(container);
    }

    /**
     * Show a large file warning with 'Load more' button.
     * @private
     */
    _showLargeFileWarning() {
      const warning = document.createElement('div');
      warning.id = `${PREFIX}-large-file-warning`;
      warning.className = `${PREFIX}-large-file-bar`;

      const text = document.createElement('span');
      text.textContent = `⚠️ Large file: showing first ${this._renderedLineCount} of ${this._totalLineCount} lines.`;

      const loadMoreBtn = document.createElement('button');
      loadMoreBtn.textContent = 'Load All';
      loadMoreBtn.className = `${PREFIX}-load-more-btn`;
      loadMoreBtn.setAttribute('aria-label', 'Load entire document');

      const self = this;
      loadMoreBtn.addEventListener('click', function _onLoadMore() {
        // Re-render with full content
        warning.remove();
        self._contentContainer = null;
        self._parseAndRender(self._remainingMarkdown).then(container => {
          self._contentContainer = container;
          self._applySyntaxHighlighting(container);
          _setPageTitle(container);
        }).catch(err => {
          console.warn('MarkUp: Failed to load full document:', err);
        });
      });

      warning.appendChild(text);
      warning.appendChild(loadMoreBtn);

      // Insert at the top of body
      if (document.body.firstChild) {
        document.body.insertBefore(warning, document.body.firstChild);
      } else {
        document.body.appendChild(warning);
      }
    }
  }

  // --- Helper Functions for Edge Cases ---

  /**
   * Detect if content appears to be binary (not valid text).
   * Checks for null bytes and high ratio of non-printable characters.
   *
   * @param {string} content - The raw content to check.
   * @returns {boolean} True if content appears binary.
   */
  function _isBinaryContent(content) {
    if (!content) return false;

    // Check first 8KB for binary indicators
    const sample = content.substring(0, 8192);

    // Null bytes are a strong binary indicator
    if (sample.indexOf('\0') !== -1) return true;

    // Count non-printable characters (excluding common whitespace)
    let nonPrintable = 0;
    for (let i = 0; i < sample.length; i++) {
      const code = sample.charCodeAt(i);
      if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
        nonPrintable++;
      }
    }

    // If more than 10% non-printable, likely binary
    return (nonPrintable / sample.length) > 0.1;
  }

  /**
   * Clear all children from document.body safely.
   */
  function _clearBody() {
    if (document.body) {
      while (document.body.firstChild) {
        document.body.removeChild(document.body.firstChild);
      }
    }
  }

  /**
   * Inject styles for edge case messages (empty file, binary, etc.).
   */
  function _injectEdgeCaseStyles() {
    const styleId = `${PREFIX}-edge-case-styles`;
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .${PREFIX}-edge-case-msg {
        max-width: 500px;
        margin: 80px auto;
        padding: 40px;
        text-align: center;
        font-family: system-ui, -apple-system, sans-serif;
        color: #24292f;
        background: #ffffff;
        border: 1px solid #d0d7de;
        border-radius: 12px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      }
      .${PREFIX}-edge-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }
      .${PREFIX}-edge-case-msg h2 {
        font-size: 20px;
        font-weight: 600;
        margin: 0 0 8px;
      }
      .${PREFIX}-edge-case-msg p {
        font-size: 14px;
        color: #656d76;
        margin: 0;
        line-height: 1.5;
      }
      .${PREFIX}-loading-spinner-container,
      #${PREFIX}-loading-spinner {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 200px;
        gap: 16px;
        font-family: system-ui, -apple-system, sans-serif;
      }
      .${PREFIX}-spinner-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        background: #0969da;
        border-radius: 50%;
        animation: ${PREFIX}-bounce 1.4s infinite ease-in-out both;
      }
      .${PREFIX}-spinner-dot:nth-child(1) { animation-delay: -0.32s; }
      .${PREFIX}-spinner-dot:nth-child(2) { animation-delay: -0.16s; }
      .${PREFIX}-spinner-dot:nth-child(3) { animation-delay: 0s; }
      @keyframes ${PREFIX}-bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1.0); }
      }
      .${PREFIX}-spinner-text {
        font-size: 14px;
        color: #656d76;
      }
      .${PREFIX}-raw-toggle-btn {
        position: fixed;
        bottom: 16px;
        left: 16px;
        z-index: 10001;
        padding: 8px 16px;
        font-size: 13px;
        font-family: system-ui, -apple-system, sans-serif;
        font-weight: 500;
        color: #24292f;
        background: #ffffff;
        border: 1px solid #d0d7de;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        transition: all 0.15s ease;
      }
      .${PREFIX}-raw-toggle-btn:hover {
        background: #f6f8fa;
        border-color: #a3aab2;
      }
      .${PREFIX}-raw-view {
        max-width: 900px;
        margin: 24px auto;
        padding: 24px;
        font-family: monospace;
        font-size: 13px;
        white-space: pre-wrap;
        word-wrap: break-word;
        color: #24292f;
        background: #f6f8fa;
        border: 1px solid #d0d7de;
        border-radius: 8px;
        line-height: 1.5;
      }
      .${PREFIX}-large-file-bar {
        position: sticky;
        top: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 10px 16px;
        background: #fff8c5;
        border-bottom: 1px solid #d4a72c;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        color: #6a5306;
      }
      .${PREFIX}-load-more-btn {
        padding: 4px 12px;
        font-size: 12px;
        font-family: inherit;
        font-weight: 500;
        color: #ffffff;
        background: #0969da;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .${PREFIX}-load-more-btn:hover {
        background: #0860ca;
      }
    `;
    document.head.appendChild(style);
  }

  // --- Entry Point ---

  const app = new MarkUpApp();
  app.run();

})();
