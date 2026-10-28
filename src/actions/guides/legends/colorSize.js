import { conditionalLegendLayer } from "../../../materialization/legendEncodings.js";
import {findLayer} from '../../../selectors/layers.js';
import {prepareLegendSpacingEdit} from '../../../grammar/legendSpacing.js';
import {findCoordinate} from '../../../selectors/coordinates.js';
import {legendBlockChannels} from '../../../grammar/legendBlocks.js';
import {mergeLegendTitleStyle} from '../../../grammar/legendTitleStyle.js';
import {validateOptionObject} from '../../../core/validation.js';
import {resolveColorSizeMapping,normalizeColorSizeSymbol,isColorSizeChannels,validateColorSizeShapeSamples,colorSizeChannels} from '../../../grammar/colorSizeLegend.js';
import {formatDiscretizedIntervals} from '../../../grammar/scales/index.js';
import {createPointShapeGraphic} from '../../../grammar/pointShapes.js';
import {resolveConcreteGraphicBounds} from '../../../grammar/schemas/graphicBounds.js';
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

export function resolveColorSizeOwner(program,target,combine='color-size',channels) {
 const candidates=(target===undefined?program.semanticSpec.layers.map(layer => conditionalLegendLayer(layer)):[findLayer(program,target)]).filter(layer=>layer?.mark?.type==='point'&&
  (layer.encoding?.color||combine==='color-size-shape'&&layer.encoding?.stroke)&&layer.encoding?.size);
 const mapping=layer=>resolveColorSizeMapping({layer,scales:program.resolvedScales,pointConfig:program.markConfigs[layer.id],
  coordinate:findCoordinate(program,layer.coordinate),combine,channels});
 if(target!==undefined){if(candidates.length!==1)throw new Error('Color-size combination requires one point owner or an explicit target.');return mapping(candidates[0]);}
 const eligible=[];for(const layer of candidates){try{eligible.push(mapping(layer));}catch{/* Ineligible owners do not participate in inference. */}}
 if(eligible.length!==1){if(candidates.length===1)return mapping(candidates[0]);throw new Error('Color-size combination requires one eligible point owner or an explicit target.');}
 return eligible[0];
}

export function resolveColorSizeConfig(program,args={}) {
 validateOptionObject(args,[...ITEM_LEGEND_OPTIONS.filter(key=>key!=='overflow'),'channels','combine','symbol','blockLayout','at'],'Color-size legend');
 const combine=args.combine??'color-size';
 if(args.channels!==undefined&&!isColorSizeChannels(args.channels,combine))throw new Error('Combined legend requires exactly its color/stroke, size and optional shape channels.');
 const mapping=resolveColorSizeOwner(program,args.target,combine,args.channels);
 const sampling=normalizeLegendSampling(args,{label:'Color-size legend'});
 if(combine==='color-size-shape')validateColorSizeShapeSamples(sampling,program.resolvedScales[mapping.colorScale]);
 return {...mapping,...normalizeItemLegendConfig(args,{field:mapping.field},40),
  sampling,symbol:normalizeColorSizeSymbol(args.symbol,undefined,{...mapping,combine}),combine};
}

export function refreshColorSizeConfig(program,stored) {
 const mapping=resolveColorSizeOwner(program,stored.target,stored.combine,colorSizeChannels(stored));
 if(mapping.field!==stored.field)throw new Error('Color-size combination field changed; explicitly recreate the block.');
 return {...stored,...mapping,title:stored.inferredTitle?mapping.field:stored.title};
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

function writeSemantic(program,config) {
 let next=program.editSemantic({property:'guide.legend.colorSize.colorScale',value:config.colorScale})
  .editSemantic({property:'guide.legend.colorSize.sizeScale',value:config.sizeScale})
  .editSemantic({property:'guide.legend.colorSize.title',value:config.title})._withLegendConfig('colorSize',config);
 if(config.shapeScale!==undefined)next=next.editSemantic({property:'guide.legend.colorSize.shapeScale',value:config.shapeScale})
  .editSemantic({property:'guide.legend.colorSize.colorChannel',value:config.colorChannel});
 return next;
}

export function materializeColorSizeLegend(program,stored) {
 const config=refreshColorSizeConfig(program,stored),layout=resolveColorSizeLayout(program,config),effective=layout.config;
 let next=writeSemantic(program,config);
 if(layout.items)next=next.editGraphics({target:'colorSizeLegendSymbols',property:'items',value:layout.items});
 else next=editGraphicProperties(next,'colorSizeLegendSymbols',{length:layout.values.length,x:layout.symbolX,y:layout.itemY,radius:layout.radii,
  fill:layout.colors,stroke:effective.symbol.stroke??layout.colors,strokeWidth:effective.symbol.strokeWidth,opacity:effective.symbol.opacity});
 const visible=layout.text.flatMap((text,index)=>text===''?[]:[index]);
 next=editGraphicProperties(next,'colorSizeLegendLabels',{length:visible.length,x:visible.map(i=>layout.labelX[i]),y:visible.map(i=>layout.itemY[i]),text:visible.map(i=>layout.text[i])});
 next=editLegendBackground(next,'colorSizeLegendBackground',layout.background,effective.border);
 next=styleContinuousText(next,'colorSizeLegendLabels',effective.labels);
 if(effective.titleVisible!==false){
  next=editGraphicProperties(next,'colorSizeLegendTitle',{x:layout.title.x,y:layout.title.y,text:effective.title});
  next=styleContinuousText(next,'colorSizeLegendTitle',effective.titleStyle,{align:layout.title.align});
 }
 return applyLegendClipGraphics(next,{anchors:{colorSize:layout.itemY}});
}

export function createColorSizeLegendFromConfig(program,config) {
 if(Object.entries(program.guideConfigs.legend??{}).some(([kind,stored])=>stored.target===config.target&&legendBlockChannels(kind,stored).some(channel=>colorSizeChannels(config).includes(channel))))throw new Error('Color-size content already has a legend; edit its combination explicitly.');
 const layout=resolveColorSizeLayout(program,config),placement=resolveLegendGraphicPlacement(program);
 let next=writeSemantic(program,config);
 if(config.border!==false)next=next.createGraphics({id:'colorSizeLegendBackground',type:'rect',...placement});
 next=next.createGraphics({id:'colorSizeLegendSymbols',...(config.shapeScale===undefined?{type:'circle',length:layout.values.length}:{type:'collection'}),...placement})
  .createGraphics({id:'colorSizeLegendLabels',type:'text',length:layout.values.length,...placement});
 if(config.titleVisible!==false)next=next.createGraphics({id:'colorSizeLegendTitle',type:'text',...placement});
 return materializeColorSizeLegend(next,config);
}

export function resolveColorSizeEdit(program,previous,args) {
 ({previous,args}=prepareLegendSpacingEdit(previous,args));
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
  symbol:normalizeColorSizeSymbol(args.symbol,previous.symbol,previous),
  sampling:normalizeLegendSampling(args,{previous,operation:'edit',label:'Color-size legend'})};
 resolveColorSizeLayout(program,config);
 return config;
}
