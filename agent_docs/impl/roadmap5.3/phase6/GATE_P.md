# Gate R53-P6-P — Complete Submit-Ready and Layout-Safe Evidence

## Gate state

`approved`

Gate O approval checkpoint: `3112476a`

Implementation checkpoint: `5606b1d509192006799042a43f76928b03062dc1`

Implementation tree: `80b5fe92e5640b235a830744547369226edb093d`

Evidence record checkpoint: `e4ea8689`

Evidence approval checkpoint: `fb2b511c`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

Approved by the user on 2026-08-07, including the recorded local Jekyll environment limitation.

## 한눈에 보는 결과

Gate N에서 남은 두 실패를 public API, knowledge schema, renderer나 evaluation envelope 변경 없이 public recipe source와
layout-safety contract로 교정했다.

```text
box implicit Canvas
  → explicit 640×400 + explicit margins
  → color / redundant-legend / render flow complete

composition narrow colored replacement
  → keep meaningful legend with explicit side margin
  → or disable unnecessary/redundant legend explicitly
  → every child materializes before composition

33 / 33 executable recipes
24 / 24 delivered closure
24 / 24 offline task charts
B/C mocked Box + Composition first submission valid
package / installed MCP / docs / browser checks pass
external model call 0, additional cost $0
```

## 구현 결과

### 1. Submit-ready Box recipe

`box-plot` public source는 이제 다음을 한 payload에서 제공한다.

- `width: 640`, `height: 400`
- `margin: { top: 30, right: 30, bottom: 60, left: 70 }`
- Tukey/outlier 기본 flow
- `createBoxPlot` 뒤 stable `boxPlot` owner를 target으로 한 `encodeColor`
- Redundant legend를 끄는 `guides.legend: false`
- Exact Browser Canvas context guard와 `render(program, context)`

Source와 structured pitfall은 explicit Canvas dimensions와 guide space를 유지하도록 같은 지침을 전달한다. Evaluation
dataset ID, task ID, oracle 이름과 `buildChart(datasets)` wrapper는 public docs에 넣지 않았다.

### 2. Layout-safe Composition recipe

`composition` public source는 두 valid legend policy를 실제 child program으로 구분한다.

1. Color legend가 의미 있는 point child는 explicit right margin `120`을 확보한다.
2. Category encoding과 중복되는 replacement legend는 `guides.legend: false`로 끈다.

Initial child, replacement, stable slot ID, `editCompositionLayout({ gap: 24, ... })`와
`replaceCompositionChild({ target, program })`은 그대로 유지된다. Structured pitfall은 parent composition이 child의
부족한 guide margin을 고치지 않으므로 각 child를 먼저 독립 materialize해야 한다고 명시한다.

Gate N의 exact narrow colored bar는 계속
`Legend layout requires more right-margin space.`를 내며, 동일 data/mark에서 right margin `120` 정책과 explicit
`legend: false` 정책은 각각 독립적으로 통과한다.

### 3. Evaluation과 public contract 경계 유지

- Condition B current-doc tools를 recipe read 뒤 숨기지 않음
- Model-call ceiling 3, tool choice, task prompt와 oracle 변경 없음
- B/C/MCP one-search + bounded dependency-read instruction 변경 없음
- Knowledge schema v2와 recipe source schema v1 유지
- Public ggaction API, declarations, `ChartProgram`, renderer와 automatic margin behavior 변경 없음
- Historical Gate G/H/K/N plans와 raw evidence 변경 없음

따라서 다음 paid smoke에서 관찰할 수 있는 차이는 tool suppression이나 benchmark 변경이 아니라 delivered public source의
차이다.

## Complete unpaid evidence

### Focused behavior와 delivery

- Recipe/evaluation/search/MCP/task-program focused contracts: **31 / 31 pass**
- Generated recipe exact source: **33 / 33 executable**
- Frozen delivered recipe closure: **24 / 24**
- Dependency count: task당 0~1, bounded-read violation 0
- Frozen offline task program: **24 / 24 final valid and rendered**
- B/C mocked Box flow: one search + one exact recipe read, first submission valid
- B/C mocked Composition flow: one search + two parallel exact recipe reads, first submission valid
- Box and Composition renderer evidence: non-empty Canvas

### Documentation, package와 browser

