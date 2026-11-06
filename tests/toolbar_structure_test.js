const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

// ===================================================================
// 1. Static HTML & Contract Assertions
// ===================================================================

// Check presence of dropdown menus
assert(html.includes('id="fileMenuBtn"'), 'Must have File menu button with id="fileMenuBtn"');
assert(html.includes('id="viewMenuBtn"'), 'Must have View menu button with id="viewMenuBtn"');
assert(html.includes('id="fileDropdown"'), 'Must have File dropdown content with id="fileDropdown"');
assert(html.includes('id="viewDropdown"'), 'Must have View dropdown content with id="viewDropdown"');

// Check that secondary standalone buttons are no longer bare in toolbar-group
assert(!html.includes('<button class="secondary" onclick="exportCSV()"'), 'Export CSV must be inside dropdown');
assert(!html.includes('<button class="danger" onclick="clearSavedState()"'), 'Reset button must be inside dropdown');

// Check that themeSelector is retained inside viewDropdown
assert(html.includes('id="themeSelector"'), 'Theme selector must be present');

// Additional structural checks for File dropdown items
assert(html.includes('saveData()'), 'saveData must be linked in File menu');
assert(html.includes('exportCSV()'), 'exportCSV must be linked in File menu');
assert(html.includes('clearSavedState()'), 'clearSavedState must be linked in File menu');
assert(html.includes('id="lockToggleBtn"'), 'lockToggleBtn must be present in View menu');
assert(html.includes('id="magnetToggleBtn"'), 'magnetToggleBtn must be present in View menu');
assert(html.includes('openShortcutsModal()'), 'openShortcutsModal must be present in View menu');

// Check dropdown css styling classes
assert(html.includes('.dropdown'), 'CSS must include .dropdown');
assert(html.includes('.dropdown-menu'), 'CSS must include .dropdown-menu');
assert(html.includes('.dropdown-item'), 'CSS must include .dropdown-item');
assert(html.includes('right: 0') && html.includes('left: auto'), 'Dropdown menu must align right: 0 to prevent overflowing off-screen to the right');
assert(html.includes('max-height: calc(100vh - 70px)'), 'Dropdown menu must clamp max-height to viewport height');
assert(html.includes('overflow-y: auto'), 'Dropdown menu must allow vertical scrolling when taller than viewport');
assert(html.includes('adjustDropdownPosition'), 'Must have adjustDropdownPosition logic');

// Check Developer / About Me Link slot retained
assert(html.includes('about-avatar-btn'), 'Must retain about-avatar-btn slot');

// ===================================================================
// 2. Behavioral Unit Tests via Mocked DOM in VM
// ===================================================================

class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(c) { this.classes.add(c); }
  remove(c) { this.classes.delete(c); }
  toggle(c, force) {
    if (force !== undefined) {
      if (force) this.classes.add(c); else this.classes.delete(c);
      return force;
    }
    if (this.classes.has(c)) { this.classes.delete(c); return false; }
    this.classes.add(c); return true;
  }
  contains(c) { return this.classes.has(c); }
}

