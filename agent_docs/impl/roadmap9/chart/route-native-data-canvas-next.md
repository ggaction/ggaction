# B native data·Canvas 다음 연결 경계 — source 감사

`746f7847c`와 `3d368ed8f`는 검증된 unit layout/resource 연결 checkpoint다. 이 문서는 그 다음 남은 owner의 **읽기 전용 source 감사**이며 Canvas/fit/data 공개 지원이나 미정 내부 설계 채택을 뜻하지 않는다.

## Source revision

`actions/data/revise.js`의 `reviseData`는 원 namespace/row identity를 한 번 만든 뒤 같은 `apply`를 preflight와 실제 적용에서 각각 실행한다. `reviseUnitData`는 `createData` 또는 원 prepared source owner, data-source binding/receipt, field 검사, `applyRevisionPlan`, guide transaction, selection 검사를 순서대로 실행한다. 전체 source 후보 프로그램을 반환하거나 원 action을 임의 반복하는 대체 경로를 만들 수 없다.

`actions/data/sourceContext.js`의 prepared source는 exact child args의 WeakMap binding이고, `materialization/revisionIdentity.js`의 logical replacements는 동기 operation 동안만 열린다. Native generator를 await할 때 두 transient context를 유지하면 안 된다. 원 source revision plan/row identity를 소유한 locals와 각 동기 iterator step의 context 수명을 분리해야 한다. Prepared source handle은 일반 clone의 예외 목록을 늘려 해결할 수 없으며 해당 original registry owner가 먼저 결박해야 한다. Resource graph action만 B에 연결했다고 `reviseData`나 derived21개 alias를 완료로 볼 수 없다.

## Canvas

`actions/canvas/actions.js`의 `editCanvasStages`는 초기 state 검증/viewport preview/route 준비 뒤 실제 graphic/config 쓰기를 수행하고, 그 다음 guide/responsive generator에서 추가 viewport route job을 요구할 수 있다. 따라서 처음 얻은 screen route plan 한 개만 저장해 최종 native action에 넘기면 전체 경로가 닫히지 않는다.

`materialization/canvasResourceRevision.js`의 exact-constructor handler와 `actions/graphs/screenRoutes.js`의 private plan/call WeakMap은 최종 실제 semanticSpec identity와 viewport를 검사한다. 준비 단계의 후보 program에서 얻은 handle을 최종 receiver에 재사용하는 방식은 이 검사를 우회하게 된다. 최종 실행의 현재 receiver에서 원 owner가 plan을 만들고 원 primitive context로 소비해야 한다.

검토할 최소 연결은 Canvas native generator가 요구한 **순서 있는 원 route job/completion**을 준비 단계에 보관한 뒤, 최종 sync native generator가 같은 closed 단계에서 만든 원 job의 exact inputHash/refs/viewport/order를 검산하여 원 completion validator에 공급하는 방식이다. 준비의 후보 program은 버리며 원 wrapped preflight와 최종 native wrapper는 각각 실제로 실행한다. 새 registry proof, 일반 action replay, wildcard adapter, 후보 ChartProgram 반환은 허용하지 않는다. 원 validatedJobs/handler/primitive owner가 여전히 모든 권한을 소유해야 한다. 이 내부 연결은 아직 제품에 채택·구현하지 않았다.

추가 work는 실제 job/hash/result/primitive 검산만 합산하고 이미 실행한 worker work를 중복 charge하지 않아야 한다. 여러 viewport 단계의 retained completions와 현재 worker peak도 실제 동시 보유량으로 검산해야 한다. 순서 누락/중복/소진 후 추가 job은 원 프로그램을 바꾸지 않고 실패해야 한다.

## fitCanvas

`actions/canvas/fitting.js`는 `fitExactPlot` 및 `probe`에서 원 wrapped `editCanvas`를 호출한다. 일반 fitting은 side 순서, quarter-pixel binary search, per-side probe cache, iteration cap, 최종 accepted margin apply를 소유한다. Probe 후보 trace는 최종 native 결과를 대신하지 않는다.

현재 `probe`의 broad catch는 모든 오류를 ordinary fitting failure로 변환한다. B 연결에서는 abort/deadline/quota 및 exact prepared continuation mismatch가 이 catch에 흡수되어 성공이나 `overflow:report`로 바뀌어서는 안 된다. 원 v1 geometry failure와 report/error 계약은 그대로 유지해야 한다. Fit의 여러 native Canvas child는 original function/args/source/order가 결박된 좁은 경계가 필요하며, 현재 단일 native-plan consumption을 느슨하게 풀어 모든 child를 허용하면 안 된다.

## 다음 검증 의무

- source/derived의 speculative·actual 두 branch, row identity/selection/receipt/원 prepared handle과 args context 수명.
- Canvas의 nonresponsive/responsive/guide overflow/추가 viewport 단계, 원 screen private plan identity와 meaningful child trace.
- fit의 exact plot 및 일반 probe, cached probes/iteration cap/error/report, terminal abort/deadline/quota propagation.
- 조합/scoped/facet 및332개 감사 후보는 별도 정확한 union matrix를 계속 유지한다.
- 원 initial snapshot·clone·postMessage·native construction·final materialization100ms와 전체 heap/work 계량은 여전히 미검증이다.
