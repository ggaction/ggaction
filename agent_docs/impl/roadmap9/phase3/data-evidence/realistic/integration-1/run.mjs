import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, openSync, closeSync, statSync, copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { collectTestFiles } from '../../../scripts/run-tests.js';
const root = process.cwd();
const directory = path.join(root, '.artifacts/data-update-realistic/integration-1');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const git = args => execFileSync('git', args, {cwd:root,encoding:'utf8',maxBuffer:20*1024*1024});
function inputs() {
  const paths = [...new Set(git(['ls-files','--cached','--others','--exclude-standard','-z']).split('\0'))]
    .filter(file => /^(?:src\/|test\/|scripts\/|types\/|knowledge\/|data\/|package(?:-lock)?\.json$)/.test(file))
    .filter(file => existsSync(file) && statSync(file).isFile()).sort();
  const files = Object.fromEntries(paths.map(file => [file,hash(readFileSync(file))]));
  return {capturedAt:new Date().toISOString(),commit:git(['rev-parse','HEAD']).trim(),
    statusSha256:hash(git(['status','--porcelain=v1','--untracked-files=all'])),
    aggregateSha256:hash(JSON.stringify(files)),fileCount:paths.length,files};
}
const started = Date.now();
const before = inputs();
writeFileSync(path.join(directory,'inputs-before.json'),JSON.stringify(before,null,2)+'\n');
const files = collectTestFiles('realistic').map(file=>path.relative(root,file));
writeFileSync(path.join(directory,'discovery.json'),JSON.stringify({suite:'realistic',fileCount:files.length,files},null,2)+'\n');
const command=[process.execPath,'scripts/run-tests.js','realistic'];
console.log(JSON.stringify({startedAt:new Date(started).toISOString(),command,files:files.length,inputCount:before.fileCount,inputSha256:before.aggregateSha256,log:path.join(directory,'full.log')}));
const log = openSync(path.join(directory,'full.log'),'w');
const child = spawn(command[0],command.slice(1),{cwd:root,stdio:['ignore',log,log]});
const result = await new Promise(resolve=>{
  child.once('error',error=>resolve({code:1,error:error.message}));
  child.once('exit',(code,signal)=>resolve({code,signal}));
});
closeSync(log);
const after = inputs();
writeFileSync(path.join(directory,'inputs-after.json'),JSON.stringify(after,null,2)+'\n');
const changedInputs = [...new Set([...Object.keys(before.files),...Object.keys(after.files)])]
  .filter(file=>before.files[file]!==after.files[file]);
const output=readFileSync(path.join(directory,'full.log'),'utf8');
const counts=Object.fromEntries(['tests','suites','pass','fail','cancelled','skipped','todo','duration_ms'].map(key=>{
  const value=[...output.matchAll(new RegExp('^# '+key+' ([0-9.]+)$','gm'))].at(-1)?.[1];
  return [key,value===undefined?null:Number(value)];
}));
for(const ext of ['json','log']) {
  const canonical=path.join(root,'.artifacts/checks/suite-realistic.'+ext);
  if(existsSync(canonical))copyFileSync(canonical,path.join(directory,'canonical-receipt.'+ext));
}
const summary={command,...result,node:process.version,startedAt:new Date(started).toISOString(),finishedAt:new Date().toISOString(),durationMs:Date.now()-started,
  discoveredFiles:files.length,counts,inputSha256Before:before.aggregateSha256,inputSha256After:after.aggregateSha256,changedInputs,logSha256:hash(output)};
writeFileSync(path.join(directory,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
process.exitCode=result.code??1;
