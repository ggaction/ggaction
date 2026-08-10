# Gate R54-P3-A — Installed Compact MCP and Fallback Boundary

## Gate state

`approved`

이 Gate는 installed local stdio MCP, byte-equal direct adapter, conditional same-package budget, read-only resource boundary와
unresolved-only docs fallback을 승인받는다. 승인 전에는 Phase 4 evaluation corpus를 만들지 않는다.

## 승인 대상

1. Exactly one model-visible tool: `search_ggaction({ query })`
2. Direct payload와 MCP text payload byte equality
3. Overview, exact action card, task recipe와 bounded docs resource templates
4. Resolved task의 docs fallback 0과 unresolved task의 explicit bounded fallback
5. Installed tarball stdio protocol compatibility와 no chart/file/network/code execution boundary
6. Phase 0 same-package ceiling과 browser bundle isolation
7. MCP-first public documentation and generated LLM routing

## 쉽게 보는 결과

설치된 `ggaction` package는 `ggaction-mcp` executable을 제공한다. MCP client가 complete request를 한 번 보내면
`search_ggaction`은 Phase 2와 동일한 bounded packet을 반환한다.

```text
search_ggaction({ query: "scatter plot with a color legend at bottom as svg" })
  → createScatterPlot
  → editLegendLayout({ position: "bottom" })
  → renderToSVG
```

Direct adapter의 JSON string과 MCP `content[0].text`는 byte-for-byte 같다. Resolved packet 뒤에는 docs resource를 읽을
수 없고, `make a chart`처럼 `chart.type`이 unresolved인 packet 뒤에는 추천된
`ggaction://docs/choose-chart-type` 한 section만 열린다. 다음 resolved search가 오면 그 access도 다시 닫힌다.

## MCP and resource evidence

| Metric | Result | Requirement |
| --- | ---: | ---: |
| Model-visible tools | 1 | exactly 1 |
| Static listed resources | 9 | bounded |
| Resource templates | 2 | action card + docs fallback |
| Direct/MCP sample payload | 1,689 bytes, equal | byte-equal |
| Maximum task packet | 1,980 bytes | ≤ 6,144 |
| Maximum action card | 1,501 bytes | ≤ 3,072 |
| Maximum task recipe | 2,016 bytes | ≤ 6,144 |
| Maximum docs section | 440 bytes | bounded |
| Discovery payload | 2,424 bytes | bounded |
| Resolved docs fallback | 0 | 0 |
| Arbitrary `file://` read | rejected | rejected |
| Chart/render/code/network tools | 0 | 0 |

## Installed package evidence

| Metric | Result | Ceiling | Remaining |
| --- | ---: | ---: | ---: |
| Entries | 419 | 430 | 11 |
| Packed | 420,945 bytes | 450,000 | 29,055 |
| Unpacked | 2,158,885 bytes | 2,400,000 | 241,115 |

- Exact installed tarball SHA-256: `84e1ffa021a4c7c6796d11abb7181a089f9130a08b5aac880e16f4adee9a55d1`
- Actual `node_modules/.bin/ggaction-mcp` stdio initialize/list/call/read: pass
- Installed cold start: 439 ms in the recorded run; informational, no predeclared threshold
- Production dependency audit: 0 vulnerabilities from `npm audit --omit=dev`
- Same-package stop rule: not triggered

## Browser isolation evidence

Package consumer rejects any browser graph containing `/src/mcp/`, `/knowledge/` or `@modelcontextprotocol/sdk` modules. All three
browser-safe measurements passed with zero such modules.

| Entry | Gzip result | Existing ceiling |
| --- | ---: | ---: |
| `ggaction` | 222,930 bytes | 225,000 |
| `ggaction/basic` | 112,984 bytes | 120,000 |
| `ggaction/svg` | 5,760 bytes | 25,000 |

## Documentation result

- Added public local-MCP setup, one-tool workflow, resource and security boundaries
- Synchronized navigation, page metadata, search index, concise LLM index and full LLM bundle
- Fixed exact-signature generation so `ChartProgram` constructor/state fields no longer leak into the `createCanvas` signature
- Exact action signatures: 173 / 173
- Local Jekyll build was not available: host Ruby 2.6.10 is below the locked Ruby 3.2+ requirement. Source/link/generated docs tests
  passed; no docs deployment was attempted.

## Verification

- `npm test` — 2,074 / 2,074 pass
- `npm run test:docs` — 45 / 45 pass
- `node scripts/package-consumer.js` — installed Node/TypeScript/renderers/MCP/browser checks pass
- `node scripts/package-artifact.js --check` — all three package ceilings pass
- `npm audit --omit=dev` — 0 production vulnerabilities
- Credential reads, external model calls and spend — 0 / 0 / $0

## 승인 효과

승인은 Phase 4 fresh development/validation/held-out corpus와 unpaid validation만 연다. Credential read, external model call,
비용 지출, PR/merge/publish/deploy/release는 승인하지 않는다.

## 승인 전 차단 범위

- Phase 4 evaluation corpus
- Credential read, external model call와 비용 지출
- PR, merge, package publish, docs deploy와 release

## Evidence identity

- Implementation review target: `bde05166e16fe08fca6fa3109d9761215ad44f92`
- Remote branch: `codex/roadmap5-4-compact-knowledge`

## Approval record

- 2026-08-08: 사용자가 R54-P3-A를 명시적으로 승인했다.
- 이 승인은 Phase 4 fresh corpus와 unpaid validation만 연다. Credential read, external model call과 비용 지출은 계속
  차단한다.
