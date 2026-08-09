import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const cardsArtifact = JSON.parse(readFileSync(
  path.join(root, "knowledge/action-cards.json"),
  "utf8"
));
const taxonomy = JSON.parse(readFileSync(
  path.join(root, "knowledge/intent-taxonomy.json"),
  "utf8"
));

const cards = new Map(cardsArtifact.cards.map(card => [card.name, card]));
const constraints = new Map(taxonomy.constraints.map(constraint => [constraint.id, constraint]));
const mainRuntimeImports = Object.freeze(["hconcat", "vconcat", "render"]);
const rendererImports = Object.freeze({
  renderToSVG: Object.freeze({ entry: "ggaction/svg", output: "svg" }),
  renderToPNG: Object.freeze({ entry: "ggaction/png", output: "png" }),
  renderToPDF: Object.freeze({ entry: "ggaction/pdf", output: "pdf" })
});
const authoringPrerequisiteNames = Object.freeze(["createCanvas", "createData"]);
const authoringCanvasOptions = Object.freeze({
  width: "800",
  height: "600",
  margin: "{ top: 140, right: 220, bottom: 120, left: 260 }"
});
const facadeGuideOwners = new Set([
  "createScatterPlot",
  "createLinePlot",
  "createBarPlot",
  "createBoxPlot",
  "createGradientPlot",
  "createViolinPlot"
]);
const standaloneGuideNames = new Set([
  "createAxes",
  "createXAxis",
  "createYAxis",
  "createGrid",
  "createLegend",
  "createGuides"
]);
const docsResourceByDecision = Object.freeze({
  "chart.type": "ggaction://docs/choose-chart-type",
  "renderer.format": "ggaction://docs/choose-renderer",
  "query.intent": "ggaction://docs/getting-started"
});

export class TaskPacketBudgetError extends Error {
  constructor(bytes) {
    super(`Compact task packet is ${bytes} bytes; the hard ceiling is 6144 bytes.`);
    this.name = "TaskPacketBudgetError";
    this.bytes = bytes;
  }
}

function unique(values) {
  return [...new Set(values)];
}

