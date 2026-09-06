# Roadmap 6 — Dot / Lollipop / Dumbbell

**상태: Proposed, 미구현·미승인.** 아래 새 이름과 option 구조는 추천 계약 초안이다.
현행 API가 아니며 그대로 실행 가능한 예제로 주장하지 않는다. Phase 8 A에서 signature를 확정하고
V에서 primitive 목표를 확인한 뒤 public flow를 구현한다.

## 목적과 범위

Category별 단일 값·기준선 대비 값·두 endpoint를 ordinary point와 rule의 복합으로 표현한다.

- 연결 항목: F11, F14, F15, F16.
- 실행 owner: [Phase 8](../phase8/GOAL.md).
- 공통 기준: [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md), [VALIDATION.md](../VALIDATION.md).

## 데이터와 최종 public chain 초안

아래 synthetic rows를 수치 oracle와 최소 visual target의 출발점으로 쓴다.
A에서 실제 public signature를 확정하고, primitive/public 두 프로그램이 같은 manifest의 values와 dimensions를 사용한다.

~~~javascript
// Proposed API design — not a Current executable example.
import { chart } from 'ggaction';

const values = [{ category: 'A', value: 4, before: 2, after: 4 }, { category: 'B', value: -1, before: 3, after: -1 }];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'data', values });

const dot = base.createDotPlot({ category: 'category', value: 'value' });
const lollipop = base.createLollipopPlot({ category: 'category', value: 'value', baseline: 0 });
const dumbbell = base.createDumbbellPlot({ category: 'category', start: 'before', end: 'after' });
~~~

Id/data/coordinate의 생략은 공통 current/unique 규칙을 따른다. 같은 종류의 resource가 여러 개면 explicit target을
요구한다. 예제의 base에서 각 const는 독립된 immutable program이며, chart를 한 program에 겹칠 때는
명시적 IDs와 compatible shared scale/guide를 사용한다.

## 주요 설계 결정과 rationale

| 결정 | 권장 계약 | 이유 |
| --- | --- | --- |
| Duplicate categories | Raw endpoint row와 aggregated category mode를 명시적으로 구분한다. | Dot의 mean/sum을 자동 선택하지 않는다. |
| Baseline | Lollipop은 zero 기본을 명시하고 nonzero를 허용하는 계약을 검토한다. | 음수/로그와 기준선 포함 의미를 일치시킨다. |
| Endpoint identity | Start/end role을 값 크기와 분리해 저장한다. | 값이 역전돼도 색·label 역할이 자동 교환되지 않는다. |
| Owner | 연결된 source/category/endpoint roles를 atomic edit로 바꾼다. | Rule와 point의 서로 다른 scale 사용을 방지한다. |

## 중요한 action hierarchy

아래 트리의 기존 이름은 재사용해야 할 owner다. 괄호의 역할 문장은 helper/public API 이름을 확정한 것이 아니다.
새 domain action이 필요하면 meaningful wrapped child로 만들고 실제 top-level trace와 대조한다.

~~~text
createDotPlot / createLollipopPlot / createDumbbellPlot
├─ createSummaryData? (explicit aggregate mode)
├─ category/value or endpoint role assignment
├─ createPointMark (one or two endpoint roles)
├─ createRuleMark? (baseline or connector)
├─ createMarkLabels?
└─ createGuides?
~~~

Facade가 child의 inference·validation·aggregation·geometry를 복제해서는 안 된다.
완성 chart를 lower public chain으로 풀었을 때 같은 의미와 graphics를 얻어야 한다.

## 저장 결과 계약

**semanticSpec:** 최종 row/category key, optional summary provenance, baseline/start/end roles와 child relation을 저장한다.

**graphicSpec:** Concrete endpoint point, connecting rule, optional label과 guides를 저장한다. Rule width와 point radius는 각 lower owner가 관리한다.

**Config/context/trace:** Persistent style·layout policy는 해당 config owner에, 분석 의미와 resource relation은
semantic owner에 둔다. Context는 다음 호출의 convenience만 저장하며 새 canonical state로 사용하지 않는다.
Trace에는 실제 child 호출을 보존하되 큰 derived values 배열을 반복 복제하지 않는다.
새 schema의 정확한 경로는 A Gate에서 architecture와 함께 결정한다.

## 아래층 편집과 lifecycle

Composite role editor가 필요하면 source/category/value/endpoints를 함께 다룬다. Individual point/rule style, order, labels, scale·guide 편집은 아래층에 남긴다.

모든 지원 edit는 source/scale/Canvas/filter/selection/label/guide 소비자 중 실제 영향을 받는 대상을 먼저 검증한다.
Rematerialization은 scale→mark→guide→layout→highlight 순서의 기존 planner를 사용한다.
Unsupported consumer가 있으면 부분 변경 없이 거부하며 이전 program·trace·caller values를 보존한다.

## Primitive와 visual variant

- Horizontal/vertical, raw와 aggregate, signed values.
- Dumbbell start>end, start=end, missing one endpoint.
- Lollipop baseline 0/nonzero와 log incompatibility.
- Role/source edit와 endpoint별 독립 color/label.

각 variant의 primitive source와 target public chain을 함께 검토한다. 새 API가 없을 때 primitive는 기존 domain
owner와 세 public primitive로 구체화하며 renderer 내부에 의미를 넣지 않는다. V 승인 뒤 public program을 작성하고
같은 실행의 decoded PNG pixels·graphic structure·Canvas calls를 비교한다.
Canvas/SVG/PNG/PDF consumer coverage에서 해당 chart에 적용되지 않는 기능은 이유와 함께 N/A로 기록한다.

## 수치·계층 검증

각 point는 해당 endpoint scale mapping과 같고 connector는 정확히 두 endpoint를 잇는다. Category count와 shared grain을 검사한다.

- Shortest valid call의 completion과 필요한 channel/coordinate 확인.
- H0와 명시적 H1/H2 chain의 의미·graphic 동등성, trace owner 재사용.
- Compatible authoring 순서의 수렴, 반복 assignment의 idempotence.
- 생성→semantic edit→style edit→Canvas/data/scale rematerialization→remove/recreate 경로.
- Positive/negative strict TypeScript와 runtime 오류 matrix.
- Contract/card/docs/MCP의 supported·unresolved 범위 동기화.

## 범위 밖과 완료 조건

Waterfall의 cumulative total을 Lollipop baseline 변경으로 위장하지 않는다. 범용 composite registry를 먼저 만들지 않는다.

해당 phase의 승인 범위에서 위 source·API·수치·편집·render·types·docs evidence가 충족돼야 chart cycle을 닫는다.
차트명이 존재하거나 그림 하나가 생성됐다는 사실만으로 완료하지 않는다.
