import {findRepository} from './environment.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const repo = process.argv[2] ?? findRepository();
const out = path.resolve(import.meta.dirname, '../evidence');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd:repo,encoding:'utf8'}).trim();
const json = rel => JSON.parse(fs.readFileSync(path.join(repo, rel),'utf8'));
const read = rel => fs.readFileSync(path.join(repo,rel),'utf8');
const files = dir => fs.readdirSync(path.join(repo,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]);
const sources=files('src').filter(f=>f.endsWith('.js'));
const declarations=files('types').filter(f=>f.endsWith('.d.ts'));
const allText=new Map([...sources,...declarations].map(f=>[f,read(f)]));
const ref=(file,line)=>({file,line,url:`https://github.com/ggaction/ggaction/blob/${sha}/${file}#L${line}`});
const at=(file,index)=>ref(file,read(file).slice(0,index).split('\n').length);
const find=(file,needle)=>{const i=read(file).indexOf(needle);return i<0?null:at(file,i)};
const index=json('agent_docs/contract/ACTION_INDEX.json');
const cards=json('knowledge/action-cards.json');
const pkg=json('package.json');
const definitions=name=>sources.flatMap(file=>{
 const re=new RegExp(`(?:(?:export\\s+)?(?:const|function|class)\\s+${name}\\b|,\\s*${name}\\s*=)`,'g');
 return [...allText.get(file).matchAll(re)].map(m=>at(file,m.index));
});
const typed=name=>declarations.flatMap(file=>{
 const re=new RegExp(`^[\\t ]*(?:export\\s+(?:function|const)\\s+)?${name}(?:<[^>]+>)?(?:\\(|\\s*[:=])`,'gm');
 return [...allText.get(file).matchAll(re)].map(m=>at(file,m.index));
});
const moduleExports=[];
const load=rel=>import(pathToFileURL(path.join(repo,rel)).href);
for(const [entry,value] of Object.entries(pkg.exports)){
 const source=typeof value==='string'?value:value.import??value.default;
 try{const module=await load(source);moduleExports.push({entry,source,exports:Object.keys(module).sort()});}
 catch(error){moduleExports.push({entry,source,importError:String(error)});}
}
const {chart}=await load('src/index.js');
const {chart:basicChart}=await load('src/basic.js');
const methods=program=>{const names=new Set();for(let p=Object.getPrototypeOf(program);p&&p!==Object.prototype;p=Object.getPrototypeOf(p))for(const [k,d]of Object.entries(Object.getOwnPropertyDescriptors(p)))if(k!=='constructor'&&typeof d.value==='function')names.add(k);return [...names].sort();};
const fullMethods=methods(chart()),basicMethods=methods(basicChart());
const actions=index.actions.map(action=>{
 const card=(cards.actions??cards.cards).find(c=>c.name===action.name);
 const file=action.contract.file;
 const anchor=action.contract.anchor.replace(/^#/,'').toLowerCase();
 const contractText=read(file);
 const h=[...contractText.matchAll(/^#{1,6}\s+(.+)$/gm)].find(m=>m[1].replace(/`/g,'').toLowerCase().replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-')===anchor);
 let owners=definitions(action.name);
 if(!owners.length&&/^edit.+Scale$/.test(action.name)){const definition=find('src/actions/scales/channels.js',`${action.name}:`);if(definition)owners=[{...definition,kind:'generated-action-definition'}];}
 if(action.name==='editSemantic')owners=[{...find('src/actions/primitives/semantic.js','ProgramClass.prototype.editSemantic'),kind:'registration'},{...find('src/actions/primitives/semanticAction.js','op: "editSemantic"'),kind:'action-factory'}];
 return {...action,card,implementationDefinitions:owners,typeDeclarations:typed(action.name),contractSource:h?at(file,h.index):ref(file,1),runtime:{default:fullMethods.includes(action.name),basic:basicMethods.includes(action.name)}};
});
const vocabulary=Object.fromEntries(Object.entries(await load('src/core/vocabulary.js')).filter(([,v])=>typeof v!=='function'));
const scaleTypes=Object.fromEntries(Object.entries(await load('src/grammar/scales/types.js')).filter(([,v])=>typeof v!=='function'));
const additionalEnums={};
for(const file of ['src/grammar/curveCommands.js','src/grammar/aggregate.js','src/grammar/pointShapes.js','src/grammar/palettes.js','src/grammar/timeUnit.js','src/grammar/scales/size.js','src/grammar/scales/color.js','src/grammar/scales/fields.js','src/grammar/positionCompatibility.js','src/grammar/plotComposition.js','src/theme/defaults.js'])additionalEnums[file]={source:ref(file,1),values:Object.fromEntries(Object.entries(await load(file)).filter(([,v])=>typeof v!=='function'))};
const transformText=read('src/grammar/transforms.js');
const transformStart=transformText.indexOf('const TRANSFORM_POLICIES');
const transforms=[...transformText.slice(transformStart).matchAll(/^  ([a-zA-Z0-9]+): Object\.freeze\(/gm)].map(m=>({type:m[1],source:at('src/grammar/transforms.js',transformStart+m.index)}));
const counts=field=>Object.fromEntries([...new Set(actions.map(a=>a[field]))].map(v=>[v,actions.filter(a=>a[field]===v).length]));
const data={schemaVersion:1,generatedAt:new Date().toISOString(),repository:'https://github.com/ggaction/ggaction',commit:sha,packageVersion:pkg.version,notice:'Catalog status is an authoring contract claim, not proof of external rendering/interaction compatibility. Type strings are preserved verbatim from canonical cards; runtime restrictions may be stricter and are cited in the audit.',scan:{javascriptFilesEnumerated:sources.length,javascriptLinesEnumerated:sources.reduce((n,f)=>n+allText.get(f).split('\n').length,0),publicDeclarationFiles:declarations.length,publicDeclarationLines:declarations.reduce((n,f)=>n+allText.get(f).split('\n').length,0),note:'Machine enumeration and definition search, not a claim that every line was manually audited.'},counts:{total:actions.length,byLayer:counts('layer'),byDomain:counts('domain'),byLifecycle:counts('lifecycle'),byStatus:counts('status'),basicActions:actions.filter(a=>a.runtime.basic).length},moduleExports,prototypeMethods:{default:fullMethods,basic:basicMethods},actions,vocabulary,scaleTypes,additionalEnums,transforms,sources:{catalog:ref('agent_docs/contract/ACTION_INDEX.json',1),cards:ref('knowledge/action-cards.json',1),package:ref('package.json',1)}};
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'ggaction-inventory.json'),JSON.stringify(data,null,2)+'\n');
fs.writeFileSync(path.join(out,'ggaction-type-contracts.json'),JSON.stringify({commit:sha,notice:'Full public declaration texts preserve nested type definitions referenced by action-card option strings. Runtime validation remains authoritative for actual acceptance.',files:declarations.map(file=>({...ref(file,1),text:allText.get(file)}))},null,2)+'\n');
const esc=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const rows=[['name','layer','domain','lifecycle','status','runtime_default','runtime_basic','signature','option_names','implementation_sources','contract_source']];
for(const a of actions)rows.push([a.name,a.layer,a.domain,a.lifecycle,a.status,a.runtime.default,a.runtime.basic,a.card?.signature,(a.card?.options??[]).map(o=>o.name).join('|'),a.implementationDefinitions.map(r=>r.url).join('|'),a.contractSource.url]);
fs.writeFileSync(path.join(out,'ggaction-actions.csv'),rows.map(row=>row.map(esc).join(',')).join('\n')+'\n');
const anchors={};
for(const [label,file,needle]of[
 ['immutableState','src/core/ChartProgram.js','export class ChartProgram'],['actionWrapper','src/core/action.js','export function action('],['materializationPlan','src/materialization/planner.js','const STAGES'],['coordinateTypes','src/grammar/coordinates.js','const COORDINATE_TYPES'],['markTypes','src/core/vocabulary.js','MARK_TYPES'],['scaleTypes','src/grammar/scales/types.js','SCALE'],['graphicSchema','src/grammar/schemas/graphic.js','export'],['concreteValidation','src/grammar/schemas/concreteGraphic.js','export'],['computedGrammar','src/grammar/computed.js','const ARITHMETIC_BINARY'],['selectors','src/grammar/markSelection.js','const'],['scene','src/scene.js','export function createTransitionScene'],['sceneRenderer','src/renderers/canvas/scene.js','export function renderTransitionScene'],['persistenceState','src/persistence/validation.js','export const STATE_KEYS'],['persistence','src/persistence.js','export function serializeProgram'],['resourceLimits','src/core/validation.js','MAX_GENERATED_ITEMS'],['pathLimits','src/grammar/pathCommands.js','MAX_PATH_COMMANDS'],['themes','src/theme/defaults.js','export'],['inspection','types/inspection.d.ts','export function getMarkItems'],['accessibility','types/accessibility.d.ts','export function exportAccessibleData'],['rasterLimits','src/renderers/canvas/limits.js','export']]){
 if(fs.existsSync(path.join(repo,file)))anchors[label]=find(file,needle)??ref(file,1);
}
fs.writeFileSync(path.join(out,'ggaction-source-anchors.json'),JSON.stringify(anchors,null,2)+'\n');
console.log(JSON.stringify({commit:sha,counts:data.counts,moduleExports,actionsWithoutDefinitions:actions.filter(a=>!a.implementationDefinitions.length).map(a=>a.name),runtimeNonmethods:actions.filter(a=>!a.runtime.default).map(a=>a.name),transforms:transforms.map(t=>t.type)},null,2));
