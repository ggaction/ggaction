import { publicOptionDeclarations } from "./generate-doc-signatures.js";
import { buildDocProvenance } from "./doc-provenance.js";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import {
  posix as pathPosix,
  relative as relativePath,
  resolve
} from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const docsRoot = fileURLToPath(new URL("../docs/", import.meta.url));
const pageOrder = fileURLToPath(
  new URL("../docs/_data/pages.yml", import.meta.url)
);
const siteConfig = fileURLToPath(
  new URL("../docs/_config.yml", import.meta.url)
);
const packageFile = fileURLToPath(new URL("../package.json", import.meta.url));
const output = fileURLToPath(new URL("../docs/llms-full.txt", import.meta.url));
const conciseOutput = fileURLToPath(new URL("../docs/llms.txt", import.meta.url));
const manifestOutput = fileURLToPath(new URL("../docs/llms-manifest.json", import.meta.url));

function stripFrontMatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n+/, "").trim();
}

function protectCode(source, transform) {
  const protectedSegments = [];
  const tokenized = source.replace(
    /```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]+`/g,
    segment => {
      const token = `GGPROTECTEDSEGMENT${protectedSegments.length}TOKEN`;
      protectedSegments.push(segment);
      return token;
    }
  );
  return transform(tokenized).replace(
    /GGPROTECTEDSEGMENT(\d+)TOKEN/g,
    (_match, index) => protectedSegments[Number(index)]
  );
}

function plainHtmlLabel(value) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&rarr;/g, "→")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function splitTarget(value) {
  const match = value.trim().match(/^(?:<([^>]+)>|(\S+))(\s+["'][\s\S]*["'])?$/);
  if (!match) return { target: value.trim(), suffix: "" };
  return { target: match[1] ?? match[2], suffix: match[3] ?? "" };
}

function canonicalTarget(target, { file, url, registry } = {}) {
  const liquidRoute = target.match(
    /^\{\{\s*['"]([^'"]+)['"]\s*\|\s*relative_url\s*\}\}$/
  )?.[1];
  const value = liquidRoute ?? target;
  if (
    /^(?:https?:|mailto:|data:|javascript:)/i.test(value) ||
    file === undefined ||
    url === undefined ||
    registry === undefined
  ) return value;

  if (value.startsWith("#")) return `${routeToken(url)}${value}`;
  if (value.startsWith("/")) return `.${value}`;

  const [pathname, fragment] = value.split("#");
  const source = relativePath(docsRoot, file).replaceAll("\\", "/");
  const resolved = pathPosix.normalize(pathPosix.join(pathPosix.dirname(source), pathname));
  const registered = registry.routes.get(resolved) ??
    registry.routes.get(`${resolved.replace(/\/$/, "")}.md`) ??
    registry.routes.get(`${resolved.replace(/\/$/, "")}/index.md`);
  if (registered !== undefined) {
    return `${routeToken(registered)}${fragment === undefined ? "" : `#${fragment}`}`;
  }
  if (resolved.startsWith("../")) {
    throw new Error(`LLM bundle link escapes the documentation root: ${value} in ${source}`);
  }
  return `./${resolved}${fragment === undefined ? "" : `#${fragment}`}`;
}

function canonicalHtmlTarget(target, context = {}) {
  const { url, registry } = context;
  if (
    url === undefined ||
    registry === undefined ||
    target.startsWith("#") ||
    target.startsWith("/") ||
    /^(?:https?:|mailto:|data:|javascript:|\{\{)/i.test(target)
  ) return canonicalTarget(target, context);

  const [pathname, fragment] = target.split("#");
  let deployed = pathPosix.normalize(pathPosix.join(url, pathname));
  if (!deployed.startsWith("/")) deployed = `/${deployed}`;
  if (pathname.endsWith("/") && !deployed.endsWith("/")) deployed += "/";
  if (registry.urls.has(deployed)) {
    return `${routeToken(deployed)}${fragment === undefined ? "" : `#${fragment}`}`;
  }
  return canonicalTarget(target, context);
}

export function rewriteMarkdownLinks(markdown, context = {}) {
  return protectCode(markdown, source => source
    .replace(/(!?\[[^\]\n]*\])\(([^)\n]+)\)/g, (_match, label, destination) => {
      const { target, suffix } = splitTarget(destination);
      return `${label}(${canonicalTarget(target, context)}${suffix})`;
    })
    .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_match, attributes, body) => {
      const href = attributes.match(/\bhref=(?:"([^"]*)"|'([^']*)')/i);
      const label = plainHtmlLabel(body);
      if (!href || label.length === 0) return label;
      return `[${label}](${canonicalHtmlTarget(href[1] ?? href[2], context)})`;
    }));
}

export function sanitizeMarkdown(markdown, { version, file, url, registry, provenance = {} } = {}) {
  markdown = markdown.replace(/\{\{\s*site\.data\.provenance\.([A-Za-z.]+)\s*\}\}/g,
    (_match, key) => String(key.split(".").reduce((value, part) => value?.[part], provenance) ?? "current"));
  const rewritten = rewriteMarkdownLinks(stripFrontMatter(markdown), {
    file,
    url,
    registry
  });
  return protectCode(rewritten, source => source
    .replace(/\{\{\s*site\.version\s*\}\}/g, version ?? "current")
    .replace(/\{%[\s\S]*?%\}/g, "")
    .replace(/\{\{[\s\S]*?\}\}/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{:\s*[^}\n]+\}/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&rarr;/g, "→")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim());
}

