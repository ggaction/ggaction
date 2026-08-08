# Gate R54-P5-A — LLM Authoring Bootstrap Contract

## Gate state

`ready-for-review`

Verified diagnosis and runner-repair checkpoint: `935611a9bf4dcaf57126febad7cf849a020012f7`.

## 결정이 필요한 이유

Paid smoke Attempt 1에서 A/B/C는 서로 다른 knowledge route를 사용했지만 모두 존재하지 않는 package-level authoring
factory를 발명했다.

```text
A: ggaction.createCanvas(...)
B: import { Canvas } from "ggaction"
C: import { createCanvas } from "ggaction"
```

Current task packet은 `program.createHistogram(...)` 같은 action call은 정확히 반환하지만 `program`을 만드는 방법을
반환하지 않는다. 또한 `ChartProgram`이 immutable이므로 각 action result를 chain하거나 다시 할당해야 한다는 실행 규칙과
renderer별 import도 없다. 따라서 현재의 `one-call closure`는 action/option coverage에는 닫혀 있지만 executable module
closure에는 닫혀 있지 않다.

## Options

### A — Task packet schema v2 (recommended)

기존 `actionPlan`, `exactCalls`, `unresolved`, `candidates`는 유지하고 다음 bounded `authoring` block을 추가한다.

```json
{
  "schemaVersion": 2,
  "authoring": {
    "imports": [
      "import { chart } from \"ggaction\";",
      "import { renderToSVG } from \"ggaction/svg\";"
    ],
    "initialize": "let program = chart()",
    "steps": [
      "program = program.createHistogram({ field: \"value\", guides: {} })",
      "const output = renderToSVG(program)"
    ]
  }
}
```

- `imports`는 selected runtime에 필요한 exact public package entry만 포함한다.
- `initialize`는 exact supported program factory를 제공한다.
- Chainable action과 program-returning composition은 `program = ...`으로 immutable state를 보존한다.
- Renderer call은 output kind에 맞는 exact call을 제공한다.
- Existing `exactCalls`는 action-card identity와 backward inspection용으로 유지한다.
- `schemaVersion`을 2로 올려 response shape 변경을 숨기지 않는다.

장점은 실제 direct/MCP 사용자가 benchmark prompt 없이도 package entry와 state rule을 한 lookup에서 받는다는 점이다.
단점은 public task-packet schema가 v2가 되므로 schema, resolver, MCP, docs, installed-package evidence를 함께 갱신해야 한다.

### B — Benchmark prompt only

모든 condition prompt에 `import { chart }`, `chart()`와 reassignment rule을 넣고 packet v1은 그대로 둔다.

구현은 작고 A/B/C 비교의 bootstrap confound를 제거하지만 실제 `search_ggaction` 사용자는 여전히 불완전한 packet을 받는다.
Roadmap의 LLM-friendly 목표를 제품이 아니라 평가 harness가 대신 해결하므로 권장하지 않는다.

### C — MCP tool description only

Tool description에 `chart()`와 immutable reassignment 한 줄만 추가한다. Packet schema는 유지할 수 있지만 renderer imports와
task별 executable steps가 구조화되지 않고, direct adapter만 사용하는 consumer에는 같은 정보가 없다. 부분 수정이므로
권장하지 않는다.

## Recommended contract and acceptance

Option A를 승인하면 다음 범위만 구현한다.

1. `knowledge/task-packet.schema.json` schemaVersion 2와 bounded `authoring` block
2. Resolver의 deterministic imports/initialize/executable steps
3. Direct string과 local stdio MCP byte equality
4. Tool query guidance: exact user Task text만 전달하고 dataset/scaffold를 query에 복사하지 않음
5. Overview, public MCP docs와 generated LLM docs synchronization
6. Exact-action 173 / 173, all design/fresh corpus closure와 TypeScript validation
7. Selected supported tasks의 actual module/Canvas/SVG execution
8. Task packet maximum 6,144 bytes와 corpus median 4,096 bytes ceilings 유지
9. Package entries/packed/unpacked와 browser bundle ceilings 유지
10. Installed local MCP, read-only/no-execution boundary와 direct/MCP equality 재검증

Existing chart action API, `ChartProgram`, renderer output, MCP tool count/signature, transport와 docs-fallback policy는 바꾸지
않는다.

## Already completed independent runner repair

Public packet decision과 무관한 다음 repair는 `935611a9`에 고정했다.

- Provider가 거부한 `uniqueItems` 제거; exact URI equality/uniqueness는 handler가 계속 검사
- Official Structured Outputs supported subset에 대한 credential-read-before schema preflight
- D의 두 docs resources를 한 model-visible call로 읽는 3-call limit 유지
- Exact Task text-only search instruction
- Child command/path/full stack 대신 bounded one-line generated-program failure
- Focused tests 8 / 8, cumulative contracts 199 / 199, route dry-run 16 / 16

공식 schema 근거:
<https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas>

## Approval effect

승인은 **Option A task packet schema v2 구현과 무비용 검증만** 연다. 구현 결과와 exact replacement smoke plan은
R54-P5-B에서 다시 승인받는다.

이 Gate는 credential 재읽기, external model call, 추가 spend, Attempt 1 resume/retry, full evaluation, PR/merge,
publish/deploy/release를 열지 않는다.

## 승인 전 차단 범위

- Public task-packet schema v2 implementation
- MCP/public docs response-shape change
- Credential read / external call / additional spend
- Replacement paid-smoke Gate
- Full evaluation and integration

## Approval record

- Pending user decision among A, B, and C.
