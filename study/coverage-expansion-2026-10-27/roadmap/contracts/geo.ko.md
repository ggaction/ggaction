# Geo 자원 projection과 camera 계약

## 입력 정규화

createGeometryData({id,format,values,coordinateKind,featureKey,topoObject})에서 format은 geojson/topojson, coordinateKind는 geographic/planar다. geographic 좌표는 WGS84 longitude/latitude degrees, latitude[-90,90]. planar는 caller unit을 보존하고 spherical math를 적용하지 않는다. Polygon/MultiPolygon/Point/MultiPoint/LineString/MultiLineString/GeometryCollection/FeatureCollection/null geometry를 모두 구분한다.

GeoJSON ring은 최소4개 좌표, 처음과 마지막 동일, finite point를 검증한다. 잘못된 ring을 자동 보수하지 않는다. geometry:null은 feature identity와 properties를 보존하고 drawable:false다. featureKey 없음은 persisted generated key를 부여한다. named feature ID 중복은 error다. z좌표는 source에 보존하되2D rendering에는 사용하지 않음을 명시한다.

TopoJSON은 delta decode→scale/translate transform→negative arc index bitwise complement를 통한 reverse→shared junction 중복 제거→geometry expansion 순이다. object가 여러 개면 topoObject 필수다. shared arc resource를 보존해 인접 지역 경계가 따로 단순화되어 벌어지지 않게 한다. asset bytes/hash/coordinate system/object selection을 provenance에 저장한다.

## Projection registry

native registry의 필수 type은 mercator, equirectangular, equal-earth, natural-earth, orthographic, stereographic, gnomonic, azimuthal-equal-area, azimuthal-equidistant, conic-equal-area, conic-conformal, conic-equidistant, transverse-mercator, albers-usa, identity다. type별 supportsInverse, spherical, composite, parameterSchema, defaultClip을 등록한다. 공통 projection kernel과 stream clip이 모든 geo mark/guide/selection에 쓰인다.

검증된 pure mathematical dependency 사용은 허용한다. 채택 시 exact package version/license/algorithm signature와 projection별 source reference를 dependency manifest에 고정한다. 외부 chart engine을 runtime dependency로 넣지 않는다. 모든 projection 수식을 새로 손으로 복제할 필요는 없지만 native wrapper의 옵션·단위·errors·fit·inverse·clip은 직접 검증한다. [D3 projection 공식 문서](https://d3js.org/d3-geo/projection)는 mathematical projection stream의 참고이며 native API를 그대로 맞춰야 한다는 뜻은 아니다.

projection options는 centerDeg, rotateDeg, parallelsDeg, scalePx, translatePx, reflectX/Y, precisionPx, clipAngleDeg, clipExtentPx로 단위가 드러나게 한다. 이전 보고서의 무단위 이름은 이 제안으로 구체화한다. type별 inapplicable option은 error. fit와 explicit scale/translate가 함께 들어오면 conflict error, fit 뒤 edit scale은 explicit override다. projection resource와 geo coordinate는 분리되며 camera runtime 값은 commit 때 resource revision에 반영한다.

## Clipping과 geometry pipeline

geographic validate→longitude/rotation normalization→antimeridian split→spherical clipping→adaptive resample→projection→planar clip→compound path 순이다. orthographic은 backside를 screen path/hit에서 제외한다. horizon crossing segment를 endpoint visibility만으로 drop하지 않는다. pole/antimeridian의 ring orientation과 hole containment를 유지한다. great-circle antipodal endpoints는 경로가 유일하지 않으므로 explicit pole/route hint 없으면 ambiguity error다.

clip 이후 feature item 하나가 여러 visible parts를 가지면 item key는 하나이며 primitive key는 part key다. 179°→−179° line은 화면 전체 폭을 가로지르는 선이 되면 실패다. inverse가 없는 projection, inset 밖, clipped backside의 pointer query는 null+reason을 반환한다. NaN lon/lat로 다음 action을 실행하지 않는다.

## Fit과 독립 수치값

projected finite bounds [xmin,ymin,xmax,ymax]를 target plot width W,height H,padding p 안에 fit한다. scale=min((W−2p)/(xmax−xmin),(H−2p)/(ymax−ymin)); collapsed dimension은 나머지 축으로, point-only는 explicit pointScale 또는 기존scale를 사용한다. translation은 target center−scale×bounds center다. empty geometry는 fit error이며 이전 camera를 몰래 유지하지 않는다. line/polygon stroke padding은 geometry fit와 별도 appearance 단계다.

equirectangular raw(λ,φ)=(λ,φ), mercator raw=(λ,ln tan(π/4+φ/2))에서 λ/φ는 radian. mercator(0,0)=(0,0), latitude45° y=0.881373587019543. orthographic raw at center0는 x=cosφ sinλ, y=sinφ, visible=cosφ cosλ≥0. λ=90°,φ0은 limb(1,0); λ180°,φ0은 hidden이다. Canvas y 반전은 coordinate mapping 단계다. identity [0,0]..[10,20]을100×100,p0 fit하면 scale5, translation[25,0].

projection별 grid roundtrip은 visible/invertible domain에서 angular tolerance1e−6 degree, screen roundtrip≤.25px로 제안한다. singular boundary는 별도 limit fixture다. Albers USA는 component id와 per-inset inverse를 노출한다. 한 composite 전체에 잘못된 단일 inverse를 적용하지 않는다.

## Join과 LOD

createGeoJoinData는 geometry와 table의 typed keys를 연결한다. 기본1:1, duplicate는 error, unmatched geometry는 measure missing으로 유지한다. many-to-one aggregate는 명시 transform에서 수행한다. unmatched data 목록, duplicate count, coverage를 inspect한다. feature name 유사도 fuzzy join은 제공하지 않는다.

geometry hierarchy level마다 stable region key와 parent mapping을 저장한다. LOD threshold 예시 enterZoom4.2/exitZoom3.8로 hysteresis를 둔다. zoom4 주변의 흔들림에서 level이 반복 교체되면 실패다. shared arcs를 함께 simplify하고 preserve topology를 검증한다. selected county가 state LOD로 바뀌어도 logical county selection은 보존하고 representation mapping을 노출한다. annotation은 semantic feature/geographic anchor를 유지한다.

## Native marks와 navigation

geoshape, geoPoint, geoLine, graticule은 같은 projection/clip을 재사용한다. point size 기본 CSS px, explicit geographic-radius만 distance semantics다. geoLine interpolation source-segment/great-circle을 구분한다. choropleth는 joined geometry+color encoding, proportional-symbol은 geoPoint+size, route map은 geoLine+graph edge provenance 조합이다.

camera는 scale, translation, spherical rotation, viewport를 가진다. zoom around pointer는 pointer의 inverse geographic anchor가 전후 같은 screen 위치에 있도록 translation을 보정한다. planar pan과 globe rotation은 서로 다른 gesture mode다. fitRegion/reset/resize는 transaction과 history의 하나의 command다. pinch는 두 pointer center+distance, wheel은 normalized delta와 bounded scale. camera animation은 quaternion shortest-path rotation과 log(scale) interpolation을 사용한다. projection type 자체가 바뀌면 compatible morph kernel이 없는 한 crossfade한다.

browser test는 drag/wheel/pinch/keyboard를 실제로 보내고 commit 전후 anchor, clipped hit, reset, abort, source revise, offline restore를 비교한다. geometry/asset 다운로드는 resolver가 맡으며 interaction handler에서 renderer fetch를 호출하지 않는다.
