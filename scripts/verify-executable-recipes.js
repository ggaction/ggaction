import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { root } from "./action-knowledge.js";

const publishedRecipeFile = path.join(root, "docs/llms-recipes.json");
const defaultArtifactRoot = path.join(root, ".artifacts/test/executable-recipes");

const monthOrder = Object.freeze([
  "April", "May", "June", "July", "August", "September",
  "October", "November", "December", "January", "February", "March"
]);
const causes = Object.freeze(["Zymotic Diseases", "Other Causes", "Wounds & Injuries"]);
const origins = Object.freeze(["Japan", "USA", "Europe"]);

export const executableRecipeValues = Object.freeze(Array.from({ length: 12 }, (_, index) => Object.freeze({
  id: `row-${index + 1}`,
  kind: index < 6 ? "point" : "bar",
  x: index + 1,
  y: 3 + index * 1.4,
  group: ["A", "B", "C"][index % 3],
  category: ["A", "B", "C"][index % 3],
  value: 1 + index % 6,
  column: `C${index % 4 + 1}`,
  row: `R${index % 3 + 1}`,
  date: new Date(Date.UTC(2024, index, 1)).toISOString(),
  time: new Date(Date.UTC(2024, index, 1)).toISOString(),
  series: ["A", "B"][index % 2],
  Horsepower: 70 + index * 12,
  Miles_per_Gallon: 38 - index * 1.7,
  Acceleration: 10 + index * 0.65,
  Weight_in_lbs: 1800 + index * 170,
  Cylinders: [4, 6, 8][index % 3],
  Displacement: 85 + index * 16,
  Origin: origins[index % origins.length],
  Released_Year: 2000 + index,
  IMDB_Rating: 6.2 + index * 0.2,
  Series_Title: `Film ${index + 1}`,
  fertility: 1.4 + index * 0.18,
  life_expect: 58 + index * 1.6,
  country: ["Alpha", "Beta", "Gamma"][index % 3],
  year: 2000 + index,
  month: monthOrder[index],
  cause: causes[index % causes.length],
  angle: index * 30,
  radius: 1 + index % 5,
  low: 1 + index % 4,
  high: 3 + index % 6
})));

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function traceIncludes(node, action) {
  return node?.op === action || (node?.children ?? []).some(child => traceIncludes(child, action));
}

function programIncludes(program, action) {
  return traceIncludes(program?.trace, action) || Object.values(program?.children ?? {}).some(child =>
    programIncludes(child, action)
  );
}

function collectTraceActions(node, actions) {
  if (typeof node?.op === "string") actions.add(node.op);
  for (const child of node?.children ?? []) collectTraceActions(child, actions);
}

export function collectProgramActions(program, actions = new Set()) {
  collectTraceActions(program?.trace, actions);
  for (const child of Object.values(program?.children ?? {})) collectProgramActions(child, actions);
  return Object.freeze([...actions].sort());
}

export function importedRuntimeFunctions(source) {
  const functions = new Set();
  for (const match of source.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']ggaction(?:\/[A-Za-z0-9_-]+)?["']/gu)) {
    for (const entry of match[1].split(",")) {
      const name = entry.trim().split(/\s+as\s+/u)[0];
      if (name) functions.add(name);
    }
  }
  return Object.freeze([...functions].sort());
}

export function guidedRuntimeFunctions(recipe) {
  const guidance = recipe.pitfalls.map(pitfall => `${pitfall.problem}\n${pitfall.fix}`).join("\n");
  const functions = new Set();
  for (const match of guidance.matchAll(/Import\s*\{\s*([A-Za-z][A-Za-z0-9]*)\s*\}\s*from\s*["']ggaction(?:\/[A-Za-z0-9_-]+)?["']/gu)) {
    functions.add(match[1]);
  }
  return Object.freeze([...functions].sort());
}

function valuesForRecipe(recipeId) {
  if (recipeId !== "error-band") return executableRecipeValues;
  return executableRecipeValues.map((row, index) => ({
    ...row,
    time: new Date(Date.UTC(2024, Math.floor(index / 6), 1)).toISOString()
  }));
}

function executionModule(source, values) {
  return `import { createCanvas as createNativeCanvas } from "@napi-rs/canvas";

const values = ${JSON.stringify(values)};
const __hostCanvas = createNativeCanvas(1, 1);
const document = Object.freeze({
  querySelector(selector) {
    return selector === "#chart" ? __hostCanvas : null;
  }
});

${source}

export { program };
export function renderedPNG() {
  return __hostCanvas.toBuffer("image/png");
}
`;
}

export async function verifyExecutableRecipes({ artifactRoot = defaultArtifactRoot } = {}) {
  const published = JSON.parse(await readFile(publishedRecipeFile, "utf8"));
  const results = [];
  await mkdir(artifactRoot, { recursive: true });

  for (const recipe of published.recipes) {
    const recipeRoot = path.join(artifactRoot, recipe.id);
    const moduleFile = path.join(recipeRoot, "program.mjs");
    const pngFile = path.join(recipeRoot, "canvas.png");
    await mkdir(recipeRoot, { recursive: true });
    await writeFile(moduleFile, executionModule(recipe.exampleSource, valuesForRecipe(recipe.id)));
    let module;
    try {
      module = await import(`${pathToFileURL(moduleFile).href}?source=${sha256(recipe.exampleSource)}`);
    } catch (error) {
      throw new Error(`${recipe.id}: exampleSource execution failed: ${error.message}`, { cause: error });
    }
    const { program } = module;
    if (!program?.semanticSpec || !program?.graphicSpec || !program?.trace) {
      throw new Error(`${recipe.id}: exampleSource did not produce a ChartProgram.`);
    }
    const primaryActions = recipe.steps.flatMap(step => step.actions)
      .filter(action => action.role === "primary")
      .map(action => action.name);
    if (!primaryActions.some(action => programIncludes(program, action))) {
      throw new Error(`${recipe.id}: exampleSource trace lacks its primary recipe action.`);
    }
    const png = module.renderedPNG();
    if (png.length <= 100 || png.subarray(1, 4).toString() !== "PNG") {
      throw new Error(`${recipe.id}: exampleSource did not render a valid Canvas PNG.`);
    }
    await writeFile(pngFile, png);
    results.push(Object.freeze({
      id: recipe.id,
      exampleSourcePath: recipe.exampleSourcePath,
      exampleSourceSha256: sha256(recipe.exampleSource),
      programModule: path.relative(root, moduleFile),
      canvasPNG: path.relative(root, pngFile),
      canvasBytes: png.length,
      primaryActions: Object.freeze(primaryActions),
      deliveredActions: collectProgramActions(program),
      deliveredRuntimeFunctions: Object.freeze([
        ...new Set([...importedRuntimeFunctions(recipe.exampleSource), ...guidedRuntimeFunctions(recipe)])
      ].sort())
    }));
  }

  const manifest = Object.freeze({
    schemaVersion: 1,
    recipeCount: results.length,
    results: Object.freeze(results)
  });
  await writeFile(path.join(artifactRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const manifest = await verifyExecutableRecipes();
  process.stdout.write(`${JSON.stringify({ recipes: manifest.recipeCount, artifactRoot: path.relative(root, defaultArtifactRoot) })}\n`);
}
