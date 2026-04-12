/**
 * MarkUp — DOM Helpers
 *
 * Pure utility functions for safe DOM creation and manipulation.
 * These functions NEVER use innerHTML — all DOM is built via
 * document.createElement() and safe attribute setters.
 *
 * @module dom-helpers
 */

'use strict';

/**
 * Safely create an HTML element with attributes and children.
 * Never uses innerHTML — all content is set via safe DOM APIs.
 *
 * @param {string} tag - The HTML tag name (e.g., 'div', 'span', 'a').
 * @param {Object} [attributes={}] - Key-value pairs of attributes to set.
 *   Special keys:
 *     - 'textContent': sets the element's textContent.
 *     - 'classList': array of class names to add.
 *     - 'dataset': object of data-* attributes.
 *     - 'style': object of style properties (NOT a CSS string).
 *     - 'events': object of { eventName: handler } pairs.
 *   All other keys are set via setAttribute().
 * @param {(HTMLElement|string)[]} [children=[]] - Child elements or text strings to append.
 * @returns {HTMLElement} The created element.
 */
function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(attributes)) {
    switch (key) {
      case 'textContent':
        element.textContent = value;
        break;

      case 'classList':
        if (Array.isArray(value)) {
          value.forEach((cls) => element.classList.add(cls));
        }
        break;

      case 'dataset':
        if (typeof value === 'object' && value !== null) {
          for (const [dataKey, dataValue] of Object.entries(value)) {
            element.dataset[dataKey] = dataValue;
          }
        }
        break;

      case 'style':
        if (typeof value === 'object' && value !== null) {
          for (const [styleProp, styleValue] of Object.entries(value)) {
            element.style[styleProp] = styleValue;
          }
        }
        break;

      case 'events':
        if (typeof value === 'object' && value !== null) {
          for (const [eventName, handler] of Object.entries(value)) {
            element.addEventListener(eventName, handler);
          }
        }
        break;

      default:
        element.setAttribute(key, value);
        break;
    }
  }

  for (const child of children) {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  }

  return element;
}

/**
 * Create a DocumentFragment from an array of elements for batched DOM insertion.
 * Using fragments minimizes reflows by inserting all nodes in a single operation.
 *
 * @param {(HTMLElement|string)[]} elements - Elements or text strings to bundle.
 * @returns {DocumentFragment} A fragment containing all provided elements.
 */
function createFragment(elements) {
  const fragment = document.createDocumentFragment();

  for (const item of elements) {
    if (typeof item === 'string') {
      fragment.appendChild(document.createTextNode(item));
    } else if (item instanceof Node) {
      fragment.appendChild(item);
    }
  }

  return fragment;
}

/**
 * Safely remove all child nodes from an element.
 * More reliable than setting innerHTML = '' and avoids CSP issues.
 *
 * @param {HTMLElement} element - The parent element to clear.
 */
function removeAllChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * Inject a <style> element into the document head with deduplication.
 * If a <style> with the given id already exists, it is updated in place
 * rather than creating a duplicate.
 *
 * @param {string} cssText - The CSS text content to inject.
 * @param {string} id - A unique identifier for the style element (used for dedup).
 * @returns {HTMLStyleElement} The created or updated style element.
 */
function addStyles(cssText, id) {
  const existingStyle = document.getElementById(id);

  if (existingStyle) {
    existingStyle.textContent = cssText;
    return existingStyle;
  }

  const style = document.createElement('style');
  style.id = id;
  style.textContent = cssText;
  document.head.appendChild(style);

  return style;
}

// Export for use in other modules
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_DOM_HELPERS = {
    createElement,
    createFragment,
    removeAllChildren,
    addStyles,
  };
}
