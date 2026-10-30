---
layout: default
title: Animate and Export Chart Frames
---

# Animate and Export Chart Frames

{% include chart-example.html id="scatterplot" lead=true %}

Prepare a transition between two immutable charts, sample it at an explicit time,
and pass the returned frame directly to Canvas, SVG, PNG, or PDF. The
`ggaction/animation` entry is browser-safe. These functions are advanced chart
authoring APIs; they leave both source programs and their action traces unchanged.

## Prepare, save, and sample

Run this complete ES module in Node.js 20+ after installing `ggaction`:

<!-- snippet-context:start -->

> **Executable complete.** Run this complete ES module with ggaction installed; keyed rows, both endpoints and the offline frame schedule are included.

<!-- snippet-context:end -->

```javascript
import { chart } from 'ggaction';
import { planTransition, serializeAnimation, deserializeAnimation,
  exportAnimationFrames } from 'ggaction/animation';
import { renderToSVG } from 'ggaction/svg';

const from = chart().createCanvas({ width: 300, height: 200, margin: 20 })
  .createData({ id: 'rows', keyField: 'id', values: [{ id: 'a', x: 1, y: 50 }] })
  .createPointMark({ id: 'points', fill: '#e11d48' })
  .encodeX({ field: 'x', scale: { type: 'log', domain: [1, 1000], nice: false } })
  .encodeY({ field: 'y', scale: { domain: [0, 100], nice: false } });
const to = from.reviseData({ source: 'rows', id: 'next',
  values: [{ id: 'a', x: 100, y: 50 }] });
const plan = planTransition({ from, to, options: { durationMs: 1000, easing: 'linear' } });
const saved = serializeAnimation(plan, { rate: 1, repeat: 0, reducedMotion: false });
const restored = deserializeAnimation(saved);
const frames = exportAnimationFrames(restored.plan, { timesMs: [0, 500, 1000] });
console.log(renderToSVG(frames[1]));
```

Item keys retain number/string distinctions and child composition namespaces.
The Cartesian point kernel moves compatible circle points by
interpolating their data values and scale mappings. For example, a logarithmic
axis maps the interpolated data value; it does not average endpoint pixels.
Other geometry or incompatible appearance uses a bounded weighted crossfade,
reported in the sample's `decisions`. Entering and exiting items retain explicit
decisions. This surface does not promise semantic interpolation for every chart family.

## Animate solid color and opacity

Compatible point, Cartesian, polar, guide, graph, partition, and geographic geometry can
change solid `fill`, `stroke`, `opacity`, and explicit `strokeWidth` while moving.
Color interpolation uses premultiplied linear sRGB: halfway from black to white
is approximately RGB(188, 188, 188). A transparent `none` paint gaining red retains
red chroma while its alpha increases. Opacity interpolates separately; an omitted
opacity means one. Stroke width requires explicit values at both endpoints.

Use the existing domain edit actions to set the endpoint styles, then prepare the
same transition. Exact endpoints retain the authored colors. An authentic sampled
frame retains its current color and geometry when you reverse or interrupt it.
Patterns, gradients, unresolved host colors, changed text/fonts, and other changed
static effects use the explicit `appearance` crossfade. An unchanged geographic
pattern continues to use the native geometry and paint materialization rules.

Saved transition plans use version 2 and the required
`premultiplied-linear-srgb@1` appearance kernel. Earlier development plan versions
and missing or unknown kernels are rejected on restore. The outer animation
envelope remains schema 1.

## Move a completed graph layout

GraphPlot transitions interpolate the completed node coordinates, radii, origin,
and label offsets. Edges and arrows follow their current node anchors using the
same geometry rules as an ordinary graph. Stored world-space and screen-space
routes interpolate along their arc length, retaining the current endpoints and
radius inset. Sampling never runs graph inference, layout, or bundling again.

Stable node and edge keys support reordered, entering, and exiting items, including
composed charts. A sampled graph frame can start or end another transition; its
current layout meaning is retained without reconstructing it from pixels. Identical
routes keep their original corners. The decision kernel is `completed-graph`.

Changed endpoint relationships, parallel-edge order, route kind or coordinate
space, incompatible appearance or clipping, and collapsed or overstretched routes
produce an explicit crossfade reason for the affected item. Compatible nodes keep
moving independently. These rules also apply after offline serialization. Native
current-frame hit testing uses the displayed geometry; restored offline frames can
render and rebase, but cannot bind to a live session without native endpoint metadata.

## Move Cartesian shapes and series

Compatible rules, range or categorical rectangles, aggregate/ranged/centered bars,
histograms, lines, and areas interpolate their prepared values before mapping them
through their scales. The decision kernel is `cartesian-geometry`. A logarithmic
position maps the interpolated value instead of averaging endpoint pixels.

