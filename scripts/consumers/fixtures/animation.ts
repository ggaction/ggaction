import {chart,render} from 'ggaction';
import {chart as basic} from 'ggaction/basic';
import {planTransition,sampleTransition,exportAnimationFrames,serializeAnimation,deserializeAnimation,createAnimationPlayer,type TransitionPlan} from 'ggaction/animation';
import {renderToSVG} from 'ggaction/svg';
import {renderToPNGBuffer} from 'ggaction/png';
import {renderToPDFBuffer} from 'ggaction/pdf';
const from=chart(),to=chart(),plan=planTransition({from,to,options:{durationMs:100}});
planTransition({from:basic(),to:basic(),options:{durationMs:0}});
const frame=sampleTransition(plan,50),frames=exportAnimationFrames(plan,{timesMs:[0,50,100]});
for(const decision of frame.decisions){
 if(decision.kind==='semantic-kernel'||decision.kind==='exact'||decision.kind==='crossfade'){
  const guide:string|undefined=decision.guideKey;void guide;
 }else if(decision.kind==='enter'||decision.kind==='exit'){
  const reason:'guide-ambiguity'|undefined=decision.reason;void reason;
 }
}
planTransition({from:frames[0],to:frame,options:{durationMs:10,easing:'linear'}});
declare const context:CanvasRenderingContext2D;
render(frame,context);renderToSVG(frame);renderToPNGBuffer(frame);renderToPDFBuffer(frame);
const restored=deserializeAnimation(serializeAnimation(plan,{repeat:Infinity,rate:-1,reducedMotion:true}));
const player=createAnimationPlayer({plan:restored.plan,...restored.playback,clock:{now:()=>0,requestFrame:()=>1,cancelFrame(){}},render:frame=>renderToSVG(frame)});
player.play().pause().seek(10).reverse().setRate(2).setRepeat(1);
player.interrupt({to,options:{durationMs:100}});player.cancel();player.dispose();
const settled:Promise<{readonly reason:string;readonly timeMs:number;readonly iteration:number}>=player.finished;
// @ts-expect-error authored plans are not prepared handles
const forged:TransitionPlan={kind:'transition-plan',version:2,durationMs:1,easing:'linear'};
// @ts-expect-error schedules choose one source of times
exportAnimationFrames(plan,{fps:30,timesMs:[0]});
// @ts-expect-error plain graphics are not authentic sampled endpoints
planTransition({from:{graphicSpec:frame.graphicSpec},to,options:{durationMs:1}});
// @ts-expect-error animation persistence cannot retain callbacks
serializeAnimation(plan,{render(){}});
// @ts-expect-error output frames are immutable
frames.push(frame);

const graphFrom=chart().createCanvas({width:300,height:200})
 .createData({id:'nodes',values:[{id:'a'},{id:'b'}]})
 .createData({id:'edges',values:[{id:'ab',from:'a',to:'b'}]})
 .createGraphData({id:'graph',nodes:'nodes',edges:'edges',nodeKey:'id',edgeKey:'id',source:'from',target:'to',directed:true})
 .layoutGraph({id:'layout',method:'fixed',options:{positions:[{key:'a',x:0,y:0},{key:'b',x:100,y:0}]}})
 .createGraphPlot({id:'plot',layout:'layout'}).bundleGraphEdges({id:'routes',method:'edge-path'}).editGraphPlot({routes:'routes'});
const graphTo=graphFrom.editLayout({options:{positions:[{key:'a',x:0,y:20},{key:'b',x:100,y:20}]}});
const graphPlan=planTransition({from:graphFrom,to:graphTo,options:{durationMs:100,easing:'linear'}});
const graphFrames=exportAnimationFrames(deserializeAnimation(serializeAnimation(graphPlan)).plan,{timesMs:[0,50,100]});
render(graphFrames[1],context);renderToSVG(graphFrames[1]);renderToPNGBuffer(graphFrames[1]);renderToPDFBuffer(graphFrames[1]);
planTransition({from:graphFrames[1],to:graphTo,options:{durationMs:100}});

const partitionFrom=chart().createCanvas({plot:{width:300,height:100}})
 .createData({id:'hierarchyRows',values:[{key:'root',parent:null,value:10},{key:'a',parent:'root',value:10}]})
 .createHierarchyData({id:'hierarchy',key:'key',parent:'parent',value:'value'})
 .layoutHierarchy({id:'partitionLayout',method:'partition'}).createPartitionPlot({id:'partition',labels:false});
const partitionTo=partitionFrom.createCoordinate({id:'polar',type:'polar'}).editPartitionPlot({coordinate:'polar',direction:'counterclockwise'});
const partitionPlan=planTransition({from:partitionFrom,to:partitionTo,options:{durationMs:100}});
const partitionFrames=exportAnimationFrames(deserializeAnimation(serializeAnimation(partitionPlan)).plan,{timesMs:[0,50,100]});
render(partitionFrames[1],context);renderToSVG(partitionFrames[1]);renderToPNGBuffer(partitionFrames[1]);renderToPDFBuffer(partitionFrames[1]);
planTransition({from:partitionFrames[1],to:partitionFrom,options:{durationMs:100}});

const geoFrom=chart().createCanvas({width:400,height:300,margin:0})
 .createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',featureKey:['properties','id'],values:{
  type:'FeatureCollection',features:[{type:'Feature',properties:{id:'place'},geometry:{type:'Point',coordinates:[0,0]}}]}})
 .createProjection({id:'map',type:'orthographic',scalePx:100,translatePx:[-200,150],clipExtentPx:[[0,0],[400,300]]})
 .createCoordinate({type:'geo'}).createGeoPointMark({id:'places'});
const geoTo=geoFrom.editProjection({translatePx:[600,150]});
const geoFrame=sampleTransition(planTransition({from:geoFrom,to:geoTo,options:{durationMs:100}}),50);
render(geoFrame,context);renderToSVG(geoFrame);renderToPNGBuffer(geoFrame);renderToPDFBuffer(geoFrame);
for(const decision of geoFrame.decisions)if(decision.kind==='geographic'){
 const kernel:'native-geo'=decision.kernel;
 const address:readonly string[]=[decision.ownerKey,decision.itemKey,decision.role];
 // @ts-expect-error current geographic parts have no invented endpoint index
 const index=decision.targetIndex;
 void kernel;void address;void index;
}

const currentTransitionVersion: 2 = plan.version;
void currentTransitionVersion;
