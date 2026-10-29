import { chart, vconcat } from "../../src/index.js";
import { source, localSource, snapshotSource, palette } from "./data.js";

const canvas = (height = 560, right = 60) => ({ width: 1200, height,
  margin: { top: 95, right, bottom: 65, left: 85 }, background: "#ffffff" });
const title = (program, text, subtitle) => program.createTitle({ text, subtitle, align: "center",
  titleStyle: { fontSize: 22 }, subtitleStyle: { fontSize: 12 } });
const countBy = (rows, field) => {
  const counts = new Map();
  for (const row of rows) counts.set(row[field], (counts.get(row[field]) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
};

function pyramid() {
  const { rows, provenance } = source("tt-coffee-ratings", "Coffee Quality Database · TidyTuesday 2020-07-07", "https://github.com/jldbc/coffee-quality-database");
  const valid = rows.filter(row => Number.isFinite(row.total_cup_points) && row.total_cup_points > 0);
  const thresholds = [0, 80, 82, 84, 86];
  const counts = thresholds.map((threshold, index) => ({ id: String(threshold),
    stage: index === 0 ? "Valid ratings" : `Score ≥ ${threshold}`,
    count: valid.filter(row => row.total_cup_points >= threshold).length }));
  const program = title(chart().createCanvas({ ...canvas(600), margin: { top: 100, right: 210, bottom: 35, left: 210 } })
    .createData({ id: "thresholds", values: counts, keyField: "id" })
    .createPyramidPlot({ stage: "stage", value: "count", gap: 7,
      color: { field: "stage", scale: { range: ["#bfdbfe", "#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8"] } },
      stages: { stroke: "#ffffff", strokeWidth: 2 }, labels: { content: "stage", fontSize: 16 } }),
  "Coffee ratings · nested quality thresholds", counts.map(row => `${row.stage}: ${row.count}`).join("  ·  "));
  return { id: "native-coffee-pyramid", title: "Pyramid · 커피 점수 기준별 표본 수", tag: "신규 · Pyramid · 5 nested thresholds",
    description: "같은 평가 표본에 점수 기준을 차례로 높여 남는 개수를 비교합니다. 단계 폭이 실제 개수에 비례합니다.", program,
    provenance: { ...provenance, usedRows: valid.length,
      transformation: `유한한 양수 점수 ${valid.length}개를 유지하고 0·80·82·84·86점 이상을 각각 집계. 기준별 표본은 중첩되며 단계 합계를 총표본 수로 해석하지 않음. ${counts.map(row => `${row.stage} ${row.count}`).join(", ")}.` } };
}

function prices() {
  const { value, provenance } = snapshotSource("ibm-daily.json");
  const rows = Object.entries(value["Time Series (Daily)"]).sort(([a], [b]) => a.localeCompare(b)).map(([date, row]) => ({
    date, open: Number(row["1. open"]), high: Number(row["2. high"]), low: Number(row["3. low"]),
    close: Number(row["4. close"]), volume: Number(row["5. volume"]) }));
  if (rows.length !== 100 || rows.some(row => ![row.open, row.high, row.low, row.close, row.volume].every(Number.isFinite))) throw new Error("Invalid IBM daily snapshot.");
  const ticks = rows.filter((_, index) => index % 20 === 0 || index === rows.length - 1).map(row => row.date);
  const axes = { x: { ticksAndLabels: { values: ticks }, title: { text: "Trading session · calendar gaps omitted" } }, y: { title: { text: "USD / share" } } };
  const candles = title(chart().createCanvas(canvas(510)).createData({ id: "daily", values: rows, keyField: "date" })
    .createOHLCPlot({ x: { field: "date", fieldType: "ordinal" }, low: "low", high: "high", open: "open", close: "close",
      yScale: { zero: false, nice: true }, width: { pixels: 6 }, body: { upFill: "#0d9488", downFill: "#e11d48", strokeWidth: 0 },
      stem: { stroke: "#475569", strokeWidth: 1 }, guides: { axes, legend: false, grid: { horizontal: true, vertical: false } } }),
  "IBM · 100 observed trading sessions", `${rows[0].date} – ${rows.at(-1).date} · open / high / low / close · teal: close ≥ open`);
  const volume = chart().createCanvas({ ...canvas(240), margin: { top: 30, right: 60, bottom: 65, left: 85 } })
    .createData({ values: rows }).createBarPlot({ x: { field: "date", fieldType: "ordinal" }, y: { field: "volume", aggregate: "sum" },
      bar: { fill: "#94a3b8" }, guides: { axes: { ...axes, y: { title: { text: "Shares traded" } } }, legend: false } });
  return { id: "native-ibm-ohlc", title: "OHLC · IBM 실제 100거래일과 거래량", tag: "신규 · OHLC + volume · 100 sessions",
    description: "각 봉은 실제 일별 시가·고가·저가·종가입니다. 아래 독립 패널에는 같은 날의 거래량을 표시합니다.",
    program: vconcat({ programs: [{ id: "prices", program: candles }, { id: "volume", program: volume }], gap: 10 }),
    provenance: { ...provenance, sourceRows: rows.length, usedRows: rows.length,
      transformation: `공식 공개 demo 응답의 IBM 일별 OHLCV 100행 전체. ${rows[0].date}–${rows.at(-1).date}, 마지막 갱신 ${value["Meta Data"]["3. Last Refreshed"]}. 날짜 오름차순. 휴장일은 봉을 만들지 않음. 원 응답의 as-traded USD 값을 그대로 사용하며 조정 종가를 합성하지 않음. 고정 스냅샷이며 실시간 시세가 아님.` } };
}

function waterfall() {
  const { rows, provenance } = source("tt-global-temperatures", "NASA GISS · TidyTuesday 2023-07-11", "https://data.giss.nasa.gov/gistemp/");
  const selected = rows.map(row => ({ year: Number(row.Year.slice(0, 4)), anomaly: row["J-D"] }))
    .filter(row => row.year >= 2013 && row.year <= 2022 && Number.isFinite(row.anomaly));
  const changes = selected.map((row, index) => ({ id: String(row.year), stage: String(row.year), role: "delta",
    value: index === 0 ? row.anomaly : row.anomaly - selected[index - 1].anomaly }));
  changes.push({ id: "total", stage: "2022 total", role: "total" });
  const program = title(chart().createCanvas(canvas(570)).createData({ values: changes, keyField: "id" })
    .createWaterfallPlot({ x: "stage", role: "role", value: "value", width: { band: .65 },
      labels: { content: "end", format: ".2f", fontSize: 13 },
      guides: { axes: { x: { title: { text: "Initial level, annual changes, final level" } }, y: { title: { text: "Temperature anomaly (°C)" } } }, legend: false } }),
  "Global temperature anomaly · 2013–2022", "First bar: 2013 level · following bars: year-to-year change · labels: cumulative annual level");
  return { id: "native-nasa-waterfall", title: "Waterfall · 연평균 기온 편차의 연도별 변화", tag: "신규 · Waterfall · signed changes + total",
    description: "2013년의 기온 편차에 이후 매년의 증감을 더하면 2022년 관측값에 도달합니다. 변화의 원인에 대한 기여도 분석은 아닙니다.", program,
    provenance: { ...provenance, usedRows: selected.length,
      transformation: `J-D 연평균이 있는 2013–2022년 ${selected.length}행. 첫 값 ${selected[0].anomaly}°C + 인접 연도 차이 9개 = 마지막 값 ${selected.at(-1).anomaly}°C. 월별 값이나 일부 연도 2023은 사용하지 않음.` } };
}

function trail() {
  const { rows, provenance } = localSource("gapminder.json", "Gapminder · repository snapshot");
  const latest = Math.max(...rows.map(row => row.year));
  const countries = rows.filter(row => row.year === latest).sort((a, b) => b.pop - a.pop).slice(0, 8).map(row => row.country);
  const selected = rows.filter(row => countries.includes(row.country)).map(row => ({ ...row,
    id: `${row.country}/${row.year}`, width: 1 + .65 * Math.sqrt(row.pop / 1e6) }));
  const program = title(chart().createCanvas(canvas(620, 190)).createData({ values: selected, keyField: "id" })
    .createTrailPlot({ x: { field: "year", scale: { zero: false, nice: false } },
      y: { field: "life_expect", scale: { zero: false, domain: [25, 85] } }, width: "width", groupBy: "country",
      color: { field: "country", scale: { domain: countries, range: palette.slice(0, 8) } }, body: { opacity: .72 },
      guides: { axes: { x: { title: { text: "Year" }, ticksAndLabels: { labels: { format: ".0f" } } },
        y: { title: { text: "Life expectancy (years)" } } }, legend: { title: "Country" }, grid: { horizontal: true, vertical: false } } }),
  "Life expectancy trajectories · width follows population", "Eight largest 2005 populations in this snapshot · width = 1 + 0.65 × √(population / 1 million) px");
  return { id: "native-gapminder-trail", title: "Trail · 인구에 따라 굵어지는 기대수명 경로", tag: "신규 · Trail · 8 countries × 11 years",
    description: "시간·기대수명·인구를 한 경로에 표현합니다. 위치는 기대수명, 띠의 화면 두께는 명시적으로 변환한 인구입니다.", program,
    provenance: { ...provenance, origin: "https://www.gapminder.org/data/", usedRows: selected.length,
      transformation: `${latest}년 인구 상위 8개국의 1955–2005년 관측 ${selected.length}행. 원래 인구와 기대수명을 유지하고 width=1+0.65×sqrt(pop/1e6) 논리 픽셀을 추가. 국가마다 별도 series. 사이 연도를 새 관측값으로 만들지 않음.` } };
}

function streamgraph() {
  const { rows, provenance } = localSource("cars.json", "Cars · repository snapshot");
  const countries = [...new Set(rows.map(row => row.Origin))].sort();
  const years = [...new Set(rows.map(row => Number(String(row.Year).slice(0, 4))))].sort((a, b) => a - b);
  const counts = years.flatMap(year => countries.map(origin => ({ year, origin,
    count: rows.filter(row => row.Origin === origin && Number(String(row.Year).slice(0, 4)) === year).length })));
  const program = title(chart().createCanvas(canvas(570, 180)).createData({ values: counts })
    .createAreaPlot({ x: { field: "year", scale: { zero: false, nice: false } }, y: "count", groupBy: "origin", layout: "wiggle",
      color: { field: "origin", scale: { domain: countries, range: ["#2563eb", "#f97316", "#0d9488"] } },
      area: { opacity: .9, stroke: "#ffffff", strokeWidth: 1 },
      guides: { axes: { x: { title: { text: "Model year" }, ticksAndLabels: { labels: { format: ".0f" } } },
        y: { title: { text: "Count with moving baseline · thickness is the count" } } }, legend: { title: "Origin" } } }),
  "Cars in the source sample · native wiggle layout", "Thickness is the observed count · the moving baseline minimizes slope and has no independent meaning");
  return { id: "native-cars-streamgraph", title: "Streamgraph · 연도별 자동차 표본의 지역 구성", tag: "신규 · Area wiggle · 3 aligned series",
    description: "차종 표본을 연도·출신 지역별로 세고, 공통 표본 격자 위에서 움직이는 기준선으로 배치했습니다. 판매량 통계가 아닙니다.", program,
    provenance: { ...provenance, usedRows: rows.length,
      transformation: `${rows.length}행 전체를 ${years.length}개 연도 × ${countries.length}개 지역의 ${counts.length}개 count로 집계. 조합의 관측이 없으면 count=0으로 명시. 원본 연비 등 결측은 개수 집계에 필요하지 않아 보존. 가로축 사이 구간은 표시용 연결.` } };
}

function calendar() {
  const { rows, provenance } = source("tt-us-births", "US births · TidyTuesday 2020-02-11", "https://github.com/fivethirtyeight/data/tree/master/births");
  const selected = rows.filter(row => row.year.startsWith("2014")).map(row => ({ ...row,
    date: `2014-${row.month.padStart(2, "0")}-${row.date_of_month.padStart(2, "0")}` }));
  const program = title(chart().createCanvas({ ...canvas(430, 150), margin: { top: 110, right: 150, bottom: 50, left: 70 } })
    .createData({ values: selected, keyField: "date" })
    .createCalendarLayout({ id: "days", date: "date", value: "births", start: "2014-01-01", end: "2014-12-31", timeZone: "UTC", weekStartsOn: 1, aggregate: "sum", missing: "empty" })
    .createCalendarPlot({ color: { type: "sequential", palette: "viridis" }, labels: { week: false }, monthBoundary: { stroke: "#475569", strokeWidth: 1 } })
    .createLegend({ target: "calendar", title: "Births / day" }),
  "US births · every day of 2014", "Monday-first calendar · original daily birth counts · weekends and holidays remain observations");
  return { id: "native-us-births-calendar", title: "Calendar · 미국의 2014년 일별 출생아 수", tag: "신규 · Calendar · 365 actual days",
    description: "365개의 실제 일별 관측을 달력에 배치해 주중·주말과 월별 패턴을 비교합니다.", program,
    provenance: { ...provenance, usedRows: selected.length,
      transformation: `2000–2014년 원본에서 2014년 ${selected.length}행을 선택. 원본 year/month/date_of_month로 ISO civil date를 만들고 UTC, 월요일 시작, daily sum. 원 births 값 사용. 색상은 일별 출생아 수이며 비율이 아님.` } };
}

function contour() {
  const { rows, provenance } = source("tt-penguins", "Palmer Penguins · TidyTuesday 2020-07-28", "https://allisonhorst.github.io/palmerpenguins/");
  const selected = rows.filter(row => Number.isFinite(row.bill_length_mm) && Number.isFinite(row.bill_depth_mm));
  const program = title(chart().createCanvas(canvas(620, 180)).createData({ id: "observations", values: selected })
    .createDensityContourData({ id: "density", data: "observations", x: "bill_length_mm", y: "bill_depth_mm",
      grid: { origin: [30, 12], dx: .5, dy: .25, width: 65, height: 49 }, estimator: "kde", normalization: "count",
      bandwidth: [2, 1], kernel: "gaussian", thresholds: [.02, .1, .3, .6, 1, 2, 4, 8] })
    .createContourMark({ id: "contours", geometry: "density", mode: "filled", color: { type: "sequential", palette: "viridis" },
      x: { domain: [30, 62], nice: false, zero: false }, y: { domain: [12, 24], nice: false, zero: false }, stroke: "#ffffff", strokeWidth: .6 })
    .createGuides({ axes: { x: { title: { text: "Bill length (mm)" } }, y: { title: { text: "Bill depth (mm)" } } }, legend: { title: "Observations / mm²" }, grid: false }),
  "Penguin bill measurements · kernel density contours", "All species together · Gaussian bandwidth 2 mm × 1 mm · eight explicit thresholds");
  return { id: "native-penguins-contour", title: "Contour · 펭귄 부리 측정값의 밀도 등고선", tag: "신규 · Density contours · Gaussian KDE",
    description: "실제 부리 길이·깊이 관측에서 계산한 이변량 밀도입니다. 원래 mm 단위를 유지합니다.", program,
    provenance: { ...provenance, usedRows: selected.length,
      transformation: `부리 길이·깊이 결측 ${rows.length - selected.length}행 제외. ${selected.length}관측 전체에 Gaussian KDE, 대역폭 [2,1]mm. [30,12] 시작, [0.5,0.25]mm 간격 65×49 격자. 임계값 0.02/0.1/0.3/0.6/1/2/4/8 observations/mm². 표본이 있는 구역 바깥은 추정 밀도임.` } };
}

function hierarchyCharts() {
  const { rows, provenance } = source("tt-coffee-ratings", "Coffee Quality Database · TidyTuesday 2020-07-07", "https://github.com/jldbc/coffee-quality-database");
  const countries = countBy(rows.filter(row => row.country_of_origin), "country_of_origin").slice(0, 6).map(([country]) => country);
  const method = row => row.processing_method === "Washed / Wet" ? "Washed / Wet" : row.processing_method === "Natural / Dry" ? "Natural / Dry" : "Other / unrecorded";
  const selected = rows.filter(row => countries.includes(row.country_of_origin)).map(row => ({ ...row, processing_group: method(row), sampleCount: 1 }));
  const overrides = countries.flatMap((country, index) => [{ path: [country], fill: palette[index] },
    ...[...new Set(selected.filter(row => row.country_of_origin === country).map(row => row.processing_group))].map(processing => ({ path: [country, processing], fill: palette[index], opacity: .65 }))]);
  const labels = countries.flatMap(country => [{ path: [country], text: `${country} · ${selected.filter(row => row.country_of_origin === country).length}` },
    ...[...new Set(selected.filter(row => row.country_of_origin === country).map(row => row.processing_group))].map(processing => ({ path: [country, processing], text: `${processing} · ${selected.filter(row => row.country_of_origin === country && row.processing_group === processing).length}` }))]);
  const base = () => chart().createCanvas(canvas(800)).createData({ id: "ratings", values: selected })
    .createHierarchyData({ id: "hierarchy", data: "ratings", groupFields: ["country_of_origin", "processing_group"], value: "sampleCount" });
  const common = { ...provenance, usedRows: selected.length,
    transformation: `국가 기록이 있는 표본 수 상위 6개국의 ${selected.length}행. 각 원본 행의 sampleCount=1을 country→processing group으로 leaf-sum 집계. 가공법은 Washed / Wet, Natural / Dry, Other / unrecorded 3분류. 가격·품질이 아닌 평가 표본 개수. 원본 행과 그룹 경로를 유지.` };
  return [
    { id: "native-coffee-tree", title: "Tree · 커피 원산지와 가공법의 관계", tag: "신규 · Tree · observed grouped hierarchy",
      description: "실제 커피 평가 표본에서 원산지와 가공법의 부모·자식 관계를 만들었습니다.", provenance: common,
      program: title(base().layoutHierarchy({ id: "layout", method: "tree", options: { nodeSize: [0, 0], siblingGap: 34, depthGap: 330, orientation: "horizontal" } })
        .createTreePlot({ nodes: { radius: 5, overrides }, links: { stroke: "#94a3b8", strokeWidth: 1.5 }, labels: { fontSize: 11, offset: [0, 16], overrides: labels } }),
      "Coffee sample hierarchy · origin → processing", "Six most sampled origins · node labels show actual sample counts") },
    { id: "native-coffee-treemap", title: "Treemap · 커피 원산지·가공법별 표본 비중", tag: "신규 · Treemap · squarify",
      description: "같은 계층의 개수를 직사각형 면적으로 비교합니다. 원산지 색상 안에서 가공법별 표본을 나눕니다.", provenance: common,
      program: title(base().layoutHierarchy({ id: "layout", method: "treemap", options: { size: [1040, 630], padding: 24, method: "squarify" } })
        .createTreemapPlot({ cells: { stroke: "white", strokeWidth: 2, overrides }, labels: { fontSize: 11, fill: "#0f172a", overrides: labels } }),
      "Coffee sample counts · nested area partition", "Squarified treemap · each leaf area follows its observed count") },
    ...[false, true].map(polar => ({ id: `native-coffee-${polar ? "sunburst" : "icicle"}`, title: `${polar ? "Sunburst" : "Icicle"} · 같은 커피 계층의 ${polar ? "원형" : "깊이별"} 분할`,
      tag: `신규 · Partition · ${polar ? "sunburst" : "icicle"}`, description: "Tree·Treemap과 동일한 원본 표본과 그룹 합계를 다른 좌표계로 표현합니다.", provenance: common,
      program: title(base().layoutHierarchy({ id: "layout", method: "partition" }).createCoordinate({ id: "partition", type: polar ? "polar" : "cartesian" })
        .createPartitionPlot({ layout: "layout", coordinate: "partition", rootVisible: false, padding: [2, 2],
          ...(polar ? { innerRadius: 30, outerRadius: 300 } : {}), cells: { strokeWidth: 0, overrides }, labels: { fontSize: 11, overrides: labels.map(label => label.path.length === 2 ? { ...label, text: label.text.split(" · ").at(-1) } : label) } }),
      `Coffee hierarchy · ${polar ? "sunburst" : "icicle"}`, "Same records and counts as Tree / Treemap · color identifies origin") }))
  ];
}

function flow() {
  const { rows, provenance } = source("tt-coffee-ratings", "Coffee Quality Database · TidyTuesday 2020-07-07", "https://github.com/jldbc/coffee-quality-database");
  const countries = countBy(rows.filter(row => row.country_of_origin), "country_of_origin").slice(0, 7).map(([country]) => country);
  const nodes = new Map(), edges = new Map();
  const addNode = (id, name, fill) => { if (!nodes.has(id)) nodes.set(id, { id, name, fill }); };
  const addEdge = (from, to, fill) => { const id = JSON.stringify([from, to]); if (!edges.has(id)) edges.set(id, { id, from, to, value: 0, fill }); edges.get(id).value++; };
  for (const row of rows) {
    const species = row.species ?? "Unrecorded species", country = countries.includes(row.country_of_origin) ? row.country_of_origin : "Other / unrecorded origins";
    const processing = ["Washed / Wet", "Natural / Dry"].includes(row.processing_method) ? row.processing_method : "Other / unrecorded processing";
    const color = palette[Math.max(0, countries.indexOf(country)) % palette.length];
    const keys = [`species/${species}`, `country/${country}`, `processing/${processing}`];
    addNode(keys[0], species, "#64748b"); addNode(keys[1], country, color); addNode(keys[2], processing, "#475569");
    addEdge(keys[0], keys[1], color); addEdge(keys[1], keys[2], color);
  }
  const nodeRows = [...nodes.values()], edgeRows = [...edges.values()];
  const program = title(chart().createCanvas({ ...canvas(780), margin: { top: 100, right: 120, bottom: 55, left: 130 } })
    .createData({ id: "nodes", values: nodeRows, keyField: "id" }).createData({ id: "edges", values: edgeRows, keyField: "id" })
    .createFlowData({ id: "flow", nodes: "nodes", edges: "edges", nodeKey: "id", source: "from", target: "to", edgeKey: "id", value: "value", attributes: ["name"], balance: "strict" })
    .layoutFlow({ id: "layout", method: "dag", options: { width: 920, height: 590, nodeWidth: 20, nodePadding: 18, order: "barycentric", iterations: 16 } })
    .createFlowLinks({ links: { opacity: .38, overrides: edgeRows.map(row => ({ key: row.id, fill: row.fill })) } })
    .createFlowNodes({ nodes: { overrides: nodeRows.map(row => ({ key: row.id, fill: row.fill })) }, labels: { content: { field: "name" }, fontSize: 11 } }),
  "Coffee records · species → origin → processing", "Each record contributes one unit through both stages · internal counts balance exactly");
  return { id: "native-coffee-flow", title: "Sankey · 커피 표본의 종→원산지→가공법", tag: "신규 · Flow · balanced observed counts",
    description: "원본 평가 표본 한 개가 두 단계에 각각 한 단위로 기여합니다. 모든 중간 원산지 노드의 유입·유출 개수가 일치합니다.", program,
    provenance: { ...provenance, usedRows: rows.length,
      transformation: `${rows.length}행 전체를 ${nodeRows.length}노드·${edgeRows.length}개 집계 연결로 변환. 원산지 상위 7개 외에는 Other / unrecorded origins, 가공법은 Washed/Wet·Natural/Dry·Other 3분류. 링크 값은 표본 개수이며 생산량이나 실제 물류 이동이 아님. Strict balance로 국가별 유입=유출 검산.` } };
}

function geographic() {
  const { value, provenance } = snapshotSource("earthquakes-2024-01.geojson");
  const land = snapshotSource("land-110m.geojson");
  const features = value.features.filter(feature => feature.properties.type === "earthquake" && Number.isFinite(feature.properties.mag))
    .map(feature => ({ ...feature, properties: { ...feature.properties, depth: feature.geometry.coordinates[2] } }));
  const program = title(chart().createCanvas({ width: 1280, height: 760, margin: { top: 95, left: 35, right: 190, bottom: 45 }, background: "#f8fafc" })
    .createGeometryData({ id: "land", format: "geojson", coordinateKind: "geographic", values: land.value })
    .createGeometryData({ id: "events", format: "geojson", coordinateKind: "geographic", featureKey: "id", values: { type: "FeatureCollection", features } })
    .createProjection({ id: "earth", type: "equirectangular", scalePx: 1000 / (2 * Math.PI), translatePx: [540, 400] })
    .createCoordinate({ id: "map", type: "geo", projection: "earth" })
    .createGraticule({ coordinate: "map", extentDeg: [[-180, -80], [180, 80]], stepDeg: [30, 30], stroke: "#cbd5e1", strokeWidth: .6 })
    .createGeoShapeMark({ geometry: "land", coordinate: "map", fill: "none", stroke: "#94a3b8", strokeWidth: .8 })
    .createGeoPointMark({ id: "earthquakes", geometry: "events", coordinate: "map", opacity: .75, stroke: "#ffffff", strokeWidth: .7 })
    .encodeSize({ target: "earthquakes", field: "mag", scale: { domain: [5, 8], range: [50, 900] } })
    .encodeColor({ target: "earthquakes", field: "depth", fieldType: "quantitative", scale: { palette: "viridis", domain: [0, 650] } })
    .createLegend({ target: "earthquakes", channels: ["color"], title: "Depth (km)" }),
  "Earthquakes · January 2024 · magnitude ≥ 5", "USGS event locations · point area: magnitude 5–8 → 50–900 px² · color: depth 0–650 km");
  return { id: "native-usgs-geographic", title: "Geo · 실제 지진 133건의 위치·규모·깊이", tag: "신규 · Geo · real longitude / latitude",
    description: "관측된 위도·경도를 실제 세계 지도에 투영했습니다. 점의 크기와 색으로 규모와 깊이를 함께 표시합니다.", program,
    provenance: { ...provenance, sourceRows: value.features.length, usedRows: features.length,
      additionalSources: [land.provenance], transformation: `USGS 2024-01-01–2024-02-01 UTC, magnitude≥5의 고정 응답 ${value.features.length}개 중 earthquake이며 규모가 유한한 ${features.length}개. 원 event ID·좌표·규모·깊이를 보존. 경위도는 equirectangular 투영. 해안선 배경은 Natural Earth v5.1.2 1:110m land (${land.value.features.length}features), SHA-256 ${land.provenance.sha256}.` } };
}

function table() {
  const { rows, provenance } = localSource("gapminder.json", "Gapminder · repository snapshot");
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.country)) groups.set(row.country, []);
    groups.get(row.country).push(row);
  }
  const countries = [...groups].map(([country, history]) => {
    history.sort((a, b) => a.year - b.year);
    const last = history.at(-1);
    return { country, life: last.life_expect, fertility: last.fertility, populationMillions: last.pop / 1e6, history };
  });
  const program = title(chart().createCanvas({ width: 1260, height: 1060,
    margin: { top: 105, left: 55, right: 55, bottom: 55 }, background: "#ffffff" })
    .createData({ values: countries, keyField: "country" })
    .createTablePlot({ rowLimit: 20, rowHeight: 38, padding: 7,
      sortBy: [{ field: "populationMillions", order: "descending" }],
      columns: [
        { field: "country", label: "Country", width: 205, footer: "count" },
        { field: "life", label: "Life expectancy", width: 155, cell: { type: "bar", domain: [0, 90] }, format: ".1f", align: "right" },
        { field: "fertility", label: "Births / woman", width: 145, format: ".2f", align: "right" },
        { field: "populationMillions", label: "Population (M)", width: 180, cell: "bar", format: ".1f", align: "right", footer: { op: "sum", format: ".1f" } },
        { field: "history", label: "Life expectancy · 1955–2005", width: 430,
          cell: { type: "sparkline", x: "year", y: "life_expect", xDomain: [1955, 2005], yDomain: [25, 85], resolveY: "shared" } }
      ], labels: { fontSize: 12 }, cells: { stroke: "#e2e8f0", strokeWidth: .6 },
      bars: { fill: "#bfdbfe" }, sparklines: { stroke: "#0d9488", strokeWidth: 2 },
      headerStyle: { fill: "#e2e8f0", color: "#0f172a" }, footerStyle: { fill: "#eff6ff", color: "#0f172a" } }),
  "Country dashboard · values in 2005 + 50-year trajectories", "Top 20 of 62 countries by population · shared sparkline axes · footer: all 62 countries, not only visible rows");
  return { id: "native-gapminder-table", title: "Table · 국가별 수치·막대·50년 추세선", tag: "신규 · Table + bars + sparklines · 62 country records",
    description: "2005년 기대수명·출산율·인구와 11시점의 기대수명 추세를 같은 행에서 비교합니다. 인구순 상위 20개국을 표시하고 전체 62개국 합계를 유지합니다.", program,
    provenance: { ...provenance, origin: "https://www.gapminder.org/data/", usedRows: rows.length,
      transformation: `원본 ${rows.length}행을 ${countries.length}개 국가별 nested history로 묶고 2005년의 원 수치를 열로 노출. 1955–2005년 11관측을 같은 x/y 범위의 sparkline으로 연결. 인구 단위만 백만 명으로 변환. 인구순 20행 표시, 원본 62개국 유지. Footer는 전체 62국의 국가 수와 인구 합계로 세계 전체 인구를 뜻하지 않음.` } };
}

export function* nativeDataCharts() {
  for (const build of [table, pyramid, prices, waterfall, trail, streamgraph, calendar, contour, hierarchyCharts, flow, geographic]) {
    try {
      const result = build();
      for (const item of Array.isArray(result) ? result : [result]) yield { ...item, newType: true };
    } catch (error) { throw new Error(`Native gallery chart ${build.name}: ${error.message}`, { cause: error }); }
  }
}
