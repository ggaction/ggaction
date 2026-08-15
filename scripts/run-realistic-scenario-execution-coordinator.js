import { fork } from "node:child_process";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

const childPath = fileURLToPath(new URL(
  "./run-realistic-scenario-worker.js",
  import.meta.url
));

const MAX_DIAGNOSTIC_OUTPUT = 8_192;
const EXECUTION_CHILD_OLD_SPACE_MIB = 224;
const CHILD_SOFT_TERMINATION_GRACE_MS = 1_000;
const CHILD_HARD_TERMINATION_GRACE_MS = 4_000;
const CHILD_CLOSE_GRACE_MS = 5_000;
const SHA256 = /^[a-f0-9]{64}$/u;

function deepFreeze(value, visited = new Set()) {
  if (value === null || typeof value !== "object" || visited.has(value)) return value;
  visited.add(value);
  for (const child of Object.values(value)) deepFreeze(child, visited);
  return Object.freeze(value);
}

function appendDiagnostic(current, chunk) {
  const value = `${current}${chunk}`;
  return value.length <= MAX_DIAGNOSTIC_OUTPUT
    ? value
    : value.slice(value.length - MAX_DIAGNOSTIC_OUTPUT);
}

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function executionTask(value, dataset) {
  return record(value) && Number.isSafeInteger(value.index) && value.index >= 0 &&
    record(value.descriptor) &&
    typeof value.descriptor.id === "string" && value.descriptor.id.length > 0 &&
    typeof value.descriptor.recipe === "string" &&
    value.descriptor.recipe.length > 0 &&
    value.descriptor.factors?.dataset === dataset &&
    SHA256.test(value.descriptor.semanticFingerprint);
}

function executionResources(value) {
  return record(value) && Number.isFinite(value.rssBytes) && value.rssBytes >= 0 &&
    Number.isFinite(value.maximumRssBytes) &&
    value.maximumRssBytes >= value.rssBytes &&
    Number.isFinite(value.wallTimeMs) && value.wallTimeMs >= 0;
}

function nonemptyStringArray(value) {
  return Array.isArray(value) && value.every(item =>
    typeof item === "string" && item.length > 0
  );
}

