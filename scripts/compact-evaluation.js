import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  docsFallbackResources,
  searchGgactionText
} from "../src/mcp/adapter.js";
import {
  searchGgaction,
  taskPacketBytes
} from "../knowledge/task-resolver.js";

export const root = fileURLToPath(new URL("../", import.meta.url));
export const evaluationRoot = path.join(root, "evaluation", "compact-authoring");
export const repairEvaluationRoot = path.join(
  root,
  "evaluation",
  "compact-authoring-repair"
);
export const EVALUATION_CORPORA = Object.freeze({
  original: Object.freeze({
    directory: evaluationRoot,
    corpusId: "compact-authoring-fresh-v1",
    productBaseCommit: "9414d07179c9e7c6bbfdf00b762fc35de0ff25ec",
    overlapDirectories: Object.freeze([])
  }),
  repair: Object.freeze({
    directory: repairEvaluationRoot,
    corpusId: "compact-authoring-repair-v1",
    productBaseCommit: "c1abbd6392603f05a0784ab045e76d2202ed2dd7",
    overlapDirectories: Object.freeze([evaluationRoot])
  })
});
const typesRoot = path.join(root, "types");
const tscFile = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc"
);

export const SPLITS = Object.freeze(["development", "validation", "held-out"]);
export const FROZEN_SOURCE_FILES = Object.freeze([
  "datasets.json",
  "development.json",
  "held-out.json",
  "oracle-policy.json",
  "task.schema.json",
  "validation.json"
]);

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeQuery(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

export function corpusConfig(corpus = "original") {
  const config = EVALUATION_CORPORA[corpus];
  if (!config) {
    throw new Error(`Unknown compact evaluation corpus: ${corpus}`);
  }
  return config;
}

export async function loadCorpusSources(corpus = "original") {
  const config = corpusConfig(corpus);
  const [datasets, oracle, taxonomy, cards, design, ...splitArtifacts] = await Promise.all([
    json(path.join(config.directory, "datasets.json")),
    json(path.join(config.directory, "oracle-policy.json")),
    json(path.join(root, "knowledge", "intent-taxonomy.json")),
    json(path.join(root, "knowledge", "action-cards.json")),
    json(path.join(root, "knowledge", "task-closure-cases.json")),
    ...SPLITS.map(split => json(path.join(config.directory, `${split}.json`)))
  ]);
  return { config, datasets, oracle, taxonomy, cards, design, splitArtifacts };
}

function countBy(values, key) {
  return Object.fromEntries([...new Set(values.map(value => value[key]))]
    .sort()
    .map(name => [name, values.filter(value => value[key] === name).length]));
}

export async function validateCorpusSource(corpus = "original") {
  const { config, datasets, oracle, taxonomy, cards, design, splitArtifacts } =
    await loadCorpusSources(corpus);
  const errors = [];
  const datasetIds = new Set(datasets.datasets.map(dataset => dataset.id));
  const constraints = new Set(taxonomy.constraints.map(constraint => constraint.id));
  const providers = new Map(taxonomy.providers.map(provider => [provider.id, provider]));
  const cardsByName = new Map(cards.cards.map(card => [card.name, card]));
  const fallbackIds = new Set(
    JSON.parse(await readFile(path.join(root, "knowledge", "mcp-resources.json"), "utf8"))
      .docs.map(section => `ggaction://docs/${section.id}`)
  );
  const taskIds = new Set();
  const queryOwners = new Map();
  const tasks = [];

  for (const [index, artifact] of splitArtifacts.entries()) {
    const split = SPLITS[index];
    if (artifact.schemaVersion !== 1 || artifact.split !== split) {
      errors.push(`${split}: invalid artifact identity`);
    }
    if (artifact.tasks.length !== oracle.splits[split]) {
      errors.push(`${split}: expected ${oracle.splits[split]} tasks, found ${artifact.tasks.length}`);
    }
    for (const task of artifact.tasks) {
      tasks.push(task);
      if (task.split !== split) errors.push(`${task.id}: split mismatch`);
      if (taskIds.has(task.id)) errors.push(`${task.id}: duplicate task id`);
      taskIds.add(task.id);
      if (!datasetIds.has(task.dataset)) errors.push(`${task.id}: unknown dataset ${task.dataset}`);
      if (!["simple", "complex"].includes(task.stratum)) {
        errors.push(`${task.id}: invalid stratum ${task.stratum}`);
      }
      if (typeof task.query !== "string" || task.query.length < 12 || task.query.length > 500) {
        errors.push(`${task.id}: invalid query length`);
      }
      const normalized = normalizeQuery(task.query);
      if (queryOwners.has(normalized)) {
        errors.push(`${task.id}: duplicate query with ${queryOwners.get(normalized)}`);
      }
      queryOwners.set(normalized, task.id);
      for (const constraint of task.expected.constraints) {
        if (!constraints.has(constraint)) errors.push(`${task.id}: unknown constraint ${constraint}`);
      }
      for (const unresolved of task.expected.unresolved) {
        if (!constraints.has(unresolved) && unresolved !== "query.intent") {
          errors.push(`${task.id}: unknown unresolved constraint ${unresolved}`);
        }
      }
      for (const entry of task.expected.plan) {
        const provider = providers.get(entry.id);
        if (!provider) {
          errors.push(`${task.id}: unknown provider ${entry.id}`);
          continue;
        }
        if (provider.kind === "runtime" && entry.options.length !== 0) {
          errors.push(`${task.id}: runtime provider ${entry.id} cannot own options`);
        }
        if (provider.kind === "action") {
          const optionNames = new Set(cardsByName.get(provider.name).options.map(option => option.name));
          for (const option of entry.options) {
            if (!optionNames.has(option)) errors.push(`${task.id}: ${entry.id} unknown option ${option}`);
          }
        }
      }
      for (const fallback of task.expected.fallbacks) {
        if (!fallbackIds.has(fallback)) errors.push(`${task.id}: unknown fallback ${fallback}`);
      }
      if (task.expected.unresolved.length === 0 && task.expected.fallbacks.length !== 0) {
        errors.push(`${task.id}: resolved task declares a docs fallback`);
      }
    }
  }

  const strata = countBy(tasks, "stratum");
  for (const [stratum, expected] of Object.entries(oracle.strata)) {
    if (strata[stratum] !== expected) {
      errors.push(`${stratum}: expected ${expected} tasks, found ${strata[stratum] ?? 0}`);
    }
  }
  if (tasks.length !== oracle.taskCount) {
    errors.push(`expected ${oracle.taskCount} total tasks, found ${tasks.length}`);
  }

  const coveredConstraints = new Set(tasks.flatMap(task => task.expected.constraints));
  const missingConstraints = taxonomy.constraints
    .map(constraint => constraint.id)
    .filter(id => !coveredConstraints.has(id));
  if (missingConstraints.length > 0) {
    errors.push(`evaluation corpus misses constraints: ${missingConstraints.join(", ")}`);
  }

  const designQueries = new Set(design.cases.map(entry => normalizeQuery(entry.query)));
  const designOverlap = tasks.filter(task => designQueries.has(normalizeQuery(task.query)));
  if (designOverlap.length > 0) {
    errors.push(`Phase 2 design query overlap: ${designOverlap.map(task => task.id).join(", ")}`);
  }

  const priorQueries = new Set();
  for (const directory of config.overlapDirectories) {
    for (const split of SPLITS) {
      const artifact = await json(path.join(directory, `${split}.json`));
      for (const task of artifact.tasks) priorQueries.add(normalizeQuery(task.query));
    }
  }
  const priorOverlap = tasks.filter(task => priorQueries.has(normalizeQuery(task.query)));
  if (priorOverlap.length > 0) {
    errors.push(`Prior compact corpus query overlap: ${priorOverlap.map(task => task.id).join(", ")}`);
  }

  if (errors.length > 0) throw new Error(errors.join("\n"));
  return Object.freeze({
    tasks: tasks.length,
    splits: countBy(tasks, "split"),
    strata,
    datasets: datasetIds.size,
    constraints: coveredConstraints.size,
    phase2DesignQueryOverlap: designOverlap.length,
    ...(config.overlapDirectories.length > 0
      ? { priorCorpusQueryOverlap: priorOverlap.length }
      : {}),
    querySha256: sha256(tasks.map(task => normalizeQuery(task.query)).sort().join("\n"))
  });
}

export async function buildFrozenManifest(corpus = "original") {
  const config = corpusConfig(corpus);
  const summary = await validateCorpusSource(corpus);
  const files = {};
  for (const relative of FROZEN_SOURCE_FILES) {
    const bytes = await readFile(path.join(config.directory, relative));
    files[relative] = { bytes: bytes.length, sha256: sha256(bytes) };
  }
  return {
    schemaVersion: 1,
    corpusId: config.corpusId,
    frozenOn: "2026-08-08",
    productBaseCommit: config.productBaseCommit,
    exclusions: {
      roadmap53FrozenCorpus: "not-read-not-reused",
      phase2DesignFixtures: "overlap-check-only-not-evaluation"
    },
    summary,
    files
  };
}

export async function assertFrozenManifest(corpus = "original") {
  const config = corpusConfig(corpus);
  const expected = await buildFrozenManifest(corpus);
  const actual = await json(path.join(config.directory, "FROZEN.json"));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error("Compact evaluation freeze is stale. Run the freeze generator before evaluation.");
  }
  return actual;
}

