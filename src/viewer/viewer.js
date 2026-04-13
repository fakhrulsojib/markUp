/**
 * MarkUp — Viewer Extension Page Controller
 *
 * IIFE controller that fetches and renders Markdown content from a URL
 * passed via query parameters. Runs as an extension page (NOT a content script).
 *
 * Entry flow:
 * 1. Parse ?url= and ?filename= query params.
 * 2. Show loading spinner with filename.
 * 3. Fetch the Markdown content via fetch().
 * 4. Run parse → render → highlight → TOC → theme → UI pipeline.
 * 5. Handle edge cases: auth failure, network error, binary, empty, large file.
 *
 * Reuses the same global classes (MARKUP_MARKDOWN_PARSER, MARKUP_HTML_RENDERER, etc.)
 * as the content script — identical rendering pipeline, different entry point.
 */

'use strict';

(function viewerController() {

  const PREFIX = (typeof MARKUP_CONSTANTS !== 'undefined')
    ? MARKUP_CONSTANTS.CSS_PREFIX
    : 'markup';

  const _Logger = (typeof MARKUP_LOGGER !== 'undefined') ? MARKUP_LOGGER : null;

  let _storage = null;
  let _emitter = null;
  let _themeManager = null;
  let _searchController = null;
  let _printManager = null;
  let _keyboardManager = null;
  let _messageBus = null;
  let _toolbar = null;
  let _tocPanel = null;
  let _searchBar = null;
  let _settingsPanel = null;
  let _contentContainer = null;
  let _tocData = null;
  let _rawMarkdown = '';
  let _cspStrict = false;
  let _originalUrl = '';
  let _originalFilename = '';

  document.addEventListener('DOMContentLoaded', _init);

  async function _init() {
    if (_Logger) {
      await _Logger.init();
    }

    const params = new URLSearchParams(window.location.search);
    _originalUrl = params.get('url') || '';
    _originalFilename = params.get('filename') || '';

    if (!_originalUrl) {
      _showError('No URL provided', 'The viewer requires a ?url= query parameter with the Markdown file URL.');
      return;
    }

    if (_Logger) { _Logger.debug('Viewer', 'Loading:', _originalUrl, 'Filename:', _originalFilename); }

    _showLoadingSpinner(_originalFilename);

    try {
      const response = await fetch(_originalUrl);

      if (response.status === 401 || response.status === 403) {
        _removeLoadingSpinner();
        _showAuthError(response.status);
        return;
      }

      if (!response.ok) {
        _removeLoadingSpinner();
        _showError(
          'Could not load file',
          'The server returned HTTP ' + response.status + '. The file may have expired or moved.'
        );
        return;
      }

      const text = await response.text();

      if (!text.trim()) {
        _removeLoadingSpinner();
        _showEmptyFile();
        return;
      }

      if (_isBinaryContent(text)) {
        _removeLoadingSpinner();
        _showBinaryError();
        return;
      }

      _rawMarkdown = text;

      const LARGE_FILE_THRESHOLD = 1000000;
      let markdownToRender = text;
      let isLargeFile = text.length > LARGE_FILE_THRESHOLD;
      if (isLargeFile) {
        const lines = text.split('\n');
        markdownToRender = lines.slice(0, 500).join('\n');
      }

      await _runPipeline(markdownToRender);

      if (isLargeFile) {
        _showLargeFileWarning(text);
      }

      _removeLoadingSpinner();

      _setPageTitle();

      _addSaveButton();

      _trackRecentFile();

      if (_Logger) { _Logger.debug('Viewer', 'Rendering complete.'); }

    } catch (err) {
      _removeLoadingSpinner();
      if (_Logger) { _Logger.debug('Viewer', 'Fetch error:', err.message); }

      const isCORS = err instanceof TypeError;
      const heading = isCORS
        ? 'Blocked by cross-origin policy'
        : 'Could not load file';
      const message = isCORS
        ? 'The server does not allow this extension to fetch the file directly (CORS restriction). ' +
          'This is common with downloads from Google Chat, Slack, and similar services.'
        : 'Failed to fetch the file: ' + (err.message || 'Unknown error.');

      _showCORSError(heading, message);
    }
  }

  async function _runPipeline(markdown) {
    _initializeManagers();

    if (_storage) {
      try {
        const cspStrictVal = await _storage.get('cspStrict');
        _cspStrict = cspStrictVal === true;
      } catch (err) {
      }
    }

    const MarkdownParserClass = (typeof MARKUP_MARKDOWN_PARSER !== 'undefined') ? MARKUP_MARKDOWN_PARSER : null;
    if (!MarkdownParserClass) {
      throw new Error('MarkdownParser class not available.');
    }

    const parser = new MarkdownParserClass({ gfm: true, breaks: false, silent: true });
    const htmlString = parser.parse(markdown);

    if (!htmlString || htmlString.trim() === '') {
      throw new Error('Markdown parser returned empty HTML.');
    }

    const HtmlRendererClass = (typeof MARKUP_HTML_RENDERER !== 'undefined') ? MARKUP_HTML_RENDERER : null;
    if (!HtmlRendererClass) {
      throw new Error('HtmlRenderer class not available.');
    }

    const SanitizerClass = (typeof MARKUP_SANITIZER !== 'undefined') ? MARKUP_SANITIZER : null;
    const rendererOptions = {};
    if (_cspStrict && SanitizerClass) {
      rendererOptions.sanitizerConfig = SanitizerClass.createStrictConfig();
    }

    const renderer = new HtmlRendererClass('body', rendererOptions);
    renderer.render(htmlString);
    _contentContainer = renderer.getContentContainer();

    const SyntaxHighlighterClass = (typeof MARKUP_SYNTAX_HIGHLIGHTER !== 'undefined') ? MARKUP_SYNTAX_HIGHLIGHTER : null;
    if (SyntaxHighlighterClass) {
      const highlighter = new SyntaxHighlighterClass({ autoDetect: true });
      highlighter.highlightAll(_contentContainer);
    }

    const TocGeneratorClass = (typeof MARKUP_TOC_GENERATOR !== 'undefined') ? MARKUP_TOC_GENERATOR : null;
    if (TocGeneratorClass) {
      const tocGenerator = new TocGeneratorClass();
      const headings = tocGenerator.generate(_contentContainer);
      _tocData = {
        headings: headings,
        tree: tocGenerator.getTree(),
        html: tocGenerator.toHtml(),
      };
    }

    const ThemeManagerClass = (typeof MARKUP_THEME_MANAGER !== 'undefined') ? MARKUP_THEME_MANAGER : null;
    if (ThemeManagerClass && _storage) {
      try {
        _themeManager = new ThemeManagerClass(_storage, _emitter);
        await _themeManager.init();
      } catch (err) {
        console.warn('MarkUp Viewer: Theme initialization failed:', err);
      }
    }

    await _applyTypographySettings();

    _mountUIComponents();

    _registerKeyboardShortcuts();

    _wireEvents();

    _wireMessageBusListeners();
  }

  function _initializeManagers() {
    const StorageManagerClass = (typeof MARKUP_STORAGE_MANAGER !== 'undefined') ? MARKUP_STORAGE_MANAGER : null;
    const EventEmitterClass = (typeof MARKUP_EVENT_EMITTER !== 'undefined') ? MARKUP_EVENT_EMITTER : null;
    const SearchControllerClass = (typeof MARKUP_SEARCH_CONTROLLER !== 'undefined') ? MARKUP_SEARCH_CONTROLLER : null;
    const PrintManagerClass = (typeof MARKUP_PRINT_MANAGER !== 'undefined') ? MARKUP_PRINT_MANAGER : null;
    const KeyboardManagerClass = (typeof MARKUP_KEYBOARD_MANAGER !== 'undefined') ? MARKUP_KEYBOARD_MANAGER : null;
    const MessageBusClass = (typeof MARKUP_MESSAGE_BUS !== 'undefined') ? MARKUP_MESSAGE_BUS : null;

    if (StorageManagerClass) _storage = new StorageManagerClass();
    if (EventEmitterClass) _emitter = new EventEmitterClass();
    if (SearchControllerClass) _searchController = new SearchControllerClass();
    if (PrintManagerClass) _printManager = new PrintManagerClass();
    if (KeyboardManagerClass) _keyboardManager = new KeyboardManagerClass();
    if (MessageBusClass) _messageBus = new MessageBusClass();
  }

  async function _applyTypographySettings() {
    if (!_storage || !_contentContainer) return;

    try {
      const fontSize = await _storage.get('fontSize');
      if (fontSize && typeof fontSize === 'number') {
        _contentContainer.style.setProperty('--markup-font-size-base', fontSize + 'px');
      }

      const lineHeight = await _storage.get('lineHeight');
      if (lineHeight && typeof lineHeight === 'number') {
        _contentContainer.style.setProperty('--markup-line-height', String(lineHeight));
      }

      const fontFamily = await _storage.get('fontFamily');
      if (fontFamily && typeof fontFamily === 'string' && fontFamily !== 'system-ui') {
        _contentContainer.style.setProperty('--markup-font-body', fontFamily);
      }
    } catch (err) {
      console.warn('MarkUp Viewer: Failed to apply typography settings:', err);
    }
  }

  function _mountUIComponents() {
    const mountTarget = document.body;

    const ToolbarClass = (typeof MARKUP_TOOLBAR_COMPONENT !== 'undefined') ? MARKUP_TOOLBAR_COMPONENT : null;
    if (ToolbarClass && _emitter) {
      try {
        _toolbar = new ToolbarClass(_emitter, { storageManager: _storage });
        _toolbar.mount(mountTarget);
      } catch (err) {
        console.warn('MarkUp Viewer: Toolbar mount failed:', err);
      }
    }

    const TocPanelClass = (typeof MARKUP_TOC_PANEL_COMPONENT !== 'undefined') ? MARKUP_TOC_PANEL_COMPONENT : null;
    if (TocPanelClass) {
      try {
        _tocPanel = new TocPanelClass({
          tocData: _tocData,
          contentContainer: _contentContainer,
        });
        _tocPanel.mount(mountTarget);
      } catch (err) {
        console.warn('MarkUp Viewer: TOC Panel mount failed:', err);
      }
    }

    const SearchBarClass = (typeof MARKUP_SEARCH_BAR_COMPONENT !== 'undefined') ? MARKUP_SEARCH_BAR_COMPONENT : null;
    if (SearchBarClass && _searchController) {
      try {
        _searchBar = new SearchBarClass(_searchController, _contentContainer);
        _searchBar.mount(mountTarget);
      } catch (err) {
        console.warn('MarkUp Viewer: Search Bar mount failed:', err);
      }
    }

    const SettingsPanelClass = (typeof MARKUP_SETTINGS_PANEL_COMPONENT !== 'undefined') ? MARKUP_SETTINGS_PANEL_COMPONENT : null;
    if (SettingsPanelClass && _storage && _themeManager && _emitter) {
      try {
        _settingsPanel = new SettingsPanelClass(_storage, _themeManager, _emitter, _contentContainer);
        _settingsPanel.mount(mountTarget);
      } catch (err) {
        console.warn('MarkUp Viewer: Settings Panel mount failed:', err);
      }
    }
  }

  function _registerKeyboardShortcuts() {
    if (!_keyboardManager) return;

    const EVENTS = (typeof MARKUP_CONSTANTS !== 'undefined') ? MARKUP_CONSTANTS.EVENTS : {};

    _keyboardManager.register('alt+t', () => {
      if (_emitter) _emitter.emit(EVENTS.TOC_TOGGLED || 'tocToggled');
    });

    _keyboardManager.register('alt+f', () => {
      if (_emitter) _emitter.emit(EVENTS.SEARCH_TOGGLED || 'searchToggled');
    });

    _keyboardManager.register('alt+d', () => {
      if (_themeManager) {
        const themes = _themeManager.getAvailableThemes();
        const current = _themeManager.getTheme();
        const idx = themes.indexOf(current);
        const next = themes[(idx + 1) % themes.length];
        _themeManager.applyTheme(next);
      }
    });

    _keyboardManager.register('alt+p', () => {
      if (_printManager) _printManager.preparePrintView();
    });

    _keyboardManager.enable();
  }

  function _wireEvents() {
    if (!_emitter) return;

    const EVENTS = (typeof MARKUP_CONSTANTS !== 'undefined') ? MARKUP_CONSTANTS.EVENTS : {};

    _emitter.on(EVENTS.TOC_TOGGLED || 'tocToggled', () => {
      if (_tocPanel) _tocPanel.toggle();
    });

    _emitter.on(EVENTS.THEME_CHANGED || 'themeChanged', (data) => {
      if (!data && _themeManager) {
        const themes = _themeManager.getAvailableThemes();
        const current = _themeManager.getTheme();
        const idx = themes.indexOf(current);
        const next = themes[(idx + 1) % themes.length];
        _themeManager.applyTheme(next);
        if (_settingsPanel && typeof _settingsPanel.updateThemeSelection === 'function') {
          _settingsPanel.updateThemeSelection(next);
        }
      }
    });

    _emitter.on(EVENTS.SEARCH_TOGGLED || 'searchToggled', () => {
      if (_searchBar) _searchBar.toggle();
    });

    _emitter.on(EVENTS.PRINT_REQUESTED || 'printRequested', () => {
      if (_printManager) _printManager.preparePrintView();
    });

    _emitter.on(EVENTS.SETTINGS_TOGGLED || 'settingsToggled', () => {
      if (_settingsPanel) _settingsPanel.toggle();
    });
  }

  function _wireMessageBusListeners() {
    if (!_messageBus) return;

    _messageBus.listen('APPLY_THEME', (payload) => {
      if (payload && payload.theme && _themeManager) {
        _themeManager.applyTheme(payload.theme);
        if (_settingsPanel && typeof _settingsPanel.updateThemeSelection === 'function') {
          _settingsPanel.updateThemeSelection(payload.theme);
        }
      }
      return { success: true };
    });

    _messageBus.listen('APPLY_FONT_SIZE', (payload) => {
      if (payload && typeof payload.fontSize === 'number' && _contentContainer) {
        _contentContainer.style.setProperty('--markup-font-size-base', payload.fontSize + 'px');
      }
      return { success: true };
    });

    _messageBus.listen('APPLY_LINE_HEIGHT', (payload) => {
      if (payload && typeof payload.lineHeight === 'number' && _contentContainer) {
        _contentContainer.style.setProperty('--markup-line-height', String(payload.lineHeight));
      }
      return { success: true };
    });

    _messageBus.listen('APPLY_FONT_FAMILY', (payload) => {
      if (payload && typeof payload.fontFamily === 'string' && _contentContainer) {
        if (payload.fontFamily === 'system-ui') {
          _contentContainer.style.removeProperty('--markup-font-body');
        } else {
          _contentContainer.style.setProperty('--markup-font-body', payload.fontFamily);
        }
      }
      return { success: true };
    });

    _messageBus.listen('APPLY_CSP_STRICT', (payload) => {
      if (payload && typeof payload.cspStrict === 'boolean') {
        _cspStrict = payload.cspStrict;
        _reRender();
      }
      return { success: true };
    });

    _messageBus.listen('APPLY_DEBUG_LOG', (payload) => {
      if (_Logger && payload) {
        _Logger.setEnabled(payload.debugLog === true);
      }
      return { success: true };
    });
  }

  async function _reRender() {
    if (!_rawMarkdown) return;

    try {
      if (_Logger) { _Logger.debug('Viewer', 'Re-rendering with updated settings...'); }

      const MarkdownParserClass = (typeof MARKUP_MARKDOWN_PARSER !== 'undefined') ? MARKUP_MARKDOWN_PARSER : null;
      const HtmlRendererClass = (typeof MARKUP_HTML_RENDERER !== 'undefined') ? MARKUP_HTML_RENDERER : null;
      const SanitizerClass = (typeof MARKUP_SANITIZER !== 'undefined') ? MARKUP_SANITIZER : null;

      if (!MarkdownParserClass || !HtmlRendererClass) return;

      const parser = new MarkdownParserClass({ gfm: true, breaks: false, silent: true });
      const htmlString = parser.parse(_rawMarkdown);

      const rendererOptions = {};
      if (_cspStrict && SanitizerClass) {
        rendererOptions.sanitizerConfig = SanitizerClass.createStrictConfig();
      }

      const renderer = new HtmlRendererClass('body', rendererOptions);
      renderer.render(htmlString);
      _contentContainer = renderer.getContentContainer();

      const SyntaxHighlighterClass = (typeof MARKUP_SYNTAX_HIGHLIGHTER !== 'undefined') ? MARKUP_SYNTAX_HIGHLIGHTER : null;
      if (SyntaxHighlighterClass) {
        const highlighter = new SyntaxHighlighterClass({ autoDetect: true });
        highlighter.highlightAll(_contentContainer);
      }

      const TocGeneratorClass = (typeof MARKUP_TOC_GENERATOR !== 'undefined') ? MARKUP_TOC_GENERATOR : null;
      if (TocGeneratorClass) {
        const tocGenerator = new TocGeneratorClass();
        const headings = tocGenerator.generate(_contentContainer);
        _tocData = {
          headings: headings,
          tree: tocGenerator.getTree(),
          html: tocGenerator.toHtml(),
        };
        if (_tocPanel && _tocData) {
          _tocPanel.updateTocData(_tocData);
        }
      }

      if (_themeManager) {
        _themeManager.applyTheme(_themeManager.getTheme());
      }

      await _applyTypographySettings();
      _setPageTitle();

    } catch (error) {
      console.error('MarkUp Viewer: Re-render failed:', error);
    }
  }

  function _setPageTitle() {
    if (_contentContainer) {
      const firstH1 = _contentContainer.querySelector('h1');
      if (firstH1 && firstH1.textContent.trim()) {
        document.title = firstH1.textContent.trim() + ' — MarkUp';
        return;
      }
    }
    const name = _originalFilename || 'Markdown';
    document.title = name.replace(/\.[^.]+$/, '') + ' — MarkUp';
  }

  function _addSaveButton() {
    if (!_rawMarkdown) return;

    const btn = document.createElement('button');
    btn.className = 'markup-viewer-save-btn';
    btn.textContent = '💾 Save file';
    btn.title = 'Download the original Markdown file';
    btn.setAttribute('aria-label', 'Save file');

    btn.addEventListener('click', function _onSaveClick() {
      try {
        const blob = new Blob([_rawMarkdown], { type: 'text/markdown;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = _originalFilename || 'document.md';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      } catch (err) {
        console.warn('MarkUp Viewer: Save failed:', err);
      }
    });

    document.body.appendChild(btn);
  }

  function _trackRecentFile() {
    if (!_messageBus) return;

    try {
      const title = document.title.replace(' — MarkUp', '');
      _messageBus.send('ADD_RECENT_FILE', {
        url: _originalUrl,
        title: title,
      }).catch(() => {});
    } catch (err) {
      if (_Logger) { _Logger.debug('Viewer', 'Recent file tracking skipped.'); }
    }
  }

  // --- Loading Spinner ---

  /**
   * Show a loading spinner.
   * @param {string} filename - The filename to display.
   * @private
   */
  function _showLoadingSpinner(filename) {
    const container = document.createElement('div');
    container.id = 'markup-viewer-loading';
    container.className = 'markup-viewer-loading';

    const spinnerWrap = document.createElement('div');
    spinnerWrap.className = 'markup-viewer-spinner';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'markup-viewer-spinner-dot';
      spinnerWrap.appendChild(dot);
    }

    const text = document.createElement('p');
    text.className = 'markup-viewer-loading-text';
    text.textContent = 'Loading Markdown…';

    container.appendChild(spinnerWrap);
    container.appendChild(text);

    if (filename) {
      const filenameEl = document.createElement('p');
      filenameEl.className = 'markup-viewer-loading-filename';
      filenameEl.textContent = filename;
      container.appendChild(filenameEl);
    }

    document.body.appendChild(container);
  }

  /**
   * Remove the loading spinner.
   * @private
   */
  function _removeLoadingSpinner() {
    const spinner = document.getElementById('markup-viewer-loading');
    if (spinner) spinner.remove();
  }

  // --- Error States ---

  /**
   * Show a styled error card.
   * @param {string} heading - Error heading text.
   * @param {string} message - Error detail message.
   * @private
   */
  function _showError(heading, message) {
    const container = document.createElement('div');
    container.className = 'markup-viewer-error';

    const icon = document.createElement('div');
    icon.className = 'markup-viewer-error-icon';
    icon.textContent = '⚠️';

    const h2 = document.createElement('h2');
    h2.textContent = heading;

    const p = document.createElement('p');
    p.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'markup-viewer-error-actions';

    // "Download instead" button
    if (_originalUrl) {
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'markup-viewer-btn markup-viewer-btn-primary';
      downloadBtn.textContent = '📥 Download instead';
      downloadBtn.addEventListener('click', function _onDownloadClick() {
        try {
          chrome.downloads.download({
            url: _originalUrl,
            filename: _originalFilename || undefined,
            saveAs: true,
          });
        } catch (err) {
          console.warn('MarkUp Viewer: Download fallback failed:', err);
        }
      });
      actions.appendChild(downloadBtn);
    }

    // "Try again" button
    const retryBtn = document.createElement('button');
    retryBtn.className = 'markup-viewer-btn markup-viewer-btn-secondary';
    retryBtn.textContent = '🔄 Try again';
    retryBtn.addEventListener('click', function _onRetry() {
      window.location.reload();
    });
    actions.appendChild(retryBtn);

    container.appendChild(icon);
    container.appendChild(h2);
    container.appendChild(p);
    container.appendChild(actions);

    document.body.appendChild(container);
  }

  /**
   * Show auth-specific error card (401/403).
   * @param {number} status - HTTP status code.
   * @private
   */
  function _showAuthError(status) {
    _showError(
      'This file requires authentication',
      'The server returned HTTP ' + status + '. The download link may have expired or requires login. ' +
      'Try downloading the file directly.'
    );
  }

  /**
   * Show a CORS-specific error card with "Download instead", "Open in browser", and "Try again" buttons.
   * CORS failures are common with services like Google Chat, Slack, etc. that set no Access-Control-Allow-Origin.
   * The "Open in browser" link lets the user navigate to the URL directly (browser applies session cookies).
   *
   * @param {string} heading - Error heading text.
   * @param {string} message - Error detail message.
   * @private
   */
  function _showCORSError(heading, message) {
    const container = document.createElement('div');
    container.className = 'markup-viewer-error';

    const icon = document.createElement('div');
    icon.className = 'markup-viewer-error-icon';
    icon.textContent = '🔒';

    const h2 = document.createElement('h2');
    h2.textContent = heading;

    const p = document.createElement('p');
    p.textContent = message;

    const tip = document.createElement('p');
    tip.style.fontSize = '13px';
    tip.style.marginTop = '4px';
    tip.style.opacity = '0.75';
    tip.textContent = 'Tip: "Open in browser" may work if you are logged in to the source service.';

    const actions = document.createElement('div');
    actions.className = 'markup-viewer-error-actions';

    // "Download instead" button
    if (_originalUrl) {
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'markup-viewer-btn markup-viewer-btn-primary';
      downloadBtn.textContent = '📥 Download instead';
      downloadBtn.addEventListener('click', function _onCORSDownload() {
        try {
          chrome.downloads.download({
            url: _originalUrl,
            filename: _originalFilename || undefined,
            saveAs: true,
          });
        } catch (err) {
          console.warn('MarkUp Viewer: Download fallback failed:', err);
        }
      });
      actions.appendChild(downloadBtn);
    }

    // "Open in browser" link — navigates directly (browser has session cookies)
    if (_originalUrl) {
      const openBtn = document.createElement('a');
      openBtn.className = 'markup-viewer-btn markup-viewer-btn-secondary';
      openBtn.textContent = '🌐 Open in browser';
      openBtn.href = _originalUrl;
      openBtn.target = '_blank';
      openBtn.rel = 'noopener';
      openBtn.style.textDecoration = 'none';
      openBtn.style.display = 'inline-flex';
      openBtn.style.alignItems = 'center';
      actions.appendChild(openBtn);
    }

    // "Try again" button
    const retryBtn = document.createElement('button');
    retryBtn.className = 'markup-viewer-btn markup-viewer-btn-secondary';
    retryBtn.textContent = '🔄 Try again';
    retryBtn.addEventListener('click', function _onCORSRetry() {
      window.location.reload();
    });
    actions.appendChild(retryBtn);

    container.appendChild(icon);
    container.appendChild(h2);
    container.appendChild(p);
    container.appendChild(tip);
    container.appendChild(actions);

    document.body.appendChild(container);
  }

  /**
   * Show binary file error card.
   * @private
   */
  function _showBinaryError() {
    const container = document.createElement('div');
    container.className = 'markup-viewer-error';

    const icon = document.createElement('div');
    icon.className = 'markup-viewer-error-icon';
    icon.textContent = '⚠️';

    const h2 = document.createElement('h2');
    h2.textContent = 'Not a valid Markdown file';

    const p = document.createElement('p');
    p.textContent = 'This file appears to contain binary data and cannot be rendered as Markdown.';

    const actions = document.createElement('div');
    actions.className = 'markup-viewer-error-actions';

    if (_originalUrl) {
      const downloadBtn = document.createElement('button');
      downloadBtn.className = 'markup-viewer-btn markup-viewer-btn-primary';
      downloadBtn.textContent = '📥 Download instead';
      downloadBtn.addEventListener('click', function _onBinaryDownload() {
        try {
          chrome.downloads.download({
            url: _originalUrl,
            filename: _originalFilename || undefined,
            saveAs: true,
          });
        } catch (err) {
          console.warn('MarkUp Viewer: Download fallback failed:', err);
        }
      });
      actions.appendChild(downloadBtn);
    }

    container.appendChild(icon);
    container.appendChild(h2);
    container.appendChild(p);
    container.appendChild(actions);

    document.body.appendChild(container);
  }

  /**
   * Show empty file card.
   * @private
   */
  function _showEmptyFile() {
    const container = document.createElement('div');
    container.className = 'markup-viewer-empty';

    const icon = document.createElement('div');
    icon.className = 'markup-viewer-empty-icon';
    icon.textContent = '📄';

    const h2 = document.createElement('h2');
    h2.textContent = 'This file is empty';

    const p = document.createElement('p');
    p.textContent = 'The Markdown file doesn\'t contain any content.';

    container.appendChild(icon);
    container.appendChild(h2);
    container.appendChild(p);

    document.body.appendChild(container);

    // Still set title
    const name = _originalFilename || 'Empty file';
    document.title = name.replace(/\.[^.]+$/, '') + ' — MarkUp';
  }

  /**
   * Show large file warning bar with "Load All" button.
   * @param {string} fullText - The full Markdown text.
   * @private
   */
  function _showLargeFileWarning(fullText) {
    const lines = fullText.split('\n');
    const warning = document.createElement('div');
    warning.className = 'markup-viewer-large-warning';

    const text = document.createElement('span');
    text.textContent = '⚠️ Large file: showing first 500 of ' + lines.length + ' lines.';

    const loadAllBtn = document.createElement('button');
    loadAllBtn.textContent = 'Load All';
    loadAllBtn.className = 'markup-viewer-btn markup-viewer-btn-primary';
    loadAllBtn.style.padding = '4px 12px';
    loadAllBtn.style.fontSize = '12px';
    loadAllBtn.setAttribute('aria-label', 'Load entire document');

    loadAllBtn.addEventListener('click', function _onLoadAll() {
      warning.remove();
      // Re-render with full content
      _runPipeline(fullText).catch(err => {
        console.warn('MarkUp Viewer: Failed to load full document:', err);
      });
    });

    warning.appendChild(text);
    warning.appendChild(loadAllBtn);

    if (document.body.firstChild) {
      document.body.insertBefore(warning, document.body.firstChild);
    } else {
      document.body.appendChild(warning);
    }
  }

  // --- Utility Functions ---

  /**
   * Check if content appears to be binary data.
   * @param {string} content - The content to check.
   * @returns {boolean} True if content appears binary.
   * @private
   */
  function _isBinaryContent(content) {
    if (!content) return false;

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

})();
