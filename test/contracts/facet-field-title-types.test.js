import { compileTypeScript } from "../support/typescript.js";
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("facet field titles use role-scoped options and Full-only actions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "facet-field-title-types-"));
  try {
    const file = path.join(directory, "headers.mts");
    await writeFile(file, `
import type {ChartProgram,FacetHeadersOptions,FacetOptions,FacetGridOptions,RepeatChartsOptions} from ${JSON.stringify(path.join(root, "types/index.js"))};
import type {BasicChartProgram} from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p:ChartProgram;declare const basic:BasicChartProgram;
p.editFacetHeaders({role:'column',title:{text:'Region',rotation:{value:-90,unit:'degrees'},alongOffset:1}});
p.editFacetHeaders({role:'row',title:false});
p.facet({field:'region',headers:{column:{title:{text:'Region'}}}});
// @ts-expect-error title is role-scoped at creation
p.facet({field:'region',headers:{title:{text:'Region'}}});
// @ts-expect-error field title text is a string
p.editFacetHeaders({role:'column',title:{text:1}});
// @ts-expect-error title options are closed
p.editFacetHeaders({role:'column',title:{padding:1}});
// @ts-expect-error only false removes a title
p.editFacetHeaders({role:'column',title:true});
const headers:FacetHeadersOptions={rotation:0,column:{rotation:{value:-90,unit:'degrees'},side:'left'}};
p.facet({field:'region',headers});
p.facetGrid({rows:{field:'row'},columns:{field:'column'},headers:{row:{rotation:Math.PI/2}}});
p.repeatCharts({channel:'y',fields:['a','b'],headers:{rotation:Math.PI/4}});
p.editFacetHeaders({role:'column',side:'left',rotation:{value:-90,unit:'degrees'}});
p.editFacetHeaders({rotation:0});
// @ts-expect-error closed angle units
p.editFacetHeaders({rotation:{value:90,unit:'turns'}});
// @ts-expect-error rotation is not a string
p.editFacetHeaders({rotation:'vertical'});
// @ts-expect-error reset uses numeric zero rather than a new sentinel
p.editFacetHeaders({rotation:'auto'});
// @ts-expect-error Basic has no facet actions
basic.editFacetHeaders({rotation:0});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
