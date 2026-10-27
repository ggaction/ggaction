import { pathToFileURL } from 'node:url';
import path from 'node:path';
const producer = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
const { chart, hconcat } = await import(pathToFileURL(path.join(producer, 'src/index.js')));
const { serializeProgram } = await import(pathToFileURL(path.join(producer, 'src/persistence.js')));
import { writeFileSync, readFileSync } from 'node:fs'; import {createHash} from 'node:crypto';
const derived = chart().createCanvas().createData({id:'rows',values:[{id:'a',x:1,y:2,group:'one'},{id:'b',x:2,y:5,group:'two'},{id:'c',x:3,y:7,group:'two'}]})
.createData({id:'lookup',values:[{group:'one',label:'A'},{group:'two',label:'B'}]})
.createLookupData({id:'joined',source:'rows',field:'group',lookup:{data:'lookup',key:'group',fields:['label']}})
.filterData({id:'filtered',source:'joined',field:'x',oneOf:[2,3]})
.createSortedData({id:'sorted',source:'filtered',sortBy:[{field:'y',order:'descending'}]})
.createScatterPlot({id:'points',data:'sorted',x:'x',y:'y'})
.highlightMarks({id:'picked',target:'points',select:{rows:{data:'rows',indices:[1]}},fill:'red'});
const folded = chart().createCanvas().createData({id:'rows',values:[{g:'a',u:2,v:4},{g:'b',u:5,v:7}]})
.createFoldData({id:'folded',source:'rows',fields:['u','v'],as:{key:'measure',value:'value'}})
.createSummaryData({id:'summary',source:'folded',groupBy:['g'],aggregates:[{op:'sum',field:'value',as:'total'}]})
.createBarPlot({id:'bars',data:'summary',x:{field:'g',fieldType:'nominal'},y:'total'});
const composed = hconcat({programs:[{id:'left',program:derived},{id:'right',program:folded}]});
const fixtures=[['derived-v3.json',derived],['composition-v3.json',composed]];
const files=[];for(const [path,p]of fixtures){const text=serializeProgram(p)+'\n';writeFileSync(output+'/'+path,text);files.push({path,schemaVersion:3,sha256:createHash('sha256').update(text).digest('hex')});}
writeFileSync(output+'/manifest.json',JSON.stringify({role:'historical-inputs',producerCommit:'129a506dfd2fc2455b7de949d73fdd6cf34e27a5',producerPackage:'0.0.26',construction:'Captured output from the historical schema-3 writer, before production identity integration.',files},null,2)+'\n');

const p=chart().createCanvas().createData({id:'rows',values:[{id:'a',x:1,y:2},{id:'b',x:2,y:4},{id:'c',x:3,y:6}]}).createScatterPlot({id:'points',x:'x',y:'y'}).highlightMarks({id:'picked',target:'points',select:{rows:{data:'rows',indices:[1]}},fill:'red'}).createStatisticalReference({id:'mean',source:'points',axis:'y',field:'y',population:'visibleItems',statistic:{op:'mean'}});
const text=serializeProgram(p)+'\n',dir=output+'/';writeFileSync(dir+'statistical-v3.json',text);
const manifest=JSON.parse(readFileSync(dir+'manifest.json','utf8'));manifest.files.push({path:'statistical-v3.json',schemaVersion:3,kind:'statistical',sha256:createHash('sha256').update(text).digest('hex')});writeFileSync(dir+'manifest.json',JSON.stringify(manifest,null,2)+'\n');

const boxes = chart().createCanvas().createData({ id: 'rows', values: [
  { id: 'a', group: 'A', x: 1, v: 1 }, { id: 'b', group: 'A', x: 2, v: 2 },
  { id: 'c', group: 'A', x: 3, v: 3 }, { id: 'd', group: 'A', x: 4, v: 20 }
] }).createBoxSummaryData({ id: 'summary', source: 'rows', category: 'group', field: 'v' })
  .createBoxOutlierData({ id: 'outliers', source: 'rows', category: 'group', field: 'v' })
  .createScatterPlot({ id: 'points', data: 'rows', x: 'x', y: 'v' })
  .filterMarks({ target: 'points', field: 'v', op: 'gte', value: 3 });
const boxText = serializeProgram(boxes) + '\n';
writeFileSync(output + '/box-filter-v3.json', boxText);
manifest.files.push({ path: 'box-filter-v3.json', schemaVersion: 3, kind: 'box-filter', sha256: createHash('sha256').update(boxText).digest('hex') });
writeFileSync(output + '/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
