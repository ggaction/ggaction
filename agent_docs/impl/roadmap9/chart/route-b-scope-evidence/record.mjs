import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../../../", import.meta.url));
const output = fileURLToPath(new URL("qualification.json", import.meta.url));
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const nodes = [
  "/Users/hyeonjeon/.npm/_npx/ebaba8b9e55fd0a9/node_modules/node/bin/node",
  "/opt/homebrew/bin/node",
  "/Users/hyeonjeon/.npm/_npx/387698761821791d/node_modules/node/bin/node"
];
const runs = nodes.map(node => ({
  prototype: JSON.parse(execFileSync(node, [fileURLToPath(new URL("prototype.mjs", import.meta.url))], { cwd: root, encoding: "utf8" })),
  theme: JSON.parse(execFileSync(node, [fileURLToPath(new URL("theme-counterexample.mjs", import.meta.url))], { cwd: root, encoding: "utf8" }))
}));
const docs = execFileSync(nodes[1], ["--test", "test/contracts/documentation-truth.test.js", "test/docs/architecture-paths.test.js"], { cwd: root, encoding: "utf8" });
await writeFile(new URL("documentation.tap", import.meta.url), docs);
const paths = [
  "src/core/action.js", "src/resources/graphRoutes.js", "src/actions/graphs/layouts.js",
  "src/actions/theme/reconcile.js", "src/actions/canvas/fitting.js", "src/actions/data/edit.js",
  "src/actions/data/revise.js", "src/materialization/revisionIdentity.js",
  "agent_docs/impl/roadmap9/chart/route-b-native-connection.md",
  "agent_docs/impl/roadmap9/chart/route-b-scope-evidence/prototype.mjs",
  "agent_docs/impl/roadmap9/chart/route-b-scope-evidence/theme-counterexample.mjs",
  "agent_docs/impl/roadmap9/chart/route-b-scope-evidence/record.mjs",
  "agent_docs/impl/roadmap9/chart/route-b-scope-evidence/verify.mjs",
  "README.md", "agent_docs/SECOND_ARCHITECTURE.md", "scripts/browser-bundle-size.js"
];
const sources = await Promise.all(paths.map(async path => ({ path, sha256: digest(await readFile(resolve(root, path))) })));
const result = { status: "review-only-native-invocation-scope", base: "3427ae56f", sources, runs,
  docs: { passed: 4, receipt: "documentation.tap", sha256: digest(docs) },
  claims: { productRuntimeChanged: false, publicBImplemented: false, routeAuthorityTested: false,
    fullNativeUnion: false, latency100ms: false, sourceFreePackageRequalified: false },
  remaining: ["Adopt and implement the private invocation scope only for the authentic B facade.",
    "Connect native preparation through materialization and theme before publishing an update handle.",
    "Preserve native theme authored-source inspection and removeTheme completion metadata.",
    "Integrate data identities, fit probes and the full indirect native union."] };
await writeFile(output, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify({ nodes: runs.map(run => run.prototype.node), casesPerNode: 12, documentation: 4, sourcePins: sources.length }));
