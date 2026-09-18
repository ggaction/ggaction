import { ChartProgram } from "./core/ChartProgram.js";
import { cloneAndFreeze } from "./core/immutable.js";
import { validateOptionObject } from "./core/validation.js";
import { validateUserId } from "./core/identifiers.js";
import { findLayer } from "./selectors/layers.js";
import { requireDataset } from "./selectors/datasets.js";
import { requireSemanticScale } from "./selectors/scales.js";
import { ownedChildren, ownership } from "./selectors/markOwners.js";
import { resolveMarkItems } from "./materialization/selection/policies/index.js";
import { channelMapFromRow } from "./materialization/selection/items/common.js";
import { deriveLineSeries, resolveLineBins } from "./grammar/lineSeries.js";
import { deriveAreaSeries, deriveCenteredAreaSeries, deriveDensityAreaSeries, layoutDensityAreaSeries } from "./grammar/areaSeries.js";
import { findUpstreamTransform } from "./materialization/dataProvenance.js";

function unsupported(id, message) {
  throw new Error(`Cannot export accessible data for mark "${id}": ${message}.`);
}

function pathRows(program, layer) {
  const dataset = requireDataset(program, layer.data);
  const rows = dataset.values;
  if (layer.encoding.parallel !== undefined) {
    const dimensions = layer.encoding.parallel.dimensions;
    return resolveMarkItems(program, layer.id).map(item => ({
      series: {}, values: Object.fromEntries(dimensions.map(dimension =>
        [dimension.field, item.fields[dimension.field] ?? null]))
    }));
  }
  let derived;
  if (layer.mark.type === "line") {
    const x = layer.encoding.x;
    derived = deriveLineSeries(rows, layer, {
      ...(x?.bin === undefined ? {} : { xBinBoundaries: resolveLineBins(rows, layer, requireSemanticScale(program, x.scale)).boundaries }),
      xDomain: program.resolvedScales[x?.scale]?.domain,
      thetaDomain: program.resolvedScales[layer.encoding.theta?.scale]?.domain
    });
  } else {
    const transform = findUpstreamTransform(program, dataset, "density");
    derived = transform === undefined
      ? layer.encoding.y?.stack === "center"
        ? deriveCenteredAreaSeries(rows, layer)
        : deriveAreaSeries(rows, layer)
      : deriveDensityAreaSeries(rows, layer, transform);
    if (transform !== undefined && transform.placement?.type !== "category") {
      derived = layoutDensityAreaSeries(derived, layer.layout?.mode ?? layer.encoding.color?.layout ?? "overlay");
    }
  }
  // Confirm the same final series are materialized; never export source rows as vertices.
  const graphic = program.graphicSpec.objects[layer.id];
  if (!Array.isArray(graphic?.items) || graphic.items.length !== derived.series.length) {
    unsupported(layer.id, "final path series do not match materialized graphics");
  }
  return derived.series.flatMap(series => series.values.map(value => ({
    series: series.key,
    values: {
      ...channelMapFromRow(series.key, layer),
      ...Object.fromEntries(Object.entries(value).filter(([key]) =>
        !["sourceIndex", "order", "pathOrder"].includes(key)))
    }
  })));
}

function finalRows(program, layer) {
  if (program.graphicSpec.objects[layer.id] === undefined) {
    unsupported(layer.id, "the owner is not materialized");
  }
  if (["line", "area"].includes(layer.mark.type)) return pathRows(program, layer);
  if (!["point", "bar", "arc", "rule", "tick", "rect"].includes(layer.mark.type)) {
    unsupported(layer.id, `unsupported ${layer.mark.type} owner`);
  }
  return resolveMarkItems(program, layer.id).map(item => ({
    series: Object.fromEntries(["group", "color", "stroke"].flatMap(channel => {
      const encoding = layer.encoding[channel];
      return encoding?.field !== undefined && ["nominal", "ordinal"].includes(encoding.fieldType) && item.channels[channel] !== undefined
        ? [[encoding.field, item.channels[channel]]] : [];
    })),
    values: item.channels
  }));
}

