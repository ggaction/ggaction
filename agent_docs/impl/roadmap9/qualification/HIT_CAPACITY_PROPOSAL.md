# 100k native CSS hit 준비 정책 검토

## 진행 상태

- [x] 기존 handles WT/branch를 보존하고 별도 managed WT/branch 시작
- [x] point capacity 안정 source의 실제 100,000행·100,000 native circle 전수 검산
- [x] unmodified public admission의 원 거부와 실제 source/scene hash 보존
- [x] 기존 10k admitted 경로의 생성/mount 중복 work와 CPU 진단
- [x] 100k 관측 실행 전체 종료 및 owner별 최대 work 확정
- [x] 통합 담당의 구체 정책 검토와 기존 remainingApproval 범위 채택
- [ ] 제품 구현과 Current/type/public docs/실제 설치 소비자 검증

기준 source는 `9cb510f05028fed315c7cad2e62bff82c5e6f8e7`이다. 현재 WT는 관측 종료 후 root 안정 `def731fe2`로 fast-forward했다. 이 ref는 관측한9cb source를 포함하며
계측한 hitProgram/hitIndex/sceneFrame의 원 bytes는 동일하다. 관측 자체를 def731 재실행으로 주장하지 않는다.
Root 지시와 [remainingApproval](../AUTHORIZATION.json)의 기존 전체 승인 안에서 구체화한다.
아래 본문은 production 변경0인 원 진단 checkpoint의 검토 자료다. 이후 root 채택과 구현 진행은
하단 채택 기록 및 [정책 checkpoint](HIT_PREPARATION.md)에 구분한다.
이 기록은 STEP071/AT56/077, P95 또는 최종 qualification 완료가 아니다.

## 원 입력과 실패

원 입력은 `scripts/benchmarks/workloads.browser.js::nativeWorkloadInput("points", 100000)`과
같은 모든 row/좌표다. authoring은 새 Current point 옵션 `maxItems:100000`만 명시한다.
Canvas400×400/margin20/plotBorder:false, x/y domain[0,1], source keyField:id,
CSS rootTransform[1.5,0,0,1.5,7,11]을 유지한다. 샘플링/LOD/row drop이 없다.

- 입력 SHA256: `b68cab72c1abb6094e715d6e5caa84c54aacf18750ad4a22fb63e3b8c5b2c39f`.
- 실제 native circle100000 + background1 = scene100001. 모든 circle의 x/y를 독립
  식 `20+360*x`, `380-360*y`로 검산했고 입력은 변경되지 않았다.
- 실제 원 scene SHA256: `2297e402958325228fd9d1dc07de52e6d54b98743be8f3d89a603fb119b6eb3c`.
  데이터 logical identity는 정상 native allocation을 쓰므로 run별 scene hash는 같다고 주장하지 않는다.
  seed0의 좌표/행 입력은 동일하며 각 run의 실제 scene hash를 그대로 기록한다.
- 원 public `createInteractionSession`은 `hitProgram.js::prepareProgramHitFrame`의
  materialized item count100000 한도에서 배경을 포함한100001을 거부한다.
  이 에러는 성공, N/A 또는 off-by-one 수리로 분류하지 않는다.
- raw `identity.key` UTF-16 길이 합13,188,890, rowKey 길이 합2,888,890이다.
  첫 identity 검증 문자열만 이미10M보다 크다. 한 개 node guard만 완화하거나
  검증된 의미를 hash/짧은 transport key로 바꿔 원10M에 들어온다고 주장할 수 없다.

Current INTERACTION의 기존 node100000/preparation10M/query2M 계약은 그대로 현재 정책이다.
원 workload의 sizes1k/10k/100k, DPR1/2, warm5+30, CSS query들, seed0, hit8/12/20ms,
full-frame16.7/33/50ms와 scope 분모는 변경하지 않는다. Node 단발 관측은 이 browser 성능
계약을 측정하지 않는다. 이전 9query correctness도 후속 제품 검증에서 유지한다.

## 계측 경계

