export function createMockCanvasContext() {
  const calls = [];
  let fillStyle = "#000000";
  let globalAlpha = 1;

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

    get globalAlpha() {
      return globalAlpha;
    },

    set globalAlpha(value) {
      globalAlpha = value;
      calls.push({ op: "setGlobalAlpha", value });
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

    beginPath() {
      calls.push({ op: "beginPath" });
    },

    arc(...args) {
      calls.push({ op: "arc", args });
    },

    fill() {
      calls.push({ op: "fill", fillStyle, globalAlpha });
    }
  };
}

export function findCanvasCalls(context, op) {
  return context.calls.filter(call => call.op === op);
}
