// Explicit concrete header target on the already-supported ordinary facet body.
import {chart} from '../../../src/index.js';
import {measureTextWidth} from '../../../src/core/textMetrics.js';
export const rows=[{region:'North',month:1,value:1},{region:'North',month:2,value:2},{region:'North',month:3,value:3},{region:'South',month:1,value:3},{region:'South',month:2,value:2},{region:'South',month:3,value:4}];
export const targetStyle={fontSize:12,fontFamily:'sans-serif',fontWeight:400};
// Freeze the established, pre-feature text metrics; these are not a new rotation implementation.
export const previousWidths=Object.fromEntries(['North','South'].map(text=>[text,measureTextWidth(text,targetStyle)]));
export const targetHeaderX=Object.fromEntries(Object.entries(previousWidths).map(([text,width])=>[text,15-(Math.abs(width/2*Math.cos(-Math.PI/2))+Math.abs(6*Math.sin(-Math.PI/2)))]));
export function createBody(){return chart()
.createCanvas({plot:{width:120,height:60},margin:{left:50,top:20,right:15,bottom:30}})
.createData({values:rows})
.createLinePlot({x:{field:'month',scale:{domain:[1,3]}},y:{field:'value',scale:{domain:[0,4]}},guides:false})
.createAxes({x:{title:false,ticksAndLabels:{values:[1,2,3],labels:{fontSize:10}}},y:{title:false,ticksAndLabels:{values:[0,2,4],labels:{fontSize:10}}}})
.createGrid({horizontal:{values:[0,2,4],color:'#e2e8f0'}});}
export function createPrimitiveTarget(){return createBody()
.facet({field:'region',columns:1,headers:{fontSize:12,fontWeight:400,labelMap:[{value:'North',label:''},{value:'South',label:''}]}})
.editFacetGuides({axes:'outer',legend:false})
.editCompositionLayout({spacing:'plot',gap:25})
.editGraphics({target:'facet-headers',property:'items',value:[
 {type:'text',properties:{x:targetHeaderX.North,y:50,text:'North',fill:'#0f172a',fontSize:12,fontFamily:'sans-serif',fontWeight:400,textAlign:'center',textBaseline:'middle',rotation:-Math.PI/2}},
 {type:'text',properties:{x:targetHeaderX.South,y:135,text:'South',fill:'#0f172a',fontSize:12,fontFamily:'sans-serif',fontWeight:400,textAlign:'center',textBaseline:'middle',rotation:-Math.PI/2}}
]});}
export const intendedPublicHeaderCalls=[{op:'facet',args:{field:'region',columns:1,headers:{fontSize:12,fontWeight:400,column:{side:'left',offset:35,rotation:{value:-90,unit:'degrees'}}}}},{op:'editFacetGuides',args:{axes:'outer',legend:false}},{op:'editCompositionLayout',args:{spacing:'plot',gap:25}}];
