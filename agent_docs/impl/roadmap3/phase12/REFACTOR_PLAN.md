# Phase 12 Source Refactor Plan

## 기준선

| 항목 | 현재 값 |
|---|---:|
| `src/` JavaScript files | 294 |
| `src/` JavaScript lines | 36,812 |
| `actions/` files | 155 |
| `grammar/` files | 57 |
| `materialization/` files | 48 |
| import cycles | 0 |
| current public actions | 139 |
| internal wrapped actions | 75 |
| Planned actions/capabilities | 0 / 0 |
| public package entries | `ggaction`, `ggaction/extension`, `ggaction/png` |
| normal baseline | 1,541 passed |
| coverage baseline | 94.88% lines / 90.16% branches / 98.53% functions |
| critical coverage floors | 52 passed |
| PNG baseline | 113 scenarios |

처음 실행은 managed environment의 read-only `~/.npm` cache 때문에 package artifact 한 건만 EPERM이 났다.
같은 command를 `/tmp` npm cache로 실행해 1,541개와 package shape를 모두 통과시켰다. 이는 source failure가
아니며 repository state는 바뀌지 않았다.

## 구조 감사 결과

### 건강한 경계

- Relative source import graph에 cycle이 없다.
- Renderer는 `graphicSpec`만 읽으며 semantic inference를 하지 않는다.
- `actions → grammar/materialization/selectors/core` 방향은 유지되고 reverse dependency는 없다.
- Concrete graphic validation, selectors, materialization plan과 package boundary는 이미 focused contract가 있다.
- `core/immutable.js`, `core/action.js`, selectors와 theme처럼 fan-in이 높은 모듈은 현재 명확한 shared owner다.

따라서 file-size만 줄이기 위한 분할이나 새 framework 도입은 하지 않는다.

### R1 — Core program class의 책임 집중

`core/ChartProgram.js` 514줄이 다음을 동시에 소유한다.

- input state ownership과 freeze
- child program/composition schema validation
- materialization config structural update
- context/resolved scale update
- trace enter/exit
- immutable subclass-preserving clone

State validation과 pure transition을 `core/programState`, `core/compositionState`, `core/materializationState`처럼
작은 owner로 분리하고 class는 immutable facade로 남긴다. `_clone()`의 `new this.constructor`와 non-enumerable
action sequence는 그대로 유지한다.

### R2 — Pure grammar의 중복 math와 혼합 책임

`grammar/regression.js`는 578줄이며 validation, Student-t distribution, linear/polynomial/LOESS fit과 prediction을
한 파일에 둔다. `grammar/interval.js`와 log-gamma, incomplete beta와 Student-t CDF를 별도로 구현한다.

- Student-t kernel은 하나의 pure statistics owner로 통합한다.
- Regression은 method별 fit과 interval/prediction orchestration으로 분리한다.
- Density, aggregate, box plot과 discretized scale의 `quantile`은 interpolation과 input contract가 다를 수 있으므로
  이름이 같다는 이유만으로 합치지 않는다. Literal oracle로 equivalence가 증명된 부분만 이동한다.

### R3 — 같은 이름의 file/directory와 action orchestration 집중

다음 네 경로는 file과 directory가 같은 이름이라 import ownership을 읽기 어렵게 한다.

- `grammar/scales.js`와 `grammar/scales/`
- `grammar/facets.js`와 `grammar/facets/`
- `actions/encodings/position.js`와 `actions/encodings/position/`
- `actions/guides/polar/axes.js`와 `actions/guides/polar/axes/`

Facade 또는 definition을 owning directory 안의 명시적 파일로 옮기고 import를 기계적으로 갱신한다.
Compatibility re-export file을 남기지 않는다. 모든 import가 repository 내부 private path이기 때문이다.

`actions/encodings/color.js` 424줄은 scale options, bar layout synchronization, continuous/categorical dispatch와
action facade를 함께 가진다. Resolver/policy와 wrapped orchestration을 분리하되 `encodeColor` trace는 유지한다.

