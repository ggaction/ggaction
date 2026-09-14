export function editGraphicProperties(program, target, properties) {
  for (const [property, value] of Object.entries(properties)) {
    program = program.editGraphics({ target, property, value });
  }
  return program;
}
