import { validateLegendClip, clippedSampleBounds } from "../../grammar/legendClip.js";
import { intrinsicLegendConfig, legendGroup } from "../legendGroups.js";
import { formatVisibleText } from "../../core/textMetrics.js";
import { formatDiscretizedIntervals, isDiscreteSizeScaleType, isSizeScaleType, mapSizeValues, transformedTicks } from "../../grammar/scales/index.js";
import { resolveLegendItemLayout } from "../../layout/legendItems.js";
import { readLegendSampling, resolveLegendSampleValues, validateSamplingAgainstScale } from "../../grammar/legendSampling.js";
import { resolveEffectiveLegendBlockConfig } from "./legendConfig.js";
import { resolveDisplayLabel } from "../../grammar/displayLabels.js";
import { validateColorSizeShapeSamples } from "../../grammar/colorSizeLegend.js";
import { createPointShapeGraphic } from "../../grammar/pointShapes.js";
import { resolveConcreteGraphicBounds } from "../../grammar/schemas/graphicBounds.js";
import { mapScaleConsumerValues } from "../scales/map.js";
import { resolveContinuousBounds, formatContinuousValues, assertLegendBoundsInsideCanvas, resolveLegendBackgroundFromBounds } from "./legendLayout.js";

export function requireSizeLegendScale(program, id) {
  const scale = program.resolvedScales[id];
  if (!isSizeScaleType(scale?.type)) {
    throw new Error(`Legend requires resolved size scale "${id}".`);
  }
  return scale;
}

export function resolveSizeLegendLayout(program, config) {
  validateLegendClip("size",config);
  config = intrinsicLegendConfig(program, config);
  const scale = requireSizeLegendScale(program, config.scale);
  const categorical = [
    program.guideConfigs.legend?.series,
    program.guideConfigs.legend?.color,
    program.guideConfigs.legend?.stroke
  ]
    .find(candidate => candidate?.target === config.target);
  const inherit = config.inheritAppearance === true && categorical !== undefined;
  const inheritedLabels = inherit ? { ...categorical.labels, offset: config.labels.offset } : config.labels;
  const inheritedTitleStyle = inherit ? categorical.titleStyle : config.titleStyle;
  const effective = resolveEffectiveLegendBlockConfig(program, "size", {
    ...config,
    labels: inheritedLabels,
    titleStyle: inheritedTitleStyle
  });
  const labels = effective.labels;
  const titleStyle = effective.titleStyle;
  // Group ownership replaces placement inheritance, never shared typography.
  const placementCategorical = config.blockLocalPosition === undefined && legendGroup(program, config.target) === undefined &&
    (config.inheritPosition !== false || categorical?.position === config.position)
    ? categorical : undefined;
  const position = placementCategorical?.position ?? config.position;
  if (placementCategorical?.layout === "legacy-bottom") {
    throw new Error('Combined size legends require layout "edge".');
  }
  const horizontal = placementCategorical !== undefined && ["top", "bottom"].includes(position);
  const geometry = horizontal ? {
    position, align: categorical.align, direction: categorical.direction,
    columns: categorical.columns, titlePosition: categorical.titlePosition,
    offset: categorical.offset, itemGap: effective.blockGap ?? categorical.itemGap
  } : { position };
  const ordinalSize = scale.type === "ordinal";
  if (ordinalSize && config.labels.format !== undefined && config.labels.format !== "auto") {
    throw new Error("Categorical size legends retain original category labels.");
  }
  const discrete = isDiscreteSizeScaleType(scale.type);
  if ((discrete || ordinalSize) && readLegendSampling(config).mode === "values") {
    throw new Error("Discrete size legends do not support exact values.");
  }
  const allValues = discrete
    ? undefined
    : ordinalSize ? scale.domain : resolveLegendSampleValues(effective, scale, "Size legend");
  const hiddenCount = ordinalSize && effective.overflow &&
    allValues.length > effective.overflow.maxItems
    ? allValues.length - effective.overflow.maxItems
    : 0;
  const values = hiddenCount > 0
    ? allValues.slice(0, effective.overflow.maxItems)
    : allValues;
  const areas = discrete
    ? scale.range
    : mapSizeValues(values, scale);
  const radii = areas.map(area => Math.sqrt(area / Math.PI));
  const radius = Math.max(...radii);
  const width = Math.max(32, radius * 2);
  const { plot, canvas } = resolveContinuousBounds(program);
  const itemText = discrete
    ? formatDiscretizedIntervals(scale.thresholds, config.labels.format)
    : ordinalSize ? values.map(formatVisibleText) : formatContinuousValues(
        values,
        scale.domain,
        "quantitative",
        config.labels.format
      );
  const mappedText = !discrete && effective.labelMap !== undefined
    ? itemText.map((label, index) => resolveDisplayLabel(values[index], effective.labelMap, () => label))
    : itemText;
  const text = hiddenCount > 0 ? [...mappedText, `…${hiddenCount} entries`] : mappedText;
  const symbolStroke = effective.blockSymbol?.strokeWidth ?? 0;
  const symbolExtent = symbolStroke / 2;
  const sampleWidth = width + symbolStroke;
  const layout = resolveLegendItemLayout(plot, { ...effective, ...geometry, labels, titleStyle }, text, {
    width: sampleWidth, height: Math.min(radius * 2 + symbolStroke, effective.clipHeight??Infinity),
    itemBounds: radii.map(r => clippedSampleBounds({
      left: sampleWidth / 2 - r - symbolExtent,
      right: sampleWidth / 2 + r + symbolExtent,
      top: -r - symbolExtent,
      bottom: r + symbolExtent
    },effective.clipHeight))
  }, undefined, program.materializationConfigs.textMetrics);
  assertLegendBoundsInsideCanvas(layout.bounds, canvas, "Size legend layout", { ...effective, ...geometry });
  const background = resolveLegendBackgroundFromBounds(layout.bounds, effective.border, canvas, "Size legend", { ...effective, ...geometry });
  return { ...layout, symbolX: layout.symbolX.slice(0, radii.length).map(x => x + sampleWidth / 2),
    symbolY: layout.itemY.slice(0, radii.length), radii, text, values, hiddenCount,
    ...(effective.labelMap === undefined ? {} : {
      labelItemIndices: text.flatMap((label, index) => label === "" ? [] : [index])
    }), labels, titleStyle, background, config: effective };
}

