# Geo A3: 명시 path hit 준비와 footprint 공간 인덱스 검토안

## 진행 상태와 승인 경계

- [x] A1/A2 완료 source `45d086ecec9cc7b2d81f21625ebc79272612c439`에서 별도 review WT 생성
- [x] 기존 실제 1k footprint/호출 계측과 현재 hit owner의 세 독립 제한 확인
- [x] 아래 공개 정책·private index·비용·반례와 benchmark의 정확 diff 작성
- [x] Root 구체안 채택 기록
- [ ] 소형 product/prototype 동등성, 원10k/100k 실제 footprint 및 query 검증
- [ ] 동일 archive/browser P95·100cycle와 전체 consumer closure

Gate 상태는 `approved`다. [기존 remainingApproval](../AUTHORIZATION.json)은 이 범위의 설계 구체화를 이미 승인했다. 사용자에게 재승인을 요구하지 않는다. Root가 이 정확 문서의 채택/수정 판단을 기록한 다음 제품을 구현한다. 최초 review commit a14a50e3은 문서·적용 전 patch·정적 검증만 포함했다. 이후 채택된 제품 구현과 실제 적용 상태는 [구현 기록](GEO_HIT_A3_IMPLEMENTATION.md)을 따른다. 새 시각 결과나 native 권한을 만들지 않는다.

A1/A2의 native capacity/format5는 [완료 기록](GEO_CAPACITY_A2_IMPLEMENTATION.md)을 따른다. Scalar/Canvas compiler 최적화는 별도 owner가 진행하므로 이 안에 포함하지 않는다.

## 현재 막히는 위치와 측정의 한계

1. `interaction/hitConcrete.js::geometry(path)`는 이미 검증된 `properties.maxCommands`를 버린다. `grammar/hitShapes.js::geometry`는 다시 기본30000 command만 받는다. `flattenedCommands`와 `compilePath`도 별도 기본 한도를 가진다.
2. `prepareHitShape`는 실제 stroke 전체를 만들며 parts30000, `hitStroke`와 compile geometry의 work 각각1000000을 검사한다. 큰 native path를 허용해도 이 경계는 남는다.
3. `grammar/hitIndex.js::queryIndex`는 narrow phase 전에 `hitShapeWork` 전체를 query2M에 선과금한다. `hitPreparation.maxWork:128M`은 binding/index 준비의 정책이며 query 권한이 아니다.

기존 [실제 1k 결과](geo-capacity-evidence/geo-capacity-hit-small.json)는1999commands/3297parts/geometry point work15492/stroke work14189/query charge65267이다. 301개 추가 join은 원 floating-point miter 판단의 결과이므로 제거하지 않는다. [원 제안](GEO_CAPACITY_PROPOSAL.md)의100k charge5,899,946..7,999,925는 동일 패턴에 대한 수식 범위이며 아직 실제 footprint 전수 관측이 아니다. 따라서 아래 최대값은 유한 후보이고 원100k 성공이나20ms를 약속하지 않는다.

## 채택 후보: 기존 session 준비 옵션의 좁은 추가

```js
createInteractionSession({
  program,
  bindings: [],
  hitPreparation: {
    maxWork: 128000000, // 기존 binding/index 각 owner의 누적 준비 정책
    pathGeometry: {
      maxParts: 400000,
      maxWork: 2000000,
      maxIndexWork: 16000000
    }
  }
});
```

`pathGeometry`를 생략하거나 own undefined로 주면 기존 경로/오류/과금/통계 그대로다. Own plain record를 주면 명시 path index 경로를 선택한다. `{}`는 기존 크기의 한도에서 index 경로를 선택한다. 이 추가 정책은 session-local이며 program/scene/animation transport에 저장하지 않는다. 새로운 top-level public 함수/export는 없다.

