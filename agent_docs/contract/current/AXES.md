# Axis action contracts

Current direct-action contracts for this domain. Shared notation and lifecycle rules live in [`../README.md`](../README.md).

## Shared complete-axis contract

Cartesian line/ticks/labels/title의 실제 occupied bounds는 각 component position에서 chart title과 legend group의 bounds를 검사한다. 작성 순서, focused/whole-axis edit와 Canvas/scale replay에 공통인 최종 상태 검증이며 이전 program은 immutable하다. 정확한 cross-guide policy는 [공통 guide collision 계약](LEGEND_AND_TITLE.md#shared-guide-collision-contract)이 소유한다. 내부 axis component 간 검증은 기존 axis 계약을 따른다.

`createXAxis`와 `createYAxis`는 같은 option shape를 사용한다.

- `scale`: optional scale ID. 생략하면 channel ID를 사용하거나 parent `createAxes`가 유일한 scale을 전달한다.
- `coordinate`: optional existing coordinate ID. 선택 channel/scale을 소비하는 layer가 실제로 연결돼야 한다.
- `position`: x는 `"bottom" | "top"`, y는 `"left" | "right"`를 사용하며 defaults는 bottom/left다.
- `line`: `{ color?, lineWidth? }`; axis-line child에 전달한다.
- `ticksAndLabels`: `{ count?, values?, ticks?, labels? }`; shared tick/label child에 전달한다.
- `title`: `{ text?, at?, offset?, rotation?, color?, fontSize?, fontFamily?, fontWeight? }`.
- Effect: line → ticks/labels → title wrapped action 순서로 semantic guide와 concrete graphics를 만든다.
- Complete axis는 선택한 position을 line, ticks/labels와 title child 모두에 전달한다.

## Shared axis-line contract

- Create parameters: `scale?`, `position?`, `color?`, `lineWidth?`.
- Edit parameters: `position?`, `color?`, `lineWidth?`; scale은 semantic guide에서 읽는다.
- `scale`: create-only ID, 기본 channel ID.
- `position`: x=`"bottom" | "top"`, y=`"left" | "right"`; defaults는 bottom/left다.
- `color`: non-empty string, 기본 theme text color.
- `lineWidth`: non-negative finite number, 기본값 `1`; 0은 보이지 않는 line을 허용한다.
- Effect: endpoint는 resolved scale range와 Canvas plot bounds에서 항상 재추론한다. Temporal aggregate-bar
  time scale은 bar-center mapping을 위해 inset된 range를 유지하지만, axis line만 grid와 같은 complete plot
  span을 사용해 baseline end cap을 노출하지 않는다. Reverse direction은 endpoint order에 반영한다. semantic
  guide에는 scale만 저장하고 style과 endpoints는 graphical state다.

## Shared axis-tick contract

- Create parameters: `scale?`, `position?`, `count?`, `values?`, `length?`, `color?`, `lineWidth?`.
- Edit parameters는 `scale`을 제외하고 동일하다.
- `count`: positive integer, 기본값 `5`, 최대 `10,000`; `values`와 mutually exclusive다.
- `values`: scale domain 안의 finite number/timestamp 또는 ordinal scalar array. histogram x는 둘 다
  생략하면 bin boundaries, ordinal x는 domain 전체를 사용한다. 생성 전 resolved cardinality는 최대
  `10,000`이다.
- Shared histogram scale의 자동 boundaries는 모든 binned consumer가 같은 boundary array를 계산할 때만
  유일한 결과로 재사용한다. 서로 다른 boundaries면 explicit values 또는 독립 scale이 필요하다.
- `length`: non-negative finite number, 기본 `6`.
- `color`: non-empty string, 기본 `"#64748b"`.
- `lineWidth`: non-negative finite number, 기본 `1`.
- Effect: tick values/config는 private guide config, scale reference는 semantic guide, concrete endpoints는
  line collection에 저장한다. Canvas/scale 변화는 values 정책을 유지한 채 positions를 다시 계산한다.

## Shared axis-label contract

- Create parameters: `scale?`, `position?`, `count?`, `values?`, `offset?`, `format?`, `color?`,
  `fontSize?`, `fontFamily?`, `fontWeight?`; edit에서는 scale을 제외한다.
- `count`/`values`: tick contract와 같으며 existing ticks가 있으면 생략 시 그 정책을 재사용한다.
- `offset`: non-negative finite number; x default `18`, y default `12`.
- `format`: `"auto" | { decimals: nonNegativeInteger } | AxisFormatString`. Numeric tokens는
  quantitative에서만 허용한다. Time format은 `%Y | %m | %d | %b` UTC directive 하나 이상과 literal의
  sequence이며 literal percent는 `%%`다. Unknown/dangling directive는 거부하고 ordinal은 auto만 허용한다.
- `color`: non-empty string; `fontSize`: positive finite; `fontFamily`: non-empty string;
  `fontWeight`: string 또는 finite number.
- Effect: formatted text, aligned data-space coordinates와 font style을 text collection에 저장한다.
  Time `auto`는 domain-span precision에서 시작해 distinct resolved ticks가 같은 label이면 최소 한 단계씩
  precision을 높인다. Empty-string nominal values는 semantic domain에는 그대로 남고 visible label은
  deterministic `(empty)`로 표시한다. Explicit format은 그대로 유지한다. ticks와 count/values 정책이
  충돌하면 거부한다. 매우 긴 valid temporal domain은 legacy fixed interval이 requested count를 크게
  초과할 때만 nice multi-year step으로 전환한다.

## Shared ticks-and-labels contract

- Create: `scale?`, `position?`, `count?`, `values?`, `ticks?`, `labels?`.
- Edit: create option에서 scale을 제외하며 빈 edit는 오류다.
- `ticks`: `{ length?, color?, lineWidth? }`.
- `labels`: `{ offset?, format?, color?, fontSize?, fontFamily?, fontWeight? }`.
- Effect: shared count/values를 tick과 label child에 원자적으로 전달한다. nested appearance는 해당 child만 바꾼다.

## Shared axis-title contract

- Create: `text?`, `scale?`, `position?`, `at?`, `offset?`, `rotation?`, `color?`, `fontSize?`,
  `fontFamily?`, `fontWeight?`; edit에서는 scale을 제외한다.
- `text`: non-empty string. 생략하면 unique connected field/aggregate 또는 density provenance에서 추론한다.
- `at`: `"start" | "center" | "end"` 또는 continuous scale domain 안의 finite number; 기본 center.
- `offset`: non-negative finite; x default `42`, y default `52`.
- `rotation`: finite radians; x bottom/top default `0`, y left default `-Math.PI / 2`, y right default
  `Math.PI / 2`. Explicit rotation은 position default보다 우선한다.
- font/color contract는 labels와 같고 default font size는 `13`, weight는 `600`이다.
- Effect: semantic axis title text와 graphical layout/style을 분리 저장한다.

## Shared grid-direction contract

- `scale`: optional continuous scale ID; horizontal은 y, vertical은 x에서 유일하게 추론한다.
- `coordinate`: optional Cartesian coordinate ID; encoded layers에서 추론한다.
- `count`: positive integer, 최대 `10,000`, `values`와 mutually exclusive다.
- `values`: 최대 `10,000`개의 non-empty finite number array이며 scale domain 안에 있어야 한다.
- `color`: non-empty string, 기본 `"#e2e8f0"`.
- `lineWidth`: non-negative finite number, 기본 `1`.
- `strokeDash`: even-length non-negative finite number array, 기본 `[]`.
- Effect: semantic guide에는 scale/coordinate, graphical config에는 tick policy/style, concrete line
  collection에는 endpoints를 저장한다. 관련 mark보다 앞에 graphic을 배치한다.

## Optional component lifecycle

Cartesian/Polar complete 생성은 `line`, `ticksAndLabels`, `title`의 false를 해당 component 생략으로 처리한다. 생략/{}는 기본 생성이며 셋 모두 false는 no-enabled-component 오류다. Group 내부 ticks/labels는 스타일 객체만 받는다. 원하는 한 component만 추가할 때는 focused create를 사용한다.

네 family의 complete edit는 line/ticks/labels/ticksAndLabels/title false로 existing component를 제거한다. Missing component 제거·편집은 오류이고 group false는 ticks와 labels 둘 다 요구한다. Group과 개별 ticks/labels를 동시에 지시할 수 없다. 마지막 component 제거는 전체 axis remove owner로 semantic/config/layout을 정리하고 grid·mark·scale은 유지한다. 삭제한 component는 replay에서 다시 생기지 않으며 복원은 focused create가 소유한다.

Radial angle edit는 existing component가 최소 하나 있어야 한다. Angle과 false를 함께 지정하면 유지되는 component만 새 각도로 갱신한다. Theta complete/focused create에는 angle이 없으며 과거 무시되던 complete angle도 이제 오류다. Facade 재사용은 disabled component를 만들지 않고 기존 component를 false로 선언하면 conflict로 거부한다.

Evidence: `test/unit/actions/guides/axis-optional-components.test.js`, `test/unit/actions/charts/facade-guide-reuse.test.js`, `test/contracts/polar-component-types.test.js`. 4 families × 7 nonempty creation combinations, component removal/restore/replay, empty/all-false/conflicting/late-invalid atomic errors.

## Shared Parallel field-axis contract

Full-only Parallel axes는 encoded field별로 line/ticks/labels/title을 소유한다. `field`는 실제 encoded name이며 필수다. `target`은 existing guide owner, 없으면 unique encoded Parallel line에서 추론한다. 다른 owner를 덮어쓰지 않는다. 전체 생성은 missing owner, field 생성은 선택한 missing components, 편집/제거는 existing components를 요구한다.

- `line`: `{color?,lineWidth?}`; defaults theme axis/1.25.
- `ticks`: `{count?,values?,length?,color?,lineWidth?}`; auto count5, length8, theme mutedText/1.
- `labels`: `{count?,values?,offset?,format?,color?,fontSize?,fontFamily?,fontWeight?}`; offset9 (left), auto format, theme axis/font family, font11/normal.
- `title`: `{text?,offset?,color?,fontSize?,fontFamily?,fontWeight?}`; dimension title inference, offset20 (above), theme axisTitle/font family, font13/600. No x/y position, angle, rotation or automatic fitting.
- `ticksAndLabels`: shared `{count?,values?,ticks?:tickStyle,labels?:labelStyle}`. Count/values and group/individual forms are mutually exclusive. Nested group components accept style objects only. Count is positive integer ≤10,000 and quantitative-only; values are distinct domain members, ≤10,000. Quantitative values must be finite; ordinal uses exact domain members. Empty values hide items while retaining the component recipe. Total items per concrete collection ≤10,000.
- Color/fontFamily/text are nonempty strings; fontSize positive finite; fontWeight string or finite number; widths/length/offset nonnegative finite. Explicit label format uses the shared axis formatter; auto preserves the existing `k` labels. Ordinal supports auto only.
- Create omission/{} creates defaults; false skips a component. Independent tick/label restoration uses the other components' false values. All-disabled create rejects. Edit omission preserves; object patches; false removes. Empty edits reject; group edit/removal requires both components.
- Semantic `guide.axis.parallel` owns target/coordinate/scales and optional `titles: [{field,text}]` explicit text overrides. Runtime guide config owns mode and ordered field/component recipes, without duplicating title text. Renderer consumes four ordinary concrete collections only.
- Canvas/scale/data/reencoding replay preserves field-owned recipes and overrides. Reordered dimensions move their axis; removed fields lose their recipes and title override. Aggregate creation's `all` mode creates axes for new fields; individual creation's `selected` mode keeps new fields hidden. Explicitly removed fields stay hidden while encoded. Last visible component removal cleans the whole owner; mark/scale remain.
- Reencoding resolves all target scales before marks and refreshes the guide once. Line materialization reuses that plan's scale stage only when it covers every scale the line consumes; direct line editing still resolves its own scales.
- Errors include missing/ambiguous/incompatible owner, unknown field, duplicate creation, missing edit/removal, conflicting modes, unsupported/invalid values and styles. Whole proposals fail immutably without changing the input program or caller options.

## `createParallelAxes`

- Signature: `createParallelAxes(options?: ParallelAxesOptions): ChartProgram`.
- Behavior, defaults, inference, errors and effects follow the shared Parallel field-axis contract above.

### Formal values — `createParallelAxes`

- Implemented: Creates default axes for all encoded fields; optional target/coordinate must match the resolved owner.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createParallelAxes`

- ✅ Covered: Full/Basic boundary, field/owner selection, component lifecycle, defaults/style/format, count/values and error atomicity, immutable replay, primitive/public geometry and renderer parity, installed consumer.
- Evidence: `test/unit/actions/guides/parallel-axis-lifecycle.test.js`, `test/unit/actions/guides/parallel-axis-reencoding.test.js`, `test/contracts/parallel-axis-types.test.js`, `test/charts/cars-parallel-coordinates/public.test.js`, `test/charts/cars-parallel-coordinates/png.render.js`.

## `createParallelAxis`

- Signature: `createParallelAxis(options: CreateParallelAxisOptions): ChartProgram`.
- Behavior, defaults, inference, errors and effects follow the shared Parallel field-axis contract above.

### Formal values — `createParallelAxis`

- Implemented: Creates missing components of the required encoded field; defaults to all four, false skips selected components.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createParallelAxis`

- ✅ Covered: Full/Basic boundary, field/owner selection, component lifecycle, defaults/style/format, count/values and error atomicity, immutable replay, primitive/public geometry and renderer parity, installed consumer.
- Evidence: `test/unit/actions/guides/parallel-axis-lifecycle.test.js`, `test/unit/actions/guides/parallel-axis-reencoding.test.js`, `test/contracts/parallel-axis-types.test.js`, `test/charts/cars-parallel-coordinates/public.test.js`, `test/charts/cars-parallel-coordinates/png.render.js`.

## `editParallelAxis`

- Signature: `editParallelAxis(options: EditParallelAxisOptions): ChartProgram`.
- Behavior, defaults, inference, errors and effects follow the shared Parallel field-axis contract above.

### Formal values — `editParallelAxis`

- Implemented: Patches or removes selected existing field components; preserves unselected recipes.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editParallelAxis`

- ✅ Covered: Full/Basic boundary, field/owner selection, component lifecycle, defaults/style/format, count/values and error atomicity, immutable replay, primitive/public geometry and renderer parity, installed consumer.
- Evidence: `test/unit/actions/guides/parallel-axis-lifecycle.test.js`, `test/unit/actions/guides/parallel-axis-reencoding.test.js`, `test/contracts/parallel-axis-types.test.js`, `test/charts/cars-parallel-coordinates/public.test.js`, `test/charts/cars-parallel-coordinates/png.render.js`.

## `removeParallelAxis`

- Signature: `removeParallelAxis(options: RemoveParallelAxisOptions): ChartProgram`.
- Behavior, defaults, inference, errors and effects follow the shared Parallel field-axis contract above.

### Formal values — `removeParallelAxis`

- Implemented: Removes all existing components and explicit title of the required field.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeParallelAxis`

- ✅ Covered: Full/Basic boundary, field/owner selection, component lifecycle, defaults/style/format, count/values and error atomicity, immutable replay, primitive/public geometry and renderer parity, installed consumer.
- Evidence: `test/unit/actions/guides/parallel-axis-lifecycle.test.js`, `test/unit/actions/guides/parallel-axis-reencoding.test.js`, `test/contracts/parallel-axis-types.test.js`, `test/charts/cars-parallel-coordinates/public.test.js`, `test/charts/cars-parallel-coordinates/png.render.js`.

## `removeParallelAxes`

- Signature: `removeParallelAxes(options?: ParallelAxesOptions): ChartProgram`.
- Behavior, defaults, inference, errors and effects follow the shared Parallel field-axis contract above.

### Formal values — `removeParallelAxes`

- Implemented: Removes the complete owner, semantic overrides, recipes and graphics; optional selectors assert the stored owner.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeParallelAxes`

- ✅ Covered: Full/Basic boundary, field/owner selection, component lifecycle, defaults/style/format, count/values and error atomicity, immutable replay, primitive/public geometry and renderer parity, installed consumer.
- Evidence: `test/unit/actions/guides/parallel-axis-lifecycle.test.js`, `test/unit/actions/guides/parallel-axis-reencoding.test.js`, `test/contracts/parallel-axis-types.test.js`, `test/charts/cars-parallel-coordinates/public.test.js`, `test/charts/cars-parallel-coordinates/png.render.js`.

## Shared formal types

```typescript
type AxisPositionX = "bottom" | "top";
type AxisPositionY = "left" | "right";
type TimeAxisDirective = "Y" | "m" | "d" | "b";
type TimeAxisFormatString = `${string}%${TimeAxisDirective}${string}`;
type AxisFormatString =
  | ".0f" | ".1f" | ".2f"
  | ".0%" | ".1%" | ".2e"
  | TimeAxisFormatString;
type TickValue = string | boolean | Finite;
type TickOptions = {
  length?: NonNegativeFinite;
  color?: NonEmptyString;
  lineWidth?: NonNegativeFinite;
};
type LabelOptions = {
  offset?: NonNegativeFinite;
  format?: "auto" | { decimals: NonNegativeInteger } | AxisFormatString;
  color?: NonEmptyString;
  fontSize?: PositiveFinite;
  fontFamily?: NonEmptyString;
  fontWeight?: FontWeight;
};
type TickAndLabelOptions = {
  count?: PositiveInteger;
  values?: readonly TickValue[];
  ticks?: TickOptions;
  labels?: LabelOptions;
};
type AxisTitleOptions<P extends string> = TextStyle & {
  text?: NonEmptyString;
  position?: P;
  at?: "start" | "center" | "end" | Finite;
  offset?: NonNegativeFinite;
  rotation?: Finite;
};
type CompleteAxisOptions<P extends string> = {
  scale?: UserId;
  coordinate?: UserId;
  position?: P;
  line?: false | { color?: NonEmptyString; lineWidth?: NonNegativeFinite };
  ticksAndLabels?: false | TickAndLabelOptions;
  title?: false | AxisTitleOptions<P>;
};
```

## `createAxes`

- Signature: `createAxes({ coordinate?, x?, y?, theta?, radius? })`
- `coordinate.id`: existing coordinate ID. 생략하면 encoded Cartesian layers가 참조하는 유일한 ID를 추론한다.
- `coordinate.type`: `"auto" | "cartesian" | "polar"`, 기본값 `"auto"`; stored type assertion이다.
- `x`, `y`: `false`, `{}`, 또는 complete-axis options. 생략하면 해당 encoded channel을 자동 선택하고,
  `false`는 명시적으로 끈다.
- Effect: coordinate를 만들거나 고치지 않고 stored positional layers를 읽어 selected complete axes를 만든다.
- 오류: mixed Cartesian/Polar channel, ambiguous coordinate/scale, missing stored coordinate, no selected axis를 거부한다.
- Coverage: `test/unit/actions/guides/create-axes.test.js`와 temporal/ordinal/histogram axis tests가 inference,
  opt-out, ambiguity, stored coordinate와 rematerialization을 검증한다.
- Polar coordinate는 `theta`와 `radius` complete-axis option을 사용하며 stored coordinate family로 dispatch한다.

### Formal values — `createAxes`

- Implemented: Cartesian `x`/`y`와 Polar `theta`/`radius` option을 coordinate family별로 dispatch한다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createAxes`

- `coordinate.id`
  - ✅ Covered: omission with unique coordinate, explicit matching ID, unknown/ambiguous IDs.
- `coordinate.type`
  - ✅ Covered: omission/`"auto"`, `"cartesian"`, `"polar"`, stored-type mismatch와 unknown value.
- `x`, `y`
  - ✅ Covered: omission inference, `{}` explicit selection, `false` opt-out, nested options, neither selected error.
  - ✅ Covered: bounded multi-layer/shared-coordinate cases prove opt-out, explicit scale resolution and ambiguity
    rejection without an exhaustive layer × scale cross-product.
  - ✅ Covered: x top/y right complete-axis forwarding while preserving channel defaults.
- Polar axes use theta/radius channel options rather than x/y objects.
- Evidence: `test/unit/actions/guides/create-axes.test.js`.

## Polar guide actions

`createThetaAxis`와 `createRadialAxis`는 stored Polar coordinate와 각각 `theta`/`radius` scale을 읽어 complete
axis를 만든다. Theta axis는 outer circle, outward ticks, perimeter labels와 아래 title을 소유한다. Radial axis는
기본 `90` degree center-to-edge baseline과 perpendicular ticks, labels, title을 소유한다.
Polar label/title의 resolved text bounds가 Canvas를 벗어나거나 같은 label collection 안에서 충돌하면
insufficient-space 오류로 전체 create/edit을 원자적으로 거부한다. Continuous-theta의 같은 anchor를 공유하는
두 seam endpoint label은 이 collision 검사에서 하나의 의도된 endpoint로 취급한다.

```typescript
createThetaAxis(options?: CompletePolarAxisOptions): ChartProgram;
createRadialAxis(options?: CompleteRadialAxisOptions): ChartProgram;
editThetaAxis(options: EditPolarAxisOptions): ChartProgram;
editRadialAxis(options: EditPolarAxisOptions & { angle?: number }): ChartProgram;
```

- `scale`, `coordinate`는 unique stored encoding에서 추론한다.
- `ticksAndLabels.count` 기본값은 theta `6`, radius `5`이며 `values`와 mutually exclusive다.
- `angle`은 public Polar degree convention을 사용하며 radial component/aggregate create와 aggregate edit가 소유한다. Theta는 받지 않는다.
- `line`/`ticksAndLabels`/`title: false`는 생성 시 생략하고 편집 시 existing component를 제거한다. Optional component lifecycle을 따른다.
- Focused line/ticks/labels/title actions는 raw graphic target 없이 같은 stored resource를 변경한다.
- Inferred title은 encoding field/title을 읽는다. Canvas, scale, encoding revision은 모든 component를
  deterministic하게 rematerialize한다.
- `removeThetaAxis`와 `removeRadialAxis`는 semantic/config/concrete resource 전체를 제거한다.
- Evidence: `test/unit/actions/guides/polar-axis-actions.test.js`, `test/charts/polar-guides/`.

## `createThetaAxis`

Complete theta-axis aggregate; options follow the Polar guide contract above.

### Formal values — `createThetaAxis`

- Implemented: `createThetaAxis(options?: CompletePolarAxisOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createThetaAxis`

- ✅ Covered: inferred/explicit resources, count/values, style, title, duplicate and invalid input.
- No proposal; Evidence: `test/unit/actions/guides/polar-axis-actions.test.js`.

## `createRadialAxis`

Complete radius-axis aggregate with public-degree `angle`.

### Formal values — `createRadialAxis`

- Implemented: `createRadialAxis(options?: CompleteRadialAxisOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRadialAxis`

- ✅ Covered: default/arbitrary angle, inferred resources, components, title opt-out and invalid input.
- No proposal; Evidence: `test/unit/actions/guides/polar-axis-actions.test.js`.

## `editThetaAxis`

Edits selected existing theta-axis components through focused children.

### Formal values — `editThetaAxis`

- Implemented: `editThetaAxis(options: Omit<EditPolarAxisOptions, "angle">)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editThetaAxis`

- ✅ Covered: line, ticks, labels, combined ticks/labels and title routing.
- No proposal; Evidence: `test/unit/actions/guides/polar-axis-actions.test.js`.

## `editRadialAxis`

Edits selected radius-axis components; `angle` rematerializes every existing component.

### Formal values — `editRadialAxis`

- Implemented: `editRadialAxis(options: EditPolarAxisOptions)`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRadialAxis`

- ✅ Covered: aggregate component routing and whole-axis angle movement.
- No proposal; Evidence: `test/unit/actions/guides/polar-axis-actions.test.js`.

## Polar focused component creation

Full에서 theta/radial line·ticks·labels·title을 독립적으로 생성한다. Complete axis와 같은 wrapped owner·defaults·schema·materialization을 사용한다. Basic에는 노출하지 않는다. Existing component 생성은 오류이며 대응 focused edit는 existing component를 요구한다. 전체 remove 뒤 원하는 component만 다시 생성할 수 있다.

기존 semantic axis binding이 있으면 scale/coordinate를 계승하고, 없으면 compatible Polar encoding에서 유일하게 추론한다. 모호한 resource는 explicit ID를 요구한다. Theta create는 angle과 radial-only position을 거부한다. Radial create의 angle은 유한 degrees, 생략 시 기존 aggregate angle 또는 기본 90이다. 이미 생성한 component와 다른 angle은 오류이며 변경은 editRadialAxis가 소유한다. Label/title을 첫 component로 생성해도 요청한 angle로 bounds와 geometry를 검증한다.

Ticks/labels의 count와 values는 배타적이고 같은 existing mode/default owner를 사용한다. Title text는 stored field/title에서 추론한다. Typography·offset·line style은 대응 focused editor의 값과 검증을 재사용한다. Invalid options/bindings/style/space, duplicate resource는 이전 program과 입력을 보존하는 atomic failure다. Scale/Canvas/encoding 편집은 생성 순서와 무관하게 같은 owner를 rematerialize한다.

## `createThetaAxisLine`

- Signature: `createThetaAxisLine(options?: CreateThetaAxisLineOptions): ChartProgram`.
- Behavior and defaults: Polar focused component creation above and the corresponding focused editor below.

### Formal values — `createThetaAxisLine`

- Implemented: missing theta line creation with inferred/explicit scale and coordinate and the corresponding style options; angle is not accepted.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createThetaAxisLine`

- ✅ Covered: full/Basic classification, independent creation and aggregate equivalence, create order, restore, resource/style errors, angle ownership, scale/Canvas replay and immutability.
- Evidence: `test/unit/actions/guides/polar-component-creation.test.js`, `test/contracts/polar-component-types.test.js`, `test/unit/actions/guides/polar-axis-actions.test.js`.

## `createRadialAxisLine`

- Signature: `createRadialAxisLine(options?: CreateRadialAxisLineOptions): ChartProgram`.
- Behavior and defaults: Polar focused component creation above and the corresponding focused editor below.

### Formal values — `createRadialAxisLine`

- Implemented: missing radial line creation with inferred/explicit scale and coordinate and the corresponding style options, optional shared radial angle.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRadialAxisLine`

- ✅ Covered: full/Basic classification, independent creation and aggregate equivalence, create order, restore, resource/style errors, angle ownership, scale/Canvas replay and immutability.
- Evidence: `test/unit/actions/guides/polar-component-creation.test.js`, `test/contracts/polar-component-types.test.js`, `test/unit/actions/guides/polar-axis-actions.test.js`.

## `createThetaAxisTicks`

- Signature: `createThetaAxisTicks(options?: CreateThetaAxisTicksOptions): ChartProgram`.
- Behavior and defaults: Polar focused component creation above and the corresponding focused editor below.

### Formal values — `createThetaAxisTicks`

- Implemented: missing theta ticks creation with inferred/explicit scale and coordinate and the corresponding style options; angle is not accepted; count and values are exclusive.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createThetaAxisTicks`

- ✅ Covered: full/Basic classification, independent creation and aggregate equivalence, create order, restore, resource/style errors, angle ownership, scale/Canvas replay and immutability.
- Evidence: `test/unit/actions/guides/polar-component-creation.test.js`, `test/contracts/polar-component-types.test.js`, `test/unit/actions/guides/polar-axis-actions.test.js`.

## `createRadialAxisTicks`

- Signature: `createRadialAxisTicks(options?: CreateRadialAxisTicksOptions): ChartProgram`.
- Behavior and defaults: Polar focused component creation above and the corresponding focused editor below.

### Formal values — `createRadialAxisTicks`

- Implemented: missing radial ticks creation with inferred/explicit scale and coordinate and the corresponding style options, optional shared radial angle; count and values are exclusive.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRadialAxisTicks`

- ✅ Covered: full/Basic classification, independent creation and aggregate equivalence, create order, restore, resource/style errors, angle ownership, scale/Canvas replay and immutability.
- Evidence: `test/unit/actions/guides/polar-component-creation.test.js`, `test/contracts/polar-component-types.test.js`, `test/unit/actions/guides/polar-axis-actions.test.js`.

## `createThetaAxisLabels`

- Signature: `createThetaAxisLabels(options?: CreateThetaAxisLabelsOptions): ChartProgram`.
- Behavior and defaults: Polar focused component creation above and the corresponding focused editor below.

### Formal values — `createThetaAxisLabels`

- Implemented: missing theta labels creation with inferred/explicit scale and coordinate and the corresponding style options; angle is not accepted; count and values are exclusive.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createThetaAxisLabels`

- ✅ Covered: full/Basic classification, independent creation and aggregate equivalence, create order, restore, resource/style errors, angle ownership, scale/Canvas replay and immutability.
- Evidence: `test/unit/actions/guides/polar-component-creation.test.js`, `test/contracts/polar-component-types.test.js`, `test/unit/actions/guides/polar-axis-actions.test.js`.

## `createRadialAxisLabels`

- Signature: `createRadialAxisLabels(options?: CreateRadialAxisLabelsOptions): ChartProgram`.
- Behavior and defaults: Polar focused component creation above and the corresponding focused editor below.

### Formal values — `createRadialAxisLabels`

- Implemented: missing radial labels creation with inferred/explicit scale and coordinate and the corresponding style options, optional shared radial angle; count and values are exclusive.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRadialAxisLabels`

- ✅ Covered: full/Basic classification, independent creation and aggregate equivalence, create order, restore, resource/style errors, angle ownership, scale/Canvas replay and immutability.
- Evidence: `test/unit/actions/guides/polar-component-creation.test.js`, `test/contracts/polar-component-types.test.js`, `test/unit/actions/guides/polar-axis-actions.test.js`.

## `createThetaAxisTitle`

- Signature: `createThetaAxisTitle(options?: CreateThetaAxisTitleOptions): ChartProgram`.
- Behavior and defaults: Polar focused component creation above and the corresponding focused editor below.

### Formal values — `createThetaAxisTitle`

- Implemented: missing theta title creation with inferred/explicit scale and coordinate and the corresponding style options; angle is not accepted.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createThetaAxisTitle`

- ✅ Covered: full/Basic classification, independent creation and aggregate equivalence, create order, restore, resource/style errors, angle ownership, scale/Canvas replay and immutability.
- Evidence: `test/unit/actions/guides/polar-component-creation.test.js`, `test/contracts/polar-component-types.test.js`, `test/unit/actions/guides/polar-axis-actions.test.js`.

## `createRadialAxisTitle`

- Signature: `createRadialAxisTitle(options?: CreateRadialAxisTitleOptions): ChartProgram`.
- Behavior and defaults: Polar focused component creation above and the corresponding focused editor below.

### Formal values — `createRadialAxisTitle`

- Implemented: missing radial title creation with inferred/explicit scale and coordinate and the corresponding style options, optional shared radial angle.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createRadialAxisTitle`

- ✅ Covered: full/Basic classification, independent creation and aggregate equivalence, create order, restore, resource/style errors, angle ownership, scale/Canvas replay and immutability.
- Evidence: `test/unit/actions/guides/polar-component-creation.test.js`, `test/contracts/polar-component-types.test.js`, `test/unit/actions/guides/polar-axis-actions.test.js`.

## `editThetaAxisLine`

### Formal values — `editThetaAxisLine`

- Implemented: `editThetaAxisLine({ color?, lineWidth? } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editThetaAxisLine`

- ✅ Covered: default rematerialization and partial style edit.
- No proposal; Evidence: Polar axis unit tests.

## `editRadialAxisLine`

### Formal values — `editRadialAxisLine`

- Implemented: `editRadialAxisLine({ color?, lineWidth? } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRadialAxisLine`

- ✅ Covered: partial style edit and aggregate angle rematerialization.
- No proposal; Evidence: Polar axis unit tests.

## `editThetaAxisTicks`

### Formal values — `editThetaAxisTicks`

- Implemented: `editThetaAxisTicks({ count?, values?, length?, color?, lineWidth? } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editThetaAxisTicks`

- ✅ Covered: count/value replacement, geometry and style.
- No proposal; Evidence: Polar axis unit tests.

## `editRadialAxisTicks`

### Formal values — `editRadialAxisTicks`

- Implemented: `editRadialAxisTicks({ count?, values?, length?, color?, lineWidth? } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRadialAxisTicks`

- ✅ Covered: count/value replacement and angle-aware geometry.
- No proposal; Evidence: Polar axis unit tests.

## `editThetaAxisLabels`

### Formal values — `editThetaAxisLabels`

- Implemented: `editThetaAxisLabels({ count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editThetaAxisLabels`

- ✅ Covered: tick synchronization, formatting, alignment and style.
- No proposal; Evidence: Polar axis unit tests.

## `editRadialAxisLabels`

### Formal values — `editRadialAxisLabels`

- Implemented: `editRadialAxisLabels({ count?, values?, offset?, format?, color?, fontSize?, fontFamily?, fontWeight? } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRadialAxisLabels`

- ✅ Covered: values, offset, style and angle-aware geometry.
- No proposal; Evidence: Polar axis unit tests.

## `editThetaAxisTitle`

### Formal values — `editThetaAxisTitle`

- Implemented: `editThetaAxisTitle({ text?, offset?, color?, fontSize?, fontFamily?, fontWeight? } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editThetaAxisTitle`

- ✅ Covered: inferred/explicit text, offset and appearance.
- No proposal; Evidence: Polar axis unit tests.

## `editRadialAxisTitle`

### Formal values — `editRadialAxisTitle`

- Implemented: `editRadialAxisTitle({ text?, position?: "inside" | "outside", offset?, color?, fontSize?, fontFamily?, fontWeight? } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editRadialAxisTitle`

- ✅ Covered: inferred/explicit text, default inside midpoint, explicit outside endpoint placement, offset,
  appearance, angle movement, invalid position and immutable round-trip.
- No proposal; Evidence: Polar axis unit tests.

## `removeThetaAxis`

### Formal values — `removeThetaAxis`

- Implemented: `removeThetaAxis({ scale?, coordinate? } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeThetaAxis`

- ✅ Covered: complete removal, immutable prior state and missing-resource error.
- No proposal; Evidence: Polar axis unit tests.

## `removeRadialAxis`

### Formal values — `removeRadialAxis`

- Implemented: `removeRadialAxis({ scale?, coordinate? } = {})`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeRadialAxis`

- ✅ Covered: complete removal, immutable prior state and missing-resource error.
- No proposal; Evidence: Polar axis unit tests.

## `createXAxis`

- Signature: `createXAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })`
- Parameter contract와 effect는 Shared complete-axis contract를 따른다. x default는 bottom이다.
- Coverage: `test/unit/actions/guides/axis-actions.test.js`가 defaults, routing, coordinate와 duplicates를 검증한다.

### Formal values — `createXAxis`

- Implemented: `createXAxis(options?: CompleteAxisOptions<AxisPositionX>)`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createXAxis`

- `scale`, `coordinate`
  - ✅ Covered: defaults, explicit IDs, missing/unused/conflicting resources.
- `position`
  - ✅ Covered: omission→`"bottom"`, explicit bottom/top, unsupported value rejection, outward top
    geometry와 top-margin validation.
- `line`, `ticksAndLabels`, `title`
  - ✅ Covered: omission/default objects, nested representative overrides, unknown nested keys, partial duplicate failure.
  - ✅ Covered: complete-axis tests forward line, ticksAndLabels and title objects atomically; leaf and aggregate tests
    cover every nested property and invalid key.
- Evidence: `test/unit/actions/guides/axis-actions.test.js`.

## `createYAxis`

- Signature: `createYAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })`
- Parameter contract와 effect는 Shared complete-axis contract를 따른다. y default는 left다.
- Coverage: `test/unit/actions/guides/axis-actions.test.js`가 symmetric behavior를 검증한다.

### Formal values — `createYAxis`

- Implemented: `createYAxis(options?: CompleteAxisOptions<AxisPositionY>)`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createYAxis`

- `scale`, `coordinate`
  - ✅ Covered: defaults, explicit IDs and conflicts.
- `position`
  - ✅ Covered: omission→`"left"`, explicit left/right, unsupported value rejection, mirrored right
    geometry와 right-margin validation.
- `line`, `ticksAndLabels`, `title`
  - ✅ Covered: defaults, representative nested overrides and invalid nested keys.
- Evidence: `test/unit/actions/guides/axis-actions.test.js`.

## `createXAxisLine`

- Signature: `createXAxisLine({ scale?, position?, color?, lineWidth? })`.
- Shared axis-line contract를 따르며 missing graphic을 만든다.
- Coverage: `test/unit/actions/guides/axis-line-actions.test.js`.

### Formal values — `createXAxisLine`

- Implemented: `createXAxisLine({ scale?: UserId; position?: AxisPositionX; color?: NonEmptyString; lineWidth?: NonNegativeFinite } = {})`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createXAxisLine`

- `scale`: ✅ Covered default `"x"`, explicit ID, unknown/unconsumed/unresolved scale.
- `position`: ✅ Covered default/bottom/top, outward geometry and invalid values.
- `color`: ✅ Covered default, explicit non-empty, empty/non-string rejection.
- `lineWidth`: ✅ Covered default `1`, zero, positive, negative/non-finite rejection.
- Evidence: `test/unit/actions/guides/axis-line-actions.test.js`.

## `createYAxisLine`

- Signature와 contract는 x와 같고 position/geometry가 left y-axis 기준이다.
- Coverage: `test/unit/actions/guides/axis-line-actions.test.js`.

### Formal values — `createYAxisLine`

- Implemented: `createYAxisLine({ scale?: UserId; position?: AxisPositionY; color?: NonEmptyString; lineWidth?: NonNegativeFinite } = {})`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createYAxisLine`

- `scale`: ✅ Covered default `"y"`, explicit and invalid resources.
- `position`: ✅ Covered default/left/right, outward geometry and invalid values.
- `color`, `lineWidth`: ✅ Covered default/representative/boundary/invalid classes shared with x.
- Evidence: `test/unit/actions/guides/axis-line-actions.test.js`.

## `editXAxisLine`

- Signature: `editXAxisLine({ position?, color?, lineWidth? })`.
- 기존 x-axis line이 필요하고 geometry를 다시 추론한 뒤 appearance를 적용한다.
- Coverage: axis-line tests가 partial edit, invalid style와 Canvas rematerialization을 검증한다.

### Formal values — `editXAxisLine`

- Implemented: `editXAxisLine({ position?: AxisPositionX; color?: NonEmptyString; lineWidth?: NonNegativeFinite } = {})`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editXAxisLine`

- `position`: ✅ Covered omitted/existing, bottom/top and create/edit parity.
- `color`, `lineWidth`: ✅ Covered partial edits, unchanged omissions and invalid values.
- Empty options: ✅ Covered. `{}`는 existing appearance를 유지한 채 current bounds에서 geometry를 다시 추론한다.
- Evidence: `test/unit/actions/guides/axis-line-actions.test.js`.

## `editYAxisLine`

- Signature와 edit contract는 x와 같고 y geometry를 사용한다.
- Coverage: `test/unit/actions/guides/axis-line-actions.test.js`.

### Formal values — `editYAxisLine`

- Implemented: `editYAxisLine({ position?: AxisPositionY; color?: NonEmptyString; lineWidth?: NonNegativeFinite } = {})`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editYAxisLine`

- `position`, `color`, `lineWidth`: ✅ Covered left/right partial edits, mirrored geometry and errors.
- Evidence: `test/unit/actions/guides/axis-line-actions.test.js`.

## `createXAxisTicks`

- Shared tick create contract를 사용하며 bottom/top ticks를 각 edge 바깥쪽으로 만든다.
- Coverage: axis-tick, histogram-axis, ordinal-axis, temporal-axis tests.

### Formal values — `createXAxisTicks`

- Implemented: `createXAxisTicks({ scale?: UserId; position?: AxisPositionX; count?: PositiveInteger; values?: readonly TickValue[]; length?: NonNegativeFinite; color?: NonEmptyString; lineWidth?: NonNegativeFinite } = {})`; `count | values` 중 최대 하나.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createXAxisTicks`

- `scale`: ✅ Covered default/explicit and invalid resources.
- `position`: ✅ Covered bottom/top, outward geometry, margin errors and invalid values.
- `count`: ✅ Covered omission→5, positive integer, zero/negative/non-integer, count+values conflict.
- `values`: ✅ Covered finite values/timestamps, histogram boundaries, ordinal domain/subset, out-of-domain/invalid values.
- `length`: ✅ Covered default `6`, zero, positive and negative rejection.
- `color`, `lineWidth`: ✅ Covered defaults, representatives and invalid values.
- Evidence: `test/unit/actions/guides/axis-tick-actions.test.js`, histogram/ordinal/temporal axis tests.

## `createYAxisTicks`

- Shared tick create contract를 사용하며 left/right ticks를 각 edge 바깥쪽으로 만든다.
- Coverage: axis-tick와 chart axis tests.

### Formal values — `createYAxisTicks`

- Implemented: x tick schema와 같고 `position?: AxisPositionY`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createYAxisTicks`

- `scale`, `position`, `count`, `values`, `length`, `color`, `lineWidth`
  - ✅ Covered: linear y defaults, explicit values and shared invalid classes.
  - ✅ Covered: explicit y values preserve authored order on reversed mapping and representative dense counts use the
    shared tick generator; unbounded density stress is outside the layout contract.
- ✅ Covered: right position, outward geometry and margin failure.
- Evidence: axis-tick and chart guide tests.

## `editXAxisTicks`

- Shared tick edit contract를 사용한다. existing tick config가 필요하다.
- Coverage: `test/unit/actions/guides/axis-tick-actions.test.js`.

### Formal values — `editXAxisTicks`

- Implemented: create x tick schema에서 `scale`을 제외한다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editXAxisTicks`

- `position`: ✅ Covered bottom/top transitions and invalid values.
- `count`, `values`: ✅ Covered mode switch, mutually exclusive inputs, rematerialization and invalid domains.
- `length`, `color`, `lineWidth`: ✅ Covered partial appearance edits and invalid values.
- Evidence: `test/unit/actions/guides/axis-tick-actions.test.js`.

## `editYAxisTicks`

- x와 같은 edit contract를 y scale에 적용한다.
- Coverage: `test/unit/actions/guides/axis-tick-actions.test.js`.

### Formal values — `editYAxisTicks`

- Implemented: create y tick schema에서 `scale`을 제외한다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editYAxisTicks`

- 모든 parameter는 x edit과 같은 value classes를 사용한다.
  - ✅ Covered: representative values, mode policy and invalid options.
  - ✅ Covered: repeated count→values→count→values replacement, concrete length and immutable prior policies.
- ✅ Covered: left/right position transitions with create/edit parity.
- Evidence: axis-tick and tick-group tests.

## `createXAxisLabels`

- Shared label create contract를 사용한다.
- Coverage: axis-label, temporal/ordinal/histogram axis tests.

### Formal values — `createXAxisLabels`

- Implemented: `createXAxisLabels({ scale?: UserId; position?: AxisPositionX; count?: PositiveInteger; values?: readonly TickValue[]; ...LabelOptions } = {})`; `count | values` 중 최대 하나.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createXAxisLabels`

- `scale`, `position`, `count`, `values`
  - ✅ Covered: linear/time/ordinal modes, existing tick reuse, conflict/out-of-domain rejection.
- `offset`: ✅ Covered default `18`, zero/positive, negative rejection.
- `format`
  - ✅ Covered: `"auto"`, `{ decimals: 0 }`, positive decimals, every closed numeric/UTC token,
    invalid objects and wrong-scale rejection.
  - ✅ Covered: year/month/day/hour/minute/second spans, leap-day boundary, distinct auto labels, explicit
    coarse-format preservation와 Canvas rematerialization stability.
- `color`, `fontSize`, `fontFamily`, `fontWeight`
  - ✅ Covered: defaults, representative string/numeric weight and invalid classes.
- Evidence: `test/unit/actions/guides/axis-label-actions.test.js`, temporal/ordinal axis tests.

## `createYAxisLabels`

- Shared label create contract를 y channel에 적용한다.
- Coverage: axis-label 및 chart tests.

### Formal values — `createYAxisLabels`

- Implemented: x label schema와 같고 `position?: AxisPositionY`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createYAxisLabels`

- `scale`, `position`, `count`, `values`, `offset`, `format`, font style
  - ✅ Covered: linear y defaults, explicit/derived values, decimal formatting and conflicts.
  - ✅ Covered: numeric fontWeight 100/900 boundaries, invalid weights and left/right alignment over reversed y mapping.
- ✅ Covered: right-side alignment and shared format tokens.
- Evidence: axis-label and chart guide tests.

## `editXAxisLabels`

- Shared label edit contract를 사용하며 existing config/graphic이 필요하다.
- Coverage: `test/unit/actions/guides/axis-label-actions.test.js`.

### Formal values — `editXAxisLabels`

- Implemented: create x label schema에서 `scale`을 제외한다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editXAxisLabels`

- `position`, `count`, `values`, `offset`, `format`, color/font parameters
  - ✅ Covered: partial style edit, position transition, decimal/token format, tick conflict and Canvas
    rematerialization.
- Evidence: `test/unit/actions/guides/axis-label-actions.test.js`.

## `editYAxisLabels`

- x와 같은 edit contract를 y channel에 적용한다.
- Coverage: `test/unit/actions/guides/axis-label-actions.test.js`.

### Formal values — `editYAxisLabels`

- Implemented: create y label schema에서 `scale`을 제외한다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editYAxisLabels`

- 모든 edit parameter
  - ✅ Covered: representative partial edits and shared invalid classes.
  - ✅ Covered: left/right position transitions and numeric format switching.
  - ✅ Covered: repeated auto→percent token→fixed decimal→auto replacement with retained y alignment/style.
- Evidence: axis-label tests.

## `createXAxisTicksAndLabels`

- Shared aggregate create contract를 x에 적용한다.
- Coverage: `test/unit/actions/guides/axis-tick-group-actions.test.js`.

### Formal values — `createXAxisTicksAndLabels`

- Implemented: `createXAxisTicksAndLabels({ scale?: UserId; position?: AxisPositionX; ...TickAndLabelOptions } = {})`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createXAxisTicksAndLabels`

- `scale`, `position`, `count`, `values`
  - ✅ Covered: shared forwarding, count/values conflict and default inference.
- `ticks.length/color/lineWidth`, `labels.offset/format/color/fontSize/fontFamily/fontWeight`
  - ✅ Covered: representative nested overrides, unknown nested keys and independent child effects.
  - ✅ Covered: x aggregate forwarding uses the same full nested schema verified by leaf tests and complete-axis
    integration; no separate combination branch exists.
- ✅ Covered: top position and label format tokens follow leaf actions through complete-axis integration.
- Evidence: `test/unit/actions/guides/axis-tick-group-actions.test.js`.

## `createYAxisTicksAndLabels`

- Shared aggregate create contract를 y에 적용한다.
- Coverage: axis-tick-group tests.

### Formal values — `createYAxisTicksAndLabels`

- Implemented: x aggregate schema와 같고 `position?: AxisPositionY`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createYAxisTicksAndLabels`

- shared and nested parameters
  - ✅ Covered: y defaults, explicit values and trace hierarchy.
  - ✅ Covered: one y aggregate call sets every tick and label appearance leaf and verifies concrete forwarding.
- ✅ Covered: right position and label format tokens follow both y leaf actions.
- Evidence: axis-tick-group tests.

## `editXAxisTicksAndLabels`

- Shared aggregate edit contract를 x에 적용한다.
- Coverage: axis-tick-group tests가 shared/nested edit와 trace를 검증한다.

### Formal values — `editXAxisTicksAndLabels`

- Implemented: create x aggregate schema에서 `scale`을 제외하며 최소 한 option이 필요하다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editXAxisTicksAndLabels`

- `position`, `count`, `values`
  - ✅ Covered: atomic policy changes and invalid mutual use.
- `ticks`, `labels`
  - ✅ Covered: only requested child edit, both child edit and empty edit rejection.
- ✅ Covered: top position and label format tokens follow leaf actions.
- Evidence: `test/unit/actions/guides/axis-tick-group-actions.test.js`.

## `editYAxisTicksAndLabels`

- Shared aggregate edit contract를 y에 적용한다.
- Coverage: axis-tick-group tests.

### Formal values — `editYAxisTicksAndLabels`

- Implemented: create y aggregate schema에서 `scale`을 제외하며 최소 한 option이 필요하다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editYAxisTicksAndLabels`

- shared/nested edit parameters
  - ✅ Covered: representative values, child selection and invalid options.
- ✅ Covered: right-position aggregate edit follows both leaf actions.
- Evidence: axis-tick-group tests.

## `createXAxisTitle`

- Shared title create contract를 bottom/top x-axis에 적용한다.
- Coverage: `test/unit/actions/guides/axis-title-actions.test.js`.

### Formal values — `createXAxisTitle`

- Implemented: `createXAxisTitle({ scale?: UserId; ...AxisTitleOptions<AxisPositionX> } = {})`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createXAxisTitle`

- `text`: ✅ Covered inferred field/aggregate/density text, explicit non-empty, ambiguous/empty rejection.
- `scale`: ✅ Covered default/explicit/conflicting scale.
- `position`: ✅ Covered bottom/top, default rotation, margin failure and invalid values.
- `at`: ✅ Covered `"start" | "center" | "end"`, in-domain number and out-of-domain/invalid.
- `offset`: ✅ Covered default `42`, zero/positive, negative rejection.
- `rotation`: ✅ Covered default `0`, finite explicit and non-finite rejection.
- `color`, `fontSize`, `fontFamily`, `fontWeight`: ✅ Covered defaults, representatives and invalid classes.
- Evidence: `test/unit/actions/guides/axis-title-actions.test.js`.

## `createYAxisTitle`

- Shared title create contract를 left/right y-axis에 적용한다.
- Coverage: axis-title tests.

### Formal values — `createYAxisTitle`

- Implemented: `createYAxisTitle({ scale?: UserId; ...AxisTitleOptions<AxisPositionY> } = {})`
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `createYAxisTitle`

- `text`, `scale`, `at`, style: ✅ Covered symmetric inference, data positions and invalid values.
- `position`: ✅ Covered left/right with default negative/positive half-turn rotations and margin failure.
- `offset`: ✅ Covered default `52`; `rotation`: ✅ Covered default `-Math.PI / 2` and explicit finite values.
- Evidence: axis-title tests.

## `editXAxisTitle`

- Shared title edit contract를 사용하며 text 또는 appearance를 immutable하게 편집한다.
- Coverage: axis-title tests가 data-space `at`, rematerialization과 invalid values를 검증한다.

### Formal values — `editXAxisTitle`

- Implemented: create x title schema에서 `scale`을 제외한다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editXAxisTitle`

- `text`, `position`, `at`, `offset`, `rotation`, style
  - ✅ Covered: semantic text edit, graphical-only appearance edit, data-space relocation, invalid values.
- ✅ Covered: bottom/top position transitions follow `createXAxisTitle`.
- Evidence: axis-title tests.

## `editYAxisTitle`

- x와 같은 edit contract를 y-axis에 적용한다.
- Coverage: axis-title tests.

### Formal values — `editYAxisTitle`

- Implemented: create y title schema에서 `scale`을 제외한다.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editYAxisTitle`

- 모든 edit parameter
  - ✅ Covered: representative semantic/graphical edits and rematerialization.
  - ✅ Covered: inferred rotation follows left/right position edits while explicit rotation wins.
  - ✅ Covered: repeated data-space/string `at` edits retain explicit rotation while immutable earlier titles preserve
    their locations.
- Evidence: axis-title tests.

## `editXAxis`

- Signature: `editXAxis({ position?, line?, ticks?, labels?, ticksAndLabels?, title? })`; each component accepts its
  existing edit object or `false`.
- Existing x-axis leaf resources를 선택해 편집하거나 제거하는 aggregate facade다. `position`은 제거되지 않은 existing
  line, ticks/labels와 title 전체에 공유된다. `ticksAndLabels`는 standalone `ticks`/`labels`와 함께 쓸 수 없다.
- `line: false`, `ticks: false`, `labels: false`, `title: false`는 matching materialization config와 concrete graphic을
  함께 제거하며 title은 semantic title leaf도 제거한다. `ticksAndLabels: false`는 existing ticks와 labels 모두를
  요구하고 함께 제거한다.
- Aggregate는 complete operation plan을 immutable speculative branch에서 preflight한 뒤 실제 child trace를 한 번만
  기록한다. Object edit는 wrapped leaf action, removal은 `editSemantic({ remove: true })`와
  `editGraphics({ remove: true })`를 사용한다. 마지막 component 제거는 wrapped `removeXAxis`가 empty axis semantic과
  config를 정리한다.
- Retained scale, coordinate, mark encoding, source data와 opposite axis는 보존한다. Removed config/graphic은 Canvas 또는
  scale rematerialization plan에 다시 들어가지 않으며 ordinary component/complete-axis create action으로 복원한다.
- Errors: empty/unknown/nested-invalid options, group/leaf combination, requested missing edit/removal leaf,
  leaf value/layout validation failure. 실패는 returned partial state나 trace를 만들지 않는다.

### Formal values — `editXAxis`

- Implemented: `editXAxis(options: EditAxisOptions<AxisPositionX>)`, where each component is `false | ExistingEditOptions`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editXAxis`

- ✅ Covered: shared top position, grouped label formatting, title offset, leaf trace and earlier-program immutability.
- ✅ Covered: every x leaf/group removal, retained state, last-component cleanup, recreate and Canvas/scale replay.
- ✅ Covered: empty, unknown nested, missing removal, mutually ambiguous tick options and aggregate failure atomicity.
- No proposal; Evidence: `test/unit/actions/guides/axis-actions.test.js`,
  `test/unit/actions/guides/axis-component-lifecycle.test.js` and axis lifecycle render/browser contracts.

## `editYAxis`

- x facade와 같은 object/`false` edit/removal, complete preflight, last-component cleanup과 recreate contract를
  left/right y-axis에 적용한다.

### Formal values — `editYAxis`

- Implemented: `editYAxis(options: EditAxisOptions<AxisPositionY>)`, where each component is `false | ExistingEditOptions`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `editYAxis`

- ✅ Covered: right position, standalone labels, title offset/text, leaf hierarchy and exact Gate parity.
- ✅ Covered: every y leaf/group removal, retained resource preservation, complete cleanup, recreate and stale-replay absence.
- No proposal: scale and coordinate rebinding remain outside the edit facade.
- Evidence: `test/unit/actions/guides/axis-actions.test.js`,
  `test/unit/actions/guides/axis-component-lifecycle.test.js` and axis lifecycle render/browser contracts.

## `removeXAxis`

- Signature: `removeXAxis({ coordinate?, scale? } = {})`.
- Existing x-axis semantic branch, four concrete axis components and stored guide config를 함께 제거한다.
- Optional selector는 제거할 resource와 정확히 일치해야 하며 missing resource는 오류다. Mark, scale,
  coordinate와 independently shared resources는 보존한다.

### Formal values — `removeXAxis`

- Implemented: `removeXAxis(options?: { coordinate?: UserId; scale?: UserId })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeXAxis`

- ✅ Covered: inferred target, explicit scale mismatch, complete semantic/graphic/config cleanup, immutability.
- Evidence: `test/unit/actions/guides/remove-guides.test.js` and Roadmap 3 focused-editing Gate.

## `removeYAxis`

- `removeXAxis`와 같은 complete resource-removal contract를 y-axis에 적용한다.

### Formal values — `removeYAxis`

- Implemented: `removeYAxis(options?: { coordinate?: UserId; scale?: UserId })`.
- Proposed (NOT IMPLEMENTED): —

### Value coverage — `removeYAxis`

- ✅ Covered: inferred target and complete cleanup in the shared removal suite and Gate.
- Evidence: `test/unit/actions/guides/remove-guides.test.js`.
