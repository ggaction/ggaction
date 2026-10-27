# 네 가지 edge bundling 구현 계약

## 공통 입력과 출력

bundleGraphEdges({id,graph,layout,method,options,coordinateSpace})를 제안한다. method는 hierarchical/force-directed/density/edge-path다. immutable GraphResource와 NodeLayout revision을 읽고 EdgeRouteResource를 저장한다. result.routes는 원 edge 순서와 같은 {edgeKey,sourceKey,targetKey,controlPoints,commands,bounds,provenance} 배열이다. graph의 node/edge 수, key, weight, direction, adjacency, node position을 수정하지 않는다. route는 world-layout 좌표이며 screen-space를 명시한 경우 resize 시 다시 계산한다.

출력은 vector다. 선택·hit·SVG/PDF가 원 edge에 접근할 수 있어야 한다. edge 겹침은 topology가 아니다. intersection에 가짜 node를 넣지 않는다. self-loop/zero-length는 source/target anchor를 보존한 deterministic loop 또는 point route이며 method 옵션으로 explicit 처리한다. 단순 fallback을 사용하면 provenance.reason에 기록하고 최종 완성률에서 구분한다.

수치 계산 전에 bounding box의 long axis를1로 정규화하고 종료 후 원좌표로 복원한다. degenerate box는 scale1과 별도 zero geometry 처리다. 입력 배열을 typed key 순으로 정렬한 work buffer에서 계산하되 결과는 graph edge 순서로 돌려준다. mutable buffer는 result와 공유하지 않는다.

공통 reference budget은 maxNodes100,000, maxEdges1,000,000, maxCandidatePairs10,000,000, maxSamples10,000,000. 이는 성능 약속이 아니라 memory/resource guard다. 각 method는 비용을 추정하여 넘으면 budget-exceeded다. partial preview는 명시 mode에서만 반환하며 저장 action은 complete:true 결과만 받는다. 중단 후 늦은 worker callback이 resource를 갱신하지 못하게 sourceRevisionVector와 generation token을 검사한다.

## Hierarchical edge bundling

