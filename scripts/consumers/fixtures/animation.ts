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
const forged:TransitionPlan={kind:'transition-plan',version:3,durationMs:1,easing:'linear'};
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
 const kernel:'native-geo'|'native-geo-text'=decision.kernel;
 const address:readonly string[]=[decision.ownerKey,decision.itemKey,decision.role];
 // @ts-expect-error current geographic parts have no invented endpoint index
 const index=decision.targetIndex;
 void kernel;void address;void index;
}

const currentTransitionVersion: 3 = plan.version;
void currentTransitionVersion;

const timeline=planTransition({from,to,options:{durationMs:100,easing:'linear',composite:'priority',tracks:[
 {target:{ownerKey:'exact-native-owner'},property:'geometry',kernel:'native-progress',priority:0,keyframes:[{timeMs:0,value:0},{timeMs:100,value:1,easingToNext:'linear'}]},
 {target:{itemKey:'exact-native-item',role:'body'},property:'fill',kernel:'color',priority:1,keyframes:[{timeMs:0,value:'black'},{timeMs:100,value:'white'}]},
 {target:{guideKey:'exact-native-guide'},property:'strokeWidth',kernel:'positive-scale',priority:2,keyframes:[{timeMs:0,value:1},{timeMs:100,value:2}]}
],markers:[{id:'half',timeMs:50}]}});
const markerPlayer=createAnimationPlayer({plan:timeline,clock:{now:()=>0,requestFrame:()=>1,cancelFrame(){}},render(){},onMarker(event){
 const id:string=event.id,time:number=event.timeMs,iteration:number=event.iteration;renderToSVG(event.frame);void id;void time;void iteration;
 // @ts-expect-error marker events are immutable
 event.iteration++;
}});
markerPlayer.seek(50,{emit:true});
// @ts-expect-error seek emission is boolean
markerPlayer.seek(50,{emit:1});
// @ts-expect-error geometry keyframes require numeric native progress
planTransition({from,to,options:{durationMs:100,tracks:[{target:{ownerKey:'owner'},property:'geometry',kernel:'native-progress',keyframes:[{timeMs:0,value:'zero'}]}]}});
// @ts-expect-error color keyframes require CSS strings
planTransition({from,to,options:{durationMs:100,tracks:[{target:{itemKey:'item'},property:'fill',kernel:'color',keyframes:[{timeMs:0,value:0}]}]}});
// @ts-expect-error guide and item selectors are mutually exclusive
planTransition({from,to,options:{durationMs:100,tracks:[{target:{itemKey:'item',guideKey:'guide'},property:'opacity',kernel:'number',keyframes:[{timeMs:0,value:1}]}]}});

const nativeRows=chart().createCanvas().createData({id:'raw',keyField:'id',values:[{id:'a',category:'A',value:2,lower:1,upper:3}]});
const nativeRule=nativeRows.createRuleMark({id:'rule'}).encodeX({conditions:[{when:{version:2,registry:'standard@1',root:{type:'literal',value:false}},value:{field:'value',fieldType:'quantitative'}}],otherwise:{field:'lower',fieldType:'quantitative'}});
const nativeCaps=nativeRows.createErrorBar({id:'interval',x:{field:'category',fieldType:'nominal'},y:{center:'value',lower:'lower',upper:'upper'},caps:true,capSize:20});
const nativeDensity=nativeRows.createDensityPlot({id:'density',field:'value',bandwidth:1,extent:[0,4],steps:8,guides:false});
const nativeOverlay=nativeRows.createBarMark({id:'bar'}).encodeX({field:'category',fieldType:'nominal'}).encodeY({field:'value',aggregate:'sum'}).createOverlay({id:'overlay',source:'bar',type:'point'});
for(const endpoint of [nativeRule,nativeCaps,nativeDensity,nativeOverlay]){
 const nativePlan=planTransition({from:endpoint,to:endpoint.editCanvas({width:600}),options:{durationMs:100}});
 const nativeFrame=sampleTransition(deserializeAnimation(serializeAnimation(nativePlan)).plan,50);
 render(nativeFrame,context);renderToSVG(nativeFrame);renderToPNGBuffer(nativeFrame);renderToPDFBuffer(nativeFrame);
}
