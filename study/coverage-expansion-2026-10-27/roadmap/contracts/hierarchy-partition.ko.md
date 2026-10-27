# 계층 구조와 Icicle Sunburst 공통 계약

## 공개 액션 초안

~~~js
chart()
  .createData({id:'rows', values})
  .createHierarchyData({id:'h', data:'rows', key:'id', parent:'parent', value:'value', valueMode:'leaf-sum'})
  .layoutHierarchy({id:'partition', hierarchy:'h', method:'partition', order:'input'})
  .createPartitionPlot({id:'p', layout:'partition', coordinate:'coord', rootVisible:true, padding:0});
~~~

coord는 기존 coordinate 또는 새 계약에 따라 생성된 실제 coordinate ID다. Cartesian은 Icicle, polar는 Sunburst다. hierarchy 생성, layout, plot은 각각 ChartProgram을 반환한다. layout result object를 ChartProgram 대신 반환하지 않는다. read-only inspect로 결과를 얻는다. layoutHierarchy의 method union은 partition/tree/treemap이고 options는 method별로 검증한다.

## HierarchyResource

flat {id,parent,value}, nested children, groupFields로부터의 typed category path 세 입력을 지원한다. 하나를 명시하고 혼용하지 않는다. groupFields는 prefix tuple마다 internal node를 만들고 leaf aggregate와 source lineage를 저장한다. null category는 missingCategory:error(default)/include를 명시하며 include는 typed null category key로 표현한다. 이 내부 category key를 일반 user row key의 null 허용으로 확대하지 않는다. node key는 typed scalar, 부모는 같은 namespace다. root parent=null. duplicate/cycle/self-parent/orphan/negative/nonfinite weight는 default error다. forest는 forest:true일 때 invisible synthetic root를 만들어 허용한다. synthetic root ID는 user key와 다른 내부 namespace, 실제 node로 selection/export하지 않는다. orphan을 자동 root로 바꾸지 않는다.

normalized node는 key,parentKey,childrenKeys,depth,ownValue,totalValue,sourceRows를 갖는다. 입력 순서는 stable default, 명시 order는 value/key/custom field의 stable sort다. recursive call stack 대신 iterative DFS/postorder를 사용하여 depth10,000에서 stack overflow를 방지한다. maxNodes budget은 계산 전에 검증한다.

valueMode leaf-sum은 leaf weight만 합산하고 internal 값이 주어져도 집계에 더하지 않는다. 무시한 internal 값은 inspect metadata로 노출한다. inclusive는 internal value가 전체 subtree total이며 child 합≤parent이어야 한다. residual=parent−sum(children)>0이면 parent의 자체 몫을 마지막 reserved interval로 보존하고 가짜 child로 노출하지 않는다. own-plus-children은 ownValue+children total이다. 값 누락 leaf는 error, internal own-plus-children의 missing ownValue는 0이다. 전체 total0이면 모든 interval 폭0, divided-by-zero 없이 empty-value 진단과 node metadata만 남긴다. zero leaf가 사라진 data로 기록되지 않게 한다.

## Partition kernel

root interval은 [0,1], node depth는 정수다. 부모 [u0,u1], total W, 순서대로 child weight wi일 때 child start=u0+(u1−u0)×prefix/W, end=u0+(u1−u0)×(prefix+wi)/W. residual은 부모의 unused tail이다. floating 누적으로 마지막 child가 넘어가지 않도록 prefix를 compensated sum으로 계산하고 residual0이면 마지막 end를 정확히 parent end에 맞춘다. clamp로 잘못된 negative weight를 감추지 않는다.

