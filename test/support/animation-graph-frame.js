import {chart} from "../../src/index.js";
import {planTransition} from "../../src/animation/planner.js";
import {sampleTransition} from "../../src/animation/sample.js";

export function animationGraphFrame(rebased=false,routed=false) {
 let from=chart().createCanvas({width:300,height:200,margin:0})
  .createData({id:"nodes",keyField:"id",values:[{id:"a"},{id:"b"}]})
  .createData({id:"edges",keyField:"id",values:[{id:"ab",from:"a",to:"b"}]})
  .createGraphData({id:"graph",nodes:"nodes",edges:"edges",nodeKey:"id",edgeKey:"id",source:"from",target:"to",directed:true})
  .layoutGraph({id:"layout",method:"fixed",options:{positions:[{key:"a",x:40,y:60},{key:"b",x:200,y:60}]}})
  .createGraphPlot({id:"plot",origin:[0,0],nodes:{radius:10,fill:"red",stroke:"none",strokeWidth:0},edges:{stroke:"black",strokeWidth:4}});
 if(routed)from=from.bundleGraphEdges({id:"routes",method:"edge-path"}).editGraphPlot({routes:"routes"});
 const to=from.editLayout({options:{positions:[{key:"a",x:60,y:100},{key:"b",x:220,y:100}]}}),options={durationMs:100,easing:"linear"};
 let plan=planTransition({from,to,options});
 if(rebased){from=sampleTransition(plan,50);plan=planTransition({from,to,options});}
 return {from,to,plan,frame:sampleTransition(plan,50),checks:[
  {point:rebased?[55,90]:[50,80],rgba:[255,0,0,255]},
  {point:rebased?[135,90]:[130,80],rgba:[0,0,0,255]},
  {point:[40,60],rgba:[255,255,255,255]}
 ]};
}
