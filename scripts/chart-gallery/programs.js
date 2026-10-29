import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chart, vconcat } from "../../src/index.js";
import { tidyTuesdaySourceRows } from "../../test/support/datasets/tidytuesday.js";
import { createCarsOriginScatterplotFacet } from "../../examples/cars-origin-scatterplot-facet/program.js";
import { createCarsOriginHistogramFacet } from "../../examples/cars-origin-histogram-facet/program.js";
import { createCarsRegressionScatterplot } from "../../examples/cars-regression-scatterplot/program.js";

const root = new URL("../../", import.meta.url);
const corpus = JSON.parse(readFileSync(new URL("data/corpus/manifest.json", root)));
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const palette = ["#2563eb", "#f97316", "#10b981", "#a855f7", "#e11d48", "#0891b2", "#ca8a04", "#64748b", "#db2777", "#84cc16", "#7c3aed"];

function source(id, name, origin) {
  const definition = corpus.datasets.find(item => item.id === id);
  if (!definition) throw new Error(`Unknown gallery dataset: ${id}`);
  return { rows: tidyTuesdaySourceRows(id), provenance: {
    name, origin, url: definition.blobUrl, sha256: definition.sha256,
    sourceRows: definition.rows, snapshot: corpus.tidyTuesday.commit
  } };
}

function localSource(filename, name) {
  const bytes = readFileSync(new URL(`data/${filename}`, root));
  const rows = JSON.parse(bytes);
  return { rows, provenance: { name, sourceRows: rows.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    repositoryPath: `data/${filename}` } };
}

function temperature() {
  const { rows, provenance } = source("tt-global-temperatures", "NASA GISS · TidyTuesday 2023-07-11", "https://data.giss.nasa.gov/gistemp/");
  const monthly = rows.flatMap(row => months.flatMap(month => Number.isFinite(row[month])
    ? [{ year: Number(row.Year.slice(0, 4)), month, anomaly: row[month] }] : []));
  const annual = rows.filter(row => Number.isFinite(row["J-D"]))
    .map(row => ({ year: Number(row.Year.slice(0, 4)), anomaly: row["J-D"] }));
  const heatmap = chart().createCanvas({ width: 1100, height: 370,
    margin: { top: 72, right: 150, bottom: 55, left: 70 } })
    .createData({ values: monthly }).createHeatmap({ id: "months",
      x: { field: "year", fieldType: "ordinal" },
      y: { field: "month", fieldType: "ordinal", scale: { domain: months } },
      color: { field: "anomaly", fieldType: "quantitative", scale: { type: "sequential", range: ["#2166ac", "#f7f7f7", "#b2182b"], domain: [-1.4, 1.4] } },
      guides: { axes: { x: { ticksAndLabels: { values: [1880, 1900, 1920, 1940, 1960, 1980, 2000, 2020] }, title: { text: "Year" } },
        y: { title: { text: "Month" } } }, legend: { title: "Anomaly (°C)" } } })
    .createTitle({ text: "Global temperature · 1880–2023", subtitle: "Monthly anomalies; missing observations remain blank", align: "center" });
  let trend = chart().createCanvas({ width: 1100, height: 340,
    margin: { top: 65, right: 150, bottom: 55, left: 70 } })
    .createData({ id: "annual", values: annual })
    .createWindowData({ id: "smooth", source: "annual", sortBy: [{ field: "year" }],
      operations: [{ op: "movingMean", field: "anomaly", as: "decade", frame: { preceding: 9 } }] })
    .createLineMark({ id: "raw", data: "annual", stroke: "#94a3b8", strokeWidth: 1.5 })
    .encodeX({ field: "year", scale: { id: "x", zero: false, nice: false } })
    .encodeY({ field: "anomaly", scale: { id: "y", domain: [-0.6, 1.2], zero: false, nice: false } })
    .createLineMark({ id: "mean", data: "smooth", stroke: "#e11d48", strokeWidth: 3 })
    .encodeX({ field: "year", scale: { id: "x" } })
    .encodeY({ field: "decade", scale: { id: "y" } })
    .createGuides({ axes: { x: { title: { text: "Year" }, ticksAndLabels: { labels: { format: ".0f" } } }, y: { title: { text: "Anomaly (°C)" } } }, legend: false,
      grid: { horizontal: true, vertical: false } })
    .createTitle({ text: "Annual mean + trailing 10-year mean", subtitle: "Gray: annual J-D · red: trailing mean (shorter window at start)", align: "center", titleStyle: { fontSize: 17 } });
  return { id: "nasa-temperature", title: "144년의 기온 변화", tag: "Heatmap + window + line", description: "월별 기온 편차와 연평균·후행 10년 평균을 한 화면에서 비교합니다.",
    provenance: { ...provenance, usedRows: rows.length, observations: monthly.length,
      transformation: `${monthly.length}개 월 관측값으로 펼침. 결측 ${rows.length * 12 - monthly.length}개는 빈칸. 연평균 J-D가 있는 ${annual.length}년만 추세선에 사용. 2023년은 5월까지인 고정 스냅샷.` },
    program: vconcat({ programs: [{ id: "monthly", program: heatmap }, { id: "annual", program: trend }], gap: 12, align: "center" }) };
}

