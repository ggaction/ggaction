import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {preparePackageConsumer} from '../../../../../scripts/package-consumer.js';
import {root,run} from '../../../../../scripts/consumers/runtime.js';
const archive=JSON.parse(await readFile(process.argv[2],'utf8'));
assert.equal(createHash('sha256').update(await readFile(archive.file)).digest('hex'),archive.sha256);
const output=path.resolve(process.argv[3]);await mkdir(output,{recursive:true});
const consumer=await preparePackageConsumer({packageSpec:archive.file});
const receipt={node:process.version,archive:archive.sha256,sourceFree:true,fixtures:[]};
try{
 for(const name of ['product-100000-phased','product-partition-10000-phased']){
  let source=await readFile(path.join(root,'agent_docs/impl/roadmap9/qualification/animation-v4-evidence',name+'.mjs.txt'),'utf8');
  source=source.replace("from '../../src/index.js'","from 'ggaction'").replace("from '../../src/animation.js'","from 'ggaction/animation'").replaceAll("from '../../src/","from './node_modules/ggaction/src/");
  source=source.replace("const folder='.artifacts/animation-v4';",'const folder='+JSON.stringify(output)+';');
  source=source.replace("hash(await readFile(file))","hash(await readFile(new URL('./node_modules/ggaction/'+file,import.meta.url)))");
  assert.ok(!source.includes("../../src/"));
  const executable=path.join(consumer.directory,name+'.mjs');await writeFile(executable,source);await writeFile(path.join(output,name+'.executed.mjs.txt'),source);
  run(process.execPath,['--expose-gc','--max-old-space-size=6144',executable],root,{stdio:'inherit'});
  const result=JSON.parse(await readFile(path.join(output,name+'.json'),'utf8'));
  const hashes={};for(const [file,sha]of Object.entries(result.sourceSHA256)){hashes[file]=createHash('sha256').update(await readFile(path.join(root,file))).digest('hex');assert.equal(hashes[file],sha);}
  receipt.fixtures.push({name,status:'passed',sourceSHA256:hashes,result:path.join(output,name+'.json')});await writeFile(path.join(output,'qualification.json'),JSON.stringify(receipt,null,2)+'\n');
 }
 receipt.status='passed';
}finally{await writeFile(path.join(output,'qualification.json'),JSON.stringify(receipt,null,2)+'\n');await consumer.cleanup();}
console.log(JSON.stringify(receipt));
