import { chart } from "../../../src/index.js";
import {
  resolveLabelLayoutOracle,
  resolveLeaderSegment
} from "../../oracles/label-layout.js";
import { LABEL_LAYOUT, createCountryRows } from "./fixture.js";

function labelInputs(base) {
  const points = base.graphicSpec.objects.countries.items;
  const labels = base.graphicSpec.objects.countryLabels.items;
  return labels.map((label, index) => ({
    id: label.id,
    x: label.properties.x,
    y: label.properties.y,
    sourceX: points[index].properties.x,
    sourceY: points[index].properties.y,
    text: label.properties.text,
    fontSize: label.properties.fontSize,
    textAlign: label.properties.textAlign,
    textBaseline: label.properties.textBaseline,
    rotation: label.properties.rotation
  }));
}

export function createGapminderCountryLabelPrimitiveResult(gapminder) {
  const rows = createCountryRows(gapminder);
  const base = chart()
    .createCanvas({
      width: LABEL_LAYOUT.width,
      height: LABEL_LAYOUT.height,
      margin: LABEL_LAYOUT.margin
    })
    .createData({ id: "countries2005", values: rows })
    .createPointMark({
      id: "countries",
      data: "countries2005",
      fill: "#2563eb",
      stroke: "#ffffff",
      strokeWidth: 0.8
    })
    .encodeX({
      target: "countries",
      field: "fertility",
      fieldType: "quantitative",
      scale: { domain: [1.2, 2.15], zero: false }
    })
    .encodeY({
      target: "countries",
      field: "life_expect",
      fieldType: "quantitative",
      scale: { domain: [77.2, 83], zero: false }
    })
    .createTextMark({
      id: "countryLabels",
      fill: "#0f172a",
      fontSize: LABEL_LAYOUT.fontSize,
      align: "left",
      baseline: "middle",
      dx: LABEL_LAYOUT.textDx
    })
    .encodeText({ target: "countryLabels", field: "country" });
  const resolution = resolveLabelLayoutOracle({
    items: labelInputs(base),
    axis: LABEL_LAYOUT.axis,
    padding: LABEL_LAYOUT.padding,
    maxDisplacement: LABEL_LAYOUT.maxDisplacement,
    bounds: LABEL_LAYOUT.plot
  });
  const leaders = resolution.items
    .map(resolveLeaderSegment)
    .filter(Boolean);
  let program = base
    .editGraphics({
      target: "countryLabels",
      property: "x",
      value: resolution.items.map(item => item.x)
    })
    .editGraphics({
      target: "countryLabels",
      property: "y",
      value: resolution.items.map(item => item.y)
    });
  if (leaders.length > 0) {
    program = program
      .createGraphics({
        id: "countryLabelLeaders",
        type: "line",
        length: leaders.length,
        parent: "plot-main",
        before: "countries"
      })
      .editGraphics({
        target: "countryLabelLeaders",
        property: "x1",
        value: leaders.map(line => line.x1)
      })
      .editGraphics({
        target: "countryLabelLeaders",
        property: "y1",
        value: leaders.map(line => line.y1)
      })
      .editGraphics({
        target: "countryLabelLeaders",
        property: "x2",
        value: leaders.map(line => line.x2)
      })
      .editGraphics({
        target: "countryLabelLeaders",
        property: "y2",
        value: leaders.map(line => line.y2)
      })
      .editGraphics({
        target: "countryLabelLeaders",
        property: "stroke",
        value: LABEL_LAYOUT.leader.stroke
      })
      .editGraphics({
        target: "countryLabelLeaders",
        property: "strokeWidth",
        value: LABEL_LAYOUT.leader.strokeWidth
      })
      .editGraphics({
        target: "countryLabelLeaders",
        property: "opacity",
        value: LABEL_LAYOUT.leader.opacity
      });
  }
  program = program
    .createGuides({
      axes: {
        x: { title: { text: "Fertility" } },
        y: { title: { text: "Life expectancy" } }
      },
      grid: { horizontal: true, vertical: true },
      legend: false
    })
    .createTitle({
      text: "Fertility and Life Expectancy",
      subtitle: "Selected countries in 2005"
    });
  return Object.freeze({ base, leaders, program, resolution, rows });
}

export function createGapminderCountryLabelPrimitives(gapminder) {
  return createGapminderCountryLabelPrimitiveResult(gapminder).program;
}
