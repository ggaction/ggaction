import { createHash, randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  open,
  readFile,
  rename,
  rm,
  symlink,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { deserialize as v8Deserialize, serialize as v8Serialize } from "node:v8";

import { DATASET_CORPUS } from "../test/support/datasets/catalog.js";
import { generateRealisticDescriptorsIsolated } from
  "./run-realistic-scenario-generation-coordinator.js";
import { runRealisticScenarioDatasetIsolated } from
  "./run-realistic-scenario-execution-coordinator.js";
import {
  assertScenarioFeatureCoverage,
  createScenarioCoverageLedger,
  scenarioFeatureCoverageDeficits,
  summarizeScenarioFeatureCoverage
} from "../test/support/scenarios/coverage-ledger.js";
import { buildPublicOptionInventory } from
  "../test/support/scenarios/coverage-inventory.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const defaultArtifactRoot = path.join(
  repositoryRoot,
  ".artifacts/scenarios/realistic"
);
const MAX_CONCURRENCY = 1;
const MAX_SCENARIO_TIMEOUT = 30 * 60_000;
const MAX_GENERATION_TIMEOUT = 60 * 60_000;
const DEFAULT_GENERATION_TIMEOUT = 30 * 60_000;
const MAX_SCENARIOS = 3_600;
const MAX_STRICT_ARTIFACT_EXECUTION_CHILD_RSS_BYTES = 512 * 1_024 * 1_024;
const MIN_STRICT_PDF_COUNT = 5;
const SAFE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;
const SHA256 = /^[a-f0-9]{64}$/u;

function realisticExecutionResourceGate(resources, options) {
  const enforced = options.artifacts && !options.allowPartial;
  const observedBytes = resources?.maximumChildRssBytes;
  const observed = Number.isSafeInteger(observedBytes) && observedBytes >= 0;
  return Object.freeze({
    enforced,
    limitBytes: MAX_STRICT_ARTIFACT_EXECUTION_CHILD_RSS_BYTES,
    ...(observed ? { observedBytes } : {}),
    passed: !enforced || (observed &&
      observedBytes <= MAX_STRICT_ARTIFACT_EXECUTION_CHILD_RSS_BYTES)
  });
}

export function assertRealisticExecutionResourceBound(resources, options) {
  const gate = realisticExecutionResourceGate(resources, options);
  if (!gate.enforced || gate.passed) return gate;
  const observed = gate.observedBytes === undefined
    ? "an unavailable high-water mark"
    : `${gate.observedBytes} bytes`;
  const error = new RangeError(
    `Strict realistic artifact execution child RSS ${observed} exceeds or cannot satisfy ` +
      `the ${gate.limitBytes} byte limit.`
  );
  error.name = "ScenarioResourceError";
  error.executionResources = resources;
  error.executionResourceGate = gate;
  throw error;
}

function integer(value, label, { minimum, maximum }) {
  if (typeof value !== "string" || !/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    throw new RangeError(`${label} must be a decimal integer.`);
  }
  const parsed = Number(value);
  if (
    !Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum
  ) {
    throw new RangeError(`${label} must be between ${minimum} and ${maximum}.`);
  }
  return parsed;
}

