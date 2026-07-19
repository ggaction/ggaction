# Roadmap 4 — Native Ownership and Advanced Static Charts

## 목표

Roadmap 4는 `ggaction@0.0.4` 외부 평가에서 확인된 기능 제안 13개, runtime bug 3개,
docs bug 1개를 현재 `ChartProgram` 아키텍처 안으로 회수한다. 단순히 PNG가 생성되는 것을
완료로 보지 않는다. 요청한 의미, source→derived→graphic 관계, 재편집 정책과 오류가
immutable state와 trace에 남고 Browser Canvas와 Node PNG가 같은 concrete `graphicSpec`을
소비해야 한다.

외부 평가의 Wave 0~6은 의존 관계를 설명하는 논리 그룹으로 보존한다. 실제 실행 Phase는
한 번에 하나의 큰 상태 소유권만 다루도록 Phase 0~15로 더 잘게 나눈다. 외부 평가 범위에
더해 기존 `createBoxPlot`과 대칭적인 Basic Chart API를 명시적 제품 범위로 포함한다.

## 최상위 실행 원칙

- 평가 workspace `/Users/hj/Desktop/ggaction_test/proposal-runs/0.0.4/`는 read-only 증거다.
- `NCP-006` Parallel Sets와 `NCP-007` UpSet/set-intersection은 구현, 문서, issue 후보에서 제외한다.
- Parallel Coordinates의 공개 encoding action 이름은 `encodeParallelCoordinates`로 고정한다.
- 한 시점에는 하나의 Phase만 `in-progress`일 수 있다.
- 각 기능은 runtime action, public declaration, state/trace, materialization, Browser Canvas,
  Node PNG와 회귀 테스트가 연결된 vertical slice로 닫는다.
- Public behavior가 바뀌는 Phase는 같은 Phase에서 README, docs, generated references와 examples를
  현재 구현에 맞게 갱신하고 검증한다. GitHub Pages 배포와 package publishing만 Phase 15 또는 별도
  release preparation에서 수행한다.
- 검증된 작은 conceptual change와 각 Gate package는 다음 작업 전에 commit하고 current branch에 push한다.
  Gate 문서에는 검토 대상 remote commit을 기록한다. PR 생성, npm 배포와 GitHub Pages 배포는 별도
  요청 없이는 수행하지 않는다.
- 외부 proposal의 API 모양은 근거이지 정답이 아니다. 현재 selector, policy registry,
  transform registry, materialization plan과 composition owner를 우선 재사용한다.
- 과도한 wrapper나 chart-name API를 만들지 않는다. 현재 requirement를 만족하는 가장 작은
  reusable semantic capability를 구현한다.

## Basic Chart API 원칙

Basic Chart API는 처음 사용하는 사람이 mark, coordinate와 encoding을 하나씩 조립하지 않아도
완성된 기본 차트를 만들 수 있게 하는 chart-authoring facade다. 이는 `semanticSpec`을 입력받아
자동 compile하는 새 계층이 아니다. 각 facade는 현재의 wrapped domain action을 실제 child로
호출하고 그 hierarchy를 trace에 보존한다.

첫 범위는 다음과 같다.

```text
createScatterPlot({ x, y, color?, size?, shape?, ... })
createLinePlot({ x, y, color?, groupBy?, strokeDash?, ... })
createBarPlot({ x, y, aggregate?, color?, layout?, ... })
createHistogram({ field, color?, bins?, ... })
createHeatmap({ x, y, color?, bin?, ... })
createGradientIntervalPlot({ category?, lower, upper, orientation?, gradient?, ... })
createParallelCoordinates({ dimensions, key?, ... })
existing createBoxPlot({ ... })
```

공통 계약은 다음과 같다.

- Canvas와 current data는 선행 authoring state에서 사용한다. 이 facade가 source data를 생성하거나
  Canvas 크기를 몰래 정하지 않는다.
- Data는 current 또는 유일 후보에서만 추론한다. 여러 후보 중 첫 dataset을 선택하지 않는다.
- Resource ID는 stable role default가 유일할 때 생략할 수 있고 충돌하면 explicit ID를 요구한다.
- Cartesian coordinate는 facade가 필요하면 생성하고 저장한다. Parallel coordinate도 해당 facade가
  ordered dimension 정의로 생성한다.
- 최소 필수 field만 요구한다. Scatter/line/bar는 `x`, `y`, histogram은 `field`, pre-gridded
  heatmap은 `x`, `y`, `color`, Parallel Coordinates는 `dimensions`가 최소 의미다.
- Existing action이 이미 소유하는 scale, aggregation, palette, mark appearance와 guide option vocabulary를
  그대로 사용한다. Facade 전용으로 같은 개념의 두 번째 vocabulary를 만들지 않는다.
- Complete chart facade는 기본적으로 applicable guides를 생성하며 `guides: false`로 끌 수 있다.
- Binned heatmap은 `bin`을 명시하면 `createBin2DData`를 호출하고 color 생략 시 count를 사용한다.
- Gradient interval facade는 lower/upper interval을 rect geometry로 만들고 `LinearGradientPaint`를
  item-local fill로 적용한다. `createGradientPlot`처럼 geometry가 불명확한 이름은 사용하지 않는다.
