import test from 'node:test';
import assert from 'node:assert/strict';
import {chart} from '../../../../src/ChartProgram.js';

function source(){return chart().createGraphics({id:'canvas',type:'canvas'})
  .createGraphics({id:'group',type:'collection',parent:'canvas'})
  .editGraphics({target:'group',property:'clip',value:{x:0,y:0,width:10,height:10}})
  .createGraphics({id:'a',type:'circle',length:2,parent:'group'})
  .createGraphics({id:'b',type:'text',parent:'group'})
  .createGraphics({id:'outside',type:'rect',parent:'canvas'});}

test('child-order edits change only one named container array and retain every graphic identity',()=>{
  const p=source(),snapshot=JSON.stringify(p.graphicSpec),ids=Object.freeze(['b','a']);
  const q=p.editGraphics({target:'group',property:'children',value:ids});
  assert.deepEqual(q.graphicSpec.objects.group.children,['b','a']);
  assert.deepEqual(Object.keys(q.graphicSpec.objects),Object.keys(p.graphicSpec.objects));
  assert.equal(q.graphicSpec.objects.a,p.graphicSpec.objects.a);
  assert.equal(q.graphicSpec.objects.b,p.graphicSpec.objects.b);
  assert.equal(q.graphicSpec.objects.group.items,p.graphicSpec.objects.group.items);
  assert.equal(q.graphicSpec.objects.group.clip,p.graphicSpec.objects.group.clip);
  assert.equal(q.graphicSpec.order,p.graphicSpec.order);
  assert.equal(q.semanticSpec,p.semanticSpec);
  assert.equal(JSON.stringify(p.graphicSpec),snapshot);
  assert.notEqual(q.graphicSpec.objects.group.children,ids);
  assert.deepEqual(q.editGraphics({target:'group',property:'children',value:['a','b']}).graphicSpec,p.graphicSpec);
});

test('only exact direct-child permutations of named Canvas and collection owners are accepted',()=>{
  const p=source(),before=JSON.stringify(p.graphicSpec);
  for(const value of [null,{},'a',[],['a'],['a','a'],['a','outside'],['a','missing'],['a',0],['a','b','outside']]){
    assert.throws(()=>p.editGraphics({target:'group',property:'children',value}),/exact permutation/);
    assert.equal(JSON.stringify(p.graphicSpec),before);
  }
  for(const target of ['a','a:0','b']) assert.throws(()=>p.editGraphics({target,property:'children',value:[]}),/named Canvas or collection/);
  const root=p.editGraphics({target:'canvas',property:'children',value:['outside','group']});
  assert.deepEqual(root.graphicSpec.objects.canvas.children,['outside','group']);
  const empty=chart().createGraphics({id:'canvas',type:'canvas'}).editGraphics({target:'canvas',property:'children',value:[]});
  assert.deepEqual(empty.graphicSpec.objects.canvas.children,[]);
});
