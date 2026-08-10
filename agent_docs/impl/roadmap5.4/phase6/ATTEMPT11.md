# Attempt 11 — Complete Append-Only Terra/Luna/Nano Comparison

## 결론

Attempt 11은 Attempt 10의 214개 결과를 수정하거나 재실행하지 않고 남은 362개만 이어서 전체 576-cell matrix를 완성했다.
24 tasks × 2 repetitions × 3 models × 4 conditions가 각 cell 48개로 정확히 균형을 이루며, strict evaluator 통과는
387 / 576이다.

가장 큰 효과는 지식 전달 방식 자체였다. Public docs만 사용한 A는 19.4%였지만 direct compact packet B는 86.1%, local MCP C는
77.8%, explicit fallback D는 85.4%를 통과했다. 따라서 compact knowledge는 세 모델 모두에서 명확한 실용 효과가 있다. 다만
같은 packet을 direct adapter와 local MCP로 전달한 B/C 차이는 모델별로 일관되지 않았다. Terra에서는 B가 C보다 높았고, Luna와
Nano에서는 paired uncertainty가 커서 transport 자체의 보편적 우열로 일반화할 수 없다.

현재 제품 선택으로는 Luna가 가장 좋은 균형점이다. Luna의 B/C/D는 89.6–93.8%를 통과하면서 모델 전체 exposure가 `$0.52645`였다.
Nano는 훨씬 작은 모델에서도 D 77.1%까지 회복했지만 성공까지 걸린 중앙시간이 13.32초였다. Terra는 D 87.5%였지만 provider
failure reserve가 집중돼 전체 exposure가 `$8.08606`으로 커졌다.

## 불변 증거

| Evidence | Exact value |
| --- | --- |
| Authorization | R54-P6-C Option A |
| Product candidate | `4e211ba418cd437d7c66c4fb986fcc714cf579ea` |
| Evaluator checkpoint | `97029c53689e215a33376f724b41ee0734ca858d` |
| Plan SHA-256 | `fec1c8dce0b2adb89e8db7652d74cd59df95727545adcd1e4129c1b33b3df5a6` |
| Base plan SHA-256 | `48d8cdebf81bcefedef96148a20836c46fb483ddae8080aef46c013a20f3d950` |
| Continuation source SHA-256 | `1fea9ad184df9bb2f0a80cc714e26fba542232bd7856bf3b8ebd268dddcc2381` |
| Route oracle SHA-256 | `8211f33c5a443649def1f72de6f92d943a260f3df89795032d498f5c87819816` |
| Final checkpoint | [`IN_PROGRESS.json`](../../../../evaluation/compact-authoring-paid-comparison-v11/results/IN_PROGRESS.json) |
| Checkpoint SHA-256 | `f0c9697391422a3d8aeb4cf2fcd02ab37f2fa5027f8d4e78bdd85ab673827063` |
| Final result | [`RESULT.json`](../../../../evaluation/compact-authoring-paid-comparison-v11/results/RESULT.json) |
| Result SHA-256 | `8bd5227ef58da44e0bc57aee7ee4b5b7e53290337c25e862bb1a94a63955a465` |
| Original run | 2026-08-09 16:31:49Z–22:35:01Z |
| Continuation | 2026-08-09 22:48:01Z–2026-08-10 01:44:15Z |

`IN_PROGRESS.json`은 576번째 cell까지 기록한 마지막 append-only checkpoint이고 `activeTask`는 `null`이다. `RESULT.json`은 같은
ledger와 576 observations에 aggregate comparison만 더한 완성본이다.

## 전체 결과

| Condition | Knowledge route | Strict pass | Calls / cell | Tokens / cell | Exposure / cell | 성공 셀 중앙시간 |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| A | Public docs | 28 / 144 (19.4%) | 4.49 | 13,200 | 3.594¢ | 10.67s |
| B | Direct compact packet | 124 / 144 (86.1%) | 2.55 | 5,937 | 0.837¢ | 7.31s |
| C | Local MCP | 112 / 144 (77.8%) | 2.62 | 6,320 | 1.404¢ | 6.89s |
| D | MCP + explicit fallback | 123 / 144 (85.4%) | 2.63 | 6,052 | 0.859¢ | 7.92s |

Exposure는 conservative billed cost와 usage가 없는 provider failure reserve의 합이다. 따라서 일반적인 성공 요청의 실지출과
동일한 값으로 읽지 않는다. B/C/D는 A보다 calls, tokens와 exposure를 모두 줄이면서 strict pass를 크게 높였다.

## 모델 × 조건

| Model | A docs | B direct | C MCP | D MCP + fallback |
| --- | ---: | ---: | ---: | ---: |
| Terra | 10 / 48 (20.8%) | 44 / 48 (91.7%) | 38 / 48 (79.2%) | 42 / 48 (87.5%) |
| Luna | 9 / 48 (18.8%) | 45 / 48 (93.8%) | 43 / 48 (89.6%) | 44 / 48 (91.7%) |
| Nano | 9 / 48 (18.8%) | 35 / 48 (72.9%) | 31 / 48 (64.6%) | 37 / 48 (77.1%) |

