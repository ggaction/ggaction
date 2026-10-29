import { compileTypeScript } from "../support/typescript.js";
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("Full and Basic responsive options and immutable inspection are declared on their actual owners", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "ggaction-responsive-types-"));
  try {
    const file = path.join(dir, "responsive.mts");
    const source = await readFile(new URL("../../scripts/consumers/fixtures/responsive-guides.ts", import.meta.url), "utf8");
    await writeFile(file, source
      .replace('"ggaction"', JSON.stringify(path.join(root, "types/index.js")))
      .replace('"ggaction/basic"', JSON.stringify(path.join(root, "types/basic.js")))
      .replace('"ggaction/inspection"', JSON.stringify(path.join(root, "types/inspection.js"))));
    const result = compileTypeScript(["--noEmit","--strict","--skipLibCheck","--target","ES2022","--module","NodeNext","--moduleResolution","NodeNext",file],{cwd:root,encoding:"utf8"});
    assert.equal(result.status,0,result.stdout+result.stderr);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