function coffee() {
  const { rows, provenance } = source("tt-coffee-ratings", "Coffee Quality Database · TidyTuesday 2020-07-07", "https://github.com/jldbc/coffee-quality-database");
  const valid = rows.filter(row => row.country_of_origin && Number.isFinite(row.total_cup_points) && row.total_cup_points > 0);
  const counts = new Map();
  for (const row of valid) counts.set(row.country_of_origin, (counts.get(row.country_of_origin) ?? 0) + 1);
  const countries = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8).map(([country]) => country);
  const selected = valid.filter(row => countries.includes(row.country_of_origin));
  const program = chart().createCanvas({ width: 1100, height: 570, margin: { top: 85, right: 35, bottom: 90, left: 75 } })
    .createData({ values: selected }).createRaincloudPlot({ id: "quality",
      category: { field: "country_of_origin", fieldType: "nominal", scale: { domain: countries } },
      value: { field: "total_cup_points", fieldType: "quantitative", scale: { zero: false, nice: true } },
      color: "country_of_origin", density: { bandwidth: 1.3, steps: 56, area: { opacity: 0.3, strokeWidth: 1.2, curve: "monotone" } },
      summary: { type: "box", outliers: false, box: { opacity: 0.7 }, median: { stroke: "#0f172a", strokeWidth: 2 } },
      points: { type: "beeswarm", packing: false, point: { radius: 1.6, opacity: 0.35 } },
      guides: { axes: { x: { title: { text: "Country of origin · ordered by sample count" }, ticksAndLabels: { labels: { maxWidth: 105, wrap: "word" } } },
        y: { title: { text: "Total cup points" } } }, grid: { horizontal: true, vertical: false }, legend: false } })
    .createTitle({ text: "Coffee quality · eight most sampled origins", subtitle: "Density + interquartile range + individual observations", align: "center" });
  return { id: "coffee-raincloud", title: "커피 품질의 분포와 이상치", tag: "Density + box + observations", description: "표본이 많은 8개 생산국의 개별 점·분포 밀도·상자 요약을 겹쳤습니다. 국가 전체 품질의 순위를 뜻하지 않습니다.", program,
    provenance: { ...provenance, usedRows: selected.length, transformation: `원산지 누락 또는 0점 ${rows.length - valid.length}행 제외 후 표본 수 상위 8개국 선택. ${valid.length - selected.length}행은 다른 국가. 대역폭 1.3점. 표본 수: ${countries.map(c => `${c} ${counts.get(c)}`).join(", ")}.` } };
}