function nonnegativeInteger(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function compactScenarioResult(value, descriptor) {
  const metadata = value?.metadata;
  return record(value) &&
    value.id === descriptor.id &&
    value.recipe === descriptor.recipe &&
    value.dataset === descriptor.factors.dataset &&
    value.semanticFingerprint === descriptor.semanticFingerprint &&
    SHA256.test(value.svgSha256) &&
    nonemptyStringArray(value.operations) &&
    nonemptyStringArray(value.directOperations) &&
    nonemptyStringArray(value.effectiveFeatures) &&
    nonemptyStringArray(value.renderers) &&
    Array.isArray(value.directTrace) && value.directTrace.every(entry =>
      record(entry) && typeof entry.op === "string" && entry.op.length > 0 &&
      record(entry.args)
    ) &&
    Array.isArray(value.factorEffects) &&
    record(value.artifacts) && record(value.graphic) &&
    nonnegativeInteger(value.actionCount) &&
    nonnegativeInteger(value.layerCount) &&
    nonnegativeInteger(value.datasetCount) &&
    nonnegativeInteger(value.svgBytes) &&
    record(metadata) &&
    typeof metadata.title === "string" && metadata.title.length > 0 &&
    typeof metadata.analysisQuestion === "string" &&
    metadata.analysisQuestion.length > 0 &&
    typeof metadata.chartFamily === "string" && metadata.chartFamily.length > 0 &&
    typeof metadata.complexity === "string" && metadata.complexity.length > 0 &&
    Array.isArray(metadata.sourceFields) &&
    record(metadata.provenance) &&
    SHA256.test(metadata.provenance.sourceSelectionSha256) &&
    nonnegativeInteger(metadata.provenance.sourceRowCount);
}

function executionOutcome(value, task) {
  if (!record(value) || value.index !== task.index || typeof value.ok !== "boolean") {
    return false;
  }
  if (value.ok) {
    return compactScenarioResult(value.result, task.descriptor);
  }
  return record(value.error) && typeof value.error.name === "string" &&
    typeof value.error.message === "string";
}

function protocolError(detail) {
  const error = new Error(`Realistic scenario execution child returned invalid ${detail}.`);
  error.name = "WorkerProtocolError";
  return error;
}

function boundedProcessFailure(error, stderr) {
  const detail = stderr.trim();
  const suffix = detail.length === 0 ? "" : `\n${detail}`;
  const failure = new Error(`${error.message}${suffix}`);
  failure.name = error.name;
  failure.stack = error.stack;
  return failure;
}

function terminationFailure(error) {
  const failure = new Error(
    "Realistic scenario execution child termination could not be confirmed " +
    `after ${error.name}: ${error.message}`
  );
  failure.name = "WorkerTerminationError";
  return failure;
}

function spawnExecutionChild(spawn = fork) {
  return spawn(childPath, [], {
    execArgv: [
      "--expose-gc",
      `--max-old-space-size=${EXECUTION_CHILD_OLD_SPACE_MIB}`
    ],
    serialization: "advanced",
    stdio: ["ignore", "pipe", "pipe", "ipc"]
  });
}

export function runRealisticScenarioExecutionChild({
  dataset,
  tasks,
  timeout
}, {
  spawn = fork,
  softTerminationGraceMs = CHILD_SOFT_TERMINATION_GRACE_MS,
  hardTerminationGraceMs = CHILD_HARD_TERMINATION_GRACE_MS,
  closeGraceMs = CHILD_CLOSE_GRACE_MS
} = {}) {
  if (typeof dataset !== "string" || dataset.length === 0) {
    throw new TypeError("Realistic scenario execution dataset must be a string.");
  }
  if (
    !Array.isArray(tasks) || tasks.length === 0 ||
    tasks.some(task => !executionTask(task, dataset)) ||
    new Set(tasks.map(task => task.index)).size !== tasks.length
  ) {
    throw new TypeError("Realistic scenario execution requires unique indexed dataset tasks.");
  }
  if (!Number.isSafeInteger(timeout) || timeout <= 0) {
    throw new RangeError("Realistic scenario execution timeout must be positive.");
  }
  for (const [label, value] of [
    ["soft termination grace", softTerminationGraceMs],
    ["hard termination grace", hardTerminationGraceMs],
    ["close grace", closeGraceMs]
  ]) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new RangeError(`Realistic scenario execution ${label} must be positive.`);
    }
  }

  const started = performance.now();
  let child;
  try {
    child = spawnExecutionChild(spawn);
  } catch (error) {
    if (record(error) && Object.isExtensible(error)) {
      error.partialOutcomes = Object.freeze([]);
      error.executionResource = deepFreeze({
        complete: false,
        terminationConfirmed: true,
        dataset,
        firstScenarioIndex: tasks[0].index,
        requestedScenarios: tasks.length,
        completedScenarios: 0,
        coordinatorWallTimeMs: performance.now() - started
      });
    }
    return Promise.reject(error);
  }

  return new Promise((resolve, reject) => {
    const outcomes = [];
    let lastResources;
    let finalResources;
    let stdout = "";
    let stderr = "";
    let timer;
    let softTerminationTimer;
    let hardTerminationTimer;
    let closeTimer;
    let failure;
    let exitObserved = false;
    let exitCode;
    let exitSignal;
    let settled = false;
    let terminationStage = "none";
    let maximumCoordinatorIpcSampledRssBytes;
    let maximumIpcSampledCombinedRssBytes;

    const resourceRecord = ({ complete, terminationConfirmed }) => deepFreeze({
      complete,
      terminationConfirmed,
      dataset,
      firstScenarioIndex: tasks[0].index,
      requestedScenarios: tasks.length,
      completedScenarios: outcomes.length,
      coordinatorWallTimeMs: performance.now() - started,
      ...(lastResources === undefined
        ? {}
        : {
            rssBytes: lastResources.rssBytes,
            maximumRssBytes: lastResources.maximumRssBytes,
            childWallTimeMs: lastResources.wallTimeMs
          }),
      ...(maximumIpcSampledCombinedRssBytes === undefined
        ? {}
        : {
            maximumCoordinatorIpcSampledRssBytes,
            maximumIpcSampledCombinedRssBytes
          })
    });
    const attachPartial = (error, terminationConfirmed) => {
      if (record(error) && Object.isExtensible(error)) {
        error.partialOutcomes = deepFreeze([...outcomes]);
        error.executionResource = resourceRecord({
          complete: false,
          terminationConfirmed
        });
      }
      return error;
    };
    const finish = (settler, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(softTerminationTimer);
      clearTimeout(hardTerminationTimer);
      clearTimeout(closeTimer);
      settler(value);
    };
    const sampleIpcResource = resources => {
      const coordinatorRssBytes = process.memoryUsage().rss;
      maximumCoordinatorIpcSampledRssBytes = Math.max(
        maximumCoordinatorIpcSampledRssBytes ?? 0,
        coordinatorRssBytes
      );
      maximumIpcSampledCombinedRssBytes = Math.max(
        maximumIpcSampledCombinedRssBytes ?? 0,
        coordinatorRssBytes + resources.rssBytes
      );
    };
    const requestSignal = signal => {
      if (exitObserved || child.pid === undefined) return;
      try {
        child.kill(signal);
      } catch {
        // The terminal event, rather than kill()'s return value, confirms exit.
      }
    };
    const scheduleCloseFallback = () => {
      if (closeTimer !== undefined || settled) return;
      closeTimer = setTimeout(() => {
        const error = new Error(
          "Realistic scenario execution child exited but did not close its IPC streams."
        );
        error.name = "WorkerCloseError";
        finish(reject, attachPartial(
          boundedProcessFailure(failure ?? error, stderr),
          true
        ));
      }, closeGraceMs);
    };
    const scheduleHardTerminationFallback = () => {
      clearTimeout(softTerminationTimer);
      terminationStage = "hard";
      requestSignal("SIGKILL");
      hardTerminationTimer = setTimeout(() => {
        const error = terminationFailure(failure ?? new Error(
          "Realistic scenario execution child did not terminate."
        ));
        finish(reject, attachPartial(
          boundedProcessFailure(error, stderr),
          false
        ));
      }, hardTerminationGraceMs);
    };
    const terminateWith = error => {
      failure ??= error;
      clearTimeout(timer);
      if (exitObserved) {
        scheduleCloseFallback();
        return;
      }
      if (child.pid === undefined) {
        finish(reject, attachPartial(
          boundedProcessFailure(failure, stderr),
          true
        ));
        return;
      }
      if (terminationStage === "none") {
        terminationStage = "soft";
        requestSignal("SIGTERM");
        softTerminationTimer = setTimeout(() => {
          if (!exitObserved) scheduleHardTerminationFallback();
        }, softTerminationGraceMs);
      } else if (terminationStage === "soft") {
        clearTimeout(softTerminationTimer);
        scheduleHardTerminationFallback();
      } else if (terminationStage === "hard") {
        try {
          child.kill("SIGKILL");
        } catch {
          // Keep waiting for the already bounded hard-termination deadline.
        }
      }
    };
    const armTimeout = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const task = tasks[outcomes.length];
        const error = new Error(
          `Scenario ${task?.descriptor?.id ?? task?.index ?? "unknown"} exceeded ` +
          `${timeout} ms.`
        );
        error.name = "ScenarioTimeoutError";
        terminateWith(error);
      }, timeout);
    };
    const completeAfterTermination = (code, signal) => {
      if (failure !== undefined) {
        finish(reject, attachPartial(
          boundedProcessFailure(failure, stderr),
          true
        ));
        return;
      }
      if (code !== 0 || signal !== null) {
        const error = new Error(
          `Realistic scenario execution child exited with ` +
          `${signal === null ? `code ${code}` : `signal ${signal}`}.`
        );
        error.name = "WorkerExitError";
        finish(reject, attachPartial(boundedProcessFailure(error, stderr), true));
        return;
      }
      if (outcomes.length !== tasks.length || !executionResources(finalResources)) {
        finish(reject, attachPartial(protocolError("completion payload"), true));
        return;
      }
      finish(resolve, deepFreeze({
        outcomes,
        resource: resourceRecord({
          complete: true,
          terminationConfirmed: true
        })
      }));
    };

    child.stdout?.on("data", chunk => {
      stdout = appendDiagnostic(stdout, chunk.toString());
    });
    child.stderr?.on("data", chunk => {
      stderr = appendDiagnostic(stderr, chunk.toString());
    });
    child.on("message", message => {
      if (failure !== undefined) return;
      if (message?.kind === "outcome") {
        const task = tasks[outcomes.length];
        if (
          message.dataset !== dataset || task === undefined ||
          !executionOutcome(message.outcome, task) ||
          !executionResources(message.resources)
        ) {
          terminateWith(protocolError("outcome payload"));
          return;
        }
        lastResources = message.resources;
        sampleIpcResource(message.resources);
        outcomes.push(message.outcome.ok
          ? Object.freeze({ ok: true, result: message.outcome.result })
          : Object.freeze({
              ok: false,
              descriptor: task.descriptor,
              error: message.outcome.error
            })
        );
        armTimeout();
        return;
      }
      if (message?.kind === "resources") {
        if (
          message.dataset !== dataset || outcomes.length !== tasks.length ||
          !executionResources(message.resources) || finalResources !== undefined
        ) {
          terminateWith(protocolError("resource payload"));
          return;
        }
        finalResources = message.resources;
        lastResources = message.resources;
        sampleIpcResource(message.resources);
        clearTimeout(timer);
        timer = setTimeout(() => {
          terminateWith(protocolError("timely process exit"));
        }, closeGraceMs);
        return;
      }
      if (message?.kind === "fatal") {
        const error = new Error(message.error?.message ?? "Execution child failed.");
        error.name = message.error?.name ?? "WorkerExitError";
        if (message.error?.stack !== undefined) error.stack = message.error.stack;
        terminateWith(error);
        return;
      }
      terminateWith(protocolError("message"));
    });
    child.on("error", error => terminateWith(error));
    child.once("exit", (code, signal) => {
      exitObserved = true;
      exitCode = code;
      exitSignal = signal;
      clearTimeout(timer);
      clearTimeout(softTerminationTimer);
      clearTimeout(hardTerminationTimer);
      scheduleCloseFallback();
    });
    child.once("close", (code, signal) => {
      const completedCode = exitObserved ? exitCode : code;
      const completedSignal = exitObserved ? exitSignal : signal;
      exitObserved = true;
      completeAfterTermination(completedCode, completedSignal);
    });
    armTimeout();
    try {
      child.send({ kind: "dataset", dataset, tasks }, error => {
        if (error !== null && error !== undefined) terminateWith(error);
      });
    } catch (error) {
      terminateWith(error);
    }
  });
}

