function requireFactors(factors) {
  if (
    factors === null || typeof factors !== "object" || Array.isArray(factors) ||
    Object.keys(factors).length === 0
  ) {
    throw new TypeError("Pairwise generation requires a factor object.");
  }
  for (const [name, values] of Object.entries(factors)) {
    if (name.length === 0 || !Array.isArray(values) || values.length === 0) {
      throw new TypeError(`Pairwise factor "${name}" requires values.`);
    }
  }
  return Object.entries(factors);
}

function valueIndex(values, value) {
  return values.findIndex(candidate => Object.is(candidate, value));
}

function pairKey(leftName, leftIndex, rightName, rightIndex) {
  return `${leftName}:${leftIndex}|${rightName}:${rightIndex}`;
}

function casePairs(value, entries) {
  const pairs = [];
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      const [leftName, leftValues] = entries[left];
      const [rightName, rightValues] = entries[right];
      pairs.push(pairKey(
        leftName,
        valueIndex(leftValues, value[leftName]),
        rightName,
        valueIndex(rightValues, value[rightName])
      ));
    }
  }
  return pairs;
}

function newPairs(entries, newIndex) {
  const [newName, newValues] = entries[newIndex];
  const uncovered = new Set();
  for (let previous = 0; previous < newIndex; previous += 1) {
    const [previousName, previousValues] = entries[previous];
    for (let previousIndex = 0; previousIndex < previousValues.length; previousIndex += 1) {
      for (let valueIndex_ = 0; valueIndex_ < newValues.length; valueIndex_ += 1) {
        uncovered.add(pairKey(
          previousName,
          previousIndex,
          newName,
          valueIndex_
        ));
      }
    }
  }
  return uncovered;
}

function coverageFor(caseValue, entries, newIndex, newValueIndex, uncovered) {
  const [newName] = entries[newIndex];
  let count = 0;
  for (let previous = 0; previous < newIndex; previous += 1) {
    const [previousName, previousValues] = entries[previous];
    const key = pairKey(
      previousName,
      valueIndex(previousValues, caseValue[previousName]),
      newName,
      newValueIndex
    );
    if (uncovered.has(key)) count += 1;
  }
  return count;
}

function removeCovered(caseValue, entries, newIndex, uncovered) {
  const [newName, newValues] = entries[newIndex];
  const newValueIndex = valueIndex(newValues, caseValue[newName]);
  for (let previous = 0; previous < newIndex; previous += 1) {
    const [previousName, previousValues] = entries[previous];
    uncovered.delete(pairKey(
      previousName,
      valueIndex(previousValues, caseValue[previousName]),
      newName,
      newValueIndex
    ));
  }
}

function extendCases(cases, entries, newIndex) {
  const [newName, newValues] = entries[newIndex];
  const uncovered = newPairs(entries, newIndex);

  for (const caseValue of cases) {
    let bestIndex = 0;
    let bestCoverage = -1;
    for (let candidate = 0; candidate < newValues.length; candidate += 1) {
      const coverage = coverageFor(
        caseValue,
        entries,
        newIndex,
        candidate,
        uncovered
      );
      if (coverage > bestCoverage) {
        bestIndex = candidate;
        bestCoverage = coverage;
      }
    }
    caseValue[newName] = newValues[bestIndex];
    removeCovered(caseValue, entries, newIndex, uncovered);
  }

  while (uncovered.size > 0) {
    const first = uncovered.values().next().value;
    const match = first.match(/^([^:]+):(\d+)\|([^:]+):(\d+)$/u);
    if (!match) throw new Error("Pairwise generator produced an invalid pair key.");
    const firstPreviousName = match[1];
    const firstPreviousValue = Number(match[2]);
    const newValueIndex = Number(match[4]);
    const caseValue = {};
    for (let previous = 0; previous < newIndex; previous += 1) {
      const [previousName, previousValues] = entries[previous];
      let chosen = 0;
      if (previousName === firstPreviousName) {
        chosen = firstPreviousValue;
      } else {
        const uncoveredIndex = previousValues.findIndex((_, candidate) =>
          uncovered.has(pairKey(
            previousName,
            candidate,
            newName,
            newValueIndex
          ))
        );
        if (uncoveredIndex >= 0) chosen = uncoveredIndex;
      }
      caseValue[previousName] = previousValues[chosen];
    }
    caseValue[newName] = newValues[newValueIndex];
    cases.push(caseValue);
    removeCovered(caseValue, entries, newIndex, uncovered);
  }
}

export function pairwiseCases(factors) {
  const entries = requireFactors(factors);
  if (entries.length === 1) {
    const [[name, values]] = entries;
    return Object.freeze(values.map(value => Object.freeze({ [name]: value })));
  }
  const [[firstName, firstValues], [secondName, secondValues]] = entries;
  const cases = firstValues.flatMap(first => secondValues.map(second => ({
    [firstName]: first,
    [secondName]: second
  })));
  for (let newIndex = 2; newIndex < entries.length; newIndex += 1) {
    extendCases(cases, entries, newIndex);
  }
  return Object.freeze(cases.map(value => Object.freeze(value)));
}

export function assertPairwiseCoverage(cases, factors) {
  const entries = requireFactors(factors);
  const observed = new Set(cases.flatMap(value => casePairs(value, entries)));
  const missing = [];
  for (let left = 0; left < entries.length; left += 1) {
    for (let right = left + 1; right < entries.length; right += 1) {
      const [leftName, leftValues] = entries[left];
      const [rightName, rightValues] = entries[right];
      for (let leftIndex = 0; leftIndex < leftValues.length; leftIndex += 1) {
        for (let rightIndex = 0; rightIndex < rightValues.length; rightIndex += 1) {
          const key = pairKey(leftName, leftIndex, rightName, rightIndex);
          if (!observed.has(key)) missing.push(key);
        }
      }
    }
  }
  if (missing.length > 0) {
    throw new Error(`Pairwise cases miss: ${missing.join(", ")}.`);
  }
  return Object.freeze({ caseCount: cases.length, pairCount: observed.size });
}
