# STEP-063 주입 clock과 player

## 진행 상태

- [x] 기존 [remainingApproval](../AUTHORIZATION.json) 재사용
- [x] clock 경과 시간·rate·reverse·repeat의 순수 계산
- [x] 독립 가상 clock 및 극단값 검증
- [ ] RAF 및 주입 clock을 소유하는 player controller
- [ ] pause·seek·interrupt의 현재 frame capture
- [ ] run별 finished Promise와 commit의 정확히 한 번 종료
- [ ] reduced motion·dispose·session 연결·공개 API와 소비자 검증

`src/grammar/animation/timing.js`는 `bounded-playback-clock@1` 버전의 순수 경과 시간 계산을 소유한다. 명시 time/duration/elapsed/rate/iteration/repeat만 받고 ChartProgram·callback·wall clock·RAF를 읽지 않는다. rate 0은 시간을 유지하고 음수 rate는 현재 시간에서 역방향으로 이동한다. repeat는 추가 반복 수이며 runtime의 Infinity를 허용한다. 실제 controller의 clock은 이 함수 밖에 있다.

정확한 반복 경계에서는 endpoint를 유지하고 이후 시간이 흐를 때 다음 반복으로 넘어간다. duration 0은 rate가 0이 아니면 한 번 종료하는 상태를 반환한다. 큰 시간 이동은 반복 횟수만큼 loop하지 않고 닫힌 식으로 계산한다. elapsed×rate가 overflow해도 duration을 먼저 나눠 실제 반복 수가 작으면 올바른 상태를 반환한다. 표현 가능한 iteration 수를 넘는 무한 반복은 명시 오류다. 결과는 불변 plain data다.

4674개의 작은 정수 가상 clock 사례는 매 tick 하나씩 움직이는 별도 oracle과 비교했다. 고정 시간·부분 rate·역방향·정확한 endpoint·영 시간·유한/무한 repeat·입력 변경 금지·accessor·극단적 finite 값도 검증했다. 숫자·identity·route·clock 합계 Node 20/22/24 각각 30개, discovery 16개가 통과했고 네 수치 owner의 line/branch/function coverage는 모두 100%다. [정확한 로그와 측정](timing-evidence/summary.json)을 보존한다.

이 체크포인트는 player 또는 STEP-063 완료를 의미하지 않는다. lifecycle·Promise·callback cleanup·현재 frame 기반 interruption과 실제 browser 검증은 계속 구현한다. repeat의 runtime Infinity를 offline에서 어떻게 저장할지는 원안의 명시 `'infinite'` 정책을 유지하며, 이 함수 결과를 그대로 public persisted plan으로 취급하지 않는다.
