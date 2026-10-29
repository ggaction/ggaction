# Geographic geometry, projection, stream과 camera

## 진행 상태

- [x] STEP042–046 원안·core·Geo 계약과 RFC7946/TopoJSON 규격 확인
- [x] 남은 전체 승인 재사용, 순수 owner와 source provenance 구체화
- [x] GeoJSON/TopoJSON 정규화와 독립 수치·오류 검사
- [x] Geometry resource/action·identity/revision·stored validation 공개 checkpoint 검증
- [ ] 15 projection registry·fit/inverse·split/clip/resample
- [ ] Native geo marks/guide/typed join/shared-arc LOD
- [ ] Camera·route·current frame·네 renderer·타입/docs/실제 데이터

[AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval`을 재사용한다. 기준은
공개 route `1fcebb828`이다. 각 개념의 검증 checkpoint를 분리하고 미연결 소비자를 완료로
표기하지 않는다. STEP042–046 및 AT30의 후행 통합까지 계속 진행한다.

## 첫 순수 경계

`grammar/geo/input.js`는 own-data JSON snapshot과 누적 work/position/feature/arc 제한을,
`geometry.js`는 GeoJSON geometry discriminator/좌표·closed ring 검증을,
`topology.js`는 quantized delta decode·transform·반전·junction·공유 arc를,
`normalize.js`는 feature/order/source path 및 source digest를 맡는다.
공개 action 등록이나 renderer I/O는 이 첫 checkpoint에 넣지 않는다.

원본은 plain JSON values이며 전체 own descriptor를 먼저 검사한다. Cycle·getter·sparse·
비유한 숫자·JSON 밖 값은 거부한다. Source hash는 tagged canonical values이며 실제 파일
bytes라고 주장하지 않는다. 공개 resolver 연결에서는 실제 bytes/hash/MIME를 별도 확정한다.
Geometry는 x/y 및 모든 추가 source 차원을 보존하고 2D 출력만 첫 두 차원을 소비한다.
Geographic latitude는[-90,90], longitude는 finite로 보존하여 stream에서 정규화한다.
Planar는 같은 finite 검증만 하며 spherical 해석을 하지 않는다.

FeatureCollection 순서와 properties/null geometry, GeometryCollection의 nested 구조를
보존한다. null/empty geometry는 drawable:false다. Ring은 최소4개의 동일 차원 position과
동일한 처음/마지막 좌표를 요구하며 방향/닫힘/좌표를 자동 수리하지 않는다. Polygon 첫 ring은
외부, 뒤는 hole이라는 구조를 보존한다. 자체 교차·hole containment의 후행 stream 처리와
단순 구조 유효성은 구분한다. Feature ID는 string/finite number이며1과"1"을 구분하고
중복은 거부한다. Generated/명시 featureKey identity는 공개 resource에서 기존 core owner로
만들며 source hash나 현재 배열 index를 logical identity로 쓰지 않는다. sourcePath는 lineage의
원본 위치 설명이며 identity가 아니다.

TopoJSON transform이 있을 때만 arc x/y를 delta decode하고 scale/translate한다. Point는
transform만 적용한다. 추가 차원은 변환하지 않는다. 음수 arc index는 ones-complement를
사용하며32-bit signed integer 범위를 먼저 검사한다. 연속 arc의 junction이 같을 때만 중복
좌표를 한 번 제거한다. 전체 shared arc vector와 원 arc reference 구조를 보존한다.
다중 object는 topoObject 필수이며 단일 object만 유일하게 추론한다. 선택하지 않은 object도
JSON snapshot 안전성은 검증하지만 geometry 정규화 결과는 명시 object만 반환한다.

기본 maximum은 features100,000/positions1,000,000/arcs100,000/JSON values2,000,000/
depth128이고 호출자가 더 낮출 수 있다. 누적 work는 기존10M validation owner를 재사용한다.
TopoJSON expanded positions도 별도 누적해 공유 arc 반복으로 budget을 우회할 수 없다.

## 규격 근거

- [GeoJSON RFC7946](https://www.rfc-editor.org/rfc/rfc7946): feature·geometry·coordinate/ring 구조.
- [TopoJSON specification](https://github.com/topojson/topojson-specification): transform 유무에 따른
  delta, 추가 차원 보존, 음수 arc 참조 및 정확한 junction.

모든 source 수식·validator는 native owner이며 외부 chart engine을 추가하지 않는다. 다음
projection checkpoint에서 순수 수학 dependency가 필요하면 원안 허용 범위 안에서 exact
version/license/algorithm reference를 기록한다.


## 순수 정규화 checkpoint

독립 literal과 malformed input10개가 통과했고 기존 source/discovery/coverage policy를 합한
canonical 검사는37/37, 패키지 계약7/7 통과했다. 새 네 owner의 line/function100%,
branch100/100/100/98.72%이며 기존 family95/90/100을 그대로 적용했다. 최초8/9 실행의
실패는 작업량 한도 오류 문구를 `/limit/`으로 예상한 fixture였으며 실제 `resource-limit` 오류의
`must not exceed`를 확인해 수정했다. 결과와 원본 로그는 `geo-evidence/normalize/`에 둔다.

Node20/22/24 패키지 실측은961entries/6,257,066unpacked이고 packed는
1,370,180/1,367,476/1,370,180bytes다. 최소 ceiling961/1,371,000/6,258,000을 적용한다.
네 private owner는 공개 import graph에서 도달하지 않고 기존 runtime source가 바뀌지 않아
공개 route checkpoint의 browser bundle/renderer/installed 증거를 재사용한다. 새 public
resource나 projection API는 아직 없으므로 Current/types/docs에 구현된 것으로 넣지 않는다.

## 공개 source resource 계약

순수 checkpoint `87d3489d9` 이후 `createGeometryData`와 `editGeometryData`를 Full에
등록한다. 새 resource kind를 늘리지 않고 기존 geometry kind의 `options.method`를
contour|geo로 닫아 dispatch한다. 원본 format/coordinateKind/featureKey/topoObject/limits와
feature/result/source/diagnostics를 저장하고 원래 core identity를 별도 result.identity로
보존한다. 입력 source를 feature row나 별도 dataset으로 복제하지 않는다.

`featureKey`는 own field 문자열 또는 정확한 문자열 path이며 properties를 고르려면
`["properties","code"]`처럼 쓴다. key omission의 generated key는 옵션 편집에서 유지되고
전체 values 교체나 TopoJSON object 변경에서 새로 발급된다. 명시 key의 reorder는 원 identity를
유지한다. Format/key policy는 기존 source identity를 바꾸므로 edit의 옵션으로 열지 않는다.
단일 TopoJSON object 추론 결과는 options에 확정해 후속 다중 object 입력에도 기존 선택을
유지한다. Partial limits는 기존 값을 보존한다.

Resource는 authored/no-input이며 algorithmVersion1이다. Source 값의 encoded-values hash는
원 파일 bytes hash와 구분한다. Restore는 bounded deterministic normalization과 options,
features, topology, source, diagnostics, keys/revision의 정합성을 검증한다. Generic geometry
primitive로 contour 소비자에 geo를 대입하는 경우도 거부한다. Public source 생성은 그림을
만들지 않으므로 시각 fixture를 합성하지 않으며 향후 projection/mark 소비자가 생기면 전체
revision closure와 네 renderer 증거를 같은 후속 checkpoint에 연결한다.

## 공개 source 검증 checkpoint

기존 contour와 합친36개 검사, source/type/action40개, package/architecture38개,
identity comparison/boundary30개와 마지막 package/vocabulary19개가 통과했다. 새10개 critical
owner는 line/function100%와 branch92.86–100%이며 기존95/90/100 floor를 그대로 적용했다.
단독 공개 source 단계에서 전체 coverage를 재실행한 것으로 주장하지 않는다. Route의 원본 전체
coverage와 이 변경의 영향 검사, 이후 전체 Geo 통합 검증을 구분한다.

Canonical realistic의 direct lifecycle3개와 최종 option inventory7개가 통과했다. 첫 실행은
allocation namespace를 독립 프로그램 사이에 그대로 비교한 helper와 신규 count 기대값 때문에
8/10이었다. Helper는 명시 geometry owner의 namespace만 정규화하며 revision/key/source/좌표
차이는 보존하도록 검증했다. 이어 확인된 categorical/excluded/ledger 집계 기대값도 갱신했다.
실제 create/edit trace와 format/coordinateKind/featureKey/limits의 관측을 별도로 assert한다.
공통 realistic3파일은 root 합산 통합에서 실행하며 새 recipe/helper 변경을 인계했다.

문서 source184/184, built169pages/1463machine artifacts 및 desktop search와320/390/768px
전체 페이지 검사가 통과했다. 최초 metadata/semantic snippet/visual exception/search cap 오류와
수리 후 증거는 `geo-evidence/source/`에 모두 보존했다.

최종 archive SHA256 `226372c3f47cce9ad0d3b9ad55891d1f0e8045068842c86e6487d7d51810f23e`의
동일 tar를 Node20/22/24에서 각각 runtime3개·strict types로 검증했다. 같은 archive의 Full/Basic
bundle은 Node22에서683295/370704bytes, Node20/24에서685086/371470bytes다. Full만686000으로
최소 올림했고 Basic372000은 유지한다. Package는967entries/6278165unpacked, packed는
Node22=1371494와20/24=1374187bytes이며 ceilings967/1375000/6279000이다. Canonical
staging transform을 적용해 archive967파일과 현재 source의 차이0개를 확인했다.

| 소비자 | 현재 source 경계 |
| --- | --- |
| create/edit/keyed/generated/Topo object | 단일 core identity와 bounded normalization, 실패 원자성 |
| contour 공존/primitive | 닫힌 geometry method dispatch, 잘못된 mark binding 거부 |
| inspection/compare/removal | 기존 일반 resource owner 재사용 |
| offline restore | source/result/options/identity 재검산, network 없음 |
| Full/Basic/types/package | Full만 등록, source-free 설치와 immutable type 검증 |
| renderers/scene/hit | 아직 source만 저장하므로 concrete output 없음; 후속 geo mark에서 연결 |
| projection/join/LOD/camera/asset bytes | 남은 STEP043–046 및 원본 byte provenance 통합 의무 |
