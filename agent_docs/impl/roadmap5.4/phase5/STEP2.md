# Phase 5 Step 2 — Repair Knowledge and Evaluation Boundaries

## 진행 상태

- [x] R54-P5-E Option A user approval — 2026-08-09
- [x] Authoring prerequisite closure contract
- [x] Terminal `unsupported` / open `unresolved` schema v3 contract
- [x] Direct/local-MCP byte-equal schema v3 delivery
- [x] Public LLM docs bootstrap and canonical capability identities
- [x] Versioned v4 route oracle and terminal/open route mocks
- [x] Fixed-task regression and fresh-query closure
- [x] Package, browser, docs, contract and full repository validation
- [ ] Exact v4 candidate/plan/cost freeze
- [ ] R54-P5-F paid authorization Gate preparation

## 구현 순서

1. Existing schema v2와 v3 decision semantics를 테스트로 먼저 분리한다. v3는 general `createCanvas`/`createData`
   prerequisite를 제공하지만 evaluator-specific function wrapper나 fixed dimensions를 포함하지 않는다.
2. Resolver와 schema owner를 함께 바꾸고 generated knowledge를 재생성한다.
3. Direct adapter와 installed local MCP가 complete packet을 byte-equal하게 전달하는지 검증한다.
4. Public LLM docs와 search index를 general family route로 갱신하고 exact bootstrap/identity closure를 검증한다.
5. v3 paid result를 수정하지 않고 별도 v4 route oracle에서 terminal unsupported와 documentation-needed unresolved를
   구분한다.
6. 무비용 acceptance를 모두 통과한 동일 candidate와 source hashes로 v4 plan과 R54-P5-F를 준비한다.

## 차단 범위

- Credential read, external model call과 additional spend
- v3 plan/result/progress overwrite, resume 또는 retry
- R54-P5-F 승인 전 v4 paid smoke
- Complete evaluation, PR, merge, publish, deploy와 release
