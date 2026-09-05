# R6-P2-A — 공통 작성 계약 검토

상태: **Proposed / ready-for-review**. Phase 1 결과 승인은 기록했고 이 문서의 새 API·의미 변경은 아직 승인받지 않았다.
이 package는 Phase 2 W1–W5의 구현 결정을 검토한다. Production source, public declarations, Current/Planned,
MCP cards를 먼저 바꾸지 않았다. F01–F19와 이후 Phase는 기존 순서를 유지하며 F20은 제외한다.

## 검토할 결정

| 작업 | 제안하는 결과 | 호환성 경계 |
| --- | --- | --- |
| W1 / D04·D05 | 상위 facade가 호환 guide를 재사용하고 없는 component만 생성 | 하위 `create*`의 중복 오류, Box의 guide 기본 꺼짐, Box/Gradient 지연 작성 유지 |
| W2 / D02·D10 | 명시적 group이 path identity를 소유; color/dash/width/opacity는 series별 appearance | 기존 group 없는 color/dash 추론 유지; 복수 필드 group 추가; 모호한 appearance는 오류 |
| W3 / D06 | Line width/opacity의 constant·field 경로 대칭, Scatter radius, Rule 생성·편집 연결 | ErrorBand fill·Line width·Point opacity의 필드 충돌 교정; ErrorBand fill override 해제와 명시적 교체 경로 제공 |
| W4 / D09·D10 | JSON에 남는 `groupBy: false`, 명시적 temporal 입력 단위 | 기존 mean·numeric nominal color·숫자 연도 추론 유지; source schema API는 이번 단계에 추가하지 않음 |
| W5 / B01·D14 | Bar width/measure를 먼저 써도 유효한 미완성 의도를 저장 | 유효성 검사는 즉시 수행; 분석 역할이 완성될 때만 geometry 생성 |

이 단계에서 새 public method는 **`editRuleMark` 한 개**다. 기존 method의 옵션·지원 대상을 확장하고
오류 의미를 정리한다. 기존 root의 `encodePointRadius`는 basic에도 공개해 Scatter shorthand와 하위 작성이
같은 entry에서 가능하게 한다. `ensureGuides`, `createBoxMark`, 일반 compiler, 별도 전역 추론 엔진은 공개하지 않는다.
`layoutBars`/`encodeStack`, Polar guide lifecycle, Pie 등 새 완성 chart의 구현은 원래 후속 owner에 남긴다.

