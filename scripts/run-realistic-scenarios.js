import { randomUUID } from "node:crypto";
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
import { cpus } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

import { DATASET_CORPUS } from "../test/support/datasets/catalog.js";
import {
  assertScenarioFeatureCoverage,
  createScenarioCoverageLedger,
  scenarioFeatureCoverageDeficits,
  summarizeScenarioFeatureCoverage
} from "../test/support/scenarios/coverage-ledger.js";
import { buildPublicOptionInventory } from
  "../test/support/scenarios/coverage-inventory.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const workerUrl = new URL("./run-realistic-scenario-worker.js", import.meta.url);
const generatorWorkerUrl = new URL(
  "./run-realistic-scenario-generator-worker.js",
  import.meta.url
);
const defaultArtifactRoot = path.join(
  repositoryRoot,
  ".artifacts/scenarios/realistic"
);
const MAX_CONCURRENCY = 4;
const MAX_SCENARIO_TIMEOUT = 30 * 60_000;
const MAX_GENERATION_TIMEOUT = 60 * 60_000;
const MAX_SCENARIOS = 3_600;
const MIN_STRICT_PDF_COUNT = 5;
const SAFE_RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

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
    concurrency: Math.max(1, Math.min(MAX_CONCURRENCY, cpus().length - 1)),
    timeout: 120_000,
    generationTimeout: 600_000,
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

function partitionByDataset(descriptors, concurrency) {
  const ids = [...new Set(descriptors.map(descriptor => descriptor.factors.dataset))].sort();
  const workerCount = Math.min(concurrency, ids.length, descriptors.length);
  const owner = new Map(ids.map((id, index) => [id, index % workerCount]));
  const partitions = Array.from({ length: workerCount }, () => []);
  descriptors.forEach((descriptor, index) => {
    partitions[owner.get(descriptor.factors.dataset)].push({ descriptor, index });
  });
  return partitions.filter(partition => partition.length > 0);
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
  timeout = 600_000
} = {}) {
  if (!Number.isSafeInteger(timeout) || timeout <= 0 || timeout > MAX_GENERATION_TIMEOUT) {
    throw new RangeError(
      `generation timeout must be between 1 and ${MAX_GENERATION_TIMEOUT}.`
    );
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(generatorWorkerUrl, {
      workerData: limit === undefined ? {} : { limit }
    });
    let message;
    let workerError;
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    const timer = setTimeout(() => {
      void worker.terminate();
      finish(
        reject,
        new Error(`Realistic generator worker exceeded ${timeout} ms.`)
      );
    }, timeout);
    worker.once("message", value => {
      message = value;
    });
    worker.once("error", error => {
      workerError = error;
    });
    worker.once("exit", code => {
      if (workerError !== undefined) {
        finish(reject, workerError);
      } else if (code !== 0) {
        finish(reject, new Error(`Realistic generator worker exited with code ${code}.`));
      } else if (message?.ok !== true) {
        const error = new Error(
          message?.error?.message ?? "Realistic generator worker returned no result."
        );
        error.name = message?.error?.name ?? "ScenarioGenerationError";
        if (message?.error?.stack !== undefined) error.stack = message.error.stack;
        finish(reject, error);
      } else if (
        !Array.isArray(message.descriptors) ||
        message.generation === null || typeof message.generation !== "object" ||
        !Array.isArray(message.requirements?.features) ||
        !Array.isArray(message.requirements?.interactions)
      ) {
        finish(reject, new Error("Realistic generator worker returned an invalid result."));
      } else {
        finish(resolve, Object.freeze({
          descriptors: Object.freeze(message.descriptors),
          generation: Object.freeze(message.generation),
          requirements: Object.freeze({
            features: Object.freeze(message.requirements.features),
            interactions: Object.freeze(message.requirements.interactions)
          })
        }));
      }
    });
  });
}

function timeoutFailure(item, timeout) {
  return Object.freeze({
    ok: false,
    descriptor: item.descriptor,
    error: Object.freeze({
      name: "ScenarioTimeoutError",
      message: `Scenario exceeded ${timeout} ms.`,
      stack: undefined
    })
  });
}

