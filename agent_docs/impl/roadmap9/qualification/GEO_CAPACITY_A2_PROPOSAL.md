# Geo capacity A2: animation 전송·예산 검토안

## 상태와 결정 경계

- 상태: **검토 자료, 제품 변경 0, A2 미구현**. 이 기록은 A2/Geo 전체/AT56/STEP071/077 완료나 성능 통과가 아니다.
- A1 source `784b2165c7f1d691d2f4951e26ebf2d46d0ea5f4`, 최종 pin
  `064ad32c072def3dda67c22c661affabb4c597f2`를 보존했다. 별도 branch는
  `codex/roadmap9-geo-capacity-animation-design`이다.
- 원 승인 [AUTHORIZATION.remainingApproval](../AUTHORIZATION.json)의 API/schema 세부결정 범위 안에서
  parent가 **구체안을 먼저 검토**하도록 지시했다. 아래 v5/옵트인/전송 후보는 아직 채택되지 않았다.
- 기준은 root `d6dece68e`의 공개 animation v4 및 A1 native capacity다. Source/math/정확 concrete
  endpoint를 생략한 뒤 복원 시 재생성하는 대안, chunk/vertex drop, 기본 guard/SLO 완화는 제외한다.
- 변경은 이 제안과 작은 증거 파일뿐이다. `src`, types, Current, public docs, package 입력은 수정하지 않는다.

## 정본과 실제 조사 범위

[A1 검증](GEO_CAPACITY_A1.md), [원 수치·책임 감사](GEO_CAPACITY_PROPOSAL.md),
`d6dece68e:agent_docs/contract/current/ANIMATION.md`, 같은 ref의
`animation-v4.md`, `animation-codec-private.md`, `animation-capacity.md`를 대조했다.
Native source/math은 `grammar/geo/{input,geometry,stream,capacity,markGeometry}`,
animation은 `grammar/animation/geoState`, `materialization/animation/geoPresentation`,
`animation/{geoTracks,geoFrames,planner,frameEndpoint,sample,frames,resources,columnCodec,envelopeCodec}`가 소유한다.

1. A1의 원 1k/10k/100k 전수 native/4backend 영수증은 **기존 증거를 재사용**했다. A2에서 큰 루프를 실행하지 않았다.
2. 새 실제 입력은 원 fixture 식의 N=1000/1500/2000이다. local A1의 기존 기본 Geo@1 공개 planner로
   native→native와 실제 중간 frame→native endpoint를 준비했다.
3. 그 실제 endpoint의 복사본에 제안 capacity/manifest/path declaration만 넣은 **후보 데이터**를
   root d6의 정확 column owner에 넣었다. 새 public A2 planner를 호출한 것이 아니다.
4. 별도 data-URL prototype은 d6 column source의 두 literal 하강 분기만 바꿨다. 기존 quota/reader를
   지우지 않고 작은 후보의 모든 값과 순서를 왕복했다. Binary 부분은 이 결과의 numeric vectors를
   정확 Float64-LE bytes로 옮긴 독립 전송 실험이다. **새 strict reader 구현 또는 100k 지원 증거가 아니다.**
5. d6의 전체 `src`/`package.json`을 별도 ignored snapshot으로 추출해 기존 공개 v3/v4 golden을 생성했다.
   두 버전의 serialize→deserialize→serialize bytes와 t=0/25/50/100 전체 frame equality를 확인했다.

## 현재 v4에서 먼저 걸리는 한도

원 native 한 path는 N개 source position에서 `L=2N−1`개의 실제 M/L command를 만든다.
A1이 원100k에서 확인한 L은199999다. Default clip/precision, 원 geometry 및 refinement는 그대로다.

현재 `columnCodec.lower`는 길이1 배열을 `{literal: wholeArray}`로 보존한다. Geo의 singleton
`items:[path]`와 `groups:[group]` 안의 commands/raw geometry도 그대로 literal에 남는다.
따라서 **node 수가2여도** physical/encoded 발생 횟수1M에 걸린다. Node 한도를 높여 해결할 수 없다.

다음 표의 100k는 작은 전수 입력의 구조와 실제 코드 count를 검산한 **계산값**이다. 100k 후보를 실행한 값이 아니다.
`physical`은 column packet의 값 발생 횟수, `encoded`는 기존 tagged value codec을 거친 값 발생 횟수다.

