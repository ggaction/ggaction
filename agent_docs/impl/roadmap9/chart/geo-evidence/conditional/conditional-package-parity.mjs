import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parse} from 'acorn';
import {compactPackageJavaScript} from '../../scripts/package-artifact.js';
const source=await fs.readFile('scripts/package-artifact.js','utf8');
const program=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const values=name=>program.body.find(node=>node.type==='VariableDeclaration'&&node.declarations[0].id.name===name).declarations[0].init.arguments[0].elements.map(node=>node.value);
const js=new Set(values('COMPACT_JAVASCRIPT_FILES')),json=new Set(values('COMPACT_JSON_FILES'));
const inputs=JSON.parse(await fs.readFile('.artifacts/geo/conditional/package-inputs.json','utf8'));
const mismatches=[],rawInputs=[];
for(const {file,sha256}of inputs){const raw=await fs.readFile(file);rawInputs.push({file,sha256:createHash('sha256').update(raw).digest('hex')});const packed=js.has(file)?compactPackageJavaScript(raw.toString(),{keepNames:file==='knowledge/task-resolver.js'}):json.has(file)?JSON.stringify(JSON.parse(raw)):raw;
if(createHash('sha256').update(packed).digest('hex')!==sha256)mismatches.push(file);}
const artifact=JSON.parse(await fs.readFile('.artifacts/geo/conditional/package.json','utf8'));
const report={sha256:artifact.sha256,files:inputs.length,canonicalPackageTransforms:true,mismatches};
await fs.writeFile('.artifacts/geo/conditional/package-source-inputs.json',JSON.stringify(rawInputs,null,2));
await fs.writeFile('.artifacts/geo/conditional/package-input-parity.json',JSON.stringify(report,null,2));console.log(report);
if(mismatches.length)process.exitCode=1;
