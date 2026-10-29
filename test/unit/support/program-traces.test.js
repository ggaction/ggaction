import assert from "node:assert/strict";
import test from "node:test";
import { programTraceOwners, directProgramTrace, directProgramOperations } from "../../support/program-traces.js";

test("composition trace collection preserves direct roots without promoting wrapped children", () => {
  const child = { trace: { children: [{ op: "encodeY", children: [{ op: "editSemantic" }] }] } };
  const parent = { trace: { children: [{ op: "vconcat" }] }, children: { a: child, b: child } };
  assert.deepEqual(programTraceOwners(parent), [parent, child]);
  assert.deepEqual(directProgramTrace(parent).map(node => node.op), ["vconcat", "encodeY"]);
  assert.deepEqual([...directProgramOperations(parent)], ["vconcat", "encodeY"]);
});