| 경로 | 실제 N=1000 physical / encoded | 실제 N=2000 | 원100k 계산값 | 판정 |
| --- | ---: | ---: | ---: | --- |
| 현재 v4, native endpoints |22507 / 59491|44507 / 117491|2200507 / 5801491|1M 초과|
| 현재 v4, sampled→native |22737 / 60078|44737 / 118078|2200737 / 5802078|1M 초과|
| compound 배열을 기존 Node.array/records로 하강, native |11067 / 12875|21067 / 22875|1001067 / 1002875|여전히1M 초과|
| 같은 하강, sampled→native |11327 / 13586|21327 / 23586|1001327 / 1003586|여전히1M 초과|

정확 기울기는 현재 native `22N+507 / 58N+1491`, sampled `22N+737 / 58N+2078`이다.
하강만 한 후보는 native `10N+1067 / 10N+2875`, sampled `10N+1327 / 10N+3586`이다.
이는 x/y scalar를 단순히 column으로 옮기는 것만으로도 100k+metadata가1M을 넘는다는 뜻이다.
처음의 `10N−4` 추정은 네 projected x/y와 두 raw x/y의 **scalar 하한**일 뿐, 당시 현 v4 측정값이 아니었다.
실제 vector에는 추가2개 selector scalar도 있어 저장 scalar 합은 `10N−2`다.

## 원 과금과 binary 후보의 작은 검산

후보는 기존 Node 변형과 row/key/shape 순서를 보존하고 `vectors[index]`에만 다음 닫힌 표현을 추가한다.

```js
// 아직 구현/채택되지 않은 전송 후보. Geometry나 command를 생성하는 recipe가 아니다.
{ kind: 'float64-le', length: N, base64: '...' }
```

Finite numeric vector만 정확 IEEE754 Float64 little-endian bytes로 저장한다. -0, subnormal,
인접 representable value를 포함해 Object.is 왕복했고 실제 endpoint의 모든 raw/projected 좌표도
deepEqual 왕복했다. 숫자 문자열 반올림·양자화·좌표 델타 추정·source/endpoint 재생성은 없다.
Mixed/nonfinite/undefined scalar vector와 literal은 기존 표현에 남는다. 기존 asset encoding을 도용하거나
숫자를 asset으로 등록하지 않는다. `core/contentDigest.contentBytesBase64`의 byte encoding 재사용은 가능하다.

| 원 logical/작업 항목 | native 100k 계산값 | sampled→native 100k | 기존 정본 상한 |
| --- | ---: | ---: | --- |
| expanded logical values |2200254|2200303|scoped12M|
| writer descriptor visits |2200253|2200302|scoped16M|
| reader descriptor visits |1600203|1600233|scoped16M|
| writer/reader cell visits |2200010|2200052|scoped16M|
| interning work |7200164|7200550|scoped prepared140M|
| raw preparation traversal |7758752|7759406|scoped prepared140M|
| raw Geo group values |300044|300044|geometry2M|
| raw positions |100000|100000|geometry1M|
| group snapshot+normalize work |1489471|1489471|10M|
| presentation snapshot values/work |300067 / 1289642|동일|2M / 10M|
| group-state snapshot values/work |300077 / 1289771|동일|2M / 10M|
| 현재 stream work 한 sample |2088916|2088916|전체 native sample10M|

작은 binary 후보의 **최종 wire+playback 구조**는 native physical1064/encoded2890,
sampled physical1318/encoded3587로 N1000/1500/2000에서 동일하다. Compact 내부 root와 최종 wire는
header 배치가 달라 수치가 다르다. 이전 compact 수치1090/2940 및1350/3651과 섞지 않는다.
N1000 최종 envelope는122326/126102B, N2000은228990/232766B다.

원100k numeric payload의 base64 문자는 정확10666656개다. N1000의 나머지 header/문자열을 유지하고
모든 encoded numeric 위치에 추가24B를 보수적으로 허용한 envelope 상한은
native10751686B / sampled10772190B로64MiB 아래다. 이는 실제100k envelope 생성 영수증이 아니다.
일반 다른 입력의 데이터량은 항상 자체 guard로 검산하며 이 fixture 수치로 권한을 주지 않는다.

