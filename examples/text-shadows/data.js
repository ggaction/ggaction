export const frame=Object.freeze({width:220,height:160});
export const styles=Object.freeze(["plain","rotated-outline","clipped"]);
export function textShadowFixture(style){
 if(!styles.includes(style))throw new TypeError("Unknown text shadow style.");
 return {text:"AB\nA",fontSize:24,lineHeight:30,x:65,y:65,rotation:style==="rotated-outline"?Math.PI/6:0,
   outline:style==="rotated-outline"?{color:"#15803d",width:2}:undefined,
   shadow:{color:"rgba(30,60,160,.8)",offsetX:20,offsetY:20,blurRadius:style==="rotated-outline"?3:0},
   clip:style==="clipped"?{x:60,y:50,width:50,height:55}:null};
}
