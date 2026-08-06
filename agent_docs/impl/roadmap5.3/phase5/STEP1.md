# STEP 1 — Add the Installed-Package MCP Boundary

## 진행 상태

- [ ] Pin the current stable official MCP SDK and required validator
- [ ] Extract package-safe deterministic knowledge search/read ownership
- [ ] Register the four bounded resource routes and one search tool
- [ ] Add the `ggaction-mcp` stdio executable and publish files
- [ ] Update package-boundary architecture and focused contracts

## 실행 순서

1. Stable official SDK의 `McpServer`, `ResourceTemplate`, `StdioServerTransport` API와 Node requirement를 확인한다.
2. Phase 4 search/read를 fixed package-local generated files만 읽는 Node-only module로 옮기고 기존 script API를 유지한다.
3. Static overview와 action/recipe/docs template resources를 등록한다. Unknown identifier는 bounded error로 실패한다.
4. `search_ggaction`은 Phase 4와 같은 query/limit validation, ranking, tie-break와 bounded result를 그대로 사용한다.
5. Package `files`, `bin`과 runtime dependencies에 MCP/knowledge만 추가한다. Root/basic/extension/svg/png/pdf exports는 유지한다.
6. `SECOND_ARCHITECTURE.md`에 일곱 번째 Node-only executable boundary와 금지 import 방향을 기록한다.

## 완료 기준

- Repository와 installed tarball에서 같은 resource/tool result를 반환한다.
- Stdout에는 MCP JSON-RPC만 쓰고 diagnostics는 stderr로 제한한다.
- MCP가 받는 public input으로 filesystem path, URL, source code 또는 chart program을 지정할 수 없다.
- Existing chart/browser entry import graph에 knowledge 또는 MCP SDK가 없다.
