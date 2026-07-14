# Repository Instructions

## Architecture Reference

- Read `agent_docs/INITIAL_ARCHITECTURE.md` before making architectural or implementation decisions.
- Also read `agent_docs/SECOND_ARCHITECTURE.md`, which records the current implemented architecture after the initial chart phases and takes precedence when it differs from the initial design reference.
- Treat `INITIAL_ARCHITECTURE.md` as the starting point and a design reference, not as an infallible or permanently fixed specification.
- Treat `SECOND_ARCHITECTURE.md` as the current architectural baseline. Update it when a deliberate architectural change alters module ownership, state boundaries, materialization flow, rendering boundaries, or public package boundaries.
- Prefer a simpler or more internally consistent design when implementation evidence supports it.
- Discuss material changes to the public API, stored schemas, or core architecture with the user before committing to them.

## Maintaining These Instructions

- Add durable implementation principles emphasized by the user to this file as they emerge during development.
- Do not add one-off task details, temporary workarounds, or narrow implementation notes here.
- If a new instruction conflicts with an existing one, surface and resolve the conflict instead of silently replacing either rule.

## Core Architectural Invariants

- `ChartProgram` is immutable. Every update must structurally copy the modified path and must not mutate an earlier program or caller-owned input.
- The renderer reads only the fully materialized, backend-neutral `graphicSpec`.
- There is no automatic compiler from `semanticSpec` to `graphicSpec`.
- Every domain action must explicitly define and invoke the graphical materialization required by its semantic changes.
- `editSemantic`, `createGraphics`, and `editGraphics` are low-level authoring primitives exposed through the public extension layer, not the ordinary chart-authoring API.
- Users interact through domain-specific actions.

## Source Ownership and Module Boundaries

- Give each cross-cutting contract one canonical owner. Shared defaults, closed vocabularies, resource lookup rules, validation rules, and dispatch tables must be defined once and consumed by actions rather than re-declared in multiple feature modules.
- Route ID-based lookup, existence checks, and required-resource errors for named semantic datasets, layers, scales, and coordinates through shared selectors. Keep capability queries local only when they select by semantic behavior rather than by resource identity.
- Use one shared concrete-graphic schema for graphical editing and rendering. Renderers may add completeness checks required to draw a node, but they must not redefine a conflicting property or value contract.
- Namespace every repeatable generated internal dataset, layer, scale, guide, and graphic ID from its owning user-defined resource ID and semantic role. Stable system IDs are reserved for structurally singular slots such as the canvas or one supported guide per channel; do not use global generated IDs where the same aggregate action can create more than one resource.
- Store each piece of program state in one canonical representation. Convenience aliases must be derived read-only accessors, and internal counters or bookkeeping must remain non-enumerable or private rather than becoming duplicate serialized state.
- Organize source code by reusable semantic capability and separate wrapped action orchestration from pure grammar, resolution, layout, and materialization calculations. Pure modules must not mutate a program or create trace nodes; meaningful authoring steps must remain wrapped actions.
- Express cross-cutting rematerialization as deterministic plans of wrapped action calls, deduplicate equivalent plan steps while preserving order, and register new consumers with the responsible materialization policy instead of scattering ad hoc rematerialization calls across unrelated actions.
- Keep every public JavaScript entry point synchronized with its TypeScript declaration, package export-map entry, and package-boundary tests. Keep Node-only adapters out of browser-safe entry points.

## User-Facing API Design

