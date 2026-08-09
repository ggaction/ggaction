import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  assertPaidComparisonAuthorizedV9,
  loadApiKey,
  paidComparisonRootV9,
  preflightPaidComparisonToolsV9,
  runPaidComparisonDryRunV9,
  runPaidComparisonV9
} from "./compact-paid-comparison-v9.js";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function assertAbsent(file) {
  try {
    await access(file);
    throw new Error(`Paid comparison result already exists: ${file}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

const resultsRoot = path.join(paidComparisonRootV9, "results");
if (process.argv.includes("--dry-run")) {
  process.stdout.write(`${JSON.stringify(await runPaidComparisonDryRunV9(), null, 2)}\n`);
} else {
  const apiKeyFile = argument("--api-key-file");
  if (!apiKeyFile) throw new Error("Paid execution requires --api-key-file with one explicit path.");
  const plan = await assertPaidComparisonAuthorizedV9();
  await preflightPaidComparisonToolsV9();
  const resultFile = path.join(resultsRoot, "RESULT.json");
  const progressFile = path.join(resultsRoot, "IN_PROGRESS.json");
  await assertAbsent(resultFile);
  await assertAbsent(progressFile);
  await mkdir(resultsRoot, { recursive: true });
  const apiKey = await loadApiKey(path.resolve(apiKeyFile));
  try {
    const result = await runPaidComparisonV9({
      plan,
      apiKey,
      onProgress: async progress => {
        const record = progress.failure ?? {
          schemaVersion: 1,
          planSha256: progress.plan.planSha256,
          routeOracleSha256: progress.plan.routeOracleSha256,
          productCandidateCommit: progress.plan.productCandidateCommit,
          evaluatorCheckpointCommit: progress.plan.evaluatorCheckpointCommit,
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
      apiRequestAttempts: result.ledger.apiRequestAttempts,
      providerRetries: result.ledger.providerRetries,
      standardCostUsd: result.ledger.standardCostUsd,
      costUsd: result.ledger.costUsd,
      uncertainCostReserveUsd: result.ledger.uncertainCostReserveUsd,
      exposureCostUsd: result.ledger.exposureCostUsd
    }, null, 2)}\n`);
  } catch (error) {
    if (error?.paidComparisonFailure) {
      await writeFile(progressFile, `${JSON.stringify(error.paidComparisonFailure, null, 2)}\n`);
    }
    throw error;
  }
}
