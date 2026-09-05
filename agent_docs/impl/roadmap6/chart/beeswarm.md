# Roadmap 6 — Beeswarm / point packing

**상태: Proposed, 미구현·미승인.** 아래 새 이름과 option 구조는 추천 계약 초안이다.
현행 API가 아니며 그대로 실행 가능한 예제로 주장하지 않는다. Phase 9 A에서 signature를 확정하고
V에서 primitive 목표를 확인한 뒤 public flow를 구현한다.

## 목적과 범위

Quantitative 위치를 유지하면서 category slot 안에서 point 간 충돌을 피하는 결정적 배치를 제공한다.

- 연결 항목: F09, F08, D17.
- 실행 owner: [Phase 9](../phase9/GOAL.md).
- 공통 기준: [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md), [VALIDATION.md](../VALIDATION.md).

## 데이터와 최종 public chain 초안

아래 synthetic rows를 수치 oracle와 최소 visual target의 출발점으로 쓴다.
A에서 실제 public signature를 확정하고, primitive/public 두 프로그램이 같은 manifest의 values와 dimensions를 사용한다.

~~~javascript
// Proposed API design — not a Current executable example.
import { chart } from 'ggaction';

const values = [{ value: 2, category: 'A' }, { value: 2, category: 'A' }, { value: 2.01, category: 'A' }, { value: 3, category: 'A' }];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'data', values });

const swarm = base.createBeeswarmPlot({ x: 'category', y: 'value' });
~~~

Id/data/coordinate의 생략은 공통 current/unique 규칙을 따른다. 같은 종류의 resource가 여러 개면 explicit target을
요구한다. 예제의 base에서 각 const는 독립된 immutable program이며, chart를 한 program에 겹칠 때는
명시적 IDs와 compatible shared scale/guide를 사용한다.

## 주요 설계 결정과 rationale

| 결정 | 권장 계약 | 이유 |
| --- | --- | --- |
| Position | Measure coordinate는 고정하고 categorical/orthogonal displacement만 허용한다. | 원래 데이터 값을 움직이지 않는다. |
| Bounds | Radius뿐 아니라 실제 shape·stroke bounds와 slot padding을 고려한다. | Circle-only 거리 기준을 모든 glyph에 적용하지 않는다. |
| Determinism | Stable row/item identity와 명시적 tie-break를 사용한다. | 랜덤 실행마다 다른 배치를 만들지 않는다. |
| Overflow | Feasible collision-free와 infeasible 결과를 구분한다. Error 또는 structured best-effort mode는 A에서 선택한다. | 겹친 결과를 성공처럼 숨기지 않는다. |
| Lifecycle | Stored policy의 replay와 remove를 제공한다. | Resize마다 displacement가 누적되지 않는다. |

## 중요한 action hierarchy

아래 트리의 기존 이름은 재사용해야 할 owner다. 괄호의 역할 문장은 helper/public API 이름을 확정한 것이 아니다.
새 domain action이 필요하면 meaningful wrapped child로 만들고 실제 top-level trace와 대조한다.

~~~text
createBeeswarmPlot
├─ createStripPlot (base semantic positions)
├─ packPoints (proposed stored layout owner)
│  ├─ actual glyph bounds + category slot constraints
│  ├─ deterministic packing grammar
│  └─ editGraphics (concrete displacement)
└─ compatible guides
~~~

Facade가 child의 inference·validation·aggregation·geometry를 복제해서는 안 된다.
완성 chart를 lower public chain으로 풀었을 때 같은 의미와 graphics를 얻어야 한다.

## 저장 결과 계약

**semanticSpec:** Raw measure/group은 유지한다. Layout request와 resolution summary는 layout owner에 저장하고 통계 encoding을 덮어쓰지 않는다.

**graphicSpec:** Base point에서 계산한 concrete displacement만 반영한다. Renderer는 packing을 수행하지 않는다.

**Config/context/trace:** Persistent style·layout policy는 해당 config owner에, 분석 의미와 resource relation은
semantic owner에 둔다. Context는 다음 호출의 convenience만 저장하며 새 canonical state로 사용하지 않는다.
Trace에는 실제 child 호출을 보존하되 큰 derived values 배열을 반복 복제하지 않는다.
새 schema의 정확한 경로는 A Gate에서 architecture와 함께 결정한다.

## 아래층 편집과 lifecycle

point radius/shape/stroke, scale/Canvas/source/filter 변경이 packing replay를 호출한다. remove packing은 현재 semantic base position을 복원한다. Child point/guide style은 독립 편집 가능하다.

모든 지원 edit는 source/scale/Canvas/filter/selection/label/guide 소비자 중 실제 영향을 받는 대상을 먼저 검증한다.
Rematerialization은 scale→mark→guide→layout→highlight 순서의 기존 planner를 사용한다.
Unsupported consumer가 있으면 부분 변경 없이 거부하며 이전 program·trace·caller values를 보존한다.

## Primitive와 visual variant

- 많은 동일 값, varying glyph size, multiple categories.
- 좁은 Canvas에서 infeasible case, overflow mode별 결과.
- Packing→resize→radius edit→replay→remove.
- Stable order를 고정한 동일 입력 반복과 equivalent clone.

각 variant의 primitive source와 target public chain을 함께 검토한다. 새 API가 없을 때 primitive는 기존 domain
owner와 세 public primitive로 구체화하며 renderer 내부에 의미를 넣지 않는다. V 승인 뒤 public program을 작성하고
같은 실행의 decoded PNG pixels·graphic structure·Canvas calls를 비교한다.
Canvas/SVG/PNG/PDF consumer coverage에서 해당 chart에 적용되지 않는 기능은 이유와 함께 N/A로 기록한다.

## 수치·계층 검증

독립 glyph-bound intersection 검사로 feasible case overlap0를 증명한다. Measure 위치와 category bounds 유지, deterministic 결과와 rollback을 확인한다.

- Shortest valid call의 completion과 필요한 channel/coordinate 확인.
- H0와 명시적 H1/H2 chain의 의미·graphic 동등성, trace owner 재사용.
- Compatible authoring 순서의 수렴, 반복 assignment의 idempotence.
- 생성→semantic edit→style edit→Canvas/data/scale rematerialization→remove/recreate 경로.
- Positive/negative strict TypeScript와 runtime 오류 matrix.
- Contract/card/docs/MCP의 supported·unresolved 범위 동기화.

## 범위 밖과 완료 조건

Global force simulation, 임의 2D graph layout, 무한 iteration과 silent scale expansion은 포함하지 않는다.

해당 phase의 승인 범위에서 위 source·API·수치·편집·render·types·docs evidence가 충족돼야 chart cycle을 닫는다.
차트명이 존재하거나 그림 하나가 생성됐다는 사실만으로 완료하지 않는다.
