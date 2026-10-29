import { chart, type CreateWaterfallPlotOptions } from 'ggaction';
import { chart as basicChart } from 'ggaction/basic';
const p=chart(),basic=basicChart();
const options: CreateWaterfallPlotOptions = {x:"stage",role:"role",value:"value",width:{pixels:8},labels:{content:"end"}};
p.createWaterfallPlot(options).editWaterfallPlot({target:{childPath:["a"],id:"waterfall"},reset:false,labels:false,connectors:false});
// @ts-expect-error explicit role and value fields are required
p.createWaterfallPlot({x:"stage"});
// @ts-expect-error width policies are mutually exclusive
p.createWaterfallPlot({...options,width:{pixels:4,band:.5}});
// @ts-expect-error stage positions are categorical
p.editWaterfallPlot({x:{field:"stage",fieldType:"quantitative"}});
// @ts-expect-error connector enablement uses an object
p.editWaterfallPlot({connectors:true});
// @ts-expect-error Waterfall is Full-only
basic.createWaterfallPlot(options);
// @ts-expect-error Waterfall editing is Full-only
basic.editWaterfallPlot({labels:false});
