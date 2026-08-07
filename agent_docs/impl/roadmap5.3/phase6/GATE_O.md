# Gate R53-P6-O — Submit-Ready and Layout-Safe Recipe Correction

## Gate state

`ready-for-review`

Proposal checkpoint: `24ce2cac`

Gate N result approval checkpoint: `432f245c`

Gate N closeout link checkpoint: `c14539a6`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 제안

Gate N에서 남은 두 실패를 public API, knowledge schema, renderer와 평가 조건을 바꾸지 않고 public recipe의
**submit readiness**와 **child layout safety**로 교정한다.

```text
box recipe
  → explicit Canvas size + adequate margins + complete render flow
  → exact read 뒤 추가 Canvas 검색 없이 작성 가능

composition recipe
  → every child materializes independently
  → meaningful legend: reserve margin
  → unnecessary/redundant legend: disable explicitly
  → replace child + final composition render

targeted failure locks + 33 recipe + 24 task unpaid evidence
  → Gate P review
```

이 Gate는 무과금 correction과 Gate P evidence 준비만 제안한다. External model call, paid retry, full evaluation, PR,
merge, publish와 release는 포함하지 않는다.

## Gate N이 정확히 드러낸 경계

### 1. Box는 action 지식이 아니라 Canvas 완결성이 부족했다

읽은 `box-plot` payload에는 `createBoxPlot`, post-facade `encodeColor`, redundant legend 제거와
`render(program, context)`가 모두 있었다. 하지만 source는 `.createCanvas()` 기본값만 사용했고 evaluation prompt는 명시적
640×400 Canvas와 충분한 margin을 요구했다. Model의 마지막 query도 정확히
`Canvas renderer createCanvas width height margins render ggaction`이었다.

따라서 새 action, 더 긴 search 또는 evaluator-only hint를 추가하는 대신 canonical source가 명시적 Canvas 계약까지
완성하도록 한다.

### 2. Composition은 API가 아니라 child guide layout에서 실패했다

Model은 `composition`과 `rose-chart`를 같은 response에서 정확히 읽고, 존재하는 arc primitives, stable slot replacement와
24px gap을 작성했다. 최종 replacement bar가 color legend를 자동 생성했지만 right margin은 24px뿐이라
`Legend layout requires more right-margin space.`가 발생했다.

Gate N source의 세 child chain을 독립 실행하면 scatter와 rose는 materialize되고 replacement bar만 같은 오류를 낸다.
Composition 지식은 child API뿐 아니라 각 child가 parent에 들어가기 전에 guide 공간까지 유효해야 한다는 규칙을
전달해야 한다.

## 권장 교정

### A. Box recipe를 바로 제출 가능한 complete source로 만든다

`docs/recipes/box-plot.md`의 canonical source에 다음을 함께 둔다.

- Explicit `width: 640`, `height: 400`
- Axes와 box ink를 위한 explicit top/right/bottom/left margins
- Tukey/outlier 기본 동작, post-facade `encodeColor`와 `guides.legend: false`
- Existing Browser Canvas context guard와 `render(program, context)`

이 source는 일반 사용자에게도 그대로 실행 가능해야 한다. Evaluation 전용 dataset ID, `buildChart(datasets)` wrapper,
task ID 또는 oracle 이름은 public recipe에 넣지 않는다.

### B. Composition recipe에서 두 legend 정책을 실제 source로 보여준다

각 child Canvas는 독립 chart로 먼저 materialize되므로 parent composition이 margin 오류를 고쳐주지 않는다. Canonical
source에서 다음 두 정책을 모두 실행 가능한 형태로 보여준다.

1. **Meaningful legend 유지** — color encoding을 가진 child는 충분한 explicit right margin을 확보한다.
2. **불필요하거나 redundant한 legend 제거** — 해당 child facade에서 `guides.legend: false`를 명시한다.

Replacement child는 stable slot ID, `editCompositionLayout({ gap: 24, ... })`와
`replaceCompositionChild({ target, program })`을 계속 사용한다. Source 아래 설명과 structured pitfall에는 “모든 child와
replacement는 concat 전에 독립적으로 build되어야 한다”와 두 legend 정책을 같은 용어로 기록한다.

### C. 평가기와 schema를 바꾸지 않는다

