# Geo 원 vertex 용량과 preview 감사

## 상태와 결정 경계

- 기준은 HIT 최종 `ac96edb076fc9a299fa82e6ef18b63a2eb001845`, 새 branch는
  `codex/roadmap9-geo-capacity`다. HIT source/evidence를 수정하지 않았다.
- 이 checkpoint는 **읽기 감사·원 1k source 진단·구체 제안**이다. 제품 source/type/schema/guard,
  native fixture, required cell, SLO 변경은 0이다. 아래 공개 설계는 root 채택 전이다.
- [기존 전체 승인](../AUTHORIZATION.json)의 `remainingApproval`을 재사용한다. 2026-11-02 root가
  Geo 원 1k/10k/100k 용량·preview 감사를 배정하고, 구체안 채택 전 제품 변경을 보류하도록 지정했다.
  P 공개 v4 최종 large 검사가 우선이므로 이 감사에서는 원 10k/100k native loop를 새로 실행하지 않았다.
- 원 [qualification](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/qualification-delivery.ko.md)의
  Geo camera 16.7/33/50ms, CSS hit 20ms, production archive/Chromium/DPR1·2/seed0/network0/warmup5+30을 유지한다.
  이번 단발 source 시간은 P95·SLO 또는 전체 지원 성공이 아니다. AT56/STEP071/077은 닫지 않는다.

## 입력·원 실패·작은 독립 검산

원 입력 정본은 `scripts/benchmarks/workloads.browser.js::nativeWorkloadInput/prepareNativeWorkload`다.
Feature 하나의 LineString에 `[-30+60*i/(N-1), (i%2?1:-1)*5]`를 **전부** 넣는다. 기본 source-segment,
equirectangular scale100→200, translate[200,200], precision0.5, line width2/butt/miter10이다.
Geometry 개수1, raw vertex 수N, refined/output point 수, path command 수, graphic node 수를 혼동하지 않는다.

기존 실제 첫 stack은 [원 보존본](native-workloads-tool-evidence/capacity-audit/blocker-stacks.jsonl)에 있다.

| 원 입력 | 첫 거부 | 의미 |
| --- | --- | --- |
| 10k vertices | `resolveGeoMark → validateGeneratedItemLimit`: Geographic mark point count must not exceed10000 | source 크기 대신 투영 후 outputPoints 합계 |
| 100k vertices | `projectGeometry → lineCoordinates → countPrepared`: Geographic refined points must not exceed30000 | stream의 command와 연결된 refined point 상한 |

[원 resource 측정](native-workloads-tool-evidence/capacity-audit/source-resource-volume.jsonl)은
100k 입력 SHA256 `3abb4487631f9099de7725acc9bf1fec159d3c6807f5abeba6e583ef3d5d5079`,
JSON2,352,803B, 저장4,706,449B, positions100000, values300010, normalization work1,489,000을 보존한다.
이번에 재실행한 수치가 아니며 source 저장 성공을 full consumer 성공으로 해석하지 않는다.

새 [1k 검산](geo-capacity-evidence/geo-capacity-small-audit.json)은 원 입력 hash
`8028f2da2e9bbbcd45e287854f20e66f240d98da6dd30f88cc3a9d0bc2898fe6`로 수행했다.
세 scale100/√20000/200 모두 prepared1998/output1999/commands1999/parts1/stream work18916이다.
각 command를 독립 `x=200+s*longitude*π/180, y=200-s*latitude*π/180`와 비교했고 원 vertex와
인접 vertex의 산술 중간점을 순서대로 모두 확인했다. 최대 오차3.411e-13, source 불변이다.
실제 native camera decision과 CSS transform[1.5,0,0,1.5,7,11]의 coast hit도 확인했다.
첫 uninstrumented camera sample72.24ms/hit86.19ms는 단발 Node source 진단이며 최종 성능 수치가 아니다.
[호출 계측](geo-capacity-evidence/geo-capacity-calls.json)은 세 CSS 위치 모두 candidate1을 확인했다.

원 fixture의 정확 count는 다음 수학으로 구한다. 이는 100k full runtime 관측과 구별한다.

