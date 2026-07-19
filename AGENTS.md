# Repository Instructions

## Scoped Instructions

- Always apply this root file.
- Also read and apply `src/AGENTS.md` when changing library source or public package entry points.
- Also read and apply `test/AGENTS.md` when changing tests, fixtures, examples, generated chart artifacts, or test infrastructure.
- Also read and apply `docs/AGENTS.md` when changing `docs/`, `README.md`, public documentation generators, or behavior that public documentation describes.
- Also read and apply `agent_docs/AGENTS.md` when changing architecture records, implementation plans, roadmaps, action contracts, or the public action surface.
- For a change spanning multiple areas, apply every relevant scoped file. A rule must have one canonical owner; do not copy it into another scope.

## Architecture Reference

- Read `agent_docs/INITIAL_ARCHITECTURE.md` before making architectural or implementation decisions.
- Also read `agent_docs/SECOND_ARCHITECTURE.md`, which records the current implemented architecture after the initial chart phases and takes precedence when it differs from the initial design reference.
- Treat `INITIAL_ARCHITECTURE.md` as the starting point and a design reference, not as an infallible or permanently fixed specification.
- Treat `SECOND_ARCHITECTURE.md` as the current architectural baseline. Update it when a deliberate architectural change alters module ownership, state boundaries, materialization flow, rendering boundaries, or public package boundaries.
- Prefer a simpler or more internally consistent design when implementation evidence supports it.
- Discuss material changes to the public API, stored schemas, or core architecture with the user before committing to them.

## Maintaining These Instructions

- Add durable implementation principles emphasized by the user to the most specific applicable `AGENTS.md` file as they emerge during development.
- Treat source, tests, public documentation, generated public references, and public examples as one continuous change
  surface. When user-facing behavior changes, update `docs/`, `README.md`, affected examples, declarations, and executable
  documentation checks during the same development phase. Documentation deployment and package publishing remain
  release-scoped and must use the exact approved release commit or tag.
- Do not add one-off task details, temporary workarounds, or narrow implementation notes to instruction files.
- If a new instruction conflicts with an existing one, surface and resolve the conflict instead of silently replacing either rule.

## Core Architectural Invariants

- Keep ggaction terminology source-neutral. Do not retain external chart-library brand names in API identifiers, implementation code, tests, errors, links, contracts, or public documentation. Literal values inside reference datasets are exempt.
- `ChartProgram` is immutable. Every update must structurally copy the modified path and must not mutate an earlier program or caller-owned input.
- The renderer reads only the fully materialized, backend-neutral `graphicSpec`.
- There is no automatic compiler from `semanticSpec` to `graphicSpec`.
- Every domain action must explicitly define and invoke the graphical materialization required by its semantic changes.
- `editSemantic`, `createGraphics`, and `editGraphics` are low-level authoring primitives exposed through the public extension layer, not the ordinary chart-authoring API.
- Express semantic branch removal through `editSemantic({ property, remove: true })` and top-level graphic removal through `editGraphics({ target, remove: true })`. Domain and internal wrapped actions must compose these primitives instead of directly cloning semantic or graphic state; private materialization-config cleanup must use the canonical structural removal helper.
- Users interact through domain-specific actions.

## Change Scope

- Implement one coherent conceptual change at a time.
- After completing and verifying each small coherent conceptual change, commit it and push the current branch before beginning the next change, unless the user explicitly asks otherwise.
- Treat an approval Gate as a mandatory repository checkpoint: before requesting approval, commit and push every verified change in the Gate package so the reviewed source, tests, docs, and evidence share one remote commit. PR creation, package publishing, and documentation deployment still require separate user authorization.
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
