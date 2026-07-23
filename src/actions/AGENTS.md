# Action Instructions

Apply these instructions to wrapped actions and public authoring APIs in addition to the repository and source instructions.

## Public API Shape

- Maintain three layers: the default chart-authoring API, the public extension/action-authoring API, and private internals.
- The default `ggaction` entry point exposes domain-specific authoring and rendering; `ggaction/extension` exposes `ChartProgram`, `action()`, primitives, and trace inspection; `ggaction/svg` is browser-safe; `ggaction/png` and `ggaction/pdf` are Node-only.
- Name chart-authoring actions after semantic concepts. Keep concrete realizations inside implementations and `graphicSpec`.
- Every public action accepts one meaningful option object and returns a new `ChartProgram`.
- Prefer domain actions over raw graphic IDs or property paths. Keep sibling implementation components behind one facade unless each has an independent authoring use case.
- Compare the nearest action families before adding a parameter or call pattern. Reuse established channel vocabulary, option semantics, precedence, and inference for the same user decision.
- Require only decisions that cannot be inferred safely. Resolve omissions in this order: explicit option, unique stored-state inference, documented default, then a clear ambiguity or missing-input error.
- Design and test the shortest unambiguous call first. Persist inferred IDs, types, encodings, grouping, scales, and coordinates in semantic state.
- Never silently select the first eligible resource. Explicit targets win; otherwise use the current unique eligible resource, then one unique eligible resource, and reject ambiguity.
- Ordinary create actions may omit an ID only for one documented deterministic role. Never invent numbered public IDs; require an explicit ID when the role is no longer unique.
- Keep compatible mark and encoding authoring order-independent. Preserve incomplete but valid semantic assignments without placeholder graphics, register their materialization intent, and materialize when prerequisites become complete.
- For a new or derived layer, infer compatible data, coordinate, position encodings, scale IDs, grouping, and grain-preserving policies from its eligible source. Reject mixed coordinate families, ambiguous sources, and unsupported topology-changing policies.
- Use omission, `{}`, and `false` consistently in aggregate APIs: infer applicability, explicitly enable with inferred details, and explicitly disable, respectively.
- Use omission, `"auto"`, and an explicitly supported `undefined` consistently for preserving, resetting to inference, and removing optional state.
- Validate closed library vocabularies. Treat user IDs as names whose form, creation uniqueness, and reference existence are validated rather than matched against a library vocabulary.
- Treat documented defaults and inference as public contracts. Update their owning current contract, declarations, docs, and tests with the implementation.

## Lifecycle and Atomicity

- Classify each direct public action in the action catalog. Do not assume every `create*` action needs a mechanical `edit*` counterpart.
- A stable addressable resource needs either a supported edit path or an explicit cataloged gap. Aggregate actions remain create-only when child actions own the editable resources.
- Structural resource edits require complete compatibility preflight and deterministic dependent rematerialization. Reject an edit before state changes when the resource-specific contract cannot guarantee both.
- A create action requires a missing resource unless documented idempotence accepts an equivalent definition; conflicting definitions fail. An edit requires an existing resource and rejects an empty edit.
- Validate the complete proposed state and every affected consumer before the first state-changing child action. A rejected aggregate must leave no partial state or trace branch.
- Do not create optional datasets, semantic branches, configs, graphics, or trace children unless the option is enabled, applicable, and non-empty.
- Validate mark-specific appearance against the resolved mark recipe before changing state; never silently ignore an inapplicable option.

## Action and Trace Semantics

- Define every authoring action through `action()`. Meaningful nested authoring steps, including materialization and rematerialization, remain wrapped and visible in the trace.
- Keep aggregate actions thin: preflight applicability and conflicts, then orchestrate the existing child actions that own validation, inference, and materialization.
- Provide an atomic domain action when separate calls would leave an incomplete or misleading semantic result. Companion operations must remain wrapped children rather than duplicated hidden logic.
- Every trace has a virtual `program` root; nested wrapped calls form its hierarchy. Keep trace arguments lightweight and never copy large data or materialized arrays into them.
- Context is private transient convenience, not semantic state and not an action. Update it immutably; persist every completed decision in `semanticSpec` or `graphicSpec`.
- Rely on primitive transitions such as `editSemantic` to update inferable current-resource context instead of duplicating that update in high-level actions.
- Rebind a consumer to a derived dataset through an explicit wrapped semantic action so the dependency is visible.
- Encourage extension authors to subclass `ChartProgram` rather than modifying the shared prototype.

## Domain Contracts

- Read the owning file under `agent_docs/contract/current/` before changing a domain action. Exact scale-edit atomicity, distribution-chart roles, mark inheritance, selection grammar, guide lifecycle, and other feature-specific behavior belong there.
