# Attempt 8 — Provider-Resilient Terra/Luna Paid Comparison

## 결론

Attempt 8은 valid complete comparison이다. Exact v8 matrix 256 / 256 task-runs를 중단 없이 완료했고 200 / 256이 strict
evaluator를 통과했다. Compact knowledge conditions B/C/D는 public-doc baseline A보다 final pass, first-pass, calls, tokens, cost와
elapsed time에서 모두 큰 descriptive improvement를 보였다.

가장 신뢰도 높은 운영 결론은 다음과 같다.

1. Public docs만 탐색하게 하는 A는 ggaction authoring의 주 경로로 부족하다.
2. Compact direct B와 local MCP C는 결과 품질이 사실상 동등하고, C의 process/tool boundary 비용은 작고 측정 가능하다.
3. MCP-first + explicit bounded fallback D는 64 / 64로 가장 안정적이었다.
4. Terra와 Luna의 전체 final pass는 100 / 128로 같았다. Compact routes만 보면 Luna 95 / 96, Terra 93 / 96이다.
5. Luna는 이 run에서 Terra 대비 billed conservative cost가 91.45% 낮았고 median task latency는 유사했다.
6. 이 결과는 16 tasks × 2 repetitions의 descriptive evidence이며 statistical superiority를 주장하지 않는다.

## 불변 증거

| Evidence | Exact value |
| --- | --- |
| Result checkpoint | `0111681d68616d8da4fc08c28b5e72eafc331aed` |
| Historical result artifact | `evaluation/compact-authoring-paid-comparison-v8/results/RESULT.json` (not shipped in `main`) |
| Result SHA-256 | `3fbac9ac468f4e455207f90da9afad1e1716cf3b634a24566546573651f0e59a` |
| Final progress snapshot SHA-256 | `9498a7fca375e2644f3689d1b77664d6da9937105b3b76d8068a68a126354824` |
| Plan SHA-256 | `498cbbd01c3618cc5fc39cd57fe40a55c589a0f01f319e08fd1cfca19bd773a2` |
| Route oracle SHA-256 | `dc241f8b717ee2d80a81762e23e870a1fdf57215f15bd3a30e4292dc39dca6a1` |
| Product candidate | `4e211ba418cd437d7c66c4fb986fcc714cf579ea` |
| Evaluator checkpoint | `39d35cefe750c513703e99cb3e088fc7065c401c` |
| Run time | 2026-08-09 08:47:21Z–10:11:41Z, 5,060,572 ms |

256 unique run IDs, exact run positions 1–256, ledger sums와 comparison summaries를 raw task results에서 독립 재계산해 모두
일치함을 확인했다. Result에는 credential-like string, prompt, reasoning text 또는 encrypted reasoning content가 없다.

## 전체 실행 결과

| Metric | Result |
| --- | ---: |
| Task-runs | 256 / 256 |
| Final strict pass | 200 / 256, 78.125% |
| First-submission pass | 158 / 256, 61.719% |
| Correction으로 추가된 pass | 42 |
| Model calls | 734 |
| API request attempts | 743 |
| Provider retries | 7 |
| Successful/billed standard cost | `$3.27327688` |
| Successful/billed conservative cost | `$3.600604568` |
| Uncertain cost reserve | `$1.197163` |
| Final rolling exposure | `$4.797767568` |
| Approved hard cap 사용률 | 15.993% of `$30` |

Expected conservative projection `$11.15136`보다 billed cost와 exposure 모두 낮았다. Projection은 task-run마다 input 12,000,
output 4,000 tokens를 가정했지만 실제 matrix는 compact routes에서 더 적은 calls와 output을 사용했다.

## Knowledge route 결과

| Route | Final pass | First pass | Calls | Submissions | Total tokens | Billed conservative cost | Mean elapsed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A public docs | 12 / 64 | 6 / 64 | 290 | 162 | 701,558 | `$1.948273063` | 51,994 ms |
| B compact direct | 62 / 64 | 48 / 64 | 149 | 85 | 271,996 | `$0.57403412` | 9,696 ms |
| C local MCP | 62 / 64 | 52 / 64 | 144 | 80 | 262,022 | `$0.581085725` | 10,445 ms |
| D MCP + fallback | 64 / 64 | 52 / 64 | 151 | 79 | 278,700 | `$0.49721166` | 6,891 ms |

### A 대비 변화

| Route | Final pass | First pass | Calls | Submissions | Tokens | Billed cost | Total elapsed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| B | +78.125 pp | +65.625 pp | -48.62% | -47.53% | -61.23% | -70.54% | -81.35% |
| C | +78.125 pp | +71.875 pp | -50.34% | -50.62% | -62.65% | -70.17% | -79.91% |
| D | +81.250 pp | +71.875 pp | -47.93% | -51.23% | -60.27% | -74.48% | -86.75% |

A의 두 provider-failed cells가 elapsed와 exposure를 악화시켰지만 pass 결론은 그것에 의존하지 않는다. 그 두 cells가 모두
성공했다고 가정해도 A는 최대 14 / 64이고 B/C 62 / 64, D 64 / 64와 큰 차이가 남는다. Provider failure가 없었던 Luna에서도
A 5 / 32, B 31 / 32, C/D 32 / 32였다.

## Direct resolver와 local MCP

B와 C는 aggregate final pass가 62 / 64로 같았다. 모델별 paired result에서는 Terra가 B 31, C 30이고 Luna가 B 31, C 32여서
한 방향의 quality superiority는 관측되지 않았다.

