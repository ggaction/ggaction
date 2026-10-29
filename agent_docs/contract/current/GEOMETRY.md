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

## `createGeoJoinData`

- Signature: `createGeoJoinData({id,geometry?,data?,geometryKey,dataKey})`.
- Full only. Requires a missing explicit geometry ID and two explicit key paths. `geometry` resolves
  explicit/current/unique geographic source, join or LOD; contours are ineligible. `data` resolves the
  explicit/current/unique materialized dataset, including a logical derived-data owner.
- Each key is a nonempty own-field string or own-property string array of at most128 fields. The
  geometry path starts at a normalized feature; use `id` or`["properties","code"]`. The table path starts
  at its row. Final keys reuse typed row-key scalars or tuples; numeric1, string"1", and tuple[1] differ.
  Null/absent keys never match each other. Invalid/nonfinite keys, descriptors/accessors, sparse arrays,
  unknown options and excessive work fail before writes. Features are limited to100000 and join work
  including encoded key bytes to10000000.
- The join is1:1: duplicate nonmissing keys on either input fail with `ambiguous-identity` and both
  duplicate counts in error diagnostics. Aggregation must be an explicit preceding data transform.
  No fuzzy matching, coercion, automatic aggregation or generated zero values occurs.
- Feature order, properties, geometry, shared topology and logical feature keys are preserved.
  Unmatched geometry remains present with null rowMap. Matching table rows are exposed as mark fields
  and exact row references; unmatched items have empty fields. Original geometry properties remain in
  the resource and are never merged with table fields. Chained joins preserve geometry and bind the
  current join's table fields. A table value of0 remains0.
- Stored kind:geometry, method:geo-join, algorithmVersion1, authored ownership, observed provenance,
  exact geometry and data inputs. Result contains source features/identity/coordinateKind, optional
  retained topology, rowMap and diagnostics: geometryCount, dataCount, matchedCount, zero duplicate
  counts, unmatchedGeometry/unmatchedData source indices and matched/geometry coverage(empty=0).
  Source rows retain every table row used to determine this result. Inspection reads these values;
  offline restoration validates them against exact retained inputs without I/O.
- Source geometry or table revision recomputes all transitive joins and fitted projections once, then
  updates coordinate/mark refs and rematerializes the final consumer union. Duplicate keys, invalid
  fit, cyclic inputs or incompatible consumers reject the whole operation with old state/trace intact.
  Live authored dependencies restrict removal. Remove dependent marks, coordinates, projections and
  joins explicitly through their existing removal actions before removing their inputs.

### Formal values — `createGeoJoinData`

- Implemented: `createGeoJoinData(options: TargetedOptions<CreateGeoJoinDataOptions>): ChartProgram`.
- Planned: no additional values.
- Proposed (NOT IMPLEMENTED): fuzzy joins and implicit aggregation.

### Value coverage — `createGeoJoinData`

- ✅ Covered: typed1:1 keys, duplicate diagnostics, missing/empty/null, own descriptors and limits,
  exact refs, field selection, source closure, Full/Basic boundaries and corrupted offline restore.
- Evidence: `test/unit/geo/join.test.js`, `test/unit/geo/join-resources.test.js`, `test/contracts/geometry-types.test.js`.

## `editGeoJoinData`

- Signature: `editGeoJoinData({target?,geometry?,data?,geometryKey?,dataKey?})`.
- Explicit target, current eligible join, then one unique join. Raw geometry and contour resources are
  ineligible. Requires a nonempty patch without undefined values. Omitted inputs and key paths retain
  their exact current decisions. Explicit input IDs use the same resolution as creation.
- Every successful edit increments revision once, including a same-value edit. Keys remain the
  geometry input's logical feature keys; replacing that input adopts its identity, without matching
  unrelated regions by value. All dependent joins, fits and marks are refreshed atomically. Self and
  indirect cycles, duplicates, invalid paths/inputs and incompatible outputs fail before writes.

### Formal values — `editGeoJoinData`

- Implemented: `editGeoJoinData(options: TargetedOptions<EditGeoJoinDataOptions>): ChartProgram`.
- Planned: no additional values.
- Proposed (NOT IMPLEMENTED): implicit region identity transfer between unrelated inputs.

### Value coverage — `editGeoJoinData`