| field | 생략 field 기본 | 명시 hard maximum | 정확한 책임 |
| --- | ---: | ---: | --- |
| maxParts | 30000 | 400000 | 한 concrete path shape의 실제 stroke footprint 합계; part 생성 전에 검사 |
| maxWork | 1000000 | 2000000 | 기존 stroke work와 compile geometry work 각각의 한도; 합계 budget으로 의미를 바꾸지 않음 |
| maxIndexWork | 10000000 | 16000000 | 한 path shape의 새 private index build/검증 총 비용 |

모두 safe integer1..maximum이다. Optional own undefined는 위 기본값, null/accessor/non-plain/extra key/NaN/Infinity/소수/음수/0은 거부한다. inherited getter는 읽지 않는다. Root가 maxIndexWork를 더 작게 채택하면 해당 값의 실제 build admission부터 검증하며 work 단위를 줄여 맞추지 않는다.

큰 한도는 **실제 concrete path에 own maxCommands가 있을 때만** 적용한다. 이 선언의 기존 정본 ceiling200000과 실제 command validation을 먼저 통과해야 한다. MaxCommands가 없거나 다른 primitive인 경우 기존 path30000/parts30000/work1M을 그대로 사용한다. Clip path·text에서 파생한 path·circle·rect·line에는 policy를 상속하지 않는다. Weighted source의 path는 source 자체의 own 선언을 따르며 바깥 blend나 다른 source 선언을 빌리지 않는다. 이 선택은 native source 권한이 아니라 bounded concrete 처리 정책이다.

`prepareHitShapeUnion`의 기존1M 합계 제한은 그대로 유지한다. 따라서 큰 weighted union은 여전히 명시 limit일 수 있으며 모든 weighted 경우를 성공으로 기록하지 않는다. 새로운 path policy를 weighted union 전체 한도까지 전파하는 변경은 이 제안에 없다. Focus anchor 역시 아래 별도 비용 범위 내에서만 성공한다.

## 원 수학과 비용의 보존

`prepareHitStroke`의 direction/filter/dash/cap/join/EPSILON/miter 연산과 생성 순서, `compileGeometry`의 tolerance0.125·root transform, fillRule·clip 수학은 변경하지 않는다. 모든 footprint를 그대로 만들고 각 commands/bounds의 독립 전수 equality를 먼저 검증한다. Path를 여러 public node로 분할하지 않는다. Domain identity/semantic metadata, z-order, candidate sorting, native/offline/frame 권한도 그대로다.

기존 branch의 과금은 byte-for-byte 같은 순서를 유지한다. Indexed branch만 query에서 전체-shape 선과금을 다음 실제 방문 과금으로 바꾼다. 이는 명시 정책 변경이며 단순 cache 면제가 아니다.

- 현재 `hitShapeWork = 1 + 4*geometryPoints + fillCount + strokeCount + clipGroupCount`는 준비 비용/보수 총량으로 보존한다. Binding owner의 기존 이 비용 과금도 그대로다.
- index build의 실제 cost를 binding 준비의 기존 maxWork에 **추가** 합산한다. 이미 검증된 shape 재사용도 저장한 build cost와 원 shape cost를 현재 요청 정책에 다시 과금한다. 같은 source에서 큰 정책으로 warm한 캐시가 작은 정책을 통과하지 않는다.
- Query는 기존 metadata/UTF16/sort/tree 비용 그대로, indexed shape 진입1, internal node 검사1, leaf part admission1, 실제 scalar footprint 판정 전 `4*그 part의 compile point count + 1`을 과금한다. 별도 fill/clip 계산은 수행 전에 해당 전체 보수 비용을 과금하고, clippedBoundaryDistance의 기존 callback 비용도 유지한다. 비용 초과는 계산 전에 실패하며 중간 candidates를 반환하지 않는다.
- 한 query에서 같은 part의 동일 판정 결과를 재사용할 때만 재판정 비용을 생략한다. Bounds만 방문해도 tree 비용은 과금한다. Shape 전체를 이미 검사한 `testedShapes` 재사용은 기존 범위 그대로다. Cache는 query-local이고 과거 pointer/frame을 보관하지 않는다.
- Direct private `hitShape` 호출도 indexed branch에 bounded spender를 가진다. Outer hitIndex는 같은2M spender를 전달한다. 기본 branch는 현재 `hitShape` 동작/순서를 유지한다. Default preparation1M/query2M/parts30k 상수 자체를 올리지 않는다. Indexed 여부/비용은 `hitShapes` private state에서만 읽고 caller가 result object에 붙인 flag를 믿지 않는다. Public shape/index 결과에는 typed buffers나 정책 proof를 노출하지 않는다.
- 큰 fill path의 winding과 복잡한 clip은 그대로 전수 계산하므로 query2M을 초과할 수 있다. Stroke index를 썼다는 이유로 fill/clip을 무료 처리하거나 holes를 union으로 바꾸지 않는다. 원 GeoLine은 fill 없음이므로 첫 적용 대상에 맞는다.

