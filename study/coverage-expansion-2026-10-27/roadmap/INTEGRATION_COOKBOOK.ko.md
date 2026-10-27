# 기존 코드에 새 기능을 연결하는 절차

## 작업 전 상태 확인

~~~sh
git status --short
git rev-parse HEAD
node --version
node -p "JSON.parse(require('node:fs').readFileSync('package.json','utf8')).version"
~~~

사용자 변경이 있으면 보존하고 변경 파일 소유권을 분리한다. dependency 설치는 package-lock과 CI Node 버전을 기준으로 한다. 소스 baseline drift는 source-map.json과 비교하고 새 module/symbol 위치만 갱신한다. 현행 source에 존재하지 않는 함수 호출을 계획 예제에서 복사해 실행할 수 있다고 가정하지 않는다.

## Domain action 하나를 추가하는 순서

1. agent_docs/contract/current의 가장 가까운 family와 ACTION_INDEX를 읽고 실제 짧은 호출을 작성한다. id omission은 unique stored state로만 추론한다. 두 resource가 가능하면 첫 번째를 선택하지 말고 ambiguity error다.
2. 옵션 normalize와 pure calculate를 분리한다. normalize는 모든 resolved defaults/type/target를 결정하고 저장할 intent를 반환한다. calculate는 explicit inputs만 읽고 result+diagnostics를 반환한다.
3. closedAction의 op/description/scope와 exact allowed option keys를 선언한다. preflight에서 새 state와 모든 affected consumer를 검증한다. source program을 mutate하거나 module global에 candidate를 남기지 않는다.
4. wrapped child actions로 semantic/resource 결과를 저장하고 explicit materializer를 호출한다. 큰 action args는 data arrays가 아니라 resource ID/옵션 요약으로 trace에 남긴다. meaningful child steps를 숨기지 않는다.
5. family register function에 method를 한 번 등록하고 src/actions/index.js의 등록 순서를 확인한다. src/ChartProgram.js의 built-in trace 등록과 persistence validation에서 새 op를 인식하는지 확인한다. basic/extension/default entry의 노출 경계를 따로 검증한다.
6. selectors, vocabulary, resource reference collector, dataset references, reviseData의 replacement/rebinding, materialization planner, composition ancestor closure에 새 consumer를 등록한다. 기존 mark capability/policy registry를 확장하고 parallel switch chain을 만들지 않는다.
7. inspection의 resource/role/option metadata, scene의 item key/topology, selection policy, highlight baseline, accessibility description을 연결한다.
8. types/program.d.ts와 해당 subpath declaration, runtime exact option validation, contract examples의 parameter 이름을 동일하게 맞춘다. unknown option negative type/runtime 시험을 둘 다 작성한다.
9. editable codec/validation/migration, source-free package consumer에서 create→edit→remove→save/load를 실행한다. fresh process라 runtime cache가 없다는 조건이 중요하다.
10. action catalog/relationships/cards/inspection/docs/LLM generator를 canonical script로 갱신한다. generated files를 직접 손으로 고쳐 다음 build에서 사라지게 하지 않는다.

이 순서의 실제 참고 소유자는 src/actions/charts/index.js, src/actions/index.js, src/core/action.js, src/core/resourceReferences.js, src/materialization/planner.js, src/scene.js, src/persistence/validation.js다. source-map에는 정확한 baseline symbol과 line/hash가 있다.

## Kernel 호출과 action 반환을 섞지 않기

~~~ts
// Pure internal contract. New API proposal, not an existing export.
function computePartition(input: NormalizedHierarchy, options: PartitionOptions): PartitionResult;
function prepareGraphRoutes(input: RoutingInput, options: RoutingOptions, runtime: ComputeRuntime): Promise<PreparedRoutes>;

// Authoring actions always return a new program.
program.layoutHierarchy({id:'p', hierarchy:'h', method:'partition'});
program.bundleGraphEdges({id:'r', graph:'g', layout:'l', method:'hierarchical', options:{hierarchy:'h'}});
// Large async route computation uses prepare + an explicitly named commit/replace action.
// The final public async preparation/commit names are reviewed together, not invented per method.
~~~