Preparation retains the native bin totals, stack/fill/center/wiggle endpoints,
ordered sample membership, curve, bar width, and corner policy. Sampling does not
repeat aggregation, binning, or layout. The existing native geometry rules produce
step and smooth lines, closed areas, horizontal and vertical bars, rounded corners,
and explicit band, pixel, or calendar-interval widths. Categorical transitions require
the same typed domain order, item value, and padding policy; their ranges may change.

Changed sample membership, curve/layout/width/corner policy, categorical domain,
scale policy, unsupported style, or structured paint uses an explicit crossfade reason.
Conditional positions, non-Cartesian coordinates, overlay or offset rules, special
fixed/category-slot placements, and density-derived areas are outside this typed
kernel. All remain renderable through the shared concrete fallback. Authentic
samples retain current values for interruption and offline replay; unknown kernel
versions or inconsistent stored geometry reject the restore.
## Bend an icicle into a sunburst

PartitionPlot transitions use the stored hierarchy cells and their stable parent
relationships. Compatible icicle and sunburst directions interpolate the current
frame, radial hole, cell intervals, and gaps with the native bend geometry. Labels
follow their current cells. Sampling uses the completed hierarchy layout.
The decision kernel is `partition`.

Use the same `planTransition` and `sampleTransition` functions with two programs
created through [PartitionPlot](partition.md). Either endpoint can be an authentic
sampled frame, so reversing or interrupting a bend preserves its current shape.
The original native graphics remain exact at the endpoints, and offline replay
preserves the prepared hierarchy meaning.

Changed parent relationships, visible cells, handedness, radial depth direction,
radius policy, clipping, or appearance use an explicit crossfade reason. Edited
primitive geometry also falls back. A gap that consumes a cell during the bend
produces `partition-collapsed-cell` for its body and label. Current native frames
support hit testing on the displayed paths. Offline frames retain rendering and
rebasing data; live interaction uses separately restored native programs.

## Move native polar shapes

Polar points, ordered lines, and proportional or radial arcs use the `polar-geometry`
kernel. Preparation retains their native angles, radii, frame, and ordered member
keys. Sampling uses the same polar projection, line, and annular-sector builders as
the original chart. Angles take the shortest path across the seam; an exact half
turn chooses the positive direction. Full-circle arcs retain their signed sweep.

This interpolates resolved polar coordinates. It does not interpolate arbitrary
raw values and nonlinear scales together. Changed mapping policies use the explicit
`polar-mapping` crossfade. A Canvas resize with the same relative radial range is
compatible. Line member order and closure, arc direction and padding, and unsupported style
must remain compatible. Conditional positions, non-circular points, and edited
geometry retain explicit fallbacks. Native polar Rule/Rect authoring is not added.
Guide-specific transitions remain outside this kernel.

Current angles stay unwrapped when a frame is reused as an endpoint. Offline replay
stores the actual polar coordinates and membership with a versioned kernel, validates
them against the endpoint geometry, and feeds the same frame to all four renderers.

## Move axes, labels, and grids

Cartesian axis lines, ticks, fixed-layout labels, and grids, plus polar axes,
spokes, and circle grids, retain their raw guide values. Compatible transitions
interpolate the scale and frame before applying the native guide geometry.
Matched decisions report `kernel: 'guide-geometry'` and a separate `guideKey`.
The key preserves the child scope, guide owner, component, typed value, and label
line role. It never matches different values by their array position or text.

For example, this complete Node.js module moves the grid at value 5 through a
changing domain and exports the offline midpoint:

<!-- snippet-context:start -->

> **Executable complete.** Run this complete ES module with ggaction installed; both native endpoints and the offline guide sample are included.

<!-- snippet-context:end -->

```javascript
import { chart } from 'ggaction';
import { planTransition, serializeAnimation, deserializeAnimation,
  sampleTransition } from 'ggaction/animation';
import { renderToSVG } from 'ggaction/svg';

const from = chart().createCanvas({ width: 400, height: 240, margin: 40 })
  .createData({ values: [{ x: 0, y: 0 }, { x: 10, y: 10 }] })
  .createPointMark().encodeX({ field: 'x', scale: { domain: [0, 10], nice: false } })
  .encodeY({ field: 'y' }).createVerticalGrid({ values: [5] })
  .createXAxisLabels({ values: [0, 5, 10], flush: true });
const to = from.editScale({ id: 'x', domain: [0, 20] });
const plan = planTransition({ from, to, options: { durationMs: 1000, easing: 'linear' } });
const restored = deserializeAnimation(serializeAnimation(plan));
console.log(renderToSVG(sampleTransition(restored.plan, 500)));
```

