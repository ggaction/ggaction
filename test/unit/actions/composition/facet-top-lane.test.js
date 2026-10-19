import test from 'node:test';
import assert from 'node:assert/strict';
import {chart,hconcat} from '../../../../src/index.js';
import {serializeProgram,deserializeProgram} from '../../../../src/persistence.js';
import {decodeValue,encodeSharedValue} from '../../../../src/persistence/codec.js';
import {renderToSVG} from '../../../../src/renderers/svg.js';
import {resolveFacetProgramLayout} from '../../../../src/materialization/facets.js';
import {createFacetLaneUnit,createFacetSharedTopLaneProgram} from '../../../../examples/facet-shared-top-lane/program.js';

const values=['A','B'].flatMap(panel=>['C','D'].map(column=>({panel,column,x:1,y:2,z:3})));
function unit(){return chart().createCanvas({width:260,height:260,margin:{top:80,left:60,right:80,bottom:60}})
  .createData({values}).createScatterPlot({x:'x',y:'y',guides:false});}
const recipes=[p=>p.facet({field:'panel',spacing:'plot',gap:30}),
  p=>p.facetGrid({rows:{field:'panel'},columns:{field:'column'},spacing:'plot',gap:30}),
  p=>p.repeatCharts({channel:'y',fields:['y','z'],spacing:'plot',gap:30})];

test('shortest shared creation equals editing and explicit stacked resets canonical intent',()=>{
  const source=unit(),saved=serializeProgram(source);
  for(const make of recipes){
    const old=make(source),before=serializeProgram(old),shared=old.editCompositionLayout({topLane:'shared'});
    assert.equal(shared.compositionSpec.topLane,'shared');
    assert.deepEqual(shared.editCompositionLayout({topLane:undefined}).graphicSpec,shared.graphicSpec);
    assert.deepEqual(shared.editCompositionLayout({topLane:'stacked'}).graphicSpec,old.graphicSpec);
    assert.equal(Object.hasOwn(shared.editCompositionLayout({topLane:'stacked'}).compositionSpec,'topLane'),false);
    assert.deepEqual(deserializeProgram(serializeProgram(shared)).graphicSpec,shared.graphicSpec);
    assert.equal(deserializeProgram(serializeProgram(shared)).compositionSpec.topLane,'shared');
    assert.deepEqual(Object.values(shared.children),Object.values(old.children));
    assert.throws(()=>shared.editCompositionLayout({spacing:'canvas'}),/requires spacing/);
    assert.equal(shared.editCompositionLayout({spacing:'canvas',topLane:'stacked'}).compositionSpec.spacing,'canvas');
    assert.equal(serializeProgram(old),before);
  }
  const options={field:'panel',spacing:'plot',gap:30};
  assert.deepEqual(source.facet({...options,topLane:'shared'}).graphicSpec,
    source.facet(options).editCompositionLayout({topLane:'shared'}).graphicSpec);
  assert.deepEqual(source.facet({...options,topLane:'stacked'}).graphicSpec,source.facet(options).graphicSpec);
  assert.equal(serializeProgram(source),saved);
});

test('grid and repeat shared creation converge with later edits and promoted titles',()=>{
  const source=unit(),common={spacing:'plot',gap:30,topLane:'shared'};
  const pairs=[
    [source.facetGrid({rows:{field:'panel'},columns:{field:'column'},...common}),recipes[1](source)],
    [source.repeatCharts({channel:'y',fields:['y','z'],...common}),recipes[2](source)]
  ];
  for(const [created,stacked] of pairs){
    assert.deepEqual(created.graphicSpec,stacked.editCompositionLayout({topLane:'shared'}).graphicSpec);
    assert.equal(created.editFacetSource({program:source}).compositionSpec.topLane,'shared');
  }
  const options={field:'panel',...common},title={text:'Panels',titleStyle:{fontSize:12}};
  assert.deepEqual(source.createTitle(title).facet(options).graphicSpec,
    source.facet(options).createTitle(title).graphicSpec);
});

test('native shared legends retain each edge and authored/inferred ownership during shared layout replay',()=>{
  const source=chart().createCanvas({width:400,height:380,margin:120}).createData({values})
    .createScatterPlot({x:'x',y:'y',color:'column',guides:false});
  for(const position of ['left','right','top','bottom']){
    const native=source.createLegend({position}).facet({field:'panel',spacing:'plot',gap:40,
      topLane:'shared',guides:{legend:'shared'}}).createTitle({text:'Panels',titleStyle:{fontSize:12}});
    assert.equal(native.compositionSpec.topLane,'shared');
    assert.equal(Object.values(native.guideConfigs.legend)[0].position,position);
    const replay=native.editCompositionLayout({gap:45});
    assert.equal(Object.values(replay.guideConfigs.legend)[0].position,position);
    assert.deepEqual(deserializeProgram(serializeProgram(replay)).graphicSpec,replay.graphicSpec);
  }
  for(const legend of ['shared',{position:'right'}]){
    const result=source.facet({field:'panel',spacing:'plot',gap:40,topLane:'shared',guides:{legend}});
    assert.equal(result.compositionSpec.topLane,'shared');
    assert.match(renderToSVG(result.editFacetGuides({legend})),/<svg/);
  }
});

