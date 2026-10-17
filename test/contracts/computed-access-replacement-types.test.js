import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../../", import.meta.url));

test("computed access and literal replacement declare closed serializable node shapes", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ggaction-computed-types-"));
  try {
    const file = path.join(dir, "computed.mts");
    await writeFile(file, `
import type {ChartProgram, ComputedExpression} from ${JSON.stringify(path.join(root, "types/program.js"))};
declare const p: ChartProgram;
const access: ComputedExpression = {op:'getPath',operand:{field:'item'},path:['nested','value']};
p.createComputedData({id:'values',as:'value',expression:access});
p.editComputedData({target:'values',expression:{op:'replaceLiteral',operand:{field:'text'},search:'%',replacement:''}});
// @ts-expect-error explicit root must be a field node
const dynamicRoot:ComputedExpression={op:'getPath',operand:{constant:'item'},path:['value']};
// @ts-expect-error path must be nonempty
const emptyPath:ComputedExpression={op:'getPath',operand:{field:'item'},path:[]};
// @ts-expect-error numeric indices are not literal property keys
const numericPath:ComputedExpression={op:'getPath',operand:{field:'item'},path:[0]};
// @ts-expect-error search cannot be a dynamic expression
const dynamicSearch:ComputedExpression={op:'replaceLiteral',operand:{field:'text'},search:{field:'search'},replacement:''};
// @ts-expect-error regular expression replacement is unsupported
const regex:ComputedExpression={op:'replaceLiteral',operand:{field:'text'},search:/%/g,replacement:''};
// @ts-expect-error unknown flags are unsupported
const flags:ComputedExpression={op:'replaceLiteral',operand:{field:'text'},search:'%',replacement:'',flags:'g'};
`);
    const result = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--strict", "--skipLibCheck", "--target", "ES2022", "--module", "NodeNext", "--moduleResolution", "NodeNext", file], { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
