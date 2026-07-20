import { loadGapminder } from "../../support/data.js";
import { defineVisualVariant } from "../../support/visual-variants.js";

import { createGapminderHorizonPrimitives } from "./primitive.program.js";
import { createGapminderHorizon } from "./public.program.js";
import {
  HORIZON_COLORS,
  HORIZON_LAYOUT
} from "./reference-values.js";

const gapminder = loadGapminder();

export const horizonTargetCallChain = `chart()
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
  });`;

export const visualVariants = Object.freeze([
  defineVisualVariant({
    chart: "gapminder-horizon",
    variant: "kenya-life-expectancy",
    title: "Kenya Life Expectancy Horizon",
    callChain: horizonTargetCallChain,
    artifact: { capability: "horizon" },
    primitive: () => createGapminderHorizonPrimitives(gapminder),
    userFacing: () => createGapminderHorizon(gapminder),
    width: HORIZON_LAYOUT.width,
    height: HORIZON_LAYOUT.height,
    colors: [
      HORIZON_COLORS.negative[0],
      HORIZON_COLORS.negative[1],
      ...HORIZON_COLORS.positive
    ],
    regions: [{
      name: "folded horizon bands",
      x: 50,
      y: 78,
      width: 680,
      height: 164,
      minimumInkPixels: 800
    }]
  })
]);
