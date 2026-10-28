import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { compileTypeScript } from "../support/typescript.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("pivot declares Full-only numeric and count contracts with typed columns", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-pivot-types-"));
  try {
    const file = path.join(directory, "pivot.mts");
    await writeFile(file, `
import type { ChartProgram, PivotColumn, PivotDataOptions, DatasetPivotTransform } from ${JSON.stringify(path.join(root, "types/index.js"))};
import type { BasicChartProgram } from ${JSON.stringify(path.join(root, "types/basic.js"))};
declare const p: ChartProgram; declare const basic: BasicChartProgram;
const columns: readonly PivotColumn[] = [{ value: 1, as: "one" }, { value: null, as: "missing" }];
const count: PivotDataOptions = { id: "wide", field: "key", op: "count", columns };
p.createPivotData(count).editPivotData({target:"wide",op:"mean",value:"amount"});
p.createPivotData({id:"wide",field:"key",value:"amount"});
const definition: DatasetPivotTransform = {type:"pivot",field:"key",groupBy:[],columns,op:"count",fill:null};
p.createDerivedData({id:"wide",source:"raw",transform:[definition]});
p.editDerivedData({target:"wide",definition});
// @ts-expect-error count does not accept a value field
p.createPivotData({id:"wide",field:"key",op:"count",value:"amount"});
// @ts-expect-error numeric operations require value
p.createPivotData({id:"wide",field:"key",op:"sum"});
// @ts-expect-error key values are scalar
p.createPivotData({id:"wide",field:"key",op:"count",columns:[{value:{},as:"bad"}]});
// @ts-expect-error no free-form aggregation
p.editPivotData({target:"wide",op:"median"});
// @ts-expect-error fill must be number or null
p.editPivotData({target:"wide",fill:"zero"});
// @ts-expect-error pivot authoring is Full-only
basic.createPivotData(count);
// @ts-expect-error pivot editing is Full-only
basic.editPivotData({target:"wide",op:"count"});
`);
    const result = compileTypeScript(["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
