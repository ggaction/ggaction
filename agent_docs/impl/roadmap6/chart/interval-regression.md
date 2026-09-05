# Roadmap 6 — Interval / Regression complete plots

**상태: Proposed, 미구현·미승인.** 아래 새 이름과 option 구조는 추천 계약 초안이다.
현행 API가 아니며 그대로 실행 가능한 예제로 주장하지 않는다. Phase 8 A에서 signature를 확정하고
V에서 primitive 목표를 확인한 뒤 public flow를 구현한다.

## 목적과 범위

통계 layer를 독립적으로 더하는 기존 경로를 유지하면서 center+interval 또는 scatter+fit/band의 완성 chart를 제공한다.

- 연결 항목: F10, D10, D11, D16.
- 실행 owner: [Phase 8](../phase8/GOAL.md).
- 공통 기준: [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md), [VALIDATION.md](../VALIDATION.md).

## 데이터와 최종 public chain 초안

아래 synthetic rows를 수치 oracle와 최소 visual target의 출발점으로 쓴다.
A에서 실제 public signature를 확정하고, primitive/public 두 프로그램이 같은 manifest의 values와 dimensions를 사용한다.

~~~javascript
// Proposed API design — not a Current executable example.
import { chart } from 'ggaction';

const values = [{ category: 'A', x: 1, value: 1 }, { category: 'A', x: 2, value: 2 }, { category: 'A', x: 3, value: 3 }, { category: 'B', x: 4, value: 5 }];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'data', values });

const interval = base.createIntervalPlot({
  x: 'category', y: 'value', interval: { method: 'student-t', level: 0.95 }
});
const regression = base.createRegressionPlot({ x: 'x', y: 'value', groupBy: false });
~~~

Id/data/coordinate의 생략은 공통 current/unique 규칙을 따른다. 같은 종류의 resource가 여러 개면 explicit target을
요구한다. 예제의 base에서 각 const는 독립된 immutable program이며, chart를 한 program에 겹칠 때는
명시적 IDs와 compatible shared scale/guide를 사용한다.

## 주요 설계 결정과 rationale

| 결정 | 권장 계약 | 이유 |
| --- | --- | --- |
| Grain | Center와 interval은 같은 summary row/key를 사용한다. | Point와 error bar가 서로 다른 group 계산을 하지 않는다. |
| Statistics | Method/level과 explicit group을 저장한다. 기존 계산 default의 migration 규칙을 따른다. | CI와 group 의미를 appearance에서 추론하지 않는다. |
| Layers | Lower error/regression layer는 기존 independent action으로 계속 추가할 수 있다. | Complete facade 때문에 통계 layer 재사용 경로를 잃지 않는다. |
| Role edit | Source/x/y/interval roles는 Phase 6의 domain owner가 바꾼다. | 수동 child 재작성에서 생기는 불일치 방지. |

## 중요한 action hierarchy

아래 트리의 기존 이름은 재사용해야 할 owner다. 괄호의 역할 문장은 helper/public API 이름을 확정한 것이 아니다.
새 domain action이 필요하면 meaningful wrapped child로 만들고 실제 top-level trace와 대조한다.

~~~text
createIntervalPlot
├─ createIntervalData? (shared center/lower/upper)
├─ createPointMark + position encodings
├─ createErrorBar (existing interval owner)
└─ createGuides?

createRegressionPlot
├─ createScatterPlot (compatible guide policy)
├─ createRegression
│  ├─ createRegressionData
│  ├─ createRegressionLine
│  └─ createRegressionBand?
└─ compatible guides
~~~

Facade가 child의 inference·validation·aggregation·geometry를 복제해서는 안 된다.
완성 chart를 lower public chain으로 풀었을 때 같은 의미와 graphics를 얻어야 한다.

## 저장 결과 계약

**semanticSpec:** Source와 shared interval/regression provenance, group keys, method/level, child relations와 scale bindings를 보존한다.

**graphicSpec:** Ordinary point/rule/caps/line/area paths를 저장한다. No new renderer primitive.

**Config/context/trace:** Persistent style·layout policy는 해당 config owner에, 분석 의미와 resource relation은
semantic owner에 둔다. Context는 다음 호출의 convenience만 저장하며 새 canonical state로 사용하지 않는다.
Trace에는 실제 child 호출을 보존하되 큰 derived values 배열을 반복 복제하지 않는다.
새 schema의 정확한 경로는 A Gate에서 architecture와 함께 결정한다.

## 아래층 편집과 lifecycle

editRegression, interval/role owner, lower line/band/cap style와 axis/legend 편집을 제공한다. Fit을 여러 개 추가할 때 source point와 explicit group/owner를 구분한다.

모든 지원 edit는 source/scale/Canvas/filter/selection/label/guide 소비자 중 실제 영향을 받는 대상을 먼저 검증한다.
Rematerialization은 scale→mark→guide→layout→highlight 순서의 기존 planner를 사용한다.
Unsupported consumer가 있으면 부분 변경 없이 거부하며 이전 program·trace·caller values를 보존한다.

## Primitive와 visual variant

- Vertical/horizontal interval, explicit endpoints와 statistical mode.
- Student-t/normal method, low n/constant/grouped failure boundaries.
- Regression ungrouped/grouped, optional band, duplicate fit target selection.
- Source/role/scale edit 뒤 center·interval·guide 정렬.

각 variant의 primitive source와 target public chain을 함께 검토한다. 새 API가 없을 때 primitive는 기존 domain
owner와 세 public primitive로 구체화하며 renderer 내부에 의미를 넣지 않는다. V 승인 뒤 public program을 작성하고
같은 실행의 decoded PNG pixels·graphic structure·Canvas calls를 비교한다.
Canvas/SVG/PNG/PDF consumer coverage에서 해당 chart에 적용되지 않는 기능은 이유와 함께 N/A로 기록한다.

## 수치·계층 검증

통계 method별 독립 수치 기준, center within valid interval, endpoint mapping과 confidence vocabulary round trip을 검사한다.

- Shortest valid call의 completion과 필요한 channel/coordinate 확인.
- H0와 명시적 H1/H2 chain의 의미·graphic 동등성, trace owner 재사용.
- Compatible authoring 순서의 수렴, 반복 assignment의 idempotence.
- 생성→semantic edit→style edit→Canvas/data/scale rematerialization→remove/recreate 경로.
- Positive/negative strict TypeScript와 runtime 오류 matrix.
- Contract/card/docs/MCP의 supported·unresolved 범위 동기화.

## 범위 밖과 완료 조건

새 regression model family, implicit point-owner 해제, bootstrap/random interval은 별도 통계 설계다.

해당 phase의 승인 범위에서 위 source·API·수치·편집·render·types·docs evidence가 충족돼야 chart cycle을 닫는다.
차트명이 존재하거나 그림 하나가 생성됐다는 사실만으로 완료하지 않는다.
