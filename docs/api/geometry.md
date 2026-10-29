---
layout: default
title: Geometry and Projections
---

# Geometry and projections

Keep geographic or planar shapes in an immutable resource with explicit feature
identity. These Full `ggaction` actions prepare source geometry; creating a
resource does not draw it. [Contours](contours.md) use the same resource kind
with their own scalar-grid contract.

## `createGeometryData`

**Chart authoring.**

```typescript
createGeometryData(options: TargetedOptions<CreateGeometryDataOptions>): ChartProgram;
```

Provide an `id`, `format: "geojson" | "topojson"`, `values` and
`coordinateKind: "geographic" | "planar"`. Geographic coordinates are longitude
and latitude in degrees; latitude must be within −90 to 90. Planar coordinates
retain their original units. Extra coordinate dimensions remain available in
the source and normalized result.

<!-- snippet-context:start -->

> **Executable complete.** Import ggaction; the example supplies its own feature collection.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const program = chart().createGeometryData({
  id: "places", format: "geojson", coordinateKind: "geographic", featureKey: "id",
  values: { type: "FeatureCollection", features: [
    { type: "Feature", id: "harbor", properties: { name: "Harbor" },
      geometry: { type: "Point", coordinates: [12.6, 55.7] } }
  ] }
});
```

`featureKey` selects an own field or an exact property path, such as
`["properties", "code"]`. Every feature must have a unique valid key. Numeric 1
and string `"1"` are distinct. Without this option, generated keys persist in the
resource and survive options-only edits.

GeoJSON points, lines, polygons, multi-geometries and nested collections retain
their structure. Null and empty geometry remains identifiable but nondrawable.
A nonempty line needs two positions. Rings need at least four positions and an
exactly repeated final position. Invalid rings are rejected without repair.
Holes and islands remain separate parts of their original feature.

TopoJSON retains shared arcs. Quantized arcs are delta-decoded before their
transform; negative arc references reverse the corresponding arc. Joined arcs
must meet exactly. `topoObject` is required when there is more than one object.
A single inferred object is retained for later edits.

Optional `limits` may lower these maximum values:

| Limit | Maximum |
| --- | --- |
| `maxFeatures` | 100,000 |
| `maxPositions` | 1,000,000 cumulative position visits |
| `maxArcs` | 100,000 |
| `maxValues` | 2,000,000 JSON values |
| `maxDepth` | 128 |

Normalization also has a cumulative 10,000,000-unit work limit. Accessors,
cycles, sparse arrays, nonfinite numbers and non-JSON values are rejected.
Source values and their hash are retained for offline restoration. This API
does not fetch files or claim a hash of original file bytes.

## `editGeometryData`

**Chart authoring.**

```typescript
editGeometryData(options: TargetedOptions<EditGeometryDataOptions>): ChartProgram;
```

Provide a nonempty patch of `values`, `coordinateKind`, `topoObject` or `limits`.
`target` may be omitted for the current or unique eligible geometry source.
Contour resources are ineligible. The original format and feature-key policy
stay fixed; create a separate resource to change them.

Keyed features keep their identity through reordering and replacement. Replacing
whole values without a feature key allocates new keys. Changing the selected
TopoJSON object also replaces generated keys. Options-only edits preserve them.
An omitted object name retains the previous selection, and partial limits retain
unspecified limits. Every successful edit advances the resource revision once.

Invalid edits leave the original program and its trace unchanged. Inspect or
compare geometry through [inspection](../inspection.md), and remove it through
[`removeResource`](../reference/actions/charts-data.md#removeresource).

## `createGeoJoinData`

**Chart authoring.**

```typescript
createGeoJoinData(options: TargetedOptions<CreateGeoJoinDataOptions>): ChartProgram;
```

Join a geometry resource and materialized table with exact typed keys. Supply a new
`id`, `geometryKey` and `dataKey`; `geometry` and `data` may be omitted when the
current resource or one eligible input identifies each unambiguously. Key paths
start at the feature or table row, respectively.

<!-- snippet-context:start -->

> **Executable complete.** Run the complete module with its inline region features and population table. Both regions remain in the joined result.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const joined = chart()
  .createData({ id: "population", values: [{ code: "west", population: 120 }] })
  .createGeometryData({
    id: "regions", format: "geojson", coordinateKind: "planar", featureKey: "id",
    values: { type: "FeatureCollection", features: [
      { type: "Feature", id: "west", properties: {}, geometry: { type: "Point", coordinates: [10, 20] } },
      { type: "Feature", id: "east", properties: {}, geometry: null }
    ] }
  })
  .createGeoJoinData({ id: "measured-regions", geometryKey: "id", dataKey: "code" });
```

