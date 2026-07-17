import { chart } from "../../../src/index.js";

import { createCompositionGateValues } from "./reference-values.js";

const ROOT_BACKGROUND = "#ffffff";
const PANEL_BACKGROUND = "#ffffff";

export function createUnequalHorizontalPrimitives(cars, jobs, gapminder) {
  const values = createCompositionGateValues({ cars, jobs, gapminder });
  const [main, detail] = values.overview.children;
  let program = chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: values.overview.width })
    .editGraphics({ target: "canvas", property: "height", value: values.overview.height })
    .editGraphics({ target: "canvas", property: "background", value: ROOT_BACKGROUND })
    .createGraphics({ id: "overview", type: "collection", parent: "canvas" })
    .createGraphics({ id: "mainCanvas", type: "canvas", parent: "overview" });
  program = program
    .editGraphics({ target: "mainCanvas", property: "x", value: main.x })
    .editGraphics({ target: "mainCanvas", property: "y", value: main.y })
    .editGraphics({ target: "mainCanvas", property: "width", value: main.width })
    .editGraphics({ target: "mainCanvas", property: "height", value: main.height })
    .editGraphics({ target: "mainCanvas", property: "background", value: PANEL_BACKGROUND })
    .createGraphics({ id: "mainContent", type: "collection", parent: "mainCanvas" })
    .editGraphics({ target: "mainContent", property: "items", value: values.scatterItems })
    .createGraphics({ id: "detailCanvas", type: "canvas", parent: "overview" });
  return program
    .editGraphics({ target: "detailCanvas", property: "x", value: detail.x })
    .editGraphics({ target: "detailCanvas", property: "y", value: detail.y })
    .editGraphics({ target: "detailCanvas", property: "width", value: detail.width })
    .editGraphics({ target: "detailCanvas", property: "height", value: detail.height })
    .editGraphics({ target: "detailCanvas", property: "background", value: PANEL_BACKGROUND })
    .createGraphics({ id: "detailContent", type: "collection", parent: "detailCanvas" })
    .editGraphics({ target: "detailContent", property: "items", value: values.barItems });
}

export function createNestedDashboardPrimitives(cars, jobs, gapminder) {
  const values = createCompositionGateValues({ cars, jobs, gapminder });
  const [overview, trend] = values.nested.children;
  const [main, detail] = values.overview.children;
  let program = chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({ target: "canvas", property: "width", value: values.nested.width })
    .editGraphics({ target: "canvas", property: "height", value: values.nested.height })
    .editGraphics({ target: "canvas", property: "background", value: ROOT_BACKGROUND })
    .createGraphics({ id: "dashboard", type: "collection", parent: "canvas" })
    .createGraphics({ id: "overviewCanvas", type: "canvas", parent: "dashboard" });
  program = program
    .editGraphics({ target: "overviewCanvas", property: "x", value: overview.x })
    .editGraphics({ target: "overviewCanvas", property: "y", value: overview.y })
    .editGraphics({ target: "overviewCanvas", property: "width", value: overview.width })
    .editGraphics({ target: "overviewCanvas", property: "height", value: overview.height })
    .editGraphics({ target: "overviewCanvas", property: "background", value: ROOT_BACKGROUND })
    .createGraphics({ id: "overviewContent", type: "collection", parent: "overviewCanvas" })
    .createGraphics({ id: "nestedMainCanvas", type: "canvas", parent: "overviewContent" });
  program = program
    .editGraphics({ target: "nestedMainCanvas", property: "x", value: main.x })
    .editGraphics({ target: "nestedMainCanvas", property: "y", value: main.y })
    .editGraphics({ target: "nestedMainCanvas", property: "width", value: main.width })
    .editGraphics({ target: "nestedMainCanvas", property: "height", value: main.height })
    .editGraphics({ target: "nestedMainCanvas", property: "background", value: PANEL_BACKGROUND })
    .createGraphics({ id: "nestedMainContent", type: "collection", parent: "nestedMainCanvas" })
    .editGraphics({
      target: "nestedMainContent",
      property: "items",
      value: values.scatterItems
    })
    .createGraphics({ id: "nestedDetailCanvas", type: "canvas", parent: "overviewContent" });
  program = program
    .editGraphics({ target: "nestedDetailCanvas", property: "x", value: detail.x })
    .editGraphics({ target: "nestedDetailCanvas", property: "y", value: detail.y })
    .editGraphics({ target: "nestedDetailCanvas", property: "width", value: detail.width })
    .editGraphics({ target: "nestedDetailCanvas", property: "height", value: detail.height })
    .editGraphics({ target: "nestedDetailCanvas", property: "background", value: PANEL_BACKGROUND })
    .createGraphics({
      id: "nestedDetailContent",
      type: "collection",
      parent: "nestedDetailCanvas"
    })
    .editGraphics({
      target: "nestedDetailContent",
      property: "items",
      value: values.barItems
    })
    .createGraphics({ id: "trendCanvas", type: "canvas", parent: "dashboard" });
  return program
    .editGraphics({ target: "trendCanvas", property: "x", value: trend.x })
    .editGraphics({ target: "trendCanvas", property: "y", value: trend.y })
    .editGraphics({ target: "trendCanvas", property: "width", value: trend.width })
    .editGraphics({ target: "trendCanvas", property: "height", value: trend.height })
    .editGraphics({ target: "trendCanvas", property: "background", value: PANEL_BACKGROUND })
    .createGraphics({ id: "trendContent", type: "collection", parent: "trendCanvas" })
    .editGraphics({ target: "trendContent", property: "items", value: values.trendItems });
}