function penguins() {
  const { rows, provenance } = source("tt-penguins", "Palmer Penguins · TidyTuesday 2020-07-28", "https://allisonhorst.github.io/palmerpenguins/");
  const selected = rows.filter(row => [row.bill_length_mm, row.bill_depth_mm, row.body_mass_g].every(Number.isFinite));
  const program = chart().createCanvas({ width: 470, height: 430, margin: { top: 45, right: 170, bottom: 65, left: 70 } })
    .createData({ values: selected }).createPointMark({ opacity: 0.6, stroke: "white", strokeWidth: 0.6 })
    .encodeX({ field: "bill_length_mm", scale: { domain: [30, 62], zero: false } })
    .encodeY({ field: "bill_depth_mm", scale: { domain: [12, 23], zero: false } })
    .encodeColor({ field: "species", scale: { domain: ["Adelie", "Chinstrap", "Gentoo"], range: palette.slice(0, 3) } })
    .encodeSize({ field: "body_mass_g" })
    .createGuides({ axes: { x: { title: { text: "Bill length (mm)" } }, y: { title: { text: "Bill depth (mm)" } } }, legend: {} })
    .facet({ field: "island", columns: 3, gap: 24, guides: { legend: "shared" } })
    .createTitle({ text: "Palmer penguins · species, island and body mass", subtitle: "Color: species · point area: body mass · common axis domains", align: "center" });
  return { id: "penguins-facets", title: "섬·종·체중으로 본 펭귄 관측", tag: "Facet + color + size", description: "같은 축 범위의 섬별 패널에 부리 길이·깊이·종·체중을 함께 표현합니다.", program,
    provenance: { ...provenance, usedRows: selected.length, transformation: `부리 길이·깊이·체중 중 결측이 있는 ${rows.length - selected.length}행 제외. 성별 결측은 이 그림에 필요하지 않으므로 유지. 섬별 패널 3개.` } };
}

function food() {
  const { rows, provenance } = source("tt-food-consumption", "nu3 Food Carbon Footprint · TidyTuesday 2020-02-18", "https://www.nu3.de/blogs/nutrition/food-carbon-footprint-index-2018");
  const totals = new Map();
  for (const row of rows) totals.set(row.country, (totals.get(row.country) ?? 0) + row.co2_emmission);
  const countries = [...totals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 18).map(([country]) => country);
  const foods = [...new Set(rows.map(row => row.food_category))];
  const selected = rows.filter(row => countries.includes(row.country));
  const program = chart().createCanvas({ width: 1100, height: 770, margin: { top: 85, right: 260, bottom: 65, left: 135 } })
    .createData({ values: selected }).createBarMark({ id: "foods" })
    .encodeX({ field: "co2_emmission", aggregate: "sum", scale: { nice: true, zero: true } })
    .encodeY({ field: "country", fieldType: "nominal", scale: { domain: countries } })
    .encodeColor({ field: "food_category", layout: "stack", scale: { domain: foods, range: palette } })
    .encodeBarWidth({ band: 0.73 })
    .createGuides({ axes: { x: { title: { text: "Food-related emissions (kg CO2 / person / year)" } }, y: { title: { text: "Country" } } },
      legend: { title: "Food category" }, grid: { horizontal: false, vertical: true } })
    .createTitle({ text: "Food footprint · 18 highest per-capita totals", subtitle: "Eleven food categories; totals describe this source dataset", align: "center" });
  return { id: "food-footprint", title: "식품 11종이 만드는 탄소배출 구성", tag: "Aggregate + rank + stacked bars", description: "130개국 중 1인당 식품 배출 합계 상위 18개국을 선택해 식품별 기여도를 비교합니다.", program,
    provenance: { ...provenance, usedRows: selected.length, transformation: `국가별 co2_emmission 합계로 내림차순 정렬 후 상위 18개국 × 식품 11종 = ${selected.length}행. 국가 전체 총배출량이 아닌 1인당 식품 배출량.` } };
}

function gapminder() {
  const { rows, provenance } = localSource("gapminder.json", "Gapminder · repository snapshot");
  const countries = [...new Set(rows.map(row => row.country))].sort((a, b) => {
    const latest = name => rows.filter(row => row.country === name).sort((x, y) => y.year - x.year)[0].life_expect;
    return latest(b) - latest(a) || a.localeCompare(b);
  });
  const program = chart().createCanvas({ width: 950, height: 1480, margin: { top: 90, right: 165, bottom: 60, left: 150 } })
    .createData({ values: rows }).createHeatmap({ id: "life",
      x: { field: "year", fieldType: "ordinal" }, y: { field: "country", fieldType: "nominal", scale: { domain: countries } },
      color: { field: "life_expect", fieldType: "quantitative", scale: { type: "sequential", palette: "viridis" } },
      guides: { axes: { x: { title: { text: "Year" } }, y: { title: { text: "Country" } } }, legend: { title: "Years of life" } } })
    .createTextMark({ fontSize: 9, align: "center", baseline: "middle", fill: "#ffffff" })
    .encodeText({ field: "life_expect", format: ".0f" })
    .createTitle({ text: "Life expectancy · 62 countries × 11 years", subtitle: "Countries ordered by their final-year life expectancy", align: "center" });
  return { id: "gapminder-matrix", title: "62개국의 50년 기대수명 변화", tag: "682 cells + labels + ordered categories", description: "저장된 62개국 전체를 마지막 연도 기대수명순으로 정렬했습니다. 확대하면 모든 셀의 수치를 읽을 수 있습니다.", program,
    provenance: { ...provenance, origin: "https://www.gapminder.org/data/", usedRows: rows.length,
      transformation: "1955–2005년 5년 간격 11시점. 저장된 682행 모두 사용. 세계 모든 국가를 포함한 표본은 아님. 셀 표시는 정수 반올림, 색상에는 원래 수치 사용." } };
}