- `createParallelCoordinates`는 coordinate와 line mark를 만들고 내부에서
  `encodeParallelCoordinates`를 호출한다. 두 API는 high-level facade와 advanced encoding으로 구분한다.
- `editScatterPlot` 같은 aggregate edit action은 만들지 않는다. 생성 후에는 encoding, scale, mark,
  guide와 coordinate의 기존 resource-specific action으로 편집한다.
- 같은 최종 차트를 설명하는 facade와 explicit action chain은 semantic/graphic/order/Canvas calls에서
  동등해야 한다.

## 범위 원장

### Runtime bug

| ID | 요약 | 실행 Phase |
| --- | --- | ---: |
| B-002 | 기본 radius 없는 point의 Canvas/PNG 실패 | 1 |
| B-001 | layered datum full-span rule의 silent empty | 1 |
| B-004 | quantitative line x/y action-order 의존 | 1 |

### Docs bug

| ID | 요약 | 실행 Phase |
| --- | --- | ---: |
| D-001 | sticky header가 section deep link를 가림 | 15 |

### 기능 제안 13개

| ID | 최소 capability | 실행 Phase |
| --- | --- | ---: |
| P-004 | weighted theta aggregation | 3 |
| P-008 | field-driven stroke width | 3 |
| NCP-003 | deterministic bounded point jitter | 4 |
| P-001 | window derived-data transform | 5 |
| P-002 | rectangular 2D bin transform | 5 |
| NCP-002 | item-local linear gradient fill | 6 |
| P-003 | explicit ordered quantitative path | 7 |
| NCP-001 | categorical density placement | 8 |
| NCP-005 | Horizon fold encoding | 9 |
| P-006 | overlay/inset composition | 10 |
| NCP-004 | parallel coordinate resource | 11 |
| P-005 | collision-aware label layout | 12 |
| P-007 | rectangular hierarchy data/layout | 13 |

이 원장의 ID는 정확히 한 Phase에만 배정한다. Phase closeout 때 해당 ID의 상태와 검증
증거를 이 문서에 갱신한다.

## 진행 상태

상태 vocabulary는 `planned | in-progress | blocked | completed`만 사용한다.

| Phase | 상태 | 범위 |
| ---: | --- | --- |
| 0 | completed | 저장소·build·test 기준선과 Roadmap 4 확정 |
| 1 | completed | B-002/B-001/B-004와 P1-A/P1-B/P1-C/P1-Exit 승인 |
| 2 | completed | P2-A/P2-B/P2-C/P2-D/P2-Exit 승인, Basic Chart facade closeout 완료 |
| 3 | planned | P-004 weighted theta, P-008 field stroke width |
| 4 | planned | NCP-003 deterministic jitter |
| 5 | planned | P-001 window, P-002 2D bin과 binned heatmap |
| 6 | planned | NCP-002 linear gradient fill과 gradient interval facade |
| 7 | planned | P-003 ordered path |
| 8 | planned | NCP-001 categorical density placement |
| 9 | planned | NCP-005 Horizon encoding |
| 10 | planned | P-006 overlay/inset composition |
| 11 | planned | NCP-004 parallel coordinate와 facade |
| 12 | planned | P-005 label layout |
| 13 | planned | P-007 hierarchy layout |
| 14 | planned | 전체 Basic Chart facade consistency closeout |
| 15 | planned | D-001, 누적 public docs 재검증과 전체 release-readiness 검증 |

## 승인 Gate 운영

모든 Gate는 hard pause다. Gate 상태는 `planned | ready-for-review | approved |
changes-requested`만 사용하며 명시적 사용자 승인 없이 `approved`로 바꾸지 않는다. 각 Phase의
`GOAL.md`는 구현 전에 exact scope, evidence와 승인 전 차단되는 후속 작업을 더 상세히 기록한다.

| Phase | 예정 Gate | 승인 대상 |
| ---: | --- | --- |
| 0 | P0-Exit | baseline, 범위 원장과 Phase 배정 |
| 1 | P1-A / P1-B / P1-C / P1-Exit | B-002 / B-001 / B-004 / 누적 runtime 안정화 |
| 2 | P2-A / P2-B / P2-C / P2-D / P2-Exit | 공통 계약 / scatter·line / bar·histogram / heatmap / 통합 |
| 3 | P3-A / P3-B / P3-Exit | weighted theta / field stroke width / 통합 |
| 4 | P4-A / P4-B / P4-Exit | jitter 결정·primitive / public vertical slice / 통합 |
| 5 | P5-A / P5-B / P5-C / P5-Exit | window / 2D bin / binned heatmap / 통합 |
| 6 | P6-A / P6-B / P6-Exit | gradient paint primitive / gradient interval facade / 통합 |
| 7 | P7-A / P7-B / P7-Exit | ordered-path 계약·primitive / public vertical slice / 통합 |
| 8 | P8-A / P8-B / P8-Exit | density placement 계약·primitive / public vertical slice / 통합 |
| 9 | P9-A / P9-B / P9-Exit | Horizon primitive / public lifecycle / 통합 |
| 10 | P10-A / P10-B / P10-Exit | overlay layout primitive / composition API / 통합 |
| 11 | P11-A / P11-B / P11-Exit | parallel-coordinate primitive / encoding+facade / 통합 |
| 12 | P12-A / P12-B / P12-Exit | label-layout primitive / public vertical slice / 통합 |
| 13 | P13-A / P13-B / P13-Exit | hierarchy primitive / public vertical slice / 통합 |
| 14 | P14-A / P14-B / P14-Exit | facade parity matrix / representative visuals / 통합 |
| 15 | P15-A / P15-Exit | public docs preview / release-readiness closeout |

