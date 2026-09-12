import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ACTION_INDEX } from "../support/action-contracts.js";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("declares the Full-only field-selected Parallel scale editor", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-phase5-types-"));
  try {
    const file = path.join(directory, "phase5.mts");
    await writeFile(file, `
import type {
  ChartProgram,
  EditParallelScaleOptions,
  EditXOffsetScaleOptions,
  EditYOffsetScaleOptions
} from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram;
declare const basic: BasicChartProgram;
const edit: EditParallelScaleOptions = {
  target: "lines", dimension: "amount", domain: [0, 20], reverse: true
};
p.editParallelScale(edit);
p.editParallelScale({
  target: "lines", dimension: "grade", type: "point",
  domain: ["high", "low"], padding: 0.25
});
const xOffset: EditXOffsetScaleOptions = {
  target: "bars", domain: ["high", "low"], paddingInner: 0.2,
  paddingOuter: 0.1, align: 0.5, reverse: true
};
const yOffset: EditYOffsetScaleOptions = { target: "bars", padding: 0.25 };
p.editXOffsetScale(xOffset);
p.editYOffsetScale(yOffset);
// @ts-expect-error target is mandatory
p.editXOffsetScale({ padding: 0.2 });
// @ts-expect-error absolute offset ranges are parent-owned
p.editXOffsetScale({ target: "bars", range: [0, 100] });
// @ts-expect-error offset scale type is fixed
p.editYOffsetScale({ target: "bars", type: "ordinal" });
// @ts-expect-error order is expressed by the domain array
p.editXOffsetScale({ target: "bars", order: ["low", "high"] });
// @ts-expect-error target is mandatory
p.editParallelScale({ dimension: "amount", reverse: true });
// @ts-expect-error scale IDs are resolved from target and field
p.editParallelScale({ target: "lines", dimension: "amount", id: "scale", reverse: true });
// @ts-expect-error advanced focused editor is Full-only
basic.editParallelScale({ target: "lines", dimension: "amount", reverse: true });
// @ts-expect-error advanced offset editor is Full-only
basic.editXOffsetScale({ target: "bars", padding: 0.2 });
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), [
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("publishes editParallelScale as one Current direct action", () => {
  const entries = ACTION_INDEX.actions.filter(action =>
    action.name === "editParallelScale"
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].status, "implemented");
  assert.equal(entries[0].contract.file, "agent_docs/contract/current/CORE.md");
  assert.equal(
    ACTION_INDEX.plannedActions.some(action => action.name === "editParallelScale"),
    false
  );
});

test("publishes both focused offset scale editors as Current direct actions", () => {
  for (const name of ["editXOffsetScale", "editYOffsetScale"]) {
    const entries = ACTION_INDEX.actions.filter(action => action.name === name);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].status, "implemented");
    assert.equal(entries[0].contract.file, "agent_docs/contract/current/CORE.md");
    assert.equal(
      ACTION_INDEX.plannedActions.some(action => action.name === name),
      false
    );
  }
});
