// Synthetic independent review fixture; no proposed feature implementation.
import {chart} from '../../../src/index.js';
export const samples=1000,level=.95,seed=1;
export const groups=[[0,0,1,2,30],[1,2,2,3,35],[0,1,4,5,40],[2,3,5,8,45],[1,2,6,10,50]];
export const values=groups.flatMap((vs,x)=>vs.map(value=>({x,value})));
export function proposedProgram(){return chart().createData({values}).createSummaryData({id:'intervals',groupBy:['x'],aggregates:[{field:'value',op:'mean',as:'mean'},{field:'value',op:{op:'ciLower',method:{type:'bootstrap',seed},level},as:'lower'},{field:'value',op:{op:'ciUpper',method:{type:'bootstrap',seed},level},as:'upper'}]});}
// Independent target only. The production action must be separately implemented
// and compared with this frozen numeric/primitive reference after approval.
export function independentTarget(){let state=seed;const random=()=>{state=(1103515245*state+12345)%2147483647;return state/2147483647;},quantile=(a,p)=>{const i=(a.length-1)*p,l=Math.floor(i);return a[l]+(a[Math.min(l+1,a.length-1)]-a[l])*(i-l);};return groups.map((vs,x)=>{const means=[];for(let j=0;j<samples;j++){let sum=0;for(let k=0;k<vs.length;k++)sum+=vs[Math.floor(random()*vs.length)];means.push(sum/vs.length);}means.sort((a,b)=>a-b);return{x,mean:vs.reduce((a,b)=>a+b,0)/vs.length,lower:quantile(means,(1-level)/2),upper:quantile(means,1-(1-level)/2)};});}
