/**
 * MarkUp — SettingsPanelComponent
 *
 * Slide-in settings panel with live preview for typography and theme controls.
 * Extends BaseComponent.
 *
 * Controls:
 * - Theme selector (3 radio buttons: light, dark, sepia)
 * - Font size slider (12–24px)
 * - Line height slider (1.2–2.0, step 0.1)
 * - Font family dropdown (system, serif, sans-serif, monospace)
 *
 * All changes apply live and are persisted via StorageManager.
 *
 * @class SettingsPanelComponent
 * @extends BaseComponent
 */

'use strict';

class SettingsPanelComponent extends BaseComponent {
  /**
   * Create a SettingsPanelComponent instance.
   *
   * @param {StorageManager} storageManager - For persisting settings.
   * @param {ThemeManager} themeManager - For theme switching.
   * @param {EventEmitter} eventEmitter - For broadcasting setting changes.
   * @param {HTMLElement} contentContainer - The content container for live updates.
   */
  constructor(storageManager, themeManager, eventEmitter, contentContainer) {
    const prefix = (typeof MARKUP_CONSTANTS !== 'undefined')
      ? MARKUP_CONSTANTS.CSS_PREFIX
      : 'markup';

    super(`${prefix}-settings-panel`);

    if (!storageManager) {
      throw new TypeError('SettingsPanelComponent requires a StorageManager instance');
    }

    /** @private */
    this._storage = storageManager;

    /** @private */
    this._themeManager = themeManager;

    /** @private */
    this._emitter = eventEmitter;

    /** @private */
    this._contentContainer = contentContainer;

    /** @private */
    this._prefix = prefix;

    // Load constants
    const constants = (typeof MARKUP_CONSTANTS !== 'undefined') ? MARKUP_CONSTANTS : null;
    /** @private */
    this._EVENTS = constants ? constants.EVENTS : {
      FONT_SIZE_CHANGED: 'fontSizeChanged',
      LINE_HEIGHT_CHANGED: 'lineHeightChanged',
      FONT_FAMILY_CHANGED: 'fontFamilyChanged',
      THEME_CHANGED: 'themeChanged',
    };
    /** @private */
    this._DEFAULTS = constants ? constants.DEFAULTS : {
      FONT_SIZE: 16,
      LINE_HEIGHT: 1.6,
      FONT_FAMILY: 'system-ui',
      THEME: 'light',
    };
    /** @private */
    this._THEMES = constants ? constants.THEMES : { LIGHT: 'light', DARK: 'dark', SEPIA: 'sepia' };

    /** @private */
    this._fontFamilyOptions = [
      { value: 'system-ui', label: 'System Default' },
      { value: 'Georgia, serif', label: 'Serif' },
      { value: '"Helvetica Neue", Arial, sans-serif', label: 'Sans-Serif' },
      { value: '"SF Mono", "Fira Code", Consolas, monospace', label: 'Monospace' },
    ];

    // Control references
    /** @private @type {HTMLInputElement|null} */
    this._fontSizeSlider = null;
    /** @private @type {HTMLInputElement|null} */
    this._lineHeightSlider = null;
    /** @private @type {HTMLSelectElement|null} */
    this._fontFamilySelect = null;
    /** @private @type {HTMLElement|null} */
    this._fontSizeValue = null;
    /** @private @type {HTMLElement|null} */
    this._lineHeightValue = null;

    // Bound handlers
    /** @private */
    this._boundOnCloseClick = this._onCloseClick.bind(this);
    /** @private */
    this._boundOnFontSizeChange = this._onFontSizeChange.bind(this);
    /** @private */
    this._boundOnLineHeightChange = this._onLineHeightChange.bind(this);
    /** @private */
    this._boundOnFontFamilyChange = this._onFontFamilyChange.bind(this);
  }

