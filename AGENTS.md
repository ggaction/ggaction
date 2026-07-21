# Repository Instructions

## Instruction Hierarchy

- Always apply this root file, then every scoped `AGENTS.md` from the repository root to each file being changed.
- For generators, validators, package entry points, and behavior described outside their owning directory, also apply the scope of the generated or user-facing target.
- `src/AGENTS.md` owns library-source routing; `test/AGENTS.md` owns tests and examples; `docs/AGENTS.md` owns public documentation; `agent_docs/AGENTS.md` owns architecture, roadmap, and action-contract records.
- A cross-area change applies every relevant scope. Every durable rule has one canonical owner and is linked rather than copied elsewhere.

## Architecture References

- Before changing module ownership, state boundaries, materialization flow, renderer boundaries, or package boundaries, read `agent_docs/SECOND_ARCHITECTURE.md`.
- Treat `agent_docs/INITIAL_ARCHITECTURE.md` as historical design context; consult it when original intent or a conflict with the current architecture is relevant rather than loading it for ordinary implementation work.
- Exact current action behavior belongs to `agent_docs/contract/current/` and `ACTION_INDEX.json`, not to architecture prose or instruction files.
- Update `SECOND_ARCHITECTURE.md` when a deliberate change alters module ownership, state boundaries, materialization flow, renderer boundaries, or package boundaries.
- Discuss material changes to public APIs, persisted schemas, or core architecture with the user before implementing them.

## Core Invariants

- Keep ggaction terminology source-neutral. Do not retain external chart-library brand names in APIs, implementation, tests, errors, links, contracts, or public docs; literal reference-data values are exempt.
- `ChartProgram` is immutable. Structurally copy every changed path and never mutate an earlier program or caller-owned input.
- `semanticSpec` records chart meaning; fully materialized backend-neutral `graphicSpec` records concrete output; renderers read only `graphicSpec`.
- There is no automatic semantic-to-graphic compiler. Every domain action explicitly invokes the graphical materialization required by its semantic changes.
- Keep `editSemantic`, `createGraphics`, and `editGraphics` as public extension primitives rather than the ordinary chart-authoring API. Ordinary users author through domain actions.
- Express semantic removal through `editSemantic({ property, remove: true })` and top-level graphic removal through `editGraphics({ target, remove: true })`; domain actions compose these primitives.
- Keep source, tests, declarations, current contracts, public docs, generated references, and examples synchronized as one user-facing change surface.

## Development Workflow

- Implement one coherent conceptual change at a time and preserve unrelated user work.
- After each verified conceptual change, commit it with a terse message and push the current branch before starting the next, unless the user explicitly requests otherwise.
- Treat every approval Gate as a remote reproducible checkpoint: commit and push the complete verified Gate package before requesting approval.
- PR creation, package publishing, and documentation deployment require separate authorization. Documentation deployment and package publishing use the exact approved release commit or tag.
- Do not combine requested work with unrelated refactors or introduce speculative abstractions, compatibility layers, or extension points without a present requirement.
- Add durable user-emphasized principles to the narrowest applicable `AGENTS.md`; never add temporary task details, workaround notes, or duplicated contract prose.
- Surface and resolve conflicts between existing and new instructions instead of silently replacing either rule.

## Decisions and Simplicity

- For important, difficult-to-reverse, or public-contract decisions, pause before dependent implementation, summarize viable options and tradeoffs, and ask the user.
- For minor reversible details outside public contracts, choose the simplest consistent option and state the assumption.
- Never resolve ambiguity by silently choosing the first dataset, mark, scale, coordinate, or named resource. Require an explicit ID when stored state does not determine one unique candidate.
- Keep unresolved architectural questions explicit rather than hiding them in implementation details.
- Implement only current scope. Prefer clear domain actions and small responsible helpers while preserving meaningful action trace decomposition.