1. N≥1000에서 Δlongitude≤60/999°이고 latitude 차는 정확10°다. `lineCoordinates`의 span>5 조건으로
   원 segment마다 한 번 나누며 midpoint latitude는0이다. 양 반 segment의 latitude span은5°다.
2. h=5°(radians), u=Δlongitude/4, t=tan(h/2)라 하면 반 segment의 spherical midpoint와
   linear midpoint 차는 longitude≤atan(t²tan(u)), latitude≤atan(t/cos(u))−atan(t)다.
   이는 두 endpoint의 단위 구면 벡터를 더해 정규화한 식에서 나온다. N=1000의 최대 u와 scale200에서도
   Euclidean pixel error<0.000101이다. native precision/2=0.25보다 작으므로 source refinement가 끝난다.
3. projection stream의 perpendicular error도 이 Euclidean bound 이하라 precision0.5를 넘지 않는다.
   midpoint fraction 오차≤hypot(두 angular error)/h<0.000006<0.3이고,
   endpoint dot≥cos(h)cos(2u)>cos30°다. 따라서 pinned geographic math의 adaptive stream도 분할하지 않는다.
   Longitude[-30,30], 기본 center/rotate0, clipExtent=null, antimeridian 교차 없음이므로 clipping에서
   점/part를 추가하지 않는다. finite normalization rounding은 위 threshold와 큰 여유를 가진다.
4. LineString은 Z가 없고 lineEnd가 모든 점을 한 part의 M/L로 옮긴다. 따라서 prepared=2N−2,
   output=commands=2N−1, parts=1이다. 현재 source JSON array index 문자 비용까지 세면 stream work는
   `16*N + Σdigits(i), i=0..N−1 + 26`이다. 1k의 actual18916과 일치한다.

| N | prepared | output / commands | stream work | 근거 |
| --- | ---: | ---: | ---: | --- |
| 1000 | 1998 | 1999 | 18916 | 수식 + 원 입력 전수 native 검산 |
| 10000 | 19998 | 19999 | 198916 | 수식, 원 전체 native 재실행 없음 |
| 100000 | 199998 | 199999 | 2088916 | 수식, 원 전체 native 재실행 없음 |

[독립 count proof](geo-capacity-evidence/geo-capacity-count-proof.json)는 위 bound를 계산하고, 각 N의
첫/중간/끝3vertex×scale100/√20000/200의27개 작은 native probe에서 매번5commands를 확인했다.
이는 원100k 전체 fixture를 작은 것으로 바꾼 성능 측정이 아니라 수학 감사 보조다.
`maxCommands=199999`가 이 fixture의 **stream command admission**에 충분하다는 근거이며,
source/native schema/hit/offline 전체 admission이나 P95 성공을 뜻하지 않는다. 다른 projection/clip/precision은
추가 output을 만들 수 있으므로200000 명시 최대값도 모든 Geo 입력의 성공 보장이 아니다.

## 책임 경계 전수 대조

