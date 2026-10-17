import assert from 'node:assert/strict';
import test from 'node:test';
import {createCanvas} from '@napi-rs/canvas';
import {render} from '../../src/index.js';
import {createMockCanvasContext} from '../support/canvas.js';
import {zeroStrokeScene,zeroStrokeSamples} from '../support/zero-stroke-scene.js';

test('zero-width stroke leaves fills intact and produces no line or outline ink',()=>{
 const p=zeroStrokeScene(),before=JSON.stringify(p),c=createCanvas(240,100).getContext('2d');
 render(p,c);
 for(const [x,y,expected]of zeroStrokeSamples)assert.deepEqual([...c.getImageData(x,y,1,1).data],expected,`${x},${y}`);
 assert.deepEqual([...c.getImageData(50,95,1,1).data],[0,0,255,255]);
 assert.equal(JSON.stringify(p),before);
 const mock=createMockCanvasContext();render(p,mock);
 assert.equal(mock.calls.filter(c=>c.op==='stroke').length,1);
});

test('zero-width drawing still validates before any paint and preserves positive strokes',()=>{
 const p=zeroStrokeScene();p.graphicSpec.objects.line.properties.x2=NaN;
 const mock=createMockCanvasContext();assert.throws(()=>render(p,mock));assert.deepEqual(mock.calls,[]);
 const positive=zeroStrokeScene();positive.graphicSpec.objects.rect.properties.strokeWidth=4;
 const c=createCanvas(240,100).getContext('2d');render(positive,c);
 assert.deepEqual([...c.getImageData(59,30,1,1).data],[255,0,0,255]);
});
