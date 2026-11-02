import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chart} from 'ggaction';
import {createInteractionSession} from 'ggaction/interaction';
import {planTransition,sampleTransition} from 'ggaction/animation';
function cycles(){
const from=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',values:{type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates:Array.from({length:20},(_,i)=>[-30+60*i/19,(i%2?1:-1)*5])}}]}}).createProjection({id:'map',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5}).createCoordinate({type:'geo'}).createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2,capacity:{maxProjectedPoints:200000,maxPathCommands:200000}});
const hitPreparation={maxWork:128000000,pathGeometry:{maxParts:400000,maxWork:2000000,maxIndexWork:16000000}},refs=[];
const plan=planTransition({from,to:from.editProjection({scalePx:200}),options:{durationMs:100,easing:'linear',formatVersion:5}});
let session=createInteractionSession({program:from,bindings:[],historyLimit:0,hitPreparation});
for(let i=0;i<100;i++){
 const frame=sampleTransition(plan,25+i%50);session.dispatch({type:'frame',frame,version:session.getState().frameVersion+1,generation:session.getState().generation});session.dispatch({type:'inspect',point:{x:200,y:200},slop:0});assert.equal(session.getState().hit.target.ownerId,'coast');refs.push(new WeakRef(session.getState().scene));
}
session.destroy();session=null;return refs;
}
const refs=cycles();
for(let i=0;i<8;i++){await new Promise(resolve=>setTimeout(resolve,0));globalThis.gc();}
const alive=refs.filter(ref=>ref.deref()!==undefined).length;assert.equal(alive,0);
const result={cycles:100,rawVertices:20,oldSceneWeakRefs:100,alive,kind:'small installed lifecycle retention; supplemental Geo smoke, not canonical memory100cycle or P95',memory:process.memoryUsage()};await writeFile(process.argv[2],JSON.stringify(result,null,2));console.log(JSON.stringify(result));