export function parseRealisticScenarioArguments(values) {
  const options = {
    concurrency: 1,
    timeout: 120_000,
    generationTimeout: DEFAULT_GENERATION_TIMEOUT,
    artifacts: true,
    png: true,
    pdfCount: 100,
    deterministic: true,
    allowPartial: false
  };
  const seen = new Set();
  for (const value of values) {
    const separator = value.indexOf("=");
    const name = separator === -1 ? value : value.slice(0, separator);
    const raw = separator === -1 ? undefined : value.slice(separator + 1);
    if (seen.has(name)) throw new Error(`Repeated realistic scenario option "${name}".`);
    seen.add(name);
    if (name === "--no-artifacts" && raw === undefined) options.artifacts = false;
    else if (name === "--no-png" && raw === undefined) options.png = false;
    else if (name === "--no-deterministic" && raw === undefined) {
      options.deterministic = false;
    } else if (name === "--allow-partial" && raw === undefined) {
      options.allowPartial = true;
    } else if (name === "--concurrency" && raw !== undefined) {
      options.concurrency = integer(raw, "concurrency", {
        minimum: 1,
        maximum: MAX_CONCURRENCY
      });
    } else if (name === "--timeout" && raw !== undefined) {
      options.timeout = integer(raw, "timeout", {
        minimum: 1,
        maximum: MAX_SCENARIO_TIMEOUT
      });
    } else if (name === "--generation-timeout" && raw !== undefined) {
      options.generationTimeout = integer(raw, "generation-timeout", {
        minimum: 1,
        maximum: MAX_GENERATION_TIMEOUT
      });
    } else if (name === "--pdf-count" && raw !== undefined) {
      options.pdfCount = integer(raw, "pdf-count", {
        minimum: 0,
        maximum: MAX_SCENARIOS
      });
    } else if (name === "--limit" && raw !== undefined) {
      options.limit = integer(raw, "limit", {
        minimum: 1,
        maximum: MAX_SCENARIOS
      });
    } else {
      throw new Error(`Unknown realistic scenario option "${value}".`);
    }
  }
  if (!options.artifacts) {
    if (seen.has("--no-png") || seen.has("--pdf-count")) {
      throw new Error("Renderer artifact options require artifact generation.");
    }
    options.png = false;
    options.pdfCount = 0;
  }
  if (!options.allowPartial && options.artifacts && !options.png) {
    throw new Error("Strict artifact coverage requires PNG output.");
  }
  if (
    !options.allowPartial && options.artifacts &&
    options.pdfCount < MIN_STRICT_PDF_COUNT
  ) {
    throw new Error(
      `Strict artifact coverage requires at least ${MIN_STRICT_PDF_COUNT} PDF artifacts.`
    );
  }
  if (!options.allowPartial && options.limit !== undefined) {
    throw new Error("Limited realistic runs require --allow-partial.");
  }
  return Object.freeze(options);
}

function rendererSelection(descriptors, count) {
  const selected = new Set();
  const datasets = new Set();
  const tiers = new Set();
  const families = new Set();
  const datasetCounts = new Map();
  const use = descriptor => {
    selected.add(descriptor.id);
    datasets.add(descriptor.factors.dataset);
    datasetCounts.set(
      descriptor.factors.dataset,
      (datasetCounts.get(descriptor.factors.dataset) ?? 0) + 1
    );
    tiers.add(descriptor.metadata?.complexity);
    families.add(descriptor.metadata?.chartFamily);
  };
  while (selected.size < Math.min(count, descriptors.length)) {
    let best;
    let bestScore = -Infinity;
    for (const descriptor of descriptors) {
      if (selected.has(descriptor.id)) continue;
      const dataset = descriptor.factors.dataset;
      const tier = descriptor.metadata?.complexity;
      const family = descriptor.metadata?.chartFamily;
      const score = (datasets.has(dataset) ? 0 : 100) +
        (tiers.has(tier) ? 0 : 20) +
        (families.has(family) ? 0 : 10) -
        (datasetCounts.get(dataset) ?? 0);
      if (score > bestScore || (score === bestScore && descriptor.id < best.id)) {
        best = descriptor;
        bestScore = score;
      }
    }
    use(best);
  }
  return selected;
}

function partitionByDataset(descriptors) {
  const partitions = new Map();
  descriptors.forEach((descriptor, index) => {
    const dataset = descriptor.factors.dataset;
    const partition = partitions.get(dataset) ?? [];
    partition.push({ descriptor, index });
    partitions.set(dataset, partition);
  });
  return [...partitions].map(([dataset, tasks]) => Object.freeze({
    dataset,
    tasks: Object.freeze(tasks)
  }));
}

function requiredEvidence(descriptors, requiredFeatures) {
  const values = new Set(requiredFeatures);
  for (const descriptor of descriptors) {
    const metadata = descriptor.metadata ?? {};
    if (typeof metadata.chartFamily === "string") {
      values.add(`chart-family:${metadata.chartFamily}`);
    }
    for (const operation of metadata.dataOperations ?? []) {
      values.add(`data-operation:${operation}`);
    }
  }
  return Object.freeze([...values].sort());
}

export function generateRealisticDescriptorsInWorker({
  limit,
  timeout = DEFAULT_GENERATION_TIMEOUT,
  recipeIds,
  strictScheduling = false
} = {}) {
  if (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > MAX_GENERATION_TIMEOUT) {
    throw new RangeError(
      `generation timeout must be between 1 and ${MAX_GENERATION_TIMEOUT}.`
    );
  }
  if (typeof strictScheduling !== "boolean") {
    throw new TypeError("Scenario strictScheduling must be a boolean.");
  }
  return generateRealisticDescriptorsIsolated({
    limit,
    timeout,
    recipeIds,
    strictScheduling
  });
}