export function resolveColorSizeLayout(program,stored) {
 validateLegendClip('colorSize',stored);
 const config=intrinsicLegendConfig(program,resolveEffectiveLegendBlockConfig(program,'colorSize',stored));
 const color=program.resolvedScales[stored.colorScale],size=program.resolvedScales[stored.sizeScale];
 if(config.combine==='color-size-shape')return resolveShapeLayout(program,config,color,size);
 const sampling=readLegendSampling(config);validateSamplingAgainstScale(sampling,color,'Color-size samples');validateSamplingAgainstScale(sampling,size,'Color-size samples');
 const values=resolveLegendSampleValues(config,size,'Color-size legend');
 const colors=mapScaleConsumerValues(values,color,'color'),areas=mapSizeValues(values,size),radii=areas.map(area=>Math.sqrt(area/Math.PI));
 const labels=formatContinuousValues(values,stored.domain,'quantitative',config.labels.format)
  .map((text,index)=>resolveDisplayLabel(values[index],config.labelMap,()=>text));
 const radius=Math.max(...radii),stroke=config.symbol.strokeWidth/2,width=2*(radius+stroke),height=Math.min(width,config.clipHeight??Infinity);
 const {plot,canvas}=resolveContinuousBounds(program);
 const layout=resolveLegendItemLayout(plot,config,labels,{width,height,itemBounds:radii.map(r=>clippedSampleBounds({left:width/2-r-stroke,right:width/2+r+stroke,top:-r-stroke,bottom:r+stroke},config.clipHeight))},canvas,program.materializationConfigs.textMetrics);
 assertLegendBoundsInsideCanvas(layout.bounds,canvas,'Color-size legend',config);
 const background=resolveLegendBackgroundFromBounds(layout.bounds,config.border,canvas,'Color-size legend',config);
 return {...layout,background,values,colors,areas,radii,text:labels,config,symbolX:layout.symbolX.map(x=>x+width/2)};
}

