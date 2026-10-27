import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import path from 'node:path';
const root='/Users/hj/Desktop/ggaction_chongjeonglee/ggaction';
const dir=path.dirname(new URL(import.meta.url).pathname);
const candidate=JSON.parse(await readFile(path.join(dir,'published-candidate/candidate.json')));
const digest=(bytes,algorithm='sha256',encoding='hex')=>createHash(algorithm).update(bytes).digest(encoding);
async function get(url){const r=await fetch(url);assert.equal(r.status,200,url);return Buffer.from(await r.arrayBuffer());}
const registry=JSON.parse(await get('https://registry.npmjs.org/ggaction'));
assert.equal(registry['dist-tags'].latest,candidate.version);
const published=registry.versions[candidate.version];
assert.equal(published.dist.shasum,candidate.sha1);
const bytes=await get(published.dist.tarball);
assert.equal(digest(bytes),candidate.sha256);
assert.equal('sha512-'+digest(bytes,'sha512','base64'),published.dist.integrity);
const documents=[];
for(const file of ['doc-provenance.json','llms-manifest.json','llms-full.txt','llms.txt']){
 const local=await readFile(path.join(root,'docs',file));
 const remote=await get('https://ggaction.github.io/ggaction/'+file);
 assert.equal(digest(remote),digest(local),file);
 documents.push({file,bytes:remote.length,sha256:digest(remote)});
}
const provenance=JSON.parse(await readFile(path.join(root,'docs/doc-provenance.json')));
assert.equal(provenance.packageVersion,candidate.version);
const homepage=await get('https://ggaction.github.io/ggaction/');
assert.ok(homepage.toString('utf8').includes(`>${candidate.version}</a>`),'Published documentation version badge');
assert.ok(homepage.toString('utf8').includes(`<strong>ggaction ${candidate.version}</strong>`),'Published documentation footer');
const versionPage=await get('https://ggaction.github.io/ggaction/version/');
assert.ok(versionPage.toString('utf8').includes(provenance.contractId),'Published release contract');
const result={verifiedAt:new Date().toISOString(),version:candidate.version,tag:candidate.tag,commit:candidate.commit,registryTarball:published.dist.tarball,sha256:candidate.sha256,integrity:published.dist.integrity,contractId:provenance.contractId,homepageSha256:digest(homepage),versionPageSha256:digest(versionPage),documents};
await writeFile(path.join(dir,'public-release-verification.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
