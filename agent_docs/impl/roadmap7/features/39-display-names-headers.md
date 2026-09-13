# R39 — 범주 표시명과 facet header 배치

원래 감사 번호: **39**. Primary owner: **Phase 8**. 상태: **Implemented-primary (`20a25911`)**.
아래 API, typed identity, reset, facet migration, layout 수치 정책의 Gate는 승인됐다. 상태의
`Proposed`는 제품 코드, current contract, generated artifact와 검증이 아직 완료되지 않았다는 뜻이다.

## 1. 목적

R39는 dataset의 raw 범주 값과 독자에게 보여 주는 문자열을 분리한다. 표시명을 바꿔도 다음 값은
절대 바뀌지 않아야 한다.

- dataset row와 transform 결과
- scale domain, range, category 순서와 mark appearance 대응
- legend block membership과 symbol 수
- facet partition key, child id, row/column 좌표와 child program identity
- 선택, highlight, source replay가 비교하는 raw 값

같은 display label을 여러 raw 값에 줄 수 있지만 두 범주가 합쳐지지는 않는다. 이 작업은 formatter,
category reorder, dataset edit, facet value/order edit의 대체 API가 아니다.

## 2. 현재 코드 owner와 수정 경계

구현자는 아래 owner를 확장한다. 비슷한 상태를 다른 materialization config나 graphic property에 새로
복제하지 않는다.

- 공통 typed map 정책: 새 `src/grammar/displayLabels.js`
- Cartesian axis requested state와 materialization:
  `src/actions/guides/axes/labels.js`, aggregate 전달은
  `src/actions/guides/axes/tickGroups.js`
- Polar theta axis requested state와 materialization:
  `src/actions/guides/polar/axes/labels.js`, option whitelist는
  `src/actions/guides/polar/axes/shared.js`와 `facade.js`, formatter 연결은
  `src/actions/guides/polar/resolve.js`
- categorical legend block requested state:
  `src/actions/guides/legends/blocks.js`; concrete label과 측정 문자열은
  `src/actions/guides/legends/categorical/layout.js`와 `components.js`; structural migration은
  `src/actions/guides/legends/transition.js`
- facet header requested state: `materializationConfigs.facets[id].headers`, action owner는
  `src/actions/facets/actions.js`
- facet role identity: `compositionSpec.facet.grid.cells[].rowValue/columnValue`와
  `compositionSpec.facet.values`; 이를 `cell.value` 표시 문자열에서 역파싱하지 않는다.
- facet layout/materialization: `src/layout/facets.js`, `src/materialization/facets.js`
- 공개 declaration: `types/program.d.ts`, root re-export는 `types/index.d.ts`, Cartesian create
  surface를 제공하는 Basic re-export는 `types/basic.d.ts`

R39는 새 public action 이름을 추가하지 않는다. 기존 `create/edit*AxisLabels`,
`editLegendBlock`, `editFacetHeaders`의 옵션과 동작을 확장한다. 따라서 action 수와 action hierarchy는
그대로여야 한다.

## 3. 공개 TypeScript 계약

### 3.1 공통 타입

`types/program.d.ts`의 `DatasetScalar`를 재사용해 다음 타입을 export한다. entry와 배열은 모두
readonly다.

```ts
export type DisplayLabelMap = ReadonlyArray<Readonly<{
  value: DatasetScalar;
  label: string;
}>>;

export interface DisplayLabelOptions {
  labelMap?: DisplayLabelMap | "auto";
}
```

`"auto"`는 action input sentinel이며 저장 상태 타입이 아니다. runtime config에는 정규화된 배열 또는
property 부재만 존재한다.

### 3.2 Cartesian axis 타입

`labelMap`을 generic font-style 타입에 넣으면 Parallel axis가 잘못 노출된다. 다음 위치에만
`DisplayLabelOptions`를 합성한다.

```ts
export interface AxisLabelOptions<P extends string>
  extends AxisLabelStyleOptions, AxisLabelLayoutOptions, DisplayLabelOptions {
  scale?: string;
  position?: P;
  count?: number;
  values?: readonly AxisValue[];
}

export interface AxisTicksAndLabelsOptions<P extends string> {
  // 기존 fields 유지
  labels?: AxisLabelStyleOptions & AxisLabelLayoutOptions & DisplayLabelOptions;
}
```

`AxisLabelStyleOptions` 자체에는 `labelMap`을 추가하지 않는다. 그 타입을 공유하는
`ParallelAxisLabelsOptions`는 R39 대상이 아니다. `CompleteAxisOptions`, `CreateAxesOptions`,
`createXAxis`, `createYAxis`, direct label action과 tick-group action은 위 합성을 통해 같은 옵션을
받는다.

### 3.3 Polar theta 타입

theta와 radius가 현재 `PolarLabelOptions`를 공유하므로 공통 타입에 `labelMap`을 넣지 않는다.
아래 theta 전용 타입을 만든다.

```ts
export type ThetaAxisLabelOptions = PolarLabelOptions & DisplayLabelOptions;

export interface ThetaTicksAndLabelsOptions
  extends Omit<PolarTicksAndLabelsOptions, "labels"> {
  labels?: AxisLabelStyleOptions & DisplayLabelOptions;
}

export interface CompleteThetaAxisOptions
  extends Omit<CompletePolarAxisOptions, "ticksAndLabels"> {
  ticksAndLabels?: false | ThetaTicksAndLabelsOptions;
}

export interface EditThetaAxisOptions
  extends Omit<EditPolarAxisOptions, "angle" | "labels" | "ticksAndLabels"> {
  labels?: false | ThetaAxisLabelOptions;
  ticksAndLabels?: false | ThetaTicksAndLabelsOptions;
}
```

