# Native route의 resumable hash 연결 경계 검토

## 진행 상태

- [x] 현재 source의 immutable 입력·hash·host 권한 경계를 source SHA와 줄 번호로 고정
- [x] Native 3노드/3간선 world·screen의 job body, solver result, 검증 완료 envelope를 실제 cursor와 비교
- [x] 실제 preparation/worker event 경로의 snapshot·receiver·token·취소 수명 검산
- [x] Node20/22/24 소형 exact bytes/hash 및 실제 macrotask 취소 검산
- [ ] 제품 strict writer/cursor 채택 및 구현
- [ ] Route v2의 validation·copy·transport·materialization 전체 취소 연결과100ms 검증

[remainingApproval](../AUTHORIZATION.json#L32)의 기존 전체 승인 아래 작성한 **read-only 검토**다.
[앞선 cursor](tagged-cursor-review.md)와 [canonical owner 설계](canonical-resumable-design.md)를
현재 JSON count 추출 이후 source로 좁힌다. Runtime·API·schema·수치 guard 변경0이다.
현재 제품 cursor가 있거나 route v2가 지원된다는 의미가 아니다. Root가 구체 범위를 채택한 뒤 구현한다.

## 현재 source와 세 가지 연결 후보

기준은 `5ec4f4b40402521f902f643c9d49365b9658db52`이다.
[qualification.json](route-cursor-evidence/qualification.json)의 `source.json`은27개 source/contract의
SHA와 관련 실제 줄을 기록한다. 아래 줄 번호는 그 revision 기준이다.

| 경계 | 이미 확보한 입력 | hash 전후의 현재 순서 | 후행 연결 조건 |
|---|---|---|---|
| `grammar/graph/routes/job.js:49–53` | own descriptor/ordered refs/intent/viewport/input/hierarchy 검증 후 `cloneAndFreeze`한 body | body → hash → immutable job → `validatedJobs.add(job)` | body만 cursor에 넘긴다. 실패·취소에는 job 공개와 WeakSet 등록0 |
| 같은 파일 `:68–73` | exact 검증 job을 소비한 solver의 deep-owned result | solver → result hash → completion clone | 네 solver 모두 마지막 `cloneAndFreeze`를 한다. 원 result의 모든 field를 hash하며 solver·work 단위는 변경하지 않는다 |
| `grammar/graph/routes/result.js:19–58` | 외부 envelope의 own/domain/anchor/order/provenance/diagnostics 검사 완료 값 | **현재는 mutable result hash가 먼저**, envelope clone이 마지막 | 이 위치에 곧바로 await를 넣을 수 없다. 새 v2 경로에서 검증과 snapshot 확보를 마친 값에만 resumable hash를 허용한다 |

Job body는 정확히 `schemaVersion`, `algorithmVersion`, `inputs`, `intent`, `input`, `viewport`,
그리고 hierarchical인 경우만 `hierarchy`다. `inputHash`는 body 자체에 없다. `input`에는 graph
model 전체(노드·간선 attributes 포함), positions, typed-order 숫자 ranks, limits가 들어간다.
World viewport는 null, screen은 당시 resolved graphic bounds다. Hierarchy에는 전체 model,
encoded mapping, tree/treemap anchors가 들어간다. Attributes를 hash에서 제외하거나 position만
남기지 않는다. 특히 native order가 숫자여도 attributes의 BigInt가 사라지지는 않는다.

`resolveRouteInput`은 source rows에서 typed ranks를 생성하고 payload를 deep-owned로 반환한다.
`edgeRouteJob`은 이를 `createRouteJob`에 명시 전달한다. Core ownership과 `Object.freeze`는
mutation 방지에만 쓰며 domain 인증으로 승격하지 않는다. 현재 `validatedJobs`는 job owner 내부
WeakSet이고 오직 완전 검증 후 만든 exact job을 등록한다. Structured copy, shallow freeze,
일치하는 hash만으로 proof를 재사용할 수 없다.

## v1 전체 hash 교체를 제외하는 이유

`routeValueHash`에는 job/result 이외에도 intent limits/mapping 비교, result options/bounds 비교,
stored resource options/sourceRows/viewport 검사, screen action의 viewport 일치 검사가 들어온다.
이 callsite들을 async로 바꾸면 동기 action·stored validator·source closure의 의미가 바뀐다.
따라서 함수 자체와 기존 모든 v1 callsite를 유지한다. Core `encodeValue` 및 raw `canonicalJSON`도
그대로 둔다. 이 자료의 byte exact는 닫힌 native snapshot을 새 cursor로 읽을 수 있다는 증거이며,
기존 getter 호출 순서까지 strict cursor가 호환한다는 증거가 아니다.

실제 검산에서 generic `encodeValue`는 own getter를 읽고 sibling entries를 자식 오류보다 먼저
snapshot한다. Strict prototype는 getter0으로 own descriptor 단계에서 거부한다. 이 오류순서의
차이는 의도적으로 기록했고, v1 replacement로 숨기지 않는다. 새 opt-in v2의 실패순서는 별도
고정해야 한다. 기존 persisted hash bytes, 순서, holes, ±0, unusual scalar는 유지한다.

## 제안하는 private 연결 형태

아래는 **제품 코드가 아닌** 다음 구현의 책임 경계다.

```text
core/jsonText.js
  기존 count와 bounded string writer가 같은 Unicode/escape 진행 owner를 사용
core/valueEncoding.js
  기존 scalar tag 선택·container/hole fragment의 단일 owner
  strict traversal은 기존 sync getter snapshot 경로와 분리
core/sha256.js
  기존 create/update/finish/clear만 사용

grammar/graph/routes/job.js
  prepareRouteJobStages(validated native inputs, policy) -> pure iterator
  snapshot body -> hash chunks -> exact owned job -> existing validatedJobs registration
  computeRouteCompletionStages(exact job, owned result, policy) -> pure iterator

grammar/graph/routes/result.js
  validateRouteCompletionStages(exact job, acquired immutable snapshot, policy)
  exact domain checks -> consistency hash -> owned completion

resources/graphRoutes.js, graphRouteExecutor.js
  signal/receiver/token/pending generation -> real macrotask drain -> final identity check
  publish prepared handle/cache only after complete validation and ownership
```

Pure iterator에는 Promise/timer/worker/renderer/ChartProgram/requestToken registry를 넣지 않는다.
원 source 입력 snapshot 획득을 iterator 안에 감춰 await 후 원 mutable 입력을 다시 읽지 않는다.
기존 sync wrapper를 재사용하는 경우 완전히 동기 drain이어야 하며 원 v1의 validation/clone/error
순서를 보존해야 한다. 이 검토는 v1 wrapper 변경 자체를 채택하지 않는다.

`jsonText.js` count는 현재 minimum (`length+2`)와 최종 quota 검사 순서를 유지한다. Writer와
규칙을 공유하더라도 counter에 매 scalar 객체 할당이나 새 조기 quota 오류를 추가하지 않는다.
Prototype는 source 본문에 관측 yield를 삽입한 연구 도구다. 제품 런타임에 source 읽기/동적 생성은
금지하며, 제품 container tags를 prototype의 두 문자열에서 복사해 두 번째 정본으로 만들지 않는다.
Primitive tag 선택은 실제 `encodeValue`를 사용했고, 제품 container/hole fragments는 기존
`valueEncoding.js`에서 공유하도록 좁게 추출해야 한다. Shared array codec/ref intern은 제외한다.

## Host 수명과 외부 snapshot

`prepareGraphEdgeRoutes`는 request/host own-data snapshot, signal, resource graph, request resolution,
`edgeRouteJob`까지 끝난 뒤 첫 await에 도달한다. 현재 executor 없는 경로는 solver도 await 전에
동기 완료한다. 함수가 async라는 사실만으로 준비가 취소 가능한 것은 아니다.

`graphRouteExecutor.onMessage`는 signal을 먼저 검사하고 `event.data`를 동기 검증·clone한다.
특히 custom `createWorker`는 일반 mutable 객체를 전달할 수 있다. Native Worker의 structured
clone을 모든 host 구현에 가정할 수 없다. 후행 async validator는 event.data를 참조한 채 yield하면
안 된다. 먼저 immutable snapshot을 확보하는 현재 비용을 명시하거나 별도 승인된 transport로
바꿔야 한다. Plain freeze와 core ownership 검사만으로 이를 생략하지 않는다.

현재 준비 handle의 권한은 `resources/graphRoutes.js`의 private WeakMap이 소유한다. Exact base
program, kind, requestToken, original signal을 보존한다. Digest는 권한이 아니다. 최종 완료와
cache/handle 공개 전에 signal 및 pending generation을 다시 검사하고, late message는 data를
읽지 않으며 terminal1회와 cleanup을 유지한다. 연구 driver의 `publications`는 hash 최종 공개
횟수일 뿐 program commit 횟수가 아니다. 별도 native host 검사는 실제 공개 preparation과
bundle action을 호출하여 이 구분을 보완한다.

## 실행 증거와 남은 한계

[qualification.json](route-cursor-evidence/qualification.json)은3개 Node receipt와 도구/source SHA,
기존 host 회귀 로그를 묶는다. 각 Node는 다음을 실제 수행했다.

- Native world·screen 각각 job body/result/validated completion6개와 ordered record/작은 wide record
  2개: 총8개 × chunk1/7/64/1024 =32회 exact bytes/독립 Node crypto SHA, 각8개 exact/-1 quota.
- Native job과 solver result의 모든 container deep-owned 확인. Caller mutable job/input 수정 격리,
  frozen forged job3개 거부, position/attribute/completion getter0, legacy getter·오류순서 차이 확인.
- 실제 timer가3개 서로 다른 chunk 경계에서 취소. 성공 시 terminal1/publication1, 취소 시
  terminal1/publication0, SHA 및 cursor finally clear. 이 단계의 정책 수치는 연구 한도다.
- 실제 public prepare 호출이 반환하기 전에 worker로 넘긴 job이 이미 deep-owned임을 확인.
  이후 request·host 수정 및 mutable worker completion 수정이 결과에 영향0. 위조 handle·다른
  token·action·receiver4개 거부, 준비 뒤 original signal 취소 거부, worker terminate1/listener0.

추가로 기존 `graph-route-host`와 `graph-route-own-request` suite14/14가 통과했다. 소형 검토는 route
모든 method/large fixture의 새 성능 지원이나 package 자격을 뜻하지 않는다. 제품 source 변경0인
관계로 package를 재생성하지 않았다. 최초 selector 오타는 실행 전 실패로 원 로그에 남긴다.

아직 선점할 수 없는 BigInt decimal 변환, 넓은 record descriptors/keys, 초기 snapshot/validation,
structured clone/postMessage, final materialization은 남아 있다. 실제100ms/원1k·10k/retained lifecycle
인수를 이 작은 hash-stage 검산으로 대체하지 않는다. Route v2 numeric maxima와 완전 native update
union도 이 검토에서 새로 정하지 않는다.

```sh
node agent_docs/impl/roadmap9/chart/route-cursor-evidence/build.mjs
node agent_docs/impl/roadmap9/chart/route-cursor-evidence/audit.mjs
node scripts/run-tests.js unit unit/resources/graph-route-host.test.js unit/resources/graph-route-own-request.test.js
node agent_docs/impl/roadmap9/chart/route-cursor-evidence/verify.mjs
```
