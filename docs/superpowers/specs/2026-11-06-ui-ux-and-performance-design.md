# Design Document: IGEV UI/UX, Performance Streaming & Identity Improvements

**Date**: 2026-11-06  
**Status**: Pending Review  
**Author**: Antigravity  

---

## 1. Intent & The "Why"
IGEV is an intuitive, single-file in-browser Gantt chart editor and viewer. As projects scale to span multiple years while users inspect details down to the minute, performance degrades catastrophically because the diagram engine attempts to render millions of scale columns simultaneously. Furthermore, the top navigation toolbar has accumulated excessive standalone buttons (high visual entropy), mobile users lack convenient context interactions without a mouse, the default color theme needs to be bright and welcoming out of the box, and the developer identity link requires the creator's actual portfolio avatar.

The goal is to deliver a smooth 60fps experience on large datasets, a clean and uncluttered navigation bar, intuitive context interactions on both desktop and mobile, and a consistent default light theme and branding.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
1. **Light Theme by Default**: When no previous preference is stored in `localStorage`, default the app theme to `light` across both `index.html` and `datenschutz.html`.
2. **Diagram Streaming & Viewport Culling**: Prevent rendering of out-of-viewport scale columns. Clamp the active timeline date range to a windowed buffer (e.g. 200–500 columns max) centered on the active view, dynamically sliding as the user scrolls, eliminating lags on 3+ year timelines viewed at minute resolution.
3. **Context Menus for Desktop & Mobile**: Implement a clean contextual action menu:
   - On desktop: Triggered via right-click (`contextmenu`).
   - On mobile/touch: Triggered via a ~450ms long-press / hold without significant touch movement.
   - Provides quick actions for tasks (Edit, Add Subtask, Convert Type, Delete, Change Color) and canvas (Add Task Here, Go to Today).
4. **Declutter Top Bar (Visual Entropy Reduction)**: Group secondary and tertiary actions into two clean dropdown menus:
   - **File**: Import JSON, Export JSON, Export CSV, Reset Workspace.
   - **View & Settings**: Lock Mode, Magnetism/Snap, Theme Selector, Help/Shortcuts.
   - Keep primary actions visible: Brand/Search, Quick Add Task, Today, Undo/Redo, and About Me.
5. **About Me Avatar**: Replace the generic emoji link with the creator's portfolio avatar from `https://weaksideparadise.me/assets/char_highres.png`, rendered as an elegant circular avatar button linking to `https://weaksideparadise.me`.

### Non-Goals
- Rewriting the application from scratch or replacing DHTMLX Gantt.
- Adding complex server-side synchronization (IGEV remains a client-side offline-first tool).
- Altering the core JSON data schema.

### Anti-Goals
- Sacrificing the infinite mouse pan/drag interaction that defines IGEV.
- Adding third-party UI framework dependencies (React, Vue, Tailwind); all enhancements must stay within vanilla HTML/CSS/JS in `index.html`.

---

## 3. Constraints
- Must remain zero-build and completely functional directly from `index.html`.
- Must preserve backward compatibility with existing saved `localStorage` data (`igev_gantt_state_v3`) and exported JSON files.
- Must work seamlessly across touch devices (smartphones, tablets) and desktop browsers (Chrome, Firefox, Safari, Edge).

---

## 4. Approaches Considered

### Approach A: Two-Menu Clean Toolbar + Adaptive Sliding Viewport (Chosen)
- **Top Bar**: Groups secondary controls into "File" and "View" menus, keeping primary buttons (`+ Task`, `Today`, `Undo`, `Redo`) prominent.
- **Viewport Streaming**: Capping timeline column generation so that even at minute zoom on a 3-year project, only a sliding window around the viewport is instantiated in DHTMLX.
- **Context Menus**: Standard contextual menu with touch-hold listener (~450ms) and right-click listener.
- **Tradeoffs**: Standard, clean mental model, high discoverability, fixes lag permanently.

### Approach B: Minimal Single-Overflow Menu + Fixed-Step Chunk Loading
- **Top Bar**: Collapses all utilities into a single `⋮ More` button.
- **Viewport Streaming**: Fixed 24-hour chunks activated only at minute zoom.
- **Tradeoffs**: Extremely sparse header, but buries simple toggles (Snap, Theme) behind extra clicks; less responsive scrolling when crossing fixed chunk boundaries.

**Decision**: Approach A was selected for its balance of low cognitive overhead and robust 60fps streaming performance.

---

## 5. Architectural & Implementation Details

### 5.1 Light Theme as Default
- Set default `data-theme="light"` on `<html>`.
- In the initial inline initialization script and `getCurrentTheme()` helper:
  - If `localStorage.getItem('igev_theme')` is null or invalid, fallback to `'light'`.
- Ensure `#themeSelector` selects `light` by default.

