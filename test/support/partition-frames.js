import { chart } from "../../src/index.js";
import { rows, colors } from "../../examples/partition-layouts/fixture.js";
export function partitionFrameEndpoints({padding=0,labels=true,radiusPolicy="equal-depth",clip=false}={}) {
 const before=chart().createCanvas({plot:{width:300,height:100},margin:{left:90,right:90,top:180,bottom:80},plotBorder:false,background:"white"})
  .createData({id:"d",values:rows,keyField:"key"}).createHierarchyData({id:"h",key:"key",parent:"parentKey",value:"value"})
  .layoutHierarchy({id:"l",method:"partition"}).createPartitionPlot({padding,clip,radiusPolicy,cells:{strokeWidth:0,overrides:rows.map(row=>({key:row.key,fill:colors[row.key]}))},
   labels:labels?{overrides:rows.map(row=>({key:row.key,text:`${row.key} ${row.value}`}))}:false});
 const after=before.createCoordinate({id:"polar",type:"polar"}).editCoordinate({target:"polar",polarFrame:{center:{x:.5,y:.5},radius:{unit:"px",value:100},overflow:"allow"}})
  .editPartitionPlot({coordinate:"polar",innerRadius:20,outerRadius:100,direction:"counterclockwise"});
 return{before,after};
}
