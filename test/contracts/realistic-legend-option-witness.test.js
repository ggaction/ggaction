import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../src/index.js';
import {realisticRecordView} from '../support/scenarios/realistic-data.js';
import {appendFacadeLegendCombinations} from '../support/scenarios/realistic-facade-legend-combinations.js';
import {appendLegendCombinationLifecycle} from '../support/scenarios/realistic-legend-combination-lifecycle.js';

function at(value,path){return path.split('.').reduce((value,key)=>value?.[key],value);}
test('new legend option and selector witnesses retain five calls and three authentic datasets',()=>{
 const requirements=[];
 const channels=['color','stroke','strokeDash','strokeWidth','shape','size','opacity'];
 for(const action of ['editLegend','editLegendLayout','editLegendLabels','editLegendTitle','editLegendSymbols','editLegendBorder','editLegendBlock']) {
  for(const channel of channels) requirements.push({id:`${action}.channel=${channel}`,action,test:args=>args.channel===channel});
 }
 for(const action of ['createLegend','editLegend','createGuides']) for(const combine of ['separate','size-shape','color-size']) requirements.push({id:`${action}.combine=${combine}`,action,test:args=>at(args,action==='createGuides'?'legend.combine':'combine')===combine});
 for(const action of ['createLegend','createGuides','editLegend','editLegendSymbols','editLegendBlock']) {
  const path=action==='createGuides'?'legend.clipHeight':'clipHeight';
  requirements.push({id:`${action}.${path}`,action,test:args=>typeof at(args,path)==='number'});
  if(action.startsWith('edit')) requirements.push({id:`${action}.clipHeight=auto`,action,test:args=>args.clipHeight==='auto'});
 }
 for(const action of ['editLegend','editLegendLayout','editLegendBlock']) for(const position of ['right','left','top','bottom','top-left','top-right','bottom-left','bottom-right','inherit']) requirements.push({id:`${action}.position=${position}`,action,test:args=>args.position===position});
 for(const action of ['createLegend','createGuides','editLegend','editLegendSymbols']) {
  const prefix=action==='createGuides'?'legend.':'';
  requirements.push({id:`${action}.symbol.opacity`,action,test:args=>typeof at(args,`${prefix}symbol.opacity`)==='number'});
  for(const opacity of [0,0.7,1]) requirements.push({id:`${action}.layers.opacity=${opacity}`,action,test:args=>at(args,`${prefix}symbol.layers`)?.some(layer=>layer.opacity===opacity)});
 }
 for(const action of ['createLegend','createGuides','editLegendBorder']) requirements.push({id:`${action}.border.strokeDash`,action,test:args=>Array.isArray(at(args,action==='createGuides'?'legend.border.strokeDash':'border.strokeDash'))});
 for(const path of ['symbol.opacity','labelMap']) requirements.push({id:`editLegendBlock.${path}`,action:'editLegendBlock',test:args=>at(args,path)!==undefined});
 const stats=new Map(requirements.map(r=>[r.id,{calls:0,datasets:new Set()}]));

 for(const dataset of ['tt-tour-de-france-winners','tt-london-marathon-winners','tt-penguins']) for(let repetition=0;repetition<5;repetition++) {
  const view=realisticRecordView(dataset,{rowLimit:24});
  const rows=view.rows.map((row,index)=>({...row,rank:index+1}));
  const source=chart().createCanvas({width:4400,height:3200,margin:1000}).createData({id:'analysisRows',values:rows});
  const calls=[];
  // Observe successful public inputs before trace array summarization. Binding
  // each method to the real immutable program leaves its implementation intact.
  const observe=program=>new Proxy(program,{get(target,key){
   const value=Reflect.get(target,key);
   if(typeof value!=='function') return value;
   return (...args)=>{const result=Reflect.apply(value,target,args);calls.push({op:key,args:structuredClone(args[0]??{})});return observe(result);};
  }});
  const program=appendLegendCombinationLifecycle(observe(source));
  assert.deepEqual(program.semanticSpec.datasets.find(data=>data.id==='analysisRows').values,rows);
  for(const requirement of requirements) {
   const count=calls.filter(call=>call.op===requirement.action&&requirement.test(call.args)).length;
   if(count>0){const record=stats.get(requirement.id);record.calls+=count;record.datasets.add(dataset);}
  }
 }
 assert.deepEqual([...stats].filter(([,v])=>v.calls<5||v.datasets.size<3).map(([id,v])=>`${id}: ${v.calls}/${v.datasets.size}`),[]);
});

for(const dataset of ['tt-tour-de-france-winners','tt-london-marathon-winners','tt-penguins']) test(`point-owned facade combinations execute five times on ${dataset}`,()=>{
 const view=realisticRecordView(dataset,{rowLimit:24});
 const p=chart().createCanvas({width:3000,height:2200,margin:700}).createData({id:'analysisRows',values:view.rows});
 for(let repetition=0;repetition<5;repetition++) for(const action of ['createScatterPlot','createPolarScatterPlot','createStripPlot','createBeeswarmPlot','createRaincloudPlot']) {
  const result=appendFacadeLegendCombinations(p,{action,xField:'orderNumeric',yField:'value',numberField:'value',categoryField:'category',modes:action==='createPolarScatterPlot'||action==='createRaincloudPlot'?['size-shape']:['size-shape','color-size']});
  assert.deepEqual(result.semanticSpec.datasets.find(d=>d.id==='analysisRows').values,view.rows);
 }
});