function column(layer, key) {
  const dimension = layer.encoding.parallel?.dimensions.find(item => item.field === key);
  const encoding = dimension ?? layer.encoding[key] ?? layer.encoding[key.replace(/2$/, "")];
  const temporal = encoding?.fieldType === "temporal";
  return {
    key,
    role: key,
    ...(encoding?.field === undefined ? {} : { field: encoding.field }),
    ...(encoding?.aggregate === undefined ? {} : { aggregate: encoding.aggregate }),
    ...(temporal ? { unit: "utc-milliseconds" } : {})
  };
}

function ownerView(program, layer) {
  const ownerByChild = ownership(program);
  const components = [];
  const visited = new Set();
  const visit = current => {
    if (visited.has(current.id)) unsupported(layer.id, "cyclic mark ownership");
    visited.add(current.id);
    components.push(current);
    for (const id of ownedChildren(program, current.id)) {
      if (ownerByChild.get(id) === current.id) visit(findLayer(program, id));
    }
  };
  visit(layer);
  const columns = new Map();
  const rows = [];
  for (const component of components) {
    // Attached text labels repeat their owner's values; they are not independent data views.
    if (component.mark.type === "text" && component.source !== undefined) continue;
    const resolved = finalRows(program, component);
    for (const row of resolved) {
      for (const key of Object.keys(row.values)) {
        const id = `${component.id}:${key}`;
        if (!columns.has(id)) columns.set(id, { ...column(component, key), key: id, component: component.id });
      }
      rows.push({ component: component.id, series: row.series,
        values: Object.fromEntries(Object.entries(row.values).map(([key, value]) => [`${component.id}:${key}`, value])) });
    }
  }
  return { ownerId: layer.id, markType: layer.mark.type,
    columns: [...columns.values()], rows,
    units: Object.fromEntries([...columns.values()].filter(item => item.unit !== undefined).map(item => [item.key, item.unit])) };
}

function alternative(program, target) {
  const title = program.semanticSpec.title.text ?? null;
  if (program.compositionSpec !== undefined) {
    if (target !== undefined) throw new Error("Composition targets are ambiguous; export an explicit child program instead.");
    const spec = program.compositionSpec;
    return { title, views: spec.children.map((id, index) => ({
      ownerId: id, kind: "composition-child",
      ...(spec.facet === undefined ? {} : { facet: spec.facet.grid !== undefined
        ? { [spec.facet.grid.rows.field]: spec.facet.grid.cells[index].rowValue, [spec.facet.grid.columns.field]: spec.facet.grid.cells[index].columnValue }
        : spec.facet.repeat !== undefined ? { repeatField: spec.facet.values[index], channel: spec.facet.repeat.channel }
          : { [spec.facet.field]: spec.facet.values[index] } }),
      ...alternative(program.children[id])
    })) };
  }
  const owners = ownership(program);
  let layers = program.semanticSpec.layers.filter(layer => !owners.has(layer.id));
  if (target !== undefined) {
    const layer = findLayer(program, target);
    if (layer === undefined) throw new Error(`Unknown mark target "${target}".`);
    if (owners.has(target)) throw new Error(`Mark "${target}" is owned by "${owners.get(target)}"; export its stable owner.`);
    layers = [layer];
  }
  return { title, views: layers.map(layer => ownerView(program, layer)) };
}

export function exportAccessibleData(program, options = {}) {
  validateOptionObject(options, ["target"], "exportAccessibleData");
  if (!(program instanceof ChartProgram)) throw new TypeError("exportAccessibleData requires an editable chart program.");
  if (program.actionStack.length !== 0) throw new Error("exportAccessibleData requires a closed action stack.");
  if (options.target !== undefined) validateUserId(options.target, "Accessible data target");
  return cloneAndFreeze({ schemaVersion: 1, ...alternative(program, options.target) });
}
