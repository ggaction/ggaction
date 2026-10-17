// Independent authored guide geometry. No public program, runtime bounds,
// materialization, text-metric helper or rendered graphic is inspected here.
const label = {fill:"#334155",fontSize:12,fontFamily:"sans-serif",fontWeight:"normal",textAlign:"left",textBaseline:"top"};
const item = (type,properties)=>({type,properties});
export function gradientBlockScene(){
 // Group/local owners measure an intrinsic right frame with zero edge offset.
 const nativeX=480,nativeY=46,padding=12,halfStroke=.5;
 // Numeric fallback widths: each digit is .61 em at 12px; the 12px padding
 // and stroke reserve surround the full strip/tick/label/title union.
 const zeroWidth=.61*12,tenWidth=2*(.61*12);
 const left=nativeX-zeroWidth/2-padding,right=nativeX+120+tenWidth/2+padding;
 const dx=30-(left-halfStroke),dy=48-(nativeY-padding-halfStroke);
 const sourceTitleTop=nativeY+16+12+12+12;
 const borderBottom=sourceTitleTop+13+padding;
 const maxRadius=Math.sqrt(100/Math.PI),sizeSourceX=nativeX+32/2;
 const sizeDx=8-(sizeSourceX-maxRadius),sizeDy=(270-8)-(52+18+12/2);
 const rgb=t=>"#"+[[49,253],[104,231],[142,37]].map(([a,b])=>Math.round(a+(b-a)*t).toString(16).padStart(2,"0")).join("");
 return {
  scatterPlot:[0,10].map((value,i)=>item("circle",{x:i*480,fill:i===0?"#31688e":"#fde725",y:(1-i)*270,radius:Math.sqrt([25,100][i]/Math.PI),opacity:0})),
  sizeLegendSymbols:[25,100].map((area,i)=>item("circle",{x:sizeSourceX+sizeDx,y:52+i*18+sizeDy,radius:Math.sqrt(area/Math.PI),fill:"#94a3b8",opacity:.7})),
  sizeLegendLabels:["0","10"].map((text,i)=>item("text",{x:nativeX+32+12+sizeDx,y:52+i*18-6+sizeDy,text,...label})),
  colorGradientBackground:{commands:[{op:"M",x:left+dx,y:nativeY-padding+dy},{op:"L",x:left+(right-left)+dx,y:nativeY-padding+dy},
   {op:"L",x:left+(right-left)+dx,y:borderBottom+dy},{op:"L",x:left+dx,y:borderBottom+dy},{op:"Z"}],fill:"transparent",stroke:"#999",strokeWidth:1,strokeDash:[4,2,6,1]},
  colorGradientStrips:Array.from({length:60},(_,i)=>{const color=rgb((i+.5)/60);return item("rect",{x:nativeX+i*2+dx,y:nativeY+dy,width:2,height:16,fill:color,stroke:color,strokeWidth:0});}),
  colorGradientTicks:[0,120].map(offset=>item("line",{x1:nativeX+offset+dx,y1:nativeY+16+dy,x2:nativeX+offset+dx,y2:nativeY+16+6+dy,stroke:"#64748b",strokeWidth:1})),
  colorGradientLabels:["0","10"].map((text,i)=>item("text",{x:nativeX+i*120+dx,y:nativeY+16+12+dy,text,...label,textAlign:"center"})),
  colorGradientTitle:{x:nativeX+120/2+dx,y:sourceTitleTop+dy,text:"Bottom title",...label,fontSize:13,fontWeight:600,textAlign:"center"}
 };
}
export function recipeOpacityScene(opacity){
 // Occupied sample starts at275/68. A40px line with3px stroke reserves43px;
 // its 7px point extent fixes y75. Labels clear the full sample by20px.
 const left=275,top=68,extent=7,halfLineStroke=1.5,center=left+(40+3)/2;
 return {
  scatterPlot:[item("circle",{x:240,fill:"#555",y:135,radius:3,opacity:0})],
  colorLegendSymbolLines:[item("line",{x1:left+halfLineStroke,y1:top+extent,x2:left+halfLineStroke+40,y2:top+extent,stroke:"#555",strokeWidth:3,strokeDash:[],opacity})],
  colorLegendSymbolPoints:[item("circle",{x:center,y:top+extent,radius:6,fill:"#f58518",stroke:"#333",strokeWidth:2,opacity,blend:"normal"})],
  colorLegendLabels:[item("text",{x:left+43+20,y:top+extent-6,text:`opacity ${opacity}`,...label,fill:"#222",fontFamily:"Arial"})]
 };
}
