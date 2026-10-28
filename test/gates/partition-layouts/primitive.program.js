import {chart} from "../../../src/index.js";
import {encodeRowKey} from "../../../src/core/itemIdentity.js";
import {normalizeHierarchyNodes} from "../../../src/grammar/hierarchy/normalize.js";
import {createPartitionView} from "../../../src/grammar/hierarchy/partitionView.js";
import {mapPartitionRectangle,mapPartitionSector} from "../../../src/grammar/hierarchy/partitionMapping.js";
import {bendPartitionPoint} from "../../../src/grammar/hierarchy/partitionBend.js";
import {buildAnnularSectorCommands} from "../../../src/grammar/polarPaths.js";
import {frame,colors,rectangle,sector,bendOptions,inputRows,variantById} from "./manifest.js";

const cellOf=node=>({u0:node.u0,u1:node.u1,v0:node.v0,v1:node.v1});
const rectanglePath=r=>[{op:"M",x:r.x,y:r.y},{op:"L",x:r.x+r.width,y:r.y},{op:"L",x:r.x+r.width,y:r.y+r.height},{op:"L",x:r.x,y:r.y+r.height},{op:"Z"}];
export function bendScreenPoint(u,v,bend) {
  const point=bendPartitionPoint({u,v,bend},bendOptions);
  return {x:240+point.x,y:180+point.y};
}
function bendPath(cell,bend) {
  // Fixture-only polyline: <= 128 angular chords per boundary, at most 259 commands.
  const count=Math.max(1,Math.ceil((cell.u1-cell.u0)*128)),points=[];
  for(let i=0;i<=count;i++)points.push(bendScreenPoint(cell.u0+(cell.u1-cell.u0)*i/count,cell.v0,bend));
  for(let i=count;i>=0;i--)points.push(bendScreenPoint(cell.u0+(cell.u1-cell.u0)*i/count,cell.v1,bend));
  return points.map((p,i)=>({op:i===0?"M":"L",...p})).concat({op:"Z"});
}
export function partitionFixture(id) {
  const variant=variantById(id),input=inputRows(variant);
  const model=normalizeHierarchyNodes(input,{valueMode:variant.input==="inclusive"?"inclusive":"leaf-sum",forest:variant.input==="forest"});
  const view=createPartitionView(model,{...(variant.focus?{focusKey:encodeRowKey(variant.focus)}:{}),...(variant.rootVisible===false?{rootVisible:false}:{})});
  const shapes=[];
  for(const node of view.nodes){
    if(!node.visible)continue;
    const cell=cellOf(node),label=input[node.sourceRows[0]].key;
    let geometry,commands,anchor;
    if(variant.kind==="rectangle"){
      geometry=mapPartitionRectangle(cell,{...rectangle,...variant.mapping});
      if(!geometry.visible)continue;
      commands=rectanglePath(geometry);anchor={x:geometry.x+geometry.width/2,y:geometry.y+geometry.height/2};
    }else if(variant.kind==="sector"){
      geometry=mapPartitionSector(cell,{...sector,...variant.mapping});
      if(!geometry.visible)continue;
      commands=buildAnnularSectorCommands({frame:{centerX:240,centerY:190,availableRadius:120},startTheta:geometry.startAngle*180/Math.PI,endTheta:geometry.endAngle*180/Math.PI,innerRadius:geometry.innerRadius,outerRadius:geometry.outerRadius});
      const angle=(geometry.startAngle+geometry.endAngle)/2,radius=(geometry.innerRadius+geometry.outerRadius)/2;
      anchor={x:240+radius*Math.sin(angle),y:190-radius*Math.cos(angle)};
    }else{
      if(cell.u0===cell.u1)continue;
      commands=bendPath(cell,variant.bend);geometry={bend:variant.bend};
      anchor=bendScreenPoint((cell.u0+cell.u1)/2,(cell.v0+cell.v1)/2,variant.bend);
    }
    shapes.push({key:node.key,label,value:node.totalValue,cell,geometry,commands,anchor,fill:colors[label]});
  }
  return {variant,input,model,view,shapes};
}
export function createPartitionPrimitive(id) {
  const {variant,shapes}=partitionFixture(id);
  return chart()
    .createCanvas({plot:frame,margin:{left:0,top:0,right:0,bottom:0},background:"#ffffff",plotBorder:false})
    .createGraphics({id:"partition-cells",type:"path",length:shapes.length,parent:"plot-main"})
    .editGraphics({target:"partition-cells",property:"commands",value:shapes.map(shape=>shape.commands)})
    .editGraphics({target:"partition-cells",property:"fill",value:shapes.map(shape=>shape.fill)})
    .createGraphics({id:"partition-labels",type:"text",length:shapes.length,parent:"plot-main"})
    .editGraphics({target:"partition-labels",property:"x",value:shapes.map(shape=>shape.anchor.x)})
    .editGraphics({target:"partition-labels",property:"y",value:shapes.map(shape=>shape.anchor.y)})
    .editGraphics({target:"partition-labels",property:"text",value:shapes.map(shape=>`${shape.label} ${shape.value}`)})
    .editGraphics({target:"partition-labels",property:"fill",value:"#0f172a"})
    .editGraphics({target:"partition-labels",property:"fontSize",value:12})
    .editGraphics({target:"partition-labels",property:"fontFamily",value:"sans-serif"})
    .editGraphics({target:"partition-labels",property:"textAlign",value:"center"})
    .editGraphics({target:"partition-labels",property:"textBaseline",value:"middle"})
    .createGraphics({id:"review-title",type:"text",length:2,parent:"plot-main"})
    .editGraphics({target:"review-title",property:"x",value:24})
    .editGraphics({target:"review-title",property:"y",value:[28,338]})
    .editGraphics({target:"review-title",property:"text",value:[variant.title,variant.note]})
    .editGraphics({target:"review-title",property:"fill",value:"#0f172a"})
    .editGraphics({target:"review-title",property:"fontSize",value:[18,11]})
    .editGraphics({target:"review-title",property:"fontFamily",value:"sans-serif"})
    .editGraphics({target:"review-title",property:"textAlign",value:"left"})
    .editGraphics({target:"review-title",property:"textBaseline",value:"middle"});
}
