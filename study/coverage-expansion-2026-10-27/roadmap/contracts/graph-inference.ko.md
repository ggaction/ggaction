# 그래프 데이터 추론과 노드 배치 계약

## Public flow와 stored result

createGraphData({id,nodes,edges,nodeKey,source,target,edgeKey,directed})는 관측 edge table을 사용한다. createInferredGraphData({id,data,nodeKey,ruleId,rule,features,metric,preprocess,options})는 규칙으로 연결을 만든다. 두 액션의 결과 GraphResource는 동일한 normalized nodes/edges/adjacency schema이며 origin만 다르다. layoutGraph는 topology를 읽고 NodeLayout을 만든다. bundleGraphEdges는 graph와 layout을 읽고 route만 만든다.

GraphResource node는 key,sourceRows,attributes; edge는 key,sourceKey,targetKey,directed,weight,origin,ruleId,sourceRows다. observed parallel edge는 explicit edgeKey 또는 persisted occurrence key를 요구한다. inferred edge는 [ruleId,direction,canonical endpoints]로 key를 만든다. k/metric 변경 후 같은 endpoint 연결이 살아 있으면 key를 보존하고 provenance revision을 올린다. ruleId를 바꾸면 별개의 추론이다. weight0은 유효하다. self edge는 inference에서 제외하고 observed 입력은 selfLoops:true일 때만 허용한다.

## Feature preparation

features는 수치 column 배열 또는 metric-specific fields다. Euclidean/Manhattan은 finite vector, cosine은 finite equal-length vector, Jaccard는 typed scalar의 deduplicated attribute 집합, great-circle은 [longitudeDeg,latitudeDeg]다. Jaccard는 유사도 계산일 뿐 집합 시각화 API가 아니다.

preprocess 기본 none. standardize는 모집단 mean/std로 각 feature를 (x−mean)/std, constant column은0으로 바꾼다. minmax는 (x−min)/(max−min), constant0. resolved statistics와 source revision을 저장한다. missing 기본 error; omit-node를 명시하면 제외 node 목록과 이유를 provenance에 남긴다. 임의 imputation은 없다. cosine zero vector는 기본 error, zeroVector:'zero-similarity' 옵션일 때 모든 pair similarity0. Jaccard empty-empty similarity1, empty-nonempty0. cosine는 [-1,1], Jaccard는 [0,1]. distance 변환은 1−similarity다.

Euclidean d=sqrt(sum((xi−yi)²)), Manhattan=sum(abs(xi−yi)). great-circle은 haversine, R=6371008.8m, clamped a∈[0,1], d=2R atan2(sqrt(a),sqrt(1−a)). output unit m, radius도 m이다. longitude wrap은 distance에서 처리하되 raw data는 보존한다. high-dimensional numerical overflow는 scaled norm으로 방지한다.

## 여섯 rule

| rule | 입력과 기본값 | 정확한 결과 |
|---|---|---|
| knn | k integer1..n−1, symmetrize directed(default)/union/mutual | self 제외, 거리→typed key 정렬한 앞 k개. ties로 k 초과 금지 |
| radius | radius≥0 | distance≤radius 포함. undirected canonical pair 한번; directed 옵션이면 양방향 |
| similarity | threshold metric domain 안 | similarity≥threshold 포함; negative cosine도 explicit threshold이면 유효 |
| mst | complete metric graph 또는 candidateGraph | Kruskal distance→canonical key 순. disconnected candidate는 forest:true일 때 forest |
| group | fields, mode clique(default)/star, hubKey for star | 같은 typed group tuple 내 연결; null group은 explicit missing policy |
| sequence | orderField, groupBy, lag integer≥1, ties key | group 내부 stable sort 뒤 i→i+lag. 시간 간격 조건은 maxGap 명시 |

empty input은 empty graph로 허용한다. knn의 n≤1은 k=1 default를 적용하기 전에 empty/no-edge 결과로 처리하고 effectiveK0를 provenance에 저장한다. n>1에서 k≥n이면 error, 조용한 clamp 금지. MST는 음수 metric을 거부하고 zero edge는 유지한다. clique의 m(m−1)/2 비용을 생성 전에 합산한다. group/sequence rule은 metric을 요구하지 않고 제공 시 inapplicable-option error다.

fixture a=0,b=1,c=3,d=10, k1: directed ab,ba,cb,dc; union ab,bc,cd; mutual ab. radius2:ab,bc. MST edges ab1,bc2,cd7, cost10. duplicate points a0,b0,c2에서 a→b,b→a의 zero edge가 남는다. tie origin0, negative−1, positive1에서 typed key 앞 항목 하나를 선택한다.

## Exact acceleration과 approximate

첫 구현은 brute-force exact와 budget preflight다. KD-tree는 Euclidean/Manhattan low dimension에서 bounding-box lower bound로 prune하고 tie boundary는 포함한다. radius grid는 cell 폭radius, radius0은 동일 좌표 key grouping을 별도 처리한다. pruning이 결과를 바꾸지 않는지 seeded random 100 fixtures에서 brute-force와 edge 배열을 정확 비교한다.

approximate는 명시 mode:'approximate'일 때만 실행한다. reference implementation은 seeded random projection forest candidate search 후 exact rerank로 제안한다. trees8, projections per tree1, leafSize32, searchLeaves16의 resolved preset을 저장한다. candidate가 k보다 적으면 exact fallback 또는 error 정책을 명시한다. seed와 algorithmVersion, candidateCount, measured recall@k를 기록한다. holdout min(n,1000) queries에서 brute-force 기준 recall≥0.95를 reference qualification 기준으로 한다. 사용자가 더 높은 minRecall을 지정하면 미달 시 incomplete/error이고 exact라고 표시하지 않는다.

## Node layout

layoutGraph method fixed/circular/force. fixed는 모든 node의 finite x/y가 필요하다. circular는 stable order, center/radius, zero/one node 정책. force는 입력 seed, iteration 수, linkDistance, repulsion, collisionRadius, damping, center를 저장한다. seeded 초기위치 뒤 fixed iterations로 계산하며 wall-clock 종료를 canonical result로 쓰지 않는다. 같은 seed/옵션/정렬이면 동일 결과다. 고정 node는 fx/fy를 움직이지 않는다. disconnected component를 0,0에 겹쳐 놓지 않고 component packing 단계를 명시한다.

force의 초기 reference solver는 O(n²) exact pair repulsion과 per-edge spring으로 구축한다. Barnes-Hut는 별도 optimization 카드에서 exact 비교와 오차 tolerance를 먼저 정의하고 opt-in accuracy parameter로 도입한다. force layout과 FDEB는 이름에 force가 들어가도 서로의 state나 iteration loop를 공유하지 않는다.

## 변경과 selection

source feature revise는 inference→layout policy→routing을 invalidation한다. node drag, camera/Canvas resize, color 변경은 topology를 유지한다. 사용자 features에 screenX/screenY를 명시한 경우에만 layout/camera 변화가 inference input이다. 이 예외는 cycle을 만들 수 있으므로 layout→inference→layout 순환은 거부한다.

filter 기본은 induced-view: 원 graph는 유지하고 visible node와 그 endpoints가 모두 visible인 edge만 그린다. recompute:true는 filtered data로 새 inference revision을 만든다. selected edge가 삭제되면 orphan selection 정책으로 drop event를 발생시키고 이웃 edge로 옮기지 않는다. 관측/추론 여부, rule와 metric은 inspect/tooltip/accessible description에서 확인할 수 있다.
