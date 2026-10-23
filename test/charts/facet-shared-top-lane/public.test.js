import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToSVG} from '../../../src/renderers/svg.js';
import {assertDisplayedProgram} from '../../support/visual-variants.js';
import {renderWithNativeTrace} from '../../support/native-canvas-trace.js';
import {visualVariants,createPublicProgram,createPrimitiveProgram} from './manifest.js';

test('shared top lane equals independent literal graphics, drawing order, renderer calls and default SVG',()=>{
  const p=createPublicProgram(),q=createPrimitiveProgram();
  assertDisplayedProgram(visualVariants[0],p);
  assert.deepEqual(p.graphicSpec,q.graphicSpec);
  assert.equal(JSON.stringify(p.graphicSpec),JSON.stringify(q.graphicSpec));
  assert.deepEqual(renderWithNativeTrace(p,{width:508,height:262}),renderWithNativeTrace(q,{width:508,height:262}));
  assert.equal(renderToSVG(p),renderToSVG(q));
  assert.equal(p.compositionSpec.topLane,'shared');
  assert.equal(p.graphicSpec.objects.canvas.properties.height,262);
});
