import test from 'node:test';
import assert from 'node:assert/strict';
import {chart} from '../../../../src/index.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
const rows=[{x:1,y:2,g:'A'},{x:2,y:4,g:'B'},{x:3,y:6,g:'A'}];
const base=()=>chart().createCanvas({plot:{width:314,height:314},margin:170}).createData({id:'rows',values:rows})
 .createScatterPlot({id:'plot',data:'rows',x:'x',y:'y',color:'g'}).createMarkLabels({id:'labels',source:'plot',field:'g'});
const texts=p=>p.graphicSpec.objects.labels.items.map(i=>i.properties.text);
test('semantic overrides preserve values, position, multiline geometry and replay',()=>{
 const p=base(), snapshot=JSON.stringify(p), override={match:{fields:{g:'A'},channels:{x:3}},occurrence:0,text:'Third\n\nitem'};
 const n=p.editTextMark({target:'labels',textOverrides:[override]});
 assert.deepEqual(texts(n),['A','B','Third\n\nitem']);
 assert.deepEqual(n.semanticSpec,p.semanticSpec);assert.deepEqual(n.resolvedScales,p.resolvedScales);
 assert.equal(JSON.stringify(p),snapshot);assert.equal(n.graphicSpec.objects.labels.items[2].properties.lines.length,3);
 assert.deepEqual(texts(n.editCanvas({plot:{width:340,height:314}})),texts(n));
 assert.deepEqual(texts(deserializeProgram(serializeProgram(n))),texts(n));
 assert.deepEqual(texts(n.editTextMark({target:'labels',fontSize:15})),texts(n));
 assert.deepEqual(texts(n.editTextMark({target:'labels',textOverrides:'auto'})),texts(p));
});
test('occurrence and full semantic match do not follow rendered indices after data filtering',()=>{
 const n=base().editTextMark({target:'labels',textOverrides:[{match:{fields:{x:3,y:6,g:'A'}},occurrence:0,text:'last'}]});
 const filtered=n.filterMarks({target:'plot',field:'x',op:'gte',value:2});
 assert.deepEqual(texts(filtered),['B','last']);
 const absent=n.filterMarks({target:'plot',field:'x',op:'lt',value:3});assert.deepEqual(texts(absent),['A','B']);
 const duplicated=base().editTextMark({target:'labels',textOverrides:[{match:{fields:{g:'A'}},occurrence:1,text:'second A'}]});
 assert.deepEqual(texts(duplicated),['A','B','second A']);
});
test('row text uses typed field and encoded channel identity; invalid selectors reject atomically',()=>{
 const p=chart().createCanvas({plot:{width:314,height:314},margin:170}).createData({id:'rows',values:rows})
  .createTextPlot({id:'labels',data:'rows',x:'x',y:'y',text:'g'});
 const entry={match:{fields:{g:'A'},channels:{x:1}},occurrence:0,text:'literal <b>\ntext'};
 assert.deepEqual(texts(p.editTextMark({target:'labels',textOverrides:[entry]})),['literal <b>\ntext','B','A']);
 for(const value of [[{...entry,match:{}}],[{...entry,occurrence:-1}],[{...entry,match:{fields:{x:NaN}}}],[entry,entry]]){
  assert.throws(()=>p.editTextMark({target:'labels',textOverrides:value}));
 }
});
