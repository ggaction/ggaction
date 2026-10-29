import type { ChartProgram, CreateTrailPlotOptions } from "ggaction";
import type { BasicChartProgram } from "ggaction/basic";
declare const p: ChartProgram; declare const basic: BasicChartProgram;
const options: CreateTrailPlotOptions = {x:"time",y:"signal",width:"width",groupBy:["region","channel"],curve:"cardinal",tension:.5};
p.createTrailPlot(options).editTrailPlot({target:{childPath:["a"],id:"trail"},width:12,groupBy:false,order:false,color:false});
p.createTrailPlot({theta:{field:"month",fieldType:"nominal"},radius:"signal",width:4,closed:true,curve:"linear"});
p.editTrailPlot({body:{fill:{type:"pattern",style:"dots",pitch:8,strokeWidth:2,foreground:"#000",background:"#fff",coordinateSpace:"plot"},outline:false,shadow:false},blend:"screen"});
// @ts-expect-error sample width is required
p.createTrailPlot({x:"x",y:"y"});
// @ts-expect-error positions cannot mix coordinate families
p.createTrailPlot({x:"x",y:"y",theta:"a",radius:"r",width:8});
// @ts-expect-error Polar Trail uses projected linear segments
p.createTrailPlot({theta:"a",radius:"r",width:8,curve:"cardinal"});
// @ts-expect-error row aggregation would change sample widths
p.createTrailPlot({x:{field:"x",aggregate:"mean"},y:"y",width:8});
// @ts-expect-error width is not a point size scale
p.createTrailPlot({...options,width:{field:"w",scale:{type:"sqrt"}}});
// @ts-expect-error Trail is Full-only
basic.createTrailPlot(options);
// @ts-expect-error Trail editing is Full-only
basic.editTrailPlot({width:2});