normalized 결과는 key,u0,u1,depth,totalValue,ownValue,residual,sourceRows다. padding/orientation/viewport/radius는 이 결과를 바꾸지 않는다. [D3 partition](https://d3js.org/d3-hierarchy/partition)은 계층 노드에 구간 경계를 부여하는 공식 참고다. 이 로드맵의 identity, residual, focus, 저장 방식은 ggaction 제안 계약이다.

수치 기준: root10, A6(A1=2,A2=4),B4이면 root[0,1],A[0,.6],B[.6,1],A1[0,.2],A2[.2,.6]. width1000이면 A폭600. 총 depth levels3이면 높이300의 each-depth band100이다. A의 angle span은 1.2π. 같은 input에서 Cartesian/polar가 다른 sibling sort를 쓰면 실패다.

## Cartesian과 polar mapping

Cartesian horizontal: x=x0+u×W, y=y0+depth/levels×H. vertical은 두 축 역할을 교환한다. reverse는 해당 coordinate mapping에만 적용한다. rootVisible:false는 root band를 제외하여 effective depth=depth−1, levels=maxDepth로 계산한다. root-only이면 empty children view와 root metadata를 반환한다.

polar: θ=startAngle+u×sweep, sweep은 0보다 크고 2π 이하, direction은 clockwise/counterclockwise를 명시한다. radiusPolicy equal-depth이면 r(v)=r0+(r1−r0)v, equal-depth-area이면 r(v)=sqrt(r0²+(r1²−r0²)v). v는 depth boundary/levels다. r0≥0,r1>r0. equal-depth-area는 동일 depth band의 면적 계수를 맞추는 정책이며 모든 다른 깊이 node의 value 면적을 전역 비교할 수 있다는 뜻이 아니다.

padding은 CSS px의 x/y 또는 angular/radial gap으로 materialization한다. angular gap은 local mid-radius에서 px/r로 계산하고 wedge span을 넘으면 그 wedge를 비가시 처리한다. normalized interval을 shrink하지 않는다. tiny wedge label은 minWidth/minArcLength 검사를 통해 생략하며 accessible name은 유지한다. hit는 실제 visible wedge와 clip만 사용한다.

## Focus와 selection

focus node F의 [f0,f1]를 [0,1]로 재정규화하고 relative depth=depth−F.depth로 바꾼다. descendant만 visible, ancestor는 breadcrumb metadata다. key와 resource 자체 partition은 유지하고 view intent만 바꾼다. F가 data revise로 삭제되면 surviving nearest ancestor로 이동; 그마저 없으면 root. 이 복구를 event에 포함한다. selected node가 숨겨졌다고 logical selection을 조용히 다른 노드로 바꾸지 않는다. pruned selection policy는 keep-hidden(default)/drop 명시다.

keyboard은 parent/first child/previous sibling/next sibling/Home(root), Enter focus, Escape parent focus로 제안한다. breadcrumb도 같은 transaction을 사용한다. child count와 value, depth, path를 접근성 설명으로 제공한다.

## Icicle에서 Sunburst로 연속 변형

단순 path-string lerp 대신 normalized (u,v)를 사용하는 bend kernel을 둔다. strip width W, height H, 목표 angle sweep S∈(0,2π], bend b∈[0,1]에 대해 θ=S×b×(u−.5), y_b=(1−b)Hv+b×r(v)로 둔다. b>0에서는 R=(1−b)W/(S×b), X=(R+y_b)sinθ, Y=(R+y_b)cosθ−R다. b=0은 정확히 X=W(u−.5),Y=Hv다. b→0에서 이 값으로 수렴하고 b=1은 X=r(v)sin(S(u−.5)),Y=r(v)cos(S(u−.5))이므로 임의 inner radius를 가진 Sunburst에 맞는다. R을 W/(S×b)로만 두면 b1에도 불필요한 inner radius가 남으므로 그 식을 사용하지 않는다.

small b에서는 X=(1−b)W(u−.5)×sinc(θ)+y_b sinθ, Y=y_b cosθ−2R sin²(θ/2)를 사용한다. sinc0=1이다. target startAngle/direction에 필요한 rotation을 b에 따라 연속 적용하고 translation은 source strip anchor→target polar center로 선형 보간한다. 화면 y-down과 clockwise는 coordinate adapter가 한 번만 처리한다. padding 없는 normalized boundary를 먼저 변형하고 각 frame의 CSS gap/clip을 적용한다. reference fixture W=2π,H=1,r(v)=v,S=2π,u=.5,v=.5에서는 모든 b의 X0,Y.5다. b1,u=.75,v1은 (1,0), b0은 (π/2,1)이다.
endpoint b=0/1은 respective materializer 결과를 그대로 반환하여 drift0을 보장한다. shape boundaries를 같은 parameter grid로 sample해 cubic/path로 낮추고 current-frame hit도 같은 kernel을 사용한다. unequal radial policies 또는 tree topology가 바뀌면 이 kernel을 적용하지 않고 semantic crossfade로 전환한다. 이 전환은 plan의 match reason에 드러난다. reduced-motion은 최종 상태로 이동한다.

## Tree와 treemap

tree는 ordered hierarchy를 수평/수직/방사형 node-link로 배치한다. subtree-contour separation 기반 tidy layout, nodeSize와 siblingGap, depthGap을 explicit로 저장한다. contour conflict shift를 child group 전체에 적용하고 parent는 첫/마지막 child 중심 중간에 둔다. forest root 처리는 partition과 공유한다.

treemap은 slice-dice와 squarify 두 method를 제공한다. squarify는 descending stable value, row worstAspect=min/max area와 short side로 평가하고 개선되는 동안 같은 row에 추가한다. ties는 기존 row를 유지한다. padding은 각 recursion에서 부여하고 area0 노드는 zero area metadata다. sum child area=available parent area, no overlap, containment, stable keys를 검증한다. 화면 pixel rounding은 마지막 materialization에만 수행한다.
