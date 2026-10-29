# Geographic and planar geometry sources

Full chart-authoring actions create immutable geometry resources from own-data GeoJSON or TopoJSON.
Resource creation does not draw marks; the geographic mark actions below draw through an explicit Geo coordinate. The existing contour geometry and geographic source methods share the
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

## Geographic mark rules

The Full actions below require a Canvas and a Geo coordinate created with
`createCoordinate({type:"geo",projection?})`. The coordinate stores the exact projection InputRef;
a mark stores only that coordinate ID and its exact geometry InputRef. Projection parameters are
CSS-pixel output coordinates, independent of Canvas size. There is no implicit fitting on Canvas edits.
Planar sources require identity; geographic sources require a spherical projection. Native Cartesian,
Polar and Parallel encodings/guides cannot attach to a Geo coordinate.

Shape accepts every normalized source geometry. Point and line reject nonmatching non-null geometry,
including inactive collection members. Shape points and point marks use `radiusPx:3` by default.
Point-only `radiusDeg` draws a geographic spherical disk and conflicts with an explicit radiusPx;
a later radiusPx edit removes the geographic radius. Geographic disks require geographic source units.
Source-segment and great-circle interpolation share the projection stream. Antipodal great-circle
segments require routeHint; explicit `false` removes a stored hint. Original source positions remain unchanged.

Every source feature is one logical item; clipped pieces and collection members retain distinct graphic
roles. Hidden/null features retain source identity without placeholder primitives or hits. Feature fields
are available to named selections and accessible data. Point/line identities survive edits and keyed
reordering. Selection/highlight uses every visible concrete piece; color maps to line stroke or filled
shape/point fill, and `dimOthers` preserves the other pieces' native appearance. Restore validates exact
refs, resolved style, geometry compatibility and coordinate ownership without drawing graphics.

Style accepts FillPaint, string stroke, nonnegative strokeWidth/radiusPx, opacity in [0,1], clip:boolean,
lineCap/lineJoin/miterLimit, outline/shadow (or false reset), and blend normal/multiply/screen/difference.
Default fill is #2563eb, stroke #1f2937, width1, opacity1, butt/miter/10 and clip:false. Point stroke is none
and width0. Line/graticule fill is always none and radiusPx is inapplicable. Clip:true applies current plot
bounds to the mark collection; projection clipping remains independent. Outline/shadow use the shared
appearance normalizer and all four renderers consume only concrete graphicSpec.

Create IDs default to geo-shape, geo-point, geo-line and graticule; duplicates require another explicit ID.
Geometry and coordinate resolve explicit, current eligible, or one unique eligible candidate. Mark edits
resolve explicit/current/unique same-mode targets and require a nonempty patch. All candidate geometry
and dependent fitted projections are preflighted before writes; each source/projection revision increments
once and every dependent mark is rematerialized once. Failures preserve old program and trace.
Remove a mark with removeMark. Live geometry/projection references restrict removeResource, including
cascade; remove consuming marks/coordinates and authored fit projections explicitly first.

Hconcat/vconcat and scoped edits preserve child identities. Implicit row facet/repeat is incompatible with
resource-owned geometry. Current marks expose native style; table joins, field color/size and geographic
label anchors are not accepted by these options. These are separate consumer integration obligations.
Generated features/points share a cumulative10000 item ceiling and stream work is bounded at10000000;
source normalization retains its separate configured limits.

## `createGeoShapeMark`

- Signature: `createGeoShapeMark({id?,coordinate?,geometry?,interpolation?,routeHint?,style?})`; style is the flattened native style options described above.
- Create mixed feature shapes. Omission uses documented inference and defaults.

### Formal values — `createGeoShapeMark`

- Implemented: `createGeoShapeMark(options?: TargetedOptions<GeoShapeMarkOptions>): ChartProgram`.
- Planned: no additional values in this action signature.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `createGeoShapeMark`

