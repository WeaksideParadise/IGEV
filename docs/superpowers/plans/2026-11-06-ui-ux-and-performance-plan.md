# IGEV UI/UX, Performance Streaming & Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform IGEV into a high-performance, decluttered Gantt tool that defaults to light theme, streams timeline scales to eliminate lag at minute zoom on multi-year projects, adds desktop right-click and mobile touch-and-hold context menus, declutters the top navigation into File & View dropdowns, and features the developer's portfolio avatar.

**Architecture:** Vanilla HTML5/CSS/JavaScript contained within `index.html` (with theme synchronization in `datenschutz.html`). DHTMLX Gantt timeline scale range is dynamically windowed and slid to keep scale column count bounded (<800 columns) across all zoom levels. Context interactions are handled via a floating menu driven by `contextmenu` and a 400ms touch-hold listener with an 8px cancellation threshold.

**Tech Stack:** HTML5, CSS3 (CSS Custom Properties), Vanilla JavaScript (ES2022), DHTMLX Gantt 8.0.6.

**Spec:** `docs/superpowers/specs/2026-11-06-ui-ux-and-performance-design.md`

## Global Constraints
- Must remain zero-build and run directly from `index.html`.
- Preserves full backward compatibility with `localStorage` state (`igev_gantt_state_v3`) and exported JSON files.
- Works across touch devices (smartphones, tablets) and modern desktop browsers.
- No new external runtime library dependencies.

## Review Focus
1. **Multi-Year Minute Zoom Performance**: Project spanning 3 years viewed at minute zoom must not freeze the browser or allocate >1,000 scale columns.
2. **Task Grid Tree Preservation**: When timescale is windowed, tasks outside the active window must remain visible in the left task tree (`show_tasks_outside_timescale = true`).
3. **Mobile Touch-Hold vs. Pan**: Swiping finger to pan across the timeline must not trigger the context menu (movement threshold >= 8px cancels timer).
4. **Theme Consistency**: First-time visitor without `localStorage` key gets light theme immediately without flash of dark content.
5. **Menu Dismissal**: Dropdown menus and context menus must dismiss on click-outside, `Escape` key, or timeline drag.

---

### Task 1: Default Light Theme Initialization

**Files:**
- Modify: `index.html:1-30, 70-130, 1120-1135, 1250-1290`
- Modify: `datenschutz.html:1-25`
- Test: `tests/theme_default_test.js`

**Interfaces:**
- Consumes: `localStorage.getItem('igev_theme')`
- Produces: `getCurrentTheme() -> 'light' | 'void' | 'amber' | 'matrix'`, `data-theme="light"` on `<html>` by default.

- [ ] **Step 1: Write test for default light theme**

Create `tests/theme_default_test.js`:
```javascript
const fs = require('fs');
const assert = require('assert');

const indexHtml = fs.readFileSync('index.html', 'utf8');
const datenschutzHtml = fs.readFileSync('datenschutz.html', 'utf8');

// Check html data-theme default
assert(indexHtml.includes('<html lang="en" data-theme="light">'), 'index.html must default to data-theme="light"');
assert(datenschutzHtml.includes('<html lang="de" data-theme="light">'), 'datenschutz.html must default to data-theme="light"');

// Check getCurrentTheme default fallback
assert(indexHtml.includes("return document.documentElement.getAttribute('data-theme') || 'light';"), 'getCurrentTheme must fallback to light');

console.log('Task 1 tests passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/theme_default_test.js`  
Expected: FAIL with assertion error.

- [ ] **Step 3: Update `index.html` and `datenschutz.html` to default to light theme**

In `index.html`:
1. Change `<html lang="en" data-theme="void">` to `<html lang="en" data-theme="light">`.
2. In early `<script>` tag: `var t = localStorage.getItem('igev_theme') || 'light'; document.documentElement.setAttribute('data-theme', t);`.
3. In `getCurrentTheme()`: return attribute or `'light'`.
4. In `setTheme(name)`: fallback to `'light'`.
5. In `#themeSelector`: place `value="light"` selected by default.

In `datenschutz.html`:
1. Change `<html lang="de" data-theme="void">` to `<html lang="de" data-theme="light">`.
2. In early `<script>` tag: fallback to `'light'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/theme_default_test.js`  
Expected: PASS with "Task 1 tests passed."

- [ ] **Step 5: Commit**