test('shared policy survives source, guide, scale, header, layout, theme and metric replay',()=>{
  const source=unit(),title={text:'Panels',titleStyle:{fontSize:12}};
  for(const make of recipes){
    const parent=make(source).editCompositionLayout({topLane:'shared'}).createTitle(title);
    for(const update of [p=>p.editFacetHeaders({fontSize:11}),p=>p.editCompositionLayout({gap:40}),
      p=>p.editFacetScales({x:'independent'}),p=>p.editFacetSource({program:source.editPointMark({fill:'red'})}),
      p=>p.applyTheme({theme:'light'}),p=>p.applyTextMetrics({profile:{schemaVersion:1,id:'lane',measurements:[
        {text:'A',fontFamily:'sans-serif',fontSize:12,fontWeight:400,width:7}
      ]}})]){
      const before=serializeProgram(parent),result=update(parent);
      assert.equal(result.compositionSpec.topLane,'shared');
      assert.match(renderToSVG(result),/<svg/);
      assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec,result.graphicSpec);
      assert.equal(serializeProgram(parent),before);
    }
  }
});

test('shared mode preserves exact source bars and rejects title/header and endpoint collisions atomically',()=>{
  const parent=createFacetSharedTopLaneProgram(),before=serializeProgram(parent);
  const {layout,plots}=resolveFacetProgramLayout(parent);
  assert.deepEqual(layout.children.map((cell,i)=>[cell.x+plots[i].x,cell.y+plots[i].y]),
    Array.from({length:7},(_,i)=>[40+62*i,43]));
  assert.deepEqual(Object.values(parent.children).map(p=>p.graphicSpec.objects.canvas.properties.height),Array(7).fill(262));
  assert.throws(()=>parent.editTitle({offset:20}),/Shared facet top lane/);
  assert.throws(()=>parent.editFacetHeaders({offset:80}),/outside|does not fit|overlap/i);
  // A smaller offset remains valid when header and upper endpoint are horizontally disjoint.
  assert.doesNotThrow(()=>parent.editFacetHeaders({offset:1}));
  assert.equal(serializeProgram(parent),before);
  assert.equal(createFacetLaneUnit().semanticSpec.datasets[0].values.length,14);
});

test('closed options, concat exclusion and canonical persisted schema reject without mutation',()=>{
  const source=unit(),base=source.facet({field:'panel'}),before=serializeProgram(base);
  for(const topLane of [null,false,true,0,'auto','share']){
    assert.throws(()=>source.facet({field:'panel',spacing:'plot',topLane}),/topLane/);
    assert.throws(()=>base.editCompositionLayout({spacing:'plot',topLane}),/topLane/);
  }
  for(const topLane of ['stacked','shared']) assert.throws(()=>hconcat({programs:[source,source]}).editCompositionLayout({topLane}),/facet/);
  assert.throws(()=>source.facet({field:'panel',topLane:'shared'}),/requires spacing/);
  const saved=JSON.parse(serializeProgram(base));
  const state=decodeValue(saved.payload);
  state.compositionSpec.topLane='stacked';
  saved.payload=encodeSharedValue(state);
  assert.throws(()=>deserializeProgram(JSON.stringify(saved)),/topLane/);
  assert.equal(serializeProgram(base),before);
});

test('wrapped topology and non-Cartesian coordinates retain plot geometry',()=>{
  const source=unit();
  const wrapped=source.facet({field:'column',columns:1,spacing:'plot',gap:30,topLane:'shared'});
  const layout=resolveFacetProgramLayout(wrapped).layout;
  assert.equal(layout.children[1].y-layout.children[0].y,150);
  for(const make of [p=>p.createPolarScatterPlot({theta:'x',radius:'y',guides:false}),
    p=>p.createParallelCoordinates({dimensions:[{field:'x'},{field:'y'}],guides:false})]){
    const raw=chart().createCanvas({width:260,height:260,margin:70}).createData({values});
    const result=make(raw).facet({field:'panel',spacing:'plot',gap:30,topLane:'shared'});
    assert.equal(result.compositionSpec.topLane,'shared');
    assert.match(renderToSVG(result),/<svg/);
    assert.deepEqual(deserializeProgram(serializeProgram(result)).graphicSpec,result.graphicSpec);
    assert.throws(()=>result.editFacetGuides({axes:'outer'}),/outer|Cartesian/);
  }
});