Gate가 visual 또는 renderer 동작을 포함하면 exact executable source와 PNG를 함께 제시한다. 순수
runtime/architecture Gate도 source, state 결과, focused regression, cumulative suite, compatibility와
문서 영향을 한 패키지로 제시한다.

## 의존 관계

```text
Phase 0
  └─ Phase 1: B-002 / B-001 / B-004
       ├─ Phase 2: existing-capability Basic Chart facade
       ├─ Phase 3: weighted theta / stroke width
       ├─ Phase 4: jitter (B-002 필요)
       ├─ Phase 5: window / 2D bin / binned heatmap
       ├─ Phase 6: gradient fill
       └─ Phase 7: ordered path (B-004 필요)
            ├─ Phase 8: categorical density placement
            │    └─ Phase 9: Horizon lifecycle
            ├─ Phase 10: overlay composition
            └─ Phase 11: parallel coordinate + facade (P-003 helper + B-004 필요)
                 ├─ Phase 12: label layout
                 └─ Phase 13: hierarchy layout
                      └─ Phase 14: Basic Chart facade consistency
                           └─ Phase 15: docs and release readiness
```

Phase 8과 9는 generated area series, missing segmentation과 resource release pattern을 공유할
수 있지만 public semantics는 합치지 않는다. Phase 7의 ordered-path helper는 Phase 11에서
재사용할 수 있지만 dimension-local scale/axis owner를 대신하지 않는다.

## 모든 기능 Phase의 공통 완료 조건

1. 실제 `ggaction` runtime method와 strict TypeScript declaration이 같은 option vocabulary를 가진다.
2. package root에서 필요한 named type을 export하고 package consumer test가 실제 tarball import를 검증한다.
3. 요청 값, inferred/default 값과 source→derived→graphic 관계가 canonical state와 trace에 남는다.
4. previous program, sibling branch, caller-owned rows/options와 child program이 불변이다.
5. repeated call은 누적 geometry/resource를 만들지 않고 documented replacement/conflict semantics를 따른다.
6. target/source 생략은 current 또는 유일 후보만 추론하고 ambiguity를 임의 선택하지 않는다.
7. 정상, shortest valid call, boundary, empty/missing, invalid, ambiguity, error recovery를 검증한다.
8. Canvas, scale, source/filter, relevant option edit 뒤 stale resource 없이 정확히 한 번 재물질화한다.
9. pure calculation은 독립 literal oracle과 invariant를 가지며 production implementation을 복사하지 않는다.
10. primitive baseline과 public program이 semantic/graphic/order/Canvas-call contract에서 일치한다.
11. Browser Canvas와 Node PNG가 item 수, topology, bounds, clipping, logical coordinates에서 동등하다.
12. 기존 Cartesian, Polar, statistical, composition, selection/highlight와 package boundary 회귀가 통과한다.
13. Public behavior와 함께 README, docs, generated references와 runnable examples를 현재 상태로 갱신하고,
    migration, non-goal과 deployment 영향을 Phase 내부 문서에 기록한다.

## Phase 0 — 저장소와 기준선

### 목표와 포함 ID

구현을 시작하지 않고 현재 commit, package surface, source/test/docs 구조, test/build 기준선과
17개 범위 원장을 확정한다. 기능 또는 finding ID를 구현하지 않는다.

### 예상 수정 영역과 산출물

- `agent_docs/impl/roadmap4/ROADMAP.md`
- `agent_docs/impl/roadmap4/phase0/GOAL.md`
- `agent_docs/impl/roadmap4/phase0/STEP1.md`
- 평가 원본과 현재 architecture 사이의 dependency mapping
- 재현 가능한 baseline 명령과 환경 제약 기록

### 테스트와 증거

- `npm test`
- `npm run test:coverage`
- `npm run package:check`
- `npm run test:package`
- Browser/render suite의 local sandbox 결과와 기존 CI 기준을 분리 기록

### 진입 조건 / exit gate / 위험

- 진입: 0.0.4 평가 원본과 현재 저장소를 읽을 수 있음.
- Exit: 13 feature + 3 runtime bug + 1 docs bug가 중복·누락 없이 배정되고 NCP-006/007이 제외됨.
- 위험: 평가 proposal을 current architecture보다 우선하는 것, counterfactual type을 runtime 완료로 오인하는 것.

## Phase 1 — 기존 runtime 계약 안정화

### 목표와 포함 ID

B-002, B-001, B-004를 신규 기능보다 먼저 닫는다. 세 finding은 각각 독립 regression과
sub-gate를 갖고 한 수정이 다른 finding을 가리지 않게 순서대로 검증한다.

### 의존 관계

