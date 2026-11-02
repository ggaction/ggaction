# Frame decisions·compiler wrapper 소유권 재사용: 읽기 전용 검토

상태: 제품 미채택. 기준 source는 `e1a4b7517d59ff1fb39a90e5eae167e026a3734c`다.
제품 source·API·schema·runtime guard·fixture·SLO 변경은 0이다. 별도 loader만 두 owner의
최소 후보를 실행한다. 기존 scalar checkpoint는 그대로이며 root의 이후 strict cursor와
frame metadata 변경은 이 비교에 포함하지 않았다. 채택 판단은 기존
[remainingApproval](../AUTHORIZATION.json)을 재사용하는 root가 맡는다.

## 제안과 소유권 경계

| 값 | 현재 생성자·소유권 | 후보 처리 | 유지하는 소비자 경계 |
|---|---|---|---|
| `sample.js` local decision | `sampleNode`의 enter/exact/semantic/crossfade와 exit가 매 sample 새 record 생성. 검증된 plan에서 받은 index·key·role·reason만 가진 primitive record | 모든 emit과 generated-node 검사가 끝난 뒤 각 child를 `freezeOwned`, 완성된 local vector도 `freezeOwned` | outer frame `cloneAndFreeze`, frame capture와 sampled endpoint metadata의 decision 검산은 그대로 |
| Geo·GeoText decision | `createGeoAnimationDecision`이 identity/closed fields를 검산하고 `cloneAndFreeze`한 owned record | 같은 loop에서 기존 owned ref 반환 | geographic proof·native stream identity 그대로 |
| Axis label decision | `axisLabelDecision`이 identity normalize 후 새 primitive record 생성 | 같은 loop에서 child와 vector의 core ownership 확보 | guide identity/owner/labels 검증 그대로 |
| Compiler `object` wrapper | `compile`이 각 node마다 새 `{type,properties}` record 생성 | `isOwned(object.properties)`인 경우에만 새 wrapper를 `freezeOwned` | 최종 compile 결과의 `cloneAndFreeze`, 기존 compiler 모든 node·clip 검증 그대로 |
| 기존 owned properties | 정확 scene에서 offset과 clip origin 차가 0일 때 `position`이 그대로 반환 | 기존 ref 재사용. 이미 owned인 props의 새 부모만 stamp | 모든 출력 descendants의 core ownership 유지 |
| 번역된/borrowed properties | `position`의 번역 결과 또는 caller mutable props | 기존 final clone 경로 유지 | caller를 freeze/stamp하지 않음. 번역 중 오류와 뒤 node 검증 순서 유지 |
| Canvas/clip group, children, objects/order | compiler local이고 반복 중 mutation 필요 | 원래 final clone 유지 | clip ancestor 공유·draw order·좌표 유지 |

구체 후보는 [loader](frame-owned-prototype-evidence/loader.mjs)의 exact source seam 두 곳이다.
Wrapper는 원래 `{type: node.type, properties: position(...)}` 표현식을 그대로 먼저 평가하고
`isOwned(object.properties)`를 검사한다. `node.type`와 `position`의 평가 순서도 유지한다.
번역 결과를 compiler 중간에 먼저 clone하는 변형은 뒤 invalid node보다 앞 properties 오류가
먼저 나올 수 있으므로 채택 후보에 넣지 않았다.

Decision local field의 입력 경로는 `sampleTransitionWithBudget` 첫 줄의
`requireTransitionPlan`과 private transition state다. `metadata`는 sourceIndex/targetIndex,
guideKey/owner/itemKey, role, optional ownerKey만 복사한다. 들어온 record 자체를 받아 stamp하는
경로는 없다. 새 loop는 모든 decision push 뒤에 있으며 이후 collector finish와 capture는 이
vector를 수정하지 않는다. 정확 endpoint의 빈 decisions 경로는 기존 clone을 유지한다.

이 후보는 core ownership 등록 자체를 없애지 않는다. 이전 기각안인 unowned scene nodes나
Object.freeze-only child를 재사용하지 않는다. node·node.properties·clip·position·native proof는
전혀 수정하지 않으며 별도 cache도 만들지 않는다.

## 현재 호출자·소비자 확인

`canvasSceneProgram`은 sample의 완성된 scene, planner의 snapshot scene, graph presentation,
Canvas scene drawing, font/image/shadow 준비 및 exact prepared binding에서 호출한다.
`interaction/sceneFrame.js::ownHitScene`은 입력 snapshot과 size guard 이후 compiler를 거치고
모든 concrete node properties를 별도로 검산한다. 이 호출 순서는 그대로다.

Compiler는 여전히 scene 전체 concrete `graphicSpec`을 즉시 만든다. SVG namespace와
Canvas/PNG/PDF 렌더러는 같은 immutable graphicSpec을 읽고 native frame 권한은 기존
frameProvenance WeakMap의 exact frame에서만 얻는다. Mutable scene은 기존 snapshotSignature
own-property 검산과 content digest를 거쳐 내용이 바뀌면 새 graphicSpec을 만든다. Caller의
shallow freeze는 owned proof가 되지 않는다.

Decision 소비자는 `frameEndpoint.js::captureFrameMeaning`, sampled endpoint metadata 검증,
serialization/rebase/native hit 경계다. 현재 decision 값은 모두 primitive이며 각 child를 core
owned로 유지하므로 입력 검증·오류·권한 검사를 생략할 새 근거가 생기지 않는다.