`S(N)=Σdigits(i), 0≤i<N`라 할 때 원 preparation work는
`46N+2S(2N−1)+2S(N)+3204`(sampled는+654), stream work는 `16N+S(N)+26`이다.
writer/reader logical/cell 수는 binary 크기로 대체하지 않는다.
4회 interior sample은 stream만8355664, 5회는10444580으로 **기존 batch10M을 이미 넘는다**.
실제 batch는 generated node/동시 GeoText/axis 작업도 합산하므로5회는 반드시 실패하며,
4회의 전체 성공 여부는 구현 뒤 실제 검증해야 한다. 긴 offline schedule을 성공처럼 줄여 보고하지 않는다.

## 공개 옵트인 선택 비교

모든 선택은 아직 제안이다. 추천은 C이며 A/B/D를 묵시적으로 적용하지 않는다.

| 선택 | 구체 호출 | 기존 호출/reader/types 영향 | 판단 |
| --- | --- | --- | --- |
| A native capacity로 자동 선택 |binding.capacity가 있으면 v5|기존 both-node-options-absent→v3 및 명시 node→v4 의미를 바꿈; 저장 구현을 native domain에 결합|비추천|
| B v4에 새 columns/Geo kernel만 추가 |기존 node 옵션 그대로|기존 `version:4` reader는 새 kernel/vector를 못 읽음; 같은 공개 타입 숫자가 다른 reader 지원을 뜻함|비추천|
| C 새 format 명시 |`options:{durationMs:100, formatVersion:5}`|명시한 호출만 v5; 기존 options/bytes/error 순서 v3/v4 유지; type union3\|4\|5|추천 후보|
| D numeric 구현 명시 |`options:{durationMs:100, numericEncoding:'float64'}`|명시 호출만 v5 가능하지만 저장 구현명 노출; 형식 호환성 의도가 약함|비교 후보, 비추천|

C의 구체 계약 후보:

- `formatVersion`은 own 값5만 허용한다. 생략은 현재 분기를 그대로 실행한다. own undefined/null/3/4/문자열,
  accessor/unknown option은 거부한다. inherited getter는 읽지 않는다. 새 옵션에 대한 explicit validation만 추가하고
  **기존 입력의 descriptor 검사/required field/오류 순서**는 바꾸지 않는다.
- **새 format 외 별도 node 옵션을 필수로 요구하지 않는다.** 원 chart는 background+path로 endpoint당2nodes,
  합4nodes다. Node 수와 경로 좌표량이 다른데 `maxEndpointNodes:4`를 의무화하면 무관한 boilerplate다.
- Format5 명시 자체가 현재 v4와 같은 private resource scope를 생성한다. 두 node 옵션 생략 시 각각10000이며,
  명시했을 때만 기존 maxEndpointNodes≤200002/maxOutputNodes≤100001 규칙을 적용한다. Raw/cell quota는
  **기존 v4와 동일한**12M/16M/140M이고 증가시키지 않는다. Native program/정확 source owner/capacity/closed state,
  authentic flat frame proof를 현재 `createTransitionResourceScope`가 검증한다. 임의 객체나 clone은 권한이 아니다.
- Binding의 A1 `{maxProjectedPoints,maxPathCommands}`와 path.maxCommands는 원 native/graphic 정책이며
  format5가 이를 자동 확대하지 않는다. 반대로 capacity만으로 format5를 고르지 않는다.
- Types는 기존 v3 overload에 `formatVersion?:never`, 기존 v4 overload에도 같은 배제를 두고,
  `{formatVersion:5}` overload가 정확 version5를 반환하게 한다. 포괄 `TransitionPlan.version`만3\|4\|5로 확장한다.
  six public functions, endpoint union, callback/clock, sampled frame shape는 추가하지 않는다.
- Format5의 numeric transport는 같은 기존 typed family/명시 fallback만 저장한다. 새 semantic family/수학/가시성/선택
  권한을 추가하지 않는다. 다른 family를 포함한 format5 혼합은 같은 closed proof를 검증해야 하며 현재 준비값을 생략하지 않는다.

## 닫힌 v5 wire 및 legacy reader 정책 후보