- ✅ Covered: inherited/explicit keys and inputs, transitive revision, stable identity and immutable failure.
- Evidence: `test/unit/geo/join-resources.test.js`, `test/contracts/geometry-types.test.js`.

## `createGeoLODData`

- Signature: `createGeoLODData({id,levels,zoom?})`.
- Full only. Create a new explicit geometry ID from ordered coarse-to-fine levels. Root level is
  `{id,geometry,tolerance?}`; each later level also requires `parents:[{key,parent}]`, `enterZoom` and
  `exitZoom`. Level IDs are unique and each geometry ID is explicit. Source geometry must have an
  explicit `featureKey`; joins inherit that source key policy. All levels use one coordinateKind.
  Nested LOD inputs, generated feature keys and non-geographic geometry are rejected.
- Parent keys use the existing typed row-key contract. Each child has exactly one existing parent in
  the immediately preceding level. Missing, duplicate and unknown relationships fail, including
  inactive levels. Empty keyed levels and null geometry remain explicit; no placeholder geometry is created.
- `zoom` defaults to0 and is finite/nonnegative. Each finer level requires `enterZoom > exitZoom >= 0`;
  both threshold sequences strictly increase. Initial resolution starts at the coarsest level.
  Promote at `zoom >= enterZoom`; demote at `zoom < exitZoom`. Equality at exit retains the finer level.
- `tolerance` defaults to0, preserving every vertex. Positive tolerance requires retained shared topology.
  Arcs are simplified once, preserving endpoints, direction references and original z values. Units are
  planar source units or geographic degrees; geographic seam-crossing arcs remain exact. Invalid
  candidate winding, collapse, crossings or containment retains the original topology with a diagnostic.
  Tolerance bounds deviation and does not promise point reduction. Source assets and hashes are unchanged.
- Stored kind:geometry, method:geo-lod, algorithmVersion1, authored ownership and observed provenance.
  Exact geometry inputs own source references. Options retain ordered input roles, level intent, zoom
  and the current activeLevel decision. Result contains active features, independent explicit logical
  identity, coordinateKind, optional topology, all-level logical-key representation mapping and diagnostics.
  At most128 levels,100000 total regions and10000000 units of mapping work are accepted; simplification
  also uses existing geometry budgets. Offline restore validates all retained inputs and bounded results.
- All Geo mark modes and fitted projections consume the active geometry. Fields and original row references
  come from the active source/join. A subsequent join can replace fields without changing representation.
  `getMarkItems` exposes readonly `representationKeys`; actual item/hit key remains the current representation.
  `selectMarks({items:[key]})` keeps its authored original key and matches explicit current representations.
  Selecting a county at state detail does not rewrite the county selection into a state selection.
- Projection edits do not infer zoom. Resource zoom is explicit. Annotation geographic anchors and camera
  gestures are separate consumers; this API does not create labels or author interaction bindings.
- Source revisions validate every level before rebuilding LOD, joins, fitted projections and consumer
  union once. Live dependencies restrict removal; use existing explicit resource/mark removal actions.

### Formal values — `createGeoLODData`

- Implemented: `createGeoLODData(options: TargetedOptions<CreateGeoLODDataOptions>): ChartProgram`.
- Planned: no additional values in this signature.
- Proposed (NOT IMPLEMENTED): implicit hierarchy inference or nested detail resources.

### Value coverage — `createGeoLODData`

- ✅ Covered: typed hierarchy/hysteresis, shared-boundary simplification, source/hash retention, fields,
  original selection correspondence, limits, immutable failure, exact refs and corrupted restore.
- Evidence: `test/unit/geo/levels.test.js`, `test/unit/geo/shared-topology.test.js`, `test/unit/geo/lod-resources.test.js`, `test/contracts/geometry-types.test.js`.

## `editGeoLODData`

- Signature: `editGeoLODData({target?,levels?,zoom?})`.
- Target resolves explicit, current eligible LOD, then one unique LOD. A nonempty patch is required;
  undefined/null values are invalid. Omitted levels and zoom retain their previous intent. Supplied levels
  replace the whole list and must retain the existing active level ID; removing it is an explicit error.
- Hysteresis starts from the stored active level. Every successful edit increments revision once, even
  without a level transition. Logical namespace stays fixed and keys combine level ID with the original
  typed source key. Dependents update atomically. Self/cyclic refs or invalid source correspondence fail
  without changing the original program, trace or caller input.

