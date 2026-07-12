export function createMockCanvasContext() {
  const calls = [];
  let fillStyle = "#000000";
  let strokeStyle = "#000000";
  let globalAlpha = 1;
  let lineWidth = 1;
  let font = "10px sans-serif";
  let textAlign = "start";
  let textBaseline = "alphabetic";

  return {
    canvas: { width: 0, height: 0 },
    calls,

    get fillStyle() {
      return fillStyle;
    },

    set fillStyle(value) {
      fillStyle = value;
      calls.push({ op: "setFillStyle", value });
    },

    get strokeStyle() {
      return strokeStyle;
    },

    set strokeStyle(value) {
      strokeStyle = value;
      calls.push({ op: "setStrokeStyle", value });
    },

    get globalAlpha() {
      return globalAlpha;
    },

    set globalAlpha(value) {
      globalAlpha = value;
      calls.push({ op: "setGlobalAlpha", value });
    },

    get lineWidth() {
      return lineWidth;
    },

    set lineWidth(value) {
      lineWidth = value;
      calls.push({ op: "setLineWidth", value });
    },

    get font() {
      return font;
    },

    set font(value) {
      font = value;
      calls.push({ op: "setFont", value });
    },

    get textAlign() {
      return textAlign;
    },

    set textAlign(value) {
      textAlign = value;
      calls.push({ op: "setTextAlign", value });
    },

    get textBaseline() {
      return textBaseline;
    },

    set textBaseline(value) {
      textBaseline = value;
      calls.push({ op: "setTextBaseline", value });
    },

    save() {
      calls.push({ op: "save" });
    },

    restore() {
      calls.push({ op: "restore" });
    },

    clearRect(...args) {
      calls.push({ op: "clearRect", args });
    },

    fillRect(...args) {
      calls.push({ op: "fillRect", args, fillStyle, globalAlpha });
    },

    scale(...args) {
      calls.push({ op: "scale", args });
    },

    translate(...args) {
      calls.push({ op: "translate", args });
    },

    rotate(...args) {
      calls.push({ op: "rotate", args });
    },

    beginPath() {
      calls.push({ op: "beginPath" });
    },

    arc(...args) {
      calls.push({ op: "arc", args });
    },

    moveTo(...args) {
      calls.push({ op: "moveTo", args });
    },

    lineTo(...args) {
      calls.push({ op: "lineTo", args });
    },

    setLineDash(value) {
      calls.push({ op: "setLineDash", value: [...value] });
    },

    fill() {
      calls.push({ op: "fill", fillStyle, globalAlpha });
    },

    stroke() {
      calls.push({ op: "stroke", strokeStyle, lineWidth, globalAlpha });
    },

    fillText(...args) {
      calls.push({
        op: "fillText",
        args,
        fillStyle,
        globalAlpha,
        font,
        textAlign,
        textBaseline
      });
    }
  };
}

export function findCanvasCalls(context, op) {
  return context.calls.filter(call => call.op === op);
}
