# Gate R53-P6-L — Task-Closed Recipe Delivery Correction

## Gate state

`proposed`

Gate K result approval checkpoint: `df8f348c`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 제안

Gate K는 recipe가 실행 가능한 최소 예제를 가져도 task가 요구한 변형까지 안전하게 작성할 정보가 부족할 수 있음을
보였다. 이번 correction은 public API를 늘리거나 model-call 수를 바꾸지 않고, delivered recipe payload를 **task-closed**
하게 만든다.

```text
executable minimal recipe
  + exact task variant flow
  + at most one explicit dependency recipe
  + one search → up to two exact reads in one model round
  + frozen 24-task delivery closure matrix
  → complete unpaid evidence
  → Gate M review
```

이 Gate는 무과금 correction과 Gate M evidence 준비만 제안한다. Paid retry, full evaluation, PR, merge, publish와 release는
포함하지 않는다.

## 결정해야 했던 두 방법

### A. 모든 조합을 primary recipe 하나에 복제

Composition recipe 안에 scatter, rose, bar와 앞으로 가능한 모든 child family를 넣으면 한 번의 read로 끝난다. 하지만
payload가 빠르게 비대해지고, 같은 chart source가 여러 recipe에 중복되며, 특정 frozen prompt에 과적합하기 쉽다.

### B. 필요한 recipe를 제한 없이 추가 read

Primary recipe가 부족할 때 action/recipe를 계속 읽게 하면 payload 중복은 줄어든다. 하지만 현재 3-model-call envelope에서
추가 round를 요구할 수 있고, token과 time 비교 조건이 흔들리며 탐색 loop가 다시 길어진다.

## 권장 결정 — variant-complete primary + bounded dependency read

두 방법을 결합하되 경계를 고정한다.

1. Primary recipe는 그 recipe가 선언한 supporting/lifecycle flow와 자주 필요한 비자명한 option variant를 실제 executable
   source로 보여준다.
2. 서로 다른 chart family가 필요한 composite task만 search 결과에서 **dependency recipe 최대 1개**를 추가로 읽을 수 있다.
3. 두 exact read는 search 다음의 **같은 model response**에서 병렬 tool call로 요청한다. Model-call ceiling은 여전히 3이다.
4. 두 payload를 합쳐도 task-required flow가 닫히지 않으면 해당 task는 unpaid closure test에서 실패한다.

이 방식은 current knowledge schema v2, recipe source schema v1과 public API를 그대로 유지한다. Existing
`relatedRecipes`, search results, exact-read tools와 multi-tool response 처리만 사용한다.

## 직접 교정할 두 실패

### 1. Box plot color와 legend

`docs/recipes/box-plot.md`의 canonical generated source를 실제 Cars example과 같은 구조로 고친다.

```javascript
.createBoxPlot({
  x: { field: "category", fieldType: "nominal" },
  y: { field: "value" },
  guides: { legend: false }
})
.encodeColor({
  target: "boxPlot",
  field: "category",
  fieldType: "nominal"
})
```

- Recipe step에 `encodeColor`를 supporting action으로 기록한다.
- `createBoxPlot({ color })`는 지원되지 않으며 color는 post-facade encoding이라는 pitfall을 추가한다.
- Redundant category legend를 facade option 또는 explicit guide lifecycle에서 끄는 정확한 경계를 설명한다.
- `createBoxPlot` public option을 확장하지 않는다.

### 2. Composition replacement와 specialized child

`docs/recipes/composition.md`의 source가 prose로만 언급하던 `replaceCompositionChild`를 실제로 실행하게 한다.

- Stable child IDs를 가진 initial `hconcat`
- `editCompositionLayout({ gap: 24, align })`
- Complete replacement child
- `replaceCompositionChild({ target, program })`
- Final parent render

Specialized rose child는 별도 `rose-chart` recipe의 exact `createArcMark → encodeTheta → encodeR → encodeColor` source를
dependency로 읽는다. `createRoseChart`가 존재하지 않는다는 pitfall을 composition/rose delivery surface에서 명시한다.
Composition recipe에 rose source 전체를 복제하지 않고, public `createRoseChart` facade도 새로 만들지 않는다.

## Bounded read contract

Condition B와 C의 지식 전달 지침을 다음처럼 맞춘다.

- Task를 한 번 search한다.
- Primary recipe 하나를 exact read한다.
- Search 결과가 명확히 다른 chart family의 child flow를 요구할 때만 dependency action/recipe 하나를 추가 exact read한다.
- 두 read는 같은 model round에서 실행한다.
- 두 번째 search와 세 번째 exact knowledge resource는 금지한다.
- 그다음 `submit_program`을 호출한다.

Maximum model calls는 그대로 3이고 C의 MCP call ceiling 8도 그대로다. Local MCP는 계속 read-only이며 network, file,
code-execution 또는 renderer capability를 추가하지 않는다.

## Frozen 24-task delivery closure matrix

새 test-owned matrix가 24개 frozen task 각각에 다음을 고정한다.

