import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderToPNG } from "../src/renderers/png.js";
import { renderToSVG } from "../src/renderers/svg.js";
import { realDataCharts, repositoryRoot } from "./chart-gallery/programs.js";
import { galleryHtml } from "./chart-gallery/template.js";

const output = path.resolve(process.argv[2] ?? path.join(repositoryRoot, ".artifacts/chart-gallery"));
if (!path.basename(output) || output === repositoryRoot) throw new Error("Use a dedicated gallery output directory.");
await mkdir(path.join(output, "assets"), { recursive: true });
const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim();
const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: repositoryRoot, encoding: "utf8" }).trim().length > 0;
const charts = [];
for (const { program, ...item } of realDataCharts()) {
  if (item.provenance.repositoryPath) {
    item.provenance.url = `https://github.com/ggaction/ggaction/blob/${revision}/${item.provenance.repositoryPath}`;
  }
  const png = `assets/${item.id}.png`, svg = `assets/${item.id}.svg`;
  const rendered = await renderToPNG(program, { output: path.join(output, png), pixelRatio: 2 });
  await writeFile(path.join(output, svg), renderToSVG(program, { title: item.title, resourceNamespace: item.id }));
  const files = {};
  for (const relative of [png, svg]) {
    const bytes = await readFile(path.join(output, relative));
    files[relative] = { bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  }
  charts.push({ ...item, kind: "real", png, svg, width: rendered.width / 2, height: rendered.height / 2, files });
  console.log(`${item.id}: ${item.provenance.sourceRows} source rows, ${item.provenance.usedRows} selected rows`);
}

const features = [
  ["tree-layouts", "Tree", "부모·자식 관계의 여러 배치"],
  ["treemap-squarify", "Treemap", "계층 값을 면적으로 표현"],
  ["partition-layouts", "Icicle", "계층 깊이별 직사각형 분할"],
  ["partition-sunburst", "Sunburst", "계층을 원형 구간으로 표현"],
  ["flow-layouts", "Sankey", "흐름 값에 비례하는 연결 두께"],
  ["flow-cyclic", "Cyclic flow", "순환·양방향 흐름"],
  ["contour-holes", "Contour", "구멍이 있는 등고 영역"],
  ["calendar", "Calendar", "윤년 366일의 날짜별 셀"],
  ["edge-routes", "Edge routes", "그래프 간선 경로와 연결 관계"],
  ["structured-paints", "Pattern paint", "기존 도형에 반복 패턴 적용"],
  ["raincloud-plot", "Raincloud", "관측값·분포·상자 요약 결합"],
  ["cars-acceleration-violins", "Violin", "자동차 데이터의 그룹별 분포"],
  ["geographic-marks", "Geo · 도형·점·선", "명시적인 평면 예제 도형과 경로 결합"],
  ["geographic-grid", "Geo · 경위선", "등거리 원통 투영의 경위선"]
];
for (const [id, title, description] of features) {
  const png = `assets/feature-${id}.png`;
  await copyFile(path.join(repositoryRoot, "docs/assets/images", `${id}.png`), path.join(output, png));
  charts.push({ id: `feature-${id}`, title, description, kind: "feature", tag: "기능 예제", png,
    note: id === "cars-acceleration-violins" ? "기존 자동차 데이터 예제. 상세 출처·선택 기준이 있는 새 실제 데이터 차트는 별도 탭에 있습니다." : "렌더링 기능을 확인하는 고정 예제입니다. 실제 현상을 관측한 데이터 분석으로 해석하지 마세요." });
}
const pyramid = process.argv.indexOf("--pyramid");
if (pyramid !== -1) {
  if (!process.argv[pyramid + 1]) throw new Error("--pyramid requires an explicit PNG path.");
  const png = "assets/feature-pyramid.png";
  await copyFile(path.resolve(process.argv[pyramid + 1]), path.join(output, png));
  charts.push({ id: "feature-pyramid", title: "Pyramid · 통합 검증 중", description: "단계 값을 폭으로 표현하는 개발 중 예제", kind: "feature", tag: "통합 검증 중", png,
    note: "명시적으로 제공한 개발 브랜치의 PNG 스냅샷입니다. 현재 main의 완성 기능으로 표시하지 않습니다." });
}
const manifest = { revision, dirty, generatedAt: new Date().toISOString(), renderers: ["Canvas PNG", "SVG"], charts };
await writeFile(path.join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(path.join(output, "index.html"), galleryHtml(manifest));
console.log(`Built ${charts.length} charts into ${output}`);
