# Hierarchy tree / treemap 공개 연결 검토안

## 진행 상태

- [x] 공통 입력·value/order·tree/partition/treemap private 계산과 독립 수치 검증
- [x] Tree3 + treemap2 primitive 승인 (`ec048461`, “5개 대상 모두 승인”)
- [x] 최신 main `72855612`와 hierarchy branch의 검증된 merge
- [x] 원안의 확정 이름과 새 facade·저장 경계를 구분한 최소 전체 API 제안
- [x] 새 plot facade·builtin resource validator 경계 revision `928fba48` 승인 (`approved`): “세 설계안 모두 승인, 구현 계속”
  ([승인 정본](../PUBLIC_APPROVALS_20261028.json))
- [ ] 공개 action·revision·consumer·declarations/current/docs와 installed evidence 구현
- [ ] STEP-020·AT-22·STEP-077 완료

이 문서는 제안이다. Current 지원이나 source 구현 완료가 아니다. 시각 승인 근거는
[정확한 primitive 승인 기록](../phase3/hierarchy/primitive-approval.json)이다.
원안의 승인된 기능·이름은 [hierarchy 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/hierarchy-partition.ko.md),
[core 계약](../../../../study/coverage-expansion-2026-10-27/roadmap/contracts/core.ko.md),
[통합 cookbook](../../../../study/coverage-expansion-2026-10-27/roadmap/INTEGRATION_COOKBOOK.ko.md)이 소유한다.
`createHierarchyData`, `editHierarchyData`, `layoutHierarchy`, `editLayout`, `removeResource`를 새 이름처럼 재승인하지 않는다.
원안에 없던 `createTreePlot` / `createTreemapPlot` facade와 그 editor, layer binding, private builtin registry가
이번 미해결 public/architecture 결정이다. 승인 전 그 경계에 의존하는 public flow는 구현하지 않는다.

## 사용자가 얻는 차트

Tree는 같은 계층을 수직·수평·방사형 node/link로 그린다. Treemap은 같은 weight/lineage를 slice-dice 또는
squarify 사각형으로 그린다. 계층 생성, 배치 계산, 표시를 분리한다. 표시를 이동하거나 색을 바꾸어도
부모 관계·weight·layout resource는 달라지지 않는다. Renderer는 기존 concrete graphicSpec만 읽는다.
Partition의 view/focus/bend와 public plot은 별도 담당 범위이며 이 facade로 겸하지 않는다.

## 원안의 확정 이름과 구체 옵션 제안

아래 옵션 container, 생략 추론과 edit patch의 정확한 형태도 이번 검토안에 포함한다. 원안의 기능·이름을
재승인하는 것이 아니라 미지정 연결 방식을 확정한다.

```ts
type ValueMode = 'leaf-sum' | 'inclusive' | 'own-plus-children';
type FlatSource = {key:string;parent:string;value:string;valueMode?:ValueMode;forest?:boolean};
type NestedSource = {key:string;children:string;value:string;valueMode?:ValueMode;forest?:boolean};
type GroupSource = {groupFields:readonly string[];value:string;valueMode?:'leaf-sum';
  missingCategory?:'error'|'include'};
type HierarchySource = FlatSource | NestedSource | GroupSource;
type CreateHierarchyOptions = {id:string;data?:string;maxNodes?:number} & HierarchySource;
createHierarchyData(options:CreateHierarchyOptions):ChartProgram;

type EditHierarchyOptions = {target?:string;data?:string;maxNodes?:number} &
  (Partial<FlatSource> | Partial<NestedSource> | Partial<GroupSource>);
editHierarchyData(options:EditHierarchyOptions):ChartProgram; // nonempty patch, existing source form

type TreeOptions = {nodeSize:readonly [number,number];siblingGap:number;depthGap:number;
  maxNodes?:number} & ({orientation:'vertical'|'horizontal'} |
  {orientation:'radial';radius:number;startAngle:number;sweep:number});
type TreemapOptions = {size:readonly [number,number];padding:number;
  method:'slice-dice'|'squarify';maxNodes?:number};
type PartitionOptions = {maxNodes?:number};
type HierarchyOrder = 'input' | {by:'value'|'key';direction:'ascending'|'descending'} |
  {by:'field';field:string;direction:'ascending'|'descending';
   nulls?:'first'|'last';temporalUnit?:'year'|'timestamp'};

layoutHierarchy({
  id: string, hierarchy?: string,
  method: 'partition' | 'tree' | 'treemap',
  order?: HierarchyOrder,
  options?: PartitionOptions | TreeOptions | TreemapOptions
}): ChartProgram;

editLayout({target?:string,order?:HierarchyOrder,
  options?:Partial<TreeOptions>|Partial<TreemapOptions>|Partial<PartitionOptions>}):ChartProgram;
// nonempty patch; only options of the stored method are accepted
removeResource({kind: StoredResourceKind, id:string, cascade?:boolean}): ChartProgram;
```

