import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { EventEmitter } from "node:events";
import test from "node:test";
import { deserialize as v8Deserialize, serialize as v8Serialize } from "node:v8";
import { deflateSync } from "node:zlib";

import { createCanvas, loadImage } from "@napi-rs/canvas";

import {
  generateRealisticDescriptorsIsolated,
  runRealisticGenerationChild
} from "../../scripts/run-realistic-scenario-generation-coordinator.js";
import {
  runRealisticScenarioDatasetIsolated,
  runRealisticScenarioExecutionChild
} from "../../scripts/run-realistic-scenario-execution-coordinator.js";
import {
  decodedPngEvidence,
  executeRealisticScenarioTask,
  pdfEvidence
} from
  "../../scripts/run-realistic-scenario-worker.js";
import {
  assertRealisticExecutionResourceBound,
  generateRealisticDescriptorsInWorker,
  interpretableGalleryEntries,
  parseRealisticScenarioArguments,
  parseRealisticScenarioOutcomeChunk,
  promoteRealisticScenarioRun,
  realisticScenarioRunLayout,
  runRealisticScenarioCorpus,
  serializeRealisticScenarioOutcomeChunk,
  writeGallery
} from
  "../../scripts/run-realistic-scenarios.js";
import { releaseTidyTuesdaySourceCache } from
  "../support/datasets/tidytuesday.js";

let boundedGeneration;

test("keeps diagnostic scenarios out of the human gallery and enforces compact canvases", () => {
  const entry = (recipe, width = 900, height = 800) => ({
    id: `${recipe}-id`, recipe, artifacts: { png: { width, height } }
  });
  const readable = entry("realistic-category-boxes");
  const readableFacade = entry("realistic-statistical-facade-coverage-box", 800, 720);
  const diagnosticFacade = entry("realistic-cartesian-facade-coverage-bar");
  assert.deepEqual(
    interpretableGalleryEntries([
      readable,
      readableFacade,
      diagnosticFacade,
      entry("realistic-guide-scale-simple", 4_400, 3_200),
      entry("realistic-action-direct-parallel"),
      entry("realistic-ranked-line"),
      entry("realistic-category-boxes", 1_200, 800)
    ]),
    [readable]
  );
});