위 async 표면의 정확한 제안은 ggaction/graph의 prepareGraphRoutes({program,graph,layout,method,options,signal})와 program.applyPreparedGraphRoutes({id,result})다. prepare는 Promise<PreparedRoutes>, apply는 ChartProgram을 반환한다. synchronous bundleGraphEdges는 같은 pure kernel을 bounded input에서 실행한다. Graph entry는 DOM/Node-only dependency 없이 module worker 또는 caller executor를 주입받는다. result에 완전한 source revision vector와 algorithmVersion/options hash가 없으면 apply가 거부한다. 새 exports/API라 G-CORE 검토 항목에 포함한다.

## Proposed resource action 표

| Resource | Create/compute | 수정 | 삭제 기본 |
|---|---|---|---|
| hierarchy | createHierarchyData | editHierarchyData, source revise closure | removeResource restrict |
| graph | createGraphData/createInferredGraphData | editGraphData/editInferredGraphData | restrict |
| node/hierarchy/flow layout | layoutGraph/layoutHierarchy/layoutFlow | editLayout with method-specific patch | restrict |
| edge-route | bundleGraphEdges/applyPreparedGraphRoutes | editEdgeRoutes with method/options re-evaluation | restrict |
| geometry/join | createGeometryData/createGeoJoinData | reviseGeometryData/editGeoJoinData | restrict |
| projection | createProjection | editProjection | restrict |
| image/font/pattern | createImageResource/createFontResource/createPattern | replace payload or editPattern | restrict |
| parameter/selection | createParameter/createSelectionResource | editParameter/editSelectionResource | restrict |
| annotation | createAnnotation | editAnnotation | restrict |

removeResource({kind,id,cascade:false})는 신규 resource union에만 적용한다. 기존 removeData/removeScale/removeCoordinate를 대체하지 않는다. 기존 createSelection과 이름/역할이 겹치면 facade는 현행 createSelection을 확장하고 resource용 내부 wrapped action은 공개 중복으로 내보내지 않는다. edit의 resolved kind가 현재 resource와 다르면 replace를 강제하며 schema를 몰래 바꾸지 않는다.

## 소비자 누락을 찾는 방법

rg로 현재 family type과 가장 가까운 mark kind를 source/test/contracts/types에서 함께 찾는다. 단순 문자열 추가를 완료로 보지 않는다. create→appearance edit→source revise→coordinate edit→Canvas resize→compose→select→serialize→fresh load→export 순서로 한 fixture를 돌린다. 이때 각 단계의 affected owner와 resource revision을 assert한다. 같은 변경을 역순으로 적용해 동일 final state에 도달하면 graphicSpec도 동일해야 한다. order-independent API가 placeholder graphics를 생성하면 실패다.

## Primitive 시각 검토 패킷

manifest에 capability/chart/variant, exact target public chain, equivalent primitive program, input hash, width/height, expected semantic roles, plot-region ink assertions, renderer/font/hash를 넣는다. review PNG 경로는 .artifacts/test/png/review/<chart>/<variant>/다. same-run decoded primitive/public pixels가 같아도 independent geometry/numeric tests를 별도로 실행한다. 승인된 variant만 charts/<capability>/<chart>/<variant>로 옮기고 metadata에 roadmap/phase 번호를 남기지 않는다.

## 다음 모델에게 전달할 메시지

~~~text
목표: STEP-xxx 한 카드만 완료한다.
기준: actual HEAD, contract revision, 선행 카드 evidence 경로.
읽을 것: START_HERE, DECISIONS, 해당 카드, 카드의 필수 계약.
지켜야 할 것: native scope, immutable state, explicit materialization, single Y.
실행: independent failing test → pure kernel → wrapped action → consumer 연결 → focused checks.
인계: changed files, actual commands/exit, expected/actual artifact hash, consumer matrix, remaining obligations.
금지: 범위 축소, raw graphics를 public 사용법으로 노출, 미실행을 pass로 기록.
~~~

모델이 오류를 만나면 먼저 최초 실패 invariant와 최소 입력을 보존한다. 반복 실패 시 임의 API나 fallback을 더 만들지 말고 source symbol/current contract를 다시 읽는다. 코드 생성량보다 작은 검증 가능한 상태를 유지하는 것을 우선한다. 한 카드가 너무 크면 같은 계약 아래 capability별 하위 카드로 분해하되 원 인수 시험과 후행 의무는 그대로 유지한다.
