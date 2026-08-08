# Phase 4 Policy Acceptance — Unsupported Output Dual Signal

## 승인된 정책

2026-08-08 사용자가 다음 policy를 승인했다.

- Unsupported JPEG requirement는 `unsupported.jpg`로 명시한다.
- 같은 request에 SVG, PNG, PDF 또는 Browser Canvas가 없으면 `renderer.format`도 unresolved로 반환한다.
- Docs fallback은 `unsupported-capabilities`와 `choose-renderer`를 이 순서로 제공한다.
- 같은 request에 supported renderer가 이미 있으면 `renderer.format`을 추가하지 않는다.

## 사전 동결 설계

- Corpus ID: `compact-authoring-policy-v1`
- Root: `evaluation/compact-authoring-policy/`
- Development 1 / fresh validation 4 / fresh held-out 4
- Simple 5 / complex 4
- Required coverage: Canvas, scatter/line/bar, color encoding, PDF, geo/animation/3D/JPEG unsupported constraints
- Phase 2, original Phase 4, repair corpus와 normalized exact query overlap 0
- Roadmap 5.3 frozen corpus read/reuse 0
- 기존 Candidate 2 production behavior는 변경하지 않는다.

## 실행 순서

- [x] Policy corpus support와 source 작성
- [x] Structural counts, required coverage와 overlap 검사 — 9 tasks / 10 required constraints / overlap 0
- [x] Policy corpus SHA-256 freeze checkpoint commit/push — `4be0358b`
- [x] Approved policy stable resolver contract 추가
- [x] Development 1 / 1 strict pass와 result lock
- [x] Candidate 3 commit lock — `9206f0c3623c6f6676e70313811e7873ef97b405`
- [x] Fresh validation 4개 one-pass 실행 — 4 / 4 strict pass
- [x] Validation 통과 뒤 fresh held-out 4개 one-pass 실행 — 4 / 4 strict pass
- [x] Full tests, package, installed MCP와 browser ceilings 실행
- [x] 모든 unpaid checks 통과 시 exact paid-smoke proposal 작성
- [x] R54-P4-C review checkpoint commit/push — `caf066cc35e11e9e80377e0526b29c931dd66c58`
- [x] User approval — 2026-08-08

## Strict acceptance

- Exact constraints/action IDs/order/options/unresolved/fallback: 100%
- Silent partial, resolved fallback와 TypeScript errors: 0
- Packet maximum ≤ 6,144 bytes; split median ≤ 4,096 bytes
- Candidate lock 뒤 validation과 held-out은 각각 one-pass이며 결과 확인 뒤 tuning하지 않는다.
- Credential read, external model call와 spend는 R54-P4-C 승인 전까지 0 / 0 / $0다.

## One-pass 결과

| Split | Exact constraint | Exact plan | Exact unresolved | Exact fallback | 최대 / 중앙 packet bytes | 결과 |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Development | 1 / 1 | 1 / 1 | 1 / 1 | 1 / 1 | 397 / 397 | pass |
| Validation | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 855 / 811 | pass |
| Held-out | 4 / 4 | 4 / 4 | 4 / 4 | 4 / 4 | 1,009 / 977 | pass |

세 split 모두 silent partial, resolved fallback와 TypeScript error가 0이다. Validation과 held-out 결과를 본 뒤
resolver, corpus 또는 oracle을 수정하거나 재실행하지 않았다. Candidate/result identity와 paid smoke 제안은
[`GATE_C.md`](./GATE_C.md)가 소유한다.
