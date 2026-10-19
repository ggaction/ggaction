import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToSVG} from '../../../src/renderers/svg.js';
import {assertDisplayedProgram} from '../../support/visual-variants.js';
import {renderWithNativeTrace} from '../../support/native-canvas-trace.js';
import {visualVariants,createPublicProgram,createPrimitiveProgram} from './manifest.js';

test('public content spacing equals independent literal graphics, order, trace and SVG',()=>{
  const p=createPublicProgram(),q=createPrimitiveProgram();
  assertDisplayedProgram(visualVariants[0],p);
  assert.deepEqual(p.graphicSpec,q.graphicSpec);
  assert.deepEqual(renderWithNativeTrace(p,{width:320,height:240}),renderWithNativeTrace(q,{width:320,height:240}));
  assert.equal(renderToSVG(p),renderToSVG(q));
  assert.match(renderToSVG(p),/cx="231" cy="73" r="8"/);
  assert.match(renderToSVG(p),/x="264" y="68"/);
});
