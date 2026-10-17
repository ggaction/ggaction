import assert from 'node:assert/strict';
import test from 'node:test';
import {chart} from '../../src/index.js';
import {chart as basicChart} from '../../src/basic.js';
import {renderToSVG} from '../../src/renderers/svg.js';
import {renderToPNGBuffer} from '../../src/renderers/png.js';
import {renderToPDFBuffer} from '../../src/renderers/pdf.js';
import {serializeProgram,deserializeProgram} from '../../src/persistence.js';

const recipes = {
  wedge: {area: Math.sqrt(3)/4, vertices: [[0,-2/Math.sqrt(3)],[-.25,1/Math.sqrt(3)],[.25,1/Math.sqrt(3)]]},
  arrow: {area: 47/70, vertices: [[-1/7,1],[1/7,1],[1/7,-.125],[.4,-.125],[0,-1],[-.4,-.125],[-1/7,-.125]]}
};
function commands(shape,area,angle,x=150,y=100) {
  const scale=Math.sqrt(area/recipes[shape].area);
  const r=angle*Math.PI/180;
  return [...recipes[shape].vertices.map(([vx,vy],i)=>({op:i?'L':'M',
    x:x+(vx*Math.cos(r)-vy*Math.sin(r))*scale,
    y:y+(vx*Math.sin(r)+vy*Math.cos(r))*scale})),{op:'Z'}];
}
function base(factory=chart) {
 return factory().createCanvas({width:300,height:200,margin:50})
  .createData({values:[{x:.5,y:.5,group:'A'}]});
}
function publicShape(shape,area,angle,factory=chart) {
 let p=base(factory).createPointMark({id:'points',shape,fill:'#236ab9',stroke:false,opacity:1})
  .encodeX({field:'x',scale:{domain:[0,1]}}).encodeY({field:'y',scale:{domain:[0,1]}})
  .encodeRadius({value:Math.sqrt(area/Math.PI)});
 return angle===0 ? p : p.encodeAngle({value:angle});
}
function polygonArea(cs) {
 const p=cs.filter(c=>c.op!=='Z');
 return Math.abs(p.reduce((sum,c,i)=>{const n=p[(i+1)%p.length];return sum+c.x*n.y-n.x*c.y;},0))/2;
}
for(const shape of ['wedge','arrow']) {
 test(`${shape} preserves independently specified vertices, area and clockwise rotation`,()=>{
  for(const area of [0,25,100]) for(const angle of [0,90,270]) {
   const p=publicShape(shape,area,angle), actual=p.graphicSpec.objects.points.items[0].properties.commands;
   const expected=commands(shape,area,angle);
   assert.equal(actual.length,expected.length);
   actual.forEach((c,i)=>{
    assert.equal(c.op,expected[i].op);
    if(c.op!=='Z') for(const key of ['x','y']) assert.ok(Math.abs(c[key]-expected[i][key])<1e-11);
   });
   assert.ok(Math.abs(polygonArea(actual)-area)<1e-9);
   if(shape==='arrow' && area>0 && angle===0) {
    const ys=actual.filter(c=>c.op!=='Z').map(c=>c.y);
    assert.ok(Math.abs((Math.max(...ys)+Math.min(...ys))/2-100)<1e-12);
   }
  }
 });
 test(`${shape} renders the independent primitive identically in PNG and persists in Full and Basic`,async()=>{
  for(const factory of [chart,basicChart]) {
   const angle=factory===chart?90:0;
   const p=publicShape(shape,100,angle,factory);
   const primitive=chart().createCanvas({width:300,height:200,margin:50})
    .createGraphics({id:'glyph',type:'path'})
    .editGraphics({target:'glyph',property:'commands',value:commands(shape,100,angle)})
    .editGraphics({target:'glyph',property:'fill',value:'#236ab9'})
    .editGraphics({target:'glyph',property:'opacity',value:1});
   const [a,b]=await Promise.all([renderToPNGBuffer(p),renderToPNGBuffer(primitive)]);
   assert.deepEqual(a.buffer,b.buffer);
   const restored=deserializeProgram(serializeProgram(p));
   assert.deepEqual(restored.graphicSpec,p.graphicSpec);
   assert.ok(renderToSVG(restored).includes('<path'));
   assert.ok((await renderToPDFBuffer(p)).buffer.length>100);
   assert.equal(restored.editCanvas({width:340}).graphicSpec.objects.points.items.length,1);
  }
 });
}
