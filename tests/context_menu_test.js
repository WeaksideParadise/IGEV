const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');

// ===================================================================
// Task 5: Context Menu Contract & Behavioral Tests
// ===================================================================

// -------------------------------------------------------------------
// 1. Static HTML & Contract Assertions (Task Brief Step 1)
// -------------------------------------------------------------------
assert(html.includes('id="customContextMenu"'), 'Must have #customContextMenu');
assert(html.includes('id="ctxTaskSection"'), 'Must have task section with id="ctxTaskSection"');
assert(html.includes('id="ctxCanvasSection"'), 'Must have canvas section with id="ctxCanvasSection"');
assert(html.includes('id="ctxEditTask"'), 'Must have edit task item with id="ctxEditTask"');
assert(html.includes('id="ctxAddSubtask"'), 'Must have add subtask item with id="ctxAddSubtask"');
assert(html.includes('id="ctxToggleMilestone"'), 'Must have milestone toggle item with id="ctxToggleMilestone"');
assert(html.includes('id="ctxDeleteTask"'), 'Must have delete task item with id="ctxDeleteTask"');
assert(html.includes('id="ctxAddTaskHere"'), 'Must have add task here item with id="ctxAddTaskHere"');
assert(html.includes('id="ctxShowToday"'), 'Must have show today item with id="ctxShowToday"');
assert(html.includes('id="ctxToggleLock"'), 'Must have toggle lock item with id="ctxToggleLock"');

// -------------------------------------------------------------------
// 2. CSS Styling Assertions
// -------------------------------------------------------------------
assert(html.includes('.custom-context-menu'), 'CSS must define .custom-context-menu');
assert(html.includes('.context-item'), 'CSS must define .context-item');
assert(html.includes('.context-divider'), 'CSS must define .context-divider');

// Verify critical CSS properties for .custom-context-menu
assert(/\.custom-context-menu\s*\{[^}]*position:\s*fixed/i.test(html), '.custom-context-menu must have position: fixed');
assert(/\.custom-context-menu\s*\{[^}]*z-index:\s*10000/i.test(html), '.custom-context-menu must have z-index: 10000');
assert(/\.custom-context-menu\s*\{[^}]*background:\s*var\(--bg-panel\)/i.test(html), '.custom-context-menu must have background: var(--bg-panel)');
assert(/\.custom-context-menu\s*\{[^}]*border:\s*1px solid var\(--border-strong\)/i.test(html), '.custom-context-menu must have border: 1px solid var(--border-strong)');
assert(/\.custom-context-menu\s*\{[^}]*border-radius:\s*8px/i.test(html), '.custom-context-menu must have border-radius: 8px');
assert(/\.custom-context-menu\s*\{[^}]*box-shadow:\s*0 8px 24px rgba\(0,\s*0,\s*0,\s*0\.3\)/i.test(html), '.custom-context-menu must have box-shadow: 0 8px 24px rgba(0,0,0,0.3)');

// Verify context items styling
assert(/\.context-item\s*\{[^}]*width:\s*100%/i.test(html), '.context-item must have width: 100%');
assert(/\.context-item\s*\{[^}]*text-align:\s*left/i.test(html), '.context-item must have text-align: left');
assert(/\.context-item\s*\{[^}]*padding:\s*8px 14px/i.test(html), '.context-item must have padding: 8px 14px');
assert(/\.context-item:hover\s*\{[^}]*background:\s*var\(--accent\)/i.test(html), '.context-item:hover must have background: var(--accent)');
assert(/\.context-item\.text-danger\s*\{[^}]*color:\s*var\(--accent-3\)/i.test(html), '.context-item.text-danger must have color: var(--accent-3)');

// -------------------------------------------------------------------
// 3. Event Handling Code Patterns
// -------------------------------------------------------------------
assert(html.includes('contextmenu'), 'Must handle contextmenu event');
assert(html.includes('touchstart'), 'Must handle touchstart for long-press');
assert(html.includes('touchmove'), 'Must handle touchmove for movement threshold cancellation');
assert(html.includes('touchend'), 'Must handle touchend for timer cancellation');
assert(html.includes('touchcancel'), 'Must handle touchcancel for timer cancellation');
assert(html.includes('400'), 'Must use ~400ms duration for long-press');
assert(html.includes('> 8') || html.includes('dist > 8'), 'Must enforce 8px movement tolerance threshold');
assert(html.includes('navigator.vibrate'), 'Must trigger haptic feedback via navigator.vibrate');

// Verify Dismissal handlers
assert(html.includes('hideContextMenu'), 'Must define hideContextMenu');
assert(html.includes('showContextMenu'), 'Must define showContextMenu');

// -------------------------------------------------------------------
// 4. Behavioral Unit Tests via Mocked DOM in VM
// -------------------------------------------------------------------

class MockClassList {
  constructor() { this.classes = new Set(); }
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
    this.textContent = '';
    this.style = {};
    this.offsetWidth = 190;
    this.offsetHeight = 160;
    this.listeners = {};
  }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] || null; }
  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }
  trigger(event, data = {}) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(fn => fn(data));
    }
  }
}

