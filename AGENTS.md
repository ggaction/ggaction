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
- `editSemantic`, `createGraphics`, and `editGraphics` are low-level authoring primitives exposed through the public extension layer, not the ordinary chart-authoring API.
- Users interact through domain-specific actions.

## User-Facing API Design

- Maintain three clear layers: the default Chart Authoring API, the public Action Authoring API, and private library internals.
- The default `ggaction` entry point serves chart authors through domain-specific actions and rendering.
- The `ggaction/extension` entry point serves action authors through `ChartProgram`, `action()`, primitive actions, and trace inspection.
- The Node-only `ggaction/png` entry point exports completed programs without adding Node dependencies to the browser entry point.
- Encourage extension authors to subclass `ChartProgram` instead of modifying the shared base prototype, so independently authored extensions do not collide.
- Do not expose private path-parsing, structural-copy, validation, or rendering-dispatch helpers through public entry points.
- Do not expose raw graphical IDs or raw graphical property paths when a meaningful domain action can represent the operation.
- Name chart-authoring actions after semantic concepts such as `createPointMark`; keep concrete realizations such as `circle` inside action implementations and `graphicSpec`.
- Public actions accept meaningful option objects, such as `editXAxisLine({ lineWidth: 3 })`.
- Every public action accepts one parameter object and returns a new `ChartProgram`.
- Keep create and edit contracts consistent. A create action requires a missing resource, may treat an equivalent repeated definition as idempotent when explicitly intended, and must reject conflicting definitions. An edit action requires an existing resource and must reject an empty edit.
- Validate library-defined closed vocabularies such as channels and types.
- Treat user-defined IDs as names: validate their basic form, uniqueness when creating, and existence when referencing rather than checking them against a library vocabulary.

## Actions and Trace

- Define every authoring action through the shared `action()` wrapper.
- Component actions invoked by higher-level actions must also be wrapped actions when they represent meaningful authoring steps.
- Aggregate actions must orchestrate wrapped child actions instead of duplicating their behavior or hiding meaningful authoring steps inside untraced helpers.
- Do not hide meaningful action decomposition inside untraced helpers.
- Every trace has a virtual `program` root, and nested wrapped calls form its action hierarchy.
- Context updates are part of successful immutable state transitions; they are not separate actions or trace nodes.
- Treat context only as transient convenience for interpreting the next action. Completed semantic meaning and renderable output must be persisted in `semanticSpec` or `graphicSpec`, never only in context.
- Update context through a private immutable helper rather than a public or wrapped `setContext` action.
- When `editSemantic` can infer the current semantic resource from its validated path, high-level actions must rely on that transition instead of duplicating it with `_withContext`.
- Keep trace arguments lightweight. Do not copy large datasets or fully materialized value arrays into the trace.

## Tests and Example Programs

- Write source code, test descriptions, fixtures, and example-program code in English. Implementation step documents remain in Korean.
- Keep representative user-authored programs in separate files under `test/programs/` and execute those files from acceptance tests.
- When progressively replacing a primitive contract with higher-level actions, preserve the earlier representative program and its tests. Copy it into a new progression program and apply the new abstraction only there.
- Pair each representative program with a PNG export test under `test/render/`; write generated images to the gitignored `test/output/` directory.
- When a representative program is intended to demonstrate primitive usage, write one explicit method chain and do not hide primitive calls behind batching helpers or other syntactic sugar.
- Keep the user program focused on realistic library usage. Assertions, mocks, and test-only inspection belong in the importing test file rather than in the user program.

## Semantic and Graphical Boundary

- `semanticSpec` records what the chart means; `graphicSpec` records the concrete graphical result.
- The action that first introduces a semantic concept owns its inference, validation, and storage. Downstream actions must read the stored decision rather than silently creating, repairing, or re-inferring missing semantic state.
- Persist every inferred semantic decision, including resolved resource IDs and types, in `semanticSpec`; do not leave a resolved decision only in context or an implementation-local value.
- A semantic point mark may be realized by a graphical `circle` primitive.
- A constant point shape is graphical appearance, while a field-driven shape is semantic encoding that must be explicitly materialized.
- User-specified scale domains and ranges are semantic. Resolved primitive values such as x, y, radius, and color are graphical.
- Dataset values are immutable after creation; filtering, aggregation, and other data changes must create transforms or derived datasets rather than replace source values.
- Canvas properties, themes, fonts, strokes, and other appearance-only values are graphical.
- Output density such as PNG `pixelRatio` is a renderer option and must not rewrite logical values in `graphicSpec`.
- When a semantic change affects existing concrete output, the responsible domain action must explicitly rematerialize every affected graphical consumer.
- Positional encoding actions own coordinate inference and layer attachment. Guide actions read stored coordinates and must not create or repair them.
- Once scale consumers exist, canvas width, height, or margin edits must explicitly invoke wrapped rematerialization actions for every affected scale, mark, and guide; never leave stale concrete coordinates or rely on automatic compilation.

## Documentation and Implementation Consistency

- Do not leave known contradictions between the implementation and its documentation.
- Documentation updates must always accompany the implementation change they describe and must be included in the same conceptual commit.
- When behavior, APIs, stored structures, or implementation contracts change, update the relevant README or current documentation before considering the change complete.
- Write public-facing files such as `README.md` and pages under `docs/` in English.
- Treat `docs/` as user documentation: prioritize installation, user-facing APIs, observable behavior, examples, and the minimum core concepts users need.
- Organize public documentation by audience and task: getting started and tutorials first, then chart API, advanced chart API, and extension API. Keep one canonical action reference with exact signatures for discovery by users and language models.
- Whenever a public action is added, removed, renamed, or changes signature, update `docs/reference/actions.md`, its relevant API page, and the current scope in `docs/llms.txt` in the same conceptual commit.
- Keep unimplemented roadmap ideas out of current API documentation except where a concise limitation is required to explain an accepted value or error.
- Do not exhaustively document internal modules, helper functions, data structures, or implementation mechanics in public docs unless users must understand them to use the library correctly.
- Group implementation step plans by phase under paths such as `agent_docs/impl/phase1/STEP1.md` and `agent_docs/impl/phase2/STEP1.md`. Write every STEP document in Korean.
- Every STEP document must place a `진행 상태` checklist near the beginning, immediately after the goal, and keep it updated as each implementation unit is completed.
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
- Never resolve ambiguity by silently choosing the first dataset, mark, scale, coordinate, or other named resource. Require an explicit ID whenever the available state does not determine one unique choice.

## Simplicity

- Implement only what the current scope requires.
- Do not add complexity solely for hypothetical future extensibility.
- Extract helpers when they improve clarity, but never at the expense of meaningful action tracing.
- Prefer a clear user-facing domain action over exposing a convenient internal representation.
