import {createHash} from 'node:crypto';
import {nativeWorkloadInput,prepareNativeWorkload} from '../../../../../scripts/benchmarks/workloads.browser.js';
const output={source:'ac96edb076fc9a299fa82e6ef18b63a2eb001845',mode:'instrumented source calls only; not P95 or qualification'};
globalThis.__geoCapacityCalls={};
const fixture=prepareNativeWorkload('geo',1000,nativeWorkloadInput('geo',1000));output.nativePreparation={...globalThis.__geoCapacityCalls};
for(const stage of fixture.stages){globalThis.__geoCapacityCalls={};const prepared=stage.prepare();const preparation={...globalThis.__geoCapacityCalls};globalThis.__geoCapacityCalls={};const result=prepared.run();const calls={...globalThis.__geoCapacityCalls};const witness=prepared.validate(result);
 const queries=[];if(stage.name==='css-hit'){for(let i=0;i<2;i++){const r=prepared.run();prepared.validate(r);queries.push(r.hit.candidates.length);}}
 output[stage.name]={preparation,calls,witness,remainingQueryCandidates:queries,outputHash:createHash('sha256').update(JSON.stringify(result.frame?.scene??result.hit)).digest('hex')};prepared.dispose?.();}
fixture.assertImmutable();console.log(JSON.stringify(output,null,2));
