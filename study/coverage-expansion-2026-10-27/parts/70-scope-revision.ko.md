## 부록 F. 확정 범위: partition·graph inference·edge bundling 상세 설계

이 부록은 2026-10-27 사용자의 최신 결정을 반영한 **필수 구현 명세**다. 원본 소스 관찰을 바꾸지 않으며, native 구현 목표에 제외·금지 조건과 추가 기능을 적용한다. 최신 POL-09/10에 따라 외부 정합성·통합·번역은 제외한다. 아래 API 이름·기본값·오류 코드는 제안 계약이며 현재 구현이 아니다. 알고리즘의 학술 근거와 ggaction에 적용하기 위한 설계 결정을 구분한다. 작업 `WP-22`–`WP-26`, 시험 `AT-62`–`AT-92`과 연결된다.

### F.1 범위 정책과 호환성 주장의 변경

| 정책 | 확정 결정 | 구현·검증에 미치는 영향 |
|---|---|---|
| POL-01 | Icicle과 Sunburst는 하나의 hierarchy partition 계열 | 동일 hierarchy/layout resource를 직교 또는 극좌표로 materialize. 별도 데이터 알고리즘 두 벌 금지 |
| POL-02 | UpSet·집합 시각화 후속 이관 | 전용 데이터·API·상호작용·시험을 이번 범위에서 제외 |
| POL-03 | 대표 edge bundling 필수 | hierarchical, force-directed, density/KDE, edge-path 네 방법을 완료 범위에 포함 |
| POL-04 | 규칙에 의한 graph inference 필수 | kNN, radius, similarity threshold, MST/forest, group/sequence rule을 분리된 data action으로 제공 |
| POL-05 | Funnel의 공개 이름만 Pyramid로 변경 | 단계 순서·폭·방향·간격·값·라벨 의미는 유지. 외부 Funnel 문자열은 adapter alias로만 소비 |
| POL-06 | KPI·Gauge 제외 | 전용 facade, 전용 behavior, 전용 원본 충실도는 필수 개발에서 제외. 원본 행은 남기고 제외 사유 표시 |
| POL-07 | Marginal·Bullet·Combo는 조합 | 별도 public chart constructor/semantic mark family를 만들지 않는다. 기존 mark·data·layout·scale 액션으로 작성 |
| POL-08 | 이중 Y축 금지 | Cartesian plot frame 하나에 Y scale 하나, 표시 Y guide 최대 하나. 축을 숨긴 독립 Y scale도 금지 |
| POL-09 | ggaction 자체 설계 우선, Flint 정합성 제외 | 외부 adapter/upstream/API·theme·preset·event parity 의무 없음 |
| POL-10 | 번역은 별도 프로젝트 | chart-llm 및 기타 source translator·원본 충실도 검증은 이번 목표 제외 |

현재 profile은 `ggaction-native-2026-10-27`이다. 완료 기준은 GGA/USR native 기능의 정확성·조합성·재현성이다. 외부51이름/154등록과 기존49/150 등의 수치는 역사적 참고이며 구현 분모가 아니다. 외부 이름 충돌·옵션 차이를 core 설계로 해결할 필요도 없다.

KPI/Gauge 전용 지원은 제외하고 단일 frame의 복수 Y scale/guide는 금지한다. native fixture로 검사하며 외부 원본 전체의 정책 판정이나 번역 성공은 요구하지 않는다. separate panel의 독립 Y와 layer의 복수 Y는 native frame 의미로 구분한다. `y2` range endpoint는 같은 scale을 사용하는 정상 표현이다.

### F.2 통합 partition: 데이터와 normalized layout