class MockElement {
  constructor(id, tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.classList = new MockClassList();
    this.attributes = {};
    this.innerHTML = '';
    this.title = '';
    this.disabled = false;
    this.style = {};
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  removeAttribute(k) { delete this.attributes[k]; }
}

function createDropdownTestEnv() {
  const elements = {
    fileMenuBtn: new MockElement('fileMenuBtn', 'button'),
    viewMenuBtn: new MockElement('viewMenuBtn', 'button'),
    fileDropdown: new MockElement('fileDropdown', 'div'),
    viewDropdown: new MockElement('viewDropdown', 'div'),
    lockToggleBtn: new MockElement('lockToggleBtn', 'button'),
    magnetToggleBtn: new MockElement('magnetToggleBtn', 'button')
  };

  const document = {
    getElementById(id) {
      return elements[id] || null;
    },
    querySelectorAll(selector) {
      if (selector === '.dropdown-menu.show') {
        return [elements.fileDropdown, elements.viewDropdown].filter(el => el.classList.contains('show'));
      }
      if (selector === '.dropdown-btn[aria-expanded="true"]') {
        return [elements.fileMenuBtn, elements.viewMenuBtn].filter(el => el.getAttribute('aria-expanded') === 'true');
      }
      return [];
    }
  };

  const context = {
    document,
    console
  };
  vm.createContext(context);
  return { context, elements };
}

// Extract dropdown functions from index.html
const dropdownBlockMatch = html.match(/\/\/ TOOLBAR DROPDOWN MENUS[\s\S]*?function closeAllDropdowns\(\) \{[\s\S]*?\n    \}/);
assert(dropdownBlockMatch, 'Dropdown functions block must be found in index.html');

{
  const { context, elements } = createDropdownTestEnv();
  vm.runInContext(dropdownBlockMatch[0], context);

  // Initial state: closed
  assert(!elements.fileDropdown.classList.contains('show'));
  assert(!elements.viewDropdown.classList.contains('show'));

  // Open file dropdown
  context.toggleDropdown('fileDropdown', 'fileMenuBtn');
  assert(elements.fileDropdown.classList.contains('show'), 'fileDropdown should have show class');
  assert.strictEqual(elements.fileMenuBtn.getAttribute('aria-expanded'), 'true');

  // Open view dropdown -> closes file dropdown
  context.toggleDropdown('viewDropdown', 'viewMenuBtn');
  assert(!elements.fileDropdown.classList.contains('show'), 'fileDropdown should be closed');
  assert.strictEqual(elements.fileMenuBtn.getAttribute('aria-expanded'), 'false');
  assert(elements.viewDropdown.classList.contains('show'), 'viewDropdown should be open');
  assert.strictEqual(elements.viewMenuBtn.getAttribute('aria-expanded'), 'true');

  // Toggle view dropdown again -> closes view dropdown
  context.toggleDropdown('viewDropdown', 'viewMenuBtn');
  assert(!elements.viewDropdown.classList.contains('show'), 'viewDropdown should be closed');
  assert.strictEqual(elements.viewMenuBtn.getAttribute('aria-expanded'), 'false');

  // Test closeAllDropdowns
  context.toggleDropdown('fileDropdown', 'fileMenuBtn');
  assert(elements.fileDropdown.classList.contains('show'));
  context.closeAllDropdowns();
  assert(!elements.fileDropdown.classList.contains('show'), 'closeAllDropdowns must remove show class');
  assert.strictEqual(elements.fileMenuBtn.getAttribute('aria-expanded'), 'false');
}

// Test updateMagnetBtn behavior
{
  const { context, elements } = createDropdownTestEnv();
  const magnetBlockMatch = html.match(/function updateMagnetBtn\(\) \{[\s\S]*?\n    \}/);
  assert(magnetBlockMatch, 'updateMagnetBtn function must be present');
  vm.runInContext(magnetBlockMatch[0], context);

  // Test snap Enabled = true
  context.snapEnabled = true;
  context.updateMagnetBtn();
  assert.strictEqual(elements.magnetToggleBtn.innerHTML, '🧲 Snap: On');
  assert(elements.magnetToggleBtn.classList.contains('magnet-on'), 'Must have magnet-on class when snap is enabled');

  // Test snap Enabled = false
  context.snapEnabled = false;
  context.updateMagnetBtn();
  assert.strictEqual(elements.magnetToggleBtn.innerHTML, '🧲 Snap: Off');
  assert(!elements.magnetToggleBtn.classList.contains('magnet-on'), 'Must not have magnet-on class when snap is disabled');
}

// Test applyLockState label update
{
  const { context, elements } = createDropdownTestEnv();
  // Mock minimal gantt and document.body
  context.gantt = { config: {} };
  context.document.body = { classList: new MockClassList() };
  context.document.querySelector = () => null;
  context.updateUndoRedoUI = () => {};

  const lockBlockMatch = html.match(/function applyLockState\(\) \{[\s\S]*?\n    \}/);
  assert(lockBlockMatch, 'applyLockState function must be present');
  vm.runInContext(lockBlockMatch[0], context);

  // Test unlocked
  context.isLocked = false;
  context.applyLockState();
  assert.strictEqual(elements.lockToggleBtn.innerHTML, '🔓 Edit Mode');
  assert(!elements.lockToggleBtn.classList.contains('btn-locked'));

  // Test locked
  context.isLocked = true;
  context.applyLockState();
  assert.strictEqual(elements.lockToggleBtn.innerHTML, '🔒 Locked Mode');
  assert(elements.lockToggleBtn.classList.contains('btn-locked'));
}

console.log('Task 3 toolbar structure tests passed.');