### Formal values — `editGeoLODData`

- Implemented: `editGeoLODData(options: TargetedOptions<EditGeoLODDataOptions>): ChartProgram`.
- Planned: no additional values in this signature.
- Proposed (NOT IMPLEMENTED): silent active-level reset or generated parent relationships.

### Value coverage — `editGeoLODData`

- ✅ Covered: inherited/explicit intent, stable identity through transitions, source/join/fit closure,
  current selection representations, atomic invalid edits and offline restore.
- Evidence: `test/unit/geo/lod-resources.test.js`, `test/contracts/geometry-types.test.js`.

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

## `navigateProjection`

- Signature: `navigateProjection({target?,operation})`. Full chart authoring; target uses the same
  explicit/current/unique projection inference as editProjection. Every operation is closed and requires
  its stated parameters; invalid input, clipped anchors or incompatible consumers fail atomically.
- `pan`: `{type:"pan",deltaPx:[x,y]}` translates in logical CSS pixels.
- `zoom`: `{type:"zoom",anchorPx:[x,y],factor,scaleExtent:[minimum,maximum]}` requires a finite positive
  factor and positive ordered extent. Clamp the resulting scale and preserve the visible inverse anchor
  to within0.25px, including its composite component. Hidden/non-invertible anchors fail.
- `pinch`: `{type:"pinch",fromPx:[[x,y],[x,y]],toPx:[[x,y],[x,y]],scaleExtent}` combines the two centers'
  translation and distance ratio. Coincident pointers fail. `rotate`: `{type:"rotate",rotateDeg:[x,y,z?]}`
  sets the native absolute spherical rotation; identity and composite projections reject it.
- `reset`: `{type:"reset",initial:ProjectionParameters}` restores explicitly supplied view parameters.
  A frozen `getProjectionView` snapshot supplies these parameters; there is no implicit initial baseline.
  Reset does not restore historical revision numbers or previous live fit policies.
- `fit`: `{type:"fit",fit:ProjectionFitOptions}` delegates the existing live geometry fit contract.
  Other operations commit complete resolved parameters and detach a previous fit dependency.
- `resize`: `{type:"resize",canvas:{width?,height?,plot?},scaling:"preserve"|"fit"}` delegates the nonempty
  Canvas size patch. Native exact-plot/outer-size conflicts remain errors: use explicit `plot:false`
  when switching to outer width/height. Scaling preserve keeps pixel scale; fit multiplies it by the
  smaller settled plot width/height ratio. Both move the previous plot center to the new center.
  Responsive guides settle through editCanvas first. Authored projection clipExtentPx stays unchanged.
- Success advances the chosen projection exactly once and updates its coordinates/marks through
  editProjection. Resize also uses editCanvas and its existing screen-route revision closure.
  The command is one top-level trace node with meaningful native child actions. No camera state,
  callback, DOM handler or renderer-global state is persisted. LOD zoom remains an independent decision.
- `getProjectionView(program,{target?,childPath?})` from `ggaction/inspection` is read-only. It returns
  frozen `{projection:{kind:"projection",id,revision},parameters,viewport}`. Parameters are normalized
  and fit-resolved; viewport is the current logical plot rectangle or null before Canvas creation.
  Child paths address explicit concat children. The query requires a closed program and adds no trace.

### Formal values — `navigateProjection`

- Implemented: `navigateProjection(options: TargetedOptions<NavigateProjectionOptions>): ChartProgram`.
- Planned: no additional operation values.
- Proposed (NOT IMPLEMENTED): implicit renderer-owned camera state.

### Value coverage — `navigateProjection`

- ✅ Covered: explicit pan/zoom/pinch/rotate/fit/reset/resize, native Canvas/plot/responsive layout, exact revisions, concat scope, unchanged identity, offline restoration, invalid/unsafe/ambiguous inputs and immutable failure.
- Evidence: `test/unit/geo/camera-actions.test.js`, `test/unit/geo/camera.test.js`, `test/contracts/geo-camera-types.test.js`.

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
resource-owned geometry. Native style is set by these mark options; field mapping uses the existing
encoding actions described below, and semantic labels use geographic annotation actions.
Generated features/points share a cumulative10000 item ceiling and stream work is bounded at10000000;
source normalization retains its separate configured limits.

