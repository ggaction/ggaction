import { preserveGraphicPlacement } from './graphicHierarchy.js';
import { editGraphicProperties } from '../actions/primitives/graphicProperties.js';

function borderCommands({x,y,width,height}) {
  return [{op:'M',x,y},{op:'L',x:x+width,y},{op:'L',x:x+width,y:y+height},
    {op:'L',x,y:y+height},{op:'Z'}];
}

export function materializeLegendBorder(program,id,bounds,border) {
  const dashed=border.strokeDash?.length>0,type=dashed?'path':'rect';
  let next=program;
  if(program.graphicSpec.objects[id]?.type!==type) {
    const placement=preserveGraphicPlacement(program,id);
    next=next.editGraphics({target:id,remove:true}).createGraphics({id,type,...placement});
  }
  return editGraphicProperties(next,id,{
    ...(dashed?{commands:borderCommands(bounds)}:bounds),
    fill:border.background,stroke:border.color,strokeWidth:border.lineWidth,
    ...(dashed?{strokeDash:border.strokeDash}:{})
  });
}

export function editLegendBorderBounds(program,id,bounds) {
  if(program.graphicSpec.objects[id]?.type==='path') {
    return program.editGraphics({target:id,property:'commands',value:borderCommands(bounds)});
  }
  return editGraphicProperties(program,id,{x:bounds.x,y:bounds.y,width:bounds.width,height:bounds.height});
}
