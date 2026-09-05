import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { chart, render } from "../../../../src/index.js";
import { visualVariants as pie } from "../../../../test/charts/pie-plot/manifest.js";
import { visualVariants as density } from "../../../../test/charts/density-plot/manifest.js";
import { visualVariants as horizon } from "../../../../test/charts/horizon-plot/manifest.js";
import { assertRenderedPNG } from "../../../../test/support/png.js";
import { assertDisplayedProgram, displayedActionCalls } from "../../../../test/support/visual-variants.js";
import { assertChartProgramsEquivalent } from "../../../../test/support/chart-equivalence.js";
import { createMockCanvasContext } from "../../../../test/support/canvas.js";
import { assertVectorParity } from "../../../../test/support/vector-parity.js";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
process.chdir(root);
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
assert.equal(git("status", "--porcelain", "--", "src", "types", "test", "examples", "knowledge", "package-lock.json",
  "agent_docs/impl/roadmap6/phase3/render-public-review.mjs"), "",
"Commit executable sources before generating commit-bound public evidence.");
for (const action of ["createPiePlot", "createDensityPlot", "createHorizonPlot"]) {
  assert.equal(typeof chart()[action], "function");
}
const digest = value => createHash("sha256").update(value).digest("hex");
const hashValue = value => digest(JSON.stringify(value));
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const outputDir = ".artifacts/roadmap6-authoring";
await mkdir(outputDir, { recursive: true });
const output = `${outputDir}/phase3-public-review.html`;
const overview = `${outputDir}/phase3-public-overview.png`;
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
  count: "Category count A:B = 2:1; 240° and 120°; category legend only.",
  weighted: "Explicit sum A:B = 5:5; 180° per sector; no axes or grid.",
  donut: "The same 5:5 partition; inner-radius ratio 0.55 and 2° padding.",
  vertical: "One Gaussian KDE profile, 61 samples; x = value, y = density; no inferred group color.",
  grouped: "Two Gaussian KDE profiles, 122 samples; group identity and color are explicit.",
  horizontal: "The same two profiles; x = density, y = value; the existing horizontal grid remains.",
  signed: "Seven samples, three bands per sign, six paths and 24 folded rows; x guides only.",
  temporal: "Explicit timestamps; x domain [1000, 2000]; three bands per sign and six paths.",
  "baseline-style": "Baseline 2; bands revised from 2 to 3; final opacity 0.6 after the initial 0.8."
};

