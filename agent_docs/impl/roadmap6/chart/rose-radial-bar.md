# Roadmap 6 — Rose / Radial bar

**상태: Proposed, 미구현·미승인.** 아래 새 이름과 option 구조는 추천 계약 초안이다.
현행 API가 아니며 그대로 실행 가능한 예제로 주장하지 않는다. Phase 4 A에서 signature를 확정하고
V에서 primitive 목표를 확인한 뒤 public flow를 구현한다.

## 목적과 범위

Equal-angle category sector의 면적으로 값을 나타내는 Rose와 radius 길이로 나타내는 Radial bar를 분리한다.

- 연결 항목: F04, D01, B04.
- 실행 owner: [Phase 4](../phase4/GOAL.md).
- 공통 기준: [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md), [VALIDATION.md](../VALIDATION.md).

## 데이터와 최종 public chain 초안

아래 synthetic rows를 수치 oracle와 최소 visual target의 출발점으로 쓴다.
A에서 실제 public signature를 확정하고, primitive/public 두 프로그램이 같은 manifest의 values와 dimensions를 사용한다.

~~~javascript
// Proposed API design — not a Current executable example.
import { chart } from 'ggaction';

const values = [{ category: 'A', value: 2 }, { category: 'B', value: 3 }, { category: 'C', value: 4 }];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'data', values });

const rose = base.createRosePlot({ category: 'category', value: 'value', aggregate: 'sum' });
const radial = base.createRadialBarPlot({ category: 'category', value: 'value', aggregate: 'sum' });
~~~

Id/data/coordinate의 생략은 공통 current/unique 규칙을 따른다. 같은 종류의 resource가 여러 개면 explicit target을
요구한다. 예제의 base에서 각 const는 독립된 immutable program이며, chart를 한 program에 겹칠 때는
명시적 IDs와 compatible shared scale/guide를 사용한다.

## 주요 설계 결정과 rationale

| 결정 | 권장 계약 | 이유 |
| --- | --- | --- |
| Rose | Equal-angle, non-negative aggregate에 area-proportional mapping을 적용한다. | Linear radius는 area를 제곱으로 과장한다. |
| Radial bar | Zero baseline과 radius-length 의미를 사용한다. | 최소 양수 category가 radius 0으로 사라지는 것을 막는다. |
| Inner radius | Area 모드 r=sqrt(r0²+t(R²-r0²)); radius-length는 별도 linear radial length mapping. | Donut hole이 있어도 측정 의미가 유지된다. |
| Guides | 실제 값 단위의 radius guide와 category theta guide를 선택한다. Label은 mapping 결과가 아니라 데이터 의미를 설명한다. | Radius geometry와 value scale 해석을 일치시킨다. |
| Compatibility | 일반 encodeR와 Polar scatter의 기본 mapping은 유지한다. | 차트별 size semantics를 모든 radius channel에 강제하지 않는다. |

## 중요한 action hierarchy

아래 트리의 기존 이름은 재사용해야 할 owner다. 괄호의 역할 문장은 helper/public API 이름을 확정한 것이 아니다.
새 domain action이 필요하면 meaningful wrapped child로 만들고 실제 top-level trace와 대조한다.

~~~text
createRosePlot / createRadialBarPlot
├─ createArcMark
├─ encodeTheta (categorical equal-angle)
├─ radius mapping assignment (area or radius-length)
│  ├─ zero baseline + category aggregate
│  └─ existing radius scale / arc materialization owner
├─ encodeColor?
└─ createGuides? (meaning-appropriate Polar guides)
~~~

Facade가 child의 inference·validation·aggregation·geometry를 복제해서는 안 된다.
완성 chart를 lower public chain으로 풀었을 때 같은 의미와 graphics를 얻어야 한다.

## 저장 결과 계약

**semanticSpec:** Category aggregation, equal-angle policy, zero baseline, area/radius-length mode, source/value unit을 명시한다. 새 semantic field의 정확한 schema는 Phase 4 A에서 확정한다.

**graphicSpec:** Concrete arc sector 3개와 mapping에 맞는 radii를 저장한다. 다른 Cartesian Bar layer가 추가되지 않는다.

**Config/context/trace:** Persistent style·layout policy는 해당 config owner에, 분석 의미와 resource relation은
semantic owner에 둔다. Context는 다음 호출의 convenience만 저장하며 새 canonical state로 사용하지 않는다.
Trace에는 실제 child 호출을 보존하되 큰 derived values 배열을 반복 복제하지 않는다.
새 schema의 정확한 경로는 A Gate에서 architecture와 함께 결정한다.

## 아래층 편집과 lifecycle

Arc inner radius/style, theta order, value/aggregate·radius domain과 guides를 lower owner로 수정한다. Area mode에서 inner radius edit는 해당 의미에 맞게 radii 전체를 재계산한다.

모든 지원 edit는 source/scale/Canvas/filter/selection/label/guide 소비자 중 실제 영향을 받는 대상을 먼저 검증한다.
Rematerialization은 scale→mark→guide→layout→highlight 순서의 기존 planner를 사용한다.
Unsupported consumer가 있으면 부분 변경 없이 거부하며 이전 program·trace·caller values를 보존한다.

## Primitive와 visual variant

- 2/3/4의 3개 sector, zero와 all-zero/negative failure.
- Hole 0/0.5, 비대칭 값, Rose와 Radial의 비교.
- Explicit domain과 value-labelled radius guide.
- MCP radial-bar 의도가 한 Polar chart만 생성.

각 variant의 primitive source와 target public chain을 함께 검토한다. 새 API가 없을 때 primitive는 기존 domain
owner와 세 public primitive로 구체화하며 renderer 내부에 의미를 넣지 않는다. V 승인 뒤 public program을 작성하고
같은 실행의 decoded PNG pixels·graphic structure·Canvas calls를 비교한다.
Canvas/SVG/PNG/PDF consumer coverage에서 해당 chart에 적용되지 않는 기능은 이유와 함께 N/A로 기록한다.

## 수치·계층 검증

Rose sector area θ(r²-r0²)/2의 비율이 aggregate 비율과 일치한다. Radial은 r-r0 길이 비율로 검증한다. 두 oracle를 혼용하지 않는다.

- Shortest valid call의 completion과 필요한 channel/coordinate 확인.
- H0와 명시적 H1/H2 chain의 의미·graphic 동등성, trace owner 재사용.
- Compatible authoring 순서의 수렴, 반복 assignment의 idempotence.
- 생성→semantic edit→style edit→Canvas/data/scale rematerialization→remove/recreate 경로.
- Positive/negative strict TypeScript와 runtime 오류 matrix.
- Contract/card/docs/MCP의 supported·unresolved 범위 동기화.

## 범위 밖과 완료 조건

Unequal-angle weighted Rose, signed Rose, 자동 임의 normalization은 별도 제안이다.

해당 phase의 승인 범위에서 위 source·API·수치·편집·render·types·docs evidence가 충족돼야 chart cycle을 닫는다.
차트명이 존재하거나 그림 하나가 생성됐다는 사실만으로 완료하지 않는다.