## Index 구조, 최악 비용과 메모리

Private owner 후보는 `grammar/hitPartIndex.js`다. Public scene나 source recipe를 저장하지 않고 exact prepared stroke parts와 CSS-space bounds만 소비한다. Per-shape immutable state에 index 하나를 둔다. Transform/style/commands/clip 정책이 바뀌면 새 준비이며 old frame/plan을 값에 보관하지 않는다.

1. 현재 scalar로 완성된 각 part bounds를 읽는다. 원 ordinal과32bit Morton key를 준비한다. Quantization은 index 순서에만 쓰고 footprint·bounds·distance에는 쓰지 않는다. Degenerate 축은0, finite extreme 값의 normalization은 scale-first 계산으로 닫는다. Key collision은 원 ordinal의 stable 순서다.
2. Uint32 key/order/scratch 배열로8bit radix4pass를 수행한다. Comparison sort나 input-dependent unbounded quickselect는 사용하지 않는다.
3. 정렬된 ordinal을 최대8part leaf로 나누고 leaf 범위의 중앙을 반복 이등분하는 균형 binary tree를 만든다. 각 node의 bounds는 child/part bounds 합집합이다. 겹치는 bounds도 분할 수/깊이에 영향을 주지 않는다.
4. N parts, L=ceil(N/8)이면 node≤2L−1, depth≤ceil(log2 L)+1이다. N400000이면 leaf50000/node99999/depth17 이하. Query가 모든 node/parts를 방문하는 경우도 가능하며 기존2M에서 명시 실패한다. Spatial index가 최악의query를 항상 통과시킨다는 보장은 없다.
5. Build work는 bounds scan/key 생성/각 radix count·scatter·256bucket prefix/leaf bounds/internal node emission을 각각 방문당1로 과금한다. 코드의 추가 순회·검증도 동일 방식으로 누락 없이 과금한다. 실제 cost와 loop별 count를 receipt에 저장한다. O(N) 유한 build라도 maxIndexWork 및 binding 누적 maxWork 둘 다 통과해야 한다.
6. Node는4×Float64 bounds +4×Uint32 metadata(자식/leaf 구간/min ordinal) =48B packed private buffer로 저장한다. Key/order/scratch는 각4N bytes다. N400000에서 index 추가 peak≤9,599,952B+radix1024B+작은 bounded stack, 최종 key/scratch 해제 후 retained≤6,399,952B다. 이 수치는 **typed buffer만**이며 JS footprint/commands/allocator overhead를 포함한 heap 상한 주장이 아니다. 실제 retained/RSS/외부ArrayBuffer는 별도 기록한다.
7. 모든 buffer 길이/byte 곱은 safe integer 검사 후 할당한다. Build 임시 참조는 성공/실패 시 해제하며 선택한 maxParts로 선검사한다. Shape literal의 기존1M/2M geometry cost 자체가 object 수를 제한한다. 원400k 전체 stroke 객체의 메모리가 실용적이지 않으면 checkpoint를 성능 실패로 남기고 별도 representation 검토를 한다.

