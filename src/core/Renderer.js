/**
 * MarkUp — Renderer (Abstract Base Class)
 *
 * Defines the rendering contract that all concrete renderers must implement.
 * Provides the abstract `render()` and `clear()` methods, plus a concrete
 * `getContainer()` method for accessing the mount point element.
 *
 * @class Renderer
 * @abstract
 */

'use strict';

class Renderer {
  /**
   * Create a new Renderer instance.
   * Cannot be instantiated directly — must be subclassed.
   *
   * @param {string} targetSelector - CSS selector for the mount point element.
   * @throws {Error} If instantiated directly (not via subclass).
   */
  constructor(targetSelector) {
    if (new.target === Renderer) {
      throw new Error(
        'Renderer is an abstract class and cannot be instantiated directly. ' +
        'Use a concrete subclass like HtmlRenderer.'
      );
    }

    /**
     * CSS selector for the mount point element.
     * @type {string}
     * @protected
     */
    this._targetSelector = targetSelector || 'body';

    /**
     * Cached reference to the mount point element.
     * @type {HTMLElement|null}
     * @protected
     */
    this._mountPoint = null;
  }

  /**
   * Render content into the mount point.
   * Must be overridden by subclasses.
   *
   * @param {*} content - The content to render (type depends on subclass).
   * @throws {Error} Always — this is an abstract method.
   * @abstract
   */
  render(content) {
    throw new Error(
      'Renderer.render() is abstract and must be implemented by subclass.'
    );
  }

  /**
   * Clear all rendered content from the mount point.
   * Must be overridden by subclasses.
   *
   * @throws {Error} Always — this is an abstract method.
   * @abstract
   */
  clear() {
    throw new Error(
      'Renderer.clear() is abstract and must be implemented by subclass.'
    );
  }

  /**
   * Get the mount point element.
   * Lazily resolves the selector on first access and caches the result.
   *
   * @returns {HTMLElement|null} The mount point element, or null if not found.
   */
  getContainer() {
    if (!this._mountPoint) {
      this._mountPoint = document.querySelector(this._targetSelector);
    }
    return this._mountPoint;
  }
}

// Export for use in other modules
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_RENDERER = Renderer;
}
