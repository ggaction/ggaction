## 부록 E. 신규 API 계약 초안과 이름 정리

이 부록은 **신규 구현의 권장 계약 초안**이다. 현재 패키지에는 아래 API가 제공되지 않는다. 앞의 조사 장에서 `createGeoShape`, `layoutFlow`, `createFlowLayout`처럼 방향을 설명하며 사용한 예시 이름은 아래 명칭으로 통일하는 것을 권장한다. 구현 시 실제 action catalog와 저장소 계약 검토에서 최종 확정한다. 현재 이미 있는 API의 이름·타입은 부록 A가 우선이며, 기존과 충돌하는 새 이름을 등록하지 않는다.

### E.1 공통 규칙

모든 authoring action은 immutable `ChartProgram`을 반환한다. `id`는 owner scope 안에서 고유하고, 기존 lifecycle 규칙에 따라 create/edit/remove를 구분한다. `data`는 명시 dataset resource, `coordinate`는 coordinate resource, `projection`은 projection resource, `layout`은 layout resource를 참조한다. 문자열 하나가 여러 역할의 ID로 해석되지 않게 typed reference를 사용한다. composition target은 기존 scoped target 규칙을 따른다.

새 resource 입력은 clone/freeze하고 persistence codec이 무손실로 복원하는 값만 저장한다. callback은 host registry에 이름으로 연결하며 함수·외부 mutable Date 참조·DOM·network handle을 semantic state에 넣지 않는다. 시간 값은 자체 codec의 tagged epoch/단위 계약을 따르고 caller의 mutable Date를 그대로 보관하지 않는다. 현행 ggaction이 허용하는 scalar/null/missing 표현은 기존 codec과 일치시킨다. geographic 입력 단위, time input unit, screen px, angle radian/degree는 필드 이름·타입에서 구분한다. 모든 finite/nonnegative/range 제약은 materializer 전에 validator에서 적용한다.

