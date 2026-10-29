import { chart } from '../../src/index.js';
import { contentBytesDigest } from '../../src/core/contentDigest.js';

export const animationImageText = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="10" height="10" fill="#ff0000"/><rect x="10" width="10" height="10" fill="#0000ff"/></svg>';

// The reusable extension fixture adds actual concrete bytes to a native keyed
// point program. Anonymous decorative assets deliberately keep fade semantics.
export function animationAssetEndpoints(font, encodeBase64) {
  const bytes=new TextEncoder().encode(animationImageText);
  const image={contentHash:contentBytesDigest(bytes),mimeType:'image/svg+xml',byteLength:bytes.length,
    width:20,height:10,payload:{encoding:'base64',data:encodeBase64(bytes)}};
  let from=chart().createCanvas({width:300,height:200,margin:20})
    .createData({id:'rows',keyField:'id',values:[{id:'a',x:1,y:50}]})
    .createPointMark({id:'points',fill:'#ff0000'})
    .encodeX({field:'x',scale:{id:'x',type:'log',domain:[1,1000],nice:false}})
    .encodeY({field:'y',scale:{id:'y',domain:[0,100],nice:false,zero:false}});
  for(const [id,type,properties] of [
    ['assetImage','image',{image,x:10,y:10,width:40,height:20}],
    ['assetText','text',{x:20,y:70,text:'AB',fill:'#008000',fontSize:20,fontFamily:font.family,
      fontWeight:400,textAlign:'left',textBaseline:'alphabetic',font}]
  ]){
    from=from.createGraphics({id,type,parent:'canvas'});
    for(const [property,value] of Object.entries(properties))from=from.editGraphics({target:id,property,value});
  }
  const to=from.reviseData({source:'rows',id:'next',values:[{id:'a',x:100,y:50}]});
  return {from,to,image,font};
}
