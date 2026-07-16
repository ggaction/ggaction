const STAGES = Object.freeze([
  "scales",
  "marks",
  "guides",
  "layout",
  "highlights"
]);

function stepKey(step) {
  return JSON.stringify([step.op, step.args ?? null]);
}

export function buildMaterializationPlan(stages = {}) {
  const plan = [];
  const seen = new Set();

  for (const stage of STAGES) {
    for (const step of stages[stage] ?? []) {
      if (step === undefined) continue;
      const key = stepKey(step);
      if (seen.has(key)) continue;
      seen.add(key);
      plan.push(step);
    }
  }

  return plan;
}

export function applyMaterializationPlan(program, plan) {
  let next = program;
  for (const step of buildMaterializationPlan({ marks: plan })) {
    next = step.args === undefined
      ? next[step.op]()
      : next[step.op](step.args);
  }
  return next;
}
