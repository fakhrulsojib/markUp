/**
 * Phase 2 Verification Tests
 *
 * Tests constants, EventEmitter, and Sanitizer per plan verify steps.
 * Run with: node tests/phase2-verify.js
 *
 * Note: dom-helpers.js requires a browser DOM (document/createElement).
 * It is tested via inline content-script injection per the plan.
 * Sanitizer also requires DOMParser — tested via browser.
 */

'use strict';

// ─── Load modules ───
require('../src/utils/constants.js');
require('../src/core/EventEmitter.js');

const C = globalThis.MARKUP_CONSTANTS;
const EventEmitter = globalThis.MARKUP_EVENT_EMITTER;

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ ${testName}`);
    failed++;
  }
}

// ─── Step 2.1: Constants ───
console.log('\n📦 Step 2.1 — constants.js');

assert(C !== undefined, 'MARKUP_CONSTANTS is defined on globalThis');
assert(Object.isFrozen(C.THEMES), 'THEMES is frozen');
assert(C.THEMES.LIGHT === 'light', 'THEMES.LIGHT === "light"');
assert(C.THEMES.DARK === 'dark', 'THEMES.DARK === "dark"');
assert(C.THEMES.SEPIA === 'sepia', 'THEMES.SEPIA === "sepia"');

assert(Object.isFrozen(C.STORAGE_KEYS), 'STORAGE_KEYS is frozen');
assert(C.STORAGE_KEYS.THEME === 'markup_theme', 'STORAGE_KEYS.THEME prefixed with markup_');
assert(C.STORAGE_KEYS.FONT_SIZE === 'markup_fontSize', 'STORAGE_KEYS.FONT_SIZE prefixed');

assert(Object.isFrozen(C.EVENTS), 'EVENTS is frozen');
assert(C.EVENTS.THEME_CHANGED === 'themeChanged', 'EVENTS.THEME_CHANGED');
assert(C.EVENTS.CONTENT_PARSED === 'contentParsed', 'EVENTS.CONTENT_PARSED');

assert(Object.isFrozen(C.DEFAULTS), 'DEFAULTS is frozen');
assert(C.DEFAULTS.THEME === 'light', 'DEFAULTS.THEME === "light"');
assert(C.DEFAULTS.FONT_SIZE === 16, 'DEFAULTS.FONT_SIZE === 16');
assert(C.DEFAULTS.LINE_HEIGHT === 1.6, 'DEFAULTS.LINE_HEIGHT === 1.6');
assert(C.DEFAULTS.FONT_FAMILY === 'system-ui', 'DEFAULTS.FONT_FAMILY === "system-ui"');

assert(Array.isArray(C.MD_URL_PATTERNS), 'MD_URL_PATTERNS is array');
assert(C.MD_URL_PATTERNS.length === 5, 'MD_URL_PATTERNS has 5 patterns');
assert(C.MD_URL_PATTERNS[0].test('README.md'), 'Pattern matches .md');
assert(C.MD_URL_PATTERNS[1].test('file.markdown'), 'Pattern matches .markdown');
assert(!C.MD_URL_PATTERNS[0].test('README.txt'), 'Pattern rejects .txt');
assert(C.MD_URL_PATTERNS[0].test('doc.md?v=2'), 'Pattern matches .md with query string');
assert(C.MD_URL_PATTERNS[0].test('doc.md#section'), 'Pattern matches .md with fragment');

assert(C.CSS_PREFIX === 'markup', 'CSS_PREFIX === "markup"');
assert(C.MAX_DOCUMENT_SIZE === 500000, 'MAX_DOCUMENT_SIZE === 500000');

// Mutation test
try {
  C.THEMES.NEW = 'new';
} catch (e) { /* strict mode throws */ }
assert(C.THEMES.NEW === undefined, 'THEMES cannot be mutated');

// ─── Step 2.4: EventEmitter ───
console.log('\n📦 Step 2.4 — EventEmitter.js');

// Basic on/emit
const emitter = new EventEmitter();
let callCount = 0;
function handler() { callCount++; }

emitter.on('test', handler);
emitter.emit('test');
assert(callCount === 1, 'on + emit: callback fires');

emitter.emit('test');
assert(callCount === 2, 'emit again: callback fires again');

// Duplicate guard (Set prevents duplicates)
emitter.on('test', handler);
emitter.emit('test');
assert(callCount === 3, 'Duplicate listener not added (fires once per emit)');

// off removes listener
emitter.off('test', handler);
emitter.emit('test');
assert(callCount === 3, 'off: callback no longer fires');

// once fires only once
let onceCount = 0;
function onceHandler() { onceCount++; }
emitter.once('onceEvent', onceHandler);
emitter.emit('onceEvent');
emitter.emit('onceEvent');
assert(onceCount === 1, 'once: fires only once');

// emit with args
let receivedArgs = null;
emitter.on('argsEvent', (a, b) => { receivedArgs = [a, b]; });
emitter.emit('argsEvent', 'hello', 42);
assert(receivedArgs[0] === 'hello' && receivedArgs[1] === 42, 'emit passes arguments correctly');

// emit returns boolean
assert(emitter.emit('argsEvent', 1, 2) === true, 'emit returns true when listeners exist');
assert(emitter.emit('noListeners') === false, 'emit returns false when no listeners');

// Error isolation — one bad listener doesn't break others
let goodListenerCalled = false;
emitter.on('errorEvent', () => { throw new Error('intentional'); });
emitter.on('errorEvent', () => { goodListenerCalled = true; });
emitter.emit('errorEvent');
assert(goodListenerCalled, 'Error in one listener does not prevent others');

// listenerCount
assert(emitter.listenerCount('errorEvent') === 2, 'listenerCount returns correct count');
assert(emitter.listenerCount('nonexistent') === 0, 'listenerCount returns 0 for unknown event');

// removeAllListeners
emitter.removeAllListeners('errorEvent');
assert(emitter.listenerCount('errorEvent') === 0, 'removeAllListeners clears event');

emitter.on('a', () => {});
emitter.on('b', () => {});
emitter.removeAllListeners();
assert(emitter.listenerCount('a') === 0 && emitter.listenerCount('b') === 0, 'removeAllListeners() clears all events');

// TypeError for non-function
let threwTypeError = false;
try { emitter.on('x', 'not a function'); } catch (e) { threwTypeError = e instanceof TypeError; }
assert(threwTypeError, 'on() throws TypeError for non-function callback');

// Chaining
const chain = emitter.on('chain', () => {}).off('chain', () => {});
assert(chain === emitter, 'on/off return this for chaining');

// ─── Summary ───
console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
} else {
  console.log('All Phase 2 tests passed! ✅\n');
}