| C minus B | Result |
| --- | ---: |
| Final pass | 0 pp |
| First pass | +6.25 pp |
| Model calls | -3.36% |
| Total tokens | -3.67% |
| Billed cost | +1.23% |
| Total elapsed | +7.72% |
| Median task elapsed | +63.64 ms |
| Mean local knowledge-tool latency | +189.63 ms |

Local MCP process boundary는 평균 약 190 ms를 더했지만 end-to-end median 차이는 약 64 ms였다. Model inference와 correction
variance가 더 큰 비용이었다. C에는 transient provider retry 한 건이 포함되어 total elapsed와 exposure를 조금 높였다.

따라서 local MCP는 direct resolver보다 의미적으로 더 좋은 packet을 만든다고 해석할 수 없다. 대신 같은 compact knowledge를
표준 tool boundary로 제공하면서 작은 local overhead만 부담하는 배포 선택지로 볼 수 있다.

## Bounded fallback D

D는 모든 model/task/repetition에서 64 / 64를 통과했고 exact failure count가 0이다. Needs-input 두 tasks에만 model×repetition
기준 총 8회의 bounded fallback read를 수행했다. C와 비교하면 first-pass는 같고 final pass가 2개 많았다.

D가 C보다 이 run에서 더 빠르고 저렴했지만, 같은 compact packet과 작은 표본에서 발생한 model variance가 포함되므로 이를
fallback 자체의 속도·가격 우위로 일반화하지 않는다. 신뢰도 측면에서는 D가 가장 좋은 descriptive result다.

## Terra와 Luna

| Model | Final pass | First pass | Compact B/C/D | Calls | Total tokens | Billed conservative cost | Mean / median elapsed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Terra | 100 / 128 | 80 / 128 | 93 / 96 | 360 | 736,202 | `$3.31709554` | 28,673 / 6,465 ms |
| Luna | 100 / 128 | 78 / 128 | 95 / 96 | 374 | 778,074 | `$0.283509028` | 10,840 / 6,367 ms |

Luna는 Terra보다 calls 3.89%, total tokens 5.69%를 더 사용했지만 reasoning tokens는 47.17% 적었고 billed cost는 91.45%
낮았다. Final pass는 같고 first-pass는 Terra가 1.5625 pp 높았다. Median latency 차이는 Luna가 1.52% 빠른 정도였지만 total
elapsed는 Luna가 62.19% 짧았다.

Total elapsed 차이는 Terra에서 발생한 9 failed API attempts와 긴 tail requests의 영향을 크게 받는다. 그러므로 Luna가 모든
환경에서 62% 빠르다고 일반화하지 않는다. 이 run의 비용·품질 관점에서는 Luna가 반복 benchmark와 기본 LLM authoring
candidate로 더 효율적이다.

## Provider resilience 실제 결과

- Usage를 받지 못한 failed API attempts: 9
- 승인된 provider retries: 7
- Retry에서 회복한 requests: 5
- Retry까지 실패해 task-local failure가 된 cells: 2
- Provider-failed task-runs 3연속: 0
- Circuit breaker, retry cap, cost cap 또는 integrity stop 발동: 0

두 exhausted cells는 `final3-02-line-pdf:r2:gpt-5.6-terra:A`와
`final3-03-bars-png:r1:gpt-5.6-terra:A`다. 각각 첫 실패와 retry의 uncertainty reserve를 모두 보존했다. 이후 정상 cells가
성공해 consecutive counter가 리셋됐고 전체 matrix가 완주했다. Attempt 7을 중단시킨 근본 상태 경계가 실제 API에서도
수리됐음을 확인했다.

## 남은 실패와 해석 한계

A의 52 failed task-runs에는 invented/nonexistent APIs, malformed action chains, output-budget exhaustion, status/unsupported/unresolved
mismatch와 두 provider failures가 넓게 분포했다. 이는 public docs search/read만으로 package-specific authoring contract를 안정적으로
복구하지 못한다는 증거다.

B/C의 네 failed results는 모두 `final3-18-raw-bars-canvas`에 집중됐다.

- Terra B/C: row-preserving bar encoding error와 두 건의 output-budget exhaustion
- Luna B: 끝까지 primitive action plan 대신 aggregate `createBarPlot` 계열 plan을 제출
- D는 같은 task 4 / 4 성공

따라서 compact knowledge 전반의 coverage failure보다는 raw row-preserving bar task의 잔여 model variance 또는 recipe ambiguity로
본다. 이 결과 뒤 candidate나 evaluator를 수정해 Attempt 8을 성공으로 재분류하지 않는다. 개선한다면 별도 candidate와 별도
targeted unpaid/paid evidence가 필요하다.

두 repetitions는 variance를 확인하는 최소 표본이다. A pass agreement는 모델별 81.25%, B는 93.75%, Terra/Luna C와 D는
대부분 100%였다. 이 데이터는 integration decision에는 충분히 강한 descriptive evidence지만 statistical superiority나 모든 미래
task distribution의 성능을 보장하지 않는다.

## 추천

Recommended next decision은 현재 compact knowledge candidate를 integration 대상으로 채택하고, local MCP + bounded fallback D를
LLM authoring의 권장 경로로 문서화하는 것이다. Luna를 반복 benchmark의 기본 모델로 사용하고 Terra는 frontier comparison cell로
유지한다. Raw row-preserving bars는 integration을 막는 blocker로 보지 말고 별도 후속 recipe audit 대상으로 남긴다.

PR Ready, merge, publish, deploy와 release는 이 Attempt가 승인하지 않는다.
