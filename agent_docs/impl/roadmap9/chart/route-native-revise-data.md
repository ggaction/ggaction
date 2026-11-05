# B native `reviseData` — 순서 있는 원 job/completion replay

## 진행 상태

- [x] 동기 native 호출 깊은 곳의 bounded route를 위한 원 job/completion replay.
- [x] `reviseData`의 public B 연결(completed unit receiver).
- [ ] Facet/scoped/composition receiver, `editDerivedData`·`editParameter`·`applyDataUpdate`, Canvas/fit/filter/projection.

[union](route-native-revise-evidence/union.json): 직접 미연결 8개(`editDerivedData`, `editParameter`, `applyDataUpdate`, `filterMarks`, `removeMarkFilter`, `editCanvas`, `fitCanvas`, `navigateProjection`).

## 왜 replay인가

기존 다섯 action은 native 본문 맨 앞에서 준비된 plan을 한 번 읽어 쓴다. `reviseData`의 route는 `reviseUnitData → applyRevisionPlan → reviseSourceResourceInputs → planSourceResourceRevision`의 동기 호출 깊은 곳에서 계산된다. 준비 단계에서 그 중간 상태(guide transaction 안의 후보 program, 파생 dataset 교체)를 따로 재구성하면 원 owner를 우회하는 별도 경로가 된다. [감사 문서](route-native-data-canvas-next.md)가 Canvas에 권한 방식, 곧 순서 있는 원 job/completion을 보관하고 최종 동기 단계가 만든 원 job과 대조하는 방식을 data에도 쓴다.

## 동작

1. **Replay 지점** (`materialization/graph/routeReplay.js`, `routeResource.js`). Scope 없는 동기 `createEdgeRouteResourceStages`가 bounded route를 만나면, 활성 replay가 있을 때만 원 job을 끝까지 계산한다(원 `edgeRouteJobStages`와 같은 ledger 부과). 그 inputHash가 기록된 다음 completion과 같으면 원 `completedEdgeRouteResource` validator에 공급한다. 활성 replay가 없으면 기존처럼 거부한다. Replay는 route 준비 owner만, 해당 동기 invocation 동안만 연다. 저장 state나 trace는 replay를 만들 수 없다.
2. **준비** (`resources/graphRoutes.js`의 `prepareReplayedUpdate`). 원 wrapped preflight(`applyGraphEdgeRoutesUpdate`)를 실제로 실행한다. Completion이 없는 원 job에 닿으면 그 job을 요청으로 멈춘다. 요청은 이 replay가 만든 객체와 정체성이 같을 때만 인정한다. 그 job을 worker로 계산한 뒤 preflight를 receiver에서 다시 실행한다. Worker 계산은 job마다 한 번이다. 각 preflight 실행은 실제 실행이므로 ledger에 합산한다. 버린 실행이 보유한 samples는 다음 실행에서 해제한다.
3. **행 identity** (`actions/data/revise.js`, `actions/graphs/nativeUpdate.js`). `reviseSourceIdentity`의 namespace는 준비 때 한 번 정한다. `reviseData`는 constructor별로 등록된 reader로만 그 값을 읽는다. Full만 reader를 등록하며 Basic은 route 기계를 import하지 않는다. Reader는 exact invocation·exact args·native·entered receiver에서만 값을 준다.
4. **최종 적용**. `reviseData`의 미리보기·실제 두 pass는 각각 기록 전체를 같은 순서로 소비해야 한다. 누락·추가·순서/inputHash 차이는 `stale-result`다. 한 번이라도 요청이나 불일치가 나면 replay는 중단 상태가 된다. 그래서 native 단계가 그 오류를 자체 catch로 흡수해도 invocation을 완료할 수 없다. Theme completion도 replay 완료 뒤에만 native metadata를 읽는다. 영향을 받는 bounded route job이 하나도 없으면 "use reviseData directly"로 거부한다.

Composition receiver는 명시적으로 거부한다. 계약상 update union은 completed unit receiver다.

## 검증

`test/unit/resources/graph-route-native-revise.test.js`:

- **v1 동치**: 같은 차트를 v1 동기 route로 만들어 `reviseData`한 결과와 비교한다. 그래픽 경로, route 명령, 개정 dataset 행이 같다. 같은 handle을 두 번 적용하면 결과가 같고 base는 바뀌지 않는다. Worker 계산은 한 번이고 handle inputHash와 같다. Trace의 첫 child는 `reviseData`이다.
- **거부**: 다른 receiver·token, 복제 handle, 영향 route가 없는 source, 알 수 없는 인자를 거부한다. 동기 `reviseData`는 여전히 bounded route를 거부한다.
- **Replay 단위**: 정확한 반복 pass, 누락·중복·추가, 미완료 pass, 기록 모드의 요청 정체성, scope 복원을 확인한다.

원 native preflight의 오류는 그대로 보고하고 handle을 남기지 않는다. 준비 중 취소는 거부한다.

전체 `npm test`의 route·data·theme 관련 시험과 route 계약 44개가 통과했다. 같은 source의 coverage는 97.43/95.68/99.36%, critical floor는 786개이고 `graphRoutes.js` branch는 91.03%다. Browser 529/529, render 513/513도 통과했다. 같은 archive `9df2288d…`를 Node20/22/24 consumer로 설치해 검사했고 모두 통과했다. 정본 route benchmark([report](route-native-revise-evidence/report-routes.json.gz))에서 1k·자원 사례는 통과했다. 10k edge 사례는 기존 `Graph plot graphic count must not exceed 10000` 용량 한도로 실패하며, 인계의 열린 의무인 density 1k/10k capacity이고 이번 변경과 무관한 create 경로다.

## 한계

이 연결은 unit receiver의 `reviseData`만이다. 같은 replay 지점은 Canvas(추가 viewport 단계의 job)와 파생 data에도 쓸 수 있다. 다만 각 owner의 broad catch(fit probe)와 transient context 수명은 따로 확인해야 한다. 초기 snapshot·clone·postMessage·최종 materialization의 100ms 계량도 여전히 미검증이다.
