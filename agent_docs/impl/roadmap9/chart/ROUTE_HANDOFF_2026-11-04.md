# Route B 재개 인계 — 2026-11-04

상태: **사용자 요청으로 wrap up 후 완전 중지**. 새 구현·제품 검증·대규모 실행을 시작하지 않는다. 아래 명령은 사용자가 재개한 뒤의 절차다. 현재 구현 checkpoint는 검증됐으나 전체 B union, 원 capacity, 100ms 목표 및 STEP077 완료는 아니다.

## 보존 위치와 통합 대상

- 원격: `https://github.com/ggaction/ggaction.git`, branch `codex/route-v2-native`.
- 작업 폴더: `/Users/hyeonjeon/.codex/worktrees/route-v2-native/ggactionnewbrand`.
- 인계 작성 전 HEAD: `69605f4e3c813660744f448dab933e9be2d4f4bd`; tracked/untracked 변경 없음. 이 문서만 추가하여 별도 commit/push한다.
- 실제 root 통합 WT: `/Users/hyeonjeon/.codex/worktrees/roadmap9-integration/ggactionnewbrand`, branch `codex/roadmap9-animation-timeline-public`, 관찰 HEAD `abbd84b76`. 통합 branch는 움직일 수 있으므로 재개 시 다시 확인한다. 프로젝트 기본 `main`이나 오래된 `origin/codex/roadmap9-integration`을 통합 기준으로 혼동하지 않는다.
- 관찰한 root와 route 공통 조상은 `3427ae56ffcc22182ebf35302fcd198eef888c7c`. root에 아직 없는 route commits는 순서대로 `99907a314`(scope 검토), `746f7847c`(B layout 연결), `3d368ed8f`(B resource 연결), `69605f4e3`(다음 경계 감사) 및 이 인계 commit이다. 원 branch merge로 의존 관계를 보존한다. 다른 agent의 변경을 reset하거나 덮어쓰지 않는다.

## 구현 완료 범위와 권한

공개 B `prepareGraphEdgeRoutes(... kind:"update", edit:{action,args})` → 기존 authentic handle → `applyGraphEdgeRoutesUpdate` → 원 native wrapper/primitive/materializer/theme 완료까지 연결했다. 현재 연결은 완성된 Full **unit receiver**의 다섯 action: `editLayout`, `editGraphData`, `editFlowData`, `editHierarchyData`, `editInferredGraphData`다. mixed v1/v2, world/screen, graph/hierarchy layout 및 GraphPlot/TreePlot/GeoLine 소비자 경로를 포함한다. 추론은 raw 및 원 authentic prepared inference handle을 지원한다.

승인 근거는 기존 사용자 STEP077/남은 계획 일괄 승인과 root의 `99907a314` 구체 private scope 채택이며, [native 연결 기록](route-b-native-connection.md), [resource 연결 기록](route-native-resource-connection.md)을 읽는다. 준비 await 동안 core invocation scope는 열리지 않는다. 최종 원 동기 wrapper invocation에서만 exact record/base/constructor/native function/args/ref/order를 검사하고 한 번 소비한다. 원 오류가 close 오류로 대체되지 않으며 context는 finally에서 복원한다.

원 prepared WeakMap, validatedJobs, Full exact constructor binding, primitive context가 권한을 유지한다. 새 facade proof, wildcard action replay, 후보 프로그램 반환, 일반 extension registry는 없다. 저장 native-child는 authored-source/theme inspection 데이터일 뿐 실행 권한이 아니다. 원 v1 sync/hash/getter/error/guard를 유지한다. preflight와 실제 apply에서 실제 실행한 비용은 각각 합산하며, 종료 worker의 과거 peak를 현재 보유량에 다시 더하지 않는다.

## 마지막 완료 검증과 원격 증거

최신 검증 source checkpoint는 `3d368ed8f`, 그 뒤 `69605f4e3`은 감사 문서만 추가했다. 이번 wrap up에서는 새 검증을 실행하지 않았다.

