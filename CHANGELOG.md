# Changelog

All notable changes to `ggaction` are recorded in this file.

## Unreleased

### Added

- Added full-entry `createTextPlot` for independent data text with position,
  content, color, appearance and compatible guides in one composed action.

## [0.0.17] - 2026-09-15

### Added

- Added declared and inferred dataset schemas, stable derived sorting with
  `createSortedData` and `editSortedData`, explicit statistical missing and empty
  policies, regression prediction grids, and fixed or following regression source
  bindings.
- Added the browser-safe `ggaction/inspection` entry with dataset schema lookup,
  action capability descriptions, program comparison, and owner-aware graphic
  inspection.

### Changed

- Empty scale domains can preserve a compatible prior domain or require an
  explicit domain. Independent item marks can reject or skip rows with missing
  encoded values.
- Editable snapshots now write schema version 2 and restore version 1 snapshots
  through a validated migration.

## [0.0.16] - 2026-09-14

### Added

- Added `reviseData` for immutable original-data revisions that update dependent
  transforms, chart owners, scales, guides, labels, selections, and retained facets.
- Added `applyTextMetrics` and `removeTextMetrics` for host-measured text layout
  with immutable exact-font profiles, deterministic fallback, composition
  propagation, and wrapped typography rematerialization.
- Added browser-safe `ggaction/persistence` with versioned editable-program and
  graphic-only snapshots, tagged value preservation, and strict restoration.
- Added browser-safe `ggaction/accessibility` with immutable final visual data,
  component roles, aggregate/bin/interval values, series, and composition hierarchy.
- Added `ggaction/diagnostics` to read structured error codes and resource details
  while preserving the original Error, TypeError, or RangeError identity.
- Added `renderToPNGBuffer` and `renderToPDFBuffer` for Node memory output.
  PNG encoding is asynchronous; Canvas drawing remains synchronous.
- Added `release:prepare` for reviewable version, changelog, release-contract,
  provenance, and generated-documentation updates without publishing side effects.
- Added reproducible runtime benchmarks, exhaustive direct-action negative-input
  contracts, semantic authoring evaluations, and cross-platform/browser checks.

### Changed

- **Installation:** Node rendering and MCP dependencies are now optional peers.
  Canvas/SVG users can install only `ggaction`. Node PNG/PDF users must also install
  `@napi-rs/canvas`; MCP users must also install `@modelcontextprotocol/sdk`.
  Missing backends report the required install command and never auto-install.
- MCP task packets now use schema version 5. Required options are separate from
  example/configured options, exact calls preserve explicit user choices, and
  unresolved request fragments remain visible. Consumers must check packet versions.
- Reused owned immutable subtrees, avoided unrelated theme traversal, shared
  persistent trace tails, and cached immutable SVG resource hashes. Mutable
  renderer inputs still recompute their hashes.
- Reduced Basic browser bundle size through built-in factory tree shaking and
  shared validation/materialization code. Existing browser gzip limits remain.
- Release verification now distributes one canonical candidate artifact across
  independent source, coverage, package, documentation, platform, browser, and
  weighted realistic-test jobs, then requires a strict successful aggregate.
- Added a strict realistic-test aggregate check and bounded failure evidence for
  test logs, render differences, and browser screenshots. Verification errors
  retain their original failing status.
- Consolidated architecture prose around ownership and state flow, with exact
  action behavior linked to current contracts and shared metadata owners.

### Fixed

- Rejected callable, mutable class-instance, cyclic, and sparse source inputs
  before they could escape immutable ownership or fail during materialization.
  TypeScript source-row declarations now match the runtime data boundary.
- Rejected unknown options consistently in extension primitives and renderers,
  including PNG, and validated axis coordinate/channel assertions before changes.
- Corrected padding units for focused scale editors using one canonical registry.
- Corrected MCP required-option inference, explicit style/scale choices, derived
  owner references, and false-completion reporting for partially understood tasks.
- Preserved nested facet trace closure and prototype-named keys during snapshot
  round trips, and distinguished live dependencies from reserved optional IDs.
