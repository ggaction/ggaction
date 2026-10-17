import {findLayer} from '../../../selectors/layers.js';
import {findCoordinate} from '../../../selectors/coordinates.js';
import {legendBlockChannels} from '../../../grammar/legendBlocks.js';
import {mergeLegendTitleStyle} from '../../../grammar/legendTitleStyle.js';
import {validateOptionObject} from '../../../core/validation.js';
import {resolveColorSizeMapping,normalizeColorSizeSymbol,isColorSizeChannels} from '../../../grammar/colorSizeLegend.js';
import {mapSizeValues} from '../../../grammar/scales/size.js';
import {mapScaleConsumerValues} from '../../../materialization/scales/map.js';
import {intrinsicLegendConfig} from '../../../materialization/legendGroups.js';
import {resolveDisplayLabel} from '../../../grammar/displayLabels.js';
import {clippedSampleBounds,validateLegendClip} from '../../../grammar/legendClip.js';
import {resolveLegendItemLayout} from '../../../layout/legendItems.js';
import {resolveLegendGraphicPlacement} from '../../../materialization/graphicHierarchy.js';
import {normalizeItemLegendConfig,ITEM_LEGEND_OPTIONS,resolveContinuousBounds,formatContinuousValues,assertLegendBoundsInsideCanvas,resolveLegendBackgroundFromBounds,editLegendBackground,styleContinuousText,editGraphicProperties} from './continuous/common.js';
import {normalizeLegendSampling,resolveLegendSampleValues,validateSamplingAgainstScale,readLegendSampling} from './sampling.js';
import {resolveEffectiveLegendBlockConfig} from './blocks.js';
import {applyLegendClipGraphics} from '../../../materialization/legendClip.js';

export function resolveColorSizeOwner(program,target) {
 const candidates=(target===undefined?program.semanticSpec.layers:[findLayer(program,target)]).filter(layer=>layer?.mark?.type==='point'&&layer.encoding?.color&&layer.encoding?.size);
 const mapping=layer=>resolveColorSizeMapping({layer,scales:program.resolvedScales,pointConfig:program.markConfigs[layer.id],
  coordinate:findCoordinate(program,layer.coordinate)});
 if(target!==undefined){if(candidates.length!==1)throw new Error('Color-size combination requires one point owner or an explicit target.');return mapping(candidates[0]);}
 const eligible=[];for(const layer of candidates){try{eligible.push(mapping(layer));}catch{/* Ineligible owners do not participate in inference. */}}
 if(eligible.length!==1){if(candidates.length===1)return mapping(candidates[0]);throw new Error('Color-size combination requires one eligible point owner or an explicit target.');}
 return eligible[0];
}

export function resolveColorSizeConfig(program,args={}) {
 validateOptionObject(args,[...ITEM_LEGEND_OPTIONS.filter(key=>key!=='overflow'),'channels','combine','symbol','blockLayout','at'],'Color-size legend');
 if(args.channels!==undefined&&!isColorSizeChannels(args.channels))throw new Error('Color-size combination requires exactly color and size channels.');
 const mapping=resolveColorSizeOwner(program,args.target);
 return {...mapping,...normalizeItemLegendConfig(args,{field:mapping.field},40),
  sampling:normalizeLegendSampling(args,{label:'Color-size legend'}),symbol:normalizeColorSizeSymbol(args.symbol),combine:'color-size'};
}

export function refreshColorSizeConfig(program,stored) {
 const mapping=resolveColorSizeOwner(program,stored.target);
 if(mapping.field!==stored.field)throw new Error('Color-size combination field changed; explicitly recreate the block.');
 return {...stored,...mapping,title:stored.inferredTitle?mapping.field:stored.title};
}

