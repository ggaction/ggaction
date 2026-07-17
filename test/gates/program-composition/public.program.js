import { chart, hconcat, vconcat } from "../../../src/index.js";

import { createCompositionGateValues } from "./reference-values.js";

function panel({ id, width, height, items }) {
  return chart()
    .createCanvas({ width, height, margin: 0 })
    .createGraphics({ id, type: "collection", parent: "plot-main" })
    .editGraphics({ target: id, property: "items", value: items });
}

function childPrograms(cars, jobs, gapminder) {
  const values = createCompositionGateValues({ cars, jobs, gapminder });
  const [main, detail] = values.overview.children;
  const trend = values.nested.children.find(child => child.id === "trend");
  return {
    values,
    main: panel({
      id: "scatterContent",
      width: main.width,
      height: main.height,
      items: values.scatterItems
    }),
    detail: panel({
      id: "barContent",
      width: detail.width,
      height: detail.height,
      items: values.barItems
    }),
    trend: panel({
      id: "trendContent",
      width: trend.width,
      height: trend.height,
      items: values.trendItems
    })
  };
}

export function createUnequalHorizontalPublic(cars, jobs, gapminder) {
  const { main, detail } = childPrograms(cars, jobs, gapminder);
  return hconcat({
    id: "overview",
    programs: [
      { id: "main", program: main },
      { id: "detail", program: detail }
    ],
    gap: 20,
    padding: 16
  });
}

export function createNestedDashboardPublic(cars, jobs, gapminder) {
  const { main, detail, trend } = childPrograms(cars, jobs, gapminder);
  const overview = hconcat({
    id: "overview",
    programs: [
      { id: "main", program: main },
      { id: "detail", program: detail }
    ],
    gap: 20,
    padding: 16
  });
  return vconcat({
    id: "dashboard",
    programs: [
      { id: "overview", program: overview },
      { id: "trend", program: trend }
    ],
    gap: 18,
    padding: 14
  });
}
