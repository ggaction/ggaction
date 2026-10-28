import {chart} from "../../../src/index.js";
import {encodeRowKey} from "../../../src/core/itemIdentity.js";
import {normalizeHierarchyNodes} from "../../../src/grammar/hierarchy/normalize.js";
import {createPartitionView} from "../../../src/grammar/hierarchy/partitionView.js";
import {mapPartitionRectangle,mapPartitionSector} from "../../../src/grammar/hierarchy/partitionMapping.js";
import {buildAnnularSectorCommands} from "../../../src/grammar/polarPaths.js";
import {canvas,frame,colors,rectangle,sector,inputRows,variantById} from "./reference-values.js";

const cellOf=node=>({u0:node.u0,u1:node.u1,v0:node.v0,v1:node.v1});
const rectanglePath=r=>[{op:"M",x:r.x,y:r.y},{op:"L",x:r.x+r.width,y:r.y},{op:"L",x:r.x+r.width,y:r.y+r.height},{op:"L",x:r.x,y:r.y+r.height},{op:"Z"}];
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
    }else{
      geometry=mapPartitionSector(cell,{...sector,...variant.mapping});
      if(!geometry.visible)continue;
      commands=buildAnnularSectorCommands({frame:{centerX:240,centerY:190,availableRadius:120},startTheta:geometry.startAngle*180/Math.PI,endTheta:geometry.endAngle*180/Math.PI,innerRadius:geometry.innerRadius,outerRadius:geometry.outerRadius});
      const angle=(geometry.startAngle*180/Math.PI+geometry.endAngle*180/Math.PI)/2*Math.PI/180,radius=(geometry.innerRadius+geometry.outerRadius)/2;
      anchor={x:240+radius*Math.sin(angle),y:190-radius*Math.cos(angle)};
    }
    shapes.push({key:node.key,label,value:node.totalValue,cell,geometry,commands,anchor,fill:colors[label]});
  }
  return {variant,input,model,view,shapes};
}
export function createPartitionPrimitive(id) {
  const {variant,shapes}=partitionFixture(id);
  let program = chart()
    .createCanvas(canvas)
    .createGraphics({id:"partition-cells",type:variant.kind==="rectangle"?"rect":"path",length:shapes.length,parent:"plot-main"});
  program = variant.kind === "rectangle" ? program
    .editGraphics({target:"partition-cells",property:"x",value:shapes.map(s=>s.geometry.x)})
    .editGraphics({target:"partition-cells",property:"y",value:shapes.map(s=>s.geometry.y)})
    .editGraphics({target:"partition-cells",property:"width",value:shapes.map(s=>s.geometry.width)})
    .editGraphics({target:"partition-cells",property:"height",value:shapes.map(s=>s.geometry.height)})
    : program.editGraphics({target:"partition-cells",property:"commands",value:shapes.map(s=>s.commands)});
  return program
    .editGraphics({target:"partition-cells",property:"fill",value:shapes.map(shape=>shape.fill)})
    .editGraphics({target:"partition-cells",property:"stroke",value:"#ffffff"})
    .editGraphics({target:"partition-cells",property:"strokeWidth",value:0})
    .editGraphics({target:"partition-cells",property:"opacity",value:1})
    .createGraphics({id:"partition-labels",type:"text",length:shapes.length,parent:"plot-main"})
    .editGraphics({target:"partition-labels",property:"x",value:shapes.map(shape=>shape.anchor.x)})
    .editGraphics({target:"partition-labels",property:"y",value:shapes.map(shape=>shape.anchor.y)})
    .editGraphics({target:"partition-labels",property:"text",value:shapes.map(shape=>`${shape.label} ${shape.value}`)})
    .editGraphics({target:"partition-labels",property:"fill",value:"#0f172a"})
    .editGraphics({target:"partition-labels",property:"fontSize",value:12})
    .editGraphics({target:"partition-labels",property:"fontFamily",value:"sans-serif"})
    .editGraphics({target:"partition-labels",property:"fontWeight",value:"normal"})
    .editGraphics({target:"partition-labels",property:"textAlign",value:"center"})
    .editGraphics({target:"partition-labels",property:"textBaseline",value:"middle"})
    .createGraphics({id:"heading",type:"text",length:2,parent:"canvas"})
    .editGraphics({target:"heading",property:"x",value:54})
    .editGraphics({target:"heading",property:"y",value:[29,51.5]})
    .editGraphics({target:"heading",property:"text",value:[variant.title,variant.note]})
    .editGraphics({target:"heading",property:"fill",value:"#0f172a"})
    .editGraphics({target:"heading",property:"fontSize",value:[18,11]})
    .editGraphics({target:"heading",property:"fontFamily",value:"sans-serif"})
    .editGraphics({target:"heading",property:"fontWeight",value:"normal"})
    .editGraphics({target:"heading",property:"textAlign",value:"left"})
    .editGraphics({target:"heading",property:"textBaseline",value:"middle"});
}
