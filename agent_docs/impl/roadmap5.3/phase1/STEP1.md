# STEP 1 — Build Stable LLM Routing Chunks

## 진행 상태

- [x] Current entry/full bundle and generator audit
- [x] Route names, source ownership and size budgets
- [ ] Canonical `docs/_sources/llms.txt` and generated concise entry
- [ ] English overview/action/recipe/detail routing pages
- [ ] Page manifest, metadata, search and full-bundle synchronization
- [ ] Source/output drift, link, fragment, duplicate and chunk-budget tests
- [ ] Built-site link, accessibility and browser smoke verification
- [ ] R53-P1-A Gate package commit/push

## 구현 순서

1. Existing `docs/llms.txt`를 `_sources`로 옮기고 generator가 route conversion과 output을 단방향으로 소유하게 한다.
2. Entry를 네 stable route와 full-bundle fallback으로 줄인다.
3. 네 page는 사용자의 task를 기준으로 기존 canonical tutorial/recipe/API/reference를 분류해 연결한다.
4. Page manifest가 navigation, full-bundle order와 search discovery를 함께 소유하게 한다.
5. Generator freshness와 built-site route를 검증하고 exact byte/line/link budget을 Gate evidence에 기록한다.

## Explicit non-goals

- 173개 action별 summary, use/avoid, parameter note 또는 example 작성
- Existing recipe를 structured knowledge source로 변환
- Search ranking/API, MCP, package file/bin/dependency 변경
- Public chart API, signature, action behavior 또는 renderer 변경
