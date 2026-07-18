# STEP 2 — Facet Source and Value Resolution

## 진행 상태

- [x] Direct-source eligibility reference
- [x] Deterministic first-appearance value order
- [x] Empty value rejection fixture
- [x] Opaque child identity reference

Production resolver와 독립인 test oracle로 source rows와 facet values를 확정한다. Raw facet value는 header
display에만 쓰고 generated dataset, child와 graphic ID에는 넣지 않는다.

Gate fixture는 Cars source의 `USA`, `Europe`, `Japan` order와 scatter/histogram별 valid row count를 literal
assertion으로 고정한다. Multiple/ambiguous production dependency rejection은 STEP 7 preflight에서 추가한다.