```js
{
  kind: 'transition-plan', version: 5,
  limits: { maxEndpointNodes: 10000, maxOutputNodes: 10000 },
  kernels: { transition: 5, position: '기존 exact version', appearance: '기존 exact version',
    columns: 'animation-columns@2', geo: 'native-geo-camera@2', /* 실제 다른 family만 */ },
  durationMs, easing, from: Node, to: Node, vectors: ScalarArrayOrFloat64[], timeline?: Node
}
```

표기의 주석/placeholder는 설명이며 저장 shape의 임의값 허용을 뜻하지 않는다.
Node의 네 variant는 v4 그대로이고 새 닫힌 변형은 numeric **vector** 하나다. ScalarArray는 기존 정의다.
`columns`는 wire codec만 소유하고 Geo math version으로 codec을 숨기지 않는다.
Raw family payload에는 numericEncoding/formatVersion를 중복 저장하지 않는다.
wire5→columns2 strict decode 후 실제 원 raw endpoint를 복원하고 planner의 동일 endpoint 검증으로 들어간다.

| 입력 | reader/출력 원칙 |
| --- | --- |
| 기존 v3, 기존 options(두 node 옵션 own-absent) |기존 literal export/reader/오류 순서와 bytes 보존|
| 기존 v4, 기존 explicit node 옵션 |기존 columns1 writer/reader, kernel/bytes 보존|
| explicit format5, Geo capacity 미사용 |wire5/columns2; 기존 Geo@1 또는 없는 Geo kernel, 기존 수학/기본 policy|
| explicit format5, endpoint 중 하나라도 own Geo capacity 사용 |wire5/columns2/Geo@2; 각 group이 자기 binding policy를 검산|
| v3/v4에 v5 vector/columns2/Geo@2 주입 |닫힌 기존 reader가 거부; 새로운 값을 old 의미로 해석하지 않음|
| v5에 unknown columns/Geo kernel 또는 manifest 불일치 |확장 전에 header 거부; 복원 뒤 actual family/own capacity와 manifest도 재검산|
| 기존 reader에 v5 |명시 unsupported/closed-shape 오류, 호환을 가장하지 않음|

V3/V4의 현재 capacity-미지원 동작을 새로운 typed 성공으로 바꾸지 않는다. Capacity를 animation에
사용하는 새 typed 경로는 explicit format5/Geo@2로만 들어간다. Old raw payload에 capacity를 추가해도
권한이 생기지 않는다. 기존 @1 packet의 reader는 별도로 보존하여 version 상수의 전역 교체로 깨뜨리지 않는다.
동일 group에서 capacity policy가 달라진 경우는 기존 binding 비교의 `geo-binding` fallback을 보존한다.
낮은 policy를 높은 쪽으로 합치거나 min/max로 새 정책을 추론하지 않는다.

## 확장 전 검증과 기존 과금 보존

1. 기존 envelope64MiB/encoded+decoded 각1M/depth128/closed own-data/digest 검사를 먼저 수행한다.
2. Version5/header/kernels/limits를 별도 closed reader에서 확인한다. Old3/4 reader를 우회하거나 느슨하게 하지 않는다.
3. Packed vector의 `kind,length,base64` 정확 fields, safe length, finite-number-only 규약,
   `8*length`/`4*ceil(bytes/3)` overflow 및 canonical ASCII padding을 allocation 전에 검산한다.
   중복/unused vector도 모든 storage scalar 길이를 기존 cell quota에 계상한다. 비canonical padding/길이 위조,
   NaN/Infinity/-0 손실/엔디안 변조는 거부하거나 strict forward mismatch로 거부한다.
4. Selector/run/reference/row shape를 기존 reader와 같이 검증한다. 실제 expanded occurrences와
   각 reference의 cells/descriptors를 **공유/압축 전 개수로** 합산한다. Repeated vector/constant가 비용을 숨기지 못한다.
   원 root logical count와 physical packet count는 서로 다른 검사다. Decode 후 JSON1M을 원 raw에 재적용해
   v4의 expanded quota 의미를 지우지 않으며, raw를 physical로 잘못 축소해 세지도 않는다.
5. 모든 길이와 projected expansion이 승인된 기존 scope에 들어온 뒤에만 byte buffer/Float64 cells/raw trees를
   할당한다. Binary 저장은 `retainUnique`의 **physical packet 과금 이전**에 적용해야 한다. 이번 작은 prototype의
   post-pack 순서를 제품100k 경로에 그대로 옮기면 원1M guard에서 먼저 실패하므로 구현안이 아니다.