async function pathForUrl(url) {
  if (url === "/") return resolve(docsRoot, "index.md");
  const relative = url.replace(/^\//, "").replace(/\/$/, "");
  const direct = resolve(docsRoot, `${relative}.md`);
  try {
    await access(direct);
    return direct;
  } catch {
    return resolve(docsRoot, relative, "index.md");
  }
}

export function headingIds(markdown) {
  return new Set([...markdown.matchAll(/^#{1,6}\s+(.+)$/gm)].map(match => {
    const explicit = match[1].match(/\{#([A-Za-z][A-Za-z0-9_-]*)\}\s*$/)?.[1];
    if (explicit !== undefined) return explicit;
    return match[1]
      .replace(/`/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }));
}

function pageEntries(source) {
  return [...source.matchAll(/^- title:\s+(.+)\n((?: {2}.+\n?)+)/gm)].map(match => ({
    title: match[1],
    ...Object.fromEntries([...match[2].matchAll(
      /^ {2}([a-z_]+):\s*(.+)$/gm
    )].map(property => [property[1], property[2]]))
  }));
}

async function pageRegistry() {
  const order = await readFile(pageOrder, "utf8");
  const pages = pageEntries(order);
  const routes = new Map();
  for (const page of pages) {
    const file = await pathForUrl(page.url);
    const relative = relativePath(docsRoot, file).replaceAll("\\", "/");
    routes.set(relative, page.url);
  }
  return { pages, urls: new Set(pages.map(page => page.url)), routes };
}

function routeToken(url) {
  return url === "/" ? "./" : `.${url}`;
}

export async function buildConciseLlmDocumentation() {
  const source = await readFile(new URL("../docs/_sources/llms-index.md", import.meta.url), "utf8");
  const registry = await pageRegistry();
  const inventoryMarker = "## Machine-readable contracts and canonical page inventory";
  const curatedSource = source.split(inventoryMarker)[0].trimEnd();
  const canonical = curatedSource.replace(
    /\.\/([A-Za-z0-9_./-]+\.md)(#[A-Za-z0-9_-]+)?/g,
    (_match, relative, fragment = "") => {
      const url = registry.routes.get(relative);
      if (url === undefined) {
        throw new Error(`LLM index references an unregistered page: ${relative}`);
      }
      return `${routeToken(url)}${fragment}`;
    }
  );
  const routedPages = new Set([...canonical.matchAll(
    /\.\/(?:[A-Za-z0-9_.-]+\/)*(?:[A-Za-z0-9_.-]+)?(?:#[A-Za-z0-9_-]+)?/g
  )].map(match => match[0].split("#")[0]));
  const remainingPages = registry.pages.filter(page =>
    !routedPages.has(routeToken(page.url))
  );
  const expanded = [
    canonical,
    "",
    inventoryMarker,
    "",
    "- Selective plaintext pages, action cards, named type dependencies, and artifact identity: ./llm/index.json",
    "- Full bundle section manifest and hashes: ./llms-manifest.json",
    "- Typed compact action-card collection: ./actions.json",
    "- Action-card item schema: ./schemas/action-card.schema.json",
    "- Action-card collection schema: ./schemas/action-cards.schema.json",
    "- MCP task-packet schema: ./schemas/task-packet.schema.json",
    "- Full-bundle manifest schema: ./schemas/llms-manifest.schema.json",
    "- Resolver intent taxonomy: ./intent-taxonomy.json",
    "- Resolver intent-taxonomy schema: ./schemas/intent-taxonomy.schema.json",
    "- Bounded MCP resource catalog: ./mcp-resources.json",
    "- Bounded MCP resource-catalog schema: ./schemas/mcp-resources.schema.json",
    "- Exact public ChartProgram declaration: ./types/program.d.ts",
    ...remainingPages.map(page => `- ${page.title}: ${routeToken(page.url)}`),
    ""
  ].join("\n");
  const targets = [...expanded.matchAll(
    /\.\/(?:[A-Za-z0-9_.-]+\/)*(?:[A-Za-z0-9_.-]+)?(?:#[A-Za-z0-9_-]+)?/g
  )].map(match => match[0]);

  for (const target of targets) {
    if (/\.\/(?:llms-(?:full\.txt|manifest\.json)|actions\.json|intent-taxonomy\.json|mcp-resources\.json|schemas\/|types\/|llm\/)/.test(target)) {
      continue;
    }
    const [route, fragment] = target.split("#");
    const url = route === "./" ? "/" : `/${route.slice(2)}`;
    if (!registry.urls.has(url)) {
      throw new Error(`LLM index references an unknown route: ${route}`);
    }
    if (fragment !== undefined) {
      const markdown = await readFile(await pathForUrl(url), "utf8");
      if (!headingIds(markdown).has(fragment)) {
        throw new Error(`LLM index references a missing fragment: ${target}`);
      }
    }
  }
  return expanded;
}

async function llmSections() {
  const [config, packageSource, registry] = await Promise.all([
    readFile(siteConfig, "utf8"),
    readFile(packageFile, "utf8"),
    pageRegistry()
  ]);
  const version = config.match(/^version:\s*(\S+)$/m)?.[1];
  const packageVersion = JSON.parse(packageSource).version;
  if (version !== packageVersion) {
    throw new Error(`Documentation version ${version} does not match package version ${packageVersion}.`);
  }
  const provenance = await buildDocProvenance();
  const sections = [];
  for (const [index, page] of registry.pages.entries()) {
    const file = await pathForUrl(page.url);
    const source = await readFile(file, "utf8");
    const markdown = sanitizeMarkdown(source, {
      version,
      provenance,
      file,
      url: page.url,
      registry
    });
    sections.push({
      order: index + 1,
      title: page.title,
      route: page.url,
      source: relativePath(docsRoot, file).replaceAll("\\", "/"),
      headings: [...headingIds(source)],
      bytes: Buffer.byteLength(markdown, "utf8"),
      sha256: createHash("sha256").update(markdown).digest("hex"),
      markdown
    });
  }
  return { packageVersion, sections, provenance };
}

function fullDocumentation({ packageVersion, sections, provenance }) {
  return [
    "# ggaction Full Documentation",
    "",
    `Package metadata version: ${packageVersion}.`,
    `Contract: ${provenance.contractId}. Status: ${provenance.status}. Runtime source: ${provenance.sourceCommit ?? "uncommitted"}. Release baseline: ${provenance.baseline.tag}.`,
    "Source status: generated from the checked-out repository documentation. A branch may contain unreleased changes; verify the installed package version and types before generating code.",
    "Generated from the canonical Markdown page order. Do not edit this file directly.",
    "Use ./llms.txt for routing, ./llms-manifest.json for section hashes, ./actions.json for typed action cards, ./intent-taxonomy.json and ./mcp-resources.json for compact resolver knowledge, and ./schemas/ for JSON Schemas.",
    "",
    ...sections.map(section => `<!-- Source: ${section.route} -->\n\n${section.markdown}`)
  ].join("\n\n") + "\n";
}

function llmManifest({ packageVersion, sections, provenance }) {
  return {
    schemaVersion: 1,
    packageVersion,
    sourceStatus: "checked-out-repository-documentation",
    provenance: { status: provenance.status, contractId: provenance.contractId,
      sourceCommit: provenance.sourceCommit, baseline: provenance.baseline, manifest: "doc-provenance.json" },
    bundle: "llms-full.txt",
    sectionCount: sections.length,
    sections: sections.map(({ markdown: _markdown, ...section }) => section)
  };
}

export async function buildFullLlmDocumentation() {
  return fullDocumentation(await llmSections());
}

export async function buildLlmManifest() {
  return llmManifest(await llmSections());
}

export async function buildSelectiveLlmArtifacts(context) {
  context ??= await llmSections();
  const files = [];
  const hash = value => createHash("sha256").update(value).digest("hex");
  const add = (path, content) => { files.push({ path, content }); return { path, bytes: Buffer.byteLength(content), sha256: hash(content) }; };
  const pageMetadata = JSON.parse(await readFile(resolve(docsRoot, "_data/page_metadata.json"), "utf8"));
  const pages = context.sections.map(section => {
    const chunkPath = `llm/pages/${section.source.replace(/\.md$/, ".txt")}`;
    const prefix = "../".repeat(chunkPath.split("/").length - 1);
    const markdown = protectCode(section.markdown, text => text.replace(/(\]\()\.\//g, `$1${prefix}`));
    return { route: section.route, source: `docs/${section.source}`,
      editSource: pageMetadata[section.route].editSource, ...add(chunkPath, markdown + "\n") };
  });
  const declarations = await publicOptionDeclarations();
  const types = [...declarations].map(([name, source]) => ({ name,
    dependencies: [...new Set(source.match(/\b[A-Z][A-Za-z0-9]+\b/g) ?? [])].filter(other => other !== name && declarations.has(other)),
    ...add(`llm/types/${name}.txt`, source + "\n") }));
  const cardsSource = await readFile(new URL("../knowledge/action-cards.json", import.meta.url), "utf8");
  const { cards } = JSON.parse(cardsSource);
  const actions = cards.map(card => ({ name: card.name, route: card.route,
    types: [...new Set(card.signature.match(/\b[A-Z][A-Za-z0-9]+\b/g) ?? [])].filter(name => declarations.has(name)),
    ...add(`llm/actions/${card.name}.json`, JSON.stringify(card, null, 2) + "\n") }));
  const artifacts = [];
  for (const path of ["actions.json", "mcp-resources.json", "intent-taxonomy.json", "schemas/task-packet.schema.json", "schemas/action-card.schema.json", "types/program.d.ts"]) {
    const content = await readFile(resolve(docsRoot, path), "utf8");
    artifacts.push({ path, sha256: hash(content), bytes: Buffer.byteLength(content) });
  }
  const manifest = { schemaVersion: 1, packageVersion: context.packageVersion,
    contractId: context.provenance.contractId,
    identityPolicy: "Match contractId and artifact hashes before mixing page, card, type, or MCP resource data. Task packets must come from the same installed card/resource set; packageVersion alone is insufficient.",
    artifacts,
    catalogs: Object.fromEntries(Object.entries({ pages, actions, types }).map(([kind, entries]) => [kind,
      { count: entries.length, ...add(`llm/${kind}.json`, JSON.stringify(entries) + "\n") }])),
    paths: { page: "llm/pages/<source-without-md>.txt", action: "llm/actions/<actionName>.json", type: "llm/types/<TypeName>.txt" } };
  add("llm/index.json", JSON.stringify(manifest, null, 2) + "\n");
  return files;
}

export async function generateFullLlmDocumentation() {
  const [concise, context] = await Promise.all([
    buildConciseLlmDocumentation(),
    llmSections()
  ]);
  const chunks = await buildSelectiveLlmArtifacts(context);
  for (const artifact of chunks) {
    const target = resolve(docsRoot, artifact.path);
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, artifact.content);
  }
  const full = fullDocumentation(context);
  const manifest = `${JSON.stringify(llmManifest(context), null, 2)}\n`;
  await Promise.all([
    writeFile(conciseOutput, concise),
    writeFile(output, full),
    writeFile(manifestOutput, manifest)
  ]);
  process.stdout.write("generated docs/llms.txt, docs/llms-full.txt, and docs/llms-manifest.json\n");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await generateFullLlmDocumentation();
}
