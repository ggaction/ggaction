# Gate R53-P6-C — Corrective Knowledge Delivery Contract

## Gate state

`ready-for-review`

Gate package checkpoint: `8b266ec6`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 결정

이번 보정은 평가 문제를 감추기 위해 model, task, 호출 수 또는 합격선을 바꾸지 않는다. 세 model call 안에서 다음 한
경로가 끝나도록 knowledge delivery를 고친다.

```text
task
  → search once
  → read one self-contained action or recipe
  → submit_program
```

Condition B는 승인된 원래 계약대로 A의 current-doc reader를 그대로 둔 채 structured knowledge를 추가한다. Condition C는
local MCP가 실제로 광고하는 instructions, tool schema와 resource template을 discovery해 model surface를 만든다. Exact read는
더 이상 읽을 수 없는 file path만 반환하지 않고, 코드 작성에 필요한 예시와 타입을 직접 반환한다.

이 Gate는 corrective 구현만 승인한다. External model call, PR, merge, publish, deploy 또는 release를 승인하지 않는다.

## 1. 실험 계약 복구

### Condition B

- A의 `search_docs`, `read_doc`, `docs/llms.txt` routing text를 바이트 단위로 보존한다.
- 그 위에 `search_ggaction`, `read_ggaction`과 structured overview만 추가한다.
- `search_ggaction`은 production과 같은 optional `limit` 1~10과 default 6을 노출한다.
- Instruction은 current docs 사용을 금지하지 않는다. 따라서 B는 replacement가 아니라 **A + structured knowledge**다.

### Condition C

- Local stdio MCP client가 연결 뒤 `getInstructions()`, `listTools()`와 `listResourceTemplates()`를 호출한다.
- Model-facing search tool의 name, description과 input schema는 `listTools()` 결과에서 생성한다. 별도 hard-coded 복사본을
  두지 않는다.
- Resource read bridge는 discovered `ggaction://` template만 허용하고, model에게 `read_mcp_resource({ uri })`로 노출한다.
  Caller-controlled file path, HTTP URL 또는 임의 URI는 허용하지 않는다.
- Routing input은 MCP server instructions, advertised tool/resource catalog와 `ggaction://overview`의 실제 응답으로 만든다.
- Product MCP와 evaluation adapter의 discovery 결과가 다르면 unpaid verification에서 실패한다.

### 바꾸지 않는 것

- 24 tasks, datasets, oracle, shuffle seed와 repetition contract
- `gpt-5.6-terra`, reasoning `medium`, verbosity `low`, service tier와 `store: false`
- task당 model call 3회, MCP call 8회, timeout과 token ceiling
- 공통 task prompt, `tool_choice: "auto"`와 acceptance threshold
- 기존 A result와 A reader implementation

따라서 corrective B/C는 기존 A와 계속 비교할 수 있다. 위 고정축 중 하나라도 바꾸려면 A/B/C 전체 재실행을 별도로
설계하고 승인받는다.

## 2. Self-contained knowledge v2

Authoring source인 `knowledge/actions/*.json`, `knowledge/recipes/*.json`과 그 validation schema는 계속 v1이다. Canonical
behavior와 narrative ownership도 바꾸지 않는다. 생성물인 `knowledge/index.json`, `knowledge/search-index.json`,
`docs/llms-actions.json`, `docs/llms-recipes.json`과 MCP response contract만 schema v2로 올린다.

### Recipe exact read

각 recipe record에 다음 generated field를 추가한다.

- `exampleSource`: recipe가 가리키는 공개 문서의 첫 `javascript` Minimal flow code fence
- `exampleSourcePath`: 해당 공개 문서 경로

현재 33개 중 32개는 이미 이 source를 갖고 있다. `legend-title-lifecycle`만 `docs/api/legends.md`에 완전한 최소 흐름을
추가한다. Generator는 public `ggaction` import와 recipe primary action call이 source에 있는지, 30,000-character program
limit 안인지 검증한다. 현재 path/export example을 실제로 실행하는 검증도 그대로 유지한다. Path/export linkage는
provenance로 유지하되 더 이상 유일한 실행 정보로 사용하지 않는다.

### Action exact read

각 action record에 다음 generated field를 추가한다.

- `typeDefinitions`: public signature의 parameter가 참조하는 local named type과 transitive local type declaration의 정확한
  closure
- `callExample`: 이미 검증된 canonical/focused JavaScript example source에서 추출한 가장 짧은 실제 method-call fragment
- `callExamplePath`: fragment의 provenance

