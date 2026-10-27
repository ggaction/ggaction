import { createHash } from "node:crypto";
import { buildDocProvenance } from "./doc-provenance.js";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chart } from "../src/index.js";
import { searchGgaction, taskPacketBytes } from "../knowledge/task-resolver.js";

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const rows = Object.freeze([
  Object.freeze({ x: 1, y: 2, value: 2, part: 1, whole: 2 }), Object.freeze({ x: 2, y: 10, value: 10, part: 2, whole: 4 }),
  Object.freeze({ x: 3, y: 100, value: 100, part: 3, whole: 6 })
]);

function checkProgram(program, check) {
  if (!program) return false;
  if (check.kind === "background") return program.graphicSpec.objects.canvas?.properties.background === check.value;
  if (check.kind === "facet") return program.compositionSpec?.type === "facet" && Object.keys(program.children).length === check.children;
  if (check.kind === "dataColumn") {
    const id = program.materializationConfigs.data?.computed?.[check.owner]?.current;
    const values = program.semanticSpec.datasets.find(dataset => dataset.id === id)?.values;
    return JSON.stringify(values?.map(row => row[check.field])) === JSON.stringify(check.values);
  }
  if (check.kind === "fill") {
    const points = program.semanticSpec.layers.filter(layer => layer.mark.type === "point");
    const items = points.flatMap(layer => program.graphicSpec.objects[layer.id]?.items ?? []);
    return items.length > 0 && items.every(item => item.properties.fill === check.value);
  }
  if (check.kind === "rotation") {
    const labels = program.graphicSpec.objects[`${check.axis}AxisLabels`]?.items ?? [];
    return labels.length > 0 && labels.every(item => Math.abs(item.properties.rotation - check.radians) < 1e-12);
  }
  if (check.kind === "scale") {
    const ids = program.semanticSpec.layers.map(layer => layer.encoding?.[check.axis]?.scale).filter(Boolean);
    return ids.length > 0 && ids.every(id => program.semanticSpec.scales.some(scale => scale.id === id && scale.type === check.value));
  }
  throw new Error(`Unknown evaluation requirement ${check.kind}.`);
}

export async function evaluateAuthoringCase(fixture, { resolve = searchGgaction } = {}) {
  const packet = resolve(fixture.query);
  let program;
  let executionError;
  try {
    // Execute only this repository's deterministic resolver output against fixed
    // evaluation data. This harness is not part of the MCP server or package.
    program = await new AsyncFunction("chart", "values", [
      packet.authoring.initialize, ...packet.authoring.prerequisites.map(entry => entry.call),
      ...packet.authoring.steps, "return program"
    ].join(";\n"))(chart, rows);
  } catch (error) { executionError = error.message; }
  const checks = fixture.checks.map(check => ({ ...check, passed: checkProgram(program, check) }));
  const unresolved = packet.unresolved.length > 0 || packet.unsupported.length > 0 || packet.unmatchedRequirements.length > 0;
  const executionSucceeded = program !== undefined;
  const requirementsFulfilled = !fixture.expectUnresolved && executionSucceeded && checks.every(check => check.passed);
  const falseComplete = !unresolved && !requirementsFulfilled;
  return {
    id: fixture.id, query: fixture.query, packetBytes: taskPacketBytes(packet),
    executionSucceeded, ...(executionError ? { executionError } : {}), checks,
    requirementsFulfilled, reportsUnresolved: unresolved, falseComplete,
    passed: packet.schemaVersion === 5 && taskPacketBytes(packet) <= 6144 &&
      (fixture.expectUnresolved ? unresolved : !unresolved && requirementsFulfilled)
  };
}

export async function evaluateAuthoringRequirements() {
  const artifact = JSON.parse(await readFile(new URL("../benchmarks/authoring-requirements-v1/cases.json", import.meta.url), "utf8"));
  const cases = [];
  for (const fixture of artifact.cases) cases.push(await evaluateAuthoringCase(fixture));
  const provenance = await buildDocProvenance();
  const hashes = {};
  for (const file of ["knowledge/task-resolver.js", "knowledge/intent-taxonomy.json", "knowledge/action-cards.json", "benchmarks/authoring-requirements-v1/cases.json"]) {
    hashes[file] = createHash("sha256").update(await readFile(new URL(`../${file}`, import.meta.url))).digest("hex");
  }
  return { schemaVersion: 1, role: artifact.role, packageVersion: provenance.packageVersion,
    contractId: provenance.contractId, hashes, node: process.version, cases, summary: {
    total: cases.length, passed: cases.filter(result => result.passed).length,
    executable: cases.filter(result => result.executionSucceeded).length,
    fulfilled: cases.filter(result => result.requirementsFulfilled).length,
    falseComplete: cases.filter(result => result.falseComplete).length
  } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await evaluateAuthoringRequirements();
  await mkdir(".artifacts/benchmarks", { recursive: true });
  await writeFile(".artifacts/benchmarks/authoring-requirements.json", JSON.stringify(report, null, 2) + "\n");
  process.stdout.write(JSON.stringify(report.summary, null, 2) + "\n");
  if (report.summary.passed !== report.summary.total) process.exitCode = 1;
}
