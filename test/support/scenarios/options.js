function positiveInteger(value, label, fallback) {
  if (value === undefined) return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new RangeError(`${label} must be a positive integer.`);
  }
  return number;
}

export function parseScenarioArguments(argv, { defaultConcurrency }) {
  const valueNames = new Set(["mode", "limit", "timeout", "concurrency", "recipe"]);
  const flagNames = new Set(["--no-tidytuesday", "--no-replay"]);
  const values = new Map();
  const flags = new Set();
  for (const argument of argv) {
    if (flagNames.has(argument)) {
      if (flags.has(argument)) throw new Error(`Scenario option "${argument}" is repeated.`);
      flags.add(argument);
      continue;
    }
    const match = argument.match(/^--([^=]+)=(.*)$/u);
    if (match === null || !valueNames.has(match[1])) {
      throw new Error(`Unknown scenario option "${argument}".`);
    }
    if (values.has(match[1])) {
      throw new Error(`Scenario option "--${match[1]}" is repeated.`);
    }
    values.set(match[1], match[2]);
  }

  const mode = values.get("mode") ?? "deep";
  if (!["smoke", "deep"].includes(mode)) {
    throw new Error('Scenario mode must be "smoke" or "deep".');
  }
  const recipeIds = values.has("recipe")
    ? values.get("recipe").split(",")
    : undefined;
  if (recipeIds !== undefined && recipeIds.some(id => id.length === 0)) {
    throw new Error("Scenario recipe selection must not be empty.");
  }
  if (recipeIds !== undefined && new Set(recipeIds).size !== recipeIds.length) {
    throw new Error("Scenario recipe selection must not repeat ids.");
  }

  return Object.freeze({
    mode,
    includeTidyTuesday: !flags.has("--no-tidytuesday"),
    deterministic: !flags.has("--no-replay"),
    limit: values.has("limit")
      ? positiveInteger(values.get("limit"), "limit")
      : undefined,
    timeout: positiveInteger(values.get("timeout"), "timeout", 8_000),
    concurrency: positiveInteger(
      values.get("concurrency"),
      "concurrency",
      defaultConcurrency
    ),
    recipeIds
  });
}
