# Canonical encode/SHA의 private resumable owner 추출안

## 상태와 범위

- [x] `a9994e302`의 기존 core·직접 call-site·route/asset/inference/animation 소비자 읽기 감사
- [x] 키 순서·tag·signed zero·Unicode·padding·getter·기존 오류 우선순위 소형 baseline6묶음
- [ ] Root의 구체 추출 범위 채택
- [ ] 공유 scalar owner 구현 및 sync compatibility·bounded cursor·취소 검증
- [ ] Route v2 validation/hash/clone/worker/원자 commit 연결과 실제100ms 인수

[전체 승인](../AUTHORIZATION.json)의 remainingApproval와2026-11-02 root 지시 아래 작성했다.
이것은 **제품 코드0의 좁은 설계 검토**다. 큰 route 수치 hard maxima/전체 native update union은
채택되지 않았고 원1k/10k 실행은 하지 않는다. 기존 sync 공개 경로·API·hash bytes·수학·기본
guard를 바꾸지 않는다. Shared animation4와 benchmark는 편집하지 않는다.

[실행 baseline](canonical-resumable-evidence/audit.mjs)과 [source-pinned 결과](canonical-resumable-evidence/audit.json)는
현재 코드만 호출한다. `src`95개 파일의144개 직접 호출/정의를 줄 번호와 SHA로 남겼다.
이 숫자는 transitive closure/test 수나 지원 범위가 아니다. 신규 cursor가 구현됐다는 증거도 아니다.

## 현재 owner와 소비 경계

| 현재 owner | 실제 의미 | 이번 추출의 보존점 |
|---|---|---|
| `core/contentDigest.js` | TextEncoder→동기 SHA256, native byte copy, raw canonical JSON | 기존 signatures/bytes/coercion·SharedArrayBuffer 거부 |
| `core/valueEncoding.js` | unusual scalar와 sparse array를 tagged tree로 인코딩 | tag shape·Object.entries 순서·경로별 오류 |
| `persistence/codec.js` | shared array envelope 및 decode owner | 이번에 wire/ref/shared dedupe를 바꾸지 않음 |
| `grammar/graph/routes/job.js` | `contentDigest(canonicalJSON(encodeValue(value)))` | 원 job/result hash 및 exact validated-job proof |
| `grammar/graph/routes/result.js` | endpoint/order/geometry/provenance→diagnostics→result hash→deep clone | 해시는 일관성 검산이고 권한 증명이 아님 |
| `resources/graphRouteExecutor.js` | signal→validate job/cache; message signal→completion 검산 | stale/abort 우선, terminal1회, exact receiver 별도 |
| `grammar/graph/inferenceBudget.js` | tagged canonical UTF8 길이 사전검사 | 모든65536 UTF16 unit을 이미 검산한 scalar 규칙 재사용 |
| `grammar/dataSourcePayload.js`, assets | canonical data hash 또는 원 asset bytes hash | 문서 text hash와 bytes hash를 혼동하지 않음 |
| `animation/envelopeCodec.js` 및 native state readers | 별도 envelope/크기/형태 검증 | 현재 다른 branch에서 바뀌는 animation/v4 owner는 손대지 않음 |

현재 모든 caller를 async로 바꾸지 않는다. 첫 사용자는 아직 구현 전인 opt-in route v2의
preparation 경계이며 기존 작은 sync caller는 기존 wrapper를 계속 사용한다. Core에는 ChartProgram,
route 정책, token, source refs, request generation, Promise/listener registry를 넣지 않는다.

## 1. 서로 다른 두 키 순서를 유지한다

`canonicalJSON({b:1,a:2})`는 UTF16 code-unit 순서로 key를 정렬하여
`{"a":2,"b":1}`을 만든다. 반면 `canonicalJSON(encodeValue({b:1,a:2}))`는
`["object",[["b",1],["a",2]]]`다. Object.entries의 순서를 저장한 **pair 배열**이므로
삽입 순서를 바꾸면 route hash가 바뀐다. Integer-like key는 Object.entries의 native enumeration
순서이고, 그 뒤 string key는 삽입 순서다. locale sort나 raw object 전체 정렬로 통합하지 않는다.

