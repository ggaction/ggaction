# 10k exact inference 실행 정책·worker 최소안

## 진행 상태

- [x] 원 graph-inference·Current·resource owner·비동기 준비 경계 감사
- [x] 기존 capacity 전달 결함 별도 수리 `c9389b765`
- [x] 원100/1000/10000, k10의 전체 결과·작업량 계측과 독립 oracle 검산
- [x] 공개·저장·worker 후보를 구체화해 root 검토 자료로 기록
- [x] root의 구체안 정합 확인: 기존 remainingApproval 범위로 채택, 2026-11-01
- [ ] 채택된 execution 정책 구현·검증 checkpoint ([진행 기록](inference-execution.md))
- [ ] 실제 worker·source revise·취소/오류/늦은 결과·3Node·Chromium 검증
- [ ] 최종 combined archive의 원 AT82 P95/heap/100cycle qualification

[전체 승인](../AUTHORIZATION.json)의 remainingApproval 범위로 검토한다. 아래 API와 실행 옵션은
**채택된 구체안이며 전체 worker 구현은 아직 완료되지 않았다.** 사용자 재승인 질문을 만들지 않는다.
기준 runtime은 `c48f89e9d`, 완료 증거는 `c9389b765`다. 공유 animation owner와 point capacity는 범위 밖이다.

## 현재 구현과 원 요구

원 [graph-inference](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/graph-inference.ko.md)는
exact metric·typed tie·원 sourceRows·동일 graph schema를 보존한다. `maxNodes`/`maxEdges`는 이미
공개·저장되어 있어 별도 새 capacity schema가 필요하지 않다. 누락 전달은 앞 checkpoint에서 수정했다.
그러나 `createInferredGraphData`는 동기이며 추론 worker는 없다. 기존 `ggaction/graph`의 route
executor는 route job만 받는다. 이를 generic job executor로 바꾸지 않는다.

`prepareGraphEdgeRoutes`의 exact Full constructor 등록 검사, receiver/token WeakMap,
input/result digest와 schema 검증, signal 우선 검증 및 요청별 worker 종료라는 수명 패턴은 재사용한다.
그 구현 자체와 route API를 inference에서 호출하거나 option kind를 확장하지 않는다.
Byte/MIME용 asset host도 숫자 작업에 가져오지 않는다.

## 실제 계측과 의미

[work-audit.mjs](inference-execution-design-evidence/work-audit.mjs)는 제품 source를 수정하지 않고
임시 번들에서 **search/model 두 work 거부 지점만** 관찰한다. 임시 안전 ceiling200M을 넘으면
진단도 중단한다. 나머지 guard는 그대로다. 이는 지원 크기·제품 admission·SLO 검사가 아니다.
Node22 단일 진단이며 source 준비와 oracle는 계산 timer 밖에 있다. P95나 heap 수치로 세지 않는다.

입력은06d benchmark와 같은 내림차순 numeric ID의 완전한 2D grid, Manhattan, k10,
directed exact kd-tree다. 독립 Manhattan shell oracle는 src를 import하지 않고 모든 n×10 간선의
source/target/order/weight/row를 검사한다. 100/1000은 계측본과 실제 제품 전체 결과가 exact 같다.

| nodes / edges | search work | distance evaluations | model 생성 | model index | model JSON bytes |
|---|---:|---:|---:|---:|---:|
|100 / 1,000|172,331|2,560|851,308|864,772|775,077|
|1,000 / 10,000|2,451,722|34,397|8,674,208|8,809,552|7,868,738|
|10,000 / 100,000|31,318,394|415,782|88,385,616|89,743,320|79,872,413|

제품의10k 실행은 여전히 search10M에서 실패한다. 10k model의 고유 edge key는14,577,507
UTF-16 units이고 repeated endpoint key는5,577,507 units다. model `token`은 문자열을 다시
직렬화하지 않으며 type/length를 검사하고 `length*4`를 charge한다. 따라서 이 charge는 실제
primitive 연산 수가 아니라 문자열 크기까지 포함한 보수적 admission 단위다. 단순히 낮춰
중복 연산 제거라고 주장할 수 없다. endpoint 재사용만으로도 고유 edge key58M charge가 남는다.
현재 validateWorkLimit의10M은 **각 owner의 work accumulator 한도**이며 전체 action 누적 CPU
명령 수가 아니다. 이 사실을 새 정책 설명에서도 유지한다.

## 권고안: 기존 capacity + 명시 inference 실행 한도

기존 create/edit definition에 optional 한 필드만 추가한다.

```ts
execution?: {
  policy: 'bounded-inference@1';
  maxWork: number; // positive safe integer, upper bound 100_000_000
  maxBytes: number; // positive safe integer, upper bound 134_217_728
}
```

- 생략하면 기존10M work 정책과 저장 shape를 그대로 유지한다. 이전 envelope에 새 필드를 요구하지 않는다.
- 명시한 maxWork는 기존 inference search/model accumulator의 한도이며 원 단위/charge 수식을
  그대로 사용한다. 전역 MAX_WORK_ITEMS와 다른 mark/layout/route/graphic 한도는 바꾸지 않는다.