New values enter and removed values exit. Duplicated raw values keep separate
enter/exit decisions with `reason: 'guide-ambiguity'`. A changed label string uses
an appearance crossfade. Current sampled guides can be reused as either endpoint.
Offline restore validates their values, geometry, and version before replay.

Titles with explicit numeric offsets retain their native range role or numeric `at`
value. Changing `at` on a log axis maps the interpolated value through the log scale;
it does not interpolate screen coordinates. Polar titles use their native frame and
shortest angular path. Title text or font changes crossfade safely.

Band-boundary grids match the complete set of category edges that share each boundary.
Parallel axes match by field name, component, and raw tick value when fields move,
appear, or disappear. Neither uses array position as identity. If native band edges
split during a transition, that boundary crossfades explicitly.

Fixed Cartesian label rotation, flush alignment, and plot-edge alignment use the native
measured layout. Their raw values, displayed text, hard-break lines, fonts, and alignment
policy must stay compatible. Scale, frame, and numeric offsets can change; exact font
profiles must contain every required measurement. Current layouts support interruption
and offline replay. Width-based wrapping, responsive skip/rotation selection, inferred or
label-relative title clearance, and edited geometry retain explicit fallbacks.

Continuous color and stroke-gradient legends with explicit `values` and numeric `offset`
use their native single-edge layout. Ticks and labels keep their raw values; the current
scale maps them again as the domain changes. Gradient length, thickness, offset, and frame
move through that same layout. Current legend frames can be interrupted and restored
offline. Text or font changes crossfade; exact font profiles must contain all required
measurements. Automatic samples, symbol legends, borders, groups, multiple blocks on one
edge, and inferred axis clearance retain safe fallbacks.

<!-- snippet-context:start -->

> **Executable complete.** Run this complete ES module with ggaction installed; both exact-value gradient legends and the sampled SVG output are included.

<!-- snippet-context:end -->

```js
import { chart } from 'ggaction';
import { planTransition, sampleTransition } from 'ggaction/animation';
import { renderToSVG } from 'ggaction/svg';

const from = chart().createCanvas({ width: 500, height: 300,
    margin: { top: 50, bottom: 50, left: 50, right: 150 } })
  .createData({ values: [{ x: 1, y: 1 }, { x: 100, y: 2 }] })
  .createPointMark().encodeX({ field: 'x' }).encodeY({ field: 'y' })
  .encodeColor({ field: 'x', fieldType: 'quantitative',
    scale: { type: 'log', domain: [1, 100], range: ['red', 'blue'] } })
  .createLegend({ channels: ['color'], values: [1, 10, 100], offset: 20, title: false });
const to = from.editScale({ id: 'color', domain: [1, 10000] })
  .editLegend({ gradient: { length: 160, thickness: 20 } });
const plan = planTransition({ from, to, options: { durationMs: 1000, easing: 'linear' } });
console.log(renderToSVG(sampleTransition(plan, 500)));
```

## Move geographic cameras

Native Geo shape, point, line, and graticule items use their original geometry and
resolved camera parameters. Sampling applies quaternion rotation, logarithmic positive
scale, and translation through the same projection stream as native Geo marks.
Horizon clips and seams may change the number of current parts. A source feature can
be visible midway even when both endpoint scenes hide it.

These current parts report a `geographic` decision with `kernel: 'native-geo'`,
`ownerKey`, `itemKey`, and `role`. They have no fabricated endpoint indices. Exact
endpoints preserve the original scene and graphics; current frames remain directly
renderable, interruptible, and serializable with their actual source geometry.

Incompatible projection policies, source geometry, winding, or appearance retain an
explicit crossfade reason. Other compatible features of the same owner still move
through the native camera. Current native hit testing uses each actual feature and
resource lineage. Offline replay preserves pixels and semantic camera state without
creating authority to interact with a native program. Native sessions can click or
keyboard-activate a feature painted only midway when the same source key exists in
the current program. Each source revision is checked independently; selection intent
is retained even if the current native projection hides its highlight. Camera-aware
Geo labels and annotations remain separate integration work.

## Functions

| Function | Result and behavior |
| --- | --- |
| `planTransition({from, to, options:{durationMs, easing?}})` | An opaque immutable plan. Duration is finite and nonnegative; easing is `linear` or default `cubic-in-out`. Full and Basic programs are accepted. Either endpoint can also be an authentic sampled frame. |
| `sampleTransition(plan, timeMs)` | Immutable `{graphicSpec, scene, progress, decisions}`. Finite time is clamped to the plan's duration. For zero duration, time zero selects the target. |
| `serializeAnimation(plan, playback?)` | A JSON string containing the prepared endpoint payloads, kernel versions, and playback preferences. |
| `deserializeAnimation(text)` | Immutable `{plan, playback}`. It validates the complete stored values before returning an authentic plan. |
| `exportAnimationFrames(plan, {timesMs})` | Frames with `timeMs`, using a nonempty strictly increasing array within the duration. |
| `exportAnimationFrames(plan, {fps})` | Frames at `index / fps * 1000` milliseconds through the duration; fps must be positive and finite. |