- Public documentation source tests: **45 / 45 pass**
- `knowledge:check`, action/reference/signature/capability/metadata/search checks: pass
- `examples:index:check`: pass
- `package:check`: pass, 417 entries
- Installed package local MCP: 173 actions, 33 recipes, 4 docs; source discovery/payload parity pass
- Browser isolation and packed browser entry: **53 / 53 pass**
- External model calls / credential reads / additional spend: **0 / 0 / $0**

### Full-suite safety guards

현재 `npm test`는 **2,116 / 2,136 pass, 20 rejected**다. 20개는 product, recipe, renderer 또는 docs failure가 아니라
새 knowledge SHA를 이전 paid candidate로 오인하지 않도록 credential read 전에 거부하는 historical safety guard다.

- Corrective full-evaluation historical plan: 6
- Executable-recipe smoke historical plan: 1
- Systematic-recipe smoke historical plan: 7
- Task-closed Gate N smoke historical plan: 6
- New product/delivery/package/docs failure: 0

Historical plan의 frozen SHA를 현재 candidate로 고치거나 기존 evidence root를 재사용하지 않았다.

### 로컬 documentation build 환경

`npm run docs:build`은 source compilation 전에 `jekyll` executable 부재로 종료됐다. 별도 `npm run docs:preflight`는
현재 host가 macOS system Ruby `2.6.10`이고 locked GitHub Pages bundle은 Ruby `3.2+`를 요구한다고 확인했다.

이는 source test failure가 아니다. Repository CI는 `ruby/setup-ruby`로 exact Ruby `3.2.6`을 설치한 뒤 같은
`docs:build`, built-doc check와 desktop/mobile browser test를 수행하도록 고정되어 있다. PR 생성은 별도 승인 대상이므로
이번 Gate에서 CI를 시작하기 위한 PR을 만들지 않았고 system Ruby도 변경하지 않았다.

## Evidence digests

| Evidence | SHA-256 |
| --- | --- |
| `knowledge/index.json` | `e29dd05976d7eb685184fb391de29ac297a2cb49ea09425a52a28229a073d612` |
| `knowledge/search-index.json` | `215e2cd640c644f929767a8301cb9e859341f617b1f6cb93d3be89211f8a61b7` |
| `docs/llms-recipes.json` | `ed29100aa47fa25625ae05fc808ef1bc921ad70f55673af355ec789ea1fd1e67` |
| Frozen delivery matrix | `4c1d854d01478d9601509bde370b48999f44f06825475aa366642b031cdc9507` |
| Executable recipe manifest | `af2bde445621994ac2e421f926075019beadcebae2e778d7f56e55f3446fead0` |
| Delivered closure manifest | `08f786b7237deef3af583975f425d35e4964353a026aafdaf021a21fe8598d5f` |
| Offline task manifest | `14335d1b859517051d4f348d6ffd48ac1592f9e89ac4ccedb3764ca3bedf3077` |
| Authoring contact sheet | `54d8ea3f58b9ff2171fb3ec84f6f9bd6e4fff3936d48579236fd8dee5110cd23` |
| Held-out contact sheet | `0ba4909952aa6377aa3ad72014a033c8b384b12d5b0d3860e15e891db00d2060` |
| Renderer-parity contact sheet | `aaa6ec84114c5c2bbe5f1f8dbb194388f74f71927c19e25ed57a706b57dfb85c` |
| Installed package tarball | `03bb1f29395ece629915a0bc42646747bc2a258857c8ab0b44d16e2a31edcccc` |

## Review decision

사용자는 Gate P evidence와 correction completion을 승인했다. 이 승인으로 external model call, paid retry, full
evaluation, PR, merge, publish 또는 benefit claim은 허용되지 않는다. 같은 세 frozen task의 representative B/C paid
retry는 별도 Gate Q 제안과 승인이 필요하다.

## 계속 차단되는 범위

- Credential read와 external/paid model call
- Gate N 재개 또는 Condition C 실행
- Frozen 24-task full evaluation
- Correctness/efficiency benefit claim
- Historical paid-plan hash 변경
- PR preparation, Ready 전환과 merge
- Package publish, docs deployment와 release
- Roadmap 5.3 closeout

## 근거

- Approved correction contract: [`GATE_O.md`](./GATE_O.md)
- Approved failed smoke: [`GATE_N.md`](./GATE_N.md)
- Exact failure analysis: [`TASK_CLOSED_SMOKE_ANALYSIS.md`](./TASK_CLOSED_SMOKE_ANALYSIS.md)
- Frozen benchmark contract: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
