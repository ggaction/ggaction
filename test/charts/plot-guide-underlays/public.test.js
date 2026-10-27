import { assertEquivalentMeaning, withoutAllocatedIdentity, comparableSVG } from "../../support/identity-equivalence.js";
import test from 'node:test';
import assert from 'node:assert/strict';
import {assertDisplayedProgram} from '../../support/visual-variants.js';
import {renderWithNativeTrace} from '../../support/native-canvas-trace.js';
import {visualVariants,createPublicProgram,createPrimitiveProgram} from './manifest.js';

test('guide underlays equal the literal scene, declaration order, renderer calls and default SVG',()=>{
  const p=createPublicProgram(),q=createPrimitiveProgram();
  assertDisplayedProgram(visualVariants[0],p);assertEquivalentMeaning(p.graphicSpec,q.graphicSpec);
  assert.equal(JSON.stringify(withoutAllocatedIdentity(p.graphicSpec)),JSON.stringify(withoutAllocatedIdentity(q.graphicSpec)));
  assert.deepEqual(renderWithNativeTrace(p,{width:240,height:180}),renderWithNativeTrace(q,{width:240,height:180}));
  assert.equal(comparableSVG(p),comparableSVG(q));
  assert.deepEqual(p.semanticSpec.datasets[0].values,[{category:'a',value:6},{category:'b',value:9}]);
});
