import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import { executeRealisticScenarioTask } from
  "../../scripts/run-realistic-scenario-worker.js";
import {
  generateRealisticDescriptorsInWorker,
  parseRealisticScenarioArguments,
  promoteRealisticScenarioRun,
  realisticScenarioRunLayout,
  runRealisticScenarioCorpus
} from
  "../../scripts/run-realistic-scenarios.js";
import { releaseTidyTuesdaySourceCache } from
  "../support/datasets/tidytuesday.js";

let boundedGeneration;

function generated() {
  boundedGeneration ??= generateRealisticDescriptorsInWorker({ limit: 1 });
  return boundedGeneration;
}

test("parses strict realistic scenario renderer and resource options", () => {
  const defaults = parseRealisticScenarioArguments([]);
  assert.equal(defaults.artifacts, true);
  assert.equal(defaults.png, true);
  assert.equal(defaults.pdfCount, 100);
  assert.equal(defaults.deterministic, true);
  assert.equal(defaults.allowPartial, false);
  assert.equal(defaults.concurrency >= 1 && defaults.concurrency <= 4, true);
  assert.equal(defaults.generationTimeout, 600_000);

  assert.deepEqual(parseRealisticScenarioArguments(["--no-artifacts"]), {
    concurrency: defaults.concurrency,
    timeout: 120_000,
    generationTimeout: 600_000,
    artifacts: false,
    png: false,
    pdfCount: 0,
    deterministic: true,
    allowPartial: false
  });

  assert.deepEqual(parseRealisticScenarioArguments([
    "--concurrency=2",
    "--timeout=5000",
    "--generation-timeout=9000",
    "--pdf-count=7",
    "--limit=11",
    "--no-deterministic",
    "--allow-partial"
  ]), {
    concurrency: 2,
    timeout: 5_000,
    generationTimeout: 9_000,
    artifacts: true,
    png: true,
    pdfCount: 7,
    deterministic: false,
    allowPartial: true,
    limit: 11
  });
});

test("rejects ambiguous or coverage-defeating realistic runner options", () => {
  for (const values of [
    ["--unknown"],
    ["--limit=0"],
    ["--limit=1=2"],
    ["--limit=1"],
    ["--concurrency=5"],
    ["--concurrency=4294967295"],
    ["--timeout=2147483648"],
    ["--generation-timeout=3600001"],
    ["--concurrency=2", "--concurrency=3"],
    ["--no-artifacts", "--no-png"],
    ["--no-png"],
    ["--pdf-count=0"]
  ]) {
    assert.throws(() => parseRealisticScenarioArguments(values));
  }
  assert.equal(
    parseRealisticScenarioArguments(["--no-png", "--pdf-count=0", "--allow-partial"])
      .allowPartial,
    true
  );
});

test("isolates realistic descriptor generation in a disposable worker", async () => {
  const { descriptors, generation } = await generated();
  assert.equal(descriptors.length, 1);
  assert.equal(generation.selectedDescriptors, 1);
  assert.equal(generation.acceptedCandidates, 72);
  assert.equal(
    generation.attemptedCandidates,
    generation.acceptedCandidates + generation.rejectedCandidates +
      generation.duplicateCandidates
  );
  assert.equal(descriptors[0].metadata.corpus, "tidytuesday");
});

test("renders every artifact from the exact program credited by scenario evidence", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-realistic-task-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const { descriptors } = await generated();
  const descriptor = descriptors[0];
  t.after(() => releaseTidyTuesdaySourceCache(descriptor.factors.dataset));
  const outcome = await executeRealisticScenarioTask({
    index: 0,
    descriptor,
    deterministic: true,
    artifacts: true,
    png: true,
    pdf: true,
    visualAudit: true,
    output: directory
  });
  assert.equal(outcome.ok, true, outcome.error?.stack);
  assert.equal(outcome.result.semanticFingerprint, descriptor.semanticFingerprint);
  assert.deepEqual(outcome.result.renderers, ["svg", "canvas", "png", "pdf"]);
  assert.equal(outcome.result.artifacts.svg.validation.replayHash, true);
  assert.equal(outcome.result.artifacts.png.validation.nonBlank, true);
  assert.equal(outcome.result.artifacts.pdf.validation.drawingContent, true);
  for (const artifact of Object.values(outcome.result.artifacts)) {
    assert.equal((await readFile(artifact.output)).length, artifact.bytes);
    assert.equal(path.relative(directory, artifact.output).startsWith(".."), false);
  }
});

test("keeps partial and audit runs immutable while promoting only strict artifacts", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "ggaction-realistic-layout-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const strict = parseRealisticScenarioArguments([]);
  const audit = parseRealisticScenarioArguments(["--no-artifacts"]);
  const partial = parseRealisticScenarioArguments(["--allow-partial", "--limit=1"]);
  assert.equal(realisticScenarioRunLayout(strict, { artifactRoot: root, runId: "strict" })
    .category, "runs");
  assert.equal(realisticScenarioRunLayout(audit, { artifactRoot: root, runId: "audit" })
    .category, "audits");
  assert.equal(realisticScenarioRunLayout(partial, { artifactRoot: root, runId: "partial" })
    .category, "partial");

  await mkdir(path.join(root, "latest"), { recursive: true });
  await writeFile(path.join(root, "latest", "marker"), "legacy", "utf8");
  const first = realisticScenarioRunLayout(strict, { artifactRoot: root, runId: "first" });
  await mkdir(first.output, { recursive: true });
  await writeFile(path.join(first.output, "marker"), "first", "utf8");
  const promoted = await promoteRealisticScenarioRun(first);
  assert.equal((await lstat(first.latest)).isSymbolicLink(), true);
  assert.equal(await readFile(path.join(first.latest, "marker"), "utf8"), "first");
  assert.equal(await readFile(path.join(promoted.legacy, "marker"), "utf8"), "legacy");

  const second = realisticScenarioRunLayout(strict, { artifactRoot: root, runId: "second" });
  await mkdir(second.output, { recursive: true });
  await writeFile(path.join(second.output, "marker"), "second", "utf8");
  await promoteRealisticScenarioRun(second);
  assert.equal(await readFile(path.join(second.latest, "marker"), "utf8"), "second");
  assert.equal(await readFile(path.join(first.output, "marker"), "utf8"), "first");
});

test("writes bounded diagnostics separately and narrows only renderer audit evidence", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "ggaction-realistic-partial-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const generation = await generated();
  const options = parseRealisticScenarioArguments([
    "--no-artifacts",
    "--allow-partial",
    "--limit=1",
    "--concurrency=1"
  ]);
  const result = await runRealisticScenarioCorpus(options, {
    artifactRoot: root,
    runId: "bounded-audit",
    generated: generation
  });
  assert.equal(result.layout.category, "partial");
  assert.equal(await lstat(path.join(root, "latest")).catch(() => undefined), undefined);
  assert.equal(result.report.coverage.passed, false);
  assert.deepEqual(
    result.report.coverage.requirements
      .filter(value => value.kind === "renderer")
      .map(value => value.id),
    ["renderer:svg"]
  );
  assert.equal(result.report.coverageEnforced, false);
  assert.equal(JSON.parse(await readFile(
    path.join(result.layout.output, "manifest.json"),
    "utf8"
  )).charts[0].semanticFingerprint, generation.descriptors[0].semanticFingerprint);
});
