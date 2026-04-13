/**
 * MarkUp — Constants
 *
 * Enum-like constants, configuration defaults, and shared values
 * used across all modules. All values are frozen to prevent mutation.
 *
 * Convention: SCREAMING_SNAKE_CASE for all top-level exports.
 */

'use strict';

/**
 * Available theme identifiers.
 * @enum {string}
 */
const THEMES = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
  SEPIA: 'sepia',
});

/**
 * Keys used for chrome.storage persistence.
 * All keys are prefixed with 'markup_' to avoid collisions.
 * @enum {string}
 */
const STORAGE_KEYS = Object.freeze({
  THEME: 'markup_theme',
  FONT_SIZE: 'markup_fontSize',
  FONT_FAMILY: 'markup_fontFamily',
  LINE_HEIGHT: 'markup_lineHeight',
  TOC_VISIBLE: 'markup_tocVisible',
  TOOLBAR_POSITION: 'markup_toolbarPosition',
  LAST_FILE: 'markup_lastFile',
});

/**
 * Internal event names used by EventEmitter for cross-module communication.
 * @enum {string}
 */
const EVENTS = Object.freeze({
  THEME_CHANGED: 'themeChanged',
  CONTENT_PARSED: 'contentParsed',
  CONTENT_RENDERED: 'contentRendered',
  TOC_GENERATED: 'tocGenerated',
  TOC_TOGGLED: 'tocToggled',
  SEARCH_TOGGLED: 'searchToggled',
  SEARCH_MATCH: 'searchMatch',
  SETTINGS_TOGGLED: 'settingsToggled',
  FONT_SIZE_CHANGED: 'fontSizeChanged',
  LINE_HEIGHT_CHANGED: 'lineHeightChanged',
  FONT_FAMILY_CHANGED: 'fontFamilyChanged',
  PRINT_REQUESTED: 'printRequested',
});

/**
 * Default configuration values. Applied when no persisted value is found.
 * @enum {string|number}
 */
const DEFAULTS = Object.freeze({
  THEME: THEMES.LIGHT,
  FONT_SIZE: 16,
  LINE_HEIGHT: 1.6,
  FONT_FAMILY: 'system-ui',
  TOC_VISIBLE: false,
  TOOLBAR_POSITION: 'top-right',
  ENABLED: true,
  DEBUGLOG: false,
  EXTENSIONS: '.md, .markdown, .mdown, .mkd, .mdx',
  CSPSTRICT: false,
});

/**
 * Regex patterns for detecting Markdown file URLs.
 * Covers common extensions: .md, .markdown, .mdown, .mkd, .mdx
 * Patterns match against the URL pathname (ignoring query strings and fragments).
 * @type {RegExp[]}
 */
const MD_URL_PATTERNS = Object.freeze([
  /\.md(\?.*)?(\#.*)?$/i,
  /\.markdown(\?.*)?(\#.*)?$/i,
  /\.mdown(\?.*)?(\#.*)?$/i,
  /\.mkd(\?.*)?(\#.*)?$/i,
  /\.mdx(\?.*)?(\#.*)?$/i,
]);

/**
 * MIME types associated with Markdown content.
 * @type {string[]}
 */
const MD_MIME_TYPES = Object.freeze([
  'text/markdown',
  'text/x-markdown',
]);

/**
 * CSS class prefix used by MarkUp to avoid collisions with host page styles.
 * @type {string}
 */
const CSS_PREFIX = 'markup';

/**
 * Maximum document size (in characters) that MarkUp will attempt to parse.
 * Documents larger than this will trigger a warning / progressive rendering.
 * @type {number}
 */
const MAX_DOCUMENT_SIZE = 500000;

// Export for use in other modules
// In MV3 content scripts (non-module), these are accessed via global scope.
// In extension pages (ES modules), use: import { THEMES, ... } from './constants.js';
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_CONSTANTS = {
    THEMES,
    STORAGE_KEYS,
    EVENTS,
    DEFAULTS,
    MD_URL_PATTERNS,
    MD_MIME_TYPES,
    CSS_PREFIX,
    MAX_DOCUMENT_SIZE,
  };
}
