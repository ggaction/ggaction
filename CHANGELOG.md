# Changelog

All notable changes to `ggaction` are recorded in this file.

## Unreleased

### Added

- Added the browser-safe `ggaction/basic` entry for creation-focused scatter, line, bar, histogram, and heatmap
  programs, with matching TypeScript declarations and an enforced 120,000-byte gzip bundle budget.
- Added browser-safe `ggaction/svg` output and Node-only `ggaction/pdf` single-page vector files, with matching
  declarations, metadata/accessibility options, installed-consumer coverage, and Canvas/SVG/PNG/PDF visual evidence.

### Changed

- Applied the documented numeric font-weight normalization consistently across Canvas, SVG, PNG, and PDF rendering.

## [0.0.6] - 2026-07-23

### Added

- Added explicit edit and removal lifecycles for encodings, point appearance, selections, highlights, legends, and
  Cartesian axis components while preserving immutable state and meaningful action traces.
- Added revision workflows for 2D bins, interval statistics, regression, density, box plots, gradient plots, and facet
  policies, including deterministic rematerialization after data-role and layout changes.

### Changed

- Expanded installed-package, Browser Canvas, Node PNG, TypeScript, action-contract, and cross-capability coverage for
  the complete authoring lifecycle surface.
- Improved documentation entry points, navigation, chart discovery, gallery filtering, responsive presentation, and
  generated API routing for the completed lifecycle actions.

### Fixed

- Preserved unaffected shared-legend channels when selectively removing an encoding, and prevented removed resources
  from returning after later rematerialization or facet replay.
- Kept documentation search results under the deployed `/ggaction/` base path and improved gallery text contrast.
- Allowed the approved Polar chart ink bounds to absorb the observed 1.5-pixel platform rasterization variance while
  retaining exact primitive/public pixel comparisons and the existing density, color, and region checks.

## [0.0.5] - 2026-07-21

### Added

- Added complete `createScatterPlot`, `createLinePlot`, `createBarPlot`, `createHistogram`, `createHeatmap`, and
  `createParallelCoordinates` facades that reuse ordinary mark, encoding, scale, coordinate, and guide actions.
- Added deterministic point jitter, ordered line paths, collision-aware text labels, field-driven rule widths, and
  weighted Polar sectors with immutable rematerialization across data, scale, Canvas, selection, and facet changes.
- Added window and rectangular 2D-bin data actions, binned heatmaps, categorical density and violin plots, Horizon
  charts, Parallel Coordinates, and density-filled gradient plots with Browser Canvas and Node PNG parity.
- Added backend-neutral item-local gradient paint, expanded public declarations and action contracts, and runnable
  chart examples for every new capability.

### Changed

- Aligned Box Plot with the shared facade inference, ambiguity, public option-type, and opt-in guide contracts while
  preserving its existing omitted-guide behavior.
- Reorganized source, test, documentation, and internal architecture ownership around explicit policies and capability
  registries without changing the renderer's concrete `graphicSpec` boundary.
- Expanded public documentation with task-oriented API routing, generated split action references, improved mobile and
  no-JavaScript navigation, complete facade discovery, and release-scoped deployment checks.

### Fixed

- Materialized the documented default point radius, made direct quantitative line x/y authoring order-independent, and
  made layered datum rules resolve to the expected full-span geometry instead of an empty result.
- Kept sticky documentation deep links below the top bar by sharing one computed fragment offset between CSS and the
  page table of contents.

## [0.0.4] - 2026-07-19

### Changed

- Transferred the canonical repository to the `ggaction` organization and moved public documentation to
  `https://ggaction.github.io/ggaction/`.
- Made public documentation deployment release-scoped so ordinary `main` pushes continue to verify docs without
  changing the published site.
- Refactored source ownership and materialization boundaries while preserving the public API, stored specifications,
  trace hierarchy, and rendered output.

### Fixed

- Normalized numeric Canvas font weights before rendering so valid intermediate values such as `650` retain normal
  text geometry in both Browser Canvas and Node PNG output.
- Applied right categorical legend offsets from the plot boundary consistently during creation and focused layout
  edits, including labels, titles, and optional backgrounds.
- Accepted `count` on sequential palette descriptors as a concrete gradient-stop count, consistently across
  top-level palette shorthands, nested ranges, encodings, direct scales, and scale edits.
- Preserved concrete `ChartProgram` subclasses in the TypeScript signature of wrapped extension actions and added
  a strict NodeNext declaration-merging authoring pattern.
- Routed every selective `llms.txt` target to a deployed HTML page, stabilized action fragments, and made built-site
  checks validate both HTTP targets and DOM IDs.

## [0.0.3] - 2026-07-19

### Added

- Added complete Polar point, line/radar, arc/donut/rose/radial-bar authoring with theta/radius guides, selection,
  highlighting, and Canvas/PNG rendering.
- Added immutable horizontal and vertical program composition, nested child snapshots, layout editing, stable child
  replacement, and Cartesian facets with derived-data replay, scale resolution, outer axes, and shared legends.
- Added text and rect marks, directional offsets, horizontal grouped bars, and compatible shared temporal bar/line
  position inference.

### Changed

- Nested compositions now preserve their intrinsic layout and honor outer cross-axis alignment instead of stretching
  internal cells or leaving unequal snapshots pinned to the start edge.

### Fixed

- Corrected zero-baseline and signed geometry for aggregate bars, and materialized complete ranged or aggregate bars
  with their documented default width.
- Made horizontal error bands compose with color and explicit boundaries in the same supported cases as vertical bands.
- Added standalone point-size legends and interval-aware temporal axis labels without duplicate automatic tick text.
- Published the exact `createDerivedData` transform-array contract and stable `ChartProgram` state-inspection paths in
  TypeScript and user documentation.

## [0.0.2] - 2026-07-17

### Fixed

- Excluded internal repository instruction files from the published npm package.
- Added an executable forbidden-file audit and public-registry consumer verification for release artifacts.

## [0.0.1] - 2026-07-17

### Added

- Immutable, traceable `ChartProgram` authoring with user-facing chart actions.
- Point, line, area, bar, rule, error-bar, error-band, regression, density, and box-plot workflows.
- Position, appearance, scale, axis, grid, legend, title, selection, and highlighting actions.
- Browser Canvas rendering through `ggaction` and Node PNG output through `ggaction/png`.
- Public extension authoring through `ggaction/extension`.
- TypeScript declarations for every public package entry.
- Runnable documentation, chart examples, generated images, and packed-package consumer qualification.

### Known limitations

- This is an experimental pre-1.0 release; public APIs may change in later minor or patch releases.
- Rendering targets Browser Canvas and Node PNG. SVG rendering, animation, facets, and program composition are not yet
  supported.
- A semantic specification is never compiled automatically. Domain actions must materialize the concrete graphics they
  change before rendering.
- Cartesian charts are the complete current path. Polar semantic tokens exist only where explicitly documented and do
  not imply complete polar rendering.

[0.0.6]: https://github.com/ggaction/ggaction/releases/tag/v0.0.6
[0.0.5]: https://github.com/ggaction/ggaction/releases/tag/v0.0.5
[0.0.4]: https://github.com/ggaction/ggaction/releases/tag/v0.0.4
[0.0.3]: https://github.com/ggaction/ggaction/releases/tag/v0.0.3
[0.0.2]: https://github.com/ggaction/ggaction/releases/tag/v0.0.2
[0.0.1]: https://github.com/ggaction/ggaction/releases/tag/v0.0.1
