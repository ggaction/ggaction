import test from "node:test";
import assert from "node:assert/strict";
import { describeAction } from "../../src/inspection.js";
import { createLinkedOverlay } from "../../examples/linked-overlay/program.js";
import { chart } from "../../src/index.js";

test("overlay inspection exposes real parameters and distinguishes sources from dependents", () => {
  const p = createLinkedOverlay();
  const description = describeAction(p, { action: "createOverlay", target: { kind: "mark", id: "bars" } });
  assert.equal(description.applicability, "supported");
  assert.ok(description.parameterDefinitions.some(parameter => parameter.path === "type" && parameter.choices.includes("point")));
  assert.equal(describeAction(p, { action: "createOverlay", target: { kind: "mark", id: "trend" } }).applicability, "incompatible");
  assert.equal(describeAction(p, { action: "editOverlay", target: { kind: "mark", id: "bars" } }).applicability, "incompatible");
  assert.equal(describeAction(chart(), { action: "createOverlay" }).applicability, "needs-input");
  const edited = p.editOverlay({ target: "trend", missing: "connect" });
  assert.equal(edited.trace.children.length, p.trace.children.length + 1);
  assert.equal(edited.trace.children.at(-1).op, "editOverlay");
  assert.ok(edited.trace.children.at(-1).children.some(child => child.op === "rematerializeOverlay"));
});

test("overlay declarations keep typed appearance, result basis and detachment exclusive", async () => {
  const { compileTypeScript } = await import("../support/typescript.js");
  const { mkdtemp, writeFile, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const directory = await mkdtemp(join(tmpdir(), "ggaction-overlay-types-"));
  try {
    const file = join(directory, "overlay.mts");
    await writeFile(file, `import type { ChartProgram, CreateOverlayOptions } from ${JSON.stringify(join(root, "types/index.js"))};
declare const program: ChartProgram;
program.createOverlay();
program.createOverlay({ source: "bars", series: "total", line: { stroke: "black", strokeWidth: 3 } });
const points: CreateOverlayOptions = { source: "line", type: "point", point: { shape: "diamond" } };
program.createOverlay(points).editOverlay({ target: "overlay", follow: false });
program.editOverlay({ source: "other", missing: "connect", orderBy: "y" });
// @ts-expect-error following final results never requests a raw-row basis
program.createOverlay({ basis: "rows" });
// @ts-expect-error point appearance requires point type
program.createOverlay({ point: { shape: "circle" } });
// @ts-expect-error point overlay cannot receive line appearance
program.createOverlay({ type: "point", line: { curve: "linear" } });
// @ts-expect-error detachment cannot also change source
program.editOverlay({ follow: false, source: "bars" });
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
