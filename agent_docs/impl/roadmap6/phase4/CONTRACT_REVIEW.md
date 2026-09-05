# R6-P4-A — Area·layout·radial mapping·order·midpoint 계약 검토

상태: **Proposed / ready-for-review, 미승인·미구현**. Phase 3 X의 사용자 “승인한다”는
Phase 3 완료와 이 검토 준비를 열었다. 아래 P4-C01–C09의 production 구현 승인은 아직 없다.
정확한 원격 검토 ref는 [GATES.md](GATES.md)가 소유한다. F20은 계속 제외한다.

## 승인할 결정과 이유

| 결정 | 제안 | 이유 |
| --- | --- | --- |
| P4-C01 / endpoint | Area의 기존 position/range에 `datum` 추가. 새 baseline action 없음 | Rule의 data-space vocabulary와 ranged owner 재사용 |
| P4-C02 / Area | `createAreaPlot`, 기본 baseline 0, 명시적 ribbon·group/layout·missing 정책 | 짧은 호출이 완성 영역을 만들고 아래층에서 그대로 편집 가능 |
| P4-C03 / layout | `encodeLayout`; group identity·layout·appearance 분리 | color/stack/offset의 경쟁하는 상태와 전환 실패 제거 |
| P4-C04 / radial | `createRosePlot`, `createRadialBarPlot`; 기존 `encodeR`의 opt-in mapping | 동일 Arc owner로 면적과 길이를 구분하며 일반 radius 기본값 보존 |
| P4-C05 / order | theta category order + categorical legend의 별도 order policy | 부채꼴/항목 순서 변경이 category의 색을 재배정하지 않음 |
| P4-C06 / midpoint | 기존 sequential scale에 `midpoint` 추가. 새 diverging scale type 없음 | 팔레트·보간·역전·소비자를 재사용하고 비대칭 domain의 기준값 명시 |
| P4-C07 / transition | 생성·재할당·편집이 같은 consumer validator 사용; 호환 legend는 함께 전환 | active legend 하나 때문에 가능한 scale 전환 전체가 막히는 불일치 해소 |
| P4-C08 / state | endpoint/group/layout/mapping/order/midpoint마다 canonical 위치 하나 | H0 recipe나 renderer에 중복 의미를 저장하지 않음 |
| P4-C09 / delivery | 새 direct action 4개, 3개 H0는 full 전용, layout은 full/basic | 기존 Basic Bar 작성에도 color 독립 배치를 제공; 상한 증가는 별도 B |

완성 chart 계약은 [Area](../chart/area.md), [Rose/Radial bar](../chart/rose-radial-bar.md)에 모았다.
아래의 미래 호출은 제안 signature다. 현재 실행 가능한 관측 호출과 혼동하지 않는다.

## 기준과 실제 재현

