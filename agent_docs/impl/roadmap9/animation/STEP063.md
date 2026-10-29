# STEP-063 주입 clock과 player

## 진행 상태

- [x] 기존 [remainingApproval](../AUTHORIZATION.json) 재사용
- [x] clock 경과 시간·rate·reverse·repeat의 순수 계산
- [x] 독립 가상 clock 및 극단값 검증
- [x] 주입 clock과 frame 예약을 소유하는 비공개 controller
- [x] pause·seek·interrupt의 현재 frame capture와 연속성
- [x] run별 finished Promise와 commit의 정확히 한 번 종료
- [ ] reduced motion·dispose·session 연결·공개 API와 소비자 검증

`src/grammar/animation/timing.js`는 `bounded-playback-clock@1` 버전의 순수 경과 시간 계산을 소유한다. 명시 time/duration/elapsed/rate/iteration/repeat만 받고 ChartProgram·callback·wall clock·RAF를 읽지 않는다. rate 0은 시간을 유지하고 음수 rate는 현재 시간에서 역방향으로 이동한다. repeat는 추가 반복 수이며 runtime의 Infinity를 허용한다. 실제 controller의 clock은 이 함수 밖에 있다.

정확한 반복 경계에서는 endpoint를 유지하고 이후 시간이 흐를 때 다음 반복으로 넘어간다. duration 0은 rate가 0이 아니면 한 번 종료하는 상태를 반환한다. 큰 시간 이동은 반복 횟수만큼 loop하지 않고 닫힌 식으로 계산한다. elapsed×rate가 overflow해도 duration을 먼저 나눠 실제 반복 수가 작으면 올바른 상태를 반환한다. 표현 가능한 iteration 수를 넘는 무한 반복은 명시 오류다. 결과는 불변 plain data다.

4674개의 작은 정수 가상 clock 사례는 매 tick 하나씩 움직이는 별도 oracle과 비교했다. 고정 시간·부분 rate·역방향·정확한 endpoint·영 시간·유한/무한 repeat·입력 변경 금지·accessor·극단적 finite 값도 검증했다. 숫자·identity·route·clock 합계 Node 20/22/24 각각 30개, discovery 16개가 통과했고 네 수치 owner의 line/branch/function coverage는 모두 100%다. [정확한 로그와 측정](timing-evidence/summary.json)을 보존한다.

이 체크포인트는 player 또는 STEP-063 완료를 의미하지 않는다. lifecycle·Promise·callback cleanup·현재 frame 기반 interruption과 실제 browser 검증은 계속 구현한다. repeat의 runtime Infinity를 offline에서 어떻게 저장할지는 원안의 명시 `'infinite'` 정책을 유지하며, 이 함수 결과를 그대로 public persisted plan으로 취급하지 않는다.

## Controller 구현 결정

[remainingApproval](../AUTHORIZATION.json#remainingApproval)을 재사용한다. 먼저 비공개
`src/animation/player.js`가 주입 clock과 sample/render/commit callback의 수명만 소유한다.
공개 entry나 저장 schema는 이 체크포인트에 추가하지 않는다. 현재 장면은 sample이 반환한
동일 객체이며 renderer 또는 semantic 재계산을 controller 안에 넣지 않는다.

play/pause/seek/reverse/rate 및 반복 횟수 변경은 현재 clock을 먼저 반영한다. 시계가
뒤로 가거나 finite가 아니면 명시 오류다. frame 예약은 하나만 유지하고 취소된 callback은
generation으로 무효화한다. render에서 재진입한 제어는 최대 256개 FIFO로 순차 적용하며,
dispose는 즉시 예약과 대기를 해제한다. callback 실패도 진행 중 run을 cancelled로 종료한다.

각 run은 새 finished Promise를 갖고 completed/cancelled/interrupted/disposed 중 한 이유로
한 번 settle한다. complete의 commit도 한 번이다. zero duration과 reduced motion은 RAF 없이
목표 장면을 한 번 적용한다. interrupt는 현재 clock에서 샘플한 객체를 다음 sampler 생성에
넘기며 그 sampler의 시작 객체가 다르면 변경 전에 거부한다. 아직 공개 planner가 없으므로
factory는 비공개 연결 seam이다. 실제 typed planner 연결·offline·브라우저·패키지 소비자 검증
전에는 공개 player 또는 STEP-063 완료로 기록하지 않는다.

비공개 controller 16개와 기존 수치 30개가 Node22에서 통과했다. clock 중복 시각은
렌더를 다시 호출하지 않으며 재진입은 현재 callback이 반환한 뒤 순서대로 실행한다.
dispose는 sampler·renderer·commit·clock·frame 참조를 해제한다. cancelled run은 다시
재생할 수 있고, disposed handle은 재활성화하지 않는다. 최종 소스와 정확한 증거는
후속 [controller evidence](player-evidence/summary.json)에 고정한다.
