# Action contracts

This directory is the engineering source of truth for direct actions, primitives, planned contracts, and internal wrapped-action inventories. Public user documentation remains in `docs/`.

## Find one action

Do not read a large domain contract from beginning to end. Look up the action in
[`ACTION_INDEX.json`](ACTION_INDEX.json), then open its exact `contract.file` and `contract.anchor`. For a visual
overview, use the generated [`ACTION_CATALOG.md`](ACTION_CATALOG.md).

Shared formal types used by those contracts live in [`FORMAL_TYPES.md`](FORMAL_TYPES.md).

## Structure

- `ACTION_INDEX.json`: canonical machine-readable inventory, lifecycle, status, coverage, and contract links.
- `ACTION_CATALOG.md`: generated compact status index. Do not edit it by hand.
- `current/`: one current contract per implemented direct action, grouped by domain.
- `planned/`: accepted or pending future contracts, grouped by capability.
- `internal/`: wrapped actions that may appear in traces but are not direct public actions.

Regenerate the compact index with `npm run contracts:catalog`. Contract tests verify that the manifest, Markdown corpus, public types, runtime inventory, and evidence paths remain synchronized.

## Classification

- **User-facing** actions are declared on the public `ChartProgram` type.
- **Primitives** are `editSemantic`, `createGraphics`, and `editGraphics` for extension authors.
- **Internal wrapped actions** can appear in traces but are neither public direct actions nor primitives.

## Status and coverage

- **Implemented** means the public type, runtime, current contract, and executable evidence exist.
- **Planned** means the contract direction is accepted but is not current public behavior.
- **Proposed** means the design remains unresolved and must not appear as current API.
- **Maybe Future** means the idea is intentionally outside the active proposal queue. It has no accepted
  contract or implementation commitment and may be reconsidered only from a concrete future use case.
- Coverage states are `complete`, `partial`, `missing`, and `not-applicable`. A case is complete only when matching executable evidence exists.

## Lifecycle vocabulary

- **Immutable create-only**: create a new ID instead of mutating data.
- **Mutable resource**: stable identity with create and edit paths.
- **Assignment**: an encoding action assigns or reassigns a property; it does not require a separate `edit*` name.
- **Aggregate create-only**: composes wrapped child actions and is edited through owned children.
- **Stable create-only**: stable identity whose current properties are owned elsewhere.
- **Structural create-only**: replacement and consumer rebinding are safer than partial mutation.
- **Stable resource, edit gap**: independently addressable resource whose edit contract is planned or proposed.
- **Primitive**: low-level semantic or graphic state operation.

## Authoring rules

Each implemented action appears exactly once under `current/` and keeps its purpose, signature, defaults and inference, interactions, state effects, rematerialization effects, errors, formal values, value coverage, future state, and executable evidence together. Shared family behavior may be stated once in the same domain file. Planned values must stay out of current signatures and public docs.
