# Density sample 보관 최소안 — 채택된 private 저장 변경

## 진행 상태

- [x] 기존 source와 첫 반복의 실제 dataflow를 대조
- [x] 원100/1000 초기 준비만 실행하고 모든 weight/angle의 binary64 동일성 검산
- [x] 이전 first-field 계측의 source hash가 현재 owner와 같은지 확인
- [x] 아래 private packed sample 제품 변경의 root 채택
- [x] 실제 field/advection/20회 완주·실패 경계·기존 diagnostics/hash 동등성
- [x] 같은 archive의 3개 Node 소비자 및 최종 문서 검증
- [ ] bounded route v2 수치 policy·native update union 완결·원 큰 입력·최종 P95

[전체 승인](../AUTHORIZATION.json)의 remainingApproval 안에서 준비한 구체안이다. Root가 채택한
[B native update 방향](route-native-update-boundary.md)과 구분한다. 최초 `4c12b1326` 감사 기록은
제품 source를 바꾸지 않았고, 2026-11-02 root가 이 문서의 첫 private 보관 개념을 채택했다.
이후 구현은 [자격 기록](density-packed-samples.md)에 따로 남긴다. 공개 API/schema, guard,
benchmark 도구는 바꾸지 않는다. 큰 입력의 지원 또는
AT82 완료를 의미하지 않는다. 기존 FDEB [upper-neighbor checkpoint](route-upper-neighbor-storage.md)는 보존한다.

## 확인한 첫 반복

[실행 script](route-capacity-evidence/density-packed-audit.mjs)와
[결과](route-capacity-evidence/density-packed-audit.json)는 원 non-hierarchical route fixture의
100/1000 node/edge를 기존 native graph/layout/route-input owner로 준비했다. 초기 resample 이후
**field 생성 전에 중단**했다. 새로 수행한 비교는 490,400개의 weight/angle 값과 ±0·중복점·역방향·
극소 좌표 24개이며 모두 `Object.is` 동일했다. 별도 제품 배열·guard를 바꾼 실행은 없다.

| 초기 항목 | 원100 | 원1000 |
|---|---:|---:|
| 샘플 S | 22,200 | 223,000 |
| 최대 간선 샘플 | 222 | 223 |
| 입력 준비 work | 62,820 | 652,020 |
| 초기 resample + 첫 sample×24 이후 work | 617,820 | 6,227,020 |
| 현행 최초 live sample charge `6S+2E` | 133,400 | 1,340,000 |
| 첫 field 예정 charge `S+rows+candidates` | 10,652,170 | 107,027,318 |
| 첫 field까지 예정 누적 work | 11,269,990 | 113,254,338 |
| weight+angle+offset의 typed payload | 355,604B | 3,572,004B |
| 한 간선 length scratch 최대 | 1,768B | 1,776B |

Field의 row/candidate 수는 [기존 감사](density-budget-evidence/audit.json)를 재사용했다.
`density.js`, `densityField.js`, `budget.js`의 SHA256 일치를 script가 검사한다. 마지막 두 work 값은
기존 charge 수식과 저장된 첫 field 계측의 합이며, 한도를 풀어 field를 완성했다는 뜻이 아니다.
현재 10M work guard는 두 입력 모두 첫 field 중에 거부한다. Packed sample로 이 실패가 해결된다고
주장하지 않는다. Node22에서 script 전체 0.85초였다는 사실도 제품 solver/P95 시간이 아니다.

## 현재 보관 흐름

1. `density.js`의 `routes`가 원 resampled 좌표 객체 S개를 보유한다.
2. 각 `routeDensitySamples`가 segment length를 먼저 전부 계산·finite 검사하고,
   같은 좌표를 복사한 `{x,y,weight,angle}` 객체 S개를 만든다.
3. `samples.flat()`이 이 S개 객체의 참조를 다시 배열에 넣는다. Field가 sample→y→x→channel
   순서로 누적된 동안 nested sample arrays와 flat array가 함께 남아 있다.
4. Field 완성 뒤 advection은 원 route의 좌표와 **처음 계산한 angle**을 읽는다. Smoothing은
   같은 간선의 advected 좌표를 읽고, resampling은 모든 smoothed route가 준비된 뒤 실행된다.
5. Old route, weighted sample, flat 참조, field, smoothed routes, resampled output의 수명은
   서로 겹친다. FieldMap/object/GC overhead를 숫자 payload 합계로 대신할 수 없다.

