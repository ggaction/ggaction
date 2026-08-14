import { action } from "../../core/action.js";
import { validateUserId } from "../../core/identifiers.js";
import { isPlainObject } from "../../core/immutable.js";
import { GRADIENT_PROFILE_FIELDS } from "../../grammar/gradientProfile.js";
import {
  mapContinuousScaleValues,
  mapOrdinalPositionValues
} from "../../grammar/scales/index.js";
import { applyMaterializationPlan } from "../../materialization/dependencies.js";
import { getSourceDependentMarkSteps } from "../../materialization/marks/index.js";
import { buildMaterializationPlan } from "../../materialization/planner.js";
import { findDataset } from "../../selectors/datasets.js";
import { findLayer } from "../../selectors/layers.js";
import {
  createGradientPlotPaint,
  resolveGradientPlotCategoryColors
} from "./paint.js";
import { resolveGradientOrientation } from "./resolve.js";

function position(values, scale) {
  return ["ordinal", "band", "point"].includes(scale.type)
    ? mapOrdinalPositionValues(values, scale)
    : mapContinuousScaleValues(values, scale);
}

function axisWithTitle(option, text) {
  if (option === false) return false;
  const axis = option ?? {};
  return {
    ...axis,
    title: {
      ...(axis.title ?? {}),
      ...(axis.title?.text === undefined ? { text } : {})
    }
  };
}

function gradientAxesOptions(config) {
  if (config.guides.axes === false) return false;
  const axes = config.guides.axes ?? {};
  return {
    ...axes,
    x: axisWithTitle(
      axes.x,
      config.orientation === "vertical" ? config.category : config.measure
    ),
    y: axisWithTitle(
      axes.y,
      config.orientation === "vertical" ? config.measure : config.category
    )
  };
}

function bodyItems(program, layer, dataset, config) {
  const vertical = config.orientation === "vertical";
  const categoryChannel = vertical ? "x" : "y";
  const measureChannel = vertical ? "y" : "x";
  const categoryEncoding = layer.encoding[categoryChannel];
  const measureEncoding = layer.encoding[measureChannel];
  const categoryScale = program.resolvedScales[categoryEncoding.scale];
  const measureScale = program.resolvedScales[measureEncoding.scale];
  const rows = dataset.values;
  const categories = rows.map(row => row[config.category]);
  const centers = position(categories, categoryScale);
  const lower = position(
    rows.map(row => row[GRADIENT_PROFILE_FIELDS.lower]),
    measureScale
  );
  const upper = position(
    rows.map(row => row[GRADIENT_PROFILE_FIELDS.upper]),
    measureScale
  );
  const categoryColors = resolveGradientPlotCategoryColors(
    program,
    layer,
    categories
  );
  const thickness = categoryScale.bandwidth * config.width.band;
  if (!Number.isFinite(thickness) || thickness <= 0) {
    throw new Error(`Gradient plot "${layer.id}" requires a positive band width.`);
  }
  return rows.map((row, index) => {
    const a = lower[index];
    const b = upper[index];
    const geometry = vertical
      ? {
          x: centers[index] - thickness / 2,
          y: Math.min(a, b),
          width: thickness,
          height: Math.abs(a - b)
        }
      : {
          x: Math.min(a, b),
          y: centers[index] - thickness / 2,
          width: Math.abs(a - b),
          height: thickness
        };
    return {
      type: "rect",
      properties: {
        ...geometry,
        fill: createGradientPlotPaint({
          values: row[GRADIENT_PROFILE_FIELDS.values],
          intensities: row[GRADIENT_PROFILE_FIELDS.intensities]
        }, {
          orientation: config.orientation,
          valueScale: measureScale,
          intensityDomain: config.intensityDomain,
          palette: config.gradient.palette,
          opacity: config.gradient.opacity,
          ...(categoryColors === undefined
            ? {}
            : { baseColor: categoryColors[index] })
        }),
        opacity: 1,
        stroke: "transparent",
        strokeWidth: 0
      }
    };
  });
}