- 원10k fixture의 권장 호출은 기존 `maxNodes:10000,maxEdges:100000`과
  `execution:{policy:'bounded-inference@1',maxWork:100000000,maxBytes:134217728}`이다.
  100M은 실제 가장 큰 index89,743,320에 대한 명시 상한이다. 128MiB는 관측79,872,413-byte
  model과 제안 completion의 정규 인코딩84,492,155 bytes가 들어갈 bounded transport envelope를
  위한 제안 상한이다. 이 측정은 기존 `encodeValue`→`canonicalJSON`을 사용하며 전체 model과
  기존 diagnostics를 포함한다. 원 source-row provenance는 exact native receiver가 조립하므로
  worker 완료 메시지에 중복 저장하지 않는다. Job은 원 source rows와 exact data ref를 보낸다.
  미측정 큰 tuple/attribute 입력까지 수용한다고 주장하지 않는다. 초과하면 전체 요청을 거부한다.
- maxBytes는 encoded job 및 completion **각각**의 한도다. 실제 JS heap ceiling이라고 표현하지
  않는다. 사전 own-data/길이 계수로 stringify/clone 전 검사하고 정확 encoded 길이도 검사한다.
  job/result/main/worker 사본 및 hash buffer의 동시 메모리는 별도 실제 retained-heap 검증을 한다.
- work accumulator는 finite safe integer를 유지하며 각 입력/출력 배열의 cardinality와 모든
  source key/edge의 길이를 검사한다. 작업량·메모리·노드/간선 한도를 서로 대체하지 않는다.
- result formula, order, weight, algorithmVersion:'1', kd-tree@1과 diagnostics work 값은 보존한다.
  execution policy version만 새로 저장한다. 기존 6rule의 의미나 silent approximate 전환은 없다.
- source revise/restore/후속 candidate 소비자는 저장된 실행 정책을 명시 전달한다. 결과
  graph가100k edges라고 해서 layout/GraphPlot의 그래픽 용량까지 늘어나지 않는다.

이 상한은 최종 SLO 보장이 아니다. 구현 시 실제 완전 envelope 길이가128MiB를 넘거나 worker
completion 검증이 의미 있게 막히면 실제 자료로 정책을 다시 보고하며 source/간선을 줄이지 않는다.
정규 인코딩은 진단에서10k 기준 약0.99초였으나 단일 실행이며 P95가 아니다. Main의 요청 준비,
worker 기동/계산/메시지 복사, 완료 검증, 명시 resource commit을 별도 stage로 계측해 비용을 숨기지 않는다.
원 large-worker10s는 실제 worker 전체 경계로 검사하며 sync 실행이나 budget 거부를 통과로 세지 않는다.

## 권고 공개 호출과 권한

기존 `ggaction/graph` entry에 추론 전용 세 함수를 추가한다.

```ts
createGraphInferenceExecutor({ createWorker }): GraphInferenceExecutor
computeGraphInference(job, signal?): GraphInferenceCompletion
prepareInferredGraphData(program, request, {
  executor, requestToken, signal?
}): Promise<PreparedInferredGraphData>

// request: {kind:'create', ...existingCreateOptions}
//       or {kind:'edit', ...existingEditOptions}
program.createInferredGraphData({prepared, requestToken})
program.editInferredGraphData({prepared, requestToken})
```

일반 동기 create/edit 경로를 보존하며 prepared 표현과 일반 입력을 혼용하지 못한다. executor는
전용 factory의 authentic object만 받는다. 워커 factory는 필수여서 동기 계산을 worker 성공으로
보고하지 않는다. Worker entry는 `computeGraphInference(event.data.job)`를 호출하고 completion만
반환한다. Worker에는 ChartProgram·action receiver·renderer·DOM·main mutable buffer를 보내지 않는다.

`GraphInferenceJob`은 closed schema/version, normalized definition, 필요한 원 source values/key·행
위치, exact input revision vector 및 optional candidate model, inputHash를 담은 deep-owned value다.
`GraphInferenceCompletion`은 complete:true, inputHash/resultHash 및 기존 normalized model/diagnostics다.
해시는 consistency 증거이며 worker의 수학적 정직성을 인증하지 않는다. Host가 제공한 worker는
공개 computeGraphInference를 실행하는 신뢰된 계산 provider이고, main은 기존 source-bound
membership/identity/metric weight/diagnostics 검증을 모두 유지한다. Top-k 최적성을 증명하려고 main에서
solver를 다시 실행하는 숨은 정책은 만들지 않는다. 독립 oracle로 실제 worker 결과를 검증한다.