function normalize(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function phraseOccurrences(query, phrase) {
  const normalizedPhrase = normalize(phrase);
  const paddedQuery = ` ${query} `;
  const paddedPhrase = ` ${normalizedPhrase} `;
  const occurrences = [];
  let offset = 0;
  while (offset < paddedQuery.length) {
    const start = paddedQuery.indexOf(paddedPhrase, offset);
    if (start === -1) break;
    occurrences.push({ start: start + 1, end: start + paddedPhrase.length - 1 });
    offset = start + 1;
  }
  return occurrences;
}

function exactActionNames(query) {
  return cardsArtifact.cards
    .filter(card => new RegExp(
      `(?:^|[^A-Za-z0-9])${card.name}(?:$|[^A-Za-z0-9])`,
      "i"
    ).test(query))
    .map(card => card.name);
}

function semanticMatchResult(normalizedQuery) {
  const occurrences = taxonomy.constraints.flatMap(constraint =>
    constraint.phrases.flatMap(phrase =>
      phraseOccurrences(normalizedQuery, phrase).map(span => ({ constraint, ...span }))
    )
  );
  const visible = occurrences.filter(occurrence =>
    !occurrences.some(candidate =>
      candidate.constraint.shadows?.includes(occurrence.constraint.id) &&
      candidate.start <= occurrence.start &&
      candidate.end >= occurrence.end
    )
  );
  const matched = taxonomy.constraints.filter(constraint =>
    visible.some(occurrence => occurrence.constraint.id === constraint.id)
  );
  const positions = new Map(matched.map(constraint => [
    constraint.id,
    Math.min(...visible
      .filter(occurrence => occurrence.constraint.id === constraint.id)
      .map(occurrence => occurrence.start))
  ]));
  return { matched, positions };
}

function orderForCard(card) {
  if (card.name === "createCanvas") return 10;
  if (card.name === "createData") return 20;
  if (card.name.endsWith("Data")) return 30;
  if (card.domain === "charts" || (card.domain === "marks" && card.name.startsWith("create"))) return 40;
  if (card.domain === "encodings") {
    if (/^encode(X|Y|X2|Y2|XRange|YRange|Theta|R|Radius|ParallelCoordinates)/.test(card.name)) return 50;
    if (card.name === "encodeGroup" || card.name === "encodePathOrder") return 52;
    return 55;
  }
  if (card.domain === "statistics") return 60;
  if (["axes", "grid", "legend_and_title"].includes(card.domain)) return 70;
  if (card.domain === "mark-selection") return 75;
  if (card.domain === "composition" || /^(layout|jitter|order|replace)/.test(card.name)) return 80;
  return 65;
}

function exactProvider(name, matchedIds) {
  const card = cards.get(name);
  const related = taxonomy.providers
    .filter(provider => provider.kind === "action" && provider.name === name)
    .map(provider => ({
      provider,
      coverage: provider.covers.filter(constraint => matchedIds.has(constraint)).length
    }))
    .filter(entry => entry.coverage > 0)
    .sort((left, right) =>
      right.coverage - left.coverage ||
      left.provider.order - right.provider.order ||
      left.provider.id.localeCompare(right.provider.id)
    )[0]?.provider;

  if (!related) {
    return {
      id: `exact.${name}`,
      kind: "action",
      name,
      order: orderForCard(card),
      anchors: [`action.${name}`],
      covers: [`action.${name}`],
      exactCall: card.snippet,
      exactOptionNames: card.options
        .filter(option => new RegExp(`\\b${option.name}\\s*:`).test(card.snippet))
        .map(option => option.name)
    };
  }
  return {
    ...related,
    id: `exact.${name}`,
    anchors: [`action.${name}`],
    covers: unique([
      `action.${name}`,
      ...related.covers.filter(constraint => matchedIds.has(constraint))
    ])
  };
}

function conflictResult(matched) {
  const byGroup = new Map();
  for (const constraint of matched) {
    if (!constraint.exclusiveGroup) continue;
    const group = byGroup.get(constraint.exclusiveGroup) ?? [];
    group.push(constraint);
    byGroup.set(constraint.exclusiveGroup, group);
  }
  const blocked = new Set();
  const unresolved = [];
  for (const [group, entries] of byGroup) {
    if (entries.length < 2) continue;
    for (const entry of entries) blocked.add(entry.id);
    for (const entry of entries) {
      unresolved.push({
        constraint: entry.id,
        reason: `This conflicts within ${group}: ${entries.map(candidate => candidate.id).join(", ")}.`,
        resources: ["ggaction://docs/legend-layout"]
      });
    }
  }
  return { blocked, unresolved };
}

function candidateProviders(supportedIds, exactNames) {
  const candidates = taxonomy.providers.filter(provider =>
    provider.anchors.some(anchor => supportedIds.has(anchor))
  );
  for (const name of exactNames) candidates.push(exactProvider(name, supportedIds));
  return candidates;
}

function selectProviders(supportedIds, providers) {
  const uncovered = new Set(supportedIds);
  const selected = [];
  while (uncovered.size > 0) {
    const ranked = providers
      .filter(provider => !selected.some(entry => entry.provider.id === provider.id))
      .map(provider => ({
        provider,
        coverage: provider.covers.filter(constraint => uncovered.has(constraint))
      }))
      .filter(entry => entry.coverage.length > 0)
      .sort((left, right) =>
        right.coverage.length - left.coverage.length ||
        left.provider.order - right.provider.order ||
        left.provider.id.localeCompare(right.provider.id)
      );
    if (ranked.length === 0) break;
    const winner = ranked[0];
    selected.push(winner);
    for (const constraint of winner.coverage) uncovered.delete(constraint);
  }
  return { selected, uncovered };
}

function adaptProviderDependencies(selected) {
  let adapted = selected;
  const hasStoredSelection = selected.some(entry => entry.provider.name === "selectMarks");
  if (hasStoredSelection) {
    adapted = adapted.map(entry => {
      if (entry.provider.name !== "highlightMarks") return entry;
      return {
        ...entry,
        provider: {
          ...entry.provider,
          baseOptions: {
            selection: "\"selection-1\"",
            color: "\"#f28e2b\""
          }
        }
      };
    });
  }

  const hasRegression = adapted.some(entry =>
    entry.provider.name === "createRegression" && !entry.provider.id.startsWith("exact.")
  );
  const hasPointSource = adapted.some(entry =>
    ["createPointMark", "createScatterPlot"].includes(entry.provider.name)
  );
  if (hasRegression && !hasPointSource) {
    const point = taxonomy.providers.find(provider => provider.name === "createPointMark");
    if (!point) throw new Error("createRegression requires the createPointMark provider.");
    adapted = [{ provider: point, coverage: [] }, ...adapted];
  }
  const legendLayout = adapted.find(entry =>
    entry.provider.name === "editLegendLayout" &&
    entry.coverage.some(constraint => constraint.startsWith("layout.legend."))
  );
  if (legendLayout) {
    const owner = adapted.find(entry =>
      entry.coverage.includes("guide.legend") &&
      (
        entry.provider.name === "createLegend" ||
        entry.provider.optionsByConstraint?.["guide.legend"]?.guides !== undefined
      )
    );
    if (owner) {
      const position = legendLayout.provider.baseOptions?.position;
      if (position === undefined) {
        throw new Error(`${legendLayout.provider.id} lacks a legend position.`);
      }
      const layoutConstraints = legendLayout.coverage.filter(constraint =>
        constraint.startsWith("layout.legend.")
      );
      adapted = adapted.filter(entry => entry !== legendLayout).map(entry => {
        if (entry !== owner) return entry;
      const provider = entry.provider.name === "createLegend"
          ? {
              ...entry.provider,
              baseOptions: {
                ...(entry.provider.baseOptions ?? {}),
                position,
                ...(position === `"left"` ? { offset: "96" } : {})
              }
            }
          : {
              ...entry.provider,
              optionsByConstraint: {
                ...(entry.provider.optionsByConstraint ?? {}),
                "guide.legend": {
                  ...(entry.provider.optionsByConstraint?.["guide.legend"] ?? {}),
                  guides: `{ legend: { position: ${position}${position === `"left"` ? ", offset: 96" : ""} } }`
                }
              }
            };
        return {
          provider,
          coverage: [...entry.coverage, ...layoutConstraints]
        };
      });
    }
  }
  return adapted;
}

function withBaseOptions(entry, options) {
  return {
    ...entry,
    provider: {
      ...entry.provider,
      baseOptions: { ...(entry.provider.baseOptions ?? {}), ...options }
    }
  };
}

function dependencyEntry(name, baseOptions, coverage = []) {
  const card = cards.get(name);
  if (!card) throw new Error(`Unknown runtime dependency action ${name}.`);
  return {
    provider: {
      id: `action.${name}`,
      kind: "action",
      name,
      order: orderForCard(card),
      anchors: [],
      covers: [],
      baseOptions
    },
    coverage
  };
}

function absorbFacadeGuides(entries) {
  const owner = entries.find(entry =>
    !entry.provider.id.startsWith("exact.") &&
    facadeGuideOwners.has(entry.provider.name)
  );
  if (!owner) return entries;
  const guides = entries.filter(entry =>
    !entry.provider.id.startsWith("exact.") &&
    standaloneGuideNames.has(entry.provider.name)
  );
  if (guides.length === 0) return entries;
  const guideCoverage = guides.flatMap(entry => entry.coverage);
  return entries
    .filter(entry => !guides.includes(entry))
    .map(entry => entry === owner
      ? {
          ...entry,
          coverage: unique([...entry.coverage, ...guideCoverage])
        }
      : entry);
}

function replaceEntry(entries, target, replacements) {
  const index = entries.indexOf(target);
  if (index === -1) return entries;
  return [
    ...entries.slice(0, index),
    ...replacements,
    ...entries.slice(index + 1)
  ];
}

function orderInheritedTextOverlay(entries) {
  const semantic = name => entries.find(entry =>
    entry.provider.name === name && !entry.provider.id.startsWith("exact.")
  );
  const point = semantic("createPointMark");
  const text = semantic("createTextMark");
  const textEncoding = semantic("encodeText");
  const pointEncodingNames = new Set([
    "encodeX",
    "encodeY",
    "encodeColor",
    "encodeSize",
    "encodeShape",
    "encodeAngle",
    "encodeOpacity"
  ]);
  const pointEncodings = entries.filter(entry =>
    !entry.provider.id.startsWith("exact.") &&
    pointEncodingNames.has(entry.provider.name)
  );
  if (
    !point ||
    !text ||
    !textEncoding ||
    !pointEncodings.some(entry => entry.provider.name === "encodeX") ||
    !pointEncodings.some(entry => entry.provider.name === "encodeY")
  ) return entries;

  const ordered = [point, ...pointEncodings, text, textEncoding];
  const controlled = new Set(ordered);
  const first = Math.min(...ordered.map(entry => entries.indexOf(entry)));
  const insertion = entries
    .slice(0, first)
    .filter(entry => !controlled.has(entry)).length;
  const remaining = entries.filter(entry => !controlled.has(entry));
  return [
    ...remaining.slice(0, insertion),
    ...ordered,
    ...remaining.slice(insertion)
  ];
}

function orderBarCategoryBeforeMeasure(entries) {
  const bar = entries.find(entry =>
    entry.provider.name === "createBarMark" &&
    !entry.provider.id.startsWith("exact.")
  );
  if (!bar) return entries;
  const barIndex = entries.indexOf(bar);
  const nextMarkIndex = entries.findIndex((entry, index) =>
    index > barIndex &&
    !entry.provider.id.startsWith("exact.") &&
    entry.provider.name.startsWith("create") &&
    (entry.provider.name.endsWith("Mark") || entry.provider.name.endsWith("Plot"))
  );
  const limit = nextMarkIndex === -1 ? entries.length : nextMarkIndex;
  const positions = entries.slice(barIndex + 1, limit).filter(entry =>
    ["encodeX", "encodeY"].includes(entry.provider.name) &&
    !entry.provider.id.startsWith("exact.")
  );
  const categorical = positions.find(entry =>
    ['"nominal"', '"ordinal"', '"temporal"'].includes(
      entry.provider.baseOptions?.fieldType
    )
  );
  const quantitative = positions.find(entry =>
    entry.provider.baseOptions?.fieldType === '"quantitative"'
  );
  if (
    !categorical ||
    !quantitative ||
    entries.indexOf(categorical) < entries.indexOf(quantitative)
  ) return entries;
  const reordered = [...entries];
  const categoricalIndex = reordered.indexOf(categorical);
  const quantitativeIndex = reordered.indexOf(quantitative);
  reordered[quantitativeIndex] = categorical;
  reordered[categoricalIndex] = quantitative;
  return reordered;
}

function closeRuntimeDependencies(entries) {
  let closed = absorbFacadeGuides(entries);
  const semantic = name => closed.find(entry =>
    entry.provider.name === name && !entry.provider.id.startsWith("exact.")
  );

  const explicitData = semantic("createData");
  if (explicitData) {
    closed = closed.map(entry => entry === explicitData
      ? withBaseOptions(entry, { values: "values" })
      : entry);
  }
  const explicitCanvas = semantic("createCanvas");
  if (explicitCanvas) {
    closed = closed.map(entry => entry === explicitCanvas
      ? withBaseOptions(entry, authoringCanvasOptions)
      : entry);
  }

  const scatter = semantic("createScatterPlot");
  if (scatter) {
    closed = closed.map(entry => entry === scatter
      ? withBaseOptions(entry, {
          x: `{ field: "x", fieldType: "quantitative" }`,
          y: `{ field: "y", fieldType: "quantitative" }`
        })
      : entry);
  }

  const line = semantic("createLinePlot");
  const lineOpacity = semantic("encodeOpacity");
  if (line && lineOpacity) {
    closed = closed
      .filter(entry => entry !== lineOpacity)
      .map(entry => entry === line
        ? {
            ...withBaseOptions(entry, { line: "{ opacity: 0.8 }" }),
            coverage: unique([...entry.coverage, ...lineOpacity.coverage])
          }
        : entry);
  }

  const barPlot = semantic("createBarPlot");
  if (barPlot) {
    const hasColorScale = semantic("createScale")?.provider.id === "action.createColorScale";
    const color = `{ field: "category", scale: { id: "color-scale" } }`;
    closed = closed.map(entry => {
      if (entry !== barPlot) return entry;
      const configured = withBaseOptions(entry, {
        x: `{ field: "category", fieldType: "nominal" }`,
        y: `{ field: "value", fieldType: "quantitative" }`,
        ...(hasColorScale ? { color } : {})
      });
      return hasColorScale
        ? {
            ...configured,
            provider: {
              ...configured.provider,
              optionsByConstraint: {
                ...(configured.provider.optionsByConstraint ?? {}),
                "encoding.color": { color }
              }
            }
          }
        : configured;
    });
  }

  const timeUnitData = semantic("createTimeUnitData");
  const timeUnitBar = semantic("createBarPlot");
  if (timeUnitData && timeUnitBar) {
    closed = closed.map(entry => entry === timeUnitBar
      ? withBaseOptions(entry, {
          data: `"monthly"`,
          x: `{ field: "month", fieldType: "ordinal" }`,
          y: `{ field: "value", fieldType: "quantitative" }`
        })
      : entry);
  }

  const boxOwner = semantic("createBoxPlot");
  if (boxOwner) {
    closed = closed.map(entry => entry === boxOwner
      ? withBaseOptions(entry, {
          x: `{ field: "category", fieldType: "nominal" }`,
          y: `{ field: "value", fieldType: "quantitative" }`
        })
      : entry);
  }

  const windowData = semantic("createWindowData");
  const windowLine = semantic("createLinePlot");
  if (windowData && windowLine) {
    const timeScale = semantic("createScale")?.provider.id === "action.createTimeScale";
    closed = closed.map(entry => entry === windowLine
      ? withBaseOptions(entry, {
          data: `"windowed"`,
          x: timeScale
            ? `{ field: "date", fieldType: "temporal", scale: { id: "scale-1" } }`
            : `{ field: "x", fieldType: "quantitative" }`,
          y: `{ field: "movingMean", fieldType: "quantitative" }`
        })
      : entry);
  }

  const intervalData = semantic("createIntervalData");
  const boxPlot = semantic("createBoxPlot");
  const errorBar = semantic("createErrorBar");
  if (intervalData && boxPlot && errorBar) {
    closed = closed.map(entry => {
      if (entry === intervalData) {
        return withBaseOptions(entry, {
          source: `"data"`,
          groupBy: `"category"`
        });
      }
      if (entry === boxPlot) {
        return withBaseOptions(entry, {
          data: `"data"`,
          x: `{ field: "category", fieldType: "nominal" }`,
          y: `{ field: "value", fieldType: "quantitative" }`
        });
      }
      if (entry === errorBar) {
        return withBaseOptions(entry, {
          data: `"interval"`,
          x: `{ field: "category", fieldType: "nominal", scale: { id: "errorBarX" } }`,
          y: `{ center: "__interval_center", lower: "__interval_lower", upper: "__interval_upper", scale: { id: "errorBarY" } }`
        });
      }
      return entry;
    });
  }

  const densityData = semantic("createDensityData");
  const violinPlot = semantic("createViolinPlot");
  if (densityData && violinPlot) {
    closed = closed
      .filter(entry => entry !== densityData)
      .map(entry => entry === violinPlot
        ? {
            ...withBaseOptions(entry, {
              data: `"data"`,
              ...(entry.coverage.includes("guide.legend")
                ? { color: `"category"` }
                : {})
            }),
            coverage: unique([...entry.coverage, ...densityData.coverage])
          }
        : entry);
  }

  const gradientPlot = semantic("createGradientPlot");
  const logarithmicScale = semantic("createScale")?.provider.id === "action.createLogScale"
    ? semantic("createScale")
    : undefined;
  if (gradientPlot) {
    closed = closed.map(entry => entry === gradientPlot
      ? withBaseOptions(entry, {
          data: `"data"`,
          x: `{ field: "value", fieldType: "quantitative"${logarithmicScale ? `, scale: { id: "scale-1" }` : ""} }`,
          y: `{ field: "category", fieldType: "nominal" }`
        })
      : entry);
  }

  const density = semantic("encodeDensity");
  const hasArea = semantic("createAreaMark");
  if (density && !hasArea) {
    const area = dependencyEntry("createAreaMark", { id: `"densityArea"` });
    const densityIndex = closed.indexOf(density);
    closed = [
      ...closed.slice(0, densityIndex),
      area,
      ...closed.slice(densityIndex)
    ].map(entry => entry === density
      ? withBaseOptions(entry, { target: `"densityArea"` })
      : entry);
  }

  const bin2d = semantic("createBin2DData");
  const rect = semantic("createRectMark");
  if (bin2d && rect) {
    closed = closed.map(entry => {
      if (entry === bin2d) return withBaseOptions(entry, { source: `"data"` });
      if (entry === rect) {
        return withBaseOptions(entry, { id: `"rect"`, data: `"bins"` });
      }
      if (entry.provider.id === "action.createColorScale") {
        return withBaseOptions(entry, {
          type: `"sequential"`,
          range: `{ palette: "viridis" }`
        });
      }
      return entry;
    });
    const x = semantic("encodeX");
    const y = semantic("encodeY");
    if (x) {
      closed = replaceEntry(closed, x, [
        withBaseOptions(x, {
          field: `"__bins_x0"`,
          fieldType: `"quantitative"`,
          target: `"rect"`
        }),
        dependencyEntry("encodeX2", {
          field: `"__bins_x1"`,
          fieldType: `"quantitative"`,
          target: `"rect"`
        })
      ]);
    }
    if (y) {
      closed = replaceEntry(closed, y, [
        withBaseOptions(y, {
          field: `"__bins_y0"`,
          fieldType: `"quantitative"`,
          target: `"rect"`
        }),
        dependencyEntry("encodeY2", {
          field: `"__bins_y1"`,
          fieldType: `"quantitative"`,
          target: `"rect"`
        })
      ]);
    }
    const color = semantic("encodeColor");
    if (color) {
      closed = closed.map(entry => entry === color
        ? withBaseOptions(entry, {
            field: `"__bins_count"`,
            fieldType: `"quantitative"`,
            target: `"rect"`,
            scale: `{ id: "color-scale" }`
          })
        : entry);
    }
    const legend = semantic("createLegend");
    if (legend) {
      closed = closed.map(entry => entry === legend
        ? withBaseOptions(entry, { target: `"rect"`, channels: `["color"]` })
        : entry);
    }
  }

  let currentMark;
  let currentMarkKind;
  let pendingScale;
  const defaultMarkIds = Object.freeze({
    createPointMark: "point",
    createLineMark: "line",
    createAreaMark: "area",
    createBarMark: "bar",
    createRuleMark: "rule",
    createArcMark: "arc",
    createRectMark: "rect",
    createTextMark: "text",
    createScatterPlot: "scatterPlot",
    createLinePlot: "linePlot",
    createBarPlot: "barPlot",
    createBoxPlot: "boxPlot",
    createGradientPlot: "gradientPlot",
    createViolinPlot: "violinPlot"
  });
  const markKinds = Object.freeze({
    createPointMark: "point",
    createLineMark: "line",
    createAreaMark: "area",
    createBarMark: "bar",
    createRuleMark: "rule",
    createArcMark: "arc",
    createRectMark: "rect",
    createTextMark: "text",
    createScatterPlot: "point",
    createLinePlot: "line",
    createBarPlot: "bar",
    createBoxPlot: "bar",
    createGradientPlot: "rect",
    createViolinPlot: "area"
  });
  closed = closed.map(entry => {
    if (entry.provider.id.startsWith("exact.")) return entry;
    if (entry.provider.name === "createScale") {
      pendingScale = entry.provider.id === "action.createColorScale"
        ? undefined
        : entry.provider.baseOptions?.id;
      return entry;
    }
    const created = defaultMarkIds[entry.provider.name];
    if (created !== undefined) {
      currentMark = entry.provider.baseOptions?.id?.replaceAll('"', "") ?? created;
      currentMarkKind = markKinds[entry.provider.name];
      return entry;
    }
    if (!currentMark || entry.provider.name === "createErrorBar") return entry;
    const options = {};
    if (
      ["area", "rule", "arc"].includes(currentMarkKind) &&
      ["encodeX", "encodeY", "encodeR"].includes(entry.provider.name)
    ) {
      options.fieldType = `"quantitative"`;
    }
    if (entry.provider.name === "encodeTheta" && currentMarkKind === "arc") {
      options.fieldType = `"ordinal"`;
    }
    if (currentMarkKind === "bar" && entry.provider.name === "encodeX") {
      options.field = `"category"`;
      options.fieldType = `"nominal"`;
    }
    if (currentMarkKind === "bar" && entry.provider.name === "encodeY") {
      options.field = `"value"`;
      options.fieldType = `"quantitative"`;
    }
    if (pendingScale && ["encodeX", "encodeY"].includes(entry.provider.name)) {
      options.scale = `{ id: ${pendingScale} }`;
      pendingScale = undefined;
    }
    return Object.keys(options).length === 0 ? entry : withBaseOptions(entry, options);
  });
  return orderInheritedTextOverlay(orderBarCategoryBeforeMeasure(closed));
}

function providerRequestPosition(entry, positions) {
  const matchedPositions = entry.coverage
    .map(constraint => positions.get(constraint))
    .filter(position => position !== undefined);
  return matchedPositions.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...matchedPositions);
}

