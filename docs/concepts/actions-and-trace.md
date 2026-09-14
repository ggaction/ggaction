---
layout: default
title: Actions and Trace Trees
---

# Actions and Trace Trees

<div class="docs-concept-flow" role="img" aria-label="A high-level action contains domain actions, which contain primitive semantic and graphical edits">
  <span>createAxes<strong>high level</strong></span>
  <b aria-hidden="true">→</b>
  <span>createXAxis<strong>domain action</strong></span>
  <b aria-hidden="true">→</b>
  <span>createGraphics / editGraphics<strong>primitives</strong></span>
</div>

An action expresses an operation on a chart element, with options describing
the requested design choice. A chart program composes calls in authoring order.
For example, adding a scatterplot, reducing point opacity, and adding guides
are three successive decisions; authors need not write the internal tree.

The trace preserves both views. `program.trace.children` lists the top-level
authored calls in order. Each call's nested `children` records the wrapped
actions it delegated to. A high-level action is high relative to those smaller
decisions, rather than occupying a fixed universal depth:

```text
createAxes
├─ createXAxis
│  ├─ createXAxisLine
│  ├─ createXAxisTicksAndLabels
│  └─ createXAxisTitle
└─ createYAxis
   ├─ createYAxisLine
   ├─ createYAxisTicksAndLabels
   └─ createYAxisTitle
```

The trace is available as `program.trace`. Its root is the virtual `program`
node, and `program.trace.children` contains the top-level authored actions.
Every node contains:

```javascript
{
  id,
  op,
  description,
  args,
  children
}
```

Arguments are summarized so large datasets and materialized arrays are not
duplicated in the trace. For example, dataset values are represented by a
count.

Trace state is immutable and does not affect rendering. It can be traversed as
a normal tree for inspection, explanation, provenance, or recommendation.

## Revisions preserve decisions

Appending `editPointMark({ opacity: 0.35 })` and later
`editPointMark({ opacity: 0.7 })` to the same point chart preserves both decisions;
the later edit of that property supplies the final opacity. Earlier programs
remain usable. Setting `0.7` in the original constructor can produce the same
graphics, but it records an initial choice rather than a later revision.

This ordered precedence applies to repeated edits of the same owned property.
Distinct contracts such as theme defaults, field encodings, and local style
overrides have their own compatibility and precedence rules. Follow the
[hierarchical authoring tutorial](../tutorials/hierarchical-authoring.md) for an
executable high-level chart followed by focused refinements.

Developers can define new wrapped actions with the
[extension API](../extension/action-authoring.md).