### R4 — Mark materialization과 scale consumer의 중앙 분기

`materialization/marks.js`는 mark completeness, policy descriptor와 step planning을 함께 가진다.
`actions/scales/consumers.js`는 bar, rect, line, area와 generic field extraction을 한 dispatch에 둔다.

- Mark별 completeness는 mark capability module이 소유한다.
- 한 canonical registry가 mark materialization op, position ordering과 scale application mode를 조합한다.
- Scale consumer value resolution은 common field reader와 mark-family resolver로 나눈다.
- 새 registry나 generic factory는 현재 여덟 mark family를 실제로 단순화하는 범위까지만 사용한다.
- Wrapped action 이름과 action hierarchy는 바꾸지 않는다.

### R5 — Guide/facet 특수 경로

Guide action은 materialization config를 86곳에서 읽거나 갱신하고 categorical/gradient/interval/opacity/size
legend가 서로 다른 lifecycle을 가진다. `materialization/facetGuides.js` 426줄에는 별도
`legacyCategorical` 준비·materialization 경로도 남아 있다.

- Config storage path는 core materialization-state owner 하나를 사용한다.
- Legend family별 geometry는 유지하되 target resolution, create/edit reconciliation, placement와 copy contract의
  공통 부분을 분리한다.
- Facet shared legend는 preparation, compatibility, translation/attachment로 나눈다.
- `legacyCategorical`은 현재 public fixture와 exact equivalence를 먼저 잠근 뒤 canonical categorical config로
  표현할 수 있을 때만 제거한다. 이름만 보고 삭제하지 않는다.
- Cartesian과 Polar axis는 coordinate-specific geometry를 유지하고, 동일한 component action lifecycle만 공유한다.

### R6 — Composition/materialization dependency readability

Materialization plan은 이미 stage ordering과 deduplication owner를 가진다. 다만 scale-guide dependency는 concrete
graphic ID와 operation 이름을 한 함수에서 직접 열거한다.

- Existing planner semantics는 유지한다.
- Scale, Canvas, data, mark와 composition ancestor dependency를 descriptor 또는 focused resolver로 나눈다.
- Parent snapshot, shared guide, title bounds와 ancestor refresh 순서를 exact contract로 고정한다.
- Composition/facet state를 일반 semantic state와 합치지 않는다.

### R7 — Renderer와 package source boundary

Renderer는 8개 파일로 작고 cycle이 없어 대규모 재작성 대상이 아니다. 다음만 검토한다.

- Canvas context validation, root/nested Canvas lifecycle와 primitive drawer registry의 owner를 명확히 한다.
- Primitive completeness 검사는 shared concrete schema와 충돌하지 않도록 유지한다.
- Root assembled `ChartProgram`, core class와 action registration의 naming을 명확히 하되 public entry path는 유지한다.
- Browser-safe default entry에서 Node PNG dependency가 들어오지 않는지 dependency contract를 유지한다.

건강한 renderer 분할에 실질적 이점이 없으면 이 tranche는 no-op으로 기록한다.

## 구현 순서와 검증

각 tranche는 다음 순서를 독립적으로 반복한다.

1. 기존 observable behavior를 focused test로 잠근다.
2. 한 owner만 이동하거나 분리한다.
3. Import cycle, forbidden direction과 dead-module audit를 실행한다.
4. Relevant unit/contract/chart test를 실행한다.
5. `npm test`를 실행한다.
6. 작은 conceptual commit으로 push한다.

Gate B에서는 coverage, package consumer, browser, PNG와 Linux CI까지 실행한다.

## 중단 조건

다음 중 하나가 필요해지면 해당 tranche를 멈추고 사용자에게 보고한다.

- Public action, signature, default, inference 또는 error contract 변경
- semanticSpec, graphicSpec, materializationConfigs, trace schema 변경
- Existing chart pixel 또는 action hierarchy 변경
- Bug fix를 refactor에 섞어야만 테스트를 통과할 수 있는 상황
- Shared abstraction이 두 consumer만을 위해 더 복잡한 indirection을 만드는 상황
