import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "../../../../src/index.js";
import { assertRenderedPNG } from "../../../../test/support/png.js";
import { displayedActionCalls } from "../../../../test/support/visual-variants.js";
import { createMockCanvasContext } from "../../../../test/support/canvas.js";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
process.chdir(root);
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
assert.equal(git("status", "--porcelain", "--", "src", "types", "test",
  "agent_docs/impl/roadmap6/phase3/render-review.mjs"), "",
"Commit executable sources before generating commit-bound review evidence.");
assert.equal(git("rev-parse", "HEAD:src"), "9d3bd5e26b67634851e6009faac4b8c7c9e15002");
assert.equal(git("rev-parse", "HEAD:types"), "25e66ad6bb83ea1481194255e3521d5f2911dbea");
for (const action of ["createPiePlot", "createDensityPlot", "createHorizonPlot"]) {
  assert.equal(typeof chart()[action], "undefined", `${action} is still a Planned contract`);
}
const { visualVariants: pie } = await import("../../../../test/gates/pie-plot/manifest.js");
const { visualVariants: density } = await import("../../../../test/gates/density-plot/manifest.js");
const { visualVariants: horizon } = await import("../../../../test/gates/horizon-plot/manifest.js");
const digest = value => createHash("sha256").update(value).digest("hex");
const hashValue = value => digest(JSON.stringify(value));
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const outputDir = ".artifacts/roadmap6-authoring";
await mkdir(outputDir, { recursive: true });
const output = `${outputDir}/phase3-visual-review.html`;
const overview = `${outputDir}/phase3-visual-overview.png`;
const sheet = createCanvas(1800, 1392);
const context = sheet.getContext("2d");
context.fillStyle = "white";
context.fillRect(0, 0, sheet.width, sheet.height);
const results = [];
const cards = [];
const oraclePaths = {
  "pie-plot": ["test/charts/polar-arcs/reference-values.js"],
  "density-plot": ["test/oracles/gaussian-profile.js"],
  "horizon-plot": ["test/oracles/horizon.js"]
};
const meanings = {
  "count": "Category count A:B = 2:1; 240° and 120°; category legend only.",
  "weighted": "Explicit sum A:B = 5:5; 180° per sector; no axes or grid.",
  "donut": "The same 5:5 partition; inner-radius ratio 0.55 and 2° padding.",
  "vertical": "One Gaussian KDE profile, 61 samples; x = value, y = density; no inferred group color.",
  "grouped": "Two Gaussian KDE profiles, 122 samples; group identity and group color are explicit.",
  "horizontal": "The same two profiles; x = density, y = value; the current y-based horizontal grid remains.",
  "signed": "Seven samples, three bands per sign, six paths and 24 folded rows; x guides only.",
  "temporal": "Seven explicit timestamps; x domain [1000, 2000]; three bands per sign and six paths.",
  "baseline-style": "Baseline 2; bands edited from 2 to 3; final area opacity 0.6 after the initial 0.8."
};

