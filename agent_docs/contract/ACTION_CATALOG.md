# Action Contract and Coverage Catalog

이 문서는 ggaction의 direct action 계약과 테스트 coverage를 관리하는 기준 문서다.
일반 사용자를 위한 설명은 `docs/`에 두고, 여기서는 API의 현재 동작, 계획된 동작,
내부 상태에 미치는 영향과 검증 근거를 함께 기록한다.

## 범위

Catalog의 최상위 분류는 두 개뿐이다.

- **User-facing actions**: `ChartProgram`의 public type에 선언되어 차트 작성자 또는
  advanced 작성자가 직접 호출할 수 있는 action
- **Primitives**: extension action이 semantic/graphic state를 직접 작성할 때 사용하는
  `editSemantic`, `createGraphics`, `editGraphics`

`action()` wrapper와 renderer는 action method가 아니므로 제외한다. Runtime trace에만
나타나는 `rematerializePointMark`, `createLegendSymbols` 같은 내부 wrapped action도
direct action 계약 본문에서 제외한다. 모든 `materialize*`와 `rematerialize*` action은
상위 domain action이 호출하는 internal wrapped action이며 public direct call이나 primitive가
아니다. 전체 internal materialization inventory는 별도 표로 관리한다. 이 경계가 바뀌면 type,
public reference, Catalog와 contract test를 같은 변경에서 갱신해야 한다.

## 상태와 coverage 표기

### 구현 상태

- **Implemented**: 현재 구현, public type과 테스트 대상에 존재한다.
- **Planned**: 사용자와 추가하기로 합의했지만 아직 구현되지 않았다.
- **Proposed**: 필요성만 확인됐거나 이름, 값, 우선순위가 아직 결정되지 않았다.

### 현황 기호

- **✅**: 현재 계약과 대표·경계·오류 테스트가 충분하다.
- **⚠️**: 구현됐지만 값 종류, 상호작용 또는 영향 검증이 일부 부족하다.
- **❌**: 구현 또는 실행 가능한 검증 근거가 없다.
- **—**: 해당 action에 적용되지 않는다.

Coverage 퍼센트는 사용하지 않는다. 체크된 case는 반드시 아래에 명시된 테스트 파일에서
실행 가능해야 한다. 숫자와 임의 문자열처럼 열린 값 공간은 모든 값을 나열하는 대신
경계값, 대표값, 잘못된 값과 의미 있는 상호작용으로 나눈다.

## 전체 현황

아래 표의 action 링크는 상세 계약으로 이동한다. `Contract`는 parameter와 값 공간,
`Effects`는 semantic/graphic/rematerialization 설명, `Tests`는 현재 case coverage 상태다.

