# 등고선과 이차원 밀도

## 공통 계약

Full chart-authoring API다. `createContourData` 또는 `createDensityContourData`로
주소 가능한 geometry resource를 만들고 `createContourMark`로 line/filled 결과를 그린다.
Basic에는 이 actions와 geometry 복원이 없다. renderer는 concrete compound path만 읽는다.

명시 ID가 우선이며 생략한 참조는 current eligible, 유일한 eligible 순이다. 후보가 없거나
여럿이면 오류다. 옵션은 닫힌 own-data record이고 accessor, unknown key와 잘못된 수치를
거부한다. 실패는 이전 program, caller 입력과 trace를 보존한다. 자원 삭제는
[removeResource](CORE.md#removeresource), mark 삭제는 removeMark가 소유한다.
살아 있는 authored mark가 있으면 cascade도 자원을 삭제하지 않으며 mark부터 명시 제거한다.

## `createContourData`

- Signature: `createContourData({ id, grid, thresholds })`.
- id, grid, thresholds가 필수다. grid는 `{origin:[x,y],dx,dy,width,height,values}`다.
  origin은 finite sample 좌표, dx/dy는 positive finite 간격, width/height는 각각2 이상의
  safe integer다. values는 정확히 width×height개의 row-major finite number 또는 null이다.
- null corner가 하나라도 있는 사각 cell은 전체 제외한다. 빈/누락 영역을 보간하거나0으로
  채우지 않는다. 모든 null과 결과가 없는 threshold도 유효하며 metadata를 보존한다.
- thresholds는 finite strictly increasing 비어 있지 않은 배열이다. level은 `value >= t`,
  band는 `[lower,upper)`이며 마지막 band만 upper를 포함한다. 단일 threshold는 band가 없다.
- marching squares는 선형 edge 보간, scaled asymptotic saddle determinant를 사용한다.
  동점은 top-left/bottom-right 연결이다. touching island를 분리하고 hole을 가장 작은
  enclosing outer에 붙인다. outer는 grid의 y-down 기준 양의 면적, hole은 반대 winding이다.
  world 좌표에서 crossing을 구별할 수 없거나 수치가 overflow하면 오류다.
- geometry revision0, algorithmVersion1을 저장한다. options는 method:contour, source:grid,
  thresholds다. grid의 유일한 소유자는 result.contours.grid다. result.contours에는
  algorithm:marching-squares@1, thresholds[{value,polygons}], bands[{lower,upper,upperInclusive,polygons}]가 있다.
  polygon은 closed outer와 closed holes의 배열이다. result.density는 null, inputs/sourceRows는 비어 있다.
- grid/threshold는 각각10000 이하, marching work `(width-1)*(height-1)*levels*32`는10000000 이하다.
  region boundary는10000 segment 이하, hole containment와 전체 저장 검증은10000000 work 이하다.
  입력 배열 길이는 descriptor 확장 전에 확인한다. 복원은 같은 한도 내 grid 검산으로 저장 결과와
  비교하며 결과를 대체하거나 mark materializer를 실행하지 않는다.

### Formal values — `createContourData`

- Implemented: `createContourData(options: TargetedOptions<CreateContourDataOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): implicit grid inference.

### Value coverage — `createContourData`

- ✅ Covered: literal hill/saddle/hole/islands, masks, equality boundaries, empty regions, immutable inputs and corrupted snapshots.
- Evidence: `test/unit/contour-layouts.test.js`, `test/unit/resources/contour-resources.test.js`, `test/contracts/contour-types.test.js`.

## `createDensityContourData`

- Signature: `createDensityContourData({ id, data?, x, y, weight?, grid, estimator, normalization, bandwidth?, kernel?, thresholds })`.
- materialized dataset의 x/y 열은 finite number이며 weight는 생략하면1, 있으면 finite nonnegative다.
  null/누락/invalid row를 조용히 버리지 않는다. typed row key와 exact source revision을 보존한다.
- grid는 values 없는 위 frame이다. estimator와 normalization은 각각 histogram|kde, unit|count를
  명시한다. count는 weighted mass, unit은 total weight로 나눈다. 둘 다 cell 또는 bandwidth 면적으로
  나눈다. 빈 데이터/total weight0은 zero scalar grid를 만든다.
- histogram은 origin을 bin center로 보고 양 끝을 half step 확장한다. 마지막 upper edge만 inclusive다.
  모든 point가 그 범위 안에 있어야 한다. bandwidth/kernel은 오류다.
- kde는 명시 bandwidth:[hx,hy]와 기존 DensityKernel을 필수로 받는다. 두 축 product kernel을
  sample grid에서 평가한다. 밖의 point도 기여하며 grid 내 mass를 다시 정규화하지 않는다.
  source rows≤10000, point×grid work≤10000000을 적용한다. 합은 compensated finite sum이다.
- geometry source:density, normalized definition, 정확한 data input 하나와 inferred sourceRows를
  저장한다. 모든 원본 row는 density-point role을 가진다. diagnostics는 totalWeight/sourceCount다.
  복원은 source와 definition으로 scalar grid/diagnostics/provenance도 검산한다.

### Formal values — `createDensityContourData`

- Implemented: `createDensityContourData(options: TargetedOptions<CreateDensityContourDataOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): implicit bandwidth or threshold estimation.

### Value coverage — `createDensityContourData`

- ✅ Covered: explicit histogram/KDE, analytic kernels, weighted boundaries, zero total, row provenance and source binding.
- Evidence: `test/unit/contour-density.test.js`, `test/unit/resources/contour-resources.test.js`, `test/contracts/contour-types.test.js`.

## `editContourData`

- Signature: `editContourData({ target?, grid?, thresholds?, data?, definition? })`.
- 기존 source kind를 유지한다. grid resource는 grid/thresholds, density resource는 data/thresholds/
  partial definition을 받으며 density grid는 definition 안에서 수정한다. 빈 patch/undefined는 오류다.
- 같은 ID의 revision을1 올리고 전체 geometry→scale union→own/shared marks→guides/highlights를
  preflight한 뒤 explicit materialization plan을 실행한다. 같은 consumer는 한 번만 갱신한다.
  raw/computed/parameter/prepared source revision도 같은 action closure를 사용한다.
- 잘못된 source 수치, shape, log domain, guide 배치 또는 consumer가 있으면 전체 편집을 거부한다.
  sourceRows는 현재 exact input revision의 모든 실제 row로 교체한다.

### Formal values — `editContourData`

- Implemented: `editContourData(options: TargetedOptions<EditContourDataOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): source-kind conversion.

### Value coverage — `editContourData`

- ✅ Covered: source/raw/computed/prepared revisions, shared scales, identity, atomic failure, codec and target inference.
- Evidence: `test/unit/resources/contour-resources.test.js`, `test/unit/resources/contour-marks.test.js`.

## `createContourMark`

- Signature: `createContourMark({ id?, geometry?, coordinate?, mode?, x?, y?, color?, fill?, stroke?, strokeWidth?, opacity?, clip? })`.
- 기본 ID는 contour이며 이미 있으면 명시 ID를 요구한다. compatible Cartesian coordinate를
  explicit/current/unique로 선택하고 없으면 main을 생성한다. Canvas가 필요하다.
- mode 기본 filled다. line은 각 superlevel의 closed boundary를 그리므로 domain/null-mask 경계도
  포함한다. filled는 threshold 사이 band다. hole은 opposite winding compound path로 유지하며
  disconnected island는 separate concrete child다. empty region은 fake item을 만들지 않는다.
- x/y는 intrinsic coordinates의 기존 quantitative position scale options다. color는 line threshold
  또는 band lower를 매핑하는 continuous/discretized quantitative color options이며 기본 sequential이다.
  기본 scale ID는 `<mark>-x`, `<mark>-y`, `<mark>-color`다. field는 공개 옵션이 아니다.
  x/y auto domain은 전체 grid extent, color는 모든 thresholds를 사용하여 empty region에도 안정적이다.
- color:false는 fixed paint다. 기본 fill:#2563eb, stroke:#1f2937, strokeWidth:1, opacity:1,
  clip:true다. filled fill은 FillPaint 전체를 받는다. line은 fill:none을 저장하며 다른 명시 fill은 오류다.
  opacity0은 유효하다. scale color는 filled fill 또는 line stroke에 적용한다.
- axes/grids/legends는 기존 action으로 명시 생성한다. axis는 namespace scale ID를 명시한다.
  일반 row encoding은 허용하지 않으며 editContourMark가 mapping을 소유한다.
- final item은 nonempty level 또는 band 하나, child role은 island-N이다. identity는 resource ID와
  level/band bounds를 사용하며 topology는 mode와 ring structure를 포함한다. graphic lineage는 exact
  geometry ref이며 density selection의 rows는 전체 기여 source rows다. scale/Canvas 수정과 highlight는
  같은 item owner를 재사용한다. hconcat/vconcat과 scoped editing을 지원한다.
  nonempty item 수 × density source row 수는 10000000 이하이며 mark preflight에서 검증한다.
  접근성 데이터는 최종 value 및 filled band의 lower/upper/upperInclusive를 한 item당 한 행으로 내보낸다.

### Formal values — `createContourMark`

- Implemented: `createContourMark(options?: TargetedOptions<ContourMarkOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): arbitrary field encodings on computed polygon coordinates.

### Value coverage — `createContourMark`

- ✅ Covered: line/filled holes, disconnected islands, exact identity, shared scales/guides, FillPaint, empty grids and composition.
- Evidence: `test/unit/resources/contour-marks.test.js`, `test/contracts/contour-types.test.js`.

## `editContourMark`

- Signature: `editContourMark({ target?, geometry?, coordinate?, mode?, x?, y?, color?, fill?, stroke?, strokeWidth?, opacity?, clip? })`.
- 기존 contour mark를 선택하며 생략 값은 유지한다. 비어 있거나 undefined인 patch는 오류다.
  scale options는 기존 owner로 patch하며 같은 ID의 type 변경은 기존 scale editor를 사용해야 한다.
  새 color ID는 legend를 rebind하고 다른 color family는 기존 legend transition 제약을 적용한다.
  custom family 설정을 버려야 하는 전환은 명시 legend 제거/재생성이 필요하다.
- color:false는 해당 mark의 color legend를 제거한다. 위치 scale 재배정은 기존 axis/grid rebind
  규약을 따르며 다른 consumer의 shared guide를 임의로 빼앗지 않는다.
- mode:line은 fill:none으로 바꾸며 filled로 돌아올 때는 저장된 fill을 유지하므로 새 fixed fill은
  명시한다. style/geometry/scale/coordinate 변경은 기존 materializer를 통해 같은 owner를 갱신한다.

### Formal values — `editContourMark`

- Implemented: `editContourMark(options: TargetedOptions<EditContourMarkOptions>): ChartProgram`.
- Planned: 추가 값 없음.
- Proposed (NOT IMPLEMENTED): topology mutation through primitive IDs.

### Value coverage — `editContourMark`

- ✅ Covered: reverse/range/style/mode edits, color legend reassignment/removal, shared-resource collision and immutable failures.
- Evidence: `test/unit/resources/contour-marks.test.js`, `test/contracts/contour-types.test.js`.

## Composition and revision closure

Resource-backed contours support `hconcat`/`vconcat` and scoped edits. `facet` and
`repeatCharts` reject implicit partitioning because a stored geometry has no single
row-encoding binding. Explicit geometry resources and composition remain available.
All contour candidates affected by one source revision are computed and preflighted
before writes. Their scale, mark and guide plans are merged and deduplicated against
the final candidate state. Failure preserves the original program and trace.
