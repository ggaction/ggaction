import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chart } from "ggaction";
import { chart as basic } from "ggaction/basic";
import { serializeProgram, deserializeProgram } from "ggaction/persistence";
import { inspectProgram, comparePrograms } from "ggaction/inspection";

const resource = program => program.semanticSpec.resources.find(value => value.kind === "projection");
const values = extent => ({ type: "LineString", coordinates: [[0, 0], extent] });
const fitted = () => chart().createGeometryData({ id: "shape", format: "geojson", coordinateKind: "planar", values: values([10, 20]) })
  .createProjection({ id: "map", type: "identity", fit: { geometry: "shape", width: 100, height: 100 } });

export const cases = [
  { id: "projection/full-basic-fit-lifecycle", run() {
    assert.match(import.meta.resolve("ggaction"), /\/node_modules\/ggaction\//);
    assert.equal(basic().createProjection, undefined);
    assert.equal(basic().editProjection, undefined);
    const program = fitted(), before = serializeProgram(program);
    assert.deepEqual(resource(program).result, { scalePx: 5, translatePx: [25, 0], bounds: [25, 0, 75, 100] });
    const next = program.editGeometryData({ target: "shape", values: values([20, 20]) });
    assert.equal(resource(next).revision, 1);
    assert.equal(resource(next).inputs[0].revision, 1);
    assert.deepEqual(resource(next).result.bounds, [0, 0, 100, 100]);
    assert.notEqual(comparePrograms(program, next).equivalence, "equal");
    assert.doesNotThrow(() => inspectProgram(next, { target: { kind: "projection", id: "map" } }));
    assert.throws(() => program.editGeometryData({ target: "shape", coordinateKind: "geographic" }));
    assert.equal(serializeProgram(program), before);
    const explicit = next.editProjection({ scalePx: 2 }).removeResource({ kind: "geometry", id: "shape" });
    assert.deepEqual(resource(explicit).inputs, []);
    assert.equal(explicit.removeResource({ kind: "projection", id: "map" }).semanticSpec.resources.length, 0);
  } },
  { id: "projection/fresh-process-offline-fit", run() {
    const program = fitted(), before = serializeProgram(program);
    const script = `import {readFileSync} from 'node:fs'; import {deserializeProgram,serializeProgram} from 'ggaction/persistence';
      globalThis.fetch=()=>{throw new Error('Unexpected network');};
      const p=deserializeProgram(readFileSync(0,'utf8')); process.stdout.write(serializeProgram(p.editProjection({reflectX:true})));`;
    const output = execFileSync(process.execPath, ["--input-type=module", "-e", script], { input: before, encoding: "utf8", timeout: 30000 });
    const next = deserializeProgram(output);
    assert.equal(resource(next).revision, 1);
    assert.deepEqual(resource(next).result.translatePx, [75, 0]);
    assert.equal(serializeProgram(program), before);
  } }
];