function maximumObserved(values) {
  const observed = values.filter(value => Number.isFinite(value) && value >= 0);
  return observed.length === 0 ? undefined : Math.max(...observed);
}

function assignedOutcomeCount(outcomes) {
  let assigned = 0;
  for (let index = 0; index < outcomes.length; index += 1) {
    if (Object.hasOwn(outcomes, index) && outcomes[index] !== undefined) assigned += 1;
  }
  return assigned;
}

function deepFreeze(value, visited = new Set()) {
  if (value === null || typeof value !== "object" || visited.has(value)) return value;
  visited.add(value);
  for (const child of Object.values(value)) deepFreeze(child, visited);
  return Object.freeze(value);
}

function executionOutcomeMatchesTask(outcome, task) {
  if (outcome === null || typeof outcome !== "object" ||
    typeof outcome.ok !== "boolean") {
    return false;
  }
  if (outcome.ok) {
    return outcome.result?.id === task.descriptor.id &&
      outcome.result?.recipe === task.descriptor.recipe &&
      outcome.result?.dataset === task.descriptor.factors.dataset &&
      outcome.result?.semanticFingerprint === task.descriptor.semanticFingerprint;
  }
  return isDeepStrictEqual(outcome.descriptor, task.descriptor) &&
    outcome.error !== null && typeof outcome.error === "object" &&
    typeof outcome.error.name === "string" &&
    typeof outcome.error.message === "string";
}

function outcomeChunkPayload(partition, outcomes) {
  if (
    outcomes.length !== partition.tasks.length ||
    assignedOutcomeCount(outcomes) !== partition.tasks.length
  ) {
    const error = new Error(
      `Realistic scenario dataset "${partition.dataset}" returned incomplete outcomes.`
    );
    error.name = "WorkerProtocolError";
    throw error;
  }
  const entries = outcomes.map((outcome, ordinal) => {
    const task = partition.tasks[ordinal];
    if (!executionOutcomeMatchesTask(outcome, task)) {
      const error = new Error(
        `Realistic scenario dataset "${partition.dataset}" returned a mismatched outcome.`
      );
      error.name = "WorkerProtocolError";
      throw error;
    }
    return { index: task.index, outcome };
  });
  return { schemaVersion: 1, dataset: partition.dataset, entries };
}

function outcomeChunkEntriesMatchPartition(entries, partition) {
  if (!Array.isArray(entries) || entries.length !== partition.tasks.length) {
    return false;
  }
  for (let ordinal = 0; ordinal < entries.length; ordinal += 1) {
    if (!Object.hasOwn(entries, ordinal)) return false;
    const entry = entries[ordinal];
    if (
      entry?.index !== partition.tasks[ordinal].index ||
      !executionOutcomeMatchesTask(entry.outcome, partition.tasks[ordinal])
    ) {
      return false;
    }
  }
  return true;
}

export function serializeRealisticScenarioOutcomeChunk(partition, outcomes) {
  const payload = outcomeChunkPayload(partition, outcomes);
  const payloadBytes = v8Serialize(payload);
  const payloadSha256 = createHash("sha256").update(payloadBytes).digest("hex");
  return v8Serialize({
    schemaVersion: 1,
    dataset: partition.dataset,
    payloadSha256,
    payloadBytes
  });
}

