import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../../../..',import.meta.url));
const {preparePackageConsumer}=await import(path.join(root,'scripts/package-consumer.js'));
const {measureMinimalBrowserBundle,BROWSER_BUNDLE_GZIP_LIMITS}=await import(path.join(root,'scripts/browser-bundle-size.js'));
const consumer=await preparePackageConsumer();
try{
 const code=`import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chart} from 'ggaction';
import {planTransition,sampleTransition,serializeAnimation,deserializeAnimation} from 'ggaction/animation';
const n=1000,rows=[{key:'root',parent:null,value:0},...Array.from({length:n-1},(_,key)=>({key,parent:'root',value:1}))];
function endpoint(n,values=rows){return chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createData({id:'rows',keyField:'key',values}).createHierarchyData({id:'hierarchy',key:'key',parent:'parent',value:'value'}).layoutHierarchy({id:'layout',method:'partition'}).createPartitionPlot({id:'partition',labels:false,cells:{strokeWidth:0}});}
const from=endpoint(n),to=from.editCanvas({width:600});
const plan=planTransition({from,to,options:{durationMs:100,easing:'linear'}}),text=serializeAnimation(plan),offline=deserializeAnimation(text).plan;
let verified=0;
for(const time of [0,37,50,100]){
 const native=sampleTransition(plan,time);assert.deepEqual(sampleTransition(offline,time),native);
 const nodes=native.scene.nodes.filter(n=>n.properties.fill==='#3b82f6');assert.equal(nodes.length,n);
 const width=360+200*time/100;
 for(let i=0;i<n;i++){
  const x=i===0?20:20+width*(i-1)/(n-1),y=i===0?20:200,w=i===0?width:width/(n-1);
  const expected=[[x,y],[x+w,y],[x+w,y+180],[x,y+180]];
  const actual=nodes[i].type==='rect'?[[nodes[i].properties.x,nodes[i].properties.y],[nodes[i].properties.x+nodes[i].properties.width,nodes[i].properties.y],[nodes[i].properties.x+nodes[i].properties.width,nodes[i].properties.y+nodes[i].properties.height],[nodes[i].properties.x,nodes[i].properties.y+nodes[i].properties.height]]:nodes[i].properties.commands;
 expected.forEach(([x,y],j)=>{assert.ok(Math.abs((Array.isArray(actual[j])?actual[j][0]:actual[j].x)-x)<1e-7);assert.ok(Math.abs((Array.isArray(actual[j])?actual[j][1]:actual[j].y)-y)<1e-7);});verified++;
 }
}
const middle=sampleTransition(plan,37);let rebaseVerified=0;
for(const [a,b]of[[middle,from],[to,middle],[middle,to]]){
 const rebased=planTransition({from:a,to:b,options:{durationMs:100,easing:'linear'}}),restored=deserializeAnimation(serializeAnimation(rebased)).plan;
 for(const time of[0,29,100]){const frame=sampleTransition(rebased,time);assert.deepEqual(sampleTransition(restored,time),frame);assert.equal(frame.scene.nodes.filter(n=>n.properties.fill==='#3b82f6').length,n);rebaseVerified+=n;}
}
const large=endpoint(10000,[{key:'root',parent:null,value:0},...Array.from({length:9999},(_,key)=>({key,parent:'root',value:1}))]);
assert.throws(()=>planTransition({from:large,to:large,options:{durationMs:100,easing:'linear'}}),/must not exceed 10000/);
console.log(JSON.stringify({node:process.version,n,verified,rebaseVerified,wireBytes:Buffer.byteLength(text),wireSHA256:createHash('sha256').update(text).digest('hex'),default10000Rejected:true}));`;
 await writeFile(path.join(consumer.directory,'partition-consumer.mjs'),code);
 const output=execFileSync(process.execPath,['partition-consumer.mjs'],{cwd:consumer.directory,encoding:'utf8',maxBuffer:1024*1024});
 const animation=await measureMinimalBrowserBundle(consumer.directory,{specifier:'ggaction/animation'});
 assert.ok(animation.gzipBytes<=BROWSER_BUNDLE_GZIP_LIMITS['ggaction/animation'],JSON.stringify(animation));
 const tar=await readFile(consumer.packageSpec),result={consumer:JSON.parse(output.trim()),artifact:consumer.artifact===undefined?{external:consumer.packageSpec}:{filename:consumer.artifact.filename,entryCount:consumer.artifact.entryCount},archiveSHA256:createHash('sha256').update(tar).digest('hex'),animation};
 await writeFile(new URL(process.env.EVIDENCE_RESULT_FILE??'packed-consumer.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}finally{await consumer.cleanup();}
