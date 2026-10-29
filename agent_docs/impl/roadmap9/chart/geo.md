# Geographic geometry, projection, stream과 camera

## 진행 상태

- [x] STEP042–046 원안·core·Geo 계약과 RFC7946/TopoJSON 규격 확인
- [x] 남은 전체 승인 재사용, 순수 owner와 source provenance 구체화
- [x] GeoJSON/TopoJSON 정규화와 독립 수치·오류 검사
- [x] Geometry resource/action·identity/revision·stored validation 공개 checkpoint 검증
- [x] 15 projection private registry·raw/visible/inverse·explicit bounds fit 검증
- [x] Geometry stream·split/clip/resample·geometry fit 순수 kernel 검증
- [x] Projection resource·명시 fit·geometry revision closure 공개 checkpoint 검증
- [ ] Geometry stream의 native geo mark/guide 공개 연결
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
