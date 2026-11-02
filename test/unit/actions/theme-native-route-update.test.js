import test from "node:test";
import assert from "node:assert/strict";
import { chart } from "../../../src/index.js";
import { serializeProgram, deserializeProgram } from "../../../src/persistence.js";
import { nativeRouteAuthoredNode, nativeRouteCompletionMetadata, registerNativeRouteThemeReader } from "../../../src/actions/theme/nativeRouteUpdate.js";
import { collectThemeAuthoredSources } from "../../../src/actions/theme/reconcile.js";
import { summarizeArgs } from "../../../src/core/action.js";
const wrap = child => ({ id: "a999", op: "applyGraphEdgeRoutesUpdate", description: "Prepared native update.", args: { prepared: { kind: "edge-route-preparation", request: { kind: "update", action: child.op, args: child.args }, inputHashesCount: 1 }, requestToken: "t" }, children: [child] });

test("stored native route trace exposes only its exact first child as authored inspection data", () => {
  const base = chart().createCanvas({ width: 200, height: 120 }).applyTheme({ theme: "dark" });
  const direct = base.editCanvas({ background: "red" }), child = direct.trace.children.at(-1), node = wrap(child);
  assert.equal(nativeRouteAuthoredNode(node), child);
  const later = { ...node, children: [child, { ...child, op: "editGraphics", args: { target: "canvas", property: "background", value: "blue" } }] };
  assert.equal(nativeRouteAuthoredNode(later), child);
  for (const broken of [
    { ...node, op: "extension" }, { ...node, args: {} },
    { ...node, args: { ...node.args, requestToken: 1 } },
    { ...node, args: { ...node.args, prepared: {} } },
    { ...node, args: { ...node.args, prepared: { ...node.args.prepared, inputHashesCount: 0 } } },
    { ...node, args: { ...node.args, prepared: { ...node.args.prepared, request: { kind: "update", action: "extension", args: child.args } } } },
    { ...node, children: undefined }, { ...node, children: [] }, { ...node, children: [child, child] },
    { ...node, children: [{ ...child, extra: true }] },
    { ...node, children: [{ ...child, id: 1 }] },
    { ...node, children: [{ ...child, description: 1 }] },
    { ...node, children: [{ ...child, children: undefined }] },
    { ...node, children: [{ ...child, args: { background: "blue" } }] }
  ]) assert.equal(nativeRouteAuthoredNode(broken), broken);
  const inspected = { ...direct, trace: { ...direct.trace, children: [...base.trace.children, later] } };
  assert.deepEqual(collectThemeAuthoredSources(inspected), collectThemeAuthoredSources(direct));
  // Serialized trace is data and can be inspected after restoration; it does not
  // become a prepared handle or open the live invocation scope.
  const trace = structuredClone({ ...direct.trace, children: [...base.trace.children, node] });
  let sequence = 0;
  function number(current) { current.id = `a${++sequence}`; current.children.forEach(number); }
  trace.children.forEach(number);
  const stored = direct._clone({ trace, actionSequence: sequence });
  const restored = deserializeProgram(serializeProgram(stored));
  assert.deepEqual(collectThemeAuthoredSources(restored), collectThemeAuthoredSources(direct));
  assert.deepEqual(restored.applyTheme({ theme: "light" }).graphicSpec, direct.applyTheme({ theme: "light" }).graphicSpec);
  assert.deepEqual(restored.removeTheme().graphicSpec, direct.removeTheme().graphicSpec);
  assert.throws(() => restored.applyGraphEdgeRoutesUpdate({ prepared: restored.trace.children.at(-1).args.prepared, requestToken: "t" }), /authentic/);
  for (const op of ["applyTheme", "removeTheme"]) {
    const native = { ...child, op, args: summarizeArgs(op === "applyTheme" ? { theme: "light" } : {}) };
    assert.equal(nativeRouteAuthoredNode(wrap(native)), native);
    assert.deepEqual(collectThemeAuthoredSources({ ...inspected, trace: { children: [...inspected.trace.children, wrap(native)] } }), collectThemeAuthoredSources(direct));
  }
});

test("completion metadata requires an exact constructor reader and never reads persisted children as authority", () => {
  class Owner {} class Child extends Owner {} class Other {}
  const metadata = { op: "applyGraphEdgeRoutesUpdate" }, native = { op: "removeTheme" }, program = new Owner();
  assert.throws(() => registerNativeRouteThemeReader({}, () => {}), /exact constructor/);
  assert.throws(() => registerNativeRouteThemeReader(Owner, null), /exact constructor/);
  registerNativeRouteThemeReader(Owner, (candidate, context) => context.source === program && candidate === program ? native : undefined);
  assert.throws(() => registerNativeRouteThemeReader(Owner, () => {}), /exact constructor/);
  assert.equal(nativeRouteCompletionMetadata(program, { source: program, metadata }), native);
  assert.equal(nativeRouteCompletionMetadata(program, { source: {}, metadata }), metadata);
  assert.equal(nativeRouteCompletionMetadata(new Child(), { source: program, metadata }), metadata);
  assert.equal(nativeRouteCompletionMetadata(new Other(), { source: program, metadata }), metadata);
  const actual = chart();
  assert.equal(nativeRouteCompletionMetadata(actual, { source: actual, metadata }), metadata);
});
