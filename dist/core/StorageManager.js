/**
 * MarkUp — StorageManager
 *
 * Abstraction layer over chrome.storage.sync/local providing
 * namespaced key management, default value fallbacks, and
 * robust error handling via chrome.runtime.lastError.
 *
 * @class StorageManager
 */

'use strict';

class StorageManager {
  /**
   * Create a new StorageManager instance.
   *
   * @param {string} [namespace='markup'] - Prefix for all storage keys to avoid collisions.
   * @param {string} [storageArea='sync'] - Which chrome.storage area to use ('sync' or 'local').
   */
  constructor(namespace = 'markup', storageArea = 'sync') {
    /**
     * Key namespace prefix.
     * @type {string}
     * @private
     */
    this._namespace = namespace;

    /**
     * The chrome.storage area reference (sync or local).
     * @type {chrome.storage.StorageArea}
     * @private
     */
    this._storage = storageArea === 'local'
      ? chrome.storage.local
      : chrome.storage.sync;

    /**
     * Default values from constants, used as fallbacks when no persisted value exists.
     * @type {Object}
     * @private
     */
    this._defaults = (typeof globalThis !== 'undefined' && globalThis.MARKUP_CONSTANTS)
      ? globalThis.MARKUP_CONSTANTS.DEFAULTS
      : {};
  }

  /**
   * Prefix a key with the namespace.
   * Example: _prefixKey('theme') → 'markup_theme'
   *
   * @param {string} key - The raw key name.
   * @returns {string} The namespaced key.
   * @private
   */
  _prefixKey(key) {
    return `${this._namespace}_${key}`;
  }

  /**
   * Retrieve a value from storage by key.
   * Returns the default value from DEFAULTS if no persisted value is found.
   *
   * @param {string} key - The raw key name (without namespace prefix).
   * @returns {Promise<*>} The stored value, or the default if not found.
   */
  async get(key) {
    const prefixedKey = this._prefixKey(key);

    return new Promise((resolve, reject) => {
      try {
        this._storage.get(prefixedKey, (result) => {
          if (chrome.runtime.lastError) {
            console.error('StorageManager.get() error:', chrome.runtime.lastError.message);
            // Fall back to default on error
            resolve(this._getDefault(key));
            return;
          }

          if (result[prefixedKey] !== undefined) {
            resolve(result[prefixedKey]);
          } else {
            resolve(this._getDefault(key));
          }
        });
      } catch (error) {
        console.error('StorageManager.get() exception:', error);
        resolve(this._getDefault(key));
      }
    });
  }

  /**
   * Persist a value to storage.
   *
   * @param {string} key - The raw key name (without namespace prefix).
   * @param {*} value - The value to store.
   * @returns {Promise<void>}
   */
  async set(key, value) {
    const prefixedKey = this._prefixKey(key);

    return new Promise((resolve, reject) => {
      try {
        this._storage.set({ [prefixedKey]: value }, () => {
          if (chrome.runtime.lastError) {
            console.error('StorageManager.set() error:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        });
      } catch (error) {
        console.error('StorageManager.set() exception:', error);
        reject(error);
      }
    });
  }

  /**
   * Remove a value from storage.
   *
   * @param {string} key - The raw key name (without namespace prefix).
   * @returns {Promise<void>}
   */
  async remove(key) {
    const prefixedKey = this._prefixKey(key);

    return new Promise((resolve, reject) => {
      try {
        this._storage.remove(prefixedKey, () => {
          if (chrome.runtime.lastError) {
            console.error('StorageManager.remove() error:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          resolve();
        });
      } catch (error) {
        console.error('StorageManager.remove() exception:', error);
        reject(error);
      }
    });
  }

  /**
   * Retrieve all values stored under this namespace.
   * Returns an object with un-prefixed keys mapped to their stored values.
   *
   * @returns {Promise<Object>} Object of { key: value } pairs for all namespaced entries.
   */
  async getAll() {
    const prefix = this._namespace + '_';

    return new Promise((resolve, reject) => {
      try {
        this._storage.get(null, (result) => {
          if (chrome.runtime.lastError) {
            console.error('StorageManager.getAll() error:', chrome.runtime.lastError.message);
            resolve({});
            return;
          }

          const filtered = {};
          for (const [fullKey, value] of Object.entries(result)) {
            if (fullKey.startsWith(prefix)) {
              const rawKey = fullKey.slice(prefix.length);
              filtered[rawKey] = value;
            }
          }
          resolve(filtered);
        });
      } catch (error) {
        console.error('StorageManager.getAll() exception:', error);
        resolve({});
      }
    });
  }

  /**
   * Look up a default value for a key from the DEFAULTS constant.
   * Maps common key names to their DEFAULTS counterpart.
   *
   * @param {string} key - The raw key name.
   * @returns {*} The default value, or undefined if no default is defined.
   * @private
   */
  _getDefault(key) {
    // Map raw key names to DEFAULTS keys (case-insensitive match)
    const upperKey = key.toUpperCase();
    if (this._defaults && this._defaults[upperKey] !== undefined) {
      return this._defaults[upperKey];
    }
    return undefined;
  }
}

// Export for use in other modules
if (typeof globalThis !== 'undefined') {
  globalThis.MARKUP_STORAGE_MANAGER = StorageManager;
}