다음 method만 theta 전용 타입으로 바꾼다.

```ts
createThetaAxis(options?: CompleteThetaAxisOptions): ChartProgram;
createThetaAxisLabels(options?: CreateThetaAxisLabelsOptions): ChartProgram;
editThetaAxis(options: EditThetaAxisOptions): ChartProgram;
editThetaAxisLabels(options?: ThetaAxisLabelOptions): ChartProgram;
```

`CreateThetaAxisLabelsOptions`는 기존 resource와 tick-selection fields에
`DisplayLabelOptions`를 합성한다. radial direct/complete/edit 타입은 그대로 유지한다.
Radar의 `CategoricalThetaTicksAndLabelsOptions.labels`에도 `DisplayLabelOptions`를 합성해 high-level
chart 호출에서 같은 기능을 쓸 수 있게 한다. 일반 quantitative Polar chart가 `labelMap`을 받는
타입으로 넓어지지 않게 한다.

### 3.4 legend와 facet 타입

```ts
export interface EditLegendBlockOptions {
  // R38 fields 유지
  labelMap?: DisplayLabelMap | "auto";
}

export type FacetHeaderRole = "all" | "row" | "column";
export type FacetHeaderSide = "top" | "bottom" | "left" | "right";
export type FacetHeaderAlign = "start" | "center" | "end";

export interface EditFacetHeadersOptions extends DisplayLabelOptions {
  role?: FacetHeaderRole;
  side?: FacetHeaderSide;
  align?: FacetHeaderAlign;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  color?: string;
  offset?: number;
}
```

TypeScript는 `role`과 `side`의 cross-field 관계를 완전히 표현하지 않는다. runtime이 9절의 closed
matrix를 검사한다.

`DisplayLabelMap`, `DisplayLabelOptions`와 새 theta/facet 타입을 `types/index.d.ts`에서 export한다.
Basic은 Cartesian create action을 제공하므로 `DisplayLabelMap`과 `DisplayLabelOptions`를
`types/basic.d.ts`에서도 export한다. `editLegendBlock`, Polar edit, facet edit method는 Basic에 새로
등록하지 않는다.

## 4. 공통 typed display-map 정책

새 `src/grammar/displayLabels.js`에는 graphic, Program, action trace를 모르는 pure helper만 둔다.
권장 export와 역할은 다음과 같다.

```js
normalizeDisplayLabelMap(value, label)
sameDisplayLabelValue(left, right)
resolveDisplayLabel(value, map, fallback)
```

### 4.1 validator

`normalizeDisplayLabelMap(value, label)`은 다음 순서로 검증하고 새 frozen array와 새 frozen entry를
반환한다.

1. `value`는 배열이어야 한다. 빈 배열은 허용한다.
2. 각 entry는 plain object이고 own key가 정확히 `value`, `label` 두 개여야 한다. 누락 key,
   symbol key, prototype object와 unknown key를 거부한다.
3. raw `value`는 `string | boolean | null | finite number`다. `undefined`, `NaN`, `Infinity`, bigint,
   object와 array를 거부한다.
4. `label`은 문자열이다. `""`는 유효하고 공백 문자열도 보존한다. trim하거나
   `formatVisibleText`를 적용하지 않는다.
5. 이미 나온 raw value와 typed identity가 같으면 오류다. number `1`과 string `"1"`, boolean
   `true`와 string `"true"`는 다르다. `0`과 `-0`은 같다. `null`은 `null`과만 같다.
6. 같은 `label`은 여러 entry에서 허용한다.

`sameDisplayLabelValue`는 위 identity만 구현한다. 허용 값에서는 strict equality가 필요한 의미를
정확히 제공하므로 JSON stringify나 `String(value)` key를 사용하지 않는다. 숫자는 validator가
NaN을 먼저 막고 `0 === -0`을 그대로 사용한다.

### 4.2 lookup과 fallback

`resolveDisplayLabel(value, map, fallback)`은 entry 존재 여부와 label truthiness를 구분한다.
반환 규칙은 다음과 같다.

```text
typed entry 있음  -> entry.label을 그대로 반환, ""도 그대로 반환
entry 없음        -> fallback(value)의 문자열 결과
map property 없음 -> fallback(value)의 문자열 결과
```

`map.find(... )?.label ?? fallback(...)`은 빈 문자열은 보존하지만 entry label validation 전 상태를
숨길 수 있으므로 쓰지 않는다. 명시 loop 또는 `findIndex`로 membership을 먼저 판정한다.

map에 현재 domain에 없는 entry가 있어도 저장한다. lookup은 domain을 만들거나 늘리지 않는다.
`null`은 map entry로 보존할 수 있지만, 현재 axis/facet/legend nominal reader가 null category를
지원하지 않는 surface에서는 unknown entry로 남는다. R39가 새 null category 지원을 만들지 않는다.

## 5. surface 지원 matrix