- Maintain three clear layers: the default Chart Authoring API, the public Action Authoring API, and private library internals.
- Assign every public action an explicit lifecycle in the action catalog: immutable create-only, mutable resource, assignment, aggregate create-only, stable resource with an edit gap, or primitive. Do not infer that every `create*` action mechanically requires an `edit*` counterpart.
- A stable independently addressable resource must either have a supported edit path or an explicit cataloged gap. Define editable properties, rematerialization ownership, and conflict behavior before adding its edit action; aggregate actions remain create-only and delegate updates to child actions.
- Treat resources whose type or attachment changes invalidate multiple semantic and graphical dependencies as structural create-only resources. Create a new resource and explicitly rebind its consumers instead of offering a misleading partial edit action.
- Keep sibling component actions behind the same public facade unless a distinct direct authoring use case justifies exposing one. Internal wrapped components remain visible in traces, but do not expose one sibling merely because implementation staging made it convenient.
- The default `ggaction` entry point serves chart authors through domain-specific actions and rendering.
- The `ggaction/extension` entry point serves action authors through `ChartProgram`, `action()`, primitive actions, and trace inspection.
- The Node-only `ggaction/png` entry point exports completed programs without adding Node dependencies to the browser entry point.
- Encourage extension authors to subclass `ChartProgram` instead of modifying the shared base prototype, so independently authored extensions do not collide.
- Do not expose private path-parsing, structural-copy, validation, or rendering-dispatch helpers through public entry points.
- Do not expose raw graphical IDs or raw graphical property paths when a meaningful domain action can represent the operation.
- Name chart-authoring actions after semantic concepts such as `createPointMark`; keep concrete realizations such as `circle` inside action implementations and `graphicSpec`.
- Public actions accept meaningful option objects, such as `editXAxisLine({ lineWidth: 3 })`.
- Every public action accepts one parameter object and returns a new `ChartProgram`.
- Require only inputs that the user must decide and that cannot be inferred safely. User-facing actions should infer or default the remaining options whenever the stored program state determines them unambiguously.
- Resolve omitted options in this order: an explicit option, a unique inference from stored semantic state, a documented library default, then an error when no safe decision remains. Never choose arbitrarily among multiple candidates.
- Treat documented defaults and inference behavior as part of the public API contract. Cover them in user documentation and tests, and persist inferred semantic decisions in `semanticSpec`.
- Use omission, an empty object, and `false` consistently in aggregate APIs: omission requests automatic applicability and inference, `{}` explicitly selects the component with inferred details, and `false` explicitly disables it.
- Keep create and edit contracts consistent. A create action requires a missing resource, may treat an equivalent repeated definition as idempotent when explicitly intended, and must reject conflicting definitions. An edit action requires an existing resource and must reject an empty edit.
- Validate library-defined closed vocabularies such as channels and types.
- Treat user-defined IDs as names: validate their basic form, uniqueness when creating, and existence when referencing rather than checking them against a library vocabulary.
- Infer layout coordinates from Canvas or plot bounds when possible instead of requiring raw x/y values. Do not make non-overlap a global invariant; individual actions and explicit user options may intentionally produce overlapping graphics.
- Do not create placeholder semantic or graphical components for omitted optional content. Create optional subtitles, borders, backgrounds, and similar components only when they are actually requested or inferred as present.

## Actions and Trace

- Define every authoring action through the shared `action()` wrapper.
- Treat every `materialize*` and `rematerialize*` method as an internal wrapped action, not as a public direct-call API or an authoring primitive. The public domain action that owns the affected semantic resource must invoke it, and the resulting operation must remain visible in the trace.
- Provide an atomic domain action when multiple semantic operations are interdependent and separately authoring them would leave an incomplete or misleading chart state.
- When one public encoding choice requires a companion encoding, let the representative domain action create that companion through a wrapped child action. Keep the companion action available only as an advanced API when ordinary chart authors should not need to coordinate the pair manually.
- Implement an atomic action by orchestrating the existing wrapped child actions that own the relevant validation, inference, and materialization; do not duplicate their behavior inside the aggregate.
- Component actions invoked by higher-level actions must also be wrapped actions when they represent meaningful authoring steps.
- Aggregate actions must orchestrate wrapped child actions instead of duplicating their behavior or hiding meaningful authoring steps inside untraced helpers.
- Keep aggregate actions thin: they may decide child applicability and call order, but inference and validation owned by a child action must remain in that child rather than being reimplemented by the aggregate.
- Do not hide meaningful action decomposition inside untraced helpers.
- Every trace has a virtual `program` root, and nested wrapped calls form its action hierarchy.
- Context updates are part of successful immutable state transitions; they are not separate actions or trace nodes.
- Treat context only as transient convenience for interpreting the next action. Completed semantic meaning and renderable output must be persisted in `semanticSpec` or `graphicSpec`, never only in context.
- Update context through a private immutable helper rather than a public or wrapped `setContext` action.
- When `editSemantic` can infer the current semantic resource from its validated path, high-level actions must rely on that transition instead of duplicating it with `_withContext`.
- Keep trace arguments lightweight. Do not copy large datasets or fully materialized value arrays into the trace.
- When a transform creates a derived dataset for a mark, rebind that mark through an explicit wrapped semantic action so the dependency is visible in the trace. Do not make consumers switch datasets implicitly through context or untraced mutation.

## Tests and Example Programs

