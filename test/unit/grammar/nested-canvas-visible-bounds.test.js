import assert from'node:assert/strict';
import test from'node:test';
import{resolveConcreteGraphicBounds}from'../../../src/grammar/schemas/graphicBounds.js';
function scene(leaf){return {objects:{canvas:{type:'canvas',properties:{width:200,height:200},children:['clip']},clip:{type:'canvas',properties:{x:10.5,y:20.25,width:30,height:25},children:['leaf']},leaf},order:['canvas']};}
test('nested visible bounds intersect the full stroked descendant with fractional canvas offsets',()=>{
 const g=scene({type:'circle',properties:{x:15,y:12.5,radius:40,stroke:'blue',strokeWidth:2}});
 const expected={left:10.5,right:40.5,top:20.25,bottom:45.25};
 assert.deepEqual(resolveConcreteGraphicBounds(g,'clip'),expected);
 assert.deepEqual(resolveConcreteGraphicBounds(g,'leaf'),expected);
});
test('generated descendants inherit nested offsets and clips rather than escaping their owner',()=>{
 const g=scene({type:'rect',items:[{id:'leaf:0',properties:{x:-10,y:-10,width:100,height:100,stroke:'blue',strokeWidth:8}}]});
 assert.deepEqual(resolveConcreteGraphicBounds(g,'leaf:0'),{left:10.5,right:40.5,top:20.25,bottom:45.25});
});
test('empty intersections disappear while root overflow bounds remain observable',()=>{
 const g=scene({type:'circle',properties:{x:90,y:90,radius:3}});
 assert.equal(resolveConcreteGraphicBounds(g,'clip'),undefined);assert.equal(resolveConcreteGraphicBounds(g,'leaf'),undefined);
 g.objects.canvas.children.push('overflow');g.objects.overflow={type:'rect',properties:{x:190,y:190,width:20,height:20}};
 assert.deepEqual(resolveConcreteGraphicBounds(g,'overflow'),{left:190,right:210,top:190,bottom:210});
});
test('nested clip chains intersect text and stroke descendants in the same coordinate frame',()=>{
 const g=scene({type:'canvas',properties:{x:20.25,y:5.5,width:30,height:40},children:['text']});
 g.objects.text={type:'text',properties:{x:-5,y:0,text:'Long text',fontSize:20,textAlign:'left',textBaseline:'top'}};
 const b=resolveConcreteGraphicBounds(g,'text');
 assert.equal(b.left,30.75);assert.equal(b.right,40.5);assert.ok(b.top>=25.75);assert.ok(b.bottom<=45.25);
 assert.deepEqual(resolveConcreteGraphicBounds(g,'leaf'),b);
});
test('omitted nested Canvas origins resolve to zero for direct descendants',()=>{
 const g=scene({type:'circle',properties:{x:15,y:12.5,radius:40}});
 delete g.objects.clip.properties.x;delete g.objects.clip.properties.y;
 assert.deepEqual(resolveConcreteGraphicBounds(g,'leaf'),{left:0,right:30,top:0,bottom:25});
 assert.deepEqual(resolveConcreteGraphicBounds(g,'clip'),{left:0,right:30,top:0,bottom:25});
});
