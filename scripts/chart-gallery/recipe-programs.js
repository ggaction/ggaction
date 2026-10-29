import { hconcat, vconcat } from "../../src/index.js";
import { createMarginal } from "../../examples/marginal/program.js";
import { createBullet } from "../../examples/bullet/program.js";
import { createLinkedOverlay } from "../../examples/linked-overlay/program.js";
import { source } from "./data.js";

function marginal() {
  const { rows, provenance } = source("tt-penguins", "Palmer Penguins · TidyTuesday 2020-07-28", "https://allisonhorst.github.io/palmerpenguins/");
  const observations = rows.flatMap((row, index) => Number.isFinite(row.bill_length_mm) && Number.isFinite(row.bill_depth_mm)
    ? [{ ...row, id: String(index), sourceRowIndex: index, x: row.bill_length_mm, y: row.bill_depth_mm }] : []);
  const xBins = [30, 34, 38, 42, 46, 50, 54, 58, 62], yBins = [12, 14, 16, 18, 20, 22, 24];
  const counts = (field, bins) => bins.slice(1).map((upper, index) => observations.filter(row =>
    row[field] >= bins[index] && (index === bins.length - 2 ? row[field] <= upper : row[field] < upper)).length);
  const countMax = Math.ceil(Math.max(...counts("x", xBins), ...counts("y", yBins)) / 10) * 10;
  let program = createMarginal(observations, { xDomain: [30, 62], yDomain: [12, 24], xBins, yBins, countDomain: [0, countMax] });
  const center = program.children.lower.children.center
    .editCanvas({ width: 720, height: 540, margin: { left: 90, right: 25, top: 25, bottom: 80 } })
    .encodeRadius({ target: "points", value: 2.5 })
    .editPointMark({ target: "points", opacity: .45 })
    .createGuides({ axes: { x: { title: { text: "Bill length (mm)" } }, y: { title: { text: "Bill depth (mm)" } } }, legend: false });
  const x = program.children.x.editCanvas({ width: 720, height: 180, margin: { left: 90, right: 25, top: 25, bottom: 25 } });
  const y = program.children.lower.children.y.editCanvas({ width: 200, height: 540, margin: { left: 10, right: 30, top: 25, bottom: 80 } });
  program = program.replaceCompositionChild({ target: "lower", program: program.children.lower
    .replaceCompositionChild({ target: "center", program: center }).replaceCompositionChild({ target: "y", program: y }) })
    .replaceCompositionChild({ target: "x", program: x });
  return { id: "native-penguins-marginal", title: "Marginal · 펭귄 부리 관측과 두 주변 분포", tag: "신규 · Marginal · 342 observations + 2 distributions",
    description: "가운데는 같은 펭귄의 부리 길이·깊이, 위와 오른쪽은 각각의 관측 개수입니다. 세 패널이 같은 원행과 위치 범위를 공유합니다.", program,
    provenance: { ...provenance, usedRows: observations.length,
      transformation: `${rows.length}개 원행 중 부리 길이·깊이가 모두 유한한 ${observations.length}개. 원 단위 mm를 유지. x 경계 ${xBins.join(", ")}, y 경계 ${yBins.join(", ")}; 마지막 구간만 오른쪽 경계를 포함. 두 histogram 개수 축은 같은 0–${countMax} 범위. 성별·체중 결측은 이 그림에 필요하지 않아 보존.` } };
}

