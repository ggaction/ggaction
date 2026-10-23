import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("statistical facade exports strict single-statistic and interval types only in the full API", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ggaction-statistical-facade-"));
  try {
    const file = path.join(dir, "reference.mts");
    await writeFile(file, `
import {chart, type CreateStatisticalReferenceOptions} from ${JSON.stringify(path.join(root, "types/index.js"))};
import {chart as basicChart} from ${JSON.stringify(path.join(root, "types/basic.js"))};
const p = chart();
const mean: CreateStatisticalReferenceOptions = {source:'points',axis:'y'};
p.createStatisticalReference(mean);
p.createStatisticalReference({source:'points',axis:'x',statistic:{op:'median'},stroke:'black',strokeWidth:3});
p.createStatisticalReference({source:'points',axis:'x',groupBy:'Origin'});
p.createStatisticalReference({source:'points',axis:'y',groupBy:'Origin',statistics:[{op:'quantile',p:.025},{op:'quantile',p:.975}]});
// @ts-expect-error grouping names one source field
p.createStatisticalReference({source:'points',axis:'y',groupBy:['Origin']});
p.createStatisticalReference({source:'points',axis:'y',statistics:[{op:'quantile',p:.025},{op:'quantile',p:.975}],fill:'gray',opacity:.18});
// @ts-expect-error single and pair are mutually exclusive
p.createStatisticalReference({source:'points',axis:'y',statistic:{op:'mean'},statistics:[{op:'min'},{op:'max'}]});
// @ts-expect-error exact pair
p.createStatisticalReference({source:'points',axis:'y',statistics:[{op:'min'}]});
// @ts-expect-error quantile requires p
p.createStatisticalReference({source:'points',axis:'y',statistic:{op:'quantile'}});
// @ts-expect-error literal reference coordinates belong to separate facades
p.createStatisticalReference({source:'points',axis:'y',y:5});
// @ts-expect-error line styles do not accept fill
p.createStatisticalReference({source:'points',axis:'y',statistic:{op:'mean'},fill:'red'});
// @ts-expect-error band styles do not accept strokeDash
p.createStatisticalReference({source:'points',axis:'y',statistics:[{op:'min'},{op:'max'}],strokeDash:'solid'});
// @ts-expect-error reference populations own missing-value validation, not the Rect row policy
p.createStatisticalReference({source:'points',axis:'y',statistics:[{op:'min'},{op:'max'}],missing:'skip'});
// @ts-expect-error source is required
p.createStatisticalReference({axis:'y'});
// @ts-expect-error full API only
basicChart().createStatisticalReference({source:'points',axis:'y'});
`);
    const result = spawnSync(process.execPath, [path.join(root, "node_modules/typescript/bin/tsc"),"--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