Type declaration은 `types/*.d.ts`에서만 생성하고 손으로 JSON schema를 다시 쓰지 않는다. Generator는 parameter에서 참조한
local type이 closure에서 빠지거나 declaration이 서로 충돌하면 실패한다. Source에 literal call이 없는
`not-applicable` example만 명시적 reason과 `null`을 허용한다. Trace args를 source로 역직렬화하지 않는다.

### 종료 안내

- Search response는 ranked results와 함께 `nextStep: "Read one best matching action or recipe."`를 반환한다.
- Exact action/recipe read는 `nextStep: "Write the complete program and call submit_program now; do not search again."`를
  반환한다.
- Overview는 더 이상 읽을 수 없는 detailed-doc route를 필수 단계로 권하지 않는다.

이 안내는 B/C knowledge payload의 일부다. 공통 benchmark prompt나 runner의 final-round tool choice를 바꾸지 않는다.

## 3. Retrieval 보정과 과적합 경계

Search ranking은 특정 task ID나 oracle을 production code에 넣어 고치지 않는다. Recipe intent/use-when, facade action,
chart-family synonym과 lifecycle intent처럼 일반화 가능한 generated fields만 사용한다.

Unpaid search Gate는 model이 실제로 보는 default surface로 다음을 요구한다.

1. 24개 frozen task query 모두 expected action 또는 recipe를 default top 6에 포함한다.
2. 24개 모두 expected route를 top 3에 포함한다.
3. Exact action/recipe name query는 해당 record를 top 1에 반환한다.
4. Frozen prompt를 그대로 복사하지 않은 chart-intent paraphrase set도 expected route를 top 3에 포함한다.
5. Search result는 deterministic하고 최대 길이, result 수와 query term 수 경계를 지킨다.

Top 1을 24/24에 억지로 맞추는 것은 요구하지 않는다. 세 개 후보의 title, summary와 kind를 보고 하나를 선택할 수 있게
하면서 benchmark 문구 자체에 과적합하는 것을 피한다.

## 4. Sanitized trace evidence

Provider request/response 원문을 저장하지 않고 run별 sidecar trace를 남긴다. 기존 result schema와 A raw evidence는 바꾸지
않는다.

각 round에는 다음만 기록한다.

- round 번호와 시작 시 남은 model-call 수
- function name
- bounded search query 또는 read kind/ID/URI
- knowledge result identity와 UTF-8 byte length
- submission 유무와 validation outcome

API key, raw provider response, reasoning text, complete knowledge source와 complete submitted program은 trace에 넣지 않는다.
Submitted program은 기존 artifact 경계에서만 관리한다. Summary report에는 trace file SHA-256과 search/read/submit sequence
분포만 들어간다.

## 5. 구현 순서와 다음 Gates

R53-P6-C 승인 뒤 다음 순서로 한 conceptual change씩 검증·commit·push한다.

1. Generated knowledge v2: recipe source, action type closure/call fragment와 validators
2. Search v2: production default-surface coverage와 paraphrase checks
3. B contract restoration and sanitized trace sidecars
4. C actual MCP discovery adapter and installed-package parity
5. Complete unpaid mock/dry, docs, package, MCP, browser-isolation and full test suite

그 결과는 **R53-P6-D**에서 검토한다. P6-D 승인 전에는 paid smoke를 실행하지 않는다. 이후에도 비용 승인은 두 번 나눈다.

- **R53-P6-E:** 대표 task의 B/C one-run smoke와 exact spend ceiling
- **R53-P6-F:** smoke trace 검토 뒤 48-run B/C full rerun과 exact spend ceiling
- Full result와 integration 여부는 별도 result Gate에서 판정한다.

Smoke가 search → one exact read → submission을 보여주지 못하면 full rerun을 요청하지 않는다.

## 승인 효과

승인하면 위 contract에 맞춘 unpaid corrective 구현과 R53-P6-D review package 준비만 해제된다.

## 승인 전 차단 범위

- Generated knowledge/MCP response schema v2 구현
- Condition B/C adapter 변경
- External or paid model calls
- PR preparation/Ready transition, merge, package publish, docs deployment와 release

## 근거

- Frozen benchmark owner: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
- Failed result: [`GATE_B.md`](./GATE_B.md)
- Root-cause evidence: [`FAILURE_ANALYSIS.md`](./FAILURE_ANALYSIS.md)
