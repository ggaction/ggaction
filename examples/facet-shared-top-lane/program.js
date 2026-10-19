import { chart } from '../../src/index.js';

export const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const rows = days.flatMap(panel => [{panel,group:'a',value:13},{panel,group:'b',value:14}]);

export function createFacetLaneUnit() {
  return chart().createCanvas({width:136,height:262,margin:{left:40,right:56,top:43,bottom:19}})
    .createData({values:rows})
    .createBarPlot({x:'group',y:{field:'value',scale:{domain:[0,50],nice:false}},guides:false})
    .encodeColor({field:'group',layout:'overlay'})
    .createAxes({x:{title:false,ticksAndLabels:{labels:{fontSize:10,color:'black',offset:5.5}}},
      y:{ticksAndLabels:{values:[0,10,20,30,40,50],labels:{fontSize:10,color:'black',alongOffset:.890625}},title:false}})
    .createLegend({title:'group',titleStyle:{fontSize:10},labels:{fontSize:10}});
}

export function createFacetSharedTopLaneProgram() {
  return createFacetLaneUnit().facet({field:'panel',values:days})
    .editFacetGuides({axes:'outer',legend:'shared'})
    .editCompositionLayout({spacing:'plot',gap:22})
    .editFacetHeaders({fontSize:10,fontWeight:400,offset:10.609375})
    .createTitle({text:'Grouped Bar Chart',align:'left',offset:-2.953125,
      titleStyle:{fontSize:13,fontWeight:700,color:'black'}})
    .editCompositionLayout({topLane:"shared"});
}
