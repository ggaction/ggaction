export const frame = Object.freeze({width:480,height:360});
export const colors = Object.freeze({R:"#94a3b8",A:"#2563eb",A1:"#60a5fa",A2:"#93c5fd",B:"#f59e0b",Z:"#475569"});
export const rows = Object.freeze([
  {key:"R",parentKey:null,value:10}, {key:"A",parentKey:"R",value:6},
  {key:"A1",parentKey:"A",value:2}, {key:"A2",parentKey:"A",value:4},
  {key:"B",parentKey:"R",value:4}, {key:"Z",parentKey:"R",value:0}
].map(Object.freeze));
export const rectangle = Object.freeze({x:30,y:75,width:420,height:225,gapX:2,gapY:2});
export const sector = Object.freeze({innerRadius:20,outerRadius:120,angularGap:2,radialGap:2});
export const bendOptions = Object.freeze({width:300,height:100,innerRadius:20,outerRadius:100});
export const variants = Object.freeze([
  {variant:"icicle",title:"Icicle · full hierarchy",kind:"rectangle",note:"R=10; A=6; B=4; zero node Z retained"},
  {variant:"vertical",title:"Icicle · vertical",kind:"rectangle",mapping:{orientation:"vertical"},note:"The same normalized intervals, transposed"},
  {variant:"focus",title:"Icicle · focus A",kind:"rectangle",focus:"A",note:"Breadcrumb R; A1=1/3 and A2=2/3 of focus"},
  {variant:"root-hidden",title:"Icicle · hidden root",kind:"rectangle",rootVisible:false,note:"Root band removed; node identity unchanged"},
  {variant:"inclusive",title:"Icicle · inclusive values",kind:"rectangle",input:"inclusive",note:"A retains 3; child row tail is blank, not a fake node"},
  {variant:"forest",title:"Icicle · two roots",kind:"rectangle",input:"forest",note:"Synthetic root hidden; A and B share one level"},
  {variant:"zero",title:"Icicle · zero total",kind:"rectangle",input:"zero",note:"R and Z retained in metadata; no area fabricated"},
  {variant:"sunburst",title:"Sunburst · equal depth",kind:"sector",note:"Clockwise from 12 o'clock; 20–120 px radius"},
  {variant:"area-bands",title:"Sunburst · equal depth area",kind:"sector",mapping:{radiusPolicy:"equal-depth-area"},note:"Equal squared-radius bands; values still determine angle"},
  {variant:"counterclockwise",title:"Sunburst · counterclockwise",kind:"sector",mapping:{startAngle:Math.PI/2,direction:"counterclockwise"},note:"Counterclockwise from 3 o'clock"},
  {variant:"wide-gaps",title:"Sunburst · pixel gaps",kind:"sector",mapping:{angularGap:12,radialGap:6},note:"12 px angular gap at each band's local mid-radius"}
].map(value=>Object.freeze({...value,...frame,chart:"partition-layouts",source:"test/charts/partition-layouts/primitive.program.js",callChain:`createPartitionPrimitive(${JSON.stringify(value.variant)});`})));
export function variantById(id) {
  const variant=variants.find(value=>value.variant===id);
  if(!variant)throw new Error(`Unknown partition variant ${id}`);
  return variant;
}
export function inputRows(variant) {
  if(variant.input==="zero")return [{key:"R",parentKey:null,value:0},{key:"Z",parentKey:"R",value:0}];
  if(variant.input==="forest")return rows.filter(row=>row.key!=="R"&&row.key!=="Z").map(row=>({...row,parentKey:row.parentKey==="R"?null:row.parentKey}));
  return rows.map(row=>({...row,...(variant.input==="inclusive"&&row.key==="A2"?{value:1}:{})}));
}

export const canvas = Object.freeze({plot:{width:420,height:225},margin:{left:30,top:75,right:30,bottom:60},background:"#ffffff",plotBorder:false});
