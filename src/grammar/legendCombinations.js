import { sameOrderedValues, validateGeneratedItemLimit } from "../core/validation.js";
import { mapOrdinalValues } from "./scales/index.js";
import { readNominalField } from "./scales/fields.js";
import { resolveLegendOrderDomain } from "./categoryOrder.js";

export function isSizeShapeChannels(channels) {
  return Array.isArray(channels) && channels.length === 2 &&
    channels.includes('shape') && channels.includes('size');
}
export function validateLegendCombine(value) {
  if(value===undefined)return;
  if (!['separate','size-shape','color-size','color-size-shape'].includes(value)) throw new Error('Legend combine must be separate, size-shape, color-size, or color-size-shape.');
}
export function validateMappedSizeShapeSymbol(symbol) {
  if(symbol===undefined||symbol==='auto')return;
  const layers=symbol.layers??[];
  if(layers.some(layer=>layer.type==='point'&&(Object.hasOwn(layer,'shape')||Object.hasOwn(layer,'size')))) {
    throw new Error('Combined size-shape symbols cannot override mapped shape or size.');
  }
}

export function resolveSizeShapeMapping({layer,scales,order,rows}) {
  const shape=layer?.encoding?.shape,size=layer?.encoding?.size;
  const shapeScale=scales[shape?.scale],sizeScale=scales[size?.scale];
  if(layer?.mark?.type!=="point"||shape?.field!==size?.field||
      !["nominal","ordinal"].includes(size?.fieldType)||shapeScale?.type!=="ordinal"||
      sizeScale?.type!=="ordinal"||!sameOrderedValues(shapeScale.domain,sizeScale.domain)) {
    throw new Error("Combined size-shape requires one categorical point field and identical ordered domains.");
  }
  validateGeneratedItemLimit(shapeScale.domain.length,"Categorical legend item count");
  if(shapeScale.domain.length===0||sizeScale.range.some(area=>!Number.isFinite(area)||area<0)) {
    throw new Error("Combined size-shape requires a nonempty domain and finite nonnegative areas.");
  }
  let linked;
  if(order?.channel!==undefined){
    const position=layer.encoding[order.channel];
    if(!["nominal","ordinal"].includes(position?.fieldType)||position.field!==shape.field) {
      throw new Error("Linked legend order requires the same categorical field on its target.");
    }
    linked=scales[position.scale]?.domain;
  }
  const domain=resolveLegendOrderDomain(shapeScale.domain,order,linked,
    order?.values===undefined?undefined:readNominalField(rows,shape.field));
  return {domain,sizeAreas:mapOrdinalValues(domain,sizeScale.domain,sizeScale.range)};
}
