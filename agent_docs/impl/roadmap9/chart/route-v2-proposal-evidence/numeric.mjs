// Pure arithmetic and one fixed-size route envelope. No large solver or arrays.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {forceRouteSchedule} from '../../../../../src/grammar/graph/routes/forceDirected.js';
import {encodeValue} from '../../../../../src/core/valueEncoding.js';
import {canonicalJSON} from '../../../../../src/core/contentDigest.js';
import {encodeRowKey} from '../../../../../src/core/itemIdentity.js';
const archived=JSON.parse(await readFile('agent_docs/impl/roadmap9/chart/route-capacity-evidence/audit.json','utf8'));
const densityRecord=JSON.parse(gunzipSync(await readFile('agent_docs/impl/roadmap9/chart/density-schedule-evidence/original100-22.json.gz'))).result.cases[0];
assert.equal(densityRecord.diagnostics.iterations,20);
const densityFirst=archived.density.find(row=>row.n===10000);
const schedule=forceRouteSchedule(),rows=[];
const bytes=x=>Buffer.byteLength(canonicalJSON(encodeValue(x)));
for(const prior of archived.force){
 const E=BigInt(prior.n),pairs=E*(E-1n)/2n,A=BigInt(prior.compatible);
 const work=schedule.reduce((n,c)=>n+E*BigInt(c.internalSamples+2)+BigInt(c.iterations)*(2n*E+5n*E*BigInt(c.internalSamples)+A*BigInt(c.internalSamples)),0n);
 assert.equal(work,BigInt(prior.scheduleWork));
 const preparationUpper=10_000_000n,finalize=E*34n*2n*4n;
 const chunks=(A+32767n)/32768n,neighbors=8n*E+4n+13n*chunks*32768n;
 rows.push({edges:prior.n,pairs:Number(pairs),compatible:prior.compatible,scheduleWork:Number(work),preparationUpper:Number(preparationUpper),finalizationWork:Number(finalize),completeForceWorkUpper:Number(preparationUpper+17n*pairs+work+finalize),neighborNumericUpper:Number(neighbors),peakSamples:70*prior.n,limitation:'preparation upper is the preserved existing native 10M preflight; schedule/compatibility evidence reused, no solver run'});
}
// Structural envelope upper for the original 10k force fixture only. Every
// coordinate uses a 25-character finite decimal, keys use the original numeric
// row-key shape, final route width is fixed 34. No point or iteration is removed.
// The longest fixed fractional form needs sign + 0. + five zeroes + 17
// significant digits (25). Scientific notation is shorter; 24 is insufficient.
const coordinate=-0.0000012345678901234567,key=encodeRowKey(9999),point={x:coordinate,y:coordinate};
assert.equal(JSON.stringify(coordinate).length,25);
const route={edgeKey:key,sourceKey:key,targetKey:key,
 controlPoints:Array.from({length:34},()=>({...point})),commands:Array.from({length:34},()=>({op:'L',...point})),
 bounds:{left:coordinate,right:coordinate,top:coordinate,bottom:coordinate},
 provenance:{algorithmVersion:'force-directed@1',compatibilityCount:9999}};
const empty={schemaVersion:2,inputHash:'a'.repeat(64),resultHash:'b'.repeat(64),result:{complete:true,routes:[],
 diagnostics:{work:8_000_000_000,candidatePairs:50_000_000,peakSamples:16_777_216,peakBufferBytes:134_217_728,
 compatibilityPairs:49_995_000,displacementCaps:8_400_000,totalIterations:165,schedule},
 options:{compatibilityThreshold:.6,zeroLength:'point'}}};
const forceCompletionUpper=bytes(empty)+10000*bytes(route)+9999;
assert.ok(forceCompletionUpper<134_217_728);
const candidate={policy:'bounded-route@1',maxWork:8_000_000_000,maxCandidatePairs:50_000_000,maxSamples:16_777_216,maxBufferBytes:134_217_728,maxBytes:134_217_728};
assert.ok(rows[2].completeForceWorkUpper<candidate.maxWork);
assert.ok(rows[2].neighborNumericUpper+65536+352+24<candidate.maxBufferBytes);
assert.equal(6*densityFirst.firstSamples+2*densityFirst.n,densityFirst.existingInitialLiveSlots);
assert.ok(densityFirst.existingInitialLiveSlots<candidate.maxSamples);
const output={status:'proposal-only-static-selection',candidate,defaults:'execution omitted preserves v1; every v2 numeric field explicit, no numeric defaults',force:rows,
 bytes:{fixtureKey:key,perRouteUpper:bytes(route),forceCompletion10000Upper:forceCompletionUpper,scope:'fixed benchmark force result envelope only; no arbitrary graph attribute or density bound'},
 density:{original100Observed:{work:densityRecord.diagnostics.work,peakSamples:densityRecord.diagnostics.peakSamples,packedPreparationBytes:Math.max(...densityRecord.iterations.map(row=>row.field.packedPreparationPeakBytes)),completionBytes:densityRecord.completionBytes},first10000:{samples:densityFirst.firstSamples,charge:densityFirst.existingInitialLiveSlots,packedPreparationBytes:16*densityFirst.firstSamples+4*(densityFirst.n+1)+8*4095},later1000and10000:'unmeasured; caps may reject later iterations, full support not established'},
 constraints:{perEdgeSamples:4096,forceIterations:165,densityIterations:20,deadlineCandidateMs:30000,requestCounters:'aggregate across jobs and fit passes; no reset'},
 largeRun:false,heapBound:false,latencyQualified:false};
await writeFile('.artifacts/route-v2-proposal/numeric.json',JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify(output,null,2));
