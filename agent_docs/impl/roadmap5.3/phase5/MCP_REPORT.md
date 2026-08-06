# Phase 5 Local MCP Distribution Report

## 결론

기존 `ggaction@0.0.8` package가 local read-only `ggaction-mcp` executable을 제공한다. MCP host가 이 process를 spawn해
stdin/stdout JSON-RPC로 연결하므로 별도 hosted server, account, authentication 또는 database가 필요 없다. Chart API,
state, action behavior와 renderer output은 바뀌지 않았다.

## SDK와 package boundary

| 항목 | 결과 |
| --- | --- |
| Official SDK | `@modelcontextprotocol/sdk@1.30.0` exact runtime dependency |
| Schema validator | `zod@4.4.3` exact runtime dependency |
| Node contract | package `>=20`; SDK `>=18` requirement 충족 |
| Transport | local `StdioServerTransport` only |
| Package bin | `ggaction-mcp` → `bin/ggaction-mcp.js`, mode `0755` |
| Package knowledge | generated `knowledge/index.json`, `knowledge/search-index.json` only |
| Importable export change | 없음; 기존 six-entry export map 유지 |

Stable SDK 선택은 2026-08-06 official npm `latest`인 1.30.0과 official v1 server guide의
`McpServer`/`StdioServerTransport` local integration을 기준으로 했다. 2.x pre-release package split은 stable dependency로
채택하지 않았다.

- <https://www.npmjs.com/package/@modelcontextprotocol/sdk>
- <https://ts.sdk.modelcontextprotocol.io/server>

## Protocol surface

| Kind | Identity | 결과 |
| --- | --- | --- |
| Static resource | `ggaction://overview` | Workflow, resource routes, counts와 search limits |
| Resource template | `ggaction://actions/{name}` | Exact generated action knowledge |
| Resource template | `ggaction://recipes/{id}` | Exact generated task recipe |
| Resource template | `ggaction://docs/{section}` | `overview`, `actions`, `recipes`, `docs` bounded section |
| Tool | `search_ggaction({ query, limit })` | Phase 4 deterministic ranking, default 6 / maximum 10 |

Official client의 list 결과는 static resource 1개, templates 3개, tool 1개뿐이다. Search annotation은 read-only,
non-destructive, idempotent, closed-world로 선언하며 strict input schema가 unknown properties를 거부한다.

## Installed tarball evidence

Final Gate candidate를 새 temporary npm cache와 빈 consumer에 실제 설치하고 installed `.bin/ggaction-mcp`에 official
`StdioClientTransport`로 연결했다.

| 항목 | 결과 |
| --- | ---: |
| Package entries | 417 |
| Packed / unpacked | 478,664 / 3,115,694 bytes |
| Artifact SHA-256 | `058862d81153db53e27cb49152ed7aea7a039412d584beac384cdf9666a077dd` |
| Executable mode | `0755` |
| Packaged knowledge counts | actions 173 / recipes 33 / docs 4 |
| Exact reads | `createScatterPlot`, `scatterplot`, `overview` passed |
| Representative search | `scatterplot`, `regression-scatterplot`, `createScatterPlot` |
| Server stderr | empty |

Repository bin과 installed bin에서 initialize/list/templates/read/call을 모두 수행했다. Stdout은 SDK protocol framing에만
사용하고 startup failure는 stderr로 보낸다.

## Read-only and bounded negative evidence

- Blank/oversized query, invalid limit, extra `path`, `url`, `source` keys를 tool-level error로 거부한다.
- Malformed traversal-like ID와 unknown action/resource를 실패시킨다.
- Public MCP input은 query, limit와 template identifier뿐이며 caller-controlled filesystem path, URL, source code와 chart
  program을 받지 않는다.
- MCP source는 fixed package-local two-file reads만 사용한다.
- MCP tree에는 HTTP import/fetch, dynamic import/eval/Function, chart source import와 Canvas/SVG/PNG/PDF rendering call이 없다.
- Registered tool은 `search_ggaction` 하나이며 write, execution, prompt, sampling과 hosted transport가 없다.

## Browser and package isolation

Installed production Vite bundle의 module graph를 검사해 `mcp/`, `knowledge/`, `@modelcontextprotocol/sdk`와 `zod`가
root/basic/svg bundle에 들어오지 않음을 확인했다. 숫자는 Roadmap 5.2 closeout baseline과 동일하다.

| Entry | Modules | Gzip | Ceiling | Forbidden MCP modules |
| --- | ---: | ---: | ---: | ---: |
| `ggaction` | 373 | 222,930 | 225,000 | 0 |
| `ggaction/basic` | 210 | 112,984 | 120,000 | 0 |
| `ggaction/svg` | 13 | 5,760 | 25,000 | 0 |

Source-boundary contract도 모든 `src/` chart/renderer module에서 MCP SDK, `zod`, `mcp/`와 `knowledge/` import를 금지한다.
Node PNG/PDF는 기존 adapter path와 package consumer matrix를 그대로 통과했다.

## Condition C local harness evidence

- Synthetic dry run: A/B/C 24 tasks씩, 총 72/72 passed; external model/API call 0, spend $0.00.
- Mocked executable C flow: MCP overview read → search → action resource read → valid chart submit.
- Result: final valid, model calls 2, MCP calls 3, repair 0, actual Canvas artifact 1개.
- Condition C는 B와 같은 `search_ggaction`/`read_ggaction` model surface를 사용하지만 handler가 local MCP process의 tool/resource를
  실제 호출한다. Task, model envelope, token/call/time budget, evaluator와 oracle은 shared runner를 유지한다.

## Cumulative verification

- `npm run knowledge:check`: generated knowledge/search drift 없음
- `npm test`: passed
- `npm run test:coverage`: passed
- `npm run test:contracts`: 208/208 passed
- `npm run test:docs`: 45/45 passed
- `npm run package:check`: final bounded artifact passed
- `npm run package:mcp-check`: clean install and official stdio client passed
- `npm run test:package`: Node, TypeScript, Canvas/SVG/PNG/PDF, tutorial and all three browser bundles passed
- `git diff --check`: passed

실제 B/C 유료 LLM comparison은 실행하지 않았다. R53-P5-A 승인 뒤 Phase 6에서 exact model/repetition/cost proposal을 먼저
검토받는다.
