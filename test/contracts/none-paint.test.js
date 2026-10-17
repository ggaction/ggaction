import assert from 'node:assert/strict';
import test from 'node:test';
import {createCanvas} from '@napi-rs/canvas';
import {render} from '../../src/index.js';
import {renderToSVG} from '../../src/renderers/svg.js';
import {createMockCanvasContext} from '../support/canvas.js';

import {noPaintScene,noPaintSamples as samples} from '../support/none-paint-scene.js';

test('Canvas none paint cannot retain the previous opaque fill or stroke',()=>{
 const p=noPaintScene(),before=JSON.stringify(p),c=createCanvas(240,100).getContext('2d');
 c.strokeStyle='red';c.fillStyle='red';render(p,c);
 for(const [x,y,expected] of samples)assert.deepEqual([...c.getImageData(x,y,1,1).data],expected,`${x},${y}`);
 assert.equal(JSON.stringify(p),before);assert.match(renderToSVG(p),/stroke="none"/);
});

test('none paint preserves shared preflight atomicity and ordinary paint assignments',()=>{
 const p=noPaintScene(),invalid=structuredClone(p);invalid.graphicSpec.objects.line.properties.x2=NaN;
 const c=createMockCanvasContext();assert.throws(()=>render(invalid,c));assert.deepEqual(c.calls,[]);
 render(p,c);assert.ok(c.calls.some(call=>call.op==='setStrokeStyle'&&call.value==='rgba(0,0,0,0)'));
 assert.ok(c.calls.some(call=>call.op==='setFillStyle'&&call.value==='#00ffff'));
});


test('a none Canvas background leaves transparent pixels and does not affect glyph fill',()=>{
 const p=noPaintScene();p.graphicSpec.objects.canvas.properties.background='none';
 const c=createCanvas(240,100).getContext('2d');c.fillStyle='red';render(p,c);
 assert.deepEqual([...c.getImageData(0,0,1,1).data],[0,0,0,0]);
 assert.deepEqual([...c.getImageData(25,30,1,1).data],[0,255,255,255]);
});
