---
layout: default
title: Actions and Trace Trees
---

[Documentation home](../index.md) · [Action authoring](../extension/action-authoring.md)

# Actions and Trace Trees

Every chart-authoring method is an action. Calling a high-level action records
that action and any wrapped actions it invokes as children.

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
node. Every node contains:

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