- Phase 0 완료가 필요하다.
- B-002는 Phase 3 jitter의 선행 조건이다.
- B-004는 Phase 6 ordered path와 Phase 10 parallel coordinate의 선행 조건이다.

### 예상 수정 영역

- Point default owner: theme/mark config, point materializer, concrete completeness
- Rule inheritance/completeness: layered mark inference, position policy, rule materializer
- Line partial state: position encoding policy, line materialization readiness, series materializer
- Declarations은 기존 signature가 바뀌지 않는 additive/behavioral fix인지 확인한다.

### 산출물과 테스트

- B-002: radius 생략/명시/size override, Cartesian/Polar, edit/rematerialization, Browser/PNG
- B-001: x/y datum full-span, data 생략/명시, field/datum, silent-empty 금지
- B-004: x→y와 y→x의 final semantic/graphic 동등성, temporal/aggregate/grouped line 회귀
- 평가 최소 재현을 제품 회귀 fixture로 전환하고 각 수정 뒤 전체 `npm test`와 세 재현을 누적 실행

### 진입 조건 / exit gate / 위험

- 진입: Phase 0 baseline이 재현됨.
- Exit: 세 재현이 정상 동작 또는 명시적 authoring error로 바뀌고 0-item silent success와 order 차이가 없음.
- 위험: point default가 explicit size를 덮는 것, rule inheritance cleanup이 intentional bounded rule을 지우는 것,
  incomplete line을 허용하며 invalid complete state까지 늦게 수용하는 것.
- 중요한 계약 결정: B-001의 자동 inherited-endpoint 제거와 명시 오류 중 하나를 구현 전에 사용자에게 승인받는다.

### Phase 1 Gate

- `P1-A`: B-002 default point radius의 concrete state, override 우선순위와 Browser/PNG 결과.
- `P1-B`: B-001 inherited endpoint provenance와 datum full-span 결과. 승인 전 B-004를 시작하지 않는다.
- `P1-C`: B-004 x→y/y→x 동등성과 line family 회귀.
- `P1-Exit`: 세 외부 재현, 전체 tests, coverage와 packed-package 검증.

## Phase 2 — Basic Chart facade 기반

### 목표와 포함 API

현재 capability만으로 완성 가능한 차트를 `createBoxPlot`과 동등한 chart-authoring facade로 제공한다.

```text
createScatterPlot
createLinePlot
createBarPlot
createHistogram
createHeatmap (pre-gridded mode)
```

### 의존 관계와 예상 수정 영역

- Phase 1 완료.
- Chart-level action registrar, shared facade option normalization, existing coordinate/mark/encoding/guide actions,
  public declarations와 package consumer.
- 새로운 geometry, scale mapper 또는 renderer branch를 만들지 않는다.

### 산출물과 테스트

- Scatter: shortest `{ x, y }`, optional color/size/shape와 guide opt-out.
- Line: shortest `{ x, y }`, optional color/groupBy/strokeDash와 existing curve/style options.
- Bar: shortest `{ x, y }`, existing aggregate/color/layout/stack vocabulary 재사용.
- Histogram: shortest `{ field }`, existing bin/color/normalization vocabulary 재사용.
- Heatmap: pre-gridded `{ x, y, color }`와 existing rect/color scale vocabulary 재사용.
- 각 facade는 current data와 deterministic ID/coordinate를 저장하고 실제 wrapped child action을 trace에 남긴다.
- Explicit action chain과 facade program의 semantic/graphic/order/Canvas-call 동등성, shortest call,
  explicit/current/unique/ambiguous data 및 ID conflict를 검증한다.

### 진입 조건 / exit gate / 위험

- 진입: 기본 point/line/bar/rect/histogram과 guides가 green.
- Exit: 다섯 facade가 별도 chart compiler 없이 기존 action만 조합하고 primitive/public/package test를 통과함.
- 위험: facade 전용 option vocabulary 중복, chart별 숨은 guide/scale default, 여러 dataset/layer 중 임의 선택,
  aggregate edit facade까지 범위 확대.

### Phase 2 Gate

- `P2-A`: exact signatures, field shorthand, data/id/coordinate inference, guides와 wrapped hierarchy.
- `P2-B`: Cars scatter/line primitive-facade parity와 optional encoding coverage.
- `P2-C`: Jobs bar와 Cars histogram의 layout/bin/normalization parity.
- `P2-D`: Gapminder pre-gridded heatmap parity와 automatic text non-goal.
- `P2-Exit`: declarations, Current contracts, inventory, full tests, coverage와 package consumer.

## Phase 3 — 작은 cross-chart encoding 확장

### 목표와 포함 ID

P-004 weighted theta와 P-008 field-driven stroke width를 서로 독립 sub-gate로 구현한다.

### 의존 관계와 예상 수정 영역

- Phase 1 완료. Phase 2 facade의 optional encoding도 같은 canonical action을 사용한다.
- Theta: encoding validator, arc aggregation grammar, scale/domain consumer, arc rematerializer.
- Stroke width: encoding registrar/schema, line/rule series grain, quantitative scale/legend dependency.

### 산출물과 테스트

- `encodeTheta({ aggregate: "sum", weight })`; count compatibility, fractional/repeated category,
  negative/missing/non-finite/all-zero 오류, row expansion 없음.
