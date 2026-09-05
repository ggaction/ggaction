---
layout: default
title: Axes
---

# Axes

{% include chart-example.html id="scatterplot" %}

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

## Polar component creation

Create a missing Polar axis component without rebuilding the other components.
These actions are available from `ggaction`.

| Component | Theta action | Radial action |
| --- | --- | --- |
| Baseline | `createThetaAxisLine` | `createRadialAxisLine` |
| Tick marks | `createThetaAxisTicks` | `createRadialAxisTicks` |
| Tick text | `createThetaAxisLabels` | `createRadialAxisLabels` |
| Title | `createThetaAxisTitle` | `createRadialAxisTitle` |

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

Creates complete axes for encoded Cartesian x/y, Polar theta/radius, or Parallel dimension channels. This is the recommended axis
action for ordinary chart authoring.

```javascript
program.createAxes({
  y: { ticksAndLabels: { count: 6 } }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `coordinate` | `{ id?, type? }` | unique coordinate used by x/y layers |
| `x` | axis options or `false` | create when x is encoded |
| `y` | axis options or `false` | create when y is encoded |
| `theta` | Polar axis options or `false` | create when theta is encoded |
| `radius` | Polar axis options or `false` | create when radius is encoded |

`coordinate.type` accepts `"auto"`, `"cartesian"`, `"polar"`, or `"parallel"` as a stored
type assertion.

Each x/y axis option supports:

| Option | Value |
| --- | --- |
| `scale` | scale ID; inferred when one scale is used on the channel |
| `position` | x: `"bottom"` or `"top"`; y: `"left"` or `"right"` |
| `line` | `false` or `{ color?, lineWidth? }` |
| `ticksAndLabels` | `false` or `{ count?, values?, ticks?, labels? }` |
| `title` | `false` or title options including `text`, `at`, `offset`, and font styling |

Use either `count` or exact data-space `values` for ticks. Ambiguous coordinates
or scales must be selected explicitly. `createAxes` reads stored coordinates;
it never creates or repairs them. Tick, label, and grid `count` values and
explicit `values` arrays are limited to 10,000 generated items.

Linear scales create numeric nice ticks. Time scales choose a UTC calendar
interval near the requested count and format labels automatically. Automatic
formatting starts from the domain span, then raises precision only when two
distinct resolved ticks would otherwise share a label. For example, a
1970–1982 domain produces `1970`, `1972`, ..., `1982`, while sub-month ticks
include the day needed to distinguish them. Explicit time values are finite
timestamps. Exceptionally long valid date domains use a nice multi-year step
when the fixed calendar interval would grossly oversample the requested count.

A band or point x scale uses its complete domain as the default tick and label
values. Each value is placed at the shared band or point center and formatted
with `String(value)`. Explicit `ticksAndLabels.values` may select a domain
subset in the requested order. Discrete axes reject `count` so categories are
not silently omitted. Reversed ranges and Canvas rematerialization preserve
the stored category values.

For a binned histogram x encoding, omitted tick options use the inferred bin
boundaries. This keeps the axis aligned with every rect edge. Explicit
`ticksAndLabels.count` or `ticksAndLabels.values` takes precedence. Count y
axes use numeric nice ticks and infer titles such as `count(Displacement)`.

Titles are inferred from the unique encoding consuming each scale. Aggregate
encodings include their operation, so `mean` on `Acceleration` becomes
`mean(Acceleration)`. Pass `title.text` when inference is ambiguous or a custom
label is desired.

The default edges remain bottom for x and left for y. A complete axis forwards
an explicit edge to its line, ticks, labels, and title:

```javascript
program.createAxes({
  x: {
    position: "top",
    ticksAndLabels: { labels: { format: ".1f" } }
  },
  y: { position: "right" }
});
```

Top ticks point upward and right ticks point right. Labels and titles are
placed outward from the selected edge. The Canvas margin must already be large
enough; guide creation does not resize it.

Numeric label formats are `.0f`, `.1f`, `.2f`, `.0%`, `.1%`, and `.2e`.
UTC time formats compose `%Y` (year), `%m` (two-digit month), `%d` (two-digit
day), and `%b` (English abbreviated month) with literals, for example `%b %Y`,
`%Y-%m`, or `%Y/%m/%d`; use `%%` for a literal percent sign. Every time format
must contain at least one date directive, and unknown or dangling directives
are rejected. Numeric formats require a linear scale, time formats require a
time scale, and ordinal labels use `"auto"`. The existing `{ decimals:
nonNegativeInteger }` form remains available for linear labels. Explicit
formats remain exact and may intentionally produce repeated display strings.

The selected coordinate ID is stored on each semantic axis. Canvas size and
margin edits explicitly rematerialize positional scales and every connected
axis component.

A temporal aggregate-bar scale keeps its inset range for bar centers, ticks,
and labels. Its axis baseline alone spans the complete plot edge, matching the
crossing grid geometry so a differently colored zero-grid line cannot remain
visible as end caps. Reversed scales reverse the stored baseline endpoints
without changing that complete visible span.

The trace preserves its decomposition:

```text
createAxes
├─ createXAxis (when selected)
└─ createYAxis (when selected)
```

For a Polar coordinate, the same aggregate becomes:

```text
createAxes
├─ createThetaAxis
└─ createRadialAxis
```

`createThetaAxis()` creates the outer circular baseline, outward ticks,
perimeter labels, and an inferred title. `createRadialAxis()` creates one
center-to-edge baseline; its `angle` defaults to `90` degrees (right). Both
support `ticksAndLabels: { count?, values?, ticks?, labels? }` and title style.
Use `line: false`, `ticksAndLabels: false`, or `title: false` to omit components.
The radial title defaults to `position: "inside"` at the baseline midpoint.
Use `title: { position: "outside" }` to place it beyond the radial endpoint;
`offset` is measured from the midpoint normal when inside and from the endpoint
when outside.

For a Parallel coordinate, `createAxes()` delegates to public `createParallelAxes()`.
Each encoded field gets a baseline, ticks, labels, and a title. Use
`createParallelAxis({ field })` to create one missing field axis and
`editParallelAxis({ field, ... })` to edit its components. These actions are Full-only.

The following fragment assumes `program` has a Parallel dimension named
`Miles_per_Gallon` with existing axes:

```javascript
const styled = program.editParallelAxis({
  field: "Miles_per_Gallon",
  line: { color: "#7c3aed", lineWidth: 3 },
  title: { text: "Fuel economy", fontWeight: 700 }
});
const restored = styled
  .editParallelAxis({ field: "Miles_per_Gallon", ticks: false })
  .createParallelAxis({
    field: "Miles_per_Gallon", line: false, labels: false, title: false,
    ticks: { length: 10 }
  });
