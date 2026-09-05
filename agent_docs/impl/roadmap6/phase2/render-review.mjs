import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { visualVariants as series, inputHashes as seriesHashes } from "../../../../test/charts/series-identity/manifest.js";
import { visualVariants as temporal, inputHashes as temporalHashes } from "../../../../test/charts/temporal-input/manifest.js";
import { assertRenderedPNG } from "../../../../test/support/png.js";
import { assertDisplayedProgram } from "../../../../test/support/visual-variants.js";
import { assertChartProgramsEquivalent } from "../../../../test/support/chart-equivalence.js";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
process.chdir(root);
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const sourceStatus = git("status", "--porcelain", "--", "src", "test", "examples",
  "agent_docs/impl/roadmap6/phase2/render-review.mjs");
assert.equal(sourceStatus, "", "Commit executable sources before generating commit-bound evidence.");
const output = ".artifacts/roadmap6-authoring/visual-review.html";
const digest = value => createHash("sha256").update(value).digest("hex");
const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const results = [];
const cards = [];
for (const variant of [...series, ...temporal]) {
  const primitive = variant.primitive();
  const publicProgram = variant.userFacing();
  assertDisplayedProgram(variant, publicProgram);
  assertChartProgramsEquivalent({ publicProgram, primitiveProgram: primitive,
    compareSemanticSpec: variant.compareSemanticSpec });
  const renderOptions = kind => ({
    width: variant.width, height: variant.height, colors: variant.colors, regions: variant.regions,
    artifact: { ...variant.artifact, chart: variant.chart, variant: variant.variant,
      kind, title: variant.title, userFacingCallChain: variant.callChain }
  });
  const rendered = await Promise.all([
    assertRenderedPNG(primitive, renderOptions("primitive")),
    assertRenderedPNG(publicProgram, renderOptions("user-facing"))
  ]);
  assert.equal(rendered[1].pixelHash, rendered[0].pixelHash,
    `${variant.chart}/${variant.variant} decoded pixel parity`);
  const pngs = await Promise.all(rendered.map(render => readFile(render.output)));
  const slice = `test/charts/${variant.chart}`;
  const sourcePaths = [
    ...["fixture.js", "reference-values.js", "primitive.program.js", "primitive.test.js", "manifest.js", "public.test.js"]
      .map(file => `${slice}/${file}`),
    ...["data.js", "program.js"].map(file => `examples/${variant.chart}/${file}`)
  ];
  const sources = await Promise.all(sourcePaths.map(async path => ({ path, sha256: digest(await readFile(path)) })));
  const inputSha256 = (variant.chart === "series-identity" ? seriesHashes : temporalHashes)[variant.variant];
  results.push({ chart: variant.chart, variant: variant.variant,
    logicalWidth: variant.width, logicalHeight: variant.height,
    pixelWidth: rendered[0].width, pixelHeight: rendered[0].height, pixelRatio: rendered[0].pixelRatio,
    inputSha256, callChainSha256: digest(variant.callChain), sources,
    exactGraphics: true, exactDrawingOrder: true, exactCanvasCalls: true, displayedTrace: true,
    sameRunDecodedPixels: true,
    renders: rendered.map((render, index) => ({ kind: index === 0 ? "primitive" : "user-facing",
      png: render.output.slice(root.length), pngSha256: digest(pngs[index]), pixelSha256: render.pixelHash,
      plotRegions: render.regionResults.map(region => ({ name: region.name, inkPixels: region.inkPixels })) })),
    publicImplementation: "implemented" });
  cards.push(`<article><h2>${escape(variant.title)}</h2><div class="pair">${pngs.map((png, index) => `<figure><figcaption>${index === 0 ? "Primitive target" : "Public actions"}</figcaption><img alt="${escape(variant.title)} ${index === 0 ? "primitive" : "public"}" src="data:image/png;base64,${png.toString("base64")}"></figure>`).join("")}</div><p>GraphicSpec · drawing order · Canvas calls · decoded pixels: 일치</p><details><summary>검증한 정확한 public action chain</summary><pre><code>${escape(variant.callChain)}</code></pre></details><p>primitive: <code>${slice}/primitive.program.js</code><br>public: <code>examples/${variant.chart}/program.js</code><br>input SHA-256: <code>${inputSha256}</code></p></article>`);
}
await mkdir(".artifacts/roadmap6-authoring", { recursive: true });
await writeFile(output, `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ggaction: Verified series and temporal inputs</title><style>body{font:16px/1.6 system-ui,sans-serif;margin:0;background:#f1f5f9;color:#172033}main{max-width:1600px;margin:40px auto;padding:0 24px}h1{font-size:28px}article{margin:32px 0;padding:24px;background:white;border-radius:12px}h2{font-size:20px}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}figure{margin:0}figcaption{font-weight:600}img{display:block;width:100%;height:auto}pre{padding:20px;background:#f8fafc;overflow:auto;font-size:13px}summary{cursor:pointer;font-weight:600}p{overflow-wrap:anywhere}code{font-size:13px}@media(max-width:900px){.pair{grid-template-columns:1fr}}</style><main><h1>Series identity · Explicit temporal input</h1><p>승인된 6개 primitive 목표와 구현한 public action 결과입니다. 같은 실행의 모든 쌍에서 실제 graphics·그리기 순서·Canvas 호출·decoded pixels가 일치하며 plot 영역의 ink를 확인했습니다. 시간 primitive는 독립적으로 정규화한 ISO 문자열을 사용하고 public은 원래 숫자와 temporalUnit을 사용합니다. Series의 identity·appearance와 temporal의 정규화 의미는 각 public.test.js에서 별도로 검증합니다.</p><p>검증 source: <code>${git("rev-parse", "HEAD")}</code></p>${cards.join("\n")}</main></html>`);
const evidence = { version: 1,
  runtimeSourceCommit: git("rev-parse", "HEAD"), runtimeSourceTree: git("rev-parse", "HEAD:src"),
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  variants: results };
await writeFile(new URL("public-visual-results.json", import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
for (const chart of ["series-identity", "temporal-input"]) {
  await rm(`.artifacts/test/png/review/${chart}`, { recursive: true, force: true });
}
console.log(JSON.stringify({ output, variants: results.length,
  runtimeSourceCommit: evidence.runtimeSourceCommit, exactPairs: true }, null, 2));
