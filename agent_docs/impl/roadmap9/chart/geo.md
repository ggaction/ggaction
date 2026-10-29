# Geographic geometry, projection, stream과 camera

## 진행 상태

- [x] STEP042–046 원안·core·Geo 계약과 RFC7946/TopoJSON 규격 확인
- [x] 남은 전체 승인 재사용, 순수 owner와 source provenance 구체화
- [x] GeoJSON/TopoJSON 정규화와 독립 수치·오류 검사
- [x] Geometry resource/action·identity/revision·stored validation 공개 checkpoint 검증
- [x] 15 projection private registry·raw/visible/inverse·explicit bounds fit 검증
- [x] Geometry stream·split/clip/resample·geometry fit 순수 kernel 검증
- [x] Projection resource·명시 fit·geometry revision closure 공개 checkpoint 검증
- [x] Geometry stream의 native geo mark 공개 연결과 소비자 검증
- [ ] Geo guide·label 공개 연결
- [x] Typed geometry/table join 및 exact source revision closure
- [x] Shared-arc/hierarchy LOD resource와 명시적 selection representation
- [x] LOD semantic feature/geographic annotation 공개 연결
- [ ] Interaction availability의 별도 checkpoint 합산 검증
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

## Projection 순수 kernel 구체 계약

`remainingApproval` 및 root의 순수 수학 dependency 허용 확인을 재사용한다. 15 native type은
원안 그대로 유지한다. `projectionOptions.js`가 descriptor/schema/default 단독 소유자이며
`projectionMath.js`는 exact dependency adapter, `projections.js`는 입력 검증·visible forward와
역변환, `projectionFit.js`는 explicit finite bounds fit을 소유한다. Public action·저장 callback은
아직 추가하지 않고 후속 resource/stream에서 이 경계를 재사용한다.

Spherical 기본은 scalePx150, translatePx[0,0], centerDeg[0,0], rotateDeg[0,0,0],
precisionPx0.5, reflectX/Y:false다. Identity는 planar scalePx1이며 center/rotate/precision/
parallels/clipAngle을 받지 않는다. 세 conic은 parallelsDeg[30,60]를 쓰며 ±90° 표준위선은
singular 오류다. Albers USA는 lower48/alaska/hawaii의 고정 구성과 inset extent를 보존하며
scale/translate/precision만 받는다. 적용 불가 옵션과 undefined·getter·비유한 값은 거부한다.
Mercator와 transverse는 자동 유한 world extent, orthographic은90° front hemisphere,
gnomonic은60°, stereographic142°, 두 azimuthal은179.999°를 기본 clip으로 사용한다.
Orthographic clip은90° 이하, gnomonic은90° 미만, 그 외 singular azimuthal은180° 미만이다.

Forward는 private stream을 통한 실제 가시점 또는 null+reason을 반환한다. Inverse는 후보를
동일 stream으로 다시 투영하여 screen 오차0.25px 이하와 해당 component의 clip 포함을 확인한다.
Composite는 확정 component id를 반환하고 explicit component 역변환도 그 inset 안에서만 된다.
Raw 수치는 radians/y-up이며 screen 수치는 degrees→CSS-pixel/y-down이다. Native fit은 명시
finite bounds와 viewport/padding을 받고 collapsed dimension·point-only·empty를 구분한다.
원안의 identity[0,0]..[10,20]→100×100은 scale5/translate[25,0]이다. Geometry stream의 bounds
계산·antimeridian·polygon/hole·adaptive resample 및 public lifecycle는 후속 checkpoint다.

의존성 version·integrity·license·projection별 수식 reference는 별도 dependency manifest에
고정한다. Wrapper API/오류/시험에는 외부 chart library 어휘를 넣지 않고 필요한 package import
및 provenance/license manifest identity만 남긴다. Worktree 의존성은 main node_modules와 격리했다.

## Projection private kernel 검증

15종의 literal/visible grid/원자 입력/합성 inset/fit13개와 영향을 받는 source/Geo/package
계약64개, 배포 artifact·서명·discovery24개를 통과했다. 새4개 owner는 기존95/90/100 floor를
자동 적용하고 line/function100%, branch97.01–100%를 기록했다. 첫13개 실행 중1개는
orthographic 경계 바깥0.1px의 inverse를 최대0.25px 왕복 오차가 받아들인 실제 결함이었다.
역변환의 numerical roundtrip 허용을 scale 상대오차로 더 엄격히 제한하여 복구했으며 원본을
보존한다. 이 수리로 수학 clip 포함과 화면 오차 허용을 혼동하지 않는다.

의존성은 중립 alias `geographic-math`로 import한다. 실제 배포 identity와 exact version,
ISC/MIT 원문 notices, transitive lock, 모든 수식 source SHA256은 `licenses/geometry-math.json`과
`THIRD_PARTY_NOTICES`가 소유한다. 검증에서는 설치된 파일·manifest·lock의 서명을 대조한다.
새 private owner는 현재 공개 import graph에 도달하지 않아 기존 선언과 Current 행동을 바꾸지
않는다. Public projection·coordinate·mark lifecycle을 구현한 것으로 기록하지 않는다.

Package는977entries/6,347,818unpacked, Node22packed1,391,060 및 Node20/24packed1,394,455다.
한도를977/1,395,000/6,348,000으로 최소 갱신했다. 같은 archive의 Node20/22/24에서 기존
Geo+interaction6개, strict types와 private15projection smoke가 통과했다. Full/Basic/interaction
bundle은 전 baseline과 byte-identical이며 기존686000/372000/93000 한도를 유지한다. 단독
수치 checkpoint에는 새로운 그림이 없으므로 source 기존 visual evidence를 재사용하고 전체 Geo
공개 시 renderer/browser/whole coverage를 다시 실행한다. 상세 원본과 수리 결과는
`geo-evidence/projection/`에 둔다.

## Geometry stream 구체 계약

