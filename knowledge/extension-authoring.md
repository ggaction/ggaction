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

## Freeze the executable design before code

Before implementation, record one complete vertical slice in the extension
specification:

- the accepted input forms, canonical domain representation, and deterministic
  conversions between them;
- the shortest complete public program that demonstrates the feature;
- an ordered action hierarchy that distinguishes reused public actions from new
  extension actions and records conditional children;
- the canonical owner of every semantic value, derived resource, and graphic;
  and
- the expected create, repeat, edit, remove, data-change, and relevant
  Canvas/scale lifecycle.

Do not begin dependent implementation while the slice still requires an
unresolved core primitive, renderer capability, semantic path, ownership rule,
or composition mechanism. Keep that requirement as an explicit upstream
decision instead of inventing a local substitute.

## Composition and ownership

A high-level extension action must call a reusable public action when that
action owns the required validation, inference, state, or materialization. Do
not flatten an action hierarchy into copied validators, name matching, or
parallel state updates. The parent should remain thin and its meaningful child
calls should appear in deterministic trace order.

Give each capability one canonical resolver and one canonical state owner.
Store requested, inferred, and default values where downstream consumers can
trace them; do not duplicate the same semantic fact in several resources.
Omitted targets may resolve only from an explicit current owner or one unique
compatible owner. Missing and ambiguous ownership are different errors, and
neither permits selecting the first candidate.

Type-checking an action hierarchy is not runtime closure. Exercise the complete
program with representative data so that every prerequisite, target, derived
resource, guide, and renderer route is real and connected.

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

## Lifecycle and atomic failure

Validate a normalized complete candidate and every affected downstream
consumer before returning the first changed program. A rejected action must
preserve the earlier program, trace, semantic and graphic state, caller-owned
options, and source rows.

When a supported semantic revision changes graphical output, the owning action
must rebind every affected consumer, rematerialize each required resource once,
and remove only resources that are truly orphaned. Repeated calls must not
accumulate geometry, duplicate resources, or revive state removed by an earlier
action. Removal must clear owned semantic, graphic, guide, selection, highlight,
and convenience context that would otherwise become stale.

If the public extension boundary cannot express a required rebind,
rematerialization, or safe release, stop at the upstream decision boundary.
Do not reproduce private lifecycle machinery inside the extension.

## Primitive oracle and visual acceptance

For new visual behavior, first build one readable primitive baseline. Reuse
existing public data, mark, encoding, scale, guide, layout, and renderer actions;
use extension primitives only for the behavior that is genuinely missing.
Keep pure geometry or statistical expectations in an independent literal
oracle rather than copying the production implementation.

The final public extension program and its primitive baseline must converge on
the same semantic result, concrete `graphicSpec`, drawing order, and applicable
renderer calls. For one representative contract, compare decoded pixels when
the renderer permits deterministic raster evidence. A renderer completing
without throwing is not sufficient: also assert item cardinality, finite
geometry, topology, bounds, clipping, and value-to-geometry invariants.

When a feature introduces a new appearance or layout, treat representative
visual review as a separate acceptance gate. Structural tests cannot decide
whether spacing, alignment, hierarchy, or readability matches the intended
visual contract.

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

## LLM working discipline

- Read the installed compact knowledge needed for the current feature; do not
  preload complete documentation or copy rules from historical roadmaps.
- When using the task resolver, submit only the exact user request. Do not add
  dataset contents or code scaffolding to the query.
- Make specifications and examples executable without guesswork: include exact
  public imports, program construction, data and Canvas prerequisites,
  immutable chaining or reassignment, and the requested renderer call.
- Treat a known unsupported capability as terminal. Keep a decision that needs
  user input or a bounded reference read explicitly unresolved; never hide
  either case behind a nearby action or silent partial output.
- Keep failure feedback bounded and actionable. Preserve the original failure
  category while reporting the smallest public correction path.

## Required evidence

For each new public extension action, verify at least:

- the public package entry works from an installed-package consumer;
- strict TypeScript sees the exact action method and preserves its subclass;
- earlier programs and caller-owned input remain unchanged;
- semantic and graphic state match the feature specification;
- the trace has the intended root action and wrapped children;
- the shortest valid call, boundary values, empty or missing input, invalid
  input, ambiguity, repeated calls, supported lifecycle changes, and recovery
  after failure behave explicitly;
- semantic revisions leave no stale binding, graphic, guide, context, or
  duplicate resource;
- a primitive baseline and public extension program satisfy their declared
  semantic, graphic, order, renderer-call, and representative visual parity;
- failures are deterministic and explain how to correct invalid or ambiguous
  input; and
- representative rendering succeeds in every renderer the extension claims to
  support.

Keep the extension specification, implementation, declarations, package
exports, tests, examples, and user documentation synchronized as one
user-facing change.
