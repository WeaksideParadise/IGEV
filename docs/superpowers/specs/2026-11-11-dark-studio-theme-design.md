# Dark-Studio Theme Design Specification

## Intent & Why
Add a new dark mode theme named **Dark-Studio** inspired by the workspace aesthetic of creative workstation software (such as Adobe Photoshop, Premiere Pro, and Illustrator). It provides a sleek, low-glare, neutral charcoal/slate environment for long project planning sessions, using distinct non-proprietary colors.

## Goals
- Provide a neutral charcoal dark mode distinct from the deep-navy neon `void` theme.
- Ensure high contrast readability for task labels, grid lines, and timeline scales.
- Fully integrate with existing theme switching, persistence (`localStorage.getItem('igev_theme')`), and reset mechanics.
- Maintain complete consistency between `index.html` and `datenschutz.html`.

## Non-Goals & Anti-Goals
- Do not copy exact proprietary color hex codes or trademarks from Adobe software.
- Do not alter the default theme (which remains `light`).
- Do not introduce build tools, preprocessors, or external dependencies.

## Approaches Considered
1. **Monochrome Slate**: Only grayscale surfaces and white/gray tasks. *Trade-off*: Low visual distinction between project branches, milestones, and dependencies in complex Gantt charts.
2. **Neutral Charcoal with Creative Accent Palette (Chosen)**: Layered neutral charcoal surfaces (`#181818` to `#333333`) paired with vivid, high-readability creative accents (`#3788ff` creative blue, `#10b981` emerald, `#ff4d6d` coral magenta, `#f59e0b` amber). *Benefit*: Authentic creative studio workstation feel, high contrast, optimal Gantt legibility.

## Token Specifications
- Canvas / Deep Background (`--wp-void`): `#181818`
- Base Surface (`--wp-abyss`): `#222222`
- Panels & Modals (`--wp-panel`): `#2a2a2a`
- Raised / Hovers (`--wp-raise`): `#333333`
- Subtle Border (`--wp-line`): `#3c3c3c`
- Strong Border (`--wp-line2`): `#525252`
- Primary Ink (`--wp-ink`): `#f0f0f0`
- Secondary Dim (`--wp-dim`): `#b0b0b0`
- Muted Faint (`--wp-faint`): `#707070`
- Primary Accent & Task (`--wp-cyan`, `--task-default`): `#3788ff`
- Accent 2 & Link (`--wp-amber`, `--link-default`): `#f59e0b`
- Accent 3 & Milestone (`--wp-magenta`, `--task-milestone`): `#ff4d6d`
- Accent 4 & Project (`--wp-lime`, `--task-project`): `#10b981`
- Weekend Column BG: `rgba(255, 255, 255, 0.025)`
- Selection BG: `rgba(55, 136, 255, 0.16)`
- Task Text Shadow: `0 1px 2px rgba(0,0,0,0.8)`
- Glow Shadow: `0 2px 12px rgba(0, 0, 0, 0.45)`

## Integration Points
1. `index.html`: CSS `[data-theme="dark-studio"]`, `#themeSelector` option `<option value="dark-studio">🎬 Dark-Studio</option>`, and `THEME_DEFAULTS['dark-studio']`.
2. `datenschutz.html`: CSS `[data-theme="dark-studio"]` and documentation update in `igev_theme` description.
3. `tests/theme_default_test.js`: Assertions verifying `dark-studio` theme configuration, fallback safety, and live switching.
