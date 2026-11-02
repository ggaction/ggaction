# B native update: 원 owner의 continuation 추출

## 진행 상태

- [x] root가 기존 remainingApproval 아래 native generator 추출 방향 채택
- [x] 332개 기존 후보의 source 위치 및 phase import 경계 전수 감사
- [x] 원 v1 동기 경로와 동일한 route/source DAG 단계 추출·회귀
- [x] exact native route/source owner의 private v2 completion continuation 연결
- [ ] screen/guide/responsive/fit 및 composition/facet 전체 continuation
- [ ] closed action union의 positive/실패·identity·trace 검증 및 public B 연결

Root는2026-11-02 `b86503b56` 첫 v2 checkpoint 뒤 다음 구체화를 기존 채택 범위로 인정했다.
“기존 owner generator extraction → v1 sync drain → v2 native completion continuation →
소유 locals로 상향 연결.” 원순서/error/child trace를 보존하며 whole-action throw/retry,
미리 만든 candidate를 그대로 최종 반환, async core/action, 미연결 public Promise stub는 제외한다.
[기존 채택](route-v2-adoption.md)과 [B 전체 의무](route-native-update-boundary.md)를 유지한다.

## source callsite와 중단 뒤 유지할 값

| 계산 owner | route를 기다릴 때 유지할 원 locals | 이어지는 실제 작업 |
|---|---|---|
| `graphs/routeClosure.prepareEdgeRouteRevisions` | exact candidate resource Map, 이전 refs, entries, 현재 route | GeoRoute/projection DAG 및 GraphPlot preflight |
| `data/resourcePlan.planSourceResourceRevision` | data replacements, revised Map, topological cursor, entries | hierarchy/flow/calendar/contour/geo consumer union |
| `graphs/layouts.editGraphLayout` | normalized intent, retainedCoordinates, 새 layout | 원 primitive binding, graph/flow/geo materialization |
| `graphs/layouts.prepareGraphResource` | inferred graph DAG, nextLayouts, replacements | graph/layout preview 및 원 write owner |
| `hierarchy/resources` | hierarchy/layout 후보 및 partition view | route/geo closure와 selection pruning |
| `graphs/screenRoutes.prepare` | exact viewport, 현재 entries, semantic identity | 원 Canvas private plan과 primitive context |
| `guides/layout.withGuideLayoutTransaction` | candidate, margin, attempt, 원 callback | 실제 route와 전체 concrete geometry로 guide overflow 검산 |
| `responsiveLayout.withResponsiveLayout` | original program, plot, pass list, 현재 candidate | native measuredPass와 원 iteration cap |
| `canvas/fitting` | exact plot 또는 side/cache/binary search 상태 | 매 probe의 실제 editCanvas 결과와 occupied bounds |
| `data/edit.applyRevisionPlan` | 원 IDs/identity, revision list, replacements, retain | resource DAG 뒤 release 및 currentData 복원 |
| `composition/targets.dispatchActionTargets` | exact child paths, collected guides, 처리 중 child | 원 ancestor refresh·shared guide 검산 |

`reviseData`와 `reviseDerivedData`의 기존 speculative/실제 branch는 같은 사전 identity를 쓴다.
Native 준비가 임의 exception으로 전체 action을 다시 실행하거나 새 namespace를 생성해서 이를
대체하지 않는다. 기존 수학상의 fitting probe 및 responsive 재시도는 원 알고리즘 그대로이며
실제 계산 work를 누적한다. 이와 임의 action throw-and-retry는 구별한다.

## 닫힌 union 감사의 의미

[audit.json](route-native-stages-evidence/audit.json)은 기존332후보 각각을 선언·등록·factory table의
실제 source 위치에 연결한다. 모든 후보의 위치를 찾았고 각 phase owner까지 정적 import 도달성을
기록했다. 이것은 실행 증거가 아니며, `runtimePositive: pending`과 `closedAdmission: not-implemented`
상태를 유지한다. 동적 prototype 등록이 있는 action은 그 table/assignment 위치를 명시하였고
첫 번째 유사 함수나 domain wildcard로 추정하지 않았다. 이332목록을 runtime allowlist로 쓰지 않는다.