Raw canonical scalar의 -0은 JSON `0`, NaN/Infinity는 `null`이며 undefined는 undefined다.
Raw array `[undefined,undefined]`는 현재 `[,]`가 된다. Tagged 경로는 -0/NaN/Infinity/undefined,
bigint/hole에 명시 tag를 만든다. 일반 문자열·사용자가 직접 만든 `["number","NaN"]`은
그 tag로 오인하지 않고 다시 array tag를 가진다. Generic helper의 이 관측 동작을 정리한다는
이유로 바꾸지 않는다. 실제 persisted route는 먼저 domain의 own-data/shape를 통과한다.

JSON의 lone surrogate는 `"\\ud800"`처럼6ASCII escape와 quote2byte다. Raw UTF8 text hash는
TextEncoder가 replacement code point3byte로 바꾼다. 유효 surrogate pair는4byte다. JSON escape는
quote/backslash와5개 short control에2byte, 나머지 control에6byte이며 U+2028/U+2029는 현재
native JSON처럼 그대로 간다. Encoder chunk가 valid pair를 잘라 두 개의 replacement로 만들면 안 된다.

## 2. 첫 개념: SHA block state만 분리한다

예상 새 private owner는 `src/core/sha256.js`다. 현재 ROUND·rotate·64round 압축 함수를
그대로 옮겨 기존 sync와 후행 async가 같은 함수를 호출한다. 작은 private 함수안은 다음과 같다.

```text
createSha256State() -> mutable private state
updateSha256(state, bytes, start, end) -> state    // 완성64byte block 처리
finishSha256(state) -> lowercase64hex            // 남은 byte와 길이 padding
clearSha256(state)                              // 실패/취소 시 참조 해제
```

위 이름은 private module 계약안이며 package export/사용자 API가 아니다. State에는 hash8words,
working64words, tail≤63bytes, 전체 byte count와 finalized flag만 둔다. 표준 compression 순서와
32bit coercion을 바꾸지 않는다. Pending block64byte + words256byte + hash32byte는 약352bytes의
직접 numeric payload이며 state object/호출 입력은 별도다. Final padding은 최대2blocks만 만든다.

`contentDigest(text)`는 기존 TextEncoder coercion 그대로 UTF8을 준비하고 state를 동기로
끝까지 drain한다. 현재 undefined는 빈 text, 숫자는 문자열 coercion이다. 이를 `typeof text`
새 검사로 바꾸지 않는다. `contentBytesDigest(input)`는 기존 `copyContentBytes`를 먼저 호출해
Subview offset을 지키고 SharedArrayBuffer를 거부한다. Caller byte buffer의 동시 변경에 권한을
주지 않는다. Raw byte wrapper의 copy/실패 순서는 그대로다.

첫 개념은 전체 입력 byte array를 여전히 갖더라도 SHA의 전체 padding copy를 없애고 두 경로가
같은 scalar 압축을 재사용할 토대다. 이것만으로 encoder 전체 할당이나100ms가 해결됐다고
주장하지 않는다. State API에는 시간/abort/callback을 넣지 않고 scheduler가 chunk 사이에서 검사한다.
Safe integer byte sum과 SHA64bit bit-length 분할을 검산한다. 기존 동기 입력이 받을 수 없었던
새 거대 byte 길이를 묵시 허용하는 정책은 만들지 않는다.

## 3. 두 번째 개념: scalar JSON와 tagged cursor

예상 scalar owner는 `src/core/jsonText.js`, tagged 형태/오류의 정본은 기존 `valueEncoding.js`다.
Source-neutral JSON scalar emit/byte-count가 공통 Unicode 규칙을 소유하고, inference의 현재
byte-count와 후행 bounded writer가 같은 규칙을 사용한다. `JSON.stringify`를 수학 oracle로 쓰되
큰 string 전체를 사전할당하는 방식은 후행 writer에서 사용하지 않는다. Finite Number는 native
JSON 숫자 표기를 유지하며 임의 decimal formatter를 만들지 않는다.

후행 `createEncodedValueCursor(value, limits)`/`advanceEncodedValue(cursor, sink, chunkBudget)`는
새 public codec가 아니라 private tagged byte traversal이다. 기존 encodeValue와 scalar tag 생성·
container 분류·error path 구성을 같은 owner에서 공유한다. Tag 종류를 두 목록으로 관리하거나
별도 route-only serializer를 만들지 않는다. `shared` array encoding/ref table은 이번 범위에서
제외하며 기존 persistence/animation codec에 cursor를 자동 연결하지 않는다.

