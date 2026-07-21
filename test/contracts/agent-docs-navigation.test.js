import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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

function markdownAnchors(source) {
  const counts = new Map();
  const anchors = new Set();
  for (const match of source.matchAll(/^#{1,6}\s+(.+)$/gmu)) {
    const base = match[1]
      .trim()
      .replace(/<[^>]*>/gu, "")
      .replace(/[`*_~]/gu, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .trim()
      .replace(/\s+/gu, "-");
    const count = counts.get(base) ?? 0;
    counts.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }
  return anchors;
}

function localMarkdownLinks(source) {
  return [...source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu)]
    .map(match => match[1].trim().replace(/^<|>$/gu, ""))
    .filter(link => !/^(?:https?:|mailto:)/u.test(link));
}

test("keeps one machine-readable active roadmap and optional phase", () => {
  assert.equal(roadmapIndex.version, 1);
  assert.equal(new Set(roadmapIndex.roadmaps.map(entry => entry.id)).size,
    roadmapIndex.roadmaps.length);

  const active = roadmapIndex.roadmaps.filter(entry => entry.status === "active");
  assert.equal(active.length, 1);
  assert.equal(active[0].id, roadmapIndex.activeRoadmap);
  assert.equal(active[0].role, "current-execution-plan");
  assert.equal(
    roadmapIndex.activePhase === null || Number.isInteger(roadmapIndex.activePhase),
    true
  );
  if (roadmapIndex.activePhase !== null) {
    assert.equal(roadmapIndex.activePhase >= 0, true);
  } else {
    assert.equal(Number.isInteger(roadmapIndex.lastCompletedPhase), true);
    assert.equal(roadmapIndex.lastCompletedPhase >= 0, true);
  }

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
  const phaseLabel = phase ?? roadmapIndex.lastCompletedPhase;

  assert.match(rootReadme, new RegExp(`Roadmap ${active.replace("roadmap", "")}`));
  assert.match(rootReadme, new RegExp(`Phase ${phaseLabel}`));
  assert.match(implReadme, new RegExp(`${active}/ROADMAP\\.md`));
  assert.match(implReadme, new RegExp(`Phase ${phaseLabel}`));

  for (const entry of roadmapIndex.roadmaps) {
    assert.match(implReadme, new RegExp(`${entry.id}/ROADMAP\\.md`), entry.id);
  }
});

test("keeps the active phase aligned with the roadmap status table", () => {
  const active = roadmap(roadmapIndex.activeRoadmap);
  const source = readFileSync(path.join(root, active.file), "utf8");
  if (roadmapIndex.activePhase === null) {
    assert.match(
      source,
      new RegExp(`\\| ${roadmapIndex.lastCompletedPhase} \\| completed \\|`)
    );
    assert.equal(
      /^\| \d+ \| in-progress \|/mu.test(source),
      false
    );
    return;
  }
  assert.match(
    source,
    new RegExp(`\\| ${roadmapIndex.activePhase} \\| (?:planned|in-progress|blocked) \\|`)
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

test("keeps current agent-documentation routes and anchors valid", () => {
  const contractRoot = path.join(agentDocsRoot, "contract");
  const files = [
    path.join(agentDocsRoot, "README.md"),
    path.join(agentDocsRoot, "architecture", "README.md"),
    path.join(agentDocsRoot, "SECOND_ARCHITECTURE.md"),
    path.join(contractRoot, "README.md"),
    path.join(contractRoot, "FORMAL_TYPES.md"),
    path.join(contractRoot, "ACTION_CATALOG.md"),
    path.join(agentDocsRoot, "impl", "README.md"),
    path.join(agentDocsRoot, "impl", "HISTORY.md"),
    ...readdirSync(path.join(contractRoot, "current"))
      .filter(file => file.endsWith(".md"))
      .map(file => path.join(contractRoot, "current", file))
  ];

  for (const file of files) {
    const source = readFileSync(file, "utf8");
    for (const link of localMarkdownLinks(source)) {
      const hash = link.indexOf("#");
      const rawPath = hash < 0 ? link : link.slice(0, hash);
      const fragment = hash < 0 ? "" : decodeURIComponent(link.slice(hash + 1));
      const target = path.resolve(
        path.dirname(file),
        decodeURIComponent(rawPath || path.basename(file))
      );

      assert.equal(existsSync(target), true, `${file}: ${link}`);
      if (fragment && statSync(target).isFile() && target.endsWith(".md")) {
        const anchors = markdownAnchors(readFileSync(target, "utf8"));
        assert.equal(anchors.has(fragment.toLowerCase()), true, `${file}: ${link}`);
      }
    }
  }
});
