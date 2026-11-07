import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const cases=JSON.parse(await readFile('.artifacts/geo-a2-columns-candidates.json','utf8')).cases;
function digitsSum(n){let total=1;for(let digits=1,start=1;start<n;digits++,start*=10)total+=Math.max(0,Math.min(n,10*start)-start)*digits;return n===0?0:total;}
const b64Chars=n=>4*(4*Math.ceil(8*(2*n-1)/3)+2*Math.ceil(8*n/3)+Math.ceil(16/3));
function counts(n,kind){const sampled=kind==='sampled',extra=sampled?654:0;return{
 n,kind,commands:2*n-1,sourcePositions:n,
 current:{physical:22*n+(sampled?737:507),encoded:58*n+(sampled?2078:1491)},
 descended:{physical:10*n+(sampled?1327:1067),encoded:10*n+(sampled?3586:2875)},
 logical:22*n+(sampled?303:254),writerDescriptors:22*n+(sampled?302:253),readerDescriptors:16*n+(sampled?233:203),cells:22*n+(sampled?52:10),interning:72*n+(sampled?550:164),
 originalPreparationWork:46*n+2*digitsSum(2*n-1)+2*digitsSum(n)+3204+extra,
 sourceGroup:{values:3*n+44,positions:n,work:10*n+digitsSum(n)+581},
 presentation:{values:3*n+67,work:8*n+digitsSum(n)+752},
 groupState:{values:3*n+77,work:8*n+digitsSum(n)+881},
 streamWork:16*n+digitsSum(n)+26,
 vectorScalarStorage:10*n-2,vectorBase64Characters:b64Chars(n),
 binaryWirePhysical:sampled?1318:1064,binaryWireEncoded:sampled?3587:2890
};}
for(const c of cases){const expected=counts(c.n,c.kind),m=c.candidate;
 assert.equal(c.current.physicalValues,expected.current.physical);assert.equal(c.current.encodedValues,expected.current.encoded);
 assert.equal(m.physicalValues,expected.descended.physical);assert.equal(m.encodedValues,expected.descended.encoded);
 assert.equal(m.logicalValues,expected.logical);assert.equal(m.descriptorVisits,expected.writerDescriptors);assert.equal(c.reader.descriptorVisits,expected.readerDescriptors);assert.equal(m.cellVisits,expected.cells);assert.equal(c.reader.cellVisits,expected.cells);assert.equal(m.interningWork,expected.interning);assert.equal(c.originalPreparationWork,expected.originalPreparationWork);
 assert.equal(c.groupBudget.work,expected.sourceGroup.work);assert.equal(c.groupBudget.values,expected.sourceGroup.values);assert.equal(c.presentationBudget.work,expected.presentation.work);assert.equal(c.groupStateBudget.work,expected.groupState.work);
 assert.equal(c.vectors.reduce((sum,v)=>sum+v.length,0),expected.vectorScalarStorage);assert.equal(c.wire.physicalValues,expected.binaryWirePhysical);assert.equal(c.wire.estimatedEncodedValues,expected.binaryWireEncoded);
}
const projected=['native','sampled'].map(kind=>{const c=counts(100000,kind),small=cases.find(x=>x.kind===kind&&x.n===1000);
 // Only vector strings grow. All remaining strings are exact same fixture
 // metadata; each numeric field is conservatively allowed 24 extra bytes.
 c.binaryEnvelopeConservativeByteBound=c.vectorBase64Characters+small.wire.envelopeBytes-b64Chars(1000)+small.wire.estimatedEncodedValues*24;
 c.batch={fourInteriorStreamOnly:c.streamWork*4,fiveInteriorStreamOnly:c.streamWork*5,limit:10000000};
 assert(c.logical<12000000&&c.writerDescriptors<16000000&&c.cells<16000000&&c.interning<140000000);
 assert(c.binaryEnvelopeConservativeByteBound<64*1024*1024);assert(c.batch.fourInteriorStreamOnly<10000000&&c.batch.fiveInteriorStreamOnly>10000000);
 return c;});
const output={kind:'analytical 100k projection; six small exact tests, no 100k candidate runtime',checkedSmallCases:cases.length,projected};
await writeFile('.artifacts/geo-a2-count-proof.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