- Stack은 depth만큼의 cursor이며 다음 index/own key와 tag delimiter 위치를 보유한다.
- Array length는 할당/순회 전 해당 caller quota로 검사하고 hole/undefined를 구분한다.
- Object entry는 원 native 순서를 지킨다. Tagged pair array에 raw-key sort를 적용하지 않는다.
- 같은 DAG 객체의 각 occurrence를 원 encoding처럼 계산한다. ancestor만 cycle 검사에 쓰며
  global seen dedupe로 bytes/hash를 줄이지 않는다.
- Quote/control/surrogate state는 UTF16 cursor에 남겨 boundary를 지나도 같은 bytes를 만든다.
- Byte quota는 매 append 전에 검사한다. Input string의 `length+2` 최소 byte도 먼저 검사한다.
- Sink는 private SHA update 또는 bounded byte chunk writer이며 사용자 callback/plugin이 아니다.
  Request metadata를 원문 token/message로 내보내지 않는다.

기존 generic `encodeValue`는 Object.entries가 getter 값을 한꺼번에 읽은 뒤 자식으로 내려간다.
현재 baseline은 부모b getter→자식 getter 순서다. Symbol key/hidden property 검사는 그 읽기보다
먼저 실패한다. `canonicalJSON`도 domain validator가 아니며 raw own getter를 읽을 수 있다.
반대로 route/inference own-data preflight는 getter0으로 거부한다. 따라서 strict cursor를
기존 generic sync 함수의 replacement로 한 번에 넣지 않는다. Sync helper는 기존 snapshot/read/
error 순서를 보존하면서 scalar owner만 공유한다. 새 strict cursor는 v2 caller의 닫힌 준비 경계에
명시 사용하고 그 오류순서를 별도 검증한다.

## 4. preallocation과100ms를 막는 실제 원자 연산

아래 연산은 JS 안에서 중간 yield가 불가능하다. 이 한계를 숨긴 채 '1024개마다 yield'로 전체
100ms를 보장한다고 말하지 않는다.

| 현재 연산 | 위험 | 이번 최소안/남은 결정 |
|---|---|---|
| Object.getOwnPropertyDescriptors/Names, Reflect.ownKeys | 큰 record의 전체 목록·descriptor를 한 번에 할당 | closed schema의 작은 record는 허용; arbitrary 넓은 attributes의 첫 검사/키 목록 보유는 별도 boundary 필요 |
| Object.keys(...).sort() | 넓은 raw record의 큰 배열+정렬을 한 번에 수행 | tagged 경로는 이 sort 불필요; generic raw canonical의 재작성은 첫 개념에서 제외 |
| BigInt.toString() | 매우 큰 하나의 scalar 변환은 길이 확정 전 비용 발생 | legacy sync는 그대로; v2의 실제 native BigInt/attribute 길이 상계나 별도 incremental 변환안 없이는100ms 닫지 않음 |
| TextEncoder 전체 encode | 모든 text의 UTF8 할당 | 새 bounded writer는 native 작은 scalar/순회 가능한 string spans만 배출 |
| structured clone/postMessage | 큰 object/packet을 동기로 복사할 수 있음 | encoded bounded packet chunk/transfer가 필요한지 v2 wire 선택과 함께 별도 채택; worker만 취소해 main copy를 선점한다고 주장하지 않음 |
| final clone/materialization | 객체가 많으면 합법값이어도 sync 구간 큼 | exact source proof 뒤 incremental owned copy·prepared plan 소비, native materialization도별도 stage 계측 |

BigInt는 graph attribute에서 허용된다. Native route의 order keys는 현재 숫자 ranks로 내려오지만
그 사실로 model attribute 전체에 bigint가 없다고 추정할 수 없다. 비공개 core가 arbitrary 큰
BigInt를 새로 거부하거나 node attributes를 hash에서 빼는 일은 하지 않는다.

기존 native deep-owned object의 shape proof를 재사용하는 것은 가능하지만 `isOwned`나 shallow
freeze만으로 새 검증 권한을 만들지 않는다. 이미 완전 검증된 exact object+exact policy에 대해
해당 domain owner가 권한을 부여해야 한다. Core cursor는 receiver/token/ref를 모르며 proof의
생성/수명은 graph route preparation에 남는다. 거대한 외부 record를 inspection 전에 size를
알 수 있다는 가정도 하지 않는다. 이 부분의 구체 해결 전 v2 전체100ms는 미완료다.

