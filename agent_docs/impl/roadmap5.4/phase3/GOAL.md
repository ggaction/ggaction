# Roadmap 5.4 Phase 3 — Local MCP and Bounded Fallback

## 목표

Phase 2의 deterministic task packet을 설치된 npm package의 local stdio MCP에서도 동일한 bytes로 제공한다. MCP는
하나의 read-only search tool과 bounded knowledge resources만 제공하며 chart 실행, 임의 file/network/code access는 하지
않는다. Public docs는 MCP-first 사용법과 `unresolved`가 남았을 때만 읽는 fallback 경로를 설명한다.

## 진행 상태

- [x] Direct adapter와 MCP tool result의 byte equality
- [x] 정확히 한 개의 model-visible tool `search_ggaction({ query })`
- [x] Overview, action card, task recipe와 bounded docs resources
- [x] Resolved packet에는 docs fallback 0, unresolved packet에만 bounded fallback
- [x] Installed package에서 stdio initialize/list/call/read 검증
- [x] Chart execution, arbitrary file/network/code access와 telemetry 없음
- [x] Browser entry dependency graph에 MCP/Node knowledge module 없음
- [x] Phase 0 same-package ceiling 충족
- [x] Public docs, generated LLM routes와 exact signature artifact 동기화
- [ ] R54-P3-A explicit approval

## Hard budgets

- Tools: exactly 1
- Task packet: maximum 6,144 UTF-8 bytes
- Package: entries ≤ 430, packed ≤ 450,000 bytes, unpacked ≤ 2,400,000 bytes
- Docs resource: one bounded section per read; complete docs bundle preload 금지

## Gate R54-P3-A

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다. 승인 전에는 Phase 4 fresh corpus, credential read,
external model call과 비용 지출을 시작하지 않는다.