export function parseRealisticScenarioOutcomeChunk(source, partition) {
  let envelope;
  try {
    envelope = v8Deserialize(source);
  } catch {
    throw new Error(
      `Realistic scenario dataset "${partition.dataset}" outcome chunk is invalid binary.`
    );
  }
  if (
    envelope?.schemaVersion !== 1 || envelope.dataset !== partition.dataset ||
    !SHA256.test(envelope.payloadSha256) ||
    !ArrayBuffer.isView(envelope.payloadBytes)
  ) {
    throw new Error(
      `Realistic scenario dataset "${partition.dataset}" outcome chunk is invalid.`
    );
  }
  const payloadBytes = Buffer.from(
    envelope.payloadBytes.buffer,
    envelope.payloadBytes.byteOffset,
    envelope.payloadBytes.byteLength
  );
  const payloadSha256 = createHash("sha256").update(payloadBytes).digest("hex");
  if (envelope.payloadSha256 !== payloadSha256) {
    throw new Error(
      `Realistic scenario dataset "${partition.dataset}" outcome chunk checksum failed.`
    );
  }
  let payload;
  try {
    payload = v8Deserialize(payloadBytes);
  } catch {
    throw new Error(
      `Realistic scenario dataset "${partition.dataset}" outcome chunk payload is invalid.`
    );
  }
  if (
    payload?.schemaVersion !== 1 || payload.dataset !== partition.dataset ||
    !outcomeChunkEntriesMatchPartition(payload.entries, partition)
  ) {
    throw new Error(
      `Realistic scenario dataset "${partition.dataset}" outcome chunk is invalid.`
    );
  }
  return deepFreeze(Array.from(payload.entries, entry => entry.outcome));
}