| surface | 허용 조건 | mapping input | 미지원 처리 |
| --- | --- | --- | --- |
| Cartesian x/y labels | resolved scale type `ordinal`, `band`, `point` | explicit/inferred label values | linear, time, log, pow, sqrt, symlog 등은 `labelMap` own key가 있으면 오류 |
| Polar theta labels | resolved scale type `ordinal`, `band`, `point` | theta label raw values | continuous theta와 모든 radius label action은 오류/closed type |
| categorical legend block | descriptor family가 `categorical` | effective raw `config.domain` | gradient, interval, sampled와 discrete-size block은 오류 |
| legacy one-field facet/repeat header | `compositionSpec.facet.values[index]` | cell별 raw value | row role 없음 |
| legacy grid facet header | grid cell의 `rowValue`, `columnValue`를 각각 common map으로 처리 후 separator 결합 | cell별 두 typed raw values | `cell.value` split 금지 |
| role-mode grid facet headers | row/column role metadata | 역할별 domain value | empty/unoccupied physical row/column은 header 생성 안 함 |

`labelMap: "auto"`도 명시적 mapping 요청이다. 미지원 surface에서 이를 no-op으로 받아들이지 말고
같은 unsupported error를 낸다. 이는 typo와 잘못 선택한 guide를 숨기지 않기 위한 규칙이다.

## 6. canonical state와 reset

### 6.1 axis

Cartesian/Polar axis map은 해당 `guideConfigs.axis[channel].labels.labelMap` 한 곳에 저장한다.

- 배열: 전체 map을 교체한다. deep merge하지 않는다.
- `[]`: 명시적인 빈 override로 저장한다.
- `"auto"`: `labelMap` property를 삭제한다.
- omission: 이전 property를 그대로 보존한다.
- create에서 omission은 property 부재, create에서 `"auto"`도 검증 후 property 부재다.

resolved/formatted label 배열은 config에 저장하지 않는다.

### 6.2 legend

R38 owner를 그대로 사용한다.

```js
guideConfigs.legend[kind].blockOverrides[descriptor.key].labelMap
```

배열은 전체 교체하고 `[]`도 entry field로 저장한다. `"auto"`는 block override의 `labelMap`만
삭제한다. 같은 entry의 title/text/symbol/gap이 남아 있으면 유지하고, entry가 완전히 비면 key와
빈 `blockOverrides` property를 정리한다. root legend config나 semantic guide에는 map을 복제하지
않는다.

`resolveEffectiveLegendBlockConfig`가 base config와 block override를 합성할 때 normalized map을
ephemeral `labelMap`으로 노출한다. materializer가 effective config를 base config에 다시 써서
provenance를 잃게 하면 안 된다.

### 6.3 facet

기존 flat header config를 다음 canonical 구조로 바꾼다.

```js
headers: {
  mode: "legacy",
  common: {
    fontSize: 12,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontWeight: 600,
    color: DEFAULT_COLORS.strongText,
    offset: 10,
    align: "center"
    // labelMap은 explicit 배열일 때만 존재
  },
  row: { side: "left" },
  column: { side: "top" }
}
```

새 `facet`, `facetGrid`, `repeatCharts`는 매번 clone 가능한 이 기본값을 materialization config에
넣는다. frozen constant의 nested object를 직접 수정하지 않는다.

이전 flat shape가 들어온 in-memory program을 만날 수 있으므로 private normalizer는
`{fontSize,fontFamily,fontWeight,color,offset}`를 위 `common`으로 승격하고 `mode:"legacy"`, 기본
role configs를 보완한다. 정규화되지 않은 shape를 장기간 두 번째 schema로 유지하지 않는다.

## 7. Cartesian axis 구현

`src/actions/guides/axes/labels.js`의 create/edit top-level whitelist와
`src/actions/guides/axes/tickGroups.js`의 nested label whitelist에 `labelMap`을 추가한다.

`makeCreate`와 `makeEdit`의 처리 순서는 다음과 같다.

1. 기존 option와 count/values conflict를 검증한다.
2. resolved scale과 discrete 여부를 구한다.
3. args가 own `labelMap`을 가지면 discrete가 아닌 scale에서 오류를 낸다.
4. 배열이면 common normalizer 결과를 candidate config에 저장한다.
5. `"auto"`면 candidate config에서 property를 삭제한다. 다른 문자열은 오류다.
6. omission이면 previous config를 유지한다.
7. `resolve()`가 raw `values`, positions를 먼저 고정한다.
8. 각 raw value에 map lookup을 먼저 하고, unmatched만 현재 `formatAxisValue`/time/transformed
   formatter로 보낸다.
9. wrapping, rotation, overlap, Canvas/title fit은 mapped 최종 text로 계산한다.

Map은 `config.mode`, values/count, tick compatibility에 영향을 주지 않는다. explicit mapped label이
`""`이면 concrete text item 수와 value group은 유지하고 text만 빈 문자열이다. overlap grouping은
그 item을 그대로 유지하되 width 0의 text bounds를 사용한다.

`editCanvas`, `editScale`, source/encoding replay가 label action을 다시 실행할 때 config map이
보존되고 mapped text로 fit을 다시 검사해야 한다. scale이 categorical에서 continuous로 바뀌는데 map이
남아 있으면 silent drop하지 말고 transition 전에 오류를 내도록 scale-guide preflight에 연결한다.

## 8. Polar theta와 categorical legend 구현

### 8.1 Polar theta

공통 Polar allowlist를 무조건 넓히지 않는다.

