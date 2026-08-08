# Gate R53-P6-S — Fresh A/B/C/D Paid Pilot

## Gate state

`approved`

사용자가 2026-08-08 별도 비용 승인을 했고 exact approval artifact를 통해 guarded pilot을 실행했다. Checked-in plan은
계속 `unpaid-validation-only`, credential/external call/spend는 `false / false / $0`을 유지한다.

## 한눈에 보는 제안

Gate R에서 MCP, condition isolation, call accounting, strict oracle와 generalization corpus를 전면 교정했다. 첫 유료
단계는 최종 효과를 주장하는 full benchmark가 아니라, 새 A/B/C/D 실험이 실제 provider에서도 공정하고 완전하게 기록되는지
확인하는 **3 tasks × 4 conditions × 1 repetition = 12 runs** 파일럿이다.

- Expected spend: **$0.60**
- Hard spend cap: **$3.00**
- Maximum external model calls: **72**
- Credential reads / external model calls / additional spend at proposal time: **0 / 0 / $0**

Pilot 결과를 본 뒤 task, oracle, 조건, 모델, 순서 또는 판정 규칙을 고치지 않는다. 3-task one-repetition 결과는
infrastructure go/no-go와 failure analysis에만 쓰며 LLM-friendly benefit의 최종 증거로 쓰지 않는다.

## 1. Immutable candidate and artifacts

| Item | Frozen value |
| --- | --- |
| Candidate commit | `7b9e4f484aa653bf806b3a70a4e5df9cbe57e850` |
| Generalization corpus | 17 tasks |
| Corpus SHA-256 | `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c` |
| Documentation snapshot | 125 files / 1,385,929 bytes |
| Documentation SHA-256 | `bf57efce712d92a145485290d2ae9b6576620e56c418352829fa7ef1029908ba` |
| Installed npm artifact | 417 entries / 529,252 packed bytes / 3,603,121 unpacked bytes |
| Installed package SHA-256 | `2751c4b86ac8c08d5853b81fe20cf23ddb8a32b6251415079b3683b1bbe533f2` |

Paid runner는 candidate 이후 `GATE_S.md`와 Phase 6 `GOAL.md`만 달라질 수 있게 강제한다. Source MCP 실행은 금지하고
위 candidate에서 만든 exact installed package만 사용한다. Output은 비어 있는 새
`.artifacts/llm-eval/paired-pilot/` child에만 기록한다.

## 2. Model and current official pricing

2026-08-07 OpenAI 공식 문서를 다시 확인했다.

- Model: exact `gpt-5.6-terra`
- API: Responses
- Reasoning: `medium`, standard mode
- Text verbosity: `low`
- Service tier: `default`
- Store: `false`
- Endpoint: global `https://api.openai.com/v1/responses`; regional-processing endpoint는 사용하지 않는다.

Official latest-model guide는 Terra를 intelligence와 cost의 균형을 위한 GPT-5.6 variant로 설명한다. Standard short-context
단가는 1M tokens당 uncached input `$2.00`, cached input `$0.20`, cache write `$2.50`, output `$12.00`이다. Candidate plan의
model과 price table은 이 값과 같다.

- Latest-model guide: <https://developers.openai.com/api/docs/guides/latest-model.md>
- API pricing: <https://developers.openai.com/api/docs/pricing>

실행 직전 공식 model availability나 위 standard price가 달라졌으면 기존 승인을 사용하지 않고 새 비용 Gate를 만든다.

## 3. Exact conditions

| Condition | Model-visible knowledge | 해석 |
| --- | --- | --- |
| A | Pinned public documentation only | Current-doc control |
| B | Structured knowledge through direct adapter | Structured content result |
| C | B와 byte-equivalent한 structured knowledge through local MCP | B/C transport isolation |
| D | Pinned docs + local MCP | Recommended product path |

B/C만 transport effect로 직접 비교한다. A/C와 A/D는 product improvement 관점의 paired comparison으로 보고하며, D를 B/C
transport 결과에 섞지 않는다. 각 task/repetition에서 둘 다 성공한 pair만 efficiency 비교에 사용하고 모든 failure는 accuracy와
failure cost에 남긴다.

