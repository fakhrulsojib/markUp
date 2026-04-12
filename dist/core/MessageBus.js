/**
 * MarkUp — MessageBus
 *
 * Abstraction layer over chrome.runtime messaging providing
 * action-based routing, Promise-wrapped send, and proper
 * async sendResponse handling (returns true from listener).
 *
 * @class MessageBus
 */

'use strict';

class MessageBus {
  /**
   * Create a new MessageBus instance.
   * Immediately registers the internal message dispatcher on
   * chrome.runtime.onMessage.
   */
  constructor() {
    /**
     * Map of action names to handler functions.
     * Each handler receives (payload, sender) and returns a response value or Promise.
     * @type {Map<string, Function>}
     * @private
     */
    this._handlers = new Map();

    /**
     * Bound reference to the internal dispatcher for proper removal.
     * @type {Function}
     * @private
     */
    this._boundOnMessage = this._onMessage.bind(this);

    // Register the dispatcher
    chrome.runtime.onMessage.addListener(this._boundOnMessage);
  }

  /**
   * Send a message to the extension runtime (background ↔ content script).
   * Wraps chrome.runtime.sendMessage in a Promise.
   *
   * @param {string} action - The action identifier for routing.
   * @param {*} [payload={}] - The data payload to send.
   * @returns {Promise<*>} The response from the handler.
   */
  send(action, payload = {}) {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ action, payload }, (response) => {
          if (chrome.runtime.lastError) {
            console.error('MessageBus.send() error:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve(response);
        });
      } catch (error) {
        console.error('MessageBus.send() exception:', error);
        reject(error);
      }
    });
  }

  /**
   * Register a handler for a specific action.
   * When a message with a matching action field arrives, the handler
   * is called with (payload, sender) and its return value is sent back
   * via sendResponse.
   *
   * @param {string} action - The action identifier to listen for.
   * @param {Function} handler - The handler function: (payload, sender) → response|Promise<response>.
   */
  listen(action, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('MessageBus.listen(): handler must be a function');
    }
    this._handlers.set(action, handler);
  }

  /**
   * Remove the handler for a specific action.
   *
   * @param {string} action - The action identifier to stop listening for.
   */
  unlisten(action) {
    this._handlers.delete(action);
  }

  /**
   * Internal message dispatcher. Routes incoming messages by the 'action' field
   * to the registered handler. Handles both synchronous and asynchronous handlers.
   *
   * @param {Object} message - The incoming message with { action, payload }.
   * @param {chrome.runtime.MessageSender} sender - The sender context.
   * @param {Function} sendResponse - Callback to send a response back.
   * @returns {boolean} true to keep the message channel open for async responses.
   * @private
   */
  _onMessage(message, sender, sendResponse) {
    // Ignore messages without an action field
    if (!message || typeof message.action !== 'string') {
      return false;
    }

    const handler = this._handlers.get(message.action);

    if (!handler) {
      // No handler registered for this action — do not consume the message
      return false;
    }

    try {
      const result = handler(message.payload, sender);

      // Handle Promise-returning (async) handlers
      if (result && typeof result.then === 'function') {
        result
          .then((response) => {
            sendResponse(response);
          })
          .catch((error) => {
            console.error(`MessageBus handler error for "${message.action}":`, error);
            sendResponse({ error: error.message });
          });
        // Return true to indicate async sendResponse usage
        return true;
      }

      // Synchronous handler — send response immediately
      sendResponse(result);
    } catch (error) {
      console.error(`MessageBus handler error for "${message.action}":`, error);
      sendResponse({ error: error.message });
    }

    // Return true to keep channel open (safe even for sync — Chrome handles it)
    return true;
  }

  /**
   * Remove the internal dispatcher from chrome.runtime.onMessage.
   * Call this when the MessageBus instance is no longer needed (cleanup).
   */
  destroy() {
    chrome.runtime.onMessage.removeListener(this._boundOnMessage);
    this._handlers.clear();
  }
}

// Export for use in other modules
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_MESSAGE_BUS = MessageBus;
}
