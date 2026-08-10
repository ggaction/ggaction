# Phase 5 Paid Smoke Attempt 1

## Identity

| 항목 | 값 |
| --- | --- |
| Authorization checkpoint | `c74bde7b` |
| Product candidate | `b1bb16c600ef0eea80729570b12b96652060644f` |
| Plan SHA-256 | `95010b28aacb596f18398a9e259ed9bec1de9280e78ccd2316a525a73f08bc54` |
| Started | `2026-08-08T14:35:34.503Z` |
| Aborted | `2026-08-08T14:36:12.432Z` |
| Raw result | `evaluation/compact-authoring-paid-smoke/results/IN_PROGRESS.json` |
| Raw result SHA-256 | `a6176c64010795da419cc6f49c4cec645f95fdfdfb938e98c0f216a441dbb745` |

## Outcome

| Metric | Result |
| --- | ---: |
| Completed task-runs | 3 / 16 |
| Passing task-runs | 0 / 3 |
| Model calls | 9 |
| Input tokens | 12,626 |
| Cached input tokens | 4,021 |
| Cache-write tokens | 6,202 |
| Output tokens | 3,184 |
| Reasoning tokens | 1,891 |
| Total tokens | 15,810 |
| Spend | `$0.0593232` |
| Automatic retries | 0 |

| Task-run | Calls | Spend | Result |
| --- | ---: | ---: | --- |
| `repair-val-histogram:A` | 3 | `$0.0240947` | `ggaction.createCanvas is not a function` |
| `repair-val-histogram:B` | 3 | `$0.0189785` | package has no `Canvas` export |
| `repair-val-histogram:C` | 3 | `$0.01625` | package has no `createCanvas` export |
| `repair-val-histogram:D` | 0 billed | `$0` | strict schema rejected before model execution |

## Root cause 1 — provider schema preflight gap

Condition D만 제공하는 `read_mcp_resources` function schema에 `uniqueItems: true`가 있었다. Mock Responses client와 dry-run은
tool handler behavior만 검사했고 actual provider의 strict JSON Schema subset을 검사하지 않았다. Responses API는 다음
request를 모델 실행 전에 거부했다.

```text
Invalid schema for function 'read_mcp_resources':
In context=('properties', 'uris'), 'uniqueItems' is not permitted.
```

Official Structured Outputs documentation은 arrays에서 `minItems`와 `maxItems`를 지원하지만 `uniqueItems`를 supported
property로 열거하지 않는다. Exact URI equality와 uniqueness는 이미 local handler가 검사하므로 provider schema에서 해당
keyword를 제거할 수 있다. 다음 runner는 모든 model-visible schema를 credential read 전에 같은 supported-subset policy로
검사해야 한다.

공식 근거: <https://developers.openai.com/api/docs/guides/structured-outputs#supported-schemas>

## Root cause 2 — authoring bootstrap closure gap

세 condition은 서로 다른 knowledge route를 사용했지만 모두 package entry를 잘못 발명했다.

- A: namespace import 뒤 `ggaction.createCanvas(...)`
- B: default import 뒤 repair에서 `{ Canvas }`
- C: `{ createCanvas }`

Current compact packet은 `program.createHistogram(...)`과 `renderToSVG(program)` 같은 action/runtime call만 반환한다.
`import { chart } from "ggaction"`, `chart()` program start와 immutable action result를 chain 또는 재할당해야 한다는 규칙은
packet에 없다. MCP overview와 tool description도 이 bootstrap을 전달하지 않는다.

Benchmark prompt는 "import ggaction"과 Canvas/data requirements를 말했지만 exact package export 또는 `chart()`를
말하지 않았다. 따라서 A/B/C가 모두 같은 bootstrap family에서 실패한 결과를 docs-vs-compact quality 차이로 해석할 수 없다.

추가로 B의 search query는 500-character ceiling까지 dataset/scaffold를 복사하다 `SVG render via`에서 끝났다. Resolver는
원래 task query가 아니라 이 변형 query를 처리해 `renderer.format`을 unresolved로 만들었다. Tool instruction은 dataset을
복사하지 말고 exact Task text만 보내도록 명확히 해야 한다.

## Root cause 3 — repair feedback quality

Generated-program error가 child command, absolute paths와 full stack을 그대로 model repair feedback과 result에 넣었다. 이는
오류 원인보다 많은 token을 쓰고 local execution detail을 노출한다. 다음 runner는 static package-import validation을 먼저
수행하고, child failure를 bounded error code와 한 줄 repair hint로 정규화해야 한다.

## Scientific conclusion

- Attempt 1은 harness/schema validity smoke에 실패했다.
- Correctness, token, model-call 또는 time-to-valid A/B/C/D comparison으로 사용하지 않는다.
- A/B/C failure를 compact knowledge의 final negative result로 해석하지 않는다.
- D request rejection 뒤 remaining 12 task-runs를 열지 않았고 자동 retry하지 않았다.
- 새 paid attempt는 original evidence를 보존한 별도 plan/result identity와 approval이 필요하다.
