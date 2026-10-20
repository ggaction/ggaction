---
layout: default
title: Complete Axes and Labels
---

# Complete Axes and Labels

{% include chart-example.html id="line" lead=true %}

[Axis family overview](../axes.md)

## Composite marks over guides

{% include chart-example.html id="plot-guide-underlays" %}

Use `underlay: true` when the complete Cartesian axis should be painted before
ordinary marks. The plot border accepts the same choice. This makes guides part
of the backdrop for a difference-blended bar. Geometry, clips and source rows
stay the same; the drawing order changes.

This complete example declares the axis first and then edits its placement:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```js
import {chart} from "ggaction";
export const rows=[{category:'a',value:6},{category:'b',value:9}];
export function createPlotUnderlayProgram({axisUnderlay=true,borderUnderlay=true,blend="difference"}={}){return chart()
 .createCanvas({width:240,height:180,margin:{left:40,right:20,top:20,bottom:40}})
 .editCanvas({plotBorder:{color:'#ddd',lineWidth:1,underlay:borderUnderlay}})
 .createData({values:rows})
 .createBarPlot({x:'category',y:{field:'value',scale:{domain:[0,10],nice:false}},guides:false})
 .encodeBarWidth({band:1})
 .editBarMark({fill:'yellow',stroke:'yellow',strokeWidth:4})
 .editBarMark({cornerRadius:10,blend})
 .createXAxis({line:{color:'#888',lineWidth:2},ticksAndLabels:false,title:false})
 .createGrid({horizontal:{values:[0,5,10],color:'#ddd',lineWidth:1},vertical:false})
 .editXAxis({underlay:axisUnderlay});}

const program = createPlotUnderlayProgram();
```

The option also works in `createXAxis`, `createYAxis`, nested `createAxes`,
guides and chart facades. Select a named axis through the existing `target` on
whole-axis edits. Focused component editors and Polar/Parallel axes keep their
existing options.

Omitted edits preserve placement. `editXAxis({ underlay: false })` restores
the ordinary overlay. Frame offsets and placement edits preserve each other.
All retained components move as one axis; marks and text keep their relative order.
Nonpositive Cartesian grids remain behind these underlays, and positive grid
`zIndex` values keep their existing position after marks. Source, scale, data,
Canvas, theme, facet and editable-persistence replay retain the requested placement.

## Independent named Cartesian axes

{% include chart-example.html id="axis-owners" %}

Create an axis with `id` when it needs an independent identity. The default IDs are
`x` and `y`. Refine or remove a named axis with `target`, which selects the axis,
not its mark or scale. This complete runnable program uses an independent right scale:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resource selectors used here: `target: "share"`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```js
import { chart } from "ggaction";

const program = chart().createCanvas({ width: 600, height: 400, margin: 80 })
  .createData({ values: [{ x: 1, y: 2 }, { x: 2, y: 4 }] })
  .createScatterPlot({ x: "x", y: "y", guides: false })
  .createYAxis()
  .createScale({ id: "ratio", type: "linear", domain: [0, 1] })
  .createYAxis({ id: "share", position: "right", scale: "ratio", coordinate: "main" })
  .editYAxisTitle({ target: "share", text: "Share" });
```

`createAxes` and `createGuides.axes` also accept nonempty X/Y arrays, with an explicit
`id` in every entry. Arrays create axes in entry order and fail atomically if any
entry conflicts. A chart facade accepts the same arrays for its own position scales.
One axis may occupy each physical side of a coordinate; moving another axis there
fails even with a different frame offset. Named axes use one common side for their
components. Move the complete axis to change that side; focused edits preserve it.

An omitted `target` selects the canonical X/Y axis if present, otherwise the unique
named axis in that channel. Several named candidates require an explicit target.
Unknown IDs, wrong channels, conflicting scale/coordinate filters, reserved channel
IDs and duplicate graphic identities fail. Polar and Parallel axes do not accept
these selectors. A focused creator restores a missing component of an existing named
axis; the complete creator establishes its identity. Removing the final component
also removes the owner. Scale, data, Canvas, theme and editable persistence preserve
all remaining owners. A grid with several eligible scales requires an explicit scale;
conflicting axis tick policies require explicit grid `count` or `values`.

For facet `axes: "outer"`, named components follow their actual top, right, bottom
or left occupied edge, including incomplete rows. `axes: "each"` retains every axis.
Named text bounds must fit the Canvas and remain separate from other axis text.

## Moving a complete axis and refining its text

On an existing Cartesian program, create the full axis before focused text edits:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```js
program
  .createXAxis({ offset: 20, title: { text: "Measurement" } })
  .editXAxisTitle({ offset: -40, alongOffset: 30, align: "right" })
  .editXAxisTitle({ baseline: "bottom" })
  .editXAxisLabels({ align: "left" });
```