- Distinguished data and mark identity when revising statistical-reference inputs.
  Inferred grids now follow explicit tick changes without disrupting orientation
  changes that must rematerialize guides in dependency order.
- Applied the same interval-statistics merge during simultaneous role edits,
  clearing inherited confidence-interval parameters when changing extent.
- Reused the exact release artifact in installed-package consumers instead of
  silently repacking it, and made development npm/TypeScript invocation portable
  across supported operating systems.
- Bounded long CSV description memory in realistic test fixtures and synchronized
  their direct action coverage and coordinate options with current contracts.

## [0.0.15] - 2026-09-14

### Added

- Added independent field-driven stroke color for Point, Line, Area, Bar, Rect,
  Arc, Rule, and Tick marks, including categorical and continuous scales,
  focused scale editing, legends, selections, facets, and renderer parity.
- Added logarithmic, square-root, power, quantize, quantile, and threshold
  point-size scales with equal-area geometry, focused scale editing, complete
  interval legends, source replay, strict types, and installed-package support.

- Added normalization and missing-data workflows with `createNormalizedData`,
  `createCompleteData`, and `createImputedData`. Computed expressions now support
  typed scalar/null results, comparisons, conditions, and short-circuit logic;
  calendar buckets and windows have explicit time and ordering policies.
- Added immutable derived revision editing: `editDerivedData`, `editComputedData`,
  `editFilteredData`, `editFoldData`, `editSummaryData`, `editBinData`,
  `editTimeUnitData`, `editWindowData`, `editDensityData`, `editStackData`,
  `editRegressionData`, `editIntervalData`, `editECDFData`, `editNormalizedData`,
  `editCompleteData`, and `editImputedData`. An existing descendant rejects an
  edit by default; `dependents: "recompute"` rebuilds the full affected closure.
- Added focused scale editing with `editXScale`, `editYScale`, `editThetaScale`,
  `editRScale`, `editColorScale`, `editStrokeScale`, `editSizeScale`,
  `editOpacityScale`, `editShapeScale`, `editStrokeWidthScale`,
  `editStrokeDashScale`, `editXOffsetScale`, `editYOffsetScale`, and
  `editParallelScale`. These select the channel owner and replay its consumers.
- Added `encodeChannels` for atomic multi-channel reassignment; `editCoordinate`
  for Cartesian aspect and Polar frame changes; and `editLegendBlock` for one
  identified block of a composite legend.
- Added `editMarkLabelSelection`, `editMarkLabelPlacement`, and `removeMarkLabels`.
  Label selection now works on final aggregated items; semantic placement follows
  directed boundaries through source, scale, and layout changes.
- Added explicit safe removal with `removeData`, `removeScale`, and
  `removeCoordinate`. A live dependency produces an ownership-path error; remove
  or rebind consumers before removing the resource.
- Added weighted summaries, bins, histogram/KDE authoring and revisions; dynamic
  statistical reference lines/bands; exact sampled legend values; typed display
  label maps; facet-header role/side/alignment controls; custom theme tokens;
  detailed stroke styles, rounded rectangles, and expanded Polar/Parallel facets.

### Changed

- Clarified the action/program grammar, relative action hierarchy, and
  decision-level atomicity. Catalog role tags are distinguished from action
  delegation and package exposure.
- Resource removal actions now record their semantic deletions as `editSemantic`
  children. The full extension primitive accepts whole unused source datasets
  and coordinates while retaining dependency guards and immutable snapshots.
- Point-size ranges represent area across continuous and discrete families.
  Entering a discrete size family requires a destination domain and range;
  repeated field assignments preserve compatible scale settings.
- Axis, legend, and facet display labels preserve raw category identity. Mapping
  `"KR"` to `"South Korea"` changes visible text while grouping, selection, and
  domain lookup still use `"KR"`. Numeric and UTC formats must match field type.
- Custom themes supply defaults while explicit mark styles retain precedence.
  Removing a theme restores baseline defaults and retains explicit overrides.
- Complete guides can be created progressively without duplicating existing
  compatible components. Polar/Parallel repetition retains source recipes and
  rejects unsupported role substitutions explicitly.
