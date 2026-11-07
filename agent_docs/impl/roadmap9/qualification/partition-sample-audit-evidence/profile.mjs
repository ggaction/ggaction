import assert from 'node:assert/strict';
import { Session } from 'node:inspector';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chart } from '../../../../../src/index.js';
import { planTransition, sampleTransition } from '../../../../../src/animation.js';

const root = fileURLToPath(new URL('../../../../../', import.meta.url));
const manifest = JSON.parse(await readFile(new URL('./source-hashes.json', import.meta.url), 'utf8'));
for (const [file, sha] of Object.entries(manifest.files)) assert.equal(createHash('sha256').update(await readFile(resolve(root,file))).digest('hex'), sha, `Source changed: ${file}`);
const output = resolve(process.argv[2] ?? resolve(root,'.artifacts/partition-sample-audit'));
await mkdir(output,{recursive:true});
const n = 1000, values = [{key:'root',parent:null,value:0}, ...Array.from({length:n-1},(_,key)=>({key,parent:'root',value:1}))];
const from = chart().createCanvas({width:400,height:400,margin:20,plotBorder:false})
  .createData({id:'rows',keyField:'key',values}).createHierarchyData({id:'hierarchy',key:'key',parent:'parent',value:'value'})
  .layoutHierarchy({id:'layout',method:'partition'}).createPartitionPlot({id:'partition',labels:false,cells:{strokeWidth:0}});
const to = from.editCanvas({width:600});
const plan = planTransition({from,to,options:{durationMs:100,easing:'linear'}});
const session = new Session(); session.connect();
const post = (method, parameters={}) => new Promise((resolve,reject)=>session.post(method,parameters,(error,result)=>error?reject(error):resolve(result)));
await post('Profiler.enable'); await post('Profiler.setSamplingInterval',{interval:100}); await post('Profiler.start');
let frame;const times=[];
for(let index=0;index<10;index++) { const start=performance.now();frame=sampleTransition(plan,50);times.push(performance.now()-start); }
const {profile}=await post('Profiler.stop');session.disconnect();
const cells=frame.scene.nodes.filter(node=>node.properties.fill==='#3b82f6');
assert.equal(cells.length,n); assert.equal(frame.decisions.filter(d=>d.kernel==='partition').length,n);
const close=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(b)));
cells.forEach((node,i)=>{
  const x=i===0?20:20+460*(i-1)/(n-1),y=i===0?20:200,width=i===0?460:460/(n-1);
  const expected=[[x,y],[x+width,y],[x+width,y+180],[x,y+180]],commands=node.properties.commands;
  assert.equal(commands.length,5);assert.equal(commands[4].op,'Z');expected.forEach(([ex,ey],j)=>{close(commands[j].x,ex);close(commands[j].y,ey);});
});
const nodes=new Map(profile.nodes.map(node=>[node.id,node])),parents=new Map();
for(const node of profile.nodes)for(const child of node.children??[])parents.set(child,node.id);
const totals=new Map(), own=new Map();
for(let i=0;i<profile.samples.length;i++){
  let id=profile.samples[i],delta=profile.timeDeltas[i]/1000,seen=new Set();
  const keyOf=node=>`${node.callFrame.functionName||'(anonymous)'} ${node.callFrame.url.split('/src/')[1]??node.callFrame.url}:${node.callFrame.lineNumber+1}`;
  const key=keyOf(nodes.get(id));own.set(key,(own.get(key)??0)+delta);
  while(id!==undefined){const key=keyOf(nodes.get(id));if(!seen.has(key)){totals.set(key,(totals.get(key)??0)+delta);seen.add(key);}id=parents.get(id);}
}
const sorted=map=>[...map].sort((a,b)=>b[1]-a[1]).slice(0,40);
const result={scope:'Read-only CPU attribution, original 1k class; concurrent execution, not P95 or SLO qualification.',nodes:n,samples:10,node:process.version,inputSHA256:createHash('sha256').update(JSON.stringify(values)).digest('hex'),timesMs:times,verifiedCells:n,frameSHA256:createHash('sha256').update(JSON.stringify(frame)).digest('hex'),inclusive:sorted(totals),self:sorted(own)};
await writeFile(resolve(output,'sample.cpuprofile'),JSON.stringify(profile));
await writeFile(resolve(output,'profile.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