- `shared.js`에서 `labelCreateOptions(kind)`와 `labelEditOptions(kind)`처럼 kind-aware whitelist를
  제공하거나 theta 전용 frozen 배열을 추가한다.
- `labels.js`와 `facade.js`의 direct, `labels`, `ticksAndLabels.labels` validation이 theta일 때만
  `labelMap`을 허용한다.
- `resolveLabelConfig`는 6.1의 replace/delete/preserve 규칙을 적용한다.
- own `labelMap`은 resolved theta scale이 discrete가 아니면 오류다.
- `formatPolarGuideValues`는 optional map을 받고 discrete raw value에 먼저 lookup한다. time/continuous
  formatting 경로는 map 없이 기존 결과가 byte-equivalent여야 한다.
- geometry와 `assertPolarTextLayout`에는 mapped 최종 text를 전달한다.

Radial label action에 raw JS로 `labelMap`을 주면 unknown option error가 나야 한다. `createAxes`와
`editThetaAxis` facade가 nested map을 잃지 않고 direct theta action에 전달하는 test가 필요하다.

### 8.2 categorical legend

`src/actions/guides/legends/blocks.js`의 top-level whitelist에만 `labelMap`을 추가한다.
`LegendOptions.labels`나 root `editLegendLabels`에 같은 option을 별도 추가하지 않는다.

`normalizeBlockPatch`는 descriptor family가 `categorical`일 때만 map array/`"auto"`를 받는다.
R38의 patch helper에 reset intent를 전달할 때 `undefined`와 explicit delete를 혼동하지 않는다. 권장
private patch representation은 다음 중 하나다.

```js
{ labelMap: normalizedArray }
{ removeLabelMap: true }
```

persisted override에 `removeLabelMap`이나 `"auto"`를 저장하면 실패다.

categorical label text를 한 helper에서 계산하고 layout과 concrete component가 모두 재사용한다.

```js
export function categoricalLegendLabels(config) {
  return config.domain.map(value => resolveDisplayLabel(
    value,
    config.labelMap,
    formatVisibleText
  ));
}
```

`resolveLayout`의 text measurement와 `rematerializeLegendLabels`의 `text` property가 반드시 같은
array를 써야 한다. layout은 raw `config.domain.map(formatVisibleText)`를 계속 쓰고 graphic만 mapped
문자열을 쓰는 식의 분리를 금지한다.

R38 structural transition 규칙에 `labelMap`을 content field로 추가한다.

- descriptor key 동일: 보존.
- block 제거: 삭제, 재추가 시 부활 금지.
- one old block에서 membership이 달라진 one new block: map이 있으면 오류. map의 raw field 의미가
  같다고 추론해 이동하지 않는다.
- 여러 old block merge: map property의 absent/present와 normalized content가 모두 canonical deep
  equality일 때만 합친다. 다른 map은 conflict.
- split: map이 있으면 destination을 사용자가 명시해야 하므로 사전 오류.
- categorical에서 gradient/interval/sampled/discrete-size migration: map이 있으면 오류.

`validateLegendBlockOverride`는 persisted map도 common validator로 검사해 shared facet promotion과
transition 중 손상된 state를 잡는다.

## 9. `editFacetHeaders` role와 precedence

### 9.1 option validation

`HEADER_OPTIONS`는 정확히 `fontSize`, `fontFamily`, `fontWeight`, `color`, `offset`, `role`,
`labelMap`, `side`, `align`이다. unknown key는 오류다.

- omitted `role`은 `"all"`과 같다.
- `role:"all"` 또는 omitted role에 `side`를 함께 주면 ambiguity 오류다.
- `role:"row"` side는 `left | right`만 허용한다.
- `role:"column"` side는 `top | bottom`만 허용한다.
- one-field facet와 repeat는 column role만 가진다. `role:"row"`는 오류다.
- grid facet는 row와 column을 모두 가진다.
- `align`은 `start | center | end`만 허용한다.
- 기존 style 수치 validator를 그대로 사용한다. `fontSize > 0`, nonempty font family/color,
  nonempty string 또는 finite numeric weight, `offset >= 0`이고 모두 finite다.
- editable field 없이 `role:"all"`만 주면 오류다.
- `role:"row"` 또는 `role:"column"`만 주는 호출은 legacy→role-mode 전환 자체가 변화이므로 허용한다.

모든 validator와 candidate materialization이 끝나기 전 이전 program은 그대로여야 한다.

### 9.2 mode 전환

- `role` 생략 또는 `role:"all"`로 style/map/align만 편집하면 현재 mode를 바꾸지 않는다.
- `role:"row"` 또는 `role:"column"`을 처음 명시하면 `headers.mode = "roles"`로 전환한다.
- valid role-specific `side`도 위 명시 role와 함께 role mode를 활성화한다.
- role mode는 이후 common edit, source replay, layout edit, theme와 Canvas replay 뒤에도 유지한다.
- R39에는 role mode를 legacy로 되돌리는 public sentinel을 추가하지 않는다. 새 facet recipe 생성이
  legacy 기본을 다시 만든다.

기존 `editFacetHeaders({fontSize:14,color:"#123456",offset:7})`와 같은 호출은 legacy mode에서
그래픽 item 수, 좌표 계산, child identity가 기존 동작과 같아야 한다. `align`이나 common
`labelMap`만 추가해도 자동으로 role strips를 만들지 않는다.

