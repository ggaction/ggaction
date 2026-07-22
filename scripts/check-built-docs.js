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
    /\.\/(?:llms-full\.txt|(?:[A-Za-z0-9_-]+\/)*(?:#[A-Za-z0-9_-]+)?)/g
  )].map(match => match[0]);
}

const builtFiles = await files(siteRoot);
const htmlFiles = builtFiles.filter(file => file.endsWith(".html"));
assert.equal(htmlFiles.length > 40, true, "Expected the complete documentation site.");

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  assert.doesNotMatch(html, /{{|{%/, `${file} contains unrendered Liquid.`);
  assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, `${file} must have one h1`);
  assert.equal((html.match(/<main(?:\s|>)/g) ?? []).length, 1, `${file} must have one main`);
  assert.match(html, /<link rel="canonical" href="https:\/\/ggaction\.github\.io\/ggaction\//, `${file} canonical`);
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

const llmsFile = path.join(siteRoot, "llms.txt");
const llmsTargets = llmReferences(await readFile(llmsFile, "utf8"));
assert.equal(llmsTargets.length, 44, "Expected every selective LLM documentation target.");
for (const target of llmsTargets) await assertTarget(llmsFile, target);

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
assert.equal((await stat(path.join(siteRoot, "search-index.json"))).size < 400_000, true);
const home = await readFile(path.join(siteRoot, "index.html"), "utf8");
assert.match(home, /data-root-url="\/ggaction\/"/);

for (const expected of [
  "index.html",
  "getting-started/index.html",
  "reference/actions/index.html",
  "search-index.json",
  "llms.txt",
  "llms-full.txt",
  "demos/action-trace/index.html",
  "assets/js/interactive-action-trace.js",
  "assets/js/docs-navigation.js",
  "assets/js/docs-content.js",
  "assets/js/docs-search.js"
]) {
  await assert.doesNotReject(access(path.join(siteRoot, expected)), expected);
}

process.stdout.write(`checked ${htmlFiles.length} built documentation pages\n`);