## owner별 실제 1k 비교

[실행기](frame-owned-prototype-evidence/product-compare.mjs)는 동일 저장 입력을 별도 process의
원본 e1a와 loader 후보에 각각 공급한다. v3/v4, 0/25/37/50/75/100ms 전체 frame·native positions,
모든 row 독립 literal coordinate oracle, offline replay, batch, sampled rebase, geometry+color
timeline 및 timeline rebase, square fallback, Point+GeoText mixed 구성을 비교했다.

| variant | clone | core owned add | 전체 WeakSet.add | WeakSet.has |
|---|---:|---:|---:|---:|
| e1a 원본 | 2035 | 8048 | 10084 | 23155 |
| decisions만 | 1033 | 8048 | 9082 | 21152 |
| wrapper만 | 1034 | 8048 | 9083 | 22154 |
| 두 후보 | 32 | 8048 | 8081 | 20151 |

v3/v4에서 같은 counter가 나왔다. Decision clone/ancestor 등록 1002개, wrapper 1001개가
각각 사라지고 실제 core owned 등록 8048개는 유지된다. 이 수는 instrumented diagnostic이며
시간·P95·SLO 개선을 의미하지 않는다. 100k 실행은 하지 않았다.

세 variant 각각 모든 frame·meaning·native/offline/rebase/timeline wire가 exact equal이었다.
Preparation work 771686, rebase work 451681도 동일하다. v4 native 345803 bytes,
rebase 422310 bytes, v3 native 1822845 bytes, rebase 2381600 bytes가 그대로다.
원본 source SHA와 wire SHA는 개별
[decisions](frame-owned-prototype-evidence/product-compare-decisions-linear.json),
[wrappers](frame-owned-prototype-evidence/product-compare-wrappers-linear.json),
[both](frame-owned-prototype-evidence/product-compare-both-linear.json) 보고서에 있다. 변형 source SHA는 qualification에 별도로 기록한다.

## guard·ownership·수명 검증

[Boundary/lifetime 실행기](frame-owned-prototype-evidence/boundary-lifetime.mjs)는 baseline과 세
variant를 각각 새 process에서 비교한다. compiler의 7개 type admission, caller mutable 업데이트,
owned exact props reuse, translated props copy, 일부 props만 owned인 scene, 출력 전체 child
ownership을 검사했다. 여기서 type admission fixture는 compiler 범위 증거이며 shape의 공개
렌더링 의미는 아래 별도 renderer 회귀로 확인한다.

Getter와 shallow-frozen getter는 읽기 0회로 거부된다. Duplicate key, 잘못된 clip/offset/version,
cycle, function-only, 앞 node function + 뒤 invalid type의 오류 class/message가 원본과 모두
같다. 마지막 조합은 compiler의 뒤 node 검증이 기존처럼 앞 function final clone 오류보다
먼저 일어남을 입증한다. Caller scene/borrowed props는 owned·frozen으로 바뀌지 않았다.

현재 plan과 다음 frame을 강하게 유지한 상태에서 이전 sampled frame·scene·graphicSpec·decision
vector·point decision·point node·properties·compiler wrapper 8개 WeakRef는 baseline과 세 후보
모두 5회 event-loop/GC 후 생존 0개다. 새 global cache나 closure는 없고 기존 compiled WeakMap은
scene을 weak key로 쓰는 수명을 유지한다. 이는 작은 retention smoke이며 100-cycle leak
qualification 완료를 뜻하지 않는다. [원시 결과](frame-owned-prototype-evidence/boundary-lifetime.json).

## 재현과 남은 채택 의무

Node22.23.1에서 다음 명령을 실행한다. `FRAME_VARIANT`는 `decisions`, `wrappers`, `both`다.

```sh
FRAME_VARIANT=both node agent_docs/impl/roadmap9/qualification/frame-owned-prototype-evidence/product-compare.mjs
node agent_docs/impl/roadmap9/qualification/frame-owned-prototype-evidence/boundary-lifetime.mjs
FRAME_CANDIDATE=1 FRAME_VARIANT=both NODE_OPTIONS=--import=./agent_docs/impl/roadmap9/qualification/frame-owned-prototype-evidence/loader.mjs node scripts/run-tests.js all capability:animation capability:hit-testing unit/renderers/ unit/canvas-scene.test.js unit/scene.test.js
FRAME_CANDIDATE=1 FRAME_VARIANT=both NODE_OPTIONS=--import=./agent_docs/impl/roadmap9/qualification/frame-owned-prototype-evidence/loader.mjs node scripts/run-tests.js render charts/cross-feature-integration/variants/animation
```

최종 loader 기준 owning 회귀와 four-renderer 결과 및 SHA는
[qualification](frame-owned-prototype-evidence/qualification.json)에 둔다. 초기 loader도 animation+
renderer942, hit347, render52가 통과했고 평가 순서를 표현식 수준에서 유지하도록 최종 loader를
좁힌 뒤 전체를 다시 확인했다. 초기 passing raw logs도 보존한다.

권고는 두 후보를 같은 local-record ownership checkpoint로 채택하는 것이다. 최종제품 채택
시에는 source owner의 durable tests·critical coverage·architecture 기록, 원 100k guard/work/
wire/coordinate 확인, 통합 source 기준 동일 package archive의 Node20/22/24 및 browser 검증이
남는다. 이 검토 자체로 STEP closeout·SLO 통과·package qualification을 선언하지 않는다.