### 9.3 patch precedence

effective role config는 `headers.common` 뒤에 해당 `headers.row` 또는 `headers.column` override를
얹는다. `mode`와 반대 role config는 style merge 대상이 아니다.

- all/common array map: `common.labelMap` 전체 교체.
- all/common `"auto"`: `common.labelMap` 삭제.
- role array map: 해당 role map 전체 교체.
- role `"auto"`: 해당 role property만 삭제하고 common map으로 fallback.
- common map도 없으면 기존 visible formatter로 fallback.
- all/common style와 align 수정은 role-specific override를 지우지 않는다.
- role style와 align은 해당 role에만 저장한다.
- side는 role config에만 저장한다.

row와 column raw 값이 둘 다 `"A"`여도 lookup은 독립이다. row map이 `"실험군"`, column map이
`"조건 A"`를 반환할 수 있다.

## 10. facet text topology

### 10.1 legacy mode

graphic collection id `${compositionSpec.id}-headers`와 item 순서를 유지한다.

- one-field facet/repeat: composition child 순서대로 item 하나씩 만들고
  `compositionSpec.facet.values[index]`를 common map으로 format한다.
- grid: grid cell 순서대로 item 하나씩 만든다. `grid.cells[index].rowValue`와 `columnValue`를
  common map으로 각각 format하고 `" · "`로 결합한다. mapped empty string도 실제 빈 component로
  보존하므로 예를 들어 row `""`, column `"C"`는 `" · C"`다.
- grid의 기존 combined `cell.value`는 backward-compatible display fallback 확인에만 쓰지 않고,
  새 text는 typed metadata로 직접 만든다. common map이 없을 때 결과가 기존
  `displayValue(row) + " · " + displayValue(column)`과 같아야 한다.
- 기존 x/y placement는 그대로다. `align:start|center|end`는 각 translated child plot의
  left/center/right x anchor와 `left/center/right` textAlign으로 해석한다.

empty-string raw fallback은 기존 `formatVisibleText` 결과 `(empty)`다. explicit mapped label `""`는
그대로 비어 있어야 하며 `(empty)`로 다시 바꾸지 않는다.

### 10.2 role mode — grid

per-cell combined header를 만들지 않는다.

1. 실제 `layout.children`에 존재하는 grid cells만 대상으로 한다.
2. 각 occupied numeric column마다 column header 하나를 만든다. value는 그 column의 첫 cell이 가진
   `columnValue`이고 같은 column의 나머지 값과 typed identity가 다르면 internal-state 오류다.
3. 각 occupied numeric row마다 row header 하나를 같은 방식으로 만든다.
4. deterministic item order는 numeric column 오름차순의 column headers, 그 뒤 numeric row
   오름차순의 row headers다.
5. sparse observed grid에서 cell이 없는 row/column header를 phantom으로 만들지 않는다.

column header long-axis span은 해당 column에 속한 translated child **plot** bounds의 left/right
union이다. row header span은 해당 row plot bounds의 top/bottom union이다. `align`은 이 span의
start/center/end anchor다.

### 10.3 role mode — one-field facet와 repeat

모든 raw value가 독립 column-role header다. 물리 grid column별로 값을 합치지 않는다. child가 여러
행으로 wrap돼도 composition child 순서대로 cell마다 header 하나를 만든다. side가 top/bottom이면
각 physical row에 cell header lane을 하나 reserve하고, 각 label은 자기 translated child plot의
left/right span에 align한다.

## 11. occupied layout 수치 계약

role mode만 새 strip reservation을 사용한다. legacy는 기존 fit-or-error 결과를 보존한다.
facet header rotation은 R39 API에 없으므로 0 radians다. 그래도 측정은 shared `measureTextWidth`와
`resolveTextBounds`를 사용해 renderer와 같은 font family/weight 보정을 적용한다.

### 11.1 lane thickness

explicit mapped `""`는 visible header가 아니므로 bounds 검사와 lane maximum에서 제외한다. item은
identity/order 보존을 위해 `text:""`로 남길 수 있다.

```text
column top/bottom thickness = max(nonempty text bbox height) + effective offset
row left/right thickness    = max(nonempty text bbox width)  + effective offset
all empty                   = 0
```

composition padding은 lane 바깥에 한 번만 적용한다. padding을 thickness에 더해 두 번 세지 않는다.

### 11.2 `resolveFacetLayout` 입력과 순서

`src/layout/facets.js`에 private/internal-only `headerLayout` option을 추가한다. 최소 canonical shape는
다음과 같다.

```js
headerLayout: {
  outer: { top: 0, right: 0, bottom: 0, left: 0 },
  cellRows: {
    top:    [/* row별 thickness */],
    bottom: [/* row별 thickness */]
  }
}
```

grid role mode는 row/column headers를 `outer` lanes에 넣는다. one-field/repeat role mode는 top 또는
bottom `cellRows`에 각 occupied physical row의 thickness를 넣는다. 사용하지 않는 배열은 0으로
정규화한다. 길이는 resolved physical row count와 같아야 하고 모든 값은 finite `>= 0`이어야 한다.

각 child placement 순서는 다음과 같다.

