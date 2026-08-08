# Phase 3 Step 1 — Ship One Read-Only Local MCP

## 진행 상태

- [ ] MCP SDK/runtime dependency를 production manifest에 고정
- [ ] Shared direct serializer 구현
- [ ] Local stdio server와 `ggaction-mcp` executable 구현
- [ ] Resource URI와 bounded read contract 구현
- [ ] Unresolved-only docs fallback routing 구현
- [ ] Focused direct/server/resource tests 구현
- [ ] Installed package consumer에서 실제 child process 검증
- [ ] Package and browser budgets 검증
- [ ] Public docs와 generated artifacts 갱신
- [ ] Cumulative tests와 Gate evidence 기록
- [ ] Review target commit/push
- [ ] R54-P3-A user approval

## 구현 흐름

1. `searchGgaction(query)`의 compact packet을 한 canonical serializer로 JSON 문자열화한다.
2. Direct adapter와 MCP `content[0].text`가 같은 serializer 결과를 그대로 반환하게 한다.
3. MCP tool list에는 `search_ggaction` 하나만 노출한다.
4. Resource list에는 작은 overview만, templates에는 action card, task recipe와 docs fallback route만 노출한다.
5. Docs route는 packet에 `unresolved`가 있을 때 router가 제안한 section만 읽는다.
6. 설치된 tarball에서 stdio client로 protocol handshake, tool call, resource read와 denial cases를 검증한다.
7. Phase 0 package ceiling과 existing browser bundle ceiling을 모두 측정한다.

## 차단 범위

- Hosted/HTTP MCP, account, authentication와 telemetry
- Chart execution/rendering, arbitrary file/network/code access
- Fresh evaluation corpus
- Credential read, external model call와 비용 지출
- PR, merge, package publish, docs deploy와 release
