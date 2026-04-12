/**
 * MarkUp — BaseComponent
 *
 * Abstract base class for all UI components in the MarkUp extension.
 * Provides a common lifecycle contract (mount/unmount), visibility
 * management (show/hide), and safe DOM creation via dom-helpers.
 *
 * Subclasses MUST override mount() and unmount(). Attempting to
 * instantiate BaseComponent directly will throw an Error.
 *
 * @class BaseComponent
 * @abstract
 */

'use strict';

class BaseComponent {
  /**
   * Create a BaseComponent instance.
   * Cannot be instantiated directly — subclasses only.
   *
   * @param {string} id - Unique identifier for this component instance.
   * @throws {Error} If instantiated directly (not via a subclass).
   */
  constructor(id) {
    if (new.target === BaseComponent) {
      throw new Error('BaseComponent is abstract and cannot be instantiated directly');
    }

    if (!id || typeof id !== 'string') {
      throw new TypeError('BaseComponent requires a non-empty string id');
    }

    /**
     * Unique identifier for this component.
     * @type {string}
     * @protected
     */
    this._id = id;

    /**
     * Root HTMLElement of the component. Set by subclass in mount().
     * @type {HTMLElement|null}
     * @protected
     */
    this._element = null;

    /**
     * Whether the component is currently mounted in the DOM.
     * @type {boolean}
     * @protected
     */
    this._mounted = false;

    /**
     * Stored display value before hiding, for restoration.
     * @type {string}
     * @private
     */
    this._previousDisplay = '';
  }

  /**
   * Mount the component into a parent element.
   * Subclasses MUST override this method.
   *
   * @param {HTMLElement} parentElement - The DOM element to mount into.
   * @abstract
   */
  mount(parentElement) {
    throw new Error(`${this.constructor.name} must implement mount()`);
  }

  /**
   * Unmount the component from the DOM. Must remove all event listeners
   * and DOM nodes to prevent memory leaks.
   * Subclasses MUST override this method.
   *
   * @abstract
   */
  unmount() {
    throw new Error(`${this.constructor.name} must implement unmount()`);
  }

  /**
   * Show the component by restoring its display value.
   */
  show() {
    if (this._element) {
      this._element.style.display = this._previousDisplay || '';
    }
  }

  /**
   * Hide the component by setting display to 'none'.
   * Stores the previous display value for restoration.
   */
  hide() {
    if (this._element) {
      const currentDisplay = this._element.style.display;
      if (currentDisplay !== 'none') {
        this._previousDisplay = currentDisplay;
      }
      this._element.style.display = 'none';
    }
  }

  /**
   * Check whether the component is currently visible.
   *
   * @returns {boolean} True if the element exists and is not hidden.
   */
  isVisible() {
    if (!this._element) {
      return false;
    }
    return this._element.style.display !== 'none';
  }

  /**
   * Toggle the component's visibility.
   */
  toggle() {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Get the component's unique identifier.
   *
   * @returns {string} The component ID.
   */
  getId() {
    return this._id;
  }

  /**
   * Get the component's root element.
   *
   * @returns {HTMLElement|null} The root element, or null if not mounted.
   */
  getElement() {
    return this._element;
  }

  /**
   * Check whether the component is currently mounted.
   *
   * @returns {boolean} True if mounted.
   */
  isMounted() {
    return this._mounted;
  }

  /**
   * Create an HTML element using dom-helpers if available.
   * Delegates to MARKUP_DOM_HELPERS.createElement() or falls back
   * to document.createElement().
   *
   * @param {string} tag - The HTML tag name.
   * @param {Object} [attrs={}] - Attributes to set on the element.
   * @param {Array} [children=[]] - Child elements or text strings.
   * @returns {HTMLElement} The created element.
   * @protected
   */
  _createElement(tag, attrs = {}, children = []) {
    const helpers = (typeof MARKUP_DOM_HELPERS !== 'undefined')
      ? MARKUP_DOM_HELPERS
      : null;

    if (helpers) {
      return helpers.createElement(tag, attrs, children);
    }

    // Fallback: manual element creation
    const el = document.createElement(tag);

    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'textContent') {
        el.textContent = value;
      } else if (key === 'classList' && Array.isArray(value)) {
        value.forEach((cls) => el.classList.add(cls));
      } else if (key === 'dataset' && typeof value === 'object') {
        for (const [dk, dv] of Object.entries(value)) {
          el.dataset[dk] = dv;
        }
      } else if (key === 'events' && typeof value === 'object') {
        for (const [evt, handler] of Object.entries(value)) {
          el.addEventListener(evt, handler);
        }
      } else {
        el.setAttribute(key, value);
      }
    }

    for (const child of children) {
      if (typeof child === 'string') {
        el.appendChild(document.createTextNode(child));
      } else if (child instanceof Node) {
        el.appendChild(child);
      }
    }

    return el;
  }
}

// Export for use across extension contexts
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_BASE_COMPONENT = BaseComponent;
}