`grammar/geo/stream.js`는 normalized source geometry를 snapshot/검증한 뒤 component별
finite point 또는 compound M/L/Z path parts와 bounds를 계산한다. `sourcePath`와 component,
출력 part 순서로 part identity를 만들며 feature identity는 이 순수 계산에서 새로 발급하지 않는다.
Polygon의 right-hand spherical winding을 계산 어댑터 규약으로 뒤집는 것은 transient 변환이며
source ring 자체를 보수하거나 작은 반구로 임의 변경하지 않는다. 따라서 pole·큰 영역의 방향
의미와 hole이 함께 보존된다. Planar는 spherical winding/rotation을 적용하지 않는다.

`great-circle`은 각 source segment의 최단 구면호를 따르고, antipodal segment는 중간
`routeHint`가 없으면 ambiguity 오류다. `source-segment`는 날짜변경선에서 짧은 longitude
차이를 선택한 longitude/latitude 선형 보간을 bounded refinement한 뒤 같은 split/clip pipeline을
쓴다. 기본은 source-segment이며 explicit great-circle은 큰 원 경로를 요구할 때 사용한다.
두 경우 모두 endpoint visibility만으로 segment를 버리지 않는다. Input work는 기존 geometry
budget, generated points/commands는 기존 path command ceiling 이하의 caller-lowerable 한도로
제한한다. Empty/null과 clipped-only 결과는 빈 parts/bounds:null을 반환하고 fit은 이를 거부한다.

Bounds fit은 spherical clip을 유지하고 explicit screen rectangle만 제거한 unit-scale geometry의
finite bounds를 사용한다. Pixel precision이 unit scale에서 느슨해지지 않도록 실제 scale에 따른
정규화 precision을 쓰며 최종 fitted scale에서 재계산한 bounds를 확인한다. Stroke/point glyph
반경은 geometry bounds에 합치지 않는다. 이 checkpoint는 public action·renderer를 추가하지 않으며
같은 결과를 후속 projection resource, geo marks 및 camera가 함께 소비한다.


## Geometry stream private checkpoint 검증

투영·stream26개와 Geo/source/package/discovery84개가 통과했다. 날짜변경선 양쪽의 hole,
보이지 않는 양 끝점 사이의 visible segment, 극점과 exterior complement, shared arc 경계,
각도 보간과 great-circle 차이, antipodal hint, compound path, overflow와 생성량 한도를
독립 literal/hit 결과로 확인했다. 6개 owner에 기존95/90/100 floor를 적용했고 모두 통과했다.
이 영향 검사에서 source 전체 coverage를 실행한 것으로 기록하지 않는다.

최종 archive979files는 staging 변환을 적용한 현재 source와 차이0개다. 같은 archive
`806b2c8cc1c6b8c21982ca7f9af2c14460e844752ad4af130064abee3cd33eb3`의 private kernel 시험26개가
Node20/22/24 각각 통과했다. Package는6,358,508unpacked이며 packed는 Node22=1,394,296,
Node20/24=1,397,803bytes로 ceiling979/1,398,000/6,359,000을 적용했다. Public entry import graph는
바뀌지 않아 이전 공개 API/types/renderer/browser 증거를 재사용하고, 새 그림이나 전체 설치
자격을 다시 실행했다고 주장하지 않는다. 최초 pack 명령의 상대 outputDirectory 경로 오류와
의존 검사 실패를 보존하고 절대 경로로 다시 생성했다. 상세 증거는`geo-evidence/stream/`이다.

## 공개 projection resource 구체 계약

`remainingApproval`을 재사용하여 Full `createProjection({id,type,...parameters,fit?})`와
`editProjection({target?,...patch})`를 추가한다. `fit`은 `{geometry?,width,height,padding?,pointScale?}`이며
Canvas를 암묵적으로 읽지 않는 명시 viewport다. Geometry는 explicit/current/unique source로
확정하고 exact input ref 한 곳에 저장한다. 옵션에는 id를 다시 복제하지 않는다. Fit pointScale
생략은 생성 시 해당 type 기본 scale, edit에서 새 fit 지정 시 현재 resolved scale이다.
동시 fit+scalePx/translatePx는 오류, fit 뒤 scale/translate patch는 현재 resolved transform을
기준으로 fit 의존성을 해제한다. Fit을 유지한 shape/precision edit는 같은 geometry로 다시 계산한다.
Type edit는 해당 새 type의 기본 math parameters부터 explicit patch를 적용하고 기존 fit 정책은
명시 transform override가 없을 때 유지한다. Inapplicable explicit options는 계속 거부한다.

`projection` kind는 authored/version1/no rows이며 수식 callback을 저장하지 않는다. Unfitted는
normalized options와 empty result, fitted는 scale/translate가 없는 authored shape+fit options와
계산된 result `{scalePx,translatePx,bounds}`를 저장하여 같은 결정을 두 번 저장하지 않는다.
복원은 exact options/refs/result shape와 bounded fit 결과를 검증하고 그림을 만들지 않는다.
Geometry edit는 모든 dependent fitted projection을 최종 geometry 후보로 preflight하고 existing
prepared resource envelope로 각각 한 번 갱신한다. 잘못된 fit이나 coordinateKind 변경은 전체
편집을 거부한다. 일반 removeResource의 restrict와 inspection/compare를 재사용한다. Authored fit projection은
geometry cascade로 자동 삭제하지 않으며 projection을 먼저 명시 제거한다.
공개 coordinate/mark와 camera는 이어지는 checkpoint이며 이 자원 생성만으로 그림을 만들지 않는다.


## Projection 공개 검증 기록

