# Gate R53-P6-F — Self-Contained Executable Recipe Correction

## Gate state

`approved`

Approved by the user on 2026-08-07.

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 목표

Condition B와 C가 이미 정확히 찾고 읽는 `scatterplot` recipe를, frozen `cars-scatter-origin` task를 첫 제출에서
실행할 수 있을 만큼 self-contained하게 만든다. Search, MCP transport, evaluator와 benchmark axis는 바꾸지 않는다.

## 승인된 무과금 구현 범위

1. `docs/recipes/scatterplot.md`의 canonical recipe snippet에 정확한 `chart, render` import와 Browser Canvas invocation을
   포함한다.
2. 같은 snippet에 field-driven `color`와 labeled x/y guide option의 정확한 shape를 실행 코드로 제시한다.
3. `knowledge/recipes/scatterplot.json`의 잘못된 supporting `encodeGroup` backlink를 `encodeColor`로 교정한다.
4. Action coverage를 보존하기 위해 `encodeGroup`을 실제 ordered-series grouping 용도인 `line-chart` recipe로 옮긴다.
5. Generated knowledge, search index와 LLM documentation을 canonical source에서 재생성한다.
6. B/C가 읽는 generated recipe payload의 exact import/options를 contract test로 고정한다.
7. Frozen `cars-scatter-origin` task, dataset과 evaluator를 그대로 사용한 deterministic offline program이 모든 action,
   semantic, graphic와 Canvas validation을 통과함을 증명한다.

## 바꾸지 않는 것

- Recipe knowledge schema와 package/public API
- Evaluation task, corpus, oracle, prompt와 3-call limit
- Model settings, scoring threshold와 A baseline
- Search ranking과 MCP transport behavior
- Runtime renderer implementation

평가 prompt에 정답 import를 주입하거나 model-call limit을 늘리는 방식은 측정 축을 바꾸므로 금지한다.

## Gate 완료 증거

- Exact generated `scatterplot.exampleSource`
- Corrected `encodeColor` / `encodeGroup` recipe backlinks
- Focused recipe, knowledge-search, MCP와 LLM evaluation contract tests
- Frozen task offline execution의 `finalValid` equivalent와 non-empty Canvas evidence
- Full test suite와 every generated-artifact check
- Clean remote checkpoint

## 승인 효과

이 Gate 승인으로 위 무과금 recipe correction과 검증만 해제되었다. External model call, 추가 paid smoke, full rerun,
PR, merge, publish, docs deploy와 release는 승인하지 않는다.