| 필드 | 의미 |
| --- | --- |
| `taskId` | Existing frozen task identity |
| `primaryRecipeId` | Search top 1이어야 하는 recipe |
| `dependencyRecipeIds` | 0개 또는 최대 1개 |
| `deliveredActions` | Exact source를 실행해 실제 trace에서 관측한 action union |
| `deliveredRuntimeFunctions` | Exact imports/calls와 explicit renderer guidance의 function union |
| `knownTrapCoverage` | Task가 유발하기 쉬운 invented option/API의 explicit warning |

각 task에 대해 다음을 검증한다.

1. `requiredActions`가 primary + dependency의 실제 executed trace에 모두 존재한다.
2. `anyOfActionSets`는 최소 한 세트가 완전히 존재한다.
3. `requiredRuntimeFunctions`가 exact source 또는 명시적 renderer guidance에 존재한다.
4. `forbiddenActions`와 invented runtime identifiers가 delivered source에 없다.
5. Primary recipe는 frozen query와 독립 paraphrase에서 top 1이고 dependency는 bounded search result 안에 있다.
6. Dependency는 최대 1개이며 primary와 중복되지 않는다.
7. Production ranking에는 task ID, dataset 이름, oracle validation 이름을 넣지 않는다.

이 matrix는 사람이 작성한 final task program에 recipe ID만 붙이는 방식을 성공 증거로 사용하지 않는다. Model이 실제로
받는 generated payload 자체가 task-required flow를 전달하는지를 검사한다.

## 구현 순서

1. **Failure-lock tests** — 현재 box payload의 missing `encodeColor`, composition source의 missing replacement와 one-read-only
   instruction이 정확히 실패함을 고정한다.
2. **Primary variant correction** — box와 composition public recipe source, metadata steps/pitfalls를 교정한다.
3. **Bounded dependency routing** — B/C와 installed local MCP instruction을 one search + up to two reads in one round로
   동기화한다.
4. **24-task closure matrix** — 실제 generated sources를 실행해 task-required action/runtime/trap coverage를 검증한다.
5. **Mocked model flow** — box는 one-read valid submit, composition은 composition+rose parallel reads 뒤 valid submit을 B와 C
   각각 검증한다.
6. **Generated/package synchronization** — knowledge index, search index, public LLM docs와 installed MCP exact read를
   재생성·검증한다.
7. **Complete unpaid evidence** — 33 recipe execution, 24 closure rows, 24 offline task render, focused/full/docs/package/MCP/
   browser checks를 실행하고 Gate M을 준비한다.

각 verified conceptual change는 별도 commit으로 push한다. Public API, schema 또는 architecture 변경이 필요해지면 진행을
멈추고 새 결정을 요청한다.

## Gate M 완료 증거

- Generated recipes: **33 / 33 executable**
- Frozen delivery closure: **24 / 24**
- Dependencies: task당 0~1개, bounded read contract 위반 0
- Box/composition Gate K failures를 재현한 regression test와 corrected pass
- Mocked B/C box and composition: search/read/submit flow와 final valid
- Frozen recipe-backed offline programs: **24 / 24 final valid**와 rendered contact sheets
- Frozen/paraphrase recipe-first, exact-name action/recipe top-1 search regression
- Generated docs/knowledge hashes와 source/installed-MCP parity
- Focused/full/docs/package/installed-MCP/browser checks
- External model calls and additional spend: **0**
- Clean remote implementation checkpoint

24/24 closure와 mocked B/C는 delivery contract의 무과금 증거다. 실제 model correctness나 efficiency improvement claim은
아니며, Gate M 승인 뒤에도 Gate K와 같은 세 task의 paid retry를 별도 Gate N으로 제안한다.

## 바꾸지 않는 것

- Frozen 24 tasks, prompts, datasets, oracle, split와 seed
- `gpt-5.6-terra`, reasoning/verbosity/service tier, token ceiling과 3-model-call envelope
- Current knowledge schema v2와 recipe source schema v1
- Public library API, declarations, `ChartProgram` shape와 renderer behavior
- Phase 0 baseline과 acceptance thresholds
- Historical Gate G/H/K plan, raw result와 artifact roots

## 승인 효과와 계속 차단되는 범위

Gate L을 명시적으로 승인하면 위 task-closed delivery correction과 무과금 Gate M evidence 준비만 허용된다.

계속 차단된다.

- External/paid model call과 Gate K retry
- Frozen 24-task full evaluation
- Correctness/efficiency benefit claim
- PR preparation, Ready 전환과 merge
- Package publish, docs deployment와 release
- Roadmap 5.3 closeout

## 근거

- Approved failed smoke: [`GATE_K.md`](./GATE_K.md)
- Failure analysis: [`SYSTEMATIC_SMOKE_ANALYSIS.md`](./SYSTEMATIC_SMOKE_ANALYSIS.md)
- Previous unpaid contract: [`GATE_I.md`](./GATE_I.md)
- Previous unpaid evidence: [`GATE_J.md`](./GATE_J.md)
- Frozen benchmark contract: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
