import assert from 'node:assert/strict';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {parse} from 'acorn';
const directory='agent_docs/impl/roadmap9/chart/route-native-stages-evidence';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=async dir=>(await Promise.all((await readdir(dir,{withFileTypes:true})).map(item=>item.isDirectory()?files(`${dir}/${item.name}`):item.name.endsWith('.js')?[`${dir}/${item.name}`]:[]))).flat();
const modules=new Map(),owners=new Map();
const walk=(node,visit)=>{if(!node||typeof node!=='object')return;visit(node);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(item=>walk(item,visit));else if(value&&typeof value==='object')walk(value,visit);};
for(const file of await files('src')){
 const text=await readFile(file,'utf8'),ast=parse(text,{ecmaVersion:'latest',sourceType:'module'}),imports=[];
 for(const node of ast.body){
  if((node.type==='ImportDeclaration'||node.type==='ExportNamedDeclaration'||node.type==='ExportAllDeclaration')&&node.source?.value.startsWith('.'))imports.push(path.posix.normalize(path.posix.join(path.posix.dirname(file),node.source.value)));

 }
 walk(ast,node=>{
  let name,kind;
  if((node.type==='VariableDeclarator'||node.type==='FunctionDeclaration')&&node.id?.type==='Identifier'){name=node.id.name;kind='declaration';}
  else if(file.startsWith('src/actions/')&&node.type==='AssignmentExpression'&&node.left.type==='MemberExpression'&&!node.left.computed){name=node.left.property.name;kind='assignment';}
  else if(file.startsWith('src/actions/')&&node.type==='Property'&&!node.computed&&node.key.type==='Identifier'){name=node.key.name;kind='table-key';}
  if(name){const list=owners.get(name)??[];list.push({file,line:text.slice(0,node.start).split('\n').length,kind});owners.set(name,list);}
 });
 modules.set(file,{imports,sha256:sha(text)});
}
const phases={source:'src/actions/data/resourcePlan.js',graph:'src/actions/graphs/routeClosure.js',screen:'src/actions/graphs/screenRoutes.js',canvas:'src/materialization/canvasResourceRevision.js',guide:'src/materialization/guides/layout.js',responsive:'src/materialization/responsiveLayout.js',fit:'src/actions/canvas/fitting.js',composition:'src/actions/composition/targets.js'};
const reach=(file,target,seen=new Set())=>file===target?true:seen.has(file)?false:(seen.add(file),(modules.get(file)?.imports??[]).some(next=>reach(next,target,seen)));
const old=JSON.parse(await readFile('agent_docs/impl/roadmap9/chart/density-schedule-evidence/native-union.json','utf8'));
const index=JSON.parse(await readFile('agent_docs/contract/ACTION_INDEX.json','utf8'));
const records=Object.values(old.groups).flat().map(record=>{assert.ok(index.actions.some(x=>x.name===record.action));const declarations=owners.get(record.action)??[];return {...record,declarations,staticImportReachability:Object.fromEntries(Object.entries(phases).map(([name,file])=>[name,declarations.some(x=>reach(x.file,file))])),runtimePositive:'pending',closedAdmission:'not-implemented'};});
assert.equal(records.length,332);assert.equal(new Set(records.map(r=>r.action)).size,332);
const seamNames=['reviseEdgeRouteResource','prepareEdgeRouteRevisions','planSourceResourceRevision','reviseSourceResourceInputs','prepareCanvasResourceRevision','applyCanvasResourceRevision','withGuideLayoutTransaction','withResponsiveLayout','editGraphLayout','prepareGraphResource','writePreparedGraphResource','applyRevisionPlan','reviseUnitData','reviseDerivedData','dispatchActionTargets'];
const seams=[];for(const name of seamNames)for(const owner of owners.get(name)??[]){const text=await readFile(owner.file,'utf8');seams.push({name,...owner,sha256:sha(text)});}
const report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),status:'read-only continuation seam inventory; static reachability is not execution or admission evidence',count:records.length,missingSourceLocations:records.filter(r=>!r.declarations.length).map(r=>r.action),phases,seams,records,constraints:['No runtime wildcard or unqualified 332-name allowlist.','Each phase must preserve native locals, IDs, ordering, failure and wrapped children.','No whole-action throw/retry, temporary straight route, candidate-program apply or async core action wrapper.','Public update surface remains absent until authentic closed native execution is connected.']};
await writeFile(`${directory}/audit.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({count:report.count,missingSourceLocations:report.missingSourceLocations,seams:seams.length}));
