import { chart, type CreateOHLCPlotOptions } from 'ggaction';
import { chart as basic } from 'ggaction/basic';
const options: CreateOHLCPlotOptions = {x:{field:'date',fieldType:'temporal'},low:'l',high:'h',open:'o',close:'c',width:{pixels:8},labels:{content:'close'}};
chart().createOHLCPlot(options).editOHLCPlot({target:{childPath:['child'],id:'ohlc'},doji:'none',color:false});
// @ts-expect-error all four price fields are required
chart().createOHLCPlot({x:'date',low:'l',high:'h'});
// @ts-expect-error width modes are exclusive
chart().editOHLCPlot({width:{pixels:8,band:.5}});
// @ts-expect-error Full only
basic().createOHLCPlot(options);
