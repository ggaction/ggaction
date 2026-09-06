# Roadmap 6 — Raincloud

**상태: Approved contract, implementation pending.** Phase 9 A에서 `createRaincloudPlot`과
`editRaincloudPlot`의 source/statistical role 경계를 확정했다. 현행 API는 아니며 구현·검증 전까지
실행 가능한 예제로 주장하지 않는다. 정확한 signature는 [Phase 9 계약](../phase9/CONTRACT.md)이 소유한다.

## 목적과 범위

Half density, summary interval/box, raw points를 같은 category와 source에서 정렬하는 복합 chart다.

- 연결 항목: F12, F09, F10, F16.
- 실행 owner: [Phase 9](../phase9/GOAL.md).
- 공통 기준: [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md), [VALIDATION.md](../VALIDATION.md).

## 데이터와 최종 public chain 초안

아래 synthetic rows를 수치 oracle와 최소 visual target의 출발점으로 쓴다.
A에서 실제 public signature를 확정하고, primitive/public 두 프로그램이 같은 manifest의 values와 dimensions를 사용한다.

~~~javascript
// Proposed API design — not a Current executable example.
import { chart } from 'ggaction';

const values = [{ category: 'A', value: 1 }, { category: 'A', value: 2 }, { category: 'A', value: 4 }, { category: 'B', value: 2 }, { category: 'B', value: 5 }, { category: 'B', value: 6 }];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'data', values });

const raincloud = base.createRaincloudPlot({
  category: 'category', value: 'value',
  summary: 'box', points: 'beeswarm'
});
~~~

Id/data/coordinate의 생략은 공통 current/unique 규칙을 따른다. 같은 종류의 resource가 여러 개면 explicit target을
요구한다. 예제의 base에서 각 const는 독립된 immutable program이며, chart를 한 program에 겹칠 때는
명시적 IDs와 compatible shared scale/guide를 사용한다.

## 주요 설계 결정과 rationale

| 결정 | 권장 계약 | 이유 |
| --- | --- | --- |
| Source | KDE/summary/raw sample은 같은 canonical source/filter 의미를 사용한다. | 다른 모집단의 도형을 한 chart로 제시하지 않는다. |
| Slot | Cloud/summary/rain의 offsets와 widths를 category-band-relative recipe로 소유한다. | 우연한 mark 나열과 겹침을 방지한다. |
| Children | Ordinary child identities와 역할을 유지하고 independent style edits를 제공한다. | 상위 composite 안에 하위 액션이 숨지 않게 한다. |
| Statistics | Density와 box/interval parameter를 각각 existing owner에 위임한다. | 하나의 summary option으로 KDE 의미를 바꾸지 않는다. |
| Filter | Parent source filter와 individual child display filter를 구분한다. | Raw points 필터만으로 통계까지 임의 재계산하지 않는다. |

## 중요한 action hierarchy

아래 트리의 기존 이름은 재사용해야 할 owner다. 괄호의 역할 문장은 helper/public API 이름을 확정한 것이 아니다.
새 domain action이 필요하면 meaningful wrapped child로 만들고 실제 top-level trace와 대조한다.

~~~text
createRaincloudPlot
├─ canonical source/group/category slot recipe
├─ createViolinPlot (half density)
├─ createBoxPlot or createIntervalPlot (summary)
├─ createStripPlot or createBeeswarmPlot (raw points)
├─ shared scale + child slot assignment
└─ compatible guides + optional labels
~~~

Facade가 child의 inference·validation·aggregation·geometry를 복제해서는 안 된다.
완성 chart를 lower public chain으로 풀었을 때 같은 의미와 graphics를 얻어야 한다.

## 저장 결과 계약

**semanticSpec:** Canonical source/group/category/value, child role relations, statistics provenance, shared scale와 slot recipe를 저장한다.

**graphicSpec:** Area/box/rule/point의 concrete collections를 defined slot에 배치하고 shared guides를 만든다.

**Config/context/trace:** Persistent style·layout policy는 해당 config owner에, 분석 의미와 resource relation은
semantic owner에 둔다. Context는 다음 호출의 convenience만 저장하며 새 canonical state로 사용하지 않는다.
Trace에는 실제 child 호출을 보존하되 큰 derived values 배열을 반복 복제하지 않는다.
새 schema의 정확한 경로는 A Gate에서 architecture와 함께 결정한다.

## 아래층 편집과 lifecycle

Composite role editor는 source/category/value/orientation과 child bindings를 원자적으로 변경한다. editDensity·summary owner·point packing과 각 child appearance를 독립적으로 수정한다.

모든 지원 edit는 source/scale/Canvas/filter/selection/label/guide 소비자 중 실제 영향을 받는 대상을 먼저 검증한다.
Rematerialization은 scale→mark→guide→layout→highlight 순서의 기존 planner를 사용한다.
Unsupported consumer가 있으면 부분 변경 없이 거부하며 이전 program·trace·caller values를 보존한다.

## Primitive와 visual variant

- Vertical/horizontal, single/multi-category.
- Box/interval summary, strip/beeswarm points, split half policy.
- Shared source filter 후 KDE·summary·point sample 일치.
- Parent role edit와 child style override, narrow-slot overflow.

각 variant의 primitive source와 target public chain을 함께 검토한다. 새 API가 없을 때 primitive는 기존 domain
owner와 세 public primitive로 구체화하며 renderer 내부에 의미를 넣지 않는다. V 승인 뒤 public program을 작성하고
같은 실행의 decoded PNG pixels·graphic structure·Canvas calls를 비교한다.
Canvas/SVG/PNG/PDF consumer coverage에서 해당 chart에 적용되지 않는 기능은 이유와 함께 N/A로 기록한다.

## 수치·계층 검증

모든 child의 source membership/provenance가 선언한 policy와 일치하고 slot geometry가 정의한 bounds를 지킨다. Summary 수치와 packing은 각 독립 oracle를 재사용한다.

- Shortest valid call의 completion과 필요한 channel/coordinate 확인.
- H0와 명시적 H1/H2 chain의 의미·graphic 동등성, trace owner 재사용.
- Compatible authoring 순서의 수렴, 반복 assignment의 idempotence.
- 생성→semantic edit→style edit→Canvas/data/scale rematerialization→remove/recreate 경로.
- Positive/negative strict TypeScript와 runtime 오류 matrix.
- Contract/card/docs/MCP의 supported·unresolved 범위 동기화.

## 범위 밖과 완료 조건

임의 child graph 편집, automatic outlier 제거와 implicit population normalization은 별도 제안이다.

해당 phase의 승인 범위에서 위 source·API·수치·편집·render·types·docs evidence가 충족돼야 chart cycle을 닫는다.
차트명이 존재하거나 그림 하나가 생성됐다는 사실만으로 완료하지 않는다.
