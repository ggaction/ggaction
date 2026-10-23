import {chart} from '../../../src/index.js';

// Literal two-bar scene with guides below difference-composited marks.
export function createPrimitiveProgram(){
  return chart()
    .createGraphics({"id":"canvas","type":"canvas"})
    .editGraphics({"target":"canvas","property":"width","value":240})
    .editGraphics({"target":"canvas","property":"height","value":180})
    .editGraphics({"target":"canvas","property":"background","value":"white"})
    .createGraphics({"id":"plot-main","type":"collection","parent":"canvas"})
    .editGraphics({"target":"plot-main","property":"items","value":[]})
    .createGraphics({"id":"plotBorder","type":"rect","parent":"plot-main"})
    .editGraphics({"target":"plotBorder","property":"x","value":40.5})
    .editGraphics({"target":"plotBorder","property":"y","value":20.5})
    .editGraphics({"target":"plotBorder","property":"width","value":179})
    .editGraphics({"target":"plotBorder","property":"height","value":119})
    .editGraphics({"target":"plotBorder","property":"fill","value":"transparent"})
    .editGraphics({"target":"plotBorder","property":"stroke","value":"#ddd"})
    .editGraphics({"target":"plotBorder","property":"strokeWidth","value":1})
    .createGraphics({"id":"barPlot","type":"collection","parent":"plot-main"})
    .editGraphics({"target":"barPlot","property":"items","value":[{"type":"path","properties":{"commands":[{"op":"M","x":50,"y":68},{"op":"L","x":120,"y":68},{"op":"C","x1":125.52284749830794,"y1":68,"x2":130,"y2":72.47715250169206,"x":130,"y":78},{"op":"L","x":130,"y":130},{"op":"C","x1":130,"y1":135.52284749830793,"x2":125.52284749830794,"y2":140,"x":120,"y":140},{"op":"L","x":50,"y":140},{"op":"C","x1":44.47715250169206,"y1":140,"x2":40,"y2":135.52284749830793,"x":40,"y":130},{"op":"L","x":40,"y":78},{"op":"C","x1":40,"y1":72.47715250169206,"x2":44.47715250169206,"y2":68,"x":50,"y":68},{"op":"Z"}],"fill":"yellow","stroke":"yellow","strokeWidth":4,"blend":"difference"}},{"type":"path","properties":{"commands":[{"op":"M","x":140,"y":32},{"op":"L","x":210,"y":32},{"op":"C","x1":215.52284749830793,"y1":32,"x2":220,"y2":36.47715250169206,"x":220,"y":42},{"op":"L","x":220,"y":130},{"op":"C","x1":220,"y1":135.52284749830793,"x2":215.52284749830793,"y2":140,"x":210,"y":140},{"op":"L","x":140,"y":140},{"op":"C","x1":134.47715250169207,"y1":140,"x2":130,"y2":135.52284749830793,"x":130,"y":130},{"op":"L","x":130,"y":42},{"op":"C","x1":130,"y1":36.47715250169206,"x2":134.47715250169207,"y2":32,"x":140,"y":32},{"op":"Z"}],"fill":"yellow","stroke":"yellow","strokeWidth":4,"blend":"difference"}}]})
    .createGraphics({"id":"xAxisLine","type":"line","parent":"plot-main","before":"barPlot"})
    .editGraphics({"target":"xAxisLine","property":"x1","value":40})
    .editGraphics({"target":"xAxisLine","property":"y1","value":140})
    .editGraphics({"target":"xAxisLine","property":"x2","value":220})
    .editGraphics({"target":"xAxisLine","property":"y2","value":140})
    .editGraphics({"target":"xAxisLine","property":"stroke","value":"#888"})
    .editGraphics({"target":"xAxisLine","property":"strokeWidth","value":2})
    .createGraphics({"id":"horizontalGridLines","type":"line","length":0,"parent":"plot-main","before":"plotBorder"})
    .editGraphics({"target":"horizontalGridLines","property":"items","value":[{"type":"line","properties":{"x1":40,"y1":140,"x2":220,"y2":140,"stroke":"#ddd","strokeWidth":1,"strokeDash":[]}},{"type":"line","properties":{"x1":40,"y1":80,"x2":220,"y2":80,"stroke":"#ddd","strokeWidth":1,"strokeDash":[]}},{"type":"line","properties":{"x1":40,"y1":20,"x2":220,"y2":20,"stroke":"#ddd","strokeWidth":1,"strokeDash":[]}}]});
}