- ✅ Covered: default/explicit targeting, compatible geometry, clips/holes/hidden members, style, revisions, atomic errors, immutable restore and scoped composition.
- Evidence: `test/unit/geo/marks.test.js`, `test/unit/geo/mark-consumers.test.js`, `test/contracts/geo-mark-types.test.js`, `test/contracts/realistic-geographic-marks.test.js` (five authentic datasets × three direct recipes), `test/charts/geographic-marks/public.test.js`, `test/charts/geographic-marks/renderer.render.js`, `test/browser/geographic-marks.browser.js`.

## `editGeoShapeMark`

- Signature: `editGeoShapeMark({target?,coordinate?,geometry?,interpolation?,routeHint?,style?})`; style is the flattened native style options described above.
- Edit mixed feature shapes. An edit keeps all omitted decisions.

### Formal values — `editGeoShapeMark`

- Implemented: `editGeoShapeMark(options: TargetedOptions<EditGeoShapeMarkOptions>): ChartProgram`.
- Planned: no additional values in this action signature.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `editGeoShapeMark`

- ✅ Covered: default/explicit targeting, compatible geometry, clips/holes/hidden members, style, revisions, atomic errors, immutable restore and scoped composition.
- Evidence: `test/unit/geo/marks.test.js`, `test/unit/geo/mark-consumers.test.js`, `test/contracts/geo-mark-types.test.js`, `test/contracts/realistic-geographic-marks.test.js` (five authentic datasets × three direct recipes), `test/charts/geographic-marks/public.test.js`, `test/charts/geographic-marks/renderer.render.js`, `test/browser/geographic-marks.browser.js`.

## `createGeoPointMark`

- Signature: `createGeoPointMark({id?,coordinate?,geometry?,interpolation?,routeHint?,radiusDeg?,style?})`; style is the flattened native style options described above.
- Create point features. Omission uses documented inference and defaults.

### Formal values — `createGeoPointMark`

- Implemented: `createGeoPointMark(options?: TargetedOptions<GeoPointMarkOptions>): ChartProgram`.
- Planned: no additional values in this action signature.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `createGeoPointMark`

- ✅ Covered: default/explicit targeting, compatible geometry, clips/holes/hidden members, style, revisions, atomic errors, immutable restore and scoped composition.
- Evidence: `test/unit/geo/marks.test.js`, `test/unit/geo/mark-consumers.test.js`, `test/contracts/geo-mark-types.test.js`, `test/contracts/realistic-geographic-marks.test.js` (five authentic datasets × three direct recipes), `test/charts/geographic-marks/public.test.js`, `test/charts/geographic-marks/renderer.render.js`, `test/browser/geographic-marks.browser.js`.

## `editGeoPointMark`

- Signature: `editGeoPointMark({target?,coordinate?,geometry?,interpolation?,routeHint?,radiusDeg?,style?})`; style is the flattened native style options described above.
- Edit point features. An edit keeps all omitted decisions.

### Formal values — `editGeoPointMark`

- Implemented: `editGeoPointMark(options: TargetedOptions<EditGeoPointMarkOptions>): ChartProgram`.
- Planned: no additional values in this action signature.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `editGeoPointMark`

- ✅ Covered: default/explicit targeting, compatible geometry, clips/holes/hidden members, style, revisions, atomic errors, immutable restore and scoped composition.
- Evidence: `test/unit/geo/marks.test.js`, `test/unit/geo/mark-consumers.test.js`, `test/contracts/geo-mark-types.test.js`, `test/contracts/realistic-geographic-marks.test.js` (five authentic datasets × three direct recipes), `test/charts/geographic-marks/public.test.js`, `test/charts/geographic-marks/renderer.render.js`, `test/browser/geographic-marks.browser.js`.

## `createGeoLineMark`

- Signature: `createGeoLineMark({id?,coordinate?,geometry?,interpolation?,routeHint?,style?})`; style is the flattened native style options described above.
- Create line features. Omission uses documented inference and defaults.

### Formal values — `createGeoLineMark`

- Implemented: `createGeoLineMark(options?: TargetedOptions<GeoLineMarkOptions>): ChartProgram`.
- Planned: no additional values in this action signature.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `createGeoLineMark`

