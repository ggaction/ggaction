export function normalizeLegendClipHeight(value,{edit=false}={}){
 if(value===undefined||edit&&value==='auto')return undefined;
 if(!Number.isFinite(value)||value<=0)throw new RangeError('Legend clipHeight must be a positive finite number.');
 return value;
}
export function validateLegendClip(kind,config){
 if(config.clipHeight===undefined)return;
 normalizeLegendClipHeight(config.clipHeight);
 const supported=['size','opacity','colorSize'].includes(kind)||kind==='gradient'&&config.representation==='symbols'||
  ['series','color','stroke'].includes(kind)&&config.symbol?.layers?.some(layer=>layer.type==='point');
 if(!supported)throw new Error('Legend clipHeight requires a point-bearing sample block.');
}
export function patchLegendClipHeight(config,value){
 const {clipHeight:_old,...rest}=config,clipHeight=normalizeLegendClipHeight(value,{edit:true});
 return clipHeight===undefined?rest:{...rest,clipHeight};
}
export function clippedSampleBounds(bounds,height){
 return height===undefined?bounds:{...bounds,top:Math.max(bounds.top,-height/2),bottom:Math.min(bounds.bottom,height/2)};
}