async function runPartition(partition, options, pdfIds, outcomes, progress, output) {
  return new Promise(resolve => {
    let cursor = 0;
    let worker;
    let timer;
    let current;
    let restarting = false;

    const finishWorker = () => {
      clearTimeout(timer);
      if (worker !== undefined) void worker.terminate();
      worker = undefined;
    };
    const complete = outcome => {
      outcomes[current.index] = outcome;
      cursor += 1;
      progress(outcome, current.index);
      const next = partition[cursor];
      if (
        next !== undefined &&
        next.descriptor.factors.dataset !== current.descriptor.factors.dataset
      ) {
        restarting = true;
        const terminated = worker?.terminate();
        worker = undefined;
        void Promise.resolve(terminated).finally(spawn);
      } else {
        dispatch();
      }
    };
    const restart = outcome => {
      outcomes[current.index] = outcome;
      cursor += 1;
      progress(outcome, current.index);
      restarting = true;
      const terminated = worker?.terminate();
      worker = undefined;
      void Promise.resolve(terminated).finally(spawn);
    };
    const spawn = () => {
      restarting = false;
      worker = new Worker(workerUrl);
      worker.on("message", message => {
        if (restarting) return;
        clearTimeout(timer);
        if (message?.index !== current.index) {
          restart(Object.freeze({
            ok: false,
            descriptor: current.descriptor,
            error: Object.freeze({
              name: "WorkerProtocolError",
              message: `Expected scenario index ${current.index}, received ${message?.index}.`,
              stack: undefined
            })
          }));
          return;
        }
        complete(message.ok
          ? Object.freeze({ ok: true, result: message.result })
          : Object.freeze({
              ok: false,
              descriptor: current.descriptor,
              error: message.error
            })
        );
      });
      worker.on("error", error => {
        if (restarting) return;
        clearTimeout(timer);
        restart(Object.freeze({
          ok: false,
          descriptor: current.descriptor,
          error: Object.freeze({
            name: error.name,
            message: error.message,
            stack: error.stack
          })
        }));
      });
      worker.on("exit", code => {
        if (restarting || cursor >= partition.length) return;
        clearTimeout(timer);
        restart(Object.freeze({
          ok: false,
          descriptor: current.descriptor,
          error: Object.freeze({
            name: "WorkerExitError",
            message: `Realistic scenario worker exited with code ${code}.`,
            stack: undefined
          })
        }));
      });
      dispatch();
    };
    const restartAfterTimeout = () => {
      restart(timeoutFailure(current, options.timeout));
    };
    const dispatch = () => {
      if (cursor >= partition.length) {
        finishWorker();
        resolve();
        return;
      }
      if (worker === undefined) return;
      current = partition[cursor];
      worker.postMessage({
        index: current.index,
        descriptor: current.descriptor,
        deterministic: options.deterministic,
        artifacts: options.artifacts,
        png: options.png,
        pdf: pdfIds.has(current.descriptor.id),
        visualAudit: pdfIds.has(current.descriptor.id),
        output
      });
      timer = setTimeout(restartAfterTimeout, options.timeout);
    };
    spawn();
  });
}

async function runScenarios(descriptors, options, output) {
  const outcomes = Array(descriptors.length);
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
  const partitions = partitionByDataset(descriptors, options.concurrency);
  await Promise.all(partitions.map(partition =>
    runPartition(partition, options, pdfIds, outcomes, progress, output)
  ));
  return outcomes;
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
  if (descriptor.semanticFingerprint !== result.semanticFingerprint) {
    throw new Error(`Scenario ${result.id} drifted from its generated descriptor fingerprint.`);
  }
  return Object.freeze({
    id: result.id,
    dataset: result.dataset,
    recipe: result.recipe,
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
a{color:#1d4ed8}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:18px}
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
    resolvedGeneration = generated ?? await generateRealisticDescriptorsInWorker({
      limit: options.limit,
      timeout: options.generationTimeout
    });
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
  const { descriptors, generation, requirements } = resolvedGeneration;
  const outcomes = await runScenarios(descriptors, options, layout.output);
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
