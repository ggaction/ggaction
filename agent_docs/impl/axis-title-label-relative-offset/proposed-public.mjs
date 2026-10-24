// PLANNED API: do not execute before ROOT reviews this Gate and implementation is qualified.
import{chart}from'ggaction';import fixture from'./fixture.json'with{type:'json'};
export function buildProposed(){return chart()
 .createCanvas({plot:fixture.plot,margin:fixture.margin,plotBorder:{color:'#ddd',lineWidth:1,underlay:true}})
 .applyTextMetrics({profile:fixture.profile})
 .createData({values:fixture.groups.flatMap(g=>[{panel:g.id,x:0,value:0},{panel:g.id,x:1,value:g.max}])})
 .createLinePlot({x:{field:'x',scale:{domain:[0,1]}},y:{field:'value',scale:{zero:true,nice:{count:10}}},guides:{axes:{x:false,y:{line:{color:'#888'},ticksAndLabels:{count:5,rounding:'nearest',ticks:{length:5,color:'#888',alongOffset:.5},labels:{fontSize:10,color:'black',format:'ticks',offset:6.5,alongOffset:.890625}},title:{text:'Price, £',fontSize:11,fontWeight:700,color:'black',offset:{from:'labels',gap:3.421875},alongOffset:.5}}},grid:false,legend:false}})
 .facet({field:'panel',values:fixture.groups.map(g=>g.id),headers:false})
 .editFacetScales({y:'independent'})
 .editCompositionLayout({columns:4,gap:58,spacing:'plot'});
}