6. 원 preparation traversal/Geo snapshot·normalize/work/input cap을 다시 과금하고 raw/camera/identity/ref,
   concrete path command/maxCommands, semantic↔graphic equality를 동일 native forward owner로 검산한다.
   숫자 하나를 바꾸고 envelope digest를 새로 계산해도 family forward consistency를 통과할 수 없다.
7. 준비된 scope/token/codec proof는 native authority를 추가하지 않는다. Caller alias/clone/frozen object를
   인증하지 않고 현재 낮은 binding policy를 캐시 재사용 전에 재검산한다. No old program/plan chain을 유지한다.

## Native geometry와 전체 소비자 closure

| 소유자 | 필요한 최소 변경/보존 |
| --- | --- |
| `grammar/animation/geoState.js` |@1 reader/기본 수학 보존, @2에서 A1 binding capacity를 정규화. `projectGeometry.maxPoints`와 `geoPartGeometry`의 path declaration으로 전달; per-group aggregate projected points 검사. Pixel 역산 없음|
| `materialization/animation/geoPresentation.js` |exact native binding↔path.maxCommands 검산. 기본 group은10000 유지, explicit group만 자기 policy 적용. 서로 다른 group capacity를 빌려 쓰지 않음. 전체 source snapshot/parts/work 검사 유지|
| `animation/geoTracks.js` |current camera/feature style로 매 sample 재실행. 각 group 정책과 모든 group 합 work10M을 같이 검산. 전체 GeoText/axis callback에 원 비용 전달. 추가 global cap 상향 없음|
| `animation/geoFrames.js`, `sample.js`, `frameEndpoint.js` |actual path 선언/순서/identity/frame/clip과 flat raw Geo 의미를 그대로 보존. Exact t0/t1 원 참조, native origin, sample/rebase/timeline/weighted source를 유지. 기존 output node policy와 raw count 검증 유지|
| `animation/planner.js`, `resources.js` |explicit format5 분기·기존 resource scope 재사용, 기존 v3/v4 reader/writer 보존. Old plan 오류 순서 golden. No arbitrary public resource token|
| `animation/columnCodec.js` + 좁은 private numeric codec |versioned 하강/finite vector transport, expansion 전 원 count와 bytes 검산; 기존 scalar codec과 v1 reader 그대로. Generic core ownership 변경 없음|
| `animation/envelopeCodec.js`, `frames.js` |envelope 한도/기존 tagged codec 변경0 목표; batch10M/current actual work 원칙 유지. Export signature 변경0|
| 네 renderer/scene/persistence/weighted bounds/flatten |A1 선언 소비 그대로 재사용. 중간 및 restored frame의 실제 properties.maxCommands가 끝까지 도달하는지 검증; renderer가 semantic policy를 읽지 않음|
| types/Current/docs/installed |explicit5 overload/reader 호환 경계/필요성·예산·실패 사례 동기화. Source-neutral 명칭. Six API 수 유지|

Aggregate output의 기존10000 default 보호를 없애는 안이 아니다. Explicit group의 정책은 group에서,
default group들의 기존 aggregate10000은 기존 경계에서 유지하는 쪽으로 구현해야 한다.
Explicit groups 전체는 원 work10M/parts/node/output/batch guard로 제한하고 default group이 다른 group의
capacity를 상속하지 못하게 한다. 구체 loop와 음성례를 채택 후 owning tests에서 고정한다.
Original stream이 capacity200000을 넘도록 clip/precision/radius/rotation을 바꾸면 여전히 원자적으로 실패한다.

Hit stroke/path/query/selection cap과 CSS 지원은 별도 blocker다. 이 전송 후보로 묵시 상향하지 않는다.
Body only capacity 지원을 Geo Text·native guide·모든 clip/fallback 성능 성공으로 확대하지 않는다.

## 구현 후 필요한 검사(이번 checkpoint 미실행)

- Old v3/v4 golden bytes/frames/failure order를 새 source에서 재검증. Basic/browser boundary와 Node-free codec 유지.
- All own-field/accessor/inherited/undefined/null/version+kernel 변조, nonfinite binary/길이/padding/endian/unused
  vector/동일 vector 반복·logical amplification/정확 상한+1, caller mutation/atomic failure.
