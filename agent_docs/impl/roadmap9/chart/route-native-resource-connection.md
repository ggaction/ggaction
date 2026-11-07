# Native resource update 연결

## 범위와 승인 근거

Root는 첫 B `editLayout` checkpoint 뒤 전체 승인 native union의 실제 data/graph/hierarchy/Canvas/fit 연결을 이어가도록 지시했다. `746f7847c`가 검증·push된 뒤 다음 최소 묶음은 `editGraphData`, `editFlowData`, `editHierarchyData`, `editInferredGraphData`다. 기존 [v2 채택](route-v2-adoption.md), [B 동기 invocation 채택](route-b-native-connection.md) 범위 안에서 원 wrapped action·original prepared WeakMap·primitive 권한을 유지한다. 아직 이 묶음의 최종 검증·전체 B 완료를 주장하지 않는다.

## 정확한 owner와 수명

- Observed/flow의 원 resource construction만 작은 helper로 옮기며 기존 action의 resolve→validate→construct→write 순서를 유지한다. B 준비는 같은 helper와 `prepareGraphResourceStages`를 호출하고 final native child는 같은 `writePreparedGraphResource`를 실제로 실행한다. 원 candidate-inferred chain, layout, route, Geo consumers와 meaningful child trace를 보존한다.
- Hierarchy는 기존 `writeHierarchyResourceStages`의 계산 plan과 primitive/materializer apply를 분리한다. 원 동기 진입점은 같은 generator를 즉시 소비한다. Partition focus recovery/selection pruning과 Tree/Treemap/Partition 소비자 검산을 생략하지 않는다.
- Exact Full native owner에 private `snapshot`을 함께 once-bind한다. Host가 default assembly를 import하는 변경이나 공개 registry 옵션은 없다. 일반 native args는 기존 strict own-data traversal+clone을 그대로 수행한다.
- 유일한 opaque 예외는 `editInferredGraphData({prepared,requestToken})`의 **원 inference registry가 이미 소유한 frozen handle**이다. 원 graphInference WeakMap 안에서 추출한 private exact-base reader의 동일 base/token/kind/signal 검산 뒤에만 그 identity를 유지한다. 구조복사·다른 base·token·kind는 준비 전에 실패한다. Raw args 객체를 await 동안 보관하지 않는다.
- B의 native child는 별도 entered receiver이므로 inference handle의 원 base 검산만 original base에서 수행한다. Final native invocation에서 원 inference registry와 원 signal을 다시 검사한 뒤 authentic B scope가 허용한 exact plan을 현재 primitive에 적용한다. 새 handle proof나 snapshot façade authority는 없다.
- Route admission은 exact 원 resource에서 시작한 기존 dependency DAG 전체의 영향받는 routes에 적용한다. Layout-only 판정으로 downstream inferred graph route를 놓치지 않는다. 준비된 route entries를 명시한 private plan 필드로 host에 돌려주며, 후보 ChartProgram을 최종 결과로 반환하지 않는다.

초기 snapshot/deep clone 및 graph/hierarchy construction의 완전 work·depth·heap 계량과 전체100ms는 별도 남는다. Scoped/composition/facet, 추가 viewport jobs, source/data/derived aliases/fit의 전체 연결도 이 묶음으로 완료되지 않는다. 실제 package·browser·3Node 증거를 고정하기 전 새 checkpoint로 내보내지 않는다.


현재 작은 실행에서는11개 native route 회귀와 원 inference host11개(앞선 결합21개) 중 observed/flow/raw inference/authentic prepared inference 연결을 통과시켰다. 초기 시도는 원 wrapped reader를 host에서 호출해 `Action source requires an active wrapped invocation`로 실패했다. 이를 우회하지 않고 원 WeakMap owner에 exact-base reader를 추출했다. 기존 wrapped reader는 authentic 확인 후 원 `actionSource`를 호출하는 오류 순서가 그대로다. 최종 coverage/3Node/source-free qualification은 아직 진행 전이다.


## 검증된 checkpoint

Node20.20.2/22.23.1/24.22.1에서 owning433개씩 통과했다. 원 core/action, encodedValueCursor,
jsonText, valueEncoding100/100/100과 기존 route/native/graph/flow/inference/hierarchy critical floors를
유지한다. 문서·catalog·타입·public argument/package 경계30개도 최종 통과했다.

단일 source-free tarball SHA `b04826b709ed055822e33a9641c70fe425fe11819a71aa372088205c6df95a36`은
1268entries/1,830,188packed/8,229,472unpacked bytes다. 세 Node에서 기존8 route method/space
사례에 resource5개(observed/flow/hierarchy/raw inference/authentic prepared inference)를 더해
실제 Worker로 확인했다. 각 Node의35개 Worker가 모두 종료되고 listener0이다. Type fixture는
원 공개 `ggaction/graph`의 PreparedInferredGraphData를 사용한다.

Chromium은 기존 route3개와 resource5개를 동일 archive의 실제 Worker로 확인했다. Worker22개
종료/listener0, 성공 job/completion20쌍의 정확 hash 검산, 취소4개의 publication0과 terminal1을
확인했다. 원 v1 기하 및 materialized graphicSpec은 같은 엔진 내에서 정확히 비교한다.
엔진 간 hash 같음이나100ms latency/전체 heap 상계는 주장하지 않는다.

최대 gzip Full795721/Basic426852/svg25672/graph75582/animation341583/interaction137529bytes를
기준으로 실행 중 ceiling을 정합했다. Graph 전체123modules에는 Full assembly/renderers0이며
순수 route worker38modules, inference worker32modules다. Root composite cap은 별도 실측한다.

[qualification/source pin](route-native-resource-evidence/qualification.json),
[재현 명령](route-native-resource-evidence/README.md), [union matrix](route-native-resource-evidence/union.json)이
정확한 증거다. 직접14개 중5개의 completed-unit native 연결이며 각 action의 scoped/composition/
추가 viewport 경로는 아직 부분이다. Source/data/derived/parameter update, Canvas/fit/간접소비자와
원100ms·large capacity는 계속 남아 있다.