- Condition B의 current-doc tools를 recipe read 뒤 숨기지 않는다.
- Model-call ceiling 3, tool choice, prompt, task와 oracle을 바꾸지 않는다.
- `readKnowledge.nextStep`, Condition B/C와 MCP instruction의 one-search/bounded-read 계약을 바꾸지 않는다.
- Knowledge schema v2, recipe source schema v1과 existing exact-read payload shape를 유지한다.

이 경계를 지키면 다음 paid smoke의 변화는 tool suppression이나 benchmark 변경이 아니라 실제 delivered source 차이에서
온다.

## 구현 순서

1. **Failure locks** — Gate N box payload의 implicit Canvas와 narrow colored replacement의 exact margin error를 무과금
   regression으로 고정한다.
2. **Box source correction** — public recipe source와 필요한 structured pitfall을 explicit Canvas 계약으로 교정한다.
3. **Composition source correction** — meaningful-legend margin과 disabled-legend 두 child policy를 source와 pitfall에
   반영한다.
4. **Layout-safe closure** — generated payload에서 만든 frozen box variant와 composed-dashboard variant를 실행해 required
   validations와 non-empty Canvas를 확인한다.
5. **Delivery synchronization** — generated knowledge, search index, public LLM JSON과 source/installed MCP payload를
   재생성하고 exact parity를 검증한다.
6. **Complete unpaid evidence** — 33 recipes, frozen 24-task delivery closure, 24 offline charts, focused/full/docs/package/MCP/
   browser checks를 실행하고 Gate P review package를 만든다.

각 verified conceptual change는 별도 commit으로 push한다. Public API, schema, renderer behavior 또는 benchmark 변경이
필요해지면 진행을 멈추고 새 결정을 요청한다.

## Gate P 완료 조건

- Gate N failure-lock 두 건이 correction 전 실패와 correction 후 통과를 구분
- Generated box source: explicit 640×400 Canvas, explicit margins, color/legend/render flow complete
- Generated composition source: colored child의 adequate margin과 explicit disabled-legend policy 모두 존재
- Frozen box payload-derived program: all required validations와 Canvas pass
- Frozen composition payload-derived program: child별 materialization, 24px gap, slot replacement와 Canvas pass
- Generated recipes: **33 / 33 executable**
- Frozen delivered closure: **24 / 24**
- Frozen offline task programs: **24 / 24 final valid**
- B/C mocked bounded read/submit flow, source MCP와 installed MCP exact payload parity
- Focused/full/docs/package/installed-MCP/browser checks
- External model calls, credential reads와 additional spend: **0**
- Clean remote implementation/evidence checkpoint

이 evidence는 source와 layout closure의 무과금 증거일 뿐 실제 model correctness improvement claim이 아니다. Gate P를
별도로 승인한 뒤에만 같은 세 task의 representative paid retry를 새 Gate Q로 제안할 수 있다.

## 바꾸지 않는 것

- Frozen 24 tasks, prompts, datasets, oracle, split, seed와 acceptance thresholds
- Exact model/settings, token ceiling과 3-model-call envelope
- Public library API, declarations, `ChartProgram`, renderer와 automatic margin behavior
- Knowledge schema v2와 recipe source schema v1
- Historical paid plans, raw results, hashes와 artifact roots
- Gate N의 failed evidence와 non-integration decision

## 승인 효과와 계속 차단되는 범위

Gate O를 승인하면 위 무과금 recipe correction과 Gate P evidence 준비만 허용된다.

계속 차단된다.

- Credential read와 external/paid model call
- Condition C 실행 또는 Gate N 재개
- Frozen 24-task full evaluation
- Correctness/efficiency benefit claim
- Historical paid-plan hash 변경
- PR preparation, Ready 전환과 merge
- Package publish, docs deployment와 release
- Roadmap 5.3 closeout

## 근거

- Approved failed smoke: [`GATE_N.md`](./GATE_N.md)
- Exact failure analysis: [`TASK_CLOSED_SMOKE_ANALYSIS.md`](./TASK_CLOSED_SMOKE_ANALYSIS.md)
- Previous task-closed contract: [`GATE_L.md`](./GATE_L.md)
- Previous unpaid evidence: [`GATE_M.md`](./GATE_M.md)
- Frozen benchmark contract: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