function cars() {
  const { rows, provenance } = localSource("cars.json", "Cars · repository snapshot");
  const selected = rows.filter(row => [row.Miles_per_Gallon, row.Horsepower, row.Weight_in_lbs, row.Acceleration].every(Number.isFinite));
  const parallel = chart().createCanvas({ width: 1050, height: 540, margin: { top: 105, right: 165, bottom: 65, left: 75 } })
    .createData({ values: selected.map((row, id) => ({ ...row, id })) }).createParallelCoordinates({
      key: "id", dimensions: [
        { field: "Miles_per_Gallon", title: "MPG", scale: { zero: false, nice: true } },
        { field: "Horsepower", title: "Horsepower", scale: { zero: false, nice: true } },
        { field: "Weight_in_lbs", title: "Weight (lb)", scale: { zero: false, nice: true } },
        { field: "Acceleration", title: "Acceleration", scale: { zero: false, nice: true } }
      ], color: { field: "Origin", fieldType: "nominal", scale: { palette: "tableau10" } },
      line: { strokeWidth: 0.9, opacity: 0.2 } })
    .createTitle({ text: "Cars · four-dimensional measurements", subtitle: `${selected.length} complete observations · color: origin · each axis has its own units`, align: "center" });
  return [
    { id: "cars-parallel", title: "자동차 392대의 네 가지 측정치", tag: "Parallel coordinates · 4 dimensions", description: "연비·출력·중량·가속의 관계를 개별 차량 경로로 봅니다. 같은 모델명이 반복돼도 원본 행을 별도 차량으로 보존합니다.", program: parallel,
      provenance: { ...provenance, usedRows: selected.length, transformation: `네 측정치가 모두 유한한 ${selected.length}행 사용, ${rows.length - selected.length}행 결측 제외. 원본 행 순번을 고유 키로 사용. 축마다 단위·범위가 다름.` } },
    { id: "cars-dashboard", title: "출신 지역별 자동차 비교 대시보드", tag: "Nested facets + histogram + scatter", description: "출력과 연비의 관계, 실린더 수, 배기량 분포를 지역별 패널로 함께 비교합니다.",
      program: vconcat({ programs: [{ id: "scatter", program: createCarsOriginScatterplotFacet(rows) }, { id: "histogram", program: createCarsOriginHistogramFacet(rows) }], align: "center", gap: 25 }),
      provenance: { ...provenance, usedRows: rows.length, transformation: "원본 406행을 각 패널에 전달. 산점도: 출력·연비·실린더·지역 완전 관측 392행. 히스토그램: 배기량·실린더·지역 완전 관측 406행, 명시적 공통 구간 8개. 패널별 결측 제외 기준이 다름." } },
    { id: "cars-regression", title: "가속·배기량 관계와 95% 신뢰구간", tag: "Grouped regression + Student-t bands", description: "일본·미국 차량의 관측점을 크기·모양·색으로 구분하고 지역별 선형 회귀와 신뢰구간을 겹쳤습니다.",
      program: createCarsRegressionScatterplot(rows), provenance: { ...provenance,
        usedRows: rows.filter(row => ["Japan", "USA"].includes(row.Origin)).length,
        transformation: "Japan·USA 행만 표시. 배기량·가속 유효 관측값으로 지역별 선형 회귀, Student-t 95% 평균 신뢰구간. 점 크기는 가속 수치. 예측구간이나 인과관계를 뜻하지 않음." } }
  ];
}

export function* realDataCharts() {
  for (const build of [temperature, coffee, penguins, food, gapminder]) {
    try { yield build(); } catch (error) { throw new Error(`Gallery chart ${build.name}: ${error.message}`, { cause: error }); }
  }
  yield* cars();
}

export const repositoryRoot = fileURLToPath(root);