Field 조합으로 flat/nested/groups를 한 번 결정한다. 혼용은 거부한다. `value`는 필수이며 valueMode 기본은
leaf-sum이다. forest 기본 false는 flat/nested에만 적용한다. Groups는 기존 private adapter처럼 invisible
synthetic root를 사용하고 missingCategory 기본 error이며 leaf-sum만 받는다. MaxNodes 기본10,000이다.
Data/hierarchy/target 생략은 current context 또는 유일한 적격 리소스만 허용하며 여러 후보의 첫 항목을 고르지 않는다.
Create의 리소스 id는 명시한다. Edit는 source form과 layout method를 보존하고 빈 patch를 거부한다.
새 source form 또는 method는 새 resource로 만든다. 기존 graph/image kind의 editor를 이 액션이 대신하지 않는다.

Method별 `options`는 현재 검증된 pure 입력을 그대로 사용한다. Tree는 nodeSize/siblingGap/depthGap/
orientation을 명시하고 radial에서 radius/startAngle/sweep을 추가한다. Treemap은 size/padding과
`method:'slice-dice'|'squarify'`를 명시한다. 바깥 method는 resource family, 안쪽 method는 tile algorithm이다.
Partition은 viewport와 무관한 normalized intervals이므로 options 생략이 최단 호출이다.
Order 기본 input이다. Field order는 실제 node source에서 한 번 해결하고 stored sibling order를 모든 layout이 공유한다.
Field 정렬은 adapter가 해당 node의 원래 object에서 값을 얻으며 lineage index에서 nested descendant를 추측하지 않는다.
한 node에 여러 source row가 기여할 때 custom field 값이 다르면 임의 대표값을 고르지 않고 거부한다.

## 새 plot facade와 lifecycle

두 facade는 Full-only다. Basic에는 method가 없고 generic primitive/codec로 우회하는 동일 kind도 받지 않는다.
최단 호출은 Canvas 및 유일한 해당 method layout이 존재할 때 `createTreePlot({})`, `createTreemapPlot({})`다.
기본 id는 각각 `treePlot`, `treemapPlot` 한 역할에만 쓴다. 같은 역할이 이미 있으면 id를 명시한다.

```ts
type HierarchyNodeTarget =
  | {key: string | number | bigint | boolean | Date} // flat/nested authored key
  | {path: readonly (string | number | bigint | boolean | Date | null)[]}; // groups

type Paint = {fill?:string;stroke?:string;strokeWidth?:number;opacity?:number};
type NodePaint = Paint & {radius?:number};
type LabelPaint = {fill?:string;fontSize?:number;fontFamily?:string;fontWeight?:number|string};
type Labels = LabelPaint & {
  content?:'value'; offset?:readonly [number,number];
  overrides?:readonly (HierarchyNodeTarget & LabelPaint & {text?:string})[];
};

type TreePlotOptions = {
  id?:string, layout?:string, origin?:'auto'|readonly [number,number], clip?:boolean,
  nodes?:NodePaint & {overrides?:readonly (HierarchyNodeTarget & NodePaint)[]},
  links?:false|{stroke?:string;strokeWidth?:number;opacity?:number},
  labels?:false|Labels
};
createTreePlot(options:TreePlotOptions):ChartProgram;
editTreePlot(options:{target?:string} & Omit<TreePlotOptions,'id'>):ChartProgram; // nonempty patch

type TreemapPlotOptions = {
  id?:string, layout?:string, origin?:'auto'|readonly [number,number], clip?:boolean,
  cells?:Paint & {overrides?:readonly (HierarchyNodeTarget & Paint)[]},
  labels?:false|Labels
};
createTreemapPlot(options:TreemapPlotOptions):ChartProgram;
editTreemapPlot(options:{target?:string} & Omit<TreemapPlotOptions,'id'>):ChartProgram; // nonempty patch

removeMark({target?:string}):ChartProgram; // existing shared removal owner
```

