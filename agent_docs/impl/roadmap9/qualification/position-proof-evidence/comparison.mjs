import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const file='src/grammar/animation/positions.js',before=execFileSync('git',['show',`3aa8e93c456a0fab555737c4dc3f44f481ab6407:${file}`],{encoding:'utf8'}),after=await readFile(file,'utf8'),hash=x=>createHash('sha256').update(x).digest('hex');
await mkdir('.artifacts/position-proof',{recursive:true});
const result={scope:'Exact full scalar sample comparison and diagnostic Node timings; not production browser size-class SLO or final qualification.',node:process.version,beforeSHA256:hash(before),afterSHA256:hash(after),workload:{positions:10000,warmups:5,measured:10,progress:.5},runs:[]};
for(const [name,source]of [['before',before],['after',after]]){
 const target=path.resolve(`.artifacts/position-proof/${name}.mjs`);
 await build({stdin:{contents:`export * from './${file}';`,resolveDir:process.cwd(),sourcefile:'position-proof-entry.mjs'},bundle:true,platform:'node',format:'esm',outfile:target,plugins:[{name:'exact-position-source',setup(b){b.onLoad({filter:/\/grammar\/animation\/positions\.js$/},()=>({contents:source,loader:'js'}));}}]});
 const api=await import(pathToFileURL(target)),endpoint=value=>({value,scale:{type:'linear',domain:[0,100],range:[20,380],clamp:false}}),plans=Array.from({length:10000},(_,i)=>api.preparePositionInterpolation(endpoint(i/100),endpoint(i/200)));
 const run=()=>plans.map(plan=>api.samplePositionInterpolation(plan,.5));let output;
 for(let i=0;i<5;i++)output=run();const samples=[];
 for(let i=0;i<10;i++){const start=performance.now();output=run();samples.push(performance.now()-start);}
 output.forEach((item,i)=>{assert.equal(item.kind,'position');assert.equal(item.value,(i/100)/2+(i/200)/2);assert.ok(Math.abs(item.position-(20+360*item.value/100))<1e-10);});
 const record={name,samplesMs:samples,allValues:output.length,outputSHA256:hash(JSON.stringify(output))};result.runs.push(record);console.log(JSON.stringify(record));
}
assert.equal(result.runs[0].outputSHA256,result.runs[1].outputSHA256);result.exactFullOutput=true;
await writeFile('.artifacts/position-proof/comparison.json',JSON.stringify(result,null,2)+'\n');
