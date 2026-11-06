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
      import { packageVersion } from ${JSON.stringify(new URL("../../../src/version.js", import.meta.url).href)};
      const text = readFileSync(${JSON.stringify(fileURLToPath(new URL(file, import.meta.url)))}, "utf8").trimEnd();
      // The envelope records the writing package version; every other byte is preserved.
      const stored = '"packageVersion":' + JSON.stringify(JSON.parse(text).packageVersion);
      assert.equal(serializeProgram(deserializeProgram(text)), text.replace(stored, '"packageVersion":' + JSON.stringify(packageVersion)));
      console.log(JSON.stringify({ status: "passed", sha256: createHash("sha256").update(text).digest("hex") }));`;
    const result = JSON.parse(execFileSync(process.execPath, ["--input-type=module", "--eval", source], { encoding: "utf8" }));
    assert.equal(result.status, "passed"); assert.match(result.sha256, /^[a-f0-9]{64}$/);
  });
