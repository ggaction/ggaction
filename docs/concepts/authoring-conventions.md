---
layout: default
title: Authoring Conventions
---

# Authoring Conventions

A successful action returns a new `ChartProgram`. Keep that returned value to continue
editing. The earlier program and caller-owned option objects remain unchanged.

<div class="docs-concept-flow" role="img" aria-label="An existing program and one validated action produce a new immutable program while the earlier program remains usable">
<span><strong>Before</strong>immutable program</span><b aria-hidden="true">→</b>
<span><strong>Action</strong>validate the complete request</span><b aria-hidden="true">→</b>
<span><strong>After</strong>new program revision</span>
</div>

## IDs select resource owners

Dataset IDs, semantic mark IDs, scale IDs, coordinates, selections, and composition
child slots identify different resource kinds. A selector's name determines which
kind it addresses; matching text is not a cross-resource lookup. Composite chart
owners reserve deterministic child IDs. Use an explicit unused ID when an inferred
role is already occupied. Do not predict a physical revision suffix and treat it as
an enduring logical owner.

Omission is action-specific. A current compatible resource may resolve the target,
otherwise the action may require one unique compatible candidate. Ambiguity is an
error, not permission to choose the first array entry. Some actions always require
an ID even when only one resource exists.

| Family | Selector | Omitted properties | Explicit replacement/reset | Canonical contract |
| --- | --- | --- | --- | --- |
| Source creation | Optional first `id`; a later dataset needs a new explicit ID | First ID defaults to `data` | Existing source rows cannot be overwritten | [Source data](../api/data/source-and-derived.md) |
| Focused derived editor | Required logical owner or current revision `target` | Preserve omitted top-level transform decisions | Mode-specific nested values replace; supported weighted editors use `weight:false`; unchanged requests reject | [Data revisions](../api/data/revisions-and-removal.md) |
| Generic derived editor | Required `target` | A complete requested `definition` is required | Replace the transform definition; no generic source replacement | [Data revisions](../api/data/revisions-and-removal.md) |
| Scale editor | Generic `id`; focused ID/target rules vary by channel | Preserve compatible existing choices | `domain:"auto"` re-enables inference; type-family changes may require explicit destination domain/range | [Scale options](../api/scales.md) |
| Legend editor | Existing target/channel or stable block identity | Preserve existing legend settings | `title:false` hides a title; categorical order and sample arrays are complete requests | [Legend editing](../api/legends/editing.md) |
| Mark labels | Required label-layer `target` for selection and placement edits | Unrelated label properties stay unchanged | Exactly one of `select`, `selection`, `all:true`; `placement:"auto"` removes the semantic override | [Attached labels](../api/marks/labels.md) |
| Label collision layout | Current or unique complete text mark, or explicit target | Calling the layout again applies its own defaults | Replaces the whole policy; remove it with `removeLabelLayout` | [Collision layout](../api/marks/label-layout.md) |
| Concat children | Explicit stable slot `target`, `before`, or `after` | Insertion without an anchor appends | Replacement changes one child program; reorder lists every current slot exactly once | [Composition editing](../api/composition/editing.md) |
| Facet source | Required complete `program` | Existing facet decisions are retained when compatible | Replace the retained source recipe; children are replayed | [Facet editing](../api/composition/editing.md) |

`undefined`, omission, `false`, `[]`, and `"auto"` are not interchangeable. A reset token
is valid only where its option type declares it. An empty category display map, for
example, stores an explicit empty map; `labelMap:"auto"` removes that map. Do not
apply one editor's merge or no-op policy to every other editor.

## Atomic failure and dependencies

An action validates its complete result before returning it. If it throws, continue
from the earlier program; there is no partially returned chart to repair. For a batch
of channel assignments use [atomic encoding](../recipes/switch-encoding-modes.md).

Derived edits reject live downstream dependencies by default. `dependents:"recompute"`
is an explicit request to rebuild that closure; it is not a general cascade-delete
permission. Data removal reports live owners and reference paths. Remove or rebind
those consumers first, as in [resource removal](../recipes/remove-dependent-resources.md).

## Read sample contracts

A **complete program** includes imports, input data or a named downloaded dataset,
setup, and invocation. A **continuation** starts from the explicitly named earlier
program. **Alternatives** branch from the same base and should not be pasted as
consecutive creations of one owner. An **expected-error** example catches or asserts
the described failure. An API **fragment** is a call pattern with named prerequisites;
it is not a self-contained application.

## Related

[Hierarchical authoring](../tutorials/hierarchical-authoring.md) ·
[ChartProgram and immutability](./chart-program.md) · [Exact actions](../reference/actions.md)
