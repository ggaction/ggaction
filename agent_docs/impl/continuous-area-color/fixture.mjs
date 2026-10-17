// Synthetic review fixture, not a translated corpus program.
import {chart} from '../../../src/index.js';
export const colors=['#D9D9F3','#00BFFF','#0276FD','#000080','#000080','#0276FD','#00BFFF','#D9D9F3'];
export const values=Array.from({length:9},(_,group)=>[1,2,1].map((value,x)=>({series:`band-${group}`,x,value,level:10+1010*group}))).flat();
export const colorOptions={field:'level',fieldType:'quantitative',scale:{domain:[10,8090],range:colors,interpolate:'hcl',whitePoint:'d50'}};
export function baseArea(){return chart().createCanvas({width:320,height:220,margin:20}).createData({values}).createAreaPlot({x:{field:'x',scale:{domain:[0,2],nice:false}},y:{field:'value',scale:{domain:[0,20],nice:false}},guides:false}).encodeGroup({fields:['series']});}
export function proposedProgram(){return baseArea().encodeColor(colorOptions).layoutSeries({mode:'stack'}).editAreaMark({opacity:.7});}
export function approvedScaleControl(){return chart().createCanvas({width:320,height:220,margin:20}).createData({values}).createScatterPlot({x:'x',y:'value',guides:false}).encodeColor(colorOptions);}
