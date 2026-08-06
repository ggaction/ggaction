import { appendEvaluationResult, runEvaluationTask } from "./condition-runner.js";
import { conditionAKnowledge } from "./knowledge-adapters.js";

export { appendEvaluationResult };

export function runConditionATask(options) {
  return runEvaluationTask({ ...options, knowledge: conditionAKnowledge });
}
