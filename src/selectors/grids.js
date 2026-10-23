export function gridNames(direction) {
  const prefix = direction === "horizontal" ? "Horizontal" : "Vertical";
  return {
    channel: direction === "horizontal" ? "y" : "x",
    create: `create${prefix}Grid`,
    rematerialize: `rematerialize${prefix}Grid`,
    graphic: `${direction}GridLines`
  };
}
