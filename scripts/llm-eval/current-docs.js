import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const docsRoot = path.join(root, "docs");
const defaultMaximumCharacters = 16_000;

function assertWithinDocs(file) {
  const relative = path.relative(docsRoot, file);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Documentation reads must stay inside docs/.");
  }
}

function normalizeRoute(route) {
  if (typeof route !== "string" || route.trim().length === 0) {
    throw new TypeError("Documentation route must be a non-empty string.");
  }
  const withoutFragment = route.trim().split("#", 1)[0];
  return withoutFragment
    .replace(/^\.\//u, "")
    .replace(/^\/+|\/+$/gu, "");
}

export function candidateDocFiles(route) {
  const normalized = normalizeRoute(route);
  if (normalized === "") return [path.join(docsRoot, "index.md")];
  if (normalized === "llms.txt" || normalized === "llms-full.txt") {
    return [path.join(docsRoot, normalized)];
  }
  if (/\.(?:md|txt)$/u.test(normalized)) {
    return [path.join(docsRoot, normalized)];
  }
  return [
    path.join(docsRoot, `${normalized}.md`),
    path.join(docsRoot, normalized, "index.md")
  ];
}

export async function readCurrentDoc(route, { maximumCharacters = defaultMaximumCharacters } = {}) {
  if (!Number.isInteger(maximumCharacters) || maximumCharacters <= 0) {
    throw new TypeError("maximumCharacters must be a positive integer.");
  }
  let lastError;
  for (const file of candidateDocFiles(route)) {
    assertWithinDocs(file);
    try {
      const text = await readFile(file, "utf8");
      return Object.freeze({
        route,
        file: path.relative(root, file),
        truncated: text.length > maximumCharacters,
        text: text.slice(0, maximumCharacters)
      });
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      lastError = error;
    }
  }
  throw new Error(`Unknown documentation route "${route}".`, { cause: lastError });
}

function terms(query) {
  if (typeof query !== "string" || query.trim().length === 0) {
    throw new TypeError("Documentation search query must be a non-empty string.");
  }
  return [...new Set(query.toLowerCase().match(/[a-z0-9-]+/gu) ?? [])];
}

export async function searchCurrentDocs(query, { limit = 6 } = {}) {
  if (!Number.isInteger(limit) || limit <= 0 || limit > 10) {
    throw new TypeError("Documentation search limit must be between 1 and 10.");
  }
  const index = JSON.parse(await readFile(path.join(docsRoot, "search-index.json"), "utf8"));
  return searchDocumentationIndex(index, query, { limit });
}

function searchDocumentationIndex(index, query, { limit = 6 } = {}) {
  if (!Number.isInteger(limit) || limit <= 0 || limit > 10) {
    throw new TypeError("Documentation search limit must be between 1 and 10.");
  }
  const queryTerms = terms(query);
  return index
    .map((entry, order) => {
      const title = `${entry.pageTitle ?? ""} ${entry.sectionTitle ?? ""}`.toLowerCase();
      const haystack = `${title} ${entry.summary ?? ""} ${(entry.keywords ?? []).join(" ")}`.toLowerCase();
      const score = queryTerms.reduce((total, term) =>
        total + (title.includes(term) ? 4 : 0) + (haystack.includes(term) ? 1 : 0), 0);
      return { entry, order, score };
    })
    .filter(result => result.score > 0)
    .sort((left, right) => right.score - left.score || left.order - right.order)
    .slice(0, limit)
    .map(({ entry }) => Object.freeze({
      title: entry.sectionTitle === undefined
        ? entry.pageTitle
        : `${entry.pageTitle} — ${entry.sectionTitle}`,
      url: entry.url,
      kind: entry.kind,
      summary: entry.summary
    }));
}

async function documentationFiles(directory = docsRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) return documentationFiles(file);
    return /\.(?:md|txt)$/u.test(entry.name) ? [file] : [];
  }));
  return nested.flat().sort();
}

function snapshotDigest(files, searchIndexSource) {
  const hash = createHash("sha256");
  for (const [relative, text] of [...files.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    hash.update(`${relative}\0${Buffer.byteLength(text, "utf8")}\0${text}\0`);
  }
  hash.update(`search-index.json\0${Buffer.byteLength(searchIndexSource, "utf8")}\0${searchIndexSource}\0`);
  return hash.digest("hex");
}

export async function captureCurrentDocumentationSnapshot({ sourceRoot = root } = {}) {
  const snapshotDocsRoot = path.join(sourceRoot, "docs");
  const [paths, searchIndexSource] = await Promise.all([
    documentationFiles(snapshotDocsRoot),
    readFile(path.join(snapshotDocsRoot, "search-index.json"), "utf8")
  ]);
  const entries = await Promise.all(paths.map(async file => [
    path.relative(snapshotDocsRoot, file),
    await readFile(file, "utf8")
  ]));
  const files = new Map(entries);
  const searchIndex = JSON.parse(searchIndexSource);
  const bytes = entries.reduce((sum, [, text]) => sum + Buffer.byteLength(text, "utf8"), 0) +
    Buffer.byteLength(searchIndexSource, "utf8");

  const read = async (route, { maximumCharacters = defaultMaximumCharacters } = {}) => {
    if (!Number.isInteger(maximumCharacters) || maximumCharacters <= 0) {
      throw new TypeError("maximumCharacters must be a positive integer.");
    }
    for (const file of candidateDocFiles(route)) {
      const relative = path.relative(docsRoot, file);
      const text = files.get(relative);
      if (text === undefined) continue;
      return Object.freeze({
        route,
        file: path.join("docs", relative),
        truncated: text.length > maximumCharacters,
        text: text.slice(0, maximumCharacters)
      });
    }
    throw new Error(`Unknown documentation route "${route}" in the pinned snapshot.`);
  };

  return Object.freeze({
    route: "llms.txt",
    read,
    search: (query, options) => Promise.resolve(searchDocumentationIndex(searchIndex, query, options)),
    artifact: Object.freeze({
      source: "in-memory-documentation-snapshot",
      sha256: snapshotDigest(files, searchIndexSource),
      fileCount: files.size + 1,
      bytes
    })
  });
}