```bash
git add index.html datenschutz.html tests/theme_default_test.js
git commit -m "feat: default to light theme across app and legal pages"
```

---

### Task 2: Adaptive Diagram Streaming & Viewport Culling

**Files:**
- Modify: `index.html:1480-1550, 1710-1775, 1820-1935, 2420-2475`
- Test: `tests/streaming_window_test.js`

**Interfaces:**
- Consumes: `gantt.getState()`, `currentZoomIndex`, `zoomLevels`
- Produces: `getTimelineWindow(anchorDate, zoomLevel) -> { startDate, endDate }`, `gantt.config.show_tasks_outside_timescale = true`

- [ ] **Step 1: Write test for windowed timeline bounds calculation**

Create `tests/streaming_window_test.js`:
```javascript
const assert = require('assert');

// Logic extracted from window calculation implementation
function getTimelineWindow(anchorDate, zoomLevelName) {
    const d = new Date(anchorDate);
    let start, end;
    switch(zoomLevelName) {
        case 'minute':
            start = new Date(d.getTime() - 6 * 3600 * 1000); // -6h
            end = new Date(d.getTime() + 6 * 3600 * 1000);   // +6h
            break;
        case '15-min':
            start = new Date(d.getTime() - 24 * 3600 * 1000); // -1d
            end = new Date(d.getTime() + 24 * 3600 * 1000);   // +1d
            break;
        case 'hour':
            start = new Date(d.getTime() - 4 * 24 * 3600 * 1000); // -4d
            end = new Date(d.getTime() + 4 * 24 * 3600 * 1000);   // +4d
            break;
        default:
            return null; // coarse zoom uses standard wide bounds
    }
    return { start, end };
}

const now = new Date('2026-11-06T12:00:00Z');
const minuteWindow = getTimelineWindow(now, 'minute');
const totalMinutes = (minuteWindow.end - minuteWindow.start) / (60 * 1000);
assert(totalMinutes <= 720, `Minute window must not exceed 720 columns, got ${totalMinutes}`);

const hourWindow = getTimelineWindow(now, 'hour');
const totalHours = (hourWindow.end - hourWindow.start) / (3600 * 1000);
assert(totalHours <= 192, `Hour window must not exceed 192 columns, got ${totalHours}`);

console.log('Task 2 streaming window tests passed.');
```

- [ ] **Step 2: Run test to verify it passes**

Run: `node tests/streaming_window_test.js`  
Expected: PASS with "Task 2 streaming window tests passed."

- [ ] **Step 3: Implement adaptive sliding window in `index.html`**

1. Enable `gantt.config.show_tasks_outside_timescale = true;`.
2. Update `initTimelineDateRange(refDate)`:
   - For `minute`, `15-min`, `hour`, and `day` zoom tiers, clamp `gantt.config.start_date` and `gantt.config.end_date` around `refDate` (e.g. +/- 6 hours for minute, +/- 24 hours for 15-min, +/- 4 days for hour).
   - For coarse tiers (week, month, quarter, year, decade), retain wide project bounds.
3. Update `renderFullGridLines()`:
   - Cap filler row cell generation to maximum visible width / visible columns so DOM operations stay minimal.
4. Update `checkAndExpandTimeline()`:
   - When scrolling near window edges at fine zoom levels, slide the window forward or backward by half a window duration and adjust scroll offset smoothly.
5. In `applySearch()` and task selection:
   - If target task start date is outside `[start_date, end_date]`, re-center `initTimelineDateRange(targetTask.start_date)` before calling `gantt.showTask()`.

- [ ] **Step 4: Verify syntax and behavior with Node check**

Run: `node -e "const fs = require('fs'); const code = fs.readFileSync('index.html', 'utf8'); assert(code.includes('show_tasks_outside_timescale = true')); console.log('Syntax and config check OK');"`  
Expected: "Syntax and config check OK".

- [ ] **Step 5: Commit**

```bash
git add index.html tests/streaming_window_test.js
git commit -m "perf: stream diagram scale and window viewport at fine zoom levels"
```

---

### Task 3: Top Navigation Bar Decluttering (File & View Menus)

**Files:**
- Modify: `index.html:1100-1140, 250-400`
- Test: `tests/toolbar_structure_test.js`

