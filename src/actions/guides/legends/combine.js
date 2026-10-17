import {prepareLegendGroup} from "./group.js";
import {sameOrderedValues} from '../../../core/validation.js';

export {validateLegendCombine} from "../../../grammar/legendCombinations.js";
import {validateMappedSizeShapeSymbol} from "../../../grammar/legendCombinations.js";

export function resolveSizeShapeCreation(program,args,layers,standard,internalChannels) {
  const explicit=args.channels;
  if (internalChannels===undefined && explicit!==undefined &&
      !(explicit.length===2&&explicit.includes('shape')&&explicit.includes('size'))) {
    throw new Error('size-shape combine requires exactly shape and size channels.');
  }
  const candidates=layers.filter(layer=>layer.mark?.type==='point'&&layer.encoding?.shape&&layer.encoding?.size&&
    (args.target===undefined||layer.id===args.target));
  if(candidates.length!==1)throw new Error('size-shape combine requires one point owner or an explicit target.');
  const layer=candidates[0],shape=layer.encoding.shape,size=layer.encoding.size;
  const shapeScale=program.resolvedScales[shape.scale],sizeScale=program.resolvedScales[size.scale];
  if(shape.field!==size.field||!['nominal','ordinal'].includes(size.fieldType)||
      shapeScale?.type!=='ordinal'||sizeScale?.type!=='ordinal'||
      !sameOrderedValues(shapeScale.domain,sizeScale.domain)) {
    throw new Error('size-shape combine requires one categorical field and identical ordered ordinal domains.');
  }
  if(sizeScale.range.some(area=>!Number.isFinite(area)||area<0))throw new Error('Combined size areas must be finite and nonnegative.');
  validateMappedSizeShapeSymbol(args.symbol);
  const {combine:_combine,channels:_channels,...common}=args;
  const steps=[{op:'createCategoricalLegend',args:{...common,target:layer.id,channels:['shape','size']}}];
  const others=internalChannels??explicit??(layer.encoding.color?['color']:[]);
  for(const channel of others.filter(channel=>!['shape','size'].includes(channel))){
    const color={target:layer.id,channels:[channel]};
    for(const key of ['position','align','offset','title','labels','titleStyle','border'])if(Object.hasOwn(common,key))color[key]=common[key];
    steps.push(...standard(program,color,layers).steps);
  }
  const position=common.position??'right';
  const blockLayout=program.guideConfigs.legendGroups?.[layer.id]?.blockLayout??(['left','right'].includes(position)?'column':'row');
  const prepared=prepareLegendGroup(program,{...common,blockLayout},layer.id,{creation:true,nativeOffset:8});
  return {steps,finish:'always',legendGroup:{target:layer.id,config:prepared.program.guideConfigs.legendGroups[layer.id]}};
}
