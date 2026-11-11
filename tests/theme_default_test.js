const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const datenschutzHtml = fs.readFileSync('datenschutz.html', 'utf8');

// ===================================================================
// 1. Static HTML & Contract Assertions
// ===================================================================
// Check html data-theme default
assert(indexHtml.includes('<html lang="en" data-theme="light">'), 'index.html must default to data-theme="light"');
assert(datenschutzHtml.includes('<html lang="de" data-theme="light">'), 'datenschutz.html must default to data-theme="light"');

// Check early theme script tag fallback
assert(
  /var t = localStorage\.getItem\('igev_theme'\) \|\| 'light';\s*document\.documentElement\.setAttribute\('data-theme', t\);/.test(indexHtml),
  'index.html early script must fallback to light'
);
assert(
  /var t = localStorage\.getItem\('igev_theme'\) \|\| 'light';\s*document\.documentElement\.setAttribute\('data-theme', t\);/.test(datenschutzHtml),
  'datenschutz.html early script must fallback to light'
);

// Check getCurrentTheme default fallback
assert(indexHtml.includes("return document.documentElement.getAttribute('data-theme') || 'light';"), 'getCurrentTheme must fallback to light');

// Check setTheme fallback
assert(indexHtml.includes("if (!THEME_DEFAULTS[name]) name = 'light';"), 'setTheme must fallback to light');

// Check themeSelector default selected option
assert(indexHtml.includes('<option value="light" selected>☀️ Light</option>'), 'themeSelector option light must be selected');

// Check dark-studio theme static presence
assert(indexHtml.includes('[data-theme="dark-studio"]'), 'index.html must include [data-theme="dark-studio"] styles');
assert(datenschutzHtml.includes('[data-theme="dark-studio"]'), 'datenschutz.html must include [data-theme="dark-studio"] styles');
assert(indexHtml.includes('<option value="dark-studio">🎬 Dark-Studio</option>'), 'themeSelector must have dark-studio option');
assert(datenschutzHtml.includes('dark-studio'), 'datenschutz.html must document dark-studio in privacy table');

// ===================================================================
// 2. Behavioral Unit Tests via Built-in VM
// ===================================================================
function createMockEnv(initialStorage = {}) {
  const storage = { ...initialStorage };
  const attributes = {};
  const elements = {};

  const document = {
    documentElement: {
      getAttribute(k) { return attributes[k] || null; },
      setAttribute(k, v) { attributes[k] = String(v); }
    },
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = { id, value: '', listeners: {}, addEventListener(e, fn) { this.listeners[e] = fn; } };
      }
      return elements[id];
    }
  };

  const localStorage = {
    getItem(k) { return k in storage ? storage[k] : null; },
    setItem(k, v) { storage[k] = String(v); },
    removeItem(k) { delete storage[k]; }
  };

  const context = {
    document,
    localStorage,
    console,
    setTimeout,
    clearTimeout
  };
  vm.createContext(context);
  return { context, attributes, storage, elements };
}

// Test early script behavior when localStorage is empty
{
  const { context, attributes } = createMockEnv();
  // Extract and run early script
  const earlyScriptMatch = indexHtml.match(/<script>\s*(\(function\(\)[\s\S]*?localStorage[\s\S]*?\}\)\(\);)\s*<\/script>/);
  assert(earlyScriptMatch, 'Early theme script not found in index.html');
  vm.runInContext(earlyScriptMatch[1], context);
  assert.strictEqual(attributes['data-theme'], 'light', 'Early script must set data-theme to light when localStorage is empty');
}

// Test early script behavior when localStorage has 'void'
{
  const { context, attributes } = createMockEnv({ igev_theme: 'void' });
  const earlyScriptMatch = indexHtml.match(/<script>\s*(\(function\(\)[\s\S]*?localStorage[\s\S]*?\}\)\(\);)\s*<\/script>/);
  vm.runInContext(earlyScriptMatch[1], context);
  assert.strictEqual(attributes['data-theme'], 'void', 'Early script must preserve saved void theme');
}

// Test early script behavior when localStorage has 'dark-studio'
{
  const { context, attributes } = createMockEnv({ igev_theme: 'dark-studio' });
  const earlyScriptMatch = indexHtml.match(/<script>\s*(\(function\(\)[\s\S]*?localStorage[\s\S]*?\}\)\(\);)\s*<\/script>/);
  vm.runInContext(earlyScriptMatch[1], context);
  assert.strictEqual(attributes['data-theme'], 'dark-studio', 'Early script must preserve saved dark-studio theme');
}

// Test THEME MANAGEMENT script functions
{
  const { context, attributes, storage, elements } = createMockEnv();
  // Extract THEME MANAGEMENT block
  const themeBlockMatch = indexHtml.match(/\/\/ THEME MANAGEMENT[\s\S]*?\/\/ HISTORY/);
  assert(themeBlockMatch, 'THEME MANAGEMENT block not found');
  vm.runInContext(themeBlockMatch[0], context);

  // getCurrentTheme with no attribute should return 'light'
  assert.strictEqual(context.getCurrentTheme(), 'light', 'getCurrentTheme should return light when no data-theme attribute set');

  // getThemeColor should return light colors
  const defaultTaskColor = context.getThemeColor('task');
  assert.strictEqual(defaultTaskColor, '#0284c7', 'Default task color should be light theme blue (#0284c7)');

  // setTheme with invalid name should default to 'light'
  context.setTheme('nonexistent');
  assert.strictEqual(attributes['data-theme'], 'light', 'setTheme with invalid name must fall back to light');
  assert.strictEqual(storage['igev_theme'], 'light', 'localStorage should record light theme');

  // setTheme to 'amber'
  context.setTheme('amber');
  assert.strictEqual(attributes['data-theme'], 'amber');
  assert.strictEqual(storage['igev_theme'], 'amber');
  assert.strictEqual(context.getCurrentTheme(), 'amber');
  assert.strictEqual(context.getThemeColor('task'), '#ffaa00');

  // Check dark-studio theme in THEME_DEFAULTS
  const studioDefaults = vm.runInContext('THEME_DEFAULTS["dark-studio"]', context);
  assert(studioDefaults, 'THEME_DEFAULTS must contain dark-studio');
  assert.strictEqual(studioDefaults.task, '#3788ff');
  assert.strictEqual(studioDefaults.project, '#10b981');
  assert.strictEqual(studioDefaults.milestone, '#ff4d6d');
  assert.strictEqual(studioDefaults.link, '#f59e0b');
  assert.strictEqual(studioDefaults.text, '#ffffff');

  // setTheme to 'dark-studio'
  context.setTheme('dark-studio');
  assert.strictEqual(attributes['data-theme'], 'dark-studio');
  assert.strictEqual(storage['igev_theme'], 'dark-studio');
  assert.strictEqual(context.getCurrentTheme(), 'dark-studio');
  assert.strictEqual(context.getThemeColor('task'), '#3788ff');
  assert.strictEqual(context.getThemeColor('project'), '#10b981');
  assert.strictEqual(context.getThemeColor('milestone'), '#ff4d6d');
  assert.strictEqual(context.getThemeColor('link'), '#f59e0b');
}

console.log('Task 1 tests passed.');
