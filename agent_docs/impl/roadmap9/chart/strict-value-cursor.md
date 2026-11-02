# Deep-owned snapshot 전용 private tagged writer

## 진행 상태

- [x] 2026-11-02 root의 구체 범위 채택; 기존 remainingApproval 재사용
- [x] JSON count와 bounded writer의 Unicode owner 공유
- [x] Value encoding의 scalar/container/hole 정본을 공유하는 private strict cursor
- [x] UTF16·bytes/hash·동기 getter/error compatibility·소유권·취소·3Node 동일 package 검증
- [ ] 검증된 source/evidence commit·push

Root는 [연결 경계 검토](route-cursor-callsite-review.md)를 읽고
[기존 전체 승인](../AUTHORIZATION.json#L32)으로 다음 범위를 채택했다.
기존 JSON count의 allocation-free scalar 계산과 최소/최종 quota 순서를 보존하면서 bounded writer를
같은 Unicode owner에 연결한다. 기존 scalar tags와 container/hole fragments는 valueEncoding의
단일 owner를 공유한다. Strict traversal은 별도 private pure cursor이고 deep-owned native snapshot과
명시 own-data 검사를 요구한다. 기존 SHA owner만 사용하며 failure/cancel clear와 publication0을 검증한다.

이번 checkpoint는 v1 `routeValueHash`, generic `encodeValue`의 getter/error 순서, public v2/host async
경로를 바꾸지 않는다. Job의 body와 solver result는 이미 deep-owned지만 연결하면 기존 hash·clone
실패순서 및 sync wrappers의 검증 범위가 넓어진다. 따라서 이 checkpoint에서는 actual native inputs를
private cursor로 검산하고 public job 경로 연결은 후속으로 둔다. 새 proof registry를 만들지 않는다.
Core ownership은 mutation 방지 요건이며 domain 인증/receiver·token 권한을 부여하지 않는다.

제품 runtime에서 source 본문을 읽거나 동적 생성하지 않는다. BigInt decimal 변환, wide keys,
초기 validation/snapshot/transport 및 materialization은 아직 nonpreemptible이며100ms/route v2
numeric maxima나 large route 지원 완료를 주장하지 않는다. 수치 guard를 낮추지 않는다.

## 제품 경계

`createEncodedValueCursor(snapshot, {maxBytes,maxDepth,maxSteps})`는 package export가 아닌 private
core 함수다. Limits는 own positive safe integers이며 depth 상한128이다. Advance의 explicit byte
상한65536/step 상한4096은 한 번에 반환하는 scratch와 iterator 진행량만 제한한다. 기존 route
work guard를 대체하지 않는다. Primitive는 기존 scalar owner가 해석하며 모든 container는 deep-owned
reference와 own-data shape를 요구한다. Core ownership만으로 native job/receiver 권한을 부여하지 않는다.

배열 holes와 own undefined를 구분하고 shared DAG occurrence마다 원 bytes를 출력한다. Native object
entry 순서는 유지하며 raw canonical의 key sort를 도입하지 않는다. 완료/실패/clear 후에는 resume을
거부하고 invalid advance budget도 state를 clear한다. Clear는 idempotent다. Iterator·pending atom·
ancestor references는 해제하며 weak registry key는 opaque empty frozen handle이다.

`writeJSONStringBytes`는 primitive string의 minimum quota를 escaping 전에 확인하고 최대2 UTF16
unit만 native JSON/TextEncoder에 전달한다. Count는 동일 numeric width helper를 사용하면서 객체나
escape bytes를 할당하지 않고 기존 minimum/final quota 두 검사를 유지한다. Writer의 각 atom은
최대6bytes다. 기존 `encodeValue` 본문에서는 container tag/hole 생성만 같은 private fragment helper로
연결했고 scalar/descriptor/getter/shared-array 순서는 유지했다.

## 검증

[qualification.json](strict-value-cursor-evidence/qualification.json)이 source SHA, archive와 raw evidence를
고정한다. Node22 owning14/14와3개 core owner 각각100/100/100, 기존 persistence/hash/route host56,
inference13, 경계34, documentation-truth3를 통과했다. 최초 quota0 기대 문자열 오류와 harness 경로
검사 실패는 원 로그에 남기며 제품 통과로 계산하지 않는다.

Node20/22/24는 동일 archive에서 private14(UTF16 전65536 포함), public12(assets/animation/routes/
inference), strict type, canonical route 문서예제, optional peers 및6entry bundle을 검증했다.
각 Node의 실제 native world/screen job body/result/completion 및 추가2개 입력은 chunk4종에서
전체 bytes·독립 SHA가 같다. Actual host request/worker mutation 격리와 receiver/token/action4개
거부, signal/cleanup은 원 preparation 경로로 확인했다.

같은 archive만 설치한 production-minified Chromium bundle도 bytes/WebCrypto SHA 및 timer abort3개를
검산했다. Metafile의 runtime 입력은 installed package 안에 한정한다. Cancellation은 digest
publication0/terminal1/clear를 확인한 것이며 latency 목표나 전체 native preparation 자격은 아니다.

새 package는1260entries/unpacked8160231B다. Node20/24 packed1814149B의 최소cap1814200,
unpacked8160300을 적용했다. Full788848/Basic426217 gzip에는 최소100B 상한788900/426300을 적용한다.
최초 entry/packed 및 bundle 실패 receipt를 보존했다. 새 writer/cursor는 public API/declarations/current
contracts를 바꾸지 않으므로 새 공개 문법이나 미구현 v2를 문서화하지 않는다.
