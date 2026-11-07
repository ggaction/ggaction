# Point node 지역 동결: 읽기 전용 검토

상태: `ready-for-review`, 제품 구현0. Root의2026-11-02 후속 읽기/loader prototype 지시에 따른다.
기준 runtime body는 `425d76230`, checkout은 metadata pin `094386bfb`다. 안정 positions
checkpoint는 그대로 보존하고 별도 `codex/roadmap9-frame-node-review`에서 문서/증거만 쓴다.
기존 [설계](frame-local-freeze-design.md)의2단계를 그대로 구현할 수 없음을 실제 반례로
확인하고 아래 좁은 대안을 검산했다. 기존 remainingApproval의 검토이며 제품 채택은 별도다.

## 구체 대안과 두 가지 반례

Point properties는 기존 concrete validation 후 `freezeOwned`로 완성하고, **node 외피도
`freezeOwned`를 유지한다**. 방금 `interpolateNodeFrame`이 만든 offset/clip 배열, clips 배열의
새 rectangle 배열들, clips 배열 외피만 bottom-up `Object.freeze`한다. 기존 path clip 객체는
exact owned endpoint 자손을 빌리므로 다시 stamp/freeze하지 않는다. Point branch의 다른
수학/구조/분기·frame/decision/renderer/compiler/provenance는 바꾸지 않는다.

모든 추가 emission/exit와 기존 key/node 검사 뒤 `nodes.every(isOwned)`가 참일 때만
완성된 nodes vector root를 `freezeOwned`한다. 하나라도 참이 아니면 기존 scene
`cloneAndFreeze({version:2,width,height,nodes})` 경로를 그대로 쓴다. 단순 Object.isFrozen,
key/hash 또는 caller가 만든 record로 이 proof를 발급하지 않는다. Node/props는 계속
owned이므로 이 fallback에서도 이미 완성된 point node를 그대로 재사용한다.

1. 처음의 node 외피 Object.freeze-only prototype은 hit index의 `sceneKeys`가 각 node에
   `isOwned(node)`를 요구해 current-hit/retention 등6회귀를 실패했다. Node 외피 ownership을
   제거하는 안은 거부한다. Hit/interaction authority 검사 완화나 별도 proof 전달을 제안하지 않는다.
2. Geo/GeoText/axis-label collector는 일부 추가 emission node 외피를 raw local로 만든다.
   무조건 nodes vector stamp는 mutable 자손을 숨긴다. 실제 point+Geo+GeoText 혼합
   probe에서 every-owned=false → 기존 clone fallback을 확인했다. 추가 family node를 이
   checkpoint에서 임의로 stamp하거나 보편 deep-freezer를 추가하지 않는다.

## 참조별 불변성 근거

| Source root | point node 또는 다른 emission의 출처 | 완성 경계 |
| --- | --- | --- |
| planner native endpoint | `projectAnimationEndpoint`→`canvasSceneSnapshot`; closed scene node | exact deep-owned node/props/clip 자손 |
| restored endpoint | 실제 graphic/identity/position 검산, closed sampled node fields, 전체 clone | 같은 exact immutable endpoint; native authority 복원0 |
| point `...to` | key/type/topology primitive, 기존 owned props·frame 자손 | 새 props/frame으로 덮는 경로만 복사 |
| point properties | `...to.properties`, validated appearance patch, finite x/y/radius | 빌린 object 자손은 owned; 새 geometry/paint 값은 primitive; 기존 concrete validator 후 root-owned |
| `interpolateNodeFrame` offset/clip | authentic endpoint finite tuple의 기존 interpolateNumber 결과 | 그 호출이 만든 새 finite local 배열만 freeze |
| clips rectangle child | 같은 함수의 fresh vector | child 먼저 freeze; 새 clips 외피 freeze |
| clips path child | from endpoint의 owned path clip/commands | exact borrowed owned 참조 유지; caller stamp0 |
| normal exact track | `return to` | 기존 owned endpoint node |
| enter/exit | `fadeAnimationNode` | 기존 full concrete validation+cloneAndFreeze |
| nonpoint semantic guide/polar/cartesian/partition/graph | 기존 sample branch | concrete validation+cloneAndFreeze 그대로 |
| unsupported point/다른 fallback | `blendAnimationNodes` | weighted-source 검산+cloneAndFreeze 그대로 |
| ordinary timeline patch | `timeline.node` | patch가 있으면 기존 concrete validation+cloneAndFreeze; 없으면 위 완성 node 그대로 |
| Geo extra emission | `geoFrameCollector.at`의 raw node | owned로 추정하지 않음; scene clone fallback |
| GeoText/leader extra emission | `geoTextFrameCollector.at`의 raw node | 같은 fallback |
| axis-label extra emission | raw node를 timeline.node에 전달; patch 없으면 raw | exact isOwned 검사; false이면 같은 fallback |

Native node shape와 offline `validateSampledEndpointMetadata`의 closed field 목록은
key/type/topology/properties/offset/clip/clips다. Identity 객체를 새 node에 임의로 싣지 않는다.
Decision/meaning의 identity·native source 권한은 기존 별도 owner가 그대로 맡는다.
새 cache/global WeakSet/plan 또는 이전 frame 참조는 추가하지 않는다. Scene/graphicSpec은
여전히 완전 물질화되고 renderer는 graphicSpec만 읽는다. Compiler의 mutable caller scene
snapshot/validation 경로도 바꾸지 않는다.

