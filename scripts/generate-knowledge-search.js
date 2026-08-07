import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { normalizeKnowledgeText } from "../mcp/knowledge.js";
import { root } from "./action-knowledge.js";

export const knowledgeSearchOutput = path.join(root, "knowledge/search-index.json");

const routes = Object.freeze([
  { id: "overview", title: "LLM Guide", path: "docs/llms/index.md", route: "/llms/" },
  { id: "actions", title: "LLM Action Router", path: "docs/llms/actions.md", route: "/llms/actions/" },
  { id: "recipes", title: "LLM Recipe Router", path: "docs/llms/recipes.md", route: "/llms/recipes/" },
  { id: "docs", title: "LLM Documentation Router", path: "docs/llms/docs.md", route: "/llms/docs/" }
]);

const limits = Object.freeze({
  defaultLimit: 6,
  maximumLimit: 10,
  maximumQueryCharacters: 500,
  maximumQueryTerms: 32,
  maximumSummaryCharacters: 280,
  maximumReadCharacters: 16_000
});

const recipeTaskAliases = Object.freeze({
  annotations: "annotation labels text collision layout leader lines",
  "bar-chart": "bar grouped comparison compare categorical category order horizontal vertical side by side colored sorted total magnitude",
  "box-plot": "box plot distribution quartile whisker outlier tukey",
  composition: "dashboard composition concatenate replace child slot panel preserving identity immutable",
  "density-area": "density area distribution filled curve group",
  "error-band": "error band uncertainty confidence interval boundary grouped line temporal legend",
  "error-bar": "error bar uncertainty interval rule cap",
  facet: "facet small multiples panel shared scales headers columns",
  "gradient-plot": "gradient profile continuous distribution categorical legend",
  heatmap: "heat map binned rectangular cells two dimensional count",
  histogram: "histogram distribution bins frequency counts grouped group color colored legend title compare numeric",
  horizon: "horizon folded time series positive negative bands baseline",
  "legend-title-lifecycle": "multiple legends title symbol label spacing alignment position",
  "line-chart": "line chart temporal time series trend grouped series aggregate mean color axes legend",
  "parallel-coordinates": "parallel coordinates multivariate dimensions paths",
  "regression-scatterplot": "regression scatter plot fit line confidence band r squared",
  "rose-chart": "rose polar radial categories arc overlay",
  scatterplot: "scatter plot relationship points renderer export svg png pdf immutable program",
  "selection-lifecycle": "selection highlight selected dim unselected reusable predicate qualifying fill stroke orange style",
  "tick-distribution": "tick rug one dimensional distribution baseline",
  "time-series-derivation": "moving window mean original overlay ordered time unit calendar temporal derived series observation smooth rolling centered extract summarize trend group year",
  "violin-plot": "violin distribution density bandwidth shape"
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export { normalizeKnowledgeText };

function tokens(values) {
  const words = values.flatMap(value => normalizeKnowledgeText(value).split(/\s+/).filter(Boolean));
  return [...new Set(words)].sort();
}

function siteRoute(markdownPath) {
  return `/${markdownPath.replace(/^docs\//, "").replace(/(?:\/index)?\.md$/, "/")}`.replace(/\/+/g, "/");
}

function summaryFromMarkdown(source) {
  const body = source.replace(/^---\n[\s\S]*?\n---\n/, "");
  const paragraphs = body.split(/\n\s*\n/).map(value => value.trim());
  return paragraphs.find(value => value.length > 0 && !value.startsWith("#"))
    ?.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ") ?? "";
}

function actionRecord(action) {
  return {
    kind: "action",
    id: action.name,
    title: action.name,
    summary: action.summary,
    route: action.publicReference,
    priority: 0,
    terms: {
      identity: tokens([action.name, action.domain, action.layer, action.lifecycle]),
      title: tokens([action.name]),
      summary: tokens([action.summary]),
      guidance: tokens([
        ...action.useWhen,
        ...action.avoidWhen,
        ...action.requiredState,
        ...action.parameterNotes.map(note => `${note.path} ${note.description}`),
        action.signature
      ]),
      relations: tokens([...action.relatedActions, ...action.recipeIds])
    }
  };
}

function recipeRecord(recipe) {
  const actions = recipe.steps.flatMap(step => step.actions.map(action => action.name));
  const taskAliases = recipeTaskAliases[recipe.id] ?? "";
  return {
    kind: "recipe",
    id: recipe.id,
    title: recipe.title,
    summary: recipe.intent,
    route: siteRoute(recipe.docs[0].path),
    priority: 100,
    terms: {
      identity: tokens([recipe.id, recipe.title, taskAliases]),
      title: tokens([recipe.title]),
      summary: tokens([recipe.intent, ...recipe.outcomes]),
      guidance: tokens([
        ...recipe.useWhen,
        ...recipe.avoidWhen,
        ...recipe.prerequisites,
        ...recipe.steps.map(step => step.instruction),
        ...recipe.alternatives.flatMap(alternative => [alternative.when, alternative.instruction]),
        ...recipe.pitfalls.flatMap(pitfall => [pitfall.problem, pitfall.fix])
      ]),
      relations: tokens([...actions, ...recipe.relatedRecipes])
    }
  };
}

function routeRecord(route, source) {
  return {
    kind: "docs",
    id: route.id,
    title: route.title,
    summary: summaryFromMarkdown(source),
    route: route.route,
    priority: -50,
    text: source.slice(0, limits.maximumReadCharacters),
    truncated: source.length > limits.maximumReadCharacters,
    terms: {
      identity: tokens([route.id, route.title]),
      title: tokens([route.title]),
      summary: tokens([summaryFromMarkdown(source)]),
      guidance: tokens([source]),
      relations: []
    }
  };
}

export async function buildKnowledgeSearchIndex(knowledgeDocument) {
  const routeSources = await Promise.all(routes.map(async route => ({
    route,
    source: await readFile(path.join(root, route.path), "utf8")
  })));
  const records = [
    ...knowledgeDocument.actions.map(actionRecord),
    ...knowledgeDocument.recipes.map(recipeRecord),
    ...routeSources.map(({ route, source }) => routeRecord(route, source))
  ].sort((left, right) => left.kind.localeCompare(right.kind) || left.id.localeCompare(right.id));
  const identities = new Set(records.map(record => `${record.kind}:${record.id}`));
  if (identities.size !== records.length) throw new Error("Knowledge search records must have unique kind and ID pairs.");
  return {
    schemaVersion: 2,
    generated: {
      actionCount: knowledgeDocument.actions.length,
      recipeCount: knowledgeDocument.recipes.length,
      docsCount: routeSources.length,
      recordCount: records.length,
      knowledgeSha256: sha256(JSON.stringify(knowledgeDocument)),
      routeSourceSha256: sha256(routeSources.map(entry => entry.source).join("\n"))
    },
    limits,
    records
  };
}

function serialized(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export async function generateKnowledgeSearch({ knowledgeDocument, check = false }) {
  const document = await buildKnowledgeSearchIndex(knowledgeDocument);
  const expected = serialized(document);
  if (check) {
    if (await readFile(knowledgeSearchOutput, "utf8") !== expected) {
      throw new Error("Generated knowledge search index is stale: knowledge/search-index.json");
    }
  } else {
    await writeFile(knowledgeSearchOutput, expected);
  }
  return document.generated;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const knowledgeDocument = JSON.parse(await readFile(path.join(root, "knowledge/index.json"), "utf8"));
  const report = await generateKnowledgeSearch({ knowledgeDocument, check: process.argv.includes("--check") });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}