- ✅ Covered: default/explicit targeting, compatible geometry, clips/holes/hidden members, style, revisions, atomic errors, immutable restore and scoped composition.
- Evidence: `test/unit/geo/marks.test.js`, `test/unit/geo/mark-consumers.test.js`, `test/contracts/geo-mark-types.test.js`, `test/contracts/realistic-geographic-marks.test.js` (five authentic datasets × three direct recipes), `test/charts/geographic-marks/public.test.js`, `test/charts/geographic-marks/renderer.render.js`, `test/browser/geographic-marks.browser.js`.

## `editGeoLineMark`

- Signature: `editGeoLineMark({target?,coordinate?,geometry?,interpolation?,routeHint?,style?})`; style is the flattened native style options described above.
- Edit line features. An edit keeps all omitted decisions.

### Formal values — `editGeoLineMark`

- Implemented: `editGeoLineMark(options: TargetedOptions<EditGeoLineMarkOptions>): ChartProgram`.
- Planned: no additional values in this action signature.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `editGeoLineMark`

- ✅ Covered: default/explicit targeting, compatible geometry, clips/holes/hidden members, style, revisions, atomic errors, immutable restore and scoped composition.
- Evidence: `test/unit/geo/marks.test.js`, `test/unit/geo/mark-consumers.test.js`, `test/contracts/geo-mark-types.test.js`, `test/contracts/realistic-geographic-marks.test.js` (five authentic datasets × three direct recipes), `test/charts/geographic-marks/public.test.js`, `test/charts/geographic-marks/renderer.render.js`, `test/browser/geographic-marks.browser.js`.

## `createGraticule`

- Signature: `createGraticule({id?,coordinate?,stepDeg?,extentDeg?,precisionDeg?,style?})`; style is the flattened native style options described above.
- Create longitude and latitude lines. Omission uses documented inference and defaults.
- stepDeg defaults to[10,10], extentDeg to[[-180,-80],[180,80]], precisionDeg to2.5. Steps are(0,180], precision is(0,10], corners are strictly ordered within longitude±180/latitude±90. Lines occur at integer step multiples; the duplicate180 meridian is omitted for a full world. No geometry resource is synthesized.

### Formal values — `createGraticule`

- Implemented: `createGraticule(options?: TargetedOptions<GraticuleOptions>): ChartProgram`.
- Planned: no additional values in this action signature.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `createGraticule`

- ✅ Covered: default/explicit targeting, compatible geometry, clips/holes/hidden members, style, revisions, atomic errors, immutable restore and scoped composition.
- Evidence: `test/unit/geo/marks.test.js`, `test/unit/geo/mark-consumers.test.js`, `test/contracts/geo-mark-types.test.js`, `test/contracts/realistic-geographic-marks.test.js` (five authentic datasets × three direct recipes), `test/charts/geographic-marks/public.test.js`, `test/charts/geographic-marks/renderer.render.js`, `test/browser/geographic-marks.browser.js`.

## `editGraticule`

- Signature: `editGraticule({target?,coordinate?,stepDeg?,extentDeg?,precisionDeg?,style?})`; style is the flattened native style options described above.
- Edit longitude and latitude lines. An edit keeps all omitted decisions.
- stepDeg defaults to[10,10], extentDeg to[[-180,-80],[180,80]], precisionDeg to2.5. Steps are(0,180], precision is(0,10], corners are strictly ordered within longitude±180/latitude±90. Lines occur at integer step multiples; the duplicate180 meridian is omitted for a full world. No geometry resource is synthesized.

### Formal values — `editGraticule`

- Implemented: `editGraticule(options: TargetedOptions<EditGraticuleOptions>): ChartProgram`.
- Planned: no additional values in this action signature.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `editGraticule`

- ✅ Covered: default/explicit targeting, compatible geometry, clips/holes/hidden members, style, revisions, atomic errors, immutable restore and scoped composition.
- Evidence: `test/unit/geo/marks.test.js`, `test/unit/geo/mark-consumers.test.js`, `test/contracts/geo-mark-types.test.js`, `test/contracts/realistic-geographic-marks.test.js` (five authentic datasets × three direct recipes), `test/charts/geographic-marks/public.test.js`, `test/charts/geographic-marks/renderer.render.js`, `test/browser/geographic-marks.browser.js`.
