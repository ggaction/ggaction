import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {ROUTE_LIMITS} from '../../../../../src/grammar/graph/routes/budget.js';
import {DENSITY_ROUTE_POLICY} from '../../../../../src/grammar/graph/routes/density.js';
import {densitySampleByteBound} from '../../../../../src/grammar/graph/routes/densitySamples.js';

// Arithmetic ceilings, not measured peaks or proposed product policy constants.
const P=4096,grid=DENSITY_ROUTE_POLICY.gridSize;
assert.equal(grid,256);assert.equal(DENSITY_ROUTE_POLICY.iterations,20);
assert.equal(ROUTE_LIMITS.maxSamples,10_000_000);
const rows=[];
for(const E of [100,1000,10000])for(const channels of [1,8]){
 const S=E*P,T=S,C=channels*grid*grid;
 const counts={beforeField:6*S+2*E,field:6*S+C+2*E,resample:C+4*S+T+2*E,finalization:2*T};
 const numeric={packedLive:16*S+4*(E+1),packedPreparation:densitySampleByteBound(S,E,P-1)};
 // Peak reachable points in density iteration: old + all smooth + new +
 // per-edge advection/smoothing scratch. Map/arrays/encoding are separate.
 const pointObjectUpper=2*S+T+2*P;
 for(const value of [...Object.values(counts),...Object.values(numeric),pointObjectUpper])assert.ok(Number.isSafeInteger(value));
 assert.equal(BigInt(counts.field),6n*BigInt(S)+BigInt(C)+2n*BigInt(E));
 rows.push({edges:E,channels,perEdgeCap:P,maximumS:S,maximumFieldCells:C,sampleChargeUpper:counts,numericBytesUpper:numeric,
  iterationPointObjectUpper:pointObjectUpper,interpretation:'Conservative arithmetic ceiling; no allocation, solver, heap estimate or large admission.'});
}
const report={schemaVersion:1,source:'90ae731513ec85a8eb5bd378a82d5904d1be6da4',
 productDefaultsUnchanged:ROUTE_LIMITS,rows,
 missing:['Actual 20-iteration sample counts and final bytes for original100/1000/10000.',
 'Native source/model/index and caller input object counts.',
 'Array/reference counts, Map bucket capacity, allocator overhead and collector residency.',
 'Tagged encoding/canonical text/UTF8/hash padding and structured-clone packet coexistence.']};
await writeFile(new URL('./bounds.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({rows:rows.length,directed10k:rows.at(-1)}));