- Node20/22/24 각 **433 tests**, failures/cancelled 0. core action/encodedValueCursor/jsonText/valueEncoding 각 lines/branches/functions **100/100/100**, 해당 owner critical floors 통과.
- docs/types/catalog/argument/package 30개 통과.
- 단일 archive SHA256 `b04826b709ed055822e33a9641c70fe425fe11819a71aa372088205c6df95a36`: 1268 entries, packed 1830188 bytes, unpacked 8229472 bytes.
- source-free 설치 소비자: 각 Node route 8개 + native resource 5개, Worker 35개 종료/listener 0. 같은 엔진의 v1/v2 기하 및 정확 payload hash 검산. 엔진 간 수치 hash 동일성은 계약으로 주장하지 않는다.
- minified Chromium: route 3종 + resource 5종, 문서 실제 snippet 3개, 취소 4종 publication 0/terminal 1, Worker 22개 종료/listener 0.
- graph 전체 123 modules, Full assembly/renderer import 0; pure route worker 38 modules. package/6 bundle 경계 통과. 이 branch 실측 max gzip Full795721/Basic426852/graph75582/animation341583/interaction137529/svg25672. root 합산에는 그대로 덮어쓰지 말고 새 composite archive로 재측정한다.
- source pin 102개와 압축 receipts 8개를 마지막 확인했다. [qualification.json](route-native-resource-evidence/qualification.json), [재현 README](route-native-resource-evidence/README.md), [verify.mjs](route-native-resource-evidence/verify.mjs), [추적 receipts](route-native-resource-evidence/receipts/)가 원격 저장된 근거다.

`.artifacts/route-native-resource/`의 tarball/설치 폴더/원 로그는 ignored local 산출물이다. 다른 머신에서 존재한다고 가정하지 않는다. 원격에는 source, 실행 스크립트, archive hash/size, gzip 원 영수증이 저장되어 있다. tarball 자체를 원격 제공하거나 registry에 배포했다고 주장하지 않는다. 재생성 archive는 새 해시를 갖는 별도 실행이며 과거 동일 artifact라고 포장하지 않는다. 이전 layout-only [evidence](route-native-update-evidence/README.md)는 과거 checkpoint로 보존하고 최신 source에서 그 과거 pin을 갱신하지 않는다.

수리된 중간 실패도 완료 결과와 구분한다: host가 wrapped-only inference reader를 호출해 `Action source requires an active wrapped invocation`이 발생했으며 원 registry owner의 exact-base reader 추출로 해결했다. installed TS fixture의 graph 전용 type import도 `ggaction/graph`로 바로잡고 3Node를 재검산했다. 이는 위 최신 결과에서 해결됐고, 아래 미완료 항목은 해결되지 않았다.

## 미완료 union과 다음 구현 경계

정확한 owner는 [union.json](route-native-resource-evidence/union.json): 직접 14개, focused derived aliases 21개, 기존 감사 후보 332개를 유지한다. 다섯 연결도 `partial-unit-native-connection`이며 scoped/composition/facet, 추가 viewport 변경을 요구하는 간접 소비자까지 완료된 것이 아니다.

직접 미연결은 `reviseData`, `editDerivedData`, `editParameter`, `applyDataUpdate`, `filterMarks`, `removeMarkFilter`, `editCanvas`, `fitCanvas`, `navigateProjection`이다. 다음 source 감사는 [route-native-data-canvas-next.md](route-native-data-canvas-next.md)에 있다. 별도 private extraction을 늘리기보다 실제 B data/Canvas/fit native 경로를 닫는 최소 의존 단계를 구체화해야 한다.

- data: 원 row identity/namespace와 prepared source exact args binding을 유지한다. revisionIdentity/source transient context를 await 너머에 열어두지 않는다.
- Canvas: 초기 viewport 뒤 guide/responsive 단계에서 추가 route job이 발생한다. 후보 program의 screen plan을 최종 receiver에 재사용할 수 없다. exact ordered original job/completion과 최종 receiver에서 생성한 원 plan 검산이 필요하다. 감사 문서의 이 구체 후속 연결은 아직 제품 채택·구현하지 않았다.
- fit: 원 probe 순서/quarter-pixel search/cache/iteration cap을 보존한다. broad catch가 abort/deadline/quota/continuation mismatch를 overflow report나 성공으로 바꾸지 않게 해야 한다.
- 초기 own-data 취득/deep clone의 완전 work/depth/heap 계량, snapshot/clone/postMessage/native construction/final materialization의 비선점 구간 100ms, 원 density1k/10k capacity는 미완료다. 수치 guard 축소나 fixture 축소로 완료 처리하지 않는다.

