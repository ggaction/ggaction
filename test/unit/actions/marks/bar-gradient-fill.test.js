import assert from 'node:assert/strict';
import test from 'node:test';
import { chart } from '../../../../src/index.js';
import { renderToSVG } from '../../../../src/renderers/svg.js';
const paint = () => ({type:'linear-gradient',from:{x:0,y:1},to:{x:0,y:0},stops:[{offset:0,color:'red'},{offset:0.4,color:'orange'},{offset:1,color:'blue'}]});
const base = () => chart().createCanvas({width:240,height:180,margin:20}).createData({values:[{c:'A',v:2},{c:'B',v:5}]}).createBarMark().encodeX({field:'c',fieldType:'nominal'}).encodeY({field:'v',aggregate:'sum'});

test('constant bar gradients survive materialization and resize without owning caller input',()=>{
 const original=base(),fill=paint(),program=original.editBarMark({fill});
 assert.deepEqual(program.markConfigs.bar.barAppearance.fill,fill);
 assert.equal(Object.isFrozen(fill),false);fill.stops[0].color='green';
 assert.equal(program.markConfigs.bar.barAppearance.fill.stops[0].color,'red');
 assert.equal(original.markConfigs.bar,undefined);
 for(const p of [program,program.editCanvas({width:300}),program.editYScale({domain:[0,10]})]){
  assert.ok(p.graphicSpec.objects.bar.items.every(i=>i.properties.fill.stops[1].offset===0.4));
  const svg=renderToSVG(p);assert.match(svg,/<linearGradient/);assert.match(svg,/stop-color="orange"/);assert.match(svg,/fill="url\(#/);
 }
});
test('creation and facade gradient shorthand converges with edits including rounded paths',()=>{
 const fill=paint(),create=chart().createCanvas({width:240,height:180,margin:20}).createData({values:[{c:'A',v:2},{c:'B',v:5}]}).createBarMark({fill,cornerRadius:4}).encodeX({field:'c',fieldType:'nominal'}).encodeY({field:'v',aggregate:'sum'});
 const edited=base().editBarMark({fill,cornerRadius:4});assert.deepEqual(create.graphicSpec,edited.graphicSpec);assert.match(renderToSVG(create),/<linearGradient/);
 const facade=chart().createCanvas({width:300,height:240,margin:60}).createData({values:[{c:'A',v:2}]}).createBarPlot({x:{field:'c',fieldType:'nominal'},y:{field:'v',aggregate:'sum'},bar:{fill}});
 assert.ok(facade.graphicSpec.objects.barPlot.items.every(i=>i.properties.fill.type==='linear-gradient'));
});
test('malformed or conflicting bar gradients reject without changing their parent',()=>{
 const p=base(),before=p.graphicSpec;
 for(const fill of [{...paint(),stops:[{offset:1,color:'red'},{offset:0,color:'blue'}]},{...paint(),to:{x:0,y:1}},{...paint(),from:{x:-1,y:0}},{}])assert.throws(()=>p.editBarMark({fill}));
 assert.equal(p.graphicSpec,before);assert.throws(()=>p.encodeColor({field:'c',fieldType:'nominal'}).editBarMark({fill:paint()}),/color encoding/);
});
