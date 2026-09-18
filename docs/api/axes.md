---
layout: default
title: Axes
---

# Axes

{% include chart-example.html id="scatterplot" lead=true %}

## At a glance

| Action | Shortest call | Inference/defaults | Result |
| --- | --- | --- | --- |
| `createAxes` | `createAxes()` | Stored coordinate family, position scales, titles | Complete x/y, theta/radius, or Parallel dimension axes |
| `editXAxis` | `editXAxis({ ticks: false })` | Existing x-axis components | Selected components edited or removed |
| `editYAxis` | `editYAxis({ position: "right" })` | Existing y-axis components | Retained components moved together |
| `removeXAxis` / `removeYAxis` | `removeXAxis()` | Existing complete axis | Semantic, graphic, and stored axis state removed |

Cartesian axis lines, ticks, labels and titles must not overlap a chart title or
legend on the same edge. This applies to creation, focused and whole-axis edits,
and Canvas or scale updates, regardless of authoring order. Increase the margin
or change offsets when space is insufficient; a failed action preserves the
earlier program.

## Standalone Cartesian axes

An axis does not need an invisible mark or dataset. Supply an existing Cartesian
coordinate and a scale with an explicit domain:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const ruler = chart().createCanvas({ margin: 80 })
  .createCoordinate({ id: "frame", type: "cartesian" })
  .createScale({ id: "amount", type: "linear", domain: [0, 100] })
  .createXAxis({ coordinate: "frame", scale: "amount" });
```

The title defaults to the scale ID. Set `title: false` to omit it or use
`title: { text: "Amount" }`. Both resource IDs are required for standalone
creation; an automatic domain needs data consumers. Scale edits, Canvas resize,
coordinate frame aspect changes, and serialization preserve the binding.

## Polar component creation

Create a missing Polar axis component without rebuilding the other components.
These actions are available from `ggaction`.

| Component | Theta action | Radial action |
| --- | --- | --- |
| Baseline | `createThetaAxisLine` | `createRadialAxisLine` |
| Tick marks | `createThetaAxisTicks` | `createRadialAxisTicks` |
| Tick text | `createThetaAxisLabels` | `createRadialAxisLabels` |
| Title | `createThetaAxisTitle` | `createRadialAxisTitle` |

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({ width: 480, height: 480, margin: 80 })
  .createData({ values: [
    { direction: 0, distance: 2 },
    { direction: 120, distance: 4 },
    { direction: 240, distance: 6 }
  ] })
  .createPointMark()
  .encodeTheta({ field: "direction", scale: { domain: [0, 360] } })
  .encodeR({ field: "distance", scale: { zero: true } })
  .createThetaAxis({ title: false })
  .createThetaAxisTitle({ text: "Direction" })
  .editThetaAxisTitle({ fontWeight: 600 })
  .createRadialAxisLine({ angle: 45 })
  .createRadialAxisTicks({ values: [0, 3, 6] })
  .createRadialAxisLabels({ values: [0, 3, 6] })
  .createRadialAxisTitle({ text: "Distance" });
```

All eight actions accept optional `scale` and `coordinate` IDs. Existing axis
bindings take precedence over inference; otherwise exactly one compatible Polar
encoding must identify the resources. Use the matching focused editor to change
an existing component. Duplicate creation fails. After `removeThetaAxis()` or
`removeRadialAxis()`, the same create actions can rebuild selected components.

Tick and label creation accepts either `count` or exact data-space `values`.
Other style options match the corresponding focused editor below. Radial
creation also accepts `angle` in degrees: the first component establishes it
(default `90`), and later components share it. Change the angle with
`editRadialAxis({ angle })`; conflicting component angles are rejected. Theta
components do not accept `angle`. Only radial titles accept
`position: "inside" | "outside"`.

Omitted title text follows the encoded field or its explicit title. Component
styles and bindings survive Canvas, scale, and compatible encoding edits.

## Omit, remove, and restore components

All four complete axis creators accept `false` for `line`, `ticksAndLabels`,
and `title`. Omission or `{}` creates the component with inferred defaults.
At least one component must remain enabled. To disable an entire axis, use
the outer `createAxes({ x: false, ... })` selection.