## Feature color and size

`encodeColor` accepts ordinary or conditional nominal/ordinal/quantitative/temporal fields on Geo shape, point and line.
It uses the existing field/scale contract: shape/point fill or line stroke, native temporalUnit, continuous
and discretized scales, explicit unknown and existing range/transform behavior. Aggregate and color
layout are incompatible. Shape line parts keep fill none. `encodeSize` accepts quantitative, nominal
or ordinal fields on Geo point only; mapped CSS-pixel area becomes radius `sqrt(area/pi)`. It cannot
coexist with geographic radiusDeg. First change the mark to radiusPx when switching those units.

Fields read original feature properties, a join's current matching table row, or the active LOD level.
MultiPoint parts share one feature value and identity. Null/empty geometry is excluded from scale values
and concrete items; its logical source record remains inspectable. Projection clipping and hidden
backside geometry do not filter domains. Missing/invalid fields require an explicit scale.unknown;
otherwise authoring, resource revision and editable restore reject them. No zero is synthesized.

Native scale create/edit/remove and categorical/gradient/interval/size legends are shared. Omitted
createLegend channels infer existing color and size as separate blocks. A constant `{value}` encoding
removes its field binding and affected legend, restores the native mark style and preserves other
channels. Direct mark fill (shape/point), stroke (line), or radius edits conflict with the corresponding
field mapping; removeEncoding or a constant encoder resolves the conflict explicitly. Removing an
encoding alone restores the dormant native style.

Conditional color and size use the shared `conditions` array and required `otherwise`; the first matching
branch wins. Predicates accept the existing typed expression AST and explicit named selections. Every
branch is validated, including inactive fields, scales and values. Predicate fields read the same
feature/table/active-level view as ordinary encodings. Each drawable feature is one evaluation item;
all pieces share its selected value. Size zero is valid. Other conditional channels, graticules and
annotations are incompatible. Native scales use the full drawable field values of every branch;
predicate membership and projection clipping do not shrink their domains. A legend requires one
unique field/scale binding for its channel. Multiple bindings reject an existing or requested legend
atomically; remove that guide explicitly before changing to an ambiguous conditional mapping.

Parameter and selection revisions update exact branch refs and rematerialize affected consumers.
Selection membership across different marks follows shared source-row lineage; it does not equate
unrelated feature IDs. Graphical feedback cycles reject before writes. Empty geometry can use literal,
parameter or selection predicates, and field mappings retain their explicit native empty-domain policy.
A field predicate on a completely empty feature view rejects because its field type cannot be inferred.

Source geometry, join table and active LOD changes preflight all affected fields and shared scale
candidates before primitive writes, then materialize the scale/mark/guide union once. Projection and
Canvas changes retain pixel-area semantics. Selection channels expose semantic values, including
normalized temporal values, while fields and original lineage stay intact. Scoped concat edits and
offline restoration retain the same meaning. Evidence: `test/unit/geo/encodings.test.js`,
`test/unit/geo/encoding-lifecycle.test.js`, `test/unit/geo/conditional-encodings.test.js`,
`test/contracts/realistic-geographic-encodings.test.js` (five authentic datasets × three ordinary and three
conditional recipes), and the geographic field renderer/installed consumers.

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

## `createGeoAnnotation`

- Signature: `createGeoAnnotation({id?,coordinate?,anchor,text,...textStyle})`.
- Full chart authoring. Requires Canvas and a Geo coordinate resolved by explicit ID, current eligible
  coordinate, then unique eligible coordinate. The deterministic default mark ID is `geo-annotation`;
  a second annotation requires another explicit ID. Text is a required string; an empty string retains
  semantic intent and produces no concrete Text. No data/text encodings are accepted.
- Anchor is exactly `{type:"position",position:[x,y]}` or
  `{type:"feature",geometry?,key,level?}`. Position uses planar source units for identity, or longitude/
  latitude degrees for spherical projections. Feature keys use the shared typed row-key grammar;
  numeric1 and string"1" differ. Feature anchors require a geometry source with explicit `featureKey`.
  Geometry uses explicit/current/unique eligible source inference. Joins retain their table fields/rows.