| 정본 owner | 현 경계 | 필요한 판단 |
| --- | --- | --- |
| `grammar/geo/input.js` | maxPositions1M/maxValues2M/depth128/work10M; source 옵션은 이내에서만 축소 | 원100k 저장 가능. 변경 불필요 |
| `grammar/geo/stream.js` | maxPoints≤30000, refined/output/commands 각각; refinement depth20 | 명시 native policy를 받아 세 실제 count를 계속 검산 |
| `materialization/geo/mark.js` | aggregate outputPoints10000, graphics10000, work10M | vertex와 item cap 분리. graphic count/work는 그대로 |
| `selectors/graphicCapacity.js` | exact point owner/raw dataset/type의 collection item capacity | path 명령 수 권한과 다르다. point 권한을 Geo에 빌려 쓰지 않음 |
| `grammar/pathTopology.js`, `pathCommands.js` | default command30000, dense own finite M/L/C/Z, subpath 문법, owned cache | 새 **명시 concrete path** 한도만 검증; 기본·clip·다른 generator는 그대로 |
| `schemas/graphic.js`, `concreteGraphic.js` | path 허용 property와 값 정본 | concrete 선언은 여기서 닫고 실제 명령 수와 매번 대조 |
| `pathGeometry.js`, `schemas/graphicBounds.js` | topology 검증 후 flatten/bounds; flatten points1M/depth20 | 필요한 호출별 capacity를 전달하며 수식·순서·오차·point cap 불변 |
| Canvas/SVG/PNG/PDF | concrete validator와 path trace/serialization; PDF/PNG는 Canvas 공통 preflight | source/semantic을 renderer가 읽지 않고 같은 path를 한 번 그림 |
| `persistence/validation.js` | graphic property + native resource/binding 별도 검증 | editable native exact owner와 standalone concrete 정책을 구분 |
| `grammar/animation/geoState.js` | binding/source/camera 재검산; stream 후 output10000 | binding policy로 current projection 재실행; generated item cap 불변 |
| `animation/geoTracks.js` | sample 전체 outputPoints10000/work10M | source-bound output budget을 group별 검산하고 기존 전체 work10M 합산 |
| `materialization/animation/geoPresentation.js` | native/current expected geometry·identity·drawing slot·origin 검산 | capacity의 native/current/offline closed 전달, fake node index 없음 |
| `grammar/hitShapes.js`, `hitStroke.js` | input/flattened commands30000, stroke parts30000, geometry/stroke work1M | 별도 실제 blocker. path 선언만으로 자동 허용하면 안 됨 |
| `grammar/hitIndex.js`, `hitPolicy.js` | index entries100k, query2M; hitPreparation은 binding/index 준비만 | 128M preparation을 path/query 권한으로 오용하지 않음 |
| `animation/envelopeCodec.js` | 현재 base에서는64MiB/1M value occurrences/depth128 | P 공개 v4 정본과 통합 후 용량 판단. 원 보호 한도 임의 증가 금지 |

Canvas의 `canvas/path.js`, SVG의 `svgSerialization.js`는 그대로 한 path를 그린다. PNG/PDF는
`canvas/index.js`와 `canvas/native.js`의 같은 concrete preflight/trace를 사용한다. 30k씩 다른 path로
나누면 cap/join/dash phase/opacity/outline/shadow/holes가 달라질 수 있으므로 그 방식은 채택하지 않는다.
Clip path는 별도 구조이며 이번 선언을 상속하지 않는다. Arc/Trail/curve/pattern/route generator의
기본30000도 이 Geo 필요 때문에 일괄 상향하지 않는다.

## 제안 A — native 출력과 concrete path의 명시 용량

가장 작은 공개 후보는 기존 Geo create/edit에 아래 선택 옵션을 추가하는 것이다. 새 mark나 source kind는 없다.

```js
chart.createGeoLineMark({
  id: "coast", geometry: "world", stroke: "#2563eb", strokeWidth: 2,
  capacity: { maxProjectedPoints: 200000, maxPathCommands: 200000 }
});
```

1. `capacity`는 source가 아니라 **native Geo binding**의 실행 정책 한 곳에 저장한다. 같은 geometry가
   서로 다른 projection/precision/mark를 가질 수 있기 때문이다. 정확 geometry ref와 coordinate→projection,
   interpolation/winding/routeHint 및 정책을 native preflight가 함께 확인한다. point/shape/line/graticule의
   기존 비annotation Geo owner만 대상이고 source/text의 capacity를 추론하지 않는다.
2. 미지정은 현재 값(output10000/stream commands30000) 그대로다. own-data closed object만 받으며
   생략 field는 기본값, 명시 undefined/null/accessor/상속 property·unknown key·소수·음수·무한대는 거부한다.
   각 명시 값은 정수1..200000 후보다. source normalization의 maxPositions1M은 그대로다.
3. `maxProjectedPoints`는 해당 mark의 실제 outputPoints 합계, `maxPathCommands`는 해당 mark의 실제
   commands 합계다. stream의 기존 refined/output/command 세 개별 검사는 동일 maxPathCommands로 제한한다.
   refined counting을 output과 합산해 새 의미로 바꾸지 않는다. generated circle/graticule 내부의 별도 제한은
   자동으로 확대하지 않는다. graphic parts10000, work10M, depth20, clipping/precision 수학은 유지한다.