[Holten의 HEB 논문](https://www.cs.jhu.edu/~misha/ReadingSeminar/Papers/Holten06.pdf)의 핵심은 두 endpoint 사이 hierarchy path를 spline control polygon으로 사용하는 것이다. 아래의 안정 ID·오류·버전·수치 제한은 ggaction 제안이다.

1. nodeKey→hierarchyKey mapping을 검증한다. 서로 다른 forest root는 명시 synthetic common root가 없으면 missing-common-ancestor 오류다.
2. source ancestors와 target ancestors에서 LCA를 찾는다. source→LCA→target 순서의 중복 없는 hierarchy key 목록을 만든다.
3. 각 hierarchy node의 layout anchor를 읽는다. 내부 node anchor가 없으면 hierarchy layout에서 계산해야 하며 endpoint 평균으로 임의 추정하지 않는다.
4. n개 control point Pi에 대해 Li=(1−i/(n−1))P0+i/(n−1)Pn−1, Qi=(1−β)Li+βPi. β∈[0,1], default .85다.
5. degree=min(3,n−1) clamped B-spline을 de Boor로 평가한다. endpoint 정확 일치, 내부 knot는 uniform. geometry tolerance .001 normalized units, edge별 subdivision≤4096.
6. β0은 exact straight path를 반환한다. node path와 β, spline version을 route provenance에 보존한다.

작은 fixture s→parentA→root→parentB→t의 경유 key가 정확히 5개여야 한다. A와 B가 같은 subtree면 root까지 올라가면 안 된다. spline이 교차하더라도 adjacency는 원본과 같다.

## Force directed edge bundling

[Holten과 van Wijk의 FDEB 논문](https://classes.engineering.wustl.edu/cse557/readings/holten-edgebundling.pdf)을 기준으로 compatibility와 subdivision spring 모델을 구현한다. 다음의 integration schedule, epsilon, directed 처리와 버퍼 정책은 재현성을 위한 명시 선택이다.

길이 lp,lq>ε, 평균 l=(lp+lq)/2, unit direction up,uq, midpoint mp,mq에 대해 angle=abs(dot(up,uq)), scale=2/(l/min(lp,lq)+max(lp,lq)/l), position=l/(l+distance(mp,mq)). Q endpoint를 P의 무한 직선에 orthogonal projection한 I0,I1에 대해 visibility(P,Q)=max(0,1−2 distance(mp,(I0+I1)/2)/distance(I0,I1)); denominator≤ε이면0. visibility pair는 두 방향 최소값이다. compatibility는 네 값의 곱, threshold .6 이상만 pair에 넣는다. directed graph에서 dot<0이면 pair compatibility0; undirected에서 dot<0이면 대응 sample index를 역전한다.

cycle c=0..5, internal samples m=2^c, segments m+1, K=.1, local spring k=K/(originalLength×segments), step=.1×.5^c. iteration count는 I0=60, I(c+1)=max(1,ceil(2Ic/3)). 각 cycle 시작에 이전 route를 arc-length uniform resample한다. 각 internal sample i의 spring=k(Pi−1+Pi+1−2Pi). attraction은 compatible edge Q에 대해 C(P,Q)×(Qi−Pi)/max(distance(Qi,Pi),ε)^2의 합이다. distance≤ε이면 그 pair contribution0. newPi=oldPi+step×force를 동시에 갱신하고 endpoints는 원래 anchor로 고정한다. step displacement가 normalized .1을 넘으면 .1로 cap하고 cap count를 diagnostics에 저장하는 안정화 정책을 제안한다. reference oracle는 cap 미발생 입력을 사용한다.

old/new 두 버퍼가 필수다. edge iteration 순서를 뒤집었을 때 결과가 달라지면 in-place update가 섞인 것이다. zero-length edge는 pair에서 제외하고 endpoint 그대로 유지한다. nonfinite 또는 sample budget 초과는 atomic error다. 최종 route를 임의 한 cubic으로 압축해 endpoint와 세부 모양을 잃지 않는다.

oracle: P=(0,0)→(1,0), Q=(0,.1)→(1,.1)이면 angle1, scale1, position10/11, visibility1, total10/11. perpendicular pair는0. 평행 same geometry의 identical internal points는 attraction0이며 NaN이 아니다. first-step oracle는 별도 math script에서 springs, attraction, cap 전/후를 각각 기록한다.

## Density KDE bundling

[Hurter 등의 KDEEB 논문](https://webspace.science.uu.nl/~telea001/uploads/PAPERS/EuroVis12/kdeeb.pdf)은 density 추정, gradient, advection, smoothing, resampling 파이프라인을 제시한다. 여기서는 CPU reference로 검증 가능한 아래 normalized kernel을 ggaction density-v1로 제안한다. GPU 사용은 정확한 kernel 결과를 검증한 뒤 별도 optimization이다.

grid 256×256, initial bandwidth h=.05, 20 iterations, h(c)=max(2/256,.05×.9^c), step=.005, ε=1e−9다. bounds에는 bandwidth만큼 halo를 추가한다. 샘플 weights는 주변 arc length의 절반 합으로 부여하여 point 수가 늘었다고 density가 커지지 않게 한다. radial kernel K(q)=max(1−q²,0)^2, q=distance/h, rho(x)=sum(weight_i×K(q_i)). constant normalization은 normalized gradient에서 상쇄되므로1로 고정한다.

central differences로 gradient를 구하고 border는 one-sided derivative, sample 위치는 bilinear interpolation이다. gradNorm≤ε이면 이동0, 아니면 delta=step×gradient/gradNorm. endpoints는 움직이지 않는다. smoothing은 internal points에 [1,2,1]/4 한 번, 다시 endpoints 고정. arc-length resampling spacing=min(h/4,1/256), edge samples≤4096. 매 iteration old density/route를 읽어 new route를 만들고 다음 iteration에 density를 재계산한다.

directed mode는 tangent angle을8개 circular channel에 linear weight로 분배하고 자기 방향 ±1 channel만 density에 기여시킨다. opposite tangent의 attraction을 섞지 않는다. 최종 그림이 단지 heatmap이면 실패다. point route마다 원 edge key를 보존한다. grid 외 clamp는 halo 경계까지이며 input node를 임의 이동하지 않는다.

oracle: 한 sample (0,0), weight1,h1이면 rho(0)=1, rho(.5,0)=.5625, rho(1,0)=0. symmetric ±.5 samples의 원점 gradient는0. horizontal straight edge endpoints가 모든 iteration에서 bitwise 동일하다. 작은8×8 grid fixture의 rho/gradient/advection 배열은 handwritten kernel reference로 검증한다.

## Edge path bundling

[Wallinger 등의 원 논문 Algorithm 1](https://arxiv.org/html/2108.05467v1#S3)은 길이에 따른 edge 우선순위, weighted shortest path, skip/lock을 사용한다. ggaction에서는 tie와 disconnected 처리까지 아래처럼 고정한다.

1. original geometric length L(e), routingCost=L(e)^d, d=2를 계산한다. semantic weight와 혼동하지 않는다. descending routingCost 후 edgeKey 순서다.
2. lock=false, skip=false로 초기화한다. locked edge는 자기 bundling을 건너뛴다.
3. candidate e를 skip=true로 만든 뒤 skip edge를 제외한 graph에서 source→target Dijkstra를 계산한다. directed edge 방향을 지키고 tie path는 edge-key sequence 사전순이다.
4. path 없음 또는 sum(original lengths)>maxStretch×L(e), maxStretch2이면 skip=false로 되돌리고 original straight route다. distance0 candidate는 explicit zero route로 처리한다.
5. 허용 path이면 skip=true를 유지하고 path의 모든 edge를 lock=true로 만든다. 이를 원 edge의 route provenance에 기록한다.
6. 실제 node anchor sequence로 polyline을 만들고 endpoint 고정 corner smoothing을 적용한다. smoothing 전후 측정한 route 길이도 maxStretch 내여야 한다. 초과하면 smoothing을 줄이고 끝내 polyline을 사용한다. 숨은 가상 shortcut graph를 만들지 않는다.

fixture A(0,0),B(1,1),C(2,0), edges AC,AB,BC, maxStretch2,d2이면 AC cost4가 먼저 처리된다. alternate path AB+BC length2√2≤4이므로 AC route=[A,B,C], AB/BC locked다. maxStretch1.2면 AC는 straight fallback. directed AB,CB만 있으면 A→C 경로가 없으므로 연결을 만들지 않는다.

## 통합 종료 조건

4방법×explicit/inferred graph×directed/undirected×zero/parallel/degenerate 입력을 실행한다. 화면 overlap hit는 정렬된 후보 edge 배열을 반환하고 선택한 edge만 일시 unbundle한다. unbundle은 presentation overlay이며 graph와 saved canonical route를 바꾸지 않는다. keyboard으로 후보를 순환할 수 있어야 한다.

node drag 후 route endpoints를 node frame anchor에 정확히 부착한다. interrupt된 animation도 current route에서 이어진다. geo route는 화면 pixel spline과 geographic great-circle의 의미를 구분하고 date line에서 잘라서 projection clip을 적용한다. worker result의 hash는 synchronous reference와 비교한다. cache key는 graph/layout revision, method/version/options, coordinateSpace/viewport, asset dependencies를 포함한다. evict/destroy 뒤 buffer와 worker listener를 해제한다.