async function writeOutcomeChunk(directory, index, source) {
  const name = `${String(index).padStart(3, "0")}.bin`;
  const output = path.join(directory, name);
  const temporary = path.join(directory, `.${name}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, source);
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
  return output;
}

function executionResourceSummary({
  children,
  complete,
  maximumCoordinatorExecutionSampledRssBytes: intervalSampledCoordinatorRssBytes,
  started
}) {
  const maximumChildRssBytes = maximumObserved(
    children.map(value => value.maximumRssBytes)
  );
  const maximumCoordinatorLifetimeRssBytes =
    process.resourceUsage().maxRSS * 1_024;
  const maximumIpcSampledCombinedRssBytes = maximumObserved(
    children.map(value => value.maximumIpcSampledCombinedRssBytes)
  );
  const maximumCoordinatorExecutionSampledRssBytes = Math.max(
    intervalSampledCoordinatorRssBytes,
    maximumObserved(children.map(value =>
      value.maximumCoordinatorIpcSampledRssBytes
    )) ?? 0
  );
  const maximumExecutionPhaseConservativeCombinedRssBytes =
    maximumChildRssBytes === undefined
      ? undefined
      : maximumChildRssBytes + maximumCoordinatorExecutionSampledRssBytes;
  const maximumConservativeCombinedRssBytes = maximumChildRssBytes === undefined
    ? undefined
    : maximumChildRssBytes + maximumCoordinatorLifetimeRssBytes;
  return Object.freeze({
    complete,
    children: Object.freeze([...children]),
    ...(maximumChildRssBytes === undefined ? {} : { maximumChildRssBytes }),
    maximumCoordinatorLifetimeRssBytes,
    maximumCoordinatorExecutionSampledRssBytes,
    ...(maximumIpcSampledCombinedRssBytes === undefined
      ? {}
      : { maximumIpcSampledCombinedRssBytes }),
    ...(maximumExecutionPhaseConservativeCombinedRssBytes === undefined
      ? {}
      : { maximumExecutionPhaseConservativeCombinedRssBytes }),
    ...(maximumConservativeCombinedRssBytes === undefined
      ? {}
      : { maximumConservativeCombinedRssBytes }),
    wallTimeMs: Object.freeze({
      total: performance.now() - started,
      observedChildren: children.reduce(
        (sum, value) => sum + (value.childWallTimeMs ?? 0),
        0
      )
    })
  });
}

async function runScenarios(descriptors, options, output) {
  const started = performance.now();
  const outcomes = Array(descriptors.length);
  const spoolDirectory = path.join(output, ".execution-outcomes");
  const pdfIds = rendererSelection(
    descriptors,
    options.artifacts ? options.pdfCount : 0
  );
  let completed = 0;
  const progress = (outcome, index) => {
    completed += 1;
    if (!outcome.ok || completed % 25 === 0 || completed === descriptors.length) {
      const status = outcome.ok ? "ok" : outcome.error?.name ?? "ScenarioError";
      process.stdout.write(
        `[${completed}/${descriptors.length}] ${status} ${descriptors[index].id}\n`
      );
    }
  };
  const partitions = partitionByDataset(descriptors);
  const chunks = Array(partitions.length);
  const children = [];
  let maximumCoordinatorExecutionSampledRssBytes = process.memoryUsage().rss;
  let terminalError;
  const sampleCoordinatorRss = () => {
    maximumCoordinatorExecutionSampledRssBytes = Math.max(
      maximumCoordinatorExecutionSampledRssBytes,
      process.memoryUsage().rss
    );
  };
  const sampler = setInterval(sampleCoordinatorRss, 10);
  sampler.unref?.();
  try {
    await mkdir(spoolDirectory);
    for (const [partitionIndex, partition] of partitions.entries()) {
      globalThis.gc?.();
      sampleCoordinatorRss();
      let completedPartition = await runRealisticScenarioDatasetIsolated({
        dataset: partition.dataset,
        timeout: options.timeout,
        tasks: partition.tasks.map(item => ({
          ...item,
          deterministic: options.deterministic,
          artifacts: options.artifacts,
          png: options.png,
          pdf: pdfIds.has(item.descriptor.id),
          visualAudit: pdfIds.has(item.descriptor.id),
          output
        }))
      });
      children.push(...completedPartition.resources);
      let chunk = serializeRealisticScenarioOutcomeChunk(
        partition,
        completedPartition.outcomes
      );
      chunks[partitionIndex] = await writeOutcomeChunk(
        spoolDirectory,
        partitionIndex,
        chunk
      );
      chunk = undefined;
      completedPartition.outcomes.forEach((outcome, index) => {
        const item = partition.tasks[index];
        progress(outcome, item.index);
      });
      completedPartition = undefined;
      globalThis.gc?.();
      sampleCoordinatorRss();
    }
    for (const [partitionIndex, partition] of partitions.entries()) {
      const restored = parseRealisticScenarioOutcomeChunk(
        await readFile(chunks[partitionIndex]),
        partition
      );
      restored.forEach((outcome, ordinal) => {
        outcomes[partition.tasks[ordinal].index] = outcome;
      });
    }
  } catch (error) {
    terminalError = error;
    if (Array.isArray(error?.executionResources)) {
      children.push(...error.executionResources);
    }
  } finally {
    clearInterval(sampler);
    sampleCoordinatorRss();
    try {
      await rm(spoolDirectory, { recursive: true, force: true });
    } catch (error) {
      terminalError ??= error;
    }
  }
  const resources = executionResourceSummary({
    children,
    complete: terminalError === undefined &&
      assignedOutcomeCount(outcomes) === descriptors.length,
    maximumCoordinatorExecutionSampledRssBytes,
    started
  });
  if (terminalError !== undefined) {
    if (terminalError !== null && typeof terminalError === "object" &&
      Object.isExtensible(terminalError)) {
      terminalError.executionResources = resources;
    }
    throw terminalError;
  }
  return Object.freeze({
    outcomes: Object.freeze(outcomes),
    resources
  });
}

function portableRelativePath(root, output) {
  const relative = path.relative(root, output);
  if (
    relative.length === 0 || relative === ".." ||
    relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)
  ) {
    throw new Error("Scenario artifact path escaped its immutable run directory.");
  }
  return relative.split(path.sep).join("/");
}

function relativeArtifact(root, artifact) {
  if (artifact === undefined) return undefined;
  return Object.freeze({
    ...artifact,
    output: portableRelativePath(root, artifact.output)
  });
}

function manifestEntry(root, descriptor, result) {
  if (descriptor?.id !== result.id) {
    throw new Error(`Scenario result ${result.id} has no matching generated descriptor.`);
  }
  if (
    result.recipe !== descriptor.recipe ||
    result.dataset !== descriptor.factors.dataset
  ) {
    throw new Error(`Scenario ${result.id} drifted from its dispatched descriptor identity.`);
  }
  if (descriptor.semanticFingerprint !== result.semanticFingerprint) {
    throw new Error(`Scenario ${result.id} drifted from its generated descriptor fingerprint.`);
  }
  return Object.freeze({
    id: descriptor.id,
    dataset: descriptor.factors.dataset,
    recipe: descriptor.recipe,
    chartFamily: result.metadata.chartFamily,
    complexity: result.metadata.complexity,
    title: result.metadata.title,
    analysisQuestion: result.metadata.analysisQuestion,
    sourceFields: result.metadata.sourceFields,
    sourceSelectionSha256: result.metadata.provenance.sourceSelectionSha256,
    sourceRowCount: result.metadata.provenance.sourceRowCount,
    factors: descriptor.factors,
    semanticFingerprint: result.semanticFingerprint,
    svgSha256: result.svgSha256,
    renderers: result.renderers,
    artifacts: Object.freeze(Object.fromEntries(Object.entries(result.artifacts)
      .map(([renderer, artifact]) => [renderer, relativeArtifact(root, artifact)])))
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function galleryDocument(title, body) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${escapeHtml(title)}</title><style>
body{font-family:system-ui,sans-serif;margin:24px;background:#f8fafc;color:#0f172a}
a{color:#1d4ed8}.grid{display:grid;grid-template-columns:minmax(0,1400px);justify-content:center;gap:22px}
.card{background:white;border:1px solid #cbd5e1;border-radius:10px;padding:12px;overflow:hidden}
.card img{display:block;width:100%;height:auto;background:white}.meta{font-size:13px;color:#475569}
</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>\n`;
}

async function writeGallery(output, entries) {
  const grouped = new Map();
  for (const entry of entries) {
    const values = grouped.get(entry.dataset) ?? [];
    values.push(entry);
    grouped.set(entry.dataset, values);
  }
  const links = [];
  const datasetDirectory = path.join(output, "datasets");
  await mkdir(datasetDirectory, { recursive: true });
  for (const [dataset, values] of [...grouped].sort()) {
    links.push(`<li><a href="datasets/${escapeHtml(dataset)}.html">${escapeHtml(dataset)}</a> — ${values.length} charts</li>`);
    const cards = values.map(entry => {
      const svg = entry.artifacts.svg?.output;
      const png = entry.artifacts.png?.output;
      const pdf = entry.artifacts.pdf?.output;
      const image = svg === undefined ? "" :
        `<a href="../${escapeHtml(svg)}"><img loading="lazy" src="../${escapeHtml(svg)}" alt="${escapeHtml(entry.title)}"></a>`;
      const outputs = [png && `<a href="../${escapeHtml(png)}">PNG</a>`, pdf &&
        `<a href="../${escapeHtml(pdf)}">PDF</a>`].filter(Boolean).join(" · ");
      return `<article class="card"><h2>${escapeHtml(entry.title)}</h2>${image}
<p>${escapeHtml(entry.analysisQuestion)}</p><p class="meta">${escapeHtml(entry.chartFamily)} · ${escapeHtml(entry.complexity)} · ${escapeHtml(entry.recipe)}${outputs ? ` · ${outputs}` : ""}</p></article>`;
    }).join("\n");
    await writeFile(
      path.join(datasetDirectory, `${dataset}.html`),
      galleryDocument(`${dataset}: realistic ggaction charts`, `<p><a href="../index.html">All datasets</a></p><main class="grid">${cards}</main>`),
      "utf8"
    );
  }
  await writeFile(
    path.join(output, "index.html"),
    galleryDocument(
      "Realistic TidyTuesday ggaction corpus",
      `<p>${entries.length} successful charts from ${grouped.size} pinned real datasets.</p><ul>${links.join("\n")}</ul>`
    ),
    "utf8"
  );
}

async function coverageFor(descriptors, successes, failures, options, requirements) {
  const actionCards = JSON.parse(await readFile(
    path.join(repositoryRoot, "knowledge/action-cards.json"),
    "utf8"
  ));
  const publicInventory = await buildPublicOptionInventory(actionCards);
  const ledgerOptions = {
    publicInventory,
    requiredFeatures: requiredEvidence(descriptors, requirements.features),
    interactions: requirements.interactions
  };
  if (!options.artifacts) ledgerOptions.rendererFeatures = ["renderer:svg"];
  const ledger = createScenarioCoverageLedger(ledgerOptions);
  return summarizeScenarioFeatureCoverage({
    results: successes,
    failures,
    datasetCorpus: DATASET_CORPUS,
    ledger
  });
}

function createRunId() {
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return `${timestamp}-${process.pid}-${randomUUID().slice(0, 8)}`;
}

export function realisticScenarioRunLayout(options, {
  artifactRoot = defaultArtifactRoot,
  runId = createRunId()
} = {}) {
  if (!SAFE_RUN_ID.test(runId)) {
    throw new Error("Realistic scenario runId must be a safe path component.");
  }
  const root = path.resolve(artifactRoot);
  const category = options.allowPartial
    ? "partial"
    : !options.artifacts ? "audits" : "runs";
  return Object.freeze({
    root,
    runId,
    category,
    output: path.join(root, category, runId),
    latest: path.join(root, "latest"),
    promotionLock: path.join(root, ".promotion.lock")
  });
}

function pause(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function acquirePromotionLock(layout) {
  const deadline = Date.now() + 30_000;
  while (true) {
    try {
      const handle = await open(layout.promotionLock, "wx");
      await handle.writeFile(`${JSON.stringify({ pid: process.pid, runId: layout.runId })}\n`);
      await handle.close();
      return async () => rm(layout.promotionLock, { force: true });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      const lock = await lstat(layout.promotionLock).catch(() => undefined);
      if (lock !== undefined && Date.now() - lock.mtimeMs > 120_000) {
        await rm(layout.promotionLock, { force: true });
        continue;
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `Timed out waiting to promote realistic run ${layout.runId}; ` +
          `the immutable run remains at ${layout.output}.`
        );
      }
      await pause(50);
    }
  }
}

export async function promoteRealisticScenarioRun(layout) {
  const release = await acquirePromotionLock(layout);
  const temporaryLink = path.join(layout.root, `.latest-${layout.runId}.tmp`);
  let legacy;
  try {
    await rm(temporaryLink, { force: true });
    const target = process.platform === "win32"
      ? layout.output
      : path.relative(layout.root, layout.output);
    await symlink(target, temporaryLink, process.platform === "win32" ? "junction" : "dir");
    const current = await lstat(layout.latest).catch(error => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    if (current !== undefined && !current.isSymbolicLink()) {
      await mkdir(path.join(layout.root, "runs"), { recursive: true });
      legacy = path.join(layout.root, "runs", `legacy-${layout.runId}`);
      await rename(layout.latest, legacy);
    }
    if (process.platform === "win32" && current?.isSymbolicLink()) {
      await rm(layout.latest, { force: true });
    }
    try {
      await rename(temporaryLink, layout.latest);
    } catch (error) {
      if (legacy !== undefined) await rename(legacy, layout.latest).catch(() => {});
      throw error;
    }
    return Object.freeze({ latest: layout.latest, legacy });
  } finally {
    await rm(temporaryLink, { force: true });
    await release();
  }
}

export async function runRealisticScenarioCorpus(options, {
  artifactRoot = defaultArtifactRoot,
  runId,
  generated
} = {}) {
  const layout = realisticScenarioRunLayout(options, { artifactRoot, runId });
  await mkdir(path.dirname(layout.output), { recursive: true });
  await mkdir(layout.output);
  let resolvedGeneration;
  try {
    resolvedGeneration = await (generated ?? generateRealisticDescriptorsInWorker({
      limit: options.limit,
      timeout: options.generationTimeout
    }));
  } catch (error) {
    await writeFile(
      path.join(layout.output, "report.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        runId: layout.runId,
        runCategory: layout.category,
        options,
        stage: "generation",
        generationResources: error?.generationResources,
        error: {
          name: error?.name ?? "Error",
          message: error?.message ?? String(error),
          stack: error?.stack,
          ...(error?.diagnostics === undefined
            ? {}
            : { diagnostics: error.diagnostics })
        }
      }, null, 2)}\n`,
      "utf8"
    );
    error.runOutput = layout.output;
    throw error;
  }
  const {
    descriptors,
    generation,
    requirements,
    resources: generationResources
  } = resolvedGeneration;
  resolvedGeneration = undefined;
  globalThis.gc?.();
  let executed;
  let executionResourceGate;
  try {
    executed = await runScenarios(descriptors, options, layout.output);
    executionResourceGate = assertRealisticExecutionResourceBound(
      executed.resources,
      options
    );
  } catch (error) {
    await writeFile(
      path.join(layout.output, "report.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        runId: layout.runId,
        runCategory: layout.category,
        options,
        stage: "execution",
        descriptorCount: descriptors.length,
        generation,
        generationResources,
        executionResources: error?.executionResources,
        executionResourceGate: error?.executionResourceGate,
        error: {
          name: error?.name ?? "Error",
          message: error?.message ?? String(error),
          stack: error?.stack
        }
      }, null, 2)}\n`,
      "utf8"
    );
    error.runOutput = layout.output;
    throw error;
  }
  const { outcomes, resources: executionResources } = executed;
  const successes = outcomes.filter(outcome => outcome.ok).map(outcome => outcome.result);
  const failures = outcomes.filter(outcome => !outcome.ok);
  const coverage = await coverageFor(
    descriptors,
    successes,
    failures,
    options,
    requirements
  );
  const deficits = scenarioFeatureCoverageDeficits(coverage);
  const descriptorsById = new Map(descriptors.map(descriptor => [descriptor.id, descriptor]));
  const entries = successes.map(result =>
    manifestEntry(layout.output, descriptorsById.get(result.id), result)
  );
  const report = Object.freeze({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    runId: layout.runId,
    runCategory: layout.category,
    coverageEnforced: !options.allowPartial,
    options,
    descriptorCount: descriptors.length,
    generation,
    generationResources,
    executionResources,
    executionResourceGate,
    successCount: successes.length,
    failureCount: failures.length,
    coverage,
    deficits,
    failures
  });
  await writeFile(
    path.join(layout.output, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    path.join(layout.output, "manifest.json"),
    `${JSON.stringify({ schemaVersion: 1, charts: entries }, null, 2)}\n`,
    "utf8"
  );
  if (options.artifacts) await writeGallery(layout.output, entries);
  let coverageError;
  if (!options.allowPartial) {
    try {
      assertScenarioFeatureCoverage(coverage);
    } catch (error) {
      coverageError = error;
    }
  }
  const promotion = coverageError === undefined && failures.length === 0 &&
    options.artifacts && !options.allowPartial
    ? await promoteRealisticScenarioRun(layout)
    : undefined;
  process.stdout.write(`${JSON.stringify({
    output: path.relative(repositoryRoot, layout.output),
    latest: promotion === undefined
      ? undefined
      : path.relative(repositoryRoot, promotion.latest),
    descriptors: descriptors.length,
    rejectedCandidates: generation.rejectedCandidates,
    duplicateCandidates: generation.duplicateCandidates,
    skippedRecipeDatasets: generation.skippedRecipeDatasets,
    generationWallTimeMs: generationResources?.wallTimeMs.total,
    generationMaximumChildRssBytes: generationResources?.maximumChildRssBytes,
    generationMaximumCombinedRssBytes: generationResources?.maximumCombinedRssBytes,
    executionWallTimeMs: executionResources.wallTimeMs.total,
    executionMaximumChildRssBytes: executionResources.maximumChildRssBytes,
    executionMaximumCoordinatorLifetimeRssBytes:
      executionResources.maximumCoordinatorLifetimeRssBytes,
    executionMaximumCoordinatorSampledRssBytes:
      executionResources.maximumCoordinatorExecutionSampledRssBytes,
    executionMaximumIpcSampledCombinedRssBytes:
      executionResources.maximumIpcSampledCombinedRssBytes,
    executionMaximumPhaseConservativeCombinedRssBytes:
      executionResources.maximumExecutionPhaseConservativeCombinedRssBytes,
    executionMaximumConservativeCombinedRssBytes:
      executionResources.maximumConservativeCombinedRssBytes,
    executionResourceGatePassed: executionResourceGate.passed,
    passed: successes.length,
    failed: failures.length,
    coveragePassed: coverage.passed,
    publicActions: coverage.actionCoverage?.direct?.covered,
    strictOptionPaths: coverage.inventory.requiredOptionPaths,
    requirementDeficits: deficits.requirements.length,
    interactionDeficits: deficits.interactions.length,
    diversityDeficits: deficits.diversity.length,
    minimumFeatureOccurrences: coverage.worst
  }, null, 2)}\n`);
  if (coverageError !== undefined) {
    coverageError.runOutput = layout.output;
    throw coverageError;
  }
  return Object.freeze({
    layout,
    promotion,
    report,
    manifest: Object.freeze({ schemaVersion: 1, charts: Object.freeze(entries) }),
    exitCode: failures.length > 0 ? 1 : 0
  });
}

async function main() {
  const options = parseRealisticScenarioArguments(process.argv.slice(2));
  const result = await runRealisticScenarioCorpus(options);
  if (result.exitCode !== 0) process.exitCode = result.exitCode;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await main();
  } catch (error) {
    if (error?.runOutput !== undefined) {
      process.stderr.write(`Immutable failed run: ${error.runOutput}\n`);
    }
    process.stderr.write(`${error?.stack ?? error}\n`);
    process.exitCode = 1;
  }
}
