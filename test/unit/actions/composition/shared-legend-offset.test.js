import test from 'node:test';
import assert from 'node:assert/strict';
import { chart, hconcat } from '../../../../src/index.js';
import { serializeProgram, deserializeProgram } from '../../../../src/persistence.js';

function unit(){
 return chart().createCanvas({plot:{width:314,height:314},margin:180})
  .createData({values:Array.from({length:12},(_,i)=>({x:i+1,y:i*2+3,g:i%2?'A':'B'}))})
  .createScatterPlot({id:'p',x:'x',y:'y',color:{field:'g',fieldType:'nominal'}})
  .createLegend({target:'p',channels:['color']}).createTitle({text:'Title'});
}
for(const facet of [false,true])test(`shared legend offsets validate visible composition geometry (facet=${facet})`,()=>{
 const child=facet?unit().facet({field:'g',columns:2,guides:{axes:'outer',legend:'shared'}}):unit();
 const p=hconcat({programs:[{id:'a',program:child},{id:'b',program:child}],share:{color:true}});
 const target=['a','b'].map(id=>({childPath:[id],...(facet?{}:{id:'p'})}));
 const before=serializeProgram(p);
 const q=p.editLegend({target,channel:'color',position:'bottom',offset:16,alongOffset:-12});
 assert.deepEqual(deserializeProgram(serializeProgram(q)).graphicSpec,q.graphicSpec);
 assert.equal(serializeProgram(p),before);
 assert.ok(!serializeProgram(q).includes("compositionCollectedLegends"));
 for(const c of Object.values(q.children))assert.equal(c.context.compositionCollectedLegends,undefined);
 // Subsequent guide regeneration and unrelated edits use the same visibility.
 const regenerated=q.createGuides({target:target.map(({childPath})=>({childPath}))});
 const edited=regenerated.editTitle({target:{childPath:['a']},text:'Updated'});
 assert.equal(edited.children.a.semanticSpec.title.text,'Updated');
});

test('standalone and actually visible collisions still reject atomically',()=>{
 const child=unit();
 assert.throws(()=>child.editLegend({target:'p',channel:'color',position:'bottom',offset:16,alongOffset:0}),/overlap/);
 const p=hconcat({programs:[{id:'a',program:child},{id:'b',program:child}],share:{color:true}});
 const target=['a','b'].map(id=>({childPath:[id],id:'p'}));
 const q=p.editLegend({target,channel:'color',position:'bottom',offset:16,alongOffset:0});
 const before=serializeProgram(q);
 assert.throws(()=>q.editLegend({target,channel:'color',alongOffset:-200}),/overlap/);
 assert.equal(serializeProgram(q),before);
});