| Layer | Action | Status | Contract | Effects | Tests |
| --- | --- | --- | ---: | ---: | ---: |
| User-facing | [`createCanvas`](#createcanvas) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editCanvas`](#editcanvas) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createData`](#createdata) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`filterData`](#filterdata) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createDensityData`](#createdensitydata) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createRegressionData`](#createregressiondata) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createPointMark`](#createpointmark) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createLineMark`](#createlinemark) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createBarMark`](#createbarmark) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createAreaMark`](#createareamark) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeX`](#encodex) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeY`](#encodey) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeColor`](#encodecolor) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`encodeStrokeDash`](#encodestrokedash) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeSize`](#encodesize) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeShape`](#encodeshape) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeOpacity`](#encodeopacity) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`encodeRadius`](#encoderadius) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`encodeXOffset`](#encodexoffset) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`encodeY2`](#encodey2) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`encodeYRange`](#encodeyrange) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeGroup`](#encodegroup) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`encodeHistogram`](#encodehistogram) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeDensity`](#encodedensity) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`encodeBarWidth`](#encodebarwidth) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createRegression`](#createregression) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createAxes`](#createaxes) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createXAxis`](#createxaxis) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createYAxis`](#createyaxis) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createXAxisLine`](#createxaxisline) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createYAxisLine`](#createyaxisline) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editXAxisLine`](#editxaxisline) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`editYAxisLine`](#edityaxisline) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createXAxisTicks`](#createxaxisticks) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createYAxisTicks`](#createyaxisticks) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`editXAxisTicks`](#editxaxisticks) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editYAxisTicks`](#edityaxisticks) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createXAxisLabels`](#createxaxislabels) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createYAxisLabels`](#createyaxislabels) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`editXAxisLabels`](#editxaxislabels) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editYAxisLabels`](#edityaxislabels) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createXAxisTicksAndLabels`](#createxaxisticksandlabels) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createYAxisTicksAndLabels`](#createyaxisticksandlabels) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`editXAxisTicksAndLabels`](#editxaxisticksandlabels) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editYAxisTicksAndLabels`](#edityaxisticksandlabels) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createXAxisTitle`](#createxaxistitle) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createYAxisTitle`](#createyaxistitle) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editXAxisTitle`](#editxaxistitle) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`editYAxisTitle`](#edityaxistitle) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createGrid`](#creategrid) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createHorizontalGrid`](#createhorizontalgrid) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createVerticalGrid`](#createverticalgrid) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createLegend`](#createlegend) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createGuides`](#createguides) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createTitle`](#createtitle) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createCoordinate`](#createcoordinate) | Implemented | ✅ | ✅ | ✅ |
| User-facing | [`createScale`](#createscale) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createDerivedData`](#createderiveddata) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createRegressionBand`](#createregressionband) | Implemented | ✅ | ✅ | ⚠️ |
| User-facing | [`createRegressionLine`](#createregressionline) | Implemented | ✅ | ✅ | ⚠️ |
| Primitive | [`editSemantic`](#editsemantic) | Implemented | ✅ | ✅ | ⚠️ |
| Primitive | [`createGraphics`](#creategraphics) | Implemented | ✅ | ✅ | ✅ |
| Primitive | [`editGraphics`](#editgraphics) | Implemented | ✅ | ✅ | ⚠️ |

## Action lifecycle audit

`create*` 이름이 모든 경우에 `edit*` counterpart를 요구하지는 않는다. 각 direct action은
아래 lifecycle 중 하나를 가져야 한다.

- **Immutable create-only**: source/derived data처럼 새 ID로만 다시 만들 수 있다.
- **Mutable resource**: stable identity가 있고 현재 대응 create/edit action이 모두 있다.
- **Assignment**: encoding처럼 semantic 또는 appearance property를 할당한다. 별도의
  `edit*` 이름을 기계적으로 만들지 않으며 replacement/reassignment 지원 상태를 audit에 기록한다.
- **Aggregate create-only**: wrapped child action을 조합한다. aggregate 자체의 edit은 만들지
  않고 지원되는 child edit으로 수정한다.
- **Stable create-only**: stable identity는 있지만 현재 action이 직접 소유하는 editable
  property가 없다. encoding이나 다른 owning action으로 수정하며 빈 edit action을 만들지 않는다.
- **Structural create-only**: type이나 attachment 변경이 여러 semantic/graphic dependency를
  동시에 무효화한다. 기존 resource를 부분 수정하지 않고 새 resource를 만든 뒤 consumer를 rebind한다.
- **Stable resource, edit gap**: independently addressable한 resource지만 아직 public edit 또는
  replacement 계약이 없다. 합의된 action만 Planned이고 나머지는 Proposed다.
- **Primitive**: extension authoring의 low-level create/edit/assignment 연산이다.

`Gap`은 edit action을 즉시 추가한다는 뜻이 아니다. 먼저 resource identity, editable
properties, rematerialization ownership과 conflict behavior를 정해야 한다.

| Action | Lifecycle | Current update path | Audit |
| --- | --- | --- | --- |
| `createCanvas` | Mutable resource | `editCanvas` | Complete |
| `editCanvas` | Mutable resource | Edits the Canvas | Complete |
| `createData` | Immutable create-only | Create a new dataset ID | Intentional |
| `filterData` | Immutable create-only | Create a new derived dataset ID | Intentional |
| `createDensityData` | Immutable create-only | Create a new derived dataset ID | Intentional |
| `createRegressionData` | Immutable create-only | Create a new derived dataset ID | Intentional |
| `createPointMark` | Stable resource, edit gap | Encoding actions only; no base-mark edit | `editPointMark` — Planned |
| `createLineMark` | Stable resource, edit gap | Encoding actions only; no base-mark edit | `editLineMark` — Planned |
| `createBarMark` | Stable create-only | Encoding actions own its current appearance and geometry | Intentional |
| `createAreaMark` | Stable resource, edit gap | Encoding actions only; no base-mark edit | `editAreaMark` — Planned |
| `encodeX` | Assignment | Same action will replace a compatible x field and scale | Reassignment — Planned |
| `encodeY` | Assignment | Same action will replace a compatible y field and scale | Reassignment — Planned |
| `encodeColor` | Assignment | Same action will replace compatible color grouping | Reassignment — Planned |
| `encodeStrokeDash` | Assignment | Same action will replace field and scale binding | Reassignment — Planned |
| `encodeSize` | Assignment | Same action will replace field and scale binding | Reassignment — Planned |
| `encodeShape` | Assignment | Same action will replace field and scale binding | Reassignment — Planned |
| `encodeOpacity` | Assignment | Same action replaces the constant value | Reassignment — Implemented |
| `encodeRadius` | Assignment | Same action replaces the constant value | Reassignment — Implemented |
| `encodeXOffset` | Assignment | Same action will replace compatible grouped-bar slots | Reassignment — Planned |
| `encodeY2` | Assignment | Same action will replace a compatible upper field | Reassignment — Planned |
| `encodeYRange` | Assignment | Same action will atomically replace lower/upper fields | Reassignment — Planned |
| `encodeGroup` | Assignment | Same action will replace compatible path grouping | Reassignment — Planned |
| `encodeHistogram` | Assignment | Same action will replace atomic bin/count encodings | Reassignment — Planned |
| `encodeDensity` | Assignment | `editDensity` will create and rebind a derived revision | `editDensity` — Planned |
| `encodeBarWidth` | Assignment | Same action replaces the band fraction | Reassignment — Implemented |
| `createRegression` | Aggregate create-only | Owned data/layer/encoding children | Intentional |
| `createAxes` | Aggregate create-only | Channel axis or component edits | Intentional |
| `createXAxis` | Aggregate create-only | X-axis component edits | Intentional |
| `createYAxis` | Aggregate create-only | Y-axis component edits | Intentional |
| `createXAxisLine` | Mutable resource | `editXAxisLine` | Complete |
| `createYAxisLine` | Mutable resource | `editYAxisLine` | Complete |
| `editXAxisLine` | Mutable resource | Edits the x-axis line | Complete |
| `editYAxisLine` | Mutable resource | Edits the y-axis line | Complete |
| `createXAxisTicks` | Mutable resource | `editXAxisTicks` | Complete |
| `createYAxisTicks` | Mutable resource | `editYAxisTicks` | Complete |
| `editXAxisTicks` | Mutable resource | Edits x-axis ticks | Complete |
| `editYAxisTicks` | Mutable resource | Edits y-axis ticks | Complete |
| `createXAxisLabels` | Mutable resource | `editXAxisLabels` | Complete |
| `createYAxisLabels` | Mutable resource | `editYAxisLabels` | Complete |
| `editXAxisLabels` | Mutable resource | Edits x-axis labels | Complete |
| `editYAxisLabels` | Mutable resource | Edits y-axis labels | Complete |
| `createXAxisTicksAndLabels` | Mutable resource | `editXAxisTicksAndLabels` | Complete |
| `createYAxisTicksAndLabels` | Mutable resource | `editYAxisTicksAndLabels` | Complete |
| `editXAxisTicksAndLabels` | Mutable resource | Edits x-axis ticks and labels | Complete |
| `editYAxisTicksAndLabels` | Mutable resource | Edits y-axis ticks and labels | Complete |
| `createXAxisTitle` | Mutable resource | `editXAxisTitle` | Complete |
| `createYAxisTitle` | Mutable resource | `editYAxisTitle` | Complete |
| `editXAxisTitle` | Mutable resource | Edits the x-axis title | Complete |
| `editYAxisTitle` | Mutable resource | Edits the y-axis title | Complete |
| `createGrid` | Aggregate create-only | Directional grid children | Intentional; planned child edits |
| `createHorizontalGrid` | Stable resource, edit gap | Internal rematerialization only | `editHorizontalGrid` — Planned |
| `createVerticalGrid` | Stable resource, edit gap | Internal rematerialization only | `editVerticalGrid` — Planned |
| `createLegend` | Stable resource, edit gap | Internal rematerialization only | `editLegend` — Planned |
| `createGuides` | Aggregate create-only | Guide child actions | Intentional; child edit gaps remain |
| `createTitle` | Stable resource, edit gap | Internal rematerialization only | `editTitle` — Planned |
| `createCoordinate` | Structural create-only | Create another coordinate and rebind encodings | Intentional |
| `createScale` | Stable resource, edit gap | Equivalent recreation only | `editScale` — Planned |
| `createDerivedData` | Immutable create-only | Create a new derived dataset ID | Intentional |
| `createRegressionBand` | Stable resource, edit gap | Generic area edit is insufficient for regression design | `editRegressionBand` — Planned |
| `createRegressionLine` | Stable resource, edit gap | Generic line edit is insufficient for regression design | `editRegressionLine` — Planned |
| `editSemantic` | Primitive | Assigns one semantic property | Complete |
| `createGraphics` | Primitive | `editGraphics` | Complete |
| `editGraphics` | Primitive | Edits one graphical property | Complete |

## Planned direct actions

Planned action은 사용자와 필요성 및 방향을 합의했지만 public type과 runtime에는 아직 없는
action이다. Contract readiness가 `Accepted`인 action만 구현을 시작할 수 있다.

| Planned action | Status | Contract readiness |
| --- | --- | --- |
| `editAreaMark` | Planned | Accepted |
| `editDensity` | Planned | Accepted |
| `editHorizontalGrid` | Planned | Accepted |
| `editLegend` | Planned | Accepted |
| `editLineMark` | Planned | Accepted |
| `editPointMark` | Planned | Accepted |
| `editRegressionBand` | Planned | Accepted |
| `editRegressionLine` | Planned | Accepted |
| `editScale` | Planned | Pending parameter review |
| `editTitle` | Planned | Accepted |
| `editVerticalGrid` | Planned | Accepted |

### Planned contract: mark edits

```typescript
editPointMark({
  target?: UserId;
  shape: "circle" | "square";
}): ChartProgram;

editLineMark({
  target?: UserId;
  strokeWidth: NonNegativeFinite;
}): ChartProgram;

editAreaMark({
  target?: UserId;
  fill?: NonEmptyString;
  opacity?: UnitInterval;
}): ChartProgram;
```

- `target`은 existing compatible mark selector이며 수정 property가 아니다. compatible mark가
  유일하면 생략할 수 있고 여러 개면 explicit target이 필요하다. target 외 최소 한 변경값을
  요구하며 `editPointMark`와 `editLineMark`는 현재 하나의 editable property만 가진다.
- 이 action들은 mark가 직접 소유한 graphical materialization config만 수정한다. dataset
  binding, field encoding, scale과 coordinate는 변경하지 않는다.
- `editPointMark.shape`는 field-driven `encodeShape`가 있으면 충돌하므로 오류다.
  `editAreaMark.fill`도 field-driven `encodeColor`가 있으면 오류지만 opacity는 독립적으로
  수정할 수 있다.
- 각 action은 대응하는 내부 wrapped `rematerializePointMark`, `rematerializeLineMark`,
  `rematerializeAreaMark`를 호출한다. 기존 legend recipe가 변경된 mark property에서 파생되면
  materialization plan이 `rematerializeLegend`도 호출한다.
- `createBarMark`는 현재 직접 소유한 editable parameter가 없으므로 `editBarMark`를 계획하지
  않는다. width, color, grouping, stack과 position은 기존 encoding action이 소유한다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 coverage는 구현 단계에서 추가한다.

### Planned contract: editDensity

```typescript
editDensity({
  target?: UserId;
  bandwidth?: "auto" | PositiveFinite;
  extent?: "auto" | OrderedFinitePair;
  steps?: IntegerAtLeast2;
  kernel?: DensityKernel;
}): ChartProgram;
```

- `target`은 existing density-encoded area layer selector다. eligible layer가 유일하면 생략할
  수 있고 여러 개면 explicit target이 필요하다. target 외 최소 한 변경값을 요구한다.
- 기존 density transform provenance에서 source, input field, groupBy와 output fields를 유지하고
  bandwidth/extent/steps/kernel 중 전달된 값만 교체한다. densityChannel, coordinate와
  value/density scale binding도 유지한다.
- 기존 derived dataset values를 덮어쓰지 않는다. `${target}DensityDataRevision${n}` 형태의
  deterministic namespaced 새 ID로 `createDensityData`를 호출하고 area layer를 explicit wrapped
  semantic action으로 rebind한다.
- rebind 뒤 이전 derived dataset을 참조하는 layer가 없으면 새 program에서 internal wrapped
  `releaseDerivedData`로 제거한다. source dataset이나 아직 참조되는 derived dataset은 제거하지
  않으며 이전 `ChartProgram`은 기존 dataset과 binding을 그대로 유지한다.
- affected value/density scales, area paths, axes와 grids를 deterministic materialization plan으로
  갱신한다. validation, derivation 또는 layout 실패 시 어느 branch도 바뀌지 않는다.
- source/field/groupBy/output names/densityChannel 변경은 accepted parameter가 아니다. 이 구조적
  변경은 새 area mark에 `encodeDensity`를 적용한다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 derivation, ownership, orphan-release,
  rematerialization coverage는 구현 단계에서 추가한다.

### Planned contract: regression component edits

```typescript
editRegressionBand({
  target?: UserId;
  color?: NonEmptyString;
  opacity?: UnitInterval;
}): ChartProgram;

editRegressionLine({
  target?: UserId;
  strokeWidth: NonNegativeFinite;
}): ChartProgram;
```

- `target`은 existing regression band/line layer ID다. compatible component가 유일하면 생략할
  수 있고 여러 개면 explicit target이 필요하다. target 외 최소 한 변경값을 요구한다.
- 이 action들은 regression component의 visual design만 수정한다. data, result fields,
  grouping, coordinate와 scale binding은 변경하지 않는다. 통계적 의미를 바꾸려면 새로운
  regression derivation과 component를 만든다.
- `editRegressionBand`는 regression-specific validation 뒤 Planned `editAreaMark`를 wrapped
  child로 호출해 color/fill과 opacity를 갱신한다.
- `editRegressionLine`은 Planned `editLineMark`를 wrapped child로 호출해 stroke width를
  갱신한다. generic child가 mark와 dependent legend rematerialization을 소유한다.
- band border, line color/dash/opacity는 corresponding create contract와 함께 확장하기 전까지
  accepted parameter가 아니다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 coverage는 구현 단계에서 추가한다.

### Planned contract: directional grid edits

```typescript
type EditGridOptions = {
  count?: PositiveInteger;
  values?: readonly Finite[] | "auto";
  color?: NonEmptyString;
  lineWidth?: NonNegativeFinite;
  strokeDash?: DashPattern;
};

editHorizontalGrid(options: EditGridOptions): ChartProgram;
editVerticalGrid(options: EditGridOptions): ChartProgram;
```

- 해당 방향의 기존 grid가 필수이며 최소 한 option을 요구한다. `scale`과 `coordinate`는
  stable binding이므로 edit parameter에 포함하지 않는다.
- `count`는 explicit `values`를 제거하고 scale에서 새 values를 생성한다. finite `values`
  array는 stored count를 제거하며, `values: "auto"`는 count와 explicit values를 모두 지우고
  axis/scale inference를 복원한다. `count`와 `values`를 함께 주면 오류다.
- style option은 전달된 property만 변경한다. 각 action은 대응하는 내부 wrapped
  `rematerializeHorizontalGrid` 또는 `rematerializeVerticalGrid`를 호출한다.
- `createGrid`는 aggregate create-only로 유지하며 별도 `editGrid`는 만들지 않는다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 coverage는 구현 단계에서 추가한다.

### Planned contract: editLegend

```typescript
editLegend({
  target?: UserId;
  position?: "right" | "bottom" | "top" | "left";
  align?: "left" | "center" | "right";
  direction?: "horizontal" | "vertical";
  columns?: PositiveInteger;
  offset?: NonNegativeFinite;
  titlePosition?: "top" | "left";
  title?: NonEmptyString | "auto" | false;
  symbol?: "auto" | LegendSymbolLayer | { layers: readonly LegendSymbolLayer[] };
  labels?: TextStyle;
  titleStyle?: TextStyle;
  itemGap?: PositiveFinite;
  border?: LegendBorder;
  count?: IntegerAtLeast2;
}): ChartProgram;
```

- `target`은 existing legend selector이며 수정 property가 아니다. eligible legend가 유일하면
  생략할 수 있고 여러 개면 explicit target이 필요하다. target 외 최소 한 변경값을 요구한다.
- `channels`는 semantic binding이므로 edit parameter에 포함하지 않는다. layout과 appearance만
  부분 수정하며 nested text style은 전달된 leaf를 기존 stored style에 merge한다.
- title 생략은 기존 값을 유지하고, string은 custom title, `"auto"`는 encoding provenance 기반
  inference 복원, `false`는 title graphic을 숨긴다.
- position과 layout 값은 기존 legend kind가 지원해야 한다. Planned left position은 categorical,
  point composite와 size legend를 지원하고 right-side layout을 mirror한다. point composite의
  top/bottom position은 계속 지원하지 않는다.
- action은 내부 wrapped `rematerializeLegend`를 호출한다. compatible point size block에서
  `count`가 바뀌면 stored count를 갱신하고 `rematerializeSizeLegend`도 호출한다.
- overlap, margin 부족, incompatible option과 없는/ambiguous target은 명확한 오류다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 coverage는 구현 단계에서 추가한다.

### Planned contract: editTitle

```typescript
editTitle({
  text?: NonEmptyString;
  subtitle?: NonEmptyString | false;
  position?: "top" | "bottom" | "left" | "right";
  align?: "left" | "center" | "right";
  offset?: Finite;
  gap?: NonNegativeFinite;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}): ChartProgram;
```

- 기존 chart title이 필수이며 최소 한 option을 요구한다. unknown option과 invalid value는
  program을 변경하기 전에 거부한다.
- 생략한 property는 기존 값을 유지한다. `text`와 string `subtitle`은 semantic text를
  교체하며 `subtitle: false`는 semantic subtitle과 concrete subtitle graphic을 제거한다.
- `titleStyle`과 `subtitleStyle`은 전달한 style leaf만 기존 stored style에 merge한다.
  생략한 style leaf는 유지한다.
- `position`, `align`, `offset`, `gap`과 style은 graphical materialization config를 갱신한다.
  position 변경은 같은 title resource를 새 edge에서 rematerialize하며 semantic text는 유지한다.
- action은 내부 wrapped `rematerializeTitle`을 호출해 최신 Canvas, margin, title config로
  concrete text를 다시 만든다. title/legend overlap이나 margin 부족은 layout error다.
- 기존 `ChartProgram`은 변경하지 않고 새로운 program을 반환하며 `editTitle` 아래에 semantic,
  graphic, rematerialization child action이 trace로 남는다.
- Status: Planned, NOT IMPLEMENTED. 실행 가능한 coverage는 구현 단계에서 추가한다.

## Planned behavior extensions

이 표는 새 method가 아니라 기존 assignment action의 accepted replacement behavior를 관리한다.

| Existing action behavior | Status | Contract readiness |
| --- | --- | --- |
| `encodeColor` reassignment | Planned | Accepted |
| `encodeGroup` reassignment | Planned | Accepted |
| `encodeShape` reassignment | Planned | Accepted |
| `encodeSize` reassignment | Planned | Accepted |
| `encodeStrokeDash` reassignment | Planned | Accepted |
| `encodeXOffset` reassignment | Planned | Accepted |
| `encodeX` reassignment | Planned | Accepted |
| `encodeY` reassignment | Planned | Accepted |
| `encodeY2` reassignment | Planned | Accepted |
| `encodeYRange` reassignment | Planned | Accepted |
| `encodeHistogram` reassignment | Planned | Accepted |

### Planned contract: scale-backed appearance reassignment

- 같은 target의 `encodeSize`, `encodeShape`, `encodeStrokeDash`를 다시 호출하면 기존 field와
  scale binding을 atomic하게 교체한다. 별도 `editSize`, `editShape`, `editStrokeDash` action은
  만들지 않는다.
- omitted scale ID는 현재 channel scale ID를 재사용한다. explicit new scale ID는 새 scale을
  만들고 encoding을 rebind하며 이전 named scale은 삭제하지 않는다. 같은 scale ID의
  domain/range/policy 변경은 accepted `editScale` contract를 wrapped child로 사용한다.
- semantic encoding, scale, mark, existing legend 순서로 explicit rematerialization한다.
  inferred legend title은 새 field로 갱신하고 custom title과 appearance config는 유지한다.
- `encodeSize`는 constant `encodeRadius`를 자동 제거하지 않고 기존 conflict를 유지한다.
  `encodeShape`는 새 domain/range로 heterogeneous point children과 symbols를 다시 만든다.
- `encodeStrokeDash`는 color/group series field와 compatible해야 한다. 서로 다른 field가 하나의
  line grouping을 요구하면 오류이며 기존 program은 유지한다.
- explicit ordinal range가 새 domain을 표현할 수 없거나 shared consumer가 incompatible하면
  전체 reassignment를 오류 처리한다.
- Status: Planned, NOT IMPLEMENTED. 구현은 `editScale` parameter contract가 Accepted된 뒤 진행한다.

### Planned contract: grouping reassignment

- `encodeColor` 재호출은 같은 target의 color field와 scale binding을 교체한다. point는 fill,
  line/area는 compatible path grouping, stacked bar는 stack groups, grouped bar는 owning
  `encodeXOffset` child까지 함께 갱신한다.
- reassignment에서 `layout`을 생략하면 현재 `"stack" | "group"` 결정을 유지한다. 첫 계약은
  stack/group 전환을 지원하지 않으며 explicit 다른 layout은 오류다. 전환은 companion 제거와
  scale cleanup 계약을 별도로 정한 뒤 추가한다.
- `encodeGroup` 재호출은 line/area path grouping field를 교체한다. color, shape 또는
  strokeDash가 grouping에 참여하면 같은 field여야 하며 library가 임의로 다른 channel을
  고치지 않는다. `encodeColor`가 소유한 companion group은 `encodeColor`가 wrapped child로 갱신한다.
- `encodeXOffset` 재호출은 grouped bar의 inner slot field와 ordinal scale binding을 교체한다.
  color group field와 같아야 하고 stack layout에서는 오류다. 새 domain order는 bar slot과
  dependent legend order에 함께 반영한다.
- 같은 scale ID의 policy 변경은 `editScale`, explicit new scale ID는 `createScale`을 wrapped
  child로 사용한다. 이전 named scale은 자동 삭제하지 않는다.
- semantic companion actions, scales, mark와 existing legend를 deterministic plan으로
  rematerialize하며 validation 실패 시 기존 program을 그대로 유지한다.
- Status: Planned, NOT IMPLEMENTED. 구현은 `editScale` parameter contract가 Accepted된 뒤 진행한다.

### Planned contract: positional reassignment

- `encodeX`와 `encodeY` 재호출은 같은 target의 field와 compatible scale binding을 교체한다.
  coordinate는 유지하며 explicit 다른 coordinate는 오류다. 첫 계약은 기존 fieldType,
  aggregate, bin과 stack mode를 유지하고 incompatible mode 전환을 지원하지 않는다.
- quantitative/temporal/ordinal position과 mean/count aggregate는 새 field에서 domain과
  aggregate values를 다시 계산한다. 같은 scale ID의 policy는 `editScale`, explicit new ID는
  `createScale`을 wrapped child로 사용한다.
- x reassignment는 mark, x axis와 vertical grid, y reassignment는 mark, y axis와 horizontal
  grid를 rematerialize한다. inferred guide title은 새 field로 갱신하고 custom title/appearance는
  유지한다.
- `encodeY2` 재호출은 ranged area의 upper field만 교체하며 existing lower y와 같은 scale,
  coordinate를 요구한다. `encodeYRange`는 lower/upper를 함께 요구하고 wrapped `encodeY`와
  `encodeY2`를 한 atomic hierarchy에서 호출한다.
- `encodeHistogram` 재호출은 binned x와 count y를 함께 교체한다. 새 field와 maxBins에서 bin
  boundaries, count domain, stack geometry, axes와 grids를 다시 계산하고 기존 color grouping과
  stack mode를 유지한다.
- validation 또는 downstream materialization이 실패하면 어느 semantic/graphic branch도
  바뀌지 않는다. 별도 positional edit action은 만들지 않는다.
- Status: Planned, NOT IMPLEMENTED. 구현은 `editScale` parameter contract가 Accepted된 뒤 진행한다.

## Planned parameter extensions

| Capability | Affected public actions | Status | Contract readiness |
| --- | --- | --- | --- |
| Point shape vocabulary | `createPointMark`, `editPointMark`, `encodeShape`, `createLegend` | Planned | Accepted |
| Area outline | `createAreaMark`, `editAreaMark`, `createRegression`, `createRegressionBand`, `editRegressionBand` | Planned | Accepted |
| Bar width modes | `encodeBarWidth` | Planned | Accepted |
| Aggregate vocabulary | `encodeY` | Planned | Accepted |
| Color layout vocabulary | `encodeColor`, `encodeXOffset`, `encodeY` | Planned | Accepted |
| Histogram bin controls | `encodeHistogram`, `encodeX` | Planned | Accepted |
| Density kernel vocabulary | `createDensityData`, `encodeDensity`, `editDensity` | Planned | Accepted |
| Filter predicate modes | `filterData` | Planned | Accepted |
| Regression method vocabulary | `createRegressionData`, `createRegression` | Planned | Accepted |
| Regression prediction interval | `createRegressionData`, `createRegression` | Planned | Accepted |
| Top x axis position | `createAxes`, x-axis create/edit actions | Planned | Accepted |
| Right y axis position | `createAxes`, y-axis create/edit actions | Planned | Accepted |
| Axis label format strings | axis label create/edit actions | Planned | Accepted |
| Left legend position | `createLegend`, `editLegend`, `createGuides` | Planned | Accepted |
| Chart title positions | `createTitle`, `editTitle` | Planned | Accepted |

### Planned contract: point shape vocabulary

```typescript
type PointShape =
  | "circle" | "square" | "diamond"
  | "triangle-up" | "triangle-down" | "triangle-left" | "triangle-right"
  | "plus" | "cross" | "star" | "hexagon" | "wye";
```

- 이 closed vocabulary의 canonical owner는 shared point-shape grammar다. `createPointMark.shape`,
  `editPointMark.shape`, `encodeShape.scale.range`, point materialization과 legend symbol recipe가
  같은 type, validation과 geometry recipe를 사용한다.
- automatic ordinal shape range는 위 순서를 사용한다. domain은 최대 12 distinct category이며
  shape를 자동 반복하지 않는다. explicit range도 vocabulary 안의 distinct shapes로 모든 domain
  value를 모호하지 않게 표현해야 한다.
- `plus`는 `+`, `cross`는 `×` geometry다. circle은 concrete circle, square는 rect, 나머지는
  backend-neutral concrete path로 저장하고 renderer는 semantic shape name을 해석하지 않는다.
- size encoding은 모든 recipe를 동일 target area로 정규화해 shape가 달라도 quantitative area
  의미를 유지한다. legend는 mark와 같은 normalized recipe를 사용한다.
- Status: Planned, NOT IMPLEMENTED. 12 shapes의 mark/encoding/legend/rendering parity와 category
  overflow coverage가 필요하다.

### Planned contract: area outline

- `createAreaMark`와 `createRegressionBand`는 `stroke?: NonEmptyString`과
  `strokeWidth?: NonNegativeFinite`를 받는다. stroke 생략은 no outline이며 string stroke에 width를
  생략하면 `1`을 사용한다. active stroke 없이 strokeWidth만 주면 오류다.
- `editAreaMark`와 `editRegressionBand`는 `stroke?: NonEmptyString | false`를 받는다. string은
  outline 생성/교체, `false`는 outline과 stored width를 제거한다. strokeWidth-only edit은 기존
  active stroke가 있을 때만 허용한다.
- `createRegression({ band })`는 stroke/strokeWidth를 `createRegressionBand`에 전달한다.
  outline은 graphical config이며 semanticSpec에는 저장하지 않는다.
- create/edit 및 Canvas/scale rematerialization 뒤에도 fill → stroke rendering order와 concrete
  path appearance가 유지되어야 한다.
- Status: Planned, NOT IMPLEMENTED. create/edit/removal, zero width, regression forwarding과
  browser/PNG parity coverage가 필요하다.

### Planned contract: bar width modes

```typescript
encodeBarWidth({
  target?: UserId;
  band?: UnitIntervalExclusiveZero;
  pixels?: PositiveFinite;
  paddingInner?: UnitIntervalLessThan1;
}): ChartProgram;
```

- `band`와 `pixels`는 mutually exclusive다. 첫 assignment에서 둘 다 생략하면 `band: 0.72`,
  `paddingInner: 0`을 사용한다. reassignment에서 width mode를 생략하면 현재 mode/value를 유지한다.
- band는 resolved inner slot width의 fraction이라 Canvas resize에 반응한다. pixels는 logical Canvas
  pixel의 고정 width이며 slot 중앙에 배치되고 output pixelRatio와 무관하다.
- paddingInner는 `[0, 1)`이며 grouped xOffset slots 사이의 spacing을 결정한다. width보다 큰 bar나
  명시적 overlap을 전역 오류로 만들지 않는다.
- 변경 시 xOffset band geometry와 bar x/width를 함께 rematerialize한다. outer x band, category
  centers와 legend domain order는 유지한다.
- Status: Planned, NOT IMPLEMENTED. mode switching, padding boundaries, Canvas resize와 overlap
  coverage가 필요하다.

### Planned contract: aggregate vocabulary

```typescript
type AggregateOperation =
  | "count" | "sum" | "mean" | "median" | "min" | "max"
  | "distinct" | "valid" | "missing"
  | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr"
  | "q1" | "q3" | "ciLower" | "ciUpper";
```

- `mean`과 `count`는 Implemented이며 나머지 값이 이 Planned extension의 구현 대상이다.
  모든 aggregate는 source row가 아니라 최종 x/category와 series grouping grain마다 계산한다.
- `count`는 group row 수를 센다. `valid`는 null/undefined/NaN이 아닌 field value, `missing`은
  그 반대, `distinct`는 valid value의 SameValueZero distinct count를 반환한다. 이 세 연산은
  nominal field에도 사용할 수 있다.
- `sum`, `mean`, `median`, `min`, `max`, `variance`, `varianceP`, `stdev`, `stdevP`, `stderr`,
  `q1`, `q3`, `ciLower`, `ciUpper`는 finite quantitative value만 받는다. `variance`와 `stdev`는
  sample denominator `n - 1`, `varianceP`와 `stdevP`는 population denominator `n`, `stderr`는
  sample standard deviation divided by `sqrt(n)`이다.
- `median`, `q1`, `q3`는 정렬된 finite values에 linear interpolation을 적용한 각각 0.5, 0.25,
  0.75 quantile이다. `ciLower`와 `ciUpper`는 mean에서 `1.96 * stderr`를 빼고 더한 deterministic
  two-sided 95% normal interval endpoint다.
- 필요한 valid sample이 없는 연산은 aggregate value를 만들지 않는다. sample variance, sample
  standard deviation, standard error와 confidence interval은 `n < 2`이면 value를 만들지 않는다.
  이 정책이 missing category나 zero-valued graphic을 자동 합성하지는 않는다.
- inferred guide title은 `${aggregate}(${field})`를 사용하고 explicit title은 보존한다. aggregate
  교체는 scale domain, mark geometry, axes와 grids를 deterministic plan으로 rematerialize한다.
- parameter가 필요한 `quantile`, 정렬 계약이 필요한 `first`/`last`, 원본 row를 선택하는
  `argmin`/`argmax`는 이 closed string vocabulary에 포함하지 않는다.
- Status: Planned, NOT IMPLEMENTED. 각 operation의 representative/empty/singleton/missing-value
  fixtures와 line/bar grain, title/domain/rematerialization coverage가 필요하다.

### Planned contract: color layout vocabulary

```typescript
type ColorLayout =
  | "stack" | "fill" | "group" | "overlay" | "center" | "diverging";
```

- `encodeColor.layout`이 color series의 graphical arrangement를 소유한다. 기존 `"stack"`과
  `"group"`은 Implemented이며 나머지 네 값이 이 Planned extension의 구현 대상이다.
- `"stack"`은 각 x/category에서 series의 absolute quantitative value를 zero baseline부터
  누적한다. `"fill"`은 같은 stack partition의 non-negative values를 합계 1로 정규화해 누적하며
  auto y domain은 `[0, 1]`이다. partition 합계가 0인 위치에는 graphic을 합성하지 않는다.
- `"group"`은 bar에만 적용하고 wrapped `encodeXOffset`으로 series를 나란히 배치한다. 이것은
  line/area path를 field별로 나누는 별도 action `encodeGroup`과 다른 개념이다.
- `"overlay"`는 bar 또는 area series를 같은 baseline과 coordinate에 겹쳐 그린다. series domain의
  deterministic order를 rendering order로 사용하며 library가 opacity를 임의로 바꾸거나 overlap을
  오류로 만들지 않는다.
- `"center"`는 stacked area에만 적용한다. 각 x sample에서 전체 stack 두께의 절반을 zero 양쪽에
  배치하는 silhouette baseline을 사용한다. `"diverging"`은 stackable bar 또는 area에서 positive
  values는 zero 위로, negative values는 zero 아래로 각각 누적한다.
- 첫 구현의 compatibility matrix는 bar에 `"stack" | "fill" | "group" | "overlay" |
  "diverging"`, area에 `"stack" | "fill" | "overlay" | "center" | "diverging"`를 허용한다.
  point/line에는 layout을 허용하지 않으며 series 분리는 기존 color/group materialization을 사용한다.
- resolved layout은 semantic color encoding에 저장한다. `"group"`은 xOffset companion, 나머지
  stack layouts는 y stack policy를 explicit wrapped child action으로 설정한다. y scale, mark geometry,
  axes와 grids를 deterministic plan으로 rematerialize하고 color scale과 legend domain order는 유지한다.
- 기존 layout에서 다른 layout으로 재할당하는 전환은 companion 제거, y policy cleanup과 scale
  conflict를 원자적으로 처리하는 별도 reassignment contract가 구현될 때까지 지원하지 않는다.
- Status: Planned, NOT IMPLEMENTED. mark compatibility, positive/negative/zero partitions, deterministic
  overlap order, normalized/centered domains와 rejected layout-transition coverage가 필요하다.

### Planned contract: histogram bin controls

```typescript
encodeHistogram({
  field: FieldName;
  target?: UserId;
  maxBins?: PositiveInteger;
  binStep?: PositiveFinite;
  binBoundaries?: readonly [Finite, Finite, ...Finite[]];
  // existing coordinate, stack, xScale and yScale options
}): ChartProgram;
```

- `maxBins`, `binStep`, `binBoundaries`는 mutually exclusive다. 셋 다 생략하면 existing default
  `maxBins: 10`을 사용한다. aggregate는 선택한 mode를 wrapped `encodeX.bin`에 그대로 전달한다.
- `maxBins`는 현재처럼 data와 scale policy에서 최대 개수에 가까운 nice bins를 추론한다.
  `binStep`은 exact positive width이며 auto domain에서는 zero를 anchor로 data minimum을 내림하고
  maximum을 올림한 step 배수를 first/last boundary로 사용한다.
- explicit x domain과 `binStep`을 함께 쓰면 domain endpoints가 zero-anchored step grid에 놓이고
  span이 step의 정수배여야 한다. explicit domain이 data extent를 포함하지 않으면 오류이며
  `nice`는 explicit step/domain을 바꾸지 않는다.
- `binBoundaries`는 최소 두 개의 strictly increasing distinct finite values다. irregular intervals를
  허용하고 first/last boundary가 전체 finite data extent를 포함해야 한다. boundaries가 x domain을
  소유하며 별도 explicit x domain은 같은 endpoints일 때만 허용한다.
- 모든 mode에서 interval은 `[lower, upper)`이고 마지막 interval만 upper endpoint를 포함한다.
  빈 interval은 semantic bin에는 남지만 default materialization은 zero rect를 합성하지 않는다.
- resolved mode와 concrete boundaries를 semantic state에 저장한다. x/y scale, bars, histogram axis
  ticks, vertical grid와 color stack consumers를 deterministic plan으로 rematerialize한다.
- Status: Planned, NOT IMPLEMENTED. exclusivity/defaults, negative/constant data, exact and irregular
  boundaries, explicit domain conflicts, empty bins와 guide/rematerialization coverage가 필요하다.

### Planned contract: density kernel vocabulary

```typescript
type DensityKernel =
  | "gaussian" | "epanechnikov" | "uniform" | "triangular";
```

- `createDensityData.kernel`, `encodeDensity.kernel`, `editDensity.kernel`은 하나의 shared closed
  vocabulary와 pure kernel grammar를 사용한다. 생략 시 existing behavior인 `"gaussian"`이다.
- normalized kernel recipe는 `u = (x - sample) / bandwidth`에 대해 Gaussian
  `exp(-u² / 2) / sqrt(2π)`, Epanechnikov `0.75 * (1 - u²)`, uniform `0.5`, triangular
  `1 - abs(u)`를 사용한다. 마지막 세 kernel은 `abs(u) <= 1` 밖에서 0이다.
- 각 group의 estimate는 `sum(K(u)) / (n * bandwidth)`다. kernel이 달라도 bandwidth의 단위와
  shared sample grid, group first-appearance order, output row ordering은 바뀌지 않는다.
- `bandwidth: "auto"`는 kernel과 무관하게 existing deterministic Scott-rule width를 사용하고
  resolved positive number를 transform provenance에 저장한다. provenance에는 resolved kernel도
  반드시 저장한다.
- `encodeDensity`는 kernel을 wrapped `createDensityData`로 전달한다. `editDensity`에서 kernel을
  바꾸면 source dataset을 수정하지 않고 namespaced derived revision을 만든 뒤 consumer를 explicit
  rebind하고 density scales, area paths, axes와 grids를 rematerialize한다.
- Status: Planned, NOT IMPLEMENTED. kernel formula fixtures, default/invalid values, grouped/ungrouped
  estimates, provenance, edit revision과 browser/PNG path parity coverage가 필요하다.

### Planned contract: filter predicate modes

```typescript
type FilterComparison =
  | { op: "eq" | "neq"; value: unknown }
  | { op: "lt" | "lte" | "gt" | "gte"; value: Finite | string };

type FilterRange = {
  min: Finite | string;
  max: Finite | string;
  inclusive?: boolean;
};
```

- `filterData`는 existing `oneOf`, Planned `predicate`, Planned `range` 중 정확히 하나를 요구한다.
  `inclusive` 기본값은 `true`이며 false이면 양쪽 endpoint를 모두 제외한다.
- `eq`/`neq`는 existing membership과 같은 strict (`===`) scalar equality를 사용한다. ordered
  comparison과 range는 field value와 operand가 모두 finite number이거나 모두 string이어야 하며
  string은 ECMAScript lexicographic order로 비교한다. missing 또는 incompatible value는 row를 유지하지 않는다.
- range endpoints는 같은 type이고 `min <= max`여야 한다. `min === max`는 inclusive range에서
  equality filter, exclusive range에서는 empty result가 된다. empty derived dataset은 허용한다.
- resolved predicate mode와 owned operand/range를 filter transform provenance에 저장한다. wrapped
  `materializeFilteredData`가 source order를 보존해 immutable derived values를 만들며 source는 변하지 않는다.
- Status: Planned, NOT IMPLEMENTED. 각 operator/type, endpoint inclusivity, sparse/mixed rows,
  exclusivity, ownership과 empty-result coverage가 필요하다.

### Planned contract: regression method vocabulary

```typescript
type RegressionMethod = "linear" | "polynomial" | "loess";
```

- `method` 기본값은 existing `"linear"`다. `"polynomial"`은 `degree?: PositiveInteger`를 받고
  기본값은 `2`다. degree 1은 linear fit과 수치적으로 같은 결과를 내지만 provenance에는
  polynomial method와 degree 1을 그대로 저장한다.
- polynomial은 group마다 degree + 1개의 distinct finite x와 residual degrees of freedom을 위한
  최소 degree + 2개의 valid rows를 요구한다. stable least-squares fit을 사용하고 raw-x basis의
  coefficients를 낮은 차수부터 provenance에 저장하며 observed unique x 오름차순으로 평가한다.
- `"loess"`는 `span?: UnitIntervalExclusiveZero`를 받고 기본값은 `0.75`다. group별 valid row의
  `ceil(span * n)`개 nearest neighbors를 사용하는 tricube-weighted local-linear fit이며 최소 두
  neighbor를 사용한다. 거리 tie는 source order로 해소하고 robust reweighting은 첫 계약에 포함하지 않는다.
- `degree`는 polynomial에서만, `span`은 loess에서만 허용한다. 모든 method는 group first-appearance
  order와 group 안의 observed unique x 오름차순 output을 유지하고 resolved defaults와 parameters를
  transform provenance에 저장한다.
- 첫 LOESS 계약은 fitted rows와 regression line만 만든다. `confidence`, `interval` 또는 object
  band option을 LOESS와 함께 주면 오류이며 `createRegression({ method: "loess" })`는 wrapped
  `createRegressionBand`를 생략하고 line만 만든다.
- Status: Planned, NOT IMPLEMENTED. exact coefficient/fit fixtures, degree/span boundaries, singular
  groups, deterministic ties, grouped ordering, line-only trace와 rematerialization coverage가 필요하다.

### Planned contract: regression prediction interval

- `interval: "prediction"`은 linear와 polynomial regression에서 지원한다. existing `"mean"`은
  fitted mean response의 uncertainty를 나타내고 prediction은 새 observation의 residual uncertainty까지
  포함하므로 같은 confidence에서 더 넓거나 같다.
- confidence 기본값과 `(0, 1)` contract는 유지한다. linear/polynomial mean standard error가
  `sqrt(residualVariance * leverage)`라면 prediction standard error는
  `sqrt(residualVariance * (1 + leverage))`이고 같은 residual degrees of freedom의 Student-t critical
  value로 lower/upper를 계산한다.
- method, interval, confidence와 resolved model parameters를 provenance에 저장한다. `createRegression`
  은 이를 wrapped `createRegressionData`로 전달하고 existing band action이 선택된 interval output을
  그린다. LOESS에서는 prediction과 mean interval 모두 첫 계약에서 허용하지 않는다.
- `createRegression.band`는 Planned `false | RegressionBandOptions`를 받는다. linear/polynomial에서
  생략하면 existing default band를 만들고 false이면 명시적으로 생략한다. LOESS에서는 생략이
  line-only를 의미하며 false도 허용하지만 object band는 오류다.
- Status: Planned, NOT IMPLEMENTED. mean/prediction inequality, confidence boundaries, polynomial
  leverage, band opt-out, LOESS rejection과 semantic/graphic provenance coverage가 필요하다.

### Planned contract: mirrored Cartesian axis positions

- x-axis position은 existing `"bottom"`과 Planned `"top"`, y-axis position은 existing `"left"`와
  Planned `"right"`를 사용한다. 생략 default는 bottom/left를 유지한다.
- `createXAxis`/`createYAxis`와 parent `createAxes`는 선택한 position을 line, ticks/labels와 title
  child에 전달한다. 모든 대응 leaf create/edit action도 같은 channel vocabulary를 공유한다.
- top tick은 plot에서 위쪽, right tick은 오른쪽을 향한다. label/title offset은 해당 edge에서
  바깥쪽으로 적용한다. top x title 기본 rotation은 `0`, right y title 기본 rotation은
  `Math.PI / 2`이며 explicit rotation은 항상 우선한다.
- 현재 channel당 semantic axis 하나라는 제한은 유지한다. position은 기존 axis resource의 edge를
  정하며 한 channel에 top+bottom 또는 left+right axis를 동시에 생성하지 않는다.
- leaf action을 직접 사용하면 component별 edge를 명시할 수 있지만 complete-axis action은 모든 child에
  한 position을 적용한다. component occupied bounds는 해당 Canvas margin 안에 들어가야 한다.
- Canvas 또는 scale 변경과 position edit은 line, ticks, labels와 title의 concrete geometry를
  deterministic plan으로 rematerialize한다. coordinate와 scale binding은 바뀌지 않는다.
- Status: Planned, NOT IMPLEMENTED. complete/leaf create/edit, outward geometry, default rotations,
  insufficient top/right margins와 Canvas/scale rematerialization coverage가 필요하다.

### Planned contract: axis label format strings

```typescript
type AxisFormatString =
  | ".0f" | ".1f" | ".2f"
  | ".0%" | ".1%"
  | ".2e"
  | "%Y" | "%Y-%m" | "%Y-%m-%d";
```

- existing `"auto"`와 `{ decimals: NonNegativeInteger }`를 유지하고 shared axis-label formatter가
  Planned strings를 추가한다. create/edit label leaf와 ticks-and-labels aggregate가 같은 grammar를 쓴다.
- `.nf`는 locale-independent fixed decimals, `.n%`는 value에 100을 곱한 fixed decimals와 `%`,
  `.2e`는 두 자리 exponential notation을 만든다. quantitative scale에서만 허용한다.
- `%Y`, `%Y-%m`, `%Y-%m-%d`는 UTC calendar fields를 zero-pad해 조합하며 time scale에서만 허용한다.
  ordinal scale은 계속 `"auto"`만 허용한다.
- arbitrary format string과 formatter callback은 허용하지 않는다. stored format token은 graphical guide
  config에 남고 browser/Node renderer가 아니라 shared formatter가 concrete text를 생성한다.
- format edit은 tick values와 semantic guide를 바꾸지 않고 label text와 occupied bounds만
  rematerialize한다. 새 text가 margin에 맞지 않으면 layout error다.
- Status: Planned, NOT IMPLEMENTED. 각 token, negative/zero/large number, UTC boundary, wrong-scale,
  edit switching과 browser/PNG text parity coverage가 필요하다.

### Planned contract: left legend position

- `createLegend.position`과 Planned `editLegend.position`은 existing `"right" | "bottom" | "top"`에
  `"left"`를 추가한다. chart-independent default는 계속 `"right"`다.
- left는 right-side block geometry를 mirror하고 plot left edge에서 `offset`만큼 바깥에 둔다.
  item 내부 symbol→label order와 domain order는 유지하며 multiple legend block은 deterministic
  top-to-bottom order를 사용한다.
- categorical, point composite와 quantitative size block을 지원한다. 첫 left contract는 side-layout
  parity를 위해 `align: "center"`, vertical flow만 허용하며 point composite top/bottom은 여전히 지원하지 않는다.
- titlePosition, symbol recipes, labels/titleStyle, itemGap, border와 count는 기존 계약을 그대로 사용한다.
  left margin의 actual occupied bounds를 검증하고 title/chart/다른 legend와 겹치면 오류다.
- Canvas resize, scale/domain, symbol recipe 또는 position edit은 legend와 size block을 rematerialize한다.
  semantic channels, scale binding과 item order는 유지한다.
- Status: Planned, NOT IMPLEMENTED. categorical/composite/size parity, position edits, border/title variants,
  multiple blocks, insufficient margin와 Canvas rematerialization coverage가 필요하다.

### Planned contract: chart title positions

- `createTitle.position`과 Planned `editTitle.position`은 `"top" | "bottom" | "left" | "right"`를
  사용하며 default는 existing `"top"`이다.
- top/bottom은 rotation 0, left는 `-Math.PI / 2`, right는 `Math.PI / 2`를 사용한다. title과 subtitle은
  하나의 rotated block으로 배치하고 gap/style contract는 유지한다.
- top/bottom에서 align left/center/right는 plot x start/center/end다. left/right에서는 같은 vocabulary를
  edge 진행 방향의 start(top)/center/end(bottom)로 해석한다.
- offset은 existing top behavior를 보존하는 signed Canvas-axis translation이다. top/bottom에서는 y,
  left/right에서는 x에 더한다. position edit은 semantic text를 유지하고 graphical config와 concrete
  title/subtitle coordinates만 갱신한다.
- actual rotated occupied bounds가 해당 margin 안에 들어가야 하며 같은 edge의 legend 또는 다른 reserved
  block과 겹치면 오류다. library가 Canvas나 margin을 자동 확장하거나 다른 edge로 이동하지 않는다.
- wrapping, maxWidth와 lineHeight는 이 position contract에 포함하지 않고 Proposed로 유지한다.
- Status: Planned, NOT IMPLEMENTED. four positions, align/offset/rotation, subtitle blocks, edit transitions,
  collision/margin errors와 Canvas rematerialization coverage가 필요하다.

## Internal materialization inventory

이 표는 runtime과 trace에 존재하지만 public type과 direct action 계약에서 제외되는 wrapped
action의 전체 목록이다. 각 action은 해당 state 또는 graphical consumer를 소유한 public
domain action을 통해서만 실행한다.

| Internal action | Owning domain |
| --- | --- |
| `materializeDensityData` | density data actions |
| `materializeFilteredData` | filter data actions |
| `materializeRegressionData` | regression data actions |
| `rematerializeAreaMark` | area mark and encoding actions |
| `rematerializeBarMark` | bar mark and encoding actions |
| `rematerializeGrid` | grid aggregate and Canvas actions |
| `rematerializeHorizontalGrid` | horizontal grid and Canvas actions |
| `rematerializeLegend` | legend, encoding, scale, and Canvas actions |
| `rematerializeLineMark` | line mark and encoding actions |
| `rematerializePointMark` | point mark and encoding actions |
| `rematerializeScale` | scale-owning encoding and Canvas actions |
| `rematerializeSizeLegend` | point size legend, scale, and Canvas actions |
| `rematerializeTitle` | title and Canvas actions |
| `rematerializeVerticalGrid` | vertical grid and Canvas actions |

## Internal guide component inventory

이 action들은 public `createLegend` facade가 호출하는 peer wrapped component다. 둘 다 public
type과 direct action 계약에서 제외되지만 hierarchy는 `trace`에 남는다.

| Internal action | Public owner | Role |
| --- | --- | --- |
| `createCategoricalLegend` | `createLegend` | categorical color/shape/stroke-dash block |
| `createSizeLegend` | `createLegend` | quantitative equal-area point-size block |

## 상세 계약 작성 규칙

각 action section은 다음 순서로 작성한다.

1. signature, 목적, 필수 state와 action-level 결과
2. parameter별 타입, 필수 여부, accepted values, default/inference
3. parameter 상호작용과 우선순위
4. semantic, graphic/rendering, rematerialization 영향
5. 오류 조건과 실행 가능한 coverage 근거

대칭인 x/y guide action은 같은 parameter contract를 공유할 수 있지만, 전체 현황과
상세 heading에는 두 action을 모두 명시한다.

## User-facing actions

### Canvas

#### `createCanvas`

- Signature: `createCanvas({ width?, height?, background?, margin? })`
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
- 오류와 상호작용: unknown option, invalid dimension/color/margin, 두 번째 Canvas를 거부한다.
- Coverage: `test/unit/actions/canvas/create-canvas.test.js`,
  `test/unit/grammar/layout/canvas-layout.test.js`가 defaults, partial options, invalid values와
  duplicate를 검증한다.

#### `editCanvas`

- Signature: `editCanvas({ width?, height?, background?, margin? })`
- 목적과 필수 state: 기존 Canvas의 한 개 이상 property를 immutable하게 편집한다.
- `width`, `height`, `background`, `margin`
  - Status: Implemented. 값 계약은 `createCanvas`와 같다. 생략한 property는 기존 값을 유지한다.
  - Effect: width/height/margin은 auto-range scale을 시작점으로 모든 registered consumer의
    deterministic materialization plan을 실행한다. background만 바꾸면 consumer를 다시 만들지 않는다.
  - Interaction: explicit scale range는 Canvas bounds 변경으로 재계산되지 않는다.
- 오류: 빈 edit, Canvas 부재, unknown option과 invalid resolved bounds를 거부한다.
- Coverage: `test/unit/actions/canvas/edit-canvas.test.js`가 partial edit, margin-only edit,
  auto/explicit range 차이와 rematerialization을 검증한다.

### Data

#### `createData`

- Signature: `createData({ id, values })`
- `id`
  - Status: Implemented. 필수 user-defined ID다. 지원 문자 규칙을 통과하고 기존 dataset과
    중복되지 않아야 한다.
  - Effect: `semanticSpec.datasets`의 key 역할을 하며 성공 후 current data가 된다.
- `values`
  - Status: Implemented. 필수 array이며 각 row는 plain object여야 한다. 빈 배열, nested array,
    object-valued cell은 허용한다.
  - Effect: caller-owned 값을 deep clone/freeze하여 immutable source dataset으로 저장한다.
    graphic output은 만들지 않는다.
- 오류: missing/invalid ID, non-array, non-object row와 duplicate dataset을 거부한다.
- Coverage: `test/unit/actions/data/create-data.test.js`가 empty/multiple data, ownership,
  trace summary, invalid values와 duplicates를 검증한다.

#### `filterData`

- Signature: `filterData({ id, source?, field, oneOf?, predicate?, range? })`
- `id`: Implemented, 필수 derived dataset ID. 새 ID여야 한다.
- `source`: Implemented, dataset ID. 생략하면 current data를 사용하며 유일하게 추론되지 않으면 오류다.
- `field`: Implemented, 비어 있지 않은 필드 이름. 각 row에 값이 없어도 비교 결과가 false일 수 있다.
- `oneOf`: Implemented, scalar accepted-value array. strict equality membership으로 row를 유지하며
  transform input은 소유권 복사된다.
- `predicate`, `range`: Planned comparison/range modes이며 oneOf와 mutually exclusive다.
- Effect: filter provenance를 가진 immutable derived dataset을 만들고 wrapped
  `materializeFilteredData`가 concrete values를 저장한다. 기존 source는 변하지 않는다.
- Coverage: `test/unit/actions/data/filter-data.test.js`가 source inference, scalar types,
  ownership, invalid options와 primitive equivalence를 검증한다.

#### `createRegressionData`

- Signature: `createRegressionData({ id, source?, x, y, groupBy?, method?, degree?, span?, confidence?, interval? })`
- `id`, `source`: Implemented. 새 derived ID와 existing source ID이며 source는 current data로 추론된다.
- `x`, `y`: Implemented. 필수 quantitative field 이름이다. finite numeric values가 필요하다.
- `groupBy`: Implemented. optional field 이름이며 생략 시 하나의 regression을 만든다. 값의 first
  appearance order가 group order다.
- `method`: Implemented `"linear"`; Planned `"polynomial" | "loess"`. 기본값은 `"linear"`다.
- `degree`, `span`: Planned method-specific parameter다. polynomial degree 기본값은 `2`, LOESS span
  기본값은 `0.75`이며 다른 method와 함께 주면 오류다.
- `confidence`: Implemented. `(0, 1)`의 finite number이며 기본값은 `0.95`다. Student-t
  mean-response confidence bounds의 폭을 바꾼다.
- `interval`: Implemented `"mean"`; Planned `"prediction"`은 linear/polynomial에서만 허용한다.
  기본값은 `"mean"`이다. 첫 LOESS 계약에서는 confidence/interval output을 만들지 않는다.
- Effect: source, fields, grouping, resolved defaults를 transform provenance에 저장하고 observed
  unique x별 fitted y/lower/upper row를 materialize한다. graphic은 직접 만들지 않는다.
- Coverage: `test/unit/actions/data/regression-data.test.js`와
  `test/charts/regression-scatterplot/reference-values.test.js`가 grouped/ungrouped 값,
  confidence bounds와 invalid/degenerate groups를 검증한다. 여러 confidence 대표값 coverage는 부분적이다.

#### `createDensityData`

- Signature: `createDensityData({ id, source?, field, groupBy?, bandwidth?, extent?, steps?, kernel?, as? })`
- `id`, `source`, `field`, `groupBy`: Implemented. 새 derived ID, existing source, 필수 quantitative
  field와 optional grouping field다.
- `bandwidth`
  - Status: Implemented. positive finite number 또는 `"auto"`; 기본은 `"auto"`다.
  - Effect: Gaussian kernel 폭을 결정한다. auto는 deterministic Scott-rule 결과를 provenance에
    concrete number로 다시 저장한다.
- `extent`
  - Status: Implemented. `"auto"` 또는 오름차순 finite `[min, max]`; 기본은 `"auto"`다.
  - Effect: 모든 group이 공유하는 sample grid의 시작과 끝을 결정한다.
- `steps`
  - Status: Implemented. 2 이상의 integer이며 기본값은 `100`이다.
  - Effect: inclusive grid의 row 수와 area path resolution을 결정한다.
- `kernel`
  - Status: Planned. shared `DensityKernel`이며 기본값은 `"gaussian"`이다.
  - Effect: bandwidth와 sample grid를 유지하면서 각 sample의 normalized weight recipe를 결정한다.
- `as`
  - Status: Implemented. 서로 다른 두 개의 non-empty field 이름이며 기본은
    `[`${field}_value`, `${field}_density`]`다.
  - Effect: derived row와 이후 encoding이 참조할 output field 이름을 결정한다.
- Effect: grouped KDE provenance와 deterministic values를 저장한다. Planned kernel은 provenance에
  resolved value로 기록한다.
- Coverage: `test/unit/actions/data/density-data.test.js`와
  `test/charts/density-area/reference-values.test.js`가 auto/explicit bandwidth, extent,
  grouped/ungrouped, ownership과 오류를 검증한다. steps의 여러 경계/대표 조합은 부분적이다.

#### `createDerivedData`

- Signature: `createDerivedData({ id, source, transform })`
- `id`: Implemented, 필수 새 dataset ID.
- `source`: Implemented, 필수 existing dataset ID.
- `transform`: Implemented, 필수 transform definition array. 현재 filter/regression/density schema만
  semantic validation이 가능하며 값 materialization은 해당 전용 action이 담당한다.
- Effect: source와 transform provenance만 저장하고 values는 만들지 않는다.
- 오류: duplicate ID, unknown source, invalid/empty transform schema를 거부한다.
- Coverage: transform schema는 data action 및 `test/charts/regression-scatterplot/semantic.test.js`에서
  검증되지만 각 transform을 이 low-level action으로 직접 호출하는 조합은 부분적이다.

### Marks

#### `createPointMark`

- Signature: `createPointMark({ id, data?, shape? })`
- `id`: Implemented, 필수 새 layer/graphic ID.
- `data`: Implemented, existing dataset ID. 생략하면 current data를 사용한다.
- `shape`
  - Status: Implemented. `"circle" | "square"`, 기본값 `"circle"`.
  - Planned: shared `PointShape` 12종. automatic range와 legend도 같은 vocabulary를 사용한다.
  - Effect: semantic mark는 항상 `point`지만 concrete collection child는 circle 또는 rect가 된다.
- Effect: dataset cardinality와 같은 길이의 point graphic collection을 만들며 아직 위치 property가
  없으므로 encoding 전에는 보이지 않을 수 있다.
- Coverage: `test/unit/actions/marks/create-point-mark.test.js`가 두 shape, empty data,
  multiple marks, inference, conflicts와 trace를 검증한다.

#### `createLineMark`

- Signature: `createLineMark({ id, data?, strokeWidth? })`
- `id`, `data`: `createPointMark`와 같은 ID/data 계약이다.
- `strokeWidth`: Implemented, non-negative finite number이며 concrete default는 `2`다. 명시한 값은
  mark materialization config에 저장되어 path 재생성 후에도 유지된다.
- Effect: semantic `line` layer와 길이 0의 path collection을 만든다. x/y encoding이 완성되기
  전에는 path가 없다.
- Coverage: `test/unit/actions/marks/create-line-mark.test.js`가 default/explicit data,
  empty dataset, invalid width와 conflicts를 검증한다.

#### `createBarMark`

- Signature: `createBarMark({ id, data? })`
- `id`, `data`: 필수 새 ID와 optional existing dataset/current data다.
- Effect: semantic `bar` layer와 길이 0의 rect collection을 만든다. 관련 x/y/grouping semantics가
  완성될 때 rect가 materialize된다.
- Coverage: `test/unit/actions/marks/create-bar-mark.test.js`가 inference, empty data,
  invalid options와 conflicts를 검증한다.

#### `createAreaMark`

- Signature: `createAreaMark({ id, data?, fill?, opacity? })`
- `id`, `data`: 필수 새 ID와 optional existing/current dataset이다.
- `fill`: Implemented, non-empty color string. 기본값은 theme mark color `"#4c78a8"`다.
- `opacity`: Implemented, `[0, 1]` finite number. 기본값은 `0.2`다.
- `stroke`, `strokeWidth`: Planned. optional outline color와 non-negative width이며 stroke 없이
  width만 지정할 수 없다.
- Effect: semantic `area` layer와 빈 path collection을 만들고 fill/opacity는 graphical config에
  저장한다. ranged y 또는 density encoding이 완성되면 closed path를 만든다.
- Coverage: density/regression chart와 area materialization tests가 default와 representative
  appearance를 검증한다. fill vocabulary와 opacity 양 끝값의 direct action coverage는 부분적이다.

### Shared scale option contract

Encoding의 `scale` object는 channel에 따라 아래 subset을 사용한다.

- `id`: Implemented. user-defined scale ID; 생략하면 channel 이름(`x`, `y`, `color`, `size`,
  `shape`, `strokeDash`, `xOffset`)을 사용한다.
- `type`: Implemented. position은 field type에 따라 `linear | time | ordinal`, color/shape/dash/offset은
  `ordinal`, size는 `linear`만 허용한다.
- `domain`: Implemented. `"auto"` 또는 type에 맞는 explicit array. explicit domain은 data inference,
  `zero`, `nice`보다 우선한다.
- `range`: Implemented. `"auto"` 또는 type/channel에 맞는 explicit array. position auto range는
  Canvas plot bounds를 사용한다.
- `nice`: Implemented for linear/time position scale. boolean이며 auto domain만 읽기 좋은 경계로
  확장한다. ordinal에는 허용되지 않는다.
- `zero`: Implemented for linear scale. boolean이며 auto domain에만 zero를 포함한다. explicit domain이
  있으면 적용되지 않는다.
- `palette`: Implemented for color scale. palette name이며 `range`와 동시에 사용할 수 없다.
- Planned/Proposed: 추가 palette vocabulary와 interpolated color scale은 아직 확정되지 않았다.

### Position and grouping encodings

#### `encodeX`

- Signature: `encodeX({ field, target?, fieldType?, scale?, coordinate?, aggregate?, bin?, stack? })`
- `field`: Implemented, dataset에 존재하는 field. 현재 supported mark grain에 맞는 값 type이 필요하다.
- `target`: Implemented, mark ID. 생략하면 current mark, 아니면 유일한 eligible mark를 추론한다.
- `fieldType`: Implemented. point/area는 `quantitative`, line은 `temporal`, bar는 `quantitative`
  bin 또는 `ordinal`을 지원한다. 생략 시 지원되는 mark별 기본을 사용한다.
- `scale`: Implemented. 위 shared contract를 사용한다. 기본 ID는 `x`, auto range는 left-to-right plot bounds다.
- `coordinate`: Implemented, coordinate ID. 생략 시 positional action이 Cartesian `main` coordinate를
  만들거나 existing compatible coordinate를 사용하고 layer에 저장한다.
- `bin.maxBins`: Implemented for quantitative bar x. positive integer이며 histogram aggregate의
  default는 `10`; bin boundaries와 bar x/width를 결정한다. Planned `bin.step`과
  `bin.boundaries`는 exact width 또는 explicit irregular intervals를 저장한다.
- `aggregate`, `stack`: x의 현재 supported combinations에는 사용되지 않으며 잘못된 combination은 거부된다.
- Effect: x encoding과 scale을 semantic state에 저장하고 scale 및 compatible mark/guide consumers를
  rematerialize한다.
- Coverage: position, histogram, ordinal bar, temporal chart tests가 주요 mark 조합을 검증한다.
  explicit scale option의 전체 교차조합은 부분적이다.

#### `encodeY`

- Signature: `encodeY({ field?, target?, fieldType?, scale?, coordinate?, aggregate?, bin?, stack? })`
- `field`: point/area/line/ordinal-bar에서는 필수 field다. histogram count y는 x field에서 추론한다.
- `target`, `fieldType`, `scale`, `coordinate`: x와 같은 selection/storage contract이며 auto range는
  bottom-to-top plot bounds다.
- `aggregate`: Implemented values `"mean" | "count"`. line과 ordinal bar는 mean, histogram은 count를
  사용한다. Planned values는 `"sum" | "median" | "min" | "max" | "distinct" | "valid" |
  "missing" | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr" | "q1" | "q3" |
  "ciLower" | "ciUpper"`이며 raw quantitative point/area는 생략한다.
- `stack`: Implemented values `"zero" | null`. histogram color series는 zero stack, grouped ordinal
  bar는 `null`이다.
- `bin`: 현재 y에서는 지원되지 않는다.
- Effect: y semantic, scale, bar aggregate grain 또는 line mean grain을 저장하고 mark geometry와
  existing guides를 rematerialize한다.
- Coverage: supported charts가 raw/mean/count, zero/null 조합을 검증한다. unsupported 조합과
  scale override의 pairwise coverage는 부분적이다.

#### `encodeXOffset`

- Signature: `encodeXOffset({ field, target?, fieldType?, scale? })`
- `field`: Implemented, nominal grouping field. ordinal x/mean y/non-stacked bar에만 허용된다.
- `target`: optional eligible bar ID.
- `fieldType`: Implemented, 유일한 값 `"nominal"`, 기본값도 nominal이다.
- `scale`: ordinal scale contract; 기본 ID `xOffset`, domain은 grouping order, range는 parent x band다.
- Effect: x band 안에 group sub-band를 만들고 scale을 materialize한다. concrete rect는 color/group
  semantics와 width가 완성될 때 생성된다.
- Coverage: grouped-bar semantic/reference tests가 automatic child action과 geometry를 검증한다.
  direct explicit range 조합은 부분적이다.

#### `encodeY2`

- Signature: `encodeY2({ field, target?, fieldType?, scale? })`
- `field`: 필수 quantitative upper-bound field.
- `target`: optional area ID.
- `fieldType`: 유일한 값 `"quantitative"`, 기본값도 quantitative다.
- `scale`: 생략 또는 `{ id: existingYScale }`만 허용하며 y와 다른 scale을 만들 수 없다.
- Effect: semantic y2를 existing y scale에 연결하고 closed area path를 rematerialize한다.
- Coverage: ranged area/regression tests가 shared scale과 invalid prerequisites를 검증한다.

#### `encodeYRange`

- Signature: `encodeYRange({ lower, upper, target?, fieldType?, coordinate?, scale? })`
- `lower`, `upper`: 필수 quantitative field names이며 각각 y와 y2가 된다.
- `target`, `fieldType`, `coordinate`, `scale`: `encodeY` 계약을 공유한다.
- Effect: wrapped `encodeY` 뒤 `encodeY2`를 호출하는 atomic action이다. 중간의 incomplete area
  상태를 public workflow에 노출하지 않는다.
- Coverage: regression band와 area tests가 hierarchy와 path geometry를 검증하며 explicit scale
  variations는 부분적이다.

#### `encodeGroup`

- Signature: `encodeGroup({ field, target?, fieldType? })`
- `field`: 필수 nominal field. density area에서는 density transform의 `groupBy`와 일치해야 한다.
- `target`: line 또는 area ID; 생략 시 current/unique eligible target을 추론한다.
- `fieldType`: 유일한 값 `"nominal"`, 기본값도 nominal이다.
- Effect: series를 path별로 나누는 semantic group만 저장한다. scale이나 guide는 만들지 않으며
  필요한 position encoding이 이미 완성됐을 때 path를 rematerialize한다.
- Coverage: line, regression, density tests가 grouped/ungrouped와 mismatch를 검증한다.

#### `encodeHistogram`

- Signature: `encodeHistogram({ field, target?, coordinate?, maxBins?, binStep?, binBoundaries?, stack?, xScale?, yScale? })`
- `field`, `target`, `coordinate`: binned x에 전달되는 field와 optional target/coordinate다.
- `maxBins`: positive integer, 기본값 `10`; `encodeX.bin.maxBins`로 전달된다.
- `binStep`, `binBoundaries`: Planned exact-width/explicit-boundary modes이며 maxBins와 mutually exclusive다.
- `stack`: `"zero" | null`, 기본값 `"zero"`; `encodeY`로 전달된다.
- `xScale`, `yScale`: optional scale objects이며 각각 child x/y action에 전달된다.
- Effect: wrapped `encodeX`와 `encodeY`를 원자적으로 결합해 bin/count semantics와 concrete rects를 만든다.
- Coverage: histogram unit/chart tests가 defaults, stack, bin boundaries, scale rules와 trace hierarchy를 검증한다.

#### `encodeDensity`

- Signature: `encodeDensity({ field, target?, source?, groupBy?, bandwidth?, extent?, steps?, kernel?, as?, densityChannel?, coordinate?, valueScale?, densityScale? })`
- `field`, `source`, `groupBy`, `bandwidth`, `extent`, `steps`, `as`: `createDensityData`와 같은 계약이며
  derived ID는 `${target}DensityData`로 namespace된다.
- `kernel`: Planned shared density kernel이며 생략 시 Gaussian이다.
- `target`: area mark ID. 생략하면 current 또는 유일한 eligible area를 추론한다.
- `densityChannel`: `"x" | "y"`, 기본값 `"y"`. y이면 value→x/density→y, x이면 반대로 연결한다.
- `coordinate`: optional compatible coordinate ID.
- `valueScale`: position scale object, 기본 `{ nice: false, zero: false }`.
- `densityScale`: position scale object, 기본 `{ nice: true, zero: true }`; baseline을 그리기 위해 domain이
  zero를 포함해야 한다.
- Effect: density data 생성, layer data rebinding, x/y encoding, optional group encoding, baseline-closed
  area path materialization을 하나의 hierarchy로 수행한다.
- Coverage: density data/mark/chart/guide tests가 두 orientation, grouped/ungrouped, explicit/auto
  density options와 rematerialization을 검증한다. 여러 steps×bandwidth pair는 부분적이다.

### Appearance and series encodings

#### `encodeColor`

- Signature: `encodeColor({ field, target?, fieldType?, layout?, scale? })`
- `field`: 필수 nominal field.
- `target`: point, line, bar 또는 area ID; current/unique inference를 지원한다.
- `fieldType`: 유일한 값 `"nominal"`, 기본값도 nominal이다.
- `layout`: 현재 bar에서 `"stack" | "group"`; histogram default는 stack이고 ordinal grouped bar는
  group이다. Planned vocabulary는 bar/area별 `"fill" | "overlay" | "center" | "diverging"`
  compatibility를 추가한다. 다른 mark에서는 생략해야 한다.
- `scale`: ordinal color scale. `palette` 또는 explicit `range` 중 하나를 사용할 수 있다.
- Effect: color semantic과 scale을 저장한다. point fill, line stroke, bar fill, area fill로 materialize한다.
  group layout은 wrapped `encodeXOffset`, stack layout은 zero-stack bar geometry를 사용한다.
- Coverage: 모든 대표 chart와 legend tests가 mark별 materialization을 검증한다. palette vocabulary,
  explicit ranges와 layout 오류의 전체 matrix는 부분적이다.

#### `encodeStrokeDash`

- Signature: `encodeStrokeDash({ field, target?, fieldType?, scale? })`
- `field`, `target`, `fieldType`: nominal field, optional line ID, nominal-only type다.
- `scale`: ordinal dash scale. range는 non-negative finite number array들의 array다.
- Effect: line series별 concrete `strokeDash`와 categorical legend symbol을 rematerialize한다.
- Coverage: line semantic, series legend와 scale tests가 auto/explicit dash를 검증하며 다양한 dash
  pattern 경계는 부분적이다.

#### `encodeSize`

- Signature: `encodeSize({ field, target?, fieldType?, scale? })`
- `field`: 필수 quantitative field.
- `target`: optional point ID.
- `fieldType`: 유일한 값 `"quantitative"`.
- `scale`: linear size-area scale; auto range는 `[24, 196]`이다.
- Effect: semantic size를 concrete area로 mapping하고 circle radius=`sqrt(area/pi)`, square side=`sqrt(area)`로
  materialize한다. constant `encodeRadius`와 함께 사용할 수 없다.
- Coverage: regression scatterplot과 size legend tests가 representative mapping을 검증한다. explicit
  domain/range와 constant-size conflict의 값 matrix는 부분적이다.

#### `encodeShape`

- Signature: `encodeShape({ field, target?, fieldType?, scale? })`
- `field`, `target`, `fieldType`: nominal field, optional point ID, nominal-only type다.
- `scale`: ordinal shape scale. 현재 resolved symbol vocabulary는 `"circle" | "square"`다.
- Planned: shared `PointShape` 12종과 non-repeating automatic range를 사용한다.
- Effect: point graphic을 heterogeneous collection으로 바꾸고 각 datum의 concrete primitive type과
  legend symbol을 rematerialize한다.
- Coverage: regression scatterplot과 point/legend tests가 circle/square mapping을 검증한다.

#### `encodeOpacity`

- Signature: `encodeOpacity({ value, target? })`
- `value`: 필수 finite `[0, 1]` number. 0은 완전 투명, 1은 완전 불투명이다.
- `target`: optional point ID.
- Effect: semantic encoding이 아니라 mark graphical config와 모든 point child opacity를 바꾼다.
  같은 target에 다시 호출하면 기존 constant opacity를 교체하고 point를 rematerialize한다.
- Coverage: point/regression tests와 validation이 representative, reassignment 및 invalid range를 검증한다.

#### `encodeRadius`

- Signature: `encodeRadius({ value, target? })`
- `value`: 필수 non-negative finite number. 0은 보이지 않는 point, 양수는 circle radius 또는 square
  half-side가 된다.
- `target`: optional point ID.
- Effect: graphical mark config와 concrete size만 바꾸며 semanticSpec에는 기록하지 않는다.
  field-driven `encodeSize`와 동시에 사용할 수 없다. 같은 target에 다시 호출하면 기존 radius를
  교체하고 point를 rematerialize한다.
- Coverage: scatterplot/point tests가 constant radius, reassignment, rematerialization과 invalid values를 검증한다.
- Proposed: Polar position의 radial channel 이름은 이미 이 action이 차지한 `encodeRadius`와 충돌한다.
  Polar API를 설계할 때 별도 이름을 사용자와 결정해야 한다.

#### `encodeBarWidth`

- Signature: `encodeBarWidth({ band?, target? })`
- `band`: `(0, 1]` finite number, 기본값 `0.72`. 각 xOffset slot 중 rect가 차지하는 비율이다.
- `pixels`, `paddingInner`: Planned. fixed logical-pixel width와 grouped slot spacing이며 pixels는
  band와 mutually exclusive다.
- `target`: optional complete grouped bar ID.
- Effect: graphical mark config에 band fraction을 저장하고 rect x/width를 rematerialize한다.
  같은 target에 다시 호출하면 기존 band fraction을 교체한다.
- 오류: ordinal x, mean/non-stacked y, matching color/xOffset가 완성되지 않으면 거부한다.
- Coverage: grouped-bar semantic/reference tests가 default, explicit value, invalid range와 geometry를 검증한다.

### Statistical layers

#### `createRegression`

- Signature: `createRegression({ target?, x?, y?, groupBy?, method?, degree?, span?, confidence?, interval?, band?, line? })`
- `target`: quantitative x/y point mark ID. 생략하면 current mark, 아니면 유일한 eligible point를 추론한다.
- `x`, `y`: non-empty field names. 생략하면 target의 x/y encoding field를 사용한다.
- `groupBy`: nominal field 또는 explicit `undefined`. 생략하면 matching color/shape field가 하나일 때
  추론한다. 후보가 둘 이상이면 오류이며 explicit undefined는 ungrouped regression을 요청한다.
- `method`, `degree`, `span`: Planned regression method contract를 child `createRegressionData`에 전달한다.
- `confidence`: `(0, 1)` finite number, 기본값 `0.95`.
- `interval`: Planned `"mean" | "prediction"`; 기본값은 `"mean"`이며 LOESS에서는 생략해야 한다.
- `band`: existing style object 또는 Planned `false`. linear/polynomial은 생략 시 band를 만들고,
  LOESS는 생략/false일 때 band child를 만들지 않으며 object는 오류다.
- `band.color`: non-empty color string, 기본 theme regression-band color `"#111111"`.
- `band.opacity`: `[0, 1]` finite number, 기본값 `0.18`.
- `line.strokeWidth`: non-negative finite number, 기본값 `3`.
- Effect: target ID로 namespace한 derived data, area band와 line layer를 만들고 point layer의 coordinate와
  x/y scales를 공유한다. group field가 point color와 같으면 color scale도 공유한다.
- Coverage: `test/unit/actions/regression/create-regression.test.js`와 regression chart tests가 inference,
  ambiguity, grouped/ungrouped, namespacing, geometry와 Canvas rematerialization을 검증한다. confidence와
  appearance boundary의 전체 조합은 부분적이다.

#### `createRegressionBand`

- Signature: `createRegressionBand({ id, data, x, lower, upper, groupBy?, coordinate, xScale, yScale, color?, opacity? })`
- `id`, `data`: 필수 새 area layer ID와 regression derived dataset ID.
- `x`, `lower`, `upper`: 필수 quantitative result fields.
- `groupBy`: optional nominal series field.
- `coordinate`, `xScale`, `yScale`: 필수 existing shared resource IDs.
- `color`, `opacity`: `createAreaMark` appearance contract; defaults는 regression band theme와 `0.18`.
- Effect: wrapped area mark, x, y/y2, optional group actions을 호출하고 shared-scale closed paths를 만든다.
- Coverage: regression unit/chart tests가 aggregate child hierarchy와 primitive equivalence를 검증하지만
  이 advanced action의 각 missing resource 오류는 부분적이다.

#### `createRegressionLine`

- Signature: `createRegressionLine({ id, data, x, y, groupBy?, coordinate, xScale, yScale, colorScale?, strokeWidth? })`
- `id`, `data`, `x`, `y`: 새 line ID, regression data와 fitted field names다.
- `groupBy`: optional nominal series field. 있으면 `colorScale`도 existing/shared ID여야 한다.
- `coordinate`, `xScale`, `yScale`: 필수 shared resource IDs.
- `strokeWidth`: non-negative finite number, 기본값 `3`.
- Effect: line mark와 x/y, optional color/group encoding을 만들고 fitted paths를 materialize한다.
- Coverage: regression unit/chart tests가 grouped/ungrouped와 shared resource 결과를 검증하며
  direct invalid combination matrix는 부분적이다.

### Axes

#### Shared complete-axis contract

`createXAxis`와 `createYAxis`는 같은 option shape를 사용한다.

- `scale`: optional scale ID. 생략하면 channel ID를 사용하거나 parent `createAxes`가 유일한 scale을 전달한다.
- `coordinate`: optional existing coordinate ID. 선택 channel/scale을 소비하는 layer가 실제로 연결돼야 한다.
- `position`: x는 Implemented `"bottom"`과 Planned `"top"`, y는 Implemented `"left"`와 Planned
  `"right"`를 사용하며 defaults는 bottom/left다.
- `line`: `{ color?, lineWidth? }`; axis-line child에 전달한다.
- `ticksAndLabels`: `{ count?, values?, ticks?, labels? }`; shared tick/label child에 전달한다.
- `title`: `{ text?, at?, offset?, rotation?, color?, fontSize?, fontFamily?, fontWeight? }`.
- Effect: line → ticks/labels → title wrapped action 순서로 semantic guide와 concrete graphics를 만든다.
- Planned: complete axis는 선택한 top/right position을 모든 child action에 전달한다.

#### `createAxes`

- Signature: `createAxes({ coordinate?, x?, y? })`
- `coordinate.id`: existing coordinate ID. 생략하면 encoded Cartesian layers가 참조하는 유일한 ID를 추론한다.
- `coordinate.type`: `"auto" | "cartesian" | "polar"`, 기본값 `"auto"`; stored type assertion이다.
- `x`, `y`: `false`, `{}`, 또는 complete-axis options. 생략하면 해당 encoded channel을 자동 선택하고,
  `false`는 명시적으로 끈다.
- Effect: coordinate를 만들거나 고치지 않고 stored positional layers를 읽어 selected complete axes를 만든다.
- 오류: mixed Cartesian/Polar channel, ambiguous coordinate/scale, missing stored coordinate, no selected axis를 거부한다.
- Coverage: `test/unit/actions/guides/create-axes.test.js`와 temporal/ordinal/histogram axis tests가 inference,
  opt-out, ambiguity, stored coordinate와 rematerialization을 검증한다.
- Planned: Polar semantics는 Implemented지만 Polar guide graphics는 Planned capability다. theta/radial action
  이름과 concrete guide contract는 아직 Proposed 상태라 현재 API로 노출하지 않는다.

#### `createXAxis`

- Signature: `createXAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })`
- Parameter contract와 effect는 Shared complete-axis contract를 따른다. x default는 bottom이고 top은 Planned다.
- Coverage: `test/unit/actions/guides/axis-actions.test.js`가 defaults, routing, coordinate와 duplicates를 검증한다.

#### `createYAxis`

- Signature: `createYAxis({ scale?, coordinate?, position?, line?, ticksAndLabels?, title? })`
- Parameter contract와 effect는 Shared complete-axis contract를 따른다. y default는 left이고 right는 Planned다.
- Coverage: `test/unit/actions/guides/axis-actions.test.js`가 symmetric behavior를 검증한다.

#### Shared axis-line contract

- Create parameters: `scale?`, `position?`, `color?`, `lineWidth?`.
- Edit parameters: `position?`, `color?`, `lineWidth?`; scale은 semantic guide에서 읽는다.
- `scale`: create-only ID, 기본 channel ID.
- `position`: x=`"bottom"`, y=`"left"`는 Implemented이고 x=`"top"`, y=`"right"`는 Planned다.
- `color`: non-empty string, 기본 theme text color.
- `lineWidth`: non-negative finite number, 기본값 `1`; 0은 보이지 않는 line을 허용한다.
- Effect: endpoint는 resolved scale range와 Canvas plot bounds에서 항상 재추론한다. semantic guide에는
  scale만 저장하고 style과 endpoints는 graphical state다.

#### `createXAxisLine`

- Signature: `createXAxisLine({ scale?, position?, color?, lineWidth? })`.
- Shared axis-line contract를 따르며 missing graphic을 만든다.
- Coverage: `test/unit/actions/guides/axis-line-actions.test.js`.

#### `createYAxisLine`

- Signature와 contract는 x와 같고 position/geometry가 left y-axis 기준이다.
- Coverage: `test/unit/actions/guides/axis-line-actions.test.js`.

#### `editXAxisLine`

- Signature: `editXAxisLine({ position?, color?, lineWidth? })`.
- 기존 x-axis line이 필요하고 geometry를 다시 추론한 뒤 appearance를 적용한다.
- Coverage: axis-line tests가 partial edit, invalid style와 Canvas rematerialization을 검증한다.

#### `editYAxisLine`

- Signature와 edit contract는 x와 같고 y geometry를 사용한다.
- Coverage: `test/unit/actions/guides/axis-line-actions.test.js`.

#### Shared axis-tick contract

- Create parameters: `scale?`, `position?`, `count?`, `values?`, `length?`, `color?`, `lineWidth?`.
- Edit parameters는 `scale`을 제외하고 동일하다.
- `count`: positive integer, 기본값 `5`; `values`와 mutually exclusive다.
- `values`: scale domain 안의 finite number/timestamp 또는 ordinal scalar array. histogram x는 둘 다
  생략하면 bin boundaries, ordinal x는 domain 전체를 사용한다.
- `length`: non-negative finite number, 기본 `6`.
- `color`: non-empty string, 기본 `"#64748b"`.
- `lineWidth`: non-negative finite number, 기본 `1`.
- Effect: tick values/config는 private guide config, scale reference는 semantic guide, concrete endpoints는
  line collection에 저장한다. Canvas/scale 변화는 values 정책을 유지한 채 positions를 다시 계산한다.

#### `createXAxisTicks`

- Shared tick create contract를 사용하며 bottom ticks를 만들고 Planned top ticks는 바깥쪽 위를 향한다.
- Coverage: axis-tick, histogram-axis, ordinal-axis, temporal-axis tests.

#### `createYAxisTicks`

- Shared tick create contract를 사용하며 left ticks를 만들고 Planned right ticks는 바깥쪽 오른쪽을 향한다.
- Coverage: axis-tick와 chart axis tests.

#### `editXAxisTicks`

- Shared tick edit contract를 사용한다. existing tick config가 필요하다.
- Coverage: `test/unit/actions/guides/axis-tick-actions.test.js`.

#### `editYAxisTicks`

- x와 같은 edit contract를 y scale에 적용한다.
- Coverage: `test/unit/actions/guides/axis-tick-actions.test.js`.

#### Shared axis-label contract

- Create parameters: `scale?`, `position?`, `count?`, `values?`, `offset?`, `format?`, `color?`,
  `fontSize?`, `fontFamily?`, `fontWeight?`; edit에서는 scale을 제외한다.
- `count`/`values`: tick contract와 같으며 existing ticks가 있으면 생략 시 그 정책을 재사용한다.
- `offset`: non-negative finite number; x default `18`, y default `12`.
- `format`: Implemented `"auto" | { decimals: nonNegativeInteger }`와 Planned `AxisFormatString`.
  Planned numeric tokens는 quantitative, UTC tokens는 time에서만 허용하고 ordinal은 auto만 허용한다.
- `color`: non-empty string; `fontSize`: positive finite; `fontFamily`: non-empty string;
  `fontWeight`: string 또는 finite number.
- Effect: formatted text, aligned data-space coordinates와 font style을 text collection에 저장한다.
  ticks와 count/values 정책이 충돌하면 거부한다.

#### `createXAxisLabels`

- Shared label create contract를 사용한다.
- Coverage: axis-label, temporal/ordinal/histogram axis tests.

#### `createYAxisLabels`

- Shared label create contract를 y channel에 적용한다.
- Coverage: axis-label 및 chart tests.

#### `editXAxisLabels`

- Shared label edit contract를 사용하며 existing config/graphic이 필요하다.
- Coverage: `test/unit/actions/guides/axis-label-actions.test.js`.

#### `editYAxisLabels`

- x와 같은 edit contract를 y channel에 적용한다.
- Coverage: `test/unit/actions/guides/axis-label-actions.test.js`.

#### Shared ticks-and-labels contract

- Create: `scale?`, `position?`, `count?`, `values?`, `ticks?`, `labels?`.
- Edit: create option에서 scale을 제외하며 빈 edit는 오류다.
- `ticks`: `{ length?, color?, lineWidth? }`.
- `labels`: `{ offset?, format?, color?, fontSize?, fontFamily?, fontWeight? }`.
- Effect: shared count/values를 tick과 label child에 원자적으로 전달한다. nested appearance는 해당 child만 바꾼다.

#### `createXAxisTicksAndLabels`

- Shared aggregate create contract를 x에 적용한다.
- Coverage: `test/unit/actions/guides/axis-tick-group-actions.test.js`.

#### `createYAxisTicksAndLabels`

- Shared aggregate create contract를 y에 적용한다.
- Coverage: axis-tick-group tests.

#### `editXAxisTicksAndLabels`

- Shared aggregate edit contract를 x에 적용한다.
- Coverage: axis-tick-group tests가 shared/nested edit와 trace를 검증한다.

#### `editYAxisTicksAndLabels`

- Shared aggregate edit contract를 y에 적용한다.
- Coverage: axis-tick-group tests.

#### Shared axis-title contract

- Create: `text?`, `scale?`, `position?`, `at?`, `offset?`, `rotation?`, `color?`, `fontSize?`,
  `fontFamily?`, `fontWeight?`; edit에서는 scale을 제외한다.
- `text`: non-empty string. 생략하면 unique connected field/aggregate 또는 density provenance에서 추론한다.
- `at`: `"start" | "center" | "end"` 또는 scale domain 안의 data value; 기본 center.
- `offset`: non-negative finite; x default `42`, y default `52`.
- `rotation`: finite radians; x bottom/top default `0`, y left default `-Math.PI / 2`, Planned right
  default `Math.PI / 2`.
- font/color contract는 labels와 같고 default font size는 `13`, weight는 `600`이다.
- Effect: semantic axis title text와 graphical layout/style을 분리 저장한다.

#### `createXAxisTitle`

- Shared title create contract를 bottom x-axis에 적용하며 top은 Planned다.
- Coverage: `test/unit/actions/guides/axis-title-actions.test.js`.

#### `createYAxisTitle`

- Shared title create contract를 left y-axis에 적용하며 right는 Planned다.
- Coverage: axis-title tests.

#### `editXAxisTitle`

- Shared title edit contract를 사용하며 text 또는 appearance를 immutable하게 편집한다.
- Coverage: axis-title tests가 data-space `at`, rematerialization과 invalid values를 검증한다.

#### `editYAxisTitle`

- x와 같은 edit contract를 y-axis에 적용한다.
- Coverage: axis-title tests.

### Grids

#### Shared grid-direction contract

- `scale`: optional continuous scale ID; horizontal은 y, vertical은 x에서 유일하게 추론한다.
- `coordinate`: optional Cartesian coordinate ID; encoded layers에서 추론한다.
- `count`: positive integer, `values`와 mutually exclusive다.
- `values`: non-empty finite number array이며 scale domain 안에 있어야 한다.
- `color`: non-empty string, 기본 `"#e2e8f0"`.
- `lineWidth`: non-negative finite number, 기본 `1`.
- `strokeDash`: even-length non-negative finite number array, 기본 `[]`.
- Effect: semantic guide에는 scale/coordinate, graphical config에는 tick policy/style, concrete line
  collection에는 endpoints를 저장한다. 관련 mark보다 앞에 graphic을 배치한다.

#### `createGrid`

- Signature: `createGrid({ horizontal?, vertical? })`.
- `horizontal`: boolean 또는 direction options, 기본 `true`.
- `vertical`: boolean 또는 direction options, 기본 `false`.
- `false`는 끄고 `true`/`{}`는 inference로 생성한다. 최소 한 방향이 필요하다.
- Coverage: `test/unit/actions/guides/grid-actions.test.js`가 default/both directions, tick reuse,
  explicit values, rendering order와 rematerialization을 검증한다.

#### `createHorizontalGrid`

- Signature: `createHorizontalGrid({ scale?, coordinate?, count?, values?, color?, lineWidth?, strokeDash? })`.
- Shared direction contract를 y scale에 적용한다.
- Coverage: grid tests; style boundary 조합은 부분적이다.

#### `createVerticalGrid`

- Signature는 horizontal과 같고 x scale을 사용한다.
- Coverage: grid와 density-guide tests; style boundary 조합은 부분적이다.

### Legends

#### `createLegend`

- Signature: `createLegend({ target?, channels?, position?, align?, direction?, columns?, offset?, titlePosition?, title?, symbol?, labels?, titleStyle?, itemGap?, border?, count? })`.
- `target`: compatible mark ID; 생략하면 current 또는 유일한 eligible mark를 추론한다.
- `channels`: unique subset of `"color" | "strokeDash" | "shape"`; 생략하면 target의 compatible
  categorical channels를 추론한다.
- `position`: Implemented `"right" | "bottom" | "top"`와 Planned `"left"`; chart-independent
  default는 `"right"`다.
- `align`: `"left" | "center" | "right"`, 기본 center. right와 Planned left side position은
  첫 계약에서 center만 허용한다.
- `direction`: `"horizontal" | "vertical"`; top item-grid fill order를 결정하며 기본 horizontal이다.
- `columns`: positive integer; top grid의 최대 열 수. 생략하면 한 row에 가능한 item을 둔다.
- `offset`: non-negative finite number, 기본 `8`; plot과 legend block 간 거리다.
- `titlePosition`: `"top" | "left"`, 기본 top.
- `title`: non-empty string; 생략하면 encoded source field를 사용한다.
- `symbol`: `"auto"`, mark-specific shorthand, 또는 `{ layers: [...] }`. layer type은 `line | point | swatch`;
  각 layer는 non-negative size/stroke parameters와 supported point shape를 사용한다.
- `labels`, `titleStyle`: color/fontSize/fontFamily/fontWeight style object.
- `itemGap`: positive finite number; position별 default spacing을 override한다.
- `border`: `false | true | { color?, lineWidth?, padding?, background? }`; false가 default이며 true는
  default bordered background를 만든다.
- `count`: size legend symbol count, integer `>= 2`, point composite default `5`.
- Effect: categorical semantics에는 scale/channel/title만 저장하고 placement, recipe, fonts, border는
  graphical config와 concrete collection으로 만든다. resolved domain order를 item order로 사용한다.
- Coverage: series/histogram/grouped-bar/top/regression legend tests가 주요 layouts, recipes,
  borders, rematerialization과 invalid values를 검증한다. 모든 symbol-layer parameter pair는 부분적이다.
- Planned: left categorical/point-composite/size side layout. Proposed: point composite top/bottom,
  continuous color와 interactive legend.

### Aggregate guides and chart title

#### `createGuides`

- Signature: `createGuides({ axes?, grid?, legend? })`.
- `axes`, `grid`, `legend`: 해당 child option object, `false`, 또는 생략. 생략은 semantic applicability
  inference, `{}`는 명시적 선택+inference, false는 opt-out이다.
- Effect: applicable axes → grid → legend wrapped actions을 deterministic order로 호출한다. title은 guide가
  아니므로 포함하지 않는다.
- 오류: explicit/automatic selection 결과가 하나도 없거나 child resource inference가 ambiguous하면 거부한다.
- Coverage: `test/unit/actions/guides/guide-collection-actions.test.js`와 regression/density guide tests가
  chart-type applicability, forwarding, opt-out, ambiguity와 trace를 검증한다.

#### `createTitle`

- Signature: `createTitle({ text, subtitle?, position?, align?, offset?, gap?, titleStyle?, subtitleStyle? })`.
- `text`: 필수 non-empty string; `subtitle`은 optional non-empty single-line string.
- `position`: Implemented `"top"`, Planned `"bottom" | "left" | "right"`; 기본 top.
- `align`: `"left" | "center" | "right"`, 기본 left; plot bounds 기준이다.
- `offset`: finite number, 기본 `0`; top block의 vertical origin을 이동한다.
- `gap`: non-negative finite number, 기본 `8`; title/subtitle 사이 거리다.
- `titleStyle`, `subtitleStyle`: `{ color?, fontSize?, fontFamily?, fontWeight? }`; positive fontSize,
  non-empty strings와 string/finite weight를 사용한다.
- Effect: text만 semanticSpec에 저장하고 geometry/style은 concrete text graphics와 title config에 저장한다.
  top legend와 실제 occupied bounds가 겹치거나 margin에 맞지 않으면 오류다.
- Coverage: `test/unit/actions/guides/title-actions.test.js`가 optional subtitle, alignment, style,
  insufficient layout, duplicates와 Canvas rematerialization을 검증한다.
- Planned: bottom/left/right positions. Proposed: wrapping, maxWidth, lineHeight와 text measurement.

### Coordinates and scales

#### `createCoordinate`

- Signature: `createCoordinate({ id?, type?, layers? })`.
- `id`: valid user ID, 기본 `"main"`.
- `type`: `"cartesian" | "polar"`, 기본 cartesian.
- `layers`: existing unique layer ID array, 기본 `[]`.
- Effect: named semantic coordinate를 만들고 coordinate가 없는 selected layers에 reference를 저장한다.
  equivalent repeated definition은 idempotent이고 기존 layer를 다른 coordinate로 이동시키지 않는다.
- Coverage: `test/unit/actions/coordinates/create-coordinate.test.js`가 both types, attachments,
  idempotence, conflicts와 validation을 검증한다.
- Planned: Polar resource storage는 Implemented, Polar positional materialization과 guides는 Planned capability다.

#### `createScale`

- Signature: `createScale({ id, type?, domain?, range?, nice?, zero? })`.
- `id`: 필수 user-defined scale ID.
- `type`: `"linear" | "time" | "ordinal"`, 기본 linear.
- `domain`: `"auto"` 또는 type-valid array. continuous는 두 finite/temporal values, ordinal은 non-empty
  unique values를 사용한다.
- `range`: `"auto"` 또는 consumer-compatible array. continuous position은 finite pair, ordinal은
  channel에 따라 colors, shapes 또는 dash patterns가 될 수 있다.
- `nice`: boolean, linear/time only; auto domain에 적용된다.
- `zero`: boolean, linear only; auto domain에 적용된다.
- Effect: semantic definition만 저장한다. equivalent repeated call은 idempotent, conflicting definition은 오류다.
- Coverage: `test/unit/actions/scales/scale-actions.test.js`와 grammar scale tests가 types,
  auto/explicit values, idempotence와 conflicts를 검증한다. raw `createScale`의 consumer별 ordinal range
  compatibility는 부분적이다.

## Primitives

### `editSemantic`

- Signature: `editSemantic({ property, value })`.
- `property`: 필수 supported semantic path string. user ID selector는 `dataset[id]`, `layer[id]`,
  `scale[id]`, `coordinate[id]`; system guide keys는 `guide.axis.x` 같은 closed path를 사용한다.
- `value`: selected path schema에 맞는 scalar, object 또는 array. caller-owned nested value를 복사/freeze한다.
- Effect: 해당 path만 structural copy하고 기존 program을 보존한다. path가 dataset/layer/scale/coordinate를
  가리키면 current context를 내부적으로 갱신할 수 있다. graphic rematerialization은 자동으로 하지 않는다.
- 오류: unknown path, closed vocabulary 위반, invalid transform/scale/guide value, existing source dataset
  values 교체를 거부한다.
- Coverage: `test/unit/actions/primitives/edit-semantic.test.js`가 structural copy, ownership,
  dataset immutability, path/schema validation과 trace summary를 검증한다.

### `createGraphics`

- Signature: `createGraphics({ id, type, length?, before?, after? })`.
- `id`: 필수 새 top-level graphic ID. equivalent repeated definition은 idempotent하다.
- `type`: `"canvas" | "collection" | "circle" | "rect" | "line" | "text" | "path"`.
- `length`: non-negative integer. homogeneous drawable type에 지정하면 generated child collection을 만들며
  생략 시 single graphic, `0`이면 empty collection이다. heterogeneous `collection`은 children edit로 채운다.
- `before`, `after`: existing top-level graphic ID; mutually exclusive다. concrete rendering order를
  명시하며 Canvas 앞 배치는 허용하지 않는다.
- Effect: backend-neutral concrete object와 order를 structural copy로 추가한다. visual property는 아직 없다.
- 오류: invalid ID/type/length, conflicting repeated definition/placement, unknown anchor를 거부한다.
- Coverage: `test/unit/actions/primitives/create-graphics.test.js`가 all creation modes, idempotence,
  placement와 invalid definitions를 검증한다.

### `editGraphics`

- Signature: `editGraphics({ target, property, value })`.
- `target`: existing top-level graphic ID 또는 generated child ID(`points:1`).
- `property`: selected graphic type가 지원하는 concrete property. 공통 opaque style bag은 허용하지 않는다.
- `value`
  - single graphic: property schema에 맞는 scalar, nested array 또는 object.
  - collection + scalar/non-distributed value: compatible children 모두에 broadcast.
  - collection + outer array: child count와 길이가 같으면 index별 distribute. path `points`처럼 property
    자체가 nested array인 경우 한 child value 단위를 보존한다.
  - `children`: heterogeneous collection의 typed child object array를 원자적으로 교체한다.
- Effect: concrete graphic path만 structural copy한다. semantic state나 automatic compiler는 관여하지 않는다.
- 오류: unknown target/property, incompatible child type, mismatched distributed length, non-finite geometry,
  negative dimensions/strokes, opacity 밖의 값과 invalid Canvas text vocabulary를 거부한다.
- Coverage: `test/unit/actions/primitives/edit-graphics.test.js`와
  `test/contracts/shared-graphic-validation.test.js`가 distribution, broadcast, nested paths,
  heterogeneous children, resize, structural copy와 renderer-shared validation을 검증한다.

## Planned and proposed contract index

현재 Catalog에 기록할 수 있는 future surface는 아래처럼 구분한다.

- Planned capability
  - Polar semantic resource 이후 positional materialization과 guide graphics. 구체 action 이름과 parameter는
    아직 Proposed이므로 current action table에는 추가하지 않는다.
  - top/right Cartesian axis positions와 모든 component create/edit parity
  - deterministic axis label format strings
  - left categorical/point-composite/size legend layout
  - bottom/left/right chart-title positions
- Proposed capability
  - Polar theta/radial encoding 이름과 radial constant `encodeRadius` 충돌 해결
  - point composite/size legend의 top/bottom layouts
  - chart-title wrapping과 text measurement
  - continuous color 및 interactive legends

Faceting, h/v program composition과 additional transforms는 현재 limitations이지만, 구체 action contract를
사용자와 합의하지 않았으므로 Planned로 표시하지 않는다.

## Formal parameter value registry

이 registry는 현재 호출 가능한 값과 future candidate를 문법적으로 분리한다.

- **Implemented** code block만 현재 API 계약이다.
- **Planned (NOT IMPLEMENTED)**는 사용자와 계약이 합의됐지만 아직 public type/runtime에는 없다.
- **Proposed (NOT IMPLEMENTED)** code block은 구현, TypeScript declaration, public docs 또는 runtime
  validation에 아직 존재하지 않는다.
- `—`는 현재 proposed parameter/value가 없다는 뜻이다.
- 아래 type alias는 문서용 formal notation이며 새로운 runtime export가 아니다.

```typescript
type UserId = string;                 // non-empty, identifier grammar 통과
type FieldName = string;              // non-empty dataset field name
type NonEmptyString = string;
type Finite = number;                 // Number.isFinite(value)
type PositiveFinite = number;         // finite && value > 0
type NonNegativeFinite = number;      // finite && value >= 0
type UnitInterval = number;           // finite && 0 <= value <= 1
type UnitIntervalExclusive = number;  // finite && 0 < value < 1
type PositiveInteger = number;        // Number.isInteger(value) && value > 0
type IntegerAtLeast2 = number;        // Number.isInteger(value) && value >= 2
type NonNegativeInteger = number;     // Number.isInteger(value) && value >= 0
type FontWeight = NonEmptyString | Finite;
type Margin = NonNegativeFinite | {
  top?: NonNegativeFinite;
  right?: NonNegativeFinite;
  bottom?: NonNegativeFinite;
  left?: NonNegativeFinite;
};
type FieldType = "quantitative" | "temporal" | "ordinal" | "nominal";
type ScaleType = "linear" | "time" | "ordinal";
type ContinuousDomain = "auto" | readonly [unknown, unknown];
type OrdinalDomain = "auto" | readonly unknown[];
type NumericRange = "auto" | readonly [Finite, Finite];
type OrderedFinitePair = readonly [Finite, Finite]; // first <= second
type ColorRange = readonly NonEmptyString[] | { palette: "tableau10" };
type ShapeRange = readonly ("circle" | "square")[];
type GeneratedChildId = `${UserId}:${NonNegativeInteger}`;
type FilterTransform = {
  type: "filter";
  field: FieldName;
  oneOf: readonly unknown[];
};
type LinearRegressionTransform = {
  type: "regression";
  method: "linear";
  x: FieldName;
  y: FieldName;
  groupBy?: FieldName;
  confidence: UnitIntervalExclusive;
  interval: "mean";
};
type GaussianDensityTransform = {
  type: "density";
  field: FieldName;
  groupBy?: FieldName;
  bandwidth: "auto" | PositiveFinite;
  extent: "auto" | OrderedFinitePair;
  steps: IntegerAtLeast2;
  as: readonly [FieldName, FieldName];
};
type PositionScale = {
  id?: UserId;
  type?: "linear" | "time" | "ordinal";
  domain?: ContinuousDomain | OrdinalDomain;
  range?: NumericRange;
  nice?: boolean;
  zero?: boolean;
};
type ColorScale = {
  id?: UserId;
  type?: "ordinal";
  domain?: OrdinalDomain;
  range?: "auto" | readonly NonEmptyString[];
  palette?: "tableau10";
};
type DashPattern = readonly NonNegativeFinite[]; // even length
type DashScale = {
  id?: UserId;
  type?: "ordinal";
  domain?: OrdinalDomain;
  range?: "auto" | readonly DashPattern[];
};
type DatasetProperty = "source" | "transform" | "values";
type ScaledEncodingChannel = "x" | "y" | "y2" | "xOffset" | "theta" | "radius" | "color" | "strokeDash" | "size" | "shape" | "opacity";
type LayerProperty =
  | "data" | "coordinate" | "transform" | "mark.type"
  | `encoding.${ScaledEncodingChannel}.${"field" | "datum" | "fieldType" | "scale"}`
  | `encoding.group.${"field" | "datum" | "fieldType"}`
  | "encoding.x.bin.maxBins" | "encoding.y.aggregate" | "encoding.y.stack";
type ScaleProperty = "type" | "domain" | "range" | "nice" | "zero";
type GuideProperty =
  | `axis.${"x" | "y"}.${"scale" | "coordinate" | "title"}`
  | `legend.${"color" | "size" | "opacity"}.${"scale" | "title"}`
  | "legend.series.channels" | "legend.series.scales" | "legend.series.title"
  | `grid.${"horizontal" | "vertical"}.${"scale" | "coordinate"}`;
type SemanticPropertyPath =
  | `dataset[${UserId}].${DatasetProperty}`
  | `layer[${UserId}].${LayerProperty}`
  | `scale[${UserId}].${ScaleProperty}`
  | `coordinate[${UserId}].type`
  | `guide.${GuideProperty}`
  | `title.${"text" | "subtitle"}`;
type ValueForSemanticPath<P extends SemanticPropertyPath> = unknown; // P별 semantic value schema
type CanvasProperty = "width" | "height" | "background";
type CircleProperty = "x" | "y" | "radius" | "fill" | "stroke" | "strokeWidth" | "opacity" | "length";
type RectProperty = "x" | "y" | "width" | "height" | "fill" | "stroke" | "strokeWidth" | "opacity" | "length";
type LineProperty = "x1" | "y1" | "x2" | "y2" | "stroke" | "strokeWidth" | "strokeDash" | "opacity" | "length";
type TextProperty = "x" | "y" | "text" | "fill" | "fontSize" | "fontFamily" | "fontWeight" | "textAlign" | "textBaseline" | "rotation" | "opacity" | "length";
type PathProperty = "points" | "fill" | "stroke" | "strokeWidth" | "strokeDash" | "closed" | "opacity" | "length";
type CollectionProperty = "children" | Exclude<CircleProperty | RectProperty | LineProperty | TextProperty | PathProperty, "length">;
type GraphicPropertyForTarget = CanvasProperty | CircleProperty | RectProperty | LineProperty | TextProperty | PathProperty | CollectionProperty;
type GraphicValueForProperty = unknown; // target type + property별 concrete graphic value schema
type TextStyle = {
  color?: NonEmptyString;
  fontSize?: PositiveFinite;
  fontFamily?: NonEmptyString;
  fontWeight?: FontWeight;
};
```

### Formal values — `createCanvas`

- Implemented: `createCanvas({ width?: PositiveFinite; height?: PositiveFinite; background?: NonEmptyString; margin?: Margin } = {})`
- Proposed (NOT IMPLEMENTED): `{ width?: "auto"; height?: "auto"; margin?: "auto" }`

### Formal values — `editCanvas`

- Implemented: `editCanvas({ width?: PositiveFinite; height?: PositiveFinite; background?: NonEmptyString; margin?: Margin })`; 최소 한 property가 필요하다.
- Proposed (NOT IMPLEMENTED): `createCanvas`의 `"auto"` dimension/margin과 동일하다.

### Formal values — `createData`

- Implemented: `createData({ id: UserId; values: readonly Record<string, unknown>[] })`
- Proposed (NOT IMPLEMENTED): `{ values: AsyncIterable<Record<string, unknown>> | Readonly<Record<FieldName, readonly unknown[]>> }`

### Formal values — `filterData`

- Implemented: `filterData({ id: UserId; source?: UserId; field: FieldName; oneOf: readonly unknown[] })`
- Planned (NOT IMPLEMENTED): `filterData({ id: UserId; source?: UserId; field: FieldName } & ({ oneOf: readonly unknown[] } | { predicate: FilterComparison } | { range: FilterRange }))`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createRegressionData`

- Implemented: `createRegressionData({ id: UserId; source?: UserId; x: FieldName; y: FieldName; groupBy?: FieldName; method?: "linear"; confidence?: UnitIntervalExclusive; interval?: "mean" })`
- Planned (NOT IMPLEMENTED): `{ method?: "linear" | "polynomial" | "loess"; degree?: PositiveInteger; span?: UnitIntervalExclusiveZero; confidence?: UnitIntervalExclusive; interval?: "mean" | "prediction" }`; method별 허용 조합은 accepted regression contracts가 제한한다.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createDensityData`

- Implemented: `createDensityData({ id: UserId; source?: UserId; field: FieldName; groupBy?: FieldName; bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; as?: readonly [FieldName, FieldName] })`
- Planned (NOT IMPLEMENTED): `{ kernel?: DensityKernel }`; default는 `"gaussian"`이다.
- Proposed (NOT IMPLEMENTED): `{ normalization?: "density" | "count" }`

### Formal values — `createDerivedData`

- Implemented: `createDerivedData({ id: UserId; source: UserId; transform: readonly [FilterTransform | LinearRegressionTransform | GaussianDensityTransform] })`
- Proposed (NOT IMPLEMENTED): —; one-transform provenance resource라는 현재 역할을 유지한다.

### Formal values — `createPointMark`

- Implemented: `createPointMark({ id: UserId; data?: UserId; shape?: "circle" | "square" })`
- Planned (NOT IMPLEMENTED): `{ shape?: PointShape }` with the accepted 12-value shared vocabulary.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createLineMark`

- Implemented: `createLineMark({ id: UserId; data?: UserId; strokeWidth?: NonNegativeFinite })`
- Proposed (NOT IMPLEMENTED): `{ curve?: "linear" | "step" | "basis" }`; 현재 path는 implicit linear다.

### Formal values — `createBarMark`

- Implemented: `createBarMark({ id: UserId; data?: UserId })`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createAreaMark`

- Implemented: `createAreaMark({ id: UserId; data?: UserId; fill?: NonEmptyString; opacity?: UnitInterval })`
- Planned (NOT IMPLEMENTED): `{ stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `encodeX`

- Implemented: `encodeX({ field: FieldName; target?: UserId; fieldType?: "quantitative" | "temporal" | "ordinal"; scale?: PositionScale; coordinate?: UserId; bin?: { maxBins?: PositiveInteger } })`; 실제 fieldType/bin 조합은 mark policy가 제한한다.
- Planned (NOT IMPLEMENTED): `{ bin?: { step: PositiveFinite } | { boundaries: readonly [Finite, Finite, ...Finite[]] } }`
- Proposed (NOT IMPLEMENTED): `{ fieldType?: broader mark-specific temporal/ordinal combinations; scale?: { type?: "log" | "sqrt" | "symlog"; clamp?: boolean; reverse?: boolean } }` 및 Polar positional action.

### Formal values — `encodeY`

- Implemented: `encodeY({ field?: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: PositionScale; coordinate?: UserId; aggregate?: "mean" | "count"; stack?: "zero" | null })`; mark/x policy가 가능한 조합을 제한한다.
- Planned (NOT IMPLEMENTED): `{ aggregate?: "sum" | "median" | "min" | "max" | "distinct" | "valid" | "missing" | "variance" | "varianceP" | "stdev" | "stdevP" | "stderr" | "q1" | "q3" | "ciLower" | "ciUpper" }`
- Proposed (NOT IMPLEMENTED): `{ fieldType?: "temporal" | "ordinal"; aggregate?: { op: "quantile"; probability: UnitInterval } | { op: "first" | "last"; orderBy: FieldName; order?: "ascending" | "descending" }; stack?: "normalize" | "center"; scale?: { type?: "log" | "sqrt" | "symlog" } }`; `argmin`/`argmax`는 row-selecting transform 후보다.

### Formal values — `encodeXOffset`

- Implemented: `encodeXOffset({ field: FieldName; target?: UserId; fieldType?: "nominal"; scale?: { id?: UserId; type?: "ordinal"; domain?: OrdinalDomain; range?: NumericRange } })`
- Proposed (NOT IMPLEMENTED): `{ paddingInner?: UnitInterval; paddingOuter?: NonNegativeFinite }`

### Formal values — `encodeY2`

- Implemented: `encodeY2({ field: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: { id?: UserId } })`
- Proposed (NOT IMPLEMENTED): —; y2는 y scale 공유를 유지한다.

### Formal values — `encodeYRange`

- Implemented: `encodeYRange({ lower: FieldName; upper: FieldName; target?: UserId; fieldType?: "quantitative"; coordinate?: UserId; scale?: PositionScale })`
- Proposed (NOT IMPLEMENTED): 별도 `encodeXRange({ lower; upper; ... })` action; 현재 action parameter 추가는 아니다.

### Formal values — `encodeGroup`

- Implemented: `encodeGroup({ field: FieldName; target?: UserId; fieldType?: "nominal" })`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `encodeHistogram`

- Implemented: `encodeHistogram({ field: FieldName; target?: UserId; coordinate?: UserId; maxBins?: PositiveInteger; stack?: "zero" | null; xScale?: PositionScale; yScale?: PositionScale })`
- Planned (NOT IMPLEMENTED): `{ binStep?: PositiveFinite; binBoundaries?: readonly [Finite, Finite, ...Finite[]] }`; `maxBins`와 mutually exclusive.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `encodeDensity`

- Implemented: `encodeDensity({ field: FieldName; target?: UserId; source?: UserId; groupBy?: FieldName; bandwidth?: "auto" | PositiveFinite; extent?: "auto" | OrderedFinitePair; steps?: IntegerAtLeast2; as?: readonly [FieldName, FieldName]; densityChannel?: "x" | "y"; coordinate?: UserId; valueScale?: PositionScale; densityScale?: PositionScale })`
- Planned (NOT IMPLEMENTED): `{ kernel?: DensityKernel }`; default는 `"gaussian"`이다.
- Proposed (NOT IMPLEMENTED): `{ normalization?: "density" | "count" }`

### Formal values — `encodeColor`

- Implemented: `encodeColor({ field: FieldName; target?: UserId; fieldType?: "nominal"; layout?: "stack" | "group"; scale?: ColorScale })`
- Planned (NOT IMPLEMENTED): `{ layout?: "fill" | "overlay" | "center" | "diverging" }`; full accepted `ColorLayout`은 existing `"stack" | "group"`을 포함한다.
- Proposed (NOT IMPLEMENTED): `{ scale?: { palette?: "category10" | "set2" | "dark2"; interpolate?: "rgb" | "lab" | "hcl" } }`

### Formal values — `encodeStrokeDash`

- Implemented: `encodeStrokeDash({ field: FieldName; target?: UserId; fieldType?: "nominal"; scale?: DashScale })`
- Proposed (NOT IMPLEMENTED): 별도 constant dash action `{ value: DashPattern; target?: UserId }`.

### Formal values — `encodeSize`

- Implemented: `encodeSize({ field: FieldName; target?: UserId; fieldType?: "quantitative"; scale?: { id?: UserId; type?: "linear"; domain?: ContinuousDomain; range?: "auto" | readonly [NonNegativeFinite, NonNegativeFinite] } })`
- Proposed (NOT IMPLEMENTED): `{ minArea?: NonNegativeFinite; maxArea?: NonNegativeFinite }`; explicit range와 precedence 결정 필요.

### Formal values — `encodeShape`

- Implemented: `encodeShape({ field: FieldName; target?: UserId; fieldType?: "nominal"; scale?: { id?: UserId; type?: "ordinal"; domain?: OrdinalDomain; range?: "auto" | readonly ("circle" | "square")[] } })`
- Planned (NOT IMPLEMENTED): `range?: "auto" | readonly PointShape[]` with 12 distinct shared values.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `encodeOpacity`

- Implemented: `encodeOpacity({ value: UnitInterval; target?: UserId })`
- Proposed (NOT IMPLEMENTED): 별도 field-driven action `{ field: FieldName; target?: UserId; scale?: PositionScale }`.

### Formal values — `encodeRadius`

- Implemented: `encodeRadius({ value: NonNegativeFinite; target?: UserId })`
- Proposed (NOT IMPLEMENTED): `{ unit?: "radius" | "area" }`; Polar radial action 이름과도 분리 필요.

### Formal values — `encodeBarWidth`

- Implemented: `encodeBarWidth({ band?: number; target?: UserId })`, `0 < band <= 1`, default `0.72`.
- Planned (NOT IMPLEMENTED): `{ pixels?: PositiveFinite; paddingInner?: UnitIntervalLessThan1 }`; `band`와 mutually exclusive.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createRegression`

- Implemented: `createRegression({ target?: UserId; x?: FieldName; y?: FieldName; groupBy?: FieldName; confidence?: UnitIntervalExclusive; band?: { color?: NonEmptyString; opacity?: UnitInterval }; line?: { strokeWidth?: NonNegativeFinite } })`
- Planned (NOT IMPLEMENTED): `{ method?: "linear" | "polynomial" | "loess"; degree?: PositiveInteger; span?: UnitIntervalExclusiveZero; interval?: "mean" | "prediction"; band?: false | { color?: NonEmptyString; opacity?: UnitInterval; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite } }`; method별 허용 조합은 accepted regression contracts가 제한한다.
- Proposed (NOT IMPLEMENTED): `{ line?: { curve?: "step" | "basis" } }`

### Formal values — `createRegressionBand`

- Implemented: `createRegressionBand({ id: UserId; data: UserId; x: FieldName; lower: FieldName; upper: FieldName; groupBy?: FieldName; coordinate: UserId; xScale: UserId; yScale: UserId; color?: NonEmptyString; opacity?: UnitInterval })`
- Planned (NOT IMPLEMENTED): `{ stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createRegressionLine`

- Implemented: `createRegressionLine({ id: UserId; data: UserId; x: FieldName; y: FieldName; groupBy?: FieldName; coordinate: UserId; xScale: UserId; yScale: UserId; colorScale?: UserId; strokeWidth?: NonNegativeFinite })`
- Proposed (NOT IMPLEMENTED): `{ curve?: "step" | "basis" }`

```typescript
type AxisPositionX = "bottom";
type AxisPositionY = "left";
type TickValue = string | boolean | Finite;
type TickOptions = {
  length?: NonNegativeFinite;
  color?: NonEmptyString;
  lineWidth?: NonNegativeFinite;
};
type LabelOptions = {
  offset?: NonNegativeFinite;
  format?: "auto" | { decimals: NonNegativeInteger };
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
  at?: "start" | "center" | "end" | TickValue;
  offset?: NonNegativeFinite;
  rotation?: Finite;
};
type CompleteAxisOptions<P extends string> = {
  scale?: UserId;
  coordinate?: UserId;
  position?: P;
  line?: { color?: NonEmptyString; lineWidth?: NonNegativeFinite };
  ticksAndLabels?: TickAndLabelOptions;
  title?: AxisTitleOptions<P>;
};
```

### Formal values — `createAxes`

- Implemented: `createAxes({ coordinate?: { id?: UserId; type?: "auto" | "cartesian" | "polar" }; x?: false | CompleteAxisOptions<"bottom">; y?: false | CompleteAxisOptions<"left"> } = {})`; Polar 선택은 현재 validation error다.
- Planned (NOT IMPLEMENTED): `{ x?: false | CompleteAxisOptions<"bottom" | "top">; y?: false | CompleteAxisOptions<"left" | "right"> }`
- Proposed (NOT IMPLEMENTED): Polar axis option schema; x/y에 Polar 값을 억지로 추가하지 않는다.

### Formal values — `createXAxis`

- Implemented: `createXAxis(options?: CompleteAxisOptions<"bottom">)`
- Planned (NOT IMPLEMENTED): `CompleteAxisOptions<"bottom" | "top">`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createYAxis`

- Implemented: `createYAxis(options?: CompleteAxisOptions<"left">)`
- Planned (NOT IMPLEMENTED): `CompleteAxisOptions<"left" | "right">`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createXAxisLine`

- Implemented: `createXAxisLine({ scale?: UserId; position?: "bottom"; color?: NonEmptyString; lineWidth?: NonNegativeFinite } = {})`
- Planned (NOT IMPLEMENTED): `{ position?: "bottom" | "top" }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createYAxisLine`

- Implemented: `createYAxisLine({ scale?: UserId; position?: "left"; color?: NonEmptyString; lineWidth?: NonNegativeFinite } = {})`
- Planned (NOT IMPLEMENTED): `{ position?: "left" | "right" }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editXAxisLine`

- Implemented: `editXAxisLine({ position?: "bottom"; color?: NonEmptyString; lineWidth?: NonNegativeFinite } = {})`
- Planned (NOT IMPLEMENTED): `{ position?: "bottom" | "top" }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editYAxisLine`

- Implemented: `editYAxisLine({ position?: "left"; color?: NonEmptyString; lineWidth?: NonNegativeFinite } = {})`
- Planned (NOT IMPLEMENTED): `{ position?: "left" | "right" }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createXAxisTicks`

- Implemented: `createXAxisTicks({ scale?: UserId; position?: "bottom"; count?: PositiveInteger; values?: readonly TickValue[]; length?: NonNegativeFinite; color?: NonEmptyString; lineWidth?: NonNegativeFinite } = {})`; `count | values` 중 최대 하나.
- Planned (NOT IMPLEMENTED): `{ position?: "bottom" | "top" }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createYAxisTicks`

- Implemented: x tick schema와 같고 `position?: "left"`.
- Planned (NOT IMPLEMENTED): `{ position?: "left" | "right" }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editXAxisTicks`

- Implemented: create x tick schema에서 `scale`을 제외한다.
- Planned (NOT IMPLEMENTED): `{ position?: "bottom" | "top" }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editYAxisTicks`

- Implemented: create y tick schema에서 `scale`을 제외한다.
- Planned (NOT IMPLEMENTED): `{ position?: "left" | "right" }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createXAxisLabels`

- Implemented: `createXAxisLabels({ scale?: UserId; position?: "bottom"; count?: PositiveInteger; values?: readonly TickValue[]; ...LabelOptions } = {})`; `count | values` 중 최대 하나.
- Planned (NOT IMPLEMENTED): `{ position?: "bottom" | "top"; format?: AxisFormatString }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createYAxisLabels`

- Implemented: x label schema와 같고 `position?: "left"`.
- Planned (NOT IMPLEMENTED): `{ position?: "left" | "right"; format?: AxisFormatString }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editXAxisLabels`

- Implemented: create x label schema에서 `scale`을 제외한다.
- Planned (NOT IMPLEMENTED): `{ position?: "bottom" | "top"; format?: AxisFormatString }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editYAxisLabels`

- Implemented: create y label schema에서 `scale`을 제외한다.
- Planned (NOT IMPLEMENTED): `{ position?: "left" | "right"; format?: AxisFormatString }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createXAxisTicksAndLabels`

- Implemented: `createXAxisTicksAndLabels({ scale?: UserId; position?: "bottom"; ...TickAndLabelOptions } = {})`
- Planned (NOT IMPLEMENTED): `{ position?: "bottom" | "top"; labels?: { format?: AxisFormatString } }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createYAxisTicksAndLabels`

- Implemented: x aggregate schema와 같고 `position?: "left"`.
- Planned (NOT IMPLEMENTED): `{ position?: "left" | "right"; labels?: { format?: AxisFormatString } }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editXAxisTicksAndLabels`

- Implemented: create x aggregate schema에서 `scale`을 제외하며 최소 한 option이 필요하다.
- Planned (NOT IMPLEMENTED): `{ position?: "bottom" | "top"; labels?: { format?: AxisFormatString } }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editYAxisTicksAndLabels`

- Implemented: create y aggregate schema에서 `scale`을 제외하며 최소 한 option이 필요하다.
- Planned (NOT IMPLEMENTED): `{ position?: "left" | "right"; labels?: { format?: AxisFormatString } }`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createXAxisTitle`

- Implemented: `createXAxisTitle({ scale?: UserId; ...AxisTitleOptions<"bottom"> } = {})`
- Planned (NOT IMPLEMENTED): `AxisTitleOptions<"bottom" | "top">`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createYAxisTitle`

- Implemented: `createYAxisTitle({ scale?: UserId; ...AxisTitleOptions<"left"> } = {})`
- Planned (NOT IMPLEMENTED): `AxisTitleOptions<"left" | "right">`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editXAxisTitle`

- Implemented: create x title schema에서 `scale`을 제외한다.
- Planned (NOT IMPLEMENTED): `AxisTitleOptions<"bottom" | "top">`
- Proposed (NOT IMPLEMENTED): —

### Formal values — `editYAxisTitle`

- Implemented: create y title schema에서 `scale`을 제외한다.
- Planned (NOT IMPLEMENTED): `AxisTitleOptions<"left" | "right">`
- Proposed (NOT IMPLEMENTED): —

```typescript
type GridDirectionOptions = {
  scale?: UserId;
  coordinate?: UserId;
  count?: PositiveInteger;
  values?: readonly Finite[];
  color?: NonEmptyString;
  lineWidth?: NonNegativeFinite;
  strokeDash?: DashPattern;
};
```

### Formal values — `createGrid`

- Implemented: `createGrid({ horizontal?: boolean | GridDirectionOptions; vertical?: boolean | GridDirectionOptions } = {})`; horizontal default true, vertical default false.
- Proposed (NOT IMPLEMENTED): —

### Formal values — `createHorizontalGrid`

- Implemented: `createHorizontalGrid(options?: GridDirectionOptions)`
- Proposed (NOT IMPLEMENTED): ordinal grid positioning `{ placement?: "center" | "boundary" }`.

### Formal values — `createVerticalGrid`

- Implemented: `createVerticalGrid(options?: GridDirectionOptions)`
- Proposed (NOT IMPLEMENTED): ordinal grid positioning `{ placement?: "center" | "boundary" }`.

```typescript
type LegendPosition = "right" | "bottom" | "top";
type PlannedLegendPosition = LegendPosition | "left";
type LegendAlign = "left" | "center" | "right";
type LegendDirection = "horizontal" | "vertical";
type LegendSymbolLayer =
  | { type: "line"; length?: NonNegativeFinite; lineWidth?: NonNegativeFinite }
  | { type: "point"; shape?: "circle"; size?: NonNegativeFinite; fill?: NonEmptyString; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite }
  | { type: "swatch"; width?: NonNegativeFinite; height?: NonNegativeFinite; stroke?: NonEmptyString; strokeWidth?: NonNegativeFinite };
type LegendBorder = false | true | {
  color?: NonEmptyString;
  lineWidth?: NonNegativeFinite;
  padding?: NonNegativeFinite;
  background?: NonEmptyString;
};
```

### Formal values — `createLegend`

- Implemented: `createLegend({ target?: UserId; channels?: readonly ("color" | "strokeDash" | "shape")[]; position?: LegendPosition; align?: LegendAlign; direction?: LegendDirection; columns?: PositiveInteger; offset?: NonNegativeFinite; titlePosition?: "top" | "left"; title?: NonEmptyString; symbol?: "auto" | LegendSymbolLayer | { layers: readonly LegendSymbolLayer[] }; labels?: TextStyle; titleStyle?: TextStyle; itemGap?: PositiveFinite; border?: LegendBorder; count?: IntegerAtLeast2 } = {})`
- Planned (NOT IMPLEMENTED): `{ position?: PlannedLegendPosition }`; left supports categorical, point-composite and size side layouts.
- Proposed (NOT IMPLEMENTED): point-composite top/bottom, `interactive?: boolean` and continuous-color symbol contract.

### Formal values — `createGuides`

- Implemented: `createGuides({ axes?: false | Parameters<ChartProgram["createAxes"]>[0]; grid?: false | Parameters<ChartProgram["createGrid"]>[0]; legend?: false | Parameters<ChartProgram["createLegend"]>[0] } = {})`
- Planned (NOT IMPLEMENTED): nested axes가 top/right positions, nested legend가 left position을 전달한다.
- Proposed (NOT IMPLEMENTED): —; new guide type requires an approved child action first.

### Formal values — `createTitle`

- Implemented: `createTitle({ text: NonEmptyString; subtitle?: NonEmptyString; position?: "top"; align?: "left" | "center" | "right"; offset?: Finite; gap?: NonNegativeFinite; titleStyle?: TextStyle; subtitleStyle?: TextStyle })`
- Planned (NOT IMPLEMENTED): `{ position?: "top" | "bottom" | "left" | "right" }`
- Proposed (NOT IMPLEMENTED): `{ maxWidth?: PositiveFinite; lineHeight?: PositiveFinite; wrap?: "word" | "character" }`

### Formal values — `createCoordinate`

- Implemented: `createCoordinate({ id?: UserId; type?: "cartesian" | "polar"; layers?: readonly UserId[] } = {})`; Polar resource storage만 현재 materialized behavior다.
- Proposed (NOT IMPLEMENTED): Polar positional/guide options; `clip`/transform options는 아직 미결정이다.

### Formal values — `createScale`

- Implemented: `createScale({ id: UserId; type?: ScaleType; domain?: ContinuousDomain | OrdinalDomain; range?: "auto" | readonly unknown[]; nice?: boolean; zero?: boolean })`; type별 validation이 값을 제한한다.
- Proposed (NOT IMPLEMENTED): `{ type?: "log" | "sqrt" | "symlog"; clamp?: boolean; reverse?: boolean; unknown?: unknown }`

### Formal values — `editSemantic`

- Implemented: `editSemantic({ property: SemanticPropertyPath; value: ValueForSemanticPath<typeof property> })`; path/value pair는 semantic grammar의 closed schema다.
- Proposed (NOT IMPLEMENTED): wildcard path, multi-property object 또는 batch edit.

### Formal values — `createGraphics`

- Implemented: `createGraphics({ id: UserId; type: "canvas" | "collection" | "circle" | "rect" | "line" | "text" | "path"; length?: NonNegativeInteger; before?: UserId; after?: UserId })`; `before | after` 중 최대 하나.
- Proposed (NOT IMPLEMENTED): `{ parent?: UserId }` for approved container/program composition; renderer-specific `svg | g` types는 제안하지 않는다.

### Formal values — `editGraphics`

- Implemented: `editGraphics({ target: UserId | GeneratedChildId; property: GraphicPropertyForTarget; value: GraphicValueForProperty })`; one property per action, collection scalar broadcast 또는 exact-length distribution.
- Proposed (NOT IMPLEMENTED): multi-property dictionary/batch edit는 현재 one-change trace invariant와 충돌하므로 제안하지 않는다.

## Parameter value coverage and proposals

이 section은 앞의 action 계약을 **값 단위**로 펼친 coverage ledger다. 각 action에서 parameter를
생략했을 때, 현재 허용되는 값, 경계와 잘못된 값, 앞으로 고려할 값을 구분한다.

- **✅ Covered**: 해당 값 또는 equivalence class를 직접 검증하는 executable test가 있다.
- **⚠️ Partial**: 값은 구현됐지만 일부 경계나 다른 parameter와의 조합만 검증됐다.
- **❌ Missing**: 구현된 값인데 직접적인 검증 근거가 없다.
- **🟣 Proposed**: future candidate다. 구현, TypeScript와 public docs에는 아직 존재하지 않는다.
- **No proposal**: 현재 합의되거나 필요성이 확인된 future value가 없다.

`Implemented` 값이 있다고 해서 모든 조합을 Cartesian product로 테스트하지 않는다. 닫힌 값은 각각
검증하고, 열린 값은 default, 대표값, 경계, invalid class와 의미 있는 precedence pair를 검증한다.

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

### Value coverage — `editCanvas`

- `width`, `height`, `margin`
  - ✅ Covered: 한 property만 변경, 여러 property 변경, unchanged omission, auto-range rematerialization,
    explicit-range preservation과 invalid resolved bounds.
  - ⚠️ Partial: 여러 legend/title block과 다중 shared scale이 동시에 존재할 때의 resize 조합.
- `background`
  - ✅ Covered: background-only edit가 scale/mark/guide를 rematerialize하지 않음.
- Empty options
  - ✅ Covered: `{}` rejection.
- Proposed values는 `createCanvas`의 responsive/auto 후보와 동일하다.
- Evidence: `test/unit/actions/canvas/edit-canvas.test.js`.

### Value coverage — `createData`

- `id`
  - ✅ Covered: valid custom ID, empty/malformed ID, duplicate ID.
  - No proposal: ID vocabulary는 user-defined 상태를 유지한다.
- `values`
  - ✅ Covered: empty/non-empty array, multiple datasets, plain-object rows, caller ownership/immutability.
  - ⚠️ Partial: deeply nested arrays/objects와 unusual scalar cells의 explicit contract cases.
  - 🟣 Proposed: async iterable/columnar input adapter. Source dataset immutability와 deterministic trace
    completion 정책이 먼저 필요하다.
- Evidence: `test/unit/actions/data/create-data.test.js`.

### Value coverage — `filterData`

- `id`, `source`
  - ✅ Covered: explicit source, current-data inference, missing/ambiguous source, duplicate derived ID.
- `field`
  - ✅ Covered: non-empty string과 invalid field option.
  - ⚠️ Partial: rows에 field가 일부만 존재하는 sparse data의 명시적 result case.
- `oneOf`
  - ✅ Covered: string/number/boolean scalar membership, owned input, invalid transform values.
  - ⚠️ Partial: empty list, duplicate values와 `null` membership의 direct behavior.
  - 🟡 Planned: mutually exclusive comparison/range modes, ordered type rules와 inclusive endpoints.
- Evidence: `test/unit/actions/data/filter-data.test.js`.

### Value coverage — `createRegressionData`

- `id`, `source`, `x`, `y`, `groupBy`
  - ✅ Covered: inferred/explicit source, grouped/ungrouped, missing fields, non-finite data와 degenerate groups.
- `method`
  - ✅ Covered: `"linear"`와 unknown value rejection.
  - 🟡 Planned: `"polynomial"`, `"loess"`, method-specific degree/span, deterministic provenance/output ordering.
- `confidence`
  - ✅ Covered: default `0.95`, representative explicit value, 0/1/out-of-range rejection.
  - ⚠️ Partial: near-boundary positive values의 numeric stability.
- `interval`
  - ✅ Covered: `"mean"`과 unknown value rejection.
  - 🟡 Planned: `"prediction"` for linear/polynomial with residual variance and Student-t bounds.
- Evidence: `test/unit/actions/data/regression-data.test.js`,
  `test/charts/regression-scatterplot/reference-values.test.js`.

### Value coverage — `createDensityData`

- `id`, `source`, `field`, `groupBy`
  - ✅ Covered: inferred/explicit source, grouped/ungrouped, missing field와 non-finite samples.
- `bandwidth`
  - ✅ Covered: 생략/`"auto"`, positive finite representative, zero/negative/non-finite rejection.
  - ⚠️ Partial: 매우 작은/큰 positive bandwidth numeric behavior.
- `extent`
  - ✅ Covered: `"auto"`, explicit `[min, max]`, reversed/non-finite rejection.
  - ⚠️ Partial: constant extent와 source 밖으로 확장한 extent.
- `steps`
  - ✅ Covered: default `100`, explicit representative, `<2`/non-integer rejection.
  - ⚠️ Partial: minimum `2`와 매우 큰 steps의 performance boundary.
- `as`
  - ✅ Covered: inferred names, two explicit names, wrong cardinality/invalid names rejection.
- 🟡 Planned: shared `DensityKernel`, Gaussian default, alternate formula fixtures와 provenance.
- 🟣 Proposed: `"density" | "count"` normalization mode.
- Evidence: `test/unit/actions/data/density-data.test.js`,
  `test/charts/density-area/reference-values.test.js`.

### Value coverage — `createDerivedData`

- `id`, `source`
  - ✅ Covered: valid IDs, duplicate output, unknown source.
- `transform`
  - ✅ Covered: filter/regression/density schema through their public parent actions.
  - ⚠️ Partial: direct low-level call의 각 schema와 multi-entry array rejection/acceptance boundary.
  - No proposal: one-transform provenance resource라는 현재 역할을 유지한다.
- Evidence: data action tests와 `test/charts/regression-scatterplot/semantic.test.js`.

### Value coverage — `createPointMark`

- `id`, `data`
  - ✅ Covered: current/explicit dataset, empty dataset, multiple marks, unknown data와 duplicate IDs.
- `shape`
  - ✅ Covered: `"circle"`, `"square"`, omission→circle, unknown shape rejection.
  - 🟡 Planned: accepted 12-value `PointShape`, normalized path recipes, legend parity와 >12 category error.
- Evidence: `test/unit/actions/marks/create-point-mark.test.js`.

### Value coverage — `createLineMark`

- `id`, `data`
  - ✅ Covered: current/explicit/empty dataset, invalid IDs와 conflicts.
- `strokeWidth`
  - ✅ Covered: omission→`2`, zero, positive representative, negative/non-finite rejection.
- 🟣 Proposed: `curve: "linear" | "step" | "basis"`; path interpolation을 semantic인지 graphical인지 먼저 결정해야 한다.
- Evidence: `test/unit/actions/marks/create-line-mark.test.js`.

### Value coverage — `createBarMark`

- `id`, `data`
  - ✅ Covered: current/explicit/empty dataset, invalid options와 conflicts.
- No proposal: orientation/group/stack/width는 mark parameter가 아니라 encoding action이 소유한다.
- Evidence: `test/unit/actions/marks/create-bar-mark.test.js`.

### Value coverage — `createAreaMark`

- `id`, `data`
  - ✅ Covered: current/explicit derived dataset과 invalid resources through density/regression flows.
- `fill`
  - ⚠️ Partial: omission/theme default와 representative explicit color; empty/non-string rejection은 action
    validation에 있으나 dedicated boundary test가 부족하다.
- `opacity`
  - ⚠️ Partial: default `0.2`, representative `0.18`/`0.5`, invalid range; exact 0/1 endpoints direct test가 부족하다.
- 🟡 Planned: `stroke`, `strokeWidth`, no-outline default, edit removal와 rematerialization persistence.
- Evidence: area materialization, density and regression chart tests.

### Value coverage — `encodeX`

- `field`, `target`
  - ✅ Covered: inferred/explicit point, line, bar, area targets; missing field, ambiguous/invalid target.
- `fieldType`
  - ✅ Covered: point/area `"quantitative"`, line `"temporal"`, bar `"quantitative"` bin과 `"ordinal"`.
  - ✅ Covered: unsupported mark/type pairs rejection.
  - 🟣 Proposed: broader raw temporal/ordinal combinations per mark; each needs scale and mark grain policy.
- `coordinate`
  - ✅ Covered: omitted Cartesian default, explicit/reused coordinate, incompatible coordinate rejection.
  - 🟣 Proposed: Polar theta/radial mapping; action naming unresolved.
- `aggregate`
  - ⚠️ Partial: 현재 x에서는 생략만 supported; unsupported aggregate rejection matrix가 부분적이다.
- `bin.maxBins`
  - ✅ Covered: default via histogram, representative positive integer, invalid integer/value.
  - ⚠️ Partial: `1`, very large maxBins와 constant field interaction.
  - 🟡 Planned: mutually exclusive `bin.step`/`bin.boundaries`, exact/irregular geometry와 scale conflicts.
- `scale.id/type/domain/range/nice/zero`
  - ✅ Covered: auto/explicit linear, time, ordinal definitions; explicit domain/range precedence;
    wrong type and shared-channel conflicts.
  - ⚠️ Partial: 모든 fieldType × nice × zero × explicit bound pairwise 조합.
  - 🟣 Proposed: `log`, `sqrt`, `symlog` scale types and reverse/clamp options.
- Evidence: position, temporal, histogram-bin and ordinal-bar action tests.

### Value coverage — `encodeY`

- `field`, `target`, `coordinate`
  - ✅ Covered: raw quantitative point/area, aggregate line/bar, inferred histogram count and target ambiguity.
- `fieldType`
  - ✅ Covered: current quantitative combinations와 invalid types.
  - 🟣 Proposed: temporal/ordinal y mark combinations.
- `aggregate`
  - ✅ Covered: omission, `"mean"`, `"count"`, incompatible aggregate rejection.
  - 🟡 Planned: `"sum" | "median" | "min" | "max" | "distinct" | "valid" | "missing" |
    "variance" | "varianceP" | "stdev" | "stdevP" | "stderr" | "q1" | "q3" | "ciLower" |
    "ciUpper"`; final visual grain, sample validity, title/domain inference가 필요하다.
  - 🟣 Proposed: parameterized quantile과 ordered first/last; `argmin`/`argmax` row transform.
- `stack`
  - ✅ Covered: `"zero"`, `null`, incompatible policy rejection.
  - 🟣 Proposed: `"normalize" | "center"`; y scale domain과 baseline semantics가 필요하다.
- `scale`
  - ✅ Covered: auto/explicit domain/range, nice/zero precedence, shared consumer conflicts.
  - ⚠️ Partial: aggregate/stack/scale option pairwise matrix.
- Evidence: point position, line aggregate, histogram y and ordinal aggregate bar tests.

### Value coverage — `encodeXOffset`

- `field`, `target`
  - ✅ Covered: nominal grouping field, explicit/inferred eligible grouped bar, missing/incompatible prerequisites.
- `fieldType`
  - ✅ Covered: `"nominal"`와 invalid alternatives.
- `scale.id/type/domain/range`
  - ✅ Covered: defaults, explicit order, reversed range, auto range rematerialization, invalid definitions.
  - 🟣 Proposed: padding controls between sub-bands; parent/child band geometry ownership이 필요하다.
- Evidence: `test/unit/actions/encodings/x-offset-encoding.test.js`.

### Value coverage — `encodeY2`

- `field`, `target`
  - ✅ Covered: quantitative upper field, eligible area, missing y/missing field errors.
- `fieldType`
  - ✅ Covered: `"quantitative"`와 invalid alternatives.
- `scale.id`
  - ✅ Covered: omission/shared y ID, same explicit ID, conflicting ID rejection.
  - No proposal: y2는 y scale 공유가 semantic invariant다.
- Evidence: ranged-area and regression semantic/materialization tests.

### Value coverage — `encodeYRange`

- `lower`, `upper`
  - ✅ Covered: distinct quantitative fields와 missing/invalid fields.
- `target`, `fieldType`, `coordinate`, `scale`
  - ✅ Covered: inferred/explicit target와 shared y/y2 child hierarchy.
  - ⚠️ Partial: explicit coordinate/scale option combinations direct test.
- 🟣 Proposed: horizontal ranged area의 atomic `encodeXRange`; x2 semantic channel이 먼저 필요하다.
- Evidence: ranged-area and regression tests.

### Value coverage — `encodeGroup`

- `field`, `target`
  - ✅ Covered: nominal line/area grouping, inferred/explicit target, density group match/mismatch.
- `fieldType`
  - ✅ Covered: `"nominal"`와 invalid values.
- No proposal: group은 scale-free path partition이라는 현재 역할을 유지한다.
- Evidence: line-series, ranged-area and density-area tests.

### Value coverage — `encodeHistogram`

- `field`, `target`, `coordinate`
  - ✅ Covered: shortest/inferred call, explicit forwarding, missing/invalid child prerequisites.
- `maxBins`
  - ✅ Covered: omission→`10`, representative explicit values, invalid through child `encodeX`.
  - ⚠️ Partial: minimum/large values와 sparse/constant data pair.
- `stack`
  - ✅ Covered: omission→`"zero"`, explicit `"zero"`와 `null` forwarding/rejection by supported semantics.
- `xScale`, `yScale`
  - ✅ Covered: explicit objects, default policies, domain/range precedence.
  - ⚠️ Partial: independent scale IDs and all policy combinations.
- 🟡 Planned: `binStep`/explicit bin boundaries; maxBins exclusivity, domain ownership와 guide effects를 고정한다.
- Evidence: `test/unit/actions/encodings/encode-histogram.test.js`와 histogram chart tests.

### Value coverage — `encodeDensity`

- `field`, `target`, `source`, `groupBy`
  - ✅ Covered: inferred/explicit target/source, grouped/ungrouped, ambiguity와 conflicting pre-encodings.
- `bandwidth`, `extent`, `steps`, `as`
  - ✅ Covered: forwarding of auto/default and representative explicit values, invalid input atomicity.
  - ⚠️ Partial: full numeric boundary matrix는 `createDensityData` coverage에 의존한다.
- `densityChannel`
  - ✅ Covered: omission→`"y"`, explicit `"x"`, unknown value rejection.
- `coordinate`
  - ✅ Covered: omitted/inferred and explicit compatible Cartesian coordinate.
- `valueScale`, `densityScale`
  - ✅ Covered: defaults, explicit IDs/domain/range, baseline zero requirement.
  - ⚠️ Partial: reversed ranges and explicit density domain excluding zero across both orientations.
- 🟡 Planned: shared `"gaussian" | "epanechnikov" | "uniform" | "triangular"` kernel grammar,
  provenance and derived revision behavior.
- 🟣 Proposed: `"density" | "count"` normalization mode.
- Evidence: density encoding/data/mark/chart tests.

### Value coverage — `encodeColor`

- `field`, `target`
  - ✅ Covered: point/line/bar/area, inferred/explicit target, missing/invalid nominal values.
- `fieldType`
  - ✅ Covered: `"nominal"`와 invalid alternatives.
- `layout`
  - ✅ Covered: omission, `"stack"`, `"group"`, incompatible mark/layout rejection.
  - 🟡 Planned: `"fill" | "overlay" | "center" | "diverging"` with mark compatibility, normalized,
    centered and signed baseline policies; `encodeGroup`과 distinct ownership을 유지한다.
- `scale.id/type/domain`
  - ✅ Covered: ordinal default, explicit ID/order, incomplete explicit domain rejection.
- `scale.range/palette`
  - ✅ Covered: explicit color array, `{ palette: "tableau10" }`, range+palette conflict, invalid colors.
  - 🟣 Proposed: additional named categorical palettes and continuous color interpolation.
- Evidence: color, line-series, bar-color, area-color and grouped-bar tests.

### Value coverage — `encodeStrokeDash`

- `field`, `target`, `fieldType`
  - ✅ Covered: nominal line series, inferred/explicit target, invalid mark/type/field.
- `scale.domain`
  - ✅ Covered: auto and explicit order.
- `scale.range`
  - ✅ Covered: automatic pattern cycling, explicit even-length non-negative patterns, invalid patterns.
  - ⚠️ Partial: empty solid pattern mixed with repeated categories and very long patterns.
- 🟣 Proposed: constant strokeDash action for non-field-driven line appearance.
- Evidence: line-series encoding and scale tests.

### Value coverage — `encodeSize`

- `field`, `target`, `fieldType`
  - ✅ Covered: quantitative point field, inferred/explicit target, invalid type/field.
- `scale.domain/range`
  - ✅ Covered: auto domain/range `[24, 196]`, representative mapping and explicit values through shared scale tests.
  - ⚠️ Partial: zero/negative area range rejection and constant domains in direct action tests.
- Interaction
  - ✅ Covered: constant radius conflict and shape-independent equal-area materialization.
- 🟣 Proposed: legend-friendly range presets or `minArea`/`maxArea` shorthand; scale range와의 precedence가 필요하다.
- Evidence: point appearance and regression-guide tests.

### Value coverage — `encodeShape`

- `field`, `target`, `fieldType`
  - ✅ Covered: nominal point field와 invalid alternatives.
- `scale.domain/range`
  - ✅ Covered: auto domain, circle/square result, heterogeneous collection and legend symbol materialization.
  - ⚠️ Partial: explicit shape range order와 incomplete domain/range direct cases.
  - 🟡 Planned: shared 12-shape range, distinct-domain capacity, mark/legend/render parity.
- Evidence: point appearance and regression chart/guide tests.

### Value coverage — `encodeOpacity`

- `value`
  - ✅ Covered: representative value, 0, 1, below/above range와 non-finite rejection.
- `target`
  - ✅ Covered: inferred/explicit point, unknown/incompatible target.
- Reassignment
  - ✅ Covered: same action replaces the stored constant and concrete child opacity immutably.
- 🟣 Proposed: field-driven quantitative opacity with scale; constant action과 distinct API/semantic contract가 필요하다.
- Evidence: point appearance and regression tests.

### Value coverage — `encodeRadius`

- `value`
  - ✅ Covered: 0, positive representative, negative/non-finite rejection.
- `target`
  - ✅ Covered: inferred/explicit point와 invalid target.
- Interaction
  - ✅ Covered: semanticSpec unchanged, child broadcast, same-action reassignment, encodeSize conflict.
- Proposed: additional constant point size units(`area` vs `radius`)는 별도 naming/precedence 결정이 필요하다.
- Evidence: `test/unit/actions/encodings/radius-encoding.test.js`.

### Value coverage — `encodeBarWidth`

- `band`
  - ✅ Covered: omission→`0.72`, representative `(0,1)`, exact `1`, 0/negative/>1/non-finite rejection.
- `target`
  - ✅ Covered: inferred/explicit grouped bar와 incomplete prerequisites.
- Reassignment
  - ✅ Covered: same action replaces the stored band and concrete rect widths immutably.
- 🟡 Planned: mutually exclusive fixed pixels/band modes and `[0,1)` inner padding with responsive behavior.
- Evidence: grouped-bar width and chart reference tests.

### Value coverage — `createRegression`

- `target`, `x`, `y`
  - ✅ Covered: current/unique inference, explicit values, ambiguous/invalid target와 field override.
- `groupBy`
  - ✅ Covered: color/shape inference, explicit field, explicit ungrouped `undefined`, ambiguous candidates.
- `confidence`
  - ✅ Covered: omission→`0.95`, representative explicit and invalid via child data action.
- `band.color`, `band.opacity`, `line.strokeWidth`
  - ✅ Covered: defaults and representative explicit styles.
  - ⚠️ Partial: color/type and numeric endpoints are mostly child-action validation rather than aggregate direct tests.
- 🟡 Planned: polynomial/LOESS method forwarding, linear/polynomial prediction interval, method-specific
  band creation/opt-out와 child trace hierarchy.
- Evidence: `test/unit/actions/regression/create-regression.test.js` and regression chart tests.

### Value coverage — `createRegressionBand`

- `id`, `data`, `x`, `lower`, `upper`, `coordinate`, `xScale`, `yScale`
  - ✅ Covered: valid aggregate flow and shared-scale output.
  - ⚠️ Partial: each missing/unknown resource as an independent direct-call case.
- `groupBy`
  - ✅ Covered: present/omitted.
- `color`, `opacity`
  - ⚠️ Partial: defaults/representative values; endpoints and invalid types rely on area child validation.
- 🟡 Planned: optional band outline and regression aggregate forwarding through shared area stroke options.
- Evidence: regression unit/chart tests.

### Value coverage — `createRegressionLine`

- `id`, `data`, `x`, `y`, `coordinate`, `xScale`, `yScale`
  - ✅ Covered: valid grouped/ungrouped flow and shared coordinates/scales.
  - ⚠️ Partial: missing resource direct-call matrix.
- `groupBy`, `colorScale`
  - ✅ Covered: paired presence and omitted ungrouped case.
- `strokeWidth`
  - ✅ Covered: default `3`, representative explicit; invalid values delegated to line mark.
- 🟣 Proposed: curve option forwarded only after line interpolation contract exists.
- Evidence: regression unit/chart tests.

### Value coverage — `createAxes`

- `coordinate.id`
  - ✅ Covered: omission with unique coordinate, explicit matching ID, unknown/ambiguous IDs.
- `coordinate.type`
  - ✅ Covered: omission/`"auto"`, `"cartesian"`, stored `"polar"` rejection, unknown value.
  - 🟣 Proposed: `"polar"` execution after Polar guide materialization exists; currently it is assertion-only and rejected.
- `x`, `y`
  - ✅ Covered: omission inference, `{}` explicit selection, `false` opt-out, nested options, neither selected error.
  - ⚠️ Partial: multi-layer shared coordinate with one disabled axis and multiple candidate scales pairwise cases.
  - 🟡 Planned: x top/y right complete-axis forwarding while preserving channel defaults.
- Proposed: future Polar axes should use coordinate channels rather than force x/y objects into Polar semantics.
- Evidence: `test/unit/actions/guides/create-axes.test.js`.

### Value coverage — `createXAxis`

- `scale`, `coordinate`
  - ✅ Covered: defaults, explicit IDs, missing/unused/conflicting resources.
- `position`
  - ✅ Covered: omission→`"bottom"`, explicit bottom, unsupported value rejection.
  - 🟡 Planned: `"top"`; outward baseline/ticks, labels/title offsets와 top-margin validation.
- `line`, `ticksAndLabels`, `title`
  - ✅ Covered: omission/default objects, nested representative overrides, unknown nested keys, partial duplicate failure.
  - ⚠️ Partial: all three nested appearance objects customized simultaneously.
- Evidence: `test/unit/actions/guides/axis-actions.test.js`.

### Value coverage — `createYAxis`

- `scale`, `coordinate`
  - ✅ Covered: defaults, explicit IDs and conflicts.
- `position`
  - ✅ Covered: omission→`"left"`, explicit left, unsupported value rejection.
  - 🟡 Planned: `"right"`; mirrored tick/label/title geometry와 right-margin validation.
- `line`, `ticksAndLabels`, `title`
  - ✅ Covered: defaults, representative nested overrides and invalid nested keys.
- Evidence: `test/unit/actions/guides/axis-actions.test.js`.

### Value coverage — `createXAxisLine`

- `scale`: ✅ Covered default `"x"`, explicit ID, unknown/unconsumed/unresolved scale.
- `position`: ✅ Covered `"bottom"`, invalid; 🟡 Planned `"top"`.
- `color`: ✅ Covered default, explicit non-empty, empty/non-string rejection.
- `lineWidth`: ✅ Covered default `1`, zero, positive, negative/non-finite rejection.
- Evidence: `test/unit/actions/guides/axis-line-actions.test.js`.

### Value coverage — `createYAxisLine`

- `scale`: ✅ Covered default `"y"`, explicit and invalid resources.
- `position`: ✅ Covered `"left"`, invalid; 🟡 Planned `"right"`.
- `color`, `lineWidth`: ✅ Covered default/representative/boundary/invalid classes shared with x.
- Evidence: `test/unit/actions/guides/axis-line-actions.test.js`.

### Value coverage — `editXAxisLine`

- `position`: ✅ Covered omitted/existing and `"bottom"`; 🟡 Planned `"top"` with create/edit parity.
- `color`, `lineWidth`: ✅ Covered partial edits, unchanged omissions and invalid values.
- Empty options: ⚠️ Partial. 현재 geometry re-inference 용도로 `{}`가 허용되는 동작을 더 명시적으로 고정할 필요가 있다.
- Evidence: `test/unit/actions/guides/axis-line-actions.test.js`.

### Value coverage — `editYAxisLine`

- `position`, `color`, `lineWidth`: ✅ Covered symmetric left-side partial edit and errors.
- 🟡 Planned: right-side edit with mirrored create/edit geometry.
- Evidence: `test/unit/actions/guides/axis-line-actions.test.js`.

### Value coverage — `createXAxisTicks`

- `scale`: ✅ Covered default/explicit and invalid resources.
- `position`: ✅ Covered `"bottom"`/invalid; 🟡 Planned `"top"`.
- `count`: ✅ Covered omission→5, positive integer, zero/negative/non-integer, count+values conflict.
- `values`: ✅ Covered finite values/timestamps, histogram boundaries, ordinal domain/subset, out-of-domain/invalid values.
- `length`: ✅ Covered default `6`, zero, positive and negative rejection.
- `color`, `lineWidth`: ✅ Covered defaults, representatives and invalid values.
- Evidence: `test/unit/actions/guides/axis-tick-actions.test.js`, histogram/ordinal/temporal axis tests.

### Value coverage — `createYAxisTicks`

- `scale`, `position`, `count`, `values`, `length`, `color`, `lineWidth`
  - ✅ Covered: linear y defaults, explicit values and shared invalid classes.
  - ⚠️ Partial: reversed y domain with explicit values and very dense count.
- 🟡 Planned: right position after mirrored y-axis contract.
- Evidence: axis-tick and chart guide tests.

### Value coverage — `editXAxisTicks`

- `position`: ✅ Covered bottom/invalid.
- `count`, `values`: ✅ Covered mode switch, mutually exclusive inputs, rematerialization and invalid domains.
- `length`, `color`, `lineWidth`: ✅ Covered partial appearance edits and invalid values.
- 🟡 Planned: top-position geometry with create/edit parity.
- Evidence: `test/unit/actions/guides/axis-tick-actions.test.js`.

### Value coverage — `editYAxisTicks`

- 모든 parameter는 x edit과 같은 value classes를 사용한다.
  - ✅ Covered: representative values, mode policy and invalid options.
  - ⚠️ Partial: repeated count↔values switching sequence.
- 🟡 Planned: right-position geometry with create/edit parity.
- Evidence: axis-tick and tick-group tests.

### Value coverage — `createXAxisLabels`

- `scale`, `position`, `count`, `values`
  - ✅ Covered: linear/time/ordinal modes, existing tick reuse, conflict/out-of-domain rejection.
- `offset`: ✅ Covered default `18`, zero/positive, negative rejection.
- `format`
  - ✅ Covered: `"auto"`, `{ decimals: 0 }`, positive decimals, invalid object.
  - ✅ Covered: non-auto time/ordinal rejection.
  - 🟡 Planned: closed `AxisFormatString` numeric/UTC tokens with deterministic browser/Node parity.
- `color`, `fontSize`, `fontFamily`, `fontWeight`
  - ✅ Covered: defaults, representative string/numeric weight and invalid classes.
- Evidence: `test/unit/actions/guides/axis-label-actions.test.js`, temporal/ordinal axis tests.

### Value coverage — `createYAxisLabels`

- `scale`, `position`, `count`, `values`, `offset`, `format`, font style
  - ✅ Covered: linear y defaults, explicit/derived values, decimal formatting and conflicts.
  - ⚠️ Partial: numeric fontWeight boundaries and reversed range alignment.
- 🟡 Planned: right-side label alignment and shared format tokens.
- Evidence: axis-label and chart guide tests.

### Value coverage — `editXAxisLabels`

- `position`, `count`, `values`, `offset`, `format`, color/font parameters
  - ✅ Covered: partial style edit, decimal format, tick conflict and Canvas rematerialization.
- 🟡 Planned: top position and shared format tokens follow create labels.
- Evidence: `test/unit/actions/guides/axis-label-actions.test.js`.

### Value coverage — `editYAxisLabels`

- 모든 edit parameter
  - ✅ Covered: representative partial edits and shared invalid classes.
  - ⚠️ Partial: switching between auto and decimal format across repeated edits.
- 🟡 Planned: right-side alignment and shared format tokens follow `createYAxisLabels`.
- Evidence: axis-label tests.

### Value coverage — `createXAxisTicksAndLabels`

- `scale`, `position`, `count`, `values`
  - ✅ Covered: shared forwarding, count/values conflict and default inference.
- `ticks.length/color/lineWidth`, `labels.offset/format/color/fontSize/fontFamily/fontWeight`
  - ✅ Covered: representative nested overrides, unknown nested keys and independent child effects.
  - ⚠️ Partial: all nested properties explicitly set in one call.
- 🟡 Planned: top position and label format tokens follow leaf actions.
- Evidence: `test/unit/actions/guides/axis-tick-group-actions.test.js`.

### Value coverage — `createYAxisTicksAndLabels`

- shared and nested parameters
  - ✅ Covered: y defaults, explicit values and trace hierarchy.
  - ⚠️ Partial: full nested option object.
- 🟡 Planned: right position and label format tokens follow both y leaf actions.
- Evidence: axis-tick-group tests.

### Value coverage — `editXAxisTicksAndLabels`

- `position`, `count`, `values`
  - ✅ Covered: atomic policy changes and invalid mutual use.
- `ticks`, `labels`
  - ✅ Covered: only requested child edit, both child edit and empty edit rejection.
- 🟡 Planned: top position and label format tokens follow leaf actions.
- Evidence: `test/unit/actions/guides/axis-tick-group-actions.test.js`.

### Value coverage — `editYAxisTicksAndLabels`

- shared/nested edit parameters
  - ✅ Covered: representative values, child selection and invalid options.
- 🟡 Planned: right-position aggregate edit follows both leaf actions.
- Evidence: axis-tick-group tests.

### Value coverage — `createXAxisTitle`

- `text`: ✅ Covered inferred field/aggregate/density text, explicit non-empty, ambiguous/empty rejection.
- `scale`: ✅ Covered default/explicit/conflicting scale.
- `position`: ✅ Covered `"bottom"`/invalid; 🟡 Planned `"top"`.
- `at`: ✅ Covered `"start" | "center" | "end"`, in-domain number/category and out-of-domain/invalid.
- `offset`: ✅ Covered default `42`, zero/positive, negative rejection.
- `rotation`: ✅ Covered default `0`, finite explicit and non-finite rejection.
- `color`, `fontSize`, `fontFamily`, `fontWeight`: ✅ Covered defaults, representatives and invalid classes.
- Evidence: `test/unit/actions/guides/axis-title-actions.test.js`.

### Value coverage — `createYAxisTitle`

- `text`, `scale`, `at`, style: ✅ Covered symmetric inference, data positions and invalid values.
- `position`: ✅ Covered `"left"`; 🟡 Planned `"right"` with default positive half-turn rotation.
- `offset`: ✅ Covered default `52`; `rotation`: ✅ Covered default `-Math.PI / 2` and explicit finite values.
- Evidence: axis-title tests.

### Value coverage — `editXAxisTitle`

- `text`, `position`, `at`, `offset`, `rotation`, style
  - ✅ Covered: semantic text edit, graphical-only appearance edit, data-space relocation, invalid values.
- 🟡 Planned: top position follows `createXAxisTitle`.
- Evidence: axis-title tests.

### Value coverage — `editYAxisTitle`

- 모든 edit parameter
  - ✅ Covered: representative semantic/graphical edits and rematerialization.
  - ⚠️ Partial: repeated rotation/at interactions.
- 🟡 Planned: right position follows `createYAxisTitle`.
- Evidence: axis-title tests.

### Value coverage — `createGrid`

- `horizontal`
  - ✅ Covered: omission→enabled, `true`, `{}`, option object, `false`.
- `vertical`
  - ✅ Covered: omission→disabled, `true`, `{}`, option object, `false`.
- Interaction
  - ✅ Covered: horizontal only, both directions, neither selected error, invalid non-object value.
- No proposal at aggregate level; future direction options belong to direction actions.
- Evidence: `test/unit/actions/guides/grid-actions.test.js`.

### Value coverage — `createHorizontalGrid`

- `scale`, `coordinate`: ✅ Covered inference, explicit IDs, ambiguity/unknown/non-Cartesian errors.
- `count`: ✅ Covered default/inferred 5, positive integer, invalid and values conflict.
- `values`: ✅ Covered axis-tick reuse, explicit finite in-domain values, invalid/out-of-domain.
- `color`: ✅ Covered default/explicit/invalid.
- `lineWidth`: ✅ Covered default, zero/positive/invalid.
- `strokeDash`: ✅ Covered `[]`, even-length pattern, odd/negative/non-finite rejection.
- 🟣 Proposed: ordinal grid support; category boundary vs center policy를 정해야 한다.
- Evidence: `test/unit/actions/guides/grid-actions.test.js`.

### Value coverage — `createVerticalGrid`

- direction parameters
  - ✅ Covered: x-scale inference, histogram bin alignment, explicit values/styles and invalid resources.
  - ⚠️ Partial: temporal vertical grid with calendar ticks.
- 🟣 Proposed: ordinal boundary/center grid contract.
- Evidence: grid and density-guide tests.

### Value coverage — `createLegend`

- `target`
  - ✅ Covered: inferred/explicit line, bar, area and compatible point; ambiguity/invalid target.
- `channels`
  - ✅ Covered: color, strokeDash, color+strokeDash, point color+shape, duplicates/incompatible combinations.
- `position`
  - ✅ Covered: omission→`"right"`, `"right"`, `"bottom"`, `"top"`, invalid value.
  - 🟡 Planned: `"left"`; categorical, point-composite/size parity and left-margin geometry.
- `align`
  - ✅ Covered: top/bottom `"left" | "center" | "right"`, right center-only and invalid combinations.
- `direction`
  - ✅ Covered: `"horizontal" | "vertical"` top fill order and invalid value.
- `columns`
  - ✅ Covered: omitted, positive integer representative, invalid zero/non-integer.
- `offset`
  - ✅ Covered: default `8`, zero/positive, negative/non-finite rejection.
- `titlePosition`
  - ✅ Covered: `"top" | "left"`, defaults and invalid value.
- `title`
  - ✅ Covered: inferred field, explicit non-empty, empty/non-string rejection.
- `symbol`
  - ✅ Covered: `"auto"`, line shorthand, swatch shorthand, layered line+point recipes.
  - ⚠️ Partial: every layer type's zero/max dimensions, fill/stroke combinations and invalid nested keys.
  - 🟡 Planned: shared 12-shape point layers through the point-shape vocabulary.
  - 🟣 Proposed: area-gradient/continuous symbols.
- `labels`, `titleStyle`
  - ✅ Covered: representative color/font overrides and invalid styles.
  - ⚠️ Partial: numeric/string fontWeight boundaries across every position.
- `itemGap`
  - ✅ Covered: defaults and positive representative; ⚠️ Partial exact near-zero boundary.
- `border`
  - ✅ Covered: omission/`false`, `true`, explicit color/lineWidth/padding/background and invalid objects.
- `count`
  - ✅ Covered: omission→5, integer `>=2`, `<2`/non-integer rejection for size block.
- 🟡 Planned: left point-composite/size side layout.
- 🟣 Proposed: point-composite top/bottom, continuous color and interactive legends.
- Evidence: series, histogram, grouped-bar, top categorical and regression legend tests.

### Value coverage — `createGuides`

- `axes`, `grid`, `legend`
  - ✅ Covered: omission/applicability inference, `{}` explicit selection, nested options, `false` opt-out.
  - ✅ Covered: unsupported/non-object values, no selected guide and ambiguous child errors.
  - ⚠️ Partial: explicit selection of all three with every nested option family simultaneously.
- 🟡 Planned: nested top/right axes와 left legend forwarding.
- No proposal: title remains intentionally separate. New guide types should be added only with a concrete domain action.
- Evidence: `test/unit/actions/guides/guide-collection-actions.test.js` and density/regression guide tests.

### Value coverage — `createTitle`

- `text`, `subtitle`
  - ✅ Covered: required non-empty title, subtitle omitted/present, empty/non-string rejection.
- `position`
  - ✅ Covered: omission→`"top"`, explicit top, invalid value.
  - 🟡 Planned: `"bottom" | "left" | "right"`; occupied bounds, rotation과 guide collision contract.
- `align`
  - ✅ Covered: `"left" | "center" | "right"`, default left and invalid value.
- `offset`
  - ✅ Covered: zero/default, positive/negative finite values within layout, non-finite/out-of-layout rejection.
- `gap`
  - ✅ Covered: default `8`, zero/positive, negative/non-finite rejection.
- `titleStyle`, `subtitleStyle`
  - ✅ Covered: default and explicit color/fontSize/fontFamily/fontWeight, invalid values.
- 🟣 Proposed: wrapping, maxWidth, lineHeight and text measurement; browser/Node deterministic metrics가 필요하다.
- Evidence: `test/unit/actions/guides/title-actions.test.js`.

### Value coverage — `createCoordinate`

- `id`: ✅ Covered omission→`"main"`, valid custom IDs, malformed IDs and conflicting duplicate.
- `type`
  - ✅ Covered: omission→`"cartesian"`, `"cartesian"`, `"polar"`, unknown value.
  - Planned capability: Polar resource는 저장되지만 positional/guide materialization은 아직 없다.
- `layers`
  - ✅ Covered: omission/empty, one/multiple existing IDs, duplicates, unknown layer, reattachment conflict.
- Proposed: coordinate-level `clip`/transform options는 semantic vs graphical ownership 결정 전까지 추가하지 않는다.
- Evidence: `test/unit/actions/coordinates/create-coordinate.test.js`.

### Value coverage — `createScale`

- `id`: ✅ Covered valid/invalid IDs, equivalent idempotence and conflicting duplicate.
- `type`
  - ✅ Covered: omission→`"linear"`, `"linear" | "time" | "ordinal"`, unknown value.
  - 🟣 Proposed: `"log" | "sqrt" | "symlog"`; domain restrictions와 tick mapping이 필요하다.
- `domain`
  - ✅ Covered: `"auto"`, continuous pair, ordinal unique array, reversed pair and invalid arrays.
  - ⚠️ Partial: temporal Date/string/timestamp normalization at direct action boundary.
- `range`
  - ✅ Covered: `"auto"`, numeric pair, colors, palette descriptor and dash patterns through consumers.
  - ⚠️ Partial: raw createScale cannot fully validate consumer-specific ordinal range until consumers exist.
- `nice`
  - ✅ Covered: omitted, true, false, non-boolean and ordinal rejection.
- `zero`
  - ✅ Covered: omitted, true, false, non-boolean and time/ordinal rejection.
- Precedence
  - ✅ Covered: explicit domain overrides nice/zero; zero applies before nice on auto linear domain.
- 🟣 Proposed: clamp, reverse and unknown/missing policies.
- Evidence: `test/unit/actions/scales/scale-actions.test.js` and grammar scale tests.

### Value coverage — `editSemantic`

- `property`
  - ✅ Covered: supported dataset/layer/encoding/scale/coordinate/guide/title paths, user IDs, unknown path rejection.
  - ⚠️ Partial: every supported leaf path does not yet have one direct primitive case.
  - 🟣 Proposed: no wildcard/batch paths; primitive remains one-property-per-action by design.
- `value`
  - ✅ Covered: scalar, nested object/array ownership, closed vocabulary/schema validation, trace summarization.
  - ✅ Covered: source dataset values cannot be replaced.
  - ⚠️ Partial: every transform schema leaf and every guide semantic leaf direct coverage.
- Effect
  - ✅ Covered: structural copy and context inference without automatic graphic compilation.
- Evidence: `test/unit/actions/primitives/edit-semantic.test.js`.

### Value coverage — `createGraphics`

- `id`: ✅ Covered valid/invalid IDs, equivalent idempotence and conflicts.
- `type`
  - ✅ Covered: `"canvas" | "collection" | "circle" | "rect" | "line" | "text" | "path"` creation paths.
  - ✅ Covered: unknown type rejection.
  - 🟣 Proposed: no renderer-specific `svg/g`; new backend-neutral primitive only when multiple actions need it.
- `length`
  - ✅ Covered: omitted single, zero empty, positive collection, invalid negative/non-integer and resize transition.
- `before`, `after`
  - ✅ Covered: each placement, mutual exclusion, unknown anchor, Canvas-before restriction, idempotent/conflicting placement.
- 🟣 Proposed: parent attachment/container composition after program composition contract is approved.
- Evidence: `test/unit/actions/primitives/create-graphics.test.js`.

### Value coverage — `editGraphics`

- `target`
  - ✅ Covered: top-level ID, generated child ID, unknown target.
- `property`
  - ✅ Covered: type-specific canvas/circle/rect/line/text/path properties, `length`, heterogeneous `children`.
  - ⚠️ Partial: every valid property does not yet have all boundary classes in direct primitive tests.
- `value` distribution
  - ✅ Covered: scalar broadcast, outer array distribution, mismatched length, nested points arrays preserved,
    heterogeneous child replacement and shared compatible-property broadcast.
- concrete value classes
  - ✅ Covered: finite geometry, non-negative dimensions/strokes, `[0,1]` opacity, non-empty appearance strings,
    Canvas text vocabulary and renderer-shared validation.
  - ⚠️ Partial: extreme finite magnitudes and every fontWeight/string color accepted by each backend.
- 🟣 Proposed: no multi-property dict edit; one action continues to represent one property change.
- Evidence: `test/unit/actions/primitives/edit-graphics.test.js`,
  `test/contracts/shared-graphic-validation.test.js`.