`.artifacts/hit-capacity/probe.mjs`는 public source entry만 소비한다. 먼저 unmodified100k
거부를 기록했다. 별도 Node loader는 loaded string에 spend/phase 카운터를 넣고 original/
instrumented source SHA를 남긴다. 10k는 guard를 그대로 둔다. 100k 관측만 node/work 초과를
기록한 후 계속하여 뒤의 비용을 수집한다. schema/identity/geometry/query 검증은 그대로다.
이 변형 실행은 제품이 수용한 증거나 공개 지원이 아니다. 코드/로그는 [hit-capacity-evidence](hit-capacity-evidence/diagnostic.json)에 SHA와 함께 보존하며 운영 source, fixtures, Current, manifests를 수정하지 않는다.

10k 독립 profile run의 실제 index 비용은 생성9,350,002 / mount9,377,268이다. 생성+mount의
metadata 호출은20,000회다. 원 scene/metadata가 immutable인데도 두 번의 index 준비가 같은
resource ref 정규화, metadata clone, semantic JSON signature를 반복한다. total program work
5,208,915와 index work18,727,831은 **두 준비와 세 query의 합계**이지 단일10M 초과가 아니다.
각 index는 원10M 안이고 query187씩이다. 별도 최초10k run은 allocator identity에 따른 sort
차이로 합18,728,425이며 둘을 한 run으로 합치지 않는다.

CPU 진단은10k 1회 profile에서 freezeOwned1,985 samples, GC821, arc subdivision append351,
ownDataProperties311을 보였다.100k 실행 중2초 OS sample은 WeakSet/ephemeron rehash가
주 stack이었다. 이는 어디를 더 감사할지 알려주는 단발 진단이며 통계적 속도나 P95가 아니다.

## 후보 비교와 제안 방향 — 아직 미구현

1. **전역 상수 일괄 상향**은 제외한다. 기존 scene/item/work/query와 animation/selection/
   reconciliation의 별도 한도를 그대로 바꾸면 요청하지 않은 다른 surface까지 넓어진다.
2. **point maxItems 자동 hit 승격**도 우선 제외한다. maxItems는 특정 native point owner의
   raw/concrete capacity다. composition의 합계·배경/guide·current sampled weighted sources를
   제한하지 않으며 source identity 문자열 비용도 설명하지 못한다. 새로운 authority token을
   dataset/primitive/codec에 퍼뜨리는 변경은 현 명시 session 정책보다 책임 범위가 크다.
3. **명시 session-local hit 준비 정책**을 우선 제안한다. 현재 createInteractionSession 옵션에
   closed `hitPreparation:{maxSceneNodes,maxWork}`를 추가하고, 생략 시 기존100000/10M을 유지한다.
   두 값은 own data safe integer만 받고 unknown/accessor/inherited fields는 거부 또는 기존 own
   optional 기본 처리에 따른다. 제안 hard ceiling은 scene200000 / work128000000이다. 원100k 호출은 scene100001 / work128000000을 명시한다. query2M,
   indexed entries100000, per-shape parts/clip/path 한도는 이 옵션으로 확장하지 않는다.
   정책은 session private runtime 상태 한 곳에 정규화해 보유하며 semantic/graphic/codec/trace에
   저장하지 않는다. 일단 만들어진 session의 정책을 command/frame이 바꾸지 못한다.
4. **정확 검증 결과 재사용**은 정책과 별도 작은 책임이다. hitIndex 안에서 전체 검증을 마친
   immutable metadata의 exact object에만 private WeakMap 결과(info/semanticKey/signature/cost)를
   붙일 수 있다. 같은 exact metadata가 mount/rebind에서 다시 쓰일 때 JSON/clone 중복만 줄이고
   기존 conservative preparation cost를 재과금하면 caller의 비용한도를 조용히 우회하지 않는다.
   caller-owned·shallow frozen·clone·다른 ref/epoch는 최초 전체 검증을 거친다. Object.freeze나
   core isOwned만으로 validated metadata authority라고 간주하지 않는다. 원 key/lineage를 축약하거나
   hash equality만으로 semantic equality를 대신하지 않는다.
