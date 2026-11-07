# GeoRouteData — 원 GraphRoute의 geographic/planar 연결

## 진행 상태

- [x] 원 geo.ko.md:41 / edge-bundling.ko.md:67 및 현재 owner 감사
- [x] 기존 remainingApproval과 parent의 구체 adapter 결정 재사용
- [x] 순수 M/L → LineString 변환·identity·source rows
- [x] Full create/edit 및 native revision/removal/restore closure
- [x] GeoLine interpolation/date-line/clip·selection/hit·4backend
- [x] Current/types/action metadata/docs·같은 archive 세 Node 검증

Adapter source checkpoint는 검증을 마쳤다. Root 통합과 전체 STEP077 의무는 별도로 남는다. [AUTHORIZATION](../AUTHORIZATION.json)의 remainingApproval을 재사용한다.
Parent는 2026-10-30 아래 create/edit adapter와 기존 GeoLine 수학 재사용을 명시했다.
별도 새 mark/renderer/visual target을 만들지 않는다. 공유 animation4는 변경하지 않는다.

## 사용자 호출과 의미

```js
program
  .createGeoRouteData({ id: 'route-geometry', routes: 'bundled', coordinateKind: 'geographic' })
  .createGeoLineMark({ id: 'routes', geometry: 'route-geometry', coordinate: 'map',
    interpolation: 'source-segment' });
program.editGeoRouteData({ target: 'route-geometry', routes: 'other-bundled' });
```

`createGeoRouteData({id,routes,coordinateKind})`는 Full-only다. 세 값 모두 명시한다.
`editGeoRouteData({target?,routes?,coordinateKind?})`는 비어 있지 않은 patch만 허용하고
생략은 보존한다. target 생략은 기존 current/unique eligible geometry 추론을 사용한다.
`coordinateKind`는 `geographic|planar`; null/undefined/unknown fields를 거부한다.

Geographic은 **world** route의 x/y를 명시 longitude/latitude로 해석하며 모든 원 anchor와
sample의 유한값·latitude 범위를 검증한다. Screen pixel을 역투영하거나 source field를
추측하지 않는다. Longitude는 기존 geometry 계약처럼 유한 unwrapped 값을 보존하며 date-line 처리는 기존 stream owner가 소유한다. Four bundling methods의
계산은 기존 world plane 수학 그대로이며 spherical bundling이라고 주장하지 않는다.
Planar은 기존 identity projection 의미를 사용하며 world/screen route의 좌표를 그대로 읽는다.
Screen route의 viewport revision은 기존 native route closure에 따른다.

모든 hierarchical/force-directed/density/edge-path 결과의 원 edge 순서와 sampled M/L을
하나의 LineString으로 각각 보존한다. 추가 보간·sample/drop·solver 호출은 없다.
GeoLine의 명시 `source-segment|great-circle`, antipodal routeHint, date-line split,
spherical/planar clip 및 adaptive resampling은 기존 stream owner가 계속 소유한다.
Camera 변경은 projection/GeoLine만 갱신하며 bundling을 자동 재계산하지 않는다.

## 저장·출처·수명

새 resource kind 대신 기존 `geometry`에 `options.method:'geo-routes'`를 둔다.
입력은 exact edge-route ref 하나이며 graph/layout/hierarchy/data refs는 그 원 DAG를 따른다.
Result는 normalized features/identity/coordinateKind/diagnostics이다. Feature property
`edgeKey`는 기존 opaque typed edge token을 보존하고 decode/문자열 강제변환하지 않는다.
그 token을 explicit geometry key로 사용한다. Geometry logicalId는 create에서 한 번 할당하고
edit/revision에서 유지한다. Original number/string/date/tuple 키는 token을 통해 구별된다.

원본 graph edge grain의 fields와 row references는 exact route→graph→dataset source reader가
읽는다. Observed edge는 원 edge rows, inferred edge는 원 endpoint node rows를 보존한다.
GeoLine의 graphic lineage는 정확한 derived geometry revision이며 입력 DAG를 통해 원 route,
graph/layout/source rows로 돌아갈 수 있다. 다른 resource의 같은 문자열 key로 권한을 얻지 않는다.

Route edit, graph/layout/data revision, HEB hierarchy revision, screen viewport 변경은
route→geo-routes→join/LOD/fit projection→GeoLine/labels를 한 prepared resource 계획으로 닫는다.
전체 candidate를 선검사하고 의미 쓰기 후 기존 명시 materialization plan을 한 번 실행한다.
원 program/trace는 실패 시 불변이다. Remove/cascade는 기존 resource DAG owner를 재사용한다.
Restore는 exact refs와 retained route result로 adapter 결과를 검증하며 solver를 다시 실행하지 않는다.
Basic은 facade 부재 및 geometry registry 부재로 명시 거부한다.

## 소유 파일과 검증

- `grammar/geo/routes.js`: closed coordinate interpretation, bounded finite M/L lowering;
  normalization은 기존 geometry owner 재사용.
- `materialization/geo/routeResource.js`, `routeState.js`, `geometryState.js`: factory/closed restore.
- `materialization/graph/sourceItems.js`: 원 typed edge fields/rows의 작은 read-only 공통 owner.
- `selectors/geometry.js`, `materialization/geo/features.js`: 새 derived source의 공통 consumers.
- `actions/geo/routes.js`, `closure.js`, `graphs/routeClosure.js`, `screenRoutes.js`, `layouts.js`,
  `data/resourcePlan.js`, primitive prepared-resource 검증: 원자 revision closure.
- Full registration/declarations/Current GEOMETRY + EDGE_ROUTES/action metadata/public references.

독립 literal M/L/order/range/zero-length 및 typed-key 테스트, four method public fixture,
revision diamond/selection/rows/codec/tamper/removal/Basic/empty source, 실제 date-line·horizon·clip,
Canvas/SVG/PNG/PDF public/native parity와 same archive Node20/22/24 소비자를 확인한다.
새 공개 surface의 실제 데이터5×3·메타데이터 및 timing ledger도 같은 checkpoint에 포함한다.
AT82의 큰 workload 지원과 전체 STEP077은 이 adapter 완료와 별개로 남는다.

## Source checkpoint 검증

[지속 증거](../integration/geographic-route-evidence/qualification.json)는 동일 eef archive의 세 Node
runtime·타입·문서·번들, 실제 데이터, 독립 native parity와 공통 인벤토리의21개 추가 요구를 구분한다.
원본 실패를 보존하며 큰 workload의 AT82 성능 및 전체 STEP077 완료를 주장하지 않는다.
