# Route v2 native create/edit 구현

## 진행 상태

- [x] 기존 remainingApproval 아래 root의 구체 제안 채택 기록
- [x] v1 보존 및 v2 policy/header/async compute/prepare/create/edit 연결
- [x] deadline·취소·정리·단일 request ledger·원 proof 권위
- [x] source-free 동일 archive, Node20/22/24 및 browser·critical 검증
- [ ] 원100ms 전체 stage와 큰 density capacity/SLO/heap 증거
- [ ] B native update 전체 union 후속 checkpoint

2026-11-02 root가 [f9aa772b의 구체 제안](route-v2-proposal.md)을 읽고 다음과 같이 채택했다.
“기존 remainingApproval 아래 v2 opt-in policy/header/API/원 registry·aggregate ledger 설계를 채택합니다.”
이는 [기록된 사용자 승인](../AUTHORIZATION.json#remainingApproval)을 구체화한 구현 결정이다.
별도 사용자 질문 없이 계속한다. Base는 root `af936021b`, proposal만 `f9aa772b`에서 merge했다.

첫 checkpoint는 public stub를 공개하지 않고 authentic prepare/create/edit의 전체 좁은 경로를
기능적으로 연결한다. v1 sync/hash/getter/error/limits를 유지하고 v2에만 채택한5필드 capacity policy,
저장 version2, 명시 async worker API, deadline과 lifecycle을 적용한다. 기존 validatedJobs 및
prepared handle registry의 소유권을 유지한다. B native update 전체 union은 다음 checkpoint 의무다.

숫자 상한은 capacity admission이며 원 density1k/10k 완주나 전체100ms 증거가 아니다. Snapshot,
wide keys/BigInt, postMessage, result validation, final materialization의 잔여 동기 구간을 별도로
검증한다. 모든 큰 실행은 root CPU 슬롯을 배정받은 뒤에만 수행한다. PR/publish/deploy는 없다.

## 첫 coherent checkpoint의 소유권과 범위

구체 채택은 [root 채택 기록](route-v2-adoption.md)을 따른다. root의 `a3f385c69`에 기록한
Full native plan 연결 경계도 동일 파일로 동기화했다. Full의 `registerEdgeRouteActions`가
exact constructor에 native planner를 한 번 연결하고 graph 준비 owner는 이를 조회한다.
상속 fallback·일반 registry API·새 proof는 없다. 원 prepared WeakMap이 base, constructor,
kind, token, signal과 최종 사용 권한을 그대로 소유한다.

준비 과정은 원 native input validation, immutable snapshot, job hash, 전용 worker,
completion snapshot/hash, resource validation, consumer plan까지 하나의 ledger와 deadline으로
연결한다. 최종 facade는 준비 누적량을 복사한 ledger에서 검산 비용을 이어 합산하며 원
`editSemantic`와 materialization children 및 wrapper theme/action completion을 실행한다.
같은 immutable base에 handle을 다시 적용하는 독립 호출은 이전 적용 비용을 섞지 않는다.
취소·실패·deadline은 iterator와 worker/listener를 정리하고 publication을 하지 않는다.

v1 입력·동기 API·hash·getter/error 순서와 기존 guard를 유지했다. v2는 explicit execution과
새 async entry/준비 경로를 요구하며 exact edge-route/version2만 원 Full validator에 연결한다.
Basic, 미등록 constructor, 다른 kind의 version2, execution 없는 version2는 거부한다.
직접 raw v2 create/edit는 준비 경로로 안내하며 미연결 public stub는 없다.

## 검증

- 동일 archive SHA-256 `f55a48de094c1153174ea81f2671f74f2ddba90f2bfcc4c283e6b7a1751ccbcb`:
  1,266 entries, packed 1,823,649B, unpacked 8,196,860B. 필요한 예산만 측정값에 맞춰 조정했다.
- Node20.20.2 /22.23.1 /24.22.1: owning unit 155개씩 통과. strict cursor,
  jsonText, valueEncoding의 lines/branches/functions 각각100%. 신규 및 기존 route critical floor 유지.
- 세 런타임 모두 동일 source-free archive 설치 후 4method × world/screen 8개 native 생성·수정,
  원 v1 geometry exact equality, 독립 tagged/SHA oracle, 저장/복원, hostile getter,
  await 이전 mutation snapshot, 취소·진위·버전 검사를 수행했다. Worker16/terminate16/listener0.
- 동일 archive public types positive/negative 및 6entry production bundle 검산. Node20/24 최대 gzip:
  Full792,657B, Basic426,289B, SVG25,672B, graph74,445B, animation341,583B,
  interaction137,529B. Graph124개 source modules 및 pure worker39개(source esbuild entry 포함)는
  Full/action/renderer/Node 유입0. 설치 bundle의 실제 worker source modules는38개다.
- Chromium153 production minified public package에서 real worker, Canvas ink, SVG, offline restore,
  abort/deadline publication0·terminal1, worker7/terminate7/listener0를 확인했다.
  새 공개 문서의 정확한 두 코드 블록도 browser에서 실행했다.
- 문서·current types·source boundary 관련65개 통과. 첫 실패(문서 snippet 등록/provenance/search
  index cap, Node20 coverage flag, isolated browser dependency 경계)는 원 로그와 수정 결과를 함께 보존했다.
- 직접 실행: `python3 agent_docs/impl/roadmap9/chart/route-v2-native-evidence/record.py`,
  `node agent_docs/impl/roadmap9/chart/route-v2-native-evidence/verify.mjs`.
  [qualification.json](route-v2-native-evidence/qualification.json)은 exact source hashes,
  archive source bytes, 압축된 원 receipts와 그 hash를 결박한다. 큰 archive 자체는 gitignored다.

## 남은 의무

이 checkpoint는 authentic native create/edit 경로까지다. B 전체 source/layout/viewport/fit 및
원 native update union은 완료하지 않았으며 다음 checkpoint에서 그대로 구현한다. 기존332개
후보를 wildcard로 바꾸거나 일부만 완료로 처리하지 않는다.

Snapshot 취득, wide keys, BigInt decimal, structured clone/postMessage, geometry validation과
최종 materialization은 동기 구간이 남는다. 전 구간100ms나 density1k/10k capacity/SLO/heap는
검증하지 않았다. v2 숫자 상한은 admission일 뿐 완료 성능 증거가 아니다. 큰 실행은 Geo 작업의
CPU slot이 끝난 뒤 root와 조율한다. PR·배포·publish는 수행하지 않았다.

## 엔진 간 density 차이의 정확한 범위

추가 cross-engine 비교에서 Node20/22의 density payload는 동일하며 Node24에서는 schedule
iteration4 bandwidth가 `0.03280500000000001`에서 `0.032805`로 달랐다(차이
`6.938893903907228e-18`). 이 fixture에서는 차이가 schedule에만 국한되지 않고 controlPoints,
commands 및 bounds에도 전파된다. 최대 좌표 차이는 `1.491355967608854e-6`이며 provenance는
동일하다. 원 v1과 v2 각각에서 동일한 경로·수치 차이가 관측되었고 각 엔진 내 v1/v2 routes는
허용오차 없는 exact equality다. [기존 계약](../../../contract/current/EDGE_ROUTES.md)은
engine 간 solver 전체 bit 동일성을 보장하지 않는다. 해시는 각 반환 payload의 정확한 bytes를
결박한다. 좌표나 hash oracle에 허용오차를 추가하거나 수치 정규화를 하지 않았다.

`numeric.mjs`는 동일 설치 archive의 public API로 각 엔진의 원 결과를 추출하고 좌표/제어점/
provenance/schedule 별 첫 차이·최대 차이·전체 차이를 기록한다. 모든 원 결과와 비교 receipt를
압축 보존했다. bandwidth 연산 차이 외 다른 엔진 수학 연산이 기여하지 않았다는 인과 배제까지
증명하지는 않았으며, 엔진 간 geometry/hash 동일성을 주장하지 않는다.