  /**
   * Mount the settings panel into a parent element.
   * Loads persisted settings and applies them.
   *
   * @param {HTMLElement} parentElement - The DOM element to mount into.
   */
  mount(parentElement) {
    if (this._mounted) {
      return;
    }

    if (!parentElement) {
      console.warn('SettingsPanelComponent: Cannot mount — parent element is null');
      return;
    }

    this._element = this._buildPanel();

    // Start hidden
    this._element.style.display = 'none';
    this._previousDisplay = '';

    parentElement.appendChild(this._element);
    this._mounted = true;

    // Load persisted settings
    this._loadPersistedSettings();
  }

  /**
   * Unmount the settings panel. Removes all listeners and DOM.
   */
  unmount() {
    if (!this._mounted) {
      return;
    }

    if (this._element && this._element.parentNode) {
      this._element.parentNode.removeChild(this._element);
    }

    this._fontSizeSlider = null;
    this._lineHeightSlider = null;
    this._fontFamilySelect = null;
    this._fontSizeValue = null;
    this._lineHeightValue = null;
    this._element = null;
    this._mounted = false;
  }

  /**
   * Override show to add transition class.
   */
  show() {
    if (this._element) {
      this._element.style.display = '';
      void this._element.offsetHeight;
      this._element.classList.add(`${this._prefix}-settings-panel-open`);
    }
  }

  /**
   * Override hide to add transition class.
   */
  hide() {
    if (this._element) {
      this._element.classList.remove(`${this._prefix}-settings-panel-open`);
      const onTransitionEnd = () => {
        if (this._element && !this._element.classList.contains(`${this._prefix}-settings-panel-open`)) {
          this._element.style.display = 'none';
        }
        if (this._element) {
          this._element.removeEventListener('transitionend', onTransitionEnd);
        }
      };
      this._element.addEventListener('transitionend', onTransitionEnd);
      setTimeout(() => {
        if (this._element && !this._element.classList.contains(`${this._prefix}-settings-panel-open`)) {
          this._element.style.display = 'none';
        }
      }, 400);
    }
  }

  /**
   * Override isVisible to check for transition class.
   */
  isVisible() {
    if (!this._element) {
      return false;
    }
    return this._element.classList.contains(`${this._prefix}-settings-panel-open`);
  }

  // --- Private Methods ---

  /**
   * Build the settings panel DOM structure.
   *
   * @returns {HTMLElement} The panel root element.
   * @private
   */
  _buildPanel() {
    const p = this._prefix;

    // Header
    const title = this._createElement('span', {
      classList: [`${p}-settings-title`],
      textContent: 'Settings',
    });

    const closeBtn = this._createElement('button', {
      classList: [`${p}-settings-close`],
      'aria-label': 'Close settings',
      title: 'Close',
      events: { click: this._boundOnCloseClick },
    }, ['×']);

    const header = this._createElement('div', {
      classList: [`${p}-settings-header`],
    }, [title, closeBtn]);

    // Theme section
    const themeSection = this._buildThemeSection();

    // Font size section
    const fontSizeSection = this._buildFontSizeSection();

    // Line height section
    const lineHeightSection = this._buildLineHeightSection();

    // Font family section
    const fontFamilySection = this._buildFontFamilySection();

    // Content wrapper
    const content = this._createElement('div', {
      classList: [`${p}-settings-content`],
    }, [themeSection, fontSizeSection, lineHeightSection, fontFamilySection]);

    // Panel container
    const panel = this._createElement('div', {
      classList: [`${p}-settings-panel`],
      id: this._id,
    }, [header, content]);

    return panel;
  }

