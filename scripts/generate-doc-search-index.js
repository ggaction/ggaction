import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readDocChartCatalog } from "./doc-chart-catalog.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const docsRoot = path.join(root, "docs");
const pagesFile = path.join(docsRoot, "_data/pages.yml");
const actionCatalogFile = path.join(root, "agent_docs/contract/ACTION_INDEX.json");
const pageMetadataFile = path.join(docsRoot, "_data/page_metadata.json");
const chartCatalogFile = path.join(docsRoot, "_data/chart_examples.yml");
const outputFile = path.join(docsRoot, "search-index.json");

const SEARCH_ALIASES = new Map([
  ["/api/axes/", ["axis label", "tick label", "axis title"]],
  ["/api/error-bars/", ["confidence interval", "uncertainty"]],
  ["/api/error-bands/", ["confidence interval", "uncertainty ribbon"]],
  ["/api/composition/", ["dashboard", "small multiples", "facet"]],
  ["/api/parallel-coordinates/", ["multivariate profile"]],
  ["/llm-authoring/", [
    "createCanvas", "createData", "load rows", "inline data",
    "histogram", "binned distribution", "one dimensional bins",
    "regression data", "path mark", "trend line", "uncertainty ribbon",
    "axis guides", "Canvas", "SVG", "PNG", "PDF", "JPG", "JPEG",
    "3d chart", "geographic chart", "animation", "interaction",
    "renderer.canvas", "renderer.svg", "renderer.png", "renderer.pdf",
    "unsupported.geo", "unsupported.animation", "unsupported.interaction",
    "unsupported.3d", "unsupported.jpg", "renderer.format"
  ]],
  ["/api/position/offsets/", ["grouped bar", "side by side bars"]],
  ["/tutorials/grouped-bar/", ["grouped bar", "side by side bars"]],
  ["/recipes/bar-chart/", ["grouped bar", "side by side bars"]]
]);

function searchKind(url, sectionTitle) {
  if (url.startsWith("/recipes/")) return "Recipe";
  if (url.startsWith("/tutorials/")) return "Tutorial";
  if (url.startsWith("/reference/actions/") && sectionTitle) return "Action";
  if (url.startsWith("/reference/")) return "Reference";
  if (url.startsWith("/api/")) return "API";
  if (url.startsWith("/concepts/")) return "Concept";
  return "Guide";
}

function aliases(url) {
  return [...SEARCH_ALIASES.entries()]
    .filter(([prefix]) => url.startsWith(prefix))
    .flatMap(([, values]) => values);
}

function chartKeywords(chart) {
  if (!chart) return [];
  return [
    chart.title,
    chart.id,
    ...chart.tasks.split(" "),
    ...chart.actions.split(/\s*(?:,|·)\s*/)
  ];
}

function pageRegistry(source) {
  return [...source.matchAll(/^- title:\s+(.+)\n((?: {2}.+\n?)+)/gm)].map(match => ({
    title: match[1],
    ...Object.fromEntries([...match[2].matchAll(
      /^ {2}([a-z_]+):\s*(.+)$/gm
    )].map(property => [property[1], property[2]]))
  }));
}

