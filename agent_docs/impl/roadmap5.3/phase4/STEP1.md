# STEP 1 — Build Deterministic Knowledge Retrieval

## 진행 상태

- [x] Inventory action/recipe/LLM-route fields and representative task queries
- [x] Freeze normalized record and bounded result schemas
- [x] Generate complete stable-sorted search index from canonical knowledge
- [x] Implement exact read and weighted lexical search without runtime dependencies
- [x] Validate malformed input, limits, hash drift, zero-gap indexing and repeated identity
- [x] Measure 24-task retrieval evidence and review low-ranked intents

## 실행 순서

1. 173 actions, 33 recipes와 four bounded LLM route records가 어떤 검색어를 제공하는지 inventory한다.
2. Query normalization, camelCase/ID tokenization, field weights, tie-break와 response shape를 test에서 고정한다.
3. Generator가 source hash, record count와 stable records를 `knowledge/search-index.json`에 쓴다.
4. Search는 전체 record를 반환하지 않고 ID, kind, title, summary, route, score와 matched terms만 제한해 반환한다.
5. Exact read는 action/recipe/route의 validated identifier만 허용하고 combined knowledge의 canonical record를 반환한다.
6. Evaluation corpus의 24개 실제 prompt와 focused repair query로 intended action/recipe가 bounded top-k에 들어오는지 측정한다.

## 완료 기준

- 173 actions, 33 recipes와 bounded LLM routes가 missing/duplicate 없이 정확히 한 번 indexed된다.
- 같은 query를 반복하거나 새 loader instance에서 실행해도 result가 deep/byte-equal하다.
- Limit 1~10, maximum query characters/tokens와 fixed result fields가 강제된다.
- Unknown read ID, blank/oversized query, invalid limit와 stale generated index가 실패한다.
- Browser entry와 package public surface에 knowledge/search import가 생기지 않는다.

Exact 구현 결과와 representative ranking은 [`RETRIEVAL_REPORT.md`](./RETRIEVAL_REPORT.md)가 소유한다.