54개 Geo focused 수치/state 검사와 21개 critical owner의 기존 95/90/100 floor를 유지한다.
공개 2 action은 실제 TT 5 dataset × 3 recipe(viewport 변경, reflection, 명시 transform 분리)로
원 측정값을 planar 좌표로 보존하고 독립 affine box 계산과 비교한다. 실행 예제·타입·Full/Basic·
검증된 전체 dependency source signature·offline fresh process 복원은 동일 tar의 Node20/22/24에서
확인한다. 직접 lifecycle/inventory 10개와 신규 actual projection 16개는 canonical realistic
runner로 분리 실행한다. 공통 recipe 영향 3파일은 최종 root 통합에 인계한다.

첫 public 회귀에서 거대한 point 좌표가 translation cancellation으로 viewport 중심을 잃는
경우를 확인하여 저장 전 precision 검사를 추가했다. 이후 문서 registry/CHANGELOG/search size,
card override 한도, realistic discovery count 누락은 각각 owning check로 보완한다. 새 source의
전체 coverage/render/browser 완료로 주장하지 않고 Geo marks 통합에서 수행한다. 이 checkpoint는
아직 화면 graphic을 만들지 않으므로 새로운 visual target은 없다. 원본 실패와 수리 검증은
`geo-evidence/projection-public/`에 구분 보존한다.

## Responsive Routes 통합 checkpoint

Public projection `17cf6a85a`에 main `26676b8e1`을 병합한다. Geometry/projection 후보
proof와 main의 projected dataset·dataRooted viewport-only sibling proof를 모두 보존했다.
Geo 및 route focused 75개, 새 혼합 closure를 포함한 projection 12개, 경계 계약 46개,
canonical 실제 데이터/inventory 26개, package artifact 계약 7개가 통과했다. 혼합 회귀는
source 수정 시 screen route만 한 번, geometry 수정 시 fit만 한 번, Canvas 수정 시 route만
한 번 바뀌며 이전 프로그램과 trace가 보존됨을 검증한다.

고정 tar `3dca83706effc478384e42574e1e6d9c8f35160b67cccc282e76ad50b0475a67`의
Node20/22/24 소비자 각17개, 타입, runnable snippet, 3 dependency 서명/라이선스 검증을
완료했다. 998 packed input 전부 source와 일치한다. Full gzip 최대705090 bytes의 최소
1000단위 상한706000을 적용했다. 합산 package 최대1423435/6468509 bytes에는
1424000/6469000 상한을 적용한다. 검색 index990509 bytes의 상한은991000이다.

최초 문서191개 중3실패는 검색 상한2개와 아직 merge commit에 없는 새 예제 provenance
ref1개다. 검색 owner29개는 수리 후 통과했고 provenance는 merge commit 뒤 전체 문서와
built/browser를 재검증한다. 전체 Geo coverage/renderer 완료로 주장하지 않는다.

최종 source `0c8de8dac`의 postcommit 문서191/191, built171페이지와1479 machine artifact,
desktop search 및 전체 페이지320/390/768px 브라우저 검증이 통과했다. 고정 tar와 현재
998개 입력은 여전히 차이0이다. 명령 로그·3Node실측·최초 실패/회복은
`geo-evidence/responsive-merge/status.json`에 보존했다.

## Geo coordinate 구체 계약

전체 남은 Gate 승인 `AUTHORIZATION.json.remainingApproval` 및 root의 같은 owner 승인으로
기존 `createCoordinate` Full facade에 `{id?,type:"geo",projection?,layers?}`를 연결한다.
Projection은 explicit/current/unique 순서로 해석하여 coordinate의 `projection` exact InputRef
한 곳에 저장한다. 기본 id는 다른 coordinate와 동일한 main이며 서로 다른 type의 동일 id는
충돌한다. 같은 ref의 반복 정의는 기존 idempotence를 유지하고 다른 projection은 edit로 변경한다.
`editCoordinate({target,projection})`는 Geo에만 유효하고 aspect/polarFrame과 혼합하지 않는다.
Geo projection 평면은 Canvas CSS pixel 좌표이며 이 단계는 Canvas fit나 viewport 정책을
추가하지 않는다. Shape/point/line/graticule은 후속 동일 좌표를 소비한다.

Basic은 native coordinate 생성만 유지한다. Full facade는 native plain action body를
재사용하며 Basic import graph에 geographic math를 추가하지 않는다. Exact coordinate ref는
공통 typed collector·primitive revision rebinder·removal·codec 검증에 연결한다. Projection
편집과 geometry→fitted projection revision은 coordinate ref도 한 번 갱신하며 raw primitive는
graphics를 자동 생성하지 않는다. Domain edit는 기존 deterministic coordinate plan을 명시
실행한다. Geo에 native Cartesian/Polar/Parallel layer를 붙이는 요청, 다른 family constraint,
없는 projection, 잘못된 ref 또는 복원 시 stale revision은 원자적으로 거부한다.

## Geo mark 구체 계약

승인된 shared stream의 path/circle primitive를 그대로 재사용한다. 공개 facades는
`createGeoShapeMark/editGeoShapeMark`, `createGeoPointMark/editGeoPointMark`,
`createGeoLineMark/editGeoLineMark`, `createGraticule/editGraticule`이며 internal
`materializeGeoMark`가 하나의 concrete owner다. Semantic mark type은 geo이며 binding의
mode가 shape/point/line/graticule을 구분한다. 일반 mark는 geometry exact ref와 coordinate ID를
가지고 projection ref는 복제하지 않는다. Graticule은 저장된 stepDeg/extentDeg/precisionDeg
요청으로 생성하므로 별도 source resource를 합성하지 않는다.

Shape는 mixed GeometryCollection의 polygon/line/point를 모두 출력하며 Point와 Line은 각각
해당 primitive geometry만 허용한다. geometry:null 및 clipped invisible part는 그림을 만들지
않아도 source feature identity를 보존한다. feature item key는 geometry logicalId+rowKey, part
role은 source member path+component+part index이며 screen topology 변경과 구분한다.

