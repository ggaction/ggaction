# Extension Authoring Knowledge

## Purpose and authority

This is the compact, installed guide for LLM agents that build extension
packages against this copy of ggaction. It is ordinary package knowledge, not
an `AGENTS.md` file, so an extension repository must explicitly tell its agent
to read it.

Use the version in [`package.json`](../package.json) as the compatibility
baseline. For exact current behavior, the installed runtime and declarations
take precedence over this guide. Do not substitute behavior from the mutable
GitHub default branch, a roadmap, or a different installed version.

## Minimum intake

Before proposing or implementing an extension action:

1. Read [`types/extension.d.ts`](../types/extension.d.ts) and
   [`src/extension.js`](../src/extension.js) to confirm the installed public
   extension entry point.
2. Search [`action-cards.json`](./action-cards.json) for actions whose names,
   intents, owned resources, or prerequisites overlap the requested feature.
   Read only relevant cards instead of loading the complete catalog into the
   working context.
3. Inspect the installed declaration and source for each reuse candidate when
   the action card does not settle a signature, default, error, ownership, or
   interaction question.
4. Record in the extension specification which ggaction actions are reused,
   which domain behavior remains new, and the installed ggaction version used
   for that decision.

[`task-resolver.js`](./task-resolver.js) may help decompose a concrete chart
request into current built-in actions. Its result is chart-authoring guidance,
not authority for extension APIs or unsupported core behavior.

## Design from the feature, then the actions

Start with the visualization the extension must make possible and its accepted
data. Derive action boundaries only after that feature contract is clear.

- Reuse a current public action when it already owns the required behavior.
- Compose public domain actions for existing chart resources instead of
  recreating their scale, guide, layout, mark, transform, or renderer logic.
- Add an extension action only for domain behavior that current actions cannot
  express coherently.
- Use extension primitives only inside a domain action that owns the resulting
  semantic and graphical lifecycle. Primitives are not a replacement chart
  authoring surface.
- Never call private helpers or internal wrapped actions from an extension.
- Require an explicit resource ID when existing state does not identify one
  unique dataset, mark, scale, coordinate, guide, or graphic.

## Core model

- `ChartProgram` is immutable. Return a new program and preserve earlier
  programs and caller-owned input.
- `semanticSpec` records chart meaning. Fully materialized, backend-neutral
  `graphicSpec` records concrete output.
- A semantic edit does not compile into graphics automatically. The owning
  domain action must invoke every graphical operation required by its semantic
  change.
- Renderers consume `graphicSpec`; extension state must not contain
  renderer-specific objects or commands.
- A user-visible extension action should form one meaningful trace subtree.
  Lower-level wrapped calls belong beneath it.

## Current action-authoring boundary

Import `action` and `ChartProgram` from `ggaction/extension`. Isolate an
extension by subclassing `ChartProgram`; do not assign independent extension
methods to the shared base prototype.

Every wrapped action:

- has a stable, non-empty `op` and `description`;
- accepts one plain options object;
- runs with the entered immutable program as `this`;
- returns an instance of the same `ChartProgram` subclass; and
- leaves a successful result with an empty action stack.

For strict TypeScript, connect each prototype method to its wrapped action type
through interface declaration merging. Confirm the exact generic and return
types in the installed [`types/extension.d.ts`](../types/extension.d.ts)
instead of copying a signature from another version.

The low-level primitives available through `ChartProgram` are:

- `editSemantic` for a supported semantic path;
- `createGraphics` for backend-neutral graphic identity and hierarchy; and
- `editGraphics` for concrete graphic values or removal.

Use the installed declarations and validation behavior to determine supported
paths, graphic types, properties, and values. Do not invent opaque semantic
branches, graphic properties, renderer instructions, or automatic
materialization.

## Upstream decision boundary

Stop extension implementation and propose a ggaction core change when the
feature requires any of the following:

- a semantic path or persisted value the installed core rejects;
- a new shared graphic primitive or renderer capability;
- access to a private or internal action;
- a change to immutable state, trace, materialization, or renderer boundaries;
- a new public extension registration or composition mechanism; or
- behavior that would be duplicated inconsistently across extensions.

Keep that core proposal separate from the extension implementation. Do not hide
the missing core contract behind monkey-patching, source-relative imports,
renderer-specific state, or copied internal code.

## Required evidence

For each new public extension action, verify at least:

- the public package entry works from an installed-package consumer;
- strict TypeScript sees the exact action method and preserves its subclass;
- earlier programs and caller-owned input remain unchanged;
- semantic and graphic state match the feature specification;
- the trace has the intended root action and wrapped children;
- failures are deterministic and explain how to correct invalid or ambiguous
  input; and
- representative rendering succeeds in every renderer the extension claims to
  support.

Keep the extension specification, implementation, declarations, package
exports, tests, examples, and user documentation synchronized as one
user-facing change.