When an authentic sample is reused as an endpoint, sampling that endpoint returns
the original frame, including its original progress and decisions. Exported
`timeMs` belongs to the new plan and does not rewrite the endpoint progress.

A frame-rate grid does not add an off-grid ending frame. Use `timesMs` when an
exact endpoint is required. A zero-duration plan exports one frame at zero.
Requests are limited to 10,000 frames and 10,000,000 cumulative endpoint-node
visits before sampling. Returned arrays and frames are immutable.

## Render the same frame

This Node fragment follows the first example. Install the optional backend with
`npm install @napi-rs/canvas`:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { createCanvas } from '@napi-rs/canvas';
import { render } from 'ggaction';
import { renderToPNGBuffer } from 'ggaction/png';
import { renderToPDFBuffer } from 'ggaction/pdf';

const frame = frames[1];
const canvas = createCanvas(1, 1);
render(frame, canvas.getContext('2d'));
const png = await renderToPNGBuffer(frame);
const pdf = await renderToPDFBuffer(frame);
console.log(png.width, png.height, pdf.width, pdf.height);
```

In a browser, pass the frame to `render` with your Canvas context or insert the
string from `renderToSVG`. Embedded images and fonts keep their actual bytes.
Canvas uses the existing explicit [image and font preparation](rendering.md);
PNG and PDF prepare their native bytes internally. The animation entry itself
does not load a Node renderer, fetch assets, or write files.

## Play with an explicit clock

This browser fragment follows the first example and assumes a Canvas element
whose id is `chart`. It uses the browser's animation clock explicitly:

<!-- snippet-context:start -->

> **Contextual fragment.** Use an ES module with the imports, data, and prepared resource state described in this section. Caller-provided receivers: `performance`. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { render } from 'ggaction';
import { createAnimationPlayer } from 'ggaction/animation';

const context = document.querySelector('#chart').getContext('2d');
const player = createAnimationPlayer({
  plan: restored.plan,
  ...restored.playback,
  clock: {
    now: () => performance.now(),
    requestFrame: callback => requestAnimationFrame(callback),
    cancelFrame: handle => cancelAnimationFrame(handle)
  },
  render: frame => render(frame, context)
});
player.play();
await player.finished;
player.dispose();
```

The player supports `play`, `pause`, `seek(timeMs)`, `reverse`, `setRate(rate)`,
`setRepeat(repeat)`, `cancel`, `dispose`, `getState`, and `getFrame`.
`interrupt({to, options:{durationMs, easing?}, rate?, repeat?, reducedMotion?})`
accepts a program or authentic sample and continues from the current frame.
A negative rate puts the captured frame at the new plan's ending time and plays
back toward the target. Invalid interruption targets leave
the active run intact. Repeated interruption of compatible geometry does not accumulate
a chain of earlier plans. Weighted crossfades still respect their concrete source
and clipping limits. An optional `commit(frame)` callback runs on completion.
`finished` settles with `reason`, `timeMs`, and `iteration`; reasons are
`completed`, `cancelled`, `interrupted`, and `disposed`.

Playback defaults are `rate:1`, `repeat:0`, and `reducedMotion:false`. Rate may be
negative or zero. Repeat counts additional traversals; `Infinity` continues
until cancellation. Reduced motion selects the endpoint in the playback direction
and follows the same render and completion callbacks.

## Offline replay and limits

Saved animation contains the endpoint graphics, actual embedded image/font bytes,
prepared semantic positions, graph routes, normalized hierarchy cells, and versioned kernels. It preserves playback
preferences, including infinite repeat. It omits clocks, callbacks, DOM objects,
runtime handles, promises, and the current playback position.

Restoration performs no network requests or semantic data inference. Unknown
schemas or kernels, missing asset bytes, invalid identities, inconsistent
prepared positions, and corrupted payloads reject the entire restore. The JSON
limit is 64 MiB, decoded nesting is at most 128 levels, and encoded/decoded values
are each bounded to 1,000,000 occurrences. Plan preparation also has a 10,000-node
endpoint limit and a 10,000,000-unit work limit.

The same time and stored algorithm versions reproduce the same canonical scene.
This does not assert identical font rasterization across operating systems.