4. 출력 path는 optional **`properties.maxCommands`**를 가진다. default30000, 명시 최대200000이며
   native owner가 요청한 maxPathCommands를 복사한다. `commands`는 기존 M/L/C/Z 배열 그대로다.
   semantic ref·source digest를 renderer에 추가하지 않는다. capacity는 명령의 진위를 증명하는 token이
   아니라 bounded concrete 선언이며, actual length/dense own records/order/finite 값은 모두 검증한다.
   비Geo standalone concrete path도 같은 명시 선언과 최대값을 만족해야 한다. 이것이 공개 extension primitive에
   만드는 정확한 추가 표면이므로 root 채택 대상에 포함한다. 선언 없는 기존 path는30000을 넘을 수 없다.
5. `validatePathCommands/resolvePathSubpaths`에 닫힌 호출별 capacity를 전달한다. **cache hit 전에** 현재
   count/policy를 재검사하거나 capacity별 proof를 보유한다. 다른 한도로 검증된 owned array, frozen clone,
   caller alias를 통해 낮은 policy를 우회하지 못한다. bounds/flatten/renderer/weighted source/scene/codec/hit가
   concrete 선언을 유지한다. default 생성자/clip에는 explicit 선언이 없으므로 현 제한을 지킨다.
6. native graphic edits/restore에서는 exact scoped Geo owner와 binding의 선언을 실제 output에 대조한다.
   다른 layer/resource/child의 capacity를 가져오거나 native 선언만 더 크게 변조한 snapshot은 거부한다.
   standalone graphic codec는 semantic 권한을 주장하지 않고 독립 concrete schema로 검증한다.
7. create/edit/source revise/projection edit/Canvas-derived projection의 모든 후보를 먼저 검산한다.
   capacity 부족은 program/trace/resource revision이 바뀌기 전에 실패한다. same-owner sampled/rebase/offline은
   현재 geometry와 policy를 flat state에 보존한다. 첫 구현은 양 endpoint의 policy가 다르면 명시 fallback으로
   둔다. 기존 appearance/clip/source-topology fallback을 지우지 않는다.
8. native Geo payload의 새 binding shape는 `native-geo-camera` version 변경과 함께 닫는다. 공개 plan version은
   P v4 합산 기준을 받아 정하며 예전 snapshot 결과를 조용히 변경하지 않는다. guide/partition/GeoText version을
   관계없이 올리지 않는다. 원2-node scene은 animation item cap을 올릴 필요가 없다.

이 안은 source 원100k 입력을 유지하고 한 native path로 출력하는 최소 후보다. 원 stream의199999 command는
수식으로 닫았지만200000 정책이 실제 원100k의 모든 consumer를 통과했다는 결과는 아직 없다.
전수 관측이 수식과 다르면 원 counts/첫 stack을 보존하고 수학과 구현의 차이를 해결한다.

### 대안과 채택하지 않은 경로

- geometry source의 maxPositions만 확대: 이미 저장 가능하며 화면 출력과 직접 관계없음.
- 전역 MAX_PATH_COMMANDS/MAX_GENERATED_ITEMS 상향: 모든 임의 primitive/clip/generator의 정책을 바꿈.
- renderer option만 확대: program 작성·scene·hit·animation·persistence가 같은 concrete를 거부함.
- hidden WeakMap만으로 큰 path 허용: source-free graphic/offline transport가 권한을 재구성할 수 없음.
- source hash token만 붙임: 실제 명령·policy·ref 검사를 대체할 수 없음.
- path chunk/LOD/vertex skip/precision 또는 interpolation 변경: 원 workload·시각 수학이 달라짐.

## 제안 B — preview 중복 준비 제거

[실제1k 호출 계측](geo-capacity-evidence/geo-capacity-calls.json)의 중간 sample1회는
`sampleGeoInterpolation:1`, `projectGeometry:1`, `normalizeGeoAnimationPresentation:2`,
`normalizeAnimationGeoGroup:3`, `snapshotGeometryJSON:6`, `cloneAndFreeze:6037`이다.
clone 수는 재귀 호출을 포함하므로 할당 수나 CPU 비율이 아니다. 계측은 제품 수식/guard를 변경하지 않았으며
이전 입력/scene hash를 canonical 결과로 대체하지 않는다. 독립 실행의 native logical identity가 달라지므로
별도 실행 scene hash를 동일하다고 주장하지 않는다.

