function emptyUsage() {
  return {
    inputTokens: 0,
    cachedInputTokens: 0,
    cacheWriteTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0
  };
}

function addUsage(target, usage = {}) {
  for (const key of Object.keys(target)) target[key] += usage[key] ?? 0;
}

function mean(values) {
  return values.length === 0
    ? null
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function median(values) {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 1
    ? ordered[middle]
    : (ordered[middle - 1] + ordered[middle]) / 2;
}

function timingSummary(values) {
  return {
    count: values.length,
    mean: mean(values),
    median: median(values),
    total: values.reduce((sum, value) => sum + value, 0)
  };
}

function traceTotal(result, property) {
  return result.trace.reduce((sum, entry) => sum + (entry[property] ?? 0), 0);
}

function firstSubmissionPassed(result) {
  return result.passed && result.submissionAttempts === 1;
}

function failureCounts(results) {
  const counts = new Map();
  for (const result of results) {
    for (const failure of result.failures ?? []) {
      counts.set(failure, (counts.get(failure) ?? 0) + 1);
    }
  }
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)));
}

function groupSummary(results) {
  const usage = emptyUsage();
  for (const result of results) addUsage(usage, result.usage);
  const passed = results.filter(result => result.passed);
  const elapsed = results.map(result => result.elapsedMilliseconds).filter(Number.isFinite);
  const timeToValid = passed.map(result => result.timeToValidMilliseconds).filter(Number.isFinite);
  const modelLatencies = results.flatMap(result => result.trace
    .map(entry => entry.modelLatencyMilliseconds)
    .filter(Number.isFinite));
  const toolLatencies = results.flatMap(result => result.trace
    .map(entry => entry.toolLatencyMilliseconds)
    .filter(Number.isFinite));
  const evaluationLatencies = results.flatMap(result => result.trace
    .map(entry => entry.evaluationLatencyMilliseconds)
    .filter(Number.isFinite));
  const firstPasses = results.filter(firstSubmissionPassed);
  const costUsd = results.reduce((sum, result) => sum + (result.costUsd ?? 0), 0);
  const uncertainCostReserveUsd = results.reduce(
    (sum, result) => sum + (result.uncertainCostReserveUsd ?? 0),
    0
  );
  return {
    taskRuns: results.length,
    passed: passed.length,
    passRate: results.length === 0 ? null : passed.length / results.length,
    firstSubmissionPasses: firstPasses.length,
    firstSubmissionPassRate: results.length === 0 ? null : firstPasses.length / results.length,
    modelCalls: results.reduce((sum, result) => sum + result.modelCalls, 0),
    requestAttempts: results.reduce((sum, result) => sum + (result.requestAttempts ?? result.modelCalls), 0),
    providerRetries: results.reduce((sum, result) => sum + (result.providerRetries ?? 0), 0),
    submissionAttempts: results.reduce((sum, result) => sum + result.submissionAttempts, 0),
    knowledge: {
      toolCalls: results.reduce((sum, result) => sum + (result.knowledge?.toolCalls ?? 0), 0),
      searches: results.reduce((sum, result) => sum + (result.knowledge?.searches ?? 0), 0),
      docsReadCalls: results.reduce((sum, result) => sum + (result.knowledge?.docsReadCalls ?? 0), 0),
      docsReads: results.reduce((sum, result) => sum + (result.knowledge?.docsReads ?? 0), 0),
      toolResultBytes: results.reduce((sum, result) => sum + result.trace.reduce(
        (traceSum, entry) => traceSum + (entry.toolResultBytes ?? 0),
        0
      ), 0)
    },
    usage,
    standardCostUsd: results.reduce((sum, result) => sum + (result.standardCostUsd ?? 0), 0),
    costUsd,
    uncertainCostReserveUsd,
    exposureCostUsd: costUsd + uncertainCostReserveUsd,
    elapsedMilliseconds: timingSummary(elapsed),
    timeToValidMilliseconds: {
      count: timeToValid.length,
      mean: mean(timeToValid),
      median: median(timeToValid)
    },
    latencyMilliseconds: {
      model: timingSummary(modelLatencies),
      knowledgeTool: timingSummary(toolLatencies),
      evaluator: timingSummary(evaluationLatencies)
    },
    failures: failureCounts(results)
  };
}

function pairedKey(result) {
  return `${result.task}:r${result.repetition}`;
}