The result retains both regions. West maps to table row0; East has a missing
measurement, and its null geometry remains identifiable. Numeric1, string`"1"`
and tuple`[1]` are distinct keys. Missing keys never match each other. Duplicate
nonmissing keys on either input fail; aggregate duplicates explicitly beforehand.

Use a string field or a nonempty property path such as`["properties","code"]`.
Geometry properties stay intact. Joined mark fields read the matching table row;
unmatched items have no table fields. Diagnostics expose match coverage, duplicate
counts and unmatched source indices. An empty geometry has coverage0.

## `editGeoJoinData`

**Chart authoring.**

```typescript
editGeoJoinData(options: TargetedOptions<EditGeoJoinDataOptions>): ChartProgram;
```

`editGeoJoinData` accepts `target?`, `geometry?`, `data?`, `geometryKey?` and
`dataKey?`. Omitted values retain the current inputs and keys. Table or geometry
revisions refresh the join, dependent fitted projections and marks atomically.
Remove dependent joins before removing their source resources. Both actions are
available in Full `ggaction`.

## `createGeoLODData`

**Chart authoring.**

```typescript
createGeoLODData(options: TargetedOptions<CreateGeoLODDataOptions>): ChartProgram;
```

Use explicit keyed geometry resources for each detail level. List levels from coarse to fine.
Every finer region needs one typed key and its parent key in the preceding level. All resources
must use the same coordinate system. Joins retain their source feature keys and can supply measurements.

<!-- snippet-context:start -->

> **Executable complete.** Run the complete module with its inline keyed region fixtures and explicit county-parent mapping.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const feature = (id, x) => ({ type: "Feature", id, properties: {},
  geometry: { type: "Point", coordinates: [x, 20] } });
const program = chart()
  .createGeometryData({ id: "states", format: "geojson", coordinateKind: "planar", featureKey: "id",
    values: feature("s", 10) })
  .createGeometryData({ id: "counties", format: "geojson", coordinateKind: "planar", featureKey: "id",
    values: { type: "FeatureCollection", features: [feature("a", 8), feature("b", 12)] } })
  .createGeoLODData({ id: "regions", zoom: 4, levels: [
    { id: "state", geometry: "states" },
    { id: "county", geometry: "counties", enterZoom: 4.2, exitZoom: 3.8,
      parents: [{ key: "a", parent: "s" }, { key: "b", parent: "s" }] }
  ] });
