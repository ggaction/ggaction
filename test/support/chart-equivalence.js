import { withoutAllocatedIdentity, assertEquivalentMeaning } from "./identity-equivalence.js";
import assert from "node:assert/strict";

import { render } from "../../src/index.js";
import { createMockCanvasContext } from "./canvas.js";
import { graphicTreeSnapshot } from "./graphic-tree.js";

export function assertChartProgramsEquivalent({
  publicProgram,
  primitiveProgram,
  compareSemanticSpec = true
}) {
  const publicContext = createMockCanvasContext();
  const primitiveContext = createMockCanvasContext();

  render(publicProgram, publicContext);
  render(primitiveProgram, primitiveContext);

  if (compareSemanticSpec) {
    assertEquivalentMeaning(publicProgram.semanticSpec, primitiveProgram.semanticSpec);
  }
  assertEquivalentMeaning(publicProgram.graphicSpec, primitiveProgram.graphicSpec);
  assert.deepEqual(
    graphicTreeSnapshot({ graphicSpec: withoutAllocatedIdentity(publicProgram.graphicSpec) }),
    graphicTreeSnapshot({ graphicSpec: withoutAllocatedIdentity(primitiveProgram.graphicSpec) })
  );
  assert.deepEqual(
    publicProgram.graphicSpec.order,
    primitiveProgram.graphicSpec.order
  );
  assert.deepEqual(publicContext.calls, primitiveContext.calls);
  assert.deepEqual(publicProgram.actionStack, []);
  assert.deepEqual(primitiveProgram.actionStack, []);
  for (const [label, program] of [
    ["public", publicProgram],
    ["primitive", primitiveProgram]
  ]) {
    assert.equal(Object.isFrozen(program.semanticSpec), true, `${label} semanticSpec`);
    assert.equal(Object.isFrozen(program.graphicSpec), true, `${label} graphicSpec`);
    assert.equal(Object.isFrozen(program.graphicSpec.order), true, `${label} order`);
  }
}