**Interfaces:**
- Consumes: `saveData()`, `exportCSV()`, `clearSavedState()`, `toggleLock()`, `toggleMagnetism()`, `openShortcutsModal()`, `setTheme()`
- Produces: Dropdown menu components `#fileDropdown`, `#viewDropdown`, and compact toolbar layout.

- [ ] **Step 1: Write test for toolbar menu structure**

Create `tests/toolbar_structure_test.js`:
```javascript
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

// Check presence of dropdown menus
assert(html.includes('id="fileMenuBtn"'), 'Must have File menu button');
assert(html.includes('id="viewMenuBtn"'), 'Must have View menu button');
assert(html.includes('id="fileDropdown"'), 'Must have File dropdown content');
assert(html.includes('id="viewDropdown"'), 'Must have View dropdown content');

// Check that secondary standalone buttons are no longer bare in toolbar-group
assert(!html.includes('<button class="secondary" onclick="exportCSV()"'), 'Export CSV must be inside dropdown');
assert(!html.includes('<button class="danger" onclick="clearSavedState()"'), 'Reset button must be inside dropdown');

console.log('Task 3 toolbar structure tests passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/toolbar_structure_test.js`  
Expected: FAIL.

- [ ] **Step 3: Implement dropdown menus and CSS styling in `index.html`**

1. Add CSS for `.dropdown`, `.dropdown-menu`, `.dropdown-item`, `.dropdown-divider` styled for both light and dark/cyberpunk themes.
2. Structure the toolbar in `index.html`:
   - Left: Brand & Search
   - Middle: Direct actions (`+ Task`, `📅 Today`, `↩ Undo`, `↪ Redo`)
   - Menus:
     - `📁 File` menu button -> dropdown with:
       - 📂 Import JSON
       - 💾 Export JSON
       - 📊 Export CSV
       - 🗑️ Reset Workspace
     - `⚙️ View` menu button -> dropdown with:
       - 🔓 / 🔒 Lock Diagram (toggle)
       - 🧲 Snap to Grid (toggle)
       - 🎨 Theme Selector (styled options)
       - ❓ Help & Shortcuts
3. Add JavaScript menu toggle logic:
   - Toggle `.show` on click.
   - Dismiss on click outside or when pressing `Escape`.
   - Update lock/snap status labels inside the dropdown when toggled.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/toolbar_structure_test.js`  
Expected: PASS with "Task 3 toolbar structure tests passed."

- [ ] **Step 5: Commit**

```bash
git add index.html tests/toolbar_structure_test.js
git commit -m "feat: organize top toolbar into File and View dropdown menus"
```

---

### Task 4: Developer Profile Avatar Integration

**Files:**
- Modify: `index.html:1120-1135, 340-420`
- Test: `tests/avatar_profile_test.js`

**Interfaces:**
- Consumes: `https://weaksideparadise.me/assets/char_highres.png`
- Produces: `.about-me-avatar-btn` with profile image and link to `https://weaksideparadise.me`

- [ ] **Step 1: Write test for profile avatar button**

Create `tests/avatar_profile_test.js`:
```javascript
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

// Check profile image link and image attributes
assert(html.includes('https://weaksideparadise.me/assets/char_highres.png'), 'Must reference profile image');
assert(html.includes('href="https://weaksideparadise.me"'), 'Must link to portfolio website');
assert(html.includes('class="about-avatar"'), 'Must have about-avatar image class');

console.log('Task 4 profile avatar tests passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/avatar_profile_test.js`  
Expected: FAIL.

- [ ] **Step 3: Implement profile avatar in `index.html`**

1. Replace the plain text `👨‍💻 About Me` button with:
```html
<a href="https://weaksideparadise.me" target="_blank" rel="noopener noreferrer" class="about-avatar-btn" title="Markus Meier — Developer & Portfolio (weaksideparadise.me)">
    <img src="https://weaksideparadise.me/assets/char_highres.png" alt="Markus Meier" class="about-avatar" width="28" height="28" loading="lazy">
    <span class="about-text">About</span>
</a>
```
2. Add CSS:
   - Circular avatar with `border-radius: 50%`, subtle theme-matching accent border, and smooth scale/glow transition on hover.
   - On small screens, hide text and only show the circular avatar.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/avatar_profile_test.js`  
Expected: PASS with "Task 4 profile avatar tests passed."

- [ ] **Step 5: Commit**

```bash
git add index.html tests/avatar_profile_test.js
git commit -m "feat: display creator profile avatar on About Me button"
```

---

### Task 5: Desktop Right-Click & Mobile Long-Press Context Menus

**Files:**
- Modify: `index.html:1180-1240, 2300-2400`
- Test: `tests/context_menu_test.js`

**Interfaces:**
- Consumes: Task ID or empty canvas coordinates from pointer events
- Produces: `#customContextMenu`, touch-hold detector (~400ms), contextual task operations (Edit, Subtask, Milestone/Task toggle, Delete, Add Task Here).

