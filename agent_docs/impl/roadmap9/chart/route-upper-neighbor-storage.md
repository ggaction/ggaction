# FDEB upper-neighbor typed 저장

## 진행 상태

- [x] 기존 전체 승인과 root의 2026-11-02 구체 채택 기록
- [x] 순수 prototype의 825회 exact 비교를 실제 기존 FDEB owner에 반영
- [x] 원100의 이전 kernel 전체 결과·진단값·hash를 Node20/22/24에서 비교
- [x] 원 작업량·candidate·sample 한도, 고정 schedule 및 scalar 덧셈 순서 보존
- [x] 직접 buffer 할당 전 예약과 overflow/abort/부분 할당 실패 정리 검증
- [x] 동일 archive3Node·문서·번들 최종 증거 마감
- [ ] 큰 bounded-worker 정책 및 원1k/10k solver/P95 — 별도 미완료

[AUTHORIZATION.remainingApproval](../AUTHORIZATION.json)과 root의 다음 구체 지시를 재사용한다:
“방금825회exact검산한typed upper-neighbor storage를 실제기존FDEB owner에 좁게포팅 …
기존default guard/maxCandidatePairs/maxSamples/work·fixedschedule·scalar순서·v1diagnostics/hash/output·publicAPI/schema 모두그대로”.
기존 [prototype](route-capacity-evidence/force-buffer-qualification.json)의 제품 반영이며,
[bounded worker 설계](route-bounded-worker-design.md)의 수치 cap이나 v2/API를 채택한 기록이 아니다.

## 표현과 수명

`grammar/graph/routes/forceNeighbors.js`가 기존 FDEB의 검증·예산 검사를 끝낸 순서의 active
edge만 받는다. 원 compatibility pair를 같은 i/j 순서로 한 번 계산하고, 통과한 upper pair만
Uint32 target·Float64 compatibility·Uint8 reverse에 보관한다. Reverse 값을 수치식에서
재추론하지 않는다. Edge별 Uint32 offsets와 양쪽 degree는 이전 neighbors 길이를 그대로 나타낸다.

Chunk는 최대32,768 pair이며 마지막 capacity는 남은 원 candidate 수로 제한한다. Header의
8E+4 bytes 및 각 chunk의13×capacity bytes를 그 chunk의 첫 배열 할당 전에 예약한다.
최대 예약은 같은 candidate C에서 유도한8E+4+13C이며 새 public byte cap이 아니다.
별도 consolidation 배열을 만들지 않는다. 수치 overflow·사전 abort·부분 할당 실패는 후보를
반환하지 않고 참조를 해제한다. 정상·예산 실패·finalization 실패도 caller의 finally에서 정리한다.
이 byte 수는 직접 소유한 typed buffers만의 크기이며 JS 객체/배열/엔진 heap 총량 보장이 아니다.

원100은 C=4,950/A=750이어서 한 chunk가4,950 pair 용량을 예약한다(65,154 bytes).
항상13A만 할당한다고 주장하지 않는다. 새 표현은 A개의 upper pair를 저장하며 이전의2A개
neighbor 객체를 만들지 않는다. 실제 heap/P95 절감량은 이번 기능 검사의 결론이 아니다.

## 수치·관측 정보 보존

`advanceForceRoutes`의 pair 방문 순서는 원 edge→upper neighbor 순서와 같다. 각 현재 point의
기여를 기존 scalar 순서로 누적하고 반대쪽은 기존 `point.x-q.x`/`point.y-q.y`를 그대로 실행한다.
부호 반전이나 합 재결합으로 negative zero를 바꾸지 않는다. 기존 private array-neighbor
경로는 scalar oracle와 기존 호출을 위해 유지한다. 공개 입력에 이 표현을 노출하지 않는다.

Candidate pair×16과 fixed schedule work를 포함한 기존 모든 charge는 그대로다. 저장 객체를
줄인 것을 수학 work를 줄인 것으로 기록하지 않는다. `force-directed@1`, options, 좌표, bounds,
원 edge 순서, provenance compatibilityCount, diagnostics 및 canonical resultHash가 동일하다.
공개 API/types/schema/renderer/worker envelope는 바뀌지 않는다. Current는 저장 표현 변경이
외부 결과를 바꾸지 않는 이 불변성만 명시한다. 기존 grammar 내부 책임의 구현 교체이므로
macro architecture·materialization·renderer·package export 경계의 변경은 없다.

## 검증

- `force-neighbor-storage.test.js`: 원100 기본/17-pair chunk, reversed/-0/zero/coincident,
  directed/threshold1, below-epsilon 다섯 입력×165회=825회. 독립 scalar oracle 및 이전
  symmetric-array 계산의 전체 routes/displacementCaps와 deep equality. 입력 불변성·degree/
  pair 순서·예약·dispose·abort·allocation 실패·finite overflow를 포함한다.
- 원100의 이전 source68627051f와 현재 source를 같은 입력에서 직접 비교한다. 원100 결과는
  work1,264,670 / candidates4,950 / compatible750 / peakSamples7,000 / iterations165이며
  hash는 `212ae9c180c0db17f20d80728de1e12309e20ce7765bb732059b0ac030996322`다.
  Node20/22/24에서 전체 결과와 hash가 같다. 이 입력 이외 engine간 bit-exact 일반보장은 추가하지 않는다.
- 공유 route+presentation88개 통과,16개 route owner의95/90/100 floor 통과. 새 owner100/96.43/100,
  수정 FDEB owner100/100/100. 최초 route-only coverage의 polyline 누락은 실제 presentation 입력을
  추가한 최종88개 실행으로 구분한다.
- 동일 `1a304ca5…` archive의 Node20/22/24 각각5 runtime·strict TS·문서1·optional peers 통과.
  최종18개 bundle 측정은 Full786,500/graph68,400 최소 상한에서 모두 통과한다. 최초 실패
  receipt의 상태를 덮지 않고 같은 수치의 재검산을 별도로 기록한다. contracts45/45, 문서3/3,
  architecture/documentation-truth4/4다.
- 설치·타입·문서·bundle 및 원본 실패는 [qualification](route-neighbor-storage-evidence/qualification.json)에 기록한다.

원1k/10k는 이번 제품 코드에서 solver를 실행하거나 guard를 해제하지 않았다. AT82 큰 입력
admission,30초SLO,전용CPU P95,retained heap/100cycle은 [기존 설계](route-bounded-worker-design.md)의
미완료 항목으로 유지한다. 이번 체크포인트를 STEP071/077 완료로 집계하지 않는다.
