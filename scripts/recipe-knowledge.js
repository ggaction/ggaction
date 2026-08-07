import { createHash } from "node:crypto";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { PUBLIC_CHARTS } from "../examples/registry.js";
import { loadDataset } from "../test/support/data.js";
import { root } from "./action-knowledge.js";

export const recipeSourceRoot = path.join(root, "knowledge/recipes");
export const recipeCoverageFile = path.join(root, "knowledge/recipe-coverage.json");

const recipeKeys = [
  "schemaVersion", "id", "title", "intent", "useWhen", "avoidWhen", "prerequisites", "inputs",
  "outcomes", "steps", "alternatives", "pitfalls", "example", "relatedRecipes", "docs"
];
const coverageClassifications = new Set([
  "primary", "supporting", "lifecycle", "extension-only", "metadata-only", "not-applicable"
]);
const stepRoles = new Set(["primary", "supporting", "lifecycle"]);
const forbiddenRuntimeIdentifiers = Object.freeze([
  "Chart", "createSelection", "renderCanvas", "renderPDF", "renderToCanvas"
]);
let focusedRecipesPromise;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sameKeys(value, expected) {
  return JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function normalizedProse(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sentenceList(recipe, field, values, { required = false } = {}) {
  assert(Array.isArray(values), `${recipe.id}: ${field} must be an array`);
  if (required) assert(values.length > 0, `${recipe.id}: ${field} must not be empty`);
  assert(new Set(values).size === values.length, `${recipe.id}: ${field} entries must be unique`);
  for (const value of values) {
    assert(typeof value === "string" && value.length >= 20, `${recipe.id}: ${field} entries must be informative sentences`);
  }
}

function headingIds(markdown) {
  return new Set([...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => {
    const explicit = match[1].match(/\{#([A-Za-z][A-Za-z0-9_-]*)\}\s*$/)?.[1];
    if (explicit !== undefined) return explicit;
    return match[1].replace(/`/g, "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
  }));
}

function javascriptBlocks(markdown) {
  return [...markdown.matchAll(/```javascript\n([\s\S]*?)\n```/g)].map(match => match[1].trim());
}

export function executableExampleSourceViolations(source) {
  const violations = [];
  const rootImports = [...source.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']ggaction["']/gu)]
    .flatMap(match => match[1].split(","))
    .map(name => name.trim().split(/\s+as\s+/u)[0]);
  if (!rootImports.includes("chart")) violations.push("missing chart import from ggaction");
  if (!rootImports.includes("render")) violations.push("missing render import from ggaction");
  if (!/const\s+program\s*=/u.test(source)) violations.push("missing final program binding");
  if (!/\.getContext\(["']2d["']\)/u.test(source)) violations.push("missing Canvas 2D context lookup");
  if (!/if\s*\(\s*!context\s*\)\s*throw\s+new\s+Error/u.test(source)) {
    violations.push("missing Canvas context guard");
  }
  if (!/render\(\s*program\s*,\s*context(?:\s*,|\s*\))/u.test(source)) {
    violations.push("missing final Canvas render invocation");
  }
  for (const identifier of forbiddenRuntimeIdentifiers) {
    if (new RegExp(`\\b${identifier}\\b`, "u").test(source)) {
      violations.push(`forbidden runtime identifier ${identifier}`);
    }
  }
  return violations;
}

async function generatedExampleSource(recipe) {
  const primaryActions = recipe.steps.flatMap(step => step.actions)
    .filter(action => action.role === "primary")
    .map(action => action.name);
  for (const entry of recipe.docs) {
    const markdown = await readFile(path.join(root, entry.path), "utf8");
    const source = javascriptBlocks(markdown).find(block =>
      /from\s+["']ggaction(?:\/[A-Za-z0-9_-]+)?["']/u.test(block) &&
      primaryActions.some(name => block.includes(`.${name}(`))
    );
    if (source !== undefined) {
      assert(source.length <= 30_000, `${recipe.id}: generated example source is too large`);
      return { exampleSource: source, exampleSourcePath: entry.path };
    }
  }
  throw new Error(`${recipe.id}: public docs need a ggaction JavaScript example containing a primary action`);
}

async function validateDocs(recipe) {
  assert(Array.isArray(recipe.docs) && recipe.docs.length > 0, `${recipe.id}: docs must not be empty`);
  for (const entry of recipe.docs) {
    assert(sameKeys(entry, entry.anchor ? ["path", "anchor"] : ["path"]), `${recipe.id}: invalid docs entry`);
    const file = path.join(root, entry.path);
    await access(file);
    if (entry.anchor) {
      assert(headingIds(await readFile(file, "utf8")).has(entry.anchor), `${recipe.id}: missing docs anchor ${entry.path}#${entry.anchor}`);
    }
  }
}

function traceIncludes(node, actionName) {
  return node?.op === actionName || (node?.children ?? []).some(child => traceIncludes(child, actionName));
}

function programIncludes(program, actionName) {
  if (traceIncludes(program?.trace, actionName)) return true;
  return Object.values(program?.children ?? {}).some(child => programIncludes(child, actionName));
}

function resolveData(definition) {
  if (typeof definition === "string") return loadDataset(definition);
  if (definition && typeof definition === "object" && Object.keys(definition).length > 0) {
    return Object.fromEntries(Object.entries(definition).map(([key, dataset]) => [key, loadDataset(dataset)]));
  }
  return undefined;
}

async function executeExample(recipe) {
  const file = path.join(root, recipe.example.path);
  await access(file);
  const module = await import(pathToFileURL(file).href);
  let program;
  let kind;
  if (recipe.example.export === "recipeExamples") {
    focusedRecipesPromise ??= Promise.resolve(module.recipeExamples);
    const registry = await focusedRecipesPromise;
    assert(typeof registry?.[recipe.id] === "function", `${recipe.id}: focused recipe builder is missing`);
    program = registry[recipe.id]();
    kind = "focused";
  } else {
    assert(typeof module[recipe.example.export] === "function", `${recipe.id}: missing export ${recipe.example.export}`);
    const chart = PUBLIC_CHARTS.find(entry =>
      path.relative(root, entry.programFile.pathname) === recipe.example.path
    );
    assert(chart, `${recipe.id}: canonical example is not registered in PUBLIC_CHARTS`);
    program = chart.createProgram(resolveData(chart.data));
    kind = "canonical";
  }
  assert(program?.semanticSpec && program?.graphicSpec && program?.trace, `${recipe.id}: example must return a ChartProgram`);
  for (const step of recipe.steps) for (const action of step.actions) {
    if (action.role === "primary") {
      assert(programIncludes(program, action.name), `${recipe.id}: example trace does not include primary action ${action.name}`);
    }
  }
  return kind;
}

function validateRecipeShape(recipe, file, actionNames) {
  assert(sameKeys(recipe, recipeKeys), `${file}: recipe source fields do not match schema`);
  assert(recipe.schemaVersion === 1, `${file}: schemaVersion must be 1`);
  assert(recipe.id === file.replace(/\.json$/, ""), `${file}: id must match its filename`);
  assert(/^[a-z][a-z0-9-]*$/.test(recipe.id), `${file}: invalid recipe ID`);
  assert(typeof recipe.title === "string" && recipe.title.length >= 3, `${recipe.id}: title is too short`);
  assert(typeof recipe.intent === "string" && recipe.intent.length >= 20, `${recipe.id}: intent must be informative`);
  for (const field of ["useWhen", "avoidWhen"]) {
    sentenceList(recipe, field, recipe[field], { required: true });
    assert(!normalizedProse(recipe[field].join(" ")).includes(normalizedProse(recipe.intent)), `${recipe.id}: ${field} must add guidance beyond intent`);
  }
  sentenceList(recipe, "prerequisites", recipe.prerequisites);
  sentenceList(recipe, "outcomes", recipe.outcomes, { required: true });
  assert(Array.isArray(recipe.inputs), `${recipe.id}: inputs must be an array`);
  for (const input of recipe.inputs) {
    assert(sameKeys(input, ["name", "description", "required"]), `${recipe.id}: invalid input entry`);
    assert(/^[A-Za-z][A-Za-z0-9]*$/.test(input.name), `${recipe.id}: invalid input name ${input.name}`);
    assert(input.description.length >= 20 && typeof input.required === "boolean", `${recipe.id}: invalid input ${input.name}`);
  }
  assert(Array.isArray(recipe.steps) && recipe.steps.length > 0, `${recipe.id}: steps must not be empty`);
  const stepIds = new Set();
  const usedActions = new Set();
  for (const step of recipe.steps) {
    assert(sameKeys(step, ["id", "instruction", "actions"]), `${recipe.id}: invalid step`);
    assert(/^[a-z][a-z0-9-]*$/.test(step.id) && !stepIds.has(step.id), `${recipe.id}: invalid or duplicate step ID ${step.id}`);
    stepIds.add(step.id);
    assert(step.instruction.length >= 20, `${recipe.id}: step instruction is too short`);
    assert(Array.isArray(step.actions) && step.actions.length > 0, `${recipe.id}: step actions must not be empty`);
    for (const action of step.actions) {
      assert(sameKeys(action, ["name", "role"]), `${recipe.id}: invalid action use`);
      assert(actionNames.has(action.name), `${recipe.id}: unknown action ${action.name}`);
      assert(stepRoles.has(action.role), `${recipe.id}: invalid role for ${action.name}`);
      assert(!usedActions.has(action.name), `${recipe.id}: duplicate action ${action.name}`);
      usedActions.add(action.name);
    }
  }
  assert(Array.isArray(recipe.alternatives), `${recipe.id}: alternatives must be an array`);
  for (const alternative of recipe.alternatives) {
    assert(sameKeys(alternative, ["when", "instruction", "actions"]), `${recipe.id}: invalid alternative`);
    assert(alternative.when.length >= 20 && alternative.instruction.length >= 20, `${recipe.id}: alternative must be informative`);
    assert(alternative.actions.every(name => actionNames.has(name)), `${recipe.id}: alternative references an unknown action`);
  }
  assert(Array.isArray(recipe.pitfalls) && recipe.pitfalls.length > 0, `${recipe.id}: pitfalls must not be empty`);
  for (const pitfall of recipe.pitfalls) {
    assert(sameKeys(pitfall, ["problem", "fix"]), `${recipe.id}: invalid pitfall`);
    assert(pitfall.problem.length >= 20 && pitfall.fix.length >= 20, `${recipe.id}: pitfall must explain problem and fix`);
  }
  assert(sameKeys(recipe.example, ["path", "export"]), `${recipe.id}: invalid example`);
  assert(Array.isArray(recipe.relatedRecipes) && new Set(recipe.relatedRecipes).size === recipe.relatedRecipes.length, `${recipe.id}: relatedRecipes must be unique`);
  return usedActions;
}

function validateCoverage(coverage, actions, recipes, actionUses) {
  assert(sameKeys(coverage, ["schemaVersion", "actions"]) && coverage.schemaVersion === 1, "Recipe coverage source fields do not match schema");
  assert(Array.isArray(coverage.actions), "Recipe coverage actions must be an array");
  const recipeIds = new Set(recipes.map(recipe => recipe.id));
  const actionByName = new Map(actions.map(action => [action.name, action]));
  const expectedBacklinks = new Map(actions.map(action => [action.name, []]));
  for (const recipe of recipes) for (const name of actionUses.get(recipe.id)) expectedBacklinks.get(name).push(recipe.id);
  for (const ids of expectedBacklinks.values()) ids.sort();
  const rows = new Map();
  for (const row of coverage.actions) {
    assert(sameKeys(row, ["name", "classification", "recipeIds", "reason"]), `${row.name}: invalid coverage row`);
    assert(actionByName.has(row.name) && !rows.has(row.name), `${row.name}: unknown or duplicate coverage action`);
    assert(coverageClassifications.has(row.classification), `${row.name}: invalid coverage classification`);
    assert(row.recipeIds.every(id => recipeIds.has(id)), `${row.name}: unknown recipe backlink`);
    assert(JSON.stringify(row.recipeIds) === JSON.stringify(expectedBacklinks.get(row.name)), `${row.name}: coverage backlinks do not match recipe steps`);
    assert(JSON.stringify(actionByName.get(row.name).recipeIds) === JSON.stringify(row.recipeIds), `${row.name}: action source backlinks do not match coverage`);
    if (["extension-only", "metadata-only", "not-applicable"].includes(row.classification)) {
      assert(typeof row.reason === "string" && row.reason.length >= 20, `${row.name}: exceptional coverage needs a reason`);
    } else {
      assert(row.reason === null && row.recipeIds.length > 0, `${row.name}: ordinary coverage needs recipe evidence and no exception reason`);
      const role = row.classification;
      assert(recipes.some(recipe => recipe.steps.some(step => step.actions.some(action =>
        action.name === row.name && action.role === role
      ))), `${row.name}: ${role} classification lacks matching recipe evidence`);
    }
    rows.set(row.name, row);
  }
  assert(rows.size === actions.length, "Recipe coverage must classify every action exactly once");
  return [...rows.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export async function buildRecipeKnowledge(actions) {
  const files = (await readdir(recipeSourceRoot)).filter(file => file.endsWith(".json")).sort();
  const [coverageSource, ...sources] = await Promise.all([
    readFile(recipeCoverageFile, "utf8"),
    ...files.map(file => readFile(path.join(recipeSourceRoot, file), "utf8"))
  ]);
  const actionNames = new Set(actions.map(action => action.name));
  const recipes = [];
  const actionUses = new Map();
  const ids = new Set();
  const exampleCoverage = { canonical: 0, focused: 0 };
  for (const [index, source] of sources.entries()) {
    const file = files[index];
    const recipe = JSON.parse(source);
    assert(!ids.has(recipe.id), `${recipe.id}: duplicate recipe source`);
    ids.add(recipe.id);
    actionUses.set(recipe.id, validateRecipeShape(recipe, file, actionNames));
    recipes.push(recipe);
  }
  for (const recipe of recipes) {
    assert(recipe.relatedRecipes.every(id => ids.has(id) && id !== recipe.id), `${recipe.id}: invalid related recipe`);
    await validateDocs(recipe);
    exampleCoverage[await executeExample(recipe)] += 1;
  }
  const generatedRecipes = await Promise.all(recipes.map(async recipe => ({
    ...recipe,
    ...await generatedExampleSource(recipe)
  })));
  generatedRecipes.sort((left, right) => left.id.localeCompare(right.id));
  const executableExampleAudit = generatedRecipes.map(recipe => ({
    id: recipe.id,
    violations: executableExampleSourceViolations(recipe.exampleSource)
  }));
  const incompleteExamples = executableExampleAudit.filter(entry => entry.violations.length > 0);
  assert(
    incompleteExamples.length === 0,
    `Incomplete executable recipe examples: ${incompleteExamples.map(entry =>
      `${entry.id} (${entry.violations.join(", ")})`
    ).join("; ")}`
  );
  const coverage = validateCoverage(JSON.parse(coverageSource), actions, recipes, actionUses);
  const classifications = Object.fromEntries([...coverageClassifications].map(classification => [
    classification,
    coverage.filter(row => row.classification === classification).length
  ]).filter(([, count]) => count > 0));
  return {
    document: { recipes: generatedRecipes, coverage },
    generated: {
      recipeCount: recipes.length,
      recipeSourceSha256: sha256(sources.join("\n")),
      recipeCoverageSha256: sha256(coverageSource)
    },
    report: {
      recipes: recipes.length,
      recipeActions: actionUses.size === 0 ? 0 : new Set([...actionUses.values()].flatMap(set => [...set])).size,
      exampleCoverage,
      executableExamples: {
        complete: executableExampleAudit.length - incompleteExamples.length,
        incomplete: incompleteExamples.length,
        incompleteRecipes: incompleteExamples
      },
      classifications
    }
  };
}
