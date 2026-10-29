export const previewVariant = Object.freeze({
  capability: "interaction", chart: "selection-preview", variant: "brush",
  title: "Cartesian brush preview selects overlapping observations",
  width: 420, height: 300,
  publicCalls: [
    'createInspectionChart().selectMarks({ id: "picked", target: "observations", items: [] }).highlightMarks({ selection: "picked", color: "red", bringToFront: false, dimOthers: false })',
    'createInteractionSession({ program, bindings: [{ type: "brush", target: "observations", selection: "picked" }] }).mount(host)',
    'pointerdown(100, 120); pointermove(200, 230); animationFrame()'
  ],
  expected: { selectedObservations: ["a", "c"], overlay: { x: 100, y: 120, width: 100, height: 110 }, committedRevision: 0 }
});

export const angularPreviewVariant = Object.freeze({
  capability: "interaction", chart: "selection-preview", variant: "angular",
  title: "Clockwise angular brush selects a quarter circle", width: 200, height: 200,
  rows: [{ id: "a", angle: 45, radius: 1 }, { id: "b", angle: 225, radius: 1 }],
  publicCalls: [
    'createAngularSelectionChart(rows)',
    'createInteractionSession({program,bindings:[{type:"brush",axis:"theta",target:"points",selection:"picked"}]}).mount(host)',
    'pointerdown(100,20); pointermove(180,100); animationFrame()'
  ],
  expected: { selected: ["a"], center: [100, 100], radius: 100, angles: [0, 90], committedRevision: 0 }
});
