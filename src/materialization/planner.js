const STAGES = Object.freeze([
  "scales",
  "marks",
  "guides",
  "layout",
  "highlights"
]);

const STAGE_SET = new Set(STAGES);

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function clonePlanValue(value, path) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) {
    return Object.freeze(value.map((item, index) =>
      clonePlanValue(item, `${path}[${index}]`)
    ));
  }
  if (isPlainObject(value)) {
    const clone = {};
    for (const key of Object.keys(value)) {
      if (value[key] === undefined) continue;
      clone[key] = clonePlanValue(value[key], `${path}.${key}`);
    }
    return Object.freeze(clone);
  }
  throw new TypeError(
    `${path} must contain only finite JSON-compatible values.`
  );
}

function canonicalValue(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalValue).join(",")}]`;
  }
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${canonicalValue(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeStep(step, index) {
  if (!isPlainObject(step)) {
    throw new TypeError(`Materialization step ${index} must be a plain object.`);
  }
  if (typeof step.op !== "string" || step.op.length === 0) {
    throw new TypeError(
      `Materialization step ${index} op must be a non-empty string.`
    );
  }
  if (step.args !== undefined && !isPlainObject(step.args)) {
    throw new TypeError(
      `Materialization step ${index} args must be a plain object.`
    );
  }
  return Object.freeze({
    op: step.op,
    ...(step.args === undefined
      ? {}
      : { args: clonePlanValue(step.args, `Materialization step ${index} args`) })
  });
}

function normalizeSteps(steps) {
  if (!Array.isArray(steps)) {
    throw new TypeError("Materialization plan stages must be arrays.");
  }
  return steps
    .filter(step => step !== undefined)
    .map((step, index) => normalizeStep(step, index));
}

function stepKey(step) {
  return `${JSON.stringify(step.op)}:${canonicalValue(step.args ?? null)}`;
}

function deduplicateSteps(steps) {
  const plan = [];
  const seen = new Set();
  for (const step of steps) {
    const key = stepKey(step);
    if (seen.has(key)) continue;
    seen.add(key);
    plan.push(step);
  }
  return Object.freeze(plan);
}

export function buildMaterializationPlan(stages = {}) {
  if (!isPlainObject(stages)) {
    throw new TypeError("Materialization plan stages must be a plain object.");
  }
  for (const stage of Object.keys(stages)) {
    if (!STAGE_SET.has(stage)) {
      throw new Error(`Unknown materialization stage "${stage}".`);
    }
  }
  return deduplicateSteps(STAGES.flatMap(stage =>
    normalizeSteps(stages[stage] ?? [])
  ));
}

export function applyMaterializationPlan(program, plan) {
  const steps = deduplicateSteps(normalizeSteps(plan));
  let next = program;
  for (const step of steps) {
    if (typeof next?.[step.op] !== "function") {
      throw new Error(
        `Materialization operation "${step.op}" is not available on the program.`
      );
    }
    next = step.args === undefined
      ? next[step.op]()
      : next[step.op](step.args);
  }
  return next;
}
