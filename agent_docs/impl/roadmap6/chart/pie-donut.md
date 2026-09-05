# Roadmap 6 — Pie / Donut

**상태: Proposed, 미구현·미승인.** 아래 새 이름과 option 구조는 추천 계약 초안이다.
현행 API가 아니며 그대로 실행 가능한 예제로 주장하지 않는다. Phase 3 A에서 signature를 확정하고
V에서 primitive 목표를 확인한 뒤 public flow를 구현한다.

## 목적과 범위

Category별 count 또는 명시적인 weighted aggregate의 부분-전체 관계를 보여준다. Donut은 같은 partition을 inner radius가 있는 arc로 표현한다.

- 연결 항목: F01, D05, D13, D14.
- 실행 owner: [Phase 3](../phase3/GOAL.md).
- 공통 기준: [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md), [VALIDATION.md](../VALIDATION.md).

## 데이터와 최종 public chain 초안

아래 synthetic rows를 수치 oracle와 최소 visual target의 출발점으로 쓴다.
A에서 실제 public signature를 확정하고, primitive/public 두 프로그램이 같은 manifest의 values와 dimensions를 사용한다.

~~~javascript
// Proposed API design — not a Current executable example.
import { chart } from 'ggaction';

const values = [{ category: 'A', value: 2 }, { category: 'A', value: 3 }, { category: 'B', value: 5 }];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'data', values });

const counts = base.createPiePlot({ category: 'category' });
const weights = base.createPiePlot({
  category: 'category', value: 'value', aggregate: 'sum',
  arc: { innerRadius: 0.55 }
});
~~~

Id/data/coordinate의 생략은 공통 current/unique 규칙을 따른다. 같은 종류의 resource가 여러 개면 explicit target을
요구한다. 예제의 base에서 각 const는 독립된 immutable program이며, chart를 한 program에 겹칠 때는
명시적 IDs와 compatible shared scale/guide를 사용한다.

## 주요 설계 결정과 rationale

| 결정 | 권장 계약 | 이유 |
| --- | --- | --- |
| Grain | Value 생략은 category별 row count. Value 지정 시 aggregate를 명시한다. Raw row slice는 기존 lower theta 경로에 남긴다. | 중복 category와 분모를 숨기지 않는다. |
| Geometry | Pie innerRadius=0. Donut은 기존 Arc band-ratio 단위를 쓴다. 별도 createDonutPlot 이름은 optional alias 결정이다. | 새 mark/renderer를 만들 이유가 없다. |
| Data | Non-negative finite weight, 0과 missing 처리, all-zero 오류를 기존 partition strictness에 맞춰 명시한다. | Undefined denominator를 임의 equal-slice로 바꾸지 않는다. |
| Guide/order | Axes/grid off, categorical color가 있으면 legend. Stable first appearance, explicit theta order는 Phase 4 후속. | Geometry가 Polar라는 이유로 측정 축을 만들지 않는다. |
| Labels | 기본 off. Category/aggregate/percent는 final slice에서 읽는다. Initial facade 완료는 labels를 기다리지 않는다. | Final denominator와 raw rows를 혼동하지 않는다. |

## 중요한 action hierarchy

아래 트리의 기존 이름은 재사용해야 할 owner다. 괄호의 역할 문장은 helper/public API 이름을 확정한 것이 아니다.
새 domain action이 필요하면 meaningful wrapped child로 만들고 실제 top-level trace와 대조한다.

~~~text
createPiePlot
├─ resolve category/value/aggregation roles
├─ createArcMark
├─ encodeTheta (count or explicit weighted aggregate)
├─ encodeColor? (category)
├─ createGuides? (legend only by default)
└─ createMarkLabels? (Phase 5 opt-in)
   ├─ createTextMark + encodeText
   └─ layoutLabels?
~~~