export function createReplacementPrimitives(cars, jobs, gapminder) {
  const values = createCompositionGateValues({ cars, jobs, gapminder });
  const [main, detail] = values.replacement.children;
  let program = chart()
    .createGraphics({ id: "canvas", type: "canvas" })
    .editGraphics({
      target: "canvas",
      property: "width",
      value: values.replacement.width
    })
    .editGraphics({
      target: "canvas",
      property: "height",
      value: values.replacement.height
    })
    .editGraphics({ target: "canvas", property: "background", value: ROOT_BACKGROUND })
    .createGraphics({ id: "revisedOverview", type: "collection", parent: "canvas" })
    .createGraphics({ id: "replacementMainCanvas", type: "canvas", parent: "revisedOverview" });
  program = program
    .editGraphics({ target: "replacementMainCanvas", property: "x", value: main.x })
    .editGraphics({ target: "replacementMainCanvas", property: "y", value: main.y })
    .editGraphics({ target: "replacementMainCanvas", property: "width", value: main.width })
    .editGraphics({ target: "replacementMainCanvas", property: "height", value: main.height })
    .editGraphics({ target: "replacementMainCanvas", property: "background", value: PANEL_BACKGROUND })
    .createGraphics({
      id: "replacementMainContent",
      type: "collection",
      parent: "replacementMainCanvas"
    })
    .editGraphics({
      target: "replacementMainContent",
      property: "items",
      value: values.scatterItems
    })
    .createGraphics({
      id: "replacementDetailCanvas",
      type: "canvas",
      parent: "revisedOverview"
    });
  return program
    .editGraphics({ target: "replacementDetailCanvas", property: "x", value: detail.x })
    .editGraphics({ target: "replacementDetailCanvas", property: "y", value: detail.y })
    .editGraphics({ target: "replacementDetailCanvas", property: "width", value: detail.width })
    .editGraphics({ target: "replacementDetailCanvas", property: "height", value: detail.height })
    .editGraphics({ target: "replacementDetailCanvas", property: "background", value: PANEL_BACKGROUND })
    .createGraphics({
      id: "replacementDetailContent",
      type: "collection",
      parent: "replacementDetailCanvas"
    })
    .editGraphics({
      target: "replacementDetailContent",
      property: "items",
      value: values.donutItems
    });
}
