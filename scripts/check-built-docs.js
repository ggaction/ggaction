import assert from "node:assert/strict";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const siteRoot = path.resolve(process.argv[2] ?? "_site");

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? files(target) : [target];
  }));
  return nested.flat();
}

function stripSiteBase(value) {
  const url = value.split("#")[0].split("?")[0];
  if (url === "/ggaction") return "/";
  return url.startsWith("/ggaction/") ? url.slice("/ggaction".length) : url;
}

function targetPath(source, value) {
  const local = stripSiteBase(value);
  if (local.length === 0) return source;
  if (local.startsWith("/")) return path.join(siteRoot, local);
  return path.resolve(path.dirname(source), decodeURIComponent(local));
}

const idCache = new Map();

async function documentIds(file) {
  if (!idCache.has(file)) {
    const html = await readFile(file, "utf8");
    idCache.set(file, new Set(
      [...html.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1])
    ));
  }
  return idCache.get(file);
}

async function assertTarget(source, value) {
  if (
    !value ||
    /^(?:https?:|mailto:|data:|javascript:)/.test(value)
  ) return;

  let target = targetPath(source, value);
  const [reference, fragment] = value.split("#");
  if (reference.endsWith("/")) target = path.join(target, "index.html");
  assert.equal(target.startsWith(siteRoot), true, `${source} escapes the built site: ${value}`);
  await assert.doesNotReject(access(target), `${source} links to missing ${value}`);
  if (fragment !== undefined) {
    assert.equal(
      (await documentIds(target)).has(decodeURIComponent(fragment)),
      true,
      `${source} links to missing fragment ${value}`
    );
  }
}