function resolveShapeLayout(program,config,color,size) {
 const values=validateColorSizeShapeSamples(readLegendSampling(config),color);
 const colors=mapScaleConsumerValues(values,color,config.colorChannel),areas=mapSizeValues(values,size);
 const shape=program.resolvedScales[config.shapeScale];
 const shapes=mapScaleConsumerValues(values,shape,'shape');
 const point=program.markConfigs[config.target];
 const symbol={fill:point.fill??'none',stroke:point.stroke,strokeWidth:point.strokeWidth??0,opacity:point.opacity??1,...config.symbol};
 const sample=(i,x,y)=>createPointShapeGraphic({shape:shapes[i],area:areas[i],x,y,
  fill:config.colorChannel==='color'?colors[i]:symbol.fill,
  stroke:config.colorChannel==='stroke'?colors[i]:symbol.stroke,strokeWidth:symbol.strokeWidth,opacity:symbol.opacity});
 const bounds=values.map((_,i)=>resolveConcreteGraphicBounds({objects:{sample:sample(i,0,0)},order:['sample']},'sample'));
 const left=Math.min(...bounds.map(b=>b.left)),right=Math.max(...bounds.map(b=>b.right));
 const top=Math.min(...bounds.map(b=>b.top)),bottom=Math.max(...bounds.map(b=>b.bottom));
 const width=right-left,height=Math.min(bottom-top,config.clipHeight??Infinity);
 const labels=formatDiscretizedIntervals(color.thresholds,config.labels.format)
  .map((text,i)=>resolveDisplayLabel(values[i],config.labelMap,()=>text));
 const {plot,canvas}=resolveContinuousBounds(program);
 const layout=resolveLegendItemLayout(plot,config,labels,{width,height,itemBounds:bounds.map(b=>
  clippedSampleBounds({...b,left:b.left-left,right:b.right-left},config.clipHeight))},canvas,program.materializationConfigs.textMetrics);
 assertLegendBoundsInsideCanvas(layout.bounds,canvas,'Color-size-shape legend',config);
 const background=resolveLegendBackgroundFromBounds(layout.bounds,config.border,canvas,'Color-size-shape legend',config);
 return {...layout,background,values,colors,areas,text:labels,config,
  items:values.map((_,i)=>sample(i,layout.symbolX[i]-left,layout.itemY[i]))};
}

export function resolveColorSymbolsLayout(program, config, scale) {
  validateLegendClip("gradient",config);
  config = intrinsicLegendConfig(program, config);
  const { plot, canvas } = resolveContinuousBounds(program);
  const sampling = validateSamplingAgainstScale(readLegendSampling(config), scale, "Sampled color legend");
  let values = sampling.mode === "auto" && ["log", "pow", "sqrt", "symlog"].includes(scale.type)
    ? transformedTicks(scale.type, scale.domain, sampling.count,
      scale.type === "log" ? { base: scale.base }
        : scale.type === "pow" ? { exponent: scale.exponent }
        : scale.type === "symlog" ? { constant: scale.constant } : {})
    : resolveLegendSampleValues(config, scale, "Sampled color legend");
  if (sampling.mode === "auto" && scale.midpoint !== undefined && !values.includes(scale.midpoint)) values = [...values, scale.midpoint].sort((a,b) => a-b);
  let texts = formatContinuousValues(values, scale.domain, config.fieldType, config.labels.format);
  const extent = config.symbol.radius + config.symbol.strokeWidth / 2;
  const layout = resolveLegendItemLayout(plot, config, texts, { width: extent * 2, height: Math.min(extent*2,config.clipHeight??Infinity) }, canvas, program.materializationConfigs.textMetrics);
  assertLegendBoundsInsideCanvas(layout.bounds, canvas, "Sampled color legend", config);
  const background = resolveLegendBackgroundFromBounds(layout.bounds, config.border, canvas, "Sampled color legend", config);
  return { ...layout, background, values, texts, extent, config };
}