준비 시작 때 exact Full constructor의 graph handler 등록을 검사한다. Basic, 미등록/파생 constructor,
forged/frozen/structured-cloned prepared handle은 거부한다. 각 handle은 exact closed native receiver,
create/edit kind, target revision, source/candidate refs, requestToken 및 signal에 결박된다.
변경된 program, 다른 token, 늦게 도착한 completion은 commit할 수 없다.
준비 중에는 trace/resource/graphics/history가 바뀌지 않는다. 완료 action은 기존 editSemantic 또는
writeGraphResource→dependency closure를 명시 호출한다. Downstream 실패도 이전 program을 보존한다.
Stored graph에 worker, promise, token, executor, prepared handle을 넣지 않는다.
이 준비 경계는 요청한 inferred resource 하나를 계산한다. Native source revision의 기존 동기 closure는
유지하며, 그 안의 모든 추론/후속 layout을 암묵적인 async transaction으로 바꾸지 않는다. Source 갱신과
준비된 graph의 동시 교체가 별도 요구로 확인되면 기존 atomic resource planner와 조율할 후속 설계로 남긴다.

## Worker 수명과 경계

첫 executor는 cache 없이 동시 작업1개만 소유한다. 초과 요청은 resource-limit로 거부하며
묵시 queue·전역 singleton·LRU를 만들지 않는다. pending compute Promise, worker와 listeners는
complete/error/abort/dispose 중 최초 terminal에서 한 번만 정리한다. terminate도 한 번이며 이후
message/error callback은 무해하다. dispose는 idempotent이고 dispose 후 compute는 거부한다.
Signal은 input 접근/host callback보다 먼저 확인한다. 실제 browser worker는 abort에서 terminate하며,
pure compute는 이미 aborted signal과 반복 단계의 abort check를 지원한다.

같은 authentic immutable job/model에 대한 proof 재사용은 별도 좁은 최적화다. 구조 복사나 worker
입력은 항상 전체 own-data/길이/hash 검증을 받는다. private WeakMap의 cached mutable index를 외부
caller에게 그대로 반환하지 않는다. Raw 문자열 길이 charge를 cache 명목으로 삭제하지 않는다.

## 구현 순서·소유 파일·검증

1. `grammar/graph/inferenceBudget.js`에서 option/encoded size/work policy를 소유하고 기존 field/rule/model/
   inferredState에 명시 전달한다. 작은 기존 결과 전체 exact, 기본 guard 동일, 지정 한도±1, hostile
   accessor·긴 typed key·NaN/overflow·corrupt stored policy와 codec를 검증한다.
2. `grammar/graph/inferenceJob.js`와 `materialization/graph/inferenceRequest.js`에서 순수 job과 exact
   native 입력 해석을 분리한다. `inferredResource.js`가 solver 계산과 completed result 조립을 분리하되
   resource schema/행 lineage는 그대로 둔다. prepare와 action이 request 해석을 복제하지 않는다.
3. `resources/graphInference.js`, `resources/graphInferenceExecutor.js`, `src/graph.js`, graph 전용 types와
   기존 create/edit prepared union을 연결한다. route executor 및 point/global graphics owner는 변경하지 않는다.
4. 독립 literal/seeded exhaustive small oracle, 원100/1k/10k shell oracle의 전체 n×10,
   actual Worker·cancel/error/late/token/source revision·atomic failure·dispose100cycle를 검증한다.
   기존 observed/inferred candidate closure·source revise·Basic boundary와 fresh codec를 유지한다.
5. Current GRAPHS, types/graph + program graph 관련 구간, action metadata/cards/docs/snippet, package
   boundary/동일 archive3Node/실제 Chromium worker를 닫는다. 도구06d의 unavailable stage를 실제 공개
   worker 호출로 바꾸되 모든 기존 workloads/원 fixture/5warm+30/DPR1/2/분모를 유지한다.
   최종 P95는 root와 CPU 슬롯 조율한 combined archive에서만 실행한다.

이 문서의 최초 계측과 원제품 오류는 `c48` 당시 상태다. 실행 정책과 worker는 별도 source/evidence
체크포인트로 검증하며 이 설계 자료를 공개지원 또는 STEP071/AT82 완료로 세지 않는다.
Root 채택 뒤 codec 감사를 통해 editable `serializeProgram`에 전체64MiB 한도가 없음을 확인했다.
64MiB는 animation envelope의 별도 정책이므로 존재하지 않는 program 한도를 추가하지 않는다.

## 재현과 이번 자료의 검증

Repository root에서 Node22로 다음 명령을 실행한다. 이 스크립트는 임시 instrumented bundle과
JSON만 `.artifacts/inference-execution/`에 쓰며 src·한도·저장 모델을 수정하지 않는다.

```sh
node agent_docs/impl/roadmap9/qualification/inference-execution-design-evidence/work-audit.mjs
```

보존한 [JSON](inference-execution-design-evidence/work-audit.json)과
[원 출력](inference-execution-design-evidence/work-audit.log.gz)에 Node 버전, 입력/result SHA256,
oracle revision/hash, 모든 work counter와 10000의 실제 제품 거부 메시지가 있다. 실행·oracle·전체
원행/순서 검산은 성공했으며, runtime source는 c48 이후 변하지 않았다. 이번 체크포인트는
설계와 진단만 포함하므로 source-free archive를 새로 만들거나 c938의 검증을 새 API 증거로 재분류하지 않는다.
