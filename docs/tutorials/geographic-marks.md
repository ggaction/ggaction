---
layout: default
title: Draw Geometry on a Map
---

# Draw geometry on a map

A geometry resource preserves source features. A projection maps their coordinates,
and one Geo coordinate shares that projection among shapes, points and lines.
This example uses local planar coordinates, so an identity projection preserves
the district outline, its courtyard, the three stops and their service route.

{% include chart-example.html id="geographic-marks" %}

## Complete program

The Full package contains the geographic actions. This complete example declares
its own geometry and uses pixel radii for the stop symbols.

```javascript
import { chart } from "ggaction";

const program = chart()
  .createCanvas({"width":640,"height":480,"margin":40})
  .createGeometryData({"id":"districts","format":"geojson","coordinateKind":"planar","featureKey":"id","values":{"type":"Feature","id":"district","properties":{"name":"District"},"geometry":{"type":"Polygon","coordinates":[[[80,90],[360,90],[360,370],[80,370],[80,90]],[[160,170],[160,290],[280,290],[280,170],[160,170]]]}}})
  .createGeometryData({"id":"stops","format":"geojson","coordinateKind":"planar","featureKey":"id","values":{"type":"FeatureCollection","features":[{"type":"Feature","id":0,"properties":{"name":"West"},"geometry":{"type":"Point","coordinates":[120,130]}},{"type":"Feature","id":1,"properties":{"name":"Central"},"geometry":{"type":"Point","coordinates":[400,220]}},{"type":"Feature","id":2,"properties":{"name":"East"},"geometry":{"type":"Point","coordinates":[520,330]}}]}})
  .createGeometryData({"id":"services","format":"geojson","coordinateKind":"planar","featureKey":"id","values":{"type":"Feature","id":"service","properties":{"name":"Service route"},"geometry":{"type":"LineString","coordinates":[[120,130],[400,220],[520,330]]}}})
  .createProjection({"id":"map","type":"identity"})
  .createCoordinate({"type":"geo"})
  .createGeoShapeMark({"geometry":"districts","fill":"#93c5fd","stroke":"#1e40af","strokeWidth":2})
  .createGeoLineMark({"geometry":"services","stroke":"#475569","strokeWidth":3})
  .createGeoPointMark({"geometry":"stops","fill":"#dc2626","radiusPx":8});
```

For longitude and latitude, choose a spherical projection instead of identity.
A graticule uses the same projection and coordinate binding as other geographic
marks. Its spacing and precision are explicit angular values.

{% include chart-example.html id="geographic-grid" %}

Changing the projection updates every bound mark together. Pixel-sized points
keep their radius; an explicit radiusDeg represents a geographic disk whose
screen size changes with the projection. Feature selection keeps the original
feature key when a line splits at the date line or a feature moves out of view.

A feature with null geometry remains a source feature but has no graphic or hit
target. Polygon holes remain empty in Canvas, SVG, PNG, PDF and hit testing.
Use a projection fit when you want a stored geometry resource to determine scale
and translation; Canvas resizing alone does not silently fit the geometry.

See [Geometry and projections](../api/geometry.md) for exact options, revisions,
selection, coordinate compatibility and current limitations. The
[shared example source](https://github.com/ggaction/ggaction/blob/{{ site.data.provenance.exampleSourceRef }}/examples/geographic-marks/program.js)
is used by this tutorial, the browser examples and the primitive comparisons.

## Keep labels attached to their features

{% include chart-example.html id="geographic-annotations" %}

The annotation variant of the shared example adds West, Central and East using each stop's typed
feature key. This module imports the shared example program shown above; keep its `program.js` and
`fixture.js` together in a `geographic-marks` folder. A negative `dy` places the text sixteen logical
pixels above its projected anchor.

```javascript
import { createGeographicMarks } from "./geographic-marks/program.js";

const labeled = createGeographicMarks()
  .createGeoAnnotation({ id: "west-label", anchor: { type: "feature", geometry: "stops", key: 0 },
    text: "West", dy: -16, align: "center", fontSize: 18, fill: "#0f172a" })
  .createGeoAnnotation({ id: "central-label", anchor: { type: "feature", geometry: "stops", key: 1 },
    text: "Central", dy: -16, align: "center", fontSize: 18, fill: "#0f172a" })
  .createGeoAnnotation({ id: "east-label", anchor: { type: "feature", geometry: "stops", key: 2 },
    text: "East", dy: -16, align: "center", fontSize: 18, fill: "#0f172a" });
```

The anchor follows the original feature when its geometry or projection changes. For an LOD source,
the annotation remembers the selected original level and key even while a coarser feature represents
it. Use a position anchor when the location is meaningful without a named feature. Empty text and
clipped anchors keep their semantic intent while producing no visible text.
