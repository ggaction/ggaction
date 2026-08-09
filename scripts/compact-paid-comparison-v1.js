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

function failureCounts(results) {
  const counts = new Map();
  for (const result of results) {
    for (const failure of result.failures ?? []) {
      counts.set(failure, (counts.get(failure) ?? 0) + 1);
    }
  }
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)));
}

function conditionSummary(results) {
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
  return {
    taskRuns: results.length,
    passed: passed.length,
    passRate: results.length === 0 ? null : passed.length / results.length,
    firstSubmissionPasses: passed.filter(result => result.submissionAttempts === 1).length,
    firstSubmissionPassRate: results.length === 0
      ? null
      : passed.filter(result => result.submissionAttempts === 1).length / results.length,
    modelCalls: results.reduce((sum, result) => sum + result.modelCalls, 0),
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
    standardCostUsd: results.reduce((sum, result) => sum + (result.standardCostUsd ?? result.costUsd), 0),
    costUsd: results.reduce((sum, result) => sum + result.costUsd, 0),
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

function pairSummary(left, right, byTask) {
  const pairs = [];
  for (const task of byTask.values()) {
    if (task.has(left) && task.has(right)) pairs.push([task.get(left), task.get(right)]);
  }
  const bothPassed = pairs.filter(([leftResult, rightResult]) => leftResult.passed && rightResult.passed);
  const costDeltas = pairs.map(([leftResult, rightResult]) => rightResult.costUsd - leftResult.costUsd);
  const outputDeltas = pairs.map(([leftResult, rightResult]) =>
    rightResult.usage.outputTokens - leftResult.usage.outputTokens
  );
  const elapsedDeltas = pairs
    .filter(([leftResult, rightResult]) =>
      Number.isFinite(leftResult.elapsedMilliseconds) && Number.isFinite(rightResult.elapsedMilliseconds)
    )
    .map(([leftResult, rightResult]) => rightResult.elapsedMilliseconds - leftResult.elapsedMilliseconds);
  const validTimeDeltas = bothPassed.map(([leftResult, rightResult]) =>
    rightResult.timeToValidMilliseconds - leftResult.timeToValidMilliseconds
  );
  const modelLatencyDeltas = pairs.map(([leftResult, rightResult]) =>
    traceTotal(rightResult, "modelLatencyMilliseconds") -
    traceTotal(leftResult, "modelLatencyMilliseconds")
  );
  const toolLatencyDeltas = pairs.map(([leftResult, rightResult]) =>
    traceTotal(rightResult, "toolLatencyMilliseconds") -
    traceTotal(leftResult, "toolLatencyMilliseconds")
  );
  return {
    left,
    right,
    pairedTasks: pairs.length,
    bothPassed: bothPassed.length,
    leftOnlyPassed: pairs.filter(([leftResult, rightResult]) => leftResult.passed && !rightResult.passed).length,
    rightOnlyPassed: pairs.filter(([leftResult, rightResult]) => !leftResult.passed && rightResult.passed).length,
    neitherPassed: pairs.filter(([leftResult, rightResult]) => !leftResult.passed && !rightResult.passed).length,
    rightMinusLeft: {
      costUsdMean: mean(costDeltas),
      outputTokensMean: mean(outputDeltas),
      elapsedMillisecondsMean: mean(elapsedDeltas),
      timeToValidMillisecondsMeanWhenBothPass: mean(validTimeDeltas),
      modelLatencyMillisecondsMean: mean(modelLatencyDeltas),
      knowledgeToolLatencyMillisecondsMean: mean(toolLatencyDeltas)
    }
  };
}

export function summarizePaidSmokeComparisonV1(results, conditionIds = ["A", "B", "C", "D"]) {
  const conditions = {};
  const byTask = new Map();
  for (const condition of conditionIds) {
    conditions[condition] = conditionSummary(results.filter(result => result.condition === condition));
  }
  for (const result of results) {
    if (!byTask.has(result.task)) byTask.set(result.task, new Map());
    byTask.get(result.task).set(result.condition, result);
  }
  const pairs = {};
  for (let leftIndex = 0; leftIndex < conditionIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < conditionIds.length; rightIndex += 1) {
      const left = conditionIds[leftIndex];
      const right = conditionIds[rightIndex];
      pairs[`${left}:${right}`] = pairSummary(left, right, byTask);
    }
  }
  return {
    schemaVersion: 1,
    taskRuns: results.length,
    uniqueTasks: byTask.size,
    conditions,
    pairs,
    directVsMcp: pairs["B:C"] ?? null,
    runOrder: results.map(result => ({
      position: result.runPosition,
      task: result.task,
      condition: result.condition
    }))
  };
}
