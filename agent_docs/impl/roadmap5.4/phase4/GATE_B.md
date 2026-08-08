# Gate R54-P4-B — Repair Candidate and Unsupported-Renderer Policy

## Gate state

`failed`

## 결론

Candidate 2 `cf43c1f1b3c05bbdbc1711b880a0bd256af81358`는 알려진 request-order failure와 fresh validation 15개를
완전 통과했다. Fresh held-out에서는 constraint와 action plan이 15 / 15 정확했지만 `render JPEG`의 unresolved/fallback
정책 1건이 frozen oracle과 달라 strict acceptance에 실패했다. 결과 확인 뒤 production code, corpus, oracle 또는
threshold를 수정하거나 held-out을 재실행하지 않았다.

## 원인

Resolver는 `render JPEG`를 다음 두 요구로 처리한다.

1. `unsupported.jpg`: JPEG가 현재 renderer가 아님을 명시한다.
2. `renderer.format`: SVG, PNG, PDF 또는 Browser Canvas 중 하나를 선택하라고 요구한다.

따라서 docs fallback도 `unsupported-capabilities`와 `choose-renderer` 두 개다. Frozen oracle은 첫 번째만 기대했다. 이는
action 누락이나 silent partial이 아니라 unsupported output 뒤에 대안을 요구할지에 관한 정책 차이다.

## Repair corpus identity

| Evidence | Result |
| --- | --- |
| Corpus | `compact-authoring-repair-v1` |
| Tasks | 31: development 1 / validation 15 / held-out 15 |
| Strata | simple 14 / complex 17 |
| Constraint coverage | 79 / 79 |
| Phase 2 query overlap | 0 |
| Original Phase 4 query overlap | 0 |
| Frozen manifest SHA-256 | `506548b7a4e3b1cc214910d9fd18c5ffdf7d1cd0785a904dcbcfc62c2dafdda0` |
| Query-set SHA-256 | `70dd5e062cff6ccb0919b6d29e3aadd8e67296564338088f01a01383908d1b47` |

## One-pass result

| Metric | Development | Validation | Held-out | Requirement |
| --- | ---: | ---: | ---: | ---: |
| Tasks | 1 | 15 | 15 | fixed split |
| Exact constraints | 1 | 15 | 15 | 100% |
| Exact plans | 1 | 15 | 15 | 100% |
| Exact unresolved | 1 | 15 | 14 | 100% |
| Exact fallbacks | 1 | 15 | 14 | 100% |
| Silent partials | 0 | 0 | 0 | 0 |
| Resolved fallbacks | 0 | 0 | 0 | 0 |
| TypeScript errors | 0 | 0 | 0 | 0 |
| Maximum packet | 3,021 B | 2,709 B | 3,139 B | ≤ 6,144 B |
| Median packet | 3,021 B | 1,772 B | 2,541 B | ≤ 4,096 B |
| Result | pass | pass | **fail** | pass |

- Candidate-lock artifact SHA-256: `4e9289f645b6f60644e6d7289b27ab2bed546d439ea56942818747710d5c92d6`
- Development result SHA-256: `d518b2483a0947f84f524f9bde2875be7fe8e0bbabc1068c62c9650108acea51`
- Validation result SHA-256: `cc140a15ed2f897d8e985f94e5fd811fe0756d83a2eebc76e9f7d916b471b5c2`
- Held-out result SHA-256: `638161d2dbe369d9dde8b92a992773d51cc1c57c8de73ddeea265c0e45e775b7`
- Credential reads / external model calls / spend: 0 / 0 / $0

## Regression evidence

- `npm test` — 2,081 / 2,081 pass
- `node scripts/package-artifact.js --check` — 419 entries / 421,532 B packed / 2,161,357 B unpacked, all ceilings pass
- Original and repair freeze checks — pass
- Installed MCP/browser cumulative promotion은 strict held-out failure에서 중단했다. Candidate 2는 browser entry source나 import
  graph를 변경하지 않았다.

## 정책 선택

### A. Dual signal 유지 — 추천

현재 resolver를 유지한다. LLM은 JPEG가 불가능하다는 사실과 함께 지원 format을 다시 선택해야 한다는 다음 행동까지
받는다. 정보가 더 명확하고 docs fallback도 작고 bounded하다. Candidate 2 production behavior는 바꾸지 않고, 다음 fresh
evaluation oracle이 두 unresolved 항목을 명시적으로 기대하게 한다.

### B. Unsupported 하나로 축약

`unsupported.jpg`가 인식되면 generic `renderer.format`을 억제한다. Packet은 더 짧지만 사용 가능한 출력 형식을 다시
선택하라는 명시적 행동과 `choose-renderer` fallback이 사라진다. Compact resolver의 public behavior를 바꾸므로 새
implementation과 fresh evaluation이 필요하다.

## 현재 상태의 효과

이 failed Gate는 paid smoke, credential read, external model call, spend,
PR/merge/publish/deploy/release를 열지 않는다. 사용자가 정책 A 또는 B를 결정한 뒤에만 다음 fresh acceptance plan을
작성한다.

## Evidence identity

- Failed Gate review target: `d215c2b63283a22bcb80a153a6b8c0f85b57ecd2`
- Candidate 2: `cf43c1f1b3c05bbdbc1711b880a0bd256af81358`
- Remote branch: `codex/roadmap5-4-compact-knowledge`

## Policy decision

- 2026-08-08: 사용자가 정책 A, 즉 unsupported JPEG와 supported renderer 재선택 요구를 함께 반환하는 dual signal을
  승인했다.
- 이 승인은 current resolver policy와 작은 fresh unpaid policy acceptance만 연다. Paid call과 release 범위는 열지 않는다.