function llmReferences(source) {
  return [...source.matchAll(
    /\.\/(?:[A-Za-z0-9_.-]+\/)*(?:[A-Za-z0-9_.-]+)?(?:#[A-Za-z0-9_-]+)?/g
  )].map(match => match[0]);
}

function markdownReferences(source) {
  return [...source.matchAll(
    /!?\[[^\]\n]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g
  )].map(match => match[1]);
}

const builtFiles = await files(siteRoot);
const htmlFiles = builtFiles.filter(file => file.endsWith(".html"));
assert.equal(htmlFiles.length > 40, true, "Expected the complete documentation site.");
const canonicalUrls = [];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  assert.doesNotMatch(html, /{{|{%/, `${file} contains unrendered Liquid.`);
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `${file} must have one h1`);
  assert.equal((html.match(/<main(?:\s|>)/g) ?? []).length, 1, `${file} must have one main`);
  assert.match(html, /<link rel="canonical" href="https:\/\/ggaction\.github\.io\/ggaction\//, `${file} canonical`);
  canonicalUrls.push(html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]);
  assert.match(html, /<meta name="description" content="[^"]{45,}"/, `${file} description`);
  assert.match(html, /<meta property="og:image" content="https:\/\/ggaction\.github\.io\/ggaction\//, `${file} social image`);
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${file} contains duplicate ids`);
  for (const image of html.matchAll(/<img\b([^>]*)>/g)) {
    assert.match(image[1], /\balt=["'][^"']+["']/, `${file} has an image without alt text`);
  }
  for (const match of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/g)) {
    await assertTarget(file, match[1]);
  }
}

const sitemap = await readFile(path.join(siteRoot, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map(match => match[1]);
assert.equal(sitemapUrls.length, htmlFiles.length, "Sitemap must contain every HTML page.");
assert.equal(new Set(sitemapUrls).size, sitemapUrls.length, "Sitemap URLs must be unique.");
assert.deepEqual(
  new Set(sitemapUrls),
  new Set(canonicalUrls),
  "Sitemap URLs must exactly match the canonical documentation pages."
);

const llmsFile = path.join(siteRoot, "llms.txt");
const llmsTargets = llmReferences(await readFile(llmsFile, "utf8"));
assert.equal(llmsTargets.length > 100, true, "Expected every page and machine contract in the LLM index.");
assert.equal(new Set(llmsTargets).size, llmsTargets.length, "LLM documentation routes must be unique.");
for (const target of llmsTargets) await assertTarget(llmsFile, target);
const llmsTargetRoutes = new Set(llmsTargets.map(target => target.split("#")[0]));
for (const canonical of canonicalUrls) {
  const route = stripSiteBase(new URL(canonical).pathname);
  const target = route === "/" ? "./" : `.${route}`;
  assert.equal(llmsTargetRoutes.has(target), true, `LLM index omits ${canonical}`);
}

const llmsFullFile = path.join(siteRoot, "llms-full.txt");
const llmsFull = await readFile(llmsFullFile, "utf8");
assert.doesNotMatch(llmsFull, /\{%|\{\{/);
assert.equal((llmsFull.match(/^<!-- Source: /gm) ?? []).length, htmlFiles.length);
for (const target of markdownReferences(llmsFull)) {
  await assertTarget(llmsFullFile, target);
}

const searchIndex = JSON.parse(await readFile(path.join(siteRoot, "search-index.json"), "utf8"));
assert.equal(searchIndex.length > 40, true, "Expected every titled page in search.");
assert.equal(new Set(searchIndex.map(entry => entry.url)).size, searchIndex.length);
for (const entry of searchIndex) {
  assert.equal(typeof entry.pageTitle === "string" && entry.pageTitle.length > 0, true);
  assert.equal(typeof entry.url === "string" && entry.url.length > 0, true);
  assert.equal(typeof entry.kind === "string" && entry.kind.length > 0, true);
  assert.equal(typeof entry.summary === "string", true);
  assert.equal(Array.isArray(entry.keywords) && entry.keywords.length > 0, true);
}
assert.equal((await stat(path.join(siteRoot, "search-index.json"))).size < 800_000, true);
const home = await readFile(path.join(siteRoot, "index.html"), "utf8");
assert.match(home, /data-root-url="\/ggaction\/"/);

for (const expected of [
  "index.html",
  "getting-started/index.html",
  "reference/actions/index.html",
  "search-index.json",
  "sitemap.xml",
  "llms.txt",
  "llms-full.txt",
  "llms-manifest.json",
  "actions.json",
  "intent-taxonomy.json",
  "mcp-resources.json",
  "schemas/action-card.schema.json",
  "schemas/action-cards.schema.json",
  "schemas/task-packet.schema.json",
  "schemas/llms-manifest.schema.json",
  "schemas/intent-taxonomy.schema.json",
  "schemas/mcp-resources.schema.json",
  "types/program.d.ts",
  "assets/js/action-metadata.js",
  "assets/js/docs-navigation.js",
  "assets/js/docs-content.js",
  "assets/js/docs-search.js"
]) {
  await assert.doesNotReject(access(path.join(siteRoot, expected)), expected);
}

assert.equal(
  builtFiles.some(file => path.basename(file) === "AGENTS.md"),
  false,
  "Internal AGENTS.md files must not be published."
);
const actionCards = JSON.parse(await readFile(path.join(siteRoot, "actions.json"), "utf8"));
assert.equal(actionCards.schemaVersion, 2);
assert.deepEqual(actionCards, JSON.parse(await readFile(
  new URL("../knowledge/action-cards.json", import.meta.url), "utf8"
)), "Built action cards must match the current canonical inventory.");
assert.equal(actionCards.cards.every(card =>
  card.options.every(option => typeof option.type === "string" && option.type.length > 0)
), true);
const taskPacketSchema = JSON.parse(await readFile(
  path.join(siteRoot, "schemas/task-packet.schema.json"),
  "utf8"
));
assert.equal(taskPacketSchema.properties.schemaVersion.const, 4);
const llmsManifestSchema = JSON.parse(await readFile(
  path.join(siteRoot, "schemas/llms-manifest.schema.json"),
  "utf8"
));
assert.equal(
  llmsManifestSchema.$id,
  "https://ggaction.github.io/ggaction/schemas/llms-manifest.schema.json"
);
const llmsManifest = JSON.parse(await readFile(
  path.join(siteRoot, "llms-manifest.json"),
  "utf8"
));
const taxonomy = JSON.parse(await readFile(
  path.join(siteRoot, "intent-taxonomy.json"),
  "utf8"
));
const mcpResources = JSON.parse(await readFile(
  path.join(siteRoot, "mcp-resources.json"),
  "utf8"
));
assert.equal(llmsManifest.packageVersion, actionCards.packageVersion);
assert.equal(taxonomy.packageVersion, actionCards.packageVersion);
assert.equal(mcpResources.packageVersion, actionCards.packageVersion);
assert.equal(llmsManifest.sectionCount, htmlFiles.length);
assert.equal(llmsManifest.sections.length, htmlFiles.length);
assert.equal(llmsManifest.sections.every(section => /^[a-f0-9]{64}$/.test(section.sha256)), true);

process.stdout.write(`checked ${htmlFiles.length} built documentation pages\n`);
