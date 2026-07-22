# Gate R41-P2-A — Selection and Highlight Lifecycle

## Gate state

`ready-for-review`

## Review target

Phase 2의 `editMarkSelection`, `removeMarkHighlight`, `removeMarkSelection` vertical slice 전체다.

## Exact public calls

```javascript
program.editMarkSelection({ ...selector });
program.editMarkSelection({ selection, ...selector });
program.removeMarkHighlight();
program.removeMarkHighlight({ selection });
program.removeMarkSelection();
program.removeMarkSelection({ selection });
```

`editMarkSelection`의 selector는 existing ID와 target을 유지하는 complete replacement다. Field, semantic channel,
concrete property 중 정확히 하나와 comparison, `oneOf`, range, grouped/ungrouped extrema 중 하나를 완전하게
지정한다. Item grain과 supported stacked-bar grain을 기존 shared selector grammar 그대로 사용한다. Partial merge,
ID replacement와 target replacement는 지원하지 않는다.

## Resolution and atomic failure

- 세 action 모두 explicit `selection`, matching `currentSelection`, unique stored selection 순으로 resolve한다. No owner와
  multiple owner는 첫 selection을 임의 선택하지 않고 오류다.
- Edit는 current target의 final-item resolver로 새 selector 전체를 먼저 normalize하고 compatibility를 검증한다.
  Empty result는 valid하지만 incomplete selector, unsupported source/grain, incompatible property와 target/ID replacement
  option은 첫 config change 전에 오류다.
- Direct `removeMarkHighlight`는 active dependent assignment를 요구한다. 이미 없는 highlight 제거는 no-op이 아니라
  오류이고 stored selection과 context는 유지된다.
- Direct `removeMarkSelection`은 existing selection을 요구한다. Unknown option, missing/ambiguous selection과 invalid edit는
  earlier program, sibling branch와 caller-owned option을 바꾸거나 partial trace를 남기지 않는다.

## Resulting state and trace

`editMarkSelection`은 `materializationConfigs.selections[id].selector`만 새 normalized selector로 교체하고 같은
`id`, `target`과 `currentSelection`을 보존한다. Dependent highlight가 없으면 semantic/graphic state는 공유한다.
Highlight가 있으면 같은 target의 stored highlight config를 순서대로 수집하고 잠시 분리한 뒤 target concrete mark를
empty collection/length로 만들고 mark-family materializer를 호출한다. Categorical legend symbol resource도 empty
baseline에서 다시 materialize하고, remaining highlight를 declaration order로 replay해 selected keys, dimming과
selected-last order를 current final items에서 재계산한다.

`removeMarkHighlight`는 matching highlight config만 제거한다. Selection config와 context는 그대로이며 point, bar,
rect, line, area, arc, rule의 clean ordinary mark appearance와 exact categorical legend symbols/labels가 복구된다.
같은 target의 다른 highlight는 stored order로 다시 적용된다. Stale radius, opacity, offset, item order나 legend-symbol
opacity는 남지 않는다.

`removeMarkSelection`은 dependent highlight가 있으면 real wrapped
`removeMarkHighlight({ selection: id })` child를 먼저 호출한다. 그 child 아래에 concrete baseline clear,
mark rematerializer, categorical legend reset과 remaining-highlight replay가 기록된다. 그 다음 selection config를
삭제하고 matching `currentSelection`을 `undefined`로 정리한다. Selection-only removal은 독립 graphic resource가
없으므로 rematerialization하지 않는다. Other selection/highlight assignments는 보존된다.

## Compatibility and architecture impact

- 세 public method와 strict declaration은 additive다. Existing valid `selectMarks`/`highlightMarks` call, selector grammar,
  omission semantics, resource ID와 renderer behavior는 유지된다.
- Existing `highlightMarks` assignment replacement도 같은 clean-baseline owner를 사용한다. 이 호환성 수정은 이전
  assignment의 point radius/opacity와 categorical legend-symbol opacity가 새 assignment에 stale하게 남는 경우를
  제거한다.
- Selection intent는 계속 `materializationConfigs`, current pointer는 `context`, concrete output은 `graphicSpec`이
  소유한다. Domain action이 명시적으로 mark/legend materializer를 호출하며 automatic semantic-to-graphic compiler나
  generic mutation API를 추가하지 않았다.
- Persisted schema, package entry, renderer boundary, source data, scale/coordinate ownership은 바뀌지 않았다.
- Current contract, `ACTION_INDEX.json`, generated catalog, architecture lifecycle note, declarations, public appearance docs,
  generated action/type/search/LLM references와 packed Browser consumer가 동기화되었다.

## Verification evidence

- New lifecycle unit/PNG contracts: 8/8 pass; focused selection suite: 34/34 pass.
- Normal cumulative suite: 1,853/1,853 pass, including unit 1,251, contracts 139, charts 426 and docs 37.
- Coverage policy: global 94% lines, 89% branches and 98% functions thresholds plus all 68 critical floors pass.
- Generated contract and docs checkers: catalog, signatures, capabilities, actions, reference, metadata and search pass.
- Package boundary check: 381 entries, 348,113 packed bytes and 1,633,588 unpacked bytes; existing ceilings did not change.
- Installed package consumer: Node, extension, PNG, TypeScript, tutorials, private-export rejection and compatibility probes
  pass; tarball SHA-256 is `b4e64d3b3f26e3ceddce5d9cef01dd27913762497dea8495d5d930f3b848d029`.
- Full Browser suite passes. The packed consumer edits a max-x selection to min-x, renders the recalculated highlight, then
  removes the selection cascade and confirms both stored selection/highlight configs are absent without browser errors.
- Node PNG contract: 2× render reports 320×240 physical dimensions and non-empty output. Mock Canvas confirms edited-selection
  red/min item plus dimmed complement, then the clean default fill after cascade removal.
- Every shared selector source/operator and stack grain, empty edit, filtered-cardinality/Canvas replay, multi-highlight order,
  exact categorical legend restoration, seven mark-family baselines, missing/ambiguous/invalid failures and input/program
  immutability have executable coverage.
- `git diff --check`: pass.
- Functional remote checkpoint: `14f4e1aaefdecb86117a14747b0f61d94b78a7f3` on
  `origin/codex/roadmap4-1-lifecycle`.

## Approval effect

Approval은 Phase 2 identity/resolution/replay/cascade/compatibility 결과를 고정하고 Phase 3 stroke-width legend edit와
selective legend block removal 구현을 허용한다. PR creation, npm publishing과 docs deployment 권한은 포함하지 않는다.

## Work unblocked by approval

Phase 3 legend lifecycle implementation. 사용자 explicit approval 전에는 차단된다.
