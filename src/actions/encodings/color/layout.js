export function applyColorLayoutCompanion(
  program,
  { target, layer, layout, horizon }
) {
  if (layout === undefined || layer.mark.type === "arc" || horizon) return program;
  return program.layoutSeries({ target, mode: layout });
}
