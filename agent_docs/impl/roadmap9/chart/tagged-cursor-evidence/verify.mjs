import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';
const here=import.meta.url,q=JSON.parse(await readFile(new URL('qualification.json',here)));
for(const [file,hash] of Object.entries(q.sourceSHA256))assert.equal(createHash('sha256').update(await readFile(file)).digest('hex'),hash,file);
assert.equal(execFileSync('git',['diff',q.baseline,'--','src','scripts','types','test','docs','README.md','package.json'],{encoding:'utf8'}),'');
for(const node of [20,22,24]){const r=JSON.parse(await readFile(new URL(`audit-${node}.json`,here)));assert.equal(r.status,'research-prototype-only');assert.equal(r.groups[0].cases,138);assert.equal(r.groups[1].units,node===22?65536:256);assert.equal(r.groups.at(-1).boundaries,16);assert.equal(r.productChanges,0);assert.deepEqual(r.source,q.scalarSource);}
const b=JSON.parse(await readFile(new URL('browser.json',here)));assert.equal(b.bytesEqual,true);assert.equal(b.hash,b.oracle);for(const result of b.aborts){assert.equal(result.publications,0);assert.equal(result.terminals,1);assert.equal(result.cleared,true);}
console.log('read-only source pin, 3Node cursor evidence, Chromium bytes/hash and macrotask cancellation verified');