function mergeOptionValues(provider, covered) {
  const options = new Map(Object.entries(provider.baseOptions ?? {}));
  for (const constraint of covered) {
    for (const [name, value] of Object.entries(
      provider.optionsByConstraint?.[constraint] ?? {}
    )) {
      const previous = options.get(name);
      if (previous !== undefined && previous !== value) {
        if (name === "guides" && (previous === "{}" || value === "{}")) {
          options.set(name, previous === "{}" ? value : previous);
          continue;
        }
        throw new Error(
          `${provider.id} assigns conflicting values to option ${name}.`
        );
      }
      options.set(name, value);
    }
  }
  return options;
}

function actionCall(provider, options) {
  if (provider.exactCall) return provider.exactCall;
  const card = cards.get(provider.name);
  if (card.options.length === 0) return `program.${provider.name}()`;
  const body = [...options]
    .map(([name, value]) => `${name}: ${value}`)
    .join(", ");
  return `program.${provider.name}(${body.length === 0 ? "{}" : `{ ${body} }`})`;
}

function planEntry(entry, step) {
  const { provider, coverage } = entry;
  const options = mergeOptionValues(provider, coverage);
  if (provider.kind === "runtime") {
    return {
      plan: {
        step,
        id: provider.id,
        kind: provider.kind,
        name: provider.name,
        constraints: coverage,
        requiredOptions: [],
        signature: provider.signature,
        route: provider.route
      },
      call: provider.call
    };
  }
  const card = cards.get(provider.name);
  return {
    plan: {
      step,
      id: provider.id,
      kind: provider.kind,
      name: provider.name,
      constraints: coverage,
      requiredOptions: provider.exactOptionNames ?? [...options.keys()],
      signature: card.signature,
      route: card.route
    },
    call: actionCall(provider, options)
  };
}

