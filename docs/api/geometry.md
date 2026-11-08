---
layout: default
title: Geometry and Projections
---

# Geometry and projections

Draw maps from GeoJSON or TopoJSON: country shapes colored by a value, points
placed by longitude and latitude, routes, graticules and annotations. Geometry
lives in an immutable resource with explicit feature identity, so maps keep
working with selection, filtering, animation and saved charts. Creating a
geometry resource does not draw it; a projection, a `geo` coordinate and a
mark do. [Contours](contours.md) use the same resource kind with their own
scalar-grid contract.

## Draw a world map

A map needs five steps. The [examples below](#examples-with-real-data) are the
complete programs.

1. **Load the shapes.** `createGeometryData({ id, format: "geojson", coordinateKind: "geographic", values })`
   takes a parsed GeoJSON object. For TopoJSON, use `format: "topojson"` and name the object with `topoObject`.
2. **Add the values.** Put your table in `createData`, then join it to the
   shapes with `createGeoJoinData({ id, geometry, data, geometryKey, dataKey })`.
3. **Choose a projection.** `createProjection({ id, type: "equal-earth", fit: { geometry, width, height, padding } })`
   scales and centers the shapes. Then `createCoordinate({ id, type: "geo", projection })`.
4. **Draw.** `createGeoShapeMark` for areas, `createGeoPointMark` for places,
   `createGeoLineMark` for routes, and `createGraticule` for the latitude and
   longitude grid.
5. **Encode and explain.** `encodeColor`, `encodeSize`, `createLegend` and
   `createTitle` work as on any other chart.

## Common map pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| *Geographic mark point count must not exceed 10000.* | A world outline has more than the default 10,000 projected points. | Pass `capacity: { maxProjectedPoints, maxPathCommands }` to the shape mark, for example `{ maxProjectedPoints: 40000, maxPathCommands: 60000 }`. |
| The map overlaps the title or ignores the margins. | Projection pixels are Canvas pixels; `fit` does not read the Canvas or its margins. | Fit to the whole Canvas, `fit: { geometry, width: canvasWidth, height: canvasHeight, padding }`, and use `padding` for room around the map. |
| Only a corner of the map is visible. | An unfitted projection translates to `[0, 0]`, the Canvas's top-left corner. | Use `fit`, or set `translatePx` to the Canvas center. |
| One color fills the whole globe and `fit` frames the entire sphere. | The polygons wind clockwise, so the default `"right-hand"` reading takes each shape's complement. | Declare `polygonWinding: "left-hand"` on `createGeometryData`. Natural Earth GeoJSON files need it. |
| Antarctica or empty ocean stretches the fit. | `fit` covers every feature in the geometry. | Filter the features first, as the world map example does. |

`polygonWinding` keeps the source coordinates and hashes; projection, fit,
centroids and labels share the declared convention. Planar sources do not
accept it. Generated geographic-radius circles keep their own direction,
including circles larger than a hemisphere.

## Examples with real data

<!-- showcase-program:world-gdp-map:start -->

{% include chart-example.html id="world-gdp-map" %}

`createWorldGdpMap` builds this chart from real data. It receives the parsed GeoJSON of `data/showcase/countries-110m.geojson` (Natural Earth, public domain).
Draw the returned program with `render` in a browser or `renderToPNG` in Node.

```javascript
import { chart } from "ggaction";

// Natural Earth 1:110m countries carry 2019 population and GDP estimates.
// Antarctica has no resident population, so it is left out of the map.
export function createWorldGdpMap(countries) {
  const inhabited = {
    type: "FeatureCollection",
    features: countries.features.filter(feature => feature.properties.CONTINENT !== "Antarctica")
  };
  const economy = inhabited.features.map(feature => {
    const { ADM0_A3, NAME, POP_EST, GDP_MD } = feature.properties;
    return {
      code: ADM0_A3,
      name: NAME,
      gdpPerPerson: POP_EST > 0 && GDP_MD > 0 ? (GDP_MD * 1e6) / POP_EST : null
    };
  });

  return chart()
    .createCanvas({
      width: 960,
      height: 540,
      margin: { top: 70, right: 30, bottom: 30, left: 30 }
    })
    .createGeometryData({
      id: "countries",
      format: "geojson",
      coordinateKind: "geographic",
      polygonWinding: "left-hand",
      values: inhabited
    })
    .createData({ id: "economy", keyField: "code", values: economy })
    .createGeoJoinData({
      id: "country-economy",
      geometry: "countries",
      data: "economy",
      geometryKey: ["properties", "ADM0_A3"],
      dataKey: "code"
    })
    // Projected coordinates are Canvas pixels, so fit the whole Canvas and pad it.
    .createProjection({
      id: "world",
      type: "equal-earth",
      fit: { geometry: "countries", width: 960, height: 540, padding: 50 }
    })
    .createCoordinate({ id: "map", type: "geo", projection: "world" })
    .createGraticule({
      coordinate: "map",
      extentDeg: [[-180, -60], [180, 85]],
      stepDeg: [30, 30],
      stroke: "#e2e8f0",
      strokeWidth: 0.6
    })
    .createGeoShapeMark({
      id: "countries-shape",
      geometry: "country-economy",
      coordinate: "map",
      stroke: "#ffffff",
      strokeWidth: 0.5,
      // A whole-world outline exceeds the default 10,000 projected points.
      capacity: { maxProjectedPoints: 40000, maxPathCommands: 60000 }
    })
    .encodeColor({
      target: "countries-shape",
      field: "gdpPerPerson",
      fieldType: "quantitative",
      scale: {
        type: "threshold",
        domain: [2000, 5000, 10000, 25000, 50000],
        range: ["#fde68a", "#fbbf24", "#f59e0b", "#d97706", "#b45309", "#78350f"]
      }
    })
    .createLegend({
      target: "countries-shape",
      channels: ["color"],
      title: "GDP per person (USD)",
      position: "bottom-left"
    })
    .createTitle({
      text: "GDP per person, 2019",
      subtitle: "Natural Earth country estimates · equal-earth projection"
    });
}
```

<!-- showcase-program:world-gdp-map:end -->

<!-- showcase-program:world-earthquakes-map:start -->

{% include chart-example.html id="world-earthquakes-map" %}

`createWorldEarthquakesMap` builds this chart from real data. It receives one object: `countries` is the parsed GeoJSON of `data/showcase/countries-110m.geojson` (Natural Earth, public domain); `earthquakes` is the parsed GeoJSON of `data/showcase/earthquakes-2024-01.geojson` (USGS, public domain).
Draw the returned program with `render` in a browser or `renderToPNG` in Node.

```javascript
import { chart } from "ggaction";

// USGS events of magnitude 5 or more in January 2024 over Natural Earth countries.
export function createWorldEarthquakesMap({ countries, earthquakes }) {
  const land = {
    type: "FeatureCollection",
    features: countries.features.filter(feature => feature.properties.CONTINENT !== "Antarctica")
  };
  const events = {
    type: "FeatureCollection",
    features: earthquakes.features
      .filter(feature => feature.properties.type === "earthquake")
      .map(feature => ({
        ...feature,
        properties: { ...feature.properties, depth: feature.geometry.coordinates[2] }
      }))
  };

  return chart()
    .createCanvas({
      width: 960,
      height: 540,
      margin: { top: 70, right: 30, bottom: 30, left: 30 }
    })
    .createGeometryData({
      id: "land",
      format: "geojson",
      coordinateKind: "geographic",
      polygonWinding: "left-hand",
      values: land
    })
    .createGeometryData({
      id: "events",
      format: "geojson",
      coordinateKind: "geographic",
      featureKey: "id",
      values: events
    })
    // Rotating by -150° centers the Pacific Ring of Fire.
    .createProjection({
      id: "pacific",
      type: "equal-earth",
      rotateDeg: [-150, 0],
      fit: { geometry: "land", width: 960, height: 540, padding: 50 }
    })
    .createCoordinate({ id: "map", type: "geo", projection: "pacific" })
    .createGraticule({
      coordinate: "map",
      extentDeg: [[-180, -60], [180, 85]],
      stepDeg: [30, 30],
      stroke: "#e2e8f0",
      strokeWidth: 0.6
    })
    .createGeoShapeMark({
      id: "land-shape",
      geometry: "land",
      coordinate: "map",
      fill: "#e2e8f0",
      stroke: "#ffffff",
      strokeWidth: 0.5,
      capacity: { maxProjectedPoints: 40000, maxPathCommands: 60000 }
    })
    .createGeoPointMark({
      id: "earthquakes",
      geometry: "events",
      coordinate: "map",
      opacity: 0.8,
      stroke: "#ffffff",
      strokeWidth: 0.7
    })
    .encodeSize({ target: "earthquakes", field: "mag", scale: { domain: [5, 7.5], range: [30, 600] } })
    .encodeColor({
      target: "earthquakes",
      field: "depth",
      fieldType: "quantitative",
      scale: { palette: "viridis", domain: [0, 650], reverse: true }
    })
    .createLegend({
      target: "earthquakes",
      channels: ["color"],
      title: "Depth (km)",
      position: "bottom-left"
    })
    .createTitle({
      text: "Earthquakes of magnitude 5 or more, January 2024",
      subtitle: "USGS event locations · point area: magnitude · color: depth"
    });
}
```

<!-- showcase-program:world-earthquakes-map:end -->

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

Provide a nonempty patch of `values`, `coordinateKind`, `topoObject`, `limits` or
`polygonWinding`. An omitted `polygonWinding` keeps the stored convention. Switching to
`planar` drops an omitted winding, while an explicit planar winding is rejected.
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

The result retains both regions. West maps to table row 0; East has a missing
measurement, and its null geometry remains identifiable. Numeric `1`, string `"1"`
and tuple `[1]` are distinct keys. Missing keys never match each other. Duplicate
nonmissing keys on either input fail; aggregate duplicates explicitly beforehand.

Use a string field or a nonempty property path such as `["properties","code"]`.
Geometry properties stay intact. Joined mark fields read the matching table row;
unmatched items have no table fields. Diagnostics expose match coverage, duplicate
counts and unmatched source indices. An empty geometry has coverage 0. Each key path has
at most 128 fields. A join accepts up to 100,000 features and 10,000,000 units of work,
including encoded key bytes.

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

The initial zoom defaults to 0. County detail begins at 4.2 and remains active until zoom falls below 3.8.
This gap prevents repeated switching around 4. Each finer threshold pair must increase and enter must
exceed exit. Missing parents, generated source keys, mixed coordinate systems and nested LOD fail.

Optional level `tolerance` defaults to 0. A positive value simplifies retained shared topology once for
all neighbors, in planar units or geographic degrees. Unsafe topology changes keep the original arcs
and record why. Geographic seam arcs stay exact. Original geometry and source hashes remain available.

Geo marks and fitted projections can use `geometry:"regions"`. Original selection keys remain stored
when their region is shown by a parent or children. [Item inspection](../inspection.md) exposes
`representationKeys` alongside each current key; hits always identify the visible representation.
Fields and original table rows come from the current level. The action creates no marks, annotations
or interaction bindings, and changing a projection does not automatically change LOD zoom. A detail
resource accepts at most 128 levels, 100,000 regions in total and 10,000,000 units of mapping work;
simplification also uses the geometry limits.

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
positive. Conic parallels default to `[30, 60]`. `rotateDeg` turns the globe before
projecting; `centerDeg` then shifts the projected centre without rotating the sphere.

`clipExtentPx` defaults to `null`. `clipAngleDeg` defaults to 90° for orthographic, 60°
for gnomonic, 142° for stereographic and 179.999° for both azimuthal types. These five
require a positive angle (orthographic at most 90°, gnomonic below 90°, the others below
180°). Other spherical types accept `null` or an angle up to 180°. Mercator and
transverse Mercator use a finite automatic world extent.

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
parameter defaults; its explicit options must be applicable to that type. An existing fit
is kept and recomputed for the new type unless the same edit supplies `scalePx` or
`translatePx`.

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
| `rotate` | absolute spherical rotation `rotateDeg:[λ, φ, γ?]` in degrees for a non-composite spherical projection; `[-100, -40]` brings 100° E, 40° N to the projection centre |
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
Use explicit `editGeoLODData` when changing detail. For pointer, wheel, pinch and keyboard
navigation, see [Navigate a map](interaction.md#navigate-a-map-with-drag-wheel-pinch-and-keyboard)
and [host controls](interaction.md#adjust-a-geographic-view-from-host-controls). For animated camera
moves, see [Move geographic cameras](animation.md#move-geographic-cameras).

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

### Projected output limits

Geo shape, point, line and graticule marks accept `capacity` on create or edit.
`maxProjectedPoints` limits the mark's total projected points (default 10000),
and `maxPathCommands` limits its total commands and each stream's refined/output
point counts (default 30000). Each explicit integer may be 1 through 200000.
For example, add `capacity: { maxProjectedPoints: 200000, maxPathCommands: 200000 }`
to the `createGeoShapeMark` call above when that larger output is needed.

Omitting capacity during an edit retains it; `{}` resets both defaults. Explicit
undefined, null, accessors, inherited fields and unknown keys reject. Edits that
exceed either budget fail before changing the chart. The policy stays with the
mark binding through source, projection and Canvas edits. Geometry is neither
simplified nor split to fit a budget. Graphic-item, generator, work and clip limits
still apply independently, and some refined or clipped inputs may exceed the
explicit maximum. Animation and hit testing do not inherit this policy automatically.
Plan transitions with `formatVersion: 5` to carry it through camera animation
([Animation](animation.md#preserve-geographic-capacity-in-saved-animations)), and give the
interaction session an explicit `hitPreparation.pathGeometry` to hit-test larger paths
([Interaction](interaction.md)). Camera frames reproject every vertex; see
[Geographic camera cost](../performance.md#geographic-camera-cost) for large sources.

### Explicit capacity example

This complete Node.js program keeps every source position and declares the
projected output budget on its line mark. Projection edits retain that policy.

<!-- snippet-context:start -->

> **Executable complete.** Install ggaction and run this complete ES module in Node.js 20 or later.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const capacityProgram = chart().createCanvas({ width: 400, height: 400, margin: 20 })
  .createGeometryData({
    id: "route", format: "geojson", coordinateKind: "geographic",
    values: { type: "LineString", coordinates: [[-30, -5], [0, 5], [30, -5]] }
  })
  .createProjection({ id: "map", type: "equirectangular", scalePx: 100, translatePx: [200, 200] })
  .createCoordinate({ type: "geo" })
  .createGeoLineMark({
    id: "routeLine", stroke: "#2563eb", strokeWidth: 2,
    capacity: { maxProjectedPoints: 200000, maxPathCommands: 200000 }
  })
  .editProjection({ scalePx: 150 });
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
`interpolation` (`source-segment` by default, or `great-circle`) and `routeHint` apply to
shape and point edges as for [line marks](#creategeolinemark).

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

Use `encodeColor` on shape, point or line marks. Filled shapes and points
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
`radiusDeg`; switch to `radiusPx` first. Aggregate and layout color policies are incompatible with these resource-backed marks.

Use `encodeColor({ value: "navy" })` or `encodeSize({ value: 100 })` to replace a
field mapping with a constant and remove its dependent legend. Other channels
remain. Direct fill/stroke/radius edits reject an active conflicting field mapping;
`removeEncoding` restores its dormant native style. Data, geometry and LOD edits
refresh shared scales, marks and legends together. Color and size legends appear
as separate blocks when both channels are present.

### Choose color or size with conditions

Both channels accept the shared first-match `conditions` array and required
`otherwise`. Each feature is evaluated once, including every part of a multipart
feature. All branches must have valid fields, scales and values even when inactive.
Use the existing typed expressions or an explicit `{ selection: "name" }` predicate.
A zero size hides the circle without removing its logical item.

<!-- snippet-context:start -->

> **Executable complete.** Copy the linked geographic-marks example program and fixture into a geographic-marks folder beside this module.

<!-- snippet-context:end -->

```javascript
import { createGeographicMarks } from "./geographic-marks/program.js";

const emphasized = createGeographicMarks("fields").encodeColor({
  conditions: [{
    when: { version: 2, registry: "standard@1", root: {
      type: "binary", op: "gte", left: { type: "field", name: "visitors" },
      right: { type: "literal", value: 8 }
    } },
    value: { value: "#dc2626" }
  }],
  otherwise: { field: "name", scale: { id: "stop-color", range: ["#2563eb", "#0d9488", "#dc2626"] } }
});
```

A legend describes the unique field/scale binding across branches. If several
bindings are present, remove that channel's legend before assigning the mapping;
creating a new ambiguous legend also fails. Every branch contributes its full
eligible field values to automatic domains, including inactive branches.
Parameter and selection edits refresh conditional marks. Cross-mark selections
follow actual shared table rows, not coincident feature IDs. A field predicate
needs an inferable feature schema; a completely empty feature view can instead
use a literal, parameter or named selection predicate. This does not change the
scale's explicit empty-domain policy. Graticules and annotations have their own
styles and do not accept conditional feature encodings.

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
Automatic row facet/repeat is incompatible with these resource-backed marks. Ordinary color/size, table joins and semantic annotations use their dedicated actions. Generated output is bounded at
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

## Label feature fields and graticules

Use the existing [attached Text labels](./marks/labels.md#geographic-sources) with
a geographic shape, point, line or graticule source. They share source feature
identity and revisions while native Text owns content, style and collision layout.
Graticules expose their existing axis names and numeric values.

## `createGeoRouteData`

**Chart authoring; Full only.**

```typescript
createGeoRouteData(options: TargetedOptions<CreateGeoRouteDataOptions>): ChartProgram;
```

Provide an explicit new geometry `id`, retained edge-route ID `routes`, and
`coordinateKind: "geographic" | "planar"`. The geometry keeps one LineString per
original graph edge, including every sampled M/L point and repeated endpoints.
All four [edge bundling methods](graphs.md) use the same adapter. Features expose
`properties.edgeKey`, the typed opaque edge token, for explicit joins and levels.
Mark fields and row provenance retain the native graph edge grain.

Geographic input requires **world** routes whose x/y already represent longitude
and latitude degrees. All positions must be finite and latitude within −90 to 90.
Screen pixels are never inverted into coordinates. Planar input uses the existing
identity projection and retains world or screen route units. The bundling solver
keeps its existing plane-coordinate mathematics.

Draw the resource with `createGeoLineMark`. Its explicit `source-segment` or
`great-circle` interpolation, antipodal hint, date-line splitting and projection
clipping apply to the retained samples. Camera changes affect projection without
recomputing world bundles. Route/source/layout edits refresh this geometry,
dependent joins, levels, fitted projections and marks atomically.

The adapter retains at most 100,000 features and 1,000,000 positions under the
existing cumulative work budget. It preserves all accepted edges and samples.
Save editable programs with the existing persistence API; restoration validates
the stored result against exact route inputs without running the solver again.

This complete authoring example uses explicit longitude/latitude layout anchors:

<!-- snippet-context:start -->

> **Executable complete.** Import the Full package; this example declares graph nodes, edge rows and longitude/latitude anchors.

<!-- snippet-context:end -->

```javascript
import { chart } from "ggaction";

const routeMap = chart().createCanvas({ width: 480, height: 240 })
  .createData({ id: "ports", values: [{ id: "west" }, { id: "east" }] })
  .createData({ id: "connections", values: [{ id: "crossing", from: "west", to: "east" }] })
  .createGraphData({ id: "network", nodes: "ports", edges: "connections",
    nodeKey: "id", edgeKey: "id", source: "from", target: "to" })
  .layoutGraph({ id: "anchors", method: "fixed", options: {
    positions: [{ key: "west", x: 170, y: 20 }, { key: "east", x: -170, y: 30 }]
  } })
  .bundleGraphEdges({ id: "routes", method: "edge-path", coordinateSpace: "world" })
  .createGeoRouteData({ id: "routeGeometry", routes: "routes", coordinateKind: "geographic" })
  .createProjection({ id: "map", type: "equirectangular", scalePx: 55, translatePx: [240, 120] })
  .createCoordinate({ id: "geo", type: "geo", projection: "map" })
  .createGeoLineMark({ id: "connections", geometry: "routeGeometry", coordinate: "geo",
    interpolation: "great-circle", stroke: "#2563eb", strokeWidth: 2 });
```


## `editGeoRouteData`

**Chart authoring; Full only.**

```typescript
editGeoRouteData(options: TargetedOptions<EditGeoRouteDataOptions>): ChartProgram;
```

Provide a nonempty patch of `routes` or `coordinateKind`. Omission preserves the
current intent; `undefined` and `null` are rejected. `target` may name the resource
or a composition child, or be omitted for the current or unique eligible route
geometry. Every accepted edit increments revision once and preserves its logical
feature identity. Surviving typed edge keys remain stable. Incompatible samples
or consumers reject the entire edit, preserving the earlier program and trace.

## Related

[Geographic marks tutorial](../tutorials/geographic-marks.md) ·
[Interaction sessions](interaction.md) · [Animation](animation.md) ·
[Attached labels](marks/labels.md) · [Coordinates](coordinates.md) ·
[Performance](../performance.md#geographic-camera-cost)