## 4. Exact task subset

| Task | 선택 이유 |
| --- | --- |
| `cars-weight-horsepower-sized-scatter` | 가장 흔한 Cartesian authoring과 x/y/size encoding, axes, Canvas submission을 확인한다. |
| `cars-bottom-color-opacity-legends` | 서로 다른 두 legend의 title, symbol, label baseline과 gap을 strict geometry로 검사한다. |
| `jobs-imdb-composed-summary` | 두 dataset, 서로 다른 chart type, horizontal composition, exact 24px gap과 모든 panel ink를 검사한다. |

이 세 task는 basic authoring, 과거 취약점인 guide layout, multi-chart composition을 작은 비용으로 가른다. Renderer parity,
distribution, selection과 나머지 14개 task는 이 runner가 provider 환경에서도 온전히 작동한다고 확인한 뒤 별도 full-evaluation
Gate에서 다룬다.

## 5. Exact order and limits

- Repetitions per task: `1`
- Conditions: exact `A, B, C, D`
- Maximum runs: `12`
- Order seed: `r53-p6-s-20260807`
- Maximum model calls per run: `6`
- Natural-call window before forced final submission: `3`
- Maximum repair submissions per run: `2`
- Maximum knowledge-tool calls per run: `3`
- Timeout per run: `180,000ms`
- Maximum cumulative input/output per run: `36,000 / 12,000 tokens`
- Maximum output per call: `5,000 tokens`

Deterministic run order는 다음과 같다.

1. `B:cars-bottom-color-opacity-legends:r1`
2. `A:cars-weight-horsepower-sized-scatter:r1`
3. `D:cars-bottom-color-opacity-legends:r1`
4. `C:jobs-imdb-composed-summary:r1`
5. `A:jobs-imdb-composed-summary:r1`
6. `B:jobs-imdb-composed-summary:r1`
7. `C:cars-bottom-color-opacity-legends:r1`
8. `C:cars-weight-horsepower-sized-scatter:r1`
9. `A:cars-bottom-color-opacity-legends:r1`
10. `D:cars-weight-horsepower-sized-scatter:r1`
11. `D:jobs-imdb-composed-summary:r1`
12. `B:cars-weight-horsepower-sized-scatter:r1`

전체 상한은 external model calls `72`, knowledge-tool calls `36`, submissions `36`, cumulative input `432,000`, cumulative
output `144,000` tokens다. C와 D는 각각 한 persistent local MCP session을 재사용하지만 task별 model state는 공유하지 않는다.

## 6. Expected cost and hard cap

이전 같은 model/settings의 representative run은 대체로 `$0.0097–$0.0269`였지만 당시 최대 model call envelope는 더 작았다.
이번에는 최대 6 calls, docs condition과 실제 repair를 포함하므로 run당 `$0.05`, 12 runs 합계 **$0.60**을 보수적 expected
spend로 둔다.

절대 token ceiling에서 한 run의 maximum은 다음과 같다.

```text
36,000 × $2.50 / 1M  +  12,000 × $12.00 / 1M  =  $0.234
$0.234 × 12 runs = $2.808
```

가장 비싼 short-context input class인 cache-write rate를 모든 input에 적용한 값이다. 승인 요청 hard cap은 반올림 여유를
포함한 **$3.00 combined**다. Runner는 각 request 전에 serialized request bytes를 input-token upper bound로 사용하고, 가장
비싼 input rate와 requested maximum output으로 계산한 요청 상한이 남은 combined cap에 들어오지 않으면 호출하지 않는다.

## 7. Stop rules and unknown-spend handling

Credential read 전 다음 중 하나라도 다르면 비용 없이 중단한다.

1. Current HEAD와 approved Gate record commit
2. Candidate 이후 허용 파일 목록과 clean tracked tree
3. Corpus, docs snapshot, installed package와 structured-surface hash
4. Installed direct payload와 MCP transport payload
5. Approval의 exact conditions, task IDs, repetition, run count, cap와 order seed

