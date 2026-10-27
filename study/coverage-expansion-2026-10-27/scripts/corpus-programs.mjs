import {findRepository} from './environment.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const gg=findRepository();
const require=createRequire(path.join(gg,'package.json'));
const {parse}=require('acorn');
const root=path.join(base,'sources/chart-datasets');
const results=[],totalMethods={},g1Methods={},stages={},failures=[];
const inc=(o,k)=>o[k]=(o[k]||0)+1;
for(const id of fs.readdirSync(path.join(root,'charts')).sort()){
 const dir=path.join(root,'charts',id),meta=JSON.parse(fs.readFileSync(path.join(dir,'metadata.json'),'utf8'));
 for(const stage of meta.stages){
  const code=fs.readFileSync(path.join(dir,stage.code),'utf8');
  try{
   const ast=parse(code,{ecmaVersion:'latest',sourceType:'module',locations:true});
   const calls=[],imports=[],flags=[];
   function walk(node){
    if(!node||typeof node!=='object')return;
    if(node.type==='ImportDeclaration')imports.push({source:node.source.value,bindings:node.specifiers.map(s=>s.local.name),line:node.loc.start.line});
    if(node.type==='CallExpression'&&node.callee.type==='MemberExpression'){
      const name=node.callee.computed?node.callee.property.value:node.callee.property.name;
      calls.push({name,line:node.loc.start.line});
      inc(totalMethods,name);if(stage.level==='G1')inc(g1Methods,name);
    }
    if(['ForStatement','ForOfStatement','ForInStatement','WhileStatement','DoWhileStatement','AssignmentExpression'].includes(node.type))flags.push({type:node.type,line:node.loc.start.line});
    if(node.type==='MemberExpression'&&['graphicSpec','semanticSpec','rawImports','scenegraph'].includes(node.property?.name))flags.push({type:'internal-state-reference',property:node.property.name,line:node.loc.start.line});
    for(const [k,v]of Object.entries(node)){if(['loc','start','end'].includes(k))continue;if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object')walk(v);}
   }
   walk(ast);inc(stages,stage.level);
   results.push({id,stage:stage.level,file:`charts/${id}/${stage.code}`,sourceBytes:Buffer.byteLength(code),declaredActions:stage.actions,memberCallSites:calls,imports,flags});
  }catch(e){failures.push({id,stage:stage.level,error:e.message});}
 }
}
const g1=results.filter(x=>x.stage==='G1');
const counts=g1.map(x=>x.memberCallSites.length).sort((a,b)=>a-b);
const summary={method:'Acorn syntax census of every accepted program; member call sites include helper calls and are not dynamic action counts. Flags are review candidates, not evidence of wrongdoing.',programs:results.length,stages,parseFailures:failures,g1MemberCallSites:{min:counts[0],median:counts[Math.floor(counts.length/2)],max:counts.at(-1)},allMemberMethods:totalMethods,g1MemberMethods:g1Methods,programsWithSyntaxFlags:results.filter(x=>x.flags.length).length,g1WithSyntaxFlags:g1.filter(x=>x.flags.length).length};
fs.writeFileSync(path.join(base,'evidence/translations-programs.json'),JSON.stringify(results,null,2));
fs.writeFileSync(path.join(base,'evidence/translations-program-summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary));