```

The initial zoom defaults to0. County detail begins at4.2 and remains active until zoom falls below3.8.
This gap prevents repeated switching around4. Each finer threshold pair must increase and enter must
exceed exit. Missing parents, generated source keys, mixed coordinate systems and nested LOD fail.

Optional level `tolerance` defaults to0. A positive value simplifies retained shared topology once for
all neighbors, in planar units or geographic degrees. Unsafe topology changes keep the original arcs
and record why. Geographic seam arcs stay exact. Original geometry and source hashes remain available.

Geo marks and fitted projections can use `geometry:"regions"`. Original selection keys remain stored
when their region is shown by a parent or children. [Item inspection](../inspection.md) exposes
`representationKeys` alongside each current key; hits always identify the visible representation.
Fields and original table rows come from the current level. The action creates no marks, annotations
or interaction bindings, and changing a projection does not automatically change LOD zoom.

## `editGeoLODData`

**Chart authoring.**

```typescript
editGeoLODData(options: TargetedOptions<EditGeoLODDataOptions>): ChartProgram;
```

Change `zoom`, replace `levels`, or both. Omission preserves the existing decision. `target` can be
omitted for the current or unique detail resource. A replacement list must retain the active level ID;
there is no silent reset. Each successful edit advances revision once and updates dependent joins,
fitted projections and marks atomically. Invalid edits preserve the earlier program and trace.

## `createProjection`

**Chart authoring.**

```typescript
createProjection(options: TargetedOptions<CreateProjectionOptions>): ChartProgram;
```

Create a named mathematical projection with an explicit `id` and `type`. A
projection is a reusable resource; creating it does not draw geometry.

| Family | Types |
| --- | --- |
| Cylindrical and global | `mercator`, `equirectangular`, `equal-earth`, `natural-earth`, `transverse-mercator` |
| Azimuthal | `orthographic`, `stereographic`, `gnomonic`, `azimuthal-equal-area`, `azimuthal-equidistant` |
| Conic | `conic-equal-area`, `conic-conformal`, `conic-equidistant` |
| Composite insets | `albers-usa` |
| Planar | `identity` |

Spherical projections use longitude/latitude degrees and downward-y CSS pixels.
The parameter names state their units: `centerDeg`, `rotateDeg`, `parallelsDeg`,
`scalePx`, `translatePx`, `precisionPx`, `clipAngleDeg` and `clipExtentPx`.
Spherical scale defaults to 150, translation to `[0, 0]`, center/rotation to zero,
precision to 0.5 pixels and reflection to false. Scale and precision must be
positive. Conic parallels default to `[30, 60]`.

`identity` preserves planar units with scale 1 and supports translation,
reflection and rectangular clipping. It does not accept spherical parameters.
`albers-usa` uses fixed lower48, Alaska and Hawaii components and accepts scale,
translation and precision. Other inapplicable parameters are rejected.

To fit an existing geometry source, provide `fit` with explicit `width` and
`height`. `geometry` can be omitted when the current or unique source determines
it. Optional `padding` defaults to zero. The geometry coordinate kind must match
identity (planar) or a spherical projection (geographic).

<!-- snippet-context:start -->

> **Executable complete.** Run the complete ES module with its inline planar geometry and public chart import. The projection fit has scale 5 and translation [25, 0].

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const fitted = chart()
  .createGeometryData({
    id: "shape", format: "geojson", coordinateKind: "planar",
    values: { type: "LineString", coordinates: [[0, 0], [10, 20]] }
  })
  .createProjection({
    id: "map", type: "identity",
    fit: { geometry: "shape", width: 100, height: 100 }
  });
// The fitted scale is 5 and translation is [25, 0].
```

Fit uses the projected geometry, including holes and visible clipped segments.
It does not read Canvas size or include stroke/glyph padding. Empty or wholly
clipped geometry is an error. Point-only geometry uses `pointScale`, or the
current/default scale. A request cannot combine `fit` with explicit `scalePx`
or `translatePx`. Large inputs that exceed the geometry or path work limits,
and numbers that cannot preserve viewport precision, are rejected.

## `editProjection`

**Chart authoring.**

```typescript
editProjection(options: TargetedOptions<EditProjectionOptions>): ChartProgram;
```

`target` may be omitted for the current or unique projection. Supply a nonempty
parameter patch. Shape and rotation edits retain an existing fit. A new fit can
choose another geometry and viewport. Changing `type` starts with the new type's
parameter defaults; its explicit options must be applicable to that type.

An explicit scale or translation edit detaches the previous fit and uses the
current resolved value of the other transform. Editing a fitted geometry source
updates each dependent projection once. An invalid source or incompatible
coordinate kind rejects the whole edit and preserves the previous program.

Remove authored fit projections explicitly before removing their geometry.
Geometry cascade does not delete a reusable authored projection. Projection
resources and their exact fit inputs survive offline serialization.

## `navigateProjection`

Chart authoring · Full.

```typescript
navigateProjection(options: TargetedOptions<NavigateProjectionOptions>): ChartProgram;
```

Navigate the current or explicitly named projection. `operation` chooses pan, anchored zoom,
pinch, absolute spherical rotation, fit, explicit reset or Canvas resize. All distances are
logical CSS pixels; rotations are degrees. Operations return a new program and update existing
Geo marks through the native projection edit.

| Operation | Required fields |
| --- | --- |
| `pan` | `deltaPx:[x,y]` |
| `zoom` | `anchorPx:[x,y]`, positive `factor`, positive ordered `scaleExtent:[min,max]` |
| `pinch` | `fromPx:[[x,y],[x,y]]`, `toPx:[[x,y],[x,y]]`, `scaleExtent` |
| `rotate` | absolute `rotateDeg:[longitude,latitude,roll?]` for a non-composite spherical projection |
| `fit` | `fit:{geometry?,width,height,padding?,pointScale?}` using the existing live geometry fit |
| `reset` | `initial` projection parameters, for example from a saved inspection snapshot |
| `resize` | `canvas:{width?,height?,plot?}`, `scaling:"preserve"|"fit"` |