## 재개 시 정확한 순서와 명령

먼저 사용자의 재개 지시와 중앙 인계를 확인한다. 저장소 root/해당 scope AGENTS 및 SECOND_ARCHITECTURE를 읽고, 어떤 agent도 heavy를 실행하지 않는 CPU 슬롯을 조율한다. 아래 첫 단계는 읽기 전용 상태 확인이다.

```sh
git fetch origin
git status --short
git log --oneline origin/codex/roadmap9-animation-timeline-public..origin/codex/route-v2-native
git merge-base origin/codex/roadmap9-animation-timeline-public origin/codex/route-v2-native
```

통합 담당자가 clean integration WT에서 route branch를 merge한 뒤 같은 macro/current 계약 및 root compiler/scalar/package 변경을 보존한다. 현재 프로세스를 승계한다고 가정하지 않는다. 원 branch에서 저장 evidence를 가볍게 확인하는 명령은 다음과 같다(merge 후 source pin 변경은 과거 검증 실패가 아니라 새 composite 검증 의무다).

```sh
node agent_docs/impl/roadmap9/chart/route-native-resource-evidence/verify.mjs
```

재개 후 제품 변경을 마친 경우의 원 full reproduction 명령은 위 evidence README에 고정돼 있다. `node20`, `node22`, `node24`를 실제 해당 major 바이너리 경로로 바꾼 뒤 repository root에서 실행한다. `archive.mjs`에 들어가기 전에 다른 머신에서는 `npm_execpath`를 실제 npm CLI 경로로 지정한다. 이 순서를 지금 실행하지 않는다.

```sh
zsh agent_docs/impl/roadmap9/chart/route-native-resource-evidence/owning.zsh node20 node22 node24
node22 --test test/contracts/action-catalog.test.js test/contracts/compact-action-cards.test.js test/contracts/documentation-truth.test.js test/contracts/action-input-matrix.test.js test/contracts/graph-route-types.test.js test/contracts/graph-route-package.test.js > .artifacts/route-native-resource/docs-final.log 2>&1
node20 agent_docs/impl/roadmap9/chart/route-native-resource-evidence/archive.mjs
node20 agent_docs/impl/roadmap9/chart/route-native-resource-evidence/installed.mjs
node22 agent_docs/impl/roadmap9/chart/route-native-resource-evidence/installed.mjs
node24 agent_docs/impl/roadmap9/chart/route-native-resource-evidence/installed.mjs
node22 agent_docs/impl/roadmap9/chart/route-native-resource-evidence/browser.mjs
```

성공한 새 개념 checkpoint만 union/record/verify를 갱신하고 commit/push한다. PR·publish·deploy는 별도 승인 대상으로 실행하지 않는다.

## 마지막 독립 검토와 중지 상태

route 완료 뒤 sibling `codex/roadmap9-format6-product`에 read-only 검토만 제공했다. consumer file stdin의 cleanup/error 보존, 숫자열 creator의 inherited numeric setter 및 Object.prototype Symbol.iterator 반례, compiler keyspace cache의 getter/오류순서/immutable tuple/anchor별 수명 조건을 보고했다. 제품 수정은 이 route WT에서 하지 않았다. 그쪽 canonical 기록은 해당 branch의 `agent_docs/impl/roadmap9/qualification/circle-column-proof-review.md`이며 null-prototype 보강과 과거 profile source를 구분한다. 이는 새 제품 채택이나 50ms 달성 승인이 아니다.

wrap up 시 route 소유 실행 session/worker/browser/server는 **0개**다. 새 테스트·profile·대규모 실행을 시작하지 않았고 다른 agent 프로세스는 건드리지 않았다. 이 문서 commit/push와 최종 clean/remote 확인을 마친 뒤 완전히 멈춘다.
