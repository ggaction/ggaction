export const frame=Object.freeze({width:300,height:280});
export const styles=Object.freeze(["source-over","multiply","screen","difference","source-over-reversed","multiply-reversed","group-opacity"]);
export function blendFixture(style){
 if(!styles.includes(style))throw new TypeError("Unknown blend fixture variant.");
 const reverse=style.endsWith("-reversed"),mode=style==="group-opacity"?"screen":style.replace("-reversed","");
 const back={rgb:[40,150,200],alpha:.5,bounds:{x:20,y:10,width:140,height:55}};
 const front={rgb:[210,70,45],alpha:.6*.65,bounds:{x:90,y:30,width:140,height:55}};
 return{style,mode,title:style.replaceAll("-"," "),back:reverse?front:back,front:reverse?back:front,reverse,groupOpacity:style==="group-opacity"?.65:1,underlay:[226,232,240],group:{width:260,height:90},panels:[{x:20,y:45,isolated:false},{x:20,y:170,isolated:true}]};
}