  /**
   * Build the theme selector section.
   *
   * @returns {HTMLElement} The theme section element.
   * @private
   */
  _buildThemeSection() {
    const p = this._prefix;
    const themes = Object.values(this._THEMES);

    const radios = themes.map((theme) => {
      const id = `${p}-theme-${theme}`;
      const radio = this._createElement('input', {
        'type': 'radio',
        'name': `${p}-theme-radio`,
        'id': id,
        'value': theme,
      });

      // Use a bound handler per theme
      const handler = () => this._onThemeChange(theme);
      radio.addEventListener('change', handler);

      const label = this._createElement('label', {
        'for': id,
        classList: [`${p}-settings-theme-label`, `${p}-settings-theme-${theme}`],
        textContent: theme.charAt(0).toUpperCase() + theme.slice(1),
      });

      return this._createElement('div', {
        classList: [`${p}-settings-theme-option`],
      }, [radio, label]);
    });

    const radioGroup = this._createElement('div', {
      classList: [`${p}-settings-theme-group`],
      'role': 'radiogroup',
      'aria-label': 'Theme selection',
    }, radios);

    return this._buildSection('Theme', radioGroup);
  }

  /**
   * Build the font size slider section.
   *
   * @returns {HTMLElement} The font size section element.
   * @private
   */
  _buildFontSizeSection() {
    const p = this._prefix;

    this._fontSizeValue = this._createElement('span', {
      classList: [`${p}-settings-value`],
      textContent: `${this._DEFAULTS.FONT_SIZE}px`,
    });

    this._fontSizeSlider = this._createElement('input', {
      'type': 'range',
      'min': '12',
      'max': '24',
      'step': '1',
      'value': String(this._DEFAULTS.FONT_SIZE),
      classList: [`${p}-settings-slider`],
      'aria-label': 'Font size',
      events: { input: this._boundOnFontSizeChange },
    });

    const control = this._createElement('div', {
      classList: [`${p}-settings-control`],
    }, [this._fontSizeSlider, this._fontSizeValue]);

    return this._buildSection('Font Size', control);
  }

  /**
   * Build the line height slider section.
   *
   * @returns {HTMLElement} The line height section element.
   * @private
   */
  _buildLineHeightSection() {
    const p = this._prefix;

    this._lineHeightValue = this._createElement('span', {
      classList: [`${p}-settings-value`],
      textContent: String(this._DEFAULTS.LINE_HEIGHT),
    });

    this._lineHeightSlider = this._createElement('input', {
      'type': 'range',
      'min': '1.2',
      'max': '2.0',
      'step': '0.1',
      'value': String(this._DEFAULTS.LINE_HEIGHT),
      classList: [`${p}-settings-slider`],
      'aria-label': 'Line height',
      events: { input: this._boundOnLineHeightChange },
    });

    const control = this._createElement('div', {
      classList: [`${p}-settings-control`],
    }, [this._lineHeightSlider, this._lineHeightValue]);

    return this._buildSection('Line Height', control);
  }

  /**
   * Build the font family dropdown section.
   *
   * @returns {HTMLElement} The font family section element.
   * @private
   */
  _buildFontFamilySection() {
    const p = this._prefix;

    this._fontFamilySelect = document.createElement('select');
    this._fontFamilySelect.className = `${p}-settings-select`;
    this._fontFamilySelect.setAttribute('aria-label', 'Font family');

    for (const opt of this._fontFamilyOptions) {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      this._fontFamilySelect.appendChild(option);
    }

    this._fontFamilySelect.addEventListener('change', this._boundOnFontFamilyChange);

    return this._buildSection('Font Family', this._fontFamilySelect);
  }

  /**
   * Build a settings section with a label and control.
   *
   * @param {string} label - The section label.
   * @param {HTMLElement} control - The control element.
   * @returns {HTMLElement} The section element.
   * @private
   */
  _buildSection(label, control) {
    const p = this._prefix;

    const labelEl = this._createElement('div', {
      classList: [`${p}-settings-label`],
      textContent: label,
    });

    return this._createElement('div', {
      classList: [`${p}-settings-section`],
    }, [labelEl, control]);
  }

