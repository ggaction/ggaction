import {chart, type ResponsiveCanvasOptions, type ResponsiveLabelOptions} from "ggaction";
import {chart as basic, type ResponsiveCanvasOptions as BasicResponsive} from "ggaction/basic";
import {inspectProgram} from "ggaction/inspection";
const policy: ResponsiveCanvasOptions = {minPlotSize:{width:160,height:120}};
const same: BasicResponsive = policy;
const labels: ResponsiveLabelOptions = {sequence:['wrap','skip','rotate'],maxLines:2,skipStride:3,rotationCandidates:[0,{value:-45,unit:'degrees'}]};
const p = chart().createCanvas({responsive:policy}).editCanvas({width:400});
basic().createCanvas({responsive:same}).createXAxisLabels({responsive:labels});
p.createXAxis({ticksAndLabels:{labels:{responsive:labels}}});
p.createGuides({axes:{y:{ticksAndLabels:{labels:{responsive:{}}}}}});
p.editXAxisLabels({responsive:false});p.editCanvas({responsive:false});
const layout = inspectProgram(p).layouts?.[0];
if(layout){const stage:'native'|'wrap'|'skip'|'rotate'=layout.labels[0].result.stage;const width:number=layout.result.snapshot.plot.right;
// @ts-expect-error read-only inspection
layout.result.snapshot.plot.left=0;}
// @ts-expect-error fixed closed fallback order
p.createXAxisLabels({responsive:{sequence:['skip','wrap','rotate']}});
// @ts-expect-error minimum dimensions are a coupled required pair
p.createCanvas({responsive:{minPlotSize:{width:1}}});
// @ts-expect-error boolean true is not an authored policy
p.editCanvas({responsive:true});
// @ts-expect-error automatic fallback applies to Cartesian labels only
p.createThetaAxisLabels({responsive:{}});
// @ts-expect-error Basic has no Canvas editing action
basic().editCanvas({responsive:{}});