원격 검토 package: [`e06b57db5624a5b0d66cea425cff4aa5f5f4caad`](https://github.com/ggaction/ggaction/commit/e06b57db5624a5b0d66cea425cff4aa5f5f4caad).
Gate 상태와 승인 경계는 [GATES.md](GATES.md)에 기록한다.

## 기준과 확인한 현상

- 정확한 baseline: [`bbc8a3fc256c9afa877f696ed6ade1f51ffb7522`](https://github.com/ggaction/ggaction/commit/bbc8a3fc256c9afa877f696ed6ade1f51ffb7522).
  Source tree `bd17aeb7d38e1d184bc714a182e13feea5923279`, types tree `66b00fbcff7f93ddede8f97db9eac0c90fba3870`.
- Remote branch: `codex/roadmap6-hierarchical-actions`. Package `0.0.12`, Node `22.23.1`, macOS arm64.
- [실행 source](baseline.probes.mjs), [43건 실제 결과](baseline-results.json), [검증 명령·결과](VALIDATION.md).
  관측한 성공·거부와 이전 program/trace 불변성을 확인했다. 이는 제안 API 43개가 구현됐다는 뜻이 아니다.
- 관련 기존 테스트 **100/100**. Phase 1 누적 기본 suite **2,329/2,329**, contracts **259/259**,
  focused render **2/2**, installed consumer exit 0은 [승인된 Phase 1 증거](../phase1/REVIEW.md)를 참조한다.
  이번 문서 작성에서 누적 suite·render·package를 다시 실행한 것으로 기록하지 않는다.

| 관측 ID | 현재 결과 | 계약에 주는 근거 |
| --- | --- | --- |
| G01–G03 | Scatter→Line 기본 조합은 axis 중복 오류; 두 번째 `guides:false`는 성공 | facade의 guide 확보와 하위 생성 의미 분리 |
| G04–G08 | Box/Gradient 지연 상태 가능; Box 생략은 off, `{}`는 on; axis line만 있는 상태도 가능 | 지연 역할과 부분 guide completion을 모두 처리 |
| S01·S09 | country로 group, continent로 color는 Line/Area에서 거부 | 필드 이름 일치 대신 final series 값 유일성 검사 |
| S02–S07 | Line constant encoder와 Scatter radius shorthand는 거부; 하위 editor/radius는 성공 | 기존 owner를 재사용할 수 있는 경로 확인 |
| S08·S14 | `fields` tuple 미지원; 한 series 안에서 변하는 field width는 이미 거부 | tuple identity와 appearance 유일성의 별도 계약 |
| S10 | Rule의 stroke/width/dash/opacity 하위 chain 성공 | 새 editor에 별도 style 계산 불필요 |
| S11–S12 | ErrorBand fill은 검은색인데 color encoding·범례가 남음; 명시적 제거 후 편집은 정합 | 충돌 오류와 검증된 migration chain |
| S13 | field width가 있는 Line에 `strokeWidth:9` 편집은 성공하지만 실제 두께는 그대로 | D06의 추가 재현. 무효한 scalar 편집을 성공으로 보고하지 않음 |
| S15·S17 | Point opacity scalar 편집도 필드·범례를 남긴 채 모든 점을 같은 opacity로 바꿈; value assignment는 올바르게 제거 | Point에도 같은 충돌 원칙과 기존 migration 경로 적용 |
| S16·S18 | ErrorBand는 반대 방향 field assignment도 constant fill이 가림; basic에는 radius child 자체가 없음 | 역방향 교체와 package entry 범위를 함께 검토 |
| I01–I04 | Regression 생략은 country 추론, explicit undefined는 무그룹, JSON 후 다시 country; false 거부 | JSON opt-out은 실제 의미 차이를 막는 추가 옵션 |
| I05–I09 | source schema·temporalUnit 미지원; 1000/2000은 연도; numeric color는 nominal; Bar는 mean | 보존할 default와 새 명시적 옵션을 구분 |
| I10–I11 | encodeDensity/encodeHorizon create-side false 거부 | create/edit 그룹 해제 vocabulary 정합 |
| O01–O06 | width-first와 measure-first 거부, 반대 순서는 성공; 잘못된 width 거부 | 미완성 intent를 완료된 geometry와 분리 |

O05의 없는 field는 현재 measure-role 오류가 먼저 가린다. 수정 뒤에는 완료를 기다리지 않고 field의
존재·값을 검증해야 한다. 기존 감사 원본은 수정하지 않으며 S13/S15/S16/S18은 D06에 연결하는 delta다.

## W1 — guide 확보와 action 역할

### 생성 의미

상위 action은 **자기가 만드는 layer와 coordinate**를 기준으로 guide 요구를 결정한다. 다른 좌표의
현재 mark나 전역 첫 scale을 선택하지 않는다. 실제 하위 생성은 기존 wrapped guide actions가 담당한다.
공유 내부 planner/helper는 missing/reusable/conflicting 결과를 돌려주고 자체 geometry를 만들지 않는다.

| 옵션 | Complete facade | Box | 지연 Gradient |
| --- | --- | --- | --- |
| 생략 / `undefined` | 기존 chart별 자동 요구를 확보 | 기존대로 guide 생성 안 함 | 요청을 저장하고 위치 완성 시 기존 자동 요구 확보 |
| `{}` | 자동 요구 확보, 기존 명시적 style 보존 | 위치 완성 시 자동 요구 확보 | 위치 완성 시 자동 요구 확보 |
| `false` | 이 호출의 guide branch를 실행하지 않음; 기존 guide 제거 아님 | 동일 | 동일 |
| `{ axes:false }` 등 | 해당 branch만 제외; 나머지는 chart별 default | 명시적 선택을 완료 시 적용 | 동일 |
| 명시적 nested style | 새 component에 사용; 재사용 component와 다르면 conflict | 동일 | 동일 |

적용 owner는 Scatter/Line/Bar/Histogram/HeatMap/Parallel/Violin의 공통 facade 경로와
Box/Gradient의 최초 completion 경로다. Rematerialization이 반복될 때 guide를 재생성하지 않는다.
`editBoxPlot`/`editGradientPlot`의 기존 편집 의미를 생성 helper로 대체하지 않는다.

재사용 조건을 다음처럼 고정한다.

1. Axis/grid는 channel·coordinate ID·scale ID가 같고 해당 family/role에서 scale이 유효해야 한다.
   단지 domain 숫자가 같다는 이유로 서로 다른 scale을 재사용하지 않는다.
   기존 low-level guide에 coordinate가 저장되지 않았다면 해당 scale을 참조하는 유일한 compatible
   coordinate에서 해석한다. 후보가 없거나 여러 개면 재사용하지 않고 명시적 resource 선택을 요구한다.
2. 같은 scale에 여러 field가 명시적으로 연결된 경우 scale owner의 기존 호환성 검사를 유지한다.
   기존 guide title/style을 새 facade의 자동 추론으로 덮어쓰지 않는다. 제목 변경은 명시적 editor를 사용한다.
3. Axis line만 있으면 ticks/labels/title 등 요구된 missing component를 채운다. 기존 component는 유지한다.
   이 단계에서 현재 하위 API가 지원하지 않는 component 옵션을 새로 허용하지 않는다.
4. Legend는 channels·scale IDs·domain/order·symbol recipe·요청된 layout/style이 호환되어야 재사용한다.
   기존 target 소유권을 유지한다. Point/Line처럼 symbol 의미가 다른 범례를 자동 병합하지 않는다.
   독립 legend 충돌은 해당 guide/target을 명시하는 오류로 끝나며 `guides.legend:false`로 분리 작성할 수 있다.
5. `false`는 삭제가 아니고, 재사용은 편집이 아니다. 명시적 옵션이 기존 값과 충돌하면 relevant editor를
   안내한다. Silent overwrite와 두 번째 축·범례의 임의 numbered ID 생성은 하지 않는다.
6. 모든 요구를 계획한 뒤 실행한다. 실패하면 반환 program이 없고 input state·trace·caller options는 그대로다.

검토할 before/after 호출은 동일하다.

```javascript
chart().createCanvas().createData({ values: rows })
  .createScatterPlot({ id: "points", x: "x", y: "y" })
  .createLinePlot({ id: "trend", x: "x", y: "y" });
// Before: duplicate x-axis error.
// After: two layers, one compatible set of axes/grid; missing components only.
```

기존 `createGuides`, `createAxes`, `createXAxisLine` 등의 직접 호출은 **create-only**를 유지한다.
따라서 facade trace의 guide branch가 무조건 `createGuides` 한 노드라고 약속하지 않는다.
실제로 생성한 wrapped leaf/aggregate child와 scale rematerialization이 trace에 나타나야 한다.

### 역할 metadata

Box/Gradient는 이름을 바꾸거나 항상 완성 상태를 강제하지 않는다. 각각 lower `encodeX/Y` completion과
`editBoxPlot`/`editGradientPlot` 편집 경로를 설명한다. Basic/Violin은 생성 시 필수 위치를 요구하는
complete facade로 설명한다. 기존 card v2의 `lifecycle`, `resources.prerequisites`, `summary`,
`callPatterns`와 Current 문서에 이 차이를 명시한다. 새 `authoringRoles` 등 machine schema를
일부 action에 임의로 도입하지 않는다. 173개 전체 hierarchy metadata schema는 D20 / Phase 11의 owner다.

소유 코드: [charts/shared.js](../../../../src/actions/charts/shared.js),
[guides/guides.js](../../../../src/actions/guides/guides.js),
[axes/axis.js](../../../../src/actions/guides/axes/axis.js),
[Box materialize](../../../../src/actions/boxPlots/materialize.js),
[Gradient materialize](../../../../src/actions/gradientPlots/materialize.js).

## W2 — path identity와 series appearance

### 정확한 public delta

```typescript
type GroupEncodingOptions = { target?: string; fieldType?: "nominal" } & (
  | { field: string; fields?: never }
  | { fields: readonly [string, ...string[]]; field?: never }
);
encodeGroup(options: GroupEncodingOptions): ChartProgram;

// Other CreateLinePlotOptions fields keep their current types.
groupBy?: string | readonly [string, ...string[]];
```

- Line과 ordinary Area가 tuple group을 지원한다. 배열은 non-empty·중복 없는 non-empty field명만 허용한다.
  각 값은 기존 nominal scalar 규칙을 따른다. 빈 배열·중복·missing field·object value·두 mode 동시는 오류다.
- 단일 field와 길이 1 배열은 기존 `{ field, fieldType:"nominal" }` state로 정규화한다.
  복수 field는 `{ fields:[...], fieldType:"nominal" }`를 저장하고 `field`를 함께 남기지 않는다.
  `encoding.group.fields`의 semantic path/validation만 추가한다. 이전 단일-field state를 깨지 않는다.
- key는 field 순서의 scalar tuple이며 문자열 delimiter로 합성하지 않는다. 숫자/문자열/boolean을 구분하고
  현재 nominal equality의 `0`/`-0` 취급은 유지한다. `["a|b","c"]`와 `["a","b|c"]`가 충돌하면 실패다.
- 명시적 group은 identity의 유일 owner다. `color`, `strokeDash`, `strokeWidth`, 새 Line field `opacity`는
  그 identity 안에서 **실제 field 값이 하나인지** 확인한다. 같은 color로 mapping된 서로 다른 값도 모호하다.
  여기서 자동 first/mean/aggregate 또는 추가 series split은 하지 않는다.
- 기존 row order/independent-position sort/pathOrder, aggregate/binned/Polar line의 수학을 바꾸지 않는다.
  Appearance용 값이 identity key나 분석 partition을 확대하지 않도록 derivation과 selection owner를 함께 고친다.
- 명시적 group이 없으면 기존 Line의 color 또는 dash grouping을 유지한다. 둘이 다른 field면 여전히
  explicit group이 필요하다. Width/opacity는 group을 추론하지 않는다. Appearance를 바꾸어도 grouping이
  고정되어야 한다면 `encodeGroup`을 먼저 명시하는 계약이다.
- Field assignment를 교체하거나 group을 편집한 뒤 모든 영향을 받는 series appearance를 다시 검증한다.
  `removeEncoding({ channel:"group" })`은 기존 implicit 추론으로 복귀하며 새로 모호하면 atomic error다.

```javascript
base.createLineMark({ id: "line" })
  .encodeX({ field: "x" }).encodeY({ field: "y" })
  .encodeGroup({ fields: ["country", "scenario"] })
  .encodeColor({ field: "continent" })
  .encodeStrokeDash({ field: "scenario" })
  .encodeStrokeWidth({ field: "width" });
// One path per country/scenario, continent color, scenario dash, one width per path.
```

`createLinePlot`는 group을 먼저 정규화하고 위치/group/appearance child를 안전한 순서로 호출한다.
`group→color`와 `color→group`의 **각 중간 상태가 유효한 경우** 최종 semantic/graphic이 수렴해야 한다.
아직 group을 쓰지 않은 단계에서 두 appearance field가 모호하면 미래 action을 추측해 통과시키지 않는다.

일반 Area의 explicit group과 다른 color field도 값 유일성으로 검증한다. 기존 centered/stack/fill layout의
identity/layout coupling, density/violin/horizon/통계 transform의 owned group은 계속 해당 owner가 결정한다.
이들이 tuple을 소비한다고 자동 주장하지 않는다. Specialized owner의 group을 low-level에서 바꾸려 하면
`editDensity`/`editHorizon`/통계 owner를 안내한다. Ordinary Area tuple에도 기존 range·layout 제약을 적용한다.
이 경계를 지원 matrix와 negative test에 적어 모든 Area에 무조건 지원한다고 노출하지 않는다.

소유 코드: [compatibility](../../../../src/actions/encodings/shared.js),
[encodeGroup](../../../../src/actions/encodings/ranged.js),
[Line series](../../../../src/grammar/lineSeries.js), [Area series](../../../../src/grammar/areaSeries.js),
[color owner](../../../../src/actions/encodings/color/index.js),
[dash owner](../../../../src/actions/encodings/strokeDash.js).

## W3 — style과 명시적 encoding 교체

### 지원 대상과 정확한 옵션

| 경로 | 현재 | 제안 |
| --- | --- | --- |
| `encodeStrokeWidth({value})` | Rule | Rule + Line |
| `encodeStrokeWidth({field, ...})` | Rule row / Line series | 유지; Line은 final-series 유일성 |
| `encodeOpacity({value})` | Point + Rule | Point + Rule + Line |
| `encodeOpacity({field, ...})` | Point + Rule | Point + Rule + Line, Line은 final-series 유일성 |
| Scatter `point.radius` | 거부 | `number >= 0` logical pixel, `encodePointRadius`에 위임 |
| `createPointMark` radius | 거부 | 유지; Scatter가 lower radius action을 호출 |
| `createRuleMark` style | id/data만 | 아래 scalar style fields를 추가하고 기존 encoders에 위임 |
| `editRuleMark` | 없음 | 아래 scalar style을 선택한 Rule에 적용하는 얇은 facade |

```typescript
// Existing strokeWidth/opacity value-or-field unions remain discriminated.
// Constant mode rejects fieldType/scale, NaN, infinity and out-of-range values.
type RuleStyleOptions = {
  stroke?: string;               // non-empty color
  strokeWidth?: number;          // >= 0, logical pixels
  strokeDash?: DashStyle | DashPattern;
  opacity?: number;              // [0, 1]
};
createRuleMark(options?: { id?: string; data?: string } & RuleStyleOptions): ChartProgram;
editRuleMark(options: { target?: string } & RuleStyleOptions): ChartProgram;
// Scatter's other point options are unchanged:
point?: { radius?: number; /* existing shape/fill/opacity/stroke/strokeWidth */ };
```

`editRuleMark`는 적어도 한 style 변경이 필요하며 target은 explicit/current/unique eligible Rule 순서다.
옵션 전체를 preflight한 뒤 `encodeStroke`→`encodeStrokeWidth`→`encodeStrokeDash`→`encodeOpacity` 중
요청한 child만 호출한다. 위치/데이터/캡/통계 재계산은 편집하지 않는다. Owned ErrorBar의 cap/body 조정은
기존 `editErrorBar`가 담당한다. `stroke:false`를 Rule·Area·Arc로 넓히지 않는다.

Scalar **mark editor**는 field encoding을 몰래 무효화하지 않는다. `editLineMark.strokeWidth`,
Line field-opacity 지원에 따른 `editLineMark.opacity`, `editRuleMark`의 width/dash/opacity는
같은 field encoding이 있으면 충돌 오류다.
기존 `editPointMark.shape/fill`, `editAreaMark.fill`의 field 충돌 원칙을 유지하고,
현재 이를 어기는 `editPointMark.opacity`도 오류로 교정한다. Rule의 explicit constant dash encoding은
새 scalar dash로 교체 가능하다. Line의 현재 curve/closed 제약도 유지한다.

반면 **`encodeStrokeWidth/encodeOpacity({value})`는 명시적 assignment 교체**다. 대상의 field encoding을
제거하고 constant config를 쓰며, 해당 channel의 범례만 정리하고 detached scale consumer를 재계산한다.
다른 mark가 사용하는 scale·color 범례는 제거하지 않는다. Field mode는 이전 constant override를 제거한다.
Line opacity field는 Point/Rule와 동일한 quantitative scale 옵션, 단 series별 하나의 값 조건을 사용한다.
기존 `encodeStrokeDash({value})`의 semantic datum 저장 방식은 바꾸지 않는다.

Scatter에서 `point.radius`와 `size` 동시는 오류다. Radius 0은 명시적 유효 값이고 생략은 기존 theme
radius를 유지한다. `createPointMark`에 radius를 억지로 통과시키지 않고 actual trace에 `encodePointRadius`가
나타나야 한다. Size를 없애고 radius를 쓰려면 기존 remove action을 명시한다.

### 확인한 충돌의 migration

```javascript
// ErrorBand: formerly misleading success, now a field/constant conflict.
coloredBand.editErrorBand({ target: "band", fill: "black" });

// Explicit replacement; S12 verifies that this lower chain already works today.
coloredBand.removeEncoding({ target: "band", channel: "color" })
  .editErrorBand({ target: "band", fill: "black" });

// Line: formerly writes an ineffective override, now a conflict.
fieldWidthLine.editLineMark({ target: "line", strokeWidth: 9 });

// New support on the existing assignment owner replaces the field intentionally.
fieldWidthLine.encodeStrokeWidth({ target: "line", value: 9 });

// Point: S17 verifies this existing assignment clears the opacity field/legend.
fieldOpacityPoints.encodeOpacity({ target: "point", value: 0.1 });
```

ErrorBand `fill`의 새로운 충돌은 의도적인 오류 계약 변경이다. `opacity`, `curve`, `statistics`, `boundaries`
편집은 계속 지원한다. 역방향으로 constant ErrorBand fill 뒤 `encodeColor({field})`도 충돌해야 한다.
별도 reset flag를 늘리지 않고, field color로 되돌릴 때는 ErrorBand owner의 constant override를 명시적으로
해제할 `editErrorBand({ fill:false })` 경로를 추가한다. 이때 false는 투명색이 아니라 **fill override 제거**다.
필드 color가 없으면 기존 theme/body default로 돌아간다. 활성 field color와 `fill:false`는 override 정리만 하며
field assignment를 유지한다. `fill` 선언은 `string | false`가 된다. 일반 Area/Arc의 `fill:false` 지원을 뜻하지 않는다.
생성 시 `createErrorBand.fill`에는 false를 추가하지 않는다. 생성 생략이 이미 override 없는 상태다.

```javascript
constantBand.editErrorBand({ target: "band", fill: false })
  .encodeColor({ target: "band", field: "country" });
```

Local highlight는 선택한 item의 임시 appearance override다. 일반 mark 편집이나 semantic assignment 교체로
취급하지 않는다. Baseline rematerialization→highlight replay와 selection preflight를 유지한다.

소유 코드: [Line mark](../../../../src/actions/marks/line/actions.js),
[Rule encoders](../../../../src/actions/encodings/ruleAppearance.js),
[opacity/radius](../../../../src/actions/encodings/appearance.js),
[encoding removal](../../../../src/actions/encodings/remove.js),
[ErrorBand edit](../../../../src/actions/errorBands/edit.js).

## W4 — 명시적 추론 규칙과 JSON opt-out

### 우선순위와 유지할 default

Explicit fieldType/aggregate/temporalUnit → 해당 owner가 원래 지원하는 stored semantic 정보 →
문서화된 owner별 default → 오류 순서다. 데이터형 추론으로 sum/mean 같은 분석 의도를 바꾸지 않는다.

| 결정 | 이번 단계의 확정안 |
| --- | --- |
| Bar numeric category/measure | 기존 finite numeric→quantitative, 지원 scalar→nominal; explicit type 우선 |
| Bar 반복 category 집계 | 기존 `mean` 유지; `sum`/`count`는 명시적 aggregate |
| Numeric color shorthand | 기존 nominal 유지; 연속 색상은 explicit `fieldType:"quantitative"` |
| Temporal 숫자 1000–9999 | 생략/auto에서 기존 연도 해석 유지; timestamp는 아래 새 옵션 |
| Dataset source schema | 현재 public API에 없으므로 `createData.schema`/`fields`를 새로 만들지 않음. 임의 row metadata를 schema로 읽지 않음 |
| 추론 evidence | 정규화된 의미는 기존 semantic fieldType/aggregate/group과 wrapped child args에 기록. 별도 trace schema나 runtime 자동 학습 없음 |

Schema 추가를 제외하는 이유는 현재 immutable dataset의 source/transform/values 계약에 field schema
보존·transform 전파·수정 owner가 없기 때문이다. D09의 현재 관측은 명시적 type/단위와 문서화로 해결한다.
F14의 데이터 authoring 검토에서 필요가 확인되면 별도 계약으로 다룬다. 현재 단계의 미정 API로 남기지 않는다.

### groupBy 옵션 matrix

| Action / 옵션 | 생략 | explicit `undefined` | `false` | field string |
| --- | --- | --- | --- | --- |
| `createRegression` | 기존 point color/shape 유일 후보 추론 | 기존 JS opt-out 유지 | 새 JSON-safe ungrouped | 명시적 group |
| `encodeDensity` | 기존 ungrouped | 생략과 동일 | 새 ungrouped | 명시적 group |
| `encodeHorizon` | 기존 stored group 추론 | 생략과 동일 | 새 ungrouped | 명시적 group |
| `editRegression`/`editDensity`/`editHorizon` | 기존 group 보존 | 기존 오류 유지 | 기존 group 해제 | 새 group으로 교체 |

Create쪽 세 method의 `groupBy?: string | false`를 선언한다. `{}` 전체 옵션의 의미는 이 표의 생략과 같다.
필드명 `"auto"`는 계속 실제 field명이며 새 sentinel로 예약하지 않는다. 빈 문자열은 오류다.
`createRegression`의 explicit undefined는 당장 깨지 않지만 public/MCP 예제는 false를 쓴다.
Data-only `createRegressionData/createDensityData/createHorizonData`의 생략은 원래 추론하지 않으므로
이번 opt-out 확장 대상이 아니다. Tuple 통계 group 지원을 이 변경에 몰래 포함하지 않는다.

새 false는 owner에서 먼저 정규화한다. Transform의 기존 `groupBy` field 또는 생략 구조는 유지하며
false를 field reader에 전달하지 않는다. JSON 왕복 뒤 **호출의 opt-out 의미**가 보존되어야 한다.
Trace는 원래 replay specification이 아니며, 요약된 trace 전체를 완전한 입력 데이터로 재실행한다고 약속하지 않는다.
Regression의 point color/shape 후보가 다르면 지금처럼 explicit groupBy를 요구한다. Point에 임의의
path group을 새로 허용하지 않는다. Horizon의 stored group 및 transform owner group 우선순위는 보존한다.

### Temporal 입력 단위

기존 달력 버킷 `unit`과 구분해 입력 해석 옵션을 **`temporalUnit`**으로 정한다.

```typescript
type TemporalInputUnit = "auto" | "year" | "timestamp";
// Add only to existing temporal binding branches:
{ field: string; fieldType: "temporal"; temporalUnit?: TemporalInputUnit; /* existing options */ }
// The corresponding supported temporal Rule datum branch also accepts temporalUnit.

createTimeUnitData({
  id: "days", source: "events", field: "time",
  temporalUnit: "timestamp", unit: "day", as: "day"
});
```

| 값 | 정확한 해석 / 저장 |
| --- | --- |
| 생략 | 기존 parser 유지; 기존 semantic에 새 default property를 강제로 추가하지 않음 |
| `"auto"` | 기존 parser를 명시적으로 선택; semantic에 저장 |
| `"year"` | 정수 0–9999 또는 정확히 네 자리 문자열 → 해당 UTC 연도 1월 1일. 그 외 오류 |
| `"timestamp"` | 유효한 Date 범위의 finite number를 Unix **milliseconds**로 해석. 숫자 문자열·Date 객체는 거부 |
| false/null/unknown | 오류. seconds 자동 추론 없음 |

기존 auto의 날짜 문자열·timezone 처리도 유지한다. 새 explicit numeric mode에서 locale나 mixed string을
추측하지 않는다. 단위 변경은 원본 rows를 수정하지 않고 해당 binding과 consumer를 재계산한다.

- Lower temporal 위치 `encodeX/Y`, 지원되는 `encodeX2/Y2`, `encodeXRange/YRange`, `encodeTheta`,
  temporal `encodeColor`, 그리고 이 vocabulary를 재사용하는 facade/composite position object에 전달한다.
  현재 temporal을 지원하지 않는 mark/channel을 이 옵션 때문에 열지 않는다.
- `encodeHorizon`/`editHorizon`의 temporal x와 `createHorizonData` transform x,
  `createTimeUnitData`의 input도 같은 parser를 쓴다. Horizon 내부의 이미 정규화된 timestamp를 다시 year로
  읽지 않도록 owned generated binding에 timestamp 의미를 전달한다.
- Primary/secondary temporal endpoint는 같은 scale을 유지하지만 각 field의 입력 단위를 독립 명시할 수 있다.
  Range shorthand의 단위는 lower/upper에 동일 전달한다. Temporal Rule datum도 같은 규칙이다.
- 저장은 `layer.encoding.<channel>.temporalUnit` 및 해당 data transform의 입력 descriptor다.
  `scale.domain`/tick values는 기존의 정규화된 timestamp 표현을 유지하며 입력 단위로 다시 변환하지 않는다.
- 같은 field의 재assignment에서 단위 생략은 기존 explicit 단위를 보존한다. 다른 field 또는 field→datum 전환은
  생략 시 auto로 돌아가며 stale unit을 제거한다. 같은 datum의 재assignment는 동일한 보존 규칙을 따른다.
  Non-temporal binding으로 바꾸면 단위를 제거하며 non-temporal args에 temporalUnit을 주면 거부한다.
- Scale consumers, mark geometry, aggregate grouping, selection/filter가 같은 정규화 값을 사용해야 한다.
  Raw-field selector는 원래 rows 값을 유지하고 encoding-value selector는 정규화된 값을 쓴다.
  Shared scale은 정규화 후 같은 단위를 가지므로 서로 다른 raw input units가 공존할 수 있다.

예상 수치: `[1000,2000]`에 timestamp + `scale.nice:false` → domain `[1000,2000]`;
year/auto → `[-30610224000000,946684800000]`. 날짜 문자열 입력의 기존 결과와 Bar mean·nominal color도 비교한다.
`createTimeUnitData`의 결과는 UTC bucket timestamp다. 그 결과를 새 temporal encoding에 직접 연결하는 예제는
`temporalUnit:"timestamp"`를 명시해 작은 양수 timestamp가 year로 재해석되지 않게 한다.

소유 코드: [temporal parser](../../../../src/grammar/scales/fields.js),
[position resolve](../../../../src/actions/encodings/position/resolve.js),
[scale consumers](../../../../src/actions/scales/consumers/common.js),
[timeUnit transform](../../../../src/grammar/timeUnit.js),
[regression inference](../../../../src/actions/regression/resolve.js).

## W5 — Bar incomplete intent

새 public 옵션은 없다. `encodeBarWidth`와 기존 position actions의 유효한 작성 순서를 확장한다.

```javascript
base.createBarMark({ id: "bars" })
  .encodeBarWidth({ band: 0.5 })
  .encodeY({ field: "y" })
  .encodeX({ field: "country", fieldType: "nominal" });
// Same final semantic/graphic result as category → measure → width.
```

| 작성 상태 | 저장 / materialization | 바로 거부할 입력 |
| --- | --- | --- |
| 위치 없는 Bar에 width | 기존 mark config의 barWidth만 저장, 새 items 없음 | band <= 0 또는 > 1, pixels <= 0, non-finite, 두 mode |
| quantitative measure 먼저, aggregate 생략 | field/type/scale 요청을 semantic에 보존; aggregate를 아직 선택하지 않음 | missing field, invalid field values/type/options |
| 반대쪽 category 완성 | 기존 mean/null-stack 정책을 unresolved measure에 적용하고 materialize | 양쪽 category/measure 등 지원되지 않는 complete pair |
| histogram x bin 완성 | 같은 field의 pending y는 기존 count/zero-stack 규칙으로 완성 | 다른 field, unsupported aggregate/bin |
| width 재assignment | 생략은 기존 mode 유지, 첫 생략은 기존 band 0.72 | 현재와 동일한 width 범위 오류 |

`semanticSpec`에 valid partial encoding을 두고 미결정 aggregate를 명시적 mean으로 위장하지 않는다.
미결정 여부는 기존 encoding의 부재와 owner policy로 판별하며 `pending:true`, placeholder values,
별도 compiler queue를 추가하지 않는다. 반대쪽 position을 쓰는 action이 기존 Bar policy owner를 통해
두 channel을 함께 정규화하고 실제 semantic child 변경을 trace에 남긴다.

Bar width는 aggregate/ranged category slot 전용이라는 기존 의미를 유지한다. Width를 먼저 저장했는데
나중에 histogram처럼 그 width 계약이 없는 grain이 완성되면 마지막 action이 명확히 거부한다.
Width를 무시하거나 histogram bin interval에 임의 적용하지 않는다. Histogram y-first 지원과 width 지원은 별개다.
Box의 pending range와 기존 ranged bar·offset·grouped layout 조건도 전용 owner가 계속 검사한다.
완성된 Bar에 필요한 position을 제거하면 graphic items를 비우고 width config는 남겨 재작성 시 복원한다.

비교는 semanticSpec·graphicSpec·resolved scales·유효한 mark configs의 최종 의미다. 서로 다른 작성 순서의
trace를 byte-equal로 만들지 않는다. 기록은 실제 순서를 보존한다. 기존 aggregate/explicit sum/count를
다시 mean으로 덮어쓰지 않으며 missing field 오류를 incomplete-state라는 이유로 미루지 않는다.

소유 코드: [Bar position policy](../../../../src/actions/encodings/position/policies/bar.js),
[position apply](../../../../src/actions/encodings/position/apply.js),
[Bar width](../../../../src/actions/encodings/barWidth.js),
[width grammar](../../../../src/grammar/bars/geometry.js).

## 실행 순서·visual 경계·검증

1. A 승인 기록 후 W1 guide helper/역할 문서와 W5 기존 출력 수렴 교정을 각각 작은 commit으로 진행한다.
2. W2 primitive series target과 W4 explicit timestamp target을 작성·렌더하고 V에서 실제 이미지와 호출을 검토한다.
3. W2 identity owner → W3 shared appearance owner와 얇은 facade → W4 opt-out/temporal consumers 순으로 진행한다.
   W3의 Line field opacity는 W2 series 검증을 재사용한다. 새 output target에 해당하는 public flow는 V 승인 후다.
4. 각 coherent change의 runtime/types/Current/cards/docs를 같은 범위에서 맞추고 focused 검증 후 commit/push한다.
5. 모든 matrix와 migration을 확인하고 X 결과 package를 제출한다. X 전 Phase 3 구현 승인을 가정하지 않는다.

| Visual 분류 | exact target source/call 계획 | 수치·상태 검증 |
| --- | --- | --- |
| W1 기존 모양 보존 교정 | G02의 두 번째 guides:false explicit chain과 새 G01을 비교; 부분 guide는 동일 lower component chain | layer 2, guide 중복 0, title/style 보존, resized geometry |
| W3 기존 style shorthand/교체 | S05/S07/S10/S12 lower chain과 새 shorthand 비교 | radius 5, width 4/9, opacity .5, 해당 legend/encoding 제거 |
| W5 기존 모양 보존 교정 | O02/O04 및 horizontal explicit lower chain | 4 categories, mean 값, band/pixel width, resize와 immutability |
| **V1 series identity/appearance** | 나라 4개 × x 4개; group country, color continent; tuple country/scenario 8 paths variant; independent primitive가 source rows로 partition/좌표/style 계산 | path별 실제 member key, 4/8 paths, continent 2색, 유일 width/opacity, ambiguous-value negative |
| **V2 explicit temporal meaning** | raw `[1000,2000]`, timestamp scatter와 year scatter를 별도 variant로 렌더; 위 W4 exact call을 manifest에 저장 | nice:false domain, UTC label, 2 positioned points, source units와 normalized scale 일치 |

위 N/A 후보는 이미 성공하는 명시적 chain과 **출력 동등성을 실제 입증할 때만** V 적용 없음으로 확정한다.
새 appearance가 추가로 발견되면 target을 분리한다. 현재 새 primitive 이미지·public render 결과·V 승인은 없다.
V package는 실행 source·단일 manifest·input hash·dimensions·actual image·plot-region ink를 포함한다.
승인 후 같은 실행의 decoded primitive/public pixel equality와 concrete graphic parity를 확인한다.

Phase 2 필수 acceptance는 [VALIDATION.md](VALIDATION.md)의 owner/consumer matrix에 정의한다.
특히 Line/Area의 Cartesian·Polar·aggregate·pathOrder·selection/highlight, guide reuse의 부분 component,
tuple delimiter/type 충돌, constant↔field 역방향, JSON 전후 false, temporal consumer 일관성, Bar 작성 순서가 대상이다.

## Public 동기화와 남겨 둘 범위

- Current owners: BASIC_CHARTS, ENCODINGS, MARKS, COMPOSITE_MARKS, GRADIENT_PLOTS, VIOLIN_PLOTS,
  STATISTICS, AXES, GRID, LEGEND_AND_TITLE, CORE의 실제 소유 문서. 정확한 파일 route는
  [Current index](../../../contract/README.md)로 확인한다.
- Declarations: `types/program.d.ts`, root/basic reexports·method allowlist. 기존 basic에 있는 encoders의 확장은
  basic에서도 동일하게 동작해야 한다. `encodePointRadius`를 basic public allowlist에 추가하고 기존
  `encodeRadius` wrapper dependency도 등록한다. Basic에서 `encodeRadius`/`removePointRadius`를 별도 public
  alias/remover로 승격하지 않는다. 현재 basic은 다른 편집·제거 method도 공개하지 않는 생성 중심 표면이다.
  `editRuleMark`, Rule style, `encodeStrokeWidth`, `encodeOpacity`는 default entry에 유지한다.
  Root의 radius alias/removal은 그대로다. Basic의 일반 style/통계 전체를 추가하지 않는다.
- 등록 action inventory는 새 public `editRuleMark`와 실제 internal wrapped 추가분만 갱신한다.
  Direct/internal 전체집합 guard, installed package positive/negative TypeScript와 runtime을 함께 확인한다.
- Cards v2/LLM/search/reference/options/support metadata·MCP snippet은 실제 구현한 표면만 갱신한다.
  ErrorBand fill migration과 numeric defaults는 release notes용 CHANGELOG에도 기록한다. 배포는 별도다.
- B01은 W5 결과 승인 후에만 전체 해결 가능하다. D04의 metadata 교정과 D06의 위 범위가 완료돼도
  Phase 6 composite role editor, Phase 11 전수 metadata, Area/Arc false 확장을 완료했다고 하지 않는다.
- K01–K06/K08의 이 단계 구체화는 이 문서가 소유한다. [DESIGN_DECISIONS](../DESIGN_DECISIONS.md)의
  후속 layout/새 chart/metadata 확장 제안을 이번 A 승인으로 자동 확정하지 않는다.

R6-P2-A 승인은 위 public delta·오류 migration·기본값 보존·범위 제외와 검증 계획에 대한 승인이다.
R6-P1-X의 “승인한다”를 재사용하지 않는다. API 구현 전에 이 구체적인 계약에 대한 검토가 필요하다는 근거는
[root AGENTS](../../../../AGENTS.md)의 “Discuss material changes to public APIs, persisted schemas, or core
architecture with the user before implementing them.”과 [impl AGENTS](../../AGENTS.md)의
“Treat Gates as hard execution boundaries. Add intermediate Gates for independent public decisions, findings,
or visual targets and stop at the first unapproved Gate.”다.