function failureOutcome(task, error) {
  return Object.freeze({
    ok: false,
    descriptor: task.descriptor,
    error: Object.freeze({
      name: error?.name ?? "WorkerExitError",
      message: error?.message ?? String(error),
      stack: error?.stack
    })
  });
}

export async function runRealisticScenarioDatasetIsolated({
  dataset,
  tasks,
  timeout
}, dependencies = {}) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new TypeError("Realistic scenario dataset execution requires tasks.");
  }
  if (
    typeof dataset !== "string" || dataset.length === 0 ||
    tasks.some(task => !executionTask(task, dataset)) ||
    new Set(tasks.map(task => task.index)).size !== tasks.length
  ) {
    throw new TypeError(
      "Realistic scenario dataset execution requires unique indexed dataset tasks."
    );
  }
  const outcomes = [];
  const resources = [];
  let cursor = 0;
  while (cursor < tasks.length) {
    const remaining = tasks.slice(cursor);
    try {
      const completed = await runRealisticScenarioExecutionChild({
        dataset,
        tasks: remaining,
        timeout
      }, dependencies);
      outcomes.push(...completed.outcomes);
      resources.push(completed.resource);
      cursor = tasks.length;
    } catch (error) {
      const partial = Array.isArray(error?.partialOutcomes)
        ? error.partialOutcomes
        : [];
      outcomes.push(...partial);
      cursor += partial.length;
      if (error?.executionResource !== undefined) {
        resources.push(error.executionResource);
      }
      if (error?.executionResource?.terminationConfirmed !== true) {
        if (record(error) && Object.isExtensible(error)) {
          error.partialOutcomes = deepFreeze([...outcomes]);
          error.executionResources = deepFreeze([...resources]);
        }
        throw error;
      }
      if (cursor >= tasks.length) {
        if (record(error) && Object.isExtensible(error)) {
          error.partialOutcomes = deepFreeze([...outcomes]);
          error.executionResources = deepFreeze([...resources]);
        }
        throw error;
      }
      outcomes.push(failureOutcome(tasks[cursor], error));
      cursor += 1;
    }
  }
  return deepFreeze({ outcomes, resources });
}