```

`field` is required and must match an encoded dimension. `target` uses the stored
axis owner or the unique encoded Parallel line. A different owner is an error.
Create requires missing components: omitted components get defaults, `false`
skips them, and all-disabled creation is invalid. Edit requires existing components:
objects patch, `false` removes, and omissions preserve. To remove a field's entire
axis, use `removeParallelAxis({ field })`; use `removeParallelAxes()` for all axes.
Removing the final component also clears the empty owner while preserving marks and scales.

Ticks and labels accept independent `count` or exact `values`, or share them through
`ticksAndLabels`. Do not combine the grouped and independent forms. Count is
quantitative-only; ordinal values must be domain members. Count and values are
mutually exclusive. Group members accept styles, not nested `false`.
Counts, value arrays, and each rendered collection are limited to 10,000 items.
Values must be distinct and inside the scale domain; an empty values array retains
an empty component. Label `format` follows [axis components](../advanced/axis-components.md).

Defaults preserve the original Parallel appearance: line width 1.25, tick length 8,
automatic count 5, labels 9 pixels left at size 11, and titles 20 pixels above at size
13 and weight 600. Titles accept `text`, `offset`, color and font styles; labels
accept `offset`, format and font styles. Parallel axes do not accept Cartesian
positions, radial angles or title rotation, and do not fit the Canvas automatically.

Field styles and explicit titles survive resizing, scale edits and dimension
reordering. Removed fields lose their recipes. An owner created by `createParallelAxes`
also creates defaults for newly encoded fields; one started by `createParallelAxis`
keeps new fields hidden. Explicitly removed field axes stay hidden while their field
remains encoded. Recreate missing components through `createParallelAxis`.

For individual lines, ticks, labels, and titles, see
[Advanced axis components](../advanced/axis-components.md).

## Editing a complete axis

Use `editXAxis()` or `editYAxis()` when several components of one existing
axis should change together:

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
| `labels` | `false` or `{ count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? }` |
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
