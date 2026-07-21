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

function headings(source) {
  return [...source.matchAll(/^(#{2,4}) (.+)$/gmu)]
    .map(match => `${match[1]} ${match[2].trim()}`);
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

test("labels current and historical roadmap roots without rewriting history", () => {
  for (const entry of roadmapIndex.roadmaps) {
    const source = readFileSync(path.join(root, entry.file), "utf8");
    const expected = entry.status === "active"
      ? "문서 상태 — 현재 실행 계획."
      : "문서 상태 — 완료된 실행 기록.";
    assert.match(source, new RegExp(expected), entry.id);
    if (entry.status === "completed") {
      assert.match(source, /ACTION_INDEX\.json/, entry.id);
    } else {
      assert.match(source, /ROADMAP_INDEX\.json/, entry.id);
    }
  }
});

test("routes architecture work without duplicating the canonical record", () => {
  const architecture = readFileSync(
    path.join(agentDocsRoot, "SECOND_ARCHITECTURE.md"),
    "utf8"
  );
  const map = readFileSync(
    path.join(agentDocsRoot, "architecture", "README.md"),
    "utf8"
  );
  const architectureHeadings = headings(architecture);

  assert.equal(new Set(architectureHeadings).size, architectureHeadings.length);
  assert.match(architecture, /architecture\/README\.md/);
  assert.match(map, /SECOND_ARCHITECTURE\.md/);
  for (const route of [
    "Public package boundary",
    "ChartProgram",
    "semanticSpec",
    "graphicSpec",
    "Action과 trace",
    "materialization",
    "Canvas renderer",
    "Source ownership",
    "Test architecture"
  ]) {
    assert.match(map, new RegExp(route), route);
  }
});

test("keeps the contract landing page lightweight and action-directed", () => {
  const contractRoot = path.join(agentDocsRoot, "contract");
  const readme = readFileSync(path.join(contractRoot, "README.md"), "utf8");
  const formalTypes = readFileSync(path.join(contractRoot, "FORMAL_TYPES.md"), "utf8");

  assert.match(readme, /ACTION_INDEX\.json/);
  assert.match(readme, /contract\.file/);
  assert.match(readme, /contract\.anchor/);
  assert.match(readme, /FORMAL_TYPES\.md/);
  assert.doesNotMatch(readme, /type SemanticPropertyPath/);
  assert.match(formalTypes, /type SemanticPropertyPath/);
  assert.equal(Buffer.byteLength(readme) < 8_000, true);
});
