# Roadmap 6 — ECDF data / plot

**상태: Implemented, Phase 8 W3 검증 중.** `createECDFData`, `createECDFPlot`, `editECDFPlot`과
Line final-series label source를 구현했다. Current의 정확한 공개 계약은
[`STATISTICS.md`](../../../contract/current/STATISTICS.md)와
[`COMPLETE_CHARTS.md`](../../../contract/current/COMPLETE_CHARTS.md)가 소유한다.

## 목적과 범위

관측값 이하의 누적 비율을 step 함수로 표현한다. 누적 합계와 달리 sorting, ties와 denominator가 핵심 통계 계약이다.

- 연결 항목: F13, F15, D12.
- 실행 owner: [Phase 8](../phase8/GOAL.md).
- 공통 기준: [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md), [VALIDATION.md](../VALIDATION.md).

## 데이터와 최종 public chain

아래 shortest flow와 data-only flow가 현행 public API다. Grouped weighted canonical variant는
`examples/ecdf-plot`과 `test/charts/ecdf-plot`에서 같은 values와 dimensions를 사용한다.

~~~javascript
import { chart } from 'ggaction';

const values = [{ value: 1 }, { value: 1 }, { value: 2 }, { value: 4 }];
const base = chart()
  .createCanvas({ width: 520, height: 340, margin: 55 })
  .createData({ id: 'data', values });

const ecdf = base.createECDFPlot({ field: 'value' });
const dataOnly = base.createECDFData({ id: 'ecdf-values', field: 'value' });
~~~

Id/data/coordinate의 생략은 공통 current/unique 규칙을 따른다. 같은 종류의 resource가 여러 개면 explicit target을
요구한다. 예제의 base에서 각 const는 독립된 immutable program이며, chart를 한 program에 겹칠 때는
명시적 IDs와 compatible shared scale/guide를 사용한다.

## 주요 설계 결정과 rationale

| 결정 | 구현 계약 | 이유 |
| --- | --- | --- |
| Definition | 관측점에서 F(x)=P(X≤x)인 우연속 step이다. | Ties를 arbitrary row order로 다른 높이에 찍지 않는다. |
| Denominator | 유효 sample 수 또는 명시적 non-negative weight 합을 사용한다. 0 denominator는 오류다. | Missing/weight가 share 의미를 바꾼다. |
| Data | Derived output에는 sorted support, cumulative count/weight, probability와 source provenance를 둔다. | 다른 mark와 label이 같은 통계를 재사용한다. |
| Topology | Step path의 before/after/endpoint 정책과 tails를 명시한다. | 일반 linear interpolation은 다른 분포 모양을 만든다. |

## 중요한 action hierarchy

아래 트리는 실제 wrapped child hierarchy다.

~~~text
createECDFPlot
├─ createECDFData
│  ├─ source/missing/weight validation
│  ├─ sort + tie aggregate + denominator
│  └─ createDerivedData + materializeECDFData
├─ createLineMark (step topology)
├─ position encodings
├─ encodeGroup / encodeColor?
├─ createMarkLabels?
└─ scoped guides?
~~~

Facade가 child의 inference·validation·aggregation·geometry를 복제해서는 안 된다.
완성 chart를 lower public chain으로 풀었을 때 같은 의미와 graphics를 얻어야 한다.

## 저장 결과 계약

**semanticSpec:** Derived transform에 source field/group/weight/missing policy, output fields와 resolved group
denominator/valid count를 저장한다. Line에는 `step-after`, x/y field와 group/color identity를 저장한다.

**graphicSpec:** Probability scale [0,1]과 actual step path를 저장한다. 첫 support보다 왼쪽이나 마지막 support보다
오른쪽으로 임의 tail을 합성하지 않는다.

**Config/context/trace:** Persistent style·layout policy는 해당 config owner에, 분석 의미와 resource relation은
semantic owner에 둔다. Context는 다음 호출의 convenience만 저장하며 새 canonical state로 사용하지 않는다.
Trace에는 실제 child 호출을 보존하되 큰 derived values 배열을 반복 복제하지 않는다.
Facade config에는 stable owner의 source/data/options를 저장한다.

## 아래층 편집과 lifecycle

`editECDFPlot`은 source/field/group/weight/missing/output/color 역할을 원자적으로 재작성하고 같은 owned derived ID를
새 immutable program에서 다시 만든다. Raw filter는 먼저 `filterData`로 만든 뒤 `data` revision으로 연결한다.
Final step item filtering은 `filterMarks`의 별도 시각 수명주기이며 통계 분모를 다시 계산하지 않는다.

모든 지원 edit는 source/scale/Canvas/filter/selection/label/guide 소비자 중 실제 영향을 받는 대상을 먼저 검증한다.
Rematerialization은 scale→mark→guide→layout→highlight 순서의 기존 planner를 사용한다.
Unsupported consumer가 있으면 부분 변경 없이 거부하며 이전 program·trace·caller values를 보존한다.

## Primitive와 visual variant

- [1,1,2,4]: F(1)=0.5, F(2)=0.75, F(4)=1.
- Grouped sample와 explicit positive weights.
- All equal, missing, all invalid, zero/negative weight.
- Raw filter 뒤 denominator 변화와 final-item filter의 차이.

Grouped weighted variant는 public `createECDFData`와 ordinary `createLineMark`/encoding/label chain으로 primitive를
구체화했다. Facade와 같은 실행의 decoded PNG pixels·graphic structure·Canvas calls를 비교한다.
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
