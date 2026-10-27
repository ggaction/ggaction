import { assertEquivalentMeaning } from "../../support/identity-equivalence.js";
import test from "node:test";import assert from "node:assert/strict";
import { render } from "../../../src/index.js";
import { createMockCanvasContext } from "../../support/canvas.js";
import { createLinearNiceCount } from "../../../examples/linear-nice-count/program.js";
import { createLinearNiceCountPrimitives } from "./primitive.program.js";
import { requireResolvedScale } from "../../../src/selectors/scales.js";

test("count-based automatic linear domain matches the explicit primitive scene",()=>{
  const actual=createLinearNiceCount(),expected=createLinearNiceCountPrimitives();
  assert.deepEqual(requireResolvedScale(actual,"y").domain,[0,110]);
  assertEquivalentMeaning(actual.graphicSpec,expected.graphicSpec);
  const a=createMockCanvasContext(),b=createMockCanvasContext();render(actual,a);render(expected,b);
  assert.deepEqual(a.calls,b.calls);
  assert.deepEqual(actual.semanticSpec.scales.find(s=>s.id==="y").nice,{count:10});
});
