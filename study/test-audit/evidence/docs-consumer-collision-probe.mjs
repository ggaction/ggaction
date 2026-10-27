import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const root='/Users/hj/Desktop/ggaction_chongjeonglee/ggaction';
const evidence=path.dirname(new URL(import.meta.url).pathname);
const {documentationPrograms}=await import(pathToFileURL(path.join(root,'scripts/doc-snippets.js')));
// Expose only the existing private preparation function in an external module.
let source=await readFile(path.join(root,'scripts/tutorial-consumer.js'),'utf8');
source=source.replace('const root = fileURLToPath(new URL("../", import.meta.url));',`const root = ${JSON.stringify(root)};`)
 .replace('from "playwright"',`from ${JSON.stringify(pathToFileURL(path.join(root,'node_modules/playwright/index.mjs')).href)}`)
 .replace('from "vite"',`from ${JSON.stringify(pathToFileURL(path.join(root,'node_modules/vite/dist/node/index.js')).href)}`)
 .replace('from "./doc-snippets.js"',`from ${JSON.stringify(pathToFileURL(path.join(root,'scripts/doc-snippets.js')).href)}`)
 .replace('from "../test/support/docs-inputs.js"',`from ${JSON.stringify(pathToFileURL(path.join(root,'test/support/docs-inputs.js')).href)}`);
source+='\nexport {prepareTutorials};\n';
const {prepareTutorials}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const directory=await mkdtemp(path.join(tmpdir(),'ggaction-audit-snippets-'));
try {
 const {inputs,consumers}=await prepareTutorials(directory);
 const result={registered:(await documentationPrograms()).length,consumers:consumers.length,buildInputs:Object.keys(inputs).length,overwritten:[]};
 for(const example of await documentationPrograms()){
  const name=example.file.replace(/\.md$/,'').replaceAll('/','-');
  const prepared=await readFile(path.join(directory,'tutorials',name,'main.js'),'utf8');
  if(!prepared.includes(example.code)) result.overwritten.push({file:example.file,id:example.id??'primary',result:example.result});
 }
 assert.equal(result.overwritten.length,5);
 await writeFile(path.join(evidence,'docs-consumer-collision-result.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}finally{await rm(directory,{recursive:true,force:true});}
