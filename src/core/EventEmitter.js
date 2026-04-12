/**
 * MarkUp — EventEmitter
 *
 * Lightweight publish/subscribe event system for decoupling modules.
 * Provides on/off/emit/once methods with duplicate listener guards
 * and proper cleanup semantics.
 *
 * @class EventEmitter
 */

'use strict';

class EventEmitter {
  /**
   * Create a new EventEmitter instance.
   * Initializes an empty listener map.
   */
  constructor() {
    /**
     * Map of event names to Sets of listener functions.
     * Using Set prevents duplicate listener registration.
     * @type {Map<string, Set<Function>>}
     * @private
     */
    this._listeners = new Map();
  }

  /**
   * Register a callback for an event.
   * If the same callback is already registered for this event,
   * it will NOT be added again (Set semantics prevent duplicates).
   *
   * @param {string} event - The event name to listen for.
   * @param {Function} callback - The function to call when the event is emitted.
   * @returns {EventEmitter} This instance for chaining.
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('EventEmitter.on(): callback must be a function');
    }

    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }

    this._listeners.get(event).add(callback);
    return this;
  }

  /**
   * Remove a previously registered callback for an event.
   * If the callback is not registered, this is a no-op.
   *
   * @param {string} event - The event name to stop listening for.
   * @param {Function} callback - The exact function reference to remove.
   * @returns {EventEmitter} This instance for chaining.
   */
  off(event, callback) {
    const listeners = this._listeners.get(event);

    if (listeners) {
      listeners.delete(callback);

      // Clean up empty Sets to prevent memory leaks
      if (listeners.size === 0) {
        this._listeners.delete(event);
      }
    }

    return this;
  }

  /**
   * Emit an event, calling all registered callbacks with the provided arguments.
   * Callbacks are invoked synchronously in registration order.
   *
   * @param {string} event - The event name to emit.
   * @param {...*} args - Arguments to pass to each callback.
   * @returns {boolean} True if the event had listeners, false otherwise.
   */
  emit(event, ...args) {
    const listeners = this._listeners.get(event);

    if (!listeners || listeners.size === 0) {
      return false;
    }

    // Iterate over a copy to safely handle listeners that remove themselves
    for (const callback of [...listeners]) {
      try {
        callback(...args);
      } catch (error) {
        console.error(`EventEmitter: Error in listener for "${event}":`, error);
      }
    }

    return true;
  }

  /**
   * Register a one-time callback that is automatically removed after it fires once.
   *
   * @param {string} event - The event name to listen for.
   * @param {Function} callback - The function to call once when the event is emitted.
   * @returns {EventEmitter} This instance for chaining.
   */
  once(event, callback) {
    if (typeof callback !== 'function') {
      throw new TypeError('EventEmitter.once(): callback must be a function');
    }

    /**
     * Wrapper that calls the original callback and then removes itself.
     * @param {...*} args - Arguments forwarded from emit().
     */
    const onceWrapper = (...args) => {
      this.off(event, onceWrapper);
      callback(...args);
    };

    // Store reference to original callback for identification
    onceWrapper._originalCallback = callback;

    this.on(event, onceWrapper);
    return this;
  }

  /**
   * Remove all listeners for a specific event, or all events if no event is specified.
   *
   * @param {string} [event] - Optional event name. If omitted, clears ALL listeners.
   * @returns {EventEmitter} This instance for chaining.
   */
  removeAllListeners(event) {
    if (event !== undefined) {
      this._listeners.delete(event);
    } else {
      this._listeners.clear();
    }

    return this;
  }

  /**
   * Get the number of listeners registered for an event.
   *
   * @param {string} event - The event name to check.
   * @returns {number} The number of registered listeners.
   */
  listenerCount(event) {
    const listeners = this._listeners.get(event);
    return listeners ? listeners.size : 0;
  }
}

// Export for use in other modules
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_EVENT_EMITTER = EventEmitter;
}