Tree default node radius6/fill#2563eb/stroke#ffffff/strokeWidth1/opacity1,
link stroke#94a3b8/strokeWidth1.5/opacity1다. Treemap default cell fill#3b82f6/stroke#ffffff/strokeWidth1/opacity1다.
Paint 검증은 기존 finite/color/opacity owner를 재사용한다. Radius와 strokeWidth는 nonnegative finite다.
Layout 결과가 이미 의미 위치를 가지므로 임의 x/y scale을 추가하거나 guide를 자동 생성하지 않는다.

Origin 기본 auto는 layout의 실제 bounds를 plot 안에 가운데 정렬한다. 명시 tuple은 plot-local CSS pixel의
layout 원점이다. Canvas resize는 auto만 새 frame에 맞추며 저장된 layout 좌표를 재계산하지 않는다. Clip 기본 false다.
Tree radial도 kernel 좌표를 그대로 평행이동할 뿐 새로운 polar coordinate를 숨겨 만들지 않는다.

Labels 기본 false다. `{}`는 totalValue label을 켜며 default fill#0f172a/fontSize12/fontFamily sans-serif/fontWeight normal이다.
Tree label 기본 offset[0,14], center/middle anchor다. Treemap offset[0,0]이며 internal node는 padding header 가운데,
leaf는 cell 가운데다. Padding0인 internal node는 label을 숨기고 metadata를 보존한다. Label text를 바꾸려면 명시 node/path
`overrides`의 text를 쓴다. 새 key formatter·callback·expression 문법을 추가하지 않는다.

Style overrides는 원 key/path identity로 정규화하며 duplicate/unknown target는 create/edit에서 오류다.
Null path component는 groups의 missingCategory:include일 때만 된다. Synthetic root는 target이 될 수 없고 시각/selection에서 제외한다.
Data revise가 target을 없애면 해당 override는 dormant intent로 남고 orphan-style 진단을 기록한다. 다른 node로 옮기지 않는다.
그 명시 key/path가 다시 존재하면 다시 적용한다. Live selection은 아래 별도의 orphan 정책을 따른다.

Edit의 생략은 보존, origin:'auto'는 재추론, links/labels:false는 해당 그림만 제거한다. `{}`는 비활성 component를 default로 켠다.
Nested style object는 property patch이며 overrides array는 전체 교체다. Empty top-level edit는 오류다.
다른 method layout으로의 rebinding은 거부하고 같은 method의 layout만 허용한다. 기존 old program/trace는 불변이다.

## 검토할 실제 호출 순서

아래는 구현 예정인 public 호출 순서다. 지금 실행 가능한 코드는 승인된
[tree primitive](../../../../test/gates/tree-layouts/primitive.program.js)와
[treemap primitive](../../../../test/gates/treemap-layouts/primitive.program.js)이며 public 구현이 존재한다고 주장하지 않는다.

```js
const rows = [
  {id:'Root', parent:null, value:10}, {id:'A', parent:'Root', value:6},
  {id:'B', parent:'Root', value:4}, {id:'A1', parent:'A', value:2},
  {id:'A2', parent:'A', value:4}
];
const base = chart()
  .createCanvas({width:640,height:500,margin:{left:0,right:0,top:0,bottom:0},background:'#ffffff'})
  .createData({id:'rows',values:rows})
  .createHierarchyData({id:'h',data:'rows',key:'id',parent:'parent',value:'value'});

const tree = base
  .layoutHierarchy({id:'tree-layout',hierarchy:'h',method:'tree',options:{
    nodeSize:[48,32],siblingGap:112,depthGap:118,orientation:'vertical'}})
  .createTreePlot({id:'tree',layout:'tree-layout',origin:[320,100],
    nodes:{radius:18,strokeWidth:2},links:{strokeWidth:2},labels:{offset:[0,32],fontSize:14}});

const treemap = base
  .layoutHierarchy({id:'treemap-layout',hierarchy:'h',method:'treemap',options:{
    size:[544,320],padding:16,method:'squarify'}})
  .createTreemapPlot({id:'treemap',layout:'treemap-layout',origin:[48,100],
    cells:{strokeWidth:2},labels:{fontWeight:500}});
```

위 짧은 예시는 default value label과 단색을 보여준다. 승인 이미지의 node별 색·문구는 명시 overrides로
재현하고 기존 title domain owner가 heading을 맡는다. Gate pair에서는 다섯 variant 모두 정확한 property/order와
동일 실행 decoded pixels를 비교한다. Heading을 hierarchy facade의 새 option으로 추가하지 않는다.

