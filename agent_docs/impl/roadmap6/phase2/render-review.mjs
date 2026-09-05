import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { visualVariants as series, inputHashes as seriesHashes } from "../../../../test/charts/series-identity/manifest.js";
import { visualVariants as temporal, inputHashes as temporalHashes } from "../../../../test/gates/temporal-input/manifest.js";
import { assertRenderedPNG } from "../../../../test/support/png.js";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
process.chdir(root);
const output = ".artifacts/roadmap6-authoring/visual-review.html";
const digest = value => createHash("sha256").update(value).digest("hex");
const escape = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const results = [];
const cards = [];
for (const variant of [...series, ...temporal]) {
  const render = await assertRenderedPNG(variant.primitive(), {
    width: variant.width, height: variant.height, colors: variant.colors, regions: variant.regions,
    artifact: { ...variant.artifact, chart: variant.chart, variant: variant.variant,
      kind: "primitive", title: variant.title, userFacingCallChain: variant.callChain }
  });
  const png = await readFile(render.output);
  const slice = `test/${variant.userFacing ? "charts" : "gates"}/${variant.chart}`;
  const sourcePaths = ["fixture.js", "reference-values.js", "primitive.program.js", "manifest.js"]
    .map(file => `${slice}/${file}`);
  const sources = await Promise.all(sourcePaths.map(async path => ({ path, sha256: digest(await readFile(path)) })));
  const inputSha256 = (variant.chart === "series-identity" ? seriesHashes : temporalHashes)[variant.variant];
  results.push({ chart: variant.chart, variant: variant.variant,
    logicalWidth: variant.width, logicalHeight: variant.height,
    pixelWidth: render.width, pixelHeight: render.height, pixelRatio: render.pixelRatio,
    inputSha256, callChainSha256: digest(variant.callChain), sources,
    png: render.output.slice(root.length), pngSha256: digest(png), pixelSha256: render.pixelHash,
    plotRegions: render.regionResults.map(region => ({ name: region.name, inkPixels: region.inkPixels })),
    publicImplementation: variant.userFacing ? "implemented" : "approved-awaiting-implementation" });
  cards.push(`<article><h2>${escape(variant.title)}</h2><img alt="${escape(variant.title)}" src="data:image/png;base64,${png.toString("base64")}"><details><summary>승인할 정확한 public action chain</summary><pre><code>${escape(variant.callChain)}</code></pre></details><p>primitive source: <code>${slice}/primitive.program.js</code><br>input SHA-256: <code>${inputSha256}</code></p></article>`);
}
await mkdir(".artifacts/roadmap6-authoring", { recursive: true });
await writeFile(output, `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ggaction: Series and temporal input review</title><style>body{font:16px/1.6 system-ui,sans-serif;margin:0;background:#f1f5f9;color:#172033}main{max-width:1150px;margin:40px auto;padding:0 24px}h1{font-size:28px}article{margin:32px 0;padding:24px;background:white;border-radius:12px}h2{font-size:20px}img{display:block;width:100%;height:auto}pre{padding:20px;background:#f8fafc;overflow:auto;font-size:13px}summary{cursor:pointer;font-weight:600}p{overflow-wrap:anywhere}code{font-size:13px}</style><main><h1>Series identity · Explicit temporal input</h1><p>6개 primitive 목표 이미지와 해당 public 호출안입니다. 새 public API는 아직 구현하지 않았습니다. Line의 분할·스타일은 독립 oracle로 계산했습니다. 시간 primitive는 독립적으로 정규화한 ISO 문자열을 기존 parser에 입력하며, public 목표는 원래 숫자와 temporalUnit을 사용합니다.</p>${cards.join("\n")}</main></html>`);
const evidence = { version: 1,
  runtimeSourceTree: execFileSync("git", ["rev-parse", "HEAD:src"], { encoding: "utf8" }).trim(),
  environment: { node: process.version, platform: process.platform, arch: process.arch },
  variants: results };
await writeFile(new URL("visual-results.json", import.meta.url), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ output, variants: results.length, plotInk: results.map(v => ({ chart: v.chart, variant: v.variant, regions: v.plotRegions })) }, null, 2));