기본 point radiusPx3은 camera scale과 독립이다. GeoPoint의 명시 radiusDeg는 geographic source에만
허용하며 spherical circle을 같은 projection stream으로 보낸다. Line interpolation은
source-segment 기본/great-circle 명시이며 antipodal routeHint를 기존 stream과 공유한다.
Shape fill·stroke 및 Point fill은 공통 FillPaint/materialization을 쓰고 outline/blend/shadow를
기존 P2 owner로 전달한다. Line과 Graticule fill은 none이다. Optional clip은 기존 plot clip이며
기본 false로 projection clipping과 별개다. Resource scalar appearance는 기존 defaults를 사용한다.

선택은 최종 feature item grain, highlight는 전체 visible parts이며 opacity0도 유효하다. Resource
edit는 모든 geometry/projection 후보를 검증하고 scale/mark/guide union을 한 번 명시 실행한다.
Canvas는 explicit projection transform을 바꾸지 않지만 plot clip과 layer placement를 갱신한다.
양쪽 label/font 일반 파생, field color/size 및 join/LOD mapping은 후속 STEP045 consumer cell에
남기며 이 단계가 전체 Geo 완료라는 뜻은 아니다. hconcat/vconcat와 scoped edits를 지원하고
row facet/repeat는 geometry resource의 명시 partition 정책 없이는 거부한다.

### Geo mark 소비자 검증 중 발견과 구체화

- source metadata 조회를 `materialization/geo/source.js`로 분리했다. selection/accessibility는 이미 materialized된 identity/parts와 보존 feature metadata를 읽고 math adapter를 import하지 않는다.
- radiusDeg 생성 ring은 dependency의 부동소수 끝점을 그대로 source로 넘기지 않고 생성 소유자가 정확히 닫고 GeoJSON exterior winding으로 명시 생성한다. 원본 source ring 자동수리와는 다르다.
- routeHint:false는 기존 hint 명시 제거다. source-segment로 되돌릴 때 숨은 제거 없이 함께 작성한다.
- removal은 기존 geometry/contour 계약대로 live mark restrict다. generic cascade가 authored consumers를 임의 삭제하지 않는다. removeMark→removeCoordinate→removeResource가 명시 순서다.

### Geo mark source checkpoint와 검증 경계

Geo source·projection·coordinate·mark의 집중 검사81개와 실제 pinned dataset5종의
15 recipes 및 inventory 검사1개가 통과했다. 새 source owner들은 기존 family floor를
그대로 적용했고 집중 범위 line/function100%, branch98.27%를 확인했다. Primitive/public
동일성2개, Canvas/SVG/PNG/PDF4개, Canvas/SVG DPR1/2 browser2개도 통과했다.

전체 unit 원본은6471개 중6467개 통과다. 실패4개는 새 Geo lineage와 vocabulary 기대값,
브라우저의 승인된 순수 math dependency 경계, 현실 데이터 timing inventory 누락이었다.
Runtime 변경 없이 해당 owner 검사6개와7개를 각각 다시 통과했다. 원본 전체 결과를 green으로
바꾸어 기록하지 않으며 전역 coverage 완료로 주장하지 않는다.

동일 tar `b095b300987e6216c17588a83e686311f8278f933d89d09312980ee55a50067a`의
Node20/22/24 각 runtime8개, strict Full/Basic 타입, runnable docs2개와5browser bundle을
검증했다.1007개 packed input이 현재 source와 모두 일치한다. Source commit 후 문서 예제
provenance를 재생성하고 최종 docs/built/browser 기록을 별도 evidence commit으로 보존한다.

공통 lifecycle builder가 바뀐3개 realistic 파일은 root가 최종 통합에서 한 번 실행한다:
`realistic-lifecycle-factor-effects.test.js`, `realistic-scenario-generator.test.js`,
`realistic-scenario-generation-isolation.test.js`. 이 checkpoint 이후 typed join, shared-arc LOD,
guide/labels, camera 및 current-frame 통합을 계속 진행하며 전체 STEP042–046 완료로 선언하지 않는다.

최종 source `f55f12db2`의 postcommit 문서193/193, built172페이지/1503machine artifacts와
desktop search 및 전체 페이지320/390/768px 검증이 통과했다. 현재1007개 packed input은
동일 tar와 차이0이다. 최초 전체 unit4실패와 owning13개 수리, inventory·문서 원본실패와
최종 통과를 구분한 증거는 `geo-evidence/marks/status.json`에 보존한다. 이 기록 commit은
source를 바꾸지 않으며 source checkpoint와 최종 proof checkpoint는 별개다.

## Native mark와 linked interaction 합산

Mark source `f55f12db2`와 proof `7f55cc930`에 main `576f07e5d`를 병합했다.
Runtime 소스는 양쪽 변경을 보존했고, 필수 browser `#status` 완료 신호 및 region/linked-filter
경계도 유지했다. 기존 Geo unit79개, 추가 session frame·feature selection·offline 복원1개,
interaction/direct controls/linked filter/region35개와 browser13개, 경계·타입 계약26개가
통과했다. 공통 realistic3개와 전역 coverage를 여기서 반복하지 않는다.

합산 option inventory는350actions/31999paths/37723requirements이며 기존 의미 assertion을
유지해 canonical 검증한다. Package는1016entries이고 Full/Basic gzip을 지원 Node에서
다시 측정했다. 합산 tar·문서 provenance·최종 browser 증거는 source merge commit 이후
`geo-evidence/marks-merge/`에 별도로 기록한다.

합산 source `0a217a83b`는 canonical inventory7/7와 package7/7, 동일 tar
`f96999b130e6af40bc4d917c33773f03d5b2c6028af982d9b844a414de53fac3`의 Node20/22/24
각 runtime8개·strict 타입·docs2개·browser bundle5개를 통과했다.1016개 packed input은
현재 source와 차이0이다. Postcommit 문서196/196, built172페이지/1505machine artifacts와
전체 페이지320/390/768px 검증도 통과했다. 합산 증거는 `geo-evidence/marks-merge/status.json`이다.
이후 join 변경은 별도 개념 commit으로 진행한다.

