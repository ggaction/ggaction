import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const agentDocsRoot = path.join(root, "agent_docs");
const roadmapIndexFile = path.join(agentDocsRoot, "impl", "ROADMAP_INDEX.json");
const roadmapIndex = JSON.parse(readFileSync(roadmapIndexFile, "utf8"));

function roadmap(id) {
  return roadmapIndex.roadmaps.find(entry => entry.id === id);
}

test("keeps one machine-readable active roadmap and phase", () => {
  assert.equal(roadmapIndex.version, 1);
  assert.equal(new Set(roadmapIndex.roadmaps.map(entry => entry.id)).size,
    roadmapIndex.roadmaps.length);

  const active = roadmapIndex.roadmaps.filter(entry => entry.status === "active");
  assert.equal(active.length, 1);
  assert.equal(active[0].id, roadmapIndex.activeRoadmap);
  assert.equal(active[0].role, "current-execution-plan");
  assert.equal(Number.isInteger(roadmapIndex.activePhase), true);
  assert.equal(roadmapIndex.activePhase >= 0, true);

  for (const entry of roadmapIndex.roadmaps) {
    assert.equal(["active", "completed"].includes(entry.status), true, entry.id);
    assert.equal(existsSync(path.join(root, entry.file)), true, entry.file);
    if (entry.status === "completed") {
      assert.equal(entry.role, "historical-execution-record", entry.id);
    }
    if (entry.successor !== undefined) {
      assert.notEqual(roadmap(entry.successor), undefined, entry.successor);
    }
  }
});

test("keeps human entry points synchronized with the active roadmap", () => {
  const rootReadme = readFileSync(path.join(agentDocsRoot, "README.md"), "utf8");
  const implReadme = readFileSync(path.join(agentDocsRoot, "impl", "README.md"), "utf8");
  const active = roadmapIndex.activeRoadmap;
  const phase = roadmapIndex.activePhase;

  assert.match(rootReadme, new RegExp(`Roadmap ${active.replace("roadmap", "")}`));
  assert.match(rootReadme, new RegExp(`Phase ${phase}`));
  assert.match(implReadme, new RegExp(`${active}/ROADMAP\\.md`));
  assert.match(implReadme, new RegExp(`Phase ${phase}`));

  for (const entry of roadmapIndex.roadmaps) {
    assert.match(implReadme, new RegExp(`${entry.id}/ROADMAP\\.md`), entry.id);
  }
});

test("keeps the active phase aligned with the roadmap status table", () => {
  const active = roadmap(roadmapIndex.activeRoadmap);
  const source = readFileSync(path.join(root, active.file), "utf8");
  assert.match(
    source,
    new RegExp(`\\| ${roadmapIndex.activePhase} \\| planned \\|`)
  );
  assert.match(source, new RegExp(`^## Phase ${roadmapIndex.activePhase} —`, "m"));
});
