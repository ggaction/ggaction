import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { searchGgaction } from "../knowledge/task-resolver.js";
import { docsFallbackResources } from "../src/mcp/adapter.js";
import { root } from "./compact-paid-smoke-v4.js";

const target = path.join(
  root,
  "evaluation",
  "compact-authoring-full-v1",
  "ROUTE_ORACLE.json"
);
const sources = Object.freeze([
  { corpus: "repair", directory: "compact-authoring-repair", split: "validation" },
  { corpus: "repair", directory: "compact-authoring-repair", split: "held-out" },
  { corpus: "policy", directory: "compact-authoring-policy", split: "validation" },
  { corpus: "policy", directory: "compact-authoring-policy", split: "held-out" }
]);

function renderer(actionPlan, unsupported, unresolved) {
  const runtime = actionPlan.findLast(entry => entry.id.startsWith("runtime.render"))?.id;
  if (runtime === "runtime.render") return "canvas";
  if (runtime === "runtime.renderToSVG") return "svg";
  if (runtime === "runtime.renderToPNG") return "png";
  if (runtime === "runtime.renderToPDF") return "pdf";
  return unsupported.length === 0 && unresolved.length === 0 ? "canvas" : null;
}

async function tasks() {
  const entries = [];
  for (const source of sources) {
    const artifact = JSON.parse(await readFile(path.join(
      root,
      "evaluation",
      source.directory,
      `${source.split}.json`
    ), "utf8"));
    for (const task of artifact.tasks) {
      const packet = searchGgaction(task.query);
      const expectedPlan = packet.actionPlan.map(entry => ({
        id: entry.id,
        options: entry.requiredOptions
      }));
      const expectedUnsupported = packet.unsupported.map(entry => entry.constraint);
      const expectedUnresolved = packet.unresolved.map(entry => entry.constraint);
      const expectedFallbacks = docsFallbackResources(packet).map(resource => resource.uri);
      const role = expectedUnsupported.length > 0
        ? "unsupported"
        : expectedUnresolved.length > 0 ? "needs-input" : "supported";
      entries.push({
        id: task.id,
        source: { corpus: source.corpus, split: source.split },
        stratum: task.stratum,
        role,
        expectedRenderer: renderer(expectedPlan, expectedUnsupported, expectedUnresolved),
        expectedPlan,
        expectedUnsupported,
        expectedUnresolved,
        expectedFallbacks,
        expectedDRoute: [
          "search_ggaction",
          ...(expectedFallbacks.length > 0 ? ["read_mcp_resources"] : []),
          "submit_result"
        ]
      });
    }
  }
  return entries;
}

const oracle = {
  schemaVersion: 1,
  id: "compact-authoring-full-route-oracle-v1",
  packetSchemaVersion: 3,
  sourceCorpora: ["compact-authoring-repair-v1", "compact-authoring-policy-v1"],
  conditions: [
    { id: "A", mode: "public-docs" },
    { id: "B", mode: "compact-direct" },
    { id: "C", mode: "compact-mcp" },
    { id: "D", mode: "mcp-first-explicit-fallback" }
  ],
  tasks: await tasks()
};

const serialized = `${JSON.stringify(oracle, null, 2)}\n`;
try {
  const existing = await readFile(target, "utf8");
  if (existing !== serialized) {
    throw new Error("Full evaluation v1 oracle is already frozen and must not be overwritten.");
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, serialized);
}
process.stdout.write(`${target}\n`);