## Typed join 구체 계약

`AUTHORIZATION.json.remainingApproval`을 재사용한다. `createGeoJoinData({id,geometry?,data?,geometryKey,dataKey})`와
`editGeoJoinData({target?,geometry?,data?,geometryKey?,dataKey?})`는 geometry kind의
`method:"geo-join"` resource를 소유한다. Geometry와 materialized table을 exact InputRef 두 개로
참조하며 source 변경은 geometry→join→fitted projection→mark 및 data→join closure를 한 번
계산한다. 모든 후보를 검증한 뒤 단일 최종 mark/scale/guide union을 명시 실행한다.

키 옵션은 비어 있지 않은 own-field 문자열 또는 최대128단계 own-property path다. 값은 공통
`core/itemIdentity.js`의 scalar/tuple 인코더를 재사용하며 숫자1과 문자열"1"은 다르다.
기존 `grammar/lookup.js`와 동일하게 null/없는 키는 서로 매칭하지 않는다. 일반 lookup의
primary 중복 허용·field alias 복사와 달리 Geo는 승인된1:1 정책이므로 양쪽 nonmissing 키
중복을 모두 세어 원자적으로 거부한다. 원본 lookup 의미는 변경하지 않는다.

결과는 원래 geometry feature 순서·properties·null geometry·키를 그대로 보존하고 table
rowMap과 diagnostics를 별도 소유한다. Unmatched geometry는 null rowMap으로 남는다.
Inspection은 matched/duplicate count, unmatched geometry/data index 목록과 coverage를
읽으며 empty geometry coverage는0이다. Duplicate 오류에도 양쪽 count를 제공한다.
Geometry properties를 table 필드와 합쳐 덮어쓰지 않는다. Join의 field consumer는 매칭된
table row 또는 빈 fields를 읽고 원본 geometry properties는 resource에 보존한다.

Own descriptor를 읽기 전에 검증하고 tuple/깊이/feature/전체 작업량 제한을 적용한다.
저장 복원에서는 exact inputs로 같은 correspondence를 검산하며 네트워크나 callback을 실행하지
않는다. 본 개념 뒤 shared-arc LOD, field color/size, guide/label, camera와 AT31/32 후행
통합을 계속한다. 본 join만으로 STEP045 전체 완료를 주장하지 않는다.


## Typed join 검증 checkpoint

새 join과 기존 Geo owner의 집중 coverage 99/99, 100/98.21/100 및 기존 critical 33개
95/90/100 기준을 통과했다. 실제 pinned 데이터 5종×3 조합과 witness 16개, DATA/prepared/
Canvas/graph 공통 회귀 27개, 추가 join→fit과 독립 screen-route sibling의 responsive source
revision 검사 포함 33개가 통과했다. 각 resource revision은 한 번만 증가하며 이전 program과
trace를 보존한다. 독립 replay의 allocation namespace 정규화는 geo-join에 한해 확장했고,
잘못된 rowMap·source field·stale input·feature identity를 숨기지 않는 회귀 4개를 통과했다.

Public inventory는 352 actions / 32,032 option paths이며 canonical 실제 direct-call 검사는
10/10이다. 기본 ledger는 37,748 requirements, renderer 항목을 제외한 owning fixture는
37,744다. 경계 계약 52개와 catalog 11개, source docs 197개, built 172페이지/1,511 machine
artifacts, desktop search·accessibility 및 전체 페이지 320/390/768px 검증을 통과했다.

동일 tar `6c38b274c48cd784e20eb95a412e6c68466bf7286ac45afbfc56c6f0c859dc11`의
Node20/22/24에서 각 runtime 3개, strict Full/Basic 타입, runnable docs 1개와 browser bundle
5개를 검증했다. 원본 도형과 join 결과의 concrete properties·Canvas·SVG·PNG·PDF draw stream이
동일하다. 1,020 packed inputs는 source와 차이 0이며, size/gzip은 각 Node/zlib의 실제 측정값을
기록했다. 최초 fixture/문서/coverage 부족과 owning 수리를 분리한 정본은
[geo-evidence/join/status.json](./geo-evidence/join/status.json)이다. 전체 unit/global coverage나
전체 installed corpus를 재실행한 것으로 요약하지 않는다. Source commit 후 provenance만
동기화하는 최종 proof는 별도로 기록한다.

Join source `8f19d5a42`의 postcommit 문서 197/197, built 172페이지/1,511 machine artifacts와
전체 페이지 320/390/768px 검증이 완료됐다. 런타임과 1,020 packed inputs는 검증한 tar와
변경 없이 유지했다. 이 후속 기록은 provenance와 증거만 갱신하며 LOD 구현은 다음 개념이다.

## LOD 순수 level 계약

`remainingApproval`과 STEP045를 재사용한다. 첫 계산 owner는 `grammar/geo/levels.js`다.
입력 level은 coarse→fine 순서이며 각 level의 명시 typed region keys를 공통 key encoder로
정규화한다. Fine level의 `{key,parent}`는 바로 앞 level의 key를 정확히 참조하며 빠짐·중복·
잘못된 parent를 거부한다. 이름 유사도나 배열 위치로 관계를 추정하지 않는다. 서로 다른
level에서 같은 typed key를 써도 level ID로 구분한다. Empty level은 그대로 보존한다.

각 fine level은 `enterZoom > exitZoom >= 0`이며 enter/exit 배열은 각각 엄격히 증가한다.
현재 level을 명시적으로 받아 `zoom >= enterZoom`에서 더 상세한 level로, `zoom < exitZoom`에서
상위 level로 이동한다. 따라서 4.2에서 진입하고 정확히 3.8에서는 유지하며 3.8 미만에서
나온다. 이전 level 생략은 가장 coarse level에서 시작하며 zoom은 finite nonnegative다.