5. **geometry 재사용**은 별도 증명 뒤 선택한다. 현재 fill-only circle도 stroke용 arc commands를
   미리 만들고, 동일 clip/transform을 각 shape에서 다시 검증·flatten·clone한다. exact owned clip+
   exact transform의 제한된 재사용은 가능하지만 caller clone/새 clip/current transform/metrics/font를
   잘못 공유하면 안 된다. 이번 공개 정책에 임의 clip 권한이나 일반 cache registry를 넣지 않는다.
   정렬의 실제 UTF-16 비교 과금은 기존 compareHitText 한 owner 그대로 유지한다.

## 100k 전체 관측 결과와 정확 옵션안

Node24.22.1의 loaded-source 관측은 원 guard를 기록 후 계속하는 mode로 전체 종료했다.
`--expose-gc` 없이 실행했으므로 loader의 optional GC 호출은 수행되지 않았다. 이 source 관측은
실제 모든 native shape/index를 준비했고 proxy geometry나 mocked source를 쓰지 않았다.

| 단계 | binding work | index work | entries / scene |
| --- | ---: | ---: | --- |
| createInteractionSession | 36,288,915 | 104,395,304 | 100000 / 100001 |
| mount 추가분 | 15,900,000 | 103,546,184 | 100000 / 100001 |
| 세 CSS query 합계 | — | 7,813 | 8 / 21 / 11 candidates |

생성+mount metadata 정규화200000회, sort 비교21699372회, 실제 UTF-16 비교26130864 units,
BVH bounds visit3000000회를 기록했다. 최초 기존10M 초과는 binding10000025/index10000356이다.
세 query는 exact row key를 각각 포함하며 query work1499/4156/2158은 기존2M 안이었다.
실제 scene SHA는 `1282dc66a29d682afde1ed990f803b9c14a4dcd14a77a12b7260735a8b937bfd`이고
입력 SHA/전수 geometry/입력 불변성이 원 실행과 일치한다.

단발 전체128453.75ms, 생성 준비63507.29ms, 최종heapUsed1959632648B/RSS2104541184B다.
이 메모리와 장기 준비 비용은 **추가 blocker**다. 한도를 새 옵션으로 수용하는 것만으로
성능 지원을 선언할 수 없다. Node22 무GC 관측은15:53/CPU14:38.24에서 중단했고 OS sample이
WeakSet rehash를 가리킨다. 해당 실행은 단계별 progress를 출력하지 않아 정확한 중단 item은
알 수 없다. Node22 강제GC 관측은 마지막40000-shape checkpoint에서 장기 정체하여 별도 중단했다.
Node22 원 heap1536MiB, GC 관측2048MiB, Node24 무GC2048MiB의 조건이 다르므로 엔진만의 문제라고
단정하지 않는다. 실패/중단을 삭제하거나 Node24 결과를 Node22 성공으로 대신하지 않는다.

제안 호출(아직 Current가 아님):

```js
const session = createInteractionSession({
  program, bindings: [],
  hitPreparation: { maxSceneNodes: 100001, maxWork: 128000000 }
});
```

- `hitPreparation` 생략 또는 `{}`는 기존100000/10000000이다. 명시 optional field의 own
  `undefined`도 기본값으로 처리한다. `null`, plain record가 아닌 값/accessor, extra key, non-safe integer,
  0/negative/NaN/Infinity는 거부한다. inherited optional getter는 읽지 않는다.
- `maxSceneNodes`는1..200000 inclusive. 모든 실제 scene node를 세며 배경을 무료로 빼지 않는다.
  하드200000은 기존 indexed-entry100000을 보존하면서 최대100000개의 비index 구조도 유한하게
  담을 수 있는 explicit ceiling 제안이다. 한 개 큰 root뿐 아니라 실제 중첩 Canvas의100002 등도
  자신의 정확 합계를 명시할 수 있다. 이것은 모든200000-scene가 work 안에 든다는 약속이 아니다.
