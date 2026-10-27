import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile, writeFile} from 'node:fs/promises';
const exec = promisify(execFile);
const output = new URL('./ci-status-latest.json', import.meta.url);
const runs = JSON.parse(await readFile(new URL('./ci-runs.json', import.meta.url),'utf8'));
let prior = {};
try { prior = JSON.parse(await readFile(output,'utf8')); } catch {}
const state = {};
const results = await Promise.all(runs.map(async run => {
  try {
    const {stdout} = await exec('gh',['run','view',String(run.id),'--repo','ggaction/ggaction',
      '--json','status,conclusion,jobs','--jq','{status,conclusion,jobs:[.jobs[]|{name,status,conclusion,databaseId}]}']);
    const value = JSON.parse(stdout);
    state[run.name] = value;
    const passed = value.jobs.filter(job=>job.conclusion==='success').map(job=>job.name);
    const previous = new Set((prior[run.name]?.jobs??[]).filter(job=>job.conclusion==='success').map(job=>job.name));
    return {...run,status:value.status,conclusion:value.conclusion,passed:passed.length,
      newPassed:passed.filter(name=>!previous.has(name)),
      failed:value.jobs.filter(job=>job.conclusion==='failure'),
      remaining:value.jobs.filter(job=>job.status!=='completed').length,
      publish:value.jobs.find(job=>job.name==='publish')};
  } catch(error) { return {...run,error:error.message}; }
}));
await writeFile(output,JSON.stringify(state,null,2)+'\n');
console.log(JSON.stringify(results,null,2));
