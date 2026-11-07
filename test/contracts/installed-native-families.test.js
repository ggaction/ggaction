import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { preparePackageConsumer } from "../../scripts/package-consumer.js";
import { testNodeConsumer } from "../../scripts/consumers/node.js";
import { testOptionalDependencies } from "../../scripts/consumers/optional-peers.js";

// These are actual bare-package programs, not export-name or source-AST checks.
// The canonical consumer runs once, then every family requires its own receipts.
const hierarchy = ["hierarchy/full-basic-lifecycle", "hierarchy/fresh-process-edit-revise", "hierarchy/renderers-and-scene"];
const routes = ["interaction-animation/four-route-player-lifecycle", "edge-routes/responsive-source-and-guide-closure", "edge-routes/offline-restore-and-revision", "edge-routes/four-renderers-and-scene"];
const geographic = ["geographic-marks/full-basic-coordinates-and-consumers", "geographic-marks/fresh-process-offline-edit", "geographic-marks/four-renderers-scene-and-holes"];
const lifecycle = prefix => [`${prefix}/public-lifecycle`, `${prefix}/offline-scene-renderers`, `${prefix}/fresh-process-and-nested`];
const families = {
  "compound-path": ["extension/compound-path", "geometry/declared-winding-offline-renderers"],
  pattern: ["paint/structured-filled-marks", "paint/structured-text", "paint/fresh-codec"],
  image: ["images/resource-lifecycle", "images/renderer-scene-offline"],
  "partition-cartesian": [...hierarchy, "animation-partition/offline-four-renderers"],
  "partition-polar": [...hierarchy, "animation-partition/offline-four-renderers"],
  tree: hierarchy,
  treemap: hierarchy,
  "graph-nodes": ["data/observed-graph-lifecycle", "animation-graph/offline-four-renderers"],
  "edges-hierarchical": routes,
  "edges-force-directed": routes,
  "edges-density": routes,
  "edges-edge-path": routes,
  "sankey-dag": ["flow/full-basic-lifecycle", "flow/fresh-process-source-revision", "flow/renderers-scene-codec"],
  "sankey-cyclic": ["flow/full-basic-lifecycle", "flow/fresh-process-source-revision", "flow/renderers-scene-codec"],
  "contour-line": ["contour/full-basic-lifecycle", "contour/fresh-process-source-revision", "contour/renderers-scene-codec"],
  "contour-filled": ["contour/full-basic-lifecycle", "contour/fresh-process-source-revision", "contour/renderers-scene-codec"],
  calendar: ["calendar/full-basic-lifecycle", "calendar/fresh-process-source-revision", "calendar/renderers-scene-codec"],
  table: ["table/public-lifecycle", "table/offline-clipped-scene-renderers", "table/fresh-process-and-nested"],
  pyramid: lifecycle("pyramid"),
  ohlc: lifecycle("ohlc"),
  waterfall: lifecycle("waterfall"),
  trail: lifecycle("trail"),
  "geo-shape": geographic,
  "geo-point": geographic,
  "geo-line": geographic,
  graticule: geographic,
  "rose-regression": ["guides/create-canvas-14"],
  "radar-regression": ["authoring/radar-wide", "authoring/radar-profile-summary"],
  "streamgraph-regression": ["stream-baselines/public-lifecycle", "stream-baselines/offline-scene-renderers", "stream-baselines/fresh-process-nested"],
  "violin-regression": ["authoring/violin-plot-facade"]
};

test("installed native families execute against one canonical package", { timeout: 900_000 }, async t => {
  const consumer = await preparePackageConsumer();
  try {
    assert.equal(consumer.installedManifest.name, "ggaction");
    await testOptionalDependencies(consumer);
    let executionError;
    try { await testNodeConsumer(consumer.directory); } catch (error) { executionError = error; }
    const records = JSON.parse(await readFile(path.join(consumer.directory, "node-cases.json"), "utf8"));
    assert.equal(new Set(records.map(record => record.id)).size, records.length, "duplicate runtime receipt");
    const actual = new Map(records.map(record => [record.id, record]));
    for (const id of ["static-delivery/interacted-native-offline-four-formats", "static-delivery/native-endpoints-animation-replay",
      "animation/offline-fresh-process", "fonts/resource-metrics-offline", "interaction-animation/fresh-offline-native-scope"]) {
      assert.equal(actual.get(id)?.status, "passed", `${id}: ${actual.get(id)?.error ?? "missing receipt"}`);
    }
    for (const [family, ids] of Object.entries(families)) {
      await t.test(`${family} has executed installed runtime evidence`, () => {
        for (const id of ids) assert.equal(actual.get(id)?.status, "passed", `${id}: ${actual.get(id)?.error ?? "missing receipt"}`);
      });
    }
    if (executionError) throw executionError;
    assert.ok(records.length > 0);
    assert.deepEqual(records.filter(record => record.status !== "passed"), []);
  } finally {
    await consumer.cleanup();
  }
});