function authoringImports(entries) {
  const runtimeNames = new Set(entries
    .filter(entry => entry.plan.kind === "runtime")
    .map(entry => entry.plan.name));
  const mainNames = [
    "chart",
    ...mainRuntimeImports.filter(name => runtimeNames.has(name))
  ];
  return [
    `import { ${mainNames.join(", ")} } from "ggaction";`,
    ...Object.entries(rendererImports)
      .filter(([name]) => runtimeNames.has(name))
      .map(([name, renderer]) => `import { ${name} } from "${renderer.entry}";`)
  ];
}

function authoringSteps(entries) {
  const outputRenderers = entries.filter(entry => rendererImports[entry.plan.name]);
  return entries.map(entry => {
    if (entry.plan.kind === "action" || ["hconcat", "vconcat"].includes(entry.plan.name)) {
      return `program = ${entry.call}`;
    }
    if (entry.plan.name === "render") return entry.call;
    const renderer = rendererImports[entry.plan.name];
    if (!renderer) throw new Error(`Unknown authoring runtime ${entry.plan.name}.`);
    const outputName = outputRenderers.length === 1
      ? "output"
      : `${renderer.output}Output`;
    return `const ${outputName} = ${entry.call}`;
  });
}

function authoringBlock(entries) {
  const plannedPrerequisites = new Set(entries
    .map(entry => entry.plan.id)
    .filter(id => authoringPrerequisiteNames.some(name => id === `action.${name}`)));
  return {
    imports: authoringImports(entries),
    initialize: "let program = chart()",
    prerequisites: authoringPrerequisiteNames
      .filter(name => !plannedPrerequisites.has(`action.${name}`))
      .map(name => {
      const card = cards.get(name);
      return {
        id: `action.${name}`,
        signature: card.signature,
        call: name === "createCanvas"
          ? "program = program.createCanvas({ width: 800, height: 600, margin: { top: 140, right: 220, bottom: 120, left: 260 } })"
          : "program = program.createData({ values })",
        bindings: name === "createData" ? ["values"] : []
      };
      }),
    steps: authoringSteps(entries)
  };
}

