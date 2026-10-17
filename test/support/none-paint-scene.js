export function noPaintScene() {
 return {graphicSpec:{objects:{canvas:{type:'canvas',properties:{width:240,height:100,background:'white'},children:['circle','rect','path','line','empty','text','emptyRect','emptyPath']},
  circle:{type:'circle',properties:{x:25,y:30,radius:10,fill:'#00ffff',stroke:'none',strokeWidth:8}},
  rect:{type:'rect',properties:{x:60,y:20,width:20,height:20,fill:'#00ffff',stroke:'none',strokeWidth:8}},
  path:{type:'path',properties:{commands:[{op:'M',x:110,y:20},{op:'L',x:130,y:20},{op:'L',x:130,y:40},{op:'L',x:110,y:40},{op:'Z'}],fill:'#00ffff',stroke:'none',strokeWidth:8}},
  line:{type:'line',properties:{x1:150,y1:30,x2:180,y2:30,stroke:'none',strokeWidth:8}},
  empty:{type:'circle',properties:{x:210,y:30,radius:10,fill:'none',stroke:'none',strokeWidth:8}},
  text:{type:'text',properties:{x:10,y:65,text:'MMMM',fill:'none',fontSize:12,fontFamily:'sans-serif',textAlign:'left',textBaseline:'top'}},
  emptyRect:{type:'rect',properties:{x:70,y:60,width:20,height:20,fill:'none',stroke:'none',strokeWidth:8}},
  emptyPath:{type:'path',properties:{commands:[{op:'M',x:110,y:60},{op:'L',x:130,y:60},{op:'L',x:130,y:80},{op:'L',x:110,y:80},{op:'Z'}],fill:'none',stroke:'none',strokeWidth:8}}
 },order:['canvas']}};
}
export const noPaintSamples=[[25,30,[0,255,255,255]],[70,30,[0,255,255,255]],[120,30,[0,255,255,255]],
 [12,30,[255,255,255,255]],[57,30,[255,255,255,255]],[107,30,[255,255,255,255]],
 [165,30,[255,255,255,255]],[210,30,[255,255,255,255]],[80,70,[255,255,255,255]],[120,70,[255,255,255,255]],[15,70,[255,255,255,255]]];


