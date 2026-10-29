# Native session 수명 교차 검증

## 진행 상태

- [x] 원 STEP066/067·AT40/41·OR24/25와 현재 구현/evidence 감사
- [x] AUTHORIZATION remainingApproval 재사용; 공개 계약·runtime 수정 없음
- [x] resize → worker → asset 준비의 100회 교차 취소/해제 회귀
- [x] 정확 resource revision1/2의 역순 결과와 실제 browser 입력 literal 증거
- [x] Node20/24각15, Node22의14+추가literal1, 실제browser2, source/discovery27
- [ ] public animation/player 연결 및 STEP074/077 최종 합산

Runtime 기준은 `d74d66a6a`, arbitration qualification은 `6521836eb`다. 기존 session/preparation,
ResizeObserver, native route executor를 그대로 사용한다. 추가 공개 API, stored schema, renderer,
일반 callback 계층은 없다. 근거는 [전체 승인](../AUTHORIZATION.json)의 remainingApproval이며
이 기록은 원066/067 또는077 전체 완료 선언이 아니다.

## 새로 확인한 교차 경계

`test/unit/interaction-update.test.js`의100회 pipeline은 ResizeObserver callback이 native route
작업을 시작하고, worker 결과가 asset 준비를 기다리는 동안 다음 resize가 이를 대체한다.
첫 stale lease가 늦게 도착해도 program/history를 바꾸지 않는다. 짝수회는 두 번째 후보를 수락한 뒤
다음 worker를 취소하고, 홀수회는 두 번째 asset 준비 중 destroy한다. 기대값은 accepted50,
stale lease150, 모든 worker terminate1/listener0, 모든 lease dispose1, observer disconnect1,
원본 serialize 불변이다. Worker transport와 observer/lease는 제어된 host doubles이며 실제 route
수치 계산은 기존 native kernel이다. 이를100개의 실제 browser Worker/bitmap으로 주장하지 않는다.

별도 literal은 parameter:n의 input revision1과2에 결합된 job1/job2를 역순 완료한다. 최종
resource revision2, applied job2, discarded job1을 비교한다. 이것은 session publication revision과
resource revision을 혼동하지 않는다. 실제 browser Worker 비교는 별도로 session revision1에서
시작해 job2의 한 publication만 반영한 revision2와 Canvas/SVG exact 결과를 확인한다.

실제 mouse 입력은 Canvas/SVG 각각 down, move3회, Escape, up을 실행한다. 기대값은 cancel1,
commit0, historyDelta0, baselineChanged:false, capturedPointersAfter0이며 이후100move/click의
기존 회귀도 유지한다. 안정 suite는 roadmap 파일을 import하지 않고 literal expectations를 소유한다.
TAP diagnostics에서 실제값·기대값·빈diff를 추출해 evidence JSON과 hash를 보존한다.

## 소비자 matrix

| 경계 | 현재 근거 | 상태/남은 범위 |
| --- | --- | --- |
| immutable program/trace | 새100회 원본serialize·취소직후 동일reference, 기존 update atomic 실패 | 검증 |
| native event origin/order | 기존 update user/linked/replay·원인ID·FIFO 회귀, 새cancel/settled literal | 검증 |
| revision/generation | 새resource1/2 literal, 기존 scoped vector·stale/late error | 검증 |
| worker executor | 새100회 제어transport, 기존 real Node Worker 및 실제 browser Worker | 검증; worker를 session이 재구현하지 않음 |
| asset lease | 새100회 교차 dispose1, F의 real image/font/shadow·bitmap proof | 검증; 새test의lease는제어fixture |
| ResizeObserver | 새pipeline observer disconnect/late callback, C의 native browser CSS resize | 검증; 동일 입력/owner 기존evidence 재사용 |
| pointer/capture | 실제Canvas/SVG Escape literal 및 G의 복수editing·핀치·teardown | 검증 |
| scene/renderers | 실제browser native routes Canvas/SVG exact; 기존 scene/assets 및 PNG/PDF renderer | 새수명계산 없음; runtime동일 evidence 재사용 |
| codec/source revision | 기존 real route update의 fresh deserialize graphic equality | 검증; session/DOM/lease 직렬화 없음 |
| Full/Basic/package | 기존 update Basic/native 제한 및 G 동일 tar3Node | source/types 동일, 새pack 불필요 |
| public docs/types | 변경된 공개계약 없음; G source-pin49/built/4폭 | 그대로 유효 |
| accessible focus/tooltip | STEP068 A/B의 native items·exact frame focus와 C1 host tooltip/touch | A/B/C1 검증; 전체 control/reduced-motion 후행 |
| animation/current frame | 현재 private controller/endpoint owner를 import하지 않음 | 공개 planner/player 후행 연결 필요 |

## 검사 범위와 실패 보존

새test의 최초 실패 두 건은 fixture였다. 첫 lease에 금지된 `releases` 필드를 넣어 closed shape를
위반했고, 다음 worker의 동일 계산 입력은 executor의 정상 cache hit로 worker를 만들지 않았다.
Counter를 host record로 옮기고 exponent를 명시적으로 달리해 실제 서로 다른 worker 요청을 만들었다.
Runtime 수정 없이 최종100회 회귀가 통과했다. 원본 실패 로그를 제거하지 않는다.

기존의 모든검사를 재실행하지 않는다. 새 update owner의 집중 검사와 실제 browser 입력을 실행하고,
source/discovery 경계를 확인한다. Source fingerprint가 G와 같으므로 G의 critical floors·same-tar
Node20/22/24·문서·realistic 결과는 입력이 같은 셀에 한해 재사용한다. 이후 animation 결합과
STEP074에서 전체 조합을 다시 확인해야 한다.

[Qualification](lifecycle-matrix-evidence/qualification.json)과 [literal expected/actual/diff](lifecycle-matrix-evidence/expected-actual-diff.json)에 source fingerprint·test hash·원본 실패와 명령을 보존한다. G와 source/types fingerprint가 정확히 같음을 기계적으로 확인했다.
