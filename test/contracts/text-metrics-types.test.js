import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../../", import.meta.url));

test("text metric profile types preserve the closed schema and Full-only actions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-text-types-"));
  try {
    const file = path.join(directory, "rows.mts");
    await writeFile(file, `
import type { ChartProgram, TextMetricsProfile, TextMeasurement } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const full: ChartProgram;
declare const basic: BasicChartProgram;
const row: TextMeasurement = {text: "label",fontFamily:"sans-serif",fontSize:12,fontWeight:400,width:10};
const profile: TextMetricsProfile = {schemaVersion:1,id:"host",measurements:[row]};
const next: ChartProgram = full.applyTextMetrics({profile}).removeTextMetrics();
void next;
// @ts-expect-error only schema 1 is supported
full.applyTextMetrics({profile:{...profile,schemaVersion:2}});
// @ts-expect-error normalized weight is a closed vocabulary
full.applyTextMetrics({profile:{...profile,measurements:[{...row,fontWeight:150}]}});
// @ts-expect-error profile is required
full.applyTextMetrics({});
// @ts-expect-error profile options are closed
full.applyTextMetrics({profile,callback:()=>1});
// @ts-expect-error no callback measurements
full.applyTextMetrics({profile:{...profile,measurements:()=>[]}});
// @ts-expect-error Full only
basic.applyTextMetrics({profile});
// @ts-expect-error Full only
basic.removeTextMetrics();
// @ts-expect-error remove takes no options
full.removeTextMetrics({id:"host"});
`);
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"),
      "--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022",
      "--module", "NodeNext", "--moduleResolution", "NodeNext", file
    ], { encoding: "utf8", cwd: root });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
