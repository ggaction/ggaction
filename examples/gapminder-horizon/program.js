import { chart } from "../../src/index.js";

export function createGapminderHorizon(gapminder) {
  return chart()
    .createCanvas({
      width: 760,
      height: 300,
      margin: { top: 78, right: 30, bottom: 58, left: 50 }
    })
    .createData({ values: gapminder })
    .filterData({ id: "kenya", field: "country", oneOf: ["Kenya"] })
    .createAreaMark({ curve: "monotone" })
    .encodeHorizon({
      x: "year",
      y: "life_expect",
      bands: 3,
      baseline: 55,
      palette: { positive: "blues", negative: "reds" }
    })
    .createGuides({
      axes: {
        x: {
          ticksAndLabels: { labels: { offset: 14 } },
          title: { offset: 44 }
        },
        y: false
      }
    })
    .createTitle({
      text: "Kenya Life Expectancy",
      subtitle: "Blue above, red below · three folded bands around 55 years",
      align: "center",
      offset: -3,
      gap: 9.5,
      titleStyle: { fontWeight: 700 },
      subtitleStyle: { fontSize: 13 }
    });
}
