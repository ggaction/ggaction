# Density weight/angle packed 저장

## 진행 상태

- [x] 전체 승인과 root의 `4c12b1326` 구체안 채택 재사용
- [x] 기존 scalar 계산을 공유하는 private weight/angle/offset 저장 구현
- [x] directed/undirected 각 20회 field·좌표·진단값·hash exact 비교
- [x] 이전 전체 kernel과 Node20/22/24의 같은-engine 결과 비교
- [x] 원100/1000/10000의 기존 guard 실패와 세부값 보존
- [x] 할당 전 byte 예약·abort·부분 실패 정리와 독립 dense oracle 검증
- [x] 같은 archive의 3개 Node 소비자 및 문서·최종 package 검사
- [ ] 큰 bounded-worker 정책 및 원 큰 입력/P95 — 별도 미완료

[AUTHORIZATION.remainingApproval](../AUTHORIZATION.json)과 2026-11-02 root의
“weight/angle Float64 두개+offsets; 좌표는 기존 route 참조 … 모든 기존 guard·charge·diagnostics/hash/API/schema 그대로”
지시를 재사용한다. [채택된 설계](density-packed-samples-design.md)의 첫 private 보관 개념만
반영한다. [bounded-worker 수치 정책](route-bounded-worker-design.md)은 이 변경에 포함하지 않는다.

## 보관과 수명

`grammar/graph/routes/densitySamples.js`가 각 간선의 segment length를 같은 순서로 계산하고
finite 검사를 한 뒤 weight와 tangent/zero fallback/atan2를 정확히 한 번 계산한다.
기존 object-sample 함수와 새 packed 함수가 이 scalar helper를 공유한다. 좌표는 원 routes에
그대로 있으며 weight·angle은 각각 Float64Array(S), 간선별 시작 위치는 Uint32Array(E+1)에 둔다.
별도 flat reference 배열이나 매 샘플 wrapper 객체를 만들지 않는다. 한 간선의 최대 segment
수 L만큼의 Float64 scratch를 공유하며, 이전 간선의 남은 값은 읽지 않는다.

상계는 기존 sample guard가 허용한 S/E/L에서 유도한 `16S+4(E+1)+8L` bytes다.
safe integer·Uint32 범위를 검증하고 각 직접 배열 할당 전에 native signal과 예약 합계를
검사한다. 새 public byte cap이나 전역 guard가 아니다. 이는 직접 소유한 typed buffer 크기이며
Map·좌표 객체·allocator·GC를 포함한 전체 JS heap 보장이 아니다. scratch는 준비 직후,
weight/angle/offset은 field/advection/resample 이후 finally에서 해제한다. 부분 할당 실패와
수치 오류·abort도 후보를 반환하지 않고 해당 참조를 해제한다.

Field는 기존 sample→y→x→channel 순서로 네 숫자를 공통 누적 helper에 전달한다.
compact kernel, hypot, padded chord, channel fraction, 실제 값이 0으로 반올림되어도
삽입하는 Map 항목의 순서를 유지한다. Bounds는 같은 route→point 순서의 Math.min/max다.
Advection은 처음 저장한 angle을 그대로 읽으며 field 뒤에 tangent를 재계산하지 않는다.
Smoothing/resampling과 최종 객체 좌표는 기존 owner가 처리한다.

## 외부 관측 정보

`density-v1`, 20회 bandwidth schedule, options, edge 순서, 원 행,
endpoint와 signed zero, 모든 좌표·bounds·진단값·canonical resultHash를 유지한다.
`sampleCount*24`, `6S+2E`, field 및 resampling의 기존 charge는 변경하지 않는다.
저장 객체가 줄었다는 이유로 기존 conservative work/sample diagnostics를 낮추지 않는다.
공개 API·선언·schema·worker envelope·수학·renderer·벤치마크 도구에는 변경이 없다.
기존 grammar 내부의 보관 구현 교체로, macro architecture나 package export 경계도 유지한다.

원 입력의 이전 kernel(`4c12b1326`)과 현재 kernel이 동일하게 거부한 경계는 다음과 같다.

| 원 간선 수 | 기존 실패 | 실제 값 | 한도 |
|---:|---|---:|---:|
| 100 | Route work | 10,000,002 | 10,000,000 |
| 1,000 | Route work | 10,000,008 | 10,000,000 |
| 10,000 | Route active samples | 13,400,000 | 10,000,000 |

이 세 실패는 안전한 거부 증거이며 큰 입력 지원 통과가 아니다. 한도 해제나 sample/iteration
삭제 없이 원 입력 전체를 준비해 name/message/code/optionPath/limit/actual을 직접 비교했다.

## 검증과 남은 범위

`density-storage.test.js`는 packed/object 경로의 directed·undirected 20회 전체 field Map
삽입 순서와 값, advection/smoothing/resampling의 모든 좌표, diagnostics와 최종 hash를
비교한다. independent dense field oracle와 기존 literal 검사는 수학 근거를 별도로 유지한다.
±0, 중복점, zero-length, 극소값의 zero Map insertion, overflow, 낮은 sample 한도,
4개 할당 각각의 실패와 abort, 불변 입력, 실패 후 정상 호출을 포함한다.

원 source를 `git show`로 별도 모듈에 읽는 [compare.mjs](density-storage-evidence/compare.mjs)는
최적화 이전 field와 density kernel을 현재 입력에서 실행해 **전체 결과**를 비교한다.
Node20/22/24 각각에서 old/new 결과·hash가 정확히 같다. 엔진 간 solver bit-exact라는
추가 계약은 만들지 않는다. 원 큰 입력의 guard 비교는 Node22에서만 실행했다.

집중 17개 source 검사, 공유 route/presentation 92개와 17개 critical owner의 95/90/100
floor가 통과했다. 새 storage owner는 100/97.22/100, density/field는 각각 100/100/100이다.
동일 `727f9144…` archive의 Node24/22/20 각각 5개 runtime, strict types, 정본문서 1개,
optional peers가 통과했다. Node24의 최초 bundle-only 실패는 보존하고 같은 18개 실측값을
Full787,000/graph68,900 최소 상한에서 재검산했다. 다른 4개 entry 상한은 그대로다.
package는 1,248 entries, unpacked8,064,255B이며 packed는 Node22 1,786,643B,
Node20/24 1,790,005B다. 최초 entry/packed cap 실패와 최종 상한 조정을 모두 남겼다.
Focused contracts42, package/documentation-truth10, 문서 link8, canonical snippet2가
통과했다. 실제 설치·문서·타입·package 크기와 최초 실패는
[qualification](density-storage-evidence/qualification.json)에 함께 기록한다.

이 체크포인트는 메모리 표현 최적화다. 큰 bounded-worker 정책·완전 native update union,
원 큰 입력의 완주, 전용 CPU P95, retained heap/100cycle, STEP071/077 완료는 남아 있다.
