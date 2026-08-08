import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  assertPaidSmokeAuthorized,
  loadApiKey,
  paidSmokeRoot,
  preflightPaidSmokeTools,
  runPaidSmoke,
  runPaidSmokeDryRun
} from "./compact-paid-smoke.js";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function assertAbsent(file) {
  try {
    await access(file);
    throw new Error(`Paid smoke result already exists: ${file}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const resultsRoot = path.join(paidSmokeRoot, "results");
if (process.argv.includes("--dry-run")) {
  const result = await runPaidSmokeDryRun();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} else {
  const apiKeyFile = argument("--api-key-file");
  if (!apiKeyFile) throw new Error("Paid execution requires --api-key-file with one explicit path.");
  const plan = await assertPaidSmokeAuthorized();
  await preflightPaidSmokeTools();
  const resultFile = path.join(resultsRoot, "RESULT.json");
  const progressFile = path.join(resultsRoot, "IN_PROGRESS.json");
  await assertAbsent(resultFile);
  await assertAbsent(progressFile);
  await mkdir(resultsRoot, { recursive: true });
  const apiKey = await loadApiKey(path.resolve(apiKeyFile));
  try {
    const result = await runPaidSmoke({
      plan,
      apiKey,
      onProgress: async progress => {
        const record = progress.failure ?? {
          schemaVersion: 1,
          planSha256: progress.plan.planSha256,
          productCandidateCommit: progress.plan.productCandidateCommit,
          completedTaskRuns: progress.results.length,
          ledger: progress.ledger,
          activeTask: progress.activeTask ?? null,
          results: progress.results
        };
        await writeFile(progressFile, `${JSON.stringify(record, null, 2)}\n`);
      }
    });
    await writeFile(resultFile, `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({
      resultFile,
      taskRuns: result.taskRuns,
      passedTaskRuns: result.passedTaskRuns,
      modelCalls: result.ledger.modelCalls,
      costUsd: result.ledger.costUsd
    }, null, 2)}\n`);
  } catch (error) {
    if (error?.paidSmokeFailure) {
      await writeFile(progressFile, `${JSON.stringify(error.paidSmokeFailure, null, 2)}\n`);
    }
    throw error;
  }
}
