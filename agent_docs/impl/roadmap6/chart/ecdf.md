# Roadmap 6 — ECDF data / plot

**상태: Proposed, 미구현·미승인.** 아래 새 이름과 option 구조는 추천 계약 초안이다.
현행 API가 아니며 그대로 실행 가능한 예제로 주장하지 않는다. Phase 8 A에서 signature를 확정하고
V에서 primitive 목표를 확인한 뒤 public flow를 구현한다.

## 목적과 범위

관측값 이하의 누적 비율을 step 함수로 표현한다. 누적 합계와 달리 sorting, ties와 denominator가 핵심 통계 계약이다.

- 연결 항목: F13, F15, D12.
- 실행 owner: [Phase 8](../phase8/GOAL.md).
- 공통 기준: [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md), [VALIDATION.md](../VALIDATION.md).

## 데이터와 최종 public chain 초안

아래 synthetic rows를 수치 oracle와 최소 visual target의 출발점으로 쓴다.
A에서 실제 public signature를 확정하고, primitive/public 두 프로그램이 같은 manifest의 values와 dimensions를 사용한다.

~~~javascript
// Proposed API design — not a Current executable example.
import { chart } from 'ggaction';

const values = [{ value: 1 }, { value: 1 }, { value: 2 }, { value: 4 }];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'data', values });

const ecdf = base.createECDFPlot({ field: 'value' });
const dataOnly = base.createECDFData({ id: 'ecdf-values', field: 'value' });
~~~

Id/data/coordinate의 생략은 공통 current/unique 규칙을 따른다. 같은 종류의 resource가 여러 개면 explicit target을
요구한다. 예제의 base에서 각 const는 독립된 immutable program이며, chart를 한 program에 겹칠 때는
명시적 IDs와 compatible shared scale/guide를 사용한다.

## 주요 설계 결정과 rationale

| 결정 | 권장 계약 | 이유 |
| --- | --- | --- |
| Definition | 관측점에서 F(x)=P(X≤x)인 우연속 step을 기본 권고한다. | Ties를 arbitrary row order로 다른 높이에 찍지 않는다. |
| Denominator | 유효 sample 수 또는 명시적 non-negative weight 합을 사용한다. 0 denominator는 오류다. | Missing/weight가 share 의미를 바꾼다. |
| Data | Derived output에는 sorted support, cumulative count/weight, probability와 source provenance를 둔다. | 다른 mark와 label이 같은 통계를 재사용한다. |
| Topology | Step path의 before/after/endpoint 정책과 tails를 명시한다. | 일반 linear interpolation은 다른 분포 모양을 만든다. |

## 중요한 action hierarchy

아래 트리의 기존 이름은 재사용해야 할 owner다. 괄호의 역할 문장은 helper/public API 이름을 확정한 것이 아니다.
새 domain action이 필요하면 meaningful wrapped child로 만들고 실제 top-level trace와 대조한다.

~~~text
createECDFPlot
├─ createECDFData
│  ├─ source/missing/weight validation
│  ├─ sort + tie aggregate + denominator
│  └─ createDerivedData + materializeECDFData
├─ createLineMark (step topology)
├─ position encodings
├─ encodeGroup / encodeColor?
└─ createGuides?
~~~

Facade가 child의 inference·validation·aggregation·geometry를 복제해서는 안 된다.
완성 chart를 lower public chain으로 풀었을 때 같은 의미와 graphics를 얻어야 한다.

## 저장 결과 계약

**semanticSpec:** Source field/group/weight/missing policy, denominator, tie keys, probability와 step topology를 저장한다.

**graphicSpec:** Probability scale [0,1]과 actual step path를 저장한다. Tail geometry는 명시한 extent만 사용한다.

**Config/context/trace:** Persistent style·layout policy는 해당 config owner에, 분석 의미와 resource relation은
semantic owner에 둔다. Context는 다음 호출의 convenience만 저장하며 새 canonical state로 사용하지 않는다.
Trace에는 실제 child 호출을 보존하되 큰 derived values 배열을 반복 복제하지 않는다.
새 schema의 정확한 경로는 A Gate에서 architecture와 함께 결정한다.

## 아래층 편집과 lifecycle

Transform owner revision 또는 새 immutable derived ID, bindMarkData, line style와 scale/guide edits를 이용한다. Filter가 raw samples인지 final steps인지 구분한다.

모든 지원 edit는 source/scale/Canvas/filter/selection/label/guide 소비자 중 실제 영향을 받는 대상을 먼저 검증한다.
Rematerialization은 scale→mark→guide→layout→highlight 순서의 기존 planner를 사용한다.
Unsupported consumer가 있으면 부분 변경 없이 거부하며 이전 program·trace·caller values를 보존한다.

## Primitive와 visual variant

- [1,1,2,4]: F(1)=0.5, F(2)=0.75, F(4)=1.
- Grouped sample와 explicit positive weights.
- All equal, missing, all invalid, zero/negative weight.
- Raw filter 뒤 denominator 변화와 final-item filter의 차이.

각 variant의 primitive source와 target public chain을 함께 검토한다. 새 API가 없을 때 primitive는 기존 domain
owner와 세 public primitive로 구체화하며 renderer 내부에 의미를 넣지 않는다. V 승인 뒤 public program을 작성하고
같은 실행의 decoded PNG pixels·graphic structure·Canvas calls를 비교한다.
Canvas/SVG/PNG/PDF consumer coverage에서 해당 chart에 적용되지 않는 기능은 이유와 함께 N/A로 기록한다.

## 수치·계층 검증

독립 정렬·count로 각 support의 cumulative probability를 계산한다. Monotonicity·[0,1]·최종 1과 step continuity를 검증한다.

- Shortest valid call의 completion과 필요한 channel/coordinate 확인.
- H0와 명시적 H1/H2 chain의 의미·graphic 동등성, trace owner 재사용.
- Compatible authoring 순서의 수렴, 반복 assignment의 idempotence.
- 생성→semantic edit→style edit→Canvas/data/scale rematerialization→remove/recreate 경로.
- Positive/negative strict TypeScript와 runtime 오류 matrix.
- Contract/card/docs/MCP의 supported·unresolved 범위 동기화.

## 범위 밖과 완료 조건

Survival, censoring, Kaplan-Meier, arbitrary weighted uncertainty는 별도 통계 capability다.

해당 phase의 승인 범위에서 위 source·API·수치·편집·render·types·docs evidence가 충족돼야 chart cycle을 닫는다.
차트명이 존재하거나 그림 하나가 생성됐다는 사실만으로 완료하지 않는다.