- `encodeStrokeWidth({ field, scale })`; constant union 호환, rule item grain, line series grain,
  same-series unequal value 오류, scale edit와 legend.
- 각 capability의 primitive/public chart pair, strict TS, Browser/PNG와 immutable trace.

### 진입 조건 / exit gate / 위험

- 진입: Polar arc와 line/rule 기본 회귀가 green.
- Exit: 두 ID가 각각 독립 package consumer와 visual slice를 통과하고 existing constant behavior가 동일함.
- 위험: theta category order 변화, stroke-width scale을 size scale과 잘못 공유, series 내부 값을 암묵 aggregate.

### Phase 3 Gate

- `P3-A`: weighted theta의 exact contract, independent oracle, primitive/public Polar chart parity와 Browser/PNG 결과.
- `P3-B`: field-driven stroke width의 rule/line grain, scale/legend와 Browser/PNG 결과.
- `P3-Exit`: 두 encoding의 declarations, Current contracts, package consumer와 누적 회귀.

모든 Gate는 hard pause다. `P3-A` 승인 전에는 field-driven stroke width 구현을 시작하지 않는다.

## Phase 4 — Deterministic bounded point jitter

### 목표와 포함 ID

NCP-003 `jitterPoints`를 원 x/y semantic encoding을 보존하는 graphical layout action으로 구현한다.

### 의존 관계와 예상 수정 영역

- B-002 완료가 필요하다.
- Point item identity, selection-compatible row mapping, materialization config/policy, point rematerializer,
  deterministic hash grammar와 bounds/radius containment.

### 산출물과 테스트

- pixel/band max offset, seed, optional unique key, x/y transpose.
- fixed hash vectors, reorder invariance with key, deterministic repeated/parallel result.
- Canvas/scale/radius/stroke/category-order edit에서 base position 기준 비누적 재계산.
- non-point, missing position/key, duplicate key, invalid bound와 target ambiguity 오류.

### 진입 조건 / exit gate / 위험

- 진입: default point가 모든 renderer에서 안전하고 stable item identity가 확인됨.
- Exit: source item 수와 semantic coordinate는 불변이고 모든 final offset/containment invariant가 통과함.
- 위험: selection/highlight offset과 jitter intent 혼합, pixelRatio를 logical offset에 적용, jitter를 beeswarm으로 확대.

## Phase 5 — Derived-data 기반과 binned heatmap

### 목표와 포함 ID

P-001 `createWindowData`와 P-002 `createBin2DData`를 canonical transform registry와 immutable
derived-dataset lifecycle 위에 구현하고 Phase 2의 `createHeatmap`에 binned mode를 추가한다.

### 의존 관계와 예상 수정 영역

- Phase 1 완료, Phase 2~4의 public action/type 패턴 재사용.
- Transform registry/schema, pure grammar, data action, generated revision/release, consumer rebind,
  facet replay와 dependency planner.

### 산출물과 테스트

- Window: partition/sort, rowNumber/rank/denseRank/cumulativeSum/lag/lead, stable tie,
  operation간 순차 field dependency와 null boundary default.
- Bin2D: scalar/per-axis bin count, explicit/auto extent, bounds/count, includeEmpty/members,
  boundary membership과 count conservation.
- `createHeatmap({ x, y, bin })`은 `createBin2DData`와 ranged rect/count color encoding을 wrapped
  child로 호출한다. `bin` 생략 pre-gridded mode와 의미를 섞지 않는다.
- source/filter edit와 facet replay, generated resource replacement, error attribution.

### 진입 조건 / exit gate / 위험

- 진입: current derived-data revision/rebind/release contract가 green.
- Exit: pure numeric oracle, transform provenance, downstream rect/path chart와 Browser/PNG가 모두 통과함.
- 위험: source row order 손실, floating edge 비결정성, 큰 members payload, operation output field 충돌.

## Phase 6 — Backend-neutral linear gradient fill과 interval facade

### 목표와 포함 ID

NCP-002 `LinearGradientPaint`를 rect/bar/area/closed-path의 item-local fill value로 추가하고,
이를 사용하는 high-level `createGradientIntervalPlot`을 함께 구현한다.

### 의존 관계와 예상 수정 영역

- Phase 1 완료.
- Public fill types, shared graphic/concrete schema, immutable clone/serialization, graphic bounds,
  Canvas gradient adapter, renderer mock와 PNG adapter.

### 산출물과 테스트

- `FillPaint = string | LinearGradientPaint`, normalized endpoints, ordered stops, opacity.
- string→paint→string edit, low-level per-item paint, highlight override, JSON round trip.
- horizontal/vertical/reversed/hard-stop/multi-stop sample-color oracle와 item-local bounds.
- Browser/Node logical parity; first release는 fill only, stroke/radial/conic/user-space는 non-goal.
- `createGradientIntervalPlot`의 shortest call은 `{ lower, upper }`이며 category가 있으면 각 category별
  interval을 만든다. 기본 orientation과 gradient를 사용하고 explicit orientation/gradient로 덮어쓸 수 있다.
- Horizontal facade는 `encodeXRange(lower, upper)`와 category y를, vertical facade는
  `encodeYRange(lower, upper)`와 category x를 사용한다. 내부에서 coordinate, rect mark, range encoding,
  gradient fill과 applicable guides action을 실제 wrapped child로 호출한다.