function createContextMenuTestEnv() {
  const elements = {
    customContextMenu: new MockElement('customContextMenu', 'div'),
    ctxTaskSection: new MockElement('ctxTaskSection', 'div'),
    ctxCanvasSection: new MockElement('ctxCanvasSection', 'div'),
    ctxEditTask: new MockElement('ctxEditTask', 'button'),
    ctxAddSubtask: new MockElement('ctxAddSubtask', 'button'),
    ctxToggleMilestone: new MockElement('ctxToggleMilestone', 'button'),
    ctxDeleteTask: new MockElement('ctxDeleteTask', 'button'),
    ctxAddTaskHere: new MockElement('ctxAddTaskHere', 'button'),
    ctxShowToday: new MockElement('ctxShowToday', 'button'),
    ctxToggleLock: new MockElement('ctxToggleLock', 'button'),
    lockToggleBtn: new MockElement('lockToggleBtn', 'button'),
    gantt_here: new MockElement('gantt_here', 'div')
  };

  const document = {
    body: { classList: new MockClassList() },
    getElementById(id) { return elements[id] || null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {}
  };

  const window = {
    innerWidth: 1024,
    innerHeight: 768,
    addEventListener() {}
  };

  const context = {
    document,
    window,
    console,
    navigator: { vibrate: () => true },
    getThemeColor: (t) => t === 'milestone' ? '#e11d48' : '#0284c7',
    scheduleSave: () => {},
    showToast: () => {},
    quickAddTaskAt: () => {},
    quickAddTask: () => {},
    showToday: () => {},
    toggleLock: () => {},
    closeAllDropdowns: () => {},
    updateUndoRedoUI: () => {},
    isLocked: false,
    gantt: {
      config: {},
      isTaskExists: () => true,
      getTask: (id) => ({ id, text: 'Test Task', type: 'task', duration: 3 }),
      updateTask: () => {},
      deleteTask: () => {},
      createTask: () => {},
      open: () => {},
      showLightbox: () => {},
      uid: () => 'uid_1'
    }
  };

  vm.createContext(context);
  return { context, elements };
}

// Extract context menu function block from index.html
const contextMenuMatch = html.match(/\/\/ CONTEXT MENU \(DESKTOP RIGHT-CLICK & MOBILE LONG-PRESS\)[\s\S]*?function initContextMenu\(\) \{[\s\S]*?\n    initContextMenu\(\);/);
assert(contextMenuMatch, 'Context menu code block must be present in index.html');

{
  const { context, elements } = createContextMenuTestEnv();
  vm.runInContext(contextMenuMatch[0], context);

  // Test 1: Task context opening shows task section and hides canvas section
  context.showContextMenu(150, 200, 'task_42', new Date());
  assert.strictEqual(elements.customContextMenu.style.display, 'block');
  assert.strictEqual(elements.ctxTaskSection.style.display, 'block');
  assert.strictEqual(elements.ctxCanvasSection.style.display, 'none');
  assert.strictEqual(elements.customContextMenu.style.left, '150px');
  assert.strictEqual(elements.customContextMenu.style.top, '200px');

  // Test 2: Canvas context opening (taskId = null) shows canvas section and hides task section
  context.showContextMenu(300, 400, null, new Date());
  assert.strictEqual(elements.ctxTaskSection.style.display, 'none');
  assert.strictEqual(elements.ctxCanvasSection.style.display, 'block');
  assert.strictEqual(elements.customContextMenu.style.left, '300px');
  assert.strictEqual(elements.customContextMenu.style.top, '400px');

  // Test 3: Coordinate clamping at viewport boundaries
  // Max X: 1024 - 190 - 10 = 824
  // Max Y: 768 - 160 - 10 = 598
  context.showContextMenu(2000, 1500, null, new Date());
  assert.strictEqual(elements.customContextMenu.style.left, '824px', 'X coordinate must be clamped to viewport width - menuWidth - 10');
  assert.strictEqual(elements.customContextMenu.style.top, '598px', 'Y coordinate must be clamped to viewport height - menuHeight - 10');

  // Min X/Y clamping
  context.showContextMenu(-100, -50, null, new Date());
  assert.strictEqual(elements.customContextMenu.style.left, '10px', 'X coordinate must be clamped to min 10px');
  assert.strictEqual(elements.customContextMenu.style.top, '10px', 'Y coordinate must be clamped to min 10px');

  // Test 4: hideContextMenu hides menu and clears active references
  context.hideContextMenu();
  assert.strictEqual(elements.customContextMenu.style.display, 'none');

  // Test 5: Milestone Toggle behavior
  let testTask = { id: 't1', text: 'Task 1', type: 'task', duration: 4, color: '#0284c7' };
  context.gantt.getTask = () => testTask;
  context.showContextMenu(100, 100, 't1', null);

  // Trigger toggle milestone click
  elements.ctxToggleMilestone.trigger('click');
  assert.strictEqual(testTask.type, 'milestone', 'Task should toggle to milestone');
  assert.strictEqual(testTask.duration, 0, 'Milestone duration must be 0');

  // Toggle milestone back to task
  context.showContextMenu(100, 100, 't1', null);
  elements.ctxToggleMilestone.trigger('click');
  assert.strictEqual(testTask.type, 'task', 'Milestone should toggle back to task');
  assert(testTask.duration >= 1, 'Task duration should be >= 1');
}

// Test 6: Verify applyLockState updates ctxToggleLock label
{
  const { context, elements } = createContextMenuTestEnv();
  const lockBlockMatch = html.match(/function applyLockState\(\) \{[\s\S]*?\n    \}/);
  assert(lockBlockMatch, 'applyLockState function must be present');
  vm.runInContext(lockBlockMatch[0], context);

  // Unlocked
  context.isLocked = false;
  context.applyLockState();
  assert.strictEqual(elements.ctxToggleLock.innerHTML, '🔒 Toggle Lock');

  // Locked
  context.isLocked = true;
  context.applyLockState();
  assert.strictEqual(elements.ctxToggleLock.innerHTML, '🔓 Unlock Diagram');
}

console.log('Task 5 context menu tests passed.');