## 실제1k loader 비교

[prototype loader](frame-node-review-evidence/prototype-hooks.mjs.txt)는 src 파일을 쓰지 않고
해당 source seam만 치환한다. 같은 저장 program을 두 child에 주어 baseline425와 prototype을
비교했다. Native/offline 전체 frame·positions 의미·batch·sampled rebase와 원 좌표 전수,
timeline geometry clock+paint 및 그 rebase 전체 frame, point→square fallback, 1k point+Geo+GeoText 혼합 scene의 full frame/meaning을 old/new로 검산한다.
원 work와 v3/v4 native 및 sampled-rebase bytes/SHA는 동일하다. 이 근거는 제품 pass나
큰 fixture pass가 아니라 읽기 prototype 결과다.

| 원1k 중간 sample 관측 | 기준425 | node-owned 대안 |
| --- | ---: | ---: |
| core clone allocations | 11,036 | 6,035 |
| core owned registrations | 13,048 | 10,048 |
| 전체 WeakSet.add | 24,085 | 16,084 |
| 전체 WeakSet.has | 52,152 | 39,151 |

Counter는 정확한 선택 sample 한 호출 동안만 켰다. 전체 WeakSet 수는 core owned registry와
clone ancestor 및 다른 private proof를 합치므로 모두 global registry라고 부르지 않는다.
속도 개선 비율·CPU/P95·heap/GC 회수/50ms 통과를 계산하지 않는다. Root 장수명 WeakSet
rehash OS sample과 이1k 결과는 별도 관측이다.

남는 WeakSet.add의 nearest non-core caller는 position kernel4,006, scalar를 vector로 부르는
mapLinearValues4,000, point node/props2,000, sample frame/vector/decisions2,010,
canvasSceneProgram2,016, endpoint matching/source callback2,001이다. 나머지는 collector/
endpoint/provenance 마감 등51회다. 이는 stack 기반 귀속이며 수식/원 work를 바꾸지 않는다.
Scalar 후보는 [별도 제안](prepared-scalar-mapping-review.md)에 두고 이 안에 묶지 않는다.

## 소형 회귀와 지원 경계

최종 every-owned 대안은 Node22 animation owning759/759다. Node24 node-unowned 초안은
752/759, node-owned 중간안은758/759였다. 남은 GeoText camera literal deepEqual의1ULP
차이는 loader off인 같은 Node24 원본에서도 재현되고 Node22 원본9/9는 통과했다.
이 unrelated math 차이를 숨기거나 epsilon으로 test를 바꾸지 않았다. 해당 raw를 보존한다.

독립 boundary probe8경로는 v3/v4×point-only/point+Geo+GeoText와 v3/v4×path clip/
ordinary timeline patch를 검산한다. 모든 reachable object 동결, offset/props/clip command
mutation 거부, caller clip 미동결/미소유, shallow frozen clone/core-owned copy의 frame 권한0,
offline/rebase full frame 보존을 확인했다. 최종 owning은 enter/exit, nested, guide/geographic
추가 emission, fallback, timeline, retention/hit 반례를 포함한다.

아직 제품 코드/Current/types/public docs/schema/renderer 수정0, 설치 tar 소비자와 원100k
검사0이다. 채택 뒤 sample 한 owner 구현·직접 회귀/critical·같은 archive 소비자·원100k를
별도 checkpoint로 마감해야 한다. Vector proof를 무조건 켜거나 hit nodeownership을 없애는
변형은 이 검토의 안전한 대안에 포함되지 않는다. Eager meaning의 lazy 전환은 후속 읽기
후보로만 남기며 이 설계에 포함하지 않았다.


확장된 wholeframe 비교 결과는 baseline53,238,184B/prototype53,238,114B의 binary output이다. V8의 내부 참조 표현 크기와 값 동등성은 구분하며, 같은 값의 전체 frame/meaning과 위 animation wire bytes를 직접 비교했다. 첫 base64/stdout
harness의64MiB pipe 상한 실패를 보존하고, 입력/phase/검산을 줄이거나 heap을 늘리지 않고
동일 전체 결과를 local binary file로 넘겨 해결했다. 최종 비교는 정상 종료했다.
[원 비교 결과](frame-node-review-evidence/product-compare.json)와 [source/harness pin](frame-node-review-evidence/qualification.json)에
최종 every-owned loader·관측 script hash 및 source18개 SHA를 고정한다. Source/type diff0이다.


## 2026-11-02 좁은 제품안 채택

Root가 위 구체 source/loader와 관련 authority 경계를 읽고 기존
`AUTHORIZATION.json#remainingApproval`로 node-owned 대안을 채택했다. 안정094 branch는
보존하고 별도 `codex/roadmap9-point-node-state`에서 sample 한 owner만 구현한다.
Validated props와 node 외피는 freezeOwned, 방금 만든 tuple만 bottom-up Object.freeze,
모든 emission/exit 뒤 nodes.every(isOwned)가 참일 때만 root stamp, 아니면 기존 clone이다.
다른 branch/core/renderer/API/schema/수학/work와 consumer node authority는 변경하지 않는다.
실제 제품 소형/critical/1k→same-archive3Node/minified browser→원100k 슬롯 순서로 검산한다.
Scalar mapper와 lazy meaning은 이 채택에 포함하지 않는다.
