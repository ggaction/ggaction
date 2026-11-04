import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";

// Production tree-shaking may drop an unused `new` of a side-effect-free class.
// Ownership must survive the same production build that consumers use.
test("production bundles keep exact ownership marks", async () => {
  const immutable = fileURLToPath(new URL("../../src/core/immutable.js", import.meta.url));
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-owned-mark-"));
  try {
    const entry = path.join(directory, "entry.js");
    await writeFile(entry, `import { freezeOwned, isOwned, cloneAndFreeze } from ${JSON.stringify(immutable)};
const owned = freezeOwned({ a: 1 }), clone = cloneAndFreeze({ b: [1] }), caller = Object.freeze({ c: 1 });
export const result = [isOwned(owned), isOwned(clone), isOwned(clone.b), isOwned(caller), isOwned({ ...owned })];`);
    const output = await build({
      configFile: false, logLevel: "silent", root: directory,
      build: { write: false, minify: true, lib: { entry, formats: ["es"], fileName: "entry" } }
    });
    const code = (Array.isArray(output) ? output[0] : output).output[0].code;
    const { result } = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
    assert.deepEqual(result, [true, true, true, false, false]);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