```text
x = left title-independent padding
  + left shared-legend lane(legend가 left일 때)
  + outer.left
  + 이전 column widths/gaps
  + 기존 cross-axis align offset

y = titleHeight
  + top padding
  + top shared-legend lane(legend가 top일 때)
  + outer.top
  + 이전 row의 (top cell lane + row height + bottom cell lane + gap)
  + 현재 row top cell lane
  + 기존 cross-axis align offset
```

width는 base grid width에 `outer.left + outer.right`를 더하고, height는 base grid height에
`outer.top + outer.bottom + sum(cellRows.top) + sum(cellRows.bottom)`을 더한다. shared legend lane은
그 뒤 해당 축에 한 번만 더한다.

side ordering은 plot/grid에 가까운 순서로 header, shared legend 바깥 순서다. top에서는
`title → shared legend → column header → children`, bottom에서는
`children → column header → shared legend`; left/right도 같은 원칙을 쓴다. title height는 header
lane에 포함하지 않는다.

기존 `headerLayout` omission은 모든 0 lane과 완전히 같아야 한다. 기존 layout unit test의 모든
literal 좌표와 size가 바뀌면 실패다.

### 11.3 final anchors

text bbox cross edge와 child/grid snapshot edge 사이 거리가 정확히 `offset`이 되게 한다.

- top: `y = nearestChildTop - offset - textHeight / 2`, baseline middle
- bottom: `y = nearestChildBottom + offset + textHeight / 2`, baseline middle
- left: `x = nearestChildLeft - offset`, textAlign right
- right: `x = nearestChildRight + offset`, textAlign left

grid outer side의 nearest edge는 해당 side에 있는 child snapshot union edge다. one-field cell header는
자기 child snapshot edge다. long-axis anchor는 plot union을 사용한다.

- column start/center/end: plot union left/center/right와 textAlign left/center/right
- row start/center/end: plot union top/center/bottom과 textBaseline top/middle/bottom

final item bounds는 parent Canvas 안에 있어야 하고 서로 겹치거나 child snapshot, shared legend,
title과 겹치면 안 된다. lane 계산 뒤 전체 parent layout과 shared legend placement를 다시 계산한
결과로 검사한다. translate만 바꿔 overlap을 허용하지 않는다.

현재 facet parent Canvas는 canonical auto size이므로 role lanes만큼 parent size가 결정론적으로
늘어난다. child Canvas와 plot size는 바꾸지 않는다. 앞으로 explicit parent Canvas mode가 생기면
그 bounds 안에 lanes가 맞지 않을 때 기존 layout error를 내고 자동 확장하지 않는다. R43에서 child
panel size를 재분배하게 되면 `reservation → panel allocation → R27 aspect → R29 polar frame → guide
placement` 순서로 연결한다.

## 12. action transaction과 lifecycle

### 12.1 action preflight/commit

각 public action은 기존 immutable action wrapper 안에서 다음 순서를 지킨다.

1. plain object와 closed keys 검증.
2. target/role/surface와 scale family 검증.
3. caller map을 새 canonical frozen map으로 clone.
4. replace/delete/preserve 규칙으로 candidate requested state 생성.
5. raw values/domain/role metadata에서 final displayed text 계산.
6. candidate layout, Canvas bounds, overlap과 related guide fit을 끝까지 materialize해 preflight.
7. 성공한 candidate를 반환. 오류면 이전 program, caller options, trace가 그대로 남는다.

rollback mutation을 쓰지 않는다. 이전 program에 먼저 config를 쓰고 오류 시 되돌리는 구현은
실패다. 성공 action trace는 기존 action 이름을 유지하고 common helper를 새 trace operation으로
노출하지 않는다.

### 12.2 lifecycle 표

| 진입점 | 필수 결과 |
| --- | --- |
| axis create/edit 또는 aggregate facade | map을 direct label config에 한 번 저장하고 final text로 fit 검사 |
| axis count/values/format/style edit | map omission 시 보존; unmatched fallback만 새 formatter 사용 |
| scale/domain/source replay | raw domain과 item 수를 새로 계산, unknown map 보존, map이 category 생성 금지 |
| categorical→continuous axis migration | retained map 때문에 unsupported가 되면 사전 오류 |
| `editLegendBlock` | 같은 descriptor key의 map replace/delete, effective replay |
| root legend style/layout/Canvas edit | block map 보존, mapped text로 occupied bounds 재계산 |
| legend channel reorder | key 같으면 보존 |
| legend remove/re-add | 제거 시 map 삭제, re-add default |
| legend merge/split/family transition | 8.2 content conflict 정책 적용 |
| shared facet legend promotion | child별 normalized map까지 compatibility 비교 |
| common facet header edit | role overrides 유지, current mode 유지 |
| role facet header edit | role mode 유지, 다른 role 유지 |
| `editCompositionLayout` | header config와 raw role identity 유지, lane/anchors 재계산 |
| `editFacetSource` | 기존 complete facet config를 복사해 map/mode/side/align 유지, 새 raw cells에 lookup |
| `applyTheme`/`removeTheme` | explicit map/side/align을 덮지 않고 style만 기존 theme 정책대로 처리 |
| renderer Canvas/SVG/PNG/PDF | graphicSpec의 final mapped text와 동일; renderer에서 raw map을 다시 해석하지 않음 |

## 13. 고정 인수 사례와 literal oracle

Production normalizer, lookup, layout 함수를 expected 생성기로 호출하지 않는다. test fixture와 expected
배열/좌표를 literal로 쓴다.

