# Roadmap 6 — Horizon

**상태: Proposed, 미구현·미승인.** 아래 새 이름과 option 구조는 추천 계약 초안이다.
현행 API가 아니며 그대로 실행 가능한 예제로 주장하지 않는다. Phase 3 A에서 signature를 확정하고
V에서 primitive 목표를 확인한 뒤 public flow를 구현한다.

## 목적과 범위

기준선에 대한 signed amplitude를 band로 접어 작은 높이에서 시계열 변화를 표현한다. Folded y는 원래 값의 y 축과 다르다.

- 연결 항목: F07, D04.
- 실행 owner: [Phase 3](../phase3/GOAL.md).
- 공통 기준: [DESIGN_DECISIONS.md](../DESIGN_DECISIONS.md), [VALIDATION.md](../VALIDATION.md).

## 데이터와 최종 public chain 초안

아래 synthetic rows를 수치 oracle와 최소 visual target의 출발점으로 쓴다.
A에서 실제 public signature를 확정하고, primitive/public 두 프로그램이 같은 manifest의 values와 dimensions를 사용한다.

~~~javascript
// Proposed API design — not a Current executable example.
import { chart } from 'ggaction';

const values = [{ time: 1, value: -3 }, { time: 2, value: 2 }, { time: 3, value: 6 }, { time: 4, value: -1 }];
const base = chart()
  .createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ id: 'data', values });

const horizon = base.createHorizonPlot({ x: 'time', y: 'value' });
~~~

Id/data/coordinate의 생략은 공통 current/unique 규칙을 따른다. 같은 종류의 resource가 여러 개면 explicit target을
요구한다. 예제의 base에서 각 const는 독립된 immutable program이며, chart를 한 program에 겹칠 때는
명시적 IDs와 compatible shared scale/guide를 사용한다.

## 주요 설계 결정과 rationale

| 결정 | 권장 계약 | 이유 |
| --- | --- | --- |
| Meaning | Baseline/sign/bands와 folded extent를 기존 Horizon owner에 위임한다. | 같은 모양 뒤의 original amplitude 의미를 유지한다. |
| Guides | Original x만 자동 제공한다. Folded y와 internal sign/band color legend는 자동 생성하지 않는다. | 0..1 folded position을 원본값처럼 읽게 하지 않는다. |
| Group | 명시적 group과 source selection을 사용한다. 통계 parameter shorthand는 lower vocabulary와 일치시킨다. | 다른 series를 우연히 하나의 path로 합치지 않는다. |

## 중요한 action hierarchy

아래 트리의 기존 이름은 재사용해야 할 owner다. 괄호의 역할 문장은 helper/public API 이름을 확정한 것이 아니다.
새 domain action이 필요하면 meaningful wrapped child로 만들고 실제 top-level trace와 대조한다.

~~~text
createHorizonPlot
├─ createAreaMark
├─ encodeHorizon
│  ├─ createHorizonData
│  ├─ rebindLayerData
│  ├─ encodeX / encodeY / encodeY2 / encodeGroup / encodeColor
│  └─ affected materialization plan
└─ createGuides? (original x only)
~~~

Facade가 child의 inference·validation·aggregation·geometry를 복제해서는 안 된다.
완성 chart를 lower public chain으로 풀었을 때 같은 의미와 graphics를 얻어야 한다.

## 저장 결과 계약

**semanticSpec:** Original x/y, baseline, band parameter, sign/group, source/derived revision과 folded scale relation을 저장한다.

**graphicSpec:** Ordinary closed area paths, concrete band colors, optional x guides를 저장한다. Horizon-specific renderer branch를 추가하지 않는다.

**Config/context/trace:** Persistent style·layout policy는 해당 config owner에, 분석 의미와 resource relation은
semantic owner에 둔다. Context는 다음 호출의 convenience만 저장하며 새 canonical state로 사용하지 않는다.
Trace에는 실제 child 호출을 보존하되 큰 derived values 배열을 반복 복제하지 않는다.
새 schema의 정확한 경로는 A Gate에서 architecture와 함께 결정한다.

## 아래층 편집과 lifecycle

editHorizon은 새 data revision과 downstream rematerialization을 소유한다. editAreaMark, x scale/axis edit를 사용하고 internal band key를 사용자에게 target으로 요구하지 않는다.

모든 지원 edit는 source/scale/Canvas/filter/selection/label/guide 소비자 중 실제 영향을 받는 대상을 먼저 검증한다.
Rematerialization은 scale→mark→guide→layout→highlight 순서의 기존 planner를 사용한다.
Unsupported consumer가 있으면 부분 변경 없이 거부하며 이전 program·trace·caller values를 보존한다.

## Primitive와 visual variant

- 양수/음수/양쪽 amplitude, baseline 0/명시값.
- Bands 변경, source revision, shared x overlay.
- x guides on/off, folded y guide 요청의 explicit rejection.
- Resize와 earlier program immutability.

각 variant의 primitive source와 target public chain을 함께 검토한다. 새 API가 없을 때 primitive는 기존 domain
owner와 세 public primitive로 구체화하며 renderer 내부에 의미를 넣지 않는다. V 승인 뒤 public program을 작성하고
같은 실행의 decoded PNG pixels·graphic structure·Canvas calls를 비교한다.
Canvas/SVG/PNG/PDF consumer coverage에서 해당 chart에 적용되지 않는 기능은 이유와 함께 N/A로 기록한다.

## 수치·계층 검증

기존 encodeHorizon의 동일 입력에서 band별 path·sign·folded y 결과가 일치한다. Band 경계 clipping은 기존 grammar oracle를 따른다.

- Shortest valid call의 completion과 필요한 channel/coordinate 확인.
- H0와 명시적 H1/H2 chain의 의미·graphic 동등성, trace owner 재사용.
- Compatible authoring 순서의 수렴, 반복 assignment의 idempotence.
- 생성→semantic edit→style edit→Canvas/data/scale rematerialization→remove/recreate 경로.
- Positive/negative strict TypeScript와 runtime 오류 matrix.
- Contract/card/docs/MCP의 supported·unresolved 범위 동기화.

## 범위 밖과 완료 조건

원본 amplitude 설명을 위한 새로운 전용 guide와 여러 series small multiples는 후속 composition 범위다.

해당 phase의 승인 범위에서 위 source·API·수치·편집·render·types·docs evidence가 충족돼야 chart cycle을 닫는다.
차트명이 존재하거나 그림 하나가 생성됐다는 사실만으로 완료하지 않는다.
