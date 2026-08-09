# Attempt 10 — Snapshot-Pinned Comparison Stopped by Provider Circuit Breaker

## 결론

Attempt 10은 valid complete comparison이 아니다. Snapshot-pinned v10 matrix 214 / 576 task-runs를 완료한 뒤 세 task-runs의
provider requests가 허용된 1회 retry까지 연속 실패해 circuit breaker가 정확히 발동했다. 추가 request, resume 또는 retry 없이
중단했다.

이번 실행은 Attempt 9의 identity 수리가 실제 provider에서 작동했음을 확인했다. 620 billed responses 모두 requested/returned
model과 service tier가 정확히 일치했고, Nano는 98 billed responses에서 pinned snapshot
`gpt-5.4-nano-2026-03-17`을 그대로 반환했다. 중단 원인은 model identity, MCP, knowledge packet 또는 strict evaluator가 아니라
시간상 한 구간에 몰린 provider transport failure다.

214 cells는 전체 matrix의 앞부분이므로 158 / 214 strict pass를 complete A/B/C/D/model comparison으로 일반화하지 않는다.

## 불변 증거

| Evidence | Exact value |
| --- | --- |
| Authorization | R54-P6-B Option A |
| Product candidate | `4e211ba418cd437d7c66c4fb986fcc714cf579ea` |
| Evaluator checkpoint | `cd65fd8e91481fafddfff90a2a432d32d9821022` |
| Plan SHA-256 | `48d8cdebf81bcefedef96148a20836c46fb483ddae8080aef46c013a20f3d950` |
| Route oracle SHA-256 | `8211f33c5a443649def1f72de6f92d943a260f3df89795032d498f5c87819816` |
| Progress | [`IN_PROGRESS.json`](../../../../evaluation/compact-authoring-paid-comparison-v10/results/IN_PROGRESS.json) |
| Progress SHA-256 | `1fea9ad184df9bb2f0a80cc714e26fba542232bd7856bf3b8ebd268dddcc2381` |
| Run time | 2026-08-09 16:31:49Z–22:35:01Z |
| Credential reads | 1 |
| Final result | 없음 — circuit breaker stop |

`IN_PROGRESS.json`은 byte-for-byte 보존한다. Bounded credential scans에서 API key, authorization value, credential path, raw prompt와
encrypted reasoning content가 없음을 확인했다.

## Exact stop outcome

| Metric | Result |
| --- | ---: |
| Completed task-runs | 214 / 576 |
| Strict pass among completed | 158 / 214 |
| Aborted run | `final3-09-gradient-svg:r2:gpt-5.6-terra:C` |
| Stop | provider-failed task-runs 3회 연속 |
| Billed model responses | 620 |
| API request attempts | 634 |
| Usage 없는 provider-error attempts | 14 |
| Provider retries | 8 |
| Input / output / total tokens | 1,148,971 / 323,329 / 1,472,300 |
| Cached input / cache-write tokens | 314,184 / 275,633 |
| Reasoning tokens | 220,722 |
| Standard billed cost | `$1.79378068` |
| Conservative billed cost | `$1.973158748` |
| Uncertain reserve | `$1.29602` |
| Final rolling exposure | `$3.269178748` |

## Identity repair validation

| Requested identity | Returned identity | Billed responses | Mismatch |
| --- | --- | ---: | ---: |
| `gpt-5.6-terra`, default | `gpt-5.6-terra`, default | 190 | 0 |
| `gpt-5.6-luna`, default | `gpt-5.6-luna`, default | 199 | 0 |
| `gpt-5.4-nano-2026-03-17`, default | same snapshot, default | 231 | 0 |

Model mismatch와 service-tier mismatch stop은 한 번도 발동하지 않았다. Attempt 9의 alias/snapshot ambiguity는 제거됐다.

## Provider failure anatomy

14 usage-less attempts는 8개의 initial provider failures와 그에 대응하는 8 retries 중 다시 실패한 6건이다. 두 retries는 회복했고
여섯 task-runs는 provider-failed outcome으로 남았다.

| Failure family | Attempts | Outcome |
| --- | ---: | --- |
| HTTP 500 `server_error` | 8 | 두 retries 회복, 세 task-runs는 retry까지 실패 |
| 180-second timeout abort | 1 | 마지막 연속 실패 구간의 첫 attempt |
| `fetch failed` transport error | 5 | 마지막 세 task-runs의 나머지 attempts |

마지막 정상 세 cells는 같은 gradient task의 Nano B/C/D였고, 다음 Terra A/B/C가 차례로 provider-failed가 되면서 circuit breaker가
발동했다. 세 cells가 모두 Terra인 사실만으로 Terra model failure를 주장할 수 없다. 12-cell run order가 해당 시간 구간에 Terra를
연속 배치했으므로 model identity와 temporal transport degradation이 완전히 confounded되어 있다.

앞선 HTTP 500도 모두 Terra cells에서 관측됐지만, Terra request가 더 오래 실행되는 경향과 시간대/provider 상태가 함께 섞여 있다.
Provider 내부 원인 정보가 없으므로 model-specific reliability 결론을 내리지 않는다.

## Scientific boundary

- Attempt 10은 identity repair와 bounded accounting의 valid external evidence다.
- 214 completed cells의 strict outcomes와 costs는 immutable observations이지만 complete pairwise comparison이 아니다.
- Provider-failed cells를 성공 또는 evaluator failure로 재분류하지 않는다.
- Attempt 9의 8 cells를 Attempt 10에 붙이지 않는다.
- R54-P6-B authorization은 중단으로 소진됐다.

## 권장 다음 경계

처음부터 576 cells를 다시 실행하면 이미 검증된 214 cells와 `$3.269178748` exposure를 버리게 된다. 권장안은 별도 append-only
continuation plan을 만드는 것이다.

1. Attempt 10 hash와 정확한 214 result IDs, 순서, ledger를 입력 checkpoint로 고정한다.
2. 결과를 수정하지 않고 run position 215부터 남은 362 cells만 실행한다.
3. Human-reviewed circuit reset으로 consecutive counter만 0에서 다시 시작한다.
4. 전체 retries, cost, uncertainty와 exposure는 Attempt 10 값을 그대로 carry forward한다.
5. 새 progress/result는 576 original cells와 provenance를 한 파일에 합치고 sensitivity analysis에서 provider failures를 별도 표시한다.
6. 새 plan, 무과금 resume-integrity tests와 replacement Gate 승인 전에는 credential을 다시 읽지 않는다.

## 공식 근거

- <https://developers.openai.com/api/docs/models/gpt-5.4-nano>
- <https://developers.openai.com/api/docs/pricing>
