# B native 나머지 union — 실행으로 영향 route를 정하는 replay

## 진행 상태

- [x] 간접 action이 실제로 bounded route에 닿는지 조사(Node probe).
- [x] 그 밖의 공개 wrapped action을 같은 순서 있는 job/completion replay로 받기.
- [x] 닿은 route의 execution policy 대조(준비 끝·최종 apply).
- [x] 타입(`DiscoveredNativeRouteAction`), 계약(EDGE_ROUTES.md), 공개 문서(`docs/api/edge-routes.md`).
- [x] 시험 `test/unit/resources/graph-route-native-discovered.test.js`.
- [ ] 100ms 계량(snapshot·clone·postMessage·최종 materialization).

승인 근거: [remainingApproval](../AUTHORIZATION.json)이 STEP-077까지 남은 계획의 공개 API·아키텍처 결정을 포함한다. 이 union은 계약에 적힌 후속 의무다.

## 조사 결과

[union](route-native-revise-evidence/union.json)의 감사 대상 332개 중 직접 연결 14개와 focused 편집기 21개 외 나머지(축·범례·제목·grid·encoding·mark·통계·composition·theme 등)를 bounded screen/world route가 있는 차트에서 동기 호출했다.

- 대부분 route 입력(graph·layout)이나 screen viewport(Canvas 크기·margin)를 바꾸지 않아 그대로 성공한다. 예: `applyTheme`, `editGraphPlot`, point mark·encoding 추가, `hconcat`·`editCompositionLayout`(자식 program을 그대로 보존).
- Viewport를 바꾸는 것은 Canvas 계열(`editCanvas`, `fitCanvas`, `navigateProjection` resize)이고 이미 직접 연결되어 있다.
- Graph plot은 facet을 지원하지 않는다(`facet does not support mark "plot" of type graph`). 그래서 facet receiver에는 bounded route가 생기지 않는다.
- 어떤 action이든 bounded route에 닿으면 동기 호출은 `Bounded routes require prepareGraphEdgeRoutes…`로 명시 실패한다. 조용한 동기 계산은 없다.

남은 구멍은 "닿는데 준비 경로가 없는 action"이다. 지금 내장 공개 action 중 그런 것을 찾지 못했지만, 공개 extension action이나 이후 action이 Canvas 계열을 안에서 부르면 생긴다. 이것을 action 이름 목록으로 막지 않고 실행으로 정한다.

## 동작

1. **받는 action** (`actions/graphs/nativeUpdate.js`): 자체 해석이 있는 35개와 route action 세 개(`bundleGraphEdges`, `editEdgeRoute`, `applyGraphEdgeRoutesUpdate`)를 뺀, receiver의 공개 wrapped action(`getWrappedActionMetadata`가 있는 함수). Instance 자기 속성은 받지 않는다. 최종 apply는 receiver의 action이 준비 때와 같은 함수인지 다시 검사한다(기존 `stale-result`).
2. **영향 route**: 미리 정하지 않는다. 기존 replay 준비가 원 wrapped preflight를 실행하다 기록 없는 job에서 멈출 때, 그 job의 route id와 execution policy를 함께 기록한다(`routeReplay.js`의 요청이 route id를 가진다). 닿은 job이 없으면 "use X directly"로 거부한다.
3. **실행 한도**: 준비는 계약 최대값으로 시작한다. 실행이 어떤 route job에 처음 닿으면 그 route의 policy로 request ledger를 다시 만들어 그때까지의 누적값을 즉시 대조하고, 이후 실행과 job에도 계속 적용한다(독립 검토 지적: 이전에는 준비가 끝난 뒤에만 대조해 비용이 계약 최대값까지 커질 수 있었다). 각 worker 계산은 job 자신의 policy를 그대로 적용한다. 최종 apply는 닿은 route들의 policy로 같은 누적값에서 검산을 계속한다.
4. **Composition receiver**: 일반 action은 자기 dispatch로 자식에 닿는 경우를 같은 replay로 받는다. `reviseData`·`applyDataUpdate`·Canvas 계열은 이유(미리보기마다 새 행 namespace, unit Canvas)대로 계속 unit 전용이다.

## 시험

- 공개 extension API(`registerExtension`)로 등록한 action(`widenCanvas`, 안에서 `editCanvas` 호출)으로: 동기 호출 거부, 준비 job 1개, v1 동기 결과와 route 명령 동일, 반복 적용 동일, base 불변, trace(`applyGraphEdgeRoutesUpdate` → `widenCanvas`), 다른 token은 `stale-result`. 등록된 extension action은 쓰기 불가 속성이라 교체할 수 없다.
- Policy: 같은 route에 두 번 닿는 action은 준비 중에 그 route policy로 거부된다. Route 생성이 겨우 되는 최소 maxWork(Node 측정: 생성 15,718, replay 준비+적용 19,974)에서는 준비는 통과하지만 적용이 준비 누적값에 이어 계산하다가 `Route work exceeds route route execution maxWork`로 거부된다. 영향 route policy가 handle에 결박되었다는 뜻이다. 넉넉한 policy에서는 적용된다.
- 닿지 않는 action(`applyTheme`, `editGraphPlot`, world route의 Canvas 폭)은 직접 호출되고 준비는 "use X directly"로 거부된다. Route action·없는 이름·비공개 method·속성은 기존 목록 오류. 원 action 자체 오류는 그대로 보고된다.
- 타입: 일반 action과 그 인자 타입은 허용, route action·없는 이름·틀린 인자는 오류(strict tsc).
