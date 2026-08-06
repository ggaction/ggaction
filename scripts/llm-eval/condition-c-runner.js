import { appendEvaluationResult, runEvaluationTask } from "./condition-runner.js";
import { conditionCKnowledge } from "./knowledge-adapters.js";

export { appendEvaluationResult };

export function runConditionCTask({ knowledgeCommit, mcpClientOptions, ...options }) {
  return runEvaluationTask({
    ...options,
    knowledge: conditionCKnowledge(knowledgeCommit, mcpClientOptions)
  });
}
