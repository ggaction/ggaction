import {sameOrderedValues,validateOptionObject,validateUnitInterval,validateNonNegativeFinite,validateNonEmptyString} from '../core/validation.js';
import {isContinuousColorScaleType,isDiscretizedColorScaleType} from './scales/types.js';
import {isContinuousSizeScaleType} from './scales/size.js';

export function isColorSizeChannels(channels,combine='color-size') {
 return Array.isArray(channels)&&(combine==='color-size-shape'
  ? channels.length===3&&channels.includes('shape')&&channels.includes('size')&&['color','stroke'].some(c=>channels.includes(c))
  : channels.length===2&&channels.includes('color')&&channels.includes('size'));
}

export function resolveColorSizeMapping({layer,scales,pointConfig,coordinate,combine='color-size',channels}) {
 if(combine==='color-size-shape')return resolveColorSizeShapeMapping({layer,scales,coordinate,channels});
 const color=layer?.encoding?.color,size=layer?.encoding?.size;
 const colorScale=scales[color?.scale],sizeScale=scales[size?.scale];
 if(layer?.mark?.type!=='point'||coordinate?.type!=='cartesian'||
   pointConfig?.shape!=='circle'||layer.encoding.shape!==undefined||
   color?.fieldType!=='quantitative'||size?.fieldType!=='quantitative'||
   typeof color.field!=='string'||color.field!==size.field||
   color.aggregate!==size.aggregate||color.data!==size.data||
   !isContinuousColorScaleType(colorScale?.type)||!isContinuousSizeScaleType(sizeScale?.type)) {
  throw new Error('Color-size combination requires one Cartesian circle point owner with the same quantitative field and grain.');
 }
 const ends=scale=>[scale.domain?.[0],scale.domain?.at(-1)];
 const domain=ends(colorScale),sizeDomain=ends(sizeScale);
 if(!domain.every(Number.isFinite)||!sizeDomain.every(Number.isFinite)||
   !sameOrderedValues(domain,sizeDomain)||domain[0]===domain[1]) {
  throw new Error('Color-size combination requires identical finite numeric domain endpoints.');
 }
 return {target:layer.id,field:color.field,fieldType:'quantitative',colorScale:color.scale,sizeScale:size.scale,domain};
}

export function normalizeColorSizeSymbol(value,previous,mapping) {
 if(mapping?.combine==='color-size-shape') {
  if(value===undefined)return {...(previous??{type:'point'})};
  if(value==='auto')return {type:'point'};
  validateOptionObject(value,['type','fill','stroke','strokeWidth','opacity'],'Color-size-shape symbol');
  if(value.type!==undefined&&value.type!=='point')throw new Error('Combined symbols require type point.');
  const symbol={type:'point',...previous,...value};
  const mapped=mapping.colorChannel==='stroke'?'stroke':'fill';
  if(Object.hasOwn(symbol,mapped))throw new Error(`Combined symbols cannot override mapped ${mapped}.`);
  for(const key of ['fill','stroke'])if(symbol[key]!==undefined)validateNonEmptyString(symbol[key],`Combined symbol ${key}`);
  if(symbol.strokeWidth!==undefined)validateNonNegativeFinite(symbol.strokeWidth,'Combined symbol strokeWidth');
  if(symbol.opacity!==undefined)validateUnitInterval(symbol.opacity,'Combined symbol opacity');
  return symbol;
 }
 if(value===undefined)return {...(previous??{type:'point',strokeWidth:0,opacity:1})};
 if(value==='auto')return {type:'point',strokeWidth:0,opacity:1};
 validateOptionObject(value,['type','stroke','strokeWidth','opacity'],'Color-size symbol');
 if(value.type!==undefined&&value.type!=='point')throw new Error('Color-size symbols require type point.');
 const symbol={type:'point',strokeWidth:0,opacity:1,...previous,...value};
 if(symbol.stroke!==undefined)validateNonEmptyString(symbol.stroke,'Color-size symbol stroke');
 validateNonNegativeFinite(symbol.strokeWidth,'Color-size symbol strokeWidth');
 validateUnitInterval(symbol.opacity,'Color-size symbol opacity');
 return symbol;
}

function resolveColorSizeShapeMapping({layer,scales,coordinate,channels}) {
 const hues=channels===undefined?['color','stroke'].filter(c=>layer?.encoding?.[c]?.scale!==undefined)
  :channels.filter(c=>['color','stroke'].includes(c));
 if(hues.length!==1)throw new Error('Color-size-shape requires one color or stroke channel; select channels explicitly.');
 const colorChannel=hues[0],hue=layer?.encoding?.[colorChannel],size=layer?.encoding?.size,shape=layer?.encoding?.shape;
 const colorScale=scales[hue?.scale],sizeScale=scales[size?.scale],shapeScale=scales[shape?.scale];
 if(layer?.mark?.type!=='point'||coordinate?.type!=='cartesian'||
   hue?.fieldType!=='quantitative'||size?.fieldType!=='quantitative'||
   !['nominal','ordinal'].includes(shape?.fieldType)||typeof hue.field!=='string'||
   [size,shape].some(e=>e.field!==hue.field||e.data!==hue.data||e.aggregate!==hue.aggregate)||
   !isDiscretizedColorScaleType(colorScale?.type)||!isDiscretizedColorScaleType(sizeScale?.type)||shapeScale?.type!=='ordinal') {
  throw new Error('Color-size-shape requires one Cartesian point owner with the same field and grain on interval hue/size and ordinal shape.');
 }
 if(!sameOrderedValues(colorScale.thresholds,sizeScale.thresholds))throw new Error('Combined interval scales require identical threshold boundaries.');
 return {target:layer.id,field:hue.field,fieldType:'quantitative',colorScale:hue.scale,sizeScale:size.scale,
  shapeScale:shape.scale,colorChannel,domain:[...colorScale.domain]};
}

export function validateColorSizeShapeSamples(sampling,scale) {
 const cuts=scale.thresholds;
 if(sampling.mode!=='values'||sampling.values.length!==cuts.length+1||sampling.values.some((value,index)=>
  !Number.isFinite(value)||index>0&&value<cuts[index-1]||index<cuts.length&&value>=cuts[index])) {
  throw new Error('Color-size-shape requires one explicit finite value in each ordered threshold interval.');
 }
 return [...sampling.values];
}

export function colorSizeScaleIds(config) {
 return [config.colorScale,config.sizeScale,...(config.shapeScale===undefined?[]:[config.shapeScale])];
}

export function colorSizeChannels(config) {
 return [config.colorChannel??'color','size',...(config.shapeScale===undefined?[]:['shape'])];
}
