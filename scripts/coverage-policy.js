import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src/", import.meta.url));

export const CRITICAL_COVERAGE_FAMILIES = Object.freeze({
  "animation": { prefix: "grammar/animation/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Transition numerics and item matching must preserve exact endpoints, bounded values and unambiguous semantic identity." },
  "animation-runtime": { prefix: "animation/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Playback must bound callbacks, preserve the current frame on interruption and settle every run exactly once." },
  "position-scale-scope": { prefix: "actions/encodings/position/scope.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Aggregate positional identities must be exact-argument scoped and expire across nested failures without entering public options or persisted state." },
  "conditional-encoding-requests": { prefix: "actions/encodings/conditionalRequest.js", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Direct and aggregate conditional encoders must resolve branch resource identities with one policy." },
  "facade-frame-admission": { prefix: "actions/charts/frame.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Complete facade positions and guide ownership must be admitted before any state-changing child." },
  "axis-frame-admission": { prefix: "actions/guides/axes/frame.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Axis creation and visibility changes must validate their final single-Y meaning before any child writes." },
  "plot-position": { prefix: "grammar/plotPosition.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Plot-space anchors and detached snapshots must remain distinct from independent data scales." },
  "frame-policy": { prefix: "grammar/framePolicy.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "One Cartesian frame must preserve one Y resource identity and bounded overlap admission." },
  "frame-state": { prefix: "materialization/frameState.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Frame admission must resolve existing bindings and namespaced child regions without mutating or compiling programs." },
  "screen-annotation": { prefix: "grammar/screenAnnotation.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Explicit screen anchors must retain finite local Canvas coordinates and rowless identity without implicit data." },
  "mark-visibility": { prefix: "grammar/markVisibility.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Visibility decisions require bounded typed categories and explicit domain ownership." },
  "visibility-materialization": { prefix: "materialization/markVisibility.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Visibility must preserve user filtering, control mappings and exact restored ownership." },
  "visibility-actions": { prefix: "actions/data/visibility.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Two-stage filters must compose atomically and restore independent owners." },
  "filter-geometry": { prefix: "actions/data/filterGeometry.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Filtered final items must preserve and restore native histogram bin partitions." },
  "legend-category-identity": { prefix: "interaction/legendCategory.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Category effects share typed current-frame semantic guide identity." },
  "interaction-legend-visibility": { prefix: "interaction/legendVisibility.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Legend visibility requires explicit scope and policy, bounded hit identity and native atomic closure." },
  "pyramid-mark-write": { prefix: "actions/marks/pyramid.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Native pyramid meaning, encoding replacement and concrete materialization remain wrapped and immutable." },
  "ohlc-mark-write": { prefix: "actions/marks/ohlc.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Native ohlc meaning, encoding replacement and concrete materialization remain wrapped and immutable." },
  "waterfall-mark-write": { prefix: "actions/marks/waterfall.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Native waterfall meaning, encoding replacement and concrete materialization remain wrapped and immutable." },
  "table-cells": { prefix: "grammar/cells.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Typed row and column identity, explicit visible limits, measured widths and bounded finite cell geometry must remain independently verified." },
  "trail-action": { prefix: "actions/charts/trail.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Trail bindings, width and complete scale/guide candidates must preflight before writes." },
  "trail-mark": { prefix: "actions/marks/trail/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Explicit semantic and graphical writes preserve series identity and highlight baselines." },
  "trail-plot": { prefix: "grammar/trailPlot.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stored sample-width meaning and appearance remain canonical and descriptor safe." },
  "trail-materialization": { prefix: "materialization/trail/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Projected variable-width ribbons retain source membership, color and exact bounded geometry." },
  "trail-selection": { prefix: "materialization/selection/policies/trail.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Broken runs remain one typed logical series across every selection consumer." },
  "trail-curve": { prefix: "grammar/trailCurve.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Width interpolation must share curve topology and reject negative extrema or bounded subdivision failure." },
  "trail-series": { prefix: "grammar/trailSeries.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Variable-width series must preserve native order, original row lineage and explicit missing-width topology." },
  "trail-ribbon": { prefix: "grammar/trail.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Variable-width outlines require finite normals, bounded joins and caps, explicit gaps and complete original lineage." },
  "waterfall-action": { prefix: "actions/charts/waterfall.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Contribution edits must preflight ordered values and all guide dependencies before writes." },
  "waterfall-plot": { prefix: "grammar/waterfallPlot.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stored contribution roles and bounded source membership must remain canonical." },
  "waterfall-materialization": { prefix: "materialization/waterfall/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stage bodies, running connectors and labels share scale endpoints and stable row identity." },
  "waterfall-selection": { prefix: "materialization/selection/policies/waterfall.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Each compound stage retains one key and exact dependent source rows." },
  "ohlc-action": { prefix: "actions/charts/ohlc.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Price edits must validate the final four-field item before writing and rematerialize every role." },
  "ohlc-plot": { prefix: "grammar/ohlcPlot.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stored OHLC meaning and appearance must remain closed and canonical." },
  "ohlc-materialization": { prefix: "materialization/ohlc/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "One source row owns stem/body/label geometry and scale-domain eligibility." },
  "ohlc-selection": { prefix: "materialization/selection/policies/ohlc.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "All price glyph roles share one stable item key and highlight translation." },
  "pyramid-action": { prefix: "actions/charts/pyramid.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Pyramid edits must preflight final meaning and preserve explicit materialization." },
  "pyramid-materialization": { prefix: "materialization/pyramid/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stage and label geometry must share typed identity, paint and current viewport." },
  "pyramid-selection": { prefix: "materialization/selection/policies/pyramid.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "One stage must remain one logical item across labels, highlights and revisions." },
  "animation-values": { prefix: "grammar/animation/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Transition numerics must preserve exact endpoints, bounded interpolation and immutable linear-light color values." },
  "text-source-anchors": { prefix: "materialization/textSourceAnchors.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Full-only source anchor registration must not import geographic algorithms into Basic or accept unregistered constructors." },
  "native-text-item": { prefix: "materialization/textItem.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Shared native Text construction must preserve missing position, offsets, multiline and exact prepared font binding." },
  "ohlc-values": { prefix: "grammar/ohlc.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "High-low and open-close roles require finite inequalities and whole-row eligibility with exact typed identity." },
  "waterfall-values": { prefix: "grammar/waterfall.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Ordered signed contributions, explicit total/subtotal roles and reset must retain exact finite accumulation." },
  "pyramid-layout": { prefix: "grammar/pyramid/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stage order, width/area meaning, typed keys and finite oriented geometry must retain independent numerical evidence." },
  "geo-actions": { prefix: "actions/geo/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Geometry revisions must preserve immutable feature identity and preflight consumers before writes." },
  "geo-materialization": { prefix: "materialization/geo", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Geometry source results and their closed dispatch must retain exact source and identity validation." },
  "geo-mark-selection": { prefix: "materialization/selection/policies/geo.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Geographic source and concrete items retain exact feature identity and every split highlight part." },
  "geo-selection": { prefix: "selectors/geometry.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Geographic geometry selection must preserve eligible current and unique resource semantics." },
  "projection-selection": { prefix: "selectors/projections.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Named projections must preserve explicit, current and unique resource resolution." },
  "geo-grammar": { prefix: "grammar/geo/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Geographic geometry must preserve exact feature identity, bounded shared topology, finite projection and clipping semantics." },
  "facet-scale-context": { prefix: "materialization/facetScaleContext.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Layout-only facet work must preserve resolved domains and expire transient authority on return or failure." },
  "responsive-canvas-state": { prefix: "grammar/responsiveCanvas.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stored fixed Canvas policies and results require closed shape, finite bounds and immutable restoration." },
  "responsive-materialization": { prefix: "materialization/responsiveLayout.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Bounded explicit layout passes must preserve fixed dimensions and transient context on every exit." },
  "responsive-guide-canvas": { prefix: "materialization/guides/canvas.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Containment deferral is limited to a private measured candidate and never stored." },
  "responsive-labels": { prefix: "grammar/responsiveLabels.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Declared fallback labels require closed finite own-data normalization and bounded candidate work." },
  "responsive-layout": { prefix: "layout/responsivePolicy.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Fixed Canvas layout must reject oscillation, overflow and stale measured topology within a bounded solve." },
  "edge-route-kernel": { prefix: "grammar/graph/routes/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Edge route geometry must preserve exact endpoints, typed identity, deterministic work order and bounded immutable output." },
  "selection-region": { prefix: "grammar/selectionRegion", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Region predicates must preserve typed final-grain intersections and bounded immutable metadata." },
  "selection-lasso": { prefix: "grammar/lassoSelection", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Lasso membership must use finite CSS polygons, exact logical keys and bounded geometry work." },
  "interaction-annotation-movement": { prefix: "interaction/annotationMovement", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Annotation offset movement must preserve native anchors, exact owner scope and immutable gesture closure." },
  "interaction-movement-frame": { prefix: "interaction/movementFrame", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Native movement shares bounded committed-frame checks and exact nested CSS coordinate inversion." },
  "interaction-node-movement": { prefix: "interaction/nodeMovement", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Node movement must retain exact typed graph identity, native layout ownership, current frame and nested CSS coordinates." },
  "interaction-region": { prefix: "interaction/regionSelection", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Region gestures must share exact committed scales, current-frame anchors and scoped identities." },
  "selection-preview": { prefix: "actions/selection/preview", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Preview materialization must remain immutable, traceable and separate from committed state." },
  "angular-scale-inversion": { prefix: "grammar/scales/angularInversion", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Angular inverse must preserve periodic seam unions, resolved theta units and cumulative category bounds." },
  "brush-scale-inversion": { prefix: "grammar/scales/inversion", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Brush inverse values must preserve resolved scale geometry, typed keys and bounded immutable input." },

  "calendar-actions": { prefix: "actions/calendar/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Calendar source changes must preflight all consumers and preserve exact atomic revision closure." },
  "calendar-materialization": { prefix: "materialization/calendar/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stored calendar results and all cell, month boundary and label consumers require exact source identity and responsive geometry." },
  "calendar-selection": { prefix: "materialization/selection/policies/calendar.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Calendar final day items must preserve contributing rows and exclude decorative roles from selection." },
  "calendar-grammar": { prefix: "grammar/calendar/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Civil-day aggregation, leap/DST mapping and month boundaries require independent date and topology evidence." },
  "grid-boundary": { prefix: "grammar/gridBoundary.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Contour and calendar cell unions share one bounded edge cancellation and ring topology owner." },
  "calendar-day": { prefix: "grammar/calendarDay", floor: { lines: 90, branches: 85, functions: 100 }, rationale: "Civil-day domains must preserve strict parsing, explicit zones, DST boundaries and bounded output." },
  "source-resource-plan": { prefix: "actions/data/resourcePlan.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Source revisions must preflight the complete typed resource closure and materialize a shared consumer union once." },
  "interaction-pointer-capture": { prefix: "interaction/pointerCapture", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Host capture must release listeners and pointers exactly once across cancellation, reentrancy and disposal." },
  "interaction-gestures": { prefix: "interaction/gestures", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Gesture arbitration and terminal transitions must retain pointer ownership, bounded work and one commit or cancellation." },
  "selection-nearest": { prefix: "grammar/nearestSelection", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Explicit nearest metrics require finite bounded final-grain tuples and stable identity." },
  "legend-target-resolution": { prefix: "materialization/legendTargets", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Shared guide targets must reject missing or ambiguous public channel ownership." },
  "interaction-legend-selection": { prefix: "interaction/legendSelection", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Legend activation must preserve typed categorical membership, explicit owner scope and atomic native selection closure." },
  "interaction-click-selection": { prefix: "interaction/clickSelection", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Automatic clicks must retain exact owner identity, native selection semantics and bounded current-frame queries." },
  "interaction-reconciliation": { prefix: "interaction/reconciliation", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Selection lifecycle must preserve intent, bound dormant identities and prune through atomic native actions." },
  "interaction-nearest": { prefix: "interaction/nearest", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Nearest commands must use current frames and atomic native selection updates." },
  "selection-projection": { prefix: "grammar/selectionProjection", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Typed tuple and original-lineage projections must remain bounded and preserve explicit source identity." },
  "interaction-bindings": { prefix: "interaction/bindings", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Linked selection DAGs must validate ownership and commit the entire projection closure atomically." },
  "graph-filter-selection": { prefix: "selectors/graphFilters.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Graph filter ownership must remain unique and source-bound." },
  "graph-filter-action": { prefix: "actions/data/graphFilter.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Graph view changes must preflight the complete node recipe and preserve immutable resource topology." },
  "graph-filter-view": { prefix: "materialization/graph/view.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Induced views must retain exact endpoints, drawing order, source identity and bounded selector work." },
  "axis-label-text": { prefix: "materialization/axisLabelText", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Shared axis text and physical line grouping must retain semantic guide identity." },
  "interaction-history": { prefix: "interaction/history.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Bounded session snapshots must preserve exact undo, redo, reset and disposal ownership without cloning programs." },
  "interaction-preparation": { prefix: "interaction/preparation.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Async candidates must preserve atomic commit, exact revision tags and bounded host lease lifetimes." },
  "interaction-input": { prefix: "interaction/input", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Queued commands and frames must reject executable input and preserve bounded own-data snapshots." },
  "interaction-selection": { prefix: "interaction/selection", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Atomic command routing must retain native selection semantics, explicit owner scopes and package editor boundaries." },
  "interaction-session": { prefix: "interaction/session", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Public session events, exact frame swaps and disposal must preserve immutable state and bounded host lifetimes." },
  "interaction-scene-frame": { prefix: "interaction/sceneFrame", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Host frames require bounded own-data snapshots and canonical concrete validation before becoming current." },
  "scene-snapshot": { prefix: "sceneSnapshot.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Exact node associations must retain concrete scene cache identity without semantic materialization." },
  "hit-frame": { prefix: "interaction/hit", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Current frame lifecycle must reject stale updates, preserve atomic index replacement and release disposed state." },
  "hit-geometry": { prefix: "grammar/hit", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "CSS coordinate, transform and exact hit decisions must reject stale or non-finite geometry without mutating chart state." },
  "theme-definition": { prefix: "actions/theme/definition.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Theme tokens require closed, descriptor-safe normalization and bounded structured paint palettes." },
  "theme-palettes": { prefix: "actions/theme/palettes.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Categorical paint must preserve typed category identity, authored ranges and named overlays." },
  "legend-highlight-membership": { prefix: "materialization/selection/legend.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Legend pixels and inspection share exact final-item membership and component style eligibility." },
  "theme-provenance": { prefix: "actions/theme/provenance.js", floor: { lines: 95, branches: 85, functions: 100 }, rationale: "Read-only appearance evidence must distinguish authored authority from unknown legacy state." },
  "theme-native-guide-defaults": { prefix: "actions/theme/guideDefaults.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Theme removal must reuse native guide defaults and preserve child-owned snapshots and explicit colors." },
  "theme-typography-roles": { prefix: "actions/theme/typographyRoles.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Typography tokens must resolve native family defaults and authored precedence without losing exact font preparation." },
  "contour-grammar": { prefix: "grammar/contour/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Grid topology, density values and closed ring boundaries require independent numeric and malformed-input evidence." },
  "density-kernels": { prefix: "grammar/densityKernels.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "One-dimensional and contour density share the same finite kernel definitions." },
  "resource-mark-effects": { prefix: "grammar/markEffects.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Role effects must share normalized authoring and strict stored validation without mutating input." },
  "concrete-mark-effects": { prefix: "materialization/markEffects.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Per-item effect overrides must remove false reset values before concrete rendering." },
  "resource-plot-theme": { prefix: "actions/theme/resourcePlots.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Resource plot appearance must retain explicit authored styles while restoring each family's defaults without rerunning layout." },
  "mark-shadow": { prefix: "grammar/markShadow", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Prepared visual effects must preserve exact input, bounded work, immutable source and backend parity." },
  "shadow-composite": { prefix: "grammar/shadowComposite", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Prepared visual effects must preserve exact input, bounded work, immutable source and backend parity." },
  "paint-frames": { prefix: "renderers/paintFrames", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Prepared visual effects must preserve exact input, bounded work, immutable source and backend parity." },
  "shadow-frames": { prefix: "renderers/shadowFrames", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Prepared visual effects must preserve exact input, bounded work, immutable source and backend parity." },
  "shadow-preparation": { prefix: "renderers/shadowRendering", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Prepared visual effects must preserve exact input, bounded work, immutable source and backend parity." },
  "shadow-handle": { prefix: "renderers/shadowState", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Prepared visual effects must preserve exact input, bounded work, immutable source and backend parity." },
  "text-glyph-input": { prefix: "renderers/textGlyphInput", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Prepared visual effects must preserve exact input, bounded work, immutable source and backend parity." },
  "text-ink-bounds": { prefix: "renderers/textInkBounds", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Prepared visual effects must preserve exact input, bounded work, immutable source and backend parity." },
  "mark-output": { prefix: "materialization/markOutput.js", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Final conditional values, outline appearance and stable item identity must be applied by the same explicit owner." },
  "mark-blend": { prefix: "grammar/markBlend.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Closed mark blend capability and own-data options must remain validated." },
  "mark-blend-action": { prefix: "actions/marks/blend.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Single semantic blend ownership and normal removal must remain exercised." },
  "mark-outline": { prefix: "grammar/markOutline.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Closed pre-fill outline values and atomic stroke conflicts must retain strict validation." },
  "embedded-asset-payload": { prefix: "grammar/assetPayload", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Encoded image and font bytes require one exact bounded ownership and digest contract." },
  "font-payload": { prefix: "grammar/fontPayload", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Concrete font bytes and MIME headers must preserve their exact identity." },
  "font-state": { prefix: "materialization/fontState", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stored fonts, retained measurement bindings and composition adoption must validate atomically." },
  "font-materialization": { prefix: "materialization/textFont", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Concrete text must retain the measured font identity at explicit materialization sites." },
  "font-resource-preparation": { prefix: "resources/fontResource", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Font replacement must prepare measurement closure before atomic exact-receiver application." },
  "font-metric-preparation": { prefix: "resources/textMetrics", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Opaque metrics and bounded query closure must reject stale or missing measurements." },
  "font-actions": { prefix: "actions/fonts/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Font resource lifecycle must remain traceable and reject partial transitions." },
  "font-rendering": { prefix: "renderers/fontRendering", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Registration handles must preserve exact identity, abort safety and deterministic disposal." },
  "concrete-font-traversal": { prefix: "renderers/fonts", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Concrete font traversal must validate identities and budgets before host registration." },
  "text-glyph-mask": { prefix: "renderers/textGlyphMask", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Actual glyph masks must preserve prepared identity and bound all raster allocations." },
  "layout-action-dispatch": { prefix: "actions/layouts/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Shared layout edits must retain exact domain routing and atomic validation." },
  "layout-state-dispatch": { prefix: "materialization/layoutState.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stored layouts must validate only their explicit owning input domain." },
  "layout-selection": { prefix: "selectors/layouts.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Layout inference must reject ambiguity and incompatible domains." },
  "structured-paint": { prefix: "grammar/paint.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Authored and concrete fill contracts must preserve normalized coordinate frames and reject unsafe values." },
  "gradient-stops": { prefix: "grammar/gradientStops.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Ordered stops and hard transitions share one complete validation owner." },
  "fill-materialization": { prefix: "materialization/fillPaint.js", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Explicit fill origins, glyph bounds and cumulative pattern work must remain exercised." },
  "paint-color": { prefix: "grammar/color.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Paint colors must have finite host-independent channels and preserve legacy scale parsing." },
  "image-payload": { prefix: "grammar/imagePayload", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-mark-options": { prefix: "grammar/imageMark", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "asset-request": { prefix: "grammar/assetRequest", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "asset-host": { prefix: "core/assetHost", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-resource-preparation": { prefix: "resources/imageResource", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-resource-actions": { prefix: "actions/images/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-mark-actions": { prefix: "actions/marks/image/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-rendering": { prefix: "renderers/imageRendering", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "canvas-scene-compiler": { prefix: "renderers/canvasScene", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-drawing": { prefix: "renderers/canvas/image", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },
  "image-selection": { prefix: "materialization/selection/policies/image", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image preparation, immutable ownership and concrete consumers require guarded lifecycle coverage." },

  "png-byte-encoding": { prefix: "core/pngEncoding", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Bounded glyph PNG bytes must preserve RGBA and reject unsafe inputs before allocation." },
  "conditional-grammar": { prefix: "grammar/conditional", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Ordered predicates and stored branch contracts must reject inactive malformed inputs." },
  "conditional-materialization": { prefix: "materialization/conditional", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Final item grain, exact dependencies and conditional rematerialization must remain exercised." },
  "asset-preparation": { prefix: "resources/assetPreparation", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image and font preparation share exact bytes, host errors and abort cleanup." },
  "font-preparation": { prefix: "resources/resolveFonts", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Prepared font bytes and measured widths must bind the same explicit font identity and provider." },
  "svg-image-validation": { prefix: "grammar/svgImage", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Static SVG parsing, local resource identity and decoder budgets must reject active content before host work." },
  "image-preparation": { prefix: "resources/resolveAssets", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Asset bytes, identity, abort and export eligibility must remain exercised before host callbacks." },
  "image-placement": { prefix: "materialization/image", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Image fit and viewport clipping must share finite, aspect-preserving concrete geometry." },
  "flow-grammar": { prefix: "grammar/flow/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Conservation, bounded cycle layout and closed style policies require independent numeric and malformed-input evidence." },
  "contour-actions": { prefix: "actions/contours/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Geometry revisions must preflight exact source, scales, marks and guides before atomic transitions." },
  "contour-materialization": { prefix: "materialization/contour/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stored contour verification and compound paths preserve source identity, holes and bounded geometry." },
  "contour-selectors": { prefix: "selectors/contours.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Contour geometry must resolve exact eligible resources without silently choosing a candidate." },
  "flow-actions": { prefix: "actions/flow/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Flow revisions must preflight exact layout and mark closure before atomic transitions." },
  "flow-materialization": { prefix: "materialization/flow/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stored flow results and concrete ribbons must preserve exact graph identity and bounded geometry." },
  "flow-selection": { prefix: "materialization/selection/policies/flow.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Flow node and edge items must preserve source rows and stable resource lineage." },
  "flow-selectors": { prefix: "selectors/flow.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Flow consumers must reject ambiguous or incompatible layout and coordinate choices." },
  "graph": { prefix: "grammar/graph/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Graph topology, metrics and finite geometry must preserve typed identity, missing policies and bounded work." },
  "graph-actions": { prefix: "actions/graphs/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Observed graph creation and revision must preserve exact source roles and atomic edits." },
  "graph-state": { prefix: "materialization/graph/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stored graph topology and provenance must remain bound to exact source data." },
  "graph-selection": { prefix: "selectors/graphs.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Graph resolution must reject ambiguity and incompatible origin before mutation." },
  "hierarchy-grammar": { prefix: "grammar/hierarchy/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Hierarchy identity, topology, aggregation and bounded layout must preserve exact node meaning." },
  "hierarchy-materialization": { prefix: "materialization/hierarchy/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Stored hierarchy resources and concrete plots must preserve exact lineage and validate every revision." },
  "hierarchy-actions": { prefix: "actions/hierarchy/", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Hierarchy revisions must preflight all dependent layouts and plots before wrapped transitions." },
  "source-preparation": { prefix: "resources/", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Host input, opaque preparation and freshness must be validated before application." },
  "source-grammar": { prefix: "grammar/dataSource", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Parsing, retained payload and request proofs must agree without host execution." },
  "canvas-resource-revision": { prefix: "materialization/canvasResourceRevision.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Exact-class Canvas resource preparation must preserve immutable registration and Basic isolation." },
  "edge-route-selection": { prefix: "selectors/edgeRoutes.js", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Route consumers must resolve one eligible exact stored resource." },
  "data-resource-revision": { prefix: "actions/data/resourceRevision", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Exact-class data-backed resource dispatch must preserve immutable registration and Basic isolation." },
  "source-actions": { prefix: "actions/data/source", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Prepared source planning and exact child contexts preserve atomic application." },
  "source-state": { prefix: "materialization/dataSourceState", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Historic receipts and live source revisions have distinct validated owners." },
  "source-primitive-context": { prefix: "actions/primitives/preparedResourceContext", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Prepared replacement authority must expire on every exit." },
  "complete-grammar": { prefix: "grammar/complete", floor: { lines: 90, branches: 85, functions: 100 }, rationale: "Completion must preserve observed rows and explicitly bound calendar expansion, grouping and work." },
  "pivot-actions": { prefix: "actions/data/pivot", floor: { lines: 90, branches: 85, functions: 100 }, rationale: "Pivot inference, ownership and explicit materialization must remain exercised." },
  "pivot-grammar": { prefix: "grammar/pivot", floor: { lines: 90, branches: 85, functions: 100 }, rationale: "Pivot grouping, typed columns, numerical policies and work limits must remain exercised." },
  "transform-input": { prefix: "grammar/transformInput", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Shared data input validation must remain safe before dispatch in Full and Basic." },
  "expression-kernel": { prefix: "grammar/expression", floor: { lines: 90, branches: 80, functions: 100 }, rationale: "Closed AST evaluation, explicit types, lazy diagnostics and resource budgets must remain exercised." },
  "path-geometry": { prefix: "grammar/path", floor: { lines: 80, branches: 75, functions: 80 }, rationale: "Concrete path validation, topology and numeric geometry must remain exercised." },
  "radial-gradient-kernel": { prefix: "grammar/radialGradient", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Shared radial geometry, focal containment and ordered stop validation must remain exercised." },
  "shadow-kernel": { prefix: "grammar/shadow", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Deterministic alpha-mask convolution, finite bounds and allocation preflight must remain exercised." },
  "compositing-kernel": { prefix: "grammar/compositing", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Premultiplied blend equations, one group attenuation and bounded quantization must remain exercised." },
  "pattern-kernel": { prefix: "grammar/patterns", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Shared vector tile normalization, periodic coverage and bounded geometry must remain exercised." },
  "resource-state": { prefix: "materialization/resourceState", floor: { lines: 80, branches: 75, functions: 80 }, rationale: "Stored resource revisions and dependency validation must remain exercised." },
  "builtin-resource-kinds": { prefix: "materialization/resourceKinds", floor: { lines: 95, branches: 90, functions: 100 }, rationale: "Class-specific builtin validation must reject unsafe records, inheritance and repeated registration." },
  "row-lineage": { prefix: "grammar/rowLineage", floor: { lines: 80, branches: 75, functions: 80 }, rationale: "Every transform must preserve exact contributing rows." },
  "core-state": { prefix: "core/", floor: { lines: 80, branches: 75, functions: 80 }, rationale: "State and action boundaries must remain exercised." },
  "all-renderers": { prefix: "renderers/", floor: { lines: 50, branches: 60, functions: 80 }, rationale: "Includes the lazy native loader; Canvas and explicit overrides retain stricter floors." },
  "all-selectors": { prefix: "selectors/", floor: { lines: 80, branches: 80, functions: 80 }, rationale: "Resource identity and ambiguity are public contracts." },
  "mcp": { prefix: "mcp/", floor: { lines: 85, branches: 75, functions: 70 }, rationale: "Adapter and server contracts need explicit evidence." },
  "inspection": { prefix: "inspection", floor: { lines: 90, branches: 80, functions: 90 }, rationale: "Inspection descriptors and state must agree." },
  "scene": { prefix: "scene", floor: { lines: 95, branches: 90, functions: 95 }, rationale: "Scene construction is a public boundary." },
  "legend-policies": Object.freeze({
    prefix: "grammar/legend",
    floor: Object.freeze({ lines: 90, branches: 80, functions: 100 }),
    rationale: "Legend eligibility, stored intent and paint policies must reject incompatible edits atomically."
  }),
  "facet-guide-scaffolding": Object.freeze({
    prefix: "materialization/facetGuides/",
    floor: Object.freeze({ lines: 80, branches: 75, functions: 80 }),
    rationale: "Shared facet scaffolding must retain independent guides through composition and replay."
  }),
  "snapshot-validation": Object.freeze({
    prefix: "persistence/",
    floor: Object.freeze({ lines: 90, branches: 80, functions: 100 }),
    rationale: "Persisted snapshots must preserve values and reject malformed state before editable restoration."
  }),
  "guide-layout-validation": Object.freeze({
    prefix: "materialization/guides/",
    floor: Object.freeze({ lines: 90, branches: 80, functions: 100 }),
    rationale: "Guide ownership and final-state collision validation must remain symmetric across domain actions."
  }),
  "parallel-axis-policies": Object.freeze({
    prefix: "actions/guides/axes/parallel/",
    floor: Object.freeze({ lines: 90, branches: 80, functions: 100 }),
    rationale: "Field recipes, component lifecycle and scale replay must preserve Parallel axis ownership."
  }),
  "coordinate-policies": Object.freeze({
    prefix: "actions/coordinates/",
    floor: Object.freeze({ lines: 85, branches: 75, functions: 85 }),
    rationale: "Coordinate ownership and inference must reject ambiguity consistently."
  }),
  "position-policies": Object.freeze({
    prefix: "grammar/positionPolicies/",
    floor: Object.freeze({ lines: 50, branches: 30, functions: 80 }),
    rationale: "Every positional mark policy must remain executable through shared encodings."
  }),
  "selection-materialization": Object.freeze({
    prefix: "materialization/selection/",
    floor: Object.freeze({ lines: 80, branches: 65, functions: 80 }),
    rationale: "Selection grain and rematerialization errors silently target the wrong marks."
  }),
  "canvas-renderer": Object.freeze({
    prefix: "renderers/canvas/",
    floor: Object.freeze({ lines: 75, branches: 60, functions: 80 }),
    rationale: "Every concrete primitive renderer is a public rendering boundary."
  }),
  "regression-grammar": Object.freeze({
    prefix: "grammar/regression/",
    floor: Object.freeze({ lines: 90, branches: 75, functions: 100 }),
    rationale: "Every regression validation, fit, and prediction owner must preserve the statistical contract."
  })
});

export const CRITICAL_COVERAGE_OVERRIDES = Object.freeze({
  "actions/encodings/conditional.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/legendEncodings.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/overlayGeometry.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "core/valueEncoding.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "layout/facetHeaderTitles.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/data/regressionStatistics.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/colorSize.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/combine.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "core/graphicProperties.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "actions/primitives/semanticAction.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "grammar/axisTextPlacement.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "grammar/colorSizeLegend.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "grammar/facets/legendIntent.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "grammar/guideDash.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "materialization/facetGuides/edit.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/facetGuides/owner.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/facetGuides/ownerLayout.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/graphicTranslation.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "materialization/legendBorder.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "materialization/legendClip.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "selectors/axes.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "selectors/graphicCapacity.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/continuous/colorSymbols.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/intervals/revision.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/primitives/graphicProperties.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "accessibility.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "persistence.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "grammar/positionDatum.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "grammar/pointPolygon.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "grammar/markLabels.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "actions/guides/legends/transition.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "layout/guideCollisions.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "layout/legendLane.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "layout/legendItems.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/creation.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/edit.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "actions/guides/legends/lifecycle.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "grammar/parallelAxisTitles.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "actions/encodings/seriesLayout.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "actions/charts/area.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "actions/encodings/density/resolve.js": Object.freeze({
    lines: 90,
    branches: 80,
    functions: 100
  }),
  "actions/encodings/horizon/resolve.js": Object.freeze({
    lines: 80,
    branches: 70,
    functions: 90
  }),
  "actions/guides/axes/parallel/resolve.js": Object.freeze({
    lines: 90,
    branches: 80,
    functions: 100
  }),
  "actions/marks/area/materialize.js": Object.freeze({
    lines: 95,
    branches: 90,
    functions: 80
  }),
  "actions/marks/line/materialize.js": Object.freeze({
    lines: 95,
    branches: 90,
    functions: 90
  }),
  "actions/scales/patch.js": Object.freeze({
    lines: 95,
    branches: 90,
    functions: 100
  }),
  "actions/selection/actions.js": Object.freeze({
    lines: 90,
    branches: 75,
    functions: 100
  }),
  "grammar/positionPolicies/index.js": Object.freeze({
    lines: 90,
    branches: 75,
    functions: 100
  }),
  "core/immutable.js": Object.freeze({ lines: 90, branches: 85, functions: 100 }),
  "core/compositionState.js": Object.freeze({ lines: 90, branches: 85, functions: 100 }),
  "core/font.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "core/textMetricProfile.js": Object.freeze({ lines: 95, branches: 85, functions: 100 }),
  "materialization/typography.js": Object.freeze({ lines: 90, branches: 80, functions: 100 }),
  "core/textMetrics.js": Object.freeze({ lines: 90, branches: 85, functions: 100 }),
  "grammar/streamBaseline.js": Object.freeze({ lines: 100, branches: 100, functions: 100 }),
  "grammar/areaSeries.js": Object.freeze({ lines: 75, branches: 75, functions: 100 }),
  "grammar/markFilter.js": Object.freeze({ lines: 75, branches: 60, functions: 100 }),
  "grammar/orderedRange.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "grammar/selectionSet.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "grammar/selectionExpression.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "materialization/selection/expression.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "grammar/markSelection.js": Object.freeze({ lines: 90, branches: 90, functions: 100 }),
  "grammar/scales/definition.js": Object.freeze({
    lines: 90,
    branches: 85,
    functions: 100
  }),
  "grammar/schemas/concreteGraphic.js": Object.freeze({
    lines: 85,
    branches: 85,
    functions: 100
  }),
  "grammar/schemas/graphicTree.js": Object.freeze({
    lines: 90,
    branches: 85,
    functions: 90
  }),
  "grammar/schemas/graphicBounds.js": Object.freeze({
    lines: 85,
    branches: 75,
    functions: 90
  }),
  "grammar/transforms.js": Object.freeze({
    lines: 85,
    branches: 75,
    functions: 100
  }),
  "layout/grid.js": Object.freeze({ lines: 100, branches: 100, functions: 100 }),
  "layout/legend.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "layout/title.js": Object.freeze({ lines: 95, branches: 90, functions: 100 }),
  "materialization/planner.js": Object.freeze({
    lines: 95,
    branches: 95,
    functions: 100
  }),
  "materialization/layout.js": Object.freeze({
    lines: 100,
    branches: 100,
    functions: 100
  }),
  "materialization/selection/filter.js": Object.freeze({
    lines: 90,
    branches: 75,
    functions: 100
  }),
  "materialization/selection/items/common.js": Object.freeze({
    lines: 85,
    branches: 70,
    functions: 90
  }),
  "materialization/selection/items/bar.js": Object.freeze({
    lines: 90,
    branches: 70,
    functions: 80
  }),
  "materialization/selection/items/path.js": Object.freeze({
    lines: 90,
    branches: 70,
    functions: 100
  }),
  "materialization/selection/items/point.js": Object.freeze({
    lines: 95,
    branches: 90,
    functions: 100
  }),
  "materialization/selection/items/rule.js": Object.freeze({
    lines: 95,
    branches: 85,
    functions: 100
  }),
  "materialization/selection/policies/index.js": Object.freeze({
    lines: 90,
    branches: 85,
    functions: 100
  }),
  "materialization/selection/state.js": Object.freeze({
    lines: 95,
    branches: 90,
    functions: 100
  }),
  "materialization/selection/styles.js": Object.freeze({
    lines: 90,
    branches: 75,
    functions: 100
  }),
  "renderers/canvas/index.js": Object.freeze({ lines: 85, branches: 70, functions: 100 }),
  "renderers/png.js": Object.freeze({ lines: 90, branches: 80, functions: 100 })
});

function sourceFiles(directory, relative = "") {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const childRelative = path.posix.join(relative, entry.name);
    const child = path.join(directory, entry.name);
    return entry.isDirectory()
      ? sourceFiles(child, childRelative)
      : entry.name.endsWith(".js") ? [childRelative] : [];
  });
}

export function coverageFloorsForFiles(
  files,
  families = CRITICAL_COVERAGE_FAMILIES,
  overrides = CRITICAL_COVERAGE_OVERRIDES
) {
  const floors = {};
  for (const file of files) {
    if (file === "mcp/cli.js") continue;
    for (const family of Object.values(families)) {
      if (file.startsWith(family.prefix)) floors[file] = Object.fromEntries(
        ["lines", "branches", "functions"].map(metric => [metric, Math.max(floors[file]?.[metric] ?? 0, family.floor[metric])])
      );
    }
  }
  return Object.freeze({ ...floors, ...overrides });
}

export const CRITICAL_COVERAGE_FLOORS = coverageFloorsForFiles(sourceFiles(sourceRoot));

export function parseCoverageTable(output) {
  const stack = [];
  const files = new Map();
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(
      /^(?:ℹ|#)( +)([^|]+?)\s+\|\s*([\d.]+)?\s*\|\s*([\d.]+)?\s*\|\s*([\d.]+)?\s*\|/
    );
    if (!match || match[2].trim() === "file") continue;
    const depth = match[1].length;
    const name = match[2].trim();
    stack.length = depth - 1;
    stack[depth - 1] = name;
    if (match[3] === undefined && !name.endsWith(".js")) continue;
    const metrics = match.slice(3, 6).map(Number);
    if (metrics.some(value => !Number.isFinite(value) || value < 0 || value > 100)) {
      throw new Error(`Malformed coverage metrics for ${name}.`);
    }
    const relative = stack[0] === "src"
      ? stack.slice(1).join("/")
      : stack.join("/");
    if (files.has(relative)) throw new Error(`Duplicate coverage row: ${relative}`);
    files.set(relative, Object.freeze({
      lines: Number(match[3]),
      branches: Number(match[4]),
      functions: Number(match[5])
    }));
  }
  return files;
}

export function assertCriticalCoverage(
  output,
  floors = CRITICAL_COVERAGE_FLOORS
) {
  const coverage = parseCoverageTable(output);
  const failures = [];
  for (const [file, floor] of Object.entries(floors)) {
    const actual = coverage.get(file);
    if (actual === undefined) {
      failures.push(`${file}: missing from coverage report`);
      continue;
    }
    for (const metric of ["lines", "branches", "functions"]) {
      if (actual[metric] < floor[metric]) {
        failures.push(
          `${file}: ${metric} ${actual[metric]}% is below ${floor[metric]}%`
        );
      }
    }
  }
  if (failures.length > 0) {
    throw new Error(`Critical coverage policy failed:\n${failures.join("\n")}`);
  }
}

// The CLI exits/opens stdio and is exercised by installed subprocess consumers;
// importing it into an instrumented test process would change that contract.
export const SOURCE_COVERAGE_EXCLUSIONS = Object.freeze({
  "mcp/cli.js": "Installed MCP stdio and missing-SDK consumer tests in scripts/package-consumer.js."
});
export function assertSourceCoverage(output, files = sourceFiles(sourceRoot), exclusions = SOURCE_COVERAGE_EXCLUSIONS) {
  const coverage = parseCoverageTable(output);
  const missing = files.filter(file => !coverage.has(file) && !Object.hasOwn(exclusions, file));
  if (missing.length) throw new Error(`Source files missing from coverage: ${missing.join(", ")}`);
  for (const [file, reason] of Object.entries(exclusions)) {
    if (!files.includes(file) || typeof reason !== "string" || reason.length < 20) {
      throw new Error(`Invalid source coverage exclusion: ${file}`);
    }
  }
}