결과는 선택한 level과 모든 level의 원래 key→현재 representation key 목록을 함께 반환한다.
County→state는 정확한 parent 하나, state→county는 원래 입력 순서의 descendant 목록이다.
원래 logical key를 parent key로 덮어쓰지 않는다. Descriptor·전체 region 수·key 문자량·
parent traversal·output mapping 작업량을 공통 제한으로 검증하며 callbacks/ChartProgram/
renderer나 전역 cache를 쓰지 않는다. 공개 resource/selection/annotation/LOD 단순화는 이
순수 checkpoint 이후 이어 연결하며 이 계산만으로 AT31 완료를 선언하지 않는다.

LOD level 순수 계산 7개와 해당 owner coverage 100/100/100, source boundary 11개,
package artifact 7개가 통과했다. 공개 API/타입/entry와 persisted state는 아직 변경하지 않았다.
추가 private module 1개를 포함한 package 크기는 지원 Node20/22/24에서 모두 실제 측정했고
기존 browser bundle에 연결되지 않는 순수 계산이므로 installed/browser corpus를 반복하지 않았다.
정본은 [geo-evidence/lod-levels/status.json](./geo-evidence/lod-levels/status.json)이다.

## Shared topology 단순화 계약

`grammar/geo/simplify.js`는 retained decoded arcs를 한 번만 처리한다. 허용 오차는 planar에서
caller coordinate unit, geographic에서 degree plane이며 antimeridian seam을 가로지르는 arc는
그대로 보존한다. 같은 shared arc를 참조하는 양쪽 polygon은 항상 동일한 retained vertex 목록을
정방향/역방향으로 읽는다. Endpoint/junction·원 z 값·arc index·feature order·source hash를 유지한다.
원본 asset은 덮어쓰지 않는다. 원본 topology 재확장은 기존 `topology.js`의 변환/접합 owner를 재사용한다.

단순화 후보는 반복 stack의 최대 거리 기준으로 만들고 ring 최소 길이·방향·교차·ring containment를
검사한다. 후보가 이 topology 조건을 보존하지 못하면 원래 shared arcs를 유지하고 그 이유를 결과
진단에 명시한다. 허용 오차는 최대 오차이지 최소 점 제거 수를 약속하지 않는다. tolerance 0은
원본을 그대로 유지한다. 기존 invalid geometry는 고치지 않고 먼저 거부한다. 모든 snapshot,
거리 검사, 선분 후보 비교와 containment를 하나의 bounded work counter로 제한한다.

## 공개 LOD resource와 representation 계약

`AUTHORIZATION.json.remainingApproval`의 남은 전체 설계/시각 승인과 STEP045 원안에 따라
`createGeoLODData({id,levels,zoom?})`, `editGeoLODData({target?,levels?,zoom?})`를 연결한다.
`levels`는 coarse→fine 순서의 `{id,geometry,tolerance?}` root와
`{id,geometry,tolerance?,parents,enterZoom,exitZoom}` 하위 단계다. geometry는 명시 ID이며
원본 `featureKey`가 있는 geo 또는 geo-join만 허용한다. 각 단계의 coordinateKind는 같아야 한다.
중첩 LOD를 단계 입력으로 재사용하지 않는다. 기본 zoom=0, tolerance=0; 양수 tolerance는
shared topology 입력만 받는다. 기존 순수 level/단순화 계산과 제한을 그대로 사용한다.

저장 options는 단계 ID, exact inputs의 index, threshold/parent/tolerance, zoom과 activeLevel을
단일 소유한다. activeLevel은 hysteresis의 현재 결정으로, edit에서 기존 ID가 사라지면 명시
오류다. 줌의 미세 흔들림은 기존 선택 단계를 보존한다. 저장 결과는 현재 geometry, 독립 typed
identity, 전체 원래 logical key→현재 representation 대응과 diagnostics다. 원본 source와
asset hash는 exact input resource에서 보존하며 단순화 결과로 덮어쓰지 않는다.

선택은 원래 `items:[key]`를 저장하고, 현재 Geo final-item의 읽기 전용 `representationKeys`를
통해 대응한다. 현재 hit key는 현재 표현의 key이며 숨겨진 county key로 치환하지 않는다.
실제 field 선택은 현재 단계의 feature/table grain으로 평가한다. source 수정은 모든 단계의
부모 관계까지 preflight한 뒤 LOD→join→fitted projection→mark closure를 자원당 한 번 갱신한다.
복원은 bounded 계산으로 retained refs와 결과를 검산하고 renderer에서 계산하지 않는다.
기존 Annotation의 Geo 지원은 별도 semantic feature/geographic anchor 소비자 연결과 함께
검증하며, LOD resource 구현만으로 AT31 annotation 또는 AT32 camera를 완료 처리하지 않는다.


### 공개 LOD checkpoint 검증

`createGeoLODData`/`editGeoLODData`의 자원 생성·수정, keyed geometry와 join inputs,
active-level hysteresis, shared topology, source revision closure 및 original-key selection을
연결했다. 현재 hit key는 실제 보이는 representation이며 `representationKeys`만 logical
key correspondence를 노출한다. coarse/fine 전환, highlight replay, hconcat scoped edits,
잘못된 inactive parent/저장 상태, source/trace 불변을 검사했다.

새 lifecycle 10개, 기존 Geo/selection 교차 55개, 실제 5 dataset×3 recipe와 assertion 16개,
최종 source/package/type 경계 25개를 통과했다. 신규 owner coverage 100/96.25/100,
공통 markSelection 97.49/95.43/100이며 기존 floor는 변경하지 않았다. inventory 최초 10개 중
9개 통과 후 stale redacted-array 수치를 canonical 10629로 수정하고 owning 7개를 통과했다.
새 실제 데이터 파일을 discovery 목록과 수치 48개에 연결했다.