## 저장 위치와 action 분해

Hierarchy와 layout은 기존 `semanticSpec.resources` envelope(algorithmVersion1,ownership,inputs,options,result,provenance)를 쓴다.
Hierarchy inputs는 정확한 data logicalId/revision 하나, layout inputs는 정확한 hierarchy revision 하나다. Result는 기존 frozen
model/layout 수치이며 materializationConfigs에 복제하지 않는다. 모든 sourceRows는 실제 row key/ref provenance로 연결한다.

Plot은 `semanticSpec.layers`의 새 mark type `tree` / `treemap`과 `hierarchyBinding:{layout:typedRef}`를 소유한다.
Tree의 node/link/label, treemap의 cell/label는 같은 domain mark의 semantic roles다. 별도 사용자-facing generated dataset이나
서로 독립된 editable node/link layer를 만들지 않는다. Global/override paint, origin/clip/label placement는 markConfigs의
`hierarchyPlot` intent에 저장한다. Label content/명시 text는 layer의 semantic label definition 한 곳에 저장한다.

Create facade는 preflight 뒤 wrapped semantic child와 `materializeTreePlot` 또는 `materializeTreemapPlot`를 호출한다.
Editor는 같은 저장 owner를 patch하고 동일 materializer를 명시 호출한다. Materializer는 기존 createGraphics/editGraphics로
circle/line/rect/text를 만들며 resource/layout 계산을 다시 실행하지 않는다. Meaningful child op는 trace에서 숨기지 않는다.
내부 child materializer는 public convenience method로 별도 광고하지 않는다.

Layout edit는 새 layout revision을 저장하고 live plot refs를 함께 rebinding한 다음 affected marks→layout→highlights를 순서대로 호출한다.
Hierarchy edit/source revise는 hierarchy→layout→plot closure를 preflight로 만들고 같은 단계는 한 번만 실행한다.
Shared layout을 쓰는 두 plot을 함께 갱신하며 unrelated sibling은 보존한다. Primitive editSemantic 자체는 layout을 숨겨 재계산하지 않는다.

RemoveMark는 plot 소유 graphics/config/selection만 지우고 공유 hierarchy/layout resource를 지우지 않는다.
RemoveResource 기본 restrict다. Cascade는 기존 ownership graph의 generated dependent만 제거하며 authored/shared resource를 조용히
삭제하지 않는다. 남는 live plot consumer가 있으면 명확하게 거부한다. 소비자 제거가 필요한 경우 먼저 removeMark를 호출한다.
Image도 같은 generic stored-resource remove owner를 소비하며 별도 removeImageResource API는 만들지 않는다.

## 선택과 consumer matrix

선택의 item grain은 실제 hierarchy node다. Tree link는 parent-child relation이며 별도 행처럼 선택하지 않는다.
Node 선택은 해당 circle/cell과 label을 강조하고 link는 기본 상태를 유지한다. Synthetic root는 export/selection item 수에 넣지 않는다.
기존 index/row selector는 node grain과 정확한 sourceRows projection을 써서 해석하고, source row가 여러 node에 기여하면 그 모든
실제 node가 일치한다. 명시 node-key 선택을 위한 새 selector syntax는 이번 facade에 추가하지 않는다. Revision 후 살아 있는
node key를 보존하고 삭제된 선택 항목은 기존 orphan 정책대로 처리한다. 다른 node에 index를 재사용하여 선택을 옮기지 않는다.

| Consumer | 이번 구현 의무 |
| --- | --- |
| Encodings/guides | 위치는 layout 소유; Cartesian/polar position/aggregate/stack은 명시 unsupported. Paint와 per-node override는 위 facade/editor 소유. 자동 scale/axis/legend 없음; 다른 chart와 composition 가능 |
| Identity/lineage | Node key와 parent-child relation, source row refs, stable graphic role key를 저장하고 duplicate/synthetic을 구분 |
| Revision | source revise, hierarchy edit, layout edit, Canvas resize, plot appearance edit의 정확한 범위·원자성 |
| Selection/hit | node grain, exact lineages, actual clip geometry, selected label와 baseline 복원 |
| Inspection/accessibility | resource/result/options, hierarchy value/depth/children, visible/zero/synthetic diagnostics, semantic item table |
| Persistence/scene | fresh load 검증은 stored result 확인만 수행; canonical layout 재계산 없음. Stable node keys와 topology 변화 이유 |
| Composition | concat scope/namespace, facet/repeat source replacement, ancestor snapshot closure; 불가능한 topology partition은 preflight에서 명시 오류 |
| Renderers | 같은 concrete graphicSpec으로 SVG/Canvas/PNG/PDF; 새 renderer branch 없음 |
| Public surface | Full-only actions/types/catalog/docs/LLM metadata, Basic negative tests, installed source-free fixtures |
| Visual | 승인된5종과 exact properties/order/decoded pixels, 최소 호출·create/edit/remove/revise/restore |

