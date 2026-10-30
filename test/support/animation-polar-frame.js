import { chart } from "../../src/index.js";
import { planTransition,sampleTransition,serializeAnimation,deserializeAnimation } from "../../src/animation.js";

export const polarFrameVariants=["point","line","arc"];
export function animationPolarFrame(variant) {
  const values=variant==="point"?[{id:"a",theta:350,radius:50}]:variant==="line"?[{id:"a",theta:0,radius:50},{id:"b",theta:180,radius:50}]:[{id:"a",radius:1},{id:"b",radius:3}];
  let from=chart().createCanvas({width:200,height:200,margin:20}).createData({id:"rows",keyField:"id",values});
  if(variant==="arc")from=from.createArcMark({id:"m",innerRadius:.25,fill:"red"}).encodeTheta({field:"radius"});
  else {
    from=variant==="point"?from.createPointMark({id:"m",fill:"red"}).encodeSize({value:Math.PI*64}):from.createLineMark({id:"m",stroke:"red",strokeWidth:8});
    from=from.encodeTheta({field:"theta",scale:{domain:[0,360],nice:false}}).encodeR({field:"radius",scale:{domain:[0,100],nice:false}});
  }
  const to=from.reviseData({source:"rows",id:"next",values:values.map(row=>({...row,...(variant==="point"?{theta:10,radius:100}:variant==="line"?{radius:100}:{radius:4-row.radius})}))});
  const plan=planTransition({from,to,options:{durationMs:100,easing:"linear"}}),frame=sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50);
  const points=variant==="point"?[[100,40],[100,70]]:variant==="line"?[[100,80],[50,50]]:[[140,100],[100,100]];
  return {from,to,plan,frame,checks:points.map((point,i)=>({point,rgba:i===0?[255,0,0,255]:[255,255,255,255]}))};
}