async function compileCalls(calls) {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "ggaction-compact-evaluation-"));
  try {
    for (const name of ["program.d.ts", "index.d.ts", "svg.d.ts", "png.d.ts", "pdf.d.ts"]) {
      await copyFile(path.join(typesRoot, name), path.join(temporary, name));
    }
    const source = [
      'import type { ChartProgram } from "./program.js";',
      'import { hconcat, render, vconcat } from "./index.js";',
      'import { renderToSVG } from "./svg.js";',
      'import { renderToPNG } from "./png.js";',
      'import { renderToPDF } from "./pdf.js";',
      "declare let program: ChartProgram;",
      "declare const context: CanvasRenderingContext2D;",
      "async function verifyEvaluationCalls() {",
      ...[...calls].sort().map(call => `  ${call};`),
      "}",
      "void verifyEvaluationCalls;",
      ""
    ].join("\n");
    const sourceFile = path.join(temporary, "evaluation-calls.ts");
    await writeFile(sourceFile, source);
    const result = spawnSync(tscFile, [
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--target", "ES2022",
      "--module", "NodeNext",
      "--moduleResolution", "NodeNext",
      sourceFile
    ], { cwd: root, encoding: "utf8" });
    return result.status === 0 ? [] : [`TypeScript call validation failed:\n${result.stdout}\n${result.stderr}`];
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

function same(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function evaluateSplit(split, { candidateCommit, corpus = "original" } = {}) {
  if (!SPLITS.includes(split)) throw new Error(`Unknown compact evaluation split: ${split}`);
  const config = corpusConfig(corpus);
  const frozen = await assertFrozenManifest(corpus);
  const artifact = await json(path.join(config.directory, `${split}.json`));
  const policy = await json(path.join(config.directory, "oracle-policy.json"));
  const failures = [];
  const sizes = [];
  const calls = new Set();
  let silentPartialCount = 0;
  let resolvedFallbackCount = 0;

  for (const task of artifact.tasks) {
    const packet = searchGgaction(task.query);
    const repeated = searchGgaction(task.query);
    const directText = searchGgactionText(task.query);
    const actualPlan = packet.actionPlan.map(entry => ({
      id: entry.id,
      options: entry.requiredOptions
    }));
    const actualUnresolved = packet.unresolved.map(entry => entry.constraint);
    const fallbacks = docsFallbackResources(packet).map(resource => resource.uri);
    if (!same(packet, repeated)) failures.push(`${task.id}: repeated packet drift`);
    if (directText !== JSON.stringify(packet)) failures.push(`${task.id}: direct serialization drift`);
    if (!same(packet.matchedConstraints, task.expected.constraints)) {
      failures.push(`${task.id}: constraint mismatch ${JSON.stringify(packet.matchedConstraints)}`);
    }
    if (!same(actualPlan, task.expected.plan)) {
      failures.push(`${task.id}: plan mismatch ${JSON.stringify(actualPlan)}`);
    }
    if (!same(actualUnresolved, task.expected.unresolved)) {
      failures.push(`${task.id}: unresolved mismatch ${JSON.stringify(actualUnresolved)}`);
    }
    if (!same(fallbacks, task.expected.fallbacks)) {
      failures.push(`${task.id}: fallback mismatch ${JSON.stringify(fallbacks)}`);
    }
    if (task.expected.unresolved.length === 0 && fallbacks.length > 0) resolvedFallbackCount += 1;
    const covered = new Set(packet.actionPlan.flatMap(entry => entry.constraints));
    const unresolved = new Set(actualUnresolved);
    for (const constraint of packet.matchedConstraints) {
      if (!covered.has(constraint) && !unresolved.has(constraint)) {
        silentPartialCount += 1;
        failures.push(`${task.id}: silent partial ${constraint}`);
      }
    }
    const bytes = taskPacketBytes(packet);
    sizes.push(bytes);
    if (bytes > policy.thresholds.maximumPacketBytes) {
      failures.push(`${task.id}: packet is ${bytes} bytes`);
    }
    for (const call of packet.exactCalls) calls.add(call);
  }

  failures.push(...await compileCalls(calls));
  sizes.sort((left, right) => left - right);
  const medianPacketBytes = sizes[Math.floor(sizes.length / 2)];
  if (medianPacketBytes > policy.thresholds.medianPacketBytes) {
    failures.push(`${split}: median packet is ${medianPacketBytes} bytes`);
  }
  if (silentPartialCount !== policy.thresholds.silentPartialCount) {
    failures.push(`${split}: silent partial count ${silentPartialCount}`);
  }
  if (resolvedFallbackCount !== policy.thresholds.resolvedFallbackCount) {
    failures.push(`${split}: resolved fallback count ${resolvedFallbackCount}`);
  }

  const frozenBytes = await readFile(path.join(config.directory, "FROZEN.json"));
  return {
    schemaVersion: 1,
    corpusId: frozen.corpusId,
    frozenManifestSha256: sha256(frozenBytes),
    split,
    candidateCommit: candidateCommit ?? null,
    taskCount: artifact.tasks.length,
    simpleTasks: artifact.tasks.filter(task => task.stratum === "simple").length,
    complexTasks: artifact.tasks.filter(task => task.stratum === "complex").length,
    exactConstraintTasks: artifact.tasks.length - failures.filter(error => error.includes("constraint mismatch")).length,
    exactPlanTasks: artifact.tasks.length - failures.filter(error => error.includes("plan mismatch")).length,
    exactUnresolvedTasks: artifact.tasks.length - failures.filter(error => error.includes("unresolved mismatch")).length,
    exactFallbackTasks: artifact.tasks.length - failures.filter(error => error.includes("fallback mismatch")).length,
    silentPartialCount,
    resolvedFallbackCount,
    uniqueTypedCalls: calls.size,
    typescriptErrorCount: failures.filter(error => error.startsWith("TypeScript")).length,
    maximumPacketBytes: Math.max(...sizes),
    medianPacketBytes,
    passed: failures.length === 0,
    failures
  };
}

export async function writeEvaluationResult(result) {
  const config = Object.values(EVALUATION_CORPORA)
    .find(candidate => candidate.corpusId === result.corpusId);
  if (!config) throw new Error(`Unknown result corpus: ${result.corpusId}`);
  const directory = path.join(config.directory, "results");
  await mkdir(directory, { recursive: true });
  const file = path.join(directory, `${result.split}.json`);
  await writeFile(file, `${JSON.stringify(result, null, 2)}\n`);
  return file;
}