Zoom clamps scale while keeping the visible inverse anchor fixed. A clipped or non-invertible
anchor fails; pinch requires distinct pointers. Resize keeps the previous plot center at the new
center. `preserve` keeps pixel scale; `fit` uses the smaller settled plot dimension ratio. Native
Canvas size rules still apply: exact plot dimensions conflict with outer width/height unless you
explicitly include `plot:false`. Authored projection clipping stays unchanged.

> **Executable complete.** Run as an ES module. This resource-only example creates no graphics; the initial frozen view is explicit caller state.

<!-- snippet-context:start -->

> **Executable complete.** Use an ES module with the imports, data, and prepared resource state described in this section. Resolve these names from setup in this fragment or section; alternatives branch from the same base.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";
import { getProjectionView } from "ggaction/inspection";
const initial = chart().createProjection({ id: "map", type: "identity" });
const saved = getProjectionView(initial);
const zoomed = initial.navigateProjection({
  operation: { type: "zoom", anchorPx: [200, 150], factor: 2, scaleExtent: [0.5, 8] }
});
const reset = zoomed.navigateProjection({ operation: { type: "reset", initial: saved.parameters } });
console.log(getProjectionView(reset).parameters.scalePx); // 1
```

Reset restores view parameters, not an old revision or live fit policy. Fit retains a geometry
dependency; other camera operations detach an earlier fit. The command stores no hidden baseline,
DOM listeners or renderer camera. Projection navigation does not choose a geographic detail level.
Use explicit `editGeoLODData` when changing detail.

## Draw through a Geo coordinate

A Geo coordinate owns one projection. A geometry mark names that coordinate and
its geometry source; it does not copy the projection settings. Projection pixels
are Canvas-local CSS pixels. Fit explicitly with the intended viewport when needed.
Canvas resizing preserves that transform; `clip: true` clips at the current plot.

<!-- snippet-context:start -->

> **Executable complete.** Import the Full package and run this complete planar polygon-with-hole example.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const map = chart().createCanvas({ width: 400, height: 300, margin: 0 })
  .createGeometryData({ id: "regions", format: "geojson", coordinateKind: "planar",
    values: { type: "Polygon", coordinates: [
      [[20,20],[280,20],[280,220],[20,220],[20,20]],
      [[80,80],[80,140],[160,140],[160,80],[80,80]]
    ] } })
  .createProjection({ id: "plane", type: "identity" })
  .createCoordinate({ type: "geo" })
  .createGeoShapeMark({ fill: "#93c5fd", stroke: "#1e40af", clip: true });
```

## `createGeoShapeMark`

**Chart authoring.**

```typescript
createGeoShapeMark(options?: TargetedOptions<GeoShapeMarkOptions>): ChartProgram;
```

Draw mixed points, lines, polygons or collections. `geometry` and `coordinate`
resolve an explicit ID, the current eligible resource, or one unique eligible
candidate. Default ID is `geo-shape`; another creation needs another ID. Planar
sources require identity; geographic sources require a spherical projection.

Each feature is one logical item, even when a seam or collection splits it into
several primitives. Holes stay unfilled. Null, empty and hidden-backside features
retain source identity and draw no placeholder. Selection and accessibility read
feature properties and the actual materialized pieces.

Style options are `fill` (including structured paints), `stroke`, `strokeWidth`,
`opacity`, `clip`, `lineCap`, `lineJoin`, `miterLimit`, `outline`, `shadow` and
`blend`. Defaults are blue fill, dark stroke of width 1, opacity 1, clip false,
butt caps and miter joins with limit 10. Shape points use `radiusPx: 3`.
Line pieces always have fill none. Outline and shadow accept false to reset;
blend accepts normal, multiply, screen or difference.

## Map feature fields to color and size

Use ordinary `encodeColor` on shape, point or line marks. Filled shapes and points
map to fill; lines map to stroke. Use `encodeSize` on point marks to map values
to CSS-pixel area. Native categorical, continuous and discrete scales apply.

