# Roadmap 5.3 Phase 6 — Gate U Bottom Multi-Legend Confirmation Analysis

## 결론

Gate U는 exact 4 runs를 안전하게 완료했고 bottom color + opacity multi-legend task를 A/B/C/D 모두 첫 제출에서
통과했다. Gate T에서 확인한 one-row wrap과 failing create 뒤 post-edit 문제는 provider 환경에서도 닫혔다. Gate U의
confirmation acceptance는 **통과**다.

이 결과는 한 task를 condition별 한 번씩 실행한 correction confirmation이다. Full corpus의 correctness나 LLM-friendly
효율 향상을 증명하지 않으며 PR/merge 또는 benefit claim을 단독으로 허용하지 않는다.

## Immutable execution identity

| 항목 | 값 |
| --- | --- |
| Candidate | `90b4a815850922fa904d7c8c7ac5b91576e7bec1` |
| Gate record | `08e73e097882231af3c01edc37a52b945713af56` |
| Approval SHA-256 | `11bdf984bf55419c01083cfd6bfcccc2deff320590525ced3b398518f415208b` |
| Corpus SHA-256 | `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c` |
| Documentation SHA-256 | `f9f24236cafdcea990ae20a345e88d6df3adda11fe3e004f7f3735365e37b033` |
| Installed package SHA-256 | `933302604d9b11aba8568f2d4cd0fb0425228863fde0a33874fc85c907e9e42d` |
| Structured surface SHA-256 | `825789ee27ec3e2c6ce3e112232d138cf7cdbf1e93be96283c320ad9c80b6527` |
| Manifest SHA-256 | `57e0e4c8d77dbc2cbc448cb0f4406630d252d1db23b8294ee275fa083767d2a4` |
| Results SHA-256 | `12fd2a1c1238710759a46fb7829fdd6699cd441ba4c398ab824a71c6f8e0e1fa` |
| Summary SHA-256 | `bbc7cb8ede00836e839967381ad2801a6c72d08dde4123935021e1e1ac6a1f56` |
| Complete 23-file artifact-set SHA-256 | `0bff5c6f784bd0c35e642773620c64f93b18e5212c38099d4947f2d3021e6cdf` |

Raw artifacts는 `.artifacts/llm-eval/paired-pilot/r53-p6-u-20260808/`에 보존한다. 이 문서는 raw result나
summary를 다시 계산해 결과를 바꾸지 않는다.

## Result matrix

| Condition | Final | First submission | Model calls | Tokens | Time to valid | Cost |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A — pinned docs | pass | pass | 3 | 5,941 | 9,259ms | `$0.0176195` |
| B — structured direct | pass | pass | 2 | 4,718 | 6,392ms | `$0.0171015` |
| C — local MCP | pass | pass | 2 | 4,752 | 6,857ms | `$0.0172910` |
| D — docs + local MCP | pass | pass | 2 | 5,553 | 10,196ms | `$0.0183667` |

- Completed runs: **4 / 4**
- Final valid: **4 / 4**
- First-submission valid: **4 / 4**
- Submissions / repair rounds: **4 / 0**
- Model calls / total tokens: **9 / 20,964**
- Actual spend: **$0.0703787 / $1.00** hard cap
- Provider, timeout, model mismatch, usage와 cap failure: **0**
- Unreported cost upper bound: **$0**

## Acceptance audit

### 1. Strict chart correctness

네 run 모두 같은 strict oracle의 모든 항목을 통과했다.

- program build와 plot ink
- exact two legends와 bottom position
- left-to-right order
- title와 symbol alignment
- equal label gaps
- minimum inter-block gap
- required plot offset

모든 run이 첫 submission에서 통과해 failure diagnostics나 repair에 의존하지 않았다. 각 source, SHA, validation, trace와
Canvas artifact는 run별 파일로 보존됐다.

### 2. Retrieval identity

- A는 docs search 1위 `/api/legends/#bottom-multi-legend-row`를 읽고 제출했다.
- B/C/D는 structured search에서 `recipe:legend-title-lifecycle`을 primary identity로 받았다.
- Retrieval success는 **4 / 4**이며 잘못된 fallback route나 unknown identity가 없다.

### 3. Accounting and MCP integrity

- Knowledge calls는 `5 attempted = 5 executed + 0 rejected`로 일치한다.
- Complete billable usage가 모든 request에 존재하며 unreported upper bound는 0이다.
- B/C structured surface는 같은 hash를 사용하고 focused direct/MCP byte-equivalence contract가 통과했다.
- C와 D는 각각 installed-package MCP의 initialize, resource/tool listing, read와 call을 실제 수행했다.
- Actual MCP protocol operations는 합계 **12**, direct/docs-only의 MCP operation은 0이다.

## Diagnostic-only efficiency

이 한 task에서는 C가 A보다 total tokens, model calls와 time-to-valid가 모두 작았고 B/C 비용과 token 사용도 가까웠다.
D는 A보다 model call은 적었지만 time-to-valid와 비용은 더 컸다. Repetition이 한 번이고 task도 하나이므로 이 차이는
correctness confirmation의 부수 측정일 뿐 product benefit이나 transport superiority로 일반화하지 않는다.

## Decision boundary

Gate U로 Gate T의 마지막 correctness failure가 실제 provider 환경에서도 닫혔음을 확인했다. 다음 단계에서 전체 17-task
correctness와 efficiency를 주장하려면 frozen corpus와 사전 고정된 acceptance rule을 사용한 새 paid Gate가 필요하다.
PR preparation, merge, full paid benchmark, publish, deploy와 release는 여전히 승인되지 않았다.