External call 시작 뒤에는 다음 규칙을 적용한다.

1. Resolved model이 exact `gpt-5.6-terra`가 아니면 해당 result를 기록한 뒤 전체 pilot을 중단한다.
2. 다음 request의 conservative maximum이 남은 cap에 들어오지 않으면 그 request를 시작하지 않고 중단한다.
3. Timeout, provider error 또는 billable usage 필드 누락이 한 번이라도 발생하면 그 request의 보수적 비용 상한을 기록하고
   전체 pilot을 즉시 중단한다. 알 수 없는 비용을 `$0`으로 간주해 다음 request를 실행하지 않는다.
4. Task-level invalid program, oracle failure와 exhausted repair는 benchmark failure로 기록하고 다음 scheduled run은 계속한다.
5. 매 completed response에서 input/cached/cache-write/output usage를 모두 확인하고 actual estimated cost와 cumulative cost를
   기록한다.

## 8. Pilot evidence and decision boundary

Infrastructure go 조건은 다음과 같다.

1. Safety stop 없이 exact 12 runs와 A/B/C/D 각 3 results가 생성된다.
2. B/C model-visible structured surface와 payload가 동일하고 MCP protocol operation count가 실제 호출과 맞는다.
3. Natural/forced submission, first/final validity, two repairs, setup/task/end-to-end latency와 cost가 분리 기록된다.
4. Strict oracle가 각 program과 renderer evidence를 판정하고 raw trace/program/validation/summary가 남는다.
5. Summary가 B/C transport, A/C와 A/D product pair를 분리하며 success-only efficiency coverage와 failure cost를 함께 낸다.

Pilot가 이 조건을 통과해도 candidate benefit은 아직 승인되지 않는다. 결과를 무과금으로 분석한 뒤 full 17-task repetition
scope와 expected/hard cost를 새 Gate로 제안한다. Pilot가 infrastructure에서 실패하면 원인을 무과금으로 고치고 같은 승인을
재사용하지 않는다.

## 9. Separate approval requested

승인 시 별도 local approval artifact는 다음 exact 내용을 가져야 한다. `gateRecordCommit`은 이 문서를 포함해 push된 exact
Gate S commit으로 승인 요청 메시지에 제시한다.

- Gate/status: `R53-P6-S / approved`
- Candidate: `7b9e4f484aa653bf806b3a70a4e5df9cbe57e850`
- Corpus SHA-256: `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c`
- Conditions: exact `A, B, C, D`
- Tasks: 위 3개 exact IDs
- Repetitions / maximum runs: `1 / 12`
- Hard spend cap: **`$3.00` combined**
- Credential read / external model calls: explicit `true / true`
- Order seed: `r53-p6-s-20260807`

이 승인은 PR preparation, merge, package publish, docs deployment, release 또는 후속 full paid evaluation을 포함하지 않는다.

## 10. Executed result

- Completed runs: **12 / 12**
- Valid programs: **5 / 12**
- Estimated spend: **$0.3886566 / $3.00**
- Model calls / total tokens: **55 / 201,637**
- Provider, timeout, usage, model-identity or spend-cap failure: **0**
- Manifest / results / summary SHA-256:
  - `57af8987165035ef355688788420c52f780315f01af03ce8fc0622f75ebb8795`
  - `1645cb11974ad1800f399273f18510c99030aa04017095ab39e3deb49be67922`
  - `0a19007ab5d3cfde1a92aef1a73a1a1580261a0bb712c73be0a2d440957d702a`

Safety와 provider execution은 통과했지만 legend는 네 condition 모두 실패했고 composition은 B만 통과했다. 또한 docs-only
retrieval을 성공으로 집계하지 않고 rejected knowledge call을 실행 call과 섞으며 repair source를 덮어쓰는 측정 결함이
드러났다. 따라서 이 결과로 product benefit이나 condition efficiency를 주장하지 않는다. Immutable evidence, task별 결과,
원인과 후속 무과금 correction은 [`PAIRED_PILOT_ANALYSIS.md`](./PAIRED_PILOT_ANALYSIS.md)가 소유한다.
