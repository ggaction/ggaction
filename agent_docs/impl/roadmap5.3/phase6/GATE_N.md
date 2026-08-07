# Gate R53-P6-N — Task-Closed Recipe Paid Retry

## Gate state

`approved — guard checkpoint ready, paid execution pending`

Proposal checkpoint: `c4ccc5b5`

Candidate behavior checkpoint: `622286f9501bd76b89e0a4e8a694c5f3b603f098`

Gate M evidence checkpoint: `660cfa49`

Guard checkpoint: `a298c4a1`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

Approved by the user on 2026-08-07 with a combined `$0.60` hard cap.

Task-closed smoke plan SHA-256: `0fbbb6022b26fb0f55c204c82585786ce1cb5ce80fd3c41f50f9108569f7be13`

## 한눈에 보는 제안

Gate K에서 실패했던 같은 세 frozen task를 task-closed recipe candidate로 한 번씩만 재시도한다. Condition B 세 건이 모두
first-pass/final valid인 경우에만 Condition C 세 건을 실행한다.

```text
B: box plot → composition → renderer parity
  → all three first-pass and final valid?
      no  → stop, seal evidence, C 0 runs
      yes → C: same tasks, same order
              → seal evidence and stop for review
```

이 Gate는 최대 6개 paid smoke run만 승인 대상으로 제안한다. Frozen 24-task full rerun, benefit claim, PR, merge, publish와
release는 포함하지 않는다.

## 왜 같은 세 task를 재시도하는가

| Task | Gate K 결과 | 이번 candidate에서 확인할 correction |
| --- | --- | --- |
| `cars-box-plot` | unsupported `createBoxPlot({ color })` | post-facade `encodeColor`, Tukey/outlier, redundant legend 제거 |
| `composed-dashboard` | nonexistent `createRoseChart` | composition + rose dependency parallel read, primitive rose flow, slot replacement |
| `renderer-parity` | B first-pass/final valid | 기존 성공 surface가 knowledge correction 뒤에도 유지되는지 확인 |

이 scope는 새 task를 추가하지 않고 이전 실패를 같은 oracle로 직접 재검증한다. 결과 비교에서 task, dataset, prompt,
validation과 renderer 요구사항은 Gate K와 동일하다.

## Exact scope

| 항목 | 고정값 |
| --- | --- |
| Tasks | `cars-box-plot`, `composed-dashboard`, `renderer-parity` |
| Repetition | 각 task `r1` only |
| Conditions | B 3건, 세 건 모두 통과한 경우에만 C 3건 |
| Deterministic order | 위 task 순서, B 전체 뒤 C 전체 |
| Maximum evaluation runs | 6 |
| Maximum model calls | 18, run당 최대 3 |
| Candidate metadata | `622286f9501bd76b89e0a4e8a694c5f3b603f098` |
| New isolated output root | `.artifacts/llm-eval/task-closed-smoke-622286f9/` |

Frozen input digests:

- Evaluation plan: `c30b33a7d3b2f5118a8d8b8818023339a1f01f6170fba62edaf7ed8feefc1671`
- Corpus: `1a87b9b9cbbcd382aef6f82c94bf2080b545425be5d366a95b29cb3b1c942ad1`
- Generated knowledge: `9dc09e3faabed04eb36aaa6121072d9860e027e680b6d13d7bdd854f1684a9df`
- Knowledge search index: `2aa288d2c805a02d3c9f675fc5e8a8f7bbe203dff8af7f5b72ddae45cab352d4`
- Public recipe document: `221a4bda37bd960800068f289051969855045c9bbe30b549cec995b027ae1cb3`
- Delivered closure manifest: `78f8a430ec1bd179a5e7134fb6e278f4b4954ff51ca97d3130dd703885d7d17e`

Gate G/H/K의 plan, candidate hash와 evidence root는 수정하거나 재사용하지 않는다. Gate N 승인 뒤 별도의 immutable plan과
runner guard를 추가한다.

## Model과 평가 설정

Phase 0과 Gate K의 비교 조건을 그대로 유지한다.

- Responses API, exact model `gpt-5.6-terra`
- Reasoning effort `medium`, standard reasoning mode
- Text verbosity `low`, service tier `default`, `store: false`, `tool_choice: "auto"`
- Fast mode, Regional processing과 built-in paid tools 사용 금지
- Run당 model call 최대 3회, C run당 MCP knowledge call 최대 8회
- Run당 timeout 180초
- Call당 output 최대 5,000 tokens
- Run당 cumulative input/output ceiling 24,000 / 8,000 tokens
- Frozen task, dataset, oracle, prompt, score와 validation threshold 변경 금지

Standard short-context 가격은 1M tokens당 input $2.00, cached input $0.20, cache write $2.50, output $12.00을 사용한다.
이번 request ceiling은 long-context threshold보다 낮다.

## 비용 승인 요청

Gate K actual은 세 B run 합계 `$0.0534576`였고 run당 `$0.0145~$0.0240`이었다. 같은 task/model/settings를 재사용하므로
run당 `$0.025`, 최대 6회 `$0.15`를 expected cost로 둔다.

