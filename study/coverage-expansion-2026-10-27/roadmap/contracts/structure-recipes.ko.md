# 구조형 레이아웃과 차트 조합 계약

## Sankey와 cyclic flow

createFlowData는 graph node/edge identity를 재사용하고 nonnegative finite flow value를 요구한다. node throughput은 max(sum incoming,sum outgoing), imbalance는 명시 inspect metadata다. conservation을 강제하려면 balance:'strict'를 사용한다. negative flow는 source/target를 몰래 뒤집지 않고 error다. zero flow는 semantic edge로 남고 thickness0이다.

layoutFlow method dag/cyclic. DAG는 topological longest-path rank, explicit align/order, node padding, width를 적용한다. y scale factor k는 모든 column의 (availableHeight−gaps)/sum(node throughput) 중 최솟값이다. edge thickness=k×value, node height=k×throughput. column 내 stable order에서 barycentric relaxation 후 overlap resolve를 fixed iterations로 수행한다. relaxation이 node width나 rank를 바꾸지 않는다. source/target attachment intervals는 edge order를 누적하여 node 안에 둔다. parallel links도 별도 edge key다.

cyclic은 strongly connected components를 먼저 구하고 condensation DAG를 배치한다. SCC 내부 feedback edge는 상/하 외부 lane에 deterministic edge-key 순으로 배치한다. lane width는 flow thickness+gap, bounds에 포함한다. self-loop는 별도 loop lane. DAG mode에서 cycle은 error, cyclic mode에서 cycle을 잘라 edge를 삭제하면 실패다. tooltip에는 원 source/target/value를 사용한다. 문서와 시험은 DAG와 cyclic 각각 complete여야 한다.

## Contour와 density

grid input contour와 point-density contour를 구분한다. createContourData는 regular scalar grid의 origin, dx/dy, width/height, values, thresholds를 저장한다. point-density는 명시 estimator/bandwidth/grid를 통해 먼저 같은 grid resource로 낮춘다. marching squares는 threshold inclusive rule와 saddle case asymptotic decider를 고정한다. 2×2 cell corner의 bilinear center sign과 determinant가 ambiguous connection을 결정하고 exact tie는 fixed diagonal 규칙이다. edge crossing 좌표는 선형 interpolation, missing grid cell은 hole boundary 정책을 따른다.

segments를 coordinate-key tolerance로 stitch하여 closed rings를 만들고 containment/winding으로 outer/hole을 분류한다. disconnected islands를 한 path로 억지 연결하지 않는다. filled band는 threshold[i]≤z<threshold[i+1], 마지막 band는 upper inclusive다. iso-line과 filled-contour는 같은 threshold geometry를 공유한다. small grid의 circle-like hill, saddle, donut, all missing, constant grid를 수치와 topology로 검증한다.

## Calendar와 table

calendar의 날짜 계산은 data-statistics 계약을 따른다. createCalendarPlot은 day cell rect, month boundary path, week/day label 역할을 공유 item metadata로 묶는다. source→civil day aggregate→cell layout→rect/label action 조합이다. month label이 임의 pixel로 박혀 resize에 남지 않게 한다.

table은 row/column key 기반 cell layout이다. header/body/footer role, rowHeight, column width auto/fixed, align, wrapping, missing text, numeric formatter를 저장한다. renderer 전용 HTML table은 정적 export의 대체물이 아니다. 필요하면 accessible DOM table을 같은 semantic cells로 파생한다. cell hit는 [rowKey,columnKey], sorting/reorder 시 유지한다. heatmap은 cell color encoding 조합이며 별도 duplicate geometry kernel을 만들지 않는다.

## Pyramid의 stage 의미

현행 baseline에 createFunnelPlot은 없으므로 기존 runtime 함수를 rename하는 작업이 아니다. 이전 계획의 stage/funnel 의미를 createPyramidPlot에 구현한다. stage order 기본 input, value≥0, gap≥0, orientation down/up/right/left를 명시한다. 자동 값 정렬·반전·삼각형 강제는 없다.

reference profile은 width encoding, equal stage heights다. stage i의 topWidth=W×vi/max(v), bottomWidth=W×v(i+1)/max(v), 마지막 bottomWidth는 lastStage:'flat'(default)이면 topWidth, 'point'이면0이다. 각 stage center는 공통 centerline, gap은 stage 사이에만 적용한다. 총 높이 H에서 h=(H−gap×(n−1))/n, h<0이면 layout error다. 이 정확한 profile은 새 시각 Gate에서 확인할 제안이고 과거 구현의 검증된 default로 주장하지 않는다. area encoding도 필수 explicit mode다. equal-height stage의 topWidth=W×vi/max(v), bottomWidth=taperRatio×topWidth, taperRatio 기본 .8∈[0,1]로 고정하면 area=.5×h×W×(1+taperRatio)×vi/max(v)로 value에 비례한다. 이 mode는 다음 stage의 topWidth와 현재 bottomWidth의 연속을 강제하지 않는다. area/width를 바꾸면 value 의미가 바뀌므로 inspect/문서/visual fixture를 각각 둔다. area mode에서는 lastStage 옵션을 거부하고 taperRatio만 사용한다. width mode는 taperRatio를 거부한다. 값이 전부0이면 stage metadata를 유지하고 모든 폭0이며 division을 하지 않는다.