### 5.2 Diagram Viewport Streaming (Performance Fix)
- **The Bottleneck**: Currently `initTimelineDateRange()` calculates the date difference between the earliest task and latest task in the project (e.g. 3 years) plus padding, and sets `gantt.config.start_date` and `gantt.config.end_date` to span this whole duration. At minute zoom, this yields >1.5M columns, crashing the browser.
- **The Solution**:
  - Determine a sensible maximum scale column budget (e.g. 300 to 500 columns).
  - For coarse zoom levels (decade, multi-year, year, quarter, month), the total columns for 3 years is small (<500), so full padding can be retained.
  - For fine zoom levels (minute, 15-min, hour, day, week), limit `start_date` and `end_date` to a window surrounding the current scroll/anchor date:
    - `minute`: +/- 12 hours (approx 1,440 minutes, but with 2-minute or 5-minute virtual buffer, or +/- 4 hours = 480 columns).
    - `15-min`: +/- 2 days.
    - `hour`: +/- 7 days.
  - As the user pans/drags or autoscrolls near the edge of the windowed buffer, dynamically slide the window (updating `start_date` and `end_date`) while maintaining relative scroll position.
  - In `renderFullGridLines()`, only iterate through visible/rendered scale columns rather than unbounded arrays.

### 5.3 Context Menus (Desktop Right-Click & Mobile Long-Press)
- **DOM Element**: A single reusable `#customContextMenu` element with options:
  - When invoked on a Task:
    - ✏️ Edit Task
    - ➕ Add Subtask
    - 🎯 Convert to Milestone / Task
    - 🎨 Quick Color Palette
    - 🗑️ Delete Task
  - When invoked on empty timeline / canvas:
    - ➕ New Task Here
    - 📅 Jump to Today
    - 🔒 Toggle Lock
- **Touch Hold Handler**:
  - `touchstart`: Record touch position `(startX, startY)` and start a timer (450ms).
  - `touchmove`: If movement exceeds 10px, clear timer (user is panning/scrolling).
  - `touchend` / `touchcancel`: Clear timer.
  - On timer completion: Trigger `navigator.vibrate?.(40)` (haptic feedback if supported), prevent standard default, and show the context menu at touch coordinates.
- **Desktop Handler**: Standard `contextmenu` event handler on task elements and `.gantt_task_bg` filler rows.

### 5.4 Top Toolbar Decluttering
- Replace the 13 individual buttons with:
  1. **Brand & Search**: `IGEV v2.5`, search input and match badge.
  2. **File Menu**: Dropdown containing:
     - 📂 Import JSON (`#fileInput`)
     - 💾 Export JSON (`saveData()`)
     - 📊 Export CSV (`exportCSV()`)
     - 🗑️ Reset Workspace (`clearSavedState()`)
  3. **View Menu**: Dropdown containing:
     - 🔓/🔒 Lock Diagram (`toggleLock()`)
     - 🧲 Snap to Grid (`toggleMagnetism()`)
     - 🎨 Theme Selector (inline submenu or select)
     - ❓ Help & Shortcuts (`openShortcutsModal()`)
  4. **Direct Actions**:
     - `➕ Task` (primary button)
     - `📅 Today` (secondary button)
     - `↩ Undo` / `↪ Redo`
  5. **About Me**: Circular avatar button with image and tooltip.

### 5.5 About Me Profile Avatar
- Avatar Image URL: `https://weaksideparadise.me/assets/char_highres.png`
- Presentation:
  - 32x32px circular image with subtle border and glow matching the active theme accent.
  - On hover/focus: Tooltip or indicator "Markus Meier — Portfolio & Developer (weaksideparadise.me)".
  - Clicking opens `https://weaksideparadise.me` in a new tab with `noopener noreferrer`.

---

## 6. What's Left to the Builder
- Fine-tuning exact pixel styling and dropdown animations to match IGEV's cyberpunk / sleek aesthetic in all themes (light, void, amber, matrix).
- Ensuring keyboard navigation (Escape to dismiss dropdowns and context menus).
- Click-outside listeners for dismissing active menus.

---

## 7. Technical Decisions from Builder Check

1. **Task Grid Visibility (`show_tasks_outside_timescale`)**:
   - `gantt.config.show_tasks_outside_timescale = true` will be enabled so the left-hand task tree remains complete and visible across all zoom levels.
   - When a user clicks a task in the grid or selects a task via search whose dates fall outside the current sliding window, the timeline window will smoothly re-center on that task's date range before scrolling into view.

2. **Macro vs. Micro Navigation**:
   - Navigation follows IGEV's core zoom-at-cursor workflow: zoom out to macro scale (multi-year/year/month), pan to target date, and zoom in.
   - In addition, clicking any task in the tree grid or searching immediately navigates directly to that date.

3. **Smooth Window Sliding (No Render Interruption)**:
   - Buffer sliding will use debounced sliding on scroll/idle (150ms) and will be suspended during active mouse/touch drags (`isTaskDragging`), with a comfortable viewport margin (e.g. 500–800 columns max) so continuous dragging never hits a wall or cancels active drag events.

4. **Mobile Long-Press & Touch Drag Coordination**:
   - The ~400ms touch-hold listener will track movement threshold (8px). If the finger remains still for 400ms, haptic feedback triggers, the context menu opens, and DHTMLX drag initiation is suppressed. Immediate finger dragging continues to scroll/pan the timeline smoothly.