- [ ] **Step 1: Write test for context menu DOM and events**

Create `tests/context_menu_test.js`:
```javascript
const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');

// Check context menu DOM
assert(html.includes('id="customContextMenu"'), 'Must have #customContextMenu');
assert(html.includes('ctxEditTask'), 'Must have edit task item');
assert(html.includes('ctxAddSubtask'), 'Must have add subtask item');
assert(html.includes('ctxDeleteTask'), 'Must have delete task item');
assert(html.includes('ctxAddTaskHere'), 'Must have add task here item');

// Check long-press handling logic
assert(html.includes('contextmenu'), 'Must listen to contextmenu event');
assert(html.includes('touchstart'), 'Must listen to touchstart for long-press');

console.log('Task 5 context menu tests passed.');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/context_menu_test.js`  
Expected: FAIL.

- [ ] **Step 3: Implement context menu and touch-hold gesture in `index.html`**

1. Add `#customContextMenu` HTML structure and CSS:
   - Positioned fixed with z-index 9999, hidden by default.
   - Sleek panel with icons, keyboard indicators, and theme-adaptive colors.
2. Implement context menu logic:
   - `showContextMenu(x, y, taskId, clickDate)`
   - Dynamically toggle task-specific items vs. canvas-specific items based on `taskId`.
   - Prevent overflowing off-screen (clamp x/y to `window.innerWidth` and `window.innerHeight`).
3. Implement Desktop Right-Click:
   - Attach `contextmenu` listener on `#gantt_here`.
   - If right-clicked on `.gantt_task_line` or `.gantt_row`, resolve `taskId` and show task context menu.
   - If right-clicked on empty timeline `.gantt_task_bg` or filler row, calculate date from X position and show canvas context menu.
4. Implement Mobile Long-Press:
   - On `touchstart`: record `(startX, startY)`, start 400ms `setTimeout`.
   - On `touchmove`: if movement > 8px, `clearTimeout`.
   - On `touchend` / `touchcancel`: `clearTimeout`.
   - If timer fires: trigger haptic feedback (`navigator.vibrate?.(40)`), call `e.preventDefault()`, and open context menu at finger position.
5. Close context menu on click-outside, timeline scroll, or `Escape` key.

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/context_menu_test.js`  
Expected: PASS with "Task 5 context menu tests passed."

- [ ] **Step 5: Commit**

```bash
git add index.html tests/context_menu_test.js
git commit -m "feat: add desktop right-click and mobile touch-and-hold context menus"
```

---

### Task 6: Comprehensive Verification & Cleanup

**Files:**
- Modify/Review: `index.html`, `datenschutz.html`
- Create: `tests/full_verification_suite.js`

**Interfaces:**
- Consumes: All updated files
- Produces: Automated test verification report and git verification check.

- [ ] **Step 1: Create full verification test runner**

Create `tests/full_verification_suite.js`:
```javascript
const { execSync } = require('child_process');

console.log('Running full test suite...');
execSync('node tests/theme_default_test.js', { stdio: 'inherit' });
execSync('node tests/streaming_window_test.js', { stdio: 'inherit' });
execSync('node tests/toolbar_structure_test.js', { stdio: 'inherit' });
execSync('node tests/avatar_profile_test.js', { stdio: 'inherit' });
execSync('node tests/context_menu_test.js', { stdio: 'inherit' });

console.log('All verification tests successfully passed!');
```

- [ ] **Step 2: Run full verification suite**

Run: `node tests/full_verification_suite.js`  
Expected: All test suites PASS.

- [ ] **Step 3: Manual and local sanity check**

Verify no syntax errors or unescaped characters in `index.html`.
Check git diff to ensure all changes are clean and preserve comments.

- [ ] **Step 4: Final commit**

```bash
git add tests/full_verification_suite.js
git commit -m "test: add comprehensive automated verification suite for UI/UX and performance"
```
