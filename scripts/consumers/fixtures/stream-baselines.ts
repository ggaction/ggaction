import {chart} from "ggaction";
import {chart as basic} from "ggaction/basic";
const p=chart();
p.createAreaPlot({x:"time",y:"value",groupBy:"series",layout:"wiggle"}).layoutSeries({mode:"center"});
p.createAreaPlot({x:{field:"time",fieldType:"temporal",temporalUnit:"timestamp"},y:{lower:"value",upper:{datum:0}},layout:"wiggle"});
p.encodeColor({field:"series",layout:"wiggle"});
// @ts-expect-error vertical only
p.createAreaPlot({x:"value",y:"time",valueChannel:"x",layout:"wiggle"});
// @ts-expect-error numeric or temporal independent positions
p.createAreaPlot({x:{field:"category",fieldType:"nominal"},y:"value",layout:"wiggle"});
// @ts-expect-error Bar has no moving baseline
basic().layoutSeries({mode:"wiggle"});
// @ts-expect-error zero baseline thickness
p.createAreaPlot({x:"time",y:"value",baseline:1,layout:"wiggle"});

// @ts-expect-error zero is a resolved wiggle boundary
p.createAreaPlot({x:"time",y:{field:"value",scale:{type:"log"}},layout:"wiggle"});
