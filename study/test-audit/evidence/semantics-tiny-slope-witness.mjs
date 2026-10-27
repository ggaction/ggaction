import {chart} from '../../../ggaction/src/index.js';
const rows=[{x:-1,y:1e-300},{x:0,y:2e-300},{x:1,y:3e-300}];
const p=chart().createData({id:'raw',values:rows}).createRegressionData({id:'fit',x:'x',y:'y',interval:false}).createRegressionStatisticsData({id:'stats',source:'fit'});
console.log(JSON.stringify(p.semanticSpec.datasets.find(d=>d.id==='stats').values));
