import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,realpathSync,mkdirSync,lstatSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const args=new Map();
for(const token of process.argv.slice(2)){
 const match=/^--([a-z-]+)=(.+)$/.exec(token);
 if(!match||args.has(match[1])||!['package-root','receipt','output','nodes'].includes(match[1]))throw new TypeError('Use unique --package-root, --receipt and --output absolute paths.');
 args.set(match[1],match[2]);
}
for(const key of ['package-root','receipt','output'])if(!args.has(key)||!path.isAbsolute(args.get(key)))throw new TypeError(key+' requires an absolute path.');
const packageRoot=realpathSync(args.get('package-root')),output=args.get('output');
const artifact=JSON.parse(readFileSync(args.get('receipt')));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(readFileSync(artifact.file)),artifact.sha256,'Exact archive receipt bytes');
assert.equal(JSON.parse(readFileSync(path.join(packageRoot,'package.json'))).name,'ggaction');
const archiveEntries=execFileSync('tar',['-tzf',artifact.file],{encoding:'utf8',maxBuffer:16777216}).trimEnd().split('\n');
const installedHash=createHash('sha256');
for(const entry of archiveEntries){assert.ok(entry.startsWith('package/')&&!entry.endsWith('/')&&!entry.split('/').includes('..'),'Ordinary package archive entry');const file=path.join(packageRoot,entry.slice(8));assert.ok(lstatSync(file).isFile(),'Installed archive file');installedHash.update(readFileSync(file));}
assert.equal(installedHash.digest('hex'),createHash('sha256').update(execFileSync('tar',['-xOzf',artifact.file],{maxBuffer:67108864})).digest('hex'),'Installed package must match every archived file byte');
const module=relative=>import(pathToFileURL(path.join(packageRoot,relative)));
const {chart}=await module('src/index.js');
const {planTransition,sampleTransition,serializeAnimation,deserializeAnimation}=await module('src/animation.js');
const n=Number(args.get('nodes')??10000);assert.ok([1000,10000].includes(n),'Only original 1k/10k classes are supported');
const values=[{key:'root',parent:null,value:0},...Array.from({length:n-1},(_,key)=>({key,parent:'root',value:1}))];
const record={kind:'Original '+n+' node class functional verification; no timed P95 or explicit GC',pid:process.pid,node:process.version,start:new Date().toISOString(),archiveSHA256:artifact.sha256,archiveEntries:archiveEntries.length,inputSHA256:sha(JSON.stringify(values)),nodes:n,cases:[]};
mkdirSync(path.dirname(output),{recursive:true});
const save=()=>writeFileSync(output,JSON.stringify(record,null,2)+'\n');save();console.log(JSON.stringify({pid:process.pid,start:record.start}));
const close=(a,b)=>assert.ok(Number.isFinite(a)&&Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(b)),`${a} != ${b}`);
const verify=(frame,width,label)=>{
 const nodes=frame.scene.nodes.filter(node=>node.properties.fill==='#3b82f6');
 assert.equal(nodes.length,n);assert.equal(frame.decisions.filter(d=>d.kernel==='partition').length,n);
 nodes.forEach((node,i)=>{
  const x=i===0?20:20+width*(i-1)/(n-1),y=i===0?20:200,w=i===0?width:width/(n-1);
  const points=[[x,y],[x+w,y],[x+w,y+180],[x,y+180]],commands=node.properties.commands;
  assert.equal(commands.length,5);assert.equal(commands[4].op,'Z');
  points.forEach(([x,y],j)=>{assert.equal(commands[j].op,j?'L':'M');close(commands[j].x,x);close(commands[j].y,y);});
 });
 record.cases.push({label,verifiedCells:n,commands:n*5,sceneSHA256:sha(JSON.stringify(frame.scene)),frameSHA256:sha(JSON.stringify(frame))});save();
};
try{
 const input=chart().createCanvas({width:400,height:400,margin:20,plotBorder:false}).createData({id:'rows',keyField:'key',values}).createHierarchyData({id:'hierarchy',key:'key',parent:'parent',value:'value'});
 const laidOut=input.layoutHierarchy({id:'layout',method:'partition'}),nodes=laidOut.semanticSpec.resources.find(r=>r.kind==='layout'&&r.id==='layout').result.nodes;
 assert.equal(nodes.length,n);close(nodes[0].u0,0);close(nodes[0].u1,1);close(nodes[0].totalValue,n-1);
 nodes.slice(1).forEach((node,i)=>{close(node.u0,i/(n-1));close(node.u1,(i+1)/(n-1));assert.equal(node.depth,1);});record.layoutVerified=n;save();
 const from=laidOut.createPartitionPlot({id:'partition',labels:false,cells:{strokeWidth:0}}),to=from.editCanvas({width:600});
 const options={durationMs:100,easing:'linear'},plan=planTransition({from,to,options});
 assert.equal(sampleTransition(plan,0).graphicSpec,from.graphicSpec);assert.equal(sampleTransition(plan,100).graphicSpec,to.graphicSpec);record.nativeEndpoints=true;save();
 const middle=sampleTransition(plan,50);verify(middle,460,'current');
 const reversed=planTransition({from:middle,to:from,options});assert.equal(sampleTransition(reversed,0),middle);
 const rebase=sampleTransition(reversed,37);verify(rebase,423,'rebase');
 for(const [label,current,expected,width] of [['offline',plan,middle,460],['offline-rebase',reversed,rebase,423]]){
  const bytes=serializeAnimation(current),restored=deserializeAnimation(bytes).plan;
  const replay=sampleTransition(restored,label==='offline'?50:37);assert.deepEqual(replay,expected);verify(replay,width,label);
 }
 record.status='passed';record.memory=process.memoryUsage();
}catch(error){record.status='failed';record.error={name:error.name,message:error.message,stack:error.stack};throw error;}
finally{record.end=new Date().toISOString();save();console.log(JSON.stringify(record));}