원100 diagnostic completion9,821,768B에서는 적어도 원 payload/태그 tree/text/UTF8/SHA padding의
중복이 존재한다. SHA 추출은 padding만 없앤다. 후행 cursor가 나머지 text/tag tree를 없애더라도
root와 worker 양쪽 packet/object가 공존할 수 있으므로 maxBytes·numeric reservation·object
cardinality·host heap을 같은 숫자로 부르지 않는다. 기존 program persistence의 없는 전역 byte
한도를 새로 가정하거나 도입하지 않는다.

## 5. sync default, v2 실패 순서와 취소

기존 public prepare→commit과 v1 job/result/codec/hash는 바이트 동일하게 유지한다. 새 scalar
core를 써도 Full/Basic import/constructor 권한과 token/ref 검사는 원 domain owner 책임이다.
해시가 같다는 사실은 입력 객체의 authenticity를 증명하지 않는다.

V2 준비 단계안은 native signal/receiver/token header→closed policy→선언 length/byte 최소량→
각 descriptor/shape/source binding→canonical bytes/hash→deep-owned result/metric/order proof→
최종 identity 확인 순서다. Scope/authority는 기존 route validator를 재사용한다. Unknown fields,
accessor, own undefined, sparse/dense mismatch, bad refs와 byte 초과가 함께 있는 fixture에서
정확한 우선순위를 고정한다. 기존 v1과 generic encodeValue의 오류순서는 바꾸지 않는다.

Async orchestration은 실제 macrotask를 yield한다. Promise.resolve 반복은 abort event를
처리하지 못한다. 첫 후보는 elapsed20ms/descriptor1024/UTF16units4096/bytes64KiB 중 먼저 도달한
경계에서 반환하는 것이며, 이 숫자도 성능 사실이 아니라 검증할 초기 구현값이다. Worker message
및 cursor 재개 전에 signal을 검사하고 late callback은 frame/data를 읽지 않는다. Cancel 후
state/tail/chunk/value stack·closure를 해제하고 terminal1회·commit0을 보장해야 한다.

SHA pure state는 AbortSignal을 저장하지 않는다. Synchronous sync API는 끝까지 drain하며
새 cancel 옵션이 없다. V2 wrapper가 native abort/deadline 및 actual timer를 소유한다.
100ms는 fake clock만으로 검증하지 않고 실제 Chromium에서 각 stage 도중 scheduled abort→
terminal까지 측정한다. 큰 원자 연산이 남거나 UI event가 밀리면 그 stage는 실패로 기록한다.

## 6. 구현 시 검증 순서

1. SHA compression을 옮기고 기존 contentDigest/bytes wrappers의 fixed vectors, 독립 Node crypto,
   padding55/56/63/64/65/119/120/127/128/129, chunk별0/1/63/64/mixed, UTF8 split/surrogate를
   모두 검산한다. 초기 byte길이/실패/SAB/subview/clone의 원 동작을 보존한다.
2. JSON scalar owner는 existing inference UTF16 전65536검사를 재사용하고 mixed units·property
   keys·quota exact/-1·number extremes·-0/NaN/BigInt/tag-like/hole를 독립 native JSON/TextEncoder로
   확인한다. 기존 sync source-free data/asset/graph/animation hash/codec consumers도 실제 실행한다.
3. Strict cursor는 원 generator 결과 전체 byte와 hash를 비교한다. 원 입력 불변, cycle/shared DAG,
   own undefined/accessor/inherited/symbol/hidden/extra array property, depth/work/byte limits,
   오류 우선순위와 실패 후 clear를 검사한다. 모든 event loop chunk boundary를 반복 중단한다.
4. Existing v1 default는 old-source hash/output/codec와 byte identical, unsupported 값 오류도
   동일함을 확인한다. 후행 opt-in v2의 새 실패는 별도명시하고 old behavior로 소급하지 않는다.
5. 동일 package Node20/22/24·실제 browser macrotask 취소·authority tests를 마감한 뒤에만
   route v2 preparation에 연결한다. 원100/1k/10k/P95는 별도의 CPU 예약·전체정책 인수다.

우선 채택 요청은 **SHA private state 추출+기존 sync wrapper 검증**에 한정한다. Encoder는
위 scalar/tag 분리와 legacy getter/error precedence의 baseline까지 구체화했으며, arbitrary
wide record/BigInt/structured-clone/최종 materialization의 취소 한계는 남는 설계로 명시한다.
이 문서만으로 core/route public 정책 구현이나 AT82 완료를 선언하지 않는다.
