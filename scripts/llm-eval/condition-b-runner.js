import { appendEvaluationResult, runEvaluationTask } from "./condition-runner.js";
import { conditionBKnowledge } from "./knowledge-adapters.js";

export { appendEvaluationResult };

export function runConditionBTask({ knowledgeCommit, ...options }) {
  return runEvaluationTask({ ...options, knowledge: conditionBKnowledge(knowledgeCommit) });
}
