import assert from "node:assert/strict";
import test from "node:test";

import { referenceParseTypedCsv } from "../oracles/typed-csv.js";
import { parseTypedCsv } from "../support/datasets/csv.js";

function captured(parser, source, definition) {
  try {
    const rows = parser(source, definition);
    return {
      ok: true,
      rows,
      keys: rows.map(row => Reflect.ownKeys(row)),
      frozenRows: rows.map(Object.isFrozen),
      frozenArray: Object.isFrozen(rows)
    };
  } catch (error) {
    return {
      ok: false,
      name: error.name,
      message: error.message
    };
  }
}

function randomSequence(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state;
  };
}

function csvCell(value) {
  return /[",\r\n]/u.test(value)
    ? `"${value.replace(/"/gu, '""')}"`
    : value;
}

function generatedCsvCase(index) {
  const random = randomSequence(0x5eedc0de ^ index);
  const headerValues = [
    "alpha",
    "beta",
    "gamma",
    "with,comma",
    'with"quote',
    "__proto__",
    "constructor"
  ];
  const cellValues = [
    "plain",
    "001",
    "",
    "with,comma",
    'with "quote"',
    "line\nbreak",
    "line\rbreak",
    "TRUE",
    "-12.5"
  ];
  const width = 1 + random() % 5;
  const headers = Array.from({ length: width }, () =>
    headerValues[random() % headerValues.length]
  );
  if (index % 29 === 0) headers[0] = "";
  const lineEnding = index % 3 === 0 ? "\r\n" : "\n";
  const rowCount = random() % 6;
  const records = [headers];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    const row = Array.from({ length: width }, () =>
      cellValues[random() % cellValues.length]
    );
    if (index % 31 === 0 && rowIndex === rowCount - 1) row.pop();
    if (index % 37 === 0 && rowIndex === rowCount - 1) row.push("extra");
    records.push(row);
  }
  let source = records.map(record => record.map(csvCell).join(",")).join(lineEnding);
  if (index % 2 === 0) source += lineEnding;
  if (index % 5 === 0) source = `\uFEFF${source}`;
  if (index % 41 === 0) source += '"unterminated';
  return {
    source,
    definition: {
      id: `generated-${index}`,
      missingTokens: ["__MISSING__"],
      fields: Object.fromEntries(headers
        .filter(field => field.length > 0)
        .map(field => [field, { type: "nominal" }]))
    }
  };
}

test("streaming typed CSV parsing matches the materialized reference", () => {
  for (let index = 0; index < 256; index += 1) {
    const { source, definition } = generatedCsvCase(index);
    assert.deepEqual(
      captured(parseTypedCsv, source, definition),
      captured(referenceParseTypedCsv, source, definition),
      `generated CSV case ${index}`
    );
  }
});

test("preserves quoted, BOM, CRLF, empty, trailing, and duplicate-header semantics", () => {
  const nominalDefinition = {
    id: "edge-csv",
    missingTokens: ["__MISSING__"],
    fields: {
      value: { type: "nominal" },
      note: { type: "nominal" }
    }
  };
  const sources = [
    "",
    "value,note",
    "\uFEFFvalue,note\r\n\"a,b\",\"line\r\nbreak\"\r\n",
    "value,note\n\"a\"\"b\",\n",
    "value,value\nfirst,last\n",
    ",value\n1,2\n",
    "value,note\n1\n",
    "value,note\n\"unterminated"
  ];
  for (const source of sources) {
    assert.deepEqual(
      captured(parseTypedCsv, source, nominalDefinition),
      captured(referenceParseTypedCsv, source, nominalDefinition),
      JSON.stringify(source)
    );
  }

  const duplicate = parseTypedCsv("value,value\nnot-a-number,2\n", {
    id: "duplicate",
    fields: { value: { type: "quantitative" } }
  });
  assert.deepEqual(duplicate, [{ value: 2 }]);

  const ordered = parseTypedCsv("z,a,z,1,b\nfirst,A,last,one,B\n", {
    id: "ordered",
    missingTokens: ["__MISSING__"],
    fields: {}
  });
  assert.deepEqual(Reflect.ownKeys(ordered[0]), ["1", "z", "a", "b"]);
  assert.deepEqual(ordered[0], { 1: "one", z: "last", a: "A", b: "B" });

  const special = parseTypedCsv("__proto__,constructor\nproto-value,ctor-value\n", {
    id: "special-headers",
    missingTokens: ["__MISSING__"],
    fields: Object.fromEntries([
      ["__proto__", { type: "nominal" }],
      ["constructor", { type: "nominal" }]
    ])
  });
  assert.deepEqual(
    captured(parseTypedCsv, "__proto__,constructor\nproto-value,ctor-value\n", {
      id: "special-headers",
      missingTokens: ["__MISSING__"],
      fields: Object.fromEntries([
        ["__proto__", { type: "nominal" }],
        ["constructor", { type: "nominal" }]
      ])
    }),
    captured(referenceParseTypedCsv, "__proto__,constructor\nproto-value,ctor-value\n", {
      id: "special-headers",
      missingTokens: ["__MISSING__"],
      fields: Object.fromEntries([
        ["__proto__", { type: "nominal" }],
        ["constructor", { type: "nominal" }]
      ])
    })
  );
  assert.deepEqual(Reflect.ownKeys(special[0]), ["__proto__", "constructor"]);
  assert.equal(special[0].__proto__, "proto-value");
  assert.equal(special[0].constructor, "ctor-value");
});

test("preserves parse-error precedence and typed row-field diagnostics", () => {
  const definition = {
    id: "diagnostic",
    fields: {
      value: { type: "quantitative" },
      enabled: { type: "boolean" }
    }
  };
  const cases = [
    ",enabled\n\"unterminated",
    "value,enabled\nNaN,TRUE\n1\n",
    "value,enabled\n1,TRUE\nNaN,FALSE\n",
    "value,enabled\n1,MAYBE\n"
  ];
  for (const source of cases) {
    assert.deepEqual(
      captured(parseTypedCsv, source, definition),
      captured(referenceParseTypedCsv, source, definition),
      JSON.stringify(source)
    );
  }
  assert.deepEqual(captured(parseTypedCsv, cases[0], definition), {
    ok: false,
    name: "Error",
    message: "CSV source has an unterminated quoted field."
  });
  assert.deepEqual(captured(parseTypedCsv, cases[1], definition), {
    ok: false,
    name: "Error",
    message: "CSV row 3 has 1 fields; expected 2."
  });
  assert.deepEqual(captured(parseTypedCsv, cases[2], definition), {
    ok: false,
    name: "TypeError",
    message: "diagnostic row 2 field value must be finite."
  });
  assert.deepEqual(captured(parseTypedCsv, cases[3], definition), {
    ok: false,
    name: "TypeError",
    message: "diagnostic row 1 field enabled must be TRUE or FALSE."
  });
});

test("returns fresh mutable arrays containing fresh frozen row records", () => {
  const source = "value,note\n1,alpha\n2,beta\n";
  const definition = {
    id: "identity",
    fields: {
      value: { type: "quantitative" },
      note: { type: "nominal" }
    }
  };
  const first = parseTypedCsv(source, definition);
  const second = parseTypedCsv(source, definition);
  assert.notStrictEqual(first, second);
  assert.equal(Object.isFrozen(first), false);
  assert.equal(Object.isFrozen(second), false);
  assert.deepEqual(first, second);
  for (let index = 0; index < first.length; index += 1) {
    assert.notStrictEqual(first[index], second[index]);
    assert.equal(Object.isFrozen(first[index]), true);
    assert.equal(Object.isFrozen(second[index]), true);
  }
});