function hasIncompleteRulePrimaryPair(entries) {
  let insideRule = false;
  let endpoints = new Set();
  const incomplete = () =>
    insideRule &&
    endpoints.has("encodeX") &&
    endpoints.has("encodeY") &&
    !endpoints.has("encodeX2") &&
    !endpoints.has("encodeY2");
  for (const entry of entries) {
    if (entry.provider.id.startsWith("exact.")) continue;
    const name = entry.provider.name;
    if (
      name.startsWith("create") &&
      (name.endsWith("Mark") || name.endsWith("Plot"))
    ) {
      if (incomplete()) return true;
      insideRule = name === "createRuleMark";
      endpoints = new Set();
      continue;
    }
    if (
      insideRule &&
      ["encodeX", "encodeY", "encodeX2", "encodeY2"].includes(name)
    ) {
      endpoints.add(name);
    }
  }
  return incomplete();
}

function unconsumedScaleIds(entries) {
  const scaleEntries = entries.filter(entry =>
    entry.provider.name === "createScale" &&
    !entry.provider.id.startsWith("exact.")
  );
  return scaleEntries
    .filter(scale => {
      const id = scale.provider.baseOptions?.id;
      if (id === undefined) return false;
      const reference = `id: ${id}`;
      return !entries.some(entry =>
        entry !== scale &&
        [...mergeOptionValues(entry.provider, entry.coverage).values()]
          .some(value => value.includes(reference))
      );
    })
    .map(scale => scale.provider.baseOptions.id.replaceAll('"', ""));
}

