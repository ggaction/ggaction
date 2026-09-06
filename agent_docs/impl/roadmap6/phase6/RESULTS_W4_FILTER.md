# Phase 6 W4 결과 — Filter replace·compose·remove·empty

## 결과

- `filterMarks`가 final-item filter의 canonical source, derived dataset revision과 ordered selector recipe를
  한 owner config에 저장한다. 새 provenance는 `selectors` 배열이며 기존 단일 `selector` transform은 계속
  읽을 수 있다.
- 같은 마지막 selector의 반복은 semantic, graphic, trace를 바꾸지 않는다. 다른 반복 호출은
  `mode: "replace" | "compose"`를 요구한다. Replace는 canonical source에서 다시 시작하고 compose는
  저장된 recipe 순서대로 각 단계의 final-item grain을 재평가한다.
- `removeMarkFilter({ target? })`가 원래 source binding, context, scale domain, graphics와 Histogram의 원래
  bin policy를 복원한다. 기존 filtered dataset을 downstream transform이 참조하면 snapshot을 보존하고
  다음 filter owner는 결정적인 `FilteredData2`, `FilteredData3` revision ID를 사용한다.
- Empty match는 정상적인 빈 view다. 이전 또는 explicit scale domain을 유지하면서 mark items와 source-owned
  labels를 비우고, Canvas와 scale 재물질화에서도 빈 상태를 유지한다. Point, Bar, Line, Area, Arc, Rule,
  Tick, Rect를 같은 empty materialization 경계로 처리한다.
- 공개 declaration, Current contract, action catalog/card, API/reference/search/LLM 문서와 package consumer를
  같은 lifecycle vocabulary로 동기화했다.

## 오류와 불변성

- 잘못된 mode, selector grammar, target ambiguity, composite target, mixed legacy/canonical transform과
  active filter가 없는 removal은 첫 state change 전에 거부한다.
- Replace와 remove는 이전 program과 caller input을 변경하지 않는다. Active snapshot이 downstream에서
  사용 중이면 이를 삭제하거나 다시 쓰지 않는다.
- Multi-step compose는 immutable dataset contract를 우회하지 않는다. 중간 단계만 primitive-owned
  speculative branch에서 계산하고 최종 derived dataset values를 한 번 materialize한다.
- Empty Bar/Area scale preview가 aggregate/series derivation을 잘못 호출하던 경로를 고쳐, empty owner는
  빈 scale input과 보존 domain으로 해석된다.

## 호환성과 시각 영향

- 기존 단일 non-empty `filterMarks` 결과와 기존 regression-scatter primitive/public graphic parity는
  유지된다. Stored legacy `selector` provenance도 validation과 materialization에서 지원한다.
- Empty는 과거의 “at least one matching item” 오류에서 빈 view로 바뀐다. 이는 W4에서 승인된 의도적
  lifecycle 확장이다. 새 mark 모양을 추가하지 않으며 empty view에는 새 ink가 없다.

## 검증

- Focused filter, Rect, legend parity, materialization boundary tests: 39/39 pass.
- Unit suite: 2,176/2,176 pass.
- Contract suite: 310/310 pass.
- Documentation suite: 47/47 pass; 모든 generated check pass.
- Installed package consumer: Node/renderers/MCP, runtime replace·compose·empty·remove, strict positive/negative
  TypeScript declarations와 minimal Vite bundles pass.
- Package artifact: 472 entries, 543,371 packed bytes, 2,591,673 unpacked bytes, SHA-256
  `e9feb9b86675e4d139f3ff78e4622d9edffb3b855b8d84b723bdefda1947bb6e`.
- Browser gzip: Full 273,263 / Basic 149,769 / SVG 6,437 bytes. W4의 Full-only lifecycle 증가를 반영해
  Full ceiling을 274,000 bytes로 최소 조정했고 Basic 150,000 / SVG 25,000은 유지했다.

## 다음 작업

- W5는 Violin과 ErrorBar/ErrorBand composite의 source, position, interval, orientation 역할을 한 owner
  revision에서 원자적으로 편집한다.
