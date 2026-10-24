// Existing public API only. Per-unit numeric offsets define the visual primitive target.
import{chart}from'ggaction';import fixture from'./fixture.json'with{type:'json'};
export function buildReference(){
 const programs=fixture.groups.map(group=>({id:group.id,program:chart()
  .createCanvas({plot:fixture.plot,margin:fixture.margin,plotBorder:{color:'#ddd',lineWidth:1,underlay:true}})
  .applyTextMetrics({profile:fixture.profile})
  .createData({values:[{x:0,value:0},{x:1,value:group.max}]})
  .createLinePlot({x:{field:'x',scale:{domain:[0,1]}},y:{field:'value',scale:{domain:group.domain}},guides:{axes:{x:false,y:{line:{color:'#888'},ticksAndLabels:{values:group.ticks,ticks:{length:5,color:'#888',alongOffset:.5},labels:{fontSize:10,color:'black',format:'ticks',offset:6.5,alongOffset:.890625}},title:{text:'Price, £',fontSize:11,fontWeight:700,color:'black',offset:group.expectedOffset,alongOffset:.5}}},grid:false,legend:false}})}));
 return chart().hconcat({programs,gap:16});
}
