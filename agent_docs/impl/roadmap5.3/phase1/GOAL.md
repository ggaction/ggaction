# Roadmap 5.3 Phase 1 — LLM-Readable Documentation Routing

## 목표

LLM이 476 KB full bundle이나 전체 사이트를 먼저 읽지 않고, 작은 entry에서 overview, action family, task recipe와
상세 문서 중 필요한 route로 좁혀 가게 한다. 이 Phase는 기존 public documentation을 가리키는 routing layer만 만들며
새 action 설명이나 recipe knowledge를 소유하지 않는다.

## 진행 상태

- [x] R53-P0-B explicit approval and remote checkpoint
- [x] Existing `llms.txt`, full bundle, page manifest와 search route 조사
- [x] Phase 1 route/chunk/source boundary 결정
- [x] Stable English overview/action/recipe/detail route 구현
- [x] Generated entry, link/size/drift guard와 built-site 검증
- [x] R53-P1-A remote review checkpoint

## 고정 경계

- `docs/_sources/llms.txt`가 concise entry source를 소유하고 `docs/llms.txt`는 generated output이다.
- Stable route는 `/llms/`, `/llms/actions/`, `/llms/recipes/`, `/llms/docs/` 네 개다.
- `docs/llms.txt`는 4 KiB 이하이며 위 네 route와 optional `llms-full.txt`만 직접 가리킨다.
- 각 routing page는 sanitized text 12 KiB 이하, 120 lines 이하, unique local targets 40개 이하다.
- Routing page는 exact signature/default/behavior를 복사하지 않고 canonical public page로 연결한다.
- `llms-full.txt`는 page manifest canonical order에서 계속 생성한다.
- Public action metadata와 machine-readable recipes는 R53-P1-A 승인 전 작성하지 않는다.

## Gate

Canonical review record는 [`GATE_A.md`](./GATE_A.md)가 소유한다.
