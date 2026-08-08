# Gate R54-P5-B — Replacement Paid Smoke Authorization

## Gate state

`approved`

Product candidate: `6ed5af76c80e56c5a3cde833c5a702de183e4d7a`.

Verified review checkpoint: `3d02a7c384ea5ca87ad16281a0782c558f4fa15c`.

Replacement plan: `evaluation/compact-authoring-paid-smoke-v2/PLAN.json`.

Plan SHA-256: `24325b73b1e0e3751f5fb9346c31e8f998a7de4a8b1735ec9a63835a1c6e6c6c`.

## 구현 결과

Task packet schema v2가 existing `actionPlan`, `exactCalls`, `unresolved`, `candidates`를 유지하면서 다음 executable
bootstrap을 추가한다.

```json
{
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

- Import는 selected public package entry만 deterministic order로 반환한다.
- Action과 program-returning composition은 `program = ...`으로 immutable result를 보존한다.
- Canvas `render`는 exact call을, SVG/PNG/PDF renderer는 output을 저장하는 exact statement를 반환한다.
- 여러 output renderer가 함께 선택되면 `svgOutput`, `pngOutput`, `pdfOutput`처럼 이름을 분리한다.
- Direct adapter와 local stdio MCP는 schema v2 전체를 byte-equal하게 직렬화한다.
- Exact user task만 query로 받고 dataset, scaffold, evaluator instruction은 추가하지 않도록 tool/server/docs guidance를
  동기화했다.
- Installed npm package에 `knowledge/task-packet.schema.json`을 포함한다.

## 무비용 검증

| Evidence | Result |
| --- | --- |
| Exact action authoring closure | 173 / 173 |
| Fresh frozen-corpus authoring closure | 48 / 48 |
| Focused resolver/MCP/package/evaluation contracts | 25 / 25 pass |
| Canvas and SVG authoring statement execution | pass |
| TypeScript validation of supported/design/fresh statements | pass |
| Exact-action packet median / maximum | 791 / 1,231 bytes |
| Design packet median / maximum | 1,363 / 2,259 bytes |
| Fresh packet median / maximum | 1,746 / 3,544 bytes |
| Hard packet ceiling | 6,144 bytes, pass |
| Public docs tests | 45 / 45 pass |
| Packed artifact | 420 entries / 423,096 packed / 2,168,296 unpacked bytes, pass |
| Installed local MCP, schema, SVG execution and browser ceilings | pass |
| Replacement paid runner contract tests | 9 / 9 pass |
| Replacement A/B/C/D route dry-run | 16 / 16 pass |
| Cumulative contract suite | 201 / 201 pass |
| Full repository suite | 2,095 / 2,095 pass |
| Dry-run external calls / spend | 0 / `$0` |

Full Jekyll/browser docs verification은 product failure가 아니라 local Ruby 2.6.10이 required Ruby 3.2+를 충족하지 못해
preflight에서 중단됐다. Generated docs, Markdown structure, links, search index와 LLM bundle 검증은 모두 통과했다.

## Attempt 1 보존

Attempt 1의 plan과 raw result는 수정하지 않았다. Contract test가 다음 SHA-256을 고정한다.

- Historical plan: `95010b28aacb596f18398a9e259ed9bec1de9280e78ccd2316a525a73f08bc54`
- Historical result: `a6176c64010795da419cc6f49c4cec645f95fdfdfb938e98c0f216a441dbb745`

Replacement는 별도 `compact-authoring-paid-smoke-v2` directory와 result ledger를 사용한다.

## 승인 요청 범위

승인 시 다음 한 번의 replacement smoke만 허용한다.

| Item | Exact scope |
| --- | --- |
| Product candidate | `6ed5af76c80e56c5a3cde833c5a702de183e4d7a` |
| Plan | SHA-256 `24325b73b1e0e3751f5fb9346c31e8f998a7de4a8b1735ec9a63835a1c6e6c6c` |
| Model | `gpt-5.6-terra`, medium reasoning, low verbosity, default tier |
| Matrix | 4 fixed tasks × A/B/C/D × 1 repetition = 16 task-runs |
| Maximum model calls | 3 per task-run, 48 total |
| Expected projection | `$1.152` |
| Calculated maximum envelope | `$2.496` |
| Hard global stop | `< $3`; next request가 cap을 넘길 수 있으면 호출 전 중단 |
| Credential | Previously identified single credential file, one read only after approval |
| Retry | Automatic retry 0 |

Condition A는 public docs, B는 compact direct, C는 byte-equal local MCP, D는 MCP-first와 unresolved-only docs fallback이다.
Simple/complex와 supported/unsupported task를 각각 포함한다.

## Stop and evidence rules

- Model/service-tier/source hash가 다르거나 billing usage가 불완전하면 즉시 중단한다.
- Task token envelope, provider failure 또는 global cost cap에 닿으면 즉시 중단한다.
- 첫 schema/provider error도 전체 run을 중단하며 자동 수정·재시도하지 않는다.
- Result는 새 directory에 append-only progress로 기록하고 실패를 success로 재분류하지 않는다.
- Paid smoke 결과를 확인하기 전 complete evaluation을 제안하지 않는다.

## Approval effect

승인은 위 exact plan에 대한 credential 1회 read와 최대 16 task-runs만 연다. Full evaluation, 추가 retry, PR, merge,
publish, deploy와 release는 열지 않는다.

## 승인 전 차단 범위

- Credential read
- External model call
- Additional spend
- Replacement paid-smoke execution
- Complete evaluation, PR, merge, publish, deploy와 release

## Approval record

- 사용자가 2026-08-09에 exact product candidate, plan SHA-256, 16 task-runs, 최대 48 model calls,
  calculated maximum `$2.496`와 hard global stop `< $3` 범위를 명시적으로 승인했다.
- 이 승인은 previously identified single credential file의 1회 read와 replacement paid smoke 실행만 연다.
- Automatic retry, complete evaluation, PR, merge, publish, deploy와 release는 계속 차단한다.
