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

## `createProjection`

- Signature: `createProjection({id,type,centerDeg?,rotateDeg?,parallelsDeg?,scalePx?,translatePx?,reflectX?,reflectY?,precisionPx?,clipAngleDeg?,clipExtentPx?,fit?})`.
- Full only; requires a new explicit ID and one native type: mercator, equirectangular, equal-earth,
  natural-earth, orthographic, stereographic, gnomonic, azimuthal-equal-area, azimuthal-equidistant,
  conic-equal-area, conic-conformal, conic-equidistant, transverse-mercator, albers-usa or identity.
  Creation stores a reusable projection and does not draw marks or create a coordinate.
- Spherical coordinates use longitude/latitude degrees and CSS-pixel output with downward y. Default
  scalePx150, translatePx[0,0], centerDeg[0,0], rotateDeg[0,0,0], precisionPx0.5 and reflectX/Y:false.
  Identity uses planar units and scalePx1; it accepts scale/translation/reflection/rectangular clipping only.
  The three conic families also accept parallelsDeg, default[30,60], excluding singular ±90 parallels.
  Albers USA has fixed lower48/Alaska/Hawaii components and accepts scalePx/translatePx/precisionPx only.
- Scale and precision must be finite positive numbers; translate is a finite pair, center a finite pair
  with latitude[-90,90], rotation a finite pair or triple. Longitude/rotation are normalized. Clip extent
  is null(default) or two increasing finite corners. Antimeridian clipping is the ordinary spherical
  default, with finite automatic world extent for Mercator/transverse. Orthographic defaults to90°,
  gnomonic60°, stereographic142°, the two azimuthal families179.999°. Those circular projections require
  a non-null positive clip angle: orthographic≤90°, gnomonic<90°, the other three<180°. Other spherical
  projections accept null or an angle in(0,180]. Inapplicable explicit options and undefined values fail.
- Optional fit is `{geometry?,width,height,padding?,pointScale?}`. Width/height are finite positive CSS
  pixels, padding defaults0 and must leave positive inner dimensions. Geometry resolves explicit ID,
  current eligible geographic source, then one unique eligible source; contours are ineligible. The
  exact geometry ref is stored once. Identity requires planar geometry, all other types geographic.
  The viewport is explicit and does not read Canvas size/margins. Fit and explicit scale/translation
  in the same request conflict. Point-only fit uses explicit positive pointScale or the type default.
- Fit uses actual projected geometry bounds, spherical/antimeridian clip and shared bounded stream;
  explicit rectangular postclip is excluded from fitting and retained for the final result. Source
  segments preserve their longitude/latitude interpolation, holes and member paths. Empty/wholly
  clipped source, overflow, unrepresentable viewport precision or stream work/command limits fail.
  Stroke and glyph radius do not expand geometry fit bounds.
- Stored kind:projection, algorithmVersion1, authored ownership, no source rows. Unfitted resources
  have normalized mathematical options, no input refs and empty result. Fitted options omit scale and
  translation and store the resolved fit policy; result contains scalePx, translatePx and final bounds.
  Bounds may be null if the retained rectangular clip excludes the fitted geometry. There are no
  stored callbacks. Offline validation checks exact schema/refs and bounded fit consistency without
  renderer I/O. Typed inspection, comparison and [restrictive removal](CORE.md#removeresource) apply.

### Formal values — `createProjection`

- Implemented: `createProjection(options: TargetedOptions<CreateProjectionOptions>): ChartProgram`.
- Planned: no additional values.
- Proposed (NOT IMPLEMENTED): arbitrary registered projection callbacks.

### Value coverage — `createProjection`

- ✅ Covered: fifteen native types, exact source refs, literal fit/point-only results, independent mathematical kernels, descriptor safety, option conflict, restore and Full/Basic boundaries.
- Evidence: `test/unit/geo/projection-resources.test.js`, `test/unit/geo/projections.test.js`, `test/unit/geo/stream.test.js`, `test/contracts/projection-types.test.js`.

## `editProjection`

- Signature: `editProjection({target?,type?,centerDeg?,rotateDeg?,parallelsDeg?,scalePx?,translatePx?,reflectX?,reflectY?,precisionPx?,clipAngleDeg?,clipExtentPx?,fit?})`.
- Target resolves explicit ID, current projection, then one unique projection. Requires a nonempty patch
  without undefined values. Same-type edits retain unspecified parameters. An explicit different type
  starts from that type's defaults plus the supplied parameters; inapplicable explicit options fail.
- Shape/rotation/precision edits retain an existing fit and recompute its result. A new fit supplies
  width/height and may choose another geometry; omitted geometry retains the existing fit input or uses
  normal unique inference. Omitted pointScale on a new fit uses the current resolved scale. Existing fit
  policy is retained on type changes unless an explicit scale/translation patch detaches it.
- Explicit scalePx or translatePx edits detach the fit dependency and preserve the other current
  resolved transform for same-type edits. A simultaneous fit still conflicts. A successful edit advances
  revision once. Original programs, inputs and traces remain immutable on success or rejection.
- Editing a geographic source recomputes all its fitted projections against the same final source,
  each once, before the semantic write. Invalid fit, empty output or incompatible coordinateKind
  rejects the complete source revision. Projection resources are authored dependents: even geometry
  cascade cannot delete them implicitly; remove the projection first.

### Formal values — `editProjection`

- Implemented: `editProjection(options: TargetedOptions<EditProjectionOptions>): ChartProgram`.
- Planned: no additional values.
- Proposed (NOT IMPLEMENTED): silently retaining a previous fit after invalid geometry.

### Value coverage — `editProjection`

- ✅ Covered: exact revision closure, shape edits, explicit transform override, type defaults, fit source rebind, current/unique/ambiguous resolution, removal protection and atomic failure.
- Evidence: `test/unit/geo/projection-resources.test.js`.