<!-- snippet-context:start -->

> **Executable complete.** The two inline places supply their own population measurements.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const program = chart().createCanvas({ width: 640, height: 400, margin: { left: 40, right: 180, top: 40, bottom: 40 } })
  .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id", values: {
    type: "FeatureCollection", features: [
      { type: "Feature", id: "west", properties: { population: 100, region: "West" }, geometry: { type: "Point", coordinates: [140, 180] } },
      { type: "Feature", id: "east", properties: { population: 400, region: "East" }, geometry: { type: "Point", coordinates: [340, 180] } }
    ]
  } })
  .createProjection({ id: "map", type: "identity" }).createCoordinate({ type: "geo" })
  .createGeoPointMark()
  .encodeColor({ field: "region", scale: { range: ["#2563eb", "#dc2626"] } })
  .encodeSize({ field: "population", scale: { domain: [0, 400], range: [0, 1600] } })
  .createLegend();
```

A source mark reads feature properties. A joined mark reads the matching table
row; an unmatched feature needs explicit `scale.unknown` to map a missing field.
Otherwise the action fails without changing the program. LOD uses the active
level's fields. Multiple pieces of one feature share the same value and identity.
Null/empty geometries stay inspectable but contribute no scale values or visible
items. Projection clipping does not change scale domains.

Size uses `sqrt(area / Math.PI)` for point radius. It does not mix with geographic
`radiusDeg`; switch to `radiusPx` first. Aggregate and layout color policies and
conditional encodings are not supported for these resource-backed marks.

Use `encodeColor({ value: "navy" })` or `encodeSize({ value: 100 })` to replace a
field mapping with a constant and remove its dependent legend. Other channels
remain. Direct fill/stroke/radius edits reject an active conflicting field mapping;
`removeEncoding` restores its dormant native style. Data, geometry and LOD edits
refresh shared scales, marks and legends together. Color and size legends appear
as separate blocks when both channels are present.

## `editGeoShapeMark`

**Chart authoring.**

```typescript
editGeoShapeMark(options: TargetedOptions<EditGeoShapeMarkOptions>): ChartProgram;
```

Use a nonempty patch of the same options with `target` instead of `id`. The target
resolves the explicit, current or unique shape mark. Omitted options remain.

## `createGeoPointMark`

**Chart authoring.**

```typescript
createGeoPointMark(options?: TargetedOptions<GeoPointMarkOptions>): ChartProgram;
```

Draw Point/MultiPoint features or collections containing only points. Default ID
is `geo-point`, stroke none and strokeWidth 0. `radiusPx` defaults to 3 and stays
constant under projection scale changes. Explicit `radiusDeg` draws a geographic
spherical disk and requires geographic source units. Do not combine both radius
options. All other shape styling and source/coordinate inference rules apply.

## `editGeoPointMark`

**Chart authoring.**

```typescript
editGeoPointMark(options: TargetedOptions<EditGeoPointMarkOptions>): ChartProgram;
```

Patch a point mark. A later radiusPx edit removes a previous geographic radius.

## `createGeoLineMark`

**Chart authoring.**

```typescript
createGeoLineMark(options?: TargetedOptions<GeoLineMarkOptions>): ChartProgram;
```

Draw LineString/MultiLineString features or collections containing only lines.
Default ID is `geo-line`; fill must be none. Interpolation defaults to
`source-segment`, following the source longitude/latitude path. `great-circle`
uses the short spherical path. An exactly antipodal segment needs a non-antipodal
`routeHint: [longitude, latitude]`. Both use the same seam/clip/projection stream.

## `editGeoLineMark`

**Chart authoring.**

```typescript
editGeoLineMark(options: TargetedOptions<EditGeoLineMarkOptions>): ChartProgram;
```

Patch a line mark. `routeHint: false` explicitly removes a hint, for example when
switching to source-segment interpolation.

## `createGraticule`

**Chart authoring.**

```typescript
createGraticule(options?: TargetedOptions<GraticuleOptions>): ChartProgram;
```

Draw longitude/latitude lines on the current or explicit spherical Geo coordinate.
No geometry source is created. Default ID is `graticule`, `stepDeg: [10, 10]`,
`extentDeg: [[-180, -80], [180, 80]]` and `precisionDeg: 2.5`. Steps are positive
and at most 180 degrees; precision is positive and at most 10 degrees. Extent
corners must increase within longitude ±180 and latitude ±90. Lines use integer
step multiples, with no duplicate 180-degree meridian for a full world.
The line style rules apply.

## `editGraticule`

**Chart authoring.**

```typescript
editGraticule(options: TargetedOptions<EditGraticuleOptions>): ChartProgram;
```

Patch grid parameters or style. Invalid geometry, incompatible projections, unsafe
values and excessive generated work reject atomically. Geometry edits update all
fitted projections and affected marks once. Projection or coordinate edits refresh
their mark consumers; old programs and traces remain unchanged.

All geographic marks support hconcat/vconcat, scoped edits, selection/highlighting,
scene export, offline restoration and Canvas/SVG/PNG/PDF. Remove them with
`removeMark`; live marks/coordinates restrict resource removal, including cascade.
Automatic row facet/repeat, conditional feature mappings and camera controls are not enabled by these mark options. Ordinary color/size, table joins and semantic annotations use their dedicated actions. Generated output is bounded at
10,000 points/items and 10,000,000 work units per materialization.

## `createGeoAnnotation`

**Classification:** chart authoring · Full

```ts
createGeoAnnotation(options: TargetedOptions<GeoAnnotationOptions>): ChartProgram;
```

Place text at a source position or at the centroid of a named feature. A Geo coordinate determines
how the anchor projects. The default ID is `geo-annotation`; give additional annotations explicit IDs.

<!-- snippet-context:start -->

> **Executable complete.** Run the complete module with its inline keyed planar port feature.

<!-- snippet-context:end -->

```js
import { chart } from "ggaction";

