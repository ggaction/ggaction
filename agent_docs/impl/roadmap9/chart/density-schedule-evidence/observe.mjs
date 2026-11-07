import assert from 'node:assert/strict';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

// Research harness only. Its finite work allowance is NOT a product policy.
const WORK_LIMIT=1_000_000_000, DEADLINE_MS=30_000;
const root=fileURLToPath(new URL('../../../../../',import.meta.url));
const output=path.join(root,'.artifacts/density-schedule');
const url=relative=>pathToFileURL(path.join(root,relative)).href;

if(isMainThread) {
  const mode=process.argv[2]??'--small';
  assert.ok(['--small','--original100'].includes(mode),'Only small qualification or explicitly scheduled original100 is allowed.');
  await mkdir(output,{recursive:true});
  const directory=await mkdtemp(path.join(tmpdir(),'ggaction-density-schedule-'));
  const messages=[],started=performance.now();
  let worker;
  try {
    const result=await new Promise(resolve=>{
      worker=new Worker(new URL(import.meta.url),{workerData:{mode,directory}});
      const timer=setTimeout(()=>{
        messages.push({phase:'host-deadline',elapsedMs:performance.now()-started});
        worker.terminate().then(()=>resolve({status:'host-deadline',deadlineMs:DEADLINE_MS}));
      },DEADLINE_MS);
      worker.on('message',message=>{
        if(message.final){clearTimeout(timer);resolve(message.final);}
        else messages.push(message);
      });
      worker.on('error',error=>{clearTimeout(timer);resolve({status:'worker-error',error:error.stack});});
      worker.on('exit',code=>{if(code!==0&&!messages.some(m=>m.phase==='host-deadline')){clearTimeout(timer);resolve({status:'worker-exit',code});}});
    });
    const report={schemaVersion:1,status:result.status,node:process.version,mode,
      interpretation:'bounded numeric selection diagnostic; not public admission, P95, SLO or heap qualification',
      policy:{diagnosticWorkLimit:WORK_LIMIT,hostDeadlineMs:DEADLINE_MS,productMaxSamples:10_000_000,productEdgeSamples:4096,productModified:false},
      durationMs:performance.now()-started,result,messages};
    const file=path.join(output,`${mode.slice(2)}-${process.versions.node.split('.')[0]}.json`);
    await writeFile(file,JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({file,status:report.status,iterations:result.cases?.map(c=>c.iterations.length),durationMs:report.durationMs}));
    if(mode==='--small')assert.equal(result.status,'small-exact');
  } finally {await worker?.terminate();await rm(directory,{recursive:true,force:true});}
} else {
  const directory=workerData.directory,started=performance.now();
  const common=await import(url('src/grammar/graph/routes/common.js'));
  const field=await import(url('src/grammar/graph/routes/densityField.js'));
  const {chart}=await import(url('src/index.js'));
  const {edgeRouteJob}=await import(url('src/materialization/graph/routeResource.js'));
  const {normalizeRouteIntent}=await import(url('src/grammar/graph/routes/options.js'));
  const {routeValueHash,computeRouteJob}=await import(url('src/grammar/graph/routes/job.js'));
  const {canonicalJSON}=await import(url('src/core/contentDigest.js'));
  const {encodeValue}=await import(url('src/core/valueEncoding.js'));
  const {validateGeneratedItemLimit}=await import(url('src/core/validation.js'));
  const {getErrorDetails}=await import(url('src/core/diagnostics.js'));
  let current;
  const check=()=>{if(performance.now()-started>=DEADLINE_MS)throw new Error('Diagnostic host deadline reached at a native budget boundary.');};
  function prepare(input,signal) {
    check();const context=common.prepareRouteInput(input,signal),native=context.budget;
    let work=native.diagnostics().work;
    const budget={...native,
      check(){native.check();check();},
      charge(value){thisCheck();assert.ok(Number.isSafeInteger(value)&&value>=0);validateGeneratedItemLimit(work+value,'Diagnostic route work',WORK_LIMIT);work+=value;current.charges[current.phase]=(current.charges[current.phase]??0)+value;},
      samples(value){thisCheck();native.samples(value);},
      diagnostics(){return {...native.diagnostics(),work};}};
    function thisCheck(){native.check();check();}
    current.inputWork=work;current.budget=budget;return Object.freeze({...context,budget});
  }
  const tap={
    prepare,
    field(routes,samples,bounds,options,budget) {
      current.phase='field';let call=0,rows=0,candidates=0,fieldCharge=0;
      const wrapped={...budget,charge(value){
        if(call++===0)assert.equal(value,samples.count);else{rows++;candidates+=value-1;}
        fieldCharge+=value;budget.charge(value);
        if(call%4096===0)parentPort.postMessage({phase:'field-progress',iteration:current.iterations.length,rows,candidates,consumedFieldCharge:fieldCharge,diagnostics:current.budget.diagnostics()});
      }};
      const started=performance.now();
      try {
        const result=field.createPackedRouteDensityField(routes,samples,bounds,options,wrapped);
        current.field={rows,candidates,charge:fieldCharge,cells:result.cells.size,durationMs:performance.now()-started,
          packedLiveBytes:samples.bytes,packedPreparationPeakBytes:samples.peakBytes};
        current.phase='advection-resampling';return result;
      } catch(error){parentPort.postMessage({phase:'field-failed',iteration:current.iterations.length,rows,candidates,attemptedFieldCharge:fieldCharge,consumedDiagnostics:current.budget.diagnostics(),error:error.message});throw error;}
    },
    begin(iteration,routes) {
      current.phase='weights';current.start={iteration,S:routes.reduce((n,p)=>n+p.length,0),maxEdge:Math.max(...routes.map(p=>p.length)),workBefore:current.budget.diagnostics().work};
      parentPort.postMessage({phase:'iteration-start',...current.start});
    },
    end(entry,routes) {
      const row={...current.start,T:entry.samples,fieldCells:entry.fieldCells,field:current.field,
        cumulativeDiagnostics:current.budget.diagnostics(),
        pointObjectUpperBound:2*current.start.S+entry.samples+2*4096,
        mapEntryUpperBound:current.field.cells};
      assert.equal(entry.samples,routes.reduce((n,p)=>n+p.length,0));
      current.iterations.push(row);parentPort.postMessage({phase:'iteration-finished',...row});current.phase='weights';
    }
  };
  globalThis.__densityScheduleAudit=tap;
  const owner='src/grammar/graph/routes/density.js',source=await readFile(path.join(root,owner),'utf8');
  let instrumented=source.replace(/from "(\.[^"]+)"/g,(_,relative)=>`from ${JSON.stringify(url(path.posix.normalize(path.posix.join(path.posix.dirname(owner),relative))))}`);
  const replacements=[
    ['import { prepareRouteInput, finalizeRouteResult }', 'import { prepareRouteInput as originalPrepareRouteInput, finalizeRouteResult }'],
    ['import { createPackedRouteDensityField, advectPackedDensityRoute }', 'import { createPackedRouteDensityField as originalCreatePackedRouteDensityField, advectPackedDensityRoute }'],
    ['const MAX_EDGE_SAMPLES = 4096;', 'const MAX_EDGE_SAMPLES = 4096;\nconst prepareRouteInput = globalThis.__densityScheduleAudit.prepare;\nconst createPackedRouteDensityField = globalThis.__densityScheduleAudit.field;'],
    ['context.budget.check();\n      const bandwidth', 'context.budget.check();\n      globalThis.__densityScheduleAudit.begin(iteration, routes);\n      const bandwidth'],
    ['schedule.push({ iteration, bandwidth, fieldCells: field.cells.size, samples: routes.reduce((sum, points) => sum + points.length, 0) });', 'schedule.push({ iteration, bandwidth, fieldCells: field.cells.size, samples: routes.reduce((sum, points) => sum + points.length, 0) });\n        globalThis.__densityScheduleAudit.end(schedule.at(-1), routes);'],
    ['const result = finalizeRouteResult', 'globalThis.__densityScheduleAudit.finalize();\n  const result = finalizeRouteResult']
  ];
  for(const [before,after] of replacements){assert.equal(instrumented.split(before).length,2,`Exactly one observation seam: ${before}`);instrumented=instrumented.replace(before,after);}
  tap.finalize=()=>{current.phase='finalization';};
  const file=path.join(directory,'density.mjs');await writeFile(file,instrumented);
  const {bundleDensityRoutes}=await import(pathToFileURL(file));
  const cases=[];
  function fixture(original,directed=false) {
    const n=original?100:4;
    const nodes=Array.from({length:n},(_,id)=>({id}));
    const edges=original?nodes.map(({id})=>({id,source:id,target:(id+Math.floor(n/3))%n})):[{id:10,source:0,target:1},{id:2,source:3,target:2},{id:3,source:0,target:0}];
    const positions=original?nodes.map(({id})=>({key:id,x:200+150*Math.cos(2*Math.PI*id/n),y:200+150*Math.sin(2*Math.PI*id/n)})):[{key:0,x:-0,y:0},{key:1,x:300,y:0},{key:2,x:0,y:6},{key:3,x:300,y:6}];
    return chart().createCanvas({width:400,height:400,margin:0,background:'white'})
      .createData({id:'nodes',values:nodes,keyField:'id'}).createData({id:'edges',values:edges,keyField:'id'})
      .createGraphData({id:'graph',nodes:'nodes',edges:'edges',nodeKey:'id',edgeKey:'id',source:'source',target:'target',...(original?{}:{directed,selfLoops:true})})
      .layoutGraph({id:'layout',method:'fixed',options:{positions}});
  }
  try {
    for(const directed of workerData.mode==='--small'?[false,true]:[false]) {
      check();const original=workerData.mode==='--original100',program=fixture(original,directed);
      const [graph,layout]=['graph','layout'].map(kind=>program.semanticSpec.resources.find(r=>r.kind===kind));
      const job=edgeRouteJob(program,graph,layout,normalizeRouteIntent('density',{},'world'));
      current={iterations:[],phase:'initial-resampling',charges:{},jobBytes:Buffer.byteLength(canonicalJSON(encodeValue(job))),inputHash:job.inputHash};
      const result=bundleDensityRoutes(job.input),resultHash=routeValueHash(result);
      const completion={inputHash:job.inputHash,resultHash,result};
      if(!original){
        assert.deepEqual(result,computeRouteJob(job).result);
        const publicResult=program.bundleGraphEdges({id:'routes',method:'density'}).semanticSpec.resources.find(r=>r.kind==='edge-route').result;
        const {options,...computed}=result;
        assert.deepEqual(publicResult,{viewport:job.viewport,inputHash:job.inputHash,resultHash,...computed});
        assert.deepEqual(options,{zeroLength:'point'});
      }
      assert.equal(result.diagnostics.iterations,20);
      assert.equal(current.inputWork+Object.values(current.charges).reduce((a,b)=>a+b,0),result.diagnostics.work);
      cases.push({edges:job.input.model.edges.length,directed:job.input.model.directed,iterations:current.iterations,
        inputWork:current.inputWork,charges:current.charges,diagnostics:result.diagnostics,resultHash,
        jobBytes:current.jobBytes,inputHash:current.inputHash,completionBytes:Buffer.byteLength(canonicalJSON(encodeValue(completion))),
        finalCommands:result.routes.reduce((s,r)=>s+r.commands.length,0),finalControls:result.routes.reduce((s,r)=>s+r.controlPoints.length,0),
        comparison:original?'Diagnostic result only; default product refuses original100.':'All public result fields exact.'});
    }
    if(workerData.mode==='--small'){
      const program=fixture(false),[graph,layout]=['graph','layout'].map(kind=>program.semanticSpec.resources.find(r=>r.kind===kind));
      const job=edgeRouteJob(program,graph,layout,normalizeRouteIntent('density',{},'world'));
      current={iterations:[],phase:'guard-probes',charges:{}};const budget=prepare(job.input).budget,before=budget.diagnostics();
      assert.throws(()=>budget.charge(WORK_LIMIT),/Diagnostic route work must not exceed 1000000000/);
      assert.throws(()=>budget.samples(10_000_001),/Route active samples must not exceed 10000000/);
      assert.deepEqual(budget.diagnostics(),before);
    }
    parentPort.postMessage({final:{status:workerData.mode==='--small'?'small-exact':'diagnostic-complete',cases,
      sourceSHA256:createHash('sha256').update(source).digest('hex'),sourceHashes:Object.fromEntries(await Promise.all(['density','densityField','densitySamples','polyline','common','budget','job'].map(async name=>[name,createHash('sha256').update(await readFile(path.join(root,`src/grammar/graph/routes/${name}.js`))).digest('hex')]))),observationSeams:replacements.map(([before])=>before)}});
  } catch(error) {
    parentPort.postMessage({final:{status:'diagnostic-rejected',error:{name:error.name,message:error.message,details:getErrorDetails(error)},
      cases,partial:current?{iterations:current.iterations,charges:current.charges,diagnostics:current.budget?.diagnostics(),inputWork:current.inputWork,jobBytes:current.jobBytes,inputHash:current.inputHash}:null}});
  } finally {delete globalThis.__densityScheduleAudit;}
}
