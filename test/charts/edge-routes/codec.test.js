import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
for (const [engine, file] of [["22.23.1", "density.public.json"], ["24.22.1", "density.node24.public.json"]])
  test(`density output created in Node ${engine} restores and reserializes exactly in a fresh process`, () => {
    const source = `import assert from "node:assert/strict";
      import { readFileSync } from "node:fs";
      import { createHash } from "node:crypto";
      import { serializeProgram, deserializeProgram } from ${JSON.stringify(new URL("../../../src/persistence.js", import.meta.url).href)};
      const text = readFileSync(${JSON.stringify(fileURLToPath(new URL(file, import.meta.url)))}, "utf8").trimEnd();
      assert.equal(serializeProgram(deserializeProgram(text)), text);
      console.log(JSON.stringify({ status: "passed", sha256: createHash("sha256").update(text).digest("hex") }));`;
    const result = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "--eval", source], { encoding: "utf8" }));
    assert.equal(result.status, "passed"); assert.match(result.sha256, /^[a-f0-9]{64}$/);
  });
