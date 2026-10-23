import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("facet content anchors use one closed vocabulary for creation and editing", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "facet-content-header-types-"));
  try {
    const file = path.join(directory, "headers.mts");
    await writeFile(file, `
import type {ChartProgram,FacetHeadersOptions} from ${JSON.stringify(path.join(root, "types/index.js"))};
import type {BasicChartProgram} from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p:ChartProgram;declare const basic:BasicChartProgram;
const headers:FacetHeadersOptions={anchor:'content',column:{anchor:'plot',side:'left'}};
p.facet({field:'group',spacing:'plot',headers});
p.facetGrid({rows:{field:'row'},columns:{field:'group'},spacing:'plot',headers:{row:{anchor:'content'}}});
p.repeatCharts({channel:'y',fields:['a','b'],spacing:'plot',headers});
p.editFacetHeaders({role:'column',anchor:'content'});
p.editFacetHeaders({anchor:'plot'});
// @ts-expect-error closed anchor values
p.editFacetHeaders({anchor:'marks'});
// @ts-expect-error no automatic sentinel
p.editFacetHeaders({anchor:'auto'});
// @ts-expect-error field titles do not accept a content anchor
p.editFacetHeaders({role:'column',title:{text:'Group',anchor:'content'}});
// @ts-expect-error Basic retains composition exclusion
basic.editFacetHeaders({anchor:'content'});
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
