// Private existing-API layout probe. No proposed API is implemented here.
import fs from 'node:fs/promises';
import { chart } from '../../../src/index.js';
import { renderToSVG } from '../../../src/renderers/svg.js';
import { serializeProgram } from '../../../src/persistence.js';
import { resolveFacetProgramLayout } from '../../../src/materialization/facets.js';
import { resolveTextBounds } from '../../../src/core/textMetrics.js';
import { chromium } from 'playwright';
export const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
export const rows = days.flatMap(panel => [{panel,group:'a',value:13},{panel,group:'b',value:14}]);
export function sourceUnit() {
  return chart().createCanvas({width:136,height:262,margin:{left:40,right:56,top:43,bottom:19}})
    .createData({values:rows})
    .createBarPlot({x:'group',y:{field:'value',scale:{domain:[0,50],nice:false}},guides:false})
    .encodeColor({field:'group',layout:'overlay'})
    .createAxes({x:{title:false,ticksAndLabels:{labels:{fontSize:10,color:'black',offset:5.5}}},
      y:{ticksAndLabels:{values:[0,10,20,30,40,50],labels:{fontSize:10,color:'black',alongOffset:.890625}},title:false}})
    .createLegend({title:'group',titleStyle:{fontSize:10},labels:{fontSize:10}});
}
export function baselineParent() {
  return sourceUnit().facet({field:'panel',values:days})
    .editFacetGuides({axes:'outer',legend:'shared'})
    .editCompositionLayout({spacing:'plot',gap:22})
    .editFacetHeaders({fontSize:10,fontWeight:400,offset:10.609375})
    .createTitle({text:'Grouped Bar Chart',align:'left',offset:-2.953125,
      titleStyle:{fontSize:13,fontWeight:700,color:'black'}});
}
export async function sourceRelativeText(svg) {
  const browser=await chromium.launch({headless:true});
  try {
    const page=await browser.newPage();await page.setContent(svg);await page.evaluate(()=>document.fonts.ready);
    return await page.locator('svg text').evaluateAll(nodes=>{
      const root=document.querySelector('svg').getBoundingClientRect();
      return nodes.map(n=>{const b=n.getBoundingClientRect();return{text:n.textContent,
        bounds:{left:b.left-root.left,top:b.top-root.top,right:b.right-root.left,bottom:b.bottom-root.top},
        attributes:Object.fromEntries([...n.attributes].map(a=>[a.name,a.value]))};});
    });
  } finally {await browser.close();}
}
if(process.argv[1]?.endsWith('/baseline.mjs')) {
  const d='.artifacts/facet-shared-top-lane',parent=baselineParent(),layout=resolveFacetProgramLayout(parent),svg=renderToSVG(parent);
  await fs.mkdir(d,{recursive:true});await fs.writeFile(d+'/baseline-v3.svg',svg);
  await fs.writeFile(d+'/baseline-v3-graphic.json',JSON.stringify(parent.graphicSpec,null,2)+'\n');
  await fs.writeFile(d+'/baseline-v3-serialized.json',serializeProgram(parent));
  const title=parent.graphicSpec.objects.chartTitle,headers=parent.graphicSpec.objects[parent.compositionSpec.id+'-headers'];
  const evidence={canvas:parent.graphicSpec.objects.canvas.properties,title:title.properties,
    titleBounds:resolveTextBounds(title.properties),headers:headers.items,
    headerBounds:headers.items.map(i=>resolveTextBounds(i.properties)),layout,
    domText:(await sourceRelativeText(svg)).filter(t=>['Grouped Bar Chart','Sun','50'].includes(t.text)),
    sourceRows:rows,unitCanvas:sourceUnit().graphicSpec.objects.canvas.properties,childIds:parent.compositionSpec.children};
  await fs.writeFile(d+'/baseline-v3-evidence.json',JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({canvas:evidence.canvas,title:evidence.title,titleBounds:evidence.titleBounds,
    headerBounds:evidence.headerBounds[0],firstPlacement:layout.layout.children[0],plotUnion:layout.plot,
    domText:evidence.domText,rootChildren:parent.graphicSpec.objects.canvas.children},null,2));
}