현재 weighted sample 객체의 숫자 필드만 `32S` bytes다. Nested+flat은 별도 `2S` reference
slots다. Typed 안은 원 좌표를 복사하지 않아 이 중 `2S` 숫자 필드와 flat 참조 S개를 없앤다.
객체 크기·reference 크기·allocator/GC는 엔진별이므로 위 표는 실제 JS heap 절감 측정이 아니다.

## 가장 작은 제품 후보

첫 개념은 **weight/angle 보관만** 바꾼다. `Float64Array(S)` 두 개와
`Uint32Array(E+1)` offsets를 private 준비 결과로 두고 old `routes`를 함께 읽는다.
E/S는 기존 검증된 route 순서와 maxSamples 안에서만 온다. 외부에서 받은 typed buffer를 신뢰하거나
새 cache/registry/worker 권한으로 삼지 않는다.

- 각 간선의 `validateRoutePoints`와 length 계산·finite 검사 순서를 유지한다. Segment scratch는
  해당 간선 크기로만 준비한다. `weight=(previousLength??0)/2+(nextLength??0)/2`,
  tangent 차분·zero fallback·`atan2`를 동일 scalar 순서로 정확히 한 번 계산한다.
- Field와 advection이 같은 angle buffer를 읽는다. Field 뒤 tangent를 다시 계산하는 streaming은
  사용하지 않는다. Weight도 다시 구하지 않으며, field 소비가 끝난 뒤에만 참조를 해제할 수 있다.
- Bounds는 원 route→point 순서로 `Math.min/Math.max`를 실행한다. 기존 flat sample의 좌표와
  동일한 숫자·순서다. FieldMap과 compact kernel/hypot, padded chord, channel 순서 및 실제0값
  insert 의미는 바꾸지 않는다.
- `densityField.js` 안에서 단일 scalar 누적 helper를 공유한다. 기존 object-sample 경로와 packed
  경로는 x/y/weight/angle 네 숫자를 이 helper에 전달한다. 매 샘플 wrapper 객체를 생성해 메모리
  문제를 옮기지 않는다. Gradient/advection도 기존 scalar loop에 private angle reader만 연결한다.
- Public result/object coordinates, resampling, smoothing, output·diagnostics·hash는 현재 owner가
  그대로 만든다. Old/new 좌표 typed화나 dense field/presence bitmap은 이 첫 변경에 섞지 않는다.
- Buffer 할당 전에 safe integer 곱셈과 byte 합계를 검사·예약하고 native signal을 확인한다.
  부분 실패/abort 때 private buffer 참조를 해제한다. 현재 sample guard로부터 도출한 상계만
  사용하며 새 제품 `maxBufferBytes` 숫자를 임의로 정하지 않는다.
- `budget.samples(6S+2E)`, field의 기존 샘플 계산, `sampleCount*24`, candidate·row·field charge를
  그대로 호출한다. 기존 conservative diagnostics를 실제 memory 숫자로 재해석하지 않는다.
  별도 private numeric-buffer ledger는 diagnostic 연구값으로만 둔다.

이 안은 샘플 객체·참조 보관을 줄이는 독립 메모리 변경이다. 원100/1000의 10M 실패 및 원10000의
첫 `6S+2E=13,400,000` sample 실패도 그대로다. Admission을 닫는 변경은 아니다.

## 비교한 더 큰 안과 다음 증거

전체 간선별 streaming은 field가 완성된 후 advection에 쓰일 old tangent를 다시 계산할 위험이 있다.
이를 피하려면 적어도 전체 angle은 보존해야 한다. Old/new coordinate까지 packed화하면
[기존 buffer ledger](route-capacity-evidence/buffer-ledger.json)의 `24S+16T` 모형으로 이어지지만,
그 모형의 T=S 가정은 실제 20회 peak가 아니다. 지금 그 모형을 제품 cap으로 채택하지 않는다.

현재 primitive proof는 **weight/angle 생성만** 검증했다. 제품 후보를 채택하면 기존 array 경로와
packed 경로의 field Map entry 순서/값, 모든 advection/smoothing/resampling 좌표, endpoint±0,
20회 schedule, diagnostics와 전체 result hash를 작은 완주 fixture에서 먼저 비교한다.
독립 dense field oracle, directed8channel, zero-length, overflow, 낮춘 limits와 abort/부분해제도
유지한다. 원100/1000은 기본 guard 실패 위치/원자성까지 비교하며 guard를 풀지 않는다.

Bounded v2의 전체 work cap, peak live samples/buffer bytes, canonical job/completion bytes,
main validation cancellation 및 closed native edit union은 여전히 별도 미완료다.
원 20회 스케줄·모든 입력을 처리할 실제 상계를 채택하기 전 정책/API 구현을 시작하지 않는다.