The corresponding complete editors accept `false` for `line`, `ticks`,
`labels`, `ticksAndLabels`, and `title` to remove existing components.
An object edits an existing component; an omitted option preserves it.
Restore a missing component with its focused create action.

`ticksAndLabels: false` removes both existing components. If only one remains,
remove it with `ticks: false` or `labels: false`. Do not combine the group with
individual tick/label options. The group's nested `ticks` and `labels` still
accept style objects, not `false`.

Removing the last component cleans up the axis state and preserves grids,
marks, and scales. Removed components stay absent after Canvas or scale edits.
`editRadialAxis({ angle })` requires an existing axis component.

When a chart facade reuses guides, a component declared `false` must be absent.
If it already exists, remove it explicitly before requesting that declaration.
Theta creation rejects `angle`, which was previously ignored; angle belongs
to radial axes.

## `createAxes(options?)`

See [Complete Axes and Labels](./axes/complete.md#createaxesoptions) for creation,
display mapping, formatting, wrapping, Polar/Parallel decisions, and examples.

## Editing a complete axis

Use `editXAxis()` or `editYAxis()` when several components of one existing
axis should change together:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program
  .editXAxis({
    line: false,
    ticksAndLabels: {
      count: 6,
      ticks: { length: 7 },
      labels: { color: "#475569", fontSize: 11 }
    },
    title: { text: "Engine displacement" }
  })
  .editYAxis({ position: "right" });
```

The complete edit facade does not create an axis or change its scale and
coordinate binding. Each component accepts its existing edit object or `false`;
`false` removes that component's stored materialization config and concrete
graphic together; title removal also clears its semantic text. `ticksAndLabels:
false` removes both components and cannot be combined with standalone `ticks`
or `labels`. Omitted components remain unchanged unless `position` is present,
which moves every retained component on that axis.

Removing the last component also clears the empty complete-axis semantic and
stored config. Recreate one component with its ordinary `create*AxisLine`,
`create*AxisTicksAndLabels`, or `create*AxisTitle` action, or recreate the full
axis with `createXAxis()`/`createYAxis()`. Later Canvas and scale edits do not
restore removed components.

Use `editThetaAxis()` for grouped theta component edits. Use
`editRadialAxis({ angle: 180 })` to move the radial line, ticks, labels, and
title together. Focused `editThetaAxisLine/Ticks/Labels/Title` and matching
`editRadialAxis*` actions change one visible component without raw graphic IDs.
`editRadialAxisTitle({ position: "inside" | "outside" })` switches only the
radial title placement while preserving its text and style.

## Removing an axis

`removeXAxis()`, `removeYAxis()`, `removeThetaAxis()`, and
`removeRadialAxis()` remove the complete axis: line, ticks,
labels, title, semantic guide state, and stored materialization settings. Marks,
scales, coordinates, and the opposite axis remain.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const withoutXAxis = program.removeXAxis();
const selected = program.removeYAxis({ scale: "y", coordinate: "main" });
```

Optional selectors must match the existing resource. A missing or mismatched
axis throws before anything changes.

| Option | Meaning |
| --- | --- |
| `position` | x: `"bottom"/"top"`; y: `"left"/"right"` |
| `line` | `false` or `{ color?, lineWidth? }` |
| `ticks` | `false` or `{ count?, values?, length?, color?, lineWidth? }` |
| `labels` | `false` or `{ count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight?, rotation?, maxWidth?, wrap?, lineHeight?, overlap? }` |
| `ticksAndLabels` | `false` or `{ count?, values?, ticks?, labels? }` |
| `title` | `false` or `{ text?, at?, offset?, rotation?, color?, fontSize?, fontFamily?, fontWeight? }` |

Axis label and title weights follow the shared
[Canvas font-weight policy](./marks/text.md#font-weights).

Use either `ticksAndLabels` or the independent `ticks`/`labels` options in one
call. The action validates the entire request before editing any component, so
an invalid later component cannot leave a partial result.

## Errors and limitations

Ambiguous scale or coordinate candidates require explicit IDs. Each channel
has one semantic axis, so parallel duplicate axes cannot be created.

## Related

[Guides](./guides.md) · [Grids](./grids.md) ·
[Advanced axis components](../advanced/axis-components.md)