const program = chart().createCanvas({ width: 400, height: 250 })
  .createGeometryData({ id: "places", format: "geojson", coordinateKind: "planar", featureKey: "id",
    values: { type: "Feature", id: "port", properties: {},
      geometry: { type: "Point", coordinates: [120, 90] } } })
  .createProjection({ id: "map", type: "identity" })
  .createCoordinate({ type: "geo" })
  .createGeoAnnotation({ anchor: { type: "feature", geometry: "places", key: "port" },
    text: "Port", dy: -12, align: "center", fontSize: 16 });
```

Use `{type:"position",position:[x,y]}` for an explicit anchor: identity projections use source planar
units, while spherical projections use longitude/latitude degrees. Use
`{type:"feature",geometry?,key,level?}` for a keyed source or join. Geometry omission follows the
current/unique eligible geometry; a feature source must declare `featureKey`. Numeric and string keys
are distinct. Polygons use an area centroid with holes, lines a length centroid, and points an average;
geographic geometry uses spherical centroids. A centroid can fall outside a concave feature.

For LOD geometry, `level` chooses an original level, or captures the current level when omitted.
The annotation continues to follow that original feature when the visible map changes detail.
Editing source geometry moves its annotation; deleting its key rejects the whole edit. Empty/null
geometry, clipped anchors and empty text produce no placeholder text.

`text` is a required string. Native Text styles apply: `fill`, `opacity`, `fontSize`, `fontFamily`,
`fontWeight`, `align`, `baseline`, `rotation`, `dx`, `dy`, `lineHeight`, `blockAlign`, `lineCap`,
`lineJoin`, `miterLimit`, `outline`, `shadow` and `blend`. Offsets are logical pixels after projection.
`clip` defaults to false. Theme text/font tokens, explicit style overrides and prepared fonts follow
[Text](marks/text.md#createtextmarkoptions). Shadow rendering requires the usual explicit host preparation.
Selections and highlights use the annotation item; stroke highlighting does not add a Text stroke.

## `editGeoAnnotation`

**Classification:** chart authoring · Full

```ts
editGeoAnnotation(options: TargetedOptions<EditGeoAnnotationOptions>): ChartProgram;
```

Change `target?`, `coordinate?`, `anchor?`, `text?` or native Text styles. An omitted target resolves the
current or unique annotation. The patch must be nonempty; omitted fields retain their current values.
A supplied anchor replaces its intent. Switching to a position detaches the geometry reference.
Feature geometry omission retains the existing feature source; an omitted level captures the current
LOD level. Invalid anchors, missing keys or unprepared font queries leave the original chart unchanged.