- Baseline: [`93dceb3761e170207058e6a7280060fedd471244`](https://github.com/ggaction/ggaction/commit/93dceb3761e170207058e6a7280060fedd471244).
- Source tree `6d5a80e311cabdc67dff5da739dcce3346e3841d`, types tree `38cbb7b6d7feaa5b044a56189ea874b8bde5d581`.
- Branch `codex/roadmap6-hierarchical-actions`, package 0.0.12, Node 22.23.1 / macOS arm64.
- [실행 source](baseline.probes.mjs), [49건 JSON](baseline-results.json): action 199회마다 이전 program/trace와 caller 입력 불변 확인.
- 관련 기존 tests 28 files **200/200**, fail/skip 0. [명령·수치 oracle·소비자 검증 계획](VALIDATION.md).
- Production source/types/knowledge 변경 없음. 누적 2,585 tests, coverage, realistic의 한계,
  동일 tarball 설치·browser·bundle 결과는 [Phase 3 X](../phase3/REVIEW.md)의 승인 증거를 참조한다.
  이번 A 준비에서 이를 재실행했다고 세지 않는다.

| 재현 | 현행 결과 | 처분 |
| --- | --- | --- |
| A01–A04 / A14 | raw Area x/y는 0 items, datum endpoint 거부, field ribbon은 1 path | H0 baseline 0 + 기존 endpoint 확장 |
| A05–A09 | reversed fields 허용, null endpoint 거부, 양수 log range·horizontal 허용, log 0 거부 | signed/crossing range 유지; opt-in break; log에 epsilon 삽입 금지 |
| A10–A13 | raw stack zero 거부, center 허용, center와 다른 color field 거부, 불일치 sample grid 거부 | layout owner 통합, series-constant color 허용, 정렬된 grid 제한 유지 |
| A15 | range field 재할당 성공, domain 갱신 | mixed endpoint도 같은 lifecycle 적용 |
| L01–L04 | color group→stack 거부; measure stack zero 재할당은 성공하지만 geometry 그대로; Bar encodeGroup 거부 | canonical layout/group + alias 충돌 제거 |
| L05–L09 | fill·signed diverging 지원, negative stack 거부; center→overlay 거부; color 없는 offset은 0 bars | 검증된 stack math 재사용, independent grouping과 전환 구현 |
| R01–R04 | radius auto [2,4]는 최소값 sector 생략, zero:true는 3개. sqrt는 disk 면적만 정확. hole은 이미 auto range에 반영됨 | generic legacy 유지, 새 차트에 zero 기반 mapping |
| R05–R07 | 중복 category는 행별 4 sectors, radius aggregate/mapping 옵션 없음 | radius가 category grain·mapping 소유 |
| R08 | 모두 0인데 [0,0] domain의 midpoint fallback으로 3개 visible sectors | 새 opt-in 측정 모드는 양수 합계가 하나 이상이어야 함 |
| R09 | sqrt range [70,140]에서 값 2/4의 면적비가 약 0.638, 0.5가 아님 | annulus 공식을 명시하고 inner-radius edit까지 검증 |
| O01–O07 | theta order 거부. Cartesian partial order/ties/clear는 지원. 위치 order는 color domain·legend에 전달되지 않음 | theta 확장 + 명시적 legend order link, hue identity 유지 |
| C01–C03 | [-2,8]의 기본 neutral은 3, midpoint 옵션과 diverging type 없음 | midpoint 0을 선택할 수 있는 기존 scale 확장 |
| C04–C09 | Point scale→quantize는 legend 없으면 성공, 있으면 실패. Bar 직접 quantize 생성은 성공, edit는 실패. 재encode type 변경도 실패 | creation/edit/reassignment validator와 legend migration 통합 |

현재의 의도된 미지원까지 모두 버그라고 부르지 않는다. 새 의미는 opt-in으로 추가한다.
반면 같은 최종 구성이 생성 경로에 따라 달라지는 사례는 명시적인 호환성 교정 대상으로 삼는다.

## P4-C01 — Area endpoint와 range assignment

기존 `encodeX/encodeY/encodeX2/encodeY2`에서 Area의 quantitative endpoint에
`{ datum: finiteNumber }`를 추가한다. `field`와 `datum`은 배타적이며 datum에 aggregate/bin/temporalUnit을 붙이지 않는다.
독립 위치는 계속 quantitative/temporal **field**다. 최소 한쪽 측정 endpoint는 field여야 하며 두 상수만인 영역은 거부한다.
Rule의 기존 datum 계약, Bar/Rect의 기존 field 계약은 바꾸지 않는다.

~~~typescript
// Proposed additions, not declarations available today.
type AreaBound = string | { datum: number };
// Existing range options remain; only Area accepts object bounds.
interface ProposedAreaRangeOptions {
  target?: string;
  lower: AreaBound;
  upper: AreaBound;
  fieldType?: "quantitative";
  scale?: NonPointQuantitativePositionScaleOptions;
  coordinate?: string;
}
interface ProposedAreaRangeActions {
  encodeXRange(options: ProposedAreaRangeOptions): ChartProgram;
  encodeYRange(options: ProposedAreaRangeOptions): ChartProgram;
}
~~~

`lower`는 primary, `upper`는 secondary의 **역할 이름**이다. 값의 대소를 검사하거나 자동 swap하지 않는다.
기존 crossing ribbon과 baseline보다 음수인 값도 표현할 수 있다. 독립 sample 사이의 linear crossing은
두 boundary가 교차하는 닫힌 path로 남으며, 양/음수를 별도 색으로 나누는 기능은 아니다.
Primary/secondary는 하나의 scale을 공유한다. 자동 domain에는 두 endpoint를 포함한다.
Explicit domain/clamp/reverse의 기존 정책을 유지하며 datum을 위해 domain을 몰래 덮어쓰지 않는다.
Log는 endpoints 전체가 같은 부호의 nonzero여야 한다. 0 baseline인 H0에서 log를 요청하면 오류이며
명시적 유효 baseline이 필요하다. 다른 nonlinear 종류도 기존 scale validator를 그대로 통과해야 한다.

Range owner는 **최종 두 endpoint와 최종 scale의 조합을 먼저 검증**한다.
이전 endpoint에 잠시 새 scale만 적용해서 실패하는 중간 상태가 final-state-valid 재할당을 막지 않는다.
성공 시 기존 wrapped position·scale·materialization child를 사용하며 미완성 중간 그래픽을 외부 반환하지 않는다.
`removeEncoding`의 기존 명시적 제거 경로를 유지한다. raw x/y만 남으면 기존처럼 incomplete이고,
H0 생성만 기본 baseline을 반드시 작성한다.

## P4-C02 — Area missing과 완성 facade

정확한 H0 union·옵션·child chain은 [Area 계약](../chart/area.md)을 따른다.
`createAreaMark`/`editAreaMark`에 `missing?: "error" | "break"`를 추가한다. 기본 `error`는 기존 strict 동작이다.
Policy는 `semanticSpec.layers[].mark.missing`에 저장하고 markConfigs에 중복하지 않는다.

`break`는 raw Area의 **null/undefined 측정 field endpoint**에서만 path를 끊는다.
독립 위치가 없으면 정렬된 공백 위치를 알 수 없으므로 오류다. NaN/Infinity/비숫자·누락 group·invalid temporal은 오류다.
같은 series를 independent position 오름차순(명시 pathOrder가 있으면 해당 order)으로 정렬한 다음 나눈다.
연속 유효 sample이 2개 이상인 segment만 채우며 singleton은 그리지 않는다. 전체에 유효 segment가 없으면 오류다.
`missing:error`의 기존 series 최소 2점 제한은 유지한다. 전부 baseline인 유효 segment는 0 면적의 정당한 결과다.
자동 domain은 유효 endpoint와 datum으로 계산한다. shared consumer 중 다른 strict mark가 같은 결측 field를
거부하면 Area의 break 옵션으로 그 소비자까지 완화하지 않는다.

Stack/fill/diverging/center는 모든 series가 동일한 independent grid를 가져야 한다.
`break`는 한 grid 위치의 어느 series라도 endpoint가 missing이면 **모든 stacked series를 그 위치에서 함께 끊는다**.
존재하지 않는 group×position 행을 자동 생성하거나 zero로 보충하지 않는다. 중복 group×position도 오류다.
Density/Horizon의 derived missing 정책은 해당 transform owner를 유지하며 `missing:break` 재해석을 거부한다.

## P4-C03 — 하나의 layout owner와 호환 adapter

~~~javascript
// Proposed, after complete Bar category/measure or Area position assignment.
const grouped = bars.encodeGroup({ target: "bars", field: "series" })
  .encodeLayout({ target: "bars", mode: "group" });
const stacked = grouped.encodeLayout({ target: "bars", mode: "stack" });
const restored = stacked.encodeLayout({ target: "bars", mode: "group" });
const plain = restored.removeEncoding({ target: "bars", channel: "color" });
// Same group/layout geometry; constant appearance can now be edited separately.
~~~

Signature는 `encodeLayout({ target?: string, mode: "group"|"stack"|"fill"|"overlay"|"diverging"|"center" })`다.
mode는 필수다. 새 `layoutBars`, `encodeStack`, `removeLayout` alias는 만들지 않는다.
명시적 해제는 `mode:"overlay"`다. `encodeGroup`은 기존 field/fields union을 Bar로 확장한다.
Group fields는 scale 없는 nominal tuple identity다. Group 순서는 안정된 first appearance이며
category order·legend order·draw order로 stack 순서를 변경하지 않는다.

| mark/grain | group | stack / fill / diverging | center | overlay |
| --- | --- | --- | --- | --- |
| complete aggregated categorical Bar, histogram | 지원 | 지원 | 오류 | 지원 |
| ranged Bar | 오류: 기존 overlay 범위 유지 | 오류 | 오류 | 지원 |
| raw simple/baseline Area | 오류 | 지원, aligned grid | 기존처럼 vertical·nonnegative만 | 지원 |
| raw two-field ribbon | 오류 | 오류: endpoint 차이를 자동 measure로 추론하지 않음 | 오류 | 지원 |
| derived Density Area | 오류 | 기존 지원 방향·grain 한도 내 owner 위임 | 기존 지원 한도 유지 | 지원 |
| Horizon, Point, Line, Arc, Rect, Rule | 오류 | 오류 | 오류 | 오류: 해당 mark의 기존 배치 owner 유지 |

Stack/fill/center는 finite nonnegative measures만, diverging은 finite signed measures를 허용한다.
Stacked raw Area는 datum=0과 하나의 value field, 또는 value field만 있는 incomplete range를 입력으로 받는다.
후자의 경우 기존 endpoint owner로 반대 endpoint 0을 명시한다. Nonzero baseline을 누적 origin으로 추론하지 않는다.
Fill의 분모는 같은 position의 nonnegative 합계다. 0 합계에서는 모든 두께가 0이며 0/0을 만들지 않는다.
전체가 0인 fill domain은 [0,1]이다. Diverging은 양수/음수 누적을 각각 0에서 시작한다.
Center는 ±total/2이며 overflow/precision 오류는 기존 `layoutSeriesPartition` 검사를 유지한다.

Canonical mode는 `semanticSpec.layers[].layout.mode`, group은 `encoding.group`이다.
Bar offset의 field는 group에서 결정하고 offset scale/padding은 기존 offset owner가 소유한다.
Group에서 떠날 때 active offset encoding은 제거하고, 공유되지 않는 자동 생성 offset scale만 정리한다.
사용자가 만든 standalone/shared scale을 삭제하지 않는다. Group 재진입은 현재 group으로 다시 해석한다.
맞춤 offset scale/padding을 제거한 뒤 자동 복원한다고 약속하지 않는다. 보존이 필요하면 기존 offset 옵션을 재지정한다.

기존 `color.layout`, measure `stack`, Bar `encodeXOffset/encodeYOffset`는 같은 owner에 위임한다.
처음 작성하는 legacy color/group 기본값은 그대로이나 mode를 두 군데에 저장하지 않는다.
구 legacy semantic state는 다음 관련 편집에서 정규화하며 기존 허용 입력의 최초 geometry는 유지한다.
서로 다른 legacy 값의 precedence는 현재 resolver로 한 번 해석하고 canonical mode만 남긴다.
그 뒤 **마지막 명시적 layout 요청**이 이기며 `color.layout` 전환을 금지하던 제한을 제거한다.
stack zero/normalize/null/center는 각각 stack/fill/overlay/center로 번역한다.
Color 재할당에 layout 옵션이 없으면 이미 명시한 layout을 바꾸지 않는다.

Legacy color/offset이 만든 group에는 `encoding.group.inferredFrom: "color"|"offset"` provenance만 추가한다.
사용자 `encodeGroup`은 이 marker를 제거한다. Adapter는 자기 유래의 group만 field 변경에 맞춰 갱신할 수 있고,
explicit group과 충돌하면 오류다. 이 marker는 별도 group 값이나 geometry cache가 아니다.
Color 제거는 확정된 group/layout을 유지한다. Active layout에 필요한 group 제거는 먼저 overlay로 바꾸지 않으면 오류다.
단색 group/stack은 유효하며 색상 의미가 없으므로 자동 color legend를 만들지 않는다.
Area의 color는 series마다 한 값이어야 하지만 group field와 같은 이름일 필요는 없다.
Bar는 각 aggregate cell의 기존 color grain을 검사한다. Quantitative color가 position마다 달라지는 정상적인
Bar까지 series-constant로 제한하지 않는다.

## P4-C04 — Radius 측정 mode

정확한 H0 호출과 수치식은 [Rose/Radial 계약](../chart/rose-radial-bar.md)에 있다.
`encodeR`와 기존 alias `encodeRadius`에 Arc 전용 opt-in을 추가한다.

~~~typescript
type ArcMeasuredRadius = {
  target?: string; coordinate?: string;
  mapping: "area" | "radius-length";
  scale?: { id?: string; type?: "linear"; domain?: "auto" | readonly [0, number];
    range?: "auto" | readonly [number, number]; nice?: false; zero?: true; reverse?: false; clamp?: boolean };
} & ({ field: string; fieldType?: "quantitative"; aggregate: "sum" }
   | { aggregate: "count"; field?: never; fieldType?: never });
~~~

동일 category를 합친 측정값으로 equal-angle sector를 하나 만든다. Count도 theta의 count partition을 쓰지 않는다.
Generic `encodeR({field,...})`는 기존 row grain/scale/default를 유지하며 mapping 없는 aggregate는 계속 오류다.
Mode가 붙으면 at least one positive aggregate, nonnegative finite inputs, zero-based strictly increasing domain,
finite `0 <= r0 < R`를 요구한다. Explicit domain upper는 관측 maximum 이상이어야 한다.
Measured Arc의 padAngle은 0만 허용한다. Explicit radius range와 명시적 innerRadius ratio가 함께 있으면
일치해야 하며 edit에서도 이 관계를 검증한다. Generic Arc/Pie의 기존 padding 지원은 그대로 유지한다.
All-zero/negative/nonfinite/unequal-angle/weighted theta/비호환 공유 Point 소비자는 전체 호출을 거부한다.
0 category는 domain/legend에는 남고 visible sector는 없다. 양수 최소값을 숨기는 [min,max] 자동 domain은 사용하지 않는다.
Mode 전환은 같은 `encodeR`에 새 mapping으로 재할당한다. Generic radius로 돌아가려면 radius encoding을 제거한 후
legacy 호출을 다시 작성한다. 부분 옵션 생략을 mapping 해제라고 추측하지 않는다.

Mapping은 scale의 `radialMapping`에 canonical 저장한다. `encoding.radius.aggregate`는 category grain만 소유한다.
하나의 radius scale을 공유하는 consumers는 같은 mapping을 사용해야 하며 generic/area/radius-length 혼용은 오류다.
Auto radius range의 동일 innerRadius 정책은 기존 guard를 유지한다.
Marks뿐 아니라 radial guides/ticks/grid와 inverse mapping을 쓰는 모든 소비자가 동일 mapper를 사용해야 한다.
렌더러는 계산된 M/L/C/Z commands만 그린다.

## P4-C05 — Theta order와 legend item order

기존 `orderCategories`/`removeCategoryOrder`의 channel union에 `theta`를 추가한다.
지원 대상은 categorical theta를 사용하는 Arc와 Polar Point/Line이다. Weighted Pie도 category 순서만 바꾸며
각 weight/angle은 유지한다. Quantitative theta에는 적용하지 않는다. Shared theta는 동일 data/field identity와
하나의 order를 요구한다. Explicit scale.domain과 semantic order의 충돌은 기존 규칙대로 오류다.
`values` partial list는 생략 category를 first appearance로 뒤에 붙인다. Unknown/duplicate entry는 오류다.
`by`, aggregate, direction과 stable ties는 기존 Cartesian 계약을 그대로 재사용한다.
값만 바뀌고 category first appearance가 같으면 기본 identity/order는 바뀌지 않는다.
사용자가 `by:{field,...}`를 요청했을 때의 값 기반 재정렬은 의도된 결과다.

~~~javascript
// Proposed. Position order and legend order are separate, explicit operations.
const ordered = pie.orderCategories({ target: "pie", channel: "theta", values: ["C", "A"] });
const linked = ordered.editLegend({ target: "pie", order: { channel: "theta" } });
const explicit = linked.editLegend({ target: "pie", order: { values: ["B"] } });
const reset = explicit.editLegend({ target: "pie", order: "scale" });
~~~

`createLegend`/`editLegend`의 categorical 전용 옵션:
`order?: "scale" | { values: readonly Category[] } | { channel: "x"|"y"|"theta" }`.
Category는 기존 order의 nominal scalar type이다. 기본 `"scale"`은 현행 ordinal domain 순서다.
Link는 같은 legend target의 해당 categorical channel이 같은 data/field/category set을 설명할 때만 허용한다.
Link 대상이 사라지거나 category set이 달라지는 후속 편집은 atomic 오류이며 먼저 order를 reset해야 한다.
Explicit values의 partial/tie/unknown 정책은 위와 같다. Empty explicit list는 기존 order validator처럼 오류다.
Combined legend의 동일 ordered domain 조건은 유지한다. Continuous/interval legend에 order는 오류다.

Policy는 `semanticSpec.guides.legend.color.order` 또는 `.series.order`에 저장한다.
guideConfigs의 domain은 materialized item order일 뿐 source policy가 아니다.
Legend item을 domain value로 조회해 기존 color/shape/dash symbol을 붙인다. 배열 인덱스로 팔레트를 다시 매핑하지 않는다.
Theta order가 path vertex order, series stacking, drawing order까지 정렬하는 동작은 범위 밖이다.

## P4-C06–C07 — Midpoint와 atomic scale/legend 전환

기존 sequential quantitative color scale의 생성/nested scale/`editScale`에
`midpoint?: number | "auto"`를 추가한다. Numeric midpoint는 finite하고 최종 domain의 두 끝 사이에 **엄격히** 있어야 한다.
`"auto"`는 semantic midpoint를 제거하고 기존 endpoint 선형 보간으로 돌아간다. 생략은 생성에서 기존 기본,
편집에서 기존 policy 보존이다. Temporal/ordinal/position/discretized scale에 numeric midpoint를 허용하지 않는다.

Domain [a,b], midpoint m이면 색상 parameter는 v<=m에서 `(v-a)/(2*(m-a))`,
v>=m에서 `0.5+(v-m)/(2*(b-m))`다. 기존 clamp/reverse/interpolation을 같은 mapper에서 적용한다.
Palette의 중앙 sample을 m에 매핑한다. 모든 palette가 white/neutral 중앙색을 가진다고 추론하지 않는다.
[-2,8], m=0, blue/white/red에서는 -2=blue, 0=white, 4=#ff8080, 8=red다.
Legend는 값에 선형인 위치를 유지하여 0을 domain 길이의 20% 지점에 표시하고 해당 위치의 strip도 white가 된다.
중앙 tick을 포함·deduplicate하며 기존 count는 기본 tick sampling 수다. Legend strip을 단순 50% white로 남기면 실패다.

Sequential↔quantize/quantile/threshold는 기존 creation-capable Point/Bar/Rect를 같은 validator로 검사한다.
Bar는 complete aggregate grain, Rect는 현재 color grain을 유지하며 fieldType/unknown/aggregate 제약을 그대로 검사한다.
Nominal↔quantitative field meaning 변환은 새 automatic coercion이 아니다.
`encodeColor`의 nested scale type 재할당도 이 transition owner에 위임하고 공유 소비자 전체를 검증한다.
Type 전환 때 midpoint 같은 비호환 속성은 제거하고 돌아올 때 예전 값을 몰래 복원하지 않는다.
Threshold/quantile의 domain 의미는 기존 계약을 따른다. 타입이 바뀌면 자동 추측이 모호한 domain/range는 명시해야 한다.

Active legend는 다음 **공통 지원 교집합**에서 같은 transaction으로 gradient↔interval을 재생성한다.
Position right, direction vertical, 동일 target/channel, title·title visibility·labels·titleStyle·border·align·offset은 보존한다.
새 family의 고유 layout 값은 그 family의 기본값을 사용한다. 이전 family에서 기본값과 다른 count/gradient size/
symbol/itemGap을 사용했다면 의미 없이 버리지 않고 오류다. 사용자는 기존 removeLegend→editScale→createLegend로
새 표현을 명시할 수 있다. 이 수동 3-call 경로 전체를 하나의 atomic 호출이라고 주장하지 않는다.
Top/bottom/left gradient를 interval로 자동 전환하는 확장은 D08/Phase 5로 남긴다.
지원 교집합에서는 legend 유무와 관계없이 같은 scale/mark 결과여야 하고, 비호환 legend나 consumer 하나면 이전
program/scales/graphics/configs/trace 전체가 유지돼야 한다. 자동 family 전환 후 explicit guide editor도 정상 작동해야 한다.

## P4-C08–C09 — 책임과 납품 경계

| 상태 | canonical 위치 | derived/read 소비자 |
| --- | --- | --- |
| endpoint field/datum | layer.encoding.x/y/x2/y2 | scale domain, Area grammar, selection |
| missing policy | layer.mark.missing | raw Area segmentation, scale field reader |
| group identity·legacy origin | layer.encoding.group | aggregate grain, appearance constancy, provenance |
| layout mode | layer.layout.mode | bars/areas, offsets, scale domains, guides, selection |
| radial mapping | semantic scale.radialMapping | resolved radius mapper, Arc, radial guides |
| radial aggregate | layer.encoding.radius.aggregate | category aggregation/provenance |
| category order | layer.encoding.theta.categoryOrder | resolved theta domain |
| legend order | semantic guide.legend.kind.order | legend item permutation only |
| midpoint | semantic scale.midpoint | color mapper, legend samples, type transitions |

`semanticSpec`의 새 필드는 구현 시 schema·타입·serialization/immutable helper·architecture와 함께 갱신한다.
Context는 current resource의 편의만 담당하고 H0 result recipe나 renderer inference를 추가하지 않는다.
가짜 derived source columns, hidden transform chain, category color cache는 추가하지 않는다.
Group tuple/sourceIndices·aggregate value의 기존 provenance를 유지해 selection/highlight가 올바른 원본 행을 참조하게 한다.

새 direct action은 **4개, full inventory 177→181 예상**이다. A 시점은 Current 177 / Planned 0을 유지한다.
3 H0는 full 전용이다. `encodeLayout`은 full/basic에 추가하며 Basic은 기존 Bar만 다룬다.
Basic의 기존 `encodeGroup`/color/offset/scale/legend creation은 해당 확장을 받지만, 현재 미공개인
edit/remove/order/Polar/Area API를 함께 공개하지 않는다. 타입은 entry별 공개 범위와 runtime 일치를 검증한다.
Basic의 encodeLayout 타입은 Bar가 지원하지 않는 center를 제외한다.
새 이름뿐 아니라 기존 option과 관측 가능한 state normalization 변경도 Current/card/schema/LLM docs/MCP에 기록한다.
MCP는 Area/Rose/Radial bar를 실제 완성 facade로 해결하며 radius/area primitive intent와 구분한다.

승인된 상한은 Full **237,000**, Basic **125,000**, SVG **25,000** bytes gzip이다.
Baseline은 **235,923 / 124,897 / 6,418**, 여유는 **1,077 / 103 / 18,582**다. 새 구현의 통과를 보장하는 수치는 아니다.
새 mapper/owner 중복을 피하고 측정하며, 그래도 초과하면 구체적인 tarball/consumer 결과를 갖춘 별도 B를 요청한다.
이 A는 상한 증가·publish·deploy·PR 생성을 포함하지 않는다.

## A 이후 순서와 미완료 범위

1. 승인을 기록하고 4 actions와 변경 계약을 Planned에 등록한다.
2. 비시각 policy/type/oracle 준비와 [V 계획](VALIDATION.md)의 primitive targets를 작성한다.
3. V1 Area/layout, V2 radial/order, V3 midpoint/transition을 독립적으로 제시한다. 해당 V 승인 전에 public visual flow를 구현하지 않는다.
4. 승인 target의 lower owner→facade→consumers→docs를 검증하고 같은 실행의 primitive/public graphics/pixels를 비교한다.
5. X에서 전체 consumer matrix, 누적 regression, strict types, package, docs와 F04/F05/D01/D03/D14/D18의 처분을 확인한다.

이 A에서는 새 primitive image나 새 API 실행 결과를 만들지 않았다. 확인된 baseline과 미래 acceptance를 구분한다.
Area의 불일치 stack 보간, arbitrary baseline callback, negative Rose/weighted-angle area, 독립 stack order,
새 Polar guide create/remove API, interval의 모든 변 배치, F20은 이번 구현 범위에 포함하지 않는다.