function pairedResults(leftResults, rightResults) {
  const rightByKey = new Map(rightResults.map(result => [pairedKey(result), result]));
  return leftResults.flatMap(left => {
    const right = rightByKey.get(pairedKey(left));
    return right ? [[left, right]] : [];
  });
}

function pairSummary(leftId, rightId, pairs) {
  const bothPassed = pairs.filter(([left, right]) => left.passed && right.passed);
  const delta = (property, fallback = 0) => pairs.map(([left, right]) =>
    (right[property] ?? fallback) - (left[property] ?? fallback)
  );
  const validTimeDeltas = bothPassed.map(([left, right]) =>
    right.timeToValidMilliseconds - left.timeToValidMilliseconds
  );
  return {
    left: leftId,
    right: rightId,
    pairedTaskRepetitions: pairs.length,
    bothPassed: bothPassed.length,
    leftOnlyPassed: pairs.filter(([left, right]) => left.passed && !right.passed).length,
    rightOnlyPassed: pairs.filter(([left, right]) => !left.passed && right.passed).length,
    neitherPassed: pairs.filter(([left, right]) => !left.passed && !right.passed).length,
    rightMinusLeft: {
      passRate: mean(pairs.map(([left, right]) => Number(right.passed) - Number(left.passed))),
      firstSubmissionPassRate: mean(pairs.map(([left, right]) =>
        Number(firstSubmissionPassed(right)) - Number(firstSubmissionPassed(left))
      )),
      costUsdMean: mean(delta("costUsd")),
      exposureCostUsdMean: mean(delta("exposureCostUsd")),
      outputTokensMean: mean(pairs.map(([left, right]) =>
        right.usage.outputTokens - left.usage.outputTokens
      )),
      elapsedMillisecondsMean: mean(delta("elapsedMilliseconds")),
      timeToValidMillisecondsMeanWhenBothPass: mean(validTimeDeltas),
      modelLatencyMillisecondsMean: mean(pairs.map(([left, right]) =>
        traceTotal(right, "modelLatencyMilliseconds") - traceTotal(left, "modelLatencyMilliseconds")
      )),
      knowledgeToolLatencyMillisecondsMean: mean(pairs.map(([left, right]) =>
        traceTotal(right, "toolLatencyMilliseconds") - traceTotal(left, "toolLatencyMilliseconds")
      ))
    }
  };
}

function allConditionPairs(modelResults, conditionIds) {
  const pairs = {};
  for (let leftIndex = 0; leftIndex < conditionIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < conditionIds.length; rightIndex += 1) {
      const left = conditionIds[leftIndex];
      const right = conditionIds[rightIndex];
      pairs[`${left}:${right}`] = pairSummary(
        left,
        right,
        pairedResults(
          modelResults.filter(result => result.condition === left),
          modelResults.filter(result => result.condition === right)
        )
      );
    }
  }
  return pairs;
}

function modelPairsForCondition(results, condition, modelIds) {
  const pairs = {};
  for (let leftIndex = 0; leftIndex < modelIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < modelIds.length; rightIndex += 1) {
      const left = modelIds[leftIndex];
      const right = modelIds[rightIndex];
      pairs[`${left}:${right}`] = pairSummary(
        left,
        right,
        pairedResults(
          results.filter(result => result.condition === condition && result.model === left),
          results.filter(result => result.condition === condition && result.model === right)
        )
      );
    }
  }
  return pairs;
}

