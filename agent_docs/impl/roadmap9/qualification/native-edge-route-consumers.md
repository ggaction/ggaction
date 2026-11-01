# 네 edge-route의 analytical/renderer/document 소비자

## 진행 상태

- [x] 기존 remainingApproval을 재사용해 네 method의 positive analytical child와32개 consumer owner를 준비했다.
- [x] 원 edge key/order/rows, complete path, exact endpoint 및 clip/codec를 검증했다.
- [x] Node22 density literal primitive와 실제 public output의 네 backend exact 비교를 고정했다.
- [x] engine 지수 반올림을 solver 변경 없이 분리하고 실제 저장 복원 결함을 수리했다.
- [ ] 최종 source pin·설치3Node·built docs 증거를 마감한다.

[기존 승인](../AUTHORIZATION.json)의 remainingApproval 범위다. API/schema/algorithmVersion,
solver 공식·순서·guard·sample 수를 바꾸지 않는다. 새 animation 지원과 큰 규모 SLO를
주장하지 않는다. 다른 manifest 행/owner/applicability/results와 package30/Image3 N/A를 보존한다.

## Positive analytical 소비자

`examples/edge-routes/comparison.js`는 실제 원 edge rows의 amount/category/alternative/rank를
명시 분석 child로 전달한다. `encodeColor`로 alternative 범례, `editScale`로 수치 위치와
축을 바꾸는 동안 route child의 exact program/graphics/resource refs가 그대로다.
별도 두 child에 명시 `reviseData`를 적용하면 node/edge key와 원행을 유지하면서 각
source revision을 갱신한다. Hierarchical의 독립 hierarchy/anchor는 revision0을 유지한다.
잘못된 endpoint의 두 번째 source 변경은 전체 후보를 거부하고 원 trace/program을 유지한다.
브라우저 Canvas/SVG DPR1/2에서 analytical 영역만 바뀌고 route 영역은 exact pixel 유지,
codec 전체 pixels도 exact다. Route 자체를 Cartesian encoding/scale-driven geometry로
바꾸거나 지원되지 않는 자체 guide를 추가한 것은 아니다.

기존 HEB 공개 helper에는 필수 hierarchy/anchor 준비가 빠져 실제 호출이 실패했다.
같은 canonical helper에 명시 tree/mapping과 동일 graph anchors, plot origin만 추가했다.
FDEB/density의 전체 고정 schedule을 바꾸지 않았다. Raw command counts는 각각
HEB31/2/2, FDEB34/34/34, density1059/756/754(합계2569), edge-path4/2/2다.
Density의 trim 후 visible command는1027/723/721(합계2471)로 전부 유지한다.

## Renderer와 수학 oracle의 구분

`test/charts/edge-routes/method-coordinates.js`는 Node22.23.1의 고정 concrete reference다.
독립 primitive의 geometry/order/clip/style 및 네 backend decoded pixels를 검증하며,
그 자체를 독립 solver 알고리즘 정답으로 주장하지 않는다. 별도
`test/unit/grammar/graph/routes/`의 dense scalar field/gradient oracle, FDEB literal,
HEB Cox–de Boor spline oracle가 수학 근거를 담당한다. 곡선 node-radius trim은 직선
거리 대신 polyline arc-length6이라는 독립 기대값으로 확인한다.

Fresh density 계산에 Node22의 전체 좌표 bit equality를 Node24까지 강제한 첫 시험은
실패했다. `densityRouteBandwidth`의 `0.9 ** 4`는 Node22에서0.6561000000000001,
Node24에서0.6561이다. iterations0–3은 전체 route가 exact 같고 iteration4부터 갈라졌다.
최종 visible coordinate4942개가 다르며 최대 차이는0.0003377029491957728 CSS px다.
진단 전용 복사본에서 Node22 bandwidth20개를 Node24에 주면 모든 iteration과 전체
result가 exact 같아져 최초 원인을 분리했다. 이 주입은 제품 소스에 적용하지 않았다.

일반 시험은 fresh solver의 원행/키/끝점/순서/전체 sample 수/20iteration/codec와 독립
수학 oracle를 검증한다. Renderer는 실제 Node22 공개 저장본 `density.public.json`을
복원한 같은 concrete output과 literal primitive를 모든 engine에서 exact 비교한다.
Node24 공개 저장본도 별도로 보존한다. 버전별 좌표 분기나 좌표 반올림/재생성,
픽셀 허용오차 확대는 없다.

## 실제 cross-engine codec 결함과 최소 수리

Node22 저장본을 Node24 `deserializeProgram`으로 읽으면
`Route density bandwidth is stale`이 발생했다. `resultProvenance.js`가 diagnostic
bandwidth를 현재 engine의 지수 연산 결과와 strict equality로 비교한 것이 원인이다.
이 실패는 Current의 solver-free 저장 복원 portability 경계에 해당한다.

검사만 유한 number + `abs(stored-expected) <= Number.EPSILON * expected`로 좁힌다.
이 양수 non-power-of-two schedule 값에서는 같은 exponent의 인접 binary64 한 값만
각 방향으로 허용한다. index0과 clamped floor는 exact이며 schema/index/length/
다른 diagnostics/hash 검증은 그대로다. 모든 nonconstant index의 ±1 통과·±2 거부,
상수 ±1 거부, nonfinite/type/큰변조/hash 오류를 검사한다. 저장된 좌표와 diagnostic을
고치지 않고 그대로 보존하며 실제 Node22↔24 저장본은 fresh process에서 재직렬화까지
exact여야 한다. 전역 수치 허용오차나 수학 solver 결과를 바꾸지 않는다.

검사와 최초 실패는 [증거](native-edge-route-evidence/summary.json)에 분리 기록한다.