- Encode mechanically verifiable architectural rules in focused contract tests rather than relying on prose documentation alone. At minimum, keep selector behavior, public package boundaries, shared concrete-graphic validation, and materialization-plan ordering and deduplication executable.
- Write source code, test descriptions, fixtures, and example-program code in English. Implementation step documents remain in Korean.
- Keep each public user-authored program under `examples/<chart>/program.js`; chart tests must import that same program instead of copying its action chain.
- Keep each chart's primitive baseline, public contract tests, deterministic reference values, and PNG regression together under `test/charts/<chart>/`. Name the explicit primitive chain `primitive.program.js`.
- Organize unit tests by reusable capability under `test/unit/`, not by implementation phase or a mechanically mirrored source tree. Keep cross-cutting architecture invariants under `test/contracts/`.
- When progressively replacing a primitive contract with higher-level actions, preserve the primitive baseline and maintain one evolving high-level action program per chart development cycle. Do not create separate representative program files for every implementation unit unless the user explicitly requests snapshots.
- Require a representative high-level program and its primitive baseline to converge on the same concrete `graphicSpec`, explicit rendering order, and renderer calls when they describe the same chart. Visual similarity alone is not sufficient regression evidence.
- Co-locate each chart's PNG export test as `test/charts/<chart>/png.render.js`; write generated images to the gitignored `.artifacts/test/png/` directory.
- Use `.test.js` for the normal fast suite and `.render.js` for expensive renderer regressions. Keep both suites explicitly selected by package scripts so helper and program modules are never discovered as tests accidentally.
- When a representative program is intended to demonstrate primitive usage, write one explicit method chain and do not hide primitive calls behind batching helpers or other syntactic sugar.
- Keep the user program focused on realistic library usage. Assertions, mocks, and test-only inspection belong in the importing test file rather than in the user program.
- For every high-level user-facing action, test its shortest valid call after the required prerequisites are present so the default API does not become progressively more verbose.
- Complete each chart development cycle with one public vertical slice whose browser example, standalone user program, acceptance test, PNG regression, and tutorial use the same chart-authoring API flow.
- Verify browser Canvas and PNG output separately. Browser checks must cover logical Canvas dimensions and console/page errors; PNG checks must cover `pixelRatio` and physical output dimensions.
- Establish deterministic numeric fixtures for statistical transforms before relying on graphical or PNG verification. Test quantities such as coefficients, confidence bounds, sample positions, and density values independently from their materialization.

## Semantic and Graphical Boundary

- `semanticSpec` records what the chart means; `graphicSpec` records the concrete graphical result.
- The action that first introduces a semantic concept owns its inference, validation, and storage. Downstream actions must read the stored decision rather than silently creating, repairing, or re-inferring missing semantic state.
- Persist every inferred semantic decision, including resolved resource IDs and types, in `semanticSpec`; do not leave a resolved decision only in context or an implementation-local value.
- A semantic point mark may be realized by a graphical `circle` primitive.
- Compute aggregate scale domains at the final visual grouping grain. For example, grouped bars use one aggregate per x/category cell rather than an earlier aggregate that ignores the grouping field.
- A constant point shape is graphical appearance, while a field-driven shape is semantic encoding that must be explicitly materialized.
- User-specified scale domains and ranges are semantic. Resolved primitive values such as x, y, radius, and color are graphical.
- Dataset values are immutable after creation; filtering, aggregation, and other data changes must create transforms or derived datasets rather than replace source values.
- Editing a stored transform parameter must create a new deterministic namespaced derived-dataset revision and explicitly rebind its consumers; never overwrite an existing dataset's values. An unreferenced old derived revision may be released from the new program through a visible internal wrapped action, while earlier programs retain it unchanged.
- Canvas properties, themes, fonts, strokes, and other appearance-only values are graphical.
- Keep appearance-only materialization settings such as a grouped-bar band fraction outside `semanticSpec`; store them in immutable graphical configuration and materialize their concrete results into `graphicSpec`.
- Output density such as PNG `pixelRatio` is a renderer option and must not rewrite logical values in `graphicSpec`.
- When a semantic change affects existing concrete output, the responsible domain action must explicitly rematerialize every affected graphical consumer.
- Positional encoding actions own coordinate inference and layer attachment. Guide actions read stored coordinates and must not create or repair them.
- Once scale consumers exist, canvas width, height, or margin edits must explicitly invoke wrapped rematerialization actions for every affected scale, mark, and guide; never leave stale concrete coordinates or rely on automatic compilation.
- Treat concrete rendering order as explicit graphical state rather than an accidental consequence of action call order. Use graphic placement to preserve relationships such as grids behind marks and axes or legends above them.
- Do not synthesize missing categorical combinations as zero values or placeholder graphics unless an explicit semantic completion policy requests them. Materialize only observed groups by default.
- Use one resolved ordinal domain order and its band geometry as the shared source of truth for marks, offsets, ticks, labels, and other positional consumers.
- Design shared guides around their semantic role, such as a categorical legend, and express mark-specific symbols through graphical recipes instead of forking the complete guide implementation by mark type.
- Give each guide type one chart-independent documented default, such as a right-side legend. Alternate placement must come from an explicit public option rather than a different hidden default for each chart type.
- Generic aggregate actions must select only semantic combinations that their child actions currently support. Determine applicability from persisted mark, encoding, scale, and coordinate state rather than from resource presence alone.
- Statistical transforms must record enough provenance to reproduce and interpret their results: the source dataset, transform type, input and output fields, grouping, method, and every resolved parameter or default that affects the derived values.
- Derived-data output order must be deterministic and documented. Unless a transform defines another semantic order, preserve group order by first appearance in the source and use a stable, explicit order within each group.
- Keep statistical computation, semantic data authoring, and graphical materialization separate. Pure grammar modules compute derived values, data actions own transform provenance and derived datasets, and mark actions turn those values into concrete graphics.
- User-facing guide text must not expose generated internal field names when transform provenance can recover the original meaning. Infer titles from source fields and semantic roles such as `Density` rather than names such as `Acceleration_density`.
- Layers that jointly express one visual relationship, such as points, fitted lines, confidence bands, density curves, and their baselines, must use compatible coordinates and shared scales. Convert baselines and bounds through those scales rather than treating semantic values as raw graphical coordinates.
- Layout actions that share reserved space must compute and validate their actual occupied bounds. When the requested title, legend, or similar block does not fit, report a clear layout error instead of silently expanding the Canvas or changing the user's margins.

