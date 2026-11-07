import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../../", import.meta.url));
test("graph host and async-only worker bundles keep Full planning assembly and renderers out", async () => {
  for (const [name, source] of [["host", 'import * as graph from "./src/graph.js"; globalThis.routes = graph;'],
    ["worker", 'import {computeGraphEdgeRoutesAsync} from "./src/graph.js"; globalThis.routes = computeGraphEdgeRoutesAsync;']]) {
    const built = await build({ stdin: { contents: source, resolveDir: root, sourcefile: `${name}.js` },
      absWorkingDir: root, bundle: true, write: false, format: "esm", platform: "browser", minify: true, metafile: true });
    const included = Object.entries(Object.values(built.metafile.outputs)[0].inputs).filter(([, entry]) => entry.bytesInOutput > 0).map(([file]) => file);
    assert.deepEqual(included.filter(file => file === "src/ChartProgram.js" || file === "src/index.js" ||
      file.startsWith("src/actions/") || file.startsWith("src/renderers/") || file.startsWith("src/mcp/") || file.startsWith("node:")), [], name);
    assert.ok(included.includes("src/grammar/graph/routes/job.js"));
    if (name === "worker") {
      assert.deepEqual(included.filter(file => file.startsWith("src/materialization/") || file.startsWith("src/selectors/") || file === "src/resources/graphRouteExecutor.js" || file === "src/resources/graphRoutes.js"), []);
    } else assert.ok(included.includes("src/resources/graphRoutes.js"));
  }
});