첫 단계는 세 계산 loop의 검증과 상태를 native generator가 계속 소유하도록 옮긴다. v1 facade는
그 generator를 즉시 끝까지 소비하여 원 동기 결과·오류 순서를 보존한다. v2 host는 immutable job의
원 registry 검산 뒤 실제 worker completion을 같은 generator에 전달한다. completion을 받은 뒤 원
result validator/primitive context를 그대로 거친다. 원 native apply가 wrapped children을 실행하며
최종 trace/theme/action completion의 소유권을 바꾸지 않는다.

전체 B 단계가 연결되기 전에는 `kind:update`나 `applyGraphEdgeRoutesUpdate`를 공개하지 않는다.
생성·수정의 현재 v2 지원과 private 단계 추출을 전체 update 완료로 세지 않는다.


## 첫 private 단계 checkpoint 결과

`routeClosure`와 `data/resourcePlan`의 원 loop 및 locals를 generator로 추출했다. 기존 v1 wrapper는
동일 loop를 즉시 소비하고 raw v2의 기존 준비 요구 오류도 유지한다. Private scoped 경로만
`edgeRouteJobStages`의 원 검증·snapshot·hash 뒤 exact job을 내보낸다. 호스트가 반환한 completion은
원 `completedEdgeRouteResource`와 검증 owner를 거쳐야 다음 dependency가 진행된다.

혼재 v1 계산에는 원 guard를 유지한 accounting observer만 전달한다. Scoped native resource 및
GeoRoute preview 검산도 같은 ledger로 이어진다. 이 checkpoint의 driver는 회귀용이며 아직 공개
B dispatch에 연결하지 않았다. 서로 다른 정책의 전체 요청 admission과 held-result sample 수명은
상위 B 요청 owner를 연결할 때 남은 의무다. 이를 현재 완료라고 표시하지 않는다.

- 기존 source/route/layout/hierarchy native42개 회귀는 추출 전후 모두 통과했다.
- Node20.20.2/22.23.1/24.22.1 각241개 owning+core 회귀 통과. Core cursor/jsonText/valueEncoding은
  모두100/100/100, resourcePlan100/98.61/100, routeClosure100/97.44/100,
  job100/95/100, routeResource100/100/100. 원 critical floor를 낮추지 않았다.
- 새 회귀는 원 v1 결과·순서와 v2 continuation의 exact geometry, mixed v1/v2 resource DAG,
  next revision/입력 refs/원 program 보존, maxWork failure, 중단 중 hash buffer 해제,
  위조 completion 거부를 검사한다.
- source-free 공통 archive SHA256 `585e9860b31a1d55f729d87cbde25d4eb40ff99c354ac07c824d46e9635cbaf6`:
  1266entries, packed1,824,016B, unpacked8,198,861B. 세 Node의 public8cases, types,6entry bundle,
  Chromium real worker/Canvas/SVG/restore와 정확 문서 snippets를 재검증했다.
  Full 최대gzip792,740B, graph74,464B이며 worker38source modules/Full·renderer유입0이다.
  Package ceiling은측정값에 맞춰1,824,100/8,198,900B, Fullgzip792,800B로만 조정했다.
- 문서·source/type/package boundary·test discovery83개 통과. 첫 discovery 실행은 신규 manifest
  항목의 `type:file` 누락으로 실패했고 수정 뒤 전체83개를 다시 통과했다. 실패 로그를 보존했다.
- 검산: `node agent_docs/impl/roadmap9/chart/route-native-stages-evidence/verify.mjs`.
  [qualification](route-native-stages-evidence/qualification.json)은 source bytes·common archive·
  압축 raw receipts를 결박한다. Node24의 기존 density 엔진 차이는 이전 checkpoint처럼
  각 엔진의 원 v1 exact equality와 payload별 exact hash로 검증하며 새 허용오차를 만들지 않았다.

공개 B update, full332후보 인수, screen/guide/fit/composition continuations, 원1k/10k 실행,
전 구간100ms는 계속 미완료다. 이 기록은 해당 범위를 축소하거나 완료로 처리하지 않는다.

검증 source commit은 `c2dc6b2589d1a04e86a3be9145d4f16326b746d5`이며 후행 metadata pin은 실행 bytes를 바꾸지 않는다.