function bullet() {
  const { rows, provenance } = source("tt-coffee-ratings", "Coffee Quality Database · TidyTuesday 2020-07-07", "https://github.com/jldbc/coffee-quality-database");
  const valid = rows.map((row, index) => ({ ...row, sourceRowIndex: index }))
    .filter(row => row.country_of_origin && Number.isFinite(row.total_cup_points) && row.total_cup_points > 0);
  const groups = new Map();
  for (const row of valid) {
    if (!groups.has(row.country_of_origin)) groups.set(row.country_of_origin, []);
    groups.get(row.country_of_origin).push(row);
  }
  const selected = [...groups].sort(([a, x], [b, y]) => y.length - x.length || a.localeCompare(b)).slice(0, 6);
  const referenceRanges = [{ id: "low", lower: 0, upper: 80, level: "Low" },
    { id: "middle", lower: 80, upper: 85, level: "Middle" }, { id: "high", lower: 85, upper: 100, level: "High" }];
  const panels = selected.map(([country, observations], index) => {
    const actual = observations.reduce((sum, row) => sum + row.total_cup_points, 0) / observations.length;
    const target = Math.max(...observations.map(row => row.total_cup_points));
    return { id: `country-${index}`, program: createBullet([{ id: country, metric: country, actual, target,
      sourceRowIndexes: observations.map(row => row.sourceRowIndex) }], { metric: country, domain: [0, 100], referenceRanges })
      .encodeText({ target: "measure-label", content: "value", format: ".2f" })
      .editCanvas({ width: 540, height: 190, margin: { top: 65, right: 35, bottom: 45, left: 35 } })
      .editTitle({ text: `${country} · ${observations.length} samples`, subtitle: `Mean ${actual.toFixed(2)} · observed maximum ${target.toFixed(2)}`,
        titleStyle: { fontSize: 17 }, subtitleStyle: { fontSize: 12 } }) };
  });
  const program = vconcat({ programs: [0, 2, 4].map(index => ({ id: `row-${index / 2}`,
    program: hconcat({ programs: panels.slice(index, index + 2), gap: 24 }) })), gap: 12 });
  return { id: "native-coffee-bullet", title: "Bullet · 커피 원산지별 평균과 관측 최댓값", tag: "신규 · Bullet · 6 origins · observed mean / maximum",
    description: "파란 막대는 표본 평균, 검은 선은 같은 표본의 최댓값입니다. 배경 구간은 0–80·80–85·85–100점의 명시적인 비교 눈금입니다.", program,
    provenance: { ...provenance, usedRows: selected.reduce((sum, [, observations]) => sum + observations.length, 0),
      transformation: `국가와 유한한 양수 점수가 있는 ${valid.length}행 중 표본 수 상위 6개 원산지. 각 패널은 원 점수의 평균과 실제 최댓값을 사용하며 원행 index를 유지. 목표 선은 사업 목표나 모집단 추정값이 아니라 해당 표본의 최댓값. 배경 경계 0·80·85·100은 이 그림에서 선택한 눈금이며 등급 인증을 뜻하지 않음. 모든 패널은 같은 0–100 범위.` } };
}

function combo() {
  const { rows, provenance } = source("tt-us-births", "US births · TidyTuesday 2020-02-11", "https://github.com/fivethirtyeight/data/tree/master/births");
  const selected = rows.filter(row => row.year.startsWith("2014"));
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthly = names.map((month, index) => {
    const days = selected.filter(row => Number(row.month) === index + 1);
    const births = days.reduce((sum, row) => sum + row.births, 0);
    return { month, births, sales: births, observedDays: days.length };
  });
  const upper = Math.ceil(Math.max(...monthly.map(row => row.births)) / 50000) * 50000;
  const program = createLinkedOverlay()
    .editCanvas({ plot: { width: 1045, height: 425 }, margin: { top: 105, right: 55, bottom: 70, left: 100 } })
    .editYScale({ target: "bars", domain: [0, upper], nice: false })
    .reviseData({ source: "data", id: "monthly-births", values: monthly })
    .editXAxis({ title: { text: "Month of 2014" } })
    .editYAxis({ title: { text: "Observed births / month" } })
    .editTitle({ text: "US births · monthly totals in 2014", subtitle: "Bars and linked line show the same counts · one shared y scale · no second-axis rescaling",
      titleStyle: { fontSize: 23 }, subtitleStyle: { fontSize: 13 } });
  return { id: "native-us-births-combo", title: "Combo · 월별 출생아 막대와 연결 추세선", tag: "신규 · Combo · native linked overlay · 12 monthly totals",
    description: "365개의 일별 관측을 월별로 합산했습니다. 막대와 선은 같은 출생아 수와 y축을 공유하며, 선은 각 막대의 끝점을 연결합니다.", program,
    provenance: { ...provenance, usedRows: selected.length,
      transformation: `2014년 일별 ${selected.length}행을 원 month로 12개 월 합계로 집계. 월별 관측 일수 ${monthly.map(row => `${row.month}:${row.observedDays}`).join(", ")}. 월 길이를 보정한 일평균이 아닌 월 총출생아 수. canonical linked-overlay 예제의 기존 sales 필드에 동일한 births 합계를 넣고 표시 축을 출생아 수로 명시. 추정·보간한 일별 값은 없으며 선은 동일 월 합계의 표시용 연결.` } };
}

export function* recipeDataCharts() {
  for (const build of [marginal, bullet, combo]) yield { ...build(), newType: true };
}