문서 전체 최초 198개 중196개 통과 후 검색 한도 두 assertion을 실측 1014928 bytes의 다음
1000-byte 경계로 조정했고 owning31개를 통과했다. Built172페이지/1519 selective artifacts와
320/390/768px 전체 containment·검색·접근성 검사가 통과했다. 같은 archive
`5b01080fd0c44ed5ee41d27b8f0824e0229bc6877e45ae41aa0e814058930268`을 Node20/22/24에
각각 설치하여 3 runtime case, strict Full/Basic 타입, 공개 문서 예제, 5 browser bundle을
검증했다. Renderer case는 각 coarse/fine에서 기존 geometry의 concrete properties,
Canvas pixels, SVG, PNG bytes, PDF content stream과 정확히 비교한다.

최초 fixture/environment 실패와 owning 수리, 실행 환경·tar hash·coverage·측정치는
[levels-public/status.json](geo-evidence/levels-public/status.json)에 분리 보존한다. 새 전체
normal/coverage corpus 통과로 주장하지 않는다. 공통 realistic 생성 3파일은 최종 통합에서
한 번 실행하도록 parent에 인계했다. Annotation rebase, session availability reconciliation,
field/label/guide 및 camera 소비자는 후행 구현이며 AT31/32 전체 완료가 아니다.


공개 LOD source는 `6ea274544`로 고정했다. 이후 provenance/LLM source pin만 갱신하고
문서 source 전체 198/198 및 package dry check(1026 entries, 1460317/6659038 bytes)를
다시 확인했다. Runtime/declaration/packed entry bytes는 설치 검증 tar와 동일하다.


## Semantic geographic annotation 계약

기존 전체 승인(`remainingApproval`) 범위에서 `createGeoAnnotation`/`editGeoAnnotation`을
resource-backed Geo annotation mode로 연결한다. 별도 renderer나 annotation registry는 만들지
않고 기존 Text primitive·font binder·FillPaint·outline/shadow·selection owner를 사용한다.

공개 anchor는 `{type:"position",position:[x,y]}` 또는
`{type:"feature",geometry?,key,level?}`이다. Position은 geo coordinate의 geographic degrees 또는
identity projection의 planar unit을 보존한다. Feature는 explicit typed featureKey가 있는 source나
join, LOD의 원 level geometry를 식별한다. Geometry는 기존 explicit/current/unique inference를
재사용하고, LOD level 생략은 현재 activeLevel을 한 번 저장한다. 이후 coarse/fine 전환에서
그 level/key를 바꾸지 않는다. 원 geometry의 planar 또는 spherical centroid를 공통 math adapter로
계산하며, null/empty feature는 semantic identity를 보존하고 Text 출력 0개다. 미정의/overflow
centroid는 실패한다. Source geometry 이동은 해당 centroid를 다시 계산한다.

Text는 명시 string이며 빈 문자열은 출력 0개다. Native Text style을 공유하되 source mark
appearance가 없는 `inheritColor`는 허용하지 않는다. Default id는 geo-annotation, style은 기존
Text 기본값이고 clip:false다. `coordinate?`, `anchor?`, `text?`, native style의 edit는 빈 patch를
거부한다. Geometry ref는 기존 `layer.geoBinding.geometry` 경로 한 곳에 저장하고 anchor에는
ref를 중복 저장하지 않는다. Position annotation은 geometry를 만들지 않는다. Projection ref는
기존 geo coordinate가 계속 단일 소유한다.

Feature mapping, projection/geometry revision, null/clipped output, removal, restore, inspection,
hconcat/vconcat scoped editing, selection/highlight, font/theme 및 네 renderer를 같은 checkpoint의
소비자로 검증한다. Centroid 수치 kernel은 Point/Line/Polygon/hole/collection/dateline과
입력 불변·descriptor·finite budget 경계를 독립 literal로 확인한다. 새 visual은 승인된 Text와
Geo primitive를 재사용하며 명시 planar/orthographic primitive pair로 좌표와 clipping을 비교한다.


### Semantic annotation checkpoint 검증

주석 create/edit를 native Text로 연결하고 feature centroid, 명시 geographic/planar 위치,
LOD 원본 level/key 보존, source/projection 수정, null/clipped/빈 text, 실패 원자성을 검증했다.
Geometry ref는 기존 binding에만 저장하고 metadata에서는 수치 projection dependency를 가져오지
않는다. 이로써 Basic import는 기존 경계를 유지하며 Full materializer만 centroid를 계산한다.
Planar hole의 ring 방향이 달라도 exterior/hole 역할에 따라 contribution을 계산한다.

Geo 관련 139개와 새 7 owner coverage 100/97.48/100, native Text 관련 107개와 추출 owner
100/100/100을 통과했다. 신규 owner에 기존 95/90/100 floor를 그대로 적용했다. 현재 카탈로그·
타입·source/package 경계 46개, 실제 5 dataset×3 recipe/증인 16개, 3 variant의 네 renderer와
PNG 9개, Canvas/SVG DPR1/2 browser 3개가 통과했다. 같은 archive
`5ea008140f4512cba0e6d3e6c053550bd3acdf82d016c7411ef5aff1adee940f`를 Node20/22/24에
설치하여 각각 runtime3·strict Full/Basic 타입·문서 snippet·5 browser bundle을 검증했다.
현재 1033개 packed entry는 배포용 canonical 변환 후 해당 archive와 모두 같다.

첫 inventory와 문서/카드 fixture 실패는 원본과 owning 수리를 구분해
[annotations/status.json](geo-evidence/annotations/status.json)에 보존한다. Source pin과 built
문서 최종 검증은 같은 source checkpoint 후속 기록으로 닫는다. 새 전체 normal/global coverage
통과를 주장하지 않는다. 공통 realistic 생성 3파일은 최종 합산에서 parent가 한 번 검증한다.
Field encodings·Geo labels/guides·camera와 별도 session availability 합산은 남은 작업이다.