The complete-axis `offset` moves its line, ticks, labels and title outward together.
It must be non-negative; zero restores the plot edge. Marks and grids stay fixed.
The nested title `offset` is signed: positive outward, negative into the plot.
`alongOffset` is a separate translation along the axis: positive right for X and
down for Y, even with a reversed scale. Numeric `at` still means a scale-domain value.

Title alignment (`left`, `center`, `right`) and baseline (`top`, `hanging`, `middle`,
`alphabetic`, `ideographic`, `bottom`) apply before rotation. Defaults remain center/middle.
Multiline titles keep their text and 1.2×font-size spacing; top/hanging/alphabetic
anchor the first line, bottom/ideographic the last, and middle centers the block.
Omitted edits retain explicit settings. Explicit defaults restore alignment/baseline;
remove and recreate a title without `offset` to restore automatic title clearance.

Explicit label `align` changes text anchoring before rotation while keeping existing
resolved label positions. It takes precedence over inferred side/flush anchoring.
Remove and recreate labels without alignment to restore inference. All final rotated
bounds must still fit, and axis-title/label collision checks remain active.

## Styling native tick dashes

Create a complete axis first, then refine its native ticks. On an existing Cartesian
program with a quantitative y encoding, this fragment keeps the zero tick solid:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```js
program
  .createYAxis({ ticksAndLabels: { values: [0, 1, 2] } })
  .editYAxisTicks({ strokeDash: [2, 2], strokeDashMap: [{ value: 0, strokeDash: [] }] });
```

Patterns contain an even number of finite non-negative lengths; `[]` means solid.
Map keys use raw typed values, so `1` differs from `"1"`. Missing map entries use the
uniform pattern. An omitted edit preserves the map; `strokeDashMap: "auto"` or `[]`
removes only its overrides. Values absent from the current ticks stay available for
later scale/data refresh. The same tick options work inside complete-axis creation,
whole-axis edits and ticks-and-labels groups. Polar and Parallel ticks are unchanged.

## `createAxes(options?)`

Creates complete axes for encoded Cartesian x/y, Polar theta/radius, or Parallel dimension channels. This is the recommended axis
action for ordinary chart authoring.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program.createAxes({
  y: { ticksAndLabels: { count: 6 } }
});
```

| Option | Type | Default |
| --- | --- | --- |
| `coordinate` | `{ id?, type? }` | unique coordinate used by x/y layers |
| `x` | axis options, nonempty named-axis array, or `false` | create when x is encoded |
| `y` | axis options, nonempty named-axis array, or `false` | create when y is encoded |
| `theta` | Polar axis options or `false` | create when theta is encoded |
| `radius` | Polar axis options or `false` | create when radius is encoded |

`coordinate.type` accepts `"auto"`, `"cartesian"`, `"polar"`, or `"parallel"` as a stored
type assertion.

An explicit coordinate ID and type must agree with the stored coordinate.
Options from another family are rejected, including `false`: x/y options
require Cartesian encodings, theta/radius options require Polar encodings,
and Parallel axes do not accept these channel-specific option objects.

Each x/y axis option supports:

| Option | Value |
| --- | --- |
| `scale` | scale ID; inferred when one scale is used on the channel |
| `position` | x: `"bottom"` or `"top"`; y: `"left"` or `"right"` |
| `line` | `false` or `{ color?, lineWidth? }` |
| `ticksAndLabels` | `false` or `{ count?, values?, ticks?, labels? }` |
| `title` | `false` or title options including `text`, `at`, `offset`, and font styling |

Cartesian `ticksAndLabels.labels.colorMap` accepts typed `{ value, color }` entries. It overrides individual raw tick colors and falls back to `labels.color`; it does not depend on the displayed text. Use `"auto"` to remove the map. Continuous keys must be finite numeric/timestamp values.

Use `ticksAndLabels.labels.flush: true` to keep unrotated X or Y label bounds inside the mapped axis span. It defaults to false and preserves the normal overlap policy; use explicit `overlap: "allow"` when neighboring labels intentionally overlap. Text, fonts and tick positions are retained. Rotated labels and a label wider than the entire span are rejected.

Cartesian `ticksAndLabels.ticks.alongOffset` and `ticksAndLabels.labels.alongOffset` independently shift mapped positions in logical pixels. Positive moves right for X and down for Y; the default is zero. This preserves scale data and the outward label `offset`.

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

Cartesian labels and categorical theta labels can replace display
text without changing raw values:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
const named = program.createXAxisLabels({
  labelMap: [
    { value: 1, label: "One" },
    { value: "1", label: "String one" },
    { value: "KR", label: "South Korea" }
  ]
});
```