- Binding↔actual path maxCommands tamper, 낮은 policy 재기준/restore, nested child/same ID 다른 scope,
  no-feature/clip-hidden→중간-visible, failed revision/projection/Canvas, capacity mismatch fallback.
- Original1k/10k/100k vertices·1999/19999/199999 commands, 모든 원 좌표와 midpoint의 독립 투영식,
  exact native t0/1, camera retime/appearance, actual frame→plan rebase, whole frame/hash equality.
- Fresh-process network0 actual v5 payload 왕복, source-free Canvas/PNG exact·SVG/vectorPDF,
  weighted mixed path limits 및 exact endpoint/image/font 자산. Endpoint 원 concrete 저장 유지.
- 같은 batch10M 경계, 원100k의5 interior sample 명시 실패와4 sample actual charge,
  동시 Geo/GeoText/axis 작업 및 hidden zero-node 비용. 부분 batch 외부 노출0.
- Source/Current/type/docs/critical floors, 같은 archive Node20/22/24, production Chromium DPR1/2.
  큰 원fixture는 parent CPU 슬롯 예약 뒤 직렬 실행. Admission과 P95/SLO는 따로 기록한다.

## 증거·재현과 기존 cache 경계

[작은 현 codec 측정](geo-capacity-a2-evidence/geo-a2-columns-small.json),
[독립 후보 측정](geo-capacity-a2-evidence/geo-a2-columns-candidates.json),
[수식·과금 검산](geo-capacity-a2-evidence/geo-a2-count-proof.json),
[legacy golden receipt](geo-capacity-a2-evidence/geo-a2-legacy-goldens.json),
[파일 SHA256](geo-capacity-a2-evidence/SHA256.json)를 보존한다.

실행 Node는22.23.1이며 새 설치/archive/browser/large benchmark는 없다. Candidate scripts는 원래
`.artifacts/`에서 실행했고 복사 보존본도 그 위치로 옮겨 실행한다. Root 경로는 script 상단에 명시돼 있다.

```sh
# repository root에서, product files 수정 없음
cp agent_docs/impl/roadmap9/qualification/geo-capacity-a2-evidence/*.mjs .artifacts/
node .artifacts/geo-a2-columns-small.mjs
node .artifacts/geo-a2-columns-candidates.mjs
node .artifacts/geo-a2-count-proof.mjs
mkdir -p .artifacts/geo-a2-legacy-d6
git archive -o .artifacts/geo-a2-legacy-d6.tar d6dece68e src package.json
tar -xf .artifacts/geo-a2-legacy-d6.tar -C .artifacts/geo-a2-legacy-d6
node .artifacts/geo-a2-legacy-goldens.mjs
```

실제 사용한 root `columnCodec/resources/envelopeCodec`는 실행 전 d6 Git blob과 byte hash를 대조했다.
다른14 source 전체가 같은 archive라고 주장하지 않는다. Receipt의 P 원 공개 v4 기록과 d6 사이에는
`positions.js`/`appearance.js` 두 root 수리가 있고, 당시 root working tree의 `graphicCapacity.js`는 A1 통합으로
d6와 달랐다. 해당 차이·각 exact hash가 `sources`에 있다. 작은 codec은 native program authority 함수를
호출하지 않는 `createOfflineResourceScope`만 사용했다. Local endpoint generator는 A1 source이며
대상 새 public v5 제품은 없으므로, 어느 기존 package cache도 **A2 검증 archive로 재사용할 수 없다**.

Legacy golden은 immutable d6 snapshot에서 생성했다. v3 10407B/SHA `822ac7ff7df1edb9874803a92205dda9494251cbafa66702f0623c133a59d3fe`,
v4 12085B/SHA `408a6613bfec1bb1ead1009a5b5498c9cbe542845253bb2a16645215fe2e9f53`다.
두 old reader의 정상 왕복과 위조 version5 거부만 이번에 확인했다. **아직 없는 새 reader가 old payload를
정확히 읽는다는 결론은 아니며**, 위 golden은 그 후속 회귀의 고정 입력이다.

다음 단계는 C의 `formatVersion:5`·node 옵션 생략 기본값·columns2/Geo@2 및 default aggregate 보호 경계를
parent가 구체 채택하는 것이다. 그 전에는 제품 구현을 시작하지 않는다.