export function resolveColorSizeLayout(program,stored) {
 validateLegendClip('colorSize',stored);
 const config=intrinsicLegendConfig(program,resolveEffectiveLegendBlockConfig(program,'colorSize',stored));
 const color=program.resolvedScales[stored.colorScale],size=program.resolvedScales[stored.sizeScale];
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

function writeSemantic(program,config) {
 return program.editSemantic({property:'guide.legend.colorSize.colorScale',value:config.colorScale})
  .editSemantic({property:'guide.legend.colorSize.sizeScale',value:config.sizeScale})
  .editSemantic({property:'guide.legend.colorSize.title',value:config.title})._withLegendConfig('colorSize',config);
}

export function materializeColorSizeLegend(program,stored) {
 const config=refreshColorSizeConfig(program,stored),layout=resolveColorSizeLayout(program,config),effective=layout.config;
 let next=writeSemantic(program,config);
 next=editGraphicProperties(next,'colorSizeLegendSymbols',{length:layout.values.length,x:layout.symbolX,y:layout.itemY,radius:layout.radii,
  fill:layout.colors,stroke:effective.symbol.stroke??layout.colors,strokeWidth:effective.symbol.strokeWidth,opacity:effective.symbol.opacity});
 const visible=layout.text.flatMap((text,index)=>text===''?[]:[index]);
 next=editGraphicProperties(next,'colorSizeLegendLabels',{length:visible.length,x:visible.map(i=>layout.labelX[i]),y:visible.map(i=>layout.itemY[i]),text:visible.map(i=>layout.text[i])});
 next=editLegendBackground(next,'colorSizeLegendBackground',layout.background,effective.border);
 next=styleContinuousText(next,'colorSizeLegendLabels',effective.labels);
 if(effective.titleVisible!==false){
  next=editGraphicProperties(next,'colorSizeLegendTitle',{x:layout.title.x,y:layout.title.y,text:effective.title});
  next=styleContinuousText(next,'colorSizeLegendTitle',effective.titleStyle,{align:layout.title.align});
 }
 return applyLegendClipGraphics(next);
}

export function createColorSizeLegendFromConfig(program,config) {
 if(Object.entries(program.guideConfigs.legend??{}).some(([kind,stored])=>stored.target===config.target&&legendBlockChannels(kind,stored).some(channel=>['color','size'].includes(channel))))throw new Error('Color-size content already has a legend; edit its combination explicitly.');
 const layout=resolveColorSizeLayout(program,config),placement=resolveLegendGraphicPlacement(program);
 let next=writeSemantic(program,config);
 if(config.border!==false)next=next.createGraphics({id:'colorSizeLegendBackground',type:'rect',...placement});
 next=next.createGraphics({id:'colorSizeLegendSymbols',type:'circle',length:layout.values.length,...placement})
  .createGraphics({id:'colorSizeLegendLabels',type:'text',length:layout.values.length,...placement});
 if(config.titleVisible!==false)next=next.createGraphics({id:'colorSizeLegendTitle',type:'text',...placement});
 return materializeColorSizeLegend(next,config);
}

export function resolveColorSizeEdit(program,previous,args) {
 validateOptionObject(args,[...ITEM_LEGEND_OPTIONS.filter(key=>key!=='overflow'),'symbol'],'Color-size legend edit');
 const {count:_count,values:_values,title:_title,...layoutArgs}=args;
 const title=args.title==='auto'?previous.field:typeof args.title==='string'?args.title:previous.title;
 const border=args.border===undefined?previous.border:args.border===false||args.border===true?args.border:
  {...(previous.border===false?{}:previous.border),...args.border};
 const normalized=normalizeItemLegendConfig({...previous,...layoutArgs,title,
  ...(args.position!==undefined&&args.position!==previous.position&&args.direction===undefined?{direction:undefined}:{}),
  labels:{...previous.labels,...args.labels},titleStyle:mergeLegendTitleStyle(previous.titleStyle,args.titleStyle,{edit:true}),border},
  {field:previous.field},40);
 const config={...previous,...normalized,title,
  inferredTitle:args.title==='auto'?true:typeof args.title==='string'?false:previous.inferredTitle,
  titleVisible:args.title===false?false:args.title===undefined?previous.titleVisible:true,
  symbol:normalizeColorSizeSymbol(args.symbol,previous.symbol),
  sampling:normalizeLegendSampling(args,{previous,operation:'edit',label:'Color-size legend'})};
 resolveColorSizeLayout(program,config);
 return config;
}
