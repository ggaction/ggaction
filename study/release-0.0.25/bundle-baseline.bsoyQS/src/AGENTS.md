# Source Instructions

Apply these instructions to library source, public package entry points, and source-facing declarations in addition to the repository root instructions.

## Scoped Source Instructions

- Read `src/actions/AGENTS.md` for public or internal wrapped actions, API inference, action lifecycle, context, and trace behavior.
- Read `src/grammar/AGENTS.md` for pure semantic, scale, coordinate, transform, and statistical computation.
- Read `src/materialization/AGENTS.md` for semantic-to-graphic realization, rematerialization, selection realization, and concrete graphic reconciliation.
- Read `src/layout/AGENTS.md` for Canvas bounds, guides, titles, facets, composition, and collision handling.
- Read `src/renderers/AGENTS.md` for Canvas rendering, backend behavior, and output adapters.
- A source change spanning several areas must apply every relevant nested file. Keep each rule in one canonical scope.

## Source-Wide Boundaries

- Organize modules by stable reusable responsibility, never by the chart example, roadmap, Phase, or Gate that first required them.
- Give every cross-cutting contract one owner. Shared defaults, vocabularies, selectors, validation, compatibility, projections, and dispatch policies must be defined once and reused.
- Route named-resource identity lookup and required-resource errors through shared selectors. Keep behavior-based capability queries with the owning capability.
- Keep wrapped action orchestration separate from pure grammar, layout, materialization, and renderer calculations. Pure modules must not mutate a program or create trace nodes.
- Preserve explicit boundaries between semantic computation, concrete graphical materialization, and renderer execution.
- Store each state decision once. Derived aliases must be read-only; counters and bookkeeping must remain private or non-enumerable.
- Namespace repeatable generated resources from the owning user resource and semantic role. Reserve stable global IDs for structurally singular resources only.
- Extract shared behavior into the smallest responsible capability module, not a chart-specific utility bucket.
- Keep mark, channel, coordinate, curve, and consumer compatibility in shared policy owners rather than scattered conditionals.
- Keep all public JavaScript entry points synchronized with TypeScript declarations, package exports, documentation contracts, and package-boundary tests.
- Keep Node-only dependencies behind Node-only entry points, and respect supported package entry points in internal cross-package imports.
- Do not expose private parsing, structural-copy, validation, dispatch, raw graphic IDs, or raw graphic paths when a domain action owns the decision.

## Canonical Behavioral Records

- `agent_docs/SECOND_ARCHITECTURE.md` owns the current macro architecture and state-flow explanation.
- `agent_docs/contract/ACTION_INDEX.json` and `agent_docs/contract/current/` own exact current action lifecycles, parameters, defaults, inference, effects, supported values, and domain-specific behavior.
- Read the owning current contract before changing a public action or domain behavior. When observable behavior changes, update that contract in the same verified implementation checkpoint. Keep unimplemented proposals outside Current. When restoring already-documented behavior, preserve the contract unless it contains an actual error or omission; never copy exact behavior into an `AGENTS.md` file.
- Mechanically enforce package boundaries, selectors, validation, compatibility, rematerialization plans, and other executable invariants in tests; AGENTS files remain decision guidance rather than a second contract catalog.
