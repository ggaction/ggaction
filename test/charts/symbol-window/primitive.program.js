import {chart} from '../../../src/index.js';

// Independent literal geometry: area5000 retains radius sqrt(5000/π) in H30.
export function createPrimitiveProgram() {
 const r=Math.sqrt(5000/Math.PI);
 return chart().createCanvas({width:400,height:200,margin:{left:10,right:180,top:10,bottom:10}})
  .createGraphics({id:'points',type:'collection',parent:'canvas'})
  .editGraphics({target:'points',property:'items',value:[
   {type:'circle',properties:{x:62.5,y:145,radius:15,fill:'#4c78a8'}},
   {type:'circle',properties:{x:167.5,y:55,radius:r,fill:'#4c78a8'}}]})
  .createGraphics({id:'sampleWindow',type:'canvas',parent:'canvas'})
  .editGraphics({target:'sampleWindow',property:'x',value:250})
  .editGraphics({target:'sampleWindow',property:'y',value:10})
  .editGraphics({target:'sampleWindow',property:'width',value:(250+r+r)-250})
  .editGraphics({target:'sampleWindow',property:'height',value:30})
  .createGraphics({id:'sample',type:'circle',parent:'sampleWindow'})
  .editGraphics({target:'sample',property:'x',value:(250+r)-250})
  .editGraphics({target:'sample',property:'y',value:15})
  .editGraphics({target:'sample',property:'radius',value:r})
  .editGraphics({target:'sample',property:'fill',value:'#94a3b8'})
  .editGraphics({target:'sample',property:'opacity',value:.7})
  .createGraphics({id:'label',type:'text',parent:'canvas'})
  .editGraphics({target:'label',property:'x',value:250+2*r+12})
  .editGraphics({target:'label',property:'y',value:19})
  .editGraphics({target:'label',property:'text',value:'10'})
  .editGraphics({target:'label',property:'fontSize',value:12})
  .editGraphics({target:'label',property:'fontFamily',value:'sans-serif'})
  .editGraphics({target:'label',property:'fontWeight',value:'normal'})
  .editGraphics({target:'label',property:'fill',value:'#334155'})
  .editGraphics({target:'label',property:'textAlign',value:'left'})
  .editGraphics({target:'label',property:'textBaseline',value:'top'});
}