function runtimeClosureDecisions(entries) {
  const names = new Set(entries
    .filter(entry => !entry.provider.id.startsWith("exact."))
    .map(entry => entry.provider.name));
  const unresolved = [];
  const unsupported = [];
  const markCreators = [...names].filter(name =>
    name.startsWith("create") && (name.endsWith("Mark") || name.endsWith("Plot"))
  );
  const hasChartOwner = markCreators.length > 0 ||
    [...names].some(name => ["createHistogram", "createHeatmap", "createParallelCoordinates"].includes(name));

  if (
    ["selectMarks", "filterMarks", "highlightMarks", "facet"].some(name => names.has(name)) &&
    !hasChartOwner
  ) {
    unresolved.push(unresolvedDecision(
      "chart.type",
      "Selection and faceting require one explicit chart or mark owner before those actions can be addressed."
    ));
  }
  if (
    ["hconcat", "vconcat"].some(name => names.has(name)) &&
    !hasChartOwner
  ) {
    unresolved.push(unresolvedDecision(
      "composition.children",
      "Composition requires at least two complete child ChartPrograms; name or provide the child charts first."
    ));
  }
  if (
    names.has("layoutLabels") && names.has("createTextMark") &&
    !names.has("encodeX") && !names.has("encodeY")
  ) {
    unresolved.push(unresolvedDecision(
      "encoding.position",
      "Collision-aware labels require a positioned source layer or explicit x and y encodings."
    ));
  }
  if (
    names.has("createLegend") &&
    !["encodeColor", "encodeSize", "encodeShape", "encodeOpacity", "encodeStrokeDash", "encodeStrokeWidth"]
      .some(name => names.has(name))
  ) {
    unresolved.push(unresolvedDecision(
      "guide.legend.channel",
      "A legend requires an explicit compatible visual encoding such as color, size, shape, opacity, dash, or width."
    ));
  }
  if (hasIncompleteRulePrimaryPair(entries)) {
    unresolved.push(unresolvedDecision(
      "encoding.rule.endpoint",
      "A rule with both x and y primary positions also requires x2 or y2; otherwise choose one primary position for a full-span rule."
    ));
  }
  for (const id of unconsumedScaleIds(entries)) {
    unresolved.push(unresolvedDecision(
      "scale.consumer",
      `Scale "${id}" is not connected to a compatible encoding; choose the channel that should consume it.`
    ));
  }
  if (names.has("createAreaMark") && names.has("encodeStrokeDash")) {
    unsupported.push({
      constraint: "unsupported.areaStrokeDash",
      reason: "Field-driven stroke dash is not supported for area marks; use a line or rule mark for dash encoding."
    });
  }
  return { unresolved, unsupported };
}