- `maxWork`는1..128000000 inclusive. 기존에 분리된 binding 준비와 index 준비 **각 owner의**
  cumulative ceiling으로 동일 적용한다. 생성은 각각104.40M 이하, mount도103.55M 이하의 실제
  관측에 근거한 유한 ceiling이다. 한 native binding+index 교체는 최악256M의 합계 상계를 갖는다.
  현재10k가 binding+index합은10M을 넘지만 각 owner는10M 안에 들어온다는 기존 admission을 보존한다.
- `entries`, lineage array/resource refs의 기존100000 cap 및 shape/clip/path/snapshot/query 한도는
  그대로다. 새 정책으로 다른 consumer cap까지 승격하거나 row/content/identity 문자열을 생략하지 않는다.
- 정확한 scene/property/source/metrics object 검증 결과가 있어도 매번 요청 정책의 node count와
  보존한 conservative work cost를 재검사한다. 큰 정책으로 warm된 cache가 이후 default10M나 더 작은
  maxSceneNodes를 통과하는 권한이 되지 않는다. 원 query2M와 UTF-16 비교 owner는 변경하지 않는다.

### 중복 제거의 최소 순서

1. Metadata 정규화/info/semanticKey/signature의 exact-object 검증 결과를 재사용하고 기존 cost는
   그대로 재과금한다. sceneKeys도 exact owned scene의 실제 key 집합+검증 cost를 같은 경계로 재사용할 수 있다.
   caller/frozen/clone에는 최초 full validation을 수행한다. semantic duplicate collision 검사는 유지한다.
2. native scope의 immutable childPath를 한 번 준비하고, 검증한 동일 dataset ref를 같은 scope 준비 안에서
   canonical object로 공유한다. 모든 row마다 새 empty path/ref array/object를 clone하는 비용을 줄이되
   각 원 row/item key와 revision은 그대로 남기고 full metadata work를 유지한다.
3. 동일 scene/node/metrics/rootTransform 조합만 shape를 재사용한다. 바뀐 transform은 실제 geometry를
   다시 준비하고, 같은 clip+transform의 반복 geometry만 검증된 범위에서 공유하는 작은 helper를 검토한다.
   보유 cache는 per-preparation 또는 weak exact source + 마지막 transform 한 조합으로 제한하여
   매 mount마다 과거 frame/plan/asset을 계속 보관하지 않는다. font/schema2 profile도 exact key 일부다.
4. fill-only circle에서 사용하지 않는 stroke 경로를 선계산하는 중복은 별도 literal output/work 회귀 후
   제거 가능하다. generic path precision·clip·nearest/slop 수식을 바꾸거나 core immutable authority를
   이 작업에 섞어 재설계하지 않는다. 원 shape 수치/bounds/diagnostics·원 query 순서가 같아야 한다.

정책을 구현한 뒤에도 Node22/20/24 원100k의 native 입력·실제index와 메모리 비용을 각각 검증해야 한다.
이 중복 수리 전 장기 준비/heap 증가가 해결됐다고 기록하지 않는다.

## 모든 경로의 동일 정책과 실패 원자성

- `session.js`가 normalize한 정책을 native initial/preview/commit/updateProgram/history restore,
  mount/rootTransform rebind, authentic sampled frame에 동일하게 전달한다.
- `hitProgram`의 원 item/scene count, context+identity+shape preparation과 `hitIndex`의 sceneKeys/
  metadata/index build가 각각 명시 정책을 소비한다. 기존 각 owner의10M budget 분리 의미를
  축소하지 않는다. 한 binding+index 준비의 총비용 상계는256M이며 실제 생성140684219/mount119446184를 위 표와 구분한다.
- frame bridge는 exact current frame/index를 모두 준비한 다음 교체한다. 후보 초과·잘못된 identity/
  clip/asset/scene/schema 실패 때 기존 program/history/generation/frame/selection은 그대로다.
