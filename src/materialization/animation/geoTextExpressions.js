import { ownArray, ownRecord } from "../../core/ownData.js";
import { canonicalJSON } from "../../core/contentDigest.js";
import { rejectUnknownProperties, validateWorkLimit } from "../../core/validation.js";
import { MAX_BLEND_SOURCES, validateBlendWeights } from "../../grammar/weightedBlend.js";
import { normalizeLabelLayoutGeometry } from "../../layout/labels.js";
import { validateConcreteGraphicProperties } from "../../grammar/schemas/concreteGraphic.js";
import { validatePreparedGeoTextFont, validatePreparedGeoTextMetrics } from "./geoAnnotation.js";
import { materializeFillItemsInPlot } from "../fillPaint.js";

const same = (a,b) => a === b || a !== undefined && b !== undefined && canonicalJSON(a) === canonicalJSON(b);
function closed(value, keys, label) {
  ownRecord(value,label);rejectUnknownProperties(value,keys,label);
  if(keys.some(key=>!Object.hasOwn(value,key)||value[key]===undefined))throw new TypeError(`${label} requires every declared field.`);
}
export function validateGeoTextExpressions(expressions, count, plotOrigin) {
  ownArray(expressions,"Geographic Text expressions");
  if(!expressions.length || expressions.length>MAX_BLEND_SOURCES)throw new RangeError(`Geographic Text requires 1..${MAX_BLEND_SOURCES} flat expressions.`);
  validateWorkLimit(expressions.length*Math.max(1,count),"Geographic Text expression work");
  const weights=expressions.map(value=>{closed(value,["weight","properties","textMetrics","layout","leader"],"Geographic Text expression");return value.weight;});
  if(weights.length===1 ? weights[0]!==1 : (validateBlendWeights(weights),false))throw new RangeError("A single geographic Text expression must have weight one.");
  if(weights.some(weight=>weight<=0))throw new RangeError("Geographic Text expressions must have positive weight.");
  const keys=new Set();
  for(const expression of expressions) {
    validatePreparedGeoTextMetrics(expression.textMetrics);
    const key=geoTextExpressionKey(expression);
    if(keys.has(key))throw new TypeError("Identical geographic Text expressions must be combined.");keys.add(key);
    if(expression.layout!==null&&!same(expression.layout,normalizeLabelLayoutGeometry(expression.layout)))throw new TypeError("Geographic Text layout must be normalized.");
    if(expression.leader!==false) {
      closed(expression.leader,["stroke","strokeWidth","strokeDash","opacity"],"Geographic Text leader");
      validateConcreteGraphicProperties("line",{x1:0,y1:0,x2:1,y2:1,...expression.leader});
    }
    ownArray(expression.properties,"Geographic Text expression properties");
    if(expression.properties.length!==count)throw new TypeError("Geographic Text expressions must follow the exact raw entry order.");
    for(const properties of expression.properties) {
      if(properties===null)continue;
      validatePreparedGeoTextFont(properties,expression.textMetrics);
      const concrete=materializeFillItemsInPlot([{type:"text",properties}],{plotOrigin,textMetrics:expression.textMetrics??undefined});
      for(const graphic of concrete)validateConcreteGraphicProperties(graphic.type,graphic.properties);
    }
  }
}
export const geoTextExpressionKey = expression => canonicalJSON({properties:expression.properties,textMetrics:expression.textMetrics,layout:expression.layout,leader:expression.leader});
export const geoTextHasLeaders = presentation => presentation.expressions.some(expression=>expression.leader!==false);

// Native preparation has one expression; the transport has no legacy aliases.
export function nativeGeoTextPresentation(value) {
  const {entries,textMetrics,layout,leader,...common}=value;
  return {...common,entries:entries.map(({properties,...entry})=>entry),
    expressions:[{weight:1,properties:entries.map(entry=>entry.properties),textMetrics,layout,leader}]};
}

// A scalar timeline boundary is available only when all retained expressions
// already share that property. Missing/ambiguous paint is never inferred.
export function geoTextEndpointStyle(presentation,index) {
  const styles=presentation.expressions.map(expression=>expression.properties[index]);
  return Object.fromEntries(["fill","stroke","opacity","strokeWidth"].flatMap(key=>{
    const read=style=>style===null?null:Object.hasOwn(style,key)?style[key]:key==="opacity"?1:undefined;
    const value=read(styles[0]);
    // Null marks an ambiguous private boundary; it must not become default opacity.
    if(!styles.every(style=>same(read(style),value)))return [[key,null]];
    return value===undefined?[]:[[key,value]];
  }));
}
