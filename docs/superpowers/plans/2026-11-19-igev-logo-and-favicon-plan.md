# IGEV Logo, Favicon & SEO Branding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an official brand logo and favicon for IGEV representing an Intuitive Gantt Editor & Viewer, wire it to the browser tab next to `<title>`, optimize for SEO and search engine snippets, and place the mark in the in-app brand header.

**Architecture:** Standalone, zero-dependency SVG vector assets (`assets/favicon.svg`, `assets/logo.svg`) with modern `<link rel="icon" type="image/svg+xml">`, Apple Touch Icon, and semantic SEO/Open Graph metadata in `index.html` and `datenschutz.html`.

**Tech Stack:** SVG, HTML5, CSS3, Vanilla Node.js for unit testing.

**Spec:** `docs/superpowers/specs/2026-11-19-igev-logo-and-favicon-design.md`

## Global Constraints
- Zero-build architecture; no bundlers or node build steps required to open the app.
- Standalone vector assets stored directly in `assets/`.
- Must not disrupt responsive layout of toolbar (`.controls`, `.brand-area`).
- Existing tests in `tests/toolbar_structure_test.js` must continue to pass cleanly.

## Review Focus
1. **SVG Scalability**: SVG must specify `viewBox="0 0 64 64"` and render cleanly at 16×16, 32×32, and 180×180.
2. **Contrast on Light and Dark Chrome**: The dark-slate badge background (`#080f1d`) ensures strong contrast regardless of whether the browser theme is dark, light, or custom.
3. **SEO Completeness**: Title, description, theme-color, and Open Graph tags must be present and well-formed.
4. **Header Alignment**: The `.brand-logo` in `.brand-area` must align vertically with `<h2>IGEV <span class="badge-version">v2.5</span></h2>` without disrupting mobile wrapping.
5. **Multi-page Consistency**: `datenschutz.html` must share identical favicon links and theme colors with `index.html`.

---

### Task 1: Create Unit Test Suite for Branding, Favicon & SEO

**Files:**
- Create: `tests/branding_and_favicon_test.js`

**Interfaces:**
- Consumes: `index.html`, `datenschutz.html`, `assets/favicon.svg`, `assets/logo.svg`
- Produces: Executable Node.js test script verifying SVG structure, `<head>` tags, and in-app header logo

- [ ] **Step 1: Write the failing test in `tests/branding_and_favicon_test.js`**

Verify:
1. `assets/favicon.svg` exists and contains `<svg`, `viewBox="0 0 64 64"`, timeline elements (`rect` or `path`), and milestone diamond (`polygon` or `path`).
2. `assets/logo.svg` exists.
3. `index.html` contains:
   - `<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">`
   - `<link rel="apple-touch-icon" href="assets/favicon.svg">`
   - `<meta name="description"`
   - `<meta name="theme-color"`
   - `<meta property="og:title"`
   - `<meta property="og:description"`
   - `<meta property="og:image"`
   - `<meta property="og:type"`
4. `index.html` contains `<img src="assets/favicon.svg" alt="IGEV Logo" class="brand-logo"` inside `.brand-area` immediately preceding `<h2>IGEV`.
5. `index.html` contains CSS rules for `.brand-logo`.
6. `datenschutz.html` contains the favicon links and theme-color meta tag.

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/branding_and_favicon_test.js`
Expected: FAIL (assets and tags do not exist yet)

---

### Task 2: Create Vector Brand Assets (`assets/favicon.svg` and `assets/logo.svg`)

**Files:**
- Create: `assets/favicon.svg`
- Create: `assets/logo.svg`

**Interfaces:**
- Produces: Clean, valid SVG files representing the Gantt timeline cascade and milestone diamond

- [ ] **Step 1: Design and write `assets/favicon.svg`**
  - Dimensions: `viewBox="0 0 64 64"`.
  - Background: Rounded squircle rect with `fill="#080f1d"`, `stroke="#1e293b"`, `rx="14"`.
  - Guide/axis line: Vertical time ruler line `stroke="#1e3a5f"`.
  - Task 1: Horizontal pill in Cyan (`#00e5ff`), `rx="3"`.
  - Task 2: Horizontal pill in Emerald (`#10b981`), `rx="3"`, staggered.
  - Dependency: Stepped connector line in Amber (`#ffb648`).
  - Milestone: 45° diamond in Magenta (`#ff4d6d`).

- [ ] **Step 2: Create `assets/logo.svg`**
  - Standalone logo asset matching the design.

- [ ] **Step 3: Verify XML validity and rendering**
  - Confirm file syntax and elements.

---

### Task 3: Integrate Favicon, SEO Metadata, and In-App Header Logo

**Files:**
- Modify: `index.html`
- Modify: `datenschutz.html`

**Interfaces:**
- Consumes: `assets/favicon.svg`
- Produces: Updated `<head>` metadata, toolbar brand logo, and CSS styling

- [ ] **Step 1: Update `index.html` `<head>`**
  - Add `<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">`
  - Add `<link rel="apple-touch-icon" href="assets/favicon.svg">`
  - Add `<meta name="description" content="IGEV — Intuitive Gantt Editor & Viewer. Lightweight, zero-backend roadmap planner in a single HTML file.">`
  - Add `<meta name="theme-color" content="#04070e">`
  - Add Open Graph metadata (`og:title`, `og:description`, `og:image`, `og:type`).

- [ ] **Step 2: Add CSS for `.brand-logo` in `index.html`**
  - `.brand-logo { width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0; display: inline-block; vertical-align: middle; }`
  - Ensure `.brand-area` aligns items cleanly via flexbox.

- [ ] **Step 3: Update `index.html` `.brand-area`**
  - Place `<img src="assets/favicon.svg" alt="IGEV Logo" class="brand-logo" width="26" height="26">` directly before `<h2>IGEV <span class="badge-version">v2.5</span></h2>`.

- [ ] **Step 4: Update `datenschutz.html` `<head>`**
  - Add `<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">`
  - Add `<link rel="apple-touch-icon" href="assets/favicon.svg">`
  - Add `<meta name="theme-color" content="#04070e">`

---

### Task 4: Run Verification Tests & Verify Regression Safety

**Files:**
- Modify: `tests/full_verification_suite.js` (add branding test)

- [ ] **Step 1: Run `node tests/branding_and_favicon_test.js`**
  - Expected: PASS

- [ ] **Step 2: Run `node tests/toolbar_structure_test.js`**
  - Expected: PASS

- [ ] **Step 3: Add branding test to `tests/full_verification_suite.js`**
  - Ensure it is included in future test runs.
