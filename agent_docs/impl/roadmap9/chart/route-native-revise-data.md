# B native `reviseData`·`editDerivedData`·`editParameter` — 순서 있는 원 job/completion replay

## 진행 상태

- [x] 동기 native 호출 깊은 곳의 bounded route를 위한 원 job/completion replay.
- [x] `reviseData`의 public B 연결(completed unit receiver).
- [x] `editDerivedData`·`editParameter`의 public B 연결(같은 replay, completed unit receiver).
- [x] `editCanvas`의 public B 연결(screen-space route, 추가 viewport 단계 포함).
- [x] `fitCanvas`의 public B 연결(probe broad catch가 route continuation·quota·deadline을 흡수하지 않음).
- [x] `navigateProjection`(resize), `applyDataUpdate`(원 data registry handle), `filterMarks`/`removeMarkFilter`(recompute graph 필터)의 public B 연결. 직접 14개 모두 unit receiver 연결.
- [x] Focused 파생 편집기 21개의 public B 연결(각 wrapper 유지).
- [ ] Facet/scoped/composition receiver, 간접 guide/encoding/mark/theme/composition, 100ms 계량.

[union](route-native-revise-evidence/union.json): 직접 미연결 0개. 모두 `partial-unit-native-connection`이다.

## 왜 replay인가

기존 다섯 action은 native 본문 맨 앞에서 준비된 plan을 한 번 읽어 쓴다. `reviseData`의 route는 `reviseUnitData → applyRevisionPlan → reviseSourceResourceInputs → planSourceResourceRevision`의 동기 호출 깊은 곳에서 계산된다. 준비 단계에서 그 중간 상태(guide transaction 안의 후보 program, 파생 dataset 교체)를 따로 재구성하면 원 owner를 우회하는 별도 경로가 된다. [감사 문서](route-native-data-canvas-next.md)가 Canvas에 권한 방식, 곧 순서 있는 원 job/completion을 보관하고 최종 동기 단계가 만든 원 job과 대조하는 방식을 data에도 쓴다.

## 동작

1. **Replay 지점** (`materialization/graph/routeReplay.js`, `routeResource.js`). Scope 없는 동기 `createEdgeRouteResourceStages`가 bounded route를 만나면, 활성 replay가 있을 때만 원 job을 끝까지 계산한다(원 `edgeRouteJobStages`와 같은 ledger 부과). 그 inputHash가 기록된 다음 completion과 같으면 원 `completedEdgeRouteResource` validator에 공급한다. 활성 replay가 없으면 기존처럼 거부한다. Replay는 route 준비 owner만, 해당 동기 invocation 동안만 연다. 저장 state나 trace는 replay를 만들 수 없다.
2. **준비** (`resources/graphRoutes.js`의 `prepareReplayedUpdate`). 원 wrapped preflight(`applyGraphEdgeRoutesUpdate`)를 실제로 실행한다. Completion이 없는 원 job에 닿으면 그 job을 요청으로 멈춘다. 요청은 이 replay가 만든 객체와 정체성이 같을 때만 인정한다. 그 job을 worker로 계산한 뒤 preflight를 receiver에서 다시 실행한다. Worker 계산은 job마다 한 번이다. 각 preflight 실행은 실제 실행이므로 ledger에 합산한다. 버린 실행이 보유한 samples는 다음 실행에서 해제한다.
3. **행 identity** (`actions/data/revise.js`, `actions/graphs/nativeUpdate.js`). `reviseSourceIdentity`의 namespace는 준비 때 한 번 정한다. `reviseData`는 constructor별로 등록된 reader로만 그 값을 읽는다. Full만 reader를 등록하며 Basic은 route 기계를 import하지 않는다. Reader는 exact invocation·exact args·native·entered receiver에서만 값을 준다.
4. **최종 적용**. `reviseData`의 미리보기·실제 두 pass는 각각 기록 전체를 같은 순서로 소비해야 한다. 누락·추가·순서/inputHash 차이는 `stale-result`다. 한 번이라도 요청이나 불일치가 나면 replay는 중단 상태가 된다. 그래서 native 단계가 그 오류를 자체 catch로 흡수해도 invocation을 완료할 수 없다. Theme completion도 replay 완료 뒤에만 native metadata를 읽는다. 영향을 받는 bounded route job이 하나도 없으면 "use reviseData directly"로 거부한다.

Composition receiver는 명시적으로 거부한다. 계약상 update union은 completed unit receiver다.

## 파생 data와 parameter

`editDerivedData`와 `editParameter`도 미리보기·실제 두 pass를 같은 동기 호출 안에서 실행하고, route는 같은 깊은 revision 경로에서 계산된다. 같은 replay로 연결한다. 이 둘의 dataset identity는 원 행에서 결정적이므로 준비 identity를 따로 결박하지 않는다. 영향 route는 개정 대상(dataset 또는 parameter)에서 시작한다. 그 뒤 파생 dataset의 `source`와 변환의 `parameterInputs`를 dependency 순서로 따라간다. 그 dataset을 입력으로 쓰는 자원과 그 하위 자원을 거쳐 route에 닿는다. Parameter가 data source 입력인 경우는 원 action이 prepared data update를 요구하므로 여기서도 그 오류를 그대로 낸다.