- Facade와 explicit rect/range/paint chain의 semantic/graphic/order/Canvas-call 동등성을 검증한다.

### 진입 조건 / exit gate / 위험

- 진입: shared concrete graphic contract와 current string fill regression이 green.
- Exit: 기존 string snapshots가 동일하고 한 interval당 한 item으로 continuous fill이 양 renderer에서 재현되며,
  gradient interval facade의 최소 호출과 explicit chain이 동등함.
- 위험: backend object를 state에 저장, renderer마다 다른 validation, path bounds에 stroke를 섞음.

## Phase 7 — Explicit ordered path

### 목표와 포함 ID

P-003 `encodePathOrder`로 quantitative Cartesian line/area series의 vertex order를 명시한다.

### 의존 관계와 예상 수정 영역

- B-004 완료.
- Encoding vocabulary/schema, line/area series grammar, stable sort, path materializer와 shared path helper.

### 산출물과 테스트

- asc/desc, repeated x/order tie, grouped path, non-monotonic loop/trajectory.
- missing/non-finite order, aggregate+order incompatibility, remove/reassign과 action-order equivalence.
- command topology/vertex sequence oracle, Browser/PNG와 previous branch immutability.

### 진입 조건 / exit gate / 위험

- 진입: ordinary quantitative x/y line이 authoring order와 무관함.
- Exit: explicit order가 source topology를 보존하고 order 생략 시 기존 x-sort가 동일함.
- 위험: source order를 암묵 contract로 만들기, compound path missing policy와 conflict, P-003를 parallel coordinate로 과대 확장.

## Phase 8 — Categorical density placement

### 목표와 포함 ID

NCP-001을 기존 `encodeDensity`의 discriminated `placement: { type: "category" }` branch로 구현한다.

### 의존 관계와 예상 수정 영역

- Phase 5 derived-data lifecycle과 Phase 7 path ordering pattern.
- Density provenance/grammar, category/split partition, scale center/bandwidth, area-series materializer,
  generated series identity와 editDensity replay.

### 산출물과 테스트

- single/grouped/half/split, densityChannel x/y, shared/independent width, unit/count normalization.
- explicit split domain, stable category order/series ID, degenerate-density warning.
- source/scale/canvas/bandwidth edit, same-target replacement, facet/overlay scale sharing.
- baseline `placement` 생략 output의 exact compatibility.

### 진입 조건 / exit gate / 위험

- 진입: density transform revision과 ranged-area materialization이 green.
- Exit: category center/width/side invariants와 renderer parity가 통과하고 child chart 복제 없이 한 coordinate가 소유함.
- 위험: density scale 의미와 category scale 혼합, composite partition key 충돌, weighted KDE까지 범위 확대.

## Phase 9 — Atomic Horizon encoding

### 목표와 포함 ID

NCP-005 `encodeHorizon`이 raw temporal signal에서 sign×band×segment derived data와 area series를
원자적으로 소유하도록 구현한다.

### 의존 관계와 예상 수정 영역

- Phase 5 transform lifecycle, Phase 8 generated area/missing/resource pattern.
- Horizon pure grammar, transform schema, area encoding/materializer, palette/theme policy,
  facet shared/independent resolve와 generated-resource cleanup.

### 산출물과 테스트

- bands, baseline, auto/explicit extent, shared/independent resolve, missing break/error,
  overflow clip/error와 positive/negative palette.
- zero crossing interpolation, duplicate timestamp 오류, irregular time, all-baseline warning,
  amplitude conservation과 deterministic z-order.
- source/filter/facet replay, bands reapply, canvas-only path rematerialization, Browser/PNG.

### 진입 조건 / exit gate / 위험

- 진입: categorical density의 generated area lifecycle이 안정됨.
- Exit: amplitude reconstruction, gap/overflow/facet invariants와 trace provenance가 모두 통과함.
- 위험: generated rows를 source로 재사용해 폭증, filter/facet resolve 순서 불일치, folded y를 원 value axis로 노출.

## Phase 10 — Overlay/inset composition

### 목표와 포함 ID

P-006 package-level `overlay`로 immutable child program의 absolute placement, clipping과 z-order를
composition state와 parent `graphicSpec`에 보존한다.

### 의존 관계와 예상 수정 영역

- Phase 1 안정화, current concat/facet child snapshot과 transitive rematerialization.
- Package export/type, composition schema/state, layout resolver, child namespace/snapshot,
  parent Canvas auto bounds와 renderer-independent clipping geometry.

### 산출물과 테스트

- 2~4 child, padding/background, non-negative x/y, clip true/false, ordered z-index.
- intrinsic child size, auto parent bounds, child replacement, nested composition, child edit replay.
- previous child/parent 불변성, Browser/PNG pixelRatio placement.

### 진입 조건 / exit gate / 위험

- 진입: concat/facet composition contract와 package export boundary가 green.
- Exit: host `drawImage` post-processing 없이 final parent graphicSpec만으로 inset 결과가 재현됨.
- 위험: child snapshot을 stretch, placement를 trace에만 저장, negative coordinate/auto bounds를 과도하게 일반화.

