import { chart } from "../../src/index.js";
import { planTransition, sampleTransition, serializeAnimation, deserializeAnimation } from "../../src/animation.js";

export const cartesianFrameVariants = ["rect", "rule", "line", "area", "bar", "histogram"];
export function animationCartesianFrame(variant) {
  const values = variant === "histogram"
    ? [{id:"a",x:1},{id:"b",x:1.5},{id:"c",x:3}]
    : [{id:"a",x:1,y:20,c:"A"},{id:"b",x:3,y:20,c:"B"}];
  let from = chart().createCanvas({width:300,height:200,margin:20})
    .createData({id:"rows",values,keyField:"id"});
  const xs = {domain:[1,3],nice:false,zero:false}, ys = {domain:[0,100],nice:false,zero:false};
  if (variant === "rect") from = from.createRectMark({id:"m",fill:"red"})
    .encodeXRange({lower:"x",upper:{datum:1000},fieldType:"quantitative",scale:{type:"log",domain:[1,1000],nice:false}})
    .encodeYRange({lower:{datum:20},upper:{datum:80},fieldType:"quantitative",scale:ys});
  else if (variant === "rule") from = from.createRuleMark({id:"m",stroke:"red",strokeWidth:8})
    .encodeY({field:"y",fieldType:"quantitative",scale:ys});
  else if (variant === "line") from = from.createLineMark({id:"m",stroke:"red",strokeWidth:8,curve:"step"})
    .encodeX({field:"x",scale:xs}).encodeY({field:"y",scale:ys});
  else if (variant === "area") from = from.createAreaMark({id:"m",fill:"red",opacity:1})
    .encodeX({field:"x",scale:xs}).encodeYRange({lower:{datum:0},upper:"y",scale:ys});
  else if (variant === "bar") from = from.createBarMark({id:"m",fill:"red"})
    .encodeX({field:"c",fieldType:"nominal"}).encodeY({field:"y",aggregate:"sum",scale:ys});
  else from = from.createHistogram({id:"m",field:"x",binBoundaries:[0,2,4],bar:{fill:"red"},guides:false});
  const to = variant === "histogram" ? from.editCanvas({height:300})
    : from.reviseData({source:"rows",id:"next",values:values.map(row=>({...row,y:80,x:variant==="rect"?100:row.x}))});
  const plan = planTransition({from,to,options:{durationMs:100,easing:"linear"}});
  const frame = sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50);
  const points = variant === "rect" ? [[200,100],[106,100]]
    : variant === "histogram" ? [[80,100],[210,80]]
    : [variant === "bar" ? [85,140] : variant === "area" ? [100,140] : [100,100],[100,60]];
  return {from,to,plan,frame,checks:points.map((point,i)=>({point,rgba:i===0?[255,0,0,255]:[255,255,255,255]}))};
}
