# Roadmap 5.3 Phase 5 — Local Read-Only MCP

## 목표

기존 `ggaction` package에 local `stdio` executable `ggaction-mcp`를 추가한다. MCP는 Phase 2~4에서 만든 canonical
knowledge와 deterministic search만 읽으며 chart 실행, rendering, arbitrary file/network/code access를 제공하지 않는다.

## 진행 상태

- [x] R53-P4-A explicit approval and Phase 5 activation
- [x] Stable official MCP SDK and package boundary
- [x] Read-only resources and bounded search tool
- [x] Installed tarball and clean-consumer stdio evidence
- [x] Invalid-input and no-file/no-network/no-execution evidence
- [x] Browser/package import isolation and bundle regression evidence
- [x] Condition C local adapter mock/dry evidence
- [x] R53-P5-A remote review checkpoint
- [x] R53-P5-A explicit approval

## 고정 결과

- Existing package `bin`: `ggaction-mcp`
- Node-only MCP modules under `mcp/`; browser/chart entry points do not import them
- Packaged generated `knowledge/` used by both deterministic search and MCP
- Resources: `ggaction://overview`, `ggaction://actions/{name}`, `ggaction://recipes/{id}`,
  `ggaction://docs/{section}`
- Tool: `search_ggaction({ query, limit })`
- Official stable MCP SDK and schema validator as runtime dependencies

## 범위 경계

- Public chart API, declarations, action behavior, state와 renderer output을 바꾸지 않는다.
- MCP resource identifier와 tool input 외의 caller-controlled path/URL/code를 받지 않는다.
- HTTP/SSE/hosted transport, account, authentication, database, telemetry와 prompt/tool execution을 추가하지 않는다.
- External paid B/C evaluation, PR Ready/merge, publish/deploy/release는 별도 승인 없이는 진행하지 않는다.

## Gate

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.