### 13.1 typed-map core

- **R39-N01**: raw `[1, "1", "KR", "XX"]`, map
  `[{value:1,label:"하나"},{value:"KR",label:"한국"}]`의 결과는 정확히
  `["하나", "1", "한국", "XX"]`다.
- **R39-N02**: raw `"A"`, `"B"`를 둘 다 `"같음"`으로 map해도 scale domain length와 legend symbol
  count는 2다.
- `0`과 `-0` 두 entry는 duplicate 오류. `1`과 `"1"`은 함께 허용.
- duplicate display labels와 empty label은 허용. duplicate typed raw value, missing key, extra key,
  non-string label, NaN/Infinity/object raw value는 오류.
- map에만 있는 `"future"`는 저장되지만 axis/legend/facet item을 만들지 않는다.
- array→다른 array는 전체 교체, array→`[]`는 explicit empty 저장, array→`"auto"`는 property 삭제,
  omission은 기존 배열 identity가 아니라 같은 frozen content를 보존한다.

### 13.2 axis와 legend

- Cartesian ordinal x와 y direct create/edit, complete axis, ticks-and-labels facade 각각에서 N01 final
  text를 검증한다. raw scale domain과 tick values는 그대로다.
- continuous Cartesian x/y에 array와 `"auto"`를 각각 주면 atomic error다.
- categorical theta direct와 complete facade에서 N01을 검증하고 radial/continuous theta를 거부한다.
- mapped long label, mapped `""`, rotation/wrap/overlap 조합은 mapped final string의 bounds를 사용한다.
- merged color+shape categorical legend를 어느 member channel로 선택해도 같은 map owner와 같은 labels를
  얻는다. size, opacity, width, gradient, interval block은 map을 거부한다.
- legend map reset 뒤 fallback은 `formatVisibleText`이며 raw empty string이면 `(empty)`다.
- root legend move/theme/Canvas, channel reorder, remove/re-add, merge conflict와 shared facet promotion을
  12.2대로 검증한다.

### 13.3 facet identity와 role precedence

- **R39-L01**: grid row와 column raw 값이 모두 `"A"`다. common map은 둘 다 같은 fallback을 쓰고,
  row override `A→실험군`, column override `A→조건 A`는 role mode에서 두 문자열로 분리된다.
- role-specific map→`"auto"`는 common map으로 돌아가고, common→`"auto"`는 visible formatter로
  돌아간다.
- one-field facet와 repeat에서 `role:"row"`를 거부하고 `role:"column"`은 cell마다 raw identity를
  유지한다.
- legacy unqualified style edit의 기존 item 수/x/y와 current tests가 byte-equivalent다.
- grid legacy common map은 `cell.value`를 split하지 않고 raw row/column metadata를 각각 mapping한다.
- source edit, Canvas/theme, composition layout 뒤 child ids, `rowValue`, `columnValue`, facet values와
  children object identity가 정책에 맞게 유지된다.

### 13.4 pure layout 숫자 oracle

R39-L02 fixture는 child 네 개가 모두 `100×80`, local plot이
`{x:20,y:10,width:60,height:50}`, 2 columns/2 rows, gap 10, padding/title/legend 0이다.
row/column text는 `R1,R2,C1,C2`, style은 fontSize 10, fontFamily `sans-serif`, fontWeight `normal`,
offset 4, align center다. row side left, column side top이다.

shared text metric에서 각 두-character width는 `12.2`; 따라서 left lane `16.2`, top lane `14`다.
expected는 다음과 같다.

```js
canvas: { width: 226.2, height: 184 }
placements: [
  { x: 16.2,  y: 14   },
  { x: 126.2, y: 14   },
  { x: 16.2,  y: 104  },
  { x: 126.2, y: 104  }
]
headerText: ["C1", "C2", "R1", "R2"]
headerAnchors: [
  { x: 66.2,  y: 5,   textAlign: "center", textBaseline: "middle" },
  { x: 176.2, y: 5,   textAlign: "center", textBaseline: "middle" },
  { x: 12.2,  y: 49,  textAlign: "right",  textBaseline: "middle" },
  { x: 12.2,  y: 139, textAlign: "right",  textBaseline: "middle" }
]
```

오른쪽+아래쪽 variant는 lane을 반대 edge에 배치하고 shared legend와 겹치지 않는지 검증한다. font
증가와 긴 label variant는 canvas/lane을 다시 계산하며 child local size와 raw partition id는 그대로다.
padding/title/shared legend variant는 각 reservation이 정확히 한 번 더해지는지 literal bounds로
검증한다.

## 14. 테스트 파일과 assertions

최소 소유 파일은 다음과 같다.

- `test/unit/grammar/display-labels.test.js`: validator, typed identity, clone/freeze, empty/unknown/reset에
  필요한 pure helper behavior
- `test/unit/actions/guides/axis-display-labels.test.js`: Cartesian direct/aggregate, replay,
  continuous errors, wrap/rotation/empty
- `test/unit/actions/guides/polar-axis-actions.test.js`: theta direct/complete/facade positive와
  radius/continuous negative
- `test/contracts/legend-blocks.test.js`: categorical block map, reset, member selector,
  family errors, transition/shared facet lifecycle
- `test/unit/grammar/layout/facets.test.js`: 13.4 literal layout와 omission regression
- `test/unit/actions/composition/facet-display-headers.test.js`: legacy/role topology, precedence,
  source/layout/theme lifecycle, atomic errors
