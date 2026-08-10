# Roadmap 5.4 Phase 0 — Baseline and Failure Boundary

## Product baseline

| 항목 | 값 |
| --- | --- |
| Product branch | `main` |
| Exact commit | `9414d07179c9e7c6bbfdf00b762fc35de0ff25ec` |
| Package | `ggaction@0.0.8` |
| Public action inventory | 173 |
| MCP executable | 없음 |
| Knowledge files in package | 없음 |
| Runtime dependencies | `@napi-rs/canvas` only |
| Package artifact | 412 entries / 386,876 packed / 1,827,671 unpacked bytes |

Roadmap 5.4 branch는 exact product baseline에서 만들었다. Roadmap 5.3 source, package, docs, dependency 또는 generated
knowledge를 복사하지 않았다.

## Roadmap 5.3 observed result

Roadmap 5.3 evidence는 별도 branch와 closeout commit
`23212bf5d4dcdca1e842de889c8258ac662c7945`에 보존한다.

| 항목 | A — docs | C — local MCP |
| --- | ---: | ---: |
| Final valid | 25 / 34 | 32 / 34 |
| First valid | 19 / 34 | 26 / 34 |
| Model calls | 156 | 127 |
| Repair rounds | 27 | 11 |
| Total tokens, all runs | 389,610 | 471,402 |
| Estimated cost | `$0.8314339` | `$0.9151006` |

Jointly successful task-level comparison은 tokens 89.5% 증가, model calls 12.5% 감소와 time-to-valid 10.9% 감소였다.
B direct와 C MCP는 같은 correctness와 실패를 보였고 transport-isolated token/call 차이는 사실상 0이었다. 원인은 MCP
protocol이 아니라 oversized default payload, top-one bag-of-words routing, incomplete multi-intent closure와 repeated
lookup context accumulation이었다.

Failed candidate package는 417 entries / 530,492 packed / 3,607,659 unpacked bytes였다. Product baseline보다 packed
약 37%, unpacked 약 97% 증가했다.

## Scientific isolation

- Roadmap 5.3의 17 tasks, exact prompts, aliases와 failure outputs는 frozen historical evidence다.
- Roadmap 5.4 production cards, intent taxonomy, resolver와 prompt를 그 corpus에 맞춰 수정하지 않는다.
- Development, validation과 final held-out corpus는 새 dataset/task identities와 hashes를 사용한다.
- 최종 held-out prompt와 oracle은 결과 확인 전 고정하고 development/validation 결과와 섞지 않는다.
- Old result는 design class를 설명하는 근거로만 사용하며 새 acceptance 통계에 포함하지 않는다.

## Phase 0 mutation boundary

현재 변경은 roadmap/history/navigation 문서뿐이다. Credential read, external model call, dependency install, source,
package, generated docs와 public API 변경은 모두 0이다.
