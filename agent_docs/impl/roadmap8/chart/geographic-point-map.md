# 지리 Point map — X01 확장 계약 제안

상태: **사용자 명시적 제외, 구현하지 않음**. 2026-10-20 사용자가 “지도는 안해.
ggaction에도안하고 Autocomplete에도지도ㄴㄴ”라고 결정했다. ggaction 지리 API와
Autocomplete 지도 추천을 모두 범위에서 제외한다. 아래 제안은 거절된 설계 이력이며 활성 계획이 아니다.
2026-10-20 앱 사용자 테스팅 수정 요청은 지리 차트 필요성을 승인했으나 아래 새 public/schema
결정의 세부값을 승인한 것은 아니다. 기존 동작 수정은 이 Gate와 독립적으로 진행한다.

## 진행 상태

- [x] 현재 coordinate/path 제약 조사
- [x] 최소 public 호출·저장 의미·경계·인수 시나리오 작성
- [x] Gate A: `changes-requested` — 사용자 범위 결정으로 지도 전체 제외, 승인 없음
- [x] Gate V: 범위 제외로 진행하지 않음
- [x] 지리 API 구현 의무를 명시적 사용자 범위 변경으로 종료

검토 기준 runtime revision은 `190f5a96`이다. 이 문서의 제안은 executable API가 아니며,
아래 호출을 현재 버전에 실행하면 안 된다. 제안 자체를 담은 commit을 Gate A 검토 revision으로
사용한다. 코드 변경이나 릴리즈·배포를 이 문서가 승인하지 않는다.

## 최소 차트와 API

사용자가 경도/위도 역할을 지정하고 선택적으로 육지·국경 윤곽 데이터 위에 점을 표시한다.
좌표를 단순 Cartesian 산점도로 처리하지 않고 투영, 북쪽 방향, 동일 aspect를 명시한다.

```javascript
// 승인 대상 호출 형태. 아직 구현되지 않은 제안이다.
chart().createCanvas({width: 800, height: 450, margin: 30})
  .createData({id: "places", values: places})
  .createData({id: "boundaries", values: boundaries})
  .createGeoPointPlot({
    id: "map", data: "places", longitude: "longitude", latitude: "latitude",
    projection: "equirectangular", center: 0, invalid: "error",
    basemap: {data: "boundaries", geometry: "geometry", stroke: "#b8bdc5", strokeWidth: 0.6},
    color: {field: "region", fieldType: "nominal"}, size: {value: 24},
    guides: {legend: true}
  });
```

1. `createProjectedData({id, source?, longitude, latitude, projection?, center?, invalid?, as?})`
   및 `editProjectedData({id, ...transformOptions})`. `longitude`/`latitude`는 numeric degrees
   field다. projection은 `equirectangular | mercator`, 기본 equirectangular; center는 finite
   경도, 기본 0; invalid는 `error | omit`, 기본 error; as는 출력 `{x,y}` field 이름이다.
   원본 열/행 provenance를 보존하고, edit는 기존 immutable transform revision/consumer rebind를
   사용한다. semantic derived transform에 요청 및 resolved projection policy를 기록한다.
2. `createGeoBoundaryMark({id?, data?, geometry, projection?, center?, invalid?, coordinate?,
   stroke?, strokeWidth?, opacity?})`. geometry field의 GeoJSON Geometry 중 LineString,
   MultiLineString, Polygon, MultiPolygon을 지원한다. Polygon의 모든 ring은 outline으로 그린다.
   Feature/FeatureCollection은 앱 importer가 properties와 geometry를 가진 일반 row로 바꾼다.
   GeometryCollection과 filled choropleth는 이 최소 계약에 포함하지 않는다.
3. `createGeoPointPlot({id?, data?, longitude, latitude, projection?, center?, invalid?, color?,
   size?, basemap?, guides?})`. 위 projection data/boundary mark와 기존 point mark를 조합하는
   실제 public facade다. basemap은 `{data,geometry,stroke?,strokeWidth?,opacity?}`이고 기본없음.
   basemap을 지정하면 점과 경계가 투영·extent·aspect를 공유한다. color/size는 기존 encoding
   계약을 사용한다. 기본 Cartesian 숫자축은 없고 color/size legend만 선택적으로 만든다.

## 값과 geometry 정책

- 경도는 center 상대 [-180,180]으로 wrap한다. 위도는 [-90,90]만 허용한다.
- Mercator의 유효 위도는 ±85.0511287798066으로 clamp해 pole을 finite하게 만든다.
  이 정책은 resolved provenance와 문서에 노출한다. null/nonfinite는 error 또는 명시적 omit이다.
- dateline을 횡단하는 선분은 경계에서 clip/split한다. map 전체를 가로지르는 직선으로 잇지 않는다.
  split되지 않은 polygon ring만 닫는다. geometry와 point는 같은 projection grammar를 호출한다.
- 렌더러는 지리 의미를 알지 않고 이미 계산된 path/point graphicSpec만 소비한다.
- 현재 path command는 단일 M subpath만 지원한다. 따라서 filled polygon hole을 흰색으로
  덮는 편법은 금지한다. Filled choropleth는 별도 multi-subpath/fill-rule 계약 및 renderer Gate다.
- 앱이 basemap을 제공할 수 있으나 라이브러리 액션 내부의 network fetch는 없다. 제공 데이터의
  출처·라이선스는 별도로 기록한다. basemap 미지정 시에는 투영된 점만 그린다고 명시한다.

## 검증과 통합 의무

- pure grammar: 알려진 투영 좌표, wrap/center, dateline split, ring closure, pole clamp,
  invalid error/omit, caller 입력 불변성, 크기 제한.
- materialization: projection edit가 point/boundary/guide를 함께 갱신; resize의 동일 aspect;
  source edit 및 persistence roundtrip; SVG/Canvas 동일 path; selection/filter의 point 원본 행 의미.
- boundary mark consumer matrix: 색·크기 variable은 이 초기 계약에서 inapplicable이고 고정 stroke
  style/opacity만 지원. outline identity selection은 명시적으로 지원 여부를 Gate V 전에 결정한다.
- facade: 앱의 실제 corpus longitude/latitude 업로드 → 역할선택 → boundary가 있는 map hover/apply
  → projection 변경 → code export/undo/redo. 현재처럼 보이는 후보만 지연 validation한다.
- public types, inspection metadata, action index, current contract, API 문서 및 runnable example을
  같은 구현 checkpoint에 동기화한다. 해당 구현 후 전체 native 테스트와 package 검증을 실행한다.
- Gate V에서는 동일 manifest의 primitive program·PNG·예상 public chain을 제시한다. 해당 그래픽
  승인을 받은 뒤 public flow를 구현한다. 현 단계에 시각 결과가 있다고 주장하지 않는다.

## 승인 질문

이 point-map + GeoJSON outline 최소 계약을 승인할지, filled choropleth까지 지금 범위를 확장할지
결정이 필요하다. Gate A 승인만으로 아직 보지 않은 Gate V 시각 결과를 승인했다고 기록하지 않는다.
