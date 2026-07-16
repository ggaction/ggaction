import assert from "node:assert/strict";

function requireNamed(items, id, label) {
  const value = items.find(item => item.id === id);
  assert.ok(value, `Expected ${label} "${id}" to exist.`);
  return value;
}

export function requireTestDataset(program, id) {
  return requireNamed(program.semanticSpec.datasets, id, "dataset");
}

export function requireTestLayer(program, id) {
  return requireNamed(program.semanticSpec.layers, id, "layer");
}

export function requireTestScale(program, id) {
  return requireNamed(program.semanticSpec.scales, id, "scale");
}

export function requireTestCoordinate(program, id) {
  return requireNamed(program.semanticSpec.coordinates, id, "coordinate");
}

export function requireTestGraphic(program, id) {
  const graphic = program.graphicSpec.objects[id];
  assert.ok(graphic, `Expected graphic "${id}" to exist.`);
  return graphic;
}

function snapshotProgram(program) {
  return {
    semanticSpec: program.semanticSpec,
    graphicSpec: program.graphicSpec,
    context: program.context,
    trace: program.trace,
    actionStack: program.actionStack,
    resolvedScales: program.resolvedScales
  };
}

function assertProgramSnapshot(program, snapshot) {
  for (const [property, value] of Object.entries(snapshot)) {
    assert.strictEqual(program[property], value, `${property} changed after rejection`);
  }
}

export function assertAtomicFailures(program, cases) {
  const snapshot = snapshotProgram(program);
  for (const { operation, error } of cases) {
    assert.throws(operation, error);
    assertProgramSnapshot(program, snapshot);
  }
}