- Feature positions are computed from the original feature: area-weighted polygon centroid (holes
  subtract), otherwise length-weighted line centroid, otherwise point average. Geographic geometry
  uses the spherical equivalent. Mixed collections use their highest nonempty dimension. Null/empty
  geometry produces no Text; an ambiguous or nonfinite centroid fails before writes. A centroid is a
  semantic center, not a guarantee that the label lies inside a concave polygon.
- For direct or joined LOD, level is an explicit existing level ID or the active level at creation.
  That resolved level is stored once. Later display transitions retain the original feature anchor;
  they do not move a county annotation to its parent centroid. Changing source geometry recomputes
  the original centroid. Missing keys, stale refs, incompatible coordinate kind or invalid levels fail
  atomically. A source/projection revision rematerializes each dependent annotation once.
- Text style shares native Text fill/opacity, fontSize/fontFamily/fontWeight, align/baseline, rotation,
  dx/dy, lineHeight/blockAlign, lineCap/lineJoin/miterLimit, outline/shadow and blend. Defaults are
  native Text defaults (fill#334155, opacity1, fontSize12, sans-serif, normal, left/alphabetic,
  rotation0, dx/dy0), clip:false. Offsets are logical pixels after projection. Native paint/effect/font
  preparation applies. Theme text/font roles update unoverridden values; explicit default-valued
  styles remain explicit. `inheritColor`, data/source fields and positional encodings are unsupported.
- Stored layer mark.type is geo; geoBinding owns mode:annotation, normalized anchor, string text and
  an exact geometry ref for feature anchors. The coordinate owns the sole projection ref. Native Text
  output, resource lineage, item selection, highlight, accessibility, scoped concatenation and offline
  restore use existing owners. Stroke highlight is excluded from Text while fill/opacity apply.
  Clipped features and empty text keep source identity without placeholder graphics. Removal uses
  removeMark before referenced geometry/projection resources can be removed.

### Formal values — `createGeoAnnotation`

- Implemented: `createGeoAnnotation(options: TargetedOptions<GeoAnnotationOptions>): ChartProgram`.
- Planned: no additional values in this signature.
- Proposed (NOT IMPLEMENTED): automatic collision placement and screen-coordinate anchors.

### Value coverage — `createGeoAnnotation`

- ✅ Covered: explicit/source centroids, spherical/planar/null, typed keys, LOD anchor retention,
  joined lineage, fonts/themes/effects, selection, immutable errors, composition and offline restore.
- Evidence: `test/unit/geo/annotation-anchor.test.js`, `test/unit/geo/annotations.test.js`, `test/contracts/geo-mark-types.test.js`.

## `editGeoAnnotation`

- Signature: `editGeoAnnotation({target?,coordinate?,anchor?,text?,...textStyle})`.
- Target resolves explicit, current eligible annotation, then unique annotation. Requires a nonempty
  patch. Omitted fields retain previous values; undefined/null values are invalid. A supplied anchor
  replaces its complete intent. Feature geometry omission retains a previous feature geometry or uses
  the ordinary eligible-resource inference; omitted LOD level captures the then-active level. Switching
  to a position removes the geometry binding. Text/style and source changes preflight the final Text,
  including prepared font queries, before semantic or graphic child writes. Item key remains stable
  for style/text/projection edits; changing feature key/level changes the annotation's item key.

### Formal values — `editGeoAnnotation`

- Implemented: `editGeoAnnotation(options: TargetedOptions<EditGeoAnnotationOptions>): ChartProgram`.
- Planned: no additional values in this signature.
- Proposed (NOT IMPLEMENTED): automatic feature matching when original keys disappear.

### Value coverage — `editGeoAnnotation`

- ✅ Covered: explicit/current target, partial style edits, original feature anchoring, text omission,
  font/theme rematerialization, immutable failed edit, resource lifecycle and exact restoration.
- Evidence: `test/unit/geo/annotations.test.js`, `test/contracts/geo-mark-types.test.js`.

### Attached feature and graticule labels

Full geographic Shape/Point/Line/Graticule marks are eligible existing Text sources. Use the canonical
[`createMarkLabels`](MARKS.md#createmarklabels) and [`createTextMark`](MARKS.md#createtextmark) contract
for field/constant content, centroid anchors, native styles, membership, collision layout and removal.
This source relationship follows geometry/join/LOD/projection revisions without a synthesized dataset.
Graticules expose `axis` and numeric `value`. Fixed geographic annotations remain single-anchor resources.
