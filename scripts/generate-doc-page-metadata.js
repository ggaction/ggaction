import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readDocChartCatalog } from "./doc-chart-catalog.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const docsRoot = path.join(root, "docs");
const pagesFile = path.join(docsRoot, "_data/pages.yml");
const chartCatalogFile = path.join(docsRoot, "_data/chart_examples.yml");
const outputFile = path.join(docsRoot, "_data/page_metadata.json");

function registry(source) {
  return [...source.matchAll(/^- title:\s+(.+)\n((?: {2}.+\n?)+)/gm)].map(match => ({
    title: match[1],
    ...Object.fromEntries([...match[2].matchAll(/^ {2}([a-z_]+):\s*(.+)$/gm)]
      .map(property => [property[1], property[2]]))
  }));
}

function charts(source) {
  return new Map(readDocChartCatalog(source).map(chart => [chart.id, chart]));
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

function clean(source) {
  return source
    .replace(/^---\n[\s\S]*?\n---\n+/, "")
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")
    .replace(/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/g, " ")
    .replace(/<!--([\s\S]*?)-->/g, " ")
    .replace(/^#{1,6}\s+.+$/gm, " ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[`*_>#|~-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function description(source) {
  const explicit = source.match(/^description:\s+(.+)$/m)?.[1];
  if (explicit) return explicit;
  const body = source.replace(/^---\n[\s\S]*?\n---\n+/, "")
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, " ")
    .replace(/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/g, " ");
  const paragraphs = body.split(/\n\s*\n/)
    .filter(paragraph => !/^(?:#{1,6}\s|\||[-*]\s|<|!\[)/.test(paragraph.trim()))
    .map(clean)
    .filter(text => text.length >= 45);
  const text = paragraphs[0] ?? clean(body);
  if (text.length <= 180) return text;
  const candidate = text.slice(0, 180);
  const sentence = candidate.lastIndexOf(". ");
  if (sentence >= 70) return candidate.slice(0, sentence + 1);
  const word = candidate.lastIndexOf(" ");
  return `${candidate.slice(0, word >= 120 ? word : 180)}…`;
}

export async function buildDocPageMetadata() {
  const [pagesSource, chartSource] = await Promise.all([
    readFile(pagesFile, "utf8"),
    readFile(chartCatalogFile, "utf8")
  ]);
  const chartById = charts(chartSource);
  const metadata = {};
  for (const page of registry(pagesSource)) {
    const source = await readFile(await pathForUrl(page.url), "utf8");
    const chartId = source.match(/chart-example\.html\s+id="([^"]+)"/)?.[1];
    const explicitImage = source.match(/^image:\s+(\S+)$/m)?.[1];
    metadata[page.url] = {
      title: page.title,
      description: description(source),
      ...(explicitImage
        ? { image: explicitImage }
        : chartId && chartById.get(chartId)?.image
        ? { image: chartById.get(chartId).image }
        : {})
    };
  }
  return metadata;
}

export async function generateDocPageMetadata({ check = false } = {}) {
  const expected = `${JSON.stringify(await buildDocPageMetadata(), null, 2)}\n`;
  if (check) {
    if (await readFile(outputFile, "utf8") !== expected) {
      throw new Error("Generated documentation page metadata is stale. Run npm run docs:metadata.");
    }
    return;
  }
  await writeFile(outputFile, expected);
  process.stdout.write("generated documentation page metadata\n");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await generateDocPageMetadata({ check: process.argv.includes("--check") });
}
