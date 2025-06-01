# CSS Refactor Plan

The frontend now uses a modular Sass setup built around `src/styles/main.scss` and directories such as `base/`, `components/`, `layout/`, `pages/` and `utilities/`. This document tracks remaining cleanup tasks from the original CSS refactor.

## Sprint 1 – Setup Sass and Directory Structure
- Configure Vite to compile `.scss` files. Install `sass-embedded` as a dev dependency so Vite can compile Sass.
- Create `src/styles/` with sub‑folders:
  - `base/` – resets and global element styles
  - `components/` – reusable UI pieces (card, button, form, panel)
  - `layout/` – app level grid/layout rules
  - `pages/` – page‑specific modules (GrammarPage, etc.)
  - `utilities/` – small helpers if needed
- Rename `global.css` to `main.scss` and include the partials with `@import`.
- Update all imports in React components to use the compiled CSS bundle.

## Sprint 2 – Extract Theme Variables
- Move the `:root` block and dark‑mode overrides into `base/_variables.scss`.
- Keep only custom properties in this file. Document each variable.
- Ensure `main.scss` imports variables first so all other modules can use them.

## Sprint 3 – Consolidate Shared Components
- Create component partials for cards, panels, forms and buttons.
- Remove the repeated blocks found in `global.css` (e.g. multiple `.btn` and `.form-base` definitions).
- Use SCSS nesting for hover/active states and create mixins for patterns like scrollbars or panel boxes.
- Adopt a consistent naming style (BEM or similar) for new selectors.

## Sprint 4 – Module Styles per Feature
- Split the large component sections currently marked with `@file` comments into their own files under `pages/` or `components/`.
- Examples:
  - `components/AddNodePanel.scss`
  - `components/AddRelationshipPanel.scss`
  - `components/CandidateAnalysisPanel.scss`
  - `components/DatabaseControls.scss`
  - `components/GenerateRelatedNodesPanel.scss`
  - `components/Graph.scss`
  - `pages/GrammarPage.scss`
- Keep these files under 200 lines where possible and rely on the shared component mixins from Sprint 3.

## Sprint 5 – Optional CSS Modules
- Consider switching each React component to a `.module.scss` file so styles are automatically scoped.
- Update imports and className bindings accordingly.
- This step can be gradual—begin with one or two components to evaluate impact.

## Sprint 6 – Linting and CI
- Add **stylelint** with the `stylelint-scss` plugin.
- Enable rules that catch duplicate selectors and unknown variables.
- Integrate stylelint into the existing test workflow so PRs fail on lint errors.

## Documentation
- Keep this document updated after each sprint.
- Document any new commands in `docs/development.md`.

@import 'base/variables';

/**
 * @file theme.css
 * @description Global theme variables and color scheme
 */

/* Common Component Styles */
.card {
// ...

