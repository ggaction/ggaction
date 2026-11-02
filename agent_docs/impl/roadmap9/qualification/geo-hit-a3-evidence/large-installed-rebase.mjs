import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
registerHooks({load(url,context,next){const r=next(url,context);if(url.endsWith('/src/grammar/hitShapes.js'))return{...r,source:String(r.source)+'\nexport const inspectShape=x=>states.get(x);'};if(url.endsWith('/src/grammar/hitPartIndex.js'))return{...r,source:String(r.source)+'\nexport const inspectPartIndex=x=>states.get(x);'};return r;}});
const packageRoot=JSON.parse(readFileSync('.artifacts/geo-hit-a3/consumer.json','utf8')).directory+'/node_modules/ggaction';
const {chart}=await import(`${packageRoot}/src/index.js`);
const {planTransition,sampleTransition,serializeAnimation,deserializeAnimation}=await import(`${packageRoot}/src/animation.js`);
const {prepareProgramHitFrame,prepareAnimationHitFrame}=await import(`${packageRoot}/src/interaction/hitProgram.js`);
const {hitFrameSource}=await import(`${packageRoot}/src/interaction/hitFrameSource.js`);
const {hitIndex,prepareHitIndex}=await import(`${packageRoot}/src/grammar/hitIndex.js`);
const {inspectShape,hitShape,nearestHitShape,hitShapeAnchor,hitShapeWork,hitShapePreparationWork}=await import(`${packageRoot}/src/grammar/hitShapes.js`);
const {inspectPartIndex}=await import(`${packageRoot}/src/grammar/hitPartIndex.js`);
const {pathFillContains,pathStrokeDistance}=await import(`${packageRoot}/src/grammar/pathGeometry.js`);
const sha=x=>createHash('sha256').update(x).digest('hex');
const hashParts=parts=>{const h=createHash('sha256').update('[');parts.forEach((p,i)=>{if(i)h.update(',');h.update(JSON.stringify(p));});return h.update(']').digest('hex');};
const output='.artifacts/geo-hit-a3/large-installed-rebase.json';
const record={pid:process.pid,node:process.version,start:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceDiffSHA256:sha(execFileSync('git',['diff','--','src'])),sources:Object.fromEntries(['hitShapes','hitStroke','hitPartIndex','hitPolicy','hitIndex'].map(x=>[x,sha(readFileSync(packageRoot+`/src/grammar/${x}.js`))])),cases:[],archiveSHA256:"bbb592a75661d3b9cdc09440ab4da304600933ca347e37fe03746b717b8f9680",kind:'same installed artifact; isolated fresh-process rebase/offline functionality after sequential original run hit/current pass and rebase-plan WeakSet rehash; not long-lived pass'};
const save=()=>writeFileSync(output,JSON.stringify(record,null,2));save();console.log(JSON.stringify({pid:process.pid,start:record.start}));
const policy={maxWork:128000000,pathGeometry:{maxParts:400000,maxWork:2000000,maxIndexWork:16000000}};
for(const count of[100000]){
 let row={count,start:new Date().toISOString()};record.cases.push(row);save();
 try{
  const coordinates=Array.from({length:count},(_,i)=>[-30+60*i/(count-1),(i%2?1:-1)*5]),values={type:'FeatureCollection',features:[{type:'Feature',id:'line',properties:{},geometry:{type:'LineString',coordinates}}]};row.inputSHA256=sha(JSON.stringify(values));
  const from=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createGeometryData({id:'world',format:'geojson',coordinateKind:'geographic',featureKey:'id',values})
   .createProjection({id:'projection',type:'equirectangular',scalePx:100,translatePx:[200,200],precisionPx:.5}).createCoordinate({type:'geo'})
   .createGeoLineMark({id:'coast',stroke:'#2563eb',strokeWidth:2,capacity:{maxProjectedPoints:200000,maxPathCommands:200000}});
  const commands=from.graphicSpec.objects.coast.items[0].properties.commands;assert.equal(commands.length,2*count-1);let maxError=0;
  commands.forEach((c,i)=>{assert.equal(c.op,i?'L':'M');const lon=-30+60*(i/2)/(count-1),lat=i%2?0:((i/2)%2?5:-5);maxError=Math.max(maxError,Math.abs(c.x-200-100*lon*Math.PI/180),Math.abs(c.y-200+100*lat*Math.PI/180));});assert.ok(maxError<1e-9);row.commands={count:commands.length,maxError,hash:sha(JSON.stringify(commands))};save();
  row.phase='native target and format5 plan';save();const to=from.editProjection({scalePx:200}),plan=planTransition({from,to,options:{durationMs:100,easing:'linear',formatVersion:5}}),current=sampleTransition(plan,50);
  row.phase='rebase plan';save();const rebase=planTransition({from:current,to,options:{durationMs:100,formatVersion:5}}),rebased=sampleTransition(rebase,50);
  row.phase='rebase hit preparation';save();let rebaseFrame=prepareAnimationHitFrame(rebased,2,[1.5,0,0,1.5,7,11],policy);row.rebase=validateFrame(rebased,rebaseFrame,Math.sqrt(Math.sqrt(20000)*200),count,coordinates);save();rebaseFrame=null;globalThis.gc?.();
  row.phase='offline format5 authority';save();const offline=sampleTransition(deserializeAnimation(serializeAnimation(plan)).plan,50);assert.throws(()=>prepareAnimationHitFrame(offline,2,undefined,policy),/native/);row.offline='no native hit authority';
  row.phase='complete';row.status='passed';row.end=new Date().toISOString();
 }catch(error){row.status='failed';row.error=error.stack;process.exitCode=1;}
 save();console.log(JSON.stringify(row));if(process.exitCode)break;globalThis.gc?.();
}

function validateFrame(sample,frame,scale,count,coordinates){
 const commands=sample.scene.nodes.find(n=>n.type==='path').properties.commands;assert.equal(commands.length,2*count-1);let maxError=0;
 commands.forEach((c,i)=>{assert.equal(c.op,i?'L':'M');const lon=-30+60*(i/2)/(count-1),lat=i%2?0:((i/2)%2?5:-5);maxError=Math.max(maxError,Math.abs(c.x-200-scale*lon*Math.PI/180),Math.abs(c.y-200+scale*lat*Math.PI/180));});assert.ok(maxError<1e-9);
 const index=prepareHitIndex(frame.scene,frame.entries,policy),queries=[];
 for(const i of[0,Math.floor((count-1)/2),count-2]){const point={x:(200+scale/2*(coordinates[i][0]+coordinates[i+1][0])*Math.PI/180)*1.5+7,y:311};const result=hitIndex(index,frame.scene,point,{slop:0});assert.equal(result.target.ownerId,'coast');queries.push({point,work:result.statistics.work,distance:result.target.distance});}
 return {entries:frame.entries.length,parts:inspectShape(frame.entries[0].shape).strokes.length,commands:commands.length,maxError,queries};
}
