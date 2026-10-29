// Run from the repository root with an absolute, already-qualified package tar.
import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root=process.cwd();
const {preparePackageConsumer}=await import(pathToFileURL(path.join(root,'scripts/package-consumer.js')));
const consumer=await preparePackageConsumer({packageSpec:path.resolve(process.argv[2])});
try {
 const files=['observed-graphs.mjs','inferred-graphs.mjs'];
 for(const file of files) await writeFile(path.join(consumer.directory,file),await readFile(path.join(root,'scripts/consumers/fixtures/node',file)));
 await writeFile(path.join(consumer.directory,'verify.mjs'),'const records=[];for(const file of '+JSON.stringify(files)+'){const {cases}=await import("./"+file);for(const entry of cases){await entry.run();records.push({id:entry.id,status:"passed"})}}console.log(JSON.stringify({node:process.version,records}));');
 process.stdout.write(execFileSync(process.execPath,['verify.mjs'],{cwd:consumer.directory,encoding:'utf8'}));
} finally {await consumer.cleanup();}