function unresolvedDecision(constraint, reason) {
  const resource = docsResourceByDecision[constraint] ??
    (constraint.startsWith("layout.legend.")
      ? "ggaction://docs/legend-layout"
      : "ggaction://docs/action-reference");
  return { constraint, reason, resources: [resource] };
}

function genericUnresolved(normalizedQuery, matchedIds, exactNames) {
  const unresolved = [];
  const taskSpecificMatches = [...matchedIds].filter(id =>
    !id.startsWith("renderer.") && !id.startsWith("unsupported.")
  );
  if (
    /\b(chart|plot)\b/.test(normalizedQuery) &&
    taskSpecificMatches.length === 0 &&
    ![...matchedIds].some(id => id.startsWith("unsupported.")) &&
    exactNames.length === 0
  ) {
    unresolved.push(unresolvedDecision(
      "chart.type",
      "A chart or mark type is required; for example scatter plot, line chart, bar chart, or tick mark."
    ));
  }
  if (
    /\b(render|export|output)\b/.test(normalizedQuery) &&
    ![...matchedIds].some(id => id.startsWith("renderer."))
  ) {
    unresolved.push(unresolvedDecision(
      "renderer.format",
      "A supported output format is required: Browser Canvas, SVG, PNG, or PDF."
    ));
  }
  return unresolved;
}

