export const frame=Object.freeze({width:280,height:200});
export const fontFamily="ggaction Metric Fixture";
export const fontSHA256="cd7546c63196b68eda1205ca5544da143e0626cfb5623aa8a8988bf69b287878";
export const styles=Object.freeze(["rectangle-outline","circle-halo","path-outline","text-outline","text-halo","text-opacity","clip","zero-width"]);
export function outlineFixture(style){
 if(!styles.includes(style))throw new TypeError("Unknown outline variant.");
 const text=style.startsWith("text"),halo=style.includes("halo");
 return{style,title:style.replaceAll("-"," "),kind:text?"text":style.startsWith("circle")?"circle":style.startsWith("path")?"path":"rect",
  fill:[34,139,180],stroke:halo?[255,255,255]:[92,42,115],strokeWidth:style==="zero-width"?0:halo?16:8,opacity:style==="text-opacity"?.5:1,
  underlay:[226,232,240],clip:style==="clip"?{x:90,y:60,width:105,height:80}:null,
  rect:{x:80,y:80,width:120,height:60},circle:{x:140,y:110,radius:36},path:[{x:80,y:140},{x:140,y:70},{x:200,y:140}],
  text:{value:"AB",x:80,y:130,fontSize:60},group:{x:70,y:70,width:100,height:70}};
}
