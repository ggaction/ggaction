import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const prefix='.artifacts/route-native-resource', directory='agent_docs/impl/roadmap9/chart/route-native-resource-evidence';
const sha=value=>createHash('sha256').update(value).digest('hex');
const frozen=JSON.parse(await readFile(`${prefix}/frozen.json`,'utf8'));
assert.equal(sha(await readFile(frozen.file)),frozen.sha256);
const names=['docs-final.log','browser.json',...[20,22,24].flatMap(n=>[`owning-node${n}.log`,`installed-${n}.json`])];
await mkdir(`${directory}/receipts`,{recursive:true});const files=[];
for(const name of names){const bytes=await readFile(`${prefix}/${name}`),compressed=gzipSync(bytes,{level:9}),path=`${directory}/receipts/${name}.gz`;await writeFile(path,compressed);files.push({path,sha256:sha(compressed),uncompressedSha256:sha(bytes)});}
const previous=JSON.parse(await readFile('agent_docs/impl/roadmap9/chart/route-native-update-evidence/qualification.json','utf8'));
const paths=execFileSync('git',['ls-files','-mo','--exclude-standard'],{encoding:'utf8'}).trim().split('\n').filter(path=>path&&!path.includes('/receipts/')&&!path.endsWith('/qualification.json'));
const committed=execFileSync('git',['diff','--name-only','746f7847c','--'],{encoding:'utf8'}).trim().split('\n').filter(path=>path&&!path.includes('/receipts/')&&!path.endsWith('/qualification.json'));
const sources=[];for(const path of [...new Set([...previous.sources.map(item=>item.path),...paths,...committed])].sort())sources.push({path,sha256:sha(await readFile(path))});
const report={status:'verified-native-resource-update-checkpoint',base:'746f7847c',authorization:'Root adopted the concrete once-only synchronous invocation scope and persisted native-child inspection under remainingApproval.',archive:{file:frozen.file,sha256:frozen.sha256,entries:frozen.entryCount,packedBytes:frozen.size,unpackedBytes:frozen.unpackedSize},sources,files,claims:{publicBLayoutUpdate:true,publicBResourceUpdate:true,fullBUnion:false,latency100ms:false,largeCapacity:false,publication:false},limitations:['Current public update union contains five native resource edits on completed Full unit receivers only.','Direct14, focused21 and audited332 pending entries remain in union.json; composition/scoped/indirect viewport update work remains.','Initial own-data acquisition and clone remain synchronous with incomplete work/depth/whole-heap metering.','No cross-engine hash equivalence or whole-request 100ms guarantee.']};
await writeFile(`${directory}/qualification.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({sources:sources.length,receipts:files.length,archive:frozen.sha256}));