- Documentation now distinguishes released API snapshots from later development,
  provides an exact address and declaration for every action, and executes every
  maintained tutorial and recipe against the packaged module. See
  [migration notes](https://ggaction.github.io/ggaction/version/#migration-from-v0013).

### Fixed

- Prevented typing immediately after a failed search-index prefetch from sending
  an implicit retry. Each explicit retry now sends one request even when the
  first failure arrives before the input event.
- Corrected the README's canvas margins for its complete 406-row example and
  documented regression defaults beside the example. The hierarchy tutorial now
  refines its high-level chart and demonstrates a subsequent style revision.
- Corrected default dumbbell axis titles, direct Rose radius refinement, and stale
  current-guide pointers after removal.
- Corrected executable examples, API defaults and compatibility descriptions,
  missing gallery/tutorial entries, exact-action search, initial ArrowUp selection,
  filter/TOC synchronization, search retries, and narrow-screen type references.

## [0.0.13] - 2026-09-07

### Added

- Added complete Pie/Donut, Area, Density, Horizon, Polar scatter and line,
  Radar, Rug, Strip, Beeswarm, Raincloud, Interval, Regression, Dot,
  Lollipop, Dumbbell, ECDF, Rose, and Radial Bar authoring families. Each
  facade composes the same public data, mark, encoding, scale, guide, and
  primitive actions available for lower-level authoring.
- Added reusable summary, bin, fold, computed, stack, interval, and ECDF data
  actions, plus immutable mark-data binding, filter removal, statistical-role
  editing, deterministic point packing, and composite owner revision.
- Added complete Cartesian, Polar, and Parallel component lifecycles; focused
  legend content and layout editing; final-item labels; reference lines and
  bands; annotations; shared formatting and explicit rotation units; program
  themes; and opt-in Canvas fitting.
- Added row-by-column facet grids, field repetition, whole-facet source
  revision, and stable named-child insertion, removal, and reordering for
  compositions.
- Added action-card schema v3 for all 234 direct actions, with H0-H4 authoring
  roles, observed direct-child relationships, direct editors, package entry
  support, units, inference rules, and completion requirements.

### Changed

- Made complete-chart defaults and guide reuse compose predictably with
  existing data, scales, coordinates, and explicitly authored guides while
  retaining atomic errors for incompatible resources.
- Separated series identity from color and other appearance, made temporal
  input units explicit, preserved JSON group opt-outs, and exposed persistent
  source, role, order, layout, theme, and guide recipes for rematerialization.
- Expanded generated discovery, documentation, browser examples, renderer
  evidence, installed-package checks, and the realistic corpus to cover the
  complete 234-action hierarchy and its supported lifecycle combinations.

### Fixed

- Corrected horizontal Bar role inference and temporal declarations,
  definition-only dataset diagnostics, Point and Bar stroke declarations,
  internal action inventory coverage, and false-complete MCP chart results.
- Prevented unrelated scales, guides, coordinates, or ambiguous resources from
  being selected by authoring order, and preserved immutable rollback when a
  data, role, scale, guide, selection, or composition revision is invalid.
- Corrected Polar and radial measurement semantics, categorical and continuous
  legend layout, hidden-title bounds, scale-family transitions, midpoint
  mapping, text ownership, datum spans, numeric formatting, and replay after
  Canvas, data, scale, filter, or theme changes.

## [0.0.12] - 2026-09-03

### Added

- Added direct quantitative theta encodings for Polar arc marks, producing one
  proportional sector per positive row with deterministic order, validation,
  selection, rematerialization, strict types, and executable documentation.
- Added quantitative independent positions for explicit error bars and
  categorical `xOffset`/`yOffset` grouping for points, rules, and complete
  point-and-whisker charts. Inferred intervals now reuse the source offset
  field, scale, padding, and statistical grouping.
- Added Context7 project metadata, ownership verification, bounded indexing
  rules, and manual or release-triggered documentation refresh automation.

### Changed

- Sharded the realistic data corpus across seven CI jobs and removed duplicate
  coverage work from the ordinary test job, while retaining the complete
  release qualification suite.
- Updated the locked `fast-uri` and `qs` dependency lines and retained a clean
  production dependency audit across the supported Node.js package matrix.

### Fixed

- Kept grouped points, whisker rules, and fixed-width caps on the same
  categorical sub-slot after Canvas, scale, offset-scale, and data changes.
- Preserved an explicitly authored shared facet legend at its child
  `left`, `right`, `top`, or `bottom` edge, including horizontal alignment and
  the correct width-versus-height reservation after composition layout edits.

## [0.0.11] - 2026-09-02

### Added

- Added production guidance for accessibility, compatibility, responsive
  layout, performance, data refresh, error recovery, version provenance,
  fonts, and strict TypeScript use.
- Published versioned action cards, task-packet schemas, the exact
  `ChartProgram` declaration, and a hashed LLM section manifest as deployed
  machine-readable documentation artifacts.
- Added binned quantitative line aggregates with shared position-scale reuse,
  stable series grouping, path ordering, selection, and rematerialization
  behavior.
- Added text labels for complete arc sectors, with anchors derived from final
  annular geometry and replay after Canvas, scale, padding, or inner-radius
  changes.
- Added a provenance-verified 50-source TidyTuesday corpus and deterministic
  smoke, deep, and realistic scenario runners for data, mark, encoding, guide,
  scale, lifecycle, facade, and renderer qualification.

### Changed

- Expanded compact action cards with exact option type strings and upgraded
  MCP task packets with package provenance, applied options, explicit
  placeholders, and unmatched-requirement preservation.
- Expanded chart-intent resolution for area, Horizon, pie, donut, rose, radar,
  Polar axes, accessibility, responsive output, common option values, and
  broader unsupported interaction and animation wording.
- Expanded documentation search and the LLM routing index from prose-only
  excerpts to complete canonical-page and technical-symbol coverage.
- Inferred quantitative versus nominal bar positions from field-string
  shorthand, inferred omitted rule datum types from scalar values, and allowed
  compatible datum rules to share grouped or stacked measure scales.
- Hardened transforms, scales, layouts, selections, legends, and Canvas, PNG,
  SVG, and PDF rendering with deterministic finite-value, cardinality,
  geometry, native-backend, and output-size boundaries.
- Updated the Canvas runtime and browser build dependencies while preserving
  explicit package and browser-bundle headroom across supported platforms.

### Fixed

- Rewrote full LLM-bundle links and images against deployed canonical routes,
  preserved links authored with HTML/Liquid, and exposed deterministic section
  hashes and source-status metadata.
- Corrected the one-transform `DatasetTransform` documentation, all eight
  public transform branches, legend placement support, duplicated chart
  figures, generated action anchors, navigation order, and leaked internal
  instruction files.
- Prevented incompatible area stroke-dash steps from appearing as executable
  MCP output and stopped silently dropping recognized numeric, layout,
  accessibility, and interaction requirements.
- Rematerialized every complete mark that consumes a shared automatic position
  scale when a new ranged consumer expands its domain, keeping inherited error
  bands aligned with existing lines.
- Preserved direct quantitative line values at their row grain instead of
  collapsing repeated positions through the aggregate-line path.
- Aligned temporal bar annotations with their final geometry, spanned temporal
  axis baselines across the plot, and composed multi-part UTC tick formats
  without losing date or time components.
- Preserved encoded ranged-bar outlines and the default or encoded radius of
  path-shaped points across materialization and rendering.
- Kept discretized heatmap domains nondegenerate, reserved data-aware facet
  guide space, and made realistic gallery charts readable without weakening
  the diagnostic corpus.

## [0.0.10] - 2026-08-11

### Added

- Added collision-safe import-time extension registration through
  `registerExtension({ name, actions })`, including strict TypeScript module
  augmentation for registered actions on the standard `chart()` program.
- Added installed extension-authoring knowledge that guides LLM agents through
  feature-first design, current ggaction reuse, lifecycle ownership, primitive
  parity, and package-consumer verification.

### Changed

- Updated extension documentation and examples to make installable packages
  compose through registration while retaining `ChartProgram` subclasses for
  deliberately isolated programs.

## [0.0.9] - 2026-08-10

### Added

- Added a package-local, read-only stdio MCP server with one bounded `search_ggaction` tool, selective resources,
  executable authoring steps, and no hosted service, account, telemetry, chart execution, or arbitrary file access.
- Added generated compact knowledge for all 173 current actions, deterministic multi-intent task resolution, explicit
  unsupported and unresolved decisions, and exact Canvas, SVG, PNG, and PDF authoring bootstraps.

### Changed

- Added task-oriented LLM authoring and MCP documentation, installed-package MCP qualification, and a compact,
  provenance-locked 576-run Terra/Luna/Nano benchmark record and benefit chart.
- Kept per-request traces, intermediate checkpoints, aborted experimental generations, and obsolete paid runners out
  of the default branch while retaining aggregate evidence and exact raw-result hashes.

### Fixed

- Treated materialized window-output fields as direct line values when no aggregate is requested, preserving moving
  mean and sum results instead of reinterpreting them through the aggregate-line policy.

## [0.0.8] - 2026-08-04

### Added

- Added immutable UTC time-unit derivation, semantic category ordering and reset, and partitioned moving mean/sum
  windows with matching public actions, strict declarations, examples, and Current contracts.
- Added the Tick mark lifecycle, point/Tick angle encoding, and non-negative centered area stacking with stable
  Canvas, SVG, PNG, and PDF evidence.

### Changed

- Expanded the public example and documentation corpus with actual-data temporal, ordering, directional Tick,
  centered-area, and multi-legend charts, plus installed-package coverage for their supported workflows.

### Fixed

- Replaced independent same-edge legend placement with deterministic shared right/left lanes and left-packed
  top/bottom rows, aligning titles, symbols, and labels while preserving lifecycle convergence and compact margins.

## [0.0.7] - 2026-07-23

### Added

- Added the browser-safe `ggaction/basic` entry for creation-focused scatter, line, bar, histogram, and heatmap
  programs, with matching TypeScript declarations and an enforced 120,000-byte gzip bundle budget.
- Added browser-safe `ggaction/svg` output and Node-only `ggaction/pdf` single-page vector files, with matching
  declarations, metadata/accessibility options, installed-consumer coverage, and Canvas/SVG/PNG/PDF visual evidence.

### Changed

- Applied the documented numeric font-weight normalization consistently across Canvas, SVG, PNG, and PDF rendering.
- Generated the repository example index from the canonical chart catalog and reduced the LLM index to concise,
  non-duplicated routes into exact runtime and support documentation.
- Simplified Getting Started, grouped the support limitations by topic, and clarified the complete documentation
  verification workflow for contributors.

### Fixed

- Corrected the Canvas target in troubleshooting guidance and documented complete, executable Canvas, SVG, PNG, and
  PDF rendering flows with signatures generated from the public TypeScript declarations.

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

[0.0.13]: https://github.com/ggaction/ggaction/releases/tag/v0.0.13
[0.0.12]: https://github.com/ggaction/ggaction/releases/tag/v0.0.12
[0.0.11]: https://github.com/ggaction/ggaction/releases/tag/v0.0.11
[0.0.10]: https://github.com/ggaction/ggaction/releases/tag/v0.0.10
[0.0.9]: https://github.com/ggaction/ggaction/releases/tag/v0.0.9
[0.0.8]: https://github.com/ggaction/ggaction/releases/tag/v0.0.8
[0.0.7]: https://github.com/ggaction/ggaction/releases/tag/v0.0.7
[0.0.6]: https://github.com/ggaction/ggaction/releases/tag/v0.0.6
[0.0.5]: https://github.com/ggaction/ggaction/releases/tag/v0.0.5
[0.0.4]: https://github.com/ggaction/ggaction/releases/tag/v0.0.4
[0.0.3]: https://github.com/ggaction/ggaction/releases/tag/v0.0.3
[0.0.2]: https://github.com/ggaction/ggaction/releases/tag/v0.0.2
[0.0.1]: https://github.com/ggaction/ggaction/releases/tag/v0.0.1
