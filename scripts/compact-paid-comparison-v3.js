import { summarizePaidComparisonV2 } from "./compact-paid-comparison-v2.js";

function mean(values) {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function firstSubmissionPassed(result) {
  return result.passed && result.submissionAttempts === 1;
}

function pairedKey(result) {
  return `${result.task}:r${result.repetition}`;
}

function routeInteraction(results, baseline, route, leftModel, rightModel) {
  const byKey = new Map();
  for (const result of results) {
    const key = pairedKey(result);
    if (!byKey.has(key)) byKey.set(key, new Map());
    byKey.get(key).set(`${result.model}:${result.condition}`, result);
  }
  const complete = [...byKey.values()].filter(entries =>
    entries.has(`${leftModel}:${baseline}`) &&
    entries.has(`${leftModel}:${route}`) &&
    entries.has(`${rightModel}:${baseline}`) &&
    entries.has(`${rightModel}:${route}`)
  );
  const values = complete.map(entries => {
    const leftBaseline = entries.get(`${leftModel}:${baseline}`);
    const leftRoute = entries.get(`${leftModel}:${route}`);
    const rightBaseline = entries.get(`${rightModel}:${baseline}`);
    const rightRoute = entries.get(`${rightModel}:${route}`);
    return {
      pass: (
        Number(rightRoute.passed) - Number(rightBaseline.passed)
      ) - (
        Number(leftRoute.passed) - Number(leftBaseline.passed)
      ),
      firstSubmission: (
        Number(firstSubmissionPassed(rightRoute)) - Number(firstSubmissionPassed(rightBaseline))
      ) - (
        Number(firstSubmissionPassed(leftRoute)) - Number(firstSubmissionPassed(leftBaseline))
      ),
      outputTokens: (
        rightRoute.usage.outputTokens - rightBaseline.usage.outputTokens
      ) - (
        leftRoute.usage.outputTokens - leftBaseline.usage.outputTokens
      ),
      elapsed: (
        rightRoute.elapsedMilliseconds - rightBaseline.elapsedMilliseconds
      ) - (
        leftRoute.elapsedMilliseconds - leftBaseline.elapsedMilliseconds
      ),
      cost: (
        rightRoute.costUsd - rightBaseline.costUsd
      ) - (
        leftRoute.costUsd - leftBaseline.costUsd
      )
    };
  });
  return {
    baseline,
    route,
    leftModel,
    rightModel,
    completeTaskRepetitions: complete.length,
    rightMinusLeftRouteImprovement: {
      passRate: mean(values.map(value => value.pass)),
      firstSubmissionPassRate: mean(values.map(value => value.firstSubmission)),
      outputTokensMean: mean(values.map(value => value.outputTokens)),
      elapsedMillisecondsMean: mean(values.map(value => value.elapsed)),
      costUsdMean: mean(values.map(value => value.cost))
    }
  };
}

export function summarizePaidComparisonV3(
  results,
  modelIds = ["gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.4-nano"],
  conditionIds = ["A", "B", "C", "D"]
) {
  const base = summarizePaidComparisonV2(results, modelIds, conditionIds);
  const interactions = {};
  for (let leftIndex = 0; leftIndex < modelIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < modelIds.length; rightIndex += 1) {
      const leftModel = modelIds[leftIndex];
      const rightModel = modelIds[rightIndex];
      for (const route of conditionIds.filter(condition => condition !== "A")) {
        interactions[`${leftModel}:${rightModel}:A:${route}`] = routeInteraction(
          results,
          "A",
          route,
          leftModel,
          rightModel
        );
      }
    }
  }
  return {
    ...base,
    schemaVersion: 3,
    interactions
  };
}
