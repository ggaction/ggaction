import { assertEquivalentMeaning, withoutAllocatedIdentity, comparableSVG } from "../../support/identity-equivalence.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertDisplayedProgram} from '../../support/visual-variants.js';
import {renderWithNativeTrace} from '../../support/native-canvas-trace.js';
import {visualVariants,createPublicProgram,createPrimitiveProgram} from './manifest.js';

test('shared top lane equals independent literal graphics, drawing order, renderer calls and default SVG',()=>{
  const p=createPublicProgram(),q=createPrimitiveProgram();
  assertDisplayedProgram(visualVariants[0],p);
  assertEquivalentMeaning(p.graphicSpec,q.graphicSpec);
  assert.equal(JSON.stringify(withoutAllocatedIdentity(p.graphicSpec)),JSON.stringify(withoutAllocatedIdentity(q.graphicSpec)));
  assert.deepEqual(renderWithNativeTrace(p,{width:508,height:262}),renderWithNativeTrace(q,{width:508,height:262}));
  assert.equal(comparableSVG(p),comparableSVG(q));
  assert.equal(p.compositionSpec.topLane,'shared');
  assert.equal(p.graphicSpec.objects.canvas.properties.height,262);
});