## Query 정확성, nearest와 focus

Stroke query는 lower-bound 우선 탐색으로 현재 최소 distance보다 먼 node만 생략한다. Slop만으로 가지를 버리면 no-hit의 기존 distance가 달라지므로 허용하지 않는다. Root slop broad phase와 후보 순서는 그대로다. Equal lower bound는 min original ordinal로 안정화하고 distance 동률/±0 결과는 원 scalar reduction과 일치시킨다.

Bounds distance는 footprint를 포함하는 outward-rounded box로부터 보수적인 하한을 구한다. Overflow/NaN/정확한 rounding 포함 여부를 증명하지 못하면 하한0을 사용해 가지치기를 포기한다. 새 epsilon으로 실제 hit boundary를 옮기지 않는다. Lower-bound helper의 extreme finite·subnormal·signedzero를 독립 exhaustive oracle로 검증하기 전 최적화 경로를 켜지 않는다.

Nearest는 기존 clippedBoundaryDistance를 선택한 part에 그대로 호출한다. Clip은 footprint를 줄이므로 unclipped bounds 하한은 여전히 보수적이지만, clip 안쪽에 paint가 없는 경우 멀리 있는 part까지 찾아야 한다. Fill은 전체 winding 검사 뒤 기존 방식으로 처리한다. Touch slop/nearest maxDistance는 결과 의미를 바꾸지 않는다.

Focus anchor는 기존 **첫 유효 part 순서**를 보존해야 한다. 공간 정렬 순서로 첫 anchor를 선택하지 않는다. 기존 ordinal 순회와 clippedBoundaryPoint를 그대로 사용하고, indexed shape에 한해 실제 검사한 part/clip/edge 비용을 같은 bounded callback에 과금하는 별도 분기를 만든다. 각 candidate에 전체 state.work를 반복 과금하는 현재 방식은 default branch에 남긴다. Focus 비용 한도/호출자 spender를 query2M으로 자동 승격하지 않는다. 현재 호출자 한도 안에 못 들어오면 동일 원자적 limit이며 focus 성공으로 세지 않는다.

## 반드시 막거나 같아야 하는 반례

| 축 | 비교/거부 의무 |
| --- | --- |
| 선언/정책 | default/{}·각최소/최대/+1·낮춤·unknown/getter/clone·다른 source 선언 차용·clip/text 비상속 |
| 기하 | all part command/order/±0/bounds 전수; duplicate points·zero segment·closed seam·miter threshold 바로 양쪽·round/square/butt·odd dash/zero dash·cubic subdivision |
| 공간 | 모든bounds겹침·degenerate축·Morton동률·extremefinite·negative scale·회전/shear·singular transform·leaf 경계·동거리 tie |
| query | hit/no-hit의distance/localPoint/diagnostics/candidate order 전체; slop0/3/6·모바일pointer·nearest maximum±ULP·opacity0/hitInvisible |
| clip/fill | evenodd/nonzero holes·중첩clip·clip이paint내부·서로다른clip교차·emptyclip·큰fill 명시limit·outline/shadow 의미 유지 |
| weighted/focus | source order/weight0·source자체capacity·union1M 그대로·가장가까운part와첫focuspart가다름·첫part clipped out·late valid anchor |
| 자원 | preparation/index/query 각각limit−1/limit/limit+1·worst overlappingquery 실패·buffer product overflow·cached high→low policy 재과금·atomic failed mount/rebind/frame/history/async |
| 권한/수명 | native/current/offline의 기존구분·fakeframe/clone/revision 실패·candidate 실패시program/generation/selection/history 불변·oldframeWeakRef/100cycle |

## Owner와 단계별 최소 변경