현행 persistence codec은 `undefined`, `NaN`, `Infinity`, `-0`, `bigint` 같은 값을 tag로 보존한다. 새 action plan/snapshot도 일반 `JSON.stringify`만으로 저장하지 않고 이 codec을 사용하거나 동등한 versioned envelope를 정의한다. source table 값의 보존과 concrete geometry의 finite 제약은 별개다. 특수값을 저장할 수 있다고 NaN 좌표를 허용하지 않으며, geometry 제약을 이유로 원본 data를 조용히 바꾸지도 않는다. [현행 tagged codec](https://github.com/ggaction/ggaction/blob/40ec7edead7fc84de05aad31888dd0f7d264a512/src/persistence/codec.js#L8)

공통 오류는 `unknown-resource`, `wrong-resource-kind`, `duplicate-id`, `unsupported-combination`, `invalid-domain`, `ambiguous-identity`, `cyclic-dependency`, `unresolved-asset`, `layout-unsatisfied`에 세부 path/owner/sourcePointer를 붙인다. 이 오류 코드는 제안이며 현행 diagnostics 체계와 통합한다. 오류를 무음 no-op으로 바꾸지 않는다. typed result가 필요한 순수 계산/API는 authoring action과 별도 함수로 둔다.

### E.2 데이터·geometry·paint·layout 액션

| 권장 이름 | 필수 입력 / 선택 입력과 기본값 | 출력 의미·검증·수정 시 영향 |
|---|---|---|
| `createGeometryData` | id, format=`geojson\|topojson`, values, coordinateKind=`geographic\|planar`; featureKey, topoObject | Feature/GeometryCollection 보존. TopoJSON object 여러 개면 명시 선택. geographic은 degree/WGS84, planar는 원 단위. identity/row lineage·raw hash 저장 |
| `createGeoJoinData` | id, geometry, data, geometryKey, dataKey; cardinality 기본 one-to-one, unmatched 기본 retain-geometry | 중복 join은 기본 error. 미매칭 feature는 값 없음으로 보존. raw geometry 재사용. revise는 key/geometry/measure 변경을 구분하고 실제 dependent color/domain/size/label/filter/fit/selection을 재계산 |
| `createProjection` | id, type; center/rotate/parallels/scale/translate/fit/precision/clipAngle/clipExtent/reflectY | type별 허용 parameter 검증. fit과 explicit scale/translate 충돌 정책 명시. inverse 가능 영역 노출. 모든 source projection 포함 |
| `editProjection` | target, patch | projection 정본 수정 → geographic mark·clip·label·hit·scene invalidation. 원 geometry 불변. 이전 program 유지 |
| `createGeoCoordinate` | id, projection; viewport/clip | coordinateKind와 projection 타입 일치. geographic/planar의 값 공간과 CSS pixel mapping 연결. 기존 createCoordinate의 typed facade로 구현 가능 |
| `createGeoshapeMark` | id, geometry 또는 joined geometry, coordinate; role, fill/stroke | feature별 semantic item + compound path. hole/collection/empty policy 유지. color는 기존 encoding과 결합 |
| `createGeoPointMark` | id, data, coordinate, longitude, latitude; identity/group | 값 검증 후 투영 point. size는 화면 단위 기본. projection camera와 별개 glyph-size 정책 |
| `createGeoLineMark` | id, data 또는 geometry, coordinate, order/group; interpolation=`source-segment\|great-circle` | 경로·break·segment provenance 보존. source segment와 대권 경로를 명시 선택 |
| `createGraticule` | id, coordinate; longitudeStep,latitudeStep,extent | decorative role과 별도 hit policy. 투영 clipping 동일 적용. Sphere/background는 별도 명시 role의 geometry facade |
| `createImageResource` | id, uri/hash/mime/dimensions 또는 동봉 resource ref; attribution | loader가 resolve한 asset을 참조. pixel payload의 snapshot 포함/동봉 정책 명시. renderer는 fetch하지 않음 |
| `createImageMark` | id, data 또는 resource, x/y/size 의도; fit=`contain`, align, clip | image 자체가 원본 mark일 때 사용. aspect/alpha/bounds/export 동일. chart screenshot 우회는 translator lint 실패 |
| `createPattern` | id,type,pitch,strokeWidth,colors; phase,coordinateSpace | 7종 texture와 모든 backend의 동일 pattern geometry. paint resource reuse 및 snapshot |
| `createTrailMark` | id,data,coordinate,group,order; curve/join/cap | sample별 width 채널이 ribbon을 생성. 기존 encodeSize와 별도 width 계약의 매핑을 확정. self-overlap/zero-length/clip 검사 |
| `createPivotData` | id,source,groupby,pivot,value,aggregate; limit,missing | 동적 category→column shaping, field collision·duplicate grain 진단. output schema와 source lineage 보존 |
| `createHierarchyData` | id,source,mode=`fields\|parent-id`; pathFields 또는 key/parent, value | canonical nodes/edges와 root/depth/leaf/row membership. orphan/cycle/중복 정책은 explicit. own/aggregate value 구분 |
| `layoutHierarchy` | id,hierarchyRef,method=`tree\|treemap\|partition`; method별 size/orientation/order/valueMode | partition은 normalized u/depth를 출력하고 size/padding은 view가 적용. tree/treemap은 method별 geometry; Icicle/Sunburst는 같은 partition 사용 |
| `createGraphData` | id,nodes/edges 또는 source/target fields; value,directed,key,duplicatePolicy | edge/node identity·row lineage 보존. missing node 생성 여부·self-loop·parallel edge를 정책으로 기록 |
| `layoutGraph` | id,graph,type=`circular\|force`,size; seed,iterations,force parameters | finite deterministic positions. seed/iteration 기본값은 profile에 고정. renderer에서 simulation하지 않음 |
| `layoutFlow` | id,graph,size; orientation,nodeWidth,nodeGap,align,order | Sankey node boxes/link ribbons. positive weight/conservation과 cycle policy, stable ordering. source variant를 위한 algorithm profile |
| `createContourData` | id,source,x,y,estimator=`histogram\|kde`; grid/bins/thresholds/bandwidth | grid와 contour polygon을 별도 파생 resource로 추적. saddle/hole/islands와 estimator 의미 검사 |
| `layoutCalendar` | id,source,date,value,timezone,weekStart; year/month mode,aggregation | date→cell/month boundary를 결정. 중복날짜와 missing 처리, leap/DST/year boundary |
| `createCellLayout` | id,data,columns,rowKey; widths/alignment/header/rowLimit | Table/Bar Table/Sparkline의 cell 의미·bounds. text/mini-chart는 기존 마크와 child를 배치 |

`createFlowData`는 특별한 별도 데이터 표현을 더 만들기보다 `createGraphData`의 directed weighted graph로 통일한다. `createFlowLayout`은 `layoutFlow`와 같은 제안이다. `createGeoShape`는 `createGeoshapeMark`, `createData(geometry)`는 `createGeometryData`로 정리한다. 추상적인 `createCustomChart` 한 개로 이들을 덮지 않는다.

각 resource에 edit/remove를 만들 때 의존자가 있으면 cascade/remove-dependents 또는 명시 오류 중 기존 lifecycle과 일치하는 정책을 적용한다. geometry resource 삭제 후 mark만 남거나 projection 변경 후 hit cache만 이전 상태인 프로그램은 생성할 수 없어야 한다. 데이터를 가진 layout resource는 원본 data를 복제하지 않고 참조와 파생 결과를 유지한다.

### E.3 interaction 의미 액션과 browser controller

| 권장 API | 입력·반환 | 필수 계약 |
|---|---|---|
| `createParameter` / `editParameter` | id,type,value,domain/bind 의도 → program | scalar/tuple/range/category set 타입, invalid input 진단, dependent dataflow 갱신 |
| `createInteractionSelection` | id,scope,type,fields/encodings,empty/toggle/resolve/init → program | 기존 named authoring selection과 구분. 저장되는 정의와 runtime preview 분리 |
| `bindInteraction` | id,selection/command,gesture spec,effect refs → program | event object나 callback 저장 금지. named host handler와 serializable gesture definition |
| `encodeCondition` | target,channel,cases(predicate,value/field),otherwise → program | 기존 encoding family로 lower, predicate의 precedence/empty/null 의미 고정 |
| `createHitIndex` | concrete scene + semantic identity index → disposable immutable index | CSS pixel·clip·paint order·frame revision 보존, geometry별 정확한 hit |
| `resolveTarget` | hit/index + semantic manifest → target/result | raw DOM node를 외부 target으로 노출하지 않음. 집계 grain·records·guide value 보존 |
| `mountInteractiveChart` | HTMLElement,program,options → controller | mount/resize/getProgram/getState/applyUpdate/subscribe/destroy. 외부 adapter interface 구현은 이번 목표에서 제외 |
| `applyUpdate` | typed neutral update + options → Promise(result) | named retained/preview fold, native typed commands, diagnostics/transition settlement, stale generation 차단 |

gesture spec은 event type, modifiers, pointer types, threshold, capture, reset을 명시한다. event stream DSL을 지원할 경우 parser와 허용 연산을 제한하되 source가 사용한 stream 조합은 모두 구현한다. 내부 함수나 임의 JavaScript를 문자열로 저장하는 binding은 지원하지 않는다. host handler는 mount 시 registry로 주입하고 serialize 시 이름·필요 capability만 기록한다.

### E.4 animation 순수 API와 player

| 권장 API | 입력·반환 | 필수 계약 |
|---|---|---|
| `planTransition` | from(program/frame),to(program),timing,correspondence,format → immutable plan | endpoint/key/kernel/resource를 고정. incompatible topology와 crossfade policy 진단 |
| `sampleTransition` | plan,{time} → concrete frame scene | DOM/clock 없음. 같은 시간 같은 결과. parametric projection/scale/guide kernel 허용 |
| `createTimeline` | named segments/keyframes/dependencies/repeat/direction → timeline | segment overlap·빈구간·동일 timestamp의 순서와 fill 정책 명시 |
| `sampleTimeline` | timeline,{time} → frame+active segment state | seek/reverse에 독립적인 pure evaluation. 이전 sample 호출에 의존하지 않음 |
| `mountAnimation` | container 또는 renderer target,plan/timeline,clock,reducedMotion → player | play/pause/seek/rate/reverse/cancel/finish/destroy, finished result의 completed/cancelled/replaced |
| `serializeAnimation` / `deserializeAnimation` | plan envelope ↔ JSON/content-addressed resources | endpoint/hash만으로 복원 가능하다고 하지 않음. offline asset/font/kernel version 재현 |

현재 `renderTransitionScene(scene, context, {pixelRatio})`는 Canvas scene를 그리는 기존 API로 재사용할 수 있다. SVG frame export는 별도 typed serializer를 추가하거나 기존 SVG scene format의 역할을 명확히 확장한다. 버전 1 SVG scene와 버전 2 Canvas scene를 무타입 object로 섞지 않는다. 새 scene/animation schema는 기존 저장 프로그램 schema와 독립적인 호환 버전을 가진다.


### E.6 추가 domain API 계약 — 부록 F의 필수 구현

아래는 제안 이름이다. resource 생성은 ChartProgram의 불변 action이며 runtime signal/worker/player는 별도 session context다. 모든 action은 기존 persistence codec, lineage, explicit materialization 경계를 따른다.

| 제안 API | 필수 입력과 주요 옵션 | 출력·실패 계약 |
|---|---|---|
| `layoutHierarchy` partition variant | hierarchyRef, method=partition, valueMode, stable order | normalized u/depth layout; cycle/negative/invalid own-value 오류 |
| `createPartitionPlot` | layoutRef, coordinate, orientation 또는 angleRange/radiusPolicy, focus/root/padding | Icicle/Sunburst 공통 owner·node ID; 좌표계 변경 시 data 불변 |
| `createInferredGraphData` | dataRef,nodeKey,rule,featureRefs,metric,ruleOptions | GraphResource+inference provenance; budget/metric/ID 오류 |
| `bundleGraphEdges` | graphRef,nodeLayoutRef,method,methodOptions,coordinateSpace | edge별 RouteResource; source graph/layout 불변; method version 저장 |
| `createGraphEdges` | graphRef,routeRef,encoding/arrow/clip | 원 edge ID·direction·weight·semantic hit 보존 |
| `createGraphNodes` | graphRef,nodeLayoutRef,encoding/shape | 원 node ID/lineage와 endpoint anchor 공유 |
| `createPyramidPlot` | stage data, value/order/orientation/gap, native profile | 이전 Funnel geometry 의미 유지; 인구형 표현은 별도 bar 조합 가능; 외부 이름 매핑 의무 없음 |

Marginal/Bullet/Combo 전용 constructor는 제안하지 않는다. KPI/Gauge 전용 action은 범위 밖이다. `secondaryY`, layer별 독립 Y, 같은 frame의 두 Y guide는 공개 생성·수정·복원 계약에서 정책 오류다. 신규 resource의 edit/delete/revise는 공통 resource revision·dependency 계약을 따르며 orphan ref와 stale layout을 거절한다. mutation성 매개변수를 renderer에 숨기지 않는다.

### E.7 계약의 독립성

위 API의 옵션·return type·event payload는 ggaction 자체 grammar/action/resource 기준으로 확정한다. 외부 InteractiveRenderer/ChartAssemblyInput, legacy selection DSL, chart spec translator는 이 표의 구현 의무가 아니다. 기존 source 링크는 조사 근거로만 사용한다. 외부 adapter와 번역은 별도 프로젝트에서 native public API를 소비한다.
