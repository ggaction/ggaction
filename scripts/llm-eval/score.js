function missing(expected, actual) {
  const values = new Set(actual);
  return expected.filter(value => !values.has(value));
}

export function scoreEvaluationEvidence(task, evidence) {
  const failures = [];
  const actions = evidence.actions ?? [];
  const runtimeFunctions = evidence.runtimeFunctions ?? [];
  const rendered = evidence.renderers ?? [];
  const validations = new Map((evidence.validations ?? []).map(validation => [validation.id, validation.passed]));

  if (evidence.runtimeError) failures.push(`runtime-error:${evidence.runtimeError}`);
  failures.push(...missing(task.oracle.requiredActions, actions).map(name => `missing-action:${name}`));
  failures.push(...task.oracle.forbiddenActions.filter(name => actions.includes(name)).map(name => `forbidden-action:${name}`));
  failures.push(...missing(task.oracle.requiredRuntimeFunctions, runtimeFunctions).map(name => `missing-runtime:${name}`));
  failures.push(...missing(task.oracle.renderers, rendered).map(name => `missing-renderer:${name}`));
  failures.push(...task.oracle.requiredValidations
    .filter(id => validations.get(id) !== true)
    .map(id => `failed-validation:${id}`));

  if (
    task.oracle.anyOfActionSets.length > 0 &&
    !task.oracle.anyOfActionSets.some(set => set.every(name => actions.includes(name)))
  ) failures.push("missing-action-alternative");

  return Object.freeze({ valid: failures.length === 0, failures: Object.freeze(failures) });
}

export function summarizeEvaluationResults(scoredResults) {
  const successful = scoredResults.filter(result => result.score.valid);
  const totalTokens = successful.reduce((sum, result) => sum + result.result.metrics.totalTokens, 0);
  const totalCalls = successful.reduce((sum, result) => sum + result.result.metrics.modelCalls, 0);
  return Object.freeze({
    total: scoredResults.length,
    successful: successful.length,
    failed: scoredResults.length - successful.length,
    tokensPerSuccessfulChart: successful.length === 0 ? null : totalTokens / successful.length,
    modelCallsPerSuccessfulChart: successful.length === 0 ? null : totalCalls / successful.length
  });
}
