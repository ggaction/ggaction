import test from 'node:test';
import assert from 'node:assert/strict';
import { chart } from '../../../../src/index.js';

function source() {
  return chart().createCanvas().createGraphics({id:'a',type:'collection',parent:'canvas'})
    .createGraphics({id:'b',type:'circle',parent:'a',length:2})
    .createGraphics({id:'c',type:'rect',parent:'canvas'})
    .createGraphics({id:'keep',type:'line',parent:'canvas'});
}
test('bulk named-subtree removal is atomic, deduplicated and structurally shares retained graphics',()=>{
  const p=source(),before=JSON.stringify(p.graphicSpec),targets=['a','b','a','c'];
  const next=p.editGraphics({target:targets,remove:true});
  assert.deepEqual(next.graphicSpec,p.editGraphics({target:'a',remove:true}).editGraphics({target:'c',remove:true}).graphicSpec);
  assert.equal(next.graphicSpec.objects.keep,p.graphicSpec.objects.keep);
  assert.equal(JSON.stringify(p.graphicSpec),before); assert.deepEqual(targets,['a','b','a','c']);
  assert.equal(next.trace.children.length,p.trace.children.length+1);
});
test('bulk removal rejects every invalid member before changing the original state',()=>{
  const p=source(),before=JSON.stringify(p.graphicSpec);
  for(const targets of [[],['a','unknown'],['a','canvas'],['a','b:0'],['a',null]]) assert.throws(()=>p.editGraphics({target:targets,remove:true}));
  assert.throws(()=>p.editGraphics({target:['c'],property:'fill',value:'red'}));
  assert.equal(JSON.stringify(p.graphicSpec),before);
});
