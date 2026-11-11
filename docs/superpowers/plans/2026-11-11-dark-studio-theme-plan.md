# Dark-Studio Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new "Dark-Studio" dark mode theme inspired by creative workstation software (neutral charcoal/slate surfaces and vibrant creative suite accents) across `index.html` and `datenschutz.html`.

**Architecture:** Vanilla HTML5/CSS/JavaScript with zero dependencies. Defines a new `[data-theme="dark-studio"]` custom property block, adds an option to `#themeSelector`, registers `dark-studio` in `THEME_DEFAULTS`, and synchronizes privacy documentation.

**Tech Stack:** HTML5, CSS3 (CSS Custom Properties), Vanilla JavaScript (ES2022).

**Spec:** `docs/superpowers/specs/2026-11-11-dark-studio-theme-design.md`

## Global Constraints
- Zero-build architecture; runs directly from `index.html` in browser.
- Default theme remains `light`.
- Must not copy proprietary Adobe color codes 1:1.
- All existing tests in `tests/full_verification_suite.js` must continue to pass.

## Review Focus
1. **Fallback Safety**: Invalid theme names or corrupted storage must still fall back gracefully to `light`.
2. **Persistence**: Selecting `dark-studio` must save to `localStorage.getItem('igev_theme')` and survive page reload.
3. **Contrast & Readability**: White/ink text on charcoal surfaces must provide high contrast (WCAG AAA for text, AA for UI).
4. **Consistency**: Color tokens in `datenschutz.html` must match `index.html` exactly.
5. **Dropdown Synchronization**: `#themeSelector` value must reflect `dark-studio` when loaded or selected.

---

### Task 1: Add Unit Tests for `dark-studio` Theme

**Files:**
- Modify: `tests/theme_default_test.js`

**Interfaces:**
- Consumes: `THEME_DEFAULTS['dark-studio']`, `indexHtml`, `datenschutzHtml`
- Produces: Test assertions for `dark-studio` theme presence and switching

- [ ] **Step 1: Write the failing test in `tests/theme_default_test.js`**

Add assertions checking:
1. `indexHtml` contains `[data-theme="dark-studio"]` CSS rules.
2. `datenschutzHtml` contains `[data-theme="dark-studio"]` CSS rules.
3. `indexHtml` includes `<option value="dark-studio">🎬 Dark-Studio</option>`.
4. In VM mock environment: `THEME_DEFAULTS['dark-studio']` exists with `{ task: '#3788ff', project: '#10b981', milestone: '#ff4d6d', link: '#f59e0b', text: '#ffffff' }`.
5. In VM mock environment: `setTheme('dark-studio')` sets `data-theme="dark-studio"`, `storage['igev_theme'] === 'dark-studio'`, and `getThemeColor('task') === '#3788ff'`.
6. Early script preserves `dark-studio` when present in `localStorage`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/theme_default_test.js`
Expected: FAIL (assertion error because `dark-studio` is not yet defined)

---

### Task 2: Implement `dark-studio` Theme in `index.html` and `datenschutz.html`

**Files:**
- Modify: `index.html`
- Modify: `datenschutz.html`

**Interfaces:**
- Consumes: Token specifications from `docs/superpowers/specs/2026-11-11-dark-studio-theme-design.md`
- Produces: `[data-theme="dark-studio"]` CSS block, `THEME_DEFAULTS['dark-studio']` in JS, option in `#themeSelector`

- [ ] **Step 1: Add `[data-theme="dark-studio"]` CSS token rules in `index.html`**

Define custom properties:
```css
[data-theme="dark-studio"] {
    --wp-void: #181818;
    --wp-abyss: #222222;
    --wp-panel: #2a2a2a;
    --wp-raise: #333333;
    --wp-line: #3c3c3c;
    --wp-line2: #525252;
    --wp-ink: #f0f0f0;
    --wp-dim: #b0b0b0;
    --wp-faint: #707070;
    --wp-cyan: #3788ff;
    --wp-amber: #f59e0b;
    --wp-magenta: #ff4d6d;
    --wp-lime: #10b981;

    --bg: var(--wp-void);
    --bg-surface: var(--wp-abyss);
    --bg-raised: var(--wp-raise);
    --bg-panel: var(--wp-panel);
    --border: var(--wp-line);
    --border-strong: var(--wp-line2);
    --text: var(--wp-ink);
    --text-dim: var(--wp-dim);
    --text-faint: var(--wp-faint);
    --accent: var(--wp-cyan);
    --accent-2: var(--wp-amber);
    --accent-3: var(--wp-magenta);
    --accent-4: var(--wp-lime);
    --shadow-glow: 0 2px 12px rgba(0, 0, 0, 0.45);

    --font-body: 'Space Grotesk', system-ui, sans-serif;
    --font-display: 'Chakra Petch', system-ui, sans-serif;
    --font-mono: 'JetBrains Mono', ui-monospace, monospace;

    --task-default: #3788ff;
    --task-project: #10b981;
    --task-milestone: #ff4d6d;
    --link-default: #f59e0b;
    --weekend-bg: rgba(255, 255, 255, 0.025);
    --selected-bg: rgba(55, 136, 255, 0.16);
    --task-text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    --active-row-height: 35px;
}
```

- [ ] **Step 2: Add option to `#themeSelector` in `index.html`**

Add `<option value="dark-studio">🎬 Dark-Studio</option>` to `<select id="themeSelector">`.

- [ ] **Step 3: Add `dark-studio` to `THEME_DEFAULTS` in `index.html`**

```javascript
'dark-studio': { task: '#3788ff', project: '#10b981', milestone: '#ff4d6d', link: '#f59e0b', text: '#ffffff' }
```

- [ ] **Step 4: Add `[data-theme="dark-studio"]` and documentation to `datenschutz.html`**

Add corresponding CSS block and update table cell under `igev_theme`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node tests/theme_default_test.js`
Expected: PASS

---

### Task 3: Full Suite Verification & Git Commit

**Files:**
- Test: `tests/full_verification_suite.js`

- [ ] **Step 1: Run the full test suite**

Run: `node tests/full_verification_suite.js`
Expected: PASS (All test suites pass)

- [ ] **Step 2: Commit changes**

Commit with descriptive message: `feat: add Dark-Studio theme inspired by creative workstation UI`
