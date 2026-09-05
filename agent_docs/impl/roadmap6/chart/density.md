# Roadmap 6 — Density

**상태: Proposed, 미구현·미승인.** 아래 새 이름과 option 구조는 추천 계약 초안이다.
현행 API가 아니며 그대로 실행 가능한 예제로 주장하지 않는다. Phase 3 A에서 signature를 확정하고
V에서 primitive 목표를 확인한 뒤 public flow를 구현한다.

## 목적과 범위

한 quantitative variable의 KDE를 area로 표현하는 완성 chart다. 기존 encodeDensity의 baseline placement와 통계 옵션을 재사용한다.

- 연결 항목: F06, D02, D04.
- 실행 owner: [Phase 3](../phase3/GOAL.md).
- 공통 기준: [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md), [VALIDATION.md](../VALIDATION.md).

## 데이터와 최종 public chain 초안

아래 synthetic rows를 수치 oracle와 최소 visual target의 출발점으로 쓴다.
A에서 실제 public signature를 확정하고, primitive/public 두 프로그램이 같은 manifest의 values와 dimensions를 사용한다.

~~~javascript
// Proposed API design — not a Current executable example.
import { chart } from 'ggaction';

const values = [{ value: 1, group: 'A' }, { value: 2, group: 'A' }, { value: 4, group: 'A' }, { value: 3, group: 'B' }, { value: 5, group: 'B' }];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'data', values });

const density = base.createDensityPlot({ field: 'value' });
const grouped = base.createDensityPlot({
  field: 'value', groupBy: 'group', densityChannel: 'y'
});
~~~

Id/data/coordinate의 생략은 공통 current/unique 규칙을 따른다. 같은 종류의 resource가 여러 개면 explicit target을
요구한다. 예제의 base에서 각 const는 독립된 immutable program이며, chart를 한 program에 겹칠 때는
명시적 IDs와 compatible shared scale/guide를 사용한다.

## 주요 설계 결정과 rationale

| 결정 | 권장 계약 | 이유 |
| --- | --- | --- |
| Owner | KDE bandwidth/grid/extent는 encodeDensity와 derived owner에 위임한다. | 수학을 facade에 복제하지 않는다. |
| Orientation | densityChannel과 value axis를 동일 lower vocabulary로 표현한다. | Horizontal/vertical API를 이중 설계하지 않는다. |
| Group | Explicit group을 identity로, appearance field는 series grain에서 검증한다. | Group과 color를 별개로 바꿀 수 있다. |
| Default | 현행 KDE default를 보존하고 입력 범위·단위·결과를 문서화한다. | 새 이름 추가와 통계 변화는 다른 결정이다. |

## 중요한 action hierarchy

아래 트리의 기존 이름은 재사용해야 할 owner다. 괄호의 역할 문장은 helper/public API 이름을 확정한 것이 아니다.
새 domain action이 필요하면 meaningful wrapped child로 만들고 실제 top-level trace와 대조한다.

~~~text
createDensityPlot
├─ createAreaMark
├─ encodeDensity
│  ├─ createDensityData → materializeDensityData
│  ├─ source binding + encodeX / encodeY
│  └─ rematerializeAreaMark
├─ encodeColor? / encodeGroup?
└─ createGuides?
~~~

Facade가 child의 inference·validation·aggregation·geometry를 복제해서는 안 된다.
완성 chart를 lower public chain으로 풀었을 때 같은 의미와 graphics를 얻어야 한다.

## 저장 결과 계약

**semanticSpec:** Source→density derived snapshot provenance, field/group/kernel parameters, densityChannel과 area baseline을 보존한다.

**graphicSpec:** Concrete closed area paths와 value/density axes를 저장한다. Renderer는 KDE를 계산하지 않는다.

**Config/context/trace:** Persistent style·layout policy는 해당 config owner에, 분석 의미와 resource relation은
semantic owner에 둔다. Context는 다음 호출의 convenience만 저장하며 새 canonical state로 사용하지 않는다.
Trace에는 실제 child 호출을 보존하되 큰 derived values 배열을 반복 복제하지 않는다.
새 schema의 정확한 경로는 A Gate에서 architecture와 함께 결정한다.

## 아래층 편집과 lifecycle

editDensity의 statistics revision, editAreaMark의 fill/opacity/outline, encodeColor, editScale, guide component 편집을 제공한다. Density 방향 role edit를 추가하면 Phase 6의 owner 규칙에 맞춘다.

모든 지원 edit는 source/scale/Canvas/filter/selection/label/guide 소비자 중 실제 영향을 받는 대상을 먼저 검증한다.
Rematerialization은 scale→mark→guide→layout→highlight 순서의 기존 planner를 사용한다.
Unsupported consumer가 있으면 부분 변경 없이 거부하며 이전 program·trace·caller values를 보존한다.

## Primitive와 visual variant

- 단일 density와 grouped density.
- 세로/가로, bandwidth 변경 전후, constant sample와 invalid input.
- Color가 group field와 다른 series-constant field.
- Canvas·shared scale edit와 primitive/public 동등성.

각 variant의 primitive source와 target public chain을 함께 검토한다. 새 API가 없을 때 primitive는 기존 domain
owner와 세 public primitive로 구체화하며 renderer 내부에 의미를 넣지 않는다. V 승인 뒤 public program을 작성하고
같은 실행의 decoded PNG pixels·graphic structure·Canvas calls를 비교한다.
Canvas/SVG/PNG/PDF consumer coverage에서 해당 chart에 적용되지 않는 기능은 이유와 함께 N/A로 기록한다.

## 수치·계층 검증

기존 encodeDensity의 같은 parameter와 derived values가 일치한다. Sampled integral을 근거 없이 정확히 1이라고 단정하지 않고 기존 수치 oracle·sampling 계약을 사용한다.

- Shortest valid call의 completion과 필요한 channel/coordinate 확인.
- H0와 명시적 H1/H2 chain의 의미·graphic 동등성, trace owner 재사용.
- Compatible authoring 순서의 수렴, 반복 assignment의 idempotence.
- 생성→semantic edit→style edit→Canvas/data/scale rematerialization→remove/recreate 경로.
- Positive/negative strict TypeScript와 runtime 오류 matrix.
- Contract/card/docs/MCP의 supported·unresolved 범위 동기화.

## 범위 밖과 완료 조건

Violin category placement와 Raincloud composite는 각각 별도 chart contract다. Facade가 모든 density mode를 자동 추론하지 않는다.

해당 phase의 승인 범위에서 위 source·API·수치·편집·render·types·docs evidence가 충족돼야 chart cycle을 닫는다.
차트명이 존재하거나 그림 하나가 생성됐다는 사실만으로 완료하지 않는다.
