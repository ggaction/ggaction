import {readdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root='.artifacts/data-update-realistic/integration-2/';
const before=JSON.parse(readFileSync(root+'inputs-before.json','utf8'));
const start=Date.parse(before.capturedAt);
const files=readdirSync('.artifacts/timings').filter(f=>Number(f.split('-')[0])>=start).map(f=>JSON.parse(readFileSync('.artifacts/timings/'+f,'utf8')));
const log=readFileSync(root+'full.log','utf8');
const changedSource=Object.entries(before.files).filter(([file])=>/^(?:src\/|types\/|test\/support\/)/.test(file))
  .filter(([file,hash])=>createHash('sha256').update(readFileSync(file)).digest('hex')!==hash).map(([file])=>file);
console.log(JSON.stringify({elapsedSeconds:Math.round((Date.now()-start)/1000),completedFiles:files.length,
  passed:files.filter(x=>x.status==='passed').length,failed:files.filter(x=>x.status!=='passed'),
  recent:files.slice(-3).map(x=>({file:x.file,durationMs:Math.round(x.durationMs)})),
  passedTests:[...log.matchAll(/^ok [0-9]+ - /gm)].length,
  failedTAP:log.split('\n').filter(x=>/^not ok /.test(x)).slice(-5),changedSource},null,2));
