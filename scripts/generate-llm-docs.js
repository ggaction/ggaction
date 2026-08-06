import { access, readFile, writeFile } from "node:fs/promises";
import { relative as relativePath, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const docsRoot = fileURLToPath(new URL("../docs/", import.meta.url));
const pageOrder = fileURLToPath(
  new URL("../docs/_data/pages.yml", import.meta.url)
);
const siteConfig = fileURLToPath(
  new URL("../docs/_config.yml", import.meta.url)
);
const output = fileURLToPath(new URL("../docs/llms-full.txt", import.meta.url));
const conciseOutput = fileURLToPath(new URL("../docs/llms.txt", import.meta.url));
const conciseSource = fileURLToPath(new URL("../docs/_sources/llms.txt", import.meta.url));
const routingPages = [
  "llms/index.md",
  "llms/actions.md",
  "llms/recipes.md",
  "llms/docs.md"
];

function stripFrontMatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n+/, "").trim();
}

export function sanitizeMarkdown(markdown, { version } = {}) {
  return stripFrontMatter(markdown)
    .replace(/\{\{\s*site\.version\s*\}\}/g, version ?? "current")
    .replace(/\{%[\s\S]*?%\}/g, "")
    .replace(/\{\{[\s\S]*?\}\}/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/(?:a|article|b|code|div|details|figcaption|figure|span|strong|summary)>/gi, " ")
    .replace(/<(?:a|article|b|br|code|div|details|figcaption|figure|img|span|strong|summary)\b[^>]*>/gi, "")
    .replace(/&rarr;/g, "→")
    .replace(/&middot;/g, "·")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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

function headingIds(markdown) {
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

async function pageRegistry() {
  const order = await readFile(pageOrder, "utf8");
  const urls = [...order.matchAll(/^\s*url:\s+(\S+)\s*$/gm)]
    .map(match => match[1]);
  const routes = new Map();
  for (const url of urls) {
    const file = await pathForUrl(url);
    const relative = relativePath(docsRoot, file).replaceAll("\\", "/");
    routes.set(relative, url);
  }
  return { urls: new Set(urls), routes };
}

function routeToken(url) {
  return url === "/" ? "./" : `.${url}`;
}

export async function buildConciseLlmDocumentation() {
  const source = await readFile(conciseSource, "utf8");
  const registry = await pageRegistry();
  const canonical = source.replace(
    /\.\/([A-Za-z0-9_./-]+\.md)(#[A-Za-z0-9_-]+)?/g,
    (match, relative, fragment = "") => {
      const url = registry.routes.get(relative);
      if (url === undefined) {
        throw new Error(`LLM index references an unregistered page: ${relative}`);
      }
      return `${routeToken(url)}${fragment}`;
    }
  );
  const targets = [...canonical.matchAll(
    /\.\/(?:llms-full\.txt|(?:[A-Za-z0-9_-]+\/)*(?:#[A-Za-z0-9_-]+)?)/g
  )].map(match => match[0]);

  for (const target of targets) {
    if (target === "./llms-full.txt") continue;
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
  return canonical;
}

export async function validateLlmRoutingPages() {
  const registry = await pageRegistry();
  const report = [];

  for (const relative of routingPages) {
    const url = registry.routes.get(relative);
    if (url === undefined) {
      throw new Error(`LLM routing page is not registered: ${relative}`);
    }
    const source = await readFile(resolve(docsRoot, relative), "utf8");
    const content = sanitizeMarkdown(source);
    const targets = [...source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
      .map(match => match[1]);
    if (new Set(targets).size !== targets.length) {
      throw new Error(`LLM routing page repeats a target: ${relative}`);
    }
    const entry = {
      url,
      bytes: Buffer.byteLength(content),
      lines: content.split("\n").length,
      targets: targets.length
    };
    if (entry.bytes > 12 * 1024) {
      throw new Error(`LLM routing page exceeds 12 KiB: ${relative}`);
    }
    if (entry.lines > 120) {
      throw new Error(`LLM routing page exceeds 120 lines: ${relative}`);
    }
    if (entry.targets > 40) {
      throw new Error(`LLM routing page exceeds 40 targets: ${relative}`);
    }
    report.push(entry);
  }
  return report;
}

export async function buildFullLlmDocumentation() {
  const order = await readFile(pageOrder, "utf8");
  const config = await readFile(siteConfig, "utf8");
  const version = config.match(/^version:\s*(\S+)$/m)?.[1];
  const urls = [...order.matchAll(/^\s*url:\s+(\S+)\s*$/gm)]
    .map(match => match[1]);
  const sections = [];

  for (const url of urls) {
    const file = await pathForUrl(url);
    const markdown = sanitizeMarkdown(await readFile(file, "utf8"), { version });
    sections.push(`<!-- Source: ${url} -->\n\n${markdown}`);
  }

  return [
    "# ggaction Full Documentation",
    "",
    "Generated from the canonical Markdown page order. Do not edit this file directly.",
    "Use ./llms.txt for the concise routing index.",
    "",
    ...sections
  ].join("\n\n") + "\n";
}

export async function generateFullLlmDocumentation() {
  const [concise, full] = await Promise.all([
    buildConciseLlmDocumentation(),
    buildFullLlmDocumentation(),
    validateLlmRoutingPages()
  ]);
  await Promise.all([
    writeFile(conciseOutput, concise),
    writeFile(output, full)
  ]);
  process.stdout.write("generated docs/llms.txt and docs/llms-full.txt\n");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  await generateFullLlmDocumentation();
}