| 범위 | Expected | Hard cap |
| --- | ---: | ---: |
| Condition B, 최대 3 runs | $0.075 | $0.30 |
| Condition C, 최대 3 runs | $0.075 | $0.30 |
| Combined | **$0.15** | **$0.60** |

승인 요청은 combined **$0.60 hard cap**이다. Runner는 다음 request의 보수적 maximum이 condition 또는 combined 잔액을
넘으면 새 request를 시작하지 않고 `budget-exceeded`로 중단한다.

## 승인 뒤 먼저 만들 무과금 guard

1. Candidate, task order, B→C 조건, frozen hashes, 새 output root와 cap을 별도 plan으로 고정한다.
2. Plan이 approved가 아니면 credential read 전에 거부한다.
3. Output root가 이미 존재하거나 비어 있지 않으면 credential read 전에 거부한다.
4. Historical Gate G/H/K plan hash를 변경하지 않았다는 contract를 고정한다.
5. B 세 건은 deterministic order로 실행하고 provider/model/hash/cap/timeout 오류에서 즉시 전체를 중단한다.
6. B 하나라도 first-pass 또는 final invalid이면 B evidence만 봉인하고 C는 실행하지 않는다.
7. B 세 건이 모두 통과할 때만 C 세 건을 같은 순서로 실행한다.
8. Box one-read와 composition two-read-in-one-response 계약, call/read ceiling과 sanitized trace를 매 run 확인한다.
9. Mocked stop/budget/sequence guard, focused/full/package/MCP checks와 remote checkpoint를 확인한 뒤에만 API를 실행한다.

Guard 구현 중 candidate behavior나 generated knowledge가 바뀌면 이 proposal의 hash가 무효가 되므로 paid execution을 멈추고
다시 제안한다.

## 무과금 guard 검증 결과

- Gate N 전용 guard: `6/6` pass
- 관련 evaluation/knowledge/MCP/recipe 집중 검증: `41/41` pass
- 전체 suite: `2,135` total, `2,121` pass, `14` expected historical paid-plan SHA guard rejects
- Package MCP check: pass (`173` actions, `33` recipes, `4` docs)
- 전용 output root: absent
- Credential reads / external model calls / actual spend: `0 / 0 / $0`

전체 suite의 14건은 이전 Gate G/H/K runner가 새 candidate knowledge SHA를 의도대로 거부한 결과다. 이전 paid plan 파일의
내용과 SHA-256은 변경하지 않았으며, Gate N runner는 그 세 historical plan digest 자체도 별도로 고정한다.

## Smoke 통과 조건

1. B/C 최대 6개 result의 resolved model이 정확히 `gpt-5.6-terra`다.
2. 모든 task가 expected primary recipe를 top 1에서 검색한다.
3. Box는 primary recipe 하나만 읽고, composition은 한 search 뒤 composition과 rose recipe를 같은 model response에서 읽는다.
4. 모든 실행이 first submission과 final result valid이며 repair round는 0이다.
5. Box의 Tukey/outlier/color/legend validation과 non-empty Canvas가 모두 통과한다.
6. Composition의 horizontal gap, primitive rose construction, slot-preserving replacement와 multi-panel Canvas가 통과한다.
7. Renderer parity의 Canvas/SVG/PNG 2x/one-page vector PDF와 logical dimensions가 모두 통과한다.
8. B structured payload와 C installed local MCP payload가 exact candidate source에서 일치한다.
9. Model-call, MCP-call, token, timeout과 spend cap을 모두 지킨다.

하나라도 실패하면 evidence를 그대로 봉인하고 full rerun이나 benefit claim을 제안하지 않는다. 모두 성공해도 세 task 단일
반복은 전체 correctness 또는 efficiency benefit을 일반화하는 근거가 아니다.

## 명시적으로 필요한 승인

이 Gate를 승인하면 다음만 허용된다.

1. Gate N 전용 무과금 guard 구현·검증과 remote checkpoint
2. Checkpoint 뒤 Condition B 최대 3 paid runs
3. B 세 건이 모두 통과한 경우에만 Condition C 최대 3 paid runs
4. Combined **$0.60 hard cap** 안의 Responses API 호출
5. Sanitized result/evidence 기록과 별도 review 요청

사용자가 위 범위와 combined `$0.60` hard cap을 승인했다. Guard checkpoint가 push되기 전에는 credential을 읽거나
external model call을 실행하지 않는다.

## 계속 차단되는 범위

- Gate N 명시적 승인 전의 credential read와 paid call
- Frozen 24-task full B/C rerun
- Correctness/efficiency benefit claim
- Historical paid-plan hash 변경
- PR preparation, Ready 전환과 merge
- Package publish, docs deployment와 release
- Roadmap 5.3 closeout

## 근거

- Approved unpaid evidence: [`GATE_M.md`](./GATE_M.md)
- Previous paid smoke and actual cost: [`GATE_K.md`](./GATE_K.md)
- Approved correction contract: [`GATE_L.md`](./GATE_L.md)
- Frozen benchmark contract: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
- Model: <https://developers.openai.com/api/docs/models/gpt-5.6-terra>
- Pricing: <https://developers.openai.com/api/docs/pricing>