test("labels every gallery chart with a short ordinal and stable descriptor id", async () => {
  const output = await mkdtemp(path.join(tmpdir(), "ggaction-gallery-labels-"));
  try {
    const entries = [
      {
        id: "recipe-alpha-a1",
        dataset: "dataset-a",
        title: "Alpha",
        analysisQuestion: "Question A?",
        chartFamily: "family-a",
        complexity: "simple",
        recipe: "recipe-alpha",
        artifacts: { svg: { output: "svg/a.svg" }, png: { output: "png/a.png" } }
      },
      {
        id: "recipe-beta-b2",
        dataset: "dataset-a",
        title: "Beta",
        analysisQuestion: "Question B?",
        chartFamily: "family-b",
        complexity: "advanced",
        recipe: "recipe-beta",
        artifacts: { svg: { output: "svg/b.svg" } }
      }
    ];
    await writeGallery(output, entries);
    const page = await readFile(path.join(output, "datasets", "dataset-a.html"), "utf8");
    assert.match(page, /id="chart-0001" data-chart-id="recipe-alpha-a1"/u);
    assert.match(page, /href="#chart-0001">#0001<\/a>/u);
    assert.match(page, /ID: <code>recipe-alpha-a1<\/code>/u);
    assert.match(page, /id="chart-0002" data-chart-id="recipe-beta-b2"/u);
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("fails closed when strict artifact execution exceeds 512 MiB per child", () => {
  const strict = parseRealisticScenarioArguments([]);
  const boundary = 512 * 1_024 * 1_024;
  assert.deepEqual(
    assertRealisticExecutionResourceBound({ maximumChildRssBytes: boundary }, strict),
    {
      enforced: true,
      limitBytes: boundary,
      observedBytes: boundary,
      passed: true
    }
  );
  assert.throws(
    () => assertRealisticExecutionResourceBound(
      { maximumChildRssBytes: boundary + 1 },
      strict
    ),
    error => error.name === "ScenarioResourceError" &&
      error.executionResourceGate.observedBytes === boundary + 1 &&
      error.executionResources.maximumChildRssBytes === boundary + 1
  );
  assert.throws(
    () => assertRealisticExecutionResourceBound({}, strict),
    error => error.name === "ScenarioResourceError" &&
      error.executionResourceGate.observedBytes === undefined
  );
  for (const options of [
    parseRealisticScenarioArguments(["--no-artifacts"]),
    parseRealisticScenarioArguments(["--allow-partial", "--limit=1"])
  ]) {
    const gate = assertRealisticExecutionResourceBound(
      { maximumChildRssBytes: boundary + 1 },
      options
    );
    assert.equal(gate.enforced, false);
    assert.equal(gate.passed, true);
  }
});

function generated() {
  boundedGeneration ??= generateRealisticDescriptorsInWorker({ limit: 1 });
  return boundedGeneration;
}

function childDouble({
  send,
  terminationDelay = 0
} = {}) {
  const child = new EventEmitter();
  child.pid = 42;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.send = send ?? ((_message, callback) => queueMicrotask(() => callback?.(null)));
  child.killSignals = [];
  child.kill = signal => {
    child.killSignal = signal;
    child.killSignals.push(signal);
    setTimeout(() => {
      child.emit("exit", null, signal);
      child.emit("close", null, signal);
    }, terminationDelay);
    return true;
  };
  return child;
}

function pause(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function fixtureFingerprint(label) {
  return createHash("sha256").update(label).digest("hex");
}

function executionDescriptor(index, dataset = "fixture-dataset") {
  return Object.freeze({
    id: `fixture-${index}`,
    recipe: "fixture-recipe",
    factors: Object.freeze({ dataset }),
    semanticFingerprint: fixtureFingerprint(`${dataset}-${index}`)
  });
}

function executionResult(task, overrides = {}) {
  const descriptor = task.descriptor;
  return {
    id: descriptor.id,
    recipe: descriptor.recipe,
    dataset: descriptor.factors.dataset,
    operations: ["createFixture"],
    directOperations: ["createFixture"],
    directTrace: [{ op: "createFixture", args: {} }],
    metadata: {
      title: `Fixture ${descriptor.id}`,
      analysisQuestion: "What does the fixture verify?",
      chartFamily: "fixture",
      complexity: "simple",
      sourceFields: [],
      provenance: {
        sourceSelectionSha256: fixtureFingerprint(`${descriptor.id}-source`),
        sourceRowCount: 1
      }
    },
    effectiveFeatures: ["fixture:feature"],
    factorEffects: [],
    renderers: ["svg"],
    artifacts: {},
    actionCount: 1,
    graphic: {},
    layerCount: 1,
    datasetCount: 1,
    svgBytes: 1,
    svgSha256: fixtureFingerprint(`${descriptor.id}-svg`),
    semanticFingerprint: descriptor.semanticFingerprint,
    ...overrides
  };
}

function pdfFixture(content, { compressed = false } = {}) {
  const source = Buffer.from(content, "latin1");
  const stream = compressed ? deflateSync(source) : source;
  const filter = compressed ? " /Filter /FlateDecode" : "";
  return Buffer.concat([
    Buffer.from(
      "%PDF-1.4\n" +
      "1 0 obj\n" +
      "<< /Type /Page /MediaBox [0 0 100 100] /Contents 2 0 R >>\n" +
      "endobj\n" +
      "2 0 obj\n" +
      `<< /Length ${stream.length}${filter} >> stream\n`,
      "latin1"
    ),
    stream,
    Buffer.from("\nendstream\nendobj\n%%EOF\n", "latin1")
  ]);
}

async function pngReadabilityEvidence(bytes) {
  const image = await loadImage(bytes);
  const tileSize = 256;
  const canvas = createCanvas(tileSize, tileSize);
  const context = canvas.getContext("2d");
  const bounds = { left: image.width, top: image.height, right: -1, bottom: -1 };
  let strongInkPixels = 0;
  for (let y = 0; y < image.height; y += tileSize) {
    for (let x = 0; x < image.width; x += tileSize) {
      const width = Math.min(tileSize, image.width - x);
      const height = Math.min(tileSize, image.height - y);
      context.clearRect(0, 0, tileSize, tileSize);
      context.drawImage(image, x, y, width, height, 0, 0, width, height);
      const pixels = context.getImageData(0, 0, width, height).data;
      for (let row = 0; row < height; row += 1) {
        for (let column = 0; column < width; column += 1) {
          const index = (row * width + column) * 4;
          const contrast = Math.max(
            255 - pixels[index],
            255 - pixels[index + 1],
            255 - pixels[index + 2]
          );
          if (contrast <= 32) continue;
          strongInkPixels += 1;
          bounds.left = Math.min(bounds.left, x + column);
          bounds.top = Math.min(bounds.top, y + row);
          bounds.right = Math.max(bounds.right, x + column);
          bounds.bottom = Math.max(bounds.bottom, y + row);
        }
      }
    }
  }
  assert.ok(strongInkPixels > 0, "readability evidence requires strong visible ink");
  return Object.freeze({
    strongInkPixels,
    strongInkDensity: strongInkPixels / (image.width * image.height),
    bounds: Object.freeze({
      x: bounds.left,
      y: bounds.top,
      width: bounds.right - bounds.left + 1,
      height: bounds.bottom - bounds.top + 1
    })
  });
}

function stableWireValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableWireValue).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).map(([key, child]) =>
      `${JSON.stringify(key)}:${stableWireValue(child)}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function wireDigest(value) {
  return createHash("sha256").update(stableWireValue(value)).digest("hex");
}

function sealedState(payload) {
  return Object.freeze({ ...payload, stateId: wireDigest(payload) });
}

function atomicFailureHarness(failureName, {
  activeDatasetCount = 3,
  selectedDescriptorCount = activeDatasetCount * 72
} = {}) {
  const messages = [];
  const datasets = Object.freeze(Array.from({ length: 50 }, (_, index) =>
    `dataset-${String(index).padStart(2, "0")}`
  ));
  const activeDatasets = Object.freeze(datasets.slice(0, activeDatasetCount));
  const planPayload = {
    schemaVersion: 1,
    recipeIds: Object.freeze(["recipe-a"]),
    datasets,
    activeDatasets,
    chartsPerDataset: 72,
    selectedDescriptorCount,
    full: false,
    strict: true
  };
  const plan = Object.freeze({ ...planPayload, planId: wireDigest(planPayload) });
  const manifestPayload = {
    schemaVersion: 1,
    planId: plan.planId,
    factorRequirements: Object.freeze([]),
    eligibleRecipeDatasets: Object.freeze([
      Object.freeze(["recipe-a", activeDatasets])
    ]),
    scheduleRequirements: Object.freeze([])
  };
  const manifest = Object.freeze({
    ...manifestPayload,
    manifestId: wireDigest(manifestPayload)
  });
  const initialPayload = {
    schemaVersion: 1,
    planId: plan.planId,
    manifestId: manifest.manifestId,
    nextDatasetIndex: 0,
    candidateOrdinal: 0,
    fingerprints: [],
    recipeCounts: [],
    recipeDatasets: [],
    baselineFactorCases: [],
    factorValueCounts: [],
    factorValueDatasets: [],
    factorPairs: [],
    factorCaseCounts: [],
    scheduleFulfillment: [],
    rejections: [],
    duplicates: [],
    skips: []
  };
  const initialState = sealedState(initialPayload);
  const descriptors = Object.freeze(Array.from({ length: 72 }, (_, index) => {
    const semanticFingerprint = createHash("sha256")
      .update(`dataset-00-${index}`)
      .digest("hex");
    return Object.freeze({
      id: `dataset-00-${index}`,
      recipe: "recipe-a",
      factors: Object.freeze({ dataset: "dataset-00" }),
      semanticFingerprint
    });
  }));
  const committedState = sealedState({
    ...initialPayload,
    nextDatasetIndex: 1,
    candidateOrdinal: 72,
    fingerprints: descriptors.map(value => value.semanticFingerprint),
    recipeCounts: [["recipe-a", 72]],
    recipeDatasets: [["recipe-a", ["dataset-00"]]]
  });
  const result = value => ({
    value,
    resources: { rssBytes: 1, maximumRssBytes: 1 }
  });
  const runChild = async message => {
    messages.push(structuredClone(message));
    if (message.operation === "plan") {
      return result({
        plan,
        requirements: {
          features: ["fixture:feature"],
          interactions: [{ members: ["fixture:a", "fixture:b"] }]
        }
      });
    }
    if (message.operation === "requirements") {
      return result({
        fragment: {
          schemaVersion: 1,
          planId: plan.planId,
          dataset: message.dataset,
          eligibleRecipes: ["recipe-a"],
          factorRequirements: [],
          scheduleEligibility: []
        }
      });
    }
    if (message.operation === "merge") {
      return result({ manifest, state: initialState });
    }
    if (message.operation === "dataset" && message.dataset === "dataset-00") {
      return result({
        dataset: "dataset-00",
        datasetIndex: 0,
        descriptors,
        state: committedState
      });
    }
    const error = new Error(`${failureName} after the first checkpoint.`);
    error.name = failureName;
    throw error;
  };
  return { committedState, descriptors, initialState, manifest, messages, plan, runChild };
}

function fixtureFinalization(message, requirements) {
  const state = message.state;
  const descriptors = message.descriptors.slice(
    0,
    message.plan.selectedDescriptorCount
  );
  return {
    descriptors,
    generation: {
      known: true,
      attemptedCandidates: state.candidateOrdinal,
      acceptedCandidates: message.descriptors.length,
      selectedDescriptors: descriptors.length,
      rejectedCandidates: state.rejections.length,
      duplicateCandidates: state.duplicates.length,
      skippedRecipeDatasets: state.skips.length,
      rejections: state.rejections,
      duplicates: state.duplicates,
      skips: state.skips,
      recipeSelections: Object.fromEntries(state.recipeCounts),
      recipeDatasetCounts: Object.fromEntries(state.recipeDatasets.map(
        ([recipe, datasets]) => [recipe, datasets.length]
      ))
    },
    requirements
  };
}

test("parses strict realistic scenario renderer and resource options", () => {
  const defaults = parseRealisticScenarioArguments([]);
  assert.equal(defaults.artifacts, true);
  assert.equal(defaults.png, true);
  assert.equal(defaults.pdfCount, 100);
  assert.equal(defaults.deterministic, true);
  assert.equal(defaults.allowPartial, false);
  assert.equal(defaults.concurrency, 1);
  assert.equal(defaults.generationTimeout, 1_800_000);

  assert.deepEqual(parseRealisticScenarioArguments(["--no-artifacts"]), {
    concurrency: defaults.concurrency,
    timeout: 120_000,
    generationTimeout: 1_800_000,
    artifacts: false,
    png: false,
    pdfCount: 0,
    deterministic: true,
    allowPartial: false
  });

  assert.deepEqual(parseRealisticScenarioArguments([
    "--concurrency=1",
    "--timeout=5000",
    "--generation-timeout=9000",
    "--pdf-count=7",
    "--limit=11",
    "--no-deterministic",
    "--allow-partial"
  ]), {
    concurrency: 1,
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
    ["--concurrency=2"],
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
  const { descriptors, generation, resources } = await generated();
  assert.equal(descriptors.length, 1);
  assert.equal(generation.selectedDescriptors, 1);
  assert.equal(generation.acceptedCandidates, 72);
  assert.equal(
    generation.attemptedCandidates,
    generation.acceptedCandidates + generation.rejectedCandidates +
      generation.duplicateCandidates
  );
  assert.equal(descriptors[0].metadata.corpus, "tidytuesday");
  assert.deepEqual(resources.children.map(value => value.operation), [
    "plan",
    "requirements",
    "merge",
    "dataset",
    "finalize"
  ]);
  assert.equal(resources.complete, true);
  assert.equal(resources.maximumChildRssBytes > 0, true);
  assert.equal(resources.maximumChildRssBytes <= 440 * 1_024 * 1_024, true);
  assert.equal(resources.maximumCoordinatorRssBytes > 0, true);
  assert.equal(
    resources.maximumCombinedRssBytes,
    resources.maximumChildRssBytes + resources.maximumCoordinatorRssBytes
  );
  assert.equal(resources.maximumCombinedRssBytes <= 512 * 1_024 * 1_024, true);
  assert.equal(resources.wallTimeMs.total >= resources.wallTimeMs.children, true);
  assert.equal(resources.wallTimeMs.plan > 0, true);
  assert.equal(resources.wallTimeMs.factorRequirements > 0, true);
  assert.equal(resources.wallTimeMs.merge > 0, true);
  assert.equal(resources.wallTimeMs.datasetGeneration > 0, true);
  assert.equal(resources.wallTimeMs.finalize > 0, true);
  assert.equal(
    Math.abs(resources.wallTimeMs.children - (
      resources.wallTimeMs.plan + resources.wallTimeMs.factorRequirements +
      resources.wallTimeMs.merge + resources.wallTimeMs.datasetGeneration +
      resources.wallTimeMs.finalize
    )) < 1e-6,
    true
  );
});

test("isolates serial dataset execution in a bounded child process", async () => {
  const { descriptors } = await generated();
  const descriptor = descriptors[0];
  const completed = await runRealisticScenarioExecutionChild({
    dataset: descriptor.factors.dataset,
    timeout: 120_000,
    tasks: [{
      index: 0,
      descriptor,
      deterministic: true,
      artifacts: false,
      png: false,
      pdf: false,
      visualAudit: false,
      output: "/tmp"
    }]
  });
  assert.equal(completed.outcomes.length, 1);
  assert.equal(completed.outcomes[0].ok, true);
  assert.equal(
    completed.outcomes[0].result.semanticFingerprint,
    descriptor.semanticFingerprint
  );
  assert.equal(completed.resource.complete, true);
  assert.equal(completed.resource.terminationConfirmed, true);
  assert.equal(completed.resource.completedScenarios, 1);
  assert.equal(completed.resource.rssBytes > 0, true);
  assert.equal(completed.resource.maximumRssBytes >= completed.resource.rssBytes, true);
  assert.equal(completed.resource.maximumRssBytes <= 440 * 1_024 * 1_024, true);
  assert.equal(completed.resource.childWallTimeMs > 0, true);
  assert.equal(completed.resource.coordinatorWallTimeMs > 0, true);
  assert.equal(completed.resource.maximumIpcSampledCombinedRssBytes > 0, true);
  assert.equal(Object.isFrozen(completed), true);
  assert.equal(Object.isFrozen(completed.resource), true);
});

test("runs one dataset in ordered serial batches of at most 24 scenarios", async () => {
  const tasks = Array.from({ length: 50 }, (_, index) => Object.freeze({
    index,
    descriptor: executionDescriptor(index)
  }));
  const batches = [];
  let activeChildren = 0;
  let maximumActiveChildren = 0;
  const completed = await runRealisticScenarioDatasetIsolated({
    dataset: "fixture-dataset",
    tasks,
    timeout: 1_000
  }, {
    spawn() {
      const child = childDouble();
      child.send = (message, callback) => {
        batches.push(message.tasks.map(task => task.index));
        activeChildren += 1;
        maximumActiveChildren = Math.max(maximumActiveChildren, activeChildren);
        queueMicrotask(() => callback?.(null));
        queueMicrotask(() => {
          const childResources = Object.freeze({
            rssBytes: 10,
            maximumRssBytes: 20,
            wallTimeMs: 1
          });
          for (const task of message.tasks) {
            child.emit("message", {
              kind: "outcome",
              dataset: "fixture-dataset",
              outcome: { index: task.index, ok: true, result: executionResult(task) },
              resources: childResources
            });
          }
          child.emit("message", {
            kind: "resources",
            dataset: "fixture-dataset",
            resources: childResources
          });
          child.emit("exit", 0, null);
          child.emit("close", 0, null);
          activeChildren -= 1;
        });
      };
      return child;
    }
  });
  assert.deepEqual(batches.map(batch => batch.length), [24, 24, 2]);
  assert.deepEqual(batches.flat(), tasks.map(task => task.index));
  assert.equal(maximumActiveChildren, 1);
  assert.equal(activeChildren, 0);
  assert.deepEqual(
    completed.outcomes.map(outcome => outcome.result.id),
    tasks.map(task => task.descriptor.id)
  );
  assert.deepEqual(
    completed.resources.map(resource => resource.firstScenarioIndex),
    [0, 24, 48]
  );
  assert.deepEqual(
    completed.resources.map(resource => resource.requestedScenarios),
    [24, 24, 2]
  );
  assert.deepEqual(
    completed.resources.map(resource => resource.completedScenarios),
    [24, 24, 2]
  );
});

test("fails closed at a completed batch boundary without blaming the next task", async () => {
  const tasks = Array.from({ length: 25 }, (_, index) => Object.freeze({
    index,
    descriptor: executionDescriptor(index)
  }));
  const resources = Object.freeze({
    rssBytes: 10,
    maximumRssBytes: 20,
    wallTimeMs: 1
  });
  let spawnCount = 0;
  const failure = runRealisticScenarioDatasetIsolated({
    dataset: "fixture-dataset",
    tasks,
    timeout: 1_000
  }, {
    spawn() {
      spawnCount += 1;
      const child = childDouble();
      child.send = (message, callback) => {
        queueMicrotask(() => callback?.(null));
        queueMicrotask(() => {
          for (const task of message.tasks) {
            child.emit("message", {
              kind: "outcome",
              dataset: "fixture-dataset",
              outcome: { index: task.index, ok: true, result: executionResult(task) },
              resources
            });
          }
          child.emit("exit", 17, null);
          child.emit("close", 17, null);
        });
      };
      return child;
    }
  });
  let boundaryError;
  await assert.rejects(
    failure,
    error => {
      boundaryError = error;
      return error.name === "WorkerExitError" &&
        error.partialOutcomes?.length === 24 &&
        error.partialOutcomes.every(outcome => outcome.ok) &&
        error.executionResources?.length === 1 &&
        error.executionResources[0].completedScenarios === 24;
    }
  );
  assert.equal(spawnCount, 1);
  assert.deepEqual(
    boundaryError.partialOutcomes.map(outcome => outcome.result.id),
    tasks.slice(0, 24).map(task => task.descriptor.id)
  );
});

test("bounds execution child protocol, timeout, and crash failures", async () => {
  const task = Object.freeze({
    index: 7,
    descriptor: executionDescriptor(7)
  });
  const resources = Object.freeze({
    rssBytes: 10,
    maximumRssBytes: 20,
    wallTimeMs: 1
  });
  const completed = childDouble();
  let spawnOptions;
  let sent;
  completed.send = (message, callback) => {
    sent = message;
    spawnOptions ??= {};
    queueMicrotask(() => callback?.(null));
  };
  const completion = runRealisticScenarioExecutionChild({
    dataset: "fixture-dataset",
    tasks: [task],
    timeout: 1_000
  }, {
    spawn: (_path, _arguments, options) => {
      spawnOptions = options;
      return completed;
    }
  });
  queueMicrotask(() => {
    completed.emit("message", {
      kind: "outcome",
      dataset: "fixture-dataset",
      outcome: { index: 7, ok: true, result: executionResult(task) },
      resources
    });
    completed.emit("message", {
      kind: "resources",
      dataset: "fixture-dataset",
      resources
    });
    completed.emit("exit", 0, null);
    completed.emit("close", 0, null);
  });
  const completedResult = await completion;
  assert.equal(completedResult.outcomes[0].result.id, task.descriptor.id);
  assert.equal(completedResult.resource.complete, true);
  assert.equal(completedResult.resource.terminationConfirmed, true);
  assert.equal(sent.kind, "dataset");
  assert.deepEqual(spawnOptions.execArgv, [
    "--expose-gc",
    "--max-old-space-size=224"
  ]);
  assert.equal(spawnOptions.serialization, "advanced");

  const malformed = childDouble();
  const malformedFailure = runRealisticScenarioExecutionChild({
    dataset: "fixture-dataset",
    tasks: [task],
    timeout: 1_000
  }, { spawn: () => malformed });
  queueMicrotask(() => malformed.emit("message", {
    kind: "outcome",
    dataset: "wrong-dataset",
    outcome: { index: 7, ok: true, result: {} },
    resources
  }));
  await assert.rejects(
    malformedFailure,
    error => error.name === "WorkerProtocolError" &&
      error.partialOutcomes?.length === 0 &&
      error.executionResource?.complete === false &&
      error.executionResource?.terminationConfirmed === true &&
      !Object.hasOwn(error.executionResource, "rssBytes")
  );
  assert.deepEqual(malformed.killSignals, ["SIGTERM"]);

  const timedOut = childDouble({ terminationDelay: 15 });
  const timeoutFailure = runRealisticScenarioExecutionChild({
    dataset: "fixture-dataset",
    tasks: [task],
    timeout: 5
  }, { spawn: () => timedOut });
  await assert.rejects(
    timeoutFailure,
    error => error.name === "ScenarioTimeoutError" &&
      /fixture-7.*5 ms/u.test(error.message)
  );
  assert.deepEqual(timedOut.killSignals, ["SIGTERM"]);

  const crashed = childDouble();
  const crashFailure = runRealisticScenarioExecutionChild({
    dataset: "fixture-dataset",
    tasks: [task],
    timeout: 1_000
  }, { spawn: () => crashed });
  const crashDetail = `discarded-prefix-${"x".repeat(9_000)}-retained-tail`;
  queueMicrotask(() => {
    crashed.emit("exit", 17, null);
    crashed.stderr.emit("data", Buffer.from(crashDetail));
    crashed.emit("close", 17, null);
  });
  let crashError;
  await assert.rejects(crashFailure, error => {
    crashError = error;
    return error.name === "WorkerExitError" && /code 17/u.test(error.message) &&
      error.message.endsWith("-retained-tail");
  });
  assert.equal(crashError.message.includes("discarded-prefix"), false);
  assert.equal(crashError.message.length < 8_400, true);
});

test("rejects forged execution results before committing child evidence", async () => {
  const task = Object.freeze({ index: 7, descriptor: executionDescriptor(7) });
  const resources = Object.freeze({
    rssBytes: 10,
    maximumRssBytes: 20,
    wallTimeMs: 1
  });
  const forgeries = [
    ["id", "forged-id"],
    ["recipe", "forged-recipe"],
    ["dataset", "forged-dataset"],
    ["semanticFingerprint", fixtureFingerprint("forged-fingerprint")],
    ["metadata", null]
  ];
  for (const [field, value] of forgeries) {
    const child = childDouble();
    const failure = runRealisticScenarioExecutionChild({
      dataset: "fixture-dataset",
      tasks: [task],
      timeout: 1_000
    }, { spawn: () => child });
    queueMicrotask(() => child.emit("message", {
      kind: "outcome",
      dataset: "fixture-dataset",
      outcome: {
        index: task.index,
        ok: true,
        result: executionResult(task, { [field]: value })
      },
      resources
    }));
    await assert.rejects(
      failure,
      error => error.name === "WorkerProtocolError" &&
        error.partialOutcomes?.length === 0 &&
        error.executionResource?.completedScenarios === 0
    );
    assert.deepEqual(child.killSignals, ["SIGTERM"]);
  }
});

test("fails closed without spawning a replacement for an unconfirmed child", async () => {
  const tasks = [0, 1].map(index => Object.freeze({
    index,
    descriptor: executionDescriptor(index)
  }));
  const child = childDouble();
  child.killSignals = [];
  child.kill = signal => {
    child.killSignals.push(signal);
    return true;
  };
  let spawnCount = 0;
  const failure = runRealisticScenarioDatasetIsolated({
    dataset: "fixture-dataset",
    tasks,
    timeout: 5
  }, {
    spawn: () => {
      spawnCount += 1;
      return child;
    },
    softTerminationGraceMs: 5,
    hardTerminationGraceMs: 5,
    closeGraceMs: 5
  });
  await assert.rejects(
    failure,
    error => error.name === "WorkerTerminationError" &&
      error.executionResource?.terminationConfirmed === false &&
      error.executionResources?.length === 1 &&
      error.executionResources[0].terminationConfirmed === false &&
      !Object.hasOwn(error.executionResources[0], "rssBytes")
  );
  await pause(10);
  assert.equal(spawnCount, 1);
  assert.deepEqual(child.killSignals, ["SIGTERM", "SIGKILL"]);
});

test("commits serialized outcomes and resumes after an execution child crash", async () => {
  const tasks = [0, 1, 2].map(index => Object.freeze({
    index,
    descriptor: executionDescriptor(index)
  }));
  const resources = Object.freeze({
    rssBytes: 10,
    maximumRssBytes: 20,
    wallTimeMs: 1
  });
  const first = childDouble();
  first.send = (message, callback) => {
    queueMicrotask(() => callback?.(null));
    queueMicrotask(() => {
      first.emit("message", {
        kind: "outcome",
        dataset: "fixture-dataset",
        outcome: {
          index: message.tasks[0].index,
          ok: true,
          result: executionResult(message.tasks[0])
        },
        resources
      });
      first.emit("exit", 17, null);
      first.emit("close", 17, null);
    });
  };
  const second = childDouble();
  second.send = (message, callback) => {
    queueMicrotask(() => callback?.(null));
    queueMicrotask(() => {
      second.emit("message", {
        kind: "outcome",
        dataset: "fixture-dataset",
        outcome: {
          index: message.tasks[0].index,
          ok: true,
          result: executionResult(message.tasks[0])
        },
        resources
      });
      second.emit("message", {
        kind: "resources",
        dataset: "fixture-dataset",
        resources
      });
      second.emit("exit", 0, null);
      second.emit("close", 0, null);
    });
  };
  const children = [first, second];
  const completed = await runRealisticScenarioDatasetIsolated({
    dataset: "fixture-dataset",
    tasks,
    timeout: 1_000
  }, {
    spawn: () => children.shift()
  });
  assert.deepEqual(completed.outcomes.map(value => value.ok), [true, false, true]);
  assert.equal(completed.outcomes[0].result.id, "fixture-0");
  assert.equal(completed.outcomes[1].descriptor.id, "fixture-1");
  assert.equal(completed.outcomes[1].error.name, "WorkerExitError");
  assert.equal(completed.outcomes[2].result.id, "fixture-2");
  assert.deepEqual(completed.resources.map(value => value.complete), [false, true]);
  assert.deepEqual(
    completed.resources.map(value => value.completedScenarios),
    [1, 1]
  );
  assert.equal(children.length, 0);
});

test("round-trips canonical outcome chunks and rejects corruption", () => {
  const tasks = [4, 9, 12].map(index => Object.freeze({
    index,
    descriptor: executionDescriptor(index)
  }));
  const partition = Object.freeze({
    dataset: "fixture-dataset",
    tasks: Object.freeze(tasks)
  });
  const outcomes = Object.freeze([
    Object.freeze({
      ok: true,
      result: executionResult(tasks[0], {
        directTrace: [{
          op: "createFixture",
          args: { required: true, groupBy: undefined }
        }]
      })
    }),
    Object.freeze({
      ok: false,
      descriptor: tasks[1].descriptor,
      error: Object.freeze({
        name: "FixtureError",
        message: "fixture failure",
        stack: "FixtureError: fixture failure"
      })
    }),
    Object.freeze({ ok: true, result: executionResult(tasks[2]) })
  ]);
  const source = serializeRealisticScenarioOutcomeChunk(partition, outcomes);
  const restored = parseRealisticScenarioOutcomeChunk(source, partition);
  assert.deepEqual(restored, outcomes);
  assert.equal(Object.isFrozen(restored), true);
  assert.equal(Object.isFrozen(restored[0].result), true);
  assert.equal(
    Object.hasOwn(restored[0].result.directTrace[0].args, "groupBy"),
    true
  );
  assert.equal(restored[0].result.directTrace[0].args.groupBy, undefined);

  const corrupted = v8Deserialize(source);
  corrupted.payloadBytes = Buffer.from(corrupted.payloadBytes);
  corrupted.payloadBytes[Math.floor(corrupted.payloadBytes.length / 2)] ^= 1;
  assert.throws(
    () => parseRealisticScenarioOutcomeChunk(v8Serialize(corrupted), partition),
    /checksum failed/u
  );

  const forged = v8Deserialize(source);
  const forgedPayload = v8Deserialize(forged.payloadBytes);
  forgedPayload.entries[0].outcome.result.id = "forged-id";
  forged.payloadBytes = v8Serialize(forgedPayload);
  forged.payloadSha256 = createHash("sha256")
    .update(forged.payloadBytes)
    .digest("hex");
  assert.throws(
    () => parseRealisticScenarioOutcomeChunk(v8Serialize(forged), partition),
    /outcome chunk is invalid/u
  );

  const sparse = v8Deserialize(source);
  const sparsePayload = v8Deserialize(sparse.payloadBytes);
  delete sparsePayload.entries[0];
  sparse.payloadBytes = v8Serialize(sparsePayload);
  sparse.payloadSha256 = createHash("sha256")
    .update(sparse.payloadBytes)
    .digest("hex");
  assert.throws(
    () => parseRealisticScenarioOutcomeChunk(v8Serialize(sparse), partition),
    /outcome chunk is invalid/u
  );

  assert.throws(
    () => parseRealisticScenarioOutcomeChunk(Buffer.from("not-v8"), partition),
    /invalid binary/u
  );
});

test("terminates timed-out generation children and reports process crashes", async () => {
  const completed = childDouble();
  const completion = runRealisticGenerationChild({ operation: "plan" }, {
    timeout: 1_000,
    spawn: () => completed
  });
  queueMicrotask(() => {
    completed.emit("message", {
      kind: "result",
      ok: true,
      value: { plan: true },
      resources: { rssBytes: 1, maximumRssBytes: 2 }
    });
    completed.emit("message", {
      kind: "resources",
      resources: { rssBytes: 3, maximumRssBytes: 4 }
    });
    completed.emit("exit", 0, null);
    completed.emit("close", 0, null);
  });
  const completedResult = await completion;
  assert.deepEqual(completedResult.value, { plan: true });
  assert.equal(completedResult.resources.rssBytes, 3);
  assert.equal(completedResult.resources.maximumRssBytes, 4);

  const missingFinalResources = childDouble();
  const missingFinalFailure = runRealisticGenerationChild({ operation: "plan" }, {
    timeout: 1_000,
    spawn: () => missingFinalResources
  });
  queueMicrotask(() => {
    missingFinalResources.emit("message", {
      kind: "result",
      ok: true,
      value: { plan: true },
      resources: { rssBytes: 1, maximumRssBytes: 2 }
    });
    missingFinalResources.emit("exit", 0, null);
    missingFinalResources.emit("close", 0, null);
  });
  await assert.rejects(
    missingFinalFailure,
    /post-serialization resources child response is invalid/u
  );

  const reported = childDouble();
  const reportedFailure = runRealisticGenerationChild({ operation: "dataset" }, {
    timeout: 1_000,
    spawn: () => reported
  });
  queueMicrotask(() => {
    reported.emit("message", {
      kind: "result",
      ok: false,
      error: {
        name: "ScenarioGenerationError",
        message: "fixture reported failure",
        diagnostics: { kind: "preflight" }
      },
      resources: { rssBytes: 5, maximumRssBytes: 6 }
    });
    reported.emit("message", {
      kind: "resources",
      resources: { rssBytes: 7, maximumRssBytes: 8 }
    });
    reported.emit("exit", 0, null);
    reported.emit("close", 0, null);
  });
  await assert.rejects(
    reportedFailure,
    error => error.name === "ScenarioGenerationError" &&
      error.message === "fixture reported failure" &&
      error.diagnostics?.kind === "preflight"
  );
  assert.deepEqual(reported.killSignals, []);

  const timedOut = childDouble({ terminationDelay: 20 });
  let spawnOptions;
  let timeoutSettled = false;
  const timeoutFailure = runRealisticGenerationChild({ operation: "dataset" }, {
    timeout: 5,
    spawn: (_path, _arguments, options) => {
      spawnOptions = options;
      return timedOut;
    }
  });
  void timeoutFailure.finally(() => {
    timeoutSettled = true;
  }).catch(() => {});
  await pause(10);
  assert.equal(timeoutSettled, false);
  await assert.rejects(
    timeoutFailure,
    error => error.name === "ScenarioGenerationTimeoutError" &&
      /exceeded 5 ms/u.test(error.message)
  );
  assert.equal(timedOut.killSignal, "SIGKILL");
  assert.deepEqual(timedOut.killSignals, ["SIGKILL"]);
  assert.deepEqual(spawnOptions.execArgv, [
    "--expose-gc",
    "--max-old-space-size=288"
  ]);
  assert.equal(spawnOptions.serialization, "advanced");

  const processError = new Error("fixture process error");
  const errored = childDouble({ terminationDelay: 15 });
  let processErrorSettled = false;
  const processFailure = runRealisticGenerationChild({ operation: "dataset" }, {
    timeout: 1_000,
    spawn: () => errored
  });
  void processFailure.finally(() => {
    processErrorSettled = true;
  }).catch(() => {});
  queueMicrotask(() => errored.emit("error", processError));
  await pause(5);
  assert.equal(processErrorSettled, false);
  await assert.rejects(processFailure, error => error === processError);
  assert.deepEqual(errored.killSignals, ["SIGKILL"]);

  for (const [label, send] of [
    ["synchronous", () => {
      throw new Error("fixture synchronous send failure");
    }],
    ["callback", (_message, callback) => {
      queueMicrotask(() => callback(new Error("fixture callback send failure")));
    }]
  ]) {
    const failedSend = childDouble({ send, terminationDelay: 10 });
    const sendFailure = runRealisticGenerationChild({ operation: "dataset" }, {
      timeout: 50,
      spawn: () => failedSend
    });
    await assert.rejects(
      sendFailure,
      error => error.message === `fixture ${label} send failure`
    );
    await pause(55);
    assert.deepEqual(failedSend.killSignals, ["SIGKILL"]);
  }

  const unspawned = childDouble();
  delete unspawned.pid;
  const spawnError = new Error("fixture spawn failure");
  const spawnFailure = runRealisticGenerationChild({ operation: "plan" }, {
    timeout: 1_000,
    spawn: () => unspawned
  });
  queueMicrotask(() => unspawned.emit("error", spawnError));
  await assert.rejects(spawnFailure, error => error === spawnError);
  assert.deepEqual(unspawned.killSignals, []);

  const crashed = childDouble();
  const crash = runRealisticGenerationChild({ operation: "dataset" }, {
    timeout: 1_000,
    spawn: () => crashed
  });
  const crashDetail = `discarded-prefix-${"x".repeat(9_000)}-retained-tail`;
  queueMicrotask(() => {
    crashed.emit("exit", 17, null);
    crashed.stderr.emit("data", Buffer.from(crashDetail));
    crashed.emit("close", 17, null);
  });
  let crashError;
  await assert.rejects(
    crash,
    error => {
      crashError = error;
      return /exited with code 17/u.test(error.message) &&
        error.message.endsWith("-retained-tail");
    }
  );
  assert.equal(crashError.message.includes("discarded-prefix"), false);
  assert.equal(crashError.message.length < 8_400, true);
});

for (const failureName of [
  "ScenarioGenerationCrashError",
  "ScenarioGenerationTimeoutError"
]) {
  test(`keeps the last complete dataset state atomic after ${failureName}`, async () => {
    const harness = atomicFailureHarness(failureName);
    let failure;
    await assert.rejects(
      generateRealisticDescriptorsIsolated({
        limit: 216,
        strictScheduling: true,
        timeout: 60_000
      }, { runChild: harness.runChild }),
      error => {
        failure = error;
        return error.name === failureName;
      }
    );
    assert.equal(Object.isFrozen(failure.generationResources), true);
    assert.equal(Object.isFrozen(failure.generationResources.children), true);
    assert.equal(failure.generationResources.complete, false);
    assert.deepEqual(
      failure.generationResources.children.map(value => [
        value.operation,
        value.dataset
      ]),
      [
        ["plan", undefined],
        ["requirements", "dataset-00"],
        ["requirements", "dataset-01"],
        ["requirements", "dataset-02"],
        ["merge", undefined],
        ["dataset", "dataset-00"]
      ]
    );
    assert.equal(failure.generationResources.maximumChildRssBytes, 1);
    assert.equal(failure.generationResources.maximumCoordinatorRssBytes > 0, true);
    assert.equal(
      failure.generationResources.maximumCombinedRssBytes,
      failure.generationResources.maximumChildRssBytes +
        failure.generationResources.maximumCoordinatorRssBytes
    );
    assert.equal(
      failure.generationResources.maximumCombinedRssBytes <= 512 * 1_024 * 1_024,
      true
    );
    assert.doesNotMatch(
      JSON.stringify(failure.generationResources),
      /descriptors|state|factors|analysisRows/u
    );
    const datasetMessages = harness.messages.filter(message =>
      message.operation === "dataset"
    );
    assert.deepEqual(datasetMessages.map(message => message.dataset), [
      "dataset-00",
      "dataset-01"
    ]);
    assert.deepEqual(datasetMessages[0].state, harness.initialState);
    assert.deepEqual(datasetMessages[1].state, harness.committedState);
    assert.equal(harness.initialState.nextDatasetIndex, 0);
    assert.deepEqual(harness.initialState.fingerprints, []);
    assert.deepEqual(harness.initialState.recipeCounts, []);
    assert.equal(
      harness.messages.some(message =>
        message.operation === "dataset" && message.dataset === "dataset-02"
      ),
      false
    );
    assert.equal(
      harness.messages.some(message => message.operation === "finalize"),
      false
    );
  });
}

test("rejects a malformed successful dataset state before committing it", async () => {
  const harness = atomicFailureHarness("unused");
  const runChild = async message => {
    const result = await harness.runChild(message);
    if (message.operation !== "dataset") return result;
    const { stateId: _stateId, ...payload } = result.value.state;
    const malformedState = sealedState({
      ...payload,
      recipeCounts: [["recipe-a", 72], ["recipe-a", 1]],
      factorValueCounts: [["invalid", Number.NaN]]
    });
    return {
      ...result,
      value: { ...result.value, state: malformedState }
    };
  };
  await assert.rejects(
    generateRealisticDescriptorsIsolated({
      limit: 216,
      strictScheduling: true,
      timeout: 60_000
    }, { runChild }),
    /state child response is invalid/u
  );
  assert.deepEqual(
    harness.messages.filter(message => message.operation === "dataset")
      .map(message => message.dataset),
    ["dataset-00"]
  );
  assert.equal(
    harness.messages.some(message => message.operation === "finalize"),
    false
  );
});

test("rejects a validly sealed dataset state that resets checkpoint history", async () => {
  const harness = atomicFailureHarness("unused");
  const runChild = async message => {
    const result = await harness.runChild(message);
    if (message.operation !== "merge") return result;
    const { stateId: _stateId, ...payload } = result.value.state;
    return {
      ...result,
      value: {
        ...result.value,
        state: sealedState({
          ...payload,
          baselineFactorCases: ["recipe-a"],
          factorValueCounts: [["fixture-history", 1]],
          factorValueDatasets: [["fixture-history", ["dataset-00"]]]
        })
      }
    };
  };
  await assert.rejects(
    generateRealisticDescriptorsIsolated({
      limit: 216,
      strictScheduling: true,
      timeout: 60_000
    }, { runChild }),
    /state transition child response is invalid/u
  );
  assert.deepEqual(
    harness.messages.filter(message => message.operation === "dataset")
      .map(message => message.dataset),
    ["dataset-00"]
  );
});

test("rejects forged factor usages and unknown schedule eligibility", async () => {
  for (const kind of ["usage", "schedule"]) {
    const harness = atomicFailureHarness("unused");
    const runChild = async message => {
      const result = await harness.runChild(message);
      if (message.operation !== "requirements" || message.dataset !== "dataset-00") {
        return result;
      }
      return {
        ...result,
        value: {
          fragment: {
            ...result.value.fragment,
            ...(kind === "usage"
              ? {
                  factorRequirements: [{
                    usageKey: "forged",
                    recipe: "recipe-a",
                    factor: "mode",
                    value: "fixture"
                  }]
                }
              : {
                  scheduleEligibility: [{
                    recipe: "recipe-a",
                    variantId: "unknown"
                  }]
                })
          }
        }
      };
    };
    await assert.rejects(
      generateRealisticDescriptorsIsolated({
        limit: 216,
        strictScheduling: true,
        timeout: 60_000
      }, { runChild }),
      kind === "usage"
        ? /requirements .* child response is invalid/u
        : /schedule requirement merge child response is invalid/u
    );
  }
});

test("rejects a successful finalizer with an incomplete descriptor payload", async () => {
  const harness = atomicFailureHarness("unused", {
    activeDatasetCount: 1,
    selectedDescriptorCount: 72
  });
  const runChild = async message => {
    try {
      return await harness.runChild(message);
    } catch (error) {
      if (message.operation !== "finalize") throw error;
      return {
        value: { descriptors: [], generation: {}, requirements: {} },
        resources: { rssBytes: 1, maximumRssBytes: 1 }
      };
    }
  };
  await assert.rejects(
    generateRealisticDescriptorsIsolated({
      limit: 72,
      strictScheduling: true,
      timeout: 60_000
    }, { runChild }),
    /finalize child response is invalid/u
  );
  assert.deepEqual(
    harness.messages.filter(message => message.operation === "dataset")
      .map(message => message.dataset),
    ["dataset-00"]
  );
});

test("rejects weakened final requirements and post-validation deadline overruns", async () => {
  for (const kind of ["requirements", "deadline"]) {
    const harness = atomicFailureHarness("unused", {
      activeDatasetCount: 1,
      selectedDescriptorCount: 72
    });
    const runChild = async message => {
      try {
        return await harness.runChild(message);
      } catch (error) {
        if (message.operation !== "finalize") throw error;
        if (kind === "deadline") await pause(30);
        return {
          value: fixtureFinalization(message, kind === "requirements"
            ? { features: [], interactions: [] }
            : {
                features: ["fixture:feature"],
                interactions: [{ members: ["fixture:a", "fixture:b"] }]
              }),
          resources: { rssBytes: 1, maximumRssBytes: 1 }
        };
      }
    };
    await assert.rejects(
      generateRealisticDescriptorsIsolated({
        limit: 72,
        strictScheduling: true,
        timeout: kind === "deadline" ? 20 : 60_000
      }, { runChild }),
      kind === "requirements"
        ? /finalize child response is invalid/u
        : error => error.name === "ScenarioGenerationTimeoutError"
    );
  }
});

test("preserves compact generator diagnostics in a failed audit report", async t => {
  const root = await mkdtemp(path.join(tmpdir(), "ggaction-realistic-generation-failure-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const options = parseRealisticScenarioArguments(["--no-artifacts"]);
  const generatedFailure = generateRealisticDescriptorsInWorker({
    limit: 72,
    timeout: 120_000,
    recipeIds: [
      "realistic-direct-lifecycle-removal-coverage",
      "realistic-direct-lifecycle-data-mark-coverage",
      "realistic-direct-lifecycle-selection-coverage",
      "realistic-direct-lifecycle-statistical-coverage"
    ]
  });
  let failure;
  await assert.rejects(
    runRealisticScenarioCorpus(options, {
      artifactRoot: root,
      runId: "generation-failure",
      generated: generatedFailure
    }),
    error => {
      failure = error;
      return error.name === "ScenarioGenerationError" &&
        error.diagnostics?.kind === "quota";
    }
  );
  const report = JSON.parse(await readFile(
    path.join(root, "audits/generation-failure/report.json"),
    "utf8"
  ));
  assert.equal(failure.runOutput, path.join(root, "audits/generation-failure"));
  assert.deepEqual(report.error.diagnostics, failure.diagnostics);
  assert.deepEqual(report.generationResources, failure.generationResources);
  assert.equal(failure.generationResources.complete, false);
  assert.equal(Object.isFrozen(failure.generationResources), true);
  assert.deepEqual(
    failure.generationResources.children.map(value => [
      value.operation,
      value.dataset
    ]),
    [
      ["plan", undefined],
      ["requirements", "tt-penguins"],
      ["merge", undefined],
      ["dataset", "tt-penguins"]
    ]
  );
  assert.equal(failure.generationResources.maximumChildRssBytes > 0, true);
  assert.equal(
    failure.generationResources.maximumChildRssBytes <= 440 * 1_024 * 1_024,
    true
  );
  assert.equal(failure.generationResources.maximumCoordinatorRssBytes > 0, true);
  assert.equal(
    failure.generationResources.maximumCombinedRssBytes,
    failure.generationResources.maximumChildRssBytes +
      failure.generationResources.maximumCoordinatorRssBytes
  );
  assert.equal(
    failure.generationResources.maximumCombinedRssBytes <= 512 * 1_024 * 1_024,
    true
  );
  assert.equal(failure.generationResources.wallTimeMs.total > 0, true);
  assert.equal(failure.generationResources.wallTimeMs.datasetGeneration > 0, true);
  assert.doesNotMatch(
    JSON.stringify(failure.generationResources),
    /descriptors|state|factors|analysisRows/u
  );
  assert.deepEqual({
    stage: report.stage,
    dataset: report.error.diagnostics.dataset,
    datasetIndex: report.error.diagnostics.datasetIndex,
    tier: report.error.diagnostics.tier,
    quota: report.error.diagnostics.quota,
    produced: report.error.diagnostics.produced,
    schedulingIterations: report.error.diagnostics.schedulingIterations,
    eligibleRecipeCount: report.error.diagnostics.eligibleRecipeCount
  }, {
    stage: "generation",
    dataset: "tt-penguins",
    datasetIndex: 0,
    tier: "simple",
    quota: 11,
    produced: 1,
    schedulingIterations: 3,
    eligibleRecipeCount: 1
  });
  assert.deepEqual(report.error.diagnostics.recipeCounts, {
    entries: [{
      recipe: "realistic-direct-lifecycle-removal-coverage",
      selections: 1,
      duplicates: 1
    }],
    omitted: 0
  });
  assert.equal(report.error.diagnostics.acceptedSamples.length, 1);
  assert.match(
    report.error.diagnostics.acceptedSamples[0].factorDigest,
    /^[a-f0-9]{12}$/u
  );
  assert.match(
    report.error.diagnostics.acceptedSamples[0].fingerprintPrefix,
    /^[a-f0-9]{12}$/u
  );
  assert.equal(report.error.diagnostics.duplicateCount, 1);
  assert.equal(report.error.diagnostics.rejectionCount, 0);
  assert.deepEqual(report.error.diagnostics.recentRejections, []);
  assert.equal(report.error.diagnostics.exhaustionSkipCount, 1);
  assert.deepEqual(report.error.diagnostics.exhaustionSkips, [{
    recipe: "realistic-direct-lifecycle-removal-coverage",
    eligibleFactorCases: 1,
    attemptedEligibleFactorCases: 1,
    scheduledVariantId: "maximal"
  }]);
  assert.doesNotMatch(JSON.stringify(report.error.diagnostics), /"factors"|analysisRows/u);
});

test("keeps thin PNG content visible to native-resolution audit evidence", async () => {
  const width = 1_025;
  const height = 769;
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#000000";
  context.fillRect(width - 1, height - 1, 1, 1);
  const evidence = await decodedPngEvidence(
    canvas.toBuffer("image/png"),
    { width, height },
    "thin-content",
    { createCanvas, loadImage }
  );
  assert.deepEqual({
    nonBlank: evidence.nonBlank,
    nativePixelScan: evidence.nativePixelScan,
    scannedPixels: evidence.scannedPixels,
    scannedTiles: evidence.scannedTiles
  }, {
    nonBlank: true,
    nativePixelScan: true,
    scannedPixels: width * height,
    scannedTiles: 20
  });

  const blank = createCanvas(257, 257);
  const blankContext = blank.getContext("2d");
  blankContext.fillStyle = "#ffffff";
  blankContext.fillRect(0, 0, 257, 257);
  await assert.rejects(
    decodedPngEvidence(
      blank.toBuffer("image/png"),
      { width: 257, height: 257 },
      "blank-content",
      { createCanvas, loadImage }
    ),
    /blank-content PNG is unexpectedly blank/u
  );
});

test("reads length-bounded compressed PDF text and rejects drawing-only streams", () => {
  const textAndDrawing =
    "BT /F1 12 Tf 10 90 Td (Visible 0) Tj ET\n" +
    "0 0 m 10 10 l S\n%\u0004";
  assert.equal(deflateSync(Buffer.from(textAndDrawing, "latin1")).at(-1), 13);
  const evidence = pdfEvidence(
    pdfFixture(textAndDrawing, { compressed: true }),
    { width: 100, height: 100 },
    "compressed-text"
  );
  assert.deepEqual({
    textContent: evidence.textContent,
    textShowContent: evidence.textShowContent,
    drawingContent: evidence.drawingContent,
    decodedStreamCount: evidence.decodedStreamCount
  }, {
    textContent: true,
    textShowContent: true,
    drawingContent: true,
    decodedStreamCount: 1
  });
  assert.throws(
    () => pdfEvidence(
      pdfFixture("0 0 m 10 10 l S\n"),
      { width: 100, height: 100 },
      "drawing-only"
    ),
    /drawing-only PDF text content/u
  );
  assert.throws(
    () => pdfEvidence(
      pdfFixture("BT /F1 12 Tf ET\n0 0 m 10 10 l S\n"),
      { width: 100, height: 100 },
      "empty-text-object"
    ),
    /empty-text-object PDF text show content/u
  );
});

test("accepts deterministic readable PNG and compressed PDF artifact regressions", async t => {
  const directory = await mkdtemp(path.join(tmpdir(), "ggaction-realistic-evidence-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const tuition = Object.freeze({
    id: "realistic-direct-lifecycle-cartesian-guide-coverage-457771c64a26",
    recipe: "realistic-direct-lifecycle-cartesian-guide-coverage",
    factors: Object.freeze({
      dataset: "tt-tuition-costs",
      profile: Object.freeze({ id: "decimal-object" })
    }),
    semanticFingerprint:
      "46c3ae794d397f0017bcc5b7a6a962bcf21dbed3d1b515abcb4767e4e0997495"
  });
  const outerSpace = Object.freeze({
    id: "realistic-ranked-dots-1c891ae5f0d9",
    recipe: "realistic-ranked-dots",
    factors: Object.freeze({
      dataset: "tt-outer-space-objects",
      fieldPair: Object.freeze({
        measureIndex: 0,
        dimensionIndex: 0,
        bindingId: "curated:primary"
      }),
      titleAlign: "center",
      aggregate: "median",
      palette: "pastel2",
      legendPosition: "bottom",
      shape: "diamond",
      opacity: 0.7,
      radius: 4
    }),
    semanticFingerprint:
      "e6d4b576c36f84ef3ac9b8ddbc1ae212269e4bbd6f85337ca08b5da432b310e7"
  });
  t.after(() => {
    releaseTidyTuesdaySourceCache(tuition.factors.dataset);
    releaseTidyTuesdaySourceCache(outerSpace.factors.dataset);
  });

  const pngOutcome = await executeRealisticScenarioTask({
    index: 0,
    descriptor: tuition,
    deterministic: true,
    artifacts: true,
    png: true,
    pdf: false,
    visualAudit: true,
    output: directory
  });
  assert.equal(pngOutcome.ok, true, pngOutcome.error?.stack);
  const readability = await pngReadabilityEvidence(
    await readFile(pngOutcome.result.artifacts.png.output)
  );
  const pngReplay = await executeRealisticScenarioTask({
    index: 0,
    descriptor: tuition,
    deterministic: true,
    artifacts: true,
    png: true,
    pdf: false,
    visualAudit: true,
    output: path.join(directory, "png-replay")
  });
  assert.equal(pngReplay.ok, true, pngReplay.error?.stack);
  assert.deepEqual({
    width: pngOutcome.result.artifacts.png.width,
    height: pngOutcome.result.artifacts.png.height,
    sha256: pngOutcome.result.artifacts.png.sha256,
    nonBlank: pngOutcome.result.artifacts.png.validation.nonBlank,
    nativePixelScan: pngOutcome.result.artifacts.png.validation.nativePixelScan
  }, {
    width: 1_600,
    height: 1_000,
    sha256: pngReplay.result.artifacts.png.sha256,
    nonBlank: true,
    nativePixelScan: true
  });
  assert.ok(readability.strongInkDensity >= 0.01, readability);
  assert.ok(
    readability.bounds.x <= pngOutcome.result.artifacts.png.width * 0.05,
    JSON.stringify(readability)
  );
  assert.ok(
    readability.bounds.y <= pngOutcome.result.artifacts.png.height * 0.05,
    JSON.stringify(readability)
  );
  assert.ok(readability.bounds.width >= 1_190, readability);
  assert.ok(readability.bounds.height >= 870, readability);

  const pdfOutcome = await executeRealisticScenarioTask({
    index: 1,
    descriptor: outerSpace,
    deterministic: true,
    artifacts: true,
    png: false,
    pdf: true,
    visualAudit: true,
    output: directory
  });
  assert.equal(pdfOutcome.ok, true, pdfOutcome.error?.stack);
  assert.deepEqual({
    width: pdfOutcome.result.artifacts.pdf.width,
    height: pdfOutcome.result.artifacts.pdf.height,
    sha256: pdfOutcome.result.artifacts.pdf.sha256,
    textContent: pdfOutcome.result.artifacts.pdf.validation.textContent,
    textShowContent: pdfOutcome.result.artifacts.pdf.validation.textShowContent,
    drawingContent: pdfOutcome.result.artifacts.pdf.validation.drawingContent
  }, {
    width: 2_600,
    height: 1_120,
    sha256: "d6d11ecd9a803655d386e82508634221117c58d6545071e65dae5d640b5d419a",
    textContent: true,
    textShowContent: true,
    drawingContent: true
  });
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
  assert.deepEqual(result.report.generationResources, generation.resources);
  assert.equal(result.report.generationResources.wallTimeMs.total > 0, true);
  assert.equal(result.report.generationResources.maximumChildRssBytes > 0, true);
  assert.equal(result.report.executionResources.complete, true);
  assert.equal(result.report.executionResources.children.length, 1);
  assert.equal(result.report.executionResources.children[0].completedScenarios, 1);
  assert.equal(result.report.executionResources.maximumChildRssBytes > 0, true);
  assert.equal(
    result.report.executionResources.maximumChildRssBytes <= 440 * 1_024 * 1_024,
    true
  );
  assert.equal(
    result.report.executionResources.maximumCoordinatorLifetimeRssBytes > 0,
    true
  );
  assert.equal(
    result.report.executionResources.maximumCoordinatorExecutionSampledRssBytes > 0,
    true
  );
  assert.equal(
    result.report.executionResources.maximumConservativeCombinedRssBytes,
    result.report.executionResources.maximumChildRssBytes +
      result.report.executionResources.maximumCoordinatorLifetimeRssBytes
  );
  assert.equal(
    result.report.executionResources.maximumExecutionPhaseConservativeCombinedRssBytes,
    result.report.executionResources.maximumChildRssBytes +
      result.report.executionResources.maximumCoordinatorExecutionSampledRssBytes
  );
  assert.equal(
    result.report.executionResources.maximumIpcSampledCombinedRssBytes <=
      result.report.executionResources
        .maximumExecutionPhaseConservativeCombinedRssBytes,
    true
  );
  assert.equal(result.report.executionResources.wallTimeMs.total > 0, true);
  assert.equal(result.report.executionResources.wallTimeMs.observedChildren > 0, true);
  const persistedReport = JSON.parse(await readFile(
    path.join(result.layout.output, "report.json"),
    "utf8"
  ));
  assert.deepEqual(persistedReport.generationResources, generation.resources);
  assert.deepEqual(persistedReport.executionResources, result.report.executionResources);
  assert.equal(JSON.parse(await readFile(
    path.join(result.layout.output, "manifest.json"),
    "utf8"
  )).charts[0].semanticFingerprint, generation.descriptors[0].semanticFingerprint);
  assert.equal(
    await lstat(path.join(result.layout.output, ".execution-outcomes"))
      .catch(() => undefined),
    undefined
  );
});
