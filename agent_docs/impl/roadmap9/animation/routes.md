# 그래프 경로 애니메이션 수치 준비

## 진행 상태

- [x] 기존 [remainingApproval](../AUTHORIZATION.json) 재사용
- [x] 공유 route sampler를 사용하는 수치 커널
- [x] 고정 좌표·현재 anchor·변경 불가·overflow·safe fade 검증
- [ ] 공개 transition planner와 route resource 연결
- [ ] current-frame hit·selection·clip·seek·interrupt 연결
- [ ] 네 renderer의 전환 프레임 검증

`src/grammar/animation/routes.js`는 이미 계산된 polyline route만 받는다. graph·bundle inference나 curve 계산을 프레임마다 실행하지 않는다. 경로 점과 정규화 arc-length sample grid는 기존 `grammar/graph/routes/polyline.js`의 검증·limit·resampler를 그대로 재사용한다. 기본 sample 수는 두 endpoint 점 수의 최댓값이며 명시 sample 수를 받을 수 있다.

경로 커널 버전은 `anchored-arc-length-route@1`이다. edge·source node·target node key가 모두 같을 때만 수치 보간한다. 다른 identity와 길이 0인 endpoint는 이유가 있는 crossfade 결정을 반환한다. 준비된 값에는 원본 두 경로와 공통 sample grid, 정확한 key와 길이 상한이 포함된다. 전체 공개 plan은 아직 구현되지 않았다.

중간 프레임은 같은 정규화 arc-length 위치를 보간한 다음, 그 프레임의 명시 source/target anchor와의 차이를 경로 길이 비율에 따라 연속 보정한다. 첫 점과 마지막 점은 해당 anchor로 정확히 고정한다. t=0/1에는 원본의 점 수와 좌표를 그대로 반환하며 다른 endpoint anchor는 거절한다. 중간 경로 길이의 상한은 두 endpoint 길이 최댓값의 `maxStretch`배이고 기본값은 2다. 붕괴·과도한 stretch·유한 범위를 벗어나는 연산은 명시 safe fade 이유를 반환한다. projection clip은 이 수치 커널이 추론하지 않고 후속 현재 frame materializer가 소유한다.

독립 literal fixture에서 2점·3점 경로를 5점 공통 grid로 만들고 y=5 중간선을 확인했다. 현재 node anchor를 이동한 경우 보정된 중간점 (7,5), 정확한 두 endpoint, 반복점, 불변성, structured-clone 재생, 잘못된 identity·sample limit·accessor와 극단적 유한 입력을 검증했다. 숫자·identity·route 합계 Node 20/22/24 각각 24개, discovery 16개가 통과했으며 세 수치 owner의 line/branch/function coverage는 모두 100%다. [로그와 정확한 패키지 측정](route-evidence/summary.json)을 보존한다.

이 체크포인트는 STEP-061/062나 graph animation 전체 완료를 뜻하지 않는다. sampler·renderer·hit와 semantic graph resource closure, offline codec·player 연결은 계속 구현한다.