Facade가 child의 inference·validation·aggregation·geometry를 복제해서는 안 된다.
완성 chart를 lower public chain으로 풀었을 때 같은 의미와 graphics를 얻어야 한다.

## 저장 결과 계약

**semanticSpec:** Source dataset, category, aggregate mode, final slice key/value/share, theta partition·color·scale·coordinate relation을 기존 owner의 의미로 보존한다. 값이 없는 category count도 count라는 결정을 숨기지 않는다.

**graphicSpec:** Ordinary arc collection의 start/end angle, inner/outer radius, fill을 concrete 값으로 저장한다. Axes/spokes가 자동 생성되지 않으며 legend·text는 일반 graphic이다.

**Config/context/trace:** Persistent style·layout policy는 해당 config owner에, 분석 의미와 resource relation은
semantic owner에 둔다. Context는 다음 호출의 convenience만 저장하며 새 canonical state로 사용하지 않는다.
Trace에는 실제 child 호출을 보존하되 큰 derived values 배열을 반복 복제하지 않는다.
새 schema의 정확한 경로는 A Gate에서 architecture와 함께 결정한다.

## 아래층 편집과 lifecycle

editArcMark로 inner radius/padding/appearance, encodeTheta/encodeColor 재할당, editScale·legend editor를 사용한다. Phase 4 theta order, Phase 5 source-linked labels를 조합한다. Partition mode 전환은 전체 consumer preflight를 거친다. Mechanical editPiePlot은 요구하지 않는다.

모든 지원 edit는 source/scale/Canvas/filter/selection/label/guide 소비자 중 실제 영향을 받는 대상을 먼저 검증한다.
Rematerialization은 scale→mark→guide→layout→highlight 순서의 기존 planner를 사용한다.
Unsupported consumer가 있으면 부분 변경 없이 거부하며 이전 program·trace·caller values를 보존한다.

## Primitive와 visual variant

- Count: A=2/B=1; 세 row가 아닌 두 slice.
- Weighted: A=5/B=5, 동일 반원. Explicit zero weight와 negative/all-zero failure.
- Donut: innerRadius 0/0.55와 padding, 1 category, missing category policy.
- 생성→arc edit→theta order→legend edit→label on→resize의 계층 chain.

각 variant의 primitive source와 target public chain을 함께 검토한다. 새 API가 없을 때 primitive는 기존 domain
owner와 세 public primitive로 구체화하며 renderer 내부에 의미를 넣지 않는다. V 승인 뒤 public program을 작성하고
같은 실행의 decoded PNG pixels·graphic structure·Canvas calls를 비교한다.
Canvas/SVG/PNG/PDF consumer coverage에서 해당 chart에 적용되지 않는 기능은 이유와 함께 N/A로 기록한다.

## 수치·계층 검증

각도 합은 유효한 양수 slice의 전체 sweep과 일치한다. Weight와 angle 비율을 독립 계산한다. Inner radius 편집은 share를 바꾸지 않는다.

- Shortest valid call의 completion과 필요한 channel/coordinate 확인.
- H0와 명시적 H1/H2 chain의 의미·graphic 동등성, trace owner 재사용.
- Compatible authoring 순서의 수렴, 반복 assignment의 idempotence.
- 생성→semantic edit→style edit→Canvas/data/scale rematerialization→remove/recreate 경로.
- Positive/negative strict TypeScript와 runtime 오류 matrix.
- Contract/card/docs/MCP의 supported·unresolved 범위 동기화.

## 범위 밖과 완료 조건

Labels, generic midpoint, all chart layouts를 facade option에 한꺼번에 넣지 않는다. Negative pie, 자동 top-N+Other와 자동 category 합병은 별도 제안이다.

해당 phase의 승인 범위에서 위 source·API·수치·편집·render·types·docs evidence가 충족돼야 chart cycle을 닫는다.
차트명이 존재하거나 그림 하나가 생성됐다는 사실만으로 완료하지 않는다.