async function pathForUrl(url) {
  if (url === "/") return path.join(docsRoot, "index.md");
  const relative = url.replace(/^\//, "").replace(/\/$/, "");
  const direct = path.join(docsRoot, `${relative}.md`);
  try {
    await access(direct);
    return direct;
  } catch {
    return path.join(docsRoot, relative, "index.md");
  }
}

function frontMatter(source, key) {
  const block = source.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";
  return block.match(new RegExp(`^${key}:\\s+(.+)$`, "m"))?.[1];
}

function cleanText(source) {
  return source
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")
    .replace(/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/g, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_>#|~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function heading(source) {
  const explicit = source.match(/\{#([A-Za-z][A-Za-z0-9_-]*)\}\s*$/)?.[1];
  const label = cleanText(source.replace(/\{#[A-Za-z][A-Za-z0-9_-]*\}\s*$/, ""));
  const id = explicit ?? label.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return { label, id };
}

function sourceSections(source) {
  const body = source.replace(/^---\n[\s\S]*?\n---\n+/, "");
  const sections = [];
  let current = { heading: undefined, body: [] };
  let fence;
  for (const line of body.split("\n")) {
    const marker = line.match(/^(```|~~~)/)?.[1];
    if (marker) {
      fence = fence === marker ? undefined : (fence ?? marker);
      current.body.push(line);
      continue;
    }
    const match = !fence && line.match(/^#{2,3}\s+(.+)$/);
    if (match) {
      sections.push(current);
      current = { heading: heading(match[1]), body: [] };
    } else if (!/^#\s+/.test(line)) {
      current.body.push(line);
    }
  }
  sections.push(current);
  return sections;
}

function summary(text) {
  if (text.length <= 240) return text;
  const shortened = text.slice(0, 237);
  const boundary = shortened.lastIndexOf(" ");
  return `${shortened.slice(0, boundary > 160 ? boundary : 237)}…`;
}

export async function buildDocSearchIndex() {
  const [pagesSource, catalogSource, pageMetadataSource, chartCatalogSource] = await Promise.all([
    readFile(pagesFile, "utf8"),
    readFile(actionCatalogFile, "utf8"),
    readFile(pageMetadataFile, "utf8"),
    readFile(chartCatalogFile, "utf8")
  ]);
  const actions = JSON.parse(catalogSource).actions;
  const pageMetadata = JSON.parse(pageMetadataSource);
  const metadata = new Map(actions.map(action => [action.name, action]));
  const chartMetadata = new Map();
  for (const chart of readDocChartCatalog(chartCatalogSource)) {
    chartMetadata.set(chart.url, chart);
    if (chart.recipe_url) chartMetadata.set(chart.recipe_url, chart);
  }
  const entries = [];

  for (const page of pageRegistry(pagesSource)) {
    const source = await readFile(await pathForUrl(page.url), "utf8");
    const sections = sourceSections(source);
    const pageSummary = pageMetadata[page.url]?.description ??
      frontMatter(source, "description") ?? cleanText(sections[0].body.join("\n"));
    entries.push({
      pageTitle: page.title,
      url: page.url,
      kind: searchKind(page.url),
      summary: summary(pageSummary),
      keywords: [page.title, ...chartKeywords(chartMetadata.get(page.url)), ...aliases(page.url)]
    });
    for (const section of sections.slice(1)) {
      if (!section.heading?.id) continue;
      const actionName = section.heading.label.match(/^([A-Za-z][A-Za-z0-9]*)/)?.[1];
      const action = metadata.get(actionName);
      entries.push({
        pageTitle: page.title,
        sectionTitle: section.heading.label,
        url: `${page.url}#${section.heading.id}`,
        kind: searchKind(page.url, section.heading.label),
        summary: summary(cleanText(section.body.join("\n")) || pageSummary),
        keywords: action
          ? [
              action.name,
              action.layer,
              action.domain,
              ...chartKeywords(chartMetadata.get(`${page.url}#${section.heading.id}`)),
              ...aliases(page.url)
            ]
          : [
              page.title,
              section.heading.label,
              ...chartKeywords(chartMetadata.get(`${page.url}#${section.heading.id}`)),
              ...aliases(page.url)
            ]
      });
    }
  }
  return entries;
}

export async function generateDocSearchIndex({ check = false } = {}) {
  const expected = `${JSON.stringify(await buildDocSearchIndex())}\n`;
  if (check) {
    const current = await readFile(outputFile, "utf8");
    if (current !== expected) {
      throw new Error("Generated documentation search index is stale. Run npm run docs:search.");
    }
    return;
  }
  await writeFile(outputFile, expected);
  process.stdout.write("generated compact documentation search index\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocSearchIndex({ check: process.argv.includes("--check") });
}