capacity checkpoint 뒤에는 exact immutable 원 feature/geometry/winding/binding/policy의 검증을 준비 시 한 번
보유하고, sample에서는 새로운 camera/radius/style와 실제 stream 결과만 검산하는 좁은 proof 재사용을 제안한다.
기존 normalization visit/문자/stream work의 보수적 비용은 재과금하고 현재 정책으로 재검사한다.
WeakMap은 정확한 private normalized input만 인정한다. caller/frozen/clone/restore는 전체 검증한다.
source revision/fit/clip/policy 변경은 별도 준비이며 옛 program/plan 연쇄를 저장하지 않는다.
원 output scalar 연산 순서와 모든 endpoint/current/offline forward check는 유지한다.

정확한 call owner는 `normalizeGeoAnimationPresentation → normalizeAnimationGeoGroup`,
`resolveGeoAnimationPresentation → normalizeGeoAnimationPresentation → resolveAnimationGeoGeometry`,
`resolveAnimationGeoGeometry → normalizeAnimationGeoGroup → projectGeometry`다. 새 일반 cache/registry나
global immutable 변경은 필요 없다. CPU attribution 전에는 이 호출 수만으로 P95 개선을 단정하지 않는다.

## Hit와 offline의 별도 blocker — A만으로 완료할 수 없음

[실제1k footprint](geo-capacity-evidence/geo-capacity-hit-small.json)는 path1999에 stroke parts3297
(triangle998, quadrilateral2299), stroke preparation work14189, compiled point work15492,
shape conservative query charge65267이다. 수학적 collinear midpoint라는 이유로2996parts를 기대한
[진단 가설의 실패](geo-capacity-evidence/geo-capacity-hit-small-original-hypothesis.err)를 보존한다.
실제 native floating-point/miter predicate가301개 추가 join을 만들었다. 이를 epsilon 변경이나 drop으로 숨기지 않는다.

2N-1 패턴과 같은 native stroke가 큰 입력에도 유지되는 경우만, parts는3N-4..4N-5,
compiled point work14N-13..19N-18, conservative shape charge59N-54..80N-75 범위다.
100k에서는 query charge만 **5,899,946..7,999,925**로 현2M보다 크다. 이 범위는 원100k 관측값이 아니다.
따라서 다음 세 조건을 구분해야 한다.

1. 큰 concrete path admission에는 호출별 path 한도 전달이 필요하다.
2. 현재 stroke 전수 준비는30000parts/1Mwork 한도에 추가로 막힌다. 명시 bounded concrete path에 한해서
   최대400000parts/2M geometry 준비라는 파생 후보를 검토할 수 있지만, 이 또한 실제 큰 count가 확정되기
   전에는 채택/구현하지 않는다. 기존 arbitrary/text/clip/curve의 기본 cap은 보존한다.
3. 기존 `hitIndex`는 narrow-phase 전에 전체 `hitShapeWork`를2M query에 선과금한다. preparation 정책을128M으로
   바꾸어도 해결되지 않는다. 모든 stroke part를 동일 scalar로 만들고 private spatial index에서 실제 방문하는
   footprint의 보수 비용을 과금하는 안이 필요할 수 있다. 이는 전체-shape 선과금 정책의 **명시 변경**이므로 단순
   cache 수리로 몰래 적용하지 않는다. query2M, exact distance/clip/rootTransform/dash/join/outline/identity/candidate
   ordering은 유지하며, index build 비용과 전체 part count를 빠짐없이 제한해야 한다. public path를 나누는
   chunking은 하지 않는다. 이 안을 채택하지 않는 동안 원100k CSS는 pending/explicit-limit으로 남는다.

Offline도 별도다. base의 두 endpoint에199999commands씩 있다면 각 command의 object+op+x+y만으로
1,599,992 value occurrences가 필요하여 현1M envelope 보호를 넘는다(geometry/metadata 이전 하한).
P 공개 v4가 정하는 기존 capacity/compact transport 정본을 먼저 받아 합친다. 새 병렬 envelope 포맷이나
값 cap 무조건 상향을 만들지 않는다. exact command/source 배열 공유를 표현할 경우 expanded visits/bytes와
단일 최대 배열을 별도로 검증하고 malicious DAG 증폭을 막아야 한다. 최종 full-frame equality까지는 pending이다.