for (const [index, variant] of [...pie, ...density, ...horizon].entries()) {
  assert.equal(variant.userFacing, undefined);
  const program = variant.primitive();
  const targetCalls = displayedActionCalls(variant.callChain);
  const input = targetCalls.find(call => call.op === "createData").args;
  assert.deepEqual(program.semanticSpec.datasets.find(dataset => dataset.id === input.id).values, input.values);
  assert.deepEqual(targetCalls[0].args, { width: variant.width, height: variant.height, margin: 150 });
  const canvasContext = createMockCanvasContext();
  render(program, canvasContext);
  const rendered = await assertRenderedPNG(program, {
    width: variant.width, height: variant.height, colors: variant.colors, regions: variant.regions,
    artifact: { ...variant.artifact, chart: variant.chart, variant: variant.variant, kind: "primitive",
      title: variant.title, userFacingCallChain: variant.callChain }
  });
  const png = await readFile(rendered.output);
  const slice = `test/gates/${variant.chart}`;
  const sources = await Promise.all([
    ...["reference-values.js", "primitive.program.js", "primitive.test.js", "manifest.js", "png.render.js"]
      .map(name => `${slice}/${name}`),
    ...oraclePaths[variant.chart]
  ].map(async path => ({ path, sha256: digest(await readFile(path)) })));
  const primitiveSource = await readFile(`${slice}/primitive.program.js`, "utf8");
  const layer = program.semanticSpec.layers[0];
  results.push({ chart: variant.chart, variant: variant.variant, title: variant.title,
    publicImplementation: "not-implemented", publicParity: "pending-visual-approval-and-implementation",
    userFacingCallChain: variant.callChain, inputSha256: hashValue(input), callChainSha256: digest(variant.callChain),
    sources, logicalWidth: variant.width, logicalHeight: variant.height,
    pixelWidth: rendered.width, pixelHeight: rendered.height, pixelRatio: rendered.pixelRatio,
    semanticSha256: hashValue(program.semanticSpec), graphicSha256: hashValue(program.graphicSpec),
    drawingOrderSha256: hashValue(program.graphicSpec.order), canvasCallsSha256: hashValue(canvasContext.calls),
    primitiveTopLevelTrace: program.trace.children.map(child => ({ op: child.op, args: child.args })),
    semanticResult: { layer, datasets: program.semanticSpec.datasets.map(dataset => ({
      id: dataset.id, source: dataset.source, rowCount: dataset.values?.length, transform: dataset.transform
    })), guides: program.semanticSpec.guides, resolvedScales: program.resolvedScales,
    markConfig: program.markConfigs[layer.id], pathCount: program.graphicSpec.objects[layer.id].items.length },
    meaning: meanings[variant.variant],
    render: { png: rendered.output.slice(root.length), pngSha256: digest(png), pixelSha256: rendered.pixelHash,
      plotRegions: rendered.regionResults.map(region => ({ name: region.name, inkPixels: region.inkPixels,
        colorCounts: Object.fromEntries(region.colorCounts) })) }
  });
  const x = (index % 3) * 600;
  const y = Math.floor(index / 3) * 464;
  context.fillStyle = "#172033";
  context.font = "20px sans-serif";
  context.fillText(`${index + 1}. ${variant.title}`, x + 18, y + 28, 564);
  context.drawImage(await loadImage(png), x, y + 40, 600, 420);
  cards.push(`<article id="${variant.chart}-${variant.variant}"><h2>${index + 1}. ${escape(variant.title)}</h2>
<p>${escape(meanings[variant.variant])}</p><a href="data:image/png;base64,${png.toString("base64")}" download="${variant.chart}-${variant.variant}.png"><img alt="${escape(variant.title)} primitive target" src="data:image/png;base64,${png.toString("base64")}"></a>
<h3>구현할 정확한 public 호출 · 현재 Planned</h3><pre><code>${escape(variant.callChain)}</code></pre>
<details><summary>실제 실행한 primitive source · ${escape(variant.primitive.name)}</summary><pre><code>${escape(primitiveSource)}</code></pre></details>
<p>Primitive: <code>${slice}/primitive.program.js</code><br>Decoded pixel SHA-256: <code>${rendered.pixelHash}</code><br>Plot ink: ${rendered.regionResults.map(region => `${escape(region.name)} ${region.inkPixels.toLocaleString("en-US")} px`).join("; ")}</p></article>`);
}
await writeFile(overview, sheet.toBuffer("image/png"));
await writeFile(output, `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ggaction · Pie, Density, Horizon visual targets</title><style>
body{margin:0;background:#f1f5f9;color:#172033;font:16px/1.65 system-ui,sans-serif}main{max-width:1200px;margin:32px auto;padding:0 24px}h1{font-size:30px}h2{font-size:22px}h3{font-size:16px}article{margin:28px 0;background:white;border-radius:12px;padding:24px}img{display:block;width:100%;height:auto}pre{overflow:auto;padding:18px;background:#f8fafc;font-size:13px}code{font-size:13px}summary{cursor:pointer;font-weight:600}p{overflow-wrap:anywhere}nav{display:flex;flex-wrap:wrap;gap:12px}a{color:#1955a5}
</style><main><h1>Pie · Density · Horizon</h1><p>R6-P3-V · 9개 시각 목표 검토. A 계약은 승인되었고 아래 이미지는 기존 하위 액션으로 실행한 primitive 결과입니다. 세 신규 facade는 아직 구현하지 않았습니다. 각 이미지 아래의 Planned 호출이 앞으로 이 결과를 만들어야 합니다.</p>
<p>Horizon은 band 색 단계를 구분하도록 A의 2점 예시를 7개 관측값으로 구체화했습니다. 기존 2점 수치 검증은 유지합니다. Density의 기본 grid는 가로/세로 모두 현행 y축 기준입니다. Production source와 타입은 변경하지 않았습니다.</p>
<p>Source commit: <code>${git("rev-parse", "HEAD")}</code> · ${process.version} / ${process.platform} / ${process.arch}</p>
<nav>${results.map((entry, index) => `<a href="#${entry.chart}-${entry.variant}">${index + 1}. ${escape(entry.variant)}</a>`).join("")}</nav>${cards.join("\n")}</main></html>`);
const evidence = { version: 1, sourceCommit: git("rev-parse", "HEAD"),
  runtimeSourceTree: git("rev-parse", "HEAD:src"), typesTree: git("rev-parse", "HEAD:types"),
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  newPublicApisImplemented: 0, publicParity: "not-run", output, overview, variants: results };
await writeFile(new URL("visual-results.json", import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ output, overview, variants: results.length, sourceCommit: evidence.sourceCommit,
  newPublicApisImplemented: 0, plotRegions: results.reduce((sum, entry) => sum + entry.render.plotRegions.length, 0) }, null, 2));
