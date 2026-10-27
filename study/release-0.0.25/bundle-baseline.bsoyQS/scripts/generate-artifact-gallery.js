import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { resolvePngArtifactPath, validateVariantMetadata } from "../test/support/artifact-paths.js";
import { artifactScopeConfig, artifactScopeNames } from "../test/support/artifact-schema.js";

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function displayName(value) {
  return value.split("-").map(part =>
    part.length === 0 ? part : `${part[0].toUpperCase()}${part.slice(1)}`
  ).join(" ");
}

async function directoryNames(root) {
  if (!(await exists(root))) return [];
  return (await readdir(root, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
}

function variantDirectory(root, identity) {
  const config = artifactScopeConfig(identity.scope);
  return path.join(root, ...config.pathKeys.map(key => identity[key]));
}

function relativeArtifactPath(identity, kind) {
  const config = artifactScopeConfig(identity.scope);
  return `./${[
    ...config.pathKeys.map(key => identity[key]),
    `${kind}.png`
  ].join("/")}`;
}

async function collectVariant(root, identity) {
  resolvePngArtifactPath({ artifact: { ...identity, kind: "primitive" } });
  const directory = variantDirectory(root, identity);
  const primitive = path.join(directory, "primitive.png");
  const userFacing = path.join(directory, "user-facing.png");
  const metadataFile = path.join(directory, "variant.json");
  const hasPrimitive = await exists(primitive);
  const hasUserFacing = await exists(userFacing);
  if (!hasPrimitive && !hasUserFacing) return null;
  const id = artifactScopeConfig(identity.scope).pathKeys
    .map(key => identity[key]).join("/");
  if (hasUserFacing && !hasPrimitive) {
    throw new Error(`Artifact ${id} has user-facing.png without primitive.png.`);
  }
  if (!(await exists(metadataFile))) {
    throw new Error(`Artifact ${id} is missing variant.json.`);
  }
  let metadata;
  try {
    metadata = validateVariantMetadata(
      JSON.parse(await readFile(metadataFile, "utf8")),
      identity
    );
  } catch (error) {
    throw new Error(`Invalid artifact metadata for ${id}.`, { cause: error });
  }
  return Object.freeze({
    ...identity,
    title: metadata.title,
    userFacingCallChain: metadata.userFacingCallChain,
    primitive: relativeArtifactPath(identity, "primitive"),
    userFacing: hasUserFacing ? relativeArtifactPath(identity, "user-facing") : null,
    status: hasUserFacing ? "Ready for review" : "Awaiting visual confirmation"
  });
}

export async function collectArtifactVariants({ scope = "charts", root } = {}) {
  const config = artifactScopeConfig(scope);
  const artifactRoot = root ?? config.root;
  const variants = [];
  async function collectLevel(directory, depth, identity) {
    const key = config.pathKeys[depth];
    for (const segment of await directoryNames(directory)) {
      const next = { ...identity, [key]: segment };
      if (depth === config.pathKeys.length - 1) {
        const item = await collectVariant(artifactRoot, next);
        if (item !== null) variants.push(item);
      } else {
        await collectLevel(path.join(directory, segment), depth + 1, next);
      }
    }
  }
  await collectLevel(artifactRoot, 0, { scope });
  return Object.freeze(variants);
}

function renderVariantCard(item) {
  const config = artifactScopeConfig(item.scope);
  const id = config.pathKeys.map(key => item[key]).join("/");
  const ready = item.userFacing !== null;
  const publicFigure = ready
    ? `<figure><figcaption>User-facing</figcaption><img src="${escapeHtml(item.userFacing)}" alt="${escapeHtml(`${id} user-facing`)}"></figure>`
    : `<div class="placeholder"><span>User-facing</span><strong>Waiting for primitive approval</strong></div>`;
  return `<article class="variant">
    <div class="variant-heading"><h4>${escapeHtml(item.title)}</h4><span class="status ${ready ? "ready" : "awaiting"}">${escapeHtml(item.status)}</span></div>
    <code>${escapeHtml(id)}</code>
    <div class="call-chain"><div class="call-chain-label">Target user-facing call chain</div><pre><code>${escapeHtml(item.userFacingCallChain)}</code></pre></div>
    <div class="pair"><figure><figcaption>Primitive</figcaption><img src="${escapeHtml(item.primitive)}" alt="${escapeHtml(`${id} primitive`)}"></figure>${publicFigure}</div>
  </article>`;
}

function renderSections(variants, scope) {
  const config = artifactScopeConfig(scope);
  function renderLevel(items, depth) {
    if (depth === config.groupKeys.length) {
      return items.map(renderVariantCard).join("\n");
    }
    const key = config.groupKeys[depth];
    const groups = new Map();
    for (const item of items) {
      const group = groups.get(item[key]) ?? [];
      group.push(item);
      groups.set(item[key], group);
    }
    return [...groups.entries()].map(([value, children]) => {
      const heading = depth === 0 ? "h2" : "h3";
      return `<section class="group depth-${depth}"><${heading}>${escapeHtml(displayName(value))}</${heading}>${renderLevel(children, depth + 1)}</section>`;
    }).join("\n");
  }
  return renderLevel(variants, 0);
}

export function renderArtifactGallery(variants, { scope = "charts" } = {}) {
  const config = artifactScopeConfig(scope);
  const sections = renderSections(variants, scope);
  const content = sections || `<div class="empty">No ${config.label.toLowerCase()} PNG artifacts yet.</div>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>ggaction ${config.label} Gallery</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#f5f7fb;color:#172033}*{box-sizing:border-box}body{margin:0}header{padding:32px clamp(20px,5vw,72px) 24px;background:#172033;color:#fff}header h1{margin:0 0 8px;font-size:clamp(28px,4vw,42px)}header p{margin:0;color:#cbd5e1}main{width:min(1440px,100%);margin:auto;padding:28px clamp(16px,4vw,56px) 64px}.group{margin-bottom:28px}.group h2,.group h3{margin:18px 0 12px}.variant{padding:20px;margin-bottom:18px;border:1px solid #dce2eb;border-radius:16px;background:#fff;box-shadow:0 8px 28px rgb(23 32 51/7%)}.variant-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.variant h4{margin:0;font-size:19px}code{display:inline-block;margin:8px 0 16px;color:#526078}.call-chain{margin-bottom:18px;overflow:hidden;border:1px solid #dce2eb;border-radius:12px;background:#111827}.call-chain-label{padding:9px 12px;border-bottom:1px solid #334155;color:#cbd5e1;font-size:12px;font-weight:700;text-transform:uppercase}.call-chain pre{margin:0;padding:14px;overflow-x:auto;color:#e2e8f0}.call-chain code{display:inline;margin:0;color:inherit}.status{padding:5px 10px;border-radius:999px;font-size:12px;font-weight:700}.ready{color:#166534;background:#dcfce7}.awaiting{color:#92400e;background:#fef3c7}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}figure,.placeholder{min-width:0;margin:0;padding:12px;border:1px solid #e5e9f0;border-radius:12px;background:#fafbfc}figcaption,.placeholder span{display:block;margin-bottom:10px;color:#526078;font-size:13px;font-weight:700;text-transform:uppercase}img{display:block;width:100%;height:auto;border:1px solid #e5e7eb;background:#fff}.placeholder{min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#64748b}.empty{padding:48px;border:1px dashed #aeb8c8;border-radius:16px;text-align:center;background:#fff;color:#64748b}@media(max-width:760px){.pair{grid-template-columns:1fr}.variant-heading{align-items:flex-start;flex-direction:column}}
</style></head><body><header><h1>${config.label} Gallery</h1><p>Primitive-first chart variants and their user-facing equivalents.</p></header><main>${content}</main></body></html>\n`;
}

export async function generateArtifactGallery({ scope = "charts", root, output } = {}) {
  const config = artifactScopeConfig(scope);
  const artifactRoot = root ?? config.root;
  const galleryOutput = output ?? path.join(artifactRoot, "index.html");
  await mkdir(artifactRoot, { recursive: true });
  const variants = await collectArtifactVariants({ scope, root: artifactRoot });
  await writeFile(galleryOutput, renderArtifactGallery(variants, { scope }));
  return Object.freeze({ output: galleryOutput, variants });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  for (const scope of artifactScopeNames()) {
    const { output, variants } = await generateArtifactGallery({ scope });
    process.stdout.write(`generated ${scope} gallery with ${variants.length} variant(s): ${output}\n`);
  }
}