## Documentation and Implementation Consistency

- Do not leave known contradictions between the implementation and its documentation.
- Documentation updates must always accompany the implementation change they describe and must be included in the same conceptual commit.
- When behavior, APIs, stored structures, or implementation contracts change, update the relevant README or current documentation before considering the change complete.
- Write public-facing files such as `README.md` and pages under `docs/` in English.
- Treat `docs/` as user documentation: prioritize installation, user-facing APIs, observable behavior, examples, and the minimum core concepts users need.
- Organize public documentation through progressive disclosure: getting started and tutorials first, then task-oriented recipes, chart API, advanced chart API, extension API, and finally the canonical action reference. Do not require ordinary chart authors to understand primitive actions or internal architecture before they can produce a chart.
- Give tutorials and recipes distinct roles. Tutorials teach a complete, ordered workflow with explanation; recipes solve one narrowly scoped task with prerequisites, the minimal code, and the expected result. Do not duplicate an entire tutorial as a recipe or scatter one workflow across unrelated pages.
- Every public code sample must be directly runnable in its stated environment. Include the required imports, data-loading assumptions, and invocation context; when a deliberately incomplete excerpt is clearer, label it as a fragment and state its prerequisites explicitly.
- Use one canonical public program for each documented chart and reuse it across the example, tutorial, acceptance test, and generated image whenever those artifacts demonstrate the same workflow. Do not maintain independently copied action chains that can drift.
- Keep one canonical action reference with exact signatures for discovery by users and language models. Every action exported from a public entry point and declared in TypeScript must be classified as chart authoring, advanced chart authoring, or extension authoring and documented in the matching public API section.
- Whenever a public action is added, removed, renamed, reclassified, or changes signature, update its JavaScript export, TypeScript declaration, `docs/reference/actions.md`, relevant API page, examples that use it, and the current scope in `docs/llms.txt` in the same conceptual commit.
- Keep navigation generated from a consistent information architecture. Avoid arbitrary per-page menu exceptions, duplicated catalog entries, or navigation labels that expose repository structure instead of user tasks.
- Treat the built site as the documentation product. Documentation validation must render Jekyll and inspect the resulting HTML, links, assets, and scripts; source-Markdown checks alone are not sufficient.
- Verify documentation interaction changes on desktop and mobile, including keyboard operation, focus behavior, Escape handling, visible labels, and appropriate ARIA state. Mouse-only success is not sufficient.
- Build search indexes from rendered user-visible content. Do not index raw front matter, Liquid templates, source-only directives, or duplicate copies of the same page, and verify that search results route to the canonical page.
- Treat every generated documentation artifact as having one canonical source and one reproducible generator. Regenerate public chart images with `npm run docs:images` and LLM documentation with `npm run docs:llms`; do not hand-edit generated outputs. Validate chart-image freshness through the platform-independent manifest rather than cross-platform PNG byte equality.
- Keep `docs/llms.txt` as a concise routing index and regenerate `docs/llms-full.txt` from the canonical page order with `npm run docs:llms`.
- A documentation change is not complete until Markdown contracts, the Jekyll build, built-link and asset checks, search-index checks, and desktop/mobile browser smoke tests pass.
- Keep unimplemented roadmap ideas out of current API documentation except where a concise limitation is required to explain an accepted value or error.
- Do not exhaustively document internal modules, helper functions, data structures, or implementation mechanics in public docs unless users must understand them to use the library correctly.
- Write each new chart implementation contract in Korean at `agent_docs/impl/chart/<chart-name>.md`. Keep the complete chart description, final user-facing API, important action hierarchy, and stored-result contract readable in that one chart document.
- A phase may contain any number of chart development cycles. Use `agent_docs/impl/phaseN/GOAL.md` and `STEPn.md` flexibly to manage that phase's chart set, shared prerequisites, execution order, integration work, and cleanup; do not impose a fixed mapping between chart cycles and STEP documents.
- Every Phase STEP document must place a `진행 상태` checklist near the beginning and keep it updated. Phase documents should link the chart contracts they coordinate, but must not split one chart's complete specification across STEP files.
- Preserve `agent_docs/INITIAL_ARCHITECTURE.md` as an initial design record unless the user explicitly asks to revise it; it does not need to mirror every later implementation decision.
- Keep historical design references distinct from documentation of the current behavior.

