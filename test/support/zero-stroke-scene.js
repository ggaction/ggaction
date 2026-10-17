import {noPaintScene,noPaintSamples} from './none-paint-scene.js';
export function zeroStrokeScene(){
 const scene=noPaintScene(),objects=scene.graphicSpec.objects;
 for(const graphic of Object.values(objects))if(graphic.properties.stroke!==undefined){
  graphic.properties.stroke='red';graphic.properties.strokeWidth=0;
 }
 // A preceding real wide stroke catches retained context paint and width.
 objects.wide={type:'line',properties:{x1:5,y1:95,x2:230,y2:95,stroke:'blue',strokeWidth:8}};
 objects.canvas.children.unshift('wide');return scene;
}
export const zeroStrokeSamples=noPaintSamples;
