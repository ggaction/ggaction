# Changelog

All notable changes to `ggaction` are recorded in this file.

## Unreleased

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

[0.0.2]: https://github.com/hj-n/ggaction/releases/tag/v0.0.2
[0.0.1]: https://github.com/hj-n/ggaction/releases/tag/v0.0.1
