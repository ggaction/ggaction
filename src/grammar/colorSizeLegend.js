import {sameOrderedValues,validateOptionObject,validateUnitInterval,validateNonNegativeFinite,validateNonEmptyString} from '../core/validation.js';
import {isContinuousColorScaleType} from './scales/types.js';
import {isContinuousSizeScaleType} from './scales/size.js';

export function isColorSizeChannels(channels) {
 return Array.isArray(channels)&&channels.length===2&&channels.includes('color')&&channels.includes('size');
}

export function resolveColorSizeMapping({layer,scales,pointConfig,coordinate}) {
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

export function normalizeColorSizeSymbol(value,previous) {
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