function interactionSummary(results, baseline, route, terra, luna) {
  const byKey = new Map();
  for (const result of results) {
    const key = pairedKey(result);
    if (!byKey.has(key)) byKey.set(key, new Map());
    byKey.get(key).set(`${result.model}:${result.condition}`, result);
  }
  const complete = [...byKey.values()].filter(entries =>
    entries.has(`${terra}:${baseline}`) &&
    entries.has(`${terra}:${route}`) &&
    entries.has(`${luna}:${baseline}`) &&
    entries.has(`${luna}:${route}`)
  );
  const values = complete.map(entries => {
    const terraBaseline = entries.get(`${terra}:${baseline}`);
    const terraRoute = entries.get(`${terra}:${route}`);
    const lunaBaseline = entries.get(`${luna}:${baseline}`);
    const lunaRoute = entries.get(`${luna}:${route}`);
    return {
      pass: (
        Number(lunaRoute.passed) - Number(lunaBaseline.passed)
      ) - (
        Number(terraRoute.passed) - Number(terraBaseline.passed)
      ),
      firstSubmission: (
        Number(firstSubmissionPassed(lunaRoute)) - Number(firstSubmissionPassed(lunaBaseline))
      ) - (
        Number(firstSubmissionPassed(terraRoute)) - Number(firstSubmissionPassed(terraBaseline))
      ),
      outputTokens: (
        lunaRoute.usage.outputTokens - lunaBaseline.usage.outputTokens
      ) - (
        terraRoute.usage.outputTokens - terraBaseline.usage.outputTokens
      ),
      elapsed: (
        lunaRoute.elapsedMilliseconds - lunaBaseline.elapsedMilliseconds
      ) - (
        terraRoute.elapsedMilliseconds - terraBaseline.elapsedMilliseconds
      )
    };
  });
  return {
    baseline,
    route,
    completeTaskRepetitions: complete.length,
    lunaMinusTerraRouteImprovement: {
      passRate: mean(values.map(value => value.pass)),
      firstSubmissionPassRate: mean(values.map(value => value.firstSubmission)),
      outputTokensMean: mean(values.map(value => value.outputTokens)),
      elapsedMillisecondsMean: mean(values.map(value => value.elapsed))
    }
  };
}

function repetitionStability(results, modelIds, conditionIds) {
  const summary = {};
  for (const model of modelIds) {
    for (const condition of conditionIds) {
      const grouped = new Map();
      for (const result of results.filter(entry => entry.model === model && entry.condition === condition)) {
        if (!grouped.has(result.task)) grouped.set(result.task, []);
        grouped.get(result.task).push(result);
      }
      const complete = [...grouped.values()].filter(entries => entries.length === 2);
      const agreements = complete.filter(([left, right]) => left.passed === right.passed).length;
      summary[`${model}:${condition}`] = {
        pairedTasks: complete.length,
        bothPassed: complete.filter(entries => entries.every(entry => entry.passed)).length,
        onePassed: complete.filter(entries => entries.filter(entry => entry.passed).length === 1).length,
        neitherPassed: complete.filter(entries => entries.every(entry => !entry.passed)).length,
        passAgreementRate: complete.length === 0 ? null : agreements / complete.length
      };
    }
  }
  return summary;
}

export function summarizePaidComparisonV2(
  results,
  modelIds = ["gpt-5.6-terra", "gpt-5.6-luna"],
  conditionIds = ["A", "B", "C", "D"]
) {
  const cells = {};
  const models = {};
  const conditions = {};
  const withinModelConditionPairs = {};
  const withinConditionModelPairs = {};
  for (const model of modelIds) {
    const modelResults = results.filter(result => result.model === model);
    models[model] = groupSummary(modelResults);
    withinModelConditionPairs[model] = allConditionPairs(modelResults, conditionIds);
    for (const condition of conditionIds) {
      cells[`${model}:${condition}`] = groupSummary(
        modelResults.filter(result => result.condition === condition)
      );
    }
  }
  for (const condition of conditionIds) {
    conditions[condition] = groupSummary(results.filter(result => result.condition === condition));
    withinConditionModelPairs[condition] = modelPairsForCondition(results, condition, modelIds);
  }
  const interactions = {};
  if (modelIds.length === 2) {
    for (const route of conditionIds.filter(condition => condition !== "A")) {
      interactions[`A:${route}`] = interactionSummary(
        results,
        "A",
        route,
        modelIds[0],
        modelIds[1]
      );
    }
  }
  return {
    schemaVersion: 2,
    taskRuns: results.length,
    uniqueTasks: new Set(results.map(result => result.task)).size,
    repetitions: [...new Set(results.map(result => result.repetition))].sort(),
    models,
    conditions,
    cells,
    withinModelConditionPairs,
    withinConditionModelPairs,
    directVsMcp: Object.fromEntries(modelIds.map(model => [
      model,
      withinModelConditionPairs[model]["B:C"]
    ])),
    interactions,
    repetitionStability: repetitionStability(results, modelIds, conditionIds),
    runOrder: results.map(result => ({
      position: result.runPosition,
      task: result.task,
      repetition: result.repetition,
      model: result.model,
      condition: result.condition
    }))
  };
}