export const materializeGradientPlotFill = action(
  {
    op: "materializeGradientPlotFill",
    description: "Materialize categorical density profiles as gradient strips."
  },
  function ({ id } = {}) {
    const owner = validateUserId(id, "Gradient-plot id");
    const layer = findLayer(this, owner);
    const config = this.markConfigs[owner]?.gradientPlot;
    if (layer?.mark?.type !== "rect" || config?.materialized !== true) {
      throw new Error(`Unknown materialized gradient plot "${owner}".`);
    }
    const dataset = findDataset(this, layer.data);
    if (dataset === undefined) {
      throw new Error(`Gradient plot "${owner}" requires profile data.`);
    }
    const scaleIds = [...new Set([
      layer.encoding?.x?.scale,
      layer.encoding?.y?.scale,
      layer.encoding?.color?.scale
    ].filter(Boolean))];
    let next = this;
    for (const scale of scaleIds) {
      next = next.rematerializeScale({ id: scale, marks: false, guides: false });
    }
    next = next.editGraphics({
      target: owner,
      property: "items",
      value: bodyItems(next, findLayer(next, owner), dataset, config)
    });
    next = applyMaterializationPlan(
      next,
      buildMaterializationPlan({
        marks: getSourceDependentMarkSteps(next, owner)
      })
    );
    if (
      config.guides?.legend !== false &&
      config.guides?.legend !== undefined &&
      next.graphicSpec.objects[`${owner}DensityLegend`] !== undefined
    ) {
      next = next.rematerializeGradientPlotLegend({ owner });
    }
    return next._withContext({ currentMark: owner, currentData: config.source });
  }
);

export const materializeGradientPlot = action(
  {
    op: "materializeGradientPlot",
    description: "Materialize one complete categorical gradient plot."
  },
  function ({ id } = {}) {
    const owner = validateUserId(id, "Gradient-plot id");
    const layer = findLayer(this, owner);
    const config = this.markConfigs[owner]?.gradientPlot;
    if (layer?.mark?.type !== "rect" || config === undefined) {
      throw new Error(`Unknown gradient plot "${owner}".`);
    }
    if (config.materialized) return this.materializeGradientPlotFill({ id: owner });
    const x = layer.encoding?.x;
    const y = layer.encoding?.y;
    if (x?.field === undefined || y?.field === undefined) return this;
    const orientation = resolveGradientOrientation(x, y);
    if (orientation === undefined) {
      throw new Error(
        "createGradientPlot requires one categorical axis and one quantitative axis."
      );
    }
    const category = orientation === "vertical" ? x : y;
    const measure = orientation === "vertical" ? y : x;
    const profileId = `${owner}ProfileData`;
    const centerId = `${owner}Center`;
    let next = this.createGradientProfileData({
      id: profileId,
      source: layer.data,
      category: category.field,
      field: measure.field,
      ...config.density,
      center: config.center === false ? "median" : config.center.type
    });
    const profile = findDataset(next, profileId);
    const transform = profile.transform[0];
    next = next
      .rebindLayerData({ id: owner, data: profileId })
      ._withMarkConfig(owner, {
        ...next.markConfigs[owner],
        gradientPlot: {
          ...config,
          materialized: true,
          source: layer.data,
          orientation,
          category: category.field,
          categoryType: category.fieldType,
          measure: measure.field,
          profileId,
          centerId,
          intensityDomain: transform.resolved.intensityDomain
        }
      });
    const measureChannel = orientation === "vertical" ? "y" : "x";
    const path = `layer[${owner}].encoding.`;
    for (const [property, value] of [
      [`${path}${measureChannel}.field`, GRADIENT_PROFILE_FIELDS.lower],
      [`${path}${measureChannel}.fieldType`, "quantitative"],
      [`${path}${measureChannel}2.field`, GRADIENT_PROFILE_FIELDS.upper],
      [`${path}${measureChannel}2.fieldType`, "quantitative"],
      [`${path}${measureChannel}2.scale`, measure.scale]
    ]) {
      next = next.editSemantic({ property, value });
    }
    next = next.materializeGradientPlotFill({ id: owner });
    if (config.center !== false) {
      const categoryScale = next.resolvedScales[category.scale];
      next = next.createGradientPlotCenter({
        id: centerId,
        owner,
        data: profileId,
        category: category.field,
        categoryType: category.fieldType,
        coordinate: layer.coordinate,
        categoryScale: category.scale,
        measureScale: measure.scale,
        orientation,
        size: Math.max(1, categoryScale.bandwidth * config.width.band - 16),
        stroke: config.center.stroke,
        strokeWidth: config.center.strokeWidth
      });
    }
    const guides = config.guides;
    if (guides !== false) {
      const wantsStandard = guides.axes !== false || guides.grid !== false;
      if (wantsStandard) {
        next = next.createGuides({
          axes: gradientAxesOptions(next.markConfigs[owner].gradientPlot),
          grid: guides.grid,
          legend: false
        });
      }
      if (guides.legend !== false) {
        const legend = isPlainObject(guides.legend) ? guides.legend : {};
        next = next.createGradientPlotLegend({
          owner,
          title: legend.title ?? "Relative density",
          position: legend.position ?? "right"
        });
      }
    }
    return next._withContext({ currentMark: owner, currentData: layer.data });
  }
);