## Phase 11 — Parallel coordinate resource와 Basic Chart facade

### 목표와 포함 ID

NCP-004를 `createCoordinate({ type: "parallel", dimensions })`와
`encodeParallelCoordinates({ key, ... })`로 구현하고, 이를 감싸는 high-level
`createParallelCoordinates({ dimensions, key?, ... })` facade를 함께 제공한다.

### 의존 관계와 예상 수정 영역

- B-004와 Phase 7 ordered-path helper 완료.
- Coordinate vocabulary/schema, dimension-local scale resource/resolution, axis recipe/layout,
  wide-row path materializer, missing segmentation, multi-layer shared coordinate와 canvas dependency plan.

### 산출물과 테스트

- quantitative/ordinal mixed dimensions, explicit/auto domain, reverse, axis options, stable key.
- missing break/drop-row/error, dimension reorder, raw+summary shared coordinate, target/coordinate inference.
- High-level facade는 current data에서 coordinate와 line mark를 만들고 `encodeParallelCoordinates`를
  wrapped child로 호출한다. Key는 unique eligible field에서만 추론하고 안전한 후보가 없으면 요구한다.
- 2/5/8 dimensions, duplicate key/id, invalid field/domain, Canvas/title/legend/facet rematerialization.
- Browser/PNG에서 같은 axis tick, row key별 vertex/segment, z-order와 plot bounds.

### 진입 조건 / exit gate / 위험

- 진입: ordinary ordered path와 coordinate/scale/axis registries가 green.
- Exit: 외부 wide→long normalization과 manual axes 없이 source field별 local scale/axis가 state에서 감사 가능함.
- 위험: Cartesian scale/axis subsystem 복제, `encodeParallelPath` 같은 폐기 이름 노출,
  summary layer가 독립 domain을 재추론.

## Phase 12 — Collision-aware label layout

### 목표와 포함 ID

P-005 `layoutLabels`가 materialized text bounds를 이용해 deterministic displacement와 optional
leader를 만들도록 구현한다.

### 의존 관계와 예상 수정 영역

- Phase 11까지의 plot/layout/resource patterns.
- Deterministic text metrics, label layout grammar, text mark config/owner, leader rule collection,
  occupied bounds와 rematerialization plan.

### 산출물과 테스트

- axis x/y/both, padding, maxDisplacement, plot/canvas bounds, leader style.
- non-overlap no-op, dense/tied/long/edge label, stable best-effort warning.
- editText/scale/canvas/font change replay, leader cleanup, Browser/Node stable topology.

### 진입 조건 / exit gate / 위험

- 진입: shared deterministic text measurement와 layout collision contracts가 green.
- Exit: anchor relation, displacement bound, overlap reduction과 stable warning이 state/trace에 남음.
- 위험: backend 측정값으로 topology가 달라짐, impossible layout을 silent success, source point를 암묵 탐색.

## Phase 13 — Rectangular hierarchy data/layout

### 목표와 포함 ID

P-007 `createHierarchyData`로 parent/value rows를 deterministic treemap/partition bounds로 만든다.

### 의존 관계와 예상 수정 영역

- Phase 5 derived-data lifecycle과 Phase 12 layout failure policy.
- Hierarchy validation/rollup, deterministic layout grammar, transform registry, derived-data action,
  ranged rect consumer와 facet/composition replay.

### 산출물과 테스트

- single root/forest, leaf/internal rollup, stable sort, padding, treemap/partition.
- duplicate ID, cycle, orphan, negative/non-finite value, internal-value conflict 오류.
- non-overlap, parent containment, area conservation, source edit/revision과 Browser/PNG chart pair.

### 진입 조건 / exit gate / 위험

- 진입: generic derived-data resource lifecycle과 ranged rect regression이 green.
- Exit: source hierarchy와 output bounds provenance가 남고 external layout 계산 없이 기존 rect API가 소비함.
- 위험: 알고리즘 옵션 과다, floating nondeterminism, sunburst/polar hierarchy까지 범위 확대.

## Phase 14 — Basic Chart facade consistency closeout

### 목표와 포함 API

Roadmap 4의 Basic Chart API를 하나의 일관된 chart-authoring layer로 검증한다.

```text
createScatterPlot
createLinePlot
createBarPlot
createHistogram
createHeatmap (pre-gridded + binned)
createGradientIntervalPlot
createBoxPlot
createParallelCoordinates
```

새 chart facade를 추가하는 Phase가 아니라 앞선 Phase에서 구현한 public surface의 inference,
defaults, option forwarding, trace와 edit handoff를 통합 검증하는 closeout이다.

### 의존 관계와 예상 수정 영역

- Phase 2, 5, 6, 11과 existing `createBoxPlot` 완료.
- Shared facade contracts, action inventory/lifecycle, package declarations, examples/manifests와
  cross-feature integration tests.

### 산출물과 테스트

- 모든 facade의 shortest valid call, explicit data/ID/coordinate/guides와 ambiguity matrix.
- 공통 `guides: false`, scale/appearance option forwarding과 unknown-option rejection.
- Facade 생성 후 기존 `editScale`, mark edit, encoding reassignment, guide edit가 정상 작동하는지 검증.
- Facade가 만든 trace의 root/child hierarchy와 explicit chain equivalence.
- Multiple facade를 layer/composition/facet에서 함께 사용했을 때 resource identity와 rematerialization 검증.
- `createBoxPlot`도 같은 inference/default/package 기준으로 재감사하되 호환되지 않는 signature를 억지로 통일하지 않는다.

