import { chart } from "../../../src/index.js";
import { frame, shadowFixture } from "../../../examples/mark-shadows/data.js";
export function createMarkShadowPrimitive(style = "soft-shadow") {
  const f=shadowFixture(style);
  let p=chart().createGraphics({id:"canvas",type:"canvas"})
    .editGraphics({target:"canvas",property:"width",value:frame.width})
    .editGraphics({target:"canvas",property:"height",value:frame.height})
    .editGraphics({target:"canvas",property:"background",value:"white"})
    .createGraphics({id:"plot-main",type:"collection",parent:"canvas"})
    .createGraphics({id:"background",type:"rect",length:1,parent:"plot-main"})
    .editGraphics({target:"background",property:"items",value:[{type:"rect",properties:{x:20,y:45,width:220,height:135,fill:"#e2e8f0",opacity:1,stroke:"transparent",strokeWidth:0}}]})
    .createGraphics({id:"title",type:"text",length:1,parent:"plot-main"})
    .editGraphics({target:"title",property:"items",value:[{type:"text",properties:{x:20,y:24,text:f.title,fill:"#243447",opacity:1,fontSize:14,fontFamily:"Arial",fontWeight:"normal",textAlign:"left",textBaseline:"alphabetic",rotation:0}}]})
    .createGraphics({id:"sibling",type:"rect",length:1,parent:"plot-main"})
    .editGraphics({target:"sibling",property:"items",value:[{type:"rect",properties:{x:210,y:75,width:20,height:35,fill:"#fbbf24",opacity:1,stroke:"transparent",strokeWidth:0}}]});
  const appearance={fill:f.fill,opacity:f.opacity,shadow:f.shadow,stroke:"transparent",strokeWidth:0};
  if(f.kind==="circle")p=p.createGraphics({id:"shadowed",type:"circle",length:1,parent:"plot-main"})
    .editGraphics({target:"shadowed",property:"items",value:[{type:"circle",properties:{x:115,y:110,radius:26,...appearance}}]});
  else p=p.createGraphics({id:"shadowed",type:"rect",length:1,parent:"plot-main"})
    .editGraphics({target:"shadowed",property:"items",value:[{type:"rect",properties:{x:80,y:80,width:70,height:60,...appearance}}]});
  return f.clip?p.editGraphics({target:"shadowed",property:"clip",value:f.clip}):p;
}