## Canvas

`editCanvas`는 상태 쓰기 뒤 canvas 자원 개정과 guide layout transaction 단계에서 screen-space route를 다시 계산한다. 모두 동기 `finishCanvasStages` 안에서 일어나므로 같은 replay 지점에 닿는다. 감사 문서가 금지한 대로 준비 단계의 후보 program이나 screen plan handle을 최종 receiver에 재사용하지 않는다. 최종 receiver가 원 owner로 원 job을 다시 만들고, 그 inputHash를 기록 순서와 대조한다. 영향 범위는 모든 screen-space route에서 시작한다. Viewport가 바뀌지 않아 job이 하나도 없으면 직접 `editCanvas`를 쓰도록 거부한다. 같은 inputHash의 job(같은 graph·layout·intent·viewport)은 결정적으로 같은 completion을 공유한다.

## Fit

`fitCanvas`의 일반 fitting은 probe마다 원 wrapped `editCanvas`를 호출한다. Probe의 broad catch는 모든 오류를 ordinary fitting failure로 바꾼다. 그래서 Full만 constructor별 continuation 검사를 등록한다(Basic은 route 기계를 import하지 않는다).

- **활성 replay가 있을 때**: 그 replay가 던진 요청·불일치는 다시 던진다. Route ledger quota와 deadline/abort도 다시 검사해 던진다.
- **활성 replay가 없을 때**: prepared invocation 밖의 bounded-route 요구 오류만 다시 던진다. 이전에는 이 오류가 흡수되어 "plot height가 minPlotHeight보다 작다"는 잘못된 overflow로 보고됐다.
- 일반 geometry 실패는 이전처럼 흡수한다.

원 side 순서, quarter-pixel binary search, probe cache, 반복 상한은 바뀌지 않는다. 준비는 probe마다 생기는 원 job을 하나씩 worker로 계산하고 다시 실행한다. 비용은 probe 수에 따라 늘어난다(시험 fixture 17 job, Node 약 1.4초).

## Data update·projection·filter

- **`applyDataUpdate`**: 원 data update registry의 frozen handle을 snapshot에서 복사하지 않는다. 준비는 `preparedDataUpdateTarget`으로 exact receiver·token을 검사해 개정 source나 parameter를 얻는다. 최종 nested 원 `applyDataUpdate`는 wrapper의 entered program에서 `actionSource`를 받으므로, Full만 등록한 resolver가 exact invocation·exact handle·그 entered program일 때만 invocation receiver를 비교 대상으로 준다. 직접 호출은 자기 receiver를 비교하므로 다른 receiver는 여전히 stale이다. 내부 `reviseData`/`editParameter`는 prepared source update의 identity를 써서 결정적이다.
- **`navigateProjection`**: canvas를 바꾸는 `resize` 연산만 screen-space route의 viewport를 움직인다. 다른 camera 연산은 route job이 없어 직접 action을 쓰도록 거부한다.
- **`filterMarks`/`removeMarkFilter`**: 명시 target의 graph layout에서 시작한다. `recompute:true` 필터만 inferred graph, layout, route를 개정하고, 보이기만 하는 필터는 route job이 없어 거부한다.

## Focused 파생 편집기

`editComputedData`부터 `editImputedData`까지 19개는 자기 option을 검사한 뒤 `editDerivedData`를 호출한다. `editBin2DData`와 `editRegressionStatisticsData`는 각자의 개정 경로를 탄다. 어느 쪽이든 route는 같은 동기 revision 경로에서 계산되므로 native는 각 wrapper 자체이고, 일반 replay가 아니라 같은 순서 있는 job/completion replay로 연결한다.

영향 범위는 target과 같은 이름의 dataset, 그리고 `materializationConfigs.data`의 파생 owner가 가리키는 current dataset에서 시작한다. Target이 없으면 현재 data에서 시작한다. 정책이 더 엄격한 무관 route를 넣어 정당한 갱신을 거부하지 않도록 넓은 seed는 쓰지 않는다.

## 검증

`test/unit/resources/graph-route-native-revise.test.js`:

- **v1 동치**: 같은 차트를 v1 동기 route로 만들어 `reviseData`한 결과와 비교한다. 그래픽 경로, route 명령, 개정 dataset 행이 같다. 같은 handle을 두 번 적용하면 결과가 같고 base는 바뀌지 않는다. Worker 계산은 한 번이고 handle inputHash와 같다. Trace의 첫 child는 `reviseData`이다.
- **거부**: 다른 receiver·token, 복제 handle, 영향 route가 없는 source, 알 수 없는 인자를 거부한다. 동기 `reviseData`는 여전히 bounded route를 거부한다.
- **파생·parameter**: `editParameter`와 `editDerivedData`가 각각 v1 동기 개정과 route 명령·모든 dataset 값이 같다. Worker 계산은 한 번이고 반복 적용 결과가 같으며 base는 바뀌지 않는다. Route가 소비하지 않는 파생 dataset과 없는 parameter는 거부한다.
- **Canvas**: 서로 다른 두 screen-space route가 순서대로 두 job을 만들고 v1 `editCanvas`와 route 명령이 같다. 반복 적용 결과가 같고 base는 바뀌지 않는다. 배경만 바꾸는 편집과 world-space route만 있는 프로그램은 거부한다.
- **Fit**: 동기 `fitCanvas`가 overflow가 아니라 요구 오류를 낸다. B 결과는 v1 fit과 route 명령, margin, fitting 결과가 같다. 모든 job이 순서대로 한 번씩 계산되고 반복 적용 결과가 같다.
- **Data update·projection·filter**: 각 action이 v1과 route 명령이 같고 worker 계산은 한 번이다. Data update는 다른 token, 복제 handle, 직접 호출의 다른 receiver를 거부한다. Projection은 resize 외 연산을, filter는 보이기만 하는 필터와 target 없는 요청을 거부한다.
- **Focused 편집기**: `editFilteredData`가 자기 wrapper를 거쳐 v1과 route 명령이 같고 worker 계산은 한 번이다. 원 action이 거부하는 편집은 같은 오류로 거부한다. Route가 소비하지 않는 파생 dataset과 없는 owner는 거부한다.
- **Replay 단위**: 정확한 반복 pass, 누락·중복·추가, 미완료 pass, 기록 모드의 요청 정체성, scope 복원을 확인한다.

원 native preflight의 오류는 그대로 보고하고 handle을 남기지 않는다. 준비 중 취소는 거부한다.

전체 `npm test`의 route·data·theme 관련 시험과 route 계약 44개가 통과했다. 같은 source의 coverage는 97.43/95.68/99.36%, critical floor는 786개이고 `graphRoutes.js` branch는 91.03%다. Browser 529/529, render 513/513도 통과했다. 같은 archive `9df2288d…`를 Node20/22/24 consumer로 설치해 검사했고 모두 통과했다. 정본 route benchmark([report](route-native-revise-evidence/report-routes.json.gz))에서 1k·자원 사례는 통과했다. 10k edge 사례는 기존 `Graph plot graphic count must not exceed 10000` 용량 한도로 실패하며, 인계의 열린 의무인 density 1k/10k capacity이고 이번 변경과 무관한 create 경로다.

파생·parameter 연결 checkpoint([증거](route-native-revise-evidence/derived/))의 결과는 다음과 같다.

- 전체 `npm test`: 10527/10529. 실패 2건은 상한 갱신 전 package 크기 시험이었고, 갱신 뒤 같은 archive가 통과했다.
- Coverage 97.43/95.68/99.36%, critical floor 786개.
- Browser 529/529, render 513/513.
- 같은 archive `dac260ac…`를 Node20/22/24 consumer로 검사해 모두 통과했다.

Canvas·fit 연결 checkpoint([증거](route-native-revise-evidence/canvas/))의 결과는 다음과 같다.

- 전체 `npm test`: 10530/10532. 실패 2건은 상한 갱신 전 package 크기 시험이다.
- Coverage 97.43/95.67/99.36%, critical floor 786개.
- Browser 529/529, render 513/513.
- 같은 archive `2cdf2cac…`를 Node20/22/24 consumer로 검사해 모두 통과했다.

직접 14개 연결 checkpoint([증거](route-native-revise-evidence/union14/))의 결과는 다음과 같다.

- 전체 `npm test`: 10530/10533. 실패는 상한 갱신 전 package 크기 시험 2건과 source 경계 1건이었다. 경계 건은 route owner의 data update registry import로, 기존 route owner 예외 형식대로 명시했다.
- Coverage 97.43/95.68/99.36%, critical floor 786개.
- Browser 529/529, render 513/513.
- 같은 archive `1fb96505…`를 Node20/22/24 consumer로 검사해 모두 통과했다.
- Route benchmark는 통과 10건, 미측정 10건이다. 실패 4건은 모두 기존 10k edge `Graph plot graphic count` 용량 한도다.

Focused 파생 편집기 checkpoint([증거](route-native-revise-evidence/aliases/))는 다음 검사를 모두 통과했다.

- 전체 `npm test` 10564/10564
- Coverage 97.43/95.68/99.36%, critical floor 786개
- Browser 529/529, render 513/513
- 같은 archive `a9c63eec…`의 Node20/22/24 consumer 설치

## 한계

이 연결은 unit receiver의 `reviseData`만이다. 같은 replay 지점은 Canvas(추가 viewport 단계의 job)와 파생 data에도 쓸 수 있다. 다만 각 owner의 broad catch(fit probe)와 transient context 수명은 따로 확인해야 한다. 초기 snapshot·clone·postMessage·최종 materialization의 100ms 계량도 여전히 미검증이다.
