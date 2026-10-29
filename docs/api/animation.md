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
scale policy, appearance, or structured paint uses an explicit crossfade reason.
Conditional positions, non-Cartesian coordinates, overlay or offset rules, special
fixed/category-slot placements, and density-derived areas are outside this typed
kernel. All remain renderable through the shared concrete fallback. Authentic
samples retain current values for interruption and offline replay; unknown kernel
versions or inconsistent stored geometry reject the restore.

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
prepared semantic positions, and versioned kernels. It preserves playback
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