for (const [index, variant] of [...pie, ...density, ...horizon].entries()) {
  const primitive = variant.primitive();
  const program = variant.userFacing();
  assertDisplayedProgram(variant, program);
  assertChartProgramsEquivalent({ publicProgram: program, primitiveProgram: primitive });
  const targetCalls = displayedActionCalls(variant.callChain);
  const input = targetCalls.find(call => call.op === "createData").args;
  assert.deepEqual(program.semanticSpec.datasets.find(dataset => dataset.id === input.id).values, input.values);
  const canvasContext = createMockCanvasContext();
  render(program, canvasContext);
  const rendered = await Promise.all([primitive, program].map((candidate, renderIndex) => assertRenderedPNG(candidate, {
    width: variant.width, height: variant.height, colors: variant.colors, regions: variant.regions,
    artifact: { ...variant.artifact, chart: variant.chart, variant: variant.variant,
      kind: renderIndex === 0 ? "primitive" : "user-facing", title: variant.title, userFacingCallChain: variant.callChain }
  })));
  assert.equal(rendered[0].pixelHash, rendered[1].pixelHash, `${variant.chart}/${variant.variant} pixel parity`);
  await assertVectorParity(variant);
  const pngs = await Promise.all(rendered.map(result => readFile(result.output)));
  const slice = `test/charts/${variant.chart}`;
  const sourcePaths = [
    ...["reference-values.js", "primitive.program.js", "primitive.test.js", "manifest.js", "public.test.js", "png.render.js", "vector.render.js"]
      .map(name => `${slice}/${name}`),
    ...["data.js", "program.js"].map(name => `examples/${variant.chart}/${name}`),
    ...oraclePaths[variant.chart]
  ];
  const sources = await Promise.all(sourcePaths.map(async path => ({ path, sha256: digest(await readFile(path)) })));
  const layer = program.semanticSpec.layers[0];
  const entry = { chart: variant.chart, variant: variant.variant, title: variant.title,
    publicImplementation: "implemented", userFacingCallChain: variant.callChain,
    inputSha256: hashValue(input), callChainSha256: digest(variant.callChain), sources,
    logicalWidth: variant.width, logicalHeight: variant.height,
    pixelWidth: rendered[1].width, pixelHeight: rendered[1].height, pixelRatio: rendered[1].pixelRatio,
    exactSemanticSpec: true, exactGraphics: true, exactDrawingOrder: true, exactCanvasCalls: true,
    displayedTrace: true, sameRunDecodedPixels: true, exactSVG: true, exactDecodedPDFStreams: true,
    semanticSha256: hashValue(program.semanticSpec), graphicSha256: hashValue(program.graphicSpec),
    drawingOrderSha256: hashValue(program.graphicSpec.order), canvasCallsSha256: hashValue(canvasContext.calls),
    publicTopLevelTrace: program.trace.children.map(child => ({ op: child.op, args: child.args })),
    semanticResult: { layer, datasets: program.semanticSpec.datasets.map(dataset => ({
      id: dataset.id, source: dataset.source, rowCount: dataset.values?.length, transform: dataset.transform
    })), guides: program.semanticSpec.guides, resolvedScales: program.resolvedScales,
    markConfig: program.markConfigs[layer.id], pathCount: program.graphicSpec.objects[layer.id].items.length },
    meaning: meanings[variant.variant],
    renders: rendered.map((result, renderIndex) => ({ kind: renderIndex === 0 ? "primitive" : "user-facing",
      png: result.output.slice(root.length), pngSha256: digest(pngs[renderIndex]), pixelSha256: result.pixelHash,
      plotRegions: result.regionResults.map(region => ({ name: region.name, inkPixels: region.inkPixels,
        colorCounts: Object.fromEntries(region.colorCounts) })) })) };
  results.push(entry);
  const x = (index % 3) * 600;
  const y = Math.floor(index / 3) * 464;
  context.fillStyle = "#172033";
  context.font = "20px sans-serif";
  context.fillText(`${index + 1}. ${variant.title}`, x + 18, y + 28, 564);
  context.drawImage(await loadImage(pngs[1]), x, y + 40, 600, 420);
  cards.push(`<article id="${variant.chart}-${variant.variant}"><h2>${index + 1}. ${escape(variant.title)}</h2>
<p>${escape(entry.meaning)}</p><div class="pair">${pngs.map((png, i) => `<figure><figcaption>${i === 0 ? "Primitive target" : "Public actions"}</figcaption><img alt="${escape(variant.title)} ${i === 0 ? "primitive" : "public"}" src="data:image/png;base64,${png.toString("base64")}"></figure>`).join("")}</div>
<p>SemanticSpec · graphicSpec · draw order · Canvas calls · decoded pixels · SVG · PDF streams: 모두 일치</p>
<h3>검증한 정확한 public 호출</h3><pre><code>${escape(variant.callChain)}</code></pre>
<p>Primitive: <code>${slice}/primitive.program.js</code><br>Public: <code>examples/${variant.chart}/program.js</code><br>Decoded pixel SHA-256: <code>${rendered[1].pixelHash}</code></p></article>`);
}
await writeFile(overview, sheet.toBuffer("image/png"));
await writeFile(output, `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ggaction · Verified Pie, Density, Horizon</title><style>
body{margin:0;background:#f1f5f9;color:#172033;font:16px/1.65 system-ui,sans-serif}main{max-width:1600px;margin:32px auto;padding:0 24px}h1{font-size:30px}h2{font-size:22px}h3{font-size:16px}article{margin:28px 0;background:white;border-radius:12px;padding:24px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}figcaption{font-weight:600}img{display:block;width:100%;height:auto}pre{overflow:auto;padding:18px;background:#f8fafc;font-size:13px}code{font-size:13px}p{overflow-wrap:anywhere}nav{display:flex;flex-wrap:wrap;gap:12px}a{color:#1955a5}@media(max-width:900px){.pair{grid-template-columns:1fr}}
</style><main><h1>Pie · Density · Horizon</h1><p>승인된 9개 시각 목표와 구현한 public 액션을 같은 실행에서 비교했습니다. 모든 쌍의 의미·그래픽·그리기 순서·Canvas 호출·decoded pixels와 SVG·PDF streams가 일치합니다. 차트별 독립 수치 oracle와 실제 plot 영역의 ink·색상을 함께 검증합니다.</p>
<p>Phase 3 X와 bundle 상한 조정 승인은 별도입니다. 이 화면은 구현 결과와 시각 동등성의 증거입니다.</p>
<p>Source commit: <code>${git("rev-parse", "HEAD")}</code> · ${process.version} / ${process.platform} / ${process.arch}</p>
<nav>${results.map((entry, index) => `<a href="#${entry.chart}-${entry.variant}">${index + 1}. ${escape(entry.variant)}</a>`).join("")}</nav>${cards.join("\n")}</main></html>`);
const evidence = { version: 1, sourceCommit: git("rev-parse", "HEAD"),
  runtimeSourceTree: git("rev-parse", "HEAD:src"), typesTree: git("rev-parse", "HEAD:types"), testTree: git("rev-parse", "HEAD:test"),
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  newPublicApisImplemented: 3, exactPairs: 9, output, overview, variants: results };
await writeFile(new URL("public-visual-results.json", import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
for (const chart of ["pie-plot", "density-plot", "horizon-plot"]) {
  await rm(`.artifacts/test/png/review/${chart}`, { recursive: true, force: true });
}
console.log(JSON.stringify({ output, overview, variants: results.length, sourceCommit: evidence.sourceCommit,
  newPublicApisImplemented: 3, exactPairs: 9, plotRegions: results.reduce((sum, entry) => sum + entry.renders[1].plotRegions.length, 0) }, null, 2));