이 표는 아직 통과 결과가 아니다. Source-field facet가 계층 부모를 제거하는 경우 orphan을 자동 root로 바꾸지 않고
기존 hierarchy 규칙대로 오류를 내야 한다. Repeat field binding이 source hierarchy schema를 바꾸는 경우도 새 parser를 만들지 않는다.

## Builtin validator 경계 제안

Full-only hierarchy/layout/image validator를 shared resourceState에 직접 import하면 Basic entry가 무거운 geometry/host-neutral
validation을 끌어온다. 이를 피하려고 private `materialization/resourceKinds.js`에 **builtin registration-once** 경계를 제안한다.

```ts
registerBuiltinResourceKinds(ProgramClass, readonlyHandlers): void;
getBuiltinResourceKindHandler(ProgramClass, kind): Handler | undefined;
// Handler: frozen { validateStored(resource):void, validateBindings(program,resource):void }
```

Class별 WeakMap에는 null-prototype의 frozen handler record를 보관한다. 전체 handler record와 각 handler를
복사·freeze한 뒤 constructor당 정확히 한 번 등록한다. 재등록은 오류이며 상위 class의 handler를 상속하지 않는다.
변경 가능한 Map을 Object.freeze만 해서 readonly라고 주장하지 않는다. Public export/사용자 plugin API/검증 중
교체/unregister를 제공하지 않는다. Full assembly가 hierarchy/layout/image owner의 handler를 모아 한 번 등록한다.
각 owner는 순수 handler만 제공하며 등록을 개별적으로 실행하지 않는다. Basic은 확장 kind를 등록하지 않는다. 기존 persistent-selection/parameter/data-source3kind는
현재 공통 core owner에 그대로 남긴다. 선택한 constructor의 capability를 검사하므로 Full import 뒤에도 Basic 우회를 막는다.
`validateStoredResource`, `validateResourceGraph`, prepared-result validation과 persistence의 state validation에는 program 또는
복원할 ProgramClass를 명시 전달한다. Constructor를 모르는 plain envelope는 확장 kind를 추측해 수락하지 않는다.
Kind lookup과 handler invocation은 validation뿐이며 계산/수정/renderer 호출을 숨기지 않는다.

대안은 hierarchy/image의 lightweight stored validator를 shared layer로 나누는 것이다. Basic bundle 증가를 줄일 수 있지만
hierarchy의 topology/value 일관성은 이미 canonical model owner에 있고 그 검증을 축약/중복하면 두 정책이 된다.
Class capability check는 여전히 필요하다. 두 실제 Full-only family가 동시에 필요하므로 위 좁은 builtin registry를 제안한다.
새 macro boundary이므로 이 문서의 승인 대상에 포함하며 구현 전에 SECOND_ARCHITECTURE를 갱신한다.

## 검증 순서와 변경 파일

1. 기존 승인 core의 pure hierarchy 계산·revision 의존성 분석을 독립 expected로 검증한다. 미지정 public 옵션/저장 경계는 이 검토 승인을 기다린다.
2. 승인 후 builtin validator hook과 Full hierarchy/layout action 등록, source revise/ref/codec/inspection/타입 경계를 연결한다.
3. 승인된5개 primitive를 유지하면서 두 public facade/editor와 resource-backed mark grain을 연결한다.
4. 모든 소비자와 installed package를 검증하고 canonical current/index/docs 생성기를 실행한다.

주된 owner는 `actions/hierarchy/`, `actions/layouts/`, `grammar/hierarchy/`, `materialization/hierarchy/`이며
shared resourceReference/resourceState/semantic primitive/ref collector/data revision/planner/inspection/scene/selection은 해당 owner에서 확장한다.
Renderer에는 hierarchy 해석을 추가하지 않는다. Active Gate slice는 public pair 통과 후 `test/charts/hierarchy/`로 옮긴다.
각 conceptual checkpoint를 검증 후 commit/push하며 전체 인수 시험과77개 카드 완료를 조기 선언하지 않는다.