fixture values[100,60,20],W100,H90,gap0,flat: stage widths[(100,60),(60,20),(20,20)], heights30. area mode taper.8이면 widths[(100,80),(60,48),(20,16)], areas[2700,1620,540]으로100:60:20 비례다. 100보다60이 먼저 오는 입력이면 그 순서를 그대로 유지한다. percent denominator는 first/total/previous 중 explicit, zero denominator는 missing label이다.

## OHLC waterfall trail

OHLC는 x/low/high/open/close의 의미를 저장한다. low≤min(open,close)≤max(open,close)≤high, invalid row 정책은 error/omit-row. stem은 low-high, body는 open-close, 상승/하락 색은 close≥open 분기, doji는 visibility 정책을 갖는 zero-height body다. 기존 rule/rect mark와 semantic compound owner로 구성한다. row hit 한 번, stem/body 중복 selection 이벤트 금지다.

waterfall는 stage role delta/total/subtotal을 명시한다. 누적 s, delta v의 endpoint는 [s,s+v], 다음s=s+v. total은 [0,explicit total 또는 current s], subtotal은 [0,current s]이며 누적 초기화 여부를 명시 reset flag로만 바꾼다. negative contribution과 connector, missing sequence를 검증한다. total이라는 label 문자열로 역할을 추정하지 않는다.

trail는 ordered centerline sample별 width를 가진 ribbon이다. tangent unit normal의 양쪽에 width/2를 offset하고 join miter/bevel/round, cap butt/square/round를 적용한다. miterLimit 기본4, zero-length adjacent segment는 merge하되 원 row lineage 보존. width0은 degenerate ribbon으로 허용하고 negative는 error다. self-intersection fillRule을 geometry contract로 처리한다. curve order·missing breaks·polar seam을 line/area와 공유한다.

## 기존 표현의 보강

rose는 angle와 area 의미, radial-bar는 radius 의미를 혼동하지 않는다. radar는 각 dimension domain과 angular order, closed path, missing variable policy를 유지한다. streamgraph는 기존 stack baseline zero/center/wiggle을 explicit로 선택하고 wiggle numeric oracle를 추가한다. violin은 bandwidth/grid/normalize 정책을 보존하며 zero density와 unequal groups를 검증한다. sparkline는 기존 line+guides off+compact layout recipe다.

## 조합 recipe의 정확한 역할

Marginal: 중심 scatter와 x histogram/y histogram을 concat/facet layout으로 배치하고 해당 dimension scale domain을 공유한다. 분리된 panel frame 각각의 Y는 허용된다. selection은 source row key로 linked되며 histogram bin 선택은 lineage query다.

Bullet: 같은 frame에서 range background rect→measure bar→target rule 순으로 그린다. range는 reference 의미, measure/target은 같은 numerical scale이다. 텍스트 label은 text action, 색/extent는 explicit다. createBulletPlot는 추가하지 않는다.

Combo: 한 frame에 bar+line 등 compatible layer를 compose하고 Y scale object를 공유한다. 다른 단위의 독립 Y가 필요하면 분리된 panels로 구성한다. hidden second scale이나 0..1 사전정규화로 다른 척도를 몰래 만들지 않는다. 명시 normalization은 하나의 새 측정 의미로 표시할 때만 허용한다.

각 recipe는 실제 public action chain, input fixture, semantic role assertion, saved editable program, four-format render, selection/resize/revise replay를 동봉한다. recipe AST 검사로 raw graphic API와 새 전용 constructor가 없는지 확인한다.

## Table 내부 bar와 sparkline

Bar Table은 cell의 value→bounded bar width와 text를 같은 cell layout에 배치한다. inline sparkline은 row cell을 독립 panel frame으로 두고 공통 x extent, 독립 y 또는 shared y 정책을 명시한다. 독립 cell frame이므로 single-Y 위반이 아니며 한 cell에 두 Y scale을 두지는 않는다. rowLimit은 visible presentation 제한과 원 데이터 존재를 구분하고 clipped/truncated value 표시를 제공한다. cell/row/column header semantic hit와 accessible values는 동일 source를 쓴다.
