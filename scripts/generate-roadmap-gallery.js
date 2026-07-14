import { access, mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  ROADMAP2_ARTIFACT_ROOT,
  resolvePngArtifactPath
} from "../test/support/artifact-paths.js";

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

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
    .sort(compareText);
}

export async function collectRoadmap2Variants(
  root = ROADMAP2_ARTIFACT_ROOT
) {
  const variants = [];
  for (const chart of await directoryNames(root)) {
    for (const variant of await directoryNames(path.join(root, chart))) {
      resolvePngArtifactPath({
        artifact: { roadmap: "roadmap2", chart, variant, kind: "primitive" }
      });
      const primitive = path.join(root, chart, variant, "primitive.png");
      const userFacing = path.join(root, chart, variant, "user-facing.png");
      const hasPrimitive = await exists(primitive);
      const hasUserFacing = await exists(userFacing);
      if (!hasPrimitive && !hasUserFacing) continue;
      if (hasUserFacing && !hasPrimitive) {
        throw new Error(
          `Roadmap 2 artifact ${chart}/${variant} has user-facing.png without primitive.png.`
        );
      }

      variants.push(Object.freeze({
        chart,
        variant,
        primitive: `./${chart}/${variant}/primitive.png`,
        userFacing: hasUserFacing
          ? `./${chart}/${variant}/user-facing.png`
          : null,
        status: hasUserFacing
          ? "Ready for equivalence review"
          : "Awaiting visual confirmation"
      }));
    }
  }
  return Object.freeze(variants);
}

export function renderRoadmap2Gallery(variants) {
  const groups = new Map();
  for (const variant of variants) {
    const items = groups.get(variant.chart) ?? [];
    items.push(variant);
    groups.set(variant.chart, items);
  }

  const sections = [...groups.entries()].map(([chart, items]) => {
    const cards = items.map(item => {
      const ready = item.userFacing !== null;
      const publicFigure = ready
        ? `<figure><figcaption>User-facing</figcaption><img src="${escapeHtml(item.userFacing)}" alt="${escapeHtml(`${chart} ${item.variant} user-facing`)}"></figure>`
        : `<div class="placeholder"><span>User-facing</span><strong>Waiting for primitive approval</strong></div>`;
      return `<article class="variant">
        <div class="variant-heading">
          <h3>${escapeHtml(displayName(item.variant))}</h3>
          <span class="status ${ready ? "ready" : "awaiting"}">${escapeHtml(item.status)}</span>
        </div>
        <code>${escapeHtml(`${chart}/${item.variant}`)}</code>
        <div class="pair">
          <figure><figcaption>Primitive</figcaption><img src="${escapeHtml(item.primitive)}" alt="${escapeHtml(`${chart} ${item.variant} primitive`)}"></figure>
          ${publicFigure}
        </div>
      </article>`;
    }).join("\n");
    return `<section>
      <h2>${escapeHtml(displayName(chart))}</h2>
      ${cards}
    </section>`;
  }).join("\n");

  const content = sections || `<div class="empty">No Roadmap 2 PNG artifacts yet.</div>`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ggaction Roadmap 2 Gallery</title>
  <style>
    :root { color-scheme: light; font-family: Inter, ui-sans-serif, system-ui, sans-serif; background: #f5f7fb; color: #172033; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    header { padding: 32px clamp(20px, 5vw, 72px) 24px; background: #172033; color: white; }
    header h1 { margin: 0 0 8px; font-size: clamp(28px, 4vw, 42px); }
    header p { margin: 0; color: #cbd5e1; }
    main { width: min(1440px, 100%); margin: 0 auto; padding: 28px clamp(16px, 4vw, 56px) 64px; }
    section { margin-bottom: 36px; }
    section > h2 { margin: 0 0 14px; font-size: 24px; }
    .variant { padding: 20px; margin-bottom: 18px; border: 1px solid #dce2eb; border-radius: 16px; background: white; box-shadow: 0 8px 28px rgb(23 32 51 / 7%); }
    .variant-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .variant h3 { margin: 0; font-size: 19px; }
    code { display: inline-block; margin: 8px 0 16px; color: #526078; }
    .status { padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
    .status.ready { color: #166534; background: #dcfce7; }
    .status.awaiting { color: #92400e; background: #fef3c7; }
    .pair { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
    figure, .placeholder { min-width: 0; margin: 0; padding: 12px; border: 1px solid #e5e9f0; border-radius: 12px; background: #fafbfc; }
    figcaption, .placeholder span { display: block; margin-bottom: 10px; color: #526078; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
    img { display: block; width: 100%; height: auto; border: 1px solid #e5e7eb; background: white; }
    .placeholder { min-height: 220px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; color: #64748b; }
    .placeholder span { margin: 0 0 10px; }
    .empty { padding: 48px; border: 1px dashed #aeb8c8; border-radius: 16px; text-align: center; background: white; color: #64748b; }
    @media (max-width: 760px) { .pair { grid-template-columns: 1fr; } .variant-heading { align-items: flex-start; flex-direction: column; } }
  </style>
</head>
<body>
  <header>
    <h1>Roadmap 2 Visual Gallery</h1>
    <p>Primitive-first chart variants and their user-facing equivalents.</p>
  </header>
  <main>${content}</main>
</body>
</html>
`;
}

export async function generateRoadmap2Gallery({
  root = ROADMAP2_ARTIFACT_ROOT,
  output = path.join(root, "index.html")
} = {}) {
  await mkdir(root, { recursive: true });
  const variants = await collectRoadmap2Variants(root);
  await writeFile(output, renderRoadmap2Gallery(variants));
  return Object.freeze({ output, variants });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const { output, variants } = await generateRoadmap2Gallery();
  process.stdout.write(
    `generated Roadmap 2 gallery with ${variants.length} variant(s): ${output}\n`
  );
}