## Action Contract Catalog

- Keep `agent_docs/contract/ACTION_CATALOG.md` as the canonical engineering catalog for every supported direct user-facing action and every public primitive action.
- Keep the lifecycle audit exhaustive: every declared direct action must appear exactly once, and every stable resource without an edit path must remain visibly marked Planned or Proposed.
- Record each action parameter's implementation status, type, required state, accepted values or value partitions, default and inference rules, option interactions, semantic effect, graphical and rendering effect, rematerialization impact, error conditions, and executable coverage evidence.
- Distinguish `Implemented`, `Planned`, and `Proposed` contracts. Only behavior present in the implementation may be marked `Implemented`; only behavior explicitly agreed with the user may be marked `Planned`; unresolved candidates remain `Proposed` and must not appear as current public API.
- Mark a coverage case complete only when a matching executable test exists. Keep missing and partial cases visible rather than estimating a coverage percentage.
- Update the catalog in the same conceptual commit whenever a supported action, parameter, accepted value, default, inference rule, precedence rule, effect, or public/private classification changes.
- Keep the catalog summary synchronized with its detailed action sections, and enforce mechanically verifiable inventory, classification, link, and test-evidence rules through contract tests.

## Change Scope

- Implement one coherent conceptual change at a time.
- After completing and verifying each small coherent conceptual change, commit it and push the current branch before beginning the next change, unless the user explicitly asks otherwise.
- Use a terse commit message that describes that conceptual change, and never include unrelated work in the same commit.
- Do not combine requested work with unrelated large refactors.
- Preserve unrelated user changes and avoid modifying files outside the task's scope.
- Do not introduce speculative abstractions, compatibility layers, or extension points without a present requirement.

## Handling Unclear Design

- Do not silently choose one side when documentation or requirements conflict.
- When a decision is important, difficult to reverse, or likely to affect later public API or schema design, pause the current implementation path and ask the user. State the decision, viable options, and tradeoffs concisely, and do not implement, document, commit, or push work that depends on it until the user responds. When unsure whether a decision is important, treat it as important.
- For minor, reversible details that do not affect public contracts, proceed with the simplest consistent choice and state the assumption.
- Ask the user before making costly or difficult-to-reverse decisions involving public APIs, persisted schemas, or immutability semantics.
- Keep unresolved architectural questions explicit rather than concealing them in implementation details.
- Never resolve ambiguity by silently choosing the first dataset, mark, scale, coordinate, or other named resource. Require an explicit ID whenever the available state does not determine one unique choice.

## Simplicity

- Implement only what the current scope requires.
- Do not add complexity solely for hypothetical future extensibility.
- Extract helpers when they improve clarity, but never at the expense of meaningful action tracing.
- Prefer a clear user-facing domain action over exposing a convenient internal representation.
