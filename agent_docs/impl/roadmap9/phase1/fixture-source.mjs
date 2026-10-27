// Capture historical INPUTS using the pre-identity runtime. This is not a
// schema-4 migrator and must never generate migration expectations.
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { chart } from "../../../../src/index.js";
import { serializeProgram } from "../../../../src/persistence.js";
import { decodeValue, encodeValue } from "../../../../src/persistence/codec.js";

const output = process.argv[2];
if (!output || process.argv.length !== 3) throw new Error("Usage: node fixture-source.mjs <new-output-directory>");
const root = fileURLToPath(new URL("../../../../", import.meta.url));
const values = [{ id: "a", x: 1, y: 2 }, { id: "b", x: 2, y: 5 }];
const special = { missing: undefined, nonfinite: NaN, big: 9007199254740993n, negativeZero: -0,
  samples: Array.from({ length: 32 }, (_, i) => i) };
const program = chart().createCanvas({ width: 320, height: 240 })
  .createData({ id: "rows", values: values.map(row => ({ ...row, ...special })) })
  .createScatterPlot({ id: "points", x: "x", y: "y" })
  .selectMarks({ id: "picked", target: "points", rows: { data: "rows", indices: [1] } })
  .highlightMarks({ selection: "picked", fill: "#ff0000" });
const current = JSON.parse(serializeProgram(program));
if (current.schemaVersion !== 3 || current.packageVersion !== "0.0.26") {
  throw new Error("Capture requires the historical schema-3 package 0.0.26 runtime.");
}
const directory = resolve(output);
mkdirSync(directory, { recursive: false });
const files = [];
for (const version of [1, 2, 3]) {
  const state = decodeValue(current.payload);
  if (version === 1) for (const dataset of state.semanticSpec.datasets) delete dataset.schema;
  const envelope = { ...current, schemaVersion: version, payload: version === 3 ? current.payload : encodeValue(state) };
  const filename = `selection-v${version}.json`;
  const bytes = JSON.stringify(envelope) + "\n";
  writeFileSync(join(directory, filename), bytes, { flag: "wx" });
  files.push({ path: filename, schemaVersion: version, sha256: createHash("sha256").update(bytes).digest("hex") });
}
writeFileSync(join(directory, "manifest.json"), JSON.stringify({
  role: "historical-inputs", producerCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  producerPackage: current.packageVersion,
  construction: "v3 is the captured writer output; v1/v2 are historical-format fixtures derived with the pre-identity tagged codec, not archives from old npm releases.",
  files
}, null, 2) + "\n", { flag: "wx" });
console.log(`Captured ${files.length} historical-format input fixtures.`);