export function validateResolverKnowledge() {
  if (cardsArtifact.schemaVersion !== 1 || taxonomy.schemaVersion !== 2) {
    throw new Error("Compact action cards must use schemaVersion 1 and the intent taxonomy schemaVersion 2.");
  }
  if (constraints.size !== taxonomy.constraints.length) {
    throw new Error("Intent constraint IDs must be unique.");
  }
  const providerIds = new Set(taxonomy.providers.map(provider => provider.id));
  if (providerIds.size !== taxonomy.providers.length) {
    throw new Error("Intent provider IDs must be unique.");
  }
  const anchored = new Set();
  for (const constraint of taxonomy.constraints) {
    for (const shadowed of constraint.shadows ?? []) {
      if (!constraints.has(shadowed) || shadowed === constraint.id) {
        throw new Error(`${constraint.id} shadows invalid constraint ${shadowed}.`);
      }
    }
  }
  for (const provider of taxonomy.providers) {
    for (const id of [...provider.anchors, ...provider.covers]) {
      if (!constraints.has(id)) throw new Error(`${provider.id} references unknown constraint ${id}.`);
    }
    if (provider.anchors.some(anchor => !provider.covers.includes(anchor))) {
      throw new Error(`${provider.id} does not cover every anchor.`);
    }
    for (const anchor of provider.anchors) anchored.add(anchor);
    if (provider.kind === "action") {
      const card = cards.get(provider.name);
      if (!card) throw new Error(`${provider.id} references unknown action ${provider.name}.`);
      const declaredOptions = new Set(card.options.map(option => option.name));
      const optionGroups = [
        provider.baseOptions ?? {},
        ...Object.values(provider.optionsByConstraint ?? {})
      ];
      for (const group of optionGroups) {
        for (const [name, value] of Object.entries(group)) {
          if (!declaredOptions.has(name)) {
            throw new Error(`${provider.id} references undeclared option ${name}.`);
          }
          if (typeof value !== "string" || value.length === 0) {
            throw new Error(`${provider.id}.${name} must be a JavaScript expression string.`);
          }
        }
      }
    } else if (
      provider.kind !== "runtime" ||
      typeof provider.signature !== "string" ||
      typeof provider.call !== "string" ||
      !provider.route.startsWith("/reference/")
    ) {
      throw new Error(`${provider.id} has an invalid runtime contract.`);
    } else if (
      !mainRuntimeImports.includes(provider.name) &&
      rendererImports[provider.name] === undefined
    ) {
      throw new Error(`${provider.id} lacks an authoring runtime mapping.`);
    }
  }
  const missing = taxonomy.constraints.filter(constraint =>
    constraint.unsupported === undefined && !anchored.has(constraint.id)
  );
  if (missing.length > 0) {
    throw new Error(`Supported constraints lack providers: ${missing.map(entry => entry.id).join(", ")}.`);
  }
  const invalidTerminal = taxonomy.constraints.filter(constraint =>
    (constraint.unsupported !== undefined) !== constraint.id.startsWith("unsupported.") ||
    (constraint.unsupported !== undefined && anchored.has(constraint.id))
  );
  if (invalidTerminal.length > 0) {
    throw new Error(
      `Terminal constraints must use unsupported.* IDs without providers: ${invalidTerminal.map(entry => entry.id).join(", ")}.`
    );
  }
  for (const name of authoringPrerequisiteNames) {
    if (!cards.has(name)) throw new Error(`Missing authoring prerequisite action card: ${name}.`);
  }
  return {
    cards: cards.size,
    constraints: constraints.size,
    providers: taxonomy.providers.length,
    supported: taxonomy.constraints.filter(entry => entry.unsupported === undefined).length,
    unsupported: taxonomy.constraints.filter(entry => entry.unsupported !== undefined).length
  };
}

export function searchGgaction(query) {
  if (typeof query !== "string" || query.trim().length === 0) {
    throw new TypeError("searchGgaction query must be a non-empty string.");
  }
  if (query.length > 500) {
    throw new RangeError("searchGgaction query must be at most 500 characters.");
  }
  validateResolverKnowledge();
  const normalizedQuery = normalize(query);
  const exactNames = exactActionNames(query);
  const { matched, positions } = semanticMatchResult(normalizedQuery);
  for (const name of exactNames) {
    const [occurrence] = phraseOccurrences(normalizedQuery, normalize(name));
    if (occurrence) positions.set(`action.${name}`, occurrence.start);
  }
  const matchedIds = new Set([
    ...matched.map(constraint => constraint.id),
    ...exactNames.map(name => `action.${name}`)
  ]);
  const unsupported = matched
    .filter(constraint => constraint.unsupported !== undefined)
    .map(constraint => ({ constraint: constraint.id, reason: constraint.unsupported }));
  const unresolved = [];
  const { blocked, unresolved: conflicts } = conflictResult(matched);
  unresolved.push(...conflicts);

  const supportedIds = new Set([...matchedIds].filter(id => {
    const constraint = constraints.get(id);
    return !blocked.has(id) && (constraint === undefined || constraint.unsupported === undefined);
  }));
  const providers = candidateProviders(supportedIds, exactNames);
  const { selected, uncovered } = selectProviders(supportedIds, providers);
  for (const constraint of uncovered) {
    unresolved.push(unresolvedDecision(
      constraint,
      "No current action or runtime operation covers this recognized constraint."
    ));
  }
  unresolved.push(...genericUnresolved(normalizedQuery, matchedIds, exactNames));
  if (matchedIds.size === 0 && unresolved.length === 0) {
    unresolved.push(unresolvedDecision(
      "query.intent",
      "No current ggaction constraint was recognized; use an exact action name or a supported chart task."
    ));
  }

  const ordered = closeRuntimeDependencies(adaptProviderDependencies(selected).sort((left, right) =>
    left.provider.order - right.provider.order ||
    providerRequestPosition(left, positions) - providerRequestPosition(right, positions) ||
    left.provider.id.localeCompare(right.provider.id)
  ));
  const closure = runtimeClosureDecisions(ordered);
  if (unsupported.length === 0 && unresolved.length === 0) {
    unsupported.push(...closure.unsupported);
    unresolved.push(...closure.unresolved);
  }
  const entries = ordered.map((entry, index) => planEntry(entry, index + 1));
  const packet = {
    schemaVersion: 3,
    query: query.trim(),
    matchedConstraints: [...matchedIds],
    actionPlan: entries.map(entry => entry.plan),
    exactCalls: entries.map(entry => entry.call),
    authoring: authoringBlock(entries),
    unsupported,
    unresolved: unique(unresolved.map(entry => JSON.stringify(entry))).map(JSON.parse),
    candidates: entries.slice(0, 3).map(entry => ({
      id: entry.plan.id,
      kind: entry.plan.kind,
      name: entry.plan.name,
      route: entry.plan.route
    }))
  };
  const bytes = Buffer.byteLength(JSON.stringify(packet), "utf8");
  if (bytes > 6144) throw new TaskPacketBudgetError(bytes);
  return packet;
}

export function taskPacketBytes(packet) {
  return Buffer.byteLength(JSON.stringify(packet), "utf8");
}

validateResolverKnowledge();
