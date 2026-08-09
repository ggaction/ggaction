import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { searchGgaction } from "../knowledge/task-resolver.js";
import { docsFallbackResources } from "../src/mcp/adapter.js";
import {
  canonicalRuntimeClosureSource,
  checkRuntimeClosureRoutes,
  evaluateRuntimeClosureTask
} from "./compact-runtime-closure-v2.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const versionOption = process.argv.indexOf("--corpus-version");
const corpusVersion = versionOption === -1 ? "v1" : process.argv[versionOption + 1];
if (!/^v[1-9][0-9]*$/u.test(corpusVersion ?? "")) {
  throw new Error("--corpus-version must be a positive vN identifier.");
}
const corpusId = `compact-authoring-final-${corpusVersion}`;
const evaluationRoot = path.join(root, "evaluation", corpusId);
const artifactRoot = path.join(root, ".artifacts", "evaluation", corpusId);
const corpusFile = path.join(evaluationRoot, "corpus.json");
const datasetsFile = path.join(evaluationRoot, "datasets.json");
const oracleFile = path.join(evaluationRoot, "ROUTE_ORACLE.json");
const resultFile = path.join(evaluationRoot, "RESULT.json");
const conditions = Object.freeze([
  Object.freeze({ id: "A", mode: "public-docs" }),
  Object.freeze({ id: "B", mode: "compact-direct" }),
  Object.freeze({ id: "C", mode: "compact-mcp" }),
  Object.freeze({ id: "D", mode: "mcp-first-explicit-fallback" })
]);
const productPaths = Object.freeze([
  "knowledge/action-cards.json",
  "knowledge/intent-taxonomy.json",
  "knowledge/task-resolver.js",
  "src"
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function jsonBytes(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizeQuery(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function packetRole(packet) {
  if (packet.unsupported.length > 0) return "unsupported";
  if (packet.unresolved.length > 0) return "needs-input";
  return "supported";
}

function packetRenderer(packet) {
  const runtime = packet.actionPlan.findLast(entry => entry.kind === "runtime")?.name;
  return ({
    render: "canvas",
    renderToSVG: "svg",
    renderToPNG: "png",
    renderToPDF: "pdf"
  })[runtime] ?? (packetRole(packet) === "supported" ? "canvas" : null);
}

function packetPlan(packet) {
  return packet.actionPlan.map(entry => ({
    id: entry.id,
    name: entry.name,
    kind: entry.kind,
    options: entry.requiredOptions
  }));
}

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

async function jsonFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await jsonFiles(target));
    else if (entry.isFile() && entry.name.endsWith(".json")) output.push(target);
  }
  return output;
}

function collectQueries(value, output) {
  if (Array.isArray(value)) {
    for (const item of value) collectQueries(item, output);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (typeof value.query === "string") output.add(normalizeQuery(value.query));
  for (const item of Object.values(value)) collectQueries(item, output);
}

function collectSourceHashes(value, output) {
  if (Array.isArray(value)) {
    for (const item of value) collectSourceHashes(item, output);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (typeof value.sourceSha256 === "string") output.add(value.sourceSha256);
  for (const item of Object.values(value)) collectSourceHashes(item, output);
}

async function priorEvidence() {
  const queryHashes = new Set();
  const datasetHashes = new Set();
  const sourceHashes = new Set();
  const evaluationDirectory = path.join(root, "evaluation");
  for (const file of await jsonFiles(evaluationDirectory)) {
    if (file.startsWith(`${evaluationRoot}${path.sep}`)) continue;
    const value = await readJson(file);
    const queries = new Set();
    collectQueries(value, queries);
    for (const query of queries) queryHashes.add(sha256(query));
    collectSourceHashes(value, sourceHashes);
    if (path.basename(file) === "datasets.json") {
      for (const dataset of value.datasets ?? []) {
        datasetHashes.add(sha256(JSON.stringify(dataset.values)));
      }
    }
  }
  return { queryHashes, datasetHashes, sourceHashes };
}

function assertProductCandidate(candidate) {
  execFileSync("git", ["cat-file", "-e", `${candidate}^{commit}`], { cwd: root });
  execFileSync("git", ["diff", "--quiet", candidate, "--", ...productPaths], {
    cwd: root
  });
}

async function buildState() {
  const [corpus, datasets, prior, corpusSource, datasetsSource] = await Promise.all([
    readJson(corpusFile),
    readJson(datasetsFile),
    priorEvidence(),
    readFile(corpusFile),
    readFile(datasetsFile)
  ]);
  if (corpus.schemaVersion !== 1 || corpus.id !== corpusId) {
    throw new Error(`Final corpus must use the ${corpusId} contract.`);
  }
  if (datasets.schemaVersion !== 1 || datasets.datasets?.length !== 8) {
    throw new Error("Final corpus must contain exactly eight fresh datasets.");
  }
  if (corpus.tasks?.length !== 38) {
    throw new Error("Final corpus must contain exactly 38 tasks.");
  }
  assertProductCandidate(corpus.productCandidateCommit);

  const datasetById = new Map(datasets.datasets.map(dataset => [dataset.id, dataset]));
  if (datasetById.size !== datasets.datasets.length) {
    throw new Error("Final dataset IDs must be unique.");
  }
  const currentDatasetHashes = datasets.datasets.map(dataset =>
    sha256(JSON.stringify(dataset.values))
  );
  if (new Set(currentDatasetHashes).size !== currentDatasetHashes.length) {
    throw new Error("Final dataset contents must be unique within the corpus.");
  }
  const datasetOverlaps = currentDatasetHashes.filter(hash => prior.datasetHashes.has(hash));
  if (datasetOverlaps.length > 0) {
    throw new Error(`Final dataset overlap is not zero: ${datasetOverlaps.join(", ")}.`);
  }

  const normalizedQueries = corpus.tasks.map(task => normalizeQuery(task.query));
  if (new Set(normalizedQueries).size !== normalizedQueries.length) {
    throw new Error("Final normalized queries must be unique within the corpus.");
  }
  const queryHashes = normalizedQueries.map(sha256);
  const queryOverlaps = queryHashes.filter(hash => prior.queryHashes.has(hash));
  if (queryOverlaps.length > 0) {
    throw new Error(`Final normalized query overlap is not zero: ${queryOverlaps.join(", ")}.`);
  }

  const tasks = corpus.tasks.map((seed, index) => {
    const dataset = datasetById.get(seed.dataset);
    if (!dataset) throw new Error(`${seed.id} uses unknown dataset ${seed.dataset}.`);
    const packet = searchGgaction(seed.query);
    const role = packetRole(packet);
    const expectedRenderer = packetRenderer(packet);
    if (role !== seed.expectedRole) {
      throw new Error(`${seed.id} expected role ${seed.expectedRole}, received ${role}.`);
    }
    if (role === "supported" && expectedRenderer !== seed.expectedRenderer) {
      throw new Error(
        `${seed.id} expected renderer ${seed.expectedRenderer}, received ${expectedRenderer}.`
      );
    }
    return Object.freeze({
      id: seed.id,
      index: index + 1,
      query: seed.query,
      querySha256: queryHashes[index],
      stratum: seed.stratum,
      dataset,
      datasetSha256: currentDatasetHashes[datasets.datasets.indexOf(dataset)],
      role,
      expectedRenderer,
      expectedPlan: packetPlan(packet),
      expectedUnsupported: packet.unsupported.map(entry => entry.constraint),
      expectedUnresolved: packet.unresolved.map(entry => entry.constraint),
      expectedFallbacks: docsFallbackResources(packet).map(resource => resource.uri)
    });
  });
  const roleCounts = Object.fromEntries(["supported", "unsupported", "needs-input"].map(role => [
    role,
    tasks.filter(task => task.role === role).length
  ]));
  if (
    roleCounts.supported !== 26 ||
    roleCounts.unsupported !== 6 ||
    roleCounts["needs-input"] !== 6
  ) {
    throw new Error(`Unexpected final role distribution ${JSON.stringify(roleCounts)}.`);
  }

  const sourceHashes = tasks
    .filter(task => task.role === "supported")
    .map(task => sha256(canonicalRuntimeClosureSource(task)));
  if (new Set(sourceHashes).size !== sourceHashes.length) {
    throw new Error("Supported final program sources must be unique within the corpus.");
  }
  const previousProgramOverlaps = sourceHashes.filter(hash => prior.sourceHashes.has(hash));
  const oracle = {
    schemaVersion: 1,
    id: `${corpusId}-route-oracle`,
    packetSchemaVersion: 3,
    productCandidateCommit: corpus.productCandidateCommit,
    corpusSha256: sha256(corpusSource),
    datasetsSha256: sha256(datasetsSource),
    overlap: {
      normalizedQueries: 0,
      datasetContents: 0,
      previousProgramSources: previousProgramOverlaps.length
    },
    conditions,
    roleCounts,
    tasks: tasks.map(task => ({
      id: task.id,
      index: task.index,
      query: task.query,
      querySha256: task.querySha256,
      stratum: task.stratum,
      dataset: task.dataset.id,
      datasetSha256: task.datasetSha256,
      role: task.role,
      expectedRenderer: task.expectedRenderer,
      expectedPlan: task.expectedPlan,
      expectedUnsupported: task.expectedUnsupported,
      expectedUnresolved: task.expectedUnresolved,
      expectedFallbacks: task.expectedFallbacks,
      sourceSha256: task.role === "supported"
        ? sha256(canonicalRuntimeClosureSource(task))
        : null
    }))
  };
  return { corpus, datasets, tasks, oracle, oracleBytes: jsonBytes(oracle) };
}

async function requireFrozenOracle(state) {
  const frozen = await readFile(oracleFile, "utf8");
  if (frozen !== state.oracleBytes) {
    throw new Error("Frozen final route/program oracle drifted from its corpus or candidate.");
  }
}

export async function checkCompactFinalEvaluationV1() {
  const state = await buildState();
  await requireFrozenOracle(state);
  return state;
}

export async function runCompactFinalEvaluationV1() {
  const state = await buildState();
  await requireFrozenOracle(state);
  const routes = [];
  const evaluations = [];
  for (const task of state.tasks) {
    routes.push(...await checkRuntimeClosureRoutes(task));
    const evaluation = task.role === "supported"
      ? await evaluateRuntimeClosureTask(task, { artifactDirectory: artifactRoot })
      : { passed: true, failures: [] };
    evaluations.push({ task: task.id, role: task.role, ...evaluation });
  }
  const result = {
    schemaVersion: 1,
    id: `${corpusId}-result`,
    oracleSha256: sha256(state.oracleBytes),
    productCandidateCommit: state.corpus.productCandidateCommit,
    tasks: state.tasks.length,
    routeChecks: routes.length,
    evaluatorChecks: evaluations.length,
    roles: state.oracle.roleCounts,
    passed: routes.every(check => check.passed) &&
      evaluations.every(evaluation => evaluation.passed),
    externalCalls: 0,
    credentialReads: 0,
    spendUsd: 0,
    routes,
    evaluations
  };
  return { ...state, result };
}

async function freezeOracle() {
  const state = await buildState();
  try {
    await readFile(oracleFile);
    throw new Error("Final oracle already exists and is immutable; use --check.");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(evaluationRoot, { recursive: true });
  await writeFile(oracleFile, state.oracleBytes);
  return state;
}

function summary(state, result) {
  return {
    schemaVersion: 1,
    id: result?.id ?? state.oracle.id,
    oracleSha256: sha256(state.oracleBytes),
    productCandidateCommit: state.corpus.productCandidateCommit,
    tasks: state.tasks.length,
    routeChecks: result?.routeChecks ?? state.tasks.length * conditions.length,
    evaluatorChecks: result?.evaluatorChecks ?? state.tasks.length,
    roles: state.oracle.roleCounts,
    overlap: state.oracle.overlap,
    passed: result?.passed,
    externalCalls: result?.externalCalls ?? 0,
    credentialReads: result?.credentialReads ?? 0,
    spendUsd: result?.spendUsd ?? 0,
    failures: result?.evaluations
      ?.filter(entry => !entry.passed)
      .map(entry => ({ task: entry.task, failures: entry.failures })) ?? []
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let state;
  let result;
  if (process.argv.includes("--freeze")) {
    state = await freezeOracle();
  } else if (process.argv.includes("--check")) {
    state = await checkCompactFinalEvaluationV1();
  } else {
    const run = await runCompactFinalEvaluationV1();
    state = run;
    result = run.result;
    if (process.argv.includes("--write-result")) {
      await writeFile(resultFile, jsonBytes(result));
    }
  }
  process.stdout.write(`${JSON.stringify(summary(state, result), null, 2)}\n`);
  if (result && !result.passed) process.exitCode = 1;
}
