# Core action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## Shared Cartesian admission

최상위 Full/Basic action은 최종 immutable candidate의 Cartesian frame을
[단일 Y 계약](AXES.md#single-y-per-cartesian-frame)으로 검증한다. 잘못된 candidate는
호출자에게 반환하지 않으며 이전 program과 trace는 그대로다. `editSemantic`의 직접 후보,
composition child snapshot 및 editable import도 같은 검증을 적용한다. 미완성 extension
assignment는 concrete mark가 생기기 전까지 coordinate reference를 지연할 수 있다.
완성된 frame에서 서로 다른 Y identity, 숨긴 독립 Y 또는 보이는 mirror axis는 거부한다.

## `createCanvas`

- Signature: `createCanvas({ width?, height?, background?, margin?, plot?, plotBorder?, responsive? })`
- 목적과 필수 state: Canvas가 없는 program에 logical Canvas와 plot bounds를 만든다.
- `width`
  - Status: Implemented. 양의 finite number이며 기본값은 `640`이다.
  - Effect: `canvas.properties.width`와 plot width를 결정한다. 이후 auto-range scale,
    mark, axis, grid, legend와 title geometry의 기준이 된다.
- `height`
  - Status: Implemented. 양의 finite number이며 기본값은 `400`이다.
  - Effect: Canvas와 plot height를 결정하고 모든 y geometry 및 reserved layout에 영향을 준다.
- `background`
  - Status: Implemented. 비어 있지 않은 color string이며 기본값은 `"white"`다.
  - Effect: concrete Canvas background만 바꾸며 semantic state에는 들어가지 않는다.
- `margin`
  - Status: Implemented. non-negative finite scalar 또는 `{ top?, right?, bottom?, left? }`다.
    scalar는 네 방향에 broadcast되고 partial object는 기본 margin의 나머지 방향을 유지한다.
  - Effect: graphical materialization config의 plot bounds를 결정한다. Canvas 생성 시 아직
    consumer가 없으므로 rematerialization은 발생하지 않는다.
- `plot`
  - Status: Implemented. `{ width: PositiveFinite, height: PositiveFinite }`는 내부 플롯 크기를 고정하고
    guide authoring의 측정된 overflow만큼 외부 Canvas와 해당 margin을 함께 늘린다. Full/Basic 공통이며
    fixed outer `width`/`height`와 함께 지정할 수 없다. `false`는 일반 외부 크기 모드다.
  - Effect: canonical Canvas config에 저장한다. Guide transaction은 최대 16회, 0.25px margin 격자로
    재시도하며 이전 program/실패 trace는 변경하지 않는다. 회전 라벨의 가장 가까운 측정 edge를
    plot edge에서 offset만큼 바깥으로 배치한다. Title은 기존 guide 바깥에 배치한다.
  - Coverage: `test/unit/actions/canvas/inner-plot-size.test.js`의 Full/Basic, 충돌 옵션,
    resize, persistence, text metrics, title와 고정 외부 모드 회귀를 검증한다.
- `plotBorder`
  - Status: Implemented. Full/Basic 공통이며 기본값은 `false`다. `false`는 비활성화하고
    `{ color?: NonEmptyString, lineWidth?: PositiveFinite, underlay?: boolean }`는 내부 플롯 테두리를 활성화한다.
    `{}`의 기본 style은 `color: "#ddd"`, `lineWidth: 1`이다. `true`, 비객체와 unknown key는 거부한다.
  - `lineWidth`는 resolved plot width와 height 중 작은 값보다 엄격히 작아야 한다.
    stroke 중심은 plot edge에서 반 폭만큼 안으로 들어가므로 painted outer bounds는 plot bounds와 같다.
  - Effect: immutable Canvas materialization config에 저장하며 stable internal rectangle `plotBorder`로 그린다.
    기본은 ordinary marks 위, axes 아래다. `underlay:true`는 같은 rectangle을 marks 전에 배치한다.
    Boolean만 받고 생략/false는 optional intent를 저장하지 않는다. Border object replacement에서
    underlay 생략도 기본 overlay로 복원한다. 다른 Canvas 속성만 편집하면 현재 정책을 유지한다.
    mark/scales/plot size/margins/clipping은 변경하지 않는다.
    내부 wrapped `rematerializePlotBorder`가 Canvas, scale, data 및 facet replay에서 최종 plot bounds를 따른다.
    semantic state나 public direct action을 추가하지 않는다. 생략한 기존 차트는 테두리가 생기지 않는다.
  - Coverage: `test/unit/actions/canvas/plot-border.test.js`와 `test/unit/actions/guides/plot-underlays.test.js`의 Full/Basic, default off, style default,
    stroke inset, plot bounds, draw order, invalid style 및 immutable replay 계약을 검증한다.
- 오류와 상호작용: unknown option, invalid dimension/color/margin, 두 번째 Canvas를 거부한다.
- Coverage: `test/unit/actions/canvas/create-canvas.test.js`,
  `test/unit/grammar/layout/canvas-layout.test.js`가 defaults, partial options, invalid values와
  duplicate를 검증한다.

### Formal values — `createCanvas`

- Implemented: `createCanvas({ width?: PositiveFinite; height?: PositiveFinite; background?: NonEmptyString; margin?: Margin; plot?: false | { width: PositiveFinite; height: PositiveFinite }; plotBorder?: false | { color?: NonEmptyString; lineWidth?: PositiveFinite; underlay?: boolean } } = {})`
- Proposed (NOT IMPLEMENTED): `{ width?: "auto"; height?: "auto"; margin?: "auto" }`

### Value coverage — `createCanvas`

- `width`, `height`
  - ✅ Covered: 생략(default `640 × 400`), 양의 정수/소수, 0·음수·`NaN`·`Infinity` rejection.
  - 🟣 Proposed: `"auto"` 또는 responsive dimension. Canvas resize observer와 renderer logical size
    contract가 필요하며 모든 auto-range consumer를 rematerialize해야 한다.
- `background`
  - ✅ Covered: 생략(`"white"`), non-empty color string, empty/non-string rejection.
  - No proposal: 현재 arbitrary Canvas-compatible color string으로 충분하다.
- `margin`
  - ✅ Covered: 생략, scalar, partial/full object, zero, negative/non-finite rejection, plot보다 큰 margin rejection.
  - 🟣 Proposed: `"auto"` margin. guide/title text measurement가 생기기 전에는 안전하게 계산할 수 없다.
- Evidence: `test/unit/actions/canvas/create-canvas.test.js`,
  `test/unit/grammar/layout/canvas-layout.test.js`.

### Responsive fixed Canvas

`createCanvas`(Full/Basic)와 `editCanvas`(Full)는 `responsive: false | { minPlotSize?: { width: PositiveFinite, height: PositiveFinite } }`를 지원한다. 기본 minimum은 기존 fitCanvas와 같은160×120이다. Omission은 intent 보존, false는 policy/result 제거다. Exact-inner `plot`과 함께 쓰지 않는다. Outer width/height와 authored margin은 고정이며 `materializationConfigs.canvas.responsiveResult.snapshot.plot`에 derived reservation을 저장한다. 최종 bounds는 공통 `resolveGraphicBounds`만 읽는다.

기존 guide transaction과 scale/source/font dependency plan이 명시적으로 최대4회 측정한다. 최초 후보는 authored margin에서 시작하고 필요한 reservation은 기존0.25px 격자로 위쪽 반올림한다. 인접 plot·occupied·guide 경계의 최대 차이가0.1px 이내이고 minimum 및 containment를 만족해야 성공한다. Containment에는 계산 roundoff용16ULP만 허용하며 crop tolerance는 없다. A-B-A 반복,4회 미수렴, 공간 부족은 `layout-unsatisfied`와 reason/required bounds를 반환하고 이전 program/trace를 보존한다. 중간 측정 context는 반환·저장되지 않는다. Background-only edit는 결과를 보존한다.

`inspectProgram().layouts`는 childPath별 policy/result와 Cartesian label 선택을 read-only로 반환하며 layout을 실행하지 않는다. Editable restore는 closed shape·finite geometry·minimum·bounds를 검사하고 renderer는 저장된 concrete output만 읽는다. 정확 font profile의 누락 query는 기존 `metrics-required`이며 준비 closure가 bounded replay로 수집한다. Polar/Parallel은 기존 label 의미를 유지하고 Canvas의 예약 공간 계산에 참여한다. Concat child는 명시적으로 편집한 child를 `replaceCompositionChild`로 교체한다.

Evidence: `test/unit/actions/canvas/responsive-layout.test.js`, `responsive-lifecycle.test.js`, `test/unit/grammar/responsive-state.test.js`, `test/unit/layout/responsive-policy.test.js`, `test/contracts/responsive-layout-types.test.js`, `test/charts/responsive-guides/`, `test/browser/responsive-guides.browser.js`.

## `editCanvas`

Canvas의 prospective size/margin이 독립 Cartesian frames를 겹치게 하면 첫 graphical child
전에 같은 단일 Y frame 검증으로 거부한다. Responsive에서는 stale 이전 reservation 대신
현재 후보 plot을 검사하고 각 measured retry도 같은 read-only 검증을 거친다. Native 경로
viewport 준비와 실제 rematerialization은 이 후보와 기존 의존 계획을 사용한다. 생성 중의
정규화 anchor/snapshot 임시 assignment는 outer owner가 완성한 뒤 검사한다.
증거: `test/unit/actions/canvas/frame-admission.test.js`와 기존 responsive/route lifecycle tests.

- Signature: `editCanvas({ width?, height?, background?, margin?, plot?, plotBorder?, responsive? })`
- 목적과 필수 state: 기존 Canvas의 한 개 이상 property를 immutable하게 편집한다.
- `width`, `height`, `background`, `margin`
  - Status: Implemented. 값 계약은 `createCanvas`와 같다. 생략한 property는 기존 값을 유지한다.
  - Effect: width/height/margin은 auto-range scale을 시작점으로 모든 registered consumer의
    deterministic materialization plan을 실행한다. background만 바꾸면 consumer를 다시 만들지 않는다.
  - Interaction: explicit scale range는 Canvas bounds 변경으로 재계산되지 않는다.
  - Axis labels는 같은 deterministic plan에서 뒤이어 다시 배치할 동일 owner의 title을
    이전 위치와 비교하지 않는다. 실제 title leaf와 최종 guide 검사로 새 상태의 충돌을 거부한다.
    Label-only edit이나 다른 owner의 title은 이 형제 replay 범위에 해당하지 않는다.
- `plot`: 생략하면 기존 모드를 유지한다. 새 내부 크기 또는 `false`로 전환할 수 있다. 활성 모드에서 margin 편집은 내부 크기를 유지하며 외부 Canvas를 재계산한다.
- `plotBorder`: 생략하면 현재 설정을 유지한다. `false`는 설정을 비활성화하고 concrete border를 제거한다.
  객체는 complete style configuration이며 partial patch가 아니다. 생략한 style field는 이전 값 대신
  기본 `color: "#ddd"`, `lineWidth: 1`로 돌아간다. 다른 값/배치/검증 규칙은 `createCanvas`와 같다.
  테두리만 편집해도 mark/scales의 의미나 geometry는 바뀌지 않는다. 새 plot 크기에 폭이 맞지 않으면 immutable하게 거부한다.
  - Coverage: `test/unit/actions/canvas/plot-border.test.js`가 omission 보존, complete object reset,
    `false` 제거, bounds 변경과 source/facet replay 및 실패 시 이전 program 보존을 검증한다.
- 오류: 빈 edit, Canvas 부재, unknown option과 invalid resolved bounds를 거부한다.
- Coverage: `test/unit/actions/canvas/edit-canvas.test.js`가 partial edit, margin-only edit,
  auto/explicit range 차이와 rematerialization을 검증한다.

### Formal values — `editCanvas`

- Implemented: `editCanvas({ width?: PositiveFinite; height?: PositiveFinite; background?: NonEmptyString; margin?: Margin; plot?: false | { width: PositiveFinite; height: PositiveFinite }; plotBorder?: false | { color?: NonEmptyString; lineWidth?: PositiveFinite; underlay?: boolean } })`; 최소 한 property가 필요하다.
- Proposed (NOT IMPLEMENTED): `createCanvas`의 `"auto"` dimension/margin과 동일하다.

### Value coverage — `editCanvas`

- `width`, `height`, `margin`
  - ✅ Covered: 한 property만 변경, 여러 property 변경, unchanged omission, auto-range rematerialization,
    explicit-range preservation과 invalid resolved bounds.
  - ✅ Covered: multi-legend/title resize와 shared-scale consumer plan은 각 owning layout test와
    `editCanvas` plan/convergence test의 bounded composition으로 검증하며 exhaustive cross-product는 비대상이다.
- `background`
  - ✅ Covered: background-only edit가 scale/mark/guide를 rematerialize하지 않음.
- Empty options
  - ✅ Covered: `{}` rejection.
- Proposed values는 `createCanvas`의 responsive/auto 후보와 동일하다.
- Evidence: `test/unit/actions/canvas/edit-canvas.test.js`.

## `fitCanvas`

- Signature: `fitCanvas({ padding?, minPlotWidth?, minPlotHeight?, iterationLimit?, overflow?, align? } = {})`
- 목적과 필수 state: Full unit program의 기존 Canvas와 현재 layout resource를 기준으로 네 margin을
  줄여 plot 영역을 확장한다. Canvas `width`/`height`, semantic state와 explicit resource option은
  유지한다. Basic에는 노출하지 않으며 composition 호출은 명시적 scope 오류로 거부한다.
- `padding`: 각 edge가 가질 최소 margin인 non-negative finite number이며 기본값은 `0`이다.
- `minPlotWidth`, `minPlotHeight`: 최종 plot의 양의 finite 최소 크기이며 기본값은 각각 `160`, `120`이다.
- `iterationLimit`: edge별 probe 상한인 `1..64` 정수이며 기본값은 `32`다.
- `overflow`: `"error" | "report"`, 기본값은 `"error"`다. Error는 원자적으로 거부한다. Report는
  마지막 유효 margin을 적용하고 `materializationConfigs.fitting.result`에 `"overflow"` 상태와 issue를 저장한다.
- Effect: top→right→bottom→left 순서로 0.25px 격자의 bounded binary search를 수행한다. 각 probe는
  `editCanvas({ margin })`의 기존 consumer rematerialization과 guide collision 검증을 사용한다.
  성공 결과는 normalized policy, final margin/plot, probe 수, status, issue, layout signature를 저장한다.
- 결정성과 lifecycle: 같은 layout과 policy의 반복 호출은 graphic/config가 정확히 같은 상태로 수렴한다.
  이후 resource가 바뀌면 다음 명시적 `fitCanvas` 호출이 새 signature로 다시 계산한다. 저장된 결과는
  마지막 호출의 기록이며 자동 resize observer나 지속 compiler가 아니다.
- Exact-inner `plot` 모드는 plot 크기를 유지하고 실제 graphic bounds를 기준으로 자동 확장 margin을 회수한다. `createCanvas`/`editCanvas`에서 사용자가 지정한 margin은 `requestedMargin`으로 보존한다. `align: "center"`는 필요한 ink clearance 바깥의 여유 공간을 두 방향으로 균등 분배한다. 기본 `align: "preserve"`는 각 edge의 명시적 최소 margin을 유지한다. Fixed-outer에서 `align: "center"`는 거부한다.
- 오류: Canvas 부재, unknown/invalid option, minimum plot 또는 iteration bound 미충족을 정책에 따라
  거부하거나 보고한다. Fixed-outer에서는 Canvas를 확대하지 않는다. Exact-inner에서는 plot 크기를 보존하며 필요한 외부 크기를 재계산한다.

### Formal values — `fitCanvas`

- Implemented: `fitCanvas({ padding?: NonNegativeFinite; minPlotWidth?: PositiveFinite; minPlotHeight?: PositiveFinite; iterationLimit?: Integer<1,64>; overflow?: "error" | "report"; align?: "preserve" | "center" } = {}): ChartProgram`
- Proposed (NOT IMPLEMENTED): composition-wide fitting.

### Value coverage — `fitCanvas`

- ✅ Covered: fixed Canvas, margin-only child edit, 0.25px output, bounded probes, exact repeated convergence.
- ✅ Covered: exact-plot automatic reservation reclamation, preserved authored margins, centered outer clearance, persistence and repeat fitting.
- ✅ Covered: invalid policy, Canvas absence, Full/Basic boundary, minimum plot error/report와 input immutability.
- ✅ Covered: semantic/scale-domain/order invariance, explicit-range preservation, Current catalog,
  package와 browser consumer. Auto range는 fitted plot bounds로 재계산한다.
- Visual boundary는 `fitted-long-labels`에서 explicit final margin primitive와 public fitting 결과의
  graphic/renderer/PNG equivalence로 검증한다.
- Evidence: `test/unit/actions/canvas/fit-canvas.test.js`, `test/contracts/fitting.test.js`,
  `test/charts/fitted-long-labels/`.

## `applyTextMetrics`

- Signature: `applyTextMetrics({ profile })` 또는 `applyTextMetrics({ prepared, requestToken })`.
- Exact font overload: `await prepareTextMetrics(program,{id,fonts},host)`의 authentic handle을 동일한 원 receiver와 현재 token에 적용한다. Full의 명시 font resource IDs만 해석하며 같은 family/style/weight 두 개는 ambiguous로 거부한다. Host는 `{requestToken,decode,measure,signal?}`이며 저장된 bytes만 decode/measure한다. 기존 schema 1의 입력과 estimate 의미는 아래와 같이 보존한다.
- Schema 2: `{schemaVersion:2,id,fonts:[{resource:{kind:"font",id,revision},identity:{contentHash,family,style,weight,metricsProviderVersion}}],measurements:[{text,fontFamily,fontSize,fontWeight,fontStyle,width}]}`. 새 authoring object 입력이 아니라 준비 결과의 저장형식이다. 모든 query의 exact binding이 필요하고 누락 시 `metrics-required`, 미등록 tuple은 `unresolved-font`로 실패한다. 추정값으로 통과하지 않는다. `profile`와 `prepared/requestToken` 혼합 및 prepared overload의 scoped target은 거부한다.
- Closure: 기존 explicit typography rematerializer를 private candidate에서 반복 실행하여 실제 요구 query만 준비한다. 128 UTF-16 units 이하의 missing text는 grapheme prefix도 batch로 측정한다. 고정 상한은 64 bindings, unique 64MiB, 10,000 query, 합계 1,048,576 UTF-16 units, 256 passes다. 상한 전에 callback을 차단하며 지연·abort·mismatched provider/bytes 오류는 원래 state/trace를 보존한다. 새 label query가 필요한 편집은 원자적으로 실패한다. `removeTextMetrics()` → 편집 → 새 exact receiver 준비/적용으로 갱신한다.
- Schema 2의 domain text는 실제 선택한 self-contained font bytes를 concrete text에 저장한다. Composition은 parent font resources를 정확히 채택하며 child의 동명 상이 자원을 덮지 않는다. Offline 복원은 resource revision/identity 및 일치하는 concrete font의 byte/provider identity를 검사한다. 독립 primitive text의 다른 font tuple은 extension 소유로 유지한다.
- 목적과 필수 state: Full unit/composition에서 host가 측정한 text width를 저작용 배치에 적용한다. Canvas 이전에도 적용할 수 있다. Renderer는 기존 concrete text만 그린다.
- Profile: `{ schemaVersion: 1, id: NonEmptyUserId, measurements: TextMeasurement[] }`. 각 measurement는 정확한 `{ text: string, fontFamily: NonEmptyString, fontSize: PositiveFinite, fontWeight: 100|200|300|400|500|600|700|800|900, fontStyle?: "normal"|"italic", width: NonNegativeFinite }`다. 빈 문자열/빈 measurement 배열/0 width는 유효하다. Root/measurement key는 closed이며 tuple 조합의 중복, 희소 배열, 잘못된 값은 거부한다.
- 매칭: text/family/size/normalized weight/style의 exact match다. 생략 style은 normal이며 italic과 별도 측정된다. 생략 family는 shared sans-serif, weight는 normal=400, bold=700; numeric weight는 renderer의 100 단위 rounding/clamping을 공유한다. 지원되는 numeric string도 같은 weight다. 미일치 font/text 조합과 그 외 CSS relative weight는 기존 deterministic estimate를 사용한다.
- 효과: canonical `materializationConfigs.textMetrics`에 clone/freeze한 profile만 저장한다. Private immutable-key cache는 측정 lookup 비용만 줄인다. Typography, source data와 scale mapping을 바꾸지 않는다. Text mark/label placement·collision layout, tree/treemap/graph의 resource-backed labels, Cartesian/Polar/Parallel guides, 범례와 title의 기존 wrapped rematerialization과 전체 guide collision 검증을 수행한다.
- Composition: root와 모든 현재 nested child에 같은 profile을 적용하고 ancestor layout/header/shared guide를 재계산한다. Basic child는 같은 state의 Full snapshot으로 채택한다. 이전 child profile을 history frame으로 보관하지 않는다. 이후 concat child replacement/insertion과 retained facet/repeat replay는 현재 parent profile을 사용한다.
- 실패 원자성: 모든 candidate와 descendant materialization이 성공한 새 program만 반환한다. overflow/collision 등 기존 배치 규칙의 실패는 이전 program과 caller profile을 변경하지 않는다.
- 지속성: 일반 domain edit, Canvas 변경과 source revision이 같은 policy를 소비한다. Editable persistence는 profile을 보존·검증한다. Render-only snapshot은 이미 계산된 graphic tree만 저장한다. Backend/font callback은 저장하지 않는다.
- Evidence: `test/unit/actions/text-metrics.test.js`, `test/contracts/text-metrics-types.test.js`.

### Formal values — `applyTextMetrics`

- Implemented: `applyTextMetrics(options: ApplyTextMetricsOptions): ChartProgram` (legacy profile 또는 prepared exact metrics).
- Proposed (NOT IMPLEMENTED): none.

### Value coverage — `applyTextMetrics`

- ✅ Covered: exact/normalized match, 0 width, unmatched fallback, Unicode text, closed keys/schema/duplicate/invalid values, owned input, trace, pre-authoring application, title rewrap, Canvas/edit persistence, retained composition, whole action corpus empty-profile equality and editable persistence.
- ✅ Covered: tree/treemap/graph labels의 exact query 준비·font 교체·제거·offline 복원 및 Canvas/SVG/PNG/PDF/scene 소비. 저장된 layout resource와 계산 결과를 유지하며 layout solver를 다시 실행하지 않는다. Evidence: `test/unit/resources/font-resource-labels.test.js`.
- ✅ Covered: exact font/profile preparation, no-estimate missing query, stale/token/abort, font revision, nested resource adoption, Cartesian/Polar/Parallel/facet/repeat closure, actual Korean/combining/emoji and four output paths. Evidence: `test/unit/resources/font-public-preparation.test.js`, `test/unit/resources/font-layout-lifecycle.test.js`, `test/charts/font-assets/`.

## `removeTextMetrics`

- Signature: `removeTextMetrics()`
- 효과: active profile을 제거하고 기존 estimate로 같은 dependency closure를 재계산한다. Composition은 root와 descendants의 profile을 제거한다. Profile 이전의 typography나 다른 profile history를 복원하지 않는다.
- 오류: active profile 없음, unknown/non-object options와 재계산 실패를 거부한다. 원본은 보존한다. Basic entry에는 두 metrics action 모두 없다.
- Evidence: `test/unit/actions/text-metrics.test.js`, `test/contracts/text-metrics-types.test.js`.

### Formal values — `removeTextMetrics`

- Implemented: `removeTextMetrics(): ChartProgram`.
- Proposed (NOT IMPLEMENTED): none.

### Value coverage — `removeTextMetrics`

- ✅ Covered: unit/composition removal, deterministic restoration, inactive rejection, persistence round trip and Full/Basic boundary.

## `applyTheme`

- Signature: `applyTheme({ theme, scope? })`
- 목적과 필수 state: Unit 또는 composition program에 지속되는 시각 기본값을 적용한다. Canvas나
  mark가 생기기 전에도 호출할 수 있고, 이후 action이 만드는 resource에도 active policy를 적용한다.
- `theme`
  - Status: Implemented. `"light" | "dark"` 또는
    `{ base: "light" | "dark", tokens: Partial<ThemeTokens> }`다.
  - Custom object는 `base`와 `tokens`를 모두 요구한다. `tokens`는 `background`, `mark`, `text`,
    `strongText`, `mutedText`, `axis`, `axisTitle`, `grid`, `border`, `sizeSymbol`,
    `regressionBand`, `boxLine`, `boxMedian`, `referenceLine`, `referenceBand`,
    `gradientCenter`, `highlight`, `fontFamily`, `axisLabel`, `axisLabelFontFamily`,
    `axisTitleFontFamily`, `axisLabelFontSize`, `axisTitleFontSize`, `fontSize`, `fontWeight`,
    `axisStrokeWidth`, `tickStrokeWidth`, `tickSize`, `gridStrokeWidth`, `axisLabelGap`, `axisTitleGap`,
    `legendItemGap`, `palette`, `patternPalette`의 closed vocabulary다.
    FontSize token은 positive finite number이고, fontWeight는 finite number 또는 non-empty string이며
    guide geometry 및 axis gap token은 nonnegative finite number다. `legendItemGap`은 native legend 계약대로 positive finite number다.
    `palette`는 비어 있지 않은 color string 배열, `patternPalette`는 비어 있지 않은 PatternPaint 배열이며
    최대 길이는 기존 generated item budget(10000)이다. 나머지는 non-empty string이다.
    `fontWeight: 0` 및 guide geometry의 0도 명시값으로 보존한다.
  - Guide geometry token은 각 native axis line/tick/grid의 lineWidth와 tick length 기본값을 CSS px로
    지정한다. Cartesian/named/Polar/Parallel 및 Basic의 기존 소비자에만 적용하며 새로운 guide를 만들지 않는다.
    명시한 direct/facade guide 값은 같은 기본값이나 0이어도 우선한다. 제거 또는 partial token 생략 시
    각 family 기본값을 복원한다. 기존 wrapped guide materializer와 전체 guide layout 검증을 거치고
    Canvas dimensions/margins와 scale domain을 바꾸지 않는다. 부족한 공간은 원자적으로 거부한다.
  - `axisLabelGap`과 `axisTitleGap`은 기존 guide offset 기본값이다. Cartesian 자동 title은 gap을 preferred offset으로
    사용하고 기존 collision 보정을 유지한다. 직접 지정한 0 또는 `{from:"labels",gap}`은 우선한다.
    `legendItemGap`은 categorical, item, sampled/interval 및 opacity 범례의 기존 간격에 적용하며
    연속 gradient bar의 geometry에는 적용하지 않는다. 모든 값은 초기 생성과 재배치에서 같은 owner를 쓴다.
  - `palette`는 ordinal categorical color/stroke의 자동 range만 바꾼다. 명시 range, literal color와 continuous scale은 유지한다.
    `patternPalette`는 Point/Bar/Area/Arc/Rect/Text의 자동 categorical fill과 categorical legend symbol에 적용한다.
    typed scale domain 순서로 순환하며 scalar color range에 pattern을 저장하지 않는다. Native pattern의 origin,
    alpha, bounds와 work budget을 공유한다. 선택 강조는 패턴 baseline 뒤 재적용한다.
  - Axis 전용 token은 Cartesian/Polar/Parallel 축에만 적용한다. Role font family 미지정은
    global fontFamily, size 미지정은 global fontSize, 그것도 없으면 family 기본값(label 12/11/11, title 13)으로 돌아간다.
    axisLabel 미지정은 Cartesian/Polar text, Parallel axis 색을 사용한다.
    초기 guide 공간 검사부터 active font를 적용하며 explicit role style이 우선한다.
  - Partial token은 base 위에 한 번만 overlay한다. 다음 `applyTheme`은 이전 partial token과 merge하지
    않으므로 생략한 token은 새 base 값으로 돌아간다.
- `scope`
  - Status: Implemented. `"self" | "descendants"`다.
  - Unit 기본값은 `self`이며 `descendants`도 unit state에서는 `self`로 정규화한다.
  - Composition 기본값은 `descendants`다. `self`는 composition root Canvas background만 바꾼다.
    `descendants`는 root, 현재 nested child, facet/repeat 재생으로 생기는 future child와 parent-owned
    facet header/shared guide를 갱신한다.
- 우선순위와 상호작용: explicit user style > newest applicable theme request > earlier request >
  built-in light다. 같은 값으로 직접 지정한 style도 explicit이다. Parent theme은 child-local frame을
  덮어쓰지 않고 아래에 보존하므로 parent removal 뒤 newest child frame이 복원된다. Field-driven
  palette는 위 optional palette token이 없으면 유지한다. Semantic state, position scales, grouping, 통계와 order는 보존한다.
  기본 highlight paint는 active `highlight` token을 사용하고 explicit highlight paint는 보존한다.
  `fontFamily`, `fontSize`, `fontWeight` 변경은 Text, axis, legend, title, facet header를 다시 materialize해 text bounds와
  composition layout을 검증한다. Global size/weight는 optional이며 생략하거나 마지막 frame을 제거하면
  각 native family의 기본값으로 돌아간다. Plot style, guide facade의 role style, legend block, header style와
  named highlight는 theme보다 우선한다. Exact font profile에 새 크기의 측정이 없으면 `metrics-required`,
  새 family/style/weight binding이 없으면 `unresolved-font`로 전체 변경을 거부한다.
  Graph/Tree/Treemap plot의 기본 node/cell fill은 `mark`, 경계선은 `background`, edge/link는
  `mutedText`, label은 `text`/`fontFamily` 및 optional `fontSize`/`fontWeight`를 따른다. 명시한 역할별 style과 node별 overrides는
  theme보다 우선한다. 마지막 frame을 제거하면 각 plot family의 기본값을 복원하며, 저장된
  graph/hierarchy/layout 결과·revision·item key는 변경하거나 재계산하지 않는다.
  Flow node body는 `mark`/`background`, link ribbon fill은 `mutedText`, label은
  `text`와 typography token을 따른다. 명시한 nodes/links/labels style과 typed-key overrides는
  기본값과 같아도 우선한다. Label false→{} reset은 이전 label override를 제거한다.
  Typography와 paint를 함께 바꾸면 label이 없는 node 및 link까지 각 실제 materializer를 한 번 호출한다.
  마지막 frame 제거 시 Cartesian/Polar/Parallel 축·격자와 각 범례는 일반 light token 대신 각 native family의
  기본 색을 복원한다. 명시한 색은 기본값과 같아도 유지한다. Stroke 범례의 field-driven stroke는 보존하며
  target fill만 기존 sample owner에서 갱신하므로 색 변경이 legend geometry를 바꾸지 않는다.
  GradientPlot density 범례는 title/labels/border 역할을 따르며 density paint와 계산 결과는 유지한다.
  Composition root는 자신의 Canvas/title/header/guide만 재조정한다. Child와 collected-guide snapshot은
  해당 owner가 계산한 스타일을 그대로 유지한다.
- 상태와 불변성: request는 owner/scope/base/partial token frame으로 immutable하게 저장한다. Full
  resolved token object와 계산된 layout을 theme request state에 저장하지 않는다. Composition 전파는
  retained child input을 변경하지 않고 postorder로 새 snapshots를 만든다.
- 오류: non-object/empty options, unknown root/token key, missing `base`/`tokens`, invalid theme/scope,
  잘못된 font size/weight, empty 또는 non-string 색/font family token을 거부한다. 전체 candidate materialization이 실패하면 receiver와 caller
  input은 변경되지 않는다.
  Custom definition/token object의 getter, symbol, 숨겨진 property, 사용자 prototype은 읽기 전에 거부한다.
- Coverage: `test/unit/theme/defaults.test.js`, `test/unit/theme/state.test.js`,
  `test/unit/actions/theme.test.js`, `test/unit/actions/theme-composition.test.js`가 schema, frame ordering,
  custom replacement, explicit provenance, highlight/font, self/descendant 전파, nested removal과 facet replay를
  검증한다. `test/contracts/theme.test.js`는 runtime/type/Current surface와 public chart corpus를 검증한다.

### Formal values — `applyTheme`

- Implemented: `applyTheme({ theme: ThemeName | { base: ThemeName; tokens: Partial<ThemeTokens> }; scope?: "self" | "descendants" }): ChartProgram`
- `ThemeName = "light" | "dark"`이며 `ThemeTokens`는 위 18개 required string property, 5개 optional axis role property, optional global `fontSize`/`fontWeight`, 7개 guide geometry/gap 및 `palette`/`patternPalette`다.
- Proposed (NOT IMPLEMENTED): No proposal. Theme creation/import와 arbitrary token vocabulary는 현재 범위 밖이다.

### Value coverage — `applyTheme`

- Theme definition
  - ✅ Covered: built-in light/dark, custom partial, closed token vocabulary, input ownership/freeze,
    replacement without partial merge, malformed/unknown values와 atomic rejection.
- Scope와 lifecycle
  - ✅ Covered: unit normalization, composition default descendants, explicit self, nested concat/facet,
    future facet source replay, same-owner reapply, newest direct-scope removal과 child-local restoration.
- Explicit precedence
  - ✅ Covered: mark/Canvas, Cartesian/Polar/Parallel guides, title/subtitle, legend root/block,
    facet headers, statistical/reference components, field-driven palettes와 default/explicit highlight.
  - ✅ Covered: Graph/Tree/Treemap role defaults, same-valued authored style, per-node overrides,
    disabled/reset labels/links, named highlight baseline, nested scope and family-default restoration.
  - ✅ Covered: global size/weight, axis role override, facade/block/header authored values including numeric zero,
    inherited nested typography, exact-profile atomic rejection; `test/unit/actions/theme-typography.test.js`.
- Layout와 semantic boundary
  - ✅ Covered: font-dependent resource rematerialization, composition snapshot/layout rebuild, semantic spec,
    resolved scales, statistics, ordering과 caller program immutability.
  - ✅ Covered: collection 색상 교체는 기존 item identity/key/lineage/topology와 owner clip을 보존하며,
    codec 복원·Canvas/SVG transition scene·named highlight에서도 유지한다. `test/unit/actions/theme-item-identity.test.js`.
  - ✅ Covered: guide spacing family 초기생성/복원, categorical typed palette/conditional/highlight/codec와 read-only winning provenance. `test/unit/actions/theme-spacing.test.js`, `theme-palettes.test.js`, `theme-provenance.test.js`.
  - ✅ Covered: native guide family 색 복원, theme-before-create, stroke samples, named axes, Basic,
    nested concat/facet/shared legend와 offline 복원. `test/unit/actions/theme-guide-defaults.test.js`.
  - ✅ Covered: DAG/cyclic Flow body/link/label 색·font, exact preparation 오류 원자성,
    false label reset, named highlight와 nested scope. `test/unit/actions/theme-flow.test.js`.
  - ✅ Covered: guide width/length 기본값·명시0·native reset·resize/scale edit·nested scope·bounds 오류.
    `test/unit/actions/theme-guide-geometry.test.js`.
- Visual boundary
  - ✅ Covered: `dark-theme-scatterplot`의 explicit low-level style primitive와 public `applyTheme`
    program 사이 exact graphic/renderer/decoded PNG pixel equivalence.
- Evidence: `test/unit/theme/`, `test/unit/actions/theme.test.js`,
  `test/unit/actions/theme-composition.test.js`, `test/unit/actions/theme-resource-plots.test.js`, `test/contracts/theme.test.js`,
  `test/charts/dark-theme-scatterplot/`.

## `removeTheme`

- Signature: `removeTheme()`
- 목적과 필수 state: receiver가 직접 적용한 가장 최근 theme scope 하나를 제거한다.
- Unit effect: local frame을 제거하고 inherited frame 또는 native family default를 드러낸다.
- Composition effect: `localOrder`의 newest `self` 또는 `descendants` owner만 제거한다. Descendant
  removal은 nested children과 future-child policy에서 그 parent owner만 제거하고, 보존된 child-local
  또는 다른 ancestor frame으로 color/font/layout을 다시 계산한다. `self` removal은 root Canvas만
  이전 applicable background로 되돌린다.
- 우선순위와 상호작용: explicit local style과 다른 owner의 frame은 보존한다. 마지막 frame이 사라지면
  theme config를 제거한다. 이전 immutable program과 composition input은 그대로다.
- 오류: direct active theme이 없거나 option을 전달하면 거부한다.
- Coverage: unit reset, self/descendants newest-scope removal, nested owner-only restoration, explicit style,
  highlight와 facet replay는 theme unit/contract suites가 검증한다.

### Formal values — `removeTheme`

- Implemented: `removeTheme(): ChartProgram`
- Proposed (NOT IMPLEMENTED): No proposal. Scope를 지정하는 selective removal은 현재 범위 밖이다.

### Value coverage — `removeTheme`

- ✅ Covered: unit active/inactive lifecycle, no-argument validation, built-in fallback와 explicit preservation.
- ✅ Covered: composition self/descendants ordering, same-owner replacement, nested child frame restoration,
  root/child rematerialization과 empty-state cleanup.
- Evidence: `test/unit/actions/theme.test.js`,
  `test/unit/actions/theme-composition.test.js`, `test/contracts/theme.test.js`.

## `createData`

- Signature: `createData({ id?, values, schema?, keyField?, keyFields?, keys? })`
- `id`
  - Status: Implemented. Optional user-defined ID다. 첫 dataset에서 생략하면 deterministic role ID
    `"data"`를 사용한다. Dataset이 이미 있으면 생략은 ambiguous하므로 explicit ID가 필요하다.
    명시한 ID는 지원 문자 규칙을 통과하고 기존 dataset과 중복되지 않아야 한다.
  - Effect: `semanticSpec.datasets`의 key 역할을 하며 성공 후 current data가 된다.
- `values`
  - Status: Implemented. 필수 dense array이며 모든 index의 row는 plain object여야 한다.
    빈 배열과 nested array/plain-object cell은 허용한다. 함수, class instance, cycle은 저장하지 않는다.
    누락된 row는 index를 포함한 오류로 첫 저장 전에 거부한다.
  - Effect: caller-owned 값을 deep clone/freeze하여 immutable source dataset으로 저장한다.
    graphic output은 만들지 않는다.
- 원본 행 키와 schema의 `name`은 빈 문자열·공백을 포함하여 손실 없이 보존한다. 미사용 빈 열을 제거하거나 이름을 바꾸지 않는다. 명시 schema의 누락 열, 중복 이름, storageType/nullable/optional 검사는 그대로다. 빈 키를 포함한 행도 현재 editable snapshot 형식으로 저장·복원한다.
- 차트/변환 입력·생성 필드 참조, lineage 입력과 resource ID의 non-empty 검증은 완화하지 않는다. 행 보존 변환·revision·facet·persistence는 빈 셀을 유지하고 summary/fold 등은 기존 열 투영 정책을 따른다.
- 오류: ambiguous omitted ID, invalid/duplicate ID, non-array와 non-object row를 거부한다.
- Coverage: `test/unit/actions/data/create-data.test.js`가 empty/multiple data, ownership,
  trace summary, invalid values와 duplicates를 검증한다.

### Row identity

`keyField`, ordered `keyFields` and separate `keys` are mutually exclusive. Omission allocates opaque generated keys.
Keys accept strings (including empty strings), finite numbers, bigint, boolean and valid Date values; Date is accepted only
in separate keys, never as a stored row cell. A scalar and a one-element tuple differ. Tuples contain 1–64 scalars.
Types are distinct, -0 equals 0, strings compare by UTF-16, and duplicate keys reject the whole action.
Type order is boolean, number, bigint, string, date; scalars precede tuples and tuples compare lexicographically.

Source snapshots store logicalId, revision, allocationId, keySpec, rowKeys and nextGeneratedKey. Each creation has a new
logical namespace. Revisions preserve that namespace; branch-local generated additions use a fresh allocation namespace.
UUID allocation occurs once at the action boundary and requires crypto.randomUUID. No value hashing guesses correspondence.
Derived snapshots store logicalId/revision/allocationId, rowKeys and a shared lineage table. Each lineage entry records exact
input data ID, logicalDataId, revision, rowKey and role; rowRefs indexes the shared entries. Field lineage remains separate.
Every registered transform has an adapter for its final row grain. Row-preserving transforms preserve row keys; fold adds
field role, flatten uses a replacement namespace for unkeyed elements, aggregates use typed group/measure roles, bins use
resolved boundaries, and statistical outputs use group/output role/sample position. Lookup records left and right contributors.
Window, normalization and imputation record the rows actually used in their calculations. Unsupported lineage is rejected.

Evidence: `test/unit/actions/data/row-identity.test.js`, `test/unit/actions/data/row-lineage.test.js`, `test/unit/core/item-identity.test.js`.

Screen-anchored Text has no data or named resource lineage. Its concrete identity uses the closed
`{kind:"screen"}` variant and `[childNamespaces,owner,"item",["annotation","screen"]]` key. The editable
codec resolves the exact local Text owner and requires its explicit screen anchor; rows and hit resourceRefs
remain empty. It never synthesizes a dataset revision. Other marks retain their current data/resource validation.
See [Text annotation](MARKS.md#createannotation) and `test/unit/annotation-screen.test.js`.

### Formal values — `createData`

- Implemented: `createData<Row extends object>(options: CreateDataOptions<Row>): ChartProgram`.
  Options의 ID는 `id?: UserId`이며 구조적 row interface와 readonly nested cell 타입을 보존하고
  non-object/array row 및 함수 cell을 타입에서 거부한다. 첫 unnamed source는
  `"data"`를 저장하고 이후 source는 explicit ID가 필요하다.
- Proposed (NOT IMPLEMENTED): `{ values: AsyncIterable<Record<string, unknown>> | Readonly<Record<FieldName, readonly unknown[]>> }`

### Value coverage — `createData`

- `id`
  - ✅ Covered: omission→`"data"`, valid custom ID, second unnamed ambiguity, empty/malformed ID, duplicate ID.
  - No proposal: ID vocabulary는 user-defined 상태를 유지한다.
- `values`
  - ✅ Covered: empty/non-empty array, multiple datasets, plain-object rows, caller ownership/immutability.
  - ✅ Covered: deeply nested arrays/objects, `null`, `undefined`, non-finite number와 bigint cell ownership/freeze.
  - 🟣 Proposed: async iterable/columnar input adapter. Source dataset immutability와 deterministic trace
    completion 정책이 먼저 필요하다.
- Evidence: `test/unit/actions/data/create-data.test.js`, `test/contracts/input-boundaries.test.js`,
  `test/contracts/source-data-types.test.js`.
- ✅ Covered: 빈/공백 원본 키의 추론·명시 schema, nullable/optional/중복·미선언·타입 실패, 입력/이전 프로그램 불변성, 행 보존/투영, source revision, Full/Basic persistence·정상 이름의 동일 SVG, facet. Evidence: `test/unit/actions/data/raw-row-keys.test.js`.

## `applyDataUpdate`

- Signature: `applyDataUpdate({ prepared, requestToken })`. 동기 action이며 같은 entry의 비동기 `prepareDataUpdate(program, request, host)`가 만든 opaque handle만 받는다. Full은 create/revise/parameter, Basic은 create만 지원한다.
- Helper는 명시적인 `requestToken`과 필요한 `load` 또는 `resolveNamed` callback을 받는다. 자동 fetch, 전역 pending/cache, implicit dataset/source 선택은 없다. Optional `baseURL`은 absolute URL이고 신규 URL source에만 저장된다. `signal`은 실제 AbortSignal이며 준비 전·host 응답 후·반환 전·적용 때 abort를 검사한다.
- Request는 세 닫힌 모양이다. Create `{kind:"create",id,source,keyField?|keyFields?}`는 explicit fresh ID의 dataset과 동명 data-source resource를 만든다. Revise `{kind:"revise",target,id,rowMap?}`는 명시 source binding과 fresh dataset ID를 사용한다. Parameter `{kind:"parameter",target,value}`는 type/nullable을 유지하고 URL source와 computed closure를 함께 갱신한다. 별도 keys 배열, source intent 교체, target dispatch는 지원하지 않는다.
- Source는 inline rows `{kind:"inline",values}`, inline text `{kind:"inline",text,format,delimiter?}`, named `{kind:"named",name,format,delimiter?}`, URL `{kind:"url",url,format,delimiter?}`다. 공통 `parse`와 `schema`를 지원한다. Format은 csv/json, delimiter는 CSV의 한 글자이며 quote/newline/BOM은 거부한다. URL은 문자열 또는 standard@1 v2 scalar AST이며 field access는 불가하고 최종 값은 nonempty string이어야 한다. Relative URL에는 explicit absolute baseURL이 필요하다.
- Source rows는 dense plain-object array이며 finite JSON cell만 허용한다. Getter, hidden/symbol property, reserved prototype key, undefined, bigint, Date, executable/class/cycle은 거부한다. CSV는 unique nonempty header와 동일 cell 수, quoted delimiter/newline/doubled quote를 지원하며 malformed quote를 거부한다. JSON은 object row array여야 한다.
- `parse`는 field→directive다. Type은 string/number/boolean/date, nullable 기본 false다. Number는 finite decimal/exponent, boolean은 boolean 또는 정확한 true/false 문자열이다. Date는 explicit UTC/IANA `timeZone`이 필요하며 format은 `%Y-%m-%d`(기본), `%d/%m/%Y`, `%m/%d/%Y`, `iso`다. 결과는 epoch milliseconds이며 rollover, gap/ambiguous local time 및 불일치 offset/zone을 거부한다. Optional schema는 기존 closed source schema다. Empty typed source도 field meaning을 유지한다.
- Host callback은 frozen `{url,signal?}` 또는 `{name,signal?}`만 받고 `{text|bytes,mimeType,encoding:"utf-8"}`를 동기 또는 Promise로 반환한다. Bytes는 Uint8Array다. 정확히 한 payload를 요구하며 malformed UTF-8/MIME/charset을 거부한다. CSV는 text/csv 또는 application/csv, JSON은 application/json 또는 application/*+json이다. 임의 object/Response를 자동 해석하지 않는다.
- 모든 source의 현재 state와 미래 URL/input refs를 load 전에 검증한다. 여러 source는 각각 한 번 준비하고 완료 순서와 무관하게 원래 dependency 순서를 유지한다. Load/parse/identity/consumer 하나라도 실패하면 이전 program과 trace는 그대로다. 준비와 적용 사이에 callback을 재실행하지 않는다.
- Handle에는 kind와 작은 request descriptor만 보이며 raw source, parameter value, rowMap, callback, signal, payload와 authority는 private다. 복제/JSON round trip/구조적 위조 handle을 거부한다. Apply의 현재 token은 prepare token과 같아야 하고 receiver는 prepare한 정확한 program instance여야 한다. 다른 action 또는 제거→재생성 이후의 같은 ID/revision도 stale이다. Host가 최신 program과 token 변수를 전달해야 한다. 오래된 immutable base에 의도적으로 적용하면 별도 branch이며 라이브러리가 host의 최신 변수를 추측하지 않는다.
- Parameter source들과 기존 computed roots의 transitive union을 stable topological order로 replay한다. Diamond는 모든 입력이 바뀐 뒤 한 번 계산하며 raw snapshot/row identity는 speculative/actual 적용을 통틀어 한 번 배정한다. 기존 10,000,000 parameter work budget을 공유한다. Same-value parameter는 no-load/no-revision이다. URL consumer가 있는 direct editParameter 값 변경은 prepared-data-required다.
- `semanticSpec.resources`의 authored `data-source`는 revision, normalized source/baseURL/key policy, exact parameter inputs, current output data ref와 inputHash를 소유한다. Original dataset의 `sourceReceipt`는 sourceId, parsing, 당시 resolvedURL/name, 실제 original text/rows, parserVersion/contentHash/MIME/encoding/byteLength를 소유한다. 과거 receipts는 당시 자료를 보존하고 현재 parameter에 재결합하지 않는다.
- Explicit revise는 과거 raw snapshot을 보존하고 binding revision을 한 번 증가시킨다. Key field/tuple은 유지하며 generated keys의 rowMap은 기존 reviseData 규칙이다. 직접 reviseData rows 편집은 성공 전 전체 consumer를 검증하고 해당 live binding을 해제한다. 새 rows에 과거 URL receipt를 붙이지 않는다. removeData는 외부 consumer가 없는 live output의 binding을 먼저 제거하며 removeParameter는 URL resource inputs도 live consumer로 계산한다.
- Unit namespace만 사용한다. Facet/repeat는 retained source와 recipe를 갱신하고 children은 필요한 exact refs를 채택한다. Concat은 명시 child에서 prepare/apply한 뒤 replaceCompositionChild를 호출한다. Parent/다른 child에 handle을 적용할 수 없다.
- Full snapshot은 source resources와 receipt를 저장하며 fresh process/offline 복원이 가능하다. 복원은 retained source를 pure parser로 대조하고 live inputs/hash/output을 검증한다. URL AST 실행, load, action replay 또는 graphic materialization은 없다. Graphic snapshot, renderer와 scene은 계속 graphicSpec만 사용한다.
- Trace는 applyDataUpdate→createData/reviseData/editParameter와 실제 primitive/materialization children을 보존한다. Stored original text와 source text는 primitive trace에서 길이로 요약하고 arrays는 count로 기록한다. 완료 trace의 token/descriptor는 pending authority가 아니다.

### Formal values — `applyDataUpdate`

- Implemented: `applyDataUpdate(options: ApplyDataUpdateOptions): ChartProgram`; `prepareDataUpdate(program, request: DataUpdateRequest, host: DataUpdateHost): Promise<PreparedDataUpdate>`.
- Basic: request kind/create handle만 받으며 revision orchestration을 import하지 않는다.
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): automatic fetch, streaming/append, editable source intent, host pending persistence.

### Value coverage — `applyDataUpdate`

- Evidence: `test/unit/resources/data-update-preparation.test.js`, `test/unit/resources/data-update-full-preparation.test.js`, `test/unit/resources/prepared-data-public.test.js`, `test/unit/resources/prepared-data-lifecycle.test.js`, `test/unit/core/data-source-resource-state.test.js`, `test/contracts/prepared-data-types.test.js`, `scripts/consumers/fixtures/node/prepared-data.mjs`.
- ✅ Covered: inline/text/named/URL, exact token/base/ABA/abort, immutable receipts and output refs, Full/Basic boundary, source/computed union, source detach, facet/repeat/concat and offline restore; installed renderer and scene consumer fixture uses the same public boundary.

## `reviseData`

- Signature: `reviseData({ source, id, values, schema?, keys?, rowMap? })`. Full 전용 immutable source revision이다.
- `source`와 `id`는 필수 explicit user ID다. source는 materialized 원본 dataset이어야 하며 derived snapshot은 거부한다. 새 id는 source와 다르고 dataset/logical owner와 충돌하지 않아야 한다.
- `values`는 createData와 같은 dense plain-object row 및 immutable cell 계약이다. 외부 값을 복사·동결하며 과거 원본은 보존한다.
- Effect: 새 source를 createData wrapped child로 만들고, 해당 source의 transitive derived DAG를 기존 transform policy/materializer로 재계산한다. Stable mark/composite ID와 명시적 style을 유지하면서 layer와 typed private data reference 및 logical owner를 rebind한다. Scale/mark/guide/label/highlight를 기존 materialization 경로로 갱신하고 highlight 없는 stored selection도 final item grain에서 검증한다. 참조되지 않는 과거 derived revision은 기존 release lifecycle을 따른다. 원본은 자동 삭제하지 않는다.
- Unit과 retained-source facet/grid/repeat를 지원한다. Facet은 기존 values/grid/repeat/layout/scale/guide recipe를 보존하여 child를 다시 derive한다. 새로운 category를 자동으로 recipe에 추가하지 않는다. Concat은 명시적 child를 revise한 뒤 replaceCompositionChild로 조합한다.
- Missing source, duplicate ID, invalid rows, incompatible field/schema/selection 및 rematerialization/layout 실패는 전체를 거부한다. 이전 program/trace는 변경되지 않으며 성공 public trace root는 reviseData다.

- Field key definitions are inherited and cannot be redeclared. Explicit-key datasets require a complete `keys` array on every revision.
- Generated datasets allocate all-new row keys unless `rowMap` supplies output-to-source indices or null for new rows. It must be dense,
  match output length, and use each valid source index at most once. Keyed datasets reject rowMap. Deleted generated tokens are never reused.
- Reintroducing the same explicit key restores its logical identity. Stored row selections retain deleted keys and select them again on reappearance.
- `schema` may override the source schema under the existing validation rules. Counter/revision overflow and invalid key modes reject atomically.

### Formal values — `reviseData`

- Implemented: `reviseData<Row extends object>(options: ReviseDataOptions<Row>): ChartProgram`; `source: string`, `id: string`, `values: CreateDataOptions<Row>["values"]`.
- Proposed (NOT IMPLEMENTED): none.
- No proposal: in-place source overwrite, automatic public revision ID, implicit concat child selection.

### Value coverage — `reviseData`

- ✅ Covered: new rows/count/domain, immutable input/original, final selection/highlight, transitive transform revision/logical editor, retained facet/repeat, Full/Basic boundary and invalid inputs.
- ✅ Covered: complete action corpus unchanged-row revision and drawable SVG equivalence.
- Evidence: `test/unit/actions/data/source-revision.test.js`, `test/contracts/source-data-types.test.js`.

## `removeData`

- Signature: `removeData({ id })`
- 목적과 범위: Full entry의 unit 또는 facet parent에서 현재 참조가 없는 named dataset 하나를
  제거한다. `id`는 필수 user ID다. current/unique resource 추론, batch, cascade, force는 지원하지 않는다.
- 참조 계약: layer binding, 다른 dataset의 `source`, materialization data owner, composite mark의
  retained data/source, facet·repeat source가 live edge다. Historical trace argument와 이전 immutable
  program은 참조가 아니다. `context.currentData`만 target을 가리키면 삭제할 수 있고 pointer를
  `undefined`로 만든다.
- 소유권: mark·statistical facade가 만든 private dataset은 직접 제거하지 않고 owning mark/action을
  요구한다. Top-level derived action이 만든 standalone logical owner는 logical ID로 제거한다. 이때
  `owner.current` 자기 edge만 제외하며, 외부 edge가 0이면 current snapshot과 owner registry를 함께
  지우고 upstream source는 보존한다.
- 원자성과 결과: 모든 known-schema edge를 먼저 수집해 `ownerKind`, `ownerId`, canonical path 순으로
  정렬한다. 하나라도 남으면 `Cannot remove data "<id>"; live references: ...`로 거부한다. 성공은
  `semanticSpec.datasets`와 필요한 standalone owner/current pointer만 바꾸며 `graphicSpec`과 `children`은
  reference-identical하다. domain, layout, mark 또는 guide를 재물질화하지 않는다.
- Trace와 구현 경계: 전체 dependency preflight 후 실제 semantic ID에 대해 `editSemantic({ property, remove:true })`를
  wrapped child로 호출한다. Standalone logical data-owner config와 logical current pointer는 preflight 후
  primitive 호출 전에 domain action이 정리한다. Facet의 수정된 physical revision도 logical owner로 삭제할 수 있다.
- 적용 제한: concat composition parent는 거부한다. 같은 문자열 ID를 가진 child resource는 다른 program
  namespace이므로 parent의 전역 참조로 추론하지 않는다.

### Formal values — `removeData`

- Implemented: `removeData({ readonly id: UserId }): ChartProgram`
- Proposed (NOT IMPLEMENTED): batch removal, cascade, orphan collection, force removal.

### Value coverage — `removeData`

- ✅ Covered: unused source, context-only/trace-only mention, derived source and direct layer rejection.
- ✅ Covered: standalone owner success/consumer rejection, private statistical dataset rejection, facet source와
  concat scope, deterministic error paths, immutable failure.
- Evidence: `test/unit/actions/resources/remove.test.js`,
  `test/unit/core/resource-references.test.js`, `test/contracts/remove-resources.test.js`.

## `removeScale`

- Signature: `removeScale({ id })`
- 목적과 범위: Full unit 또는 facet parent에서 참조 없는 named semantic scale을 제거한다. ID는
  필수이며 target/current 추론, batch와 cascade를 지원하지 않는다.
- live edge: 모든 scaled encoding, offset, Parallel dimension, semantic/config guide와 retained recipe의
  실제 scale ID가 참조다. resolved domain/range/sample 값과 같은 문자열의 text/color/style token은
  참조가 아니다. `context.currentScale`은 삭제를 막지 않으며 성공 시 unset한다.
- 결과: semantic scale과 같은 ID의 `resolvedScales` cache를 함께 제거한다. live edge가 있으면 정렬된
  referrer path를 포함해 원자적으로 거부한다. 성공 전후 `graphicSpec`과 `children`은 같은 object이며
  mark/domain/layout을 다시 계산하지 않는다. Semantic 삭제와 cache/current pointer 정리는 wrapped `editSemantic` 자식이 담당한다.

### Formal values — `removeScale`

- Implemented: `removeScale({ readonly id: UserId }): ChartProgram`
- Proposed (NOT IMPLEMENTED): consumer rewiring, replacement-scale inference, cascade.

### Value coverage — `removeScale`

- ✅ Covered: unused semantic/cache cleanup, context-only removal, wrong kind/unknown ID.
- ✅ Covered: Cartesian position과 Parallel dimension rejection, canonical indexed path, visual invariance.
- Evidence: `test/unit/actions/resources/remove.test.js`,
  `test/unit/core/resource-references.test.js`, `test/contracts/remove-resources.test.js`.

## `removeCoordinate`

- Signature: `removeCoordinate({ id })`
- 목적과 범위: Full unit 또는 facet parent에서 참조 없는 named coordinate를 제거한다. Layer,
  semantic/config guide, annotation·statistical retained data-space binding이 live edge다. Concrete pixel
  geometry나 graphic parent ID는 coordinate edge가 아니다.
- 결과: semantic coordinate만 제거한다. `context.currentCoordinate`만 가리키면 unset하고 삭제한다.
  다른 coordinate를 자동 선택하지 않으며 mark, scale, guide와 concrete graphics를 재물질화하지 않는다.
  실제 semantic 삭제와 current pointer 정리는 wrapped `editSemantic` 자식이 담당한다.
  live edge, wrong kind, unknown ID, concat parent와 closed option 오류는 caller state와 trace를 유지한다.

### Formal values — `removeCoordinate`

- Implemented: `removeCoordinate({ readonly id: UserId }): ChartProgram`
- Proposed (NOT IMPLEMENTED): layer migration, replacement-coordinate inference, cascade.

### Value coverage — `removeCoordinate`

- ✅ Covered: empty coordinate와 context pointer cleanup, attached layer rejection, wrong/unknown ID.
- ✅ Covered: facet parent success, concat rejection, graphics/children identity와 rendered-call equality.
- Evidence: `test/unit/actions/resources/remove.test.js`,
  `test/unit/core/resource-references.test.js`, `test/contracts/remove-resources.test.js`.

## `bindMarkData`

- Signature: `bindMarkData({ target, data })`
- 목적과 필수 state: 기존 independent mark를 이미 materialize된 다른 dataset에 원자적으로 연결하고
  해당 mark가 소비하는 scale, guide, label, selection/highlight와 concrete graphic을 dependency 순서로
  다시 만든다.
- `target`: 필수 mark ID다. Composite owner나 그 child, density/horizon/final-item filter처럼 자체
  source lifecycle을 가진 mark는 해당 resource의 edit/filter action을 사용해야 하며 이 action은 거부한다.
- `data`: 필수 existing dataset ID다. `values`가 없는 definition-only `createDerivedData` 결과는 mark가
  소비할 수 없으므로 거부한다.
- preflight와 atomicity: immutable speculative branch에서 전체 rebind와 rematerialization plan을 먼저
  실행한다. 새 row가 encoding field/type/grain, coordinate placement, shared scale domain, guide, label,
  selection/highlight의 기존 계약을 충족하지 못하면 첫 public 상태 변경 전에 전체 action이 실패한다.
- Effect: wrapped `rebindLayerData`가 semantic consumer transition을 trace에 남기고, 기존 registered
  rematerializer가 새 dataset을 기준으로 concrete state를 수렴시킨다. Source program과 이전 dataset은
  그대로 유지하며 같은 dataset으로의 빈 변경은 거부한다.
- Coverage: `test/unit/actions/data/bind-mark-data.test.js`가 호환 data 재연결, field/type/definition-only
  rejection, composite lifecycle, full trace와 이전 program 불변성을 검증한다.

### Formal values — `bindMarkData`

- Implemented: `bindMarkData({ target: UserId; data: UserId }): ChartProgram`
- Proposed (NOT IMPLEMENTED): composite 전체 역할 변경. 각 composite owner의 aggregate edit가 담당한다.

### Value coverage — `bindMarkData`

- ✅ Covered: explicit target/data, existing materialized data, scale+mark rematerialization과 item cardinality 변경.
- ✅ Covered: missing field, incompatible quantitative type, definition-only dataset, missing IDs, empty/same bind,
  unknown option과 immutable atomic rejection.
- ✅ Covered: Box와 owned transform consumer가 generic single-layer bind를 우회하지 못함.
- Evidence: `test/unit/actions/data/bind-mark-data.test.js`.

## `filterData`

- Signature: `filterData({ id, source?, field, oneOf | noneOf | predicate | range, nulls? })` or `filterData({ id, source?, where: ExpressionV2 })`.
- `id`: Implemented, 필수 derived dataset ID. 새 ID여야 한다.
- `source`: Implemented, dataset ID. 생략하면 current data를 사용하며 유일하게 추론되지 않으면 오류다.
- `field`: Implemented, 비어 있지 않은 필드 이름. 각 row에 값이 없어도 비교 결과가 false일 수 있다.
- `oneOf`: Implemented, scalar accepted-value array. strict equality membership으로 row를 유지하며
  transform input은 소유권 복사된다.
- `predicate`: Implemented `{ op, value }` comparison. `eq | neq`는 strict equality를 사용하고
  `lt | lte | gt | gte`는 같은 type의 finite number 또는 string만 순서 비교한다.
- `range`: Implemented `{ min, max, inclusive? }`. 같은 type의 finite number/string endpoint를
  요구하고 `inclusive` 기본값은 `true`다.
- `oneOf`, `predicate`, `range` 중 정확히 하나만 허용한다. Ordered comparison/range에서 missing 또는
  incompatible field value는 제외하고 source order를 보존한다.
- Effect: filter provenance를 가진 immutable derived dataset을 만들고 wrapped
  `materializeFilteredData`가 concrete values를 저장한다. 기존 source는 변하지 않는다.
- Coverage: `test/unit/actions/data/filter-data.test.js`가 source inference, scalar types,
  ownership, invalid options와 primitive equivalence를 검증한다.

- Expression predicates use the closed `ExpressionV2` registry and require a boolean result; numeric or string truthiness is rejected. Comparisons keep the expression null/missing policy.
- `where` is exclusive with every field-filter option. All fields, parameter references, and known types are checked in every AST branch before evaluation, including empty inputs.
- Stored expression filters record ordered exact `parameterInputs`; authors cannot supply these bindings. Parameter edits revise every dependent filter, statistic, scale, mark and guide through the existing dataset DAG. Unaffected datasets retain identity.
- Filtering preserves source order, row keys, lineage and schema, including empty outputs. Automatic empty scale domains reject unless a fixed domain or the existing explicit `emptyDomain: "preserve"` policy is supplied. Failed edits preserve the old program and trace.
- Editable restoration validates predicate shape, source field types and exact parameter revisions without evaluating the AST. Referenced parameters cannot be removed until their filter dependency is detached.
- Evidence: `test/unit/actions/data/expression-filter.test.js` and `test/unit/grammar/conditional-encoding.test.js`.

### Formal values — `filterData`

- Implemented: `filterData(options: FilterDataOptions): ChartProgram`. `FilterDataOptions` is the exclusive union of the field filter modes and `{ id; source?; where: ComputedExpressionV2 }`.
- `FilterComparison = { op: "eq" | "neq"; value: unknown } | { op: "lt" | "lte" | "gt" | "gte"; value: Finite | string }`
- `FilterRange = { min: Finite | string; max: Finite | string; inclusive?: boolean }`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `filterData`

- `id`, `source`
  - ✅ Covered: explicit source, current-data inference, missing/ambiguous source, duplicate derived ID.
- `field`
  - ✅ Covered: non-empty string, invalid option, sparse와 incompatible ordered values.
- `oneOf`
  - ✅ Covered: string/number/boolean scalar membership, owned input, invalid transform values.
  - ✅ Covered: empty-list rejection, duplicate-value set semantics와 direct `null` membership.
- `predicate`
  - ✅ Covered: 모든 여섯 operator, strict no-coercion, numeric/string order, invalid operator/operand와 owned provenance.
- `range`
  - ✅ Covered: inclusive default, exclusive endpoints, equal-endpoint empty result, invalid order/type/inclusive와 owned provenance.
- Mode interaction
  - ✅ Covered: exactly-one mutual exclusivity, source immutability/order와 primitive/public chart equivalence.
- Evidence: `test/unit/actions/data/filter-data.test.js`.

## `createSummaryData`

- Nonweighted mean ciLower/ciUpper additionally accept method `{type:"bootstrap", seed, samples?}`.
  Seed is an integer 1..2147483646; samples is 1..10000, default1000; existing level defaults to0.95.
  Resample n observations with replacement n times per sample; sum in source order of draws, divide by n,
  sort means and use R7 percentile bounds. Exact Number RNG: state=(1103515245*state+12345)%2147483647,
  index=floor(state/2147483647*n). Each unique field/samples/seed owns a stream over first-appearance
  groups/raw row order. Bounds/levels reuse means; output order and added mean do not affect draws.
  Singleton consumes samples; empty consumes none. Draws summed once per unique stream must be
  <=50000000 before calculation; existing group30000/output64 limits remain. Method is normalized
  in existing transform provenance, RNG/cache stays private. Weighted/regression/implicit-seed/string
  bootstrap/unknown method keys reject. Basic has no summary authoring surface.
  Evidence: `test/unit/actions/data/bootstrap-mean-ci.test.js`, `test/charts/bootstrap-mean-ci/`.


- Signature: `createSummaryData({ id, source?, groupBy?, aggregates, members?, weight? })`
- `id`, `source`: 새 immutable derived dataset ID와 existing materialized source다. `source` 생략 시
  current data를 사용한다.
- `groupBy`: field name 또는 unique field-name array이며 기본은 `[]`다. Observed group을 source의 첫
  등장 순서로 만들며 categorical combination을 합성하지 않는다.
- `aggregates`: 1..64개의 `{ op, field?, as }`다. `op`는 공통 `AggregateOperation` 전체를 재사용한다.
  `count`는 row count이므로 field를 받지 않고 다른 op는 field가 필수다. `as`는 group/output과 겹치지
  않는 고유 field 이름이다.
- `members`: optional output field 이름이다. 각 summary row가 해당 source group의 원래 rows를 보존한다.
  Group/output alias와 충돌하면 거부한다.
- `weight`: optional `{ field, kind: "frequency" | "reliability" }`다. 생략하면 기존 unweighted 결과를
  유지한다. Frequency weight와 group total은 non-negative safe integer여야 하고 reliability weight는
  non-negative finite number여야 한다. 모든 요청 value와 weight를 zero-weight row까지 먼저 검증하며,
  zero-weight rows는 통계와 `members`에서 제외한다. Positive total이 없는 observed group은 오류다.
- Weighted branch는 `count`, `sum`, `mean`, population/sample variance와 stdev, `stderr`, `median`,
  `q1`, `q3`, parameterized `quantile`만 지원한다. Frequency quantile은 virtual repetition에 기존 linear
  quantile을 적용하고 실제 row를 복제하지 않는다. Reliability quantile은 equal values의 weight를 합친
  inverse CDF다. Sample denominator는 frequency `W-1`, reliability `W-W2/W`; standard error의 effective
  size는 각각 `W`, `W²/W2`다. Weighted CI와 ordered/nominal aggregates는 명시적으로 거부한다.
- Effect: normalized `summary` provenance와 concrete values를 같은 호출에서 완성한다. Ungrouped empty
  source는 aggregate identity를 표현하는 한 row를 만들며 `count`는 0이다. Grouped empty source는
  observed group이 없으므로 `[]`다. Missing 수치 결과는 기존 aggregate owner와 동일하게 `undefined`다.
- 오류: missing source/group/aggregate/order field, duplicate group/output, incompatible aggregate field
  type, non-scalar group key, unsupported op와 30,000 group 초과를 첫 semantic change 전에 거부한다.
  이 상한은 실제 distinct typed group 수이며 input 행 수가 아니다. 다른 mark/path/work 한도는 바꾸지 않는다.
- Coverage: `test/unit/actions/data/summary-data.test.js`가 multi-aggregate, ordered aggregate, members,
  stable group order, empty grain, ownership, mark consumption과 invalid matrix를 검증한다.

### Formal values — `createSummaryData`

- Implemented: `createSummaryData({ id: UserId; source?: UserId; groupBy?: FieldName | readonly FieldName[]; aggregates: readonly SummaryAggregateOptions[]; members?: FieldName; weight?: StatisticalWeight }): ChartProgram`
- Proposed (NOT IMPLEMENTED): full categorical cube/empty-group synthesis, callback aggregate.

### Value coverage — `createSummaryData`

- ✅ Covered: grouped/ungrouped, first-appearance ordering, count/mean/missing/ordered first, multiple outputs.
- ✅ Covered: ungrouped/grouped empty input, null numeric member, members provenance and caller ownership.
- ✅ Covered: field/type/alias/shape/unknown option and immutable rejection.
- ✅ Covered: frequency/reliability formulas, distinct quantiles, scale invariance, zero-weight membership,
  invalid/all-zero/overflow weights and weighted-operation whitelist.
- Evidence: `test/unit/actions/data/summary-data.test.js`.

## `createBinData`

- Signature: `createBinData({ id, source?, field, maxBins? | step | boundaries, extent?, nice?, zero?, includeEmpty?, members?, as?, weight? })`
- `id`, `source`, `field`: 새 immutable derived ID, materialized source와 필수 quantitative field다.
- Bin mode: `maxBins`(기본 10), positive `step`, 또는 strictly increasing finite `boundaries` 중 하나다.
  기존 Histogram의 `resolveHistogramBins`와 `findHistogramBinIndex`를 그대로 사용한다.
- `extent`: 기본 `"auto"` 또는 ascending finite pair다. Explicit extent/boundaries는 모든 source value를
  포함해야 하며 out-of-range row를 조용히 버리지 않는다.
- `nice`, `zero`: Histogram boundary policy와 같은 boolean이며 기본값은 `true`, `false`다.
- `includeEmpty`: 기본 `true`로 resolved boundary의 모든 bin을 보존한다. `false`는 count 0 bin만 제거한다.
- `members`: 기본 `false`. `true`면 각 bin의 original source rows를 output에 저장한다.
- `weight`: optional `StatisticalWeight`. 지정하면 count는 positive-weight row의 weight mass이고 extent와
  members도 그 rows만 사용한다. 모든 source value/weight는 기여 여부와 관계없이 먼저 검증하며 total
  weight 0은 오류다. Empty bin의 mass 0은 정상이고 마지막 upper endpoint 포함 규칙은 그대로다.
- `as`: `{ lower?, upper?, count?, members? }`; 기본은 `${field}_start`, `${field}_end`, `count`, `members`다.
  모든 enabled output은 고유해야 하며 `as.members`는 `members:true`에서만 허용한다.
- Edge: `[lower, upper)`이고 마지막 bin만 upper endpoint를 포함한다. Resolved domain, step와 boundaries를
  transform provenance의 `resolved`에 저장한다. Output은 lower/upper/count/member로 즉시 소비 가능하다.
- 오류: non-finite source, mixed modes, invalid/alignment/coverage boundary, alias collision, invalid boolean과
  generated-bin bound를 첫 state change 전에 거부한다.
- Coverage: `test/unit/actions/data/bin-data.test.js`가 boundary edge, max/step/explicit mode, empty omission,
  resolved provenance, ranged Rect consumption과 invalid matrix를 검증한다.

### Formal values — `createBinData`

- Implemented: `createBinData({ id: UserId; source?: UserId; field: FieldName; maxBins?: PositiveInteger; step?: PositiveFinite; boundaries?: readonly [Finite, Finite, ...Finite[]]; extent?: "auto" | OrderedFinitePair; nice?: boolean; zero?: boolean; includeEmpty?: boolean; members?: boolean; as?: BinDataOutputFields; weight?: StatisticalWeight }): ChartProgram`; bin mode는 상호 배타다.
- Proposed (NOT IMPLEMENTED): out-of-range drop/clamp policy.

### Value coverage — `createBinData`

- ✅ Covered: explicit boundaries와 마지막 endpoint, equal max bins, zero-anchored step, auto/explicit extent.
- ✅ Covered: include/omit empty, members, custom/default outputs, concrete ranged mark consumption.
- ✅ Covered: out-of-range, non-finite/missing field, invalid mode/boundary/boolean/alias와 immutable rejection.
- ✅ Covered: weighted mass, positive-weight extent/members, zero-weight prevalidation과 invalid/all-zero weights.
- Evidence: `test/unit/actions/data/bin-data.test.js`.

## `createLookupData`

- Signature: `createLookupData({id, source?, field, lookup:{data,key,fields,as?}})`. Full/Basic 생성이다.
  source 생략 시 기존 current-data resolver를 사용하고 reference data는 반드시 명시한다.
- field/key는 각 materialized 입력 schema의 nonempty field다. fields는 비어 있지 않은 고유
  reference field 배열이며 as는 같은 길이의 고유 출력 이름 배열, 생략 시 fields다.
  출력 이름은 주 입력 열과 겹칠 수 없고 명시 alias로 충돌을 해결한다.
- 왼쪽 행 수·순서·모든 기존 cell을 보존하고 오른쪽 값만 복사한다. Scalar key는 타입을
  포함하여 정확히 비교한다(string/finite number/boolean). null/missing은 매칭하지 않는다.
  오른쪽 null/missing key는 제외하고 그 외 중복 key는 빈 왼쪽 입력에서도 거부한다.
  unmatched/missing selected cell은 명시 null이다. 숫자 문자열도 변환하지 않는다.
- Nested JSON과 빈 원본 열 이름도 유지하며 own-property 복사 후 clone/freeze한다.
  기존 data 한도와 `rightRows + leftRows * (fields.length + 1) <= 10,000,000` work 한도다.
  출력 행 수를 늘리지 않으므로 새 generated-row cap은 없다.
- Semantic: primary source와 단일 `{type:"lookup",field,lookup:{data,key,fields,as}}`를 저장한다.
  두 입력은 canonical actual dataset ID다. 출력 schema는 오른쪽 storageType과 nullable:true,
  optional:false, 왼쪽 key/오른쪽 key·값의 typed lineage를 보존한다. Renderer는 변경하지 않는다.
- 어느 입력의 revision도 stable topological 순서로 affected descendants를 한 번씩 재생한다.
  기존 unary DFS 순서는 유지하고 cycle/missing input/alias/schema/consumer 오류는 atomic하게 거부한다.
  양쪽 live reference는 removeData 보호와 editable persistence 검증에 포함한다.
- Facet은 주 입력만 분할하고 오른쪽 표를 유지한다. 직접 materialized lookup의 repeat는 출력
  field encoding만 바꾸며 lookup 정의를 다시 쓰지 않는다. 다른 derived repeat 제한은 유지한다.
- Coverage: `test/unit/grammar/lookup.test.js`, `test/unit/grammar/dataset-dependencies.test.js`,
  `test/unit/actions/data/lookup-data.test.js`, `test/unit/actions/composition/lookup-facets.test.js`,
  `test/charts/lookup-data/public.test.js`, `test/contracts/derived-editing-types.test.js`.

### Formal values — `createLookupData`

- Implemented: `LookupDataOptions`, normalized `DatasetLookupTransform`; Full/Basic 생성과 materialization.
- Proposed (NOT IMPLEMENTED): many-to-many lookup, overwrite and implicit key coercion.

### Value coverage — `createLookupData`

- ✅ Covered: typed keys, null/missing/duplicate rules, aliases, nested own values, empty inputs and work bounds.
- ✅ Covered: both-input/diamond revision, live references, typed lineage/persistence, facets/grid/repeat,
  Full/Basic creation and independent prejoined chart output.
- Evidence: the grammar, action, composition, chart and type tests above.

## `createFlattenData`

- Signature: `createFlattenData({id, source?, fields, as?})`. Full/Basic 생성이며 id는 명시적,
  source 생략 시 기존 current-data resolver를 사용한다.
- `fields`: source schema에 존재하는 1..64개 고유 nonempty field다. 각 행에서 선택된 값은
  array/null/missing만 허용한다. null/missing은 길이0, 비배열은 row/field 오류다.
- `as`: 생략 시 fields와 같다. 지정 시 같은 길이의 고유 field 이름 배열이다. 선택된 입력
  배열 이름의 파생 결과 대체는 허용하지만 선택되지 않은 기존 열의 overwrite는 거부한다.
- Effect: 입력 행 순서 다음 array-index 순서로 해당 행의 최대 array 길이만큼 생성한다.
  짧은 배열의 빈 자리는 null이고 요소의 기존 JSON 값은 유지한다. 모든 배열이 비었으면
  그 행은 출력0개다. Cartesian product가 아니다. 원본 dataset/배열/키/순서/이전 program은
  불변이며 alias 외 모든 cell을 보존한다.
- Semantic: `{type:"flatten",fields,as}` 정규화 한 곳, source provenance와 입력 field별
  output schema lineage를 저장한다. 기존 derived materializer/replay 및 statistical facet
  topology를 사용하며 renderer는 변경하지 않는다.
- Limits/errors: output 총10,000행까지, 초과·잘못된 field/alias/value·unknown option을
  반환된 상태나 원본 trace 변경 없이 거부한다. 기존 raw data/nested-value 한도는 그대로다.
- Current coverage: `test/unit/actions/data/flatten-data.test.js`,
  `test/contracts/transform-registry.test.js`, `test/contracts/derived-editing-types.test.js`.

### Formal values — `createFlattenData`

- Implemented: `FlattenDataOptions`의 id/source?/fields/as?와 `DatasetFlattenTransform`.
- Full/Basic 생성, Full에서 immutable source revision·derived dependent replay·persistence를 지원한다.
- Coverage: 길이가 다른5관측값/빈배열/null/missing/JSON요소/default replacement/alias collision,
  원본 보존/typed schema/trace/한도/실제 scatter 소비/Full revision은 위 실행 테스트가 검증한다.
- Proposed (NOT IMPLEMENTED): No proposal beyond the current aligned-array contract.

### Value coverage — `createFlattenData`

- ✅ Covered: alignment, null padding, field/alias validation, immutable raw snapshots and schema lineage.
- ✅ Covered: Full revision/dependent replay, Basic creation, bounds and ordinary mark consumption.
- Evidence: `test/unit/actions/data/flatten-data.test.js`, `test/contracts/derived-editing-types.test.js`.


## `createFoldData`

- Signature: `createFoldData({ id, source?, fields, as? })`
- `id`, `source`: 새 immutable derived dataset ID와 existing materialized source다. `source` 생략 시
  current data를 사용한다.
- `fields`: 1..64개의 unique source field 이름이다. Output은 source row 순서 안에서 이 목록의 순서를
  사용하므로 grain은 정확히 `source row × selected field`다.
- `as`: `{ key?, value? }`이며 기본은 `key`, `value`다. 두 output 이름은 서로 달라야 하고 source에
  이미 존재하는 field와 겹칠 수 없다.
- Effect: 각 output row는 source row의 모든 cell을 보존하고 key output에 선택한 field 이름, value
  output에 해당 cell을 추가한다. Selected value는 finite number, string 또는 boolean 중 하나이며 한
  materialization에서는 공통 primitive type이어야 한다. Empty source는 empty output을 만든다.
- 오류: duplicate/missing selected field, null/undefined/non-finite/structured value, mixed primitive type,
  output collision, unknown option과 10,000 output row 초과를 첫 semantic change 전에 거부한다.
- Coverage: `test/unit/actions/data/fold-data.test.js`가 stable row/field order, source-cell 보존, defaults,
  empty input, ordinary mark consumption, alias/type/missing/shape와 bounds를 검증한다.

### Formal values — `createFoldData`

- Implemented: `createFoldData({ id: UserId; source?: UserId; fields: readonly FieldName[]; as?: { key?: FieldName; value?: FieldName } }): ChartProgram`
- Proposed (NOT IMPLEMENTED): heterogeneous value union, null-preserving fold와 source-field replacement.

### Value coverage — `createFoldData`

- ✅ Covered: explicit field order, row-major expansion, default/custom aliases and original cell preservation.
- ✅ Covered: numeric common type, mixed/missing/non-finite/structured rejection, empty source.
- ✅ Covered: field/output uniqueness, source collision, 64-field and 10,000-row bounds, immutable rejection.
- Evidence: `test/unit/actions/data/fold-data.test.js`.

## `createParameter`

- Signature: `createParameter({ id, value, type?, nullable? })`.
- 명시 user ID는 `[A-Za-z0-9_-]+`이며 같은 parameter ID의 중복 생성은 거부한다. Dataset과 parameter ID는 별도 namespace다.
- type은 `number | string | boolean`이다. Non-null value에서 type을 추론하며 nullable 기본값은 false다. 초기 null은 명시 type과 nullable:true가 필요하다.
- Finite number, 빈 string, false, 0, -0을 허용한다. String은 최대 1,048,576 UTF-16 units다. Undefined/missing, array, object, Date, bigint, function과 비유한 숫자는 거부한다. Optional 옵션의 명시 undefined도 거부한다.
- Options는 enumerable own data만 허용하며 accessor/symbol/hidden key/unknown key는 읽기 전에 거부한다. Caller-owned 입력과 기존 program은 불변이다.
- 생성은 semanticSpec.resources에 authored parameter snapshot 하나를 저장한다. Revision은 0이며 type/nullable은 options, 값은 result.value만 소유한다. Parameter 자체의 inputs는 빈 배열이다. Graphics는 생성하지 않는다.
- Full/Basic 모두 생성 가능하다. Parameter는 unit-local이며 concat에서는 기존 childPath scope를 명시한다.

### Formal values — `createParameter`

- Implemented: `createParameter(options: CreateParameterOptions): ChartProgram`.
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): type 변경, formula parameter, UI control 제약.

### Value coverage — `createParameter`

- ✅ Covered: scalar/type/null/empty/zero/length limits, duplicate IDs, immutable state, getter zero calls, Full/Basic creation.
- Evidence: `test/unit/grammar/parameter.test.js`, `test/unit/core/parameter-resource-state.test.js`, `test/unit/actions/data/parameter-lifecycle.test.js`.

## `editParameter`

- Signature: `editParameter({ target, value })`.
- 명시 target과 value가 필요하며 기존 type/nullable/ID는 유지한다. Value는 생성 때와 같은 scalar 규칙을 따른다.
- Object.is로 같은 값이면 resource revision과 dataset identity/calculation을 유지하고 정상 top-level action trace만 추가한다. -0→0은 변경이다. Revision은 nonnegative safe integer이며 overflow는 원자적으로 거부한다.
- 값 변경은 해당 parameter를 읽는 모든 저장 computed snapshot을 시작점으로 dataset DAG 전체 closure를 stable topological order로 갱신한다. Lookup diamond는 한 번만 재계산하며 영향 없는 sibling은 공유한다. 같은 결과라도 다른 parameter revision을 읽으면 새 data provenance를 만든다.
- Graph는 호출 스택에 의존하지 않는 bounded iterative 순회다. 전체 재계산 비용은 각 transform의 실제 새 source 행 수를 합산하며 computed는 AST node 수를 곱한다. 합계 10,000,000을 넘으면 resource-limit으로 거부한다. Filter 확장/축소 이후의 행 수를 사용하고 기존 snapshot의 행 수로 추정하지 않는다.
- 새 immutable dataset revision에 exact parameterInputs를 결합하고 logical owners/layer/selection/statistical references를 재결합한 뒤 기존 scales→marks→guides→layout→highlights materialization을 수행한다. Speculative immutable branch의 전 과정을 검증한 뒤 반환하므로 실패 시 기존 program/trace/graphics는 유지된다. Dependents/force/cascade 옵션은 없다.
- Named AST selection inputs also receive the exact new parameter revision. The action rebinds conditional selection inputs, refreshes affected marks/named labels/highlights, and checks predicates even without visual consumers. The selection contract owns final-item field meaning and expression limits.
- Facet/repeat parent는 retained source를 수정한 뒤 children/shared guides/layout을 재생성한다. Concat는 명시 childPath가 필요하며 같은 ID의 sibling에 전파하지 않는다. Full 전용이다.

### Formal values — `editParameter`

- Implemented: `editParameter(options: EditParameterOptions): ChartProgram`.
- Planned: 없음.
- URL consumer가 있는 값 변경은 `prepareDataUpdate`의 parameter request와 `applyDataUpdate`를 사용한다. 준비 없는 직접 변경은 prepared-data-required이며 같은 값은 기존 no-op이다.
- Proposed (NOT IMPLEMENTED): parameter ID/type/nullable 변경, conditional encoding, automatic network loading.

### Value coverage — `editParameter`

- ✅ Covered: immutable multi-root/lookup diamond revisions, unaffected siblings, no-op/signed zero, numeric and consumer failure atomicity, selectors/highlights, facet/repeat/concat scope, restore/edit/revise lifecycle.
- Evidence: `test/unit/actions/data/parameter-lifecycle.test.js`, `test/unit/actions/data/computed-v2.test.js`.

## `removeParameter`

- Signature: `removeParameter({ id })`.
- 존재하는 명시 ID의 미참조 parameter만 제거한다. Stored computed snapshot, resource input, retained source 중 live reference가 있으면 resource-in-use이며 consumer 정보를 포함한다. Primitive removal도 동일 restrict 규칙을 적용한다.
- 수식 또는 consumer를 먼저 제거해야 한다. Cascade/force는 지원하지 않는다. 삭제 후 같은 ID를 생성하면 revision0이며 이전 program snapshot에는 이전 resource가 유지된다. Full 전용이다.

### Formal values — `removeParameter`

- Implemented: `removeParameter(options: RemoveParameterOptions): ChartProgram`.
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): cascade/force 삭제.

### Value coverage — `removeParameter`

- ✅ Covered: explicit identity, missing resource, restrict errors, primitive bypass rejection, immutable removal/recreation.
- Evidence: `test/unit/core/parameter-resource-state.test.js`, `test/unit/actions/data/parameter-lifecycle.test.js`.
## `createPivotData`

- Signature: `createPivotData({ id, source?, field, value?, groupBy?, columns?, op?, fill? })`.
- Full-only. `id`는 필수 새 dataset ID, `source` 생략 시 current data를 사용한다. `groupBy` 기본은 `[]`이며 string 또는 unique field 배열이다.
- `field`는 열 category를 가리킨다. `columns`는1..64개의 `{value: string|number|boolean|null, as: nonempty string}`이다. Typed key와 output 이름은 각각 고유하고 group field와 충돌할 수 없다. `-0`과0은 같은 key다.
- Columns 생략은 모든 관측 key가 nonempty string일 때 first-appearance 순서로 추론한다. Empty input 또는 non-string key는 explicit columns가 필요하다. 추론 결과를 저장하며 revision/replay는 다시 추론하지 않는다. 선언하지 않은 관측 key는 오류다.
- `op`는 `none`(기본), `sum`, `mean`, `min`, `max`, `count`다. `none`은 group×column당 한 행만 허용한다. 중복은 명시 aggregate가 필요하다. Count만 `value`를 받지 않으며 행 수를 센다. 나머지는 `value` field를 요구하고 finite number/null만 받는다. Absent/undefined/nonnumeric/nonfinite input과 결과 overflow는 오류다.
- `none`은 관측 null을 보존한다. 수치 aggregate는 null을 제외하고 all-null cell의 sum은0, mean/min/max는 null이다. 관측 없는 cell만 `fill`(기본 null, finite number 또는 null)을 사용한다.
- Output은 first-observed group tuple 순서의 group fields와 column aliases뿐이다. Empty output은`[]`이며 빈 입력은 기존 field validation에 필요한 declared source schema와 explicit columns를 사용한다. Columns의 number schema와 nullable intent가 보존된다.
- Canonical transform은 `{type:"pivot",field,groupBy:[],columns:[{value,as}],op:"none",fill:null,value}`다. Count는 value를 저장하지 않는다. Row lineage는 group의 실제 input rows 전체이며 fictitious missing-cell reference가 없다. Column lineage는 group fields와 field/value를 참조하고 typed column value가 stable output role이다.
- `createDerivedData`와 `materializePivotData` child를 명시 호출한다. Source/consumer revision은 기존 logical identity와 dependency plan을 사용한다. Facet은 source partition에서 statistical replay한다. Repeat는 statistical dataset을 거부한다. Renderer는 materialized graphicSpec만 읽는다.
- Columns64/output rows10,000/work10,000,000을 allocation 전에 검사한다. Input validation/grouping 및 group×column output 작업을 포함한다. Unknown option, getter, collision, invalid key, duplicate/no-op, missing field와 resource limit 실패는 immutable하다.
- Persistence는 closed transform, source field/schema 및 lineage를 검증하고 저장된 rows/graphics를 복원한다. 복원 시 pivot 계산이나 materialization을 다시 실행하지 않는다.

### Formal values — `createPivotData`

- Implemented: `createPivotData(options: PivotDataOptions): ChartProgram` (Full only).
- Numeric branch: `{value: FieldName, op?: "none"|"sum"|"mean"|"min"|"max"}`; count branch: `{op:"count",value?:never}`.
- Defaults: `groupBy:[]`, `op:"none"`, `fill:null`; columns infer once or are explicit typed keys.
- Proposed (NOT IMPLEMENTED): No proposal in this contract.

### Value coverage — `createPivotData`

- Evidence: `test/unit/actions/data/pivot-data.test.js`, `test/unit/grammar/pivot.test.js`.

- ✅ Covered: typed keys, independent numeric/null/overflow/work oracles in `test/unit/grammar/pivot.test.js`.
- ✅ Covered: immutable create, exact trace/schema/lineage, empty schema, Basic rejection, revision and lookup diamond in `test/unit/actions/data/pivot-data.test.js`.
- ✅ Covered: facet/repeat boundary, selections, composition and concrete renderers in `test/unit/actions/data/pivot-consumers.test.js`, `scripts/consumers/fixtures/node/pivot.mjs`.
- ✅ Covered: positive/negative declarations in `test/contracts/pivot-types.test.js`.

## `createComputedData`

- Signature: `createComputedData({ id, source?, as, expression })`
- `id`, `source`: 새 immutable derived dataset ID와 existing materialized source다. `source` 생략 시
  current data를 사용한다.
- `as`: 모든 source row에서 아직 존재하지 않는 non-empty output field다.
- `expression`: v1의 기존 recursive typed data AST 또는 아래 explicit v2 envelope다. Callback/string/eval은 허용하지 않는다. 다음 기존 규칙은 v1에 적용한다. Leaf는 `{ field }` 또는 finite
  number/string/boolean/null `{ constant }`다. 산술, 비교, boolean, `if`, `coalesce`, `concat`,
  `log`, `sqrt`의 닫힌 node union을 지원한다. `if`·`and`·`or`·`coalesce`는 값 평가를
  short-circuit하지만 모든 branch의 구조와 field 존재는 먼저 검증한다.
- `toNumber` unary node는 finite number를 보존하고 trim된 signed decimal/scientific string을 finite number로 변환한다. Empty/whitespace, null, boolean, hex, invalid 및 non-finite 값은 거부한다. 다른 연산의 strict numeric 계약은 유지한다.
- `floor`는 `{op:"floor",operand}` numeric unary node다. Finite number만 받고 Math.floor와 같은 음수/정수/signed-zero 결과를 반환한다. String은 명시 toNumber가 필요하며 null/nonnumeric은 오류다. 기존 depth16/nodes128/work10,000,000 및 lazy 평가를 유지한다.
- `datePart`는 `{op:"datePart",part:"year",operand,timeZone?}`다. Epoch milliseconds인 finite number 또는 null을 받고 null은 전파한다. 기본 UTC와 명시 IANA timeZone의 Gregorian astronomical year 정수를 계산한다. 문자열은 parseTime으로 명시 변환한다. 잘못된 part/zone은 빈 입력에서도 오류며 비숫자/비유한 값과 Date 범위 ±8,640,000,000,000,000 초과를 거부한다. 소수 milliseconds는 Date TimeClip 정수 절삭이다. Expression 교체에서 timeZone 생략으로 UTC reset한다. 기존 derived lineage/재생/저장/소비자 계약을 유지한다. Evidence: `test/unit/actions/data/computed-calendar-year.test.js`, `test/unit/actions/data/computed-floor.test.js`.
- `parseTime` node는 `{ op: "parseTime", operand, format? }`다. Format은 `"auto"`(기본), `"%Y-%m-%d"`, `"%d/%m/%Y"`, `"%m/%d/%Y"`의 closed union이다. Explicit calendar formats는 UTC millisecond timestamp를 만들고 잘못된 일자 rollover를 거부한다. Auto는 기존 temporal scalar normalization을 재사용한다. Invalid/nullish input은 null이므로 filter/impute 등 기존 명시적 missing-data 정책으로 처리한다. Raw field는 덮어쓰지 않는다.
- `getPath` node는 `{ op: "getPath", operand: { field: root }, path }`다. Path는 1–8개의 non-empty literal string key이며 dot splitting, arrays/indices, dynamic expressions, prototype traversal를 지원하지 않는다. `__proto__`/`prototype`/`constructor`와 unknown node keys는 거부한다. Plain record의 own data property만 읽고 getter는 실행하지 않는다. Missing own property와 nullish intermediate는 null, present non-record intermediate/accessor/nonscalar 또는 nonfinite leaf는 atomic error다. Dataset 전체에서 unknown root는 오류지만 known optional root가 없는 row는 null이다. Ordinary literal field reference의 기존 의미와 missing-row 오류는 유지한다. Root field는 schema lineage dependency다.
- `replaceLiteral` node는 `{ op: "replaceLiteral", operand, search, replacement }`다. Operand는 기존 recursive expression이며 평가 결과는 string이어야 한다. Search는 non-empty literal string, replacement는 empty를 허용하는 literal string이다. 첫 case-sensitive exact substring만 교체하고 no match는 원본을 보존한다. Dollar sequences는 literal이며 regex/flags/callback/dynamic search와 coercion은 지원하지 않는다. Null/nonstring operand와 malformed keys/types는 atomic error다. 기존 depth/node/work bounds와 lazy conditional 평가를 유지한다.
- 입력 안전성: AST node·path·operands는 enumerable own-data만 허용한다. Getter/setter, symbol/non-enumerable key, sparse 또는 custom-prototype array는 평가 전에 거부한다. Action summary도 getter를 실행하지 않으며 기존 정상 trace shape와 v1 결과/한도는 유지한다. Evidence: `test/unit/grammar/expression-validation.test.js`.
- Effect: source row와 모든 existing cell을 보존하고 각 row에 한 primitive 또는 null output을 추가한다.
  Serialized transform 자체가 exact formula provenance다. Facet replay에서는 row-preserving transform으로
  처리한다. undefined scalar cell은 null로 평가하지만 ordinary field key 자체가 없는 row는 오류다. Explicit getPath의 known optional root는 위 missing 정책을 따른다. 한 materialization의
  non-null output type은 하나여야 한다.
- 오류: missing/structured operand, typed-operation mismatch, divide-by-zero, invalid log/sqrt,
  overflow/non-finite result, mixed output type, output collision, unknown 또는 malformed expression node를
  첫 state change 전에 거부한다. Expression은 depth 16, 128 nodes, `rows × nodes` 10,000,000 work로 제한한다.
- Coverage: `test/unit/actions/data/computed-data.test.js`가 기존 산술, nullable/string/boolean,
  conditional short-circuit, Unicode code-point ordering, ownership, mark consumption과 invalid matrix를 검증한다.

### Explicit v2 expressions

- `expression:{version:2,registry:"standard@1",root}`는 literal/field/fieldPath/parameter/unary/binary/if/call의 닫힌 8-node union이다. Literal top-level field name과 nested fieldPath는 구별하며 path는 최대8개 literal own-data keys다. Reserved keys/prototype/getter/regex/callback/eval은 허용하지 않는다.
- `call`은 `standard@1`의 30개 닫힌 함수만 사용한다. `ggaction/inspection`의 `getExpressionFunctions({registry?})`가 immutable name/arity/input/output/options descriptors를 반환하며 registry 생략은 standard@1이다. Unknown registry/option과 명시 undefined는 오류다. 평가 함수나 사용자 registry 등록은 공개하지 않는다.
- 모든 branch의 shape, 참조와 알려진 type을 먼저 검증하고 if/and/or/coalesce의 실제 값만 lazy 평가한다. Boolean 조건은 strict boolean이며 implicit coercion은 없다. Missing과 null은 별개다. Nullish arithmetic과 domain/division/nonfinite/date-range/array-bounds failures는 undefined 결과와 계산 report를 만들며 invalid type은 오류다. Nullish 비교는 false다. Non-null/nonmissing output은 한 scalar type이어야 한다.
- Source schema가 field type과 optional 여부를 제공한다. Empty data도 unknown field/parameter와 static type mismatch를 거부한다. Array는 arrayLength/at 등 명시 call 입력으로만 쓰며 최종 output은 scalar다.
- Parameter 값은 resource.result.value에서만 읽고 transform에는 normalized AST와 `parameterInputs:[{kind:"parameter",id,revision}]`를 저장한다. AST 첫 출현 순서, 중복 제거, inactive branches 포함이다. Parameter 없는 v2는 [], v1에는 해당 속성이 없다. 사용자 create/edit/derived 요청은 vector를 직접 지정하지 않는다. Stored vector의 missing/extra/duplicate/order/type/stale ref는 거부한다.
- v2 계산 report는 algorithm:expression@2, registry, evaluatedRows, missingRows, divideByZero/domain/nonFinite/dateRange/arrayBounds counts와 parameterInputs를 포함한다. Data row/field lineage에는 parameter를 섞지 않는다.
- v2 한도: depth64, node4096, call args64, path8, rows×nodes10,000,000, string1,048,576 UTF-16 units, array100,000, cumulative value work10,000,000. v1 limits와 numeric/error/missing behavior는 그대로 유지한다.
- Full/Basic 모두 v2 computed 생성 가능하다. Full editComputedData는 v1↔v2 교체와 source revise replay를 지원하며 dependency closure는 기존 명시 dependents 정책을 따른다. EditParameter는 항상 전체 closure를 갱신한다.
- Editable schema4는 parameter resource와 v2 exact bindings를 보존하며 restore는 validators만 실행하고 계산·fetch·action replay를 하지 않는다. Legacy1–3는 위장한 신규 payload를 거부한다. Graphic-only snapshot schema와 renderer 계약은 바뀌지 않는다.
- Evidence: `test/unit/actions/data/computed-v2.test.js`, `test/unit/actions/data/parameter-lifecycle.test.js`, `test/unit/grammar/expression-validation.test.js`, `test/unit/grammar/expression-functions.test.js`, `test/unit/grammar/expression-limits.test.js`.

### Formal values — `createComputedData`

- Implemented: `createComputedData({ id: UserId; source?: UserId; as: FieldName; expression: ComputedExpression }): ChartProgram`
- Implemented nodes: field; number/string/boolean/null constant; add/subtract/multiply/divide;
  negate/absolute/log/sqrt/toNumber; parseTime(operand, format?); eq/neq/lt/lte/gt/gte; and/or/not/isNull; if/coalesce/concat; getPath(literal root field, 1–8 literal keys); replaceLiteral(operand, nonempty literal search, literal replacement).
- Proposed (NOT IMPLEMENTED): callbacks, expression strings, group aggregates, arbitrary regex와 arbitrary code evaluation.

### Value coverage — `createComputedData`

- ✅ Covered: closed UTC date formats, day/month order, leap dates, invalid/null output, auto temporal normalization, typed AST validation and filtered mark consumption in `test/unit/actions/data/parse-time-data.test.js` and `test/contracts/parse-time-types.test.js`.

- ✅ Covered: arithmetic, comparison, logic, conditional, coalesce/concat, log/sqrt and all primitive constants.
- ✅ Covered: missing/invalid typed input, lazy value evaluation with eager structural/field validation,
  zero denominator, invalid domains, finite overflow, mixed output and collision rejection.
- ✅ Covered: strict node shape/vocabulary, immutable deep ownership, row grain, depth/node/work bounds.
- Evidence: `test/unit/actions/data/computed-data.test.js`, `test/unit/actions/data/computed-access-and-replacement.test.js`, `test/contracts/computed-access-replacement-types.test.js`.

## `createNormalizedData`

- Signature: `createNormalizedData({ id, source?, field, as, groupBy?, method, variance?, zeroDenominator?, baseline?, sortBy? })`
- `field` is finite quantitative input; `as` must not overwrite any source cell. `groupBy` defaults to `[]`
  and isolates every summary or baseline by scalar group identity while final rows retain source order and grain.
- `share` computes `x / sum(group)` and rejects every negative input. `minmax` computes
  `(x-min)/(max-min)`. `zscore` uses the shared stable mean/deviation implementation; `variance` defaults
  to `"population"` and also accepts `"sample"`.
- `index`, `change`, and `percentChange` compare against a finite explicit baseline value or a stable
  first/last row selected by non-empty `sortBy`. Omitted baseline means first. Index has baseline 100;
  percent change is a fraction and does not multiply by 100.
- Exact zero denominators reject by default. `zeroDenominator: "null" | "zero"` explicitly substitutes
  those values for share, minmax, zscore, index, and percentChange. It is invalid for change. Sample zscore
  with fewer than two group rows always rejects.
- Effect: stores one `normalize` transform with requested roles and normalized policies, then materializes
  the output through `materializeNormalizedData`. Its facet topology is statistical, so facet replay
  recomputes group results from each local source partition.
- Errors: unknown or method-inapplicable options, missing/non-finite fields, invalid group/sort scalars,
  duplicate group/sort fields, output collision, negative share inputs, zero denominators, non-finite output,
  and invalid baseline/variance policies reject before returning changed state.

### Formal values — `createNormalizedData`

- Implemented: `createNormalizedData(options: NormalizedDataOptions): ChartProgram` (Full only).
- Implemented methods: `"share" | "zscore" | "minmax" | "index" | "change" | "percentChange"`.
- Proposed (NOT IMPLEMENTED): negative shares, generic lookup/join, source replacement and arbitrary reducers.

### Value coverage — `createNormalizedData`

- ✅ Covered: share/minmax, population/sample zscore, stable ordered and explicit baselines, index/change/fractional
  percent change, group isolation and source order.
- ✅ Covered: error/null/zero denominator policies, constant/singleton/negative/missing/collision and option-shape errors.
- ✅ Covered: empty source, immutable input/program, transform ownership and trace hierarchy.
- Evidence: `test/unit/actions/data/normalized-data.test.js`, `test/contracts/transform-registry.test.js`.

## `createCompleteData`

- Signature: `createCompleteData({ id, source?, key, groupBy?, values?, sequence?, calendar?, fill?, members? })`
- Lifecycle: Full-only immutable create action이다. 새 dataset ID를 만들며 source 또는 기존 consumer를 수정하지 않는다.
  `source` 생략은 현재 dataset을 안전하게 하나로 추론할 수 있을 때만 허용한다.
- `key`: 모든 source row에 있는 non-empty field다. `groupBy`와 겹치지 않아야 한다. `groupBy`는
  field 하나 또는 field 배열이고 기본은 `[]`다.
- Domain: `values`, `sequence`, `calendar`는 배타다. `values`는 하나의 scalar type으로 구성된 non-empty unique
  array다. `sequence`는 finite `start <= end`, positive `step`을 받고 `start + i * step <= end`를 생성한다.
  셋 다 없으면 source 전체 key의 typed first-appearance domain을 사용한다.
- Calendar: `{ unit: "day", start, end, timeZone }`는 strict Gregorian `YYYY-MM-DD` 양 끝을 포함한다.
  명시 `UTC` 또는 IANA zone의 civil-day 시작 epoch milliseconds를 생성한다. UTC/IANA의 gap은 기존 time-unit
  boundary policy를 쓰며 civil date 자체가 사라진 경우 오류다. source key는 생성된 number와 정확히 같아야 한다.
  문자열, null, midday, 다른 zone의 day key를 자동 변환하지 않는다. `createTimeUnitData`와 명시 `createSummaryData`
  뒤에 적용한다. 저장 transform은 authored calendar object만 소유하고 expanded values를 중복 저장하지 않는다.
- Group semantics: 실제 관측된 group tuple만 사용하고 group field별 Cartesian product를 만들지 않는다.
  동일 group×key의 반복 관측은 입력 순서와 원본 cell을 각각 보존하며 자동 집계하지 않는다.
  해당 pair가 하나도 없을 때만 합성 row 하나를 만든다. explicit domain 밖의 관측 key는 오류다.
- Output: group first appearance와 domain order를 따른다. 원본 row의 모든 cell을 보존하고 합성 row는 key와
  group fields를 채운 뒤 나머지 source-field union을 `fill[field]` 또는 `null`로 채운다. `fill`은 key,
  group 또는 members field를 바꿀 수 없다.
- `members`: 생략 가능 output field다. 지정하면 원본 row는 `[sourceIndex]`, 합성 row는 `[]`를 갖는다.
  기존 source field와 충돌하면 오류다.
- Bounds and replay: 반복 관측과 합성 row를 모두 포함해 allocation 전에 output 10,000-row 한도를 검사한다. `complete`는 statistical facet
  topology라 각 child의 local source rows에서 domain/group completion을 다시 계산한다.
- Calendar bounds: domain도 최대10,000일이며 input/field validation, fixed timezone boundary probes, group×domain/output cells,
  lineage 재계산을 포함한 보수적 work estimate가10,000,000을 넘으면 domain/output 확장 전에 오류다.
  빈 ungrouped source는 domain의 합성 row를 만들고 빈 grouped source는 `[]`다. 빈 source에는 key/group을 선언한 schema가 필요하다.
  Calendar output schema는 numeric key와 fill/members fields를 빈 grouped 결과에도 보존한다. 합성 row는 input row refs가 없다.
- Errors: invalid/duplicate ID, unknown/ambiguous source, unknown option, missing field, mixed/non-scalar key,
  duplicate domain, invalid sequence/fill/members, field collision와 output budget 초과를 첫 state change
  전에 거부한다.

### Formal values — `createCompleteData`

- Implemented: `createCompleteData(options: CompleteDataOptions): ChartProgram` (Full only).
- Implemented domain modes: observed typed domain, explicit typed values, finite numeric sequence, explicit zoned civil-day calendar.
- Proposed (NOT IMPLEMENTED): multi-key completion, group Cartesian expansion, automatic duplicate aggregation,
  calendar-month sequence와 source replacement.
- Evidence: `test/unit/actions/data/calendar-completion.test.js`, `test/unit/actions/data/calendar-lifecycle.test.js`,
  `test/unit/grammar/calendar-days.test.js`, `test/contracts/calendar-types.test.js`.

### Value coverage — `createCompleteData`

- ✅ Covered: observed/explicit/sequence domain, group/domain stable ordering, sparse observed tuple handling,
  fill and membership provenance, global/grouped empty inputs.
- ✅ Covered: duplicate/mixed/domain-missing/collision/budget errors, immutable caller rows/options/program and trace hierarchy.
- ✅ Covered: transform registry and facet-local statistical replay.
- Evidence: `test/unit/actions/data/complete-impute-data.test.js`, `test/contracts/transform-registry.test.js`,
  `test/contracts/data-completion-types.test.js`.

## `createImputedData`

- Signature: `createImputedData({ id, source?, fields, groupBy?, sortBy?, method?, value?, edges?, maxGap? })`
- Lifecycle: Full-only immutable create action이다. source row grain과 최종 source order를 유지한다.
- `fields`: non-empty unique field 하나 또는 배열이다. missing은 `null`/`undefined`만이며 `NaN`/`Infinity`는
  invalid value다. 한 group 안의 각 target field는 하나의 non-null scalar type이어야 한다.
- `groupBy`: 기본 `[]`; anchor와 missing run은 group 밖으로 넘어가지 않는다. `sortBy`는 stable lexicographic
  sort이고 order 기본은 ascending이다. 계산 뒤 output은 원래 row order로 복원한다.
- `method` 생략은 `"mean"`이다. Mean은 group별 각 field의 observed finite-number 평균을 한 번 계산해 nullish cells를 대체한다. Input type은 numeric이어야 하며 원본 row/cell은 보존한다. Sorting은 선택 사항이고 anchor가 없는 group은 edges keep/error를 따른다.
- `constant`: `value`가 필수이며 target field type과 일치해야 한다. `sortBy`는 선택 사항이다.
- `forward`/`backward`: `value`를 금지하고 non-empty `sortBy`가 필요하다. 각각 이전/다음 non-missing anchor를 쓴다.
- `linear`: `value`를 금지하고 정확히 하나의 ascending numeric 또는 temporal-string sort field가 필요하다.
  position은 unique해야 하고 행 index가 아니라 실제 x-distance로 finite numeric target을 보간한다.
- `edges`: 기본 `"keep"`. 필요한 anchor가 없는 eligible edge run은 유지하거나 `"error"`로 거부한다.
  `maxGap`은 positive safe integer이며 이를 초과한 missing run은 그대로 유지하고 edges error를 적용하지 않는다.
- Effect: 지정한 target fields만 대체하고 다른 cell을 보존한다. `impute`는 statistical facet topology라
  group anchor와 interpolation을 child-local source에서 다시 계산한다.
- Errors: invalid method별 option 조합, missing field, duplicate field/sort role, mixed type, invalid scalar,
  invalid linear position/target, unfillable `edges:"error"`, duplicate ID 또는 source resolution 오류를 원자적으로 거부한다.

### Formal values — `createImputedData`

- Implemented: `createImputedData(options: ImputedDataOptions): ChartProgram` (Full only).
- Implemented methods: `"mean" (default) | "constant" | "forward" | "backward" | "linear"`; edges `"keep" | "error"`.
- Proposed (NOT IMPLEMENTED): spline/model imputation, callback functions, automatic aggregation과 source replacement.

### Value coverage — `createImputedData`

- ✅ Covered: constant, forward, backward, non-uniform-distance linear interpolation, group isolation, stable sort,
  source-order restoration, edge and max-gap precedence.
- ✅ Covered: nullish-only missing policy, method/type/field/sort/edge errors and immutable failure.
- ✅ Covered: transform registry and facet-local statistical replay.
- Evidence: `test/unit/actions/data/complete-impute-data.test.js`, `test/contracts/transform-registry.test.js`,
  `test/contracts/data-completion-types.test.js`.

## `createStackData`

- Signature: `createStackData({ id?, source?, category, group, value, mode?, as? })`
- `id`, `source`: 새 immutable derived dataset ID와 existing materialized source다. `source` 생략 시
  current data를 사용한다. `id` 생략 시 deterministic `"stacked"` role을 사용하고 해당 ID 또는 owner가 이미 있으면 거부한다. 두 번째 stack은 explicit 새 ID가 필요하며 자동 번호나 첫 dataset 선택은 하지 않는다.
- `category`, `group`, `value`: 서로 다른 field다. 각 source row는 한 unique category/group cell이며
  value는 finite number다. Category와 group은 null/string/boolean/finite-number scalar identity를 쓴다.
- `mode`: `"stack" | "fill" | "center" | "diverging"`, 기본 `"stack"`이다. Phase 4의
  `layoutSeriesPartition`을 그대로 사용한다. Stack/fill/center는 non-negative values, diverging은 positive와
  negative를 zero에서 별도로 누적한다.
- `as`: `{ start?, end?, value?, share? }`; 기본은 `${value}_start`, `${value}_end`, `${value}_value`,
  `${value}_share`다. 모든 output은 고유하고 source field를 덮어쓰지 않는다.
- Effect: category는 source first appearance, group stack order는 전체 source의 first appearance를 쓴다.
  Output row order와 original cells를 보존하고 start/end, raw value, absolute-magnitude partition share를
  추가한다. Zero cell은 zero-thickness endpoint와 share 0으로 보존한다. Fill의 endpoints는 [0,1]이다.
- 오류: missing/non-finite roles, duplicate category/group cell, invalid mode/sign, output collision과 10,000
  output row 초과를 첫 state change 전에 거부한다.
- Coverage: `test/unit/actions/data/stack-data.test.js`가 stable cross-category group order, 모든 네 mode,
  zero/negative/share math, ranged mark consumption, alias/cell/type/mode errors와 ownership을 검증한다.

### Formal values — `createStackData`

- Implemented: `createStackData({ id?: UserId; source?: UserId; category: FieldName; group: FieldName; value: FieldName; mode?: "stack" | "fill" | "center" | "diverging"; as?: StackDataOutputFields }): ChartProgram`
- Proposed (NOT IMPLEMENTED): duplicate-cell aggregation, missing-cell synthesis와 explicit series order.

### Value coverage — `createStackData`

- ✅ Covered: stack/fill/center/diverging shared math, stable order, zero thickness and absolute-magnitude shares.
- ✅ Covered: mixed-sign diverging and negative rejection in non-negative modes.
- ✅ Covered: missing/duplicate/non-finite cells, role/output uniqueness, source collision and immutable rejection.
- Evidence: `test/unit/actions/data/stack-data.test.js`, `test/unit/grammar/transforms/series-layout.test.js`.

- ✅ Covered: 생략 ID와 explicit `"stacked"` convergence, default ID collision, second explicit ID와 missing-source failure in `test/unit/actions/data/stack-data.test.js`.

## `createRegressionData`

- Signature: `createRegressionData({ id, source?, x, y, groupBy?, method?, degree?, span?, robustIterations?, confidenceMethod?, level?, confidence?, interval? })`
- `id`, `source`: Implemented. 새 derived ID와 existing source ID이며 source는 current data로 추론된다.
- `x`, `y`: Implemented. 필수 quantitative field 이름이다. finite numeric values가 필요하다.
- `groupBy`: Implemented. optional field 이름이며 생략 시 하나의 regression을 만든다. 값의 first
  appearance order가 group order다.
- `method`: Implemented `"linear" | "polynomial" | "loess" | "exp"`. 기본값은 `"linear"`다.
- `exp`는 strictly positive finite y를 weight로 사용한 log(y)의 weighted least squares다.
  각 group은 최소2행·varying x가 필요하다. `rate=cov_w(x,log(y))/var_w(x)`,
  `logAmplitude=mean_w(log(y))-rate*mean_w(x)`와 `exp(logAmplitude+rate*x)`를 사용한다.
  Centered/scaled arithmetic으로 계산하며 amplitude·rate와 모든 요청 prediction이
  representable finite/positive여야 한다. Missing policy 이후0/음수 y는 제거하지 않고 거부한다.
  생략/false interval은 `false`로 저장하고 CI columns를 만들지 않는다. Degree/span/robustIterations,
  confidenceMethod/level/confidence 및 mean/prediction interval은 명시적으로 거부한다.
- `degree`, `span`: Implemented method-specific parameter다. polynomial degree 기본값은 `2`, LOESS
  span 기본값은 `0.75`다. Polynomial degree는 `1..32`, LOESS degree는 `1|2`이며 기본 `1`이다.
  LOESS degree 생략/1은 기존 local-linear 계산과 저장 shape를 유지하고 degree2만 `degree:2`를 저장한다.
  Degree는 linear/exp, span은 LOESS 외 method에서 거부한다.
- `robustIterations`: LOESS 전용 정수 `0..32`, 기본 `0`. 양수만 provenance에 저장한다.
  각 반복은 group별 정규화 absolute residual 중앙값의 6배를 cutoff로 bisquare weight를
  tricube weight에 곱한다. Cutoff가 `64*Number.EPSILON` 이하이면 그 tolerance 안쪽만 weight 1이다.
  Weight가 바뀌지 않으면 조기 종료한다. 모든 local weight가 0이면 동일 neighborhood의 ordinary fit을
  사용하며 span을 확대하지 않는다. 거리 weight가 모두 0인 boundary tie는 동일 weight로 계산한다.
  추가 prediction 위치도 최종 residual weight를 사용한다.
- `confidenceMethod`, `level`: Implemented. method는 `"normal" | "student-t"`, level은 `(0, 1)`의
  finite number다. 기본은 Student-t와 `0.95`이며 둘 다 transform provenance에 저장된다.
- `confidence`: Implemented compatibility alias for `level`. 둘을 함께 주면 값이 같아야 하며 새 코드에는
  `level`을 권장한다.
- `interval`: Implemented `"mean" | "prediction"`이며 linear/polynomial에서만 허용한다.
  기본값은 `"mean"`이다. 첫 LOESS 계약에서는 confidence/interval output을 만들지 않는다.
- Effect: source, fields, grouping과 resolved method defaults를 transform provenance에 저장하고 observed
  unique x별 fitted row를 materialize한다. Polynomial은 normalized basis의 stable least squares를 사용하고
  LOESS는 source-order tie를 가진 tricube neighborhood에서 degree1의 local-linear 또는 degree2의
  centered/scaled quadratic fit을 사용한다. 이웃 수는 `min(n,max(degree+1,ceil(span*n)))`이다.
  Degree2의 scaled design rank 판정은 partial-pivot tolerance `1e-12`이고 singular일 때 동일 이웃의
  weighted constant mean으로 fallback한다. 이웃을 확대하지 않는다. n<2 또는 varying x가 없으면
  오류이고 n=2의 degree2는 local constant fallback을 사용한다. Linear/polynomial은
  lower/upper를 만들고 LOESS는 fitted y만 만든다. Finite extreme input은 centered/scaled arithmetic으로
  계산하며 fitted value, model coefficient 또는 interval endpoint가 finite number로 표현될 수 없으면
  materialization 전에 명확히 거부한다. 전체 unique group/x output은 최대 `10,000` rows다.
  Polynomial work `sum(n*(degree+1)^2+(degree+1)^3)`와 LOESS work
  `sum(n*(uniqueX*(1+robustIterations)+newPredictionX)*ceil(log2(n+1)))`에 degree2만 local fit마다
  `32*neighborCount+27`을 더한다. Descriptor/value 검증과 moment/solve 비용까지 포함한 보수적 한도다.
  모든 group·robust pass·새 prediction의 누적 work는 `10,000,000`을 넘기 전에 거부한다. Graphic은 직접 만들지 않는다.
- Coverage: `test/unit/actions/data/regression-data.test.js`와
  `test/charts/cars-regression-scatterplot/reference-values.test.js`가 grouped/ungrouped 값,
  confidence bounds와 invalid/degenerate groups를 검증한다. 여러 confidence 대표값 coverage는 부분적이다.

### Formal values — `createRegressionData`

- Implemented: `createRegressionData({ id: UserId; source?: UserId; x: FieldName; y: FieldName; groupBy?: FieldName } & ({ method?: "linear"; confidenceMethod?: ConfidenceIntervalMethod; level?: UnitIntervalExclusive; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction" } | { method: "polynomial"; degree?: PositiveInteger; confidenceMethod?: ConfidenceIntervalMethod; level?: UnitIntervalExclusive; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction" } | { method: "loess"; degree?: 1 | 2; span?: UnitIntervalExclusiveZero; robustIterations?: NonNegativeInteger } | { method: "exp"; interval?: false }))`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRegressionData`

- `id`, `source`, `x`, `y`, `groupBy`
  - ✅ Covered: inferred/explicit source, grouped/ungrouped, missing fields, non-finite data와 degenerate groups.
- `method`
  - ✅ Covered: all four methods, unknown rejection, degree/span defaults and boundaries, deterministic provenance/output ordering.
  - ✅ Covered: LOESS degree2 literal quadratic/affine fits, independent weighted-system oracle, scale/translation,
    singular/tied/all-zero robust neighborhoods, grouped cumulative work, degree1 exact compatibility와
    create/edit/revise/facet/follow-source/persistence in `test/unit/actions/data/loess-degree.test.js` and
    `test/unit/actions/data/loess-lifecycle.test.js`.
  - ✅ Covered: exponential response weighting, positive-pair checks, no-interval normalization,
    prediction positions and immutable source/edit/facade/persistence lifecycle in `exponential-regression.test.js`.
- `confidenceMethod`, `level`, `confidence`
  - ✅ Covered: Student-t/normal, default `0.95`, compatibility alias, alias conflict, invalid method와 0/1 boundaries.
  - ✅ Covered: near-zero positive level normalization과 numerical kernels have
    independent finite-bound invariants.
- `interval`
  - ✅ Covered: `"mean"`과 unknown value rejection.
  - ✅ Covered: `"prediction"` for linear/polynomial with residual variance and Student-t bounds.
- Numeric range
  - ✅ Covered: overflow-safe linear/polynomial response means, full-range LOESS distance normalization,
    finite fitted rows와 unrepresentable interval rejection.
- Evidence: `test/unit/actions/data/regression-data.test.js`,
  `test/charts/cars-regression-scatterplot/reference-values.test.js`.

## `createDensityData`

- Signature: `createDensityData({ id, source?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, weight?, as? })`
- `id`, `source`, `field`, `groupBy`: Implemented. 새 derived ID, existing source, 필수 quantitative
  field와 optional grouping field다.
- `bandwidth`
  - Status: Implemented. positive finite number 또는 `"auto"`; 기본은 `"auto"`다.
  - Effect: 선택한 kernel 폭을 결정한다. requested `"auto"`는 그대로 보존하고 deterministic
    rule-of-thumb 결과는 revision-owned `resolved.bandwidth`에 별도로 저장한다.
- `extent`
  - Status: Implemented. `"auto"` 또는 오름차순 finite `[min, max]`; 기본은 `"auto"`다.
  - Effect: 모든 group이 공유하는 sample grid의 시작과 끝을 결정한다. requested `"auto"`는 그대로
    보존하고 concrete extent는 `resolved.extent`에 저장한다.
- `steps`
  - Status: Implemented. `2..10,000` integer이며 기본값은 `100`이다.
  - Effect: inclusive grid의 row 수와 area path resolution을 결정한다.
- `kernel`
  - Status: Implemented. `"gaussian" | "epanechnikov" | "uniform" | "triangular"`; 기본값은
    `"gaussian"`이다.
  - Effect: bandwidth와 sample grid를 유지하면서 각 sample의 normalized weight recipe를 결정한다.
- `normalization`
  - Status: Implemented. `"unit" | "count"`; 기본값은 `"unit"`이다.
  - Effect: unit은 group density integral을 1로 맞추고 count는 같은 estimate에 group의 valid sample
    count를 곱한다.
- `weight`
  - Status: Implemented. Optional `StatisticalWeight`; 생략은 이전 unweighted KDE transform shape와
    계산 경로를 유지한다.
  - Effect: unit은 `sum(w*K)/(W*h)`, count는 `sum(w*K)/h`다. Positive-weight rows만 extent, group
    membership과 density에 기여하지만 every requested value/weight row는 선검증한다. Auto bandwidth는
    `1.06*s*nEff^(-1/5)`, `s=min(weighted sample stdev,IQR/1.34)`이며 IQR 0이면 sample stdev를 쓴다.
    Frequency/reliability의 quantile과 effective-size 정의는 weighted summary와 같다. Auto는
    `nEff>1`과 positive spread를 요구하고 explicit positive bandwidth는 singleton을 허용한다.
    Weighted grouped/split auto bandwidth는 profile마다 다시 계산한다. Profile이 하나면
    `resolved.bandwidth`, 여러 개면 first-appearance 순서의 `resolved.bandwidths`에
    `{ group?, split?, bandwidth }`를 저장하며 두 필드는 배타다. Explicit bandwidth와 unweighted
    호출은 기존 단일 `resolved.bandwidth` shape를 유지한다. Facet replay도 각 child source에서 재계산한다.
- `as`
  - Status: Implemented. 서로 다른 두 개의 non-empty field 이름이며 기본은
    `[`${field}_value`, `${field}_density`]`다.
  - Effect: derived row와 이후 encoding이 참조할 output field 이름을 결정한다.
- Effect: grouped KDE provenance와 deterministic values를 저장한다. Requested bandwidth/extent와
  revision-owned resolved bandwidth/extent를 분리하며, resolved kernel과 normalization default도 항상
  provenance에 기록한다. Finite extent difference가 overflow해도 convex interpolation으로 sample grid를
  만들며, requested step 수만큼 strictly increasing finite sample이나 finite density를 표현할 수 없으면
  derived dataset을 만들기 전에 거부한다.
- Coverage: `test/unit/actions/data/density-data.test.js`와
  `test/charts/cars-density-area/reference-values.test.js`가 auto/explicit bandwidth, extent,
  grouped/ungrouped, ownership과 오류를 검증한다. steps의 여러 경계/대표 조합은 부분적이다.

### Formal values — `createDensityData`

- Implemented: `createDensityData({ id: UserId; source?: UserId; field: FieldName; groupBy?: FieldName; bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; kernel?: "gaussian" | "epanechnikov" | "uniform" | "triangular"; normalization?: "unit" | "count"; weight?: StatisticalWeight; as?: readonly [FieldName, FieldName] })`
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createDensityData`

- `id`, `source`, `field`, `groupBy`
  - ✅ Covered: inferred/explicit source, grouped/ungrouped, missing field와 non-finite samples.
- `bandwidth`
  - ✅ Covered: 생략/`"auto"`, positive finite representative, zero/negative/non-finite rejection.
  - ✅ Covered: positive finite validation, representative explicit/auto values and kernel formula invariants;
    exhaustive magnitude stress is outside the deterministic contract.
- `extent`
  - ✅ Covered: `"auto"`, explicit `[min, max]`, reversed/non-finite rejection.
  - ✅ Covered: strict ascending extent rejects constant/reversed pairs; explicit source-external extent materializes
    its requested sample endpoints.
- `steps`
  - ✅ Covered: default `100`, explicit representative, `<2`/non-integer rejection.
  - ✅ Covered: exact minimum `2`, representative/default counts and invalid bounds. Unbounded performance stress is
    not a public semantic contract.
- `as`
  - ✅ Covered: inferred names, two explicit names, wrong cardinality/invalid names rejection.
- `kernel`
  - ✅ Covered: four formulas, Gaussian default, invalid value, provenance와 primitive/public parity.
- `normalization`
  - ✅ Covered: unit/count formulas, unit default, group-local scaling, invalid value와 provenance.
- `weight`
  - ✅ Covered: frequency/reliability formulas, auto bandwidth, positive-row extent, scale invariance,
    zero-weight value validation, all-zero groups and explicit-bandwidth singleton.
- Numeric range
  - ✅ Covered: full finite-range extent interpolation, large-offset auto bandwidth, finite density invariant와
    unrepresentable grid/estimate rejection.
- Resource limits: 실제 non-empty group/split profile의 `steps` 합은 최대 `10,000` rows이며,
  `validRows * steps` density work는 최대 `10,000,000`이다.
- Evidence: `test/unit/actions/data/density-data.test.js`,
  `test/charts/cars-density-area/reference-values.test.js`.

## `createDerivedData`

- Signature: `createDerivedData({ id, source, transform })`
- `id`: Implemented, 필수 새 dataset ID.
- `source`: Implemented, 필수 existing dataset ID.
- `transform`: Implemented, 정확히 하나의 transform definition을 가진 tuple. Public direct-authoring union은
  filter/fold/flatten/computed/stack/regression/density/interval/time-unit/window/summary/bin/bin2d schema이며 값 materialization은 해당 전용 action이 담당한다. Box summary,
  box outlier, mark filter provenance는 composite action이 생성하는 internal transform으로 public union에 넣지 않는다.
- Effect: source와 transform provenance만 저장하고 values는 만들지 않는다.
- 오류: duplicate ID, unknown source, invalid/empty/multiple transform schema를 거부한다.
- Consumer precondition: chart facade와 ordinary mark의 공통 data selection은 `values`가 있는 dataset을 요구한다.
  Definition-only ID를 explicit/current data로 소비하면 dataset ID와 materialized values의 필요성을 설명하는
  domain error를 낸다. 정의 생성·internal rebind는 유지하며 자동 실행하거나 다른 dataset으로 fallback하지 않는다.
- Coverage: `test/unit/actions/data/derived-data.test.js`가 public branch의 direct call, 배열 cardinality,
  invalid discriminant와 caller-owned input immutability를 검증한다. Package consumer는 documented filter call과
  closed union을 strict TypeScript로 compile한다.

### Formal values — `createDerivedData`

- Implemented: `createDerivedData({ id: UserId; source: UserId; transform: readonly [DatasetTransform] })`, where public `DatasetTransform = FilterTransform | FoldTransform | ComputedTransform | StackTransform | RegressionTransform | DensityTransform | IntervalTransform | TimeUnitTransform | WindowTransform | SummaryTransform | BinTransform | Bin2DTransform`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createDerivedData`

- `id`, `source`
  - ✅ Covered: valid IDs, duplicate output, unknown source.
- `transform`
  - ✅ Covered: filter/fold/computed/stack/regression/density/interval/time-unit/window/summary/bin/bin2d direct schema, object/empty/multiple/unknown rejection,
    one-element tuple acceptance와 deep immutable ownership.
  - Built-in value materializer는 owning high-level action이 만든 single-transform resource만 받는다.
- Evidence: `test/unit/actions/data/derived-data.test.js`, `test/unit/actions/data/derived-consumers.test.js`,
  `scripts/package-consumer.js`, 각 high-level data action test.

## `editDerivedData`

- Signature: `editDerivedData({ target, definition, dependents? })`.
- Target: 필수 stable logical standalone-derived owner ID 또는 그 owner의 current snapshot ID다. Source dataset,
  stale revision ID와 chart-owned internal dataset은 오류다. 기존 owner registry가 없는 serialized program은 direct
  top-level creator trace, single transform과 source를 모두 확인할 수 있을 때만 lazy owner로 migration한다.
- `definition`: 현재 transform과 같은 type의 complete requested definition이다. Dataset envelope가 아니므로 `id`,
  `source`, `current`, materializer가 추가한 `resolved`를 받지 않는다. Complete transform의 domain option `values`는
  이 금지 목록과 무관하며 허용된다. Arrays, AST, aggregate/output maps는 전체 교체다.
- `dependents`: `"reject" | "recompute"`, 기본 `"reject"`. Reject는 첫 downstream derived dataset을 deterministic하게
  보고하고 쓰기 전에 중단한다. Recompute는 `dataset.source` DAG의 reachable closure를 semantic dataset 순서 기반
  topological order로 새 immutable revisions에 materialize한다. Cycle, unsupported transform, 잘못된 downstream field,
  non-finite output 또는 visual consumer incompatibility가 하나라도 있으면 원본 state와 trace를 그대로 보존한다.
- Output roles: 같은 semantic output role의 일대일 rename만 direct layer encoding, category-order summary,
  weighted theta, Parallel dimension/key, selection selector와 jitter key에 전달한다. Downstream expression/predicate의
  임의 field 문자열은 치환하지 않는다.
- Effect: `materializationConfigs.data.<family>.<owner>.current`를 새 snapshot으로 이동하고 direct consumers를 모두
  rebind/rematerialize한다. Context는 원래 값을 보존하되 `currentData`가 retired snapshot을 가리켰을 때만 대응 revision으로
  이동한다. 새 owner/current와 모든 live references를 연결한 뒤 실제 미참조 old revision만 release한다.
- No-op: canonical requested definition이 동일하면 dataset revision을 만들지 않는다. Public action trace node는 남지만
  materialize/rebind/release child는 없다.
- Immutability: caller definition/patch/source rows, 이전 program의 semantic/graphic/config/context/trace/resolved scales와
  composition children을 성공·실패 모두 변경하지 않는다.

### Formal values — `editDerivedData`

- Implemented: `editDerivedData({ target: UserId; definition: RequestedDatasetTransform; dependents?: "reject" | "recompute" }): ChartProgram`.
- Editable transform types: `computed | filter | fold | flatten | summary | bin | bin2d | timeUnit | window | density | stack |
  regression | interval | ecdf | normalize | complete | impute`.
- Planned (NOT IMPLEMENTED): source 교체와 transform type 교체. 기존 `editBin2DData.source`는 전용 compatibility 예외다.
- Proposed (NOT IMPLEMENTED): 추가 transform family가 standalone create lifecycle을 얻을 때 같은 registry 계약으로 검토한다.

### Value coverage — `editDerivedData`

- ✅ Covered: explicit owner/current target, lazy legacy owner, wrong/source/chart-owned/stale target, complete definition,
  resolved/source injection, same-type enforcement, no-op, deterministic revision IDs, default reject, full DAG recompute,
  sibling preservation, logical-source reuse, direct output-role rename와 원자적 downstream failure.
- Evidence: `test/unit/actions/data/derived-editing.test.js`, `test/unit/actions/data/bin2d-data.test.js`.

## Focused derived-data editor rules

아래 focused actions는 모두 `target`을 필수로 받고 `dependents?`를 공유한다. 나머지 keys는 해당 create action에서
`id`와 `source`를 뺀 partial transform options다. 최소 한 transform option이 필요하며 omission은 current requested
definition을 보존한다. `undefined`와 `null`은 삭제 기호가 아니다. Arrays/objects/AST는 전체 교체다. `weight:false`는
weight를 지원하는 focused editors에서만 stored weight를 제거한다. 각 action은 자신의 trace node 아래 wrapped
`editDerivedData`를 두며 모든 lifecycle/error/immutability 규칙을 상속한다.

## `editComputedData`

- Signature: `editComputedData({ target, as?, expression?, dependents? })`.
- `as` 또는 typed `ComputedExpression` AST를 교체한다. Output rename은 direct semantic role만 rebind한다.

### Formal values — `editComputedData`

- Implemented: `editComputedData(options: EditComputedDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 임의 함수·문자열 식 실행.

### Value coverage — `editComputedData`

- ✅ Covered: output·AST 전체 교체, direct output-role rename, downstream AST의 unsafe field 유지 시 atomic failure.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editFilteredData`

- Signature: `editFilteredData({ target, field?, oneOf? | noneOf? | predicate? | range?, nulls?, dependents? })` or `editFilteredData({ target, where: ExpressionV2, dependents? })`.
- A complete `where` switches from a legacy field mode; a complete field/mode pair switches back. Expression edits rebind all parameter inputs, including inactive branches. `where` cannot be mixed with `field` or `nulls`.
- Filter mode option을 제공하면 이전 mode keys를 모두 제거한 뒤 exactly-one mode를 검증한다. `field`만 편집하면
  현재 mode를 유지한다.

### Formal values — `editFilteredData`

- Implemented: `editFilteredData(options: EditFilteredDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 callback predicate.

### Value coverage — `editFilteredData`

- ✅ Covered: field-only 유지, oneOf/predicate/range 상호배타 전환, invalid range와 empty patch 거부.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editLookupData`

- Signature: `editLookupData({target, field?, lookup?, dependents?})`, Full 전용이다.
  최소 한 개 transform option이 필요하고 생략한 option은 유지한다. lookup을 제공하면
  data/key/fields와 선택 as를 가진 전체 객체로 교체한다. Default as는 해당 fields다.
- 기존 focused derived editor의 reject/recompute 정책을 사용한다. Generic editDerivedData는
  같은 normalized lookup definition을 받으며 definition.source는 받지 않는다.
  주 원본 교체는 reviseData가 소유한다. alias 역할은 원래 reference field별로 식별하여
  호환되는 직접 consumer를 재결합한다. dependent expression의 field 문자열을 추측하여 고치지 않는다.
- 현재 출력 또는 downstream 표를 reference로 삼는 logical cycle, duplicate key, schema 또는
  downstream consumer 오류는 이전 program 전체를 보존한다. 성공 시 immutable physical revision과
  양쪽 source 참조를 갱신한다. Basic은 creation-only surface를 유지한다.

### Formal values — `editLookupData`

- Implemented: `EditLookupDataOptions`, Full-only focused editor and generic editable lookup definition.
- Proposed (NOT IMPLEMENTED): partial nested lookup patches and primary-source definition replacement.

### Value coverage — `editLookupData`

- ✅ Covered: direct alias rebind, derived reference changes, dependent replay, cycle and atomic rejection.
- Evidence: `test/unit/actions/data/lookup-data.test.js`,
  `test/unit/actions/composition/lookup-facets.test.js`, `test/contracts/derived-editing-types.test.js`.

## `editFlattenData`

- Signature: `editFlattenData({target, fields?, as?, dependents?})`, Full 전용이다.
- 기존 logical owner/current snapshot을 명시하고, 최소1개 의미 있는 edit가 필요하다.
  기존 generic `editDerivedData({target, definition:{type:"flatten",fields,as},dependents?})`
  역시 같은 typed definition·preflight·revision 경로를 사용한다.
- Omitted 옵션은 유지한다. fields 개수가 달라지면 같은 길이의 as를 명시한다. 입력 field별
  alias 역할을 사용하므로 alias rename은 호환되는 직접 소비자에 재결합하고, 참조 중인
  역할 제거/모호한 output/schema·값·한도·의존 소비자 불일치는 atomic하게 거부한다.
- dependents는 기존 reject/recompute 정책이다. 원본/이전 dataset은 보존하고 성공 시
  immutable revision 및 영향받는 graphic/guide를 재계산한다. Basic은 생성 전용 surface다.
- Coverage: `test/unit/actions/data/flatten-data.test.js`와
  `test/contracts/derived-editing-types.test.js`의 재결합/연쇄계산/atomic rejection/공개 타입 검증.

### Formal values — `editFlattenData`

- Implemented: `EditFlattenDataOptions`, Full 전용 focused derived editor.
- 정규화·null padding·한도는 `createFlattenData` 계약을 공유한다.
- Proposed (NOT IMPLEMENTED): No proposal beyond the current aligned-array contract.

### Value coverage — `editFlattenData`

- ✅ Covered: alignment, null padding, field/alias validation, immutable raw snapshots and schema lineage.
- ✅ Covered: Full revision/dependent replay, Basic creation, bounds and ordinary mark consumption.
- Evidence: `test/unit/actions/data/flatten-data.test.js`, `test/contracts/derived-editing-types.test.js`.


## `editFoldData`

- Signature: `editFoldData({ target, fields?, as?, dependents? })`.
- `fields`와 `{key,value}` output map은 각자 전체 교체다.

### Formal values — `editFoldData`

- Implemented: `editFoldData(options: EditFoldDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 부분 output-map merge.

### Value coverage — `editFoldData`

- ✅ Covered: fields와 as whole replacement, output role migration, row-limit·type validation 재사용.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editSummaryData`

- Signature: `editSummaryData({ target, groupBy?, aggregates?, members?, weight?, dependents? })`.
- `aggregates`는 전체 교체하며 output role은 unique aggregate operation+source field identity로만 대응한다. 배열 index로
  rename을 추론하지 않는다. `weight:false`는 weight를 제거한다.

### Formal values — `editSummaryData`

- Implemented: `editSummaryData(options: EditSummaryDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): aggregate 배열의 index 기반 patch와 source 교체.

### Value coverage — `editSummaryData`

- ✅ Covered: groupBy/aggregate/member replacement, semantic aggregate role, weighted→unweighted 제거, dependent recompute.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editBinData`

- Signature: `editBinData({ target, field?, maxBins? | step? | boundaries?, extent?, nice?, zero?, includeEmpty?, members?, as?, weight?, dependents? })`.
- Bin mode key를 제공하면 이전 maxBins/step/boundaries mode를 지운다. `as`는 complete map replacement이고
  `weight:false`는 weight를 제거한다.

### Formal values — `editBinData`

- Implemented: `editBinData(options: EditBinDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 bin-mode partial merge.

### Value coverage — `editBinData`

- ✅ Covered: maxBins/step/boundaries exclusivity, exact output roles, includeEmpty/members와 weight removal.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editTimeUnitData`

- Signature: `editTimeUnitData({ target, field?, unit?, as?, temporalUnit?, timeZone?, weekStartsOn?, weekRule?, missing?, dependents? })`.
- Non-week unit으로 전환하면 week-only keys를 제거한다. Week로 전환하면 create defaults와 ISO/Monday constraint를
  동일하게 적용한다.

### Formal values — `editTimeUnitData`

- Implemented: `editTimeUnitData(options: EditTimeUnitDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 host-local implicit timezone.

### Value coverage — `editTimeUnitData`

- ✅ Covered: unit/zone/input/output 교체, week-only key cleanup, deterministic calendar validation.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editWindowData`

- Signature: `editWindowData({ target, partitionBy?, sortBy?, operations?, temporalUnit?, dependents? })`.
- 모든 목록과 operation/frame 객체는 전체 교체이며 row/duration frame exclusivity와 duration temporal policy를
  create와 동일하게 검증한다.

### Formal values — `editWindowData`

- Implemented: `editWindowData(options: EditWindowDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): operation별 index patch와 source 교체.

### Value coverage — `editWindowData`

- ✅ Covered: partition/sort/operation whole replacement, row·duration frame validation, logical-source replay.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editDensityData`

- Signature: `editDensityData({ target, field?, groupBy?, bandwidth?, extent?, steps?, kernel?, normalization?, as?, weight?, dependents? })`.
- Resolved bandwidth/extent는 carried state가 아니며 새 source/current requested definition에서 재계산한다.
  `weight:false`는 weight를 제거한다.

### Formal values — `editDensityData`

- Implemented: `editDensityData(options: EditDensityDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): chart-owned density facade의 standalone target adoption.

### Value coverage — `editDensityData`

- ✅ Covered: requested/resolved 분리, bandwidth/extent/steps/kernel/normalization/as 편집과 weight removal.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editStackData`

- Signature: `editStackData({ target, category?, group?, value?, mode?, as?, dependents? })`.
- Category/group/value grain과 complete output map을 final candidate에서 함께 검증한다.

### Formal values — `editStackData`

- Implemented: `editStackData(options: EditStackDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 output-map partial merge.

### Value coverage — `editStackData`

- ✅ Covered: grain fields, four modes, complete semantic output roles와 duplicate-cell failure.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editRegressionData`

- Signature: `editRegressionData({ target, x?, y?, groupBy?, method?, degree?, span?, robustIterations?, confidenceMethod?, level?, confidence?, interval?, dependents? })`.
- Linear↔polynomial은 공통 confidence/interval을 보존하고 degree만 mode에 맞게 추가/제거한다. Loess 전환은
  confidence/interval을 제거하며 loess 밖으로 전환할 때 해당 defaults를 다시 정규화한다.
  Method를 바꾸면 inherited degree를 제거하고 새 method 기본값을 쓴다. 명시 degree는 새 method로 검증하며
  같은 LOESS에서 degree1 편집은 저장 degree를 제거하고 local-linear 결과로 복원한다.

### Formal values — `editRegressionData`

- Implemented: `editRegressionData(options: EditRegressionDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): chart-owned regression facade의 standalone target adoption과 source 교체.

### Value coverage — `editRegressionData`

- ✅ Covered: linear/polynomial/loess mode cleanup, confidence policy, group/field edit와 finite model validation.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editIntervalData`

- Signature: `editIntervalData({ target, field?, groupBy?, center?, extent?, method?, level?, as?, dependents? })`.
- Non-CI extent로 전환하면 CI-only method/level을 제거한다. Mean/median과 extent의 valid pair는 final candidate에서
  검증하며 자동으로 반대쪽 option을 추측하지 않는다.

### Formal values — `editIntervalData`

- Implemented: `editIntervalData(options: EditIntervalDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): center/extent pair 자동 교정과 source 교체.

### Value coverage — `editIntervalData`

- ✅ Covered: mean/median extent pairs, CI-only cleanup, complete center/lower/upper output role migration.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editECDFData`

- Signature: `editECDFData({ target, field?, groupBy?, weight?, missing?, as?, dependents? })`.
- `weight:false`는 weight field를 제거하고 explicit output map은 전체 교체한다.

### Formal values — `editECDFData`

- Implemented: `editECDFData(options: EditECDFDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): chart-owned ECDF facade의 standalone target adoption과 source 교체.

### Value coverage — `editECDFData`

- ✅ Covered: field/group/missing/as edit, weighted→unweighted 제거와 cumulative output roles.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editNormalizedData`

- Signature: `editNormalizedData({ target, field?, as?, groupBy?, method?, variance?, zeroDenominator?, baseline?, sortBy?, dependents? })`.
- Method 변경은 새 method에서 유효한 shared options만 유지한다. Baseline-family 내부 전환은 baseline/sortBy를 유지하고,
  다른 family에서 들어오면 명시 patch 또는 create defaults를 사용한다.

### Formal values — `editNormalizedData`

- Implemented: `editNormalizedData(options: EditNormalizedDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 method-incompatible option 자동 보존.

### Value coverage — `editNormalizedData`

- ✅ Covered: share/zscore/minmax/baseline family cleanup, zero-denominator policy와 output rename.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `editPivotData`

- Signature: `editPivotData({ target, field?, value?, groupBy?, columns?, op?, fill?, dependents? })`.
- Full-only focused editor for a standalone pivot owner. Target is the logical ID or current dataset snapshot; omitted transform options are preserved and arrays replace the whole value. Columns are never re-inferred by an edit.
- Count 전환 시 이전 value를 제거하며 count에서 numeric op로 전환할 때 value가 필요하다. Count와 value를 함께 지정하면 오류다. `op:"none"`은 aggregation을 제거하고 duplicate cells가 있으면 실패한다.
- Same typed column key의 as 변경은 직접 encoding/selection field를 새 alias로 rebind한다. Key 제거·교체로 필요한 consumer output이 없어지면 거부한다. `dependents` 기본 reject이며 recompute는 모든 downstream dataset을 stable topological order로 한 번씩 재계산한다.
- 새 immutable revision을 만들고 logical identity, group-grain row identity와 source lineage를 보존한다. Invalid child, field, column, selector, guide 또는 output capacity는 이전 program과 trace를 보존한다.

### Formal values — `editPivotData`

- Implemented: `editPivotData(options: EditPivotDataOptions): ChartProgram`.
- Existing focused editor의 explicit target, nonempty patch, closed options와 `dependents:"reject"|"recompute"` 규칙을 공유한다.
- Proposed (NOT IMPLEMENTED): No proposal in this contract.

### Value coverage — `editPivotData`

- Evidence: `test/unit/actions/data/pivot-data.test.js`, `test/unit/actions/data/pivot-consumers.test.js`.

- ✅ Covered: count/mean/none transitions, aliases, dependent recompute, source revisions, selection and restored editing in `test/unit/actions/data/pivot-data.test.js` and `test/unit/actions/data/pivot-consumers.test.js`.
- ✅ Covered: declaration boundaries in `test/contracts/pivot-types.test.js`; installed package in `scripts/consumers/fixtures/node/pivot.mjs`.

## `editCompleteData`

- Signature: `editCompleteData({ target, key?, groupBy?, values? | sequence? | calendar?, fill?, members?, dependents? })`.
- `values`, `sequence` 또는 `calendar`를 제공하면 이전 domain mode를 제거한다. `values`는 materialized rows가 아니라 Complete의
  requested typed domain이다. `fill`은 whole-map replacement다.
- Calendar도 whole-object replacement다. 생략은 현재 정책을 보존하며 모든 required fields를 제공한 새 정책만 받는다.
  source revision은 기존 TimeUnit/Summary/Complete dependency를 재계산하고 새 source의 domain 밖 key를 원자적으로 거부한다.

### Formal values — `editCompleteData`

- Implemented: `editCompleteData(options: EditCompleteDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 domain mode 병합.

### Value coverage — `editCompleteData`

- ✅ Covered: observed/values/sequence/calendar domain 전환, Complete values 허용, fill/members/grouping validation, calendar restore/source revision/facet/selection.
- Evidence: `test/unit/actions/data/derived-editing.test.js`, `test/unit/actions/data/calendar-lifecycle.test.js`.

## `editImputedData`

- Signature: `editImputedData({ target, fields?, groupBy?, sortBy?, method?, value?, edges?, maxGap?, dependents? })`.
- Constant↔ordered mode 전환에서 `value`를 정리하고 final method의 sort/value requirements를 검증한다.

### Formal values — `editImputedData`

- Implemented: `editImputedData(options: EditImputedDataOptions): ChartProgram`.
- Proposed (NOT IMPLEMENTED): source 교체와 method-required fields 자동 추론.

### Value coverage — `editImputedData`

- ✅ Covered: constant/forward/backward/linear 전환, value cleanup, sort/edges/maxGap validation.
- Evidence: `test/unit/actions/data/derived-editing.test.js`.

## `createTimeUnitData`

- Signature: `createTimeUnitData({ id, source?, field, temporalUnit?, unit, as?, timeZone?, weekStartsOn?, weekRule?, missing? })`
- Lifecycle: standalone 호출은 stable logical owner를 만들고 `editTimeUnitData`가 immutable revision을 생성해
  consumer를 rebind한다. `id`는 최초 생성 시 필수 새 derived dataset ID다.
- `source`: existing dataset ID다. 생략하면 current data를 사용하며 안전하게 추론할 수 없으면 오류다.
- `missing`: 생략/`"error"`는 기존 strict 동작이다. `"null"`은 null 또는 absent input만 null bucket으로 보존한다. Explicit undefined, invalid/nonfinite 값, zone/unit 오류는 계속 거부한다. 모든 row/order/raw field/lineage를 유지하며 all-null output도 nullable number schema다. 편집·replay도 동일하다.
- `field`: 기본은 모든 row에 존재하는 temporal input field다. Existing temporal normalization과 동일하게 finite timestamp,
  ISO/date string 또는 four-digit year를 받는다. `temporalUnit`은 입력 해석만 제어하며 transform에 보존된다.
- `unit`: `"year" | "quarter" | "month" | "day" | "hour" | "minute" | "second" | "week" | "weekday"`의
  closed vocabulary다.
- `as`: optional 새 output field이며 생략은 `${field}_${unit}`이다. Source의 어느 row에도 존재하지 않아야 하고 input field와 달라야 한다. Inference도 같은 collision 검증을 적용하고 numbered fallback을 만들지 않는다. Canonical stored transform은 항상 resolved as를 가진다.
- `timeZone`: optional non-empty IANA name이다. 생략은 `"UTC"` 계산과 같지만 기존 7-unit 호출은 이전 stored
  transform shape를 유지한다. host local timezone과 locale에 의존하지 않는다.
- Week policy: `unit:"week"`에서 `weekStartsOn` 기본은 Monday `1`, `weekRule` 기본은 `"calendar"`다.
  ISO rule은 Monday만 허용한다. week 전용 options를 다른 unit과 함께 쓰면 오류다.
- Effect: source row order와 모든 existing cell을 보존한다. `weekday`는 zone-local Sunday `0`부터 Saturday `6`의
  nominal integer를 추가한다. 다른 unit은 해당 zone civil bucket 시작을 나타내는 finite epoch milliseconds를 추가한다.
  Output timestamp를 temporal encoding에 연결할 때는 `temporalUnit:"timestamp"`를 사용해 numeric-year heuristic을 피한다.
- Boundary policy: instant를 Gregorian civil parts로 바꾸고 requested unit 시작을 만든 뒤 instant로 역변환한다.
  DST fold는 가장 이른 matching instant, gap은 같은 bucket 안의 첫 유효 instant를 선택한다. 완전히 존재하지 않는
  civil boundary/date 또는 Date 범위 밖 결과는 RangeError다. UTC는 기존 direct arithmetic 결과를 유지한다.
- Facet: row-preserving transform으로 분류한다. Explicit earlier partition anchor를 사용하면 각 child에서 canonical
  materializer를 replay하고, transform 자체가 latest common anchor이면 materialized rows를 직접 partition한다.
- 오류: invalid/duplicate ID, unknown source, unknown option/unit/zone/week policy, invalid/missing temporal value,
  input/output identity, existing output collision와 unrepresentable boundary를 첫 state change 전에 거부한다.

### Formal values — `createTimeUnitData`

- Implemented: `createTimeUnitData(options: TimeUnitDataOptions): ChartProgram` (Full only).
- `TimeUnit`은 기존 7개 unit과 `"week" | "weekday"`를 포함한다. Week transform만 normalized
  `weekStartsOn`과 `weekRule`을 저장하며 explicit `timeZone`은 모든 unit에서 저장한다.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): locale calendar 선택, aggregation과 resampling.

### Value coverage — `createTimeUnitData`

- `missing`: strict/null, mixed/optional/all-null rows, edits, replay, nullable numeric lineage and rejection evidence: `test/unit/actions/data/time-unit-missing.test.js`.

- `unit`
  - ✅ Covered: 기존 seven boundaries, week/weekday, custom week starts, ISO Monday, quarter/leap/sub-day/early-year.
- `timeZone`
  - ✅ Covered: UTC/Seoul/New_York/Kolkata/Lord_Howe/Apia, hour/half-hour offsets, DST gap/fold와 skipped date.
- `field`, `as`
  - ✅ Covered: timestamp/ISO/date/year inputs, missing/invalid input, default/explicit distinct output와 collision rejection.
- Lifecycle and integration
  - ✅ Covered: current/explicit source, immutable provenance/rows/options, action hierarchy, direct transform schema,
    temporal position consumption, registered replay와 explicit-anchor facet rederivation.
- Evidence: `test/unit/grammar/transforms/time-unit.test.js`,
  `test/unit/actions/data/time-unit-data.test.js`, `test/contracts/transform-registry.test.js`,
  `test/unit/actions/data/derived-data.test.js`, `scripts/package-consumer.js`.

## `createRegressionStatisticsData`

- Signature: `createRegressionStatisticsData({ id, source })`.
- 두 UserId는 필수다. Source는 명시적 existing materialized linear regression dataset이며 current
  data나 첫 dataset을 추론하지 않는다. Logical fit owner는 현재 physical revision으로 해석한다.
- 닫힌 transform은 `{type:"regressionStatistics"}` 하나며 dataset.source는 fit ID다.
  Fixed columns는 count/intercept/slope/rSquared다. Grouped fit은 원래 groupBy field를 typed key와
  first-appearance 순서로 추가한다. 그 이름이 fixed column과 충돌하면 거부한다.
- Count는 missing 정책 이후 실제 관측 수이며 prediction grid 수와 무관하다. 기존 선형 모델의
  intercept/slope를 재사용하고 같은 관측의 scaled SSE/SST로 `1-SSE/SST`를 계산한다.
  Constant y의 rSquared는 null이며 임의 clamp나 다른 estimator는 없다.
- Fit-owned cache는 materializationConfigs.regressionFits[fitId]의
  `{version:1,method:"linear",groups:[{group?,count,intercept,slope,rSquared}]}`다.
  Raw rows/full model/prediction arrays는 복제하지 않는다. 기존 fit trace·semantic/graphic/prediction은
  유지하지만 editable snapshot bytes는 cache 때문에 달라질 수 있다.
- 구 snapshot의 cache 없는 fit은 로드 때 계산하지 않는다. 첫 statistics 생성이 wrapped
  materializeRegressionData를 한 번 명시 호출하여 cache만 복원하고 prediction rows는 유지한다.
  Cache가 있으면 다시 fit하지 않는다. Stats node에 대응 cache가 없는 snapshot은 거부한다.
- Raw source·polynomial/LOESS/exp, alias/unknown option, malformed cache는 오류다. Full 전용이다.
- Lifecycle: standalone logical data owner다. Fit/source edit는 fit cache→stats→consumer 순으로
  갱신한다. Stats가 붙은 fit의 unsupported method 변경은 원자적으로 거부한다. RemoveData와 derived
  release는 자기 cache를 정리하고 live stats/source 삭제는 기존 dependency guard가 막는다.
- Coverage: `test/unit/actions/data/regression-statistics.test.js`는 독립 OLS/SSE oracle, constant/typed/missing,
  prediction count 독립성, reuse/legacy explicit fit count, source/editor/annotation/removal,
  chart-owned transition과 extreme finite·persistence tamper를 검증한다.

### Formal values — `createRegressionStatisticsData`

- Implemented: `createRegressionStatisticsData({ id: UserId; source: UserId }): ChartProgram`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRegressionStatisticsData`

- ✅ Covered: fixed schema, explicit linear source, grouped typed order, coefficients/count/SSE and null constant response.
- ✅ Covered: reuse, old snapshot explicit materialization, immutable state and malformed persisted cache rejection.
- Evidence: `test/unit/actions/data/regression-statistics.test.js`, `test/contracts/derived-editing-types.test.js`.

## `editRegressionStatisticsData`

- Signature: `editRegressionStatisticsData({ target?, source? })`.
- Target는 standalone statistics logical owner/current physical revision이다. 생략하면 current data가
  eligible owner일 때 그것을, 아니면 유일한 standalone owner를 사용하며 ambiguity는 오류다.
- Source 생략은 기존 source 보존이다. 같은 source나 빈 옵션은 no-op이다. Explicit source는 create와
  같은 linear fit/column 충돌 검사를 통과해야 한다.
- Source 변경은 immutable stats revision과 전체 dependent data/visual/annotation 재계산을 원자적으로
  실행한다. 두 옵션만 받으며 dependents/bypass/aliases는 없다. Cycle·consumer schema/type 오류는
  원래 program을 보존한다.
- Coverage: `regression-statistics.test.js`의 source 교체·revision·annotation/제거·오류 원자성.

### Formal values — `editRegressionStatisticsData`

- Implemented: `editRegressionStatisticsData({ target?: UserId; source?: UserId }): ChartProgram`.
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRegressionStatisticsData`

- ✅ Covered: inferred/explicit owner, preserved source, immutable revision and downstream annotation replay.
- Evidence: `test/unit/actions/data/regression-statistics.test.js`, `test/contracts/derived-editing-types.test.js`.

## `createWindowData`

결과 field 이름은 일반 own data property로 저장한다. __proto__, constructor, toString도 허용하며
source row의 prototype을 바꾸거나 결과를 누락하지 않는다. 뒤 operation은 앞의 해당 결과를 field로 읽을 수 있다.

- Signature: `createWindowData({ id, source?, partitionBy?, sortBy?, operations, temporalUnit? })`
- Lifecycle: standalone 호출은 stable logical owner를 만들고 `editWindowData`가 immutable revision을 생성해
  consumer를 rebind한다. `id`는 최초 생성 시 새 derived dataset ID여야 한다.
- `source`: existing dataset ID다. 생략하면 current data를 사용하고 유일하게 추론할 수 없으면 오류다.
- `partitionBy`: field 이름 하나 또는 field 이름 array다. 기본은 `[]`이며 전체 source가 한 partition이다.
- `sortBy`: `{ field, order? }` array다. 기본은 `[]`, order 기본은 `"ascending"`이다. 여러 field는
  앞에서부터 비교하고 동률은 source row order로 안정적으로 해소한다. `null`/missing은 각 방향의 끝에 둔다.
- `operations`: 비어 있지 않은 ordered array다. 앞 operation의 output을 뒤 operation의 `field`로 사용할 수 있다.
  - `rowNumber`, `rank`, `denseRank`: `{ op, as }`; rank 계열은 non-empty `sortBy`가 필요하다.
  - `cumulativeSum`: `{ op, field, as }`; field 값은 모두 finite number여야 한다.
  - `lag`, `lead`: `{ op, field, as, offset?, default? }`; offset 기본은 `1`, default 기본은 `null`이다.
  - `movingMean`, `movingSum`: `{ op, field, as, frame, minPeriods?, missing? }`다. Row frame은
    `{ preceding, following? }`, duration frame은 `{ duration:{ preceding, following?, unit } }`이며 둘을 섞지 않는다.
    `minPeriods` 기본은 `1`, `missing` 기본은 `"error"`; `"skip"`도 허용한다. Error mode는 nullish/nonfinite를
    거부한다. Skip mode만 nullish value를 window count와 합계에서 제외하며 NaN/Infinity는 항상 오류다.
- Row frame: preceding/following은 non-negative safe integer이고 current sorted row를 포함한다. 양쪽 edge는
  available rows로 truncate한다.
- Duration frame: unit은 `"millisecond" | "second" | "minute" | "hour" | "day"`; day는 정확히 24시간이다.
  정확히 하나의 ascending `sortBy`가 필수이며 position은 `temporalUnit`으로 해석한 epoch milliseconds다.
  Closed lower/upper boundary를 사용하고 동일 timestamp peers는 같은 window와 결과를 공유한다.
- Numeric policy: moving sum/mean은 scaled compensated rolling arithmetic을 쓰며 final output이 finite여야 한다.
  Duration은 stable sort와 two pointers로 group마다 sort `O(n log n)`, scan `O(n)`이다.
- Effect: normalized provenance와 materialized values를 새 dataset에 저장한다. 계산은 partition마다 정렬된
  순서로 수행하지만 최종 rows는 source row order를 보존한다. 모든 input과 output은 구조적으로 복사되고 freeze된다.
- 오류: duplicate/invalid ID, unknown source, missing field, duplicate sort/output field, output collision,
  incomparable sort values, invalid row/duration frame, invalid temporal position, minPeriods/missing policy,
  nonfinite result 또는 operation-specific option을 명확히 거부한다.
- Coverage: grammar, public action, direct derived schema, trace, facet replay와 package consumer를 각각 검증한다.

### Formal values — `createWindowData`

- Implemented: `createWindowData(options: WindowDataOptions): ChartProgram` (Full only).
- `WindowOperation`은 rank/cumulative/lag/lead와 row 또는 duration frame을 가진 movingMean/movingSum의 strict union이다.
- Planned (NOT IMPLEMENTED): percent rank와 ntile.
- Proposed (NOT IMPLEMENTED): weighted windows와 calendar-duration windows.

### Value coverage — `createWindowData`

- `partitionBy`, `sortBy`
  - ✅ Covered: omitted/single/multiple partition fields, omitted/multiple sort fields, both directions,
    stable ties, null/missing placement, invalid fields and mixed comparable types.
- `operations`
  - ✅ Covered: all eight operations, offset/frame defaults, one/two-sided and zero frames, truncated edges,
    sequential dependency, output collision, missing fields, invalid values, finite extreme means,
    unrepresentable sum outputs and empty operation list.
  - ✅ Covered: elapsed-duration frames, irregular positions, closed endpoints, timestamp peers, minPeriods,
    nullish skip behavior, invalid mixed frame/temporal policies and source-order restoration.
- Lifecycle and integration
  - ✅ Covered: source inference, duplicate ID rejection, source immutability, trace hierarchy, registry dispatch,
    facet replay, direct `createDerivedData` validation and packaged TypeScript/runtime consumption.
- Evidence: `test/unit/grammar/transforms/window.test.js`, `test/unit/actions/data/window-data.test.js`,
  `test/unit/actions/data/derived-data.test.js`, `test/charts/cars-window-rank-scatterplot/data.test.js`,
  `test/charts/airline-passenger-moving-windows/`, `scripts/package-consumer.js`.

## `createBin2DData`

- Signature: `createBin2DData({ id, source?, x, y, bins?, extent?, assignment?, includeEmpty?, members?, as? })`
- Lifecycle: stable logical owner를 가진 mutable resource다. 첫 호출은 `id` dataset을 만들고, 같은 `id`의
  후속 호출은 deterministic revision dataset을 만든 뒤 direct layer consumer를 명시적으로 rebind하고 이전
  unreferenced revision을 release한다. Earlier program과 caller input은 바뀌지 않는다.
- `source`: existing materialized dataset ID다. 첫 호출에서 생략하면 current data를 사용한다. Revision에서
  생략하면 이전 revision의 source를 보존한다.
- `x`, `y`: finite numeric pair를 읽을 source field다. 한쪽이라도 invalid/missing인 row는 eligible하지 않다.
- `bins`: positive integer 또는 `{ x, y }`; 기본 `{ x: 10, y: 10 }`이다. 각 축은 최대 10,000 bins,
  전체 grid는 최대 1,000,000 cells다.
- `extent`: optional `{ x?, y? }` explicit increasing finite endpoints다. 생략 axis는 eligible min/max를 쓴다.
  Explicit extent는 모든 eligible 값을 포함해야 하며 auto extent가 constant면 오류다.
- `assignment`: `"edges" | "step"`, 기본 `"edges"`. 기본은 실제 저장 edge의 strict half-open 비교를
  그대로 사용하고 저장 property를 생략한다. 명시 step은 축마다 nominal step을 사용해
  `floor(1e-14 + (value-minimum)/step)`를 계산하고 index를 0..bins-1로 제한한다. 1 bin은 index0,
  마지막 upper endpoint는 마지막 bin이다. Span overflow는 `maximum/bins-minimum/bins`,
  차이 overflow는 `value/step-minimum/step`를 사용한다. Extent 포함 여부는 먼저 검증한다.
  고정 index increment는 정책의 일부이며 비교 허용오차가 아니다. Edge 생성은 동일하고, step 소속은
  반올림된 저장 edge와 strict 비교한 소속과 다를 수 있다. Persisted transform에는 `assignment?: "step"`만 허용한다.
- `includeEmpty`: 기본 `false`. `true`면 deterministic y-major/x-minor 순서로 빈 cell도 저장한다.
- `members`: 기본 `false`. `true`면 source row object가 아니라 source row index array를 cell에 저장한다.
- `as`: generated `x0/x1/y0/y1/count/members` field 이름을 부분 override한다. Default는 `id` namespace를 쓴다.
- Revision에서 output 이름이 바뀌면 direct visual consumer의 같은 output role을 참조하던 encoding field,
  category-order summary, theta weight, Parallel dimension field/key, stored field selection과 jitter key도 새 이름으로
  rebind한다. Parallel dimension의 stored title label은 보존한다. Scale, mark와 inferred guide title은 그 semantic
  binding에서 다시 materialize된다. Optional members
  output을 제거할 때 남은 direct consumer binding이 이를 참조하면 revision을 원자적으로 거부한다.
- Effect: normalized request와 resolved extent/edges/count metadata를 transform provenance에 저장하고, 각 cell의
  lower/upper bounds와 count를 immutable values로 저장한다. 기본 edges cell은 `[lower, upper)`이며 마지막 upper bound만
  포함한다. 모든 edge는 finite strictly increasing number다. Full finite numeric range처럼 raw span이 overflow하는
  extent도 안정적으로 보간하며, 요청한 bin 수만큼 서로 다른 edge를 표현할 수 없으면 bin 수를 조용히 줄이지 않고
  materialization 전에 `RangeError`를 던진다.
- Facet: source partition 뒤 requested transform을 child마다 replay하므로 automatic extent와 counts는 child
  rows에서 다시 계산된다.
- 오류: invalid field/bin/extent/output contract, per-axis/total grid limit 초과, unrepresentable edge count,
  eligible row 부재, silent explicit-extent data loss, duplicate output names를 state 생성 전에 거부한다. 현재
  direct derived-dataset consumer가 있는 owner revision replacement는 dependency를 조용히 stale하게 두지 않고
  명확히 거부한다.

### Formal values — `createBin2DData`

- Implemented: `createBin2DData({ id: UserId; source?: UserId; x: FieldName; y: FieldName; bins?: PositiveInteger | { x: PositiveInteger; y: PositiveInteger }; extent?: { x?: [FiniteNumber, FiniteNumber]; y?: [FiniteNumber, FiniteNumber] }; assignment?: "edges" | "step"; includeEmpty?: boolean; members?: boolean; as?: { x0?, x1?, y0?, y1?, count?, members? } })`
- Planned (NOT IMPLEMENTED): dependent derived-dataset revision cascade, weighted cells, hexagonal/adaptive bins.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createBin2DData`

- Grid and boundaries
  - ✅ Covered: scalar/per-axis counts, automatic/partial/complete explicit extents, interior and final boundaries,
    row-major order, empty omission/inclusion, constant extent, per-axis/total limits, full finite-range interpolation,
    unrepresentable edge count and silent-loss rejection.
  - ✅ Covered: default/explicit edge byte equality, step rounded-boundary assignment, fixed index increment,
    1e-12-below rejection of upward reassignment, full finite range and immutable replay.
- Output
  - ✅ Covered: namespaced/partial/custom fields, optional member indexes, unique fields, count conservation and
    independent Cars oracle parity.
- Lifecycle and integration
  - ✅ Covered: source inference, filtered source, repeated immutable revision, direct mark/scale/guide rematerialization,
    release, facet replay, direct transform schema, runtime and strict TypeScript package consumption.
- Evidence: `test/unit/grammar/transforms/bin2d.test.js`, `test/unit/actions/data/bin2d-data.test.js`,
  `test/unit/actions/data/derived-data.test.js`, `test/charts/cars-binned-heatmap/data.test.js`,
  `scripts/package-consumer.js`.

## `editBin2DData`

- Signature: `editBin2DData({ target?, source?, x?, y?, bins?, extent?, assignment?, includeEmpty?, members?, as?, dependents? })`.
- Target: `target`은 materialization registry의 stable logical Bin2D owner ID다. 생략하면
  `context.currentData`가 가리키는 current revision의 owner, 그 다음 유일한 owner를 사용한다. Current match가 없고
  owner가 둘 이상이면 명시적 `target`을 요구하며 첫 owner를 선택하지 않는다.
- Partial edit: `target` 외 최소 한 option과 complete candidate 기준 실제 source/transform 변화가 필요하다. Omitted
  top-level option은 current revision의 requested transform provenance에서 보존한다. Explicit `bins`와 `extent`는
  create-time vocabulary 전체를 교체하므로 `extent` object에서 생략한 axis는 automatic extent로 돌아간다.
- Assignment edit: 생략하면 이전 정책을 보존한다. `"edges"`는 optional step provenance를 제거하고 기본 의미로 복구한다.
  동일 정책만 지정하는 edit는 기존 no-op 오류로 거부한다.
- Output and members: explicit `as`는 `x0/x1/y0/y1/count`와, `members: true`일 때 `members`까지 complete output map을
  요구한다. `as`를 생략하고 members를 켜면 logical owner namespace의 members field를 추가하고, 끄면 prior members
  output을 제거한다. 다른 output field는 보존한다.
- `dependents`: `"reject" | "recompute"`, 기본 `"reject"`. 공통 `editDerivedData` revision executor를 사용한다.
  Recompute는 current Bin2D를 source로 삼는 전체 derived closure를 새 revision으로 갱신한다. `source`가 자기 downstream을
  가리키는 cycle과 downstream output-field incompatibility는 첫 쓰기 전에 거부한다.
- Atomic effect: complete source rows와 transform을 계산하고 derived-dataset dependency 및 모든 direct visual
  consumer의 rematerialization을 speculative immutable branch에서 먼저 검증한다. 성공하면 deterministic revision ID로
  새 dataset을 만들고 wrapped `rebindLayerData` 뒤 output role에 연결된 downstream semantic/config field를 새 output
  이름으로 옮긴 다음 scale/mark/guide materialization plan을 적용하며, 참조가 없어진 prior revision만
  `releaseDerivedData`로 정리한다. Logical owner ID와 consumer layer/scale/coordinate/guide/selection identity는 유지한다.
- Compatibility: `createBin2DData({ id: existing, ...completeTransform })`의 full reauthor/revision 동작과
  `editBin2DData`의 optional target/source는 유지한다. Partial intent에는 `editBin2DData`를 사용한다. Derived dataset이
  current revision을 직접 소비하면 기본 reject하고 명시적인 `dependents:"recompute"`만 cascade한다.
- Immutability: previous program, prior revision, source rows와 caller-owned nested options를 변경하지 않는다.

### Formal values — `editBin2DData`

- Implemented: `editBin2DData({ target?: UserId; source?: UserId; x?: FieldName; y?: FieldName; bins?: PositiveInteger | { x: PositiveInteger; y: PositiveInteger }; extent?: { x?: [FiniteNumber, FiniteNumber]; y?: [FiniteNumber, FiniteNumber] }; assignment?: "edges" | "step"; includeEmpty?: boolean; members?: boolean; as?: { x0: FieldName; x1: FieldName; y0: FieldName; y1: FieldName; count: FieldName; members?: FieldName }; dependents?: "reject" | "recompute" })`.
- Planned (NOT IMPLEMENTED): weighted cells, hexagonal/adaptive bins.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editBin2DData`

- Owner and partial state
  - ✅ Covered: explicit/current/unique owner resolution, missing/empty/ambiguous/no-op rejection, every editable top-level
    option, omission preservation, complete output map and members output transition.
- Revision and dependencies
  - ✅ Covered: deterministic immutable revision, every direct layer rebind, scale/mark/guide rematerialization, prior release,
    derived-consumer rejection, output-role rename across Cartesian/category/Polar/Parallel bindings and stored selection/jitter,
    referenced optional-output removal rejection, downstream failure preflight and exact trace uniqueness.
- Compatibility and immutability
  - ✅ Covered: repeated-create behavior, earlier program, source rows and caller option preservation, runtime/types/contracts,
    packed Node/TypeScript/Browser and representative Canvas/PNG consumers.
- Evidence: `test/unit/actions/data/bin2d-data.test.js`, `test/contracts/bin2d-lifecycle-render.test.js`,
  `test/browser/package-consumer.browser.js`, `scripts/package-consumer.js`.

## `createCoordinate`

- Signature: `createCoordinate({ id?, type?, layers?, projection? })`.
- `id`: valid user ID, 기본 `"main"`.
- `type`: `"cartesian" | "polar" | "parallel" | "geo"`, 기본 cartesian.
- `layers`: existing unique layer ID array, 기본 `[]`.
- Effect: named semantic coordinate를 만들고 coordinate가 없는 selected layers에 reference를 저장한다.
  equivalent repeated definition은 idempotent이고 기존 layer를 다른 coordinate로 이동시키지 않는다.
- Coverage: `test/unit/actions/coordinates/create-coordinate.test.js`와 Parallel chart contract가 native types, attachments,
  idempotence, conflicts와 validation을 검증한다.
- Cartesian, Polar와 Parallel resources는 모두 current materialized consumers와 guides를 가진다.
- Direct coordinate attachment admits the final selected layer bindings through the [single-Y frame policy](AXES.md#single-y-per-cartesian-frame) before a semantic child writes them, including unfinished extension layers.

### Formal values — `createCoordinate`

- Implemented: `createCoordinate({ id?: UserId; type?: "cartesian" | "polar" | "parallel" | "geo"; layers?: readonly UserId[] } = {})`.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `createCoordinate`

- `id`: ✅ Covered omission→`"main"`, valid custom IDs, malformed IDs and conflicting duplicate.
- `type`
  - ✅ Covered: omission→`"cartesian"`, `"cartesian"`, `"polar"`, `"parallel"`, unknown value.
- `layers`
  - ✅ Covered: omission/empty, one/multiple existing IDs, duplicates, unknown layer, reattachment conflict.
- Evidence: `test/unit/actions/coordinates/create-coordinate.test.js`.

- Full `type:"geo"` stores one exact projection ref. Projection resolves explicit, existing coordinate binding, current eligible or one unique resource. Different bindings require editCoordinate. Native consumers/policies reject Geo, and Basic accepts only native coordinate types.
- Geo evidence: `test/unit/geo/coordinates.test.js`, `test/unit/geo/marks.test.js`.

## `editCoordinate`

- Signature: `editCoordinate({ target, aspect?, polarFrame?, projection? })`; at least one patch is required.
- For an existing Geo coordinate, projection is the only patch. It is an explicit existing projection ID and cannot mix with aspect/polarFrame. The complete consumer union is validated and rematerialized atomically.
- `target`: required existing coordinate ID. The action does not infer a coordinate.
- Direct edits validate the final Cartesian frame geometry before a semantic child, so an aspect change cannot overlay independent frames. Evidence: `test/unit/single-y-aggregate-admission.test.js`.
- `aspect`: `"auto"` or `{ mode, ratio, alignX?, alignY? }`.
  - `mode: "frame"` fixes the effective plot width/height ratio.
  - `mode: "data"` fixes `(pixels per x unit) / (pixels per y unit)` and is available only for one complete Cartesian
    quantitative linear x/y scale pair.
  - `ratio` must be a positive finite number. `alignX` and `alignY` accept `"start" | "center" | "end"` and default
    to `"center"`.
  - `"auto"` removes the stored aspect request and returns to the complete allocated plot bounds.
- `polarFrame`: `"auto"` or `{ center?, radius?, overflow? }`, available only for a Polar coordinate.
  - `center: { x, y }` uses finite fractions from 0 through 1 inside the aspect-adjusted effective bounds and defaults to
    `{ x: 0.5, y: 0.5 }`.
  - `radius` is `{ unit: "fraction", value }` with `0 < value <= 1` or `{ unit: "px", value }` with a positive
    finite value. It defaults to `{ unit: "fraction", value: 1 }`.
  - The frame object is a complete replacement. Supplying only center restores the default radius; supplying only radius
    restores the default center. `"auto"` removes the stored request.
  - The resolved maximum is the minimum distance from the requested center to the four effective-bound edges. A pixel
    radius larger than that maximum rejects by default (`overflow: "error"`). `overflow: "allow"` permits an explicit
    pixel radius beyond the effective bounds without changing their size or center. Boundary centers still reject.
  - The policy does not expand or clip the plot or Canvas. Authors reserve outer Canvas margins for visible overflow;
    export remains bounded by the Canvas. Fraction radii still lie in `(0, 1]`. Omission restores the default error policy.
- Effect: stores normalized requested aspect on the semantic coordinate, resolves one largest-fit effective rectangle inside
  the allocated plot, then rematerializes coordinate scales, marks, dependent labels, guides, layout resources, and highlights.
  Allocated Canvas bounds remain unchanged.
- Data mode uses the absolute spans of the final nice-resolved domains. Reversed domains retain their direction. Explicit
  ranges must already equal the requested effective range and direction; they are never silently replaced.
- The whole edit is immutable and atomic. Incomplete/nonlinear/ambiguous positional consumers, zero spans, incompatible
  explicit ranges, and invalid options reject before any resulting program or trace is exposed.
- This action is available from the complete `ggaction` entry and absent from `ggaction/basic`.

### Formal values — `editCoordinate`

- Implemented: `editCoordinate(options: TargetedOptions<EditCoordinateOptions>)`, with at
  least one patch required by the public type union.
- Proposed (NOT IMPLEMENTED): coordinate type, attached-layer, viewport, clipping, and transpose edits.

### Value coverage — `editCoordinate`

- Target and registration
  - ✅ Covered: exact existing ID, unknown ID, required target, Full-only runtime and declaration boundary.
- Frame aspect
  - ✅ Covered: centered largest fit, independent horizontal/vertical alignment, Polar and Parallel frame consumers, `"auto"`
    reset, Canvas resize replay.
- Data aspect
  - ✅ Covered: exact unit-ratio oracles, absolute reversed spans, domain edit replay, shared mark/axis/grid effective bounds,
    zero span, nonlinear scale, explicit-range conflict, and multiple x/y pair rejection.
- Polar frame
  - ✅ Covered: centered defaults, moved fractional center/radius, fixed-pixel radius, exact point/line/arc and Polar-guide
    geometry, object replacement, aspect-before-frame ordering, Canvas resize, overflow atomicity, and `"auto"` reset.
- Immutability and lifecycle
  - ✅ Covered: caller-owned nested option preservation, prior program preservation, discarded-branch preflight, source/Canvas
    rematerialization, and trace ownership.
- Evidence: `test/contracts/coordinate-aspect.test.js`, `test/contracts/coordinate-aspect-types.test.js`,
  `test/contracts/shared-scale-refresh.test.js`, and the installed package consumer.

## `createScale`

- Signature: `createScale({ id, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, whitePoint?, gamma?, midpoint?, radialMapping?, unknown? })`.
- `id`: 필수 user-defined scale ID.
- `type`: `"linear" | "log" | "pow" | "sqrt" | "symlog" | "time" | "band" | "point" | "ordinal" | "sequential" | "quantize" | "quantile" | "threshold"`, 기본 linear.
- `domain`: `"auto"` 또는 type-valid array. Direct continuous/time scale은 두 finite numeric values를
  사용하며 time 값은 UTC timestamp다. Quantitative transformed position의 auto domain이 하나의 finite
  관측값으로 축약되면 type-valid finite pair로 padding하고 양쪽 endpoint가 표현 가능할 때 그 관측값을
  transformed range 중앙에 둔다. Numeric limit에서는 관측값을 포함하는 가장 가까운 finite pair를 쓴다.
  Explicit transformed pair는 계속 distinct해야 한다. Ordinal은 non-empty unique values를 사용한다.
  Threshold는 strictly increasing explicit boundaries가 필수다.
- `range`: `"auto"` 또는 consumer-compatible array. continuous position은 finite pair, ordinal은
  channel에 따라 colors, shapes 또는 dash patterns가 될 수 있다. Temporal centered bar도 explicit numeric position range를 그대로 유지하며 legacy center inset은 auto range에만 적용한다. Bandwidth는 실제 explicit mapping의 최소 gap이고 finite endpoint 차이가 overflow하면 기존 finite conservative slot estimate를 쓴다. Canvas replay는 explicit range를 재추론하지 않으며 reverse는 마지막에 적용한다. Continuous color는 최소 두 colors,
  discretized color는 최소 두 colors를 사용하며 threshold는 domain보다 정확히 하나 더 필요하다.
- `nice`: boolean, continuous position scale의 auto domain에 적용된다.
- `zero`: boolean, `linear | pow | sqrt | symlog` auto domain에 적용되며 log에서는 오류다.
- `base`, `exponent`, `constant`: 각각 log, pow, symlog 전용 positive finite parameter다. Defaults는 `10`, `1`, `1`이고 sqrt는 fixed exponent `0.5`다.
- `clamp`: compatible continuous mapping을 resolved output extent로 제한한다. `reverse`는 final range direction을 뒤집는다.
- `band`는 `paddingInner` 기본 `0`, `paddingOuter` 기본 `0`, `align` 기본 `0.5`; `point`는
  `padding` 기본 `0.5`, `align` 기본 `0.5`를 저장한다. Bandwidth는 band만 positive다.
- `palette`는 sequential/log/pow/sqrt/symlog/discretized color range descriptor이며 explicit `range`와 mutually exclusive다.
  Unattached log/pow/sqrt/symlog는 color range, palette 또는 interpolate로 color intent를 판별한다.
  Color 범위와 numeric position 범위는 공유할 수 없다. Transform parameter는 position과 동일한 owner를 쓴다.
  Sequential descriptor의 `count`는 2 이상의 gradient-stop count이며 top-level `palette`와
  `range.palette`가 같은 validation과 resolution을 사용한다. `interpolate`는 continuous color 전용이고
  기본은 `"rgb"`다. Public palette `count`, sequential explicit range와 discretized explicit color
  range cardinality는 최대 `10,000`이다.
- `midpoint`: sequential quantitative color의 finite 기준값 또는 `"auto"`. Numeric 값은 최종 domain의 두 끝 사이에 엄격히 있어야 한다. Auto domain은 consumer resolution 때 검증한다. 생성 생략은 endpoint-linear mapping, 편집 생략은 보존이며 `"auto"`는 semantic leaf를 제거한다. Temporal/position/ordinal/discretized numeric midpoint는 오류다. 양쪽 domain 구간을 color parameter [0,.5]/[.5,1]로 나누고 reverse/clamp/interpolation을 기존 mapper에서 적용한다. Palette 중앙색이 항상 neutral/white라고 추론하지 않는다.
- `whitePoint`는 lab/hcl/hcl-long에서만 `"d65" | "d50"`를 받는다. 생략은 기존 D65, D50은 adapted sRGB/XYZ 행렬로 opt-in한다. Focused/generic edit의 `"auto"`는 explicit leaf를 제거한다. Interpolate를 다른 값으로 명시 편집하면 생략한 whitePoint/gamma는 기본값으로 돌아간다. 유지하려면 같은 편집에 다시 지정하며, 새 보간법과 비호환인 explicit 조합은 오류다. Mark/stroke/gradient/sample 범례는 같은 mapper를 공유한다. Evidence: `test/unit/grammar/scales/continuous-color-options.test.js`, `test/unit/actions/scales/color-interpolation-options.test.js`, `test/unit/actions/scales/color-primitive-parity.test.js`.
- HCL/HCL-long은 파싱된 R/G/B가 정확히 같은 endpoint를 chroma0/undefined hue로 취급한다. 한쪽만 neutral이면 구간 hue를 반대 유채색 hue로 고정하고, 양쪽 neutral이면 hue0/chroma0으로 lightness만 보간한다. 별도 epsilon이나 byte 양자화를 추가하지 않고 기존 D50/D65 행렬·endpoint 정규화·최종 byte 반올림을 유지한다. 유채색끼리의 short/long 경로는 기존과 같다. Evidence: `test/unit/grammar/scales/neutral-hcl.test.js`, `test/unit/actions/scales/neutral-hcl-consumers.test.js`.
- Continuous color의 `type:"pow"`와 positive finite `exponent`(기본1)는 기존 signed raw-value transform을 사용한다. `[f(v)-f(d0)]/[f(d1)-f(d0)]`를 색 위치로 사용하고 numeric midpoint는 거부한다. 원래 값의 범례 label/tick과 변환 위치를 유지한다. Exponent1로 reset하며 다른 type의 explicit exponent는 오류다. 기존 log/sqrt/symlog와 일반 position 척도는 같은 수치 owner를 유지한다.
- `gamma`는 cubehelix/cubehelix-long에만 finite number(0·음수 포함), 기본1, edit의 `"auto"` reset이다. Hue/saturation은 구간 t를 보존하고 lightness만 t**gamma로 보간한다. 0은 0**0도1이며 구간 오른쪽 lightness를 쓴다. 음수 gamma의 t=0에서만 같은 endpoint lightness와 saturation0의 무채색을 보존하고, 나머지 확장 RGB채널의 NaN/-Infinity는0,+Infinity는1로 제한한 뒤 기존8bit반올림을 한다. 이 경계를 일반 invalid raw fallback으로 사용하지 않는다. t!=0의 nonfinite power/음수gamma RGB산술은 원자적 오류다. Clamp 뒤 적용하고 여러stop의 정확한 내부경계는 오른쪽구간t0을 쓴다. 기존 양수·생략·1의 결과, 8bit endpoint와 final byte rounding은 유지한다. 비호환 inherited 값 제거와 explicit 조합 거부는 whitePoint와 같다. Evidence: `test/unit/grammar/scales/nonpositive-color-gamma.test.js`, `test/unit/actions/scales/nonpositive-color-controls.test.js`, `test/charts/color-controls/public.test.js`.
- `unknown`은 direct unattached scale에서는 channel을 알 수 없으므로 그대로 저장한다. Consumer가 attach될 때
  concrete channel fallback validation과 supported item-grain policy를 적용한다.
- Standalone `createScale`/`editScale`은 위의 전체 vocabulary를 유지하지만 action 안의 nested scale은
  consumer role별 public type만 노출한다. Quantitative position은 continuous transformed options, temporal
  position은 `time`, categorical position은 `band | point`를 사용하며 zero-baseline bar/histogram/density
  output에서는 `log`를 제외한다. Categorical color는 `ordinal`, size/opacity는 `linear`, shape/dash는
  `ordinal`이고 stroke width는 quantitative transformed scale이다. Palette/interpolation 같은 color-only
  option이나 padding 같은 discrete-position option을 다른 role에 전달하면 저장 후 무시하지 않고 즉시
  거부한다. Point row consumers와 explicit-domain categorical Cartesian Line color만 channel-valid `unknown` fallback을 author할 수 있다.
- Effect: semantic definition만 저장한다. equivalent repeated call은 idempotent, conflicting definition은 오류다.
- Coverage: `test/unit/actions/scales/scale-actions.test.js`와 grammar scale tests가 types,
  auto/explicit values, idempotence와 conflicts를 검증한다. Consumer-specific ordinal range와 `unknown`
  compatibility는 attachment 시점에 검증한다.

- `radialMapping?: "area"|"radius-length"`는 measured Arc radius의 canonical scale policy다. Linear, zero 기반, nice/reverse/unknown 없는 정의만 허용하고 domain/range의 auto는 consumer attachment 때 해석한다. Explicit domain은 [0,U], U>0, range는 0<=r0<R다. Generic radius나 다른 channel에 연결하면 오류다.

### Formal values — `createScale`

```typescript
type ScaleType =
  | "linear" | "log" | "pow" | "sqrt" | "symlog"
  | "time" | "band" | "point" | "ordinal"
  | "sequential" | "quantize" | "quantile" | "threshold";
```

- Implemented: `createScale({ id: UserId; type?: ScaleType; domain?: ContinuousDomain | OrdinalDomain; range?: "auto" | readonly unknown[]; nice?: boolean; zero?: boolean; clamp?: boolean; reverse?: boolean; base?: PositiveFiniteExceptOne; exponent?: PositiveFinite; constant?: PositiveFinite; paddingInner?: UnitIntervalLessThan1; paddingOuter?: NonNegativeFinite; padding?: NonNegativeFinite; align?: UnitInterval; palette?: Palette; interpolate?: ContinuousColorInterpolation; whitePoint?: "d65" | "d50"; gamma?: Finite; midpoint?: number | "auto"; radialMapping?: "area" | "radius-length"; unknown?: unknown })`; type별 validation이 값을 제한한다. `time`은 유일한 UTC temporal token이다.
- Maybe Future (NOT IMPLEMENTED): `{ type?: "identity" | "bin-ordinal" }`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createScale`

- `id`: ✅ Covered valid/invalid IDs, equivalent idempotence and conflicting duplicate.
- `type`
  - ✅ Covered: omission→`"linear"`, complete 13-value `ScaleType`, unknown value와 type-specific definition.
  - ⚪ Maybe Future: `"identity" | "bin-ordinal"`.
- `domain`
  - ✅ Covered: `"auto"`, continuous pair, ordinal unique array, reversed pair and invalid arrays.
  - ✅ Covered: log/pow/sqrt/symlog auto constant의 양수·0·음수 type-valid padding, transformed midpoint,
    numeric limits와 explicit constant rejection. Log zero는 strictly signed domain contract에 따라 거부한다.
  - ✅ Covered: direct `time` scale domain accepts finite UTC timestamp pairs. Date/string normalization belongs to
    temporal field resolution and is tested there rather than expanded into raw scale input.
- `range`
  - ✅ Covered: `"auto"`, numeric pair, colors, palette descriptor and dash patterns through consumers.
  - ✅ Covered: raw ordinal range ownership is validated structurally; consumer-specific dash/color/shape
    compatibility is deliberately deferred and executable at attachment.
- `nice`
  - ✅ Covered: omitted, true, false, non-boolean and ordinal rejection.
- `zero`
  - ✅ Covered: omitted, true, false, non-boolean and time/ordinal rejection.
- Precedence
  - ✅ Covered: explicit domain overrides nice/zero; zero applies before nice on auto linear domain.
- ✅ Covered: transformed parameter defaults/validation, color interpolation/palette, mapping-policy persistence and
  deferred channel validation for unattached `unknown`.
- Evidence: `test/unit/actions/scales/scale-actions.test.js`,
  `test/unit/actions/scales/scale-vocabulary-and-policies.test.js` and grammar scale tests.

## `editScale`

- Implemented: immutable edits for every current `ScaleType`.
- Availability: 공개 editScale은 Full 전용이다. Basic에 이미 제공되는 encoding의 같은 타입 bound-scale
  재할당은 같은 wrapped owner를 내부에서 사용한다. Basic 공개 method/type/action-card 경계와
  기존 타입 전환 제한은 유지하며 모든 shared consumer를 검증한다. 내부 builtin trace op 인식은
  공개 method 등록과 별개다. Evidence: `test/unit/actions/encodings/basic-scale-reassignment.test.js`.
- Signature: `editScale({ id?, type?, domain?, range?, nice?, zero?, clamp?, reverse?, base?, exponent?, constant?, paddingInner?, paddingOuter?, padding?, align?, palette?, interpolate?, whitePoint?, gamma?, midpoint?, radialMapping?, unknown? })`.
- `id`는 existing scale을 선택한다. 생략하면 current scale, 그렇지 않으면 유일한 scale을 사용하며
  안전하게 하나를 정할 수 없으면 explicit ID를 요구한다.
- `midpoint`는 create contract의 동일한 검증·mapping·reset을 따르며 연결된 모든 mark와 gradient legend를 갱신한다. Type이 바뀌면 이전 midpoint를 제거하고 돌아올 때 복구하지 않는다. Evidence: `test/unit/actions/scales/midpoint.test.js`, `test/unit/grammar/scales/midpoint.test.js`, `test/charts/color-midpoint/`.
- 최소 한 editable property가 필요하다. `unknown: undefined`는 existing fallback을 제거한다.
- `domain`/`range`의 `"auto"`는 reset이고 omission은 기존 값을 보존한다. Explicit domain은
  `nice`/`zero`보다 우선하며 `reverse`는 auto 또는 explicit 최종 range에 적용된다.
- Consumer가 없는 ordinal의 `range` 편집은 생성과 같은 ordinal validator를 사용한다. Numeric pair, color array, dash patterns 및 `range: {palette}`를 원자적으로 검증하며, consumer가 붙으면 해당 channel의 더 엄격한 range 검증을 유지한다.
- `palette`는 color scale의 top-level shorthand이며 canonical `range: { palette }`로 저장한다.
  같은 call의 `range`와는 mutually exclusive다.
- `type`은 unattached scale 또는 compatible consumers에서 atomic하게 전환한다. Quantitative position은
  `linear | log | pow | sqrt | symlog`, continuous quantitative color는 `sequential`, quantitative Point/aggregate Bar/Rect color는
  `quantize | quantile | threshold`를 사용한다. Complete definition과 every consumer를 먼저 검증하고 stale
  type-only properties를 제거한다.
- Sequential↔quantize/quantile/threshold와 nested encodeColor type reassignment는 같은 전환 owner를 사용한다. Creation/edit/materialization은 공통 quantitative color consumer validator를 사용하여 Point/aggregate Bar/Rect의 fieldType·aggregate·unknown·grain을 검증한다. 모든 shared consumer와 guide를 포함한 immutable candidate를 먼저 실행 검증하고 반환할 branch에 적용한다.
- Active gradient↔interval legend는 네 edge의 compatible 교집합에서 같은 transaction으로 교체한다. Left/right는 vertical·center align·top title, top/bottom는 기본 horizontal interval flow와 left/center/right align·top title이다. Target/channel, title·visibility·inferred mode, labels, titleStyle, border, position, align, offset을 보존한다. Opt-in titlePadding은 보존하며 active rowPadding은 gradient 전환 전에 명시적으로 auto reset해야 한다. Count/gradient size 또는 interval symbol/itemGap이 해당 family default와 다르면 오류다. 새 family 고유 값은 새 default를 쓰며 source 스타일을 조용히 버리지 않는다. Interval의 horizontal columns, vertical flow 또는 inline title처럼 gradient에 보존할 수 없는 layout도 오류다. Side columns1은 기본 한 열과 동등해 허용한다. 비호환 설정은 removeLegend→editScale→createLegend의 명시 경로를 사용한다.
- Explicit domain의 의미가 extent, quantile sample, threshold 사이에 바뀌면 새 domain을 명시해야 한다. Sequential↔quantize의 compatible extent는 보존 가능하며 auto inference는 각 타입 계약을 따른다. Midpoint/interpolate 등 비호환 속성은 제거하고 돌아올 때 숨은 복구를 하지 않는다. 범례 overflow나 consumer 하나의 실패도 전체 상태·trace를 유지한다.
- Structural type transition은 Full 범위다. Basic은 기존 typed quantitative color와 interval legend 생성을 지원하며, 다른 타입은 새 scale ID로 작성한다.
- Evidence: `test/unit/actions/scales/color-transitions.test.js`, `test/charts/color-transitions/`.
- Discrete position은 compatible consumers에서 `band ↔ point`를 검증한다. Bar consumer가 있으면
  zero-bandwidth `point` 전환을 거부한다.
- `nice`, `zero`, `clamp`, transformed parameters와 `reverse`는 create contract의 type별 policy를 따른다.
- `unknown`은 row-owned Point 및 explicit nonempty ordinal-domain의 categorical Cartesian Line color를 지원한다.
  Point의 기존 missing/invalid fallback은 유지한다. Line은 absent/null과 정상 out-of-domain scalar만 fallback으로 mapping하며
  malformed category는 거부하고 raw rows·vertices·series identity·domain members를 보존한다.
  이 missing-color 정책은 Aggregate/bin/parallel/polar Line과 다른 compound path, bar, area, rule,
  xOffset에 확장하지 않는다. 별도의 Cartesian Line/Rule strokeDash는 유효한 domain 밖 범주의
  named/direct dash fallback을 지원하며 missing/null/malformed 값은 계속 거부한다. 정확한
  범위·정규화·domain/legend 보존은 `ENCODINGS.md`의 encodeStrokeDash 계약을 따른다.
  모든 shared consumer를 검증하며 explicit domain 또는 fallback 제거가 현재 rows와 호환되지 않으면 원자적으로 거부한다.
  Evidence: `test/unit/actions/encodings/categorical-line-unknown.test.js`.
- Complete patch와 shared-consumer channel compatibility를 먼저 검증한 뒤 semantic scale을 수정하고,
  scale, mark, axes, grids와 legend consumer를 wrapped materialization plan으로 갱신한다.
- Source-attached text는 source의 current scale consumer에서 dependency를 따라 갱신한다. Text의 inherited scale ID가 이전 binding을 유지해도 라벨이 이전 위치에 남지 않는다. Evidence: `test/unit/actions/marks/text-source.test.js`.
- 실패하면 이전 program의 semantic, graphic, context와 trace는 변하지 않는다.

- `radialMapping` 변경은 기존 모든 measured Arc 및 radius axis/grid를 갱신한다. 생략하면 보존한다. Explicit undefined는 제거지만 aggregate radius consumer가 남아 있으면 오류다. 해당 encoding을 제거한 orphan scale에서만 ordinary radius로 명시적으로 전환한다. Type 변경으로 mapping을 암묵적으로 제거하지 않는다.

### Formal values — `editScale`

```typescript
type EditableCurrentScale = {
  id?: UserId;
  type?: ScaleType;
  domain?: "auto" | readonly unknown[];
  range?: "auto" | readonly unknown[];
  nice?: boolean;
  zero?: boolean;
  clamp?: boolean;
  reverse?: boolean;
  base?: PositiveFiniteExceptOne;
  exponent?: PositiveFinite;
  constant?: PositiveFinite;
  paddingInner?: UnitIntervalLessThan1;
  paddingOuter?: NonNegativeFinite;
  padding?: NonNegativeFinite;
  align?: UnitInterval;
  palette?: Palette;
  interpolate?: ContinuousColorInterpolation; whitePoint?: "d65" | "d50" | "auto"; gamma?: Finite | "auto"; midpoint?: number | "auto";
  unknown?: unknown;
};
```

- Implemented for unattached scales and compatible connected consumers. Consumer-specific compatibility can narrow
  the complete type vocabulary.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editScale`

- ✅ Covered: existing scale selection through explicit ID, current scale, sole scale, unknown and ambiguous failures.
- ✅ Covered: domain/range patch, `"auto"` reset, omission preservation and caller-owned array isolation.
- ✅ Covered: categorical color palette shorthand, range conflict, invalid palette and non-color rejection.
- ✅ Covered: `nice`, `zero`, `clamp`, `reverse`, type compatibility and invalid value rejection.
- ✅ Covered: concrete point/guide rematerialization, immutable failure and nested trace.
- ✅ Covered: transformed line/area/bar/rule materialization, direct versus later type-edit convergence, stale
  parameter/interpolation removal, sequential/discretized color transitions and invalid atomic transitions.
- ✅ Covered: missing/invalid point fallback, explicit ordinal domain fallback, channel validation, shared point
  consumers and Canvas rematerialization. Unsupported compound-grain fallback is an explicit error contract.
- Evidence: `test/unit/actions/scales/edit-scale.test.js`,
  `test/unit/actions/scales/scale-vocabulary-and-policies.test.js`,
  `test/unit/actions/scales/transformed-position-scale.test.js`,
  `test/unit/grammar/scales/mapping-policies.test.js` and transformed-scale chart integration tests.

## Focused channel scale editors

- Implemented family: `editXScale`, `editYScale`, `editXOffsetScale`,
  `editYOffsetScale`, `editParallelScale`, `editThetaScale`, `editRScale`,
  `editColorScale`, `editStrokeScale`, `editSizeScale`, `editOpacityScale`, `editShapeScale`,
  `editStrokeWidthScale`, and `editStrokeDashScale`.
- Each action accepts the scale properties valid for its named channel plus
  optional `id` and `target`. At least one scale property is required. `editRScale`
  owns semantic Polar radius; constant point glyph radius remains under
  `encodePointRadius`/`removePointRadius`.
- Selection resolves an explicit scale ID and/or mark target first. If both are
  present they must identify the same scale. Without selectors, the current
  mark's scale for that channel wins; otherwise exactly one channel-bound scale
  must exist in the program. Several marks sharing one scale count as one
  candidate. Multiple scale IDs are ambiguous and never use array order.
- An explicit scale must have at least one consumer in the named channel. Its ID
  does not establish its role, and an unattached scale remains editable only
  through generic `editScale`.
- Every focused action is a thin wrapped delegate to `editScale`. The child owns
  value and type validation, immutable preflight, shared-consumer
  rematerialization, and compatible axis, grid, and legend transitions.
- Runtime option vocabularies and TypeScript unions are channel-specific. Omitted
  values preserve stored properties, `domain`/`range: "auto"` restore inference,
  and supported explicit `undefined` follows the underlying `editScale` removal
  contract.
- Available in the Full entry. Basic retains its smaller scale surface.
- `editStrokeScale` is the deliberate selector exception: `target` is required and raw `id`
  selection is rejected. A color/stroke shared scale is compatible when every consumer accepts the
  resulting color family; the edit refreshes both channels without treating stroke as a color alias.
- Evidence: `test/unit/actions/scales/channel-scale-editors.test.js` and
  `test/contracts/channel-scale-editor-types.test.js`.

## `editXScale`

- Implemented: edits a scale bound exclusively to normalized x/x2 consumers through the focused selection contract above.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editXScale`

- Implemented: `editXScale(EditXScaleOptions)` with quantitative, temporal, band, and point position options plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editXScale`

- ✅ Covered: explicit target, current-mark inference, domain editing, ambiguity, selector disagreement, and wrapped `editScale` execution. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editYScale`

- Implemented: edits a scale bound exclusively to normalized y/y2 consumers through the focused selection contract above.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editYScale`

- Implemented: `editYScale(EditYScaleOptions)` with quantitative, temporal, band, and point position options plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editYScale`

- ✅ Covered: current-mark inference, reverse editing, channel validation, and wrapped rematerialization. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editXOffsetScale`

- Implemented: edits the ordinal subgroup scale bound to `target`'s `xOffset`
  encoding. `target` is mandatory and must resolve to an existing mark with an
  existing offset scale; scale ID, current-mark, and unique-program inference
  are intentionally absent.
- Accepted properties are `domain`, `reverse`, `padding`, `paddingInner`,
  `paddingOuter`, and `align`. At least one is required. `padding` is shorthand
  for equal inner and outer padding and cannot be combined with either explicit
  padding property. `paddingInner` and `padding` are finite in `[0, 1)`,
  `paddingOuter` is finite and non-negative, and `align` is finite in `[0, 1]`.
- The semantic scale is the single owner of requested padding and alignment.
  Older mark-owned `xOffset` padding is read only as a compatibility fallback;
  the first successful encoding or scale edit stores the complete policy on the
  semantic scale and removes every legacy copy for consumers of that scale.
  Conflicting legacy owners fail before any state or trace change.
- The concrete range always comes from the resolved parent x category slot.
  An absolute `range`, a scale `type`, and an `order` alias are rejected; an
  explicit domain array owns subgroup order and `domain: "auto"` restores
  observed order. Existing values omitted from an explicit domain are errors.
- For parent slot `S`, domain length `n`, inner padding `pi`, outer padding `po`,
  and alignment `a`, materialization uses
  `step=S/max(1,n-pi+2*po)`, `bandwidth=abs(step)*(1-pi)`, and
  `start=(S-step*(n-pi))*a`. Reverse mirrors the concrete range while retaining
  category identity. Parent Canvas/scale edits recompute the range and retain
  the requested policy.
- Shared consumers are validated and rematerialized together. Their parent slot
  sizes must agree; point-parent step and legacy binned-x slot policies remain
  supported. Offset domain changes do not mutate the parent or color domain.
- Available only in the Full entry.
- Evidence: `test/unit/actions/scales/offset-scale.test.js`,
  `test/unit/actions/encodings/x-offset-encoding.test.js`, and
  `test/contracts/focused-scale-editor-types.test.js`.

### Formal values — `editXOffsetScale`

- Implemented: `editXOffsetScale({ target: UserId; domain?; reverse?; padding?;
  paddingInner?; paddingOuter?; align? })`.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `editXOffsetScale`

- ✅ Covered: exact default and padded geometry, shorthand, alignment, explicit
  domain order, reverse, Canvas resize, shared consumers, point parents, legacy
  migration/conflict, unknown category, missing offset, invalid ranges, and
  immutable failure behavior.

## `editYOffsetScale`

- Implemented: the horizontal-orientation dual of `editXOffsetScale`, selected
  from `target`'s `yOffset` encoding with the same property, ownership,
  validation, sharing, migration, formula, and Full-only contracts.
- Its parent slot is the resolved y category bandwidth or point step. Reverse
  mirrors the nested y range and rematerializes all dependent marks.
- Evidence: `test/unit/actions/scales/offset-scale.test.js`,
  `test/unit/actions/encodings/y-offset-encoding.test.js`, and
  `test/contracts/focused-scale-editor-types.test.js`.

### Formal values — `editYOffsetScale`

- Implemented: `editYOffsetScale(EditYOffsetScaleOptions)` where
  `EditYOffsetScaleOptions` equals the explicit-target xOffset patch.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `editYOffsetScale`

- ✅ Covered: horizontal parent geometry, padding, reverse, semantic ownership,
  missing target/offset rejection, wrapped trace, and prior-state immutability.

## `editParallelScale`

- Implemented: edits one scale nested in a Parallel line's ordered dimensions. `target` and `dimension` are both required; the dimension selector is the exact stored field identity and never an index, title, or display label.
- Resolution requires an existing Parallel coordinate, a stored `encoding.parallel.dimensions` array, exactly one matching field, and an existing semantic scale. It delegates the resolved scale ID to wrapped `editScale`, so shared consumers, paths, attached source marks, Parallel axes, layout, and highlights observe the same atomic preflight and rematerialization rules.
- Quantitative dimensions accept the current continuous position options. Ordinal dimensions accept point-scale domain/range/reverse/padding/align/fallback options. At least one editable property is required; `id`, inferred target, and properties from the other branch are errors.
- Reordering dimensions does not change selection by field. An explicit shared scale is edited for every consumer, subject to `editScale`'s all-consumer compatibility checks.
- Available only in the Full entry.
- Proposed (NOT IMPLEMENTED): drag-to-reorder axes and scale separation.

### Formal values — `editParallelScale`

- Implemented: `editParallelScale({ target: UserId; dimension: FieldName } & WithoutScaleId<QuantitativePositionScaleOptions | CategoricalPositionScaleOptions>)`.
- Proposed (NOT IMPLEMENTED): —.

### Value coverage — `editParallelScale`

- `target`: ✅ Covered explicit Parallel layer, missing target, unknown/wrong-family target.
- `dimension`: ✅ Covered exact quantitative/ordinal field, post-reorder identity, unknown/empty field; title/index inference is absent by contract.
- scale patch: ✅ Covered domain, reverse, ordinal domain ordering, empty patch, branch-incompatible padding/type, path and axis refresh.
- lifecycle: ✅ Covered immutable prior program, wrapped trace, Canvas-compatible explicit range, and field-based resolution after dimension reorder.
- Evidence: `test/unit/actions/scales/parallel-scale.test.js`, `test/contracts/focused-scale-editor-types.test.js`.

## `editThetaScale`

- Implemented: edits the scale bound to semantic Polar angle without inferring from unrelated position scales.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editThetaScale`

- Implemented: `editThetaScale(EditThetaScaleOptions)` with linear, time, band, and point angular options plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editThetaScale`

- ✅ Covered: Polar current-mark selection, reverse editing, strict option typing, and graphical refresh. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editRScale`

- Implemented: edits semantic Polar radius, including measured `radialMapping`; it never edits point glyph radius.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editRScale`

- Implemented: `editRScale(EditRScaleOptions)` with quantitative radial options, `radialMapping?`, `id?`, and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRScale`

- ✅ Covered: Polar current-mark selection, domain editing, glyph-radius separation, strict option typing, and rematerialization. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editColorScale`

- Implemented: edits categorical, sequential, or discretized color through a verified color consumer.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editColorScale`

- Implemented: `editColorScale(EditColorScaleOptions)` with color type/domain/range, palette, interpolation, midpoint, fallback, `id?`, and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editColorScale`

- ✅ Covered: current, target, explicit ID, unique shared-scale inference, palette and legend refresh, ambiguity, orphan/wrong-channel rejection, and immutable failures. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editStrokeScale`

- Implemented: edits the categorical, sequential, or discretized color scale bound to one target mark's
  field-driven stroke. `target` is mandatory; `id`, current-mark inference, and program-wide unique-scale
  inference are intentionally absent.
- A scale explicitly shared by color and stroke is accepted when all consumers support the requested
  scale family. The edit rematerializes every connected mark and active stroke/color guide atomically.

### Formal values — `editStrokeScale`

- Implemented: `editStrokeScale({ target: UserId } & Omit<EditColorScaleOptions, "id" | "target">)`.
- Proposed (NOT IMPLEMENTED): selector by raw scale ID.

### Value coverage — `editStrokeScale`

- ✅ Covered: required target, categorical range changes, sequential↔discretized family changes,
  gradient↔interval legend transitions, compatible color/stroke sharing, wrong/missing target or scale,
  strict type rejection, and immutable incompatible edits. Evidence: `test/contracts/stroke-color.test.js`,
  `test/contracts/channel-scale-editor-types.test.js`.

## `editSizeScale`

- Implemented: edits the area scale bound to point size across `linear`, `log`, `sqrt`, `pow`,
  `quantize`, `quantile`, and `threshold` mappings.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editSizeScale`

- Implemented: `editSizeScale(EditSizeScaleOptions)` with the state-dependent closed size patch,
  `id?`, and `target?`. It supports domain/range/fallback/reverse, continuous clamp, log base, and
  pow exponent. Family changes require an explicit new domain; a discrete destination requires an
  explicit range; discrete-to-continuous requires an explicit range or `"auto"`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editSizeScale`

- ✅ Covered: inferred and explicit selection, strict type unions, transformed/discrete mapping,
  stale-option removal, reverse, family migration, point/legend rematerialization, source revision,
  and immutable failures. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`,
  `test/contracts/channel-scale-editor-types.test.js`, `test/contracts/size-scale-types.test.js`.

## `editOpacityScale`

- Implemented: edits the quantitative scale bound to field-driven opacity.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editOpacityScale`

- Implemented: `editOpacityScale(EditOpacityScaleOptions)` with linear domain/range policies and fallback plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editOpacityScale`

- ✅ Covered: inferred range editing, strict option typing, and point rematerialization. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editShapeScale`

- Implemented: edits the ordinal scale bound to point shape.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editShapeScale`

- Implemented: `editShapeScale(EditShapeScaleOptions)` with ordinal domain/range/fallback plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editShapeScale`

- ✅ Covered: inferred range editing, strict shape typing, and point rematerialization. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editStrokeWidthScale`

- Implemented: edits the quantitative scale bound to line or rule stroke width.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editStrokeWidthScale`

- Implemented: `editStrokeWidthScale(EditStrokeWidthScaleOptions)` with quantitative scale policies plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editStrokeWidthScale`

- ✅ Covered: line-series range editing, strict option typing, and shared materialization ownership. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## `editStrokeDashScale`

- Implemented: edits the ordinal scale bound to categorical line or rule dash patterns, including named/direct `unknown`.
- Omitted `unknown` retains the existing fallback; explicit `unknown: undefined` removes it, matching `editScale`.
  Removal or any other edit preflights every consumer and fails atomically if raw values would become invalid.
  Valid outside-domain categories only are supported by Cartesian Line/Rule, as defined in `ENCODINGS.md`.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editStrokeDashScale`

- Implemented: `editStrokeDashScale(EditStrokeDashScaleOptions)` with ordinal domain/range/unknown plus `id?` and `target?`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editStrokeDashScale`

- ✅ Covered: line-series dash-range/fallback editing, removal and shared-consumer atomicity, strict dash typing, and rematerialization. Additional evidence: `test/unit/actions/encodings/stroke-dash-unknown.test.js`, `test/contracts/ordinal-stroke-dash-types.test.js`. Evidence: `test/unit/actions/scales/channel-scale-editors.test.js`, `test/contracts/channel-scale-editor-types.test.js`.

## Persistence package boundary

Browser-safe `ggaction/persistence`의 네 함수는 action replay 없이 canonical state를 저장·복원한다. 현재 editable/graphic format과 Full/Basic/extension/render-only 경계는 [`../../../docs/data-updates.md`](../../../docs/data-updates.md#save-and-restore-snapshots)가 소유한다. `test/unit/persistence/`와 installed package consumer가 codec, immutable editing, 현재 action corpus의 state/SVG 동치 및 malformed input rejection을 검증한다.

## `createSortedData`

- Signature: `createSortedData({ id, source?, sortBy })`.
- `sortBy`: Implemented as a non-empty ordered list of unique `{ field, order?, nulls?, temporalUnit? }` keys. `order` defaults to `"ascending"`; `nulls` defaults to `"last"`; temporal keys explicitly use `"year"` or `"timestamp"` normalization.
- Effect: creates an immutable row-preserving derived dataset. Keys are compared in declaration order and complete ties preserve the input revision's row order. It does not mutate source arrays or add an index column.
- Errors: rejects unavailable fields, sparse or empty key lists, duplicate fields, mixed incompatible non-missing scalar types, structured values, invalid temporal values, and unknown options atomically.
- Lifecycle: the logical owner is revised by `editSortedData`, recomputed by source revision and dependent replay, and removed by `removeData`.

### Formal values — `createSortedData`

- Implemented: `createSortedData(options: SortedDataOptions): ChartProgram` (Full only).
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createSortedData`

- ✅ Covered: `id`, `source`, and `sortBy` inference, stable ties, multi-key order, null placement, temporal normalization, schema preservation, and invalid mixed values. Evidence: `test/unit/actions/data/sorted-data.test.js`.
- No proposal remains for this action.

## `editSortedData`

- Signature: `editSortedData({ target, sortBy, dependents? })`.
- Effect: atomically creates the next physical revision for a standalone sorted-data owner, rebinds consumers, optionally recomputes descendants, and releases the unreferenced prior revision.
- `sortBy` is a complete replacement using the same validation and stable-sort contract as `createSortedData`.

### Formal values — `editSortedData`

- Implemented: `editSortedData(options: EditSortedDataOptions): ChartProgram` (Full only).
- Planned (NOT IMPLEMENTED): —
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editSortedData`

- ✅ Covered: `target`, `sortBy`, and `dependents` use the shared derived-data lifecycle. Evidence: `test/unit/actions/data/sorted-data.test.js` and `test/unit/actions/data/derived-editing.test.js`.
- No proposal remains for this action.

## `createFontResource`

- Signature: `createFontResource({prepared,requestToken})`. Full unit/composition의 동일 receiver에서 `await prepareFontResource(program,request,host)`로 준비한 create handle을 적용한다. Request는 `{kind:"create",id,uri,expectedHash,mimeType,family,style,weight,metricsProviderVersion,maxBytes?,license?,attribution?}`이며 host는 `{requestToken,load,decode,signal?,measure?}`다. Helper는 renderer I/O를 만들지 않는다.
- MIME은 `font/ttf|font/otf|font/woff|font/woff2`, bytes는 기본/최대 16MiB, expectedHash는 lowercase SHA256이다. Family/provider는 nonempty string, style은 `normal|italic`, weight는 100–900의 100 단위다. Load의 `{bytes:Uint8Array,mimeType}`와 decoder의 exact `{contentHash,family,style,weight,metricsProviderVersion}`를 검증한다. Duplicate/잘못된 현재 state/closed own-data options는 host 이전에 거부한다.
- Authored font envelope revision 0, normalized source options와 result `{byteLength,payload:{encoding:"base64",data}}`를 저장한다. 별도 graphics/metrics는 생성하지 않는다. Handle은 kind/request identity만 노출하며 token·bytes·source URI·callbacks는 보존하지 않는다. Trace는 explicit action requestToken을 기록하지만 source URI·payload·callbacks를 복제하지 않는다. Copied handle, 다른 receiver/ABA/token/action 및 abort는 적용을 거부한다. Offline codec은 MIME/header/hash/shape를 검증하며 network/decoder를 호출하지 않는다.
- Renderer 준비는 `docs/api/rendering.md#embedded-fonts` 소유다. Basic은 concrete rendering만 지원하고 font authoring/metrics actions는 없다.

### Formal values — `createFontResource`

- Implemented: `createFontResource(options: ApplyFontResourceOptions<"create">): ChartProgram`.
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): implicit network loading.

### Value coverage — `createFontResource`

- ✅ Covered: exact receiver/token/abort, closed descriptors, byte/header/hash, decoder identity, Full/Basic, immutable owned result, composition and offline persistence.
- Evidence: `test/unit/resources/font-public-preparation.test.js`, `test/unit/resources/font-payload.test.js`, `test/unit/resources/font-preparation.test.js`, `test/contracts/font-types.test.js`.

## `replaceFontResource`

- Signature: `replaceFontResource({prepared,requestToken})`. 같은 helper의 request는 `{kind:"replace",target,...FontResourceSource}`이며 id를 함께 받지 않는다. 기존 target과 safe revision +1이 필요하다.
- Active schema 2 profile에 포함된 font라면 host `measure`가 필수이며 loader 이전에 검사한다. 새 bytes/provider에 대해 전체 query closure를 준비한 후 resource revision, profile identity/measurements 및 concrete typography를 원자적으로 바꾼다. 정확히 같은 parent resource를 물려받은 nested children만 함께 갱신한다. 동명 독립 child namespace는 자동 선택하지 않는다.
- 기존 callback/measurement state를 임의 재사용하지 않는다. 준비/배치/적용 실패는 원래 program과 trace를 보존하며 삭제는 공통 `removeResource`를 사용한다.

### Formal values — `replaceFontResource`

- Implemented: `replaceFontResource(options: ApplyFontResourceOptions<"replace">): ChartProgram`.
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): automatic asynchronous refresh.

### Value coverage — `replaceFontResource`

- ✅ Covered: new exact identity and revision, missing host callback before load, opaque handle/action guards, recursive inherited resources, failure atomicity, offline restoration and restrictive/cascade removal.
- Evidence: `test/unit/resources/font-public-preparation.test.js`, `test/unit/resources/font-layout-lifecycle.test.js`, `test/contracts/font-types.test.js`.

## `createImageResource`

- Signature: `createImageResource({ prepared, requestToken })`.
- Full-only synchronous action commits an authentic create handle from `await prepareImageResource(program, request, host)`. Request is `{kind:"create", id, uri, expectedHash, mimeType, maxBytes?, license?, attribution?}`; host is `{requestToken, load, decode, signal?}`. Exact original receiver, action kind and current token must match. Copied/forged handles, aborted signals and changed receivers fail before writes; intentional branching from the original immutable receiver remains valid.
- Load returns `{bytes:Uint8Array,mimeType}`; decode returns `{width,height,originClean:true}`. MIME is PNG/JPEG/WebP/static SVG, SHA256 lowercase hex, default and maximum bytes 16 MiB, decoded pixels at most 64 MiPixels. Invalid identities/current bindings fail before loader calls; MIME/hash/decode/CORS/abort errors are distinct. There is no implicit fetch.
- Stores an authored `image` resource revision 0 with canonical source metadata in options and original dimensions/byteLength/base64 in result. Input refs are empty. Trace includes the request descriptor, explicit action requestToken and bounded resource metadata; it excludes bytes, URL and callbacks. The opaque handle itself does not expose the preparation token. It creates no graphics. Prepare a unit chart explicitly before composing it; Basic supports concrete rendering only.
- Editable and graphic-only codecs retain self-contained bytes and verify hash/MIME/static SVG offline without decoding. Rendering preparation is documented in `docs/api/rendering.md`.

### Formal values — `createImageResource`

- Implemented: `createImageResource(options: ApplyImageResourceOptions<"create">): ChartProgram`.
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): automatic network loading.

### Value coverage — `createImageResource`

- ✅ Covered: opaque handles, exact receiver/token, own descriptors, host failures/abort, duplicate IDs, bounded trace, Full/Basic boundary, immutable state and offline restoration.
- Evidence: `test/unit/resources/image-resource-lifecycle.test.js`, `test/unit/resources/image-preparation.test.js`, `test/contracts/image-types.test.js`.

## `replaceImageResource`

- Signature: `replaceImageResource({ prepared, requestToken })`.
- Uses the same explicit preparation boundary as create with request `{kind:"replace", target, uri, expectedHash, mimeType, maxBytes?, license?, attribution?}`. Existing target is required; safe-integer revision overflow fails before loader calls. The source metadata may change; the resource ID is retained.
- Commits revision +1, atomically updates every exact image layer reference, and invokes wrapped image rematerialization for each live consumer. Item keys, alternative text, selection and highlight intent persist while fit recomputes from the new source dimensions. Other resources and earlier immutable branches retain their values. Generic `removeResource` owns restrictive/cascade deletion.

### Formal values — `replaceImageResource`

- Implemented: `replaceImageResource(options: ApplyImageResourceOptions<"replace">): ChartProgram`.
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): automatic refresh.

### Value coverage — `replaceImageResource`

- ✅ Covered: exact receiver/action/token, all live refs, changed aspect ratio, stable identity, retained highlight, immutable branches and offline restoration.
- Evidence: `test/unit/resources/image-resource-lifecycle.test.js`, `test/contracts/image-types.test.js`.

## `removeResource`

- Signature: `removeResource({ kind, id, cascade? })`.
- Full-only common stored-resource removal requires an explicit typed kind and ID. Same IDs in different resource namespaces are independent. Omitted cascade is restrictive: any live resource or layer reference rejects removal. Cascade must be boolean.
- Explicit cascade follows the stored ownership/dependency graph; unowned dependent resources remain protected. For an image, first remove every image mark consuming that exact resource through wrapped `removeMark`, then remove the resource. Mark config, owned clip wrappers and selection/highlight projections are removed with their mark. Authored persistent-selection resources remain available. Independent shared resources and unrelated marks are preserved. A speculative complete application validates all consumers before the returned action writes.
- Authored hierarchy/layout dependents and live hierarchy plots require explicit removal first; `removeMark` releases a plot without deleting its reusable hierarchy or layout. Generated dependents may be removed by the ownership plan.
- Font removal supports unit/composition roots. An active exact metric binding prevents restrictive deletion; explicit cascade first invokes wrapped `removeTextMetrics` across the affected composition, clearing concrete bindings and recomputing estimated layout, then removes the named font resource. Other resource kinds retain their unit-only scope.
- Missing IDs, stale references, unknown kinds, invalid cascade, protected dependents and cyclic graphs reject without mutating the receiver. No loader or decoder is called.

### Formal values — `removeResource`

- Implemented: `removeResource(options: RemoveStoredResourceOptions): ChartProgram`.
- Planned: 없음.
- Proposed (NOT IMPLEMENTED): forced dangling references.

### Value coverage — `removeResource`

- ✅ Covered: image restrict/cascade, hierarchy/layout dependency restrictions, complete mark/config/clip/selection cleanup, unrelated resource retention and immutable failure.
- Evidence: `test/unit/resources/image-resource-lifecycle.test.js`, `test/unit/resources/hierarchy-resources.test.js`, `test/unit/resources/hierarchy-consumers.test.js`, `test/unit/core/builtin-resource-kinds.test.js`.
