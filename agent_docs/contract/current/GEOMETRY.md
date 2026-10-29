# Geographic and planar geometry sources

Full chart-authoring actions create immutable geometry resources from own-data GeoJSON or TopoJSON.
They do not draw marks. The existing contour geometry and geographic source methods share the
`geometry` kind but have separate validators and eligible selectors. Basic does not register these actions.
Removal uses [removeResource](CORE.md#removeresource). Failure preserves the old program and trace.

## `createGeometryData`

- Signature: `createGeometryData({id,format,values,coordinateKind,featureKey?,topoObject?,limits?})`.
- `id`, `format:geojson|topojson`, source `values`, and `coordinateKind:geographic|planar` are required.
  Geographic x/y means WGS84 longitude/latitude degrees; latitude is[-90,90], longitude remains finite
  and unwrapped. Planar values retain caller units. Additional coordinate dimensions remain in source
  and normalized geometry; two-dimensional consumers use only x/y.
- All GeoJSON geometry types, Feature/FeatureCollection, nested collections and null geometry are
  preserved. Null and empty geometries are nondrawable. Nonempty lines require at least2 positions;
  each ring requires at least4, consistent dimensions and exactly equal first/last positions. Rings are
  never closed or reoriented automatically. Polygon first ring is exterior and following rings are holes.
  JSON foreign members remain in retained source. Optional bbox must be finite paired coordinates;
  declared bbox does not override actual coordinates. Geometry `crs` members are unsupported.
- TopoJSON transforms apply delta accumulation to arc x/y before scale/translate. Unquantized arcs
  contain absolute coordinates. Points apply transform without delta; extra dimensions stay unchanged.
  Negative signed32-bit arc references use their ones-complement and reverse the referenced arc.
  Shared junctions must agree exactly and are included once. Shared arcs and their original references
  remain in the result. A single object is inferred and persisted; multiple objects require `topoObject`.
- Named feature IDs require string or finite number, with typed duplicate rejection. `featureKey` is one
  own field or an exact string[] path such as`"id"` or`["properties","code"]`. The selected values use the
  existing typed row-key grammar. Missing/invalid/duplicate keys fail. Omission allocates persisted
  generated feature identity; source hash and array positions are not logical identity.
- limits default/maxima are maxFeatures100000, maxPositions1000000, maxArcs100000, maxValues2000000,
  maxDepth128; callers may lower them with positive safe integers. Positions count cumulative decode,
  expanded and validation visits. Nested JSON and expanded topology share a10000000 work ceiling.
  Accessors, cycles, holes, nonfinite numbers and non-JSON source values fail before source cloning.
- Stored method:geo, algorithmVersion1, authored ownership, no data inputs, normalized options and
  feature source-path/result plus core identity. Source provenance is`kind:values/hashKind:encoded-values`
  and SHA256 of the retained tagged canonical values; it does not claim original file bytes. No loader
  or renderer fetch occurs. Offline validation compares retained source with deterministic normalization,
  exact topology, feature keys, options, diagnostics and revision without materializing graphics.

### Formal values — `createGeometryData`

- Implemented: `createGeometryData(options: TargetedOptions<CreateGeometryDataOptions>): ChartProgram`.
- Planned: no additional values.
- Proposed (NOT IMPLEMENTED): automatic ring repair.

### Value coverage — `createGeometryData`

- ✅ Covered: all geometry kinds, holes/islands/collections/null, typed identity, quantized/shared arcs, descriptor safety, limits and exact stored validation.
- Evidence: `test/unit/geo/geometry-data.test.js`, `test/unit/geo/geometry-resources.test.js`.

## `editGeometryData`

- Signature: `editGeometryData({target?,values?,coordinateKind?,topoObject?,limits?})`.
- target resolves explicit ID, current eligible geometry source, or one unique eligible source. Contours
  are ineligible. Empty edits, unknown keys and undefined values fail. Format and featureKey policy
  are immutable; create another resource when that policy must change.
- Revision increments once, including same-value explicit edits. Keyed features retain logical keys
  through reorder/value changes. Generated keys survive options-only edits, while whole values replacement
  or changing the selected TopoJSON object allocates new keys without value-based correspondence.
- Limits patches retain unspecified previous limits. TopoJSON object omission preserves the stored
  object selection even when replacement values introduce other objects. Invalid source, keys, limits,
  target or existing consumer compatibility rejects the entire edit before primitive writes.

### Formal values — `editGeometryData`

- Implemented: `editGeometryData(options: TargetedOptions<EditGeometryDataOptions>): ChartProgram`.
- Planned: no additional values.
- Proposed (NOT IMPLEMENTED): automatic identity matching for unkeyed replacement values.

### Value coverage — `editGeometryData`

- ✅ Covered: retained keyed identity, new generated identity, object selection, immutable failure, removal, inspection, Full/Basic and corrupted offline restore.
- Evidence: `test/unit/geo/geometry-resources.test.js`.
