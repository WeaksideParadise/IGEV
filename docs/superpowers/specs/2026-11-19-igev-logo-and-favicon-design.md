# IGEV Logo, Favicon & SEO Branding Design Specification

## Intent & Why
Add an official brand logo and favicon for **IGEV (Intuitive Gantt Editor & Viewer)**. The logo will display in browser tabs immediately to the left of the title (`<title>`), display in search engine snippets (Google Search / SEO), and anchor the in-app brand header directly left of `<h2>IGEV</h2>`.

## Goals
- **Instantly Communicates Domain**: Visually captures the essence of an *Intuitive Gantt Editor & Viewer* (cascading schedule bars, dependency connector, milestone diamond).
- **Legible at 16×16px & 32×32px**: Crisp geometric shapes and high-contrast colors ensure effortless recognition in browser tabs on both dark and light operating systems.
- **Modern Standards**: High-resolution vector SVG favicon (`type="image/svg+xml"`), Apple Touch Icon, and essential SEO metadata (`<meta name="description">`, `<meta name="theme-color">`, Open Graph tags).
- **In-App Brand Identity**: Enhance the toolbar brand area by rendering the logo mark to the left of `<h2>IGEV</h2>`.
- **Zero External Dependencies**: Standalone, lightweight assets located in `assets/` with no external CDNs or heavy runtimes.

## Non-Goals & Anti-Goals
- Do not introduce complex multi-megabyte image assets or external icon fonts.
- Do not disrupt existing toolbar layout or responsive mobile views (`.brand-area`).
- Do not alter existing data models, shortcuts, or gantt state mechanics.

## Approaches Considered
1. **Plain Text "IGEV" Monogram**: 4 letters in a square icon. *Trade-off*: Becomes illegible when scaled down to 16×16px in crowded browser tabs and does not communicate Gantt roadmap capabilities.
2. **Minimalist Abstract Diamond**: A single milestone shape. *Trade-off*: Too generic, looks like a generic crypto or gaming token rather than project planning.
3. **The Precision Gantt Timeline & Milestone Badge (Chosen)**:
   - Symmetrical squircle container with deep void background (`#080f1d`) and subtle precision border (`#1a2a44`).
   - Vertical timeline ruler spine (`#23395c`).
   - Top task bar: Vivid Cyan (`#00e5ff` / `#4fe3d2`), pill shape.
   - Middle task bar: Vibrant Emerald/Lime (`#10b981` / `#7bf0a4`), staggered to represent sequential work.
   - Stepped dependency link (`#ffb648`) connecting the two tasks.
   - Milestone marker: Crisp 45-degree diamond in Magenta/Coral (`#ff4d6d` / `#ff5c86`) marking project delivery.

## Asset & Code Changes
1. **`assets/favicon.svg` & `assets/logo.svg`**:
   - Clean, optimized SVG vector asset with standard viewBox (`0 0 64 64`).
2. **`index.html` & `datenschutz.html` `<head>`**:
   - `<link rel="icon" type="image/svg+xml" href="assets/favicon.svg">`
   - `<link rel="apple-touch-icon" href="assets/favicon.svg">`
   - `<meta name="description" content="IGEV — Intuitive Gantt Editor & Viewer. Lightweight, zero-backend roadmap planner in a single HTML file.">`
   - `<meta name="theme-color" content="#04070e">`
   - Open Graph tags (`og:title`, `og:description`, `og:image`, `og:type`).
3. **`index.html` Toolbar Header (`.brand-area`)**:
   - Insert the logo mark `<img src="assets/favicon.svg" alt="IGEV Logo" class="brand-logo" width="24" height="24">` directly before `<h2>IGEV ...</h2>`.
   - Add minimal CSS styling for `.brand-logo` (flex alignment, crisp rendering, border-radius).
