---
layout: default
title: Geometry Sources
---

# Geometry sources

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