## 구현·검증 순서와 변경 후보

1. **정책+concrete admission:** `grammar/geo/mark.js` 및 작은 Geo capacity 정본, `actions/geo/marks.js`,
   `materialization/geo/mark.js`, `grammar/geo/stream.js`, `schemas/{graphic,concreteGraphic}.js`,
   `pathTopology/pathCommands/pathGeometry/graphicBounds`, 정확 native graphic capacity selector,
   primitive edit/persistence 검산. `types/program.d.ts`, concrete/scene types 및 Current GEOMETRY/PRIMITIVES,
   api geometry/rendering 예제도 같은 checkpoint에서 동기화한다.
2. **current camera/codec:** `grammar/animation/geoState.js`, `animation/geoTracks.js`,
   `materialization/animation/geoPresentation.js`의 기존 owner를 확장한다. 이미 있는 shared collector/scene/node
   cap을 새로 만들지 않는다. P v4와 exact kernel/version/transport를 정합한다.
3. **별도 hit 구체안:** `interaction/hitConcrete.js`, `grammar/hitShapes.js`, `hitStroke.js`, `hitIndex.js`의
   실제 large 관측 이후 source-bound shape admission/공간 index/과금 정책을 다시 명시한다. 작은 기존 literal
   전체와 signedzero/clip/transform/outline/shadow/dash/holes/nearest를 보존한다. 원100k item cap 및 UTF-16
   문자열 과금과 HIT checkpoint source는 이 감사에서 변경하지 않는다.
4. **준비 재사용:** A/B의 correctness가 고정된 뒤 exact proof 최적화를 별도 commit으로 수행한다.
   동일 scalar/commands/hash를 전후 비교하고 policy 재과금·clone/alias/forgery 실패를 검증한다.

필수 counterexamples는 limit와limit+1, policy낮춤, unknown/inherited/getter 입력, caller mutation,
다른 owner/ref/revision/namespace capacity 복사, edited command/policy, native와 standalone restore,
weighted source, compound holes/antimeridian/complement, null/hidden/multiple source parts, 동시 resource revise
실패 원자성, 현재 sample/rebase/offline, default30000 유지다. all4backend는 각 backend의 native expected path와
같은 run의 public output을 비교하고 renderer간 antialias 차이를 equality로 강제하지 않는다.

Root가 large 슬롯을 열면 **원 입력 그대로** 10k→100k의 actual raw/refined/output/commands/work/parts/bytes를
먼저 관측한다. 모든 원 vertex 순서·독립 투영값·source 불변·current camera의 native-geo decision·실제 CSS
lineage를 확인한다. 같은 최종 archive의3Node/productionChromium/DPR1·2와 네 renderer 기능 검증을 닫은 후에만
최종 exclusive P95를 별도로 수행한다. 실패/명시 한도는 successful timing으로 집계하지 않는다.

## 재현과 무변경 검증

`geo-capacity-evidence/manifest.json`은 기준 source, 조사 owner SHA256 및 모든 새 진단 파일 hash를 보존한다.
Repository root에서 Node22로 실행한다.

```sh
node agent_docs/impl/roadmap9/qualification/geo-capacity-evidence/geo-capacity-small-audit.mjs
node --loader ./agent_docs/impl/roadmap9/qualification/geo-capacity-evidence/geo-capacity-loader.mjs agent_docs/impl/roadmap9/qualification/geo-capacity-evidence/geo-capacity-calls.mjs
node agent_docs/impl/roadmap9/qualification/geo-capacity-evidence/geo-capacity-hit-small.mjs
node agent_docs/impl/roadmap9/qualification/geo-capacity-evidence/geo-capacity-count-proof.mjs
```

첫 loader는 default parameter의 괄호를 단순 정규식이 처리하지 못해 시작 전에 종료됐다.
`geo-capacity-calls-initial.err`를 보존하고 해당 diagnostic loader만 수리했다. 제품 실패나 runtime 수리가 아니다.
이번 checkpoint는 내부 record/evidence만 추가하며 package/build/browser/전체suite/대형100k 검사는 실행하지 않았다.