Icicle은 계층의 구간과 깊이를 직사각형으로, Sunburst는 같은 구간을 각도로 표현한다. D3의 partition도 두 표현에 공통인 계층 배치로 제공된다. [D3 partition 공식 문서](https://d3js.org/d3-hierarchy/partition)

ggaction에서는 `createHierarchyData → layoutHierarchy({method:'partition'}) → createPartitionPlot`으로 고정한다. 마지막 액션의 `coordinate:'cartesian'|'polar'`가 표현을 선택한다. gallery의 사람이 읽는 이름 Icicle/Sunburst는 유지할 수 있지만, 별도 계산·집계·선택 모델을 만들지 않는다. `layoutHierarchy`는 tree/treemap과도 공유하는 discriminated union이며 method별 옵션을 섞으면 validation error다.

| 자원 | 필수 필드 | 소유권·의미 |
|---|---|---|
| HierarchyResource | id, revision, nodeId, parentId, children, depth, ownValue, aggregateValue, lineage | 데이터 원본, 안정 ID, 원본 row 연결. layout 좌표 없음 |
| PartitionLayout | id, hierarchyRef+revision, nodeId, u0, u1, depth0, depth1, order, effectiveValue | 정규화된 구간과 깊이. 좌표계·화면 크기에 독립 |
| PartitionView | layoutRef, coordinate, orientation 또는 angleRange/radiusPolicy, padding, rootVisible, focusNodeId, maxDepth | 직교/극좌표 mapping과 표시 범위. 원본 hierarchy를 삭제하지 않음 |

기본 집계는 `valueMode:'leaf-sum'`: leaf의 nonnegative finite 값을 합치고 internal 값은 합산하지 않는다. internal 값이 제공되면 무시 사실을 diagnostic에 남긴다. `valueMode:'inclusive'`는 internal 선언 총합과 자식 합의 일치/잔여를 검사한다. `valueMode:'own-plus-children'`는 own 값을 명시한 residual 영역으로 별도 표시한다. inclusive 모드에서 parent 총합<자식 합은 오류, 더 크면 차이를 명시 residual 영역으로 만든다. 숨은 parent 값으로 자식 구간 합이 작아진 채 정상 합격하지 않는다. negative/nonfinite는 오류, zero는 identity를 보존한 영폭 항목이다. root total=0은 빈 상태와 0 합계를 표시하고 임의 동일 폭으로 꾸미지 않는다. `equal-weight`가 필요하면 별도 명시 옵션이다.

형제 순서는 기본 stable node ID 순; source order/value order/explicit order를 선택할 수 있다. 선택한 order와 tie-break는 저장한다. typed ID `1`과 `'1'`을 구분하고 경로 문자열의 delimiter 충돌을 피한다. parent가 없는 node, cycle, 다중 parent, duplicate ID는 자동 고치지 않는다. forest는 `rootPolicy:'synthetic'`를 명시해야 하며 synthetic root는 원본 node처럼 tooltip에 표시하지 않는다. deep hierarchy는 iterative traversal로 stack overflow를 피한다.

partition 기본식은 parent 구간을 자식 effective value에 비례해 나누는 것이다. root u=[0,1], child length=(parent length)×child value/parent value. padding은 데이터 배치 후 view 단계에서 적용하며 원래 구간과 분모를 바꾸지 않는다. child residual이 있는 mode는 residual owner까지 합쳐 parent를 덮는다. float 합 오차는 마지막 경계 보정과 명시 tolerance로 처리하고 원본 value는 바꾸지 않는다.

### F.3 통합 partition: 좌표·상호작용·애니메이션

Cartesian 기본은 x=Wu, y=H·depth/(visibleDepth+1)이며 방향 TB/BT/LR/RL을 지원한다. Polar는 theta=theta0+(theta1-theta0)u, 기본 radius는 균등 깊이 밴드다. `radiusPolicy:'equal-depth-area'`는 r=sqrt(rInner²+t(rOuter²-rInner²))를 사용한다. 이는 **깊이 밴드별 전체 면적**을 같게 만드는 선택이며, 서로 다른 깊이의 모든 node 면적이 같은 전역 값 척도를 따른다는 보장은 아니다. angleRange≤2π, 음의 sweep 금지, clockwise 별도 boolean, 시작각은 정규화하되 저장된 회전 연속성은 유지한다.

직교 padding은 CSS px, polar angularGap은 arc length 기준 CSS px로 주어 반경에 맞춰 변환한다. 반경 0 부근의 division, 좁은 wedge, 최대 padding clamp는 공통 geometry kernel에서 처리한다. rootVisible=false일 때 빈 중심/첫 깊이 배치를 명시하고 가짜 데이터 재집계로 root를 제거하지 않는다. label은 공간이 부족하면 숨기되 접근성 트리·tooltip·검색에서 node를 유지한다. text rotation, keep-upright, full-circle seam, clipping, 최소 hit 크기를 renderer와 공유한다.

focus/zoom은 선택 subtree의 u 구간과 depth window를 viewport로 변환한다. `focusNodeId`와 selection은 분리하고 parent 이동·breadcrumb·keyboard arrows·Escape/root 복귀를 지원한다. filter가 집계 분모를 바꾸는 `recompute`와 기존 분모에 숨김만 적용하는 `preserve`를 명시적으로 선택한다. 기본은 recompute이며 상태에 원래 총합과 현재 총합을 함께 제공한다. 두 view를 연결할 때 node selection은 같은 hierarchy ID/node ID로 전파된다.

Icicle↔Sunburst 전환은 rect/path 문자열을 단순 보간하지 않는다. 각 node의 동일 u/depth 경계를 연속 coordinate mapper로 샘플링하여 같은 semantic item을 유지한다. 한 가지 구현 가능한 kernel은 bend 각도 α를 0→2π로 늘리며 x=(R+v)sin(α(u-.5)), y=(R+v)cos(α(u-.5))-R, t=α/(2π), R=(1-t)W/α+t·rInner로 배치하고 α≈0에서 해석적 직선 극한을 쓰는 방식이다. v는 t에 따라 직교 깊이 높이에서 최종 radial depth까지 보간한다. 실제 viewport fit·root band·최종 회전은 endpoint mapper와 일치시킨다. 이 식은 제안이며 full turn seam, 자기 교차, 두 endpoint 정확성을 시험해야 한다. 보간 topology를 보장하지 못한 경우 명시 crossfade로 전환하며 이를 continuous bend 지원이라고 주장하지 않는다. 최종 완료에는 검증된 bend kernel과 reduced-motion 경로가 모두 필요하다.

독립 fixture: root10, A6(children A1=2,A2=4), B4. root[0,1], A[0,.6], B[.6,1], A1[0,.2], A2[.2,.6]. Cartesian width1000에서 A폭600; full polar에서 A각도1.2π. 이 정확한 interval·같은 node ID·selection·저장/복원 결과를 두 view에서 비교한다. raster screenshot만으로 partition 정확성을 검증하지 않는다.

### F.4–F.5 집합 시각화 — 후속 과제

UpSet과 집합 시각화는 이번 범위에서 제외한다. `createSetData`, `createIntersectionData`, `createUpSetPlot`, 전용 membership/intersection resource, exact/inclusive intersection query, matrix/bar 조합 및 연결된 상호작용·시험을 함께 이관한다. WP-23, USR-03/04, AT-66–69는 후속 기록으로만 유지하며 활성 기능의 선행 조건이나 릴리스 게이트가 아니다. [기존 상세 설계](evidence/deferred-set-visualization-design.ko.md)는 향후 재검토용이다.

일반 selection의 원소 집합, linked views, predicate의 집합 연산, graph 유사도 metric은 집합 시각화 전용 기능이 아니므로 기존 계획을 유지한다.

### F.6 Graph inference: topology·layout·routing의 분리

`createInferredGraphData`는 **누가 누구와 연결되는지** 결정한다. `layoutGraph`는 **node를 어디 놓는지**, `bundleGraphEdges`는 **이미 존재하는 edge를 어떤 경로로 그리는지** 결정한다. force-directed node layout과 force-directed edge bundling은 서로 다른 계산이다. 한 `force` 옵션이 세 의미를 동시에 바꾸는 API는 만들지 않는다.

명시 edge table은 `createGraphData`; 추론은 `createInferredGraphData`로 선택한다. 추론 출력도 같은 GraphResource이므로 layout·interaction·bundling을 재사용한다. node는 원본 row의 stable ID, edge는 directed ordered endpoint 또는 undirected canonical endpoint + rule ID + parallel occurrence로 식별한다. graph에는 `origin:'observed'|'inferred'`, rule version/options/source revision/feature preprocessing/provenance가 포함된다. 추론된 연결을 관측 사실이나 인과 관계로 표시하지 않는다.

| rule | 필수 옵션·판정 | 경계 조건·기본 정책 |
|---|---|---|
| knn | features, metric, k; 각 node의 가까운 k개 | self 제외. `symmetry:'directed'|'union'|'mutual'`; 기본 directed. k 정수 1…n-1, 초과는 error; clamp는 명시 선택 |
| radius | features, metric, radius, boundary | 기본 d≤radius, radius≥0; 0거리 중복점 연결을 유지; units 필수 |
| similarity-threshold | similarity, threshold, comparator | 기본 similarity≥threshold; cosine/Jaccard 범위 검증. 거리 cutoff와 이름을 섞지 않음 |
| mst | metric, candidateGraph 또는 complete | nonnegative 거리, deterministic Kruskal 기준. disconnected candidate는 forest와 component count; 강제로 가짜 edge를 추가하지 않음 |
| group-rule | groupFields, connection:'clique'|'star' | null group 정책, star anchor 명시/ID 최소값, clique edge budget 사전 계산 |
| sequence-rule | groupFields, orderFields, lag | 기본 lag1, stable tie-break, 그룹 경계 연결 금지, 날짜 단위·null ordering 명시 |

kNN/radius 그래프의 connectivity와 distance 표현을 구분하는 기존 실용 API를 참고하되 ggaction의 ID·저장·lineage 계약은 별도로 정의한다. [kNN 공식 API](https://scikit-learn.org/stable/modules/generated/sklearn.neighbors.kneighbors_graph.html), [radius 공식 API](https://scikit-learn.org/stable/modules/generated/sklearn.neighbors.radius_neighbors_graph.html)

### F.7 Graph inference: 거리·재현성·갱신

features는 numeric field vector 또는 명시 set vector/geo coordinate resource다. 화면 x/y를 자동 feature로 사용하지 않는다. metric은 Euclidean, Manhattan, cosine distance, Jaccard distance, great-circle을 지원하고 맞는 feature type에만 허용한다. great-circle은 degrees/radians와 Earth radius 단위를 고정하며 경도 차이를 date-line 기준으로 정규화한다. geo의 projection 이후 screen 거리와 지리 거리를 혼용하지 않는다. cosine zero norm은 기본 오류, Jaccard empty/empty는 거리0으로 명시한다.

preprocessing 기본 none; standardize/minmax/impute/drop을 사용하려면 별도 저장 가능한 data transform과 fitted parameters를 참조한다. categorical 필드를 숫자로 자동 변환하거나 null을0으로 바꾸지 않는다. feature와 ID validation이 실패하면 일부 graph를 성공으로 반환하지 않는다. 모든 거리·similarity·rank는 endpoint provenance와 저장하고 화면 stroke width에 사용하는 값은 별도 encoding이다. routeCost는 거리/유사도와 구분하며 shortest-path용은 nonnegative finite다.

tie-break는 (distance, typed stable node ID). 입력 행 순서를 바꾸어도 같은 edge 집합이 나온다. union은 양방향 중 하나라도 있으면 undirected edge 하나, mutual은 두 방향 모두 있어야 edge 하나다. rankSource/rankTarget를 보존하고 방향 합치기로 weight를 2배 하지 않는다. 실제 node ID가 다른 duplicate feature points는 0거리로 연결될 수 있으며 sparse 구조의 0값을 “edge 없음”으로 취급하지 않는다.

기본 exact search는 작은 n에서 brute-force oracle와 일치해야 한다. k-d tree/ball tree 등 exact accelerator는 metric/dimension 적용성을 검증한다. approximate search는 명시 opt-in, seed/algorithm version/recall target/측정 sample을 기록하고 exact로 표시하지 않는다. `maxNodes/maxEdges/maxCandidatePairs` 초과는 실행 전 estimate와 error/사용자가 명시한 대체 옵션으로 처리한다. 자동 sampling이나 k 축소는 금지한다. chunk/worker/abort/progress를 지원해 runtime을 멈추지 않되 중간 graph를 최종 상태로 publish하지 않는다.

데이터 revise→preprocessing dependency→inference→layout→routing 순으로 invalidation한다. layout drag/resize만으로 inference를 다시 하지 않는다. 화면 위치로 graph를 만드는 특수 용도는 `featureSpace:'screen'`를 명시하며 이후 drag로 topology가 변함을 UI와 trace에 드러낸다. 표시 filter의 기본은 `graphFilterMode:induced-view`: 기존 topology의 endpoint가 둘 다 남은 edge만 보이고 새 이웃을 찾지 않는다. 사용자가 `recompute`를 명시하면 필터된 dataset으로 새 kNN/radius 등의 topology를 계산한다. tooltip과 trace에 어느 정책인지 남긴다. 기존 selection은 edge ID가 남으면 유지, 삭제되면 reconcile하고 새 edge에 옮기지 않는다. 같은 rule ID에서 metric/k를 변경하면 configuration revision만 올리고 동일 endpoint edge ID는 유지한다. 별개의 inference rule resource를 생성하면 새 namespace의 edge ID를 사용한다.

독립 1차원 fixture: a=0,b=1,c=3,d=10, k=1. directed는 a→b,b→a,c→b,d→c; union은 ab,bc,cd; mutual은 ab만. radius2 inclusive는 ab,bc; complete Euclidean MST는 ab(1),bc(2),cd(7), 총10. 추가 tie fixture a=0,b=2,c=4에서 b의 이웃은 ID tie-break로 a다. 이 값은 [계획용 수치 fixture](evidence/revision-oracle-fixtures.json)에 고정한다.

### F.8 Edge bundling 공통 resource와 네 필수 방법

기본 pipeline은 `createGraphData/createInferredGraphData → layoutGraph → bundleGraphEdges → createGraphEdges + createGraphNodes`다. bundling은 GraphResource나 NodeLayout을 변형하지 않고 EdgeRouteResource를 새로 만든다. node 위치 고정, edge 수·ID·방향·weight·adjacency 보존은 모든 방법의 공통 invariant다. bundle 교차점은 graph node가 아니며 새로운 adjacency를 만들지 않는다.

```ts
// 제안 계약의 형태. 현재 호출 가능한 API 예제가 아니다.
type BundleOptions =
  | { method:'hierarchical'; hierarchyRef:string; strength:number }
  | { method:'force-directed'; compatibilityThreshold:number;
      cycles:number; iterations:number; stepSize:number; springConstant:number }
  | { method:'density'; gridSize:number; bandwidth:number;
      iterations:number; advectionStep:number; directionPolicy:'ignore'|'separate' }
  | { method:'edge-path'; maxStretch:number; lengthExponent:number;
      directionPolicy:'respect'|'ignore' };
// 공통: id, graphRef, nodeLayoutRef, coordinateSpace, precision,
// seed, algorithmVersion, maxWork, abort signal은 runtime context로 분리.
```

`EdgeRouteResource`는 edgeId, sourceNodeId/targetNodeId, polyline/controlPoints, endpoint attachments, method/options/version, graph/layout revision, route provenance, diagnostics, bounds를 가진다. 시작점/끝점은 node anchor와 정확히 일치해야 한다. shape 경계 attachment와 arrowhead shortening은 renderer 단계에서 각각 계산하며 raw route endpoint를 잘라 버리지 않는다. 자기 loop/parallel edge/0길이 edge의 별도 경로 정책을 제공한다.

**Hierarchical Edge Bundling.** node inclusion hierarchy와 adjacency graph를 따로 받는다. 두 endpoint 사이의 hierarchy path/LCA를 control path로 사용하고 strength로 직선과 계층 경로의 결합 정도를 조절하는 계열이다. [Holten 2006 원 논문](https://doi.org/10.1109/TVCG.2006.147)

ggaction 구현 제안은 hierarchy endpoint mapping 검증→LCA path 추출→중복 control point 제거→strength blending→고정된 cubic B-spline basis로 샘플링이다. strength=0은 직선,1은 전체 계층 경로 영향. hierarchy에 endpoint가 없으면 error 또는 명시 unbundled fallback+diagnostic; node ID의 문자열 prefix로 parent를 추정하지 않는다. Icicle/Sunburst의 같은 hierarchy를 쓸 수 있지만 root 경유 경로와 화면 clip은 view에 맞게 처리한다. 별도 hierarchical layout을 강제하지 않고 전달된 node layout을 존중한다.

**Force-Directed Edge Bundling (FDEB).** edge를 세분화한 점들에 spring과 edge 간 attraction을 적용하는 방법이다. node force layout이 아니다. 각도·길이·위치·visibility 기반 compatibility로 묶일 후보를 제한한다. [Holten & van Wijk 2009 원 논문](https://onlinelibrary.wiley.com/doi/pdf/10.1111/j.1467-8659.2009.01450.x)

ggaction 구현 제안은 고정 endpoint→compatibility graph→arc-length subdivision→spring+compatible-point attraction 반복→step/iteration schedule 변경→최종 smoothing이다. 계산 중 모든 update는 이전 iteration buffer를 읽고 새 buffer에 쓰며 edge 방문 순서에 따른 결과 차이를 막는다. 반대 endpoint orientation은 최소 대응 거리로 정렬하되 graph 방향은 바꾸지 않는다. threshold[0,1], cycles/iterations 양의 정수, step/spring finite nonnegative를 검사한다. zero-length edge는 compatibility 분모에서 제외하고 기존 anchor에 유지한다. 후보 pair pruning은 exact compatibility reference와 비교하고 omitted compatible pairs를 숨기지 않는다.

**Density/KDE bundling.** edge 표본으로 density field를 만들고 gradient를 따라 내부 점을 이동시키는 계열이다. [Hurter·Ersoy·Telea 2012 원 논문](https://webspace.science.uu.nl/~telea001/uploads/PAPERS/EuroVis12/kdeeb.pdf)

ggaction 구현 제안은 normalized layout grid→polyline deposition→KDE convolution→gradient advection→resampling/smoothing을 반복한다. endpoint pin mask, empty density/flat gradient 처리, grid boundary 정책을 고정한다. bandwidth와 step은 normalized coordinate 단위이며 CSS px 옵션은 view transform을 통해 변환하여 저장한다. density는 내부 계산이며 최종 출력은 edge별 vector route다. direction separation 요청은 방향 bin별 density/compatibility를 사용하고 반대 방향의 흐름이 구별되는지 시험한다. CPU reference부터 구현하고 GPU 가속은 수치 tolerance와 fallback을 검증한다.

**Edge-Path Bundling.** graph의 대체 경로를 사용해 edge를 routing하는 방법으로, 서로 연결되지 않은 edge 집단을 한 연결 구조처럼 보이게 하는 문제를 줄인다. 모든 시각적 모호성을 없앤다는 뜻은 아니다. [Wallinger 외 원 논문](https://arxiv.org/abs/2108.05467)

ggaction 구현 제안은 원 논문의 edge 처리 순서·locking 규칙을 고정한 reference부터 작성한다. candidate edge를 제외한 graph에서 geometry length^lengthExponent 비용으로 shortest alternative path를 찾고 geometric route length≤maxStretch×straight length인 경우만 채택한다. path의 각 edge ID와 node ID를 provenance에 남긴다. directed respect 모드에서는 directed path만 허용한다. 경로가 없거나 stretch를 넘으면 원래 직선+진단이며 연결되지 않은 component를 이어 붙이지 않는다. zero-length/negative cost와 deterministic tie를 검증한다. spanner 기반 최적화는 후속 accelerator로 가능하지만 baseline과 다른 결과를 동일 알고리즘 버전으로 숨기지 않는다. [2023 가속 연구](https://doi.org/10.1111/cgf.14789)

네 방법의 기본값은 논문 숫자를 임의로 섞지 않는다. `algorithmVersion`과 `presetVersion`을 분리하고 normalized coordinate scale, epsilon, sampling, smoothing basis, stopping criteria까지 fixture manifest에 고정한다. balanced preset의 실제 수치 선정은 독립 reference 비교와 benchmark를 통과해야 하며, **미정 기본값을 남긴 상태는 WP-25 미완료**다. 구현자는 명시 옵션 fixture로 시작할 수 있고 default 최적화는 그 뒤 수행한다.

### F.9 Edge bundling: interaction·animation·geo·성능

hit test는 현재 보이는 route에 대한 stroke 거리와 spatial index를 사용한다. 한 bundle에 여러 edge가 겹치면 nearest만 임의 반환하지 않고 ordered candidate IDs와 disambiguation을 제공한다. 단일 edge 강조, incident edge 강조, focus+context, bundle 전체 선택을 분리한다. bundle 전체 선택은 표시 group selection이며 새로운 graph edge나 node로 저장하지 않는다. tooltip은 원래 endpoint/direction/value와 inferred 여부를 보여준다. arrowhead·gradient 등 방향 표현도 원 edge 방향을 따른다.

선택된 edge를 일시적으로 풀어 보여주는 explode/unbundle view를 제공하며 원 graph/layout은 불변이다. mouse/touch뿐 아니라 node 목록→incident edges→endpoint 이동의 keyboard 경로와 accessible edge table을 지원한다. clipping 밖 route는 hit하지 않는다. 화면에 그려지지 않은 virtualized edges의 존재·개수는 접근성 summary에서 유지한다.

bundling strength/parameter 변경 transition은 edge ID로 대응하고 arc-length resampling으로 vertex 수를 맞춘다. endpoint는 node transition에서 계산한 현재 위치에 고정한다. method 전환과 graph topology 변화는 별도 transition plan으로 처리하며 matching 불가능한 route는 명시 crossfade, 새/삭제 edge는 enter/exit다. seek/reverse/interrupt에서 현재 frame의 hit index를 갱신하고 reduced motion은 최종 route를 즉시 적용한다. runtime solver가 매 frame 새 graph를 추론하면 실패다.

geo network는 geodesic inference→projection/clip→layout-space routing 순서를 명시한다. 날짜변경선의 양쪽 segment를 화면 가로질러 다시 연결하지 않는다. geo camera 변경은 projection revision과 route invalidation을 유발한다. 지도 위 bundle은 실제 교통 노선이나 지형을 따른 최단 경로가 아니라 시각적 routing임을 metadata/tooltip에서 구분한다. globe backside는 clip하며 endpoint가 숨겨진 경우 route의 표시 정책을 고정한다. 실제 road-network routing은 별도 graph input일 때만 주장한다.

성능 fixture는 E=100/1k/10k와 density grid128/256/512를 포함한다. FDEB의 all-pairs O(E²) reference는 작은 fixture oracle로 유지하고 큰 입력은 spatial candidate pruning/worker/chunk를 사용한다. pruning이 근사이면 표시하고 quality metric을 비교한다. 시간 제한으로 solver를 중단할 때 `converged:false/iterationsCompleted/residual`을 반환하며 “완료”로 포장하지 않는다. dispose/abort 뒤 stale route publish·GPU buffer·worker·event listener 누수가 없어야 한다. benchmark는 inference/layout/bundling/render/hit/frame 비용을 분리한다.

### F.10 Pyramid와 조합 recipe: 이름을 늘리지 않는 구현

**Pyramid는 이전 Funnel의 이름만 바꾼다.** width/area value interpretation, sort, stage order, gap, orientation, labels, percent denominator, negative/missing 정책은 기존에 의도한 단계형 chart 계약에 따라 유지한다. 위아래를 뒤집거나 정삼각형을 강제하거나 값 순서대로 자동 정렬하지 않는다. 공개 `createPyramidPlot`을 제안하고 stage data→trapezoid/segment marks→encoding/labels로 낮춘다. native 문서의 권장 이름은 Pyramid다. 외부 alias를 받는 adapter는 이번 작업에서 만들지 않는다.

외부 자료에 같은 이름의 인구형 막대 차트가 있어도 native 명칭을 그 registry에 맞출 의무는 없다. 인구형 표현은 기존 bar 조합으로 만들 수 있다. 외부 Funnel/Pyramid 문자열 매핑과 ID 충돌 처리는 향후 별도 번역·adapter 프로젝트의 일이다.

| 사용자 표현 | 공개 액션 조합 | 반드시 보강할 공통 계약 | 만들지 않을 전용 기능 |
|---|---|---|---|
| Marginal | scatter + histogram/density + adjacent composition | 주 plot과 분포의 공유 domain, plot bounds 정렬, joint filter/selection, legend owner | 별도 Marginal constructor/mark |
| Bullet | reference bands + actual bar + target rule + text | 같은 척도와 baseline, role별 tooltip/hit/format, target outside domain 정책 | 별도 Bullet constructor/mark |
| Combo | bar/line/point/area + layer composition | 한 frame의 공유 Y scale·domain union·통합 legend·z-order | 별도 Combo constructor, secondary Y 옵션 |

새로운 부족한 기능은 공통 track/grid alignment, guide ownership, shared-domain solver, role/lineage 보강으로 해결한다. 문서/gallery에서 기존 차트 용어로 검색되게 만드는 것은 허용하지만 action catalog에 새 독립 API처럼 등록하지 않는다. recipe가 길어지면 이름 전용 API를 추가하기 전에 공통 조합 액션의 계약을 개선한다.

### F.11 단일 Y축 정책의 실제 enforcement

정책 단위는 전체 canvas가 아니라 Cartesian frame ID다. 각 overlay layer는 동일 Y scale resource를 참조하고 domain은 참여 layer의 값에서 공통 규칙으로 계산한다. 축을 오른쪽으로 옮기는 것은 가능하나 왼쪽과 오른쪽을 동시에 표시하지 않는다. 같은 scale을 복제한 mirror axis도 이번 사용자 정책에서는 금지다. axis를 숨긴 독립 scale, 양쪽에서 다른 단위를 쓰는 label transform, 보이지 않는 두 번째 frame을 겹쳐 놓는 우회도 금지한다.

서로 다른 단위의 두 measure는 기본적으로 shared-Y overlay를 거절한다. 사용자가 명시한 정규화/표준화와 제목·단위 변경을 포함한 새 데이터 변환이면 하나의 척도로 표현할 수 있지만 source-equivalent로 승격하지 않는다. 별도 adjacent/facet panel은 각자 한 Y scale을 가질 수 있다. x/x2 또는 y/y2 range endpoint는 같은 scale의 하한/상한이므로 금지 대상이 아니다. polar radius/angle, geo latitude/longitude도 Cartesian dual-Y로 오판하지 않는다.

검사는 ① native API admission ② action options/schema ③ composition scale-resolution ④ materialized frame/guide inspection ⑤ saved program load/edit와 runtime update의 다섯 경계에서 실행한다. `E_POLICY_MULTIPLE_Y_SCALES`와 `E_POLICY_MULTIPLE_Y_GUIDES`는 owner/frame/source pointer/허용 대안을 반환한다. 외부 참고 예제의 `resolve.scale.y:'independent'`는 layer인지 facet인지 구조를 보고 판정한다. 단순 문자열 grep로 전체 spec를 제외하지 않는다. 외부 dialect/default resolution은 번역 프로젝트에서 처리하며 이번 native 검사 의무가 아니다.

기존 저장 프로그램의 정책 위반은 원본을 지우거나 조용히 shared scale로 다시 저장하지 않는다. load 시 profile admission 오류와 원본 보존, 명시적 재표현 export를 제공한다. 현재 버전 소스를 이번 문서 수정으로 변경하지 않는다. 향후 API migration은 기존 grammar의 유지/오류 경계를 type·schema·문서·runtime에서 일치시키고 새 profile에서 금지 경로가 노출되지 않게 한다.

### F.12 구현자가 따라갈 순서와 release gate

1. WP-26 자체 설계 정책과 frame 의미를 고정한다. 외부 원장은 참고로 보존하며 필수 의존성에서 제거한다.
2. WP-02/03/04/06 위에 WP-22 partition, WP-24 graph inference를 구현한다.
3. WP-08 graph layout과 WP-24 topology 위에 WP-25 네 bundling method를 구현한다.
4. WP-07/11/12/14의 composition·hit·interaction·animation을 연결하고 resize/revise/save/load/실제 입력까지 검증한다.
5. WP-19 docs/types/LLM과 WP-20 native qualification을 통과한 뒤 WP-21 릴리스로 진행한다. 외부 upstream·adapter·translator·corpus 실행은 선행 조건이 아니다.

각 신규 domain은 schema validator, public action contract, immutable resource, explicit materializer, renderer-neutral graphics, inspector, types, docs, executable recipe, numeric oracle, interaction/frame oracle, clean-package consumer를 갖춰야 한다. 렌더러가 semanticSpec를 해석하는 자동 compiler로 바뀌지 않으며, 순수 action과 DOM/runtime session의 기존 경계도 유지한다.

완료 조건은 **채택된 native capability + 사용자 requirement의 qualification**, 제외 항목의 정확한 비노출, 금지 입력의 정확한 거절, 조합 recipe의 공통 액션 사용이다. excluded/prohibited를 성공 차트로 세지 않고 별도 표에 공시한다. 이 문서와 JSON 원장은 제안/미실행 상태이며 report validation 통과를 신규 알고리즘 구현 성공으로 해석하지 않는다.

### F.13 명시 옵션·진단·캐시 계약

아래는 구현을 시작할 수 있는 **제안 reference preset v1**이다. 성능·미관이 검증된 제품 default라는 주장이 아니다. 좌표는 bounding box의 긴 변을 1로 정규화하고 원래 affine transform을 저장한다. 각 kernel은 inverse mapping 뒤 원래 endpoint를 다시 고정한다. 기본값을 변경할 때 preset version을 올리고 저장된 프로그램은 기존 값을 유지한다.

| 대상 | 제안 기본값 | 검증·변경 규칙 |
|---|---|---|
| partition | leaf-sum, stable ID order, rootVisible=true, padding=0, full-turn, equal-depth radius | 내부 값은 diagnostic; inclusive/own-plus-children은 명시 선택 |
| inference | exact, preprocessing none, missing error, self=false, k/radius/threshold 필수 | kNN 기본 directed; 각 입력 metric 명시, Euclidean numeric default만 허용 |
| HEB | strength=.85, cubic basis, normalized sampling tolerance=.001 | strength0 직선 보장, 최대 subdivision 한도4096/edge; 초과 진단 |
| FDEB | spring=.1, compatibility threshold=.6, cycles6, initial subdivision1, subdivision×2/cycle, initial iterations60, iterations×2/3/cycle, initial step=.1, step×.5/cycle | iteration은 ceil, 최소1. epsilon1e-9. reference mode는 all-pairs, pinned endpoints. normalize scale과 함께 고정 |
| density | grid256, bandwidth=.05, iterations20, bandwidth×.9/iteration, min bandwidth=2/grid, advection step=.005, direction ignore | gradient norm≤1e-9이면 이동0, endpoint pin, bilinear grid sample; 각 iteration equidistant resampling |
| edge-path | maxStretch2, lengthExponent2, direction respect | geometric length 검증; directed input의 역방향 route 금지, 비용 tie는 stable edge ID |

KDE의 기본 smoothing은 interior point에 [1,2,1]/4 한 pass, endpoint는 고정한다. resampling 간격은 min(bandwidth/4,1/grid), 최대4096 samples/edge다. exact method 이름이 원 논문 구현과 다른 수치 결과를 내면 algorithm profile에 변형과 이유를 명시한다. 알고리즘 reference 시험은 고정한 수학·수치 옵션을 사용하고 balanced preset의 미관 평가와 분리한다. GPU/worker 수와 플랫폼 차이에도 정해진 수치 tolerance를 지켜야 한다.

허용 옵션의 범위를 제안 schema에 넣는다: strength/compatibility는 [0,1], maxStretch≥1, lengthExponent>0, bandwidth/step>0, iteration/cycle/grid 정수 양수. 최대작업량 기본은 maxNodes100000, maxEdges1000000, maxCandidatePairs10000000, maxSamples10000000으로 시작하는 자원 guard이며 해당 크기의 실시간 성능 약속이 아니다. 버퍼 할당 전에 estimate하고 초과 시 `E_WORK_BUDGET`를 반환한다. source/profile이 더 큰 입력을 요구하면 사용자가 명시한 budget 확대와 독립 성능 qualification이 필요하다.

공통 진단은 `E_DUPLICATE_ID`, `E_UNKNOWN_NODE`, `E_HIERARCHY_CYCLE`, `E_INVALID_VALUE`, `E_INVALID_METRIC`, `E_K_OUT_OF_RANGE`, `E_WORK_BUDGET`, `E_POLICY_MULTIPLE_Y_SCALES`, `E_POLICY_MULTIPLE_Y_GUIDES`를 구분한다. 결과에는 severity, code, owner ID, source pointer, option, observed value, allowed range, repair alternative가 포함된다. source-blocked/unsupported/policy-excluded/approximate/nonconverged를 모두 warning 하나로 합치지 않는다.

캐시 key는 algorithm+version+options hash, input resource ID/revision, preprocessing parameters, hierarchy/graph/layout revision, coordinate transform/projection/clip revision, output precision이다. 색·선택 강조처럼 routing에 영향을 주지 않는 style 변경은 route를 다시 풀지 않는다. node 크기가 endpoint attachment만 바꾸면 route anchor와 trimmed display path 중 영향을 받는 단계만 갱신한다. font 변경이 node layout 크기를 바꾸면 layout→route invalidation을 수행한다. cache hit도 provenance를 유지하며 cache 자체를 ChartProgram persistence에 직렬화하지 않는다.