  /**
   * Load persisted settings from StorageManager and apply to controls.
   *
   * @private
   */
  async _loadPersistedSettings() {
    try {
      // Font size
      const fontSize = await this._storage.get('fontSize');
      if (fontSize && this._fontSizeSlider) {
        this._fontSizeSlider.value = String(fontSize);
        if (this._fontSizeValue) {
          this._fontSizeValue.textContent = `${fontSize}px`;
        }
        this._applyFontSize(fontSize);
      }

      // Line height
      const lineHeight = await this._storage.get('lineHeight');
      if (lineHeight && this._lineHeightSlider) {
        this._lineHeightSlider.value = String(lineHeight);
        if (this._lineHeightValue) {
          this._lineHeightValue.textContent = String(lineHeight);
        }
        this._applyLineHeight(lineHeight);
      }

      // Font family
      const fontFamily = await this._storage.get('fontFamily');
      if (fontFamily && this._fontFamilySelect) {
        this._fontFamilySelect.value = fontFamily;
        this._applyFontFamily(fontFamily);
      }

      // Theme (set radio button to match current theme)
      const currentTheme = this._themeManager ? this._themeManager.getTheme() : null;
      if (currentTheme) {
        const p = this._prefix;
        const radio = this._element ?
          this._element.querySelector(`#${p}-theme-${currentTheme}`) : null;
        if (radio) {
          radio.checked = true;
        }
      }
    } catch (err) {
      console.warn('SettingsPanelComponent: Failed to load settings:', err);
    }
  }

  // --- Event Handlers ---

  /**
   * @private
   */
  _onCloseClick() {
    this.hide();
  }

  /**
   * @param {string} theme
   * @private
   */
  _onThemeChange(theme) {
    if (this._themeManager) {
      this._themeManager.applyTheme(theme);
    }
  }

  /**
   * @private
   */
  _onFontSizeChange() {
    const value = parseInt(this._fontSizeSlider.value, 10);
    if (this._fontSizeValue) {
      this._fontSizeValue.textContent = `${value}px`;
    }
    this._applyFontSize(value);
    this._storage.set('fontSize', value).catch((err) => {
      console.warn('SettingsPanelComponent: Failed to persist font size:', err);
    });
    if (this._emitter) {
      this._emitter.emit(this._EVENTS.FONT_SIZE_CHANGED, { fontSize: value });
    }
  }

  /**
   * @private
   */
  _onLineHeightChange() {
    const value = parseFloat(this._lineHeightSlider.value);
    if (this._lineHeightValue) {
      this._lineHeightValue.textContent = String(value);
    }
    this._applyLineHeight(value);
    this._storage.set('lineHeight', value).catch((err) => {
      console.warn('SettingsPanelComponent: Failed to persist line height:', err);
    });
    if (this._emitter) {
      this._emitter.emit(this._EVENTS.LINE_HEIGHT_CHANGED, { lineHeight: value });
    }
  }

  /**
   * @private
   */
  _onFontFamilyChange() {
    const value = this._fontFamilySelect.value;
    this._applyFontFamily(value);
    this._storage.set('fontFamily', value).catch((err) => {
      console.warn('SettingsPanelComponent: Failed to persist font family:', err);
    });
    if (this._emitter) {
      this._emitter.emit(this._EVENTS.FONT_FAMILY_CHANGED, { fontFamily: value });
    }
  }

  // --- Live Application ---

  /**
   * Apply font size to the content container via CSS custom property.
   *
   * @param {number} size - Font size in px.
   * @private
   */
  _applyFontSize(size) {
    if (this._contentContainer) {
      this._contentContainer.style.setProperty('--markup-font-size-base', `${size}px`);
    }
  }

  /**
   * Apply line height to the content container via CSS custom property.
   *
   * @param {number} height - Line height value.
   * @private
   */
  _applyLineHeight(height) {
    if (this._contentContainer) {
      this._contentContainer.style.setProperty('--markup-line-height', String(height));
    }
  }

  /**
   * Apply font family to the content container via CSS custom property.
   *
   * @param {string} family - Font family CSS value.
   * @private
   */
  _applyFontFamily(family) {
    if (this._contentContainer) {
      this._contentContainer.style.setProperty('--markup-font-body', family);
    }
  }
}

// Export for use across extension contexts
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_SETTINGS_PANEL_COMPONENT = SettingsPanelComponent;
}