- `test/contracts/legend-block-types.test.js`와 새 또는 기존 axis/facet type fixture: positive readonly map,
  `"auto"`, empty array; invalid entry/label/side/radial/Basic method boundaries
- renderer와 chart capability tests: primitive/public graphic parity, same-run Canvas calls와 decoded PNG
  pixel hash, SVG/PDF text/bounds
- `scripts/package-consumer.js`와 browser packed consumer: Full legend/facet 호출, Basic Cartesian create
  호출, Basic에 Full-only edit method 부재

모든 성공 test는 caller options deep-freeze, 이전 program의 semantic/graphic/config/children/trace
불변성을 검사한다. 오류 test는 이전 state와 trace가 동일함을 검사한다. 오류 문자열 전체를 고정하지
말고 operation, surface와 실패 field 또는 role/side를 포함하는지 확인한다.

## 15. 문서·계약·generated artifact 동기화

제품 구현과 같은 checkpoint에서 다음을 갱신한다.

- `agent_docs/contract/current/AXES.md`: Cartesian/Polar theta 지원, continuous/radius 제외, typed/reset
  value coverage
- `agent_docs/contract/current/LEGEND_AND_TITLE.md`: R38 planned 문구를 implemented R39 block map 계약으로
  교체
- `agent_docs/contract/current/COMPOSITION.md`: 새 `editFacetHeaders` signature, legacy/role topology,
  strip 수치와 lifecycle
- `agent_docs/contract/ACTION_INDEX.json`: 새 action entry를 만들지 않고 기존 네 action family의
  signature/capability 설명만 동기화
- action catalog, relationship metadata, action cards, MCP resources와 compact routing metadata
- axis/legend/facet guide 문서와 generated action reference, exact types, signatures, search, LLM artifacts
- Roadmap 7 `PROPOSALS.json`, `ACCEPTANCE_CASES.json`, `TRACEABILITY.md`, Phase 8 goal/step/result ledger

새 common source 파일 때문에 package entry 수가 늘 수 있다. `npm pack`과 Full/Basic/SVG gzip을 실제로
측정하고 기존 ceiling을 넘은 항목만 최소 단위로 조정한다. action count가 늘면 구현 오류다.

## 16. 구현 순서

1. common helper와 pure unit tests를 먼저 완성한다.
2. Cartesian axis direct/aggregate 경로와 types/Basic export를 연결한다.
3. Polar theta kind-aware whitelist와 formatter를 연결한다.
4. R38 legend block patch/effective labels/transition을 확장한다.
5. facet canonical config normalizer와 `editFacetHeaders` precedence/mode action을 구현한다.
6. legacy text를 typed role metadata로 바꾸되 existing no-map output을 regression 확인한다.
7. role header descriptor와 lane measurement를 만든다.
8. `resolveFacetLayout` reservation, final anchors, full materialization fit을 연결한다.
9. source/layout/theme/shared legend와 renderer parity를 검증한다.
10. public types/current contracts/catalog/cards/MCP/docs/package consumers를 동기화한다.
11. generated artifacts를 생성하고 freshness check를 통과시킨다.
12. focused → unit → contracts → docs → charts → render → browser → installed package → coverage 순으로
    실행한다.

한 단계가 실패하면 뒤 단계에서 예외를 덧붙여 숨기지 않는다. common typed identity, requested-state
owner, mapped text measurement, facet reservation 중 어느 invariant가 깨졌는지 먼저 고친다.

## 17. 완료 조건

- [x] R39-N01/N02/L01/L02와 invalid/reset/replay cases가 literal oracle로 통과했다.
- [x] axis, legend, facet 어느 surface도 map으로 raw domain, row, partition identity를 바꾸지 않는다.
- [x] mapped 최종 문자열이 measurement와 concrete graphic의 유일한 text source다.
- [x] legacy facet 호출은 기존 그래픽 결과를 보존하고 명시 row/column 호출만 role mode를 활성화한다.
- [x] role strips, title, shared legend, child snapshots가 겹치지 않고 padding/reservation이 한 번씩만
  반영된다.
- [x] unsupported continuous/radial/sampled cases가 input과 이전 program을 바꾸지 않고 오류를 낸다.
- [x] Full/Basic 타입·runtime 경계, current 계약, catalog/card/MCP, docs와 installed consumers가
  동기화됐다.
- [x] generated freshness, renderer parity, package budget와 전체 필수 test 결과를 Phase 8 ledger에
  기록했다.
- [x] 위 근거가 현재 revision에서 확인되기 전에는 상태를 `Implemented-primary`로 바꾸지 않는다.

구현 근거는 제품 commit `20a25911`과 [Phase 8 결과 원장](../phase8/STEP1.md)에 있다. 누적 결과는 unit
2,390, contracts 465, docs 47, charts 578, render 216, browser 73, realistic 243이며 모두 실패·skip 0이다.
lower-level/public concrete graphic과 same-run decoded PNG pixel hash가 일치했다. installed tar SHA-256은
`06cea24893e9e4d6570ae272680aedd834dcba2f139c0404b87d351ac09fe48d`다. 전체 coverage 명령은 R39 추가
source가 아닌 기존 세 기준 미달 때문에 exit 1이므로 성공 근거에 포함하지 않는다.
