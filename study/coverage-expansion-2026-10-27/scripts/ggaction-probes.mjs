import {findRepository} from './environment.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const repo=process.argv[2]??findRepository();
const load=p=>import(pathToFileURL(path.join(repo,p)).href);
const {chart}=await load('src/index.js');
const {getMarkItems,inspectProgram,comparePrograms}=await load('src/inspection.js');
const {serializeProgram,deserializeProgram}=await load('src/persistence.js');
const {createTransitionScene}=await load('src/scene.js');
const {exportAccessibleData}=await load('src/accessibility.js');
const {renderToSVG}=await load('src/renderers/svg.js');
const results=[];
const probe=(id,expected,fn)=>{try{const evidence=fn();results.push({id,expected,result:'accepted',matchedExpectation:expected==='accept',evidence});}catch(error){results.push({id,expected,result:'rejected',matchedExpectation:expected==='reject',error:{name:error.name,message:error.message}});}};
const rows=[{id:'a',x:1,y:2,group:'A'},{id:'b',x:2,y:1,group:'B'},{id:'c',x:3,y:4,group:'A'}];
let base;
probe('cartesian-native-scatter-and-inspection','accept',()=>{
 base=chart().createCanvas({width:600,height:420,margin:80}).createData({id:'d',values:rows}).createScatterPlot({id:'p',data:'d',x:'x',y:'y',color:'group'});
 const items=getMarkItems(base,{target:'p'});
 return {items,inspection:inspectProgram(base),accessible:exportAccessibleData(base),programFrozen:Object.isFrozen(base),svgCharacters:renderToSVG(base).length};
});
if(!base){console.error(JSON.stringify(results,null,2));throw new Error('Probe fixture failed; no dependent results are trustworthy.');}
probe('named-row-selection-highlight-and-persistence','accept',()=>{
 const selected=base.selectMarks({id:'sel',target:'p',rows:{data:'d',indices:[0,2]}}).highlightMarks({selection:'sel',color:'#e64343',dimOthers:{opacity:0.2}});
 const serialized=serializeProgram(selected);const restored=deserializeProgram(serialized);
 return {sourceUnchanged:base.materializationConfigs.selections?.sel===undefined,selection:restored.materializationConfigs.selections.sel,highlight:restored.materializationConfigs.highlights.sel,comparison:comparePrograms(selected,restored),bytes:Buffer.byteLength(serialized),renderIdentical:renderToSVG(selected)===renderToSVG(restored)};
});
probe('transition-scene-producer-stable-style-keys','accept',()=>{
 const after=base.editPointMark({target:'p',opacity:0.5});
 const svg=createTransitionScene(base),canvas=createTransitionScene(base,{format:'canvas'}),next=createTransitionScene(after,{format:'canvas'});
 return {svgVersion:svg.version,canvasVersion:canvas.version,nodeTypes:[...new Set(canvas.nodes.map(n=>n.type))],nodeCount:canvas.nodes.length,allKeysEqual:JSON.stringify(canvas.nodes.map(n=>n.key))===JSON.stringify(next.nodes.map(n=>n.key)),programAndScenesFrozen:[base,svg,canvas].every(Object.isFrozen),sceneHasClockOrPlayer:Object.keys(canvas).some(k=>/timeline|clock|play|duration|easing/i.test(k))};
});
probe('native-rose-from-semantic-fields','accept',()=>{
 const p=chart().createCanvas({width:500,height:500,margin:80}).createData({id:'d',values:rows}).createRosePlot({id:'rose',category:'group',value:'y',aggregate:'sum',guides:false});
 return {coordinate:p.semanticSpec.coordinates,markTypes:p.semanticSpec.layers.map(l=>l.mark.type),itemCount:getMarkItems(p,{target:'rose'}).length,svgCharacters:renderToSVG(p).length};
});
probe('native-scatter-facet-shared-scales','accept',()=>{
 const p=base.facet({field:'group',data:'d',columns:2,scales:{x:'shared',y:'shared'}});
 return {compositionType:p.compositionSpec.type,children:p.compositionSpec.children,svgCharacters:renderToSVG(p).length,sceneNodes:createTransitionScene(p,{format:'canvas'}).nodes.length};
});
probe('immutable-data-revision-and-scene-row-identity','accept',()=>{
 const next=base.reviseData({source:'d',id:'d-v2',values:rows.map((r,i)=>i===0?{...r,y:9}:r)});
 const before=createTransitionScene(base,{format:'canvas'}),after=createTransitionScene(next,{format:'canvas'});
 const a=before.nodes.filter(n=>n.type==='circle').map(n=>n.key),b=after.nodes.filter(n=>n.type==='circle').map(n=>n.key);
 return {sourceRows:base.semanticSpec.datasets.find(d=>d.id==='d').values,revisedDatasets:next.semanticSpec.datasets.map(d=>d.id),beforePointKeys:a,afterPointKeys:b,sharedPointKeys:a.filter(k=>b.includes(k)),note:'Source id/revision and value membership participate in scene correspondence. Equal user id field alone is not an explicit keyed-update contract.'};
});
probe('coordinate-geographic','reject',()=>chart().createCoordinate({id:'geo',type:'geographic'}));
probe('automatic-scatter-guides-small-margin-layout','reject',()=>chart().createCanvas({width:400,height:260,margin:35}).createData({id:'d',values:rows}).createScatterPlot({id:'p',data:'d',x:'x',y:'y',color:'group'}));
probe('coordinate-mercator','reject',()=>chart().createCoordinate({id:'geo',type:'mercator'}));
probe('graphic-image','reject',()=>chart().createGraphics({id:'image',type:'image'}));
probe('data-url-source','reject',()=>chart().createData({id:'remote',url:'https://example.com/data.json',values:[]}));
probe('computed-trigonometry-sin','reject',()=>base.createComputedData({id:'sin-data',source:'d',as:'s',expression:{op:'sin',operand:{field:'x'}}}));
probe('computed-calendar-month','reject',()=>base.createComputedData({id:'month-data',source:'d',as:'m',expression:{op:'datePart',part:'month',operand:{constant:0}}}));
probe('point-shadow-option','reject',()=>base.editPointMark({target:'p',shadowBlur:4}));
probe('path-single-subpath','accept',()=>{
 const p=chart().createCanvas({width:100,height:100,margin:0}).createGraphics({id:'path',type:'path'}).editGraphics({target:'path',property:'commands',value:[{op:'M',x:1,y:1},{op:'L',x:80,y:1},{op:'L',x:80,y:80},{op:'Z'}]});
 return {commands:p.graphicSpec.objects.path.properties.commands};
});
probe('path-multiple-subpaths-polygon-hole','reject',()=>chart().createGraphics({id:'path',type:'path'}).editGraphics({target:'path',property:'commands',value:[{op:'M',x:0,y:0},{op:'L',x:10,y:0},{op:'L',x:10,y:10},{op:'Z'},{op:'M',x:2,y:2},{op:'L',x:8,y:2},{op:'L',x:8,y:8},{op:'Z'}]}));
probe('path-fill-rule','reject',()=>chart().createGraphics({id:'path',type:'path'}).editGraphics({target:'path',property:'fillRule',value:'evenodd'}));
probe('svg-arc-command','reject',()=>chart().createGraphics({id:'path',type:'path'}).editGraphics({target:'path',property:'commands',value:[{op:'M',x:0,y:0},{op:'A',rx:2,ry:2,x:5,y:5}]}));
const allMethods=new Set();for(let p=Object.getPrototypeOf(base);p&&p!==Object.prototype;p=Object.getPrototypeOf(p))for(const[k,d]of Object.entries(Object.getOwnPropertyDescriptors(p)))if(typeof d.value==='function')allMethods.add(k);
const absent=['hitTest','bindInteraction','createInteraction','createSelectionParameter','createProjection','createGeoData','createGeoShapeMark','createImageMark','createAnimation','play','pause','seek','appendData','subscribe','dispose'];
results.push({id:'proposed-runtime-method-absence',expected:'not-present',result:'observed',matchedExpectation:absent.every(k=>!allMethods.has(k)),evidence:Object.fromEntries(absent.map(k=>[k,allMethods.has(k)])),caution:'Checks these exact method names only. Stronger absence evidence is the exhaustive runtime exports/action inventory plus concrete validators, not this name search alone.'});
const evidence={schemaVersion:1,generatedAt:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),scope:'Focused native API/negative capability probes; not a full unit, render, browser, compatibility, or performance suite.',results,allMatched:results.every(r=>r.matchedExpectation)};
fs.writeFileSync(path.resolve(import.meta.dirname,'../evidence/ggaction-probes.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({allMatched:evidence.allMatched,results:results.map(({id,result,matchedExpectation,error})=>({id,result,matchedExpectation,error}))},null,2));
if(!evidence.allMatched)process.exitCode=1;