1. Root가 이 정책과 과금 변경을 채택하고 본 문서에 정확 review commit을 기록한다. 소형 loader prototype에서 exhaustive footprint oracle와 scalar query oracle를 먼저 만든다. 원1k footprint3297 및 실제count를 기준으로 삼고 이상적2996으로 수정하지 않는다.
2. `grammar/hitPolicy.js`의 optional pathGeometry normalize, `interaction/hitConcrete.js`의 private concrete declaration 전달, `hitShapes/hitStroke`의 호출별 policy와 원 full-count 과금, 작은 `hitPartIndex` owner를 구현한다. 기존 five session wrappers를 통해 native/preview/commit/history/rebind/authentic sampled/handles 모든 준비에 같은 정책을 전달한다.
3. queryIndex의 default branch는 유지하고 exact indexed-shape 분기만 새 spender 경계에 연결한다. prepareProgramHitFrame의 기존 shape cost에 build cost를 더한다. shape↔index↔session 실패 원자성을 함께 검증한다.
4. Current INTERACTION/types/문서/consumer fixture/package·critical owner coverage를 동일 checkpoint에 동기화한다. 저장 format/schema는 바꾸지 않으므로 persistence 신규version은 없다. SECOND_ARCHITECTURE에는 private path index와 session-local policy 경계만 추가한다.
5. 원10k→100k exclusive 실행에서 모든commands/parts/hash,3CSSquery, rawwork/실제방문work, memory 및 원quota negative를 기록한다. 통과 뒤 canonical browser warmup5+30/DPR1·2,source-free archive3Node,100cycle로 확장한다. 입력/iterations/SLO 감소0.

## Canonical benchmark 적용 전 diff

[existing-policy.patch](geo-hit-a3-review/existing-policy.patch)는 이미 승인·구현된 A1/A2/point/hitPreparation 옵션만 원 driver에 연결한다. [a3-policy.patch](geo-hit-a3-review/a3-policy.patch)는 이 제안이 구현된 뒤에만 Geo CSS hit에 nested pathGeometry를 전달한다. 두 patch는 최초 review 시점에는 적용 전이었다. A3 구현 checkpoint에서 승인된 옵션 연결만 canonical driver에 적용했다. 첫 patch만으로 큰 Geo hit 성공을 주장하지 않는다.

원 input generation/hash·counts·projection/precision/line width·원3CSSquery·oracle·warmups/측정횟수·타이머 위치·SLO는 변경하지 않는다. Small tier는 기존 default를 보존하고 필요한10k/100k에만 명시 capacity를 선택한다. `fullFrameSampleMs/cameraPreviewMs`는 계속 sampleTransition 단독이다. 별도 Canvas draw 계측은 다른 이름의 진단으로 추가할 수 있지만 기존50ms를 renderer 포함 수치로 교체하지 않는다.

[정적 검증 영수증](geo-hit-a3-review/verification.json)은 두 patch의 순차 적용성, JS parse, 원fixture/threshold/timing 핵심문장 보존만 확인한다. Runtime·원큰입력·P95 통과 증거가 아니다.

## 2026-11-02 Root 채택

Root는 review commit `a14a50e3c19dbfe875e002503a7e65100be300a5`를 읽고 `remainingApproval`에 따라 pathGeometry의400k parts/2M geometry·stroke/16M index 준비 정책 및 indexed-query 실제 방문 과금 변경을 채택했다. 기존default30k/1M/query2M·오류·수학, own maxCommands와 명시 pathGeometry의 이중 조건, binding128M 재과금, union1M, clip/text 비상속을 유지한다. 제품 구현 전 작은 footprint 전수·scalar nearest/no-hit/focus oracle와 conservative lower-bound/극단값 검증을 먼저 확보한다. 기능 checkpoint는 공개정책·canonical benchmark의 두 patch·동일 archive 소비자까지 연결하며 미연결stub을 완료로 세지 않는다. 원100k는 scalar 작업 종료 뒤 root slot 조율을 거친다.