- 기존 exact native/current-source/row/role/childPath 권한을 보존한다. 새로운 capacity 숫자는
  source 권한이 아니며 unknown key, stale revision, borrowed child/native source, fake sampled proof,
  같은 수치의 외부 clone을 authentic frame으로 승격하지 않는다.
- composition은 root aggregate scene/entry/work에 과금한다. child마다 새 budget을 주거나 각 child의
  maxItems 합을 자동 허용하지 않는다. 실제 namespaced key와 childPath를 원 source에서 검증한다.
- sampled frame은 기존 animation output/node/work와 native origin proof가 먼저 유효해야 한다.
  hit opt-in은 animation endpoint10000이나 offline64MiB를 확장하지 않는다. 외부 raw frame snapshot
  10M도 별도 계약으로 남으며 native-owned snapshot의 exact ref가 이 한도를 우회하는 토큰이 아니다.

## 제품 변경 시 책임 파일과 검증

- 새 narrow owner 후보 `src/interaction/hitPolicy.js`; `session.js`, `hitProgram.js`, `hitFrame.js`,
  `sceneFrame.js`, `grammar/hitIndex.js`의 명시 private policy 인자만 연결한다.
- 별도 `types/interaction.d.ts`, Current INTERACTION, public interaction reference/example,
  installed fixture, 필요한 generated docs 및 SECOND_ARCHITECTURE의 runtime 정책 한 문장.
- Exact defaults/lower bounds/max/max+1/NaN/Infinity/negative/undefined/accessor/inherited/extra fields,
  ordinary frozen vs exact validated reuse, duplicate semantic inconsistency, long-prefix UTF16/surrogates/
  signedzero ordering과 원 work limit+1 negative를 유지한다.
- 원100k 모든 native item/identity/ref/row/clip 검산,9CSS query, transformed/nested/empty/no-hit,
  scene/entry 각각limit+1, mixed primitive 및 source revise 후 stale metadata negative.
- failed commit/async prepared update/history/rebind/frame generation 및 asset lease 원자성,
  current authentic sample/weighted/current font origins, direct caller clone negative.
- Node20/22/24 동일tar public entry/strictTS/docs/bundles와 browser DPR1/2는 source 안정 후.
  최종 P95는 root가 exclusive CPU의 최종 combined archive에서 시행한다.

## 구현 채택 기록 (2026-11-01)

Root가 이 문서 전체를 읽고 `AUTHORIZATION.json#remainingApproval` 범위의 구체안으로 채택했다.
기본100000/10M, 명시200000/128M 및 독립 binding/index 최대256M, 기존entries/query/snapshot/selection/animation 한도 불변을 승인했다.
정책 정본은 import 역전을 피하도록 `src/grammar/hitPolicy.js`에 두며 기존 hitIndex 상수 export는 보존한다.
handles 안정 `93d1c1109`에서 별도 branch를 만들고 진단758만 cherry-pick했다.
최소 정책 연결을 먼저 검증하며 exact-object metadata/scene/shape 중복 제거는 다음 별도 checkpoint다.
현재 구현에서 session의 다섯 private bound wrappers와 region/resize/edge helper의 명시 인자가 모든 준비 경로에 동일 정책을 전달한다.
이 값은 persisted state나 frame authority가 아니며 실제 성능 qualification은 수행하지 않는다.

## 11월2일 최소 metadata proof 수리의 채택

원 동일 tar Node20 기능검증이 기본 heap에서10:20 동안 끝나지 않아 해당 child만 중단했다.
OS sample과 원 실패를 보존한 뒤 root는 qualification에 필요한 exact metadata proof 재사용을
정책 checkpoint에 포함하도록 허용했다. 최초 full validation 뒤 exact canonical owned tree의
info/semanticKey/signature/cost만 재사용하고 기존 보수 비용을 현재 policy에 다시 과금한다.
Caller/clone/frozen/shallow-owned 입력과 scene/shape/source/asset 권한은 우회하지 않는다.
Core global WeakSet, heap, fixture, query·selection·animation cap, SLO는 변경하지 않는다.
Scene/shape 중복 제거는 여전히 후행 독립 checkpoint다.
