export const people = Object.freeze([
  { name: "A", age: 25 }, { name: "B", age: 32 }, { name: "C", age: 39 },
  { name: "D", age: 42 }, { name: "E", age: 23 }, { name: "F", age: 21 },
  { name: "G", age: 51 }, { name: "H", age: 63 }, { name: "I", age: 54 }
].map(Object.freeze));
export const groups = Object.freeze([
  { person: "A", group: "First" }, { person: "B", group: "First" },
  { person: "C", group: "First" }, { person: "D", group: "Second" },
  { person: "E", group: "Second" }, { person: "F", group: "Second" },
  { person: "G", group: "Third" }, { person: "H", group: "Third" },
  { person: "I", group: "Third" }
].map(Object.freeze));