Map lookup uses the typed raw value, so `1` and `"1"` remain distinct. Values
missing from the map use the normal formatter. Repeated visible labels do not
merge scale entries, ticks, legend symbols, or selections. An empty label
hides that text while retaining its item; `labelMap: []` stores an explicit
empty map and `labelMap: "auto"` removes the map. On continuous Cartesian axes, keys must be finite numbers or Unix-millisecond timestamps. Numeric strings, booleans, null and non-finite keys are rejected. A map only changes the displayed text; it does not change scale domains, tick positions or data. New ticks absent from the map use the existing numeric or UTC formatter. Continuous theta axes, radial axes, and Parallel dimension axes reject this option. The same option is available in focused label actions, nested
ticks-and-labels options, complete Cartesian axes, and categorical theta
facades.

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

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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
enough; guide creation does not resize it. A later explicit `fitCanvas()` call
can shrink excess margin on a Full unit chart.

Cartesian label styles accept `rotation`, `maxWidth`, `wrap`, `lineHeight`, and
`overlap` in focused label actions, ticks-and-labels groups, and complete axis
facades. Numeric rotations are radians; `{ value, unit }` accepts radians or
degrees. Setting a positive `maxWidth` stores deterministic word or character
wrapping as concrete text lines. Word wrapping is the default, and an oversized
word is split by Unicode code point. `lineHeight` defaults to `fontSize * 1.2`
and cannot be smaller than the font size.

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
program.createXAxis({
  ticksAndLabels: {
    labels: {
      maxWidth: 72,
      wrap: "word",
      rotation: { value: -24, unit: "degrees" }
    }
  }
});
```

`overlap` defaults to `"error"`. Explicit `"allow"` permits label-to-label
intersection. Canvas overflow still fails; title-label collisions are controlled
separately by the title policy below.
`editXAxisLabels({ maxWidth: false })` or its y counterpart removes wrapping;
that reset cannot include `wrap` or `lineHeight` in the same call. Canvas and
scale replay rebuild the same lines from the stored policy. The 10,000-item
limit applies after wrapping.

### Intentional title-label overlap

A Cartesian title defaults to `overlap: "error"`. Set `title.overlap: "allow"`
when that title is deliberately placed across its own axis labels. This keeps
Canvas bounds and label-label checks active. Apply `labels.overlap` separately
when neighboring labels also overlap.

Fragment after a data-backed Cartesian chart has been created:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
.createAxes({
  y: {
    ticksAndLabels: { labels: { overlap: "allow" } },
    title: { text: "Group", offset: 80, overlap: "allow" }
  }
})
```

Focused title editors and whole-axis edits accept the same policy. Omitted edits
preserve it; an explicit `"error"` reset must fit without that collision. The
policy belongs to one axis title and remains valid when labels are created or
edited later, including named axes, facets and saved programs.

Cartesian title text preserves explicit hard line breaks as a centered block.
See [axis-title text and rotation](../../reference/actions/guides.md#ticklabel-groups-and-axis-titles)
for line spacing, blank lines and bounds checks.

Cartesian title `rotation` accepts a finite legacy number in radians or an
explicit `{ value, unit: "degrees" | "radians" }` object. Both forms normalize
to radians before materialization. This does not change the degree-valued
`angle` used to place radial-axis components.

Numeric label formats use `.0f` through `.12f` for fixed decimals, `.0%`
through `.12%` for percentages, and `.0e` through `.12e` for scientific
notation. A leading zero in a one-digit precision, such as `.01f`, is accepted
and means `.1f`.
UTC time formats compose `%Y` (year), `%m` (two-digit month), `%d` (two-digit
day), and `%b` (English abbreviated month) with literals, for example `%b %Y`,
`%Y-%m`, or `%Y/%m/%d`; use `%%` for a literal percent sign. Every time format
must contain at least one date directive, and unknown or dangling directives
are rejected. Numeric formats apply to quantitative scales, including log,
sqrt, pow, and symlog; time formats require a time scale. Discrete labels use
`"auto"` and may apply `labelMap`. The existing `{ decimals:
nonNegativeInteger }` form remains available for numeric labels. Explicit
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

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `program`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

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
an empty component. Label `format` follows [axis components](./../../advanced/axis-components.md).

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
[Advanced axis components](./../../advanced/axis-components.md).

Numeric labels also accept `","` for grouped integers and `",.0f"` through `",.12f"` for grouped fixed decimals. UTC formats accept `%a` for an English weekday abbreviation, such as `%a %d` → `Mon 01`. These formats use the shared axis, legend and text formatter.

An explicit Cartesian `labelMap` entry with `label: ""` hides only that displayed label. Tick marks, stored tick values and scale domains stay unchanged. Empty labels remain suppressed after Canvas/scale replay; clear the map with `"auto"` to restore the normal formatter.
