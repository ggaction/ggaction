import { cpus } from "node:os";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Worker } from "node:worker_threads";

import { DATASET_CORPUS } from "../test/support/datasets/catalog.js";
import {
  summarizeActionCoverage,
  summarizeDataCoverage
} from "../test/support/scenarios/coverage.js";
import {
  generateScenarioDescriptors,
  scenarioFactorContract,
  summarizeScenarioResults
} from "../test/support/scenarios/engine.js";
import { shrinkScenarioFailure } from "../test/support/scenarios/failures.js";
import { parseScenarioArguments } from "../test/support/scenarios/options.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const workerUrl = new URL("./run-generated-scenario-worker.js", import.meta.url);

function workerFailure(kind, descriptor, detail) {
  return Object.freeze({ ok: false, kind, descriptor, ...detail });
}

function runIsolated(descriptor, options) {
  return new Promise(resolve => {
    const worker = new Worker(workerUrl, {
      workerData: { descriptor, deterministic: options.deterministic }
    });
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      void worker.terminate();
      resolve(workerFailure("timeout", descriptor, {
        error: {
          name: "ScenarioTimeoutError",
          message: `Scenario exceeded ${options.timeout} ms.`,
          stack: undefined
        }
      }));
    }, options.timeout);
    worker.once("message", message => {
      finish(message.ok
        ? Object.freeze({ ok: true, descriptor, result: message.result })
        : workerFailure("error", descriptor, { error: message.error })
      );
    });
    worker.once("error", error => finish(workerFailure("worker", descriptor, {
      error: { name: error.name, message: error.message, stack: error.stack }
    })));
    worker.once("exit", code => {
      if (code !== 0) finish(workerFailure("worker", descriptor, {
        error: {
          name: "WorkerExitError",
          message: `Scenario worker exited with code ${code}.`,
          stack: undefined
        }
      }));
    });
  });
}

async function runPool(descriptors, options) {
  const results = Array(descriptors.length);
  let cursor = 0;
  async function consume() {
    while (cursor < descriptors.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await runIsolated(descriptors[index], options);
      const status = results[index].ok ? "ok" : results[index].kind;
      process.stdout.write(
        `[${index + 1}/${descriptors.length}] ${status} ${descriptors[index].id}\n`
      );
    }
  }
  await Promise.all(Array.from(
    { length: Math.min(options.concurrency, descriptors.length) },
    consume
  ));
  return results;
}

async function shrinkFailure(failure, options) {
  const contract = scenarioFactorContract(failure.descriptor.recipe, {
    includeTidyTuesday: options.includeTidyTuesday
  });
  return shrinkScenarioFailure(failure, contract, descriptor =>
    runIsolated(descriptor, {
        ...options,
        deterministic: false
    })
  );
}

async function actionCoverage(results) {
  const catalog = JSON.parse(await readFile(
    path.join(repositoryRoot, "knowledge/action-cards.json"),
    "utf8"
  ));
  const publicActions = catalog.cards
    .filter(card => card.layer === "user-facing")
    .map(card => card.name);
  return summarizeActionCoverage(results, publicActions);
}

async function writeReport(report) {
  const output = path.join(repositoryRoot, ".artifacts/scenarios/latest");
  await rm(path.join(output, "failures"), { recursive: true, force: true });
  await mkdir(path.join(output, "failures"), { recursive: true });
  await writeFile(
    path.join(output, "report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8"
  );
  for (const failure of report.failures) {
    await writeFile(
      path.join(output, "failures", `${failure.descriptor.id}.json`),
      `${JSON.stringify(failure, null, 2)}\n`,
      "utf8"
    );
  }
  return path.relative(repositoryRoot, path.join(output, "report.json"));
}

const options = parseScenarioArguments(process.argv.slice(2), {
  defaultConcurrency: Math.max(1, Math.min(4, cpus().length - 1))
});
const descriptors = generateScenarioDescriptors({
  mode: options.mode,
  includeTidyTuesday: options.includeTidyTuesday,
  ...(options.recipeIds === undefined ? {} : { recipeIds: options.recipeIds }),
  ...(options.limit === undefined ? {} : { limit: options.limit })
});
const outcomes = await runPool(descriptors, options);
const successes = outcomes.filter(outcome => outcome.ok).map(outcome => outcome.result);
const originalFailures = outcomes.filter(outcome => !outcome.ok);
const failures = [];
for (const failure of originalFailures) {
  failures.push(await shrinkFailure(failure, options));
}
const report = Object.freeze({
  version: 2,
  generatedAt: new Date().toISOString(),
  options,
  summary: summarizeScenarioResults(successes, descriptors),
  actionCoverage: await actionCoverage(successes),
  dataCoverage: summarizeDataCoverage(
    descriptors,
    successes,
    originalFailures,
    DATASET_CORPUS
  ),
  failures: Object.freeze(failures)
});
const reportPath = await writeReport(report);
process.stdout.write(`${JSON.stringify({
  report: reportPath,
  scenarios: descriptors.length,
  passed: successes.length,
  failed: failures.length,
  directPublicActions: `${report.actionCoverage.directCoveredActionCount}/${report.actionCoverage.publicActionCount}`,
  transitivePublicActions: `${report.actionCoverage.transitiveCoveredActionCount}/${report.actionCoverage.publicActionCount}`,
  fullySuccessfulDatasets: report.dataCoverage.executed.datasets.fullySuccessfulIds.length,
  manifestPotentialProfiles: report.dataCoverage.manifestPotential.profiles.length
}, null, 2)}\n`);
if (failures.length > 0) process.exitCode = 1;
