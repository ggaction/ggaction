# Repository Instructions

## Architecture Reference

- Read `agent_docs/INITIAL_ARCHITECTURE.md` before making architectural or implementation decisions.
- Treat it as the starting point and a design reference, not as an infallible or permanently fixed specification.
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
- `editSemantic`, `createGraphics`, and `editGraphics` are internal authoring primitives, not ordinary user-facing APIs.
- Users interact through domain-specific actions.

## User-Facing API Design

- Do not expose raw graphical IDs or raw graphical property paths when a meaningful domain action can represent the operation.
- Public actions accept meaningful option objects, such as `editXAxisLine({ lineWidth: 3 })`.
- Every public action accepts one parameter object and returns a new `ChartProgram`.
- Validate library-defined closed vocabularies such as channels and types.
- Treat user-defined IDs as names: validate their basic form, uniqueness when creating, and existence when referencing rather than checking them against a library vocabulary.

## Actions and Trace

- Define every authoring action through the shared `action()` wrapper.
- Component actions invoked by higher-level actions must also be wrapped actions when they represent meaningful authoring steps.
- Do not hide meaningful action decomposition inside untraced helpers.
- Every trace has a virtual `program` root, and nested wrapped calls form its action hierarchy.
- Context updates are part of successful immutable state transitions; they are not separate actions or trace nodes.
- Keep trace arguments lightweight. Do not copy large datasets or fully materialized value arrays into the trace.

## Semantic and Graphical Boundary

- `semanticSpec` records what the chart means; `graphicSpec` records the concrete graphical result.
- A semantic point mark may be realized by a graphical `circle` primitive.
- User-specified scale domains and ranges are semantic. Resolved primitive values such as x, y, radius, and color are graphical.
- Canvas properties, themes, fonts, strokes, and other appearance-only values are graphical.
- When a semantic change affects existing concrete output, the responsible domain action must explicitly rematerialize every affected graphical consumer.

## Documentation and Implementation Consistency

- Do not leave known contradictions between the implementation and its documentation.
- Documentation updates must always accompany the implementation change they describe and must be included in the same conceptual commit.
- When behavior, APIs, stored structures, or implementation contracts change, update the relevant README or current documentation before considering the change complete.
- Write public-facing files such as `README.md` and pages under `docs/` in English.
- Treat `docs/` as user documentation: prioritize installation, user-facing APIs, observable behavior, examples, and the minimum core concepts users need.
- Do not exhaustively document internal modules, helper functions, data structures, or implementation mechanics in public docs unless users must understand them to use the library correctly.
- Write implementation step plans in Korean under `agent_docs/impl/STEP1.md`, `STEP2.md`, `STEP3.md`, and so on.
- Preserve `agent_docs/INITIAL_ARCHITECTURE.md` as an initial design record unless the user explicitly asks to revise it; it does not need to mirror every later implementation decision.
- Keep historical design references distinct from documentation of the current behavior.

## Change Scope

- Implement one coherent conceptual change at a time.
- After completing and verifying each small coherent conceptual change, commit it and push the current branch before beginning the next change, unless the user explicitly asks otherwise.
- Use a terse commit message that describes that conceptual change, and never include unrelated work in the same commit.
- Do not combine requested work with unrelated large refactors.
- Preserve unrelated user changes and avoid modifying files outside the task's scope.
- Do not introduce speculative abstractions, compatibility layers, or extension points without a present requirement.

## Handling Unclear Design

- Do not silently choose one side when documentation or requirements conflict.
- For minor, reversible details that do not affect public contracts, proceed with the simplest consistent choice and state the assumption.
- Ask the user before making costly or difficult-to-reverse decisions involving public APIs, persisted schemas, or immutability semantics.
- Keep unresolved architectural questions explicit rather than concealing them in implementation details.

## Simplicity

- Implement only what the current scope requires.
- Do not add complexity solely for hypothetical future extensibility.
- Extract helpers when they improve clarity, but never at the expense of meaningful action tracing.
- Prefer a clear user-facing domain action over exposing a convenient internal representation.