| Model | 전체 strict pass | 전체 exposure | 성공 셀 중앙시간 |
| --- | ---: | ---: | ---: |
| Terra | 134 / 192 (69.8%) | `$8.08606194` | 6.03s |
| Luna | 141 / 192 (73.4%) | `$0.526447889` | 6.62s |
| Nano | 112 / 192 (58.3%) | `$1.026420208` | 12.57s |

Nano는 Luna보다 가격이 항상 낮은 모델이 아니었다. Cache-write discount가 없는 현재 accounting과 더 많은 output/reasoning tokens
때문에 192 cells의 exposure가 Luna의 약 1.95배였다. 모델 크기만으로 실제 작업 비용을 추정하면 안 된다는 결과다.

## Direct packet과 MCP 비교

B와 C는 같은 task/repetition을 짝지은 48 pairs/model이다.

| Model | C만 성공 | B만 성공 | 둘 다 성공 | 둘 다 실패 | Exact McNemar p |
| --- | ---: | ---: | ---: | ---: | ---: |
| Terra | 0 | 6 | 38 | 4 | 0.0313 |
| Luna | 1 | 3 | 42 | 2 | 0.6250 |
| Nano | 7 | 11 | 24 | 6 | 0.4807 |

Terra B/C 차이는 이 표본에서는 관측됐지만 C의 두 cells가 final provider failure로 끝났고 시간대 transport degradation도 섞여
있다. Luna/Nano 방향도 같지 않다. 따라서 현재 근거는 “local MCP가 packet의 큰 correctness 이득을 보존하지만 direct 전달과
완전히 동등하다고 확정할 수는 없다”까지다. MCP implementation을 열등하다고 단정하거나 threshold를 사후 수정하지 않는다.

D는 C보다 Terra +4, Luna +1, Nano +6 strict passes 높았다. 특히 Nano에서는 D만 성공 12쌍, C만 성공 6쌍으로 fallback의
방향성 있는 이득이 보이지만, 이 48-pair exploratory slice만으로 별도 유의성 결론을 만들지 않는다.

## Provider와 identity

| Metric | Result |
| --- | ---: |
| Billed model responses | 1,769 |
| API request attempts | 1,798 |
| Provider retries | 19 |
| Usage 없는 provider-error attempts | 29 |
| Final provider-failed task-runs | 10 |
| Model identity mismatch | 0 |
| Service-tier mismatch | 0 |

29 attempts는 HTTP 500 20회, timeout 3회, `fetch failed` 6회다. Final provider failures는 Terra 8 cells와 Luna 2 cells에
집중됐고 Nano에는 없었다. 그러나 run order와 시간대가 confounded되어 model-specific reliability로 일반화하지 않는다. 실패를
성공이나 evaluator failure로 재분류하지 않았고 원본 outcome을 그대로 aggregate에 포함했다.

## 사용량과 비용 경계

| Metric | Result |
| --- | ---: |
| Input / output / total tokens | 3,472,338 / 1,064,808 / 4,537,146 |
| Cached input / cache-write tokens | 1,068,343 / 817,581 |
| Reasoning tokens | 764,406 |
| Standard billed cost | `$6.22490767` |
| Conservative billed cost | `$6.847398437` |
| Uncertain reserve | `$2.7915316` |
| Final exposure | `$9.638930037` |

Gate C에서 예상한 cumulative exposure 약 `$14.79`보다 `$5.15` 낮았고 `$50` hard cap 안에서 끝났다. Uncertain reserve의 98.1%는
Terra에 귀속되므로 모델 비용 비교에는 billed cost와 exposure를 함께 봐야 한다.

## 무결성 검증

- Attempt 10의 첫 214 results는 source와 deep-equal이다.
- 576 IDs와 run positions는 v11 plan order와 정확히 일치하고 중복이 없다.
- 각 model-condition cell은 48개, 각 repetition은 288개다.
- Result sums와 ledger의 calls, attempts, retries, token usage와 세 cost fields가 정확히 일치한다.
- 1,769 billed identities에서 requested/returned model과 service tier mismatch는 0이다.
- Provider failure, reserve와 stopped-run provenance는 삭제하거나 다시 분류하지 않았다.

## 최종 판단과 한계

1. Compact knowledge는 public-doc browsing보다 성공률이 크게 높고 호출·토큰·비용을 줄였다.
2. Local MCP는 세 모델에서 compact knowledge 효과를 보존했다. 다만 direct packet과의 exact parity는 입증되지 않았다.
3. Explicit fallback은 특히 Nano의 capability floor를 64.6%에서 77.1%로 높이는 실용적 기본값 후보다.
4. Luna가 이 task set에서 correctness, latency와 exposure의 가장 좋은 균형점이다.
5. 결과는 고정된 24 tasks, 2 repetitions와 해당 provider 시간대에 한정된다. CI와 paired 결과를 보조 근거로 사용하고 작은 차이를
   순위의 확정으로 읽지 않는다.

추가 비용 실험 없이 Phase 6의 scientific comparison을 closeout한다. 이후 제품 정책을 바꾸려면 이번 결과를 수정하지 말고 별도
roadmap과 새 Gate에서 결정한다.
