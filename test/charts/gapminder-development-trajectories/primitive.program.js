import { chart } from "../../../src/index.js";
import { mapLinear } from "../../oracles/numeric.js";
import { orderPathRows } from "../../oracles/path-order.js";
import { linearPathCommands } from "../../support/path.js";
import {
  TRAJECTORY_COUNTRIES,
  TRAJECTORY_LAYOUT,
  createTrajectoryRows
} from "./fixture.js";

function trajectoryCommands(series) {
  return series.map(item => linearPathCommands(item.rows.map(row => ({
    x: mapLinear(
      row.fertility,
      TRAJECTORY_LAYOUT.xDomain,
      [TRAJECTORY_LAYOUT.plot.left, TRAJECTORY_LAYOUT.plot.right]
    ),
    y: mapLinear(
      row.life_expect,
      TRAJECTORY_LAYOUT.yDomain,
      [TRAJECTORY_LAYOUT.plot.bottom, TRAJECTORY_LAYOUT.plot.top]
    )
  }))));
}

export function createDevelopmentTrajectoryPrimitiveResult(gapminder) {
  const rows = createTrajectoryRows(gapminder);
  const series = orderPathRows(rows, {
    field: "year",
    order: "ascending",
    groupBy: ["country"]
  });
  const base = chart()
    .createCanvas({
      width: TRAJECTORY_LAYOUT.width,
      height: TRAJECTORY_LAYOUT.height,
      margin: TRAJECTORY_LAYOUT.margin
    })
    .createData({ values: rows })
    .createLineMark({ id: "trajectories", strokeWidth: 3 })
    .encodeX({
      target: "trajectories",
      field: "fertility",
      scale: { domain: TRAJECTORY_LAYOUT.xDomain, zero: false }
    })
    .encodeY({
      target: "trajectories",
      field: "life_expect",
      scale: { domain: TRAJECTORY_LAYOUT.yDomain, zero: false }
    })
    .encodeColor({
      target: "trajectories",
      field: "country",
      fieldType: "nominal",
      scale: {
        domain: TRAJECTORY_COUNTRIES,
        range: TRAJECTORY_LAYOUT.colors
      }
    })
    .createGuides({
      axes: {
        x: { title: { text: "Fertility" } },
        y: { title: { text: "Life expectancy" } }
      },
      grid: { horizontal: true, vertical: true },
      legend: { title: "Country", position: "right" }
    })
    .createTitle({
      text: "Development Trajectories",
      subtitle: "Fertility and life expectancy, 1955–2005"
    });
  const automaticCommands = base.graphicSpec.objects.trajectories.items.map(
    item => item.properties.commands
  );
  const commands = trajectoryCommands(series);
  const program = base
    .editSemantic({
      property: "layer[trajectories].encoding.pathOrder.field",
      value: "year"
    })
    .editSemantic({
      property: "layer[trajectories].encoding.pathOrder.fieldType",
      value: "quantitative"
    })
    .editSemantic({
      property: "layer[trajectories].encoding.pathOrder.order",
      value: "ascending"
    })
    .editGraphics({
      target: "trajectories",
      property: "commands",
      value: commands
    });

  return Object.freeze({ automaticCommands, commands, program, rows, series });
}

export function createDevelopmentTrajectoryPrimitives(gapminder) {
  return createDevelopmentTrajectoryPrimitiveResult(gapminder).program;
}