### 진입 조건 / exit gate / 위험

- 진입: Basic facade를 제공하는 모든 owning Phase가 completed.
- Exit: 각 facade의 최소 호출과 advanced escape hatch가 일관되며 planned facade gap이 남지 않음.
- 위험: 기계적 signature 통일로 chart별 필수 의미를 숨김, one-shot API에 모든 advanced option을 중복,
  aggregate edit action을 새로 생성.

## Phase 15 — Public docs verification, D-001 and release readiness

### 목표와 포함 ID

D-001을 수정하고 Phase 1~14에서 각 vertical slice와 함께 갱신한 public documentation을 누적 재검증한다.
일상적인 verified checkpoint push는 계속 수행한다. 버전 변경, tag, PR, npm/GitHub Pages 배포는 이
Phase의 범위가 아니다.

### 의존 관계와 예상 수정 영역

- Phase 1~14 모두 완료.
- README, docs API/tutorial/gallery/supported features, generated signatures/capabilities/LLM files,
  examples, docs styles/scripts와 built-browser tests.

### 산출물과 테스트

- CSS custom property를 공유하는 heading `scroll-margin-top`과 desktop/mobile h2/h3 fragment regression.
- 각 신규 action/type의 signature, shortest call, options/errors/edit lifecycle/non-goals/migration.
- Phase 1 runtime 안정화 문서 영향: point의 materialized default radius `3`, layered rule datum full-span의
  inherited-position precedence, direct quantitative line의 x/y 양방향 authoring 예제를 반영한다.
- Basic Chart API가 Getting Started의 기본 경로이고 mark/encoding API가 advanced composition 경로로 연결되는지
  누적 재검증한다.
- `createScatterPlot`과 `createLinePlot`의 shortest call, field shorthand, data/ID inference, guide opt-out,
  resource-specific edit escape hatch와 Cartesian-only line limitation이 current docs와 일치하는지 검증한다.
- `createBarPlot`과 `createHistogram`의 shortest call, color layout/width와 atomic bin option, guide opt-out,
  resource-specific edit escape hatch가 current docs와 일치하는지 검증한다.
- `createHeatmap`의 required pre-gridded x/y/color, observed-row-only cell 정책, color가 유일한 fill owner라는
  점, rect outline/opacity option과 후속 `createTextMark().encodeText()` 예제가 current docs에 유지되는지 검증한다.
- 개발 CI는 현재 문서 소스 자체의 완결성과 exact TypeScript signature 동기화를 검증한다. Release workflow는
  이미 검증된 동일 commit의 문서만 배포하는 release-scoped 경계를 유지한다.
- representative public chart image와 canonical example/program ownership.
- `docs:verify`, package, full tests, coverage, Browser, render와 evaluation-derived regressions.
- current commit/version/tarball checksum을 적는 release-readiness report. 실제 publish는 하지 않는다.

### 진입 조건 / exit gate / 위험

- 진입: 모든 runtime Phase가 completed이고 unresolved public contract가 없음.
- Exit: implementation, declarations, package boundary, docs와 generated files가 모순 없이 통과함.
- 위험: development 중 current docs 갱신 누락, obsolete workaround 유지, sticky header 높이를 고정 pixel로 중복.

## Phase별 증거 기록 형식

각 Phase 종료 시 해당 Phase 문서와 이 roadmap에 다음을 남긴다.

- 완료한 ID와 읽은 proposal/finding revision
- 확정 public API, canonical state owner, inference/error/replacement 정책
- 변경한 action/type/schema/grammar/materializer/renderer/export 영역
- 추가한 unit/contract/chart/browser/render/package test
- 평가 최소 재현의 before/after 결과
- `npm test`, coverage, package, Browser/PNG의 실행 명령과 결과
- 남은 non-goal, 위험과 다음 Phase 진입 조건 충족 여부

## Phase 0 검증 결과

- 기준 commit: `4ee6bb8` (`close roadmap 3 release`)
- package: `ggaction@0.0.4`, browser/extension/png 세 entry boundary
- fast/full normal suite: 임시 npm cache 사용 시 `1545/1545` 통과
- coverage: lines `94.89%`, branches `90.22%`, functions `98.54%`, critical floors `55`개 통과
- package artifact: entries `320`, packed `279448` bytes, unpacked `1298418` bytes
- installed package consumer: 통과
- 기본 `~/.npm` cache는 root-owned file 때문에 local `npm pack`이 `EPERM`; `/tmp` cache로 우회 시 통과
- local Browser/server와 gallery Chromium은 sandbox 권한으로 실행 불가. 이 결과는 제품 실패가 아니라
  환경 제약으로 분리하며, 이후 Phase exit gate에서는 허용된 browser 환경 또는 CI 증거를 요구한다.
- Node PNG chart render 본체는 local run에서 진행됐으나 gallery의 Chromium launch 단계가 sandbox로 차단됐다.