주석 source는 `d665f6bbc`로 고정·push했다. 이후 source provenance/LLM pin과 evidence만
갱신해 문서 source 전체 200/200, 수정된 inventory owning 7/7, package contract 7/7을
확인했다. Built172페이지/1525 selective artifacts와 전체320/390/768px containment,
검색·접근성도 통과했다. Source pin만 갱신한 최종 build에서 링크·hash를 다시 확인하며,
새 runtime이나 타입 변경 없이 동일 qualified tar의1033개 entry byte parity를 유지한다.

## Geo feature appearance와 guide 연결 계약

STEP044/045의 choropleth와 proportional-symbol 소비자를 기존 `encodeColor`/`encodeSize`에
연결한다. 새 field/scale 문법이나 가짜 dataset은 추가하지 않는다. `layer.encoding`이 field,
fieldType, scale을 단일 소유하며 geometry ref는 기존 `geoBinding.geometry`만 사용한다.
Source·join·현재 LOD level의 feature가 단위이고 MultiPoint/여러 path part도 feature당 한 값이다.
Null/empty geometry는 값 수집과 concrete item 모두에서 제외하지만 기존 source selection과 inspection의 논리 feature는 보존한다. 한 source owner가 전체 features와 drawableFeatures를 결정하며 모든 visual consumer가 후자를 공유한다. Projection clipping은
presentation이며 domain을 바꾸지 않는다. 최초 feature 순서와 typed logical key를 보존한다.

Color는 shape/point/line의 기존 nominal/ordinal/quantitative/temporal scale을 사용한다.
Shape/point는 fill, line은 stroke에 적용한다. Aggregate/layout은 적용 불가이며 명시 오류다.
고정 `{value}` 전환은 기존 removeEncoding과 Geo mark editor를 감싼 자식으로 실행한다.
Size는 Geo point의 CSS pixel area이며 `sqrt(area/pi)` radius를 쓴다. Geographic `radiusDeg`와
함께 쓰면 거리/면적 의미가 충돌하므로 먼저 명시 radiusPx로 전환해야 한다. Size의 numeric,
categorical, transformed/discrete scale과 unknown/empty domain은 기존 owner가 결정한다.

Join 미매칭 feature는 geometry와 identity를 보존한다. Field가 missing이면 명시한 scale.unknown을
공유 mapper가 적용하고, fallback이 없거나 잘못된 값이면 상태/trace 변경 전에 오류다. 별도
silent row dropping/default zero는 없다. Ordinary field mapping을 먼저 닫으며 AST conditional
resource-grain 연결은 뒤따르는 Geo consumer matrix에 명시해 전체 범위에서 삭제하지 않는다.

Consumer matrix: 기존 scale create/edit/remove·automatic domain·categorical/gradient/size legend,
encoding 제거·상수 전환·공유 scale sibling union·geometry/table/LOD revision·projection/Canvas
변경·selection/highlight·codec·scoped composition을 검증한다. Source candidate resource와
모든 scale 후보를 preflight한 뒤 scale→mark→guide union을 한 번 실행한다. Renderer는 기존
concrete circle/path만 읽는다. 필드 labels와 geographic graticule labels는 다음 의미 개념으로,
camera046/현재 frame/route와 interaction 연동은 후행 owner 계약으로 계속 추적한다.


### Feature appearance checkpoint 검증

Geo source/join/LOD의 ordinary color와 point area를 기존 scale와 legend owner에 연결했다.
Geometry 후보 전체의 필드와 scale를 preflight하고 공유 native mark까지 단일 plan으로 갱신한다.
빈 native quantitative color scale가 명시 `emptyDomain`을 선언해도 내부 action의 closed 옵션과
전달 목록에서 빠졌던 기존 결함을 함께 수리했다. Native Point의 빈 source revision 회귀로
같은 의미를 검증했으며 Geo만의 예외나 별도 fallback을 만들지 않았다.

최종 Geo·빈 domain 회귀156/156, native scale193/193, 새 혼합 native/Geo7/7, 현재
카탈로그·타입·package 경계47/47이 통과했다. 새 Geo owner는 lines100, branches96.15 이상,
functions100이며 기존95/90/100 floor를 유지한다. Native quantitative color owner도
96.15/95.45/100으로 같은 기준을 통과한다. 실제5 dataset×3 recipes/증인16개, primitive4,
render8, Canvas/SVG DPR1/2 browser4가 통과했다.

동일 tar `a2cf6a22ef8ec43acbffbbcf8be2b7cdb2f5a1ede7760810d8fc98d1b090536c`를
Node20/22/24에 설치해 각각 신규runtime3, strict Full/Basic 타입, 문서snippet,5 bundle을
검증했다. Canonical 변환 후1035개 entry 모두 현재source와 동일하다. 새로운 전체
normal/global coverage 통과를 주장하지 않는다. Discovery 최초57/58 실패는 신규realistic
파일의49→50 기대값과 실제포함assertion으로 수리하여47/47 owning검사에 포함했다.
문서의 최초198/201 실패 중 잘못된 중복링크2건은 수리했고200/201 재검증에서 유일하게
남은 source pin은 이 source commit 후 metadata-only 갱신으로 닫는다.
최종 inventory·source/built/browser 문서 결과는 아래 evidence에 구분해 기록한다.

[Feature appearance evidence](geo-evidence/encodings/status.json)


Feature appearance source는 `bff4d29eb`로 고정·push했다. 동일 runtime과 타입을 유지한
후속 source pin 갱신에서 문서201/201, canonical inventory10/10, built172페이지/1525개
selective artifact 및 전체320/390/768px browser containment·검색·접근성 검증이 통과했다.
1035개 package input의 canonical byte parity도 다시 확인했다. 최초 실패와 owning 수리는
위 evidence status와 원본 로그로 분리했다. 이 checkpoint는 ordinary fields와 기존legend
연결이며 conditional resource-grain, feature/graticule labels, camera046 전체 완료를 뜻하지 않는다.
