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

Every chart-authoring method is an action. Calling a high-level action records
that action and any wrapped actions it invokes as children.

<a href="{{ '/demos/action-trace/' | relative_url }}">Open the interactive
action-trace demo</a> to step through five immutable versions of one chart while
watching its resources and trace tree change.

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

Developers can define new wrapped actions with the
[extension API](../extension/action-authoring.md).
