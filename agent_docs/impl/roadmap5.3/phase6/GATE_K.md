# Gate R53-P6-K — Representative Systematic-Recipe Paid Smoke

## Gate state

`proposed`

Proposal checkpoint: `68e89447`

Candidate behavior checkpoint: `a44d3d4eb2c99526f8174d6af5fa2ebed087ec60`

Gate J approval checkpoint: `c8475309`

Remote branch: `origin/codex/roadmap5-3-llm-friendly`

## 한눈에 보는 제안

Gate J의 24/24 offline 결과가 실제 model 사용에서도 이어지는지, 서로 다른 실패 표면을 가진 frozen task 3개로 작게
확인한다. Condition B 세 건이 모두 first-pass와 final validation을 통과한 경우에만 Condition C 세 건을 실행한다.

```text
B: box plot → composition → four-renderer parity
  → all three first-pass and final valid?
      no  → seal evidence and stop before C
      yes → C: same three tasks in the same order
              → seal evidence and stop for review
```

이 smoke는 systematic correction이 scatterplot 밖에서도 실제 model의 실행 가능한 제출로 이어지는지를 확인한다. Frozen
24-task full rerun, benefit claim, PR, merge, publish와 release는 포함하지 않는다.

## 왜 이 세 task인가

| Task | Split / difficulty | 확인하는 교정 표면 |
| --- | --- | --- |
| `cars-box-plot` | authoring / direct | Non-scatter statistical facade, Tukey/outlier contract, 정확한 color encoding과 redundant legend 제거 |
| `composed-dashboard` | held-out / repair | 두 dataset, scatter·polar·bar child, horizontal composition, 24px gap과 slot-preserving child replacement |
| `renderer-parity` | held-out / repair | 동일 immutable program, 정확한 Canvas/SVG/PNG/PDF imports, PNG pixelRatio 2와 one-page vector PDF |

세 task는 단순 facade, 복잡한 composition, package renderer boundary를 각각 대표한다. 이미 성공했던
`cars-scatter-origin`을 다시 쓰지 않으므로 이번 correction이 기존 scatterplot 한 건에만 맞춰진 것인지도 구분할 수 있다.

## Exact scope

| 항목 | 고정값 |
| --- | --- |
| Tasks | `cars-box-plot`, `composed-dashboard`, `renderer-parity` |
| Repetition | 각 task `r1` only |
| Conditions | B 3건, 세 건 모두 통과한 경우에만 C 3건 |
| Deterministic order | 위 task 순서, B 전체 뒤 C 전체 |
| Maximum evaluation runs | 6 |
| Maximum model calls | 18, run당 최대 3 |
| Candidate metadata | `a44d3d4eb2c99526f8174d6af5fa2ebed087ec60` |
| New isolated output root | `.artifacts/llm-eval/systematic-recipe-smoke-a44d3d4e/` |

Frozen input digests:

- Evaluation plan: `c30b33a7d3b2f5118a8d8b8818023339a1f01f6170fba62edaf7ed8feefc1671`
- Corpus: `1a87b9b9cbbcd382aef6f82c94bf2080b545425be5d366a95b29cb3b1c942ad1`
- Generated knowledge: `c8bd63f75021673a86c4d2f22a941cbb24647f8b0f4b615400148ce4934d504c`
- Knowledge search index: `df98a5216253af792fb1c1b4765127199c3bb2a91288c96d12808f25119538ed`
- Public recipe document: `f0452d6d235618fc45e3dfaad20ade128096d39379371d0b842a7f114d0efa13`

과거 Gate G/H plan과 evidence root는 수정하거나 재사용하지 않는다. Gate K plan은 위 candidate와 새 root만 허용한다.

## Model과 평가 설정

Phase 0부터 사용한 비교 조건을 유지한다.

- Responses API, exact model `gpt-5.6-terra`
- Reasoning effort `medium`, standard reasoning mode
- Text verbosity `low`, service tier `default`, `store: false`, `tool_choice: "auto"`
- Fast mode, Regional processing과 built-in paid tools 사용 금지
- Run당 model call 최대 3회, C run당 MCP knowledge call 최대 8회
- Run당 timeout 180초
- Call당 output 최대 5,000 tokens
- Run당 cumulative input/output ceiling 24,000 / 8,000 tokens
- Frozen task, dataset, oracle, prompt, score와 validation threshold 변경 금지

OpenAI 공식 model page 기준 `gpt-5.6-terra`는 Responses API와 function calling을 지원한다. Standard short-context
가격은 1M tokens당 input $2.00, cached input $0.20, cache write $2.50, output $12.00이다. 이번 request ceiling은
long-context threshold보다 훨씬 낮다.

## 비용 제안

Gate G actual은 run당 $0.0114~$0.0134, Gate H에서 관측한 최고 run은 $0.0208 미만이었다. Payload와 복잡도 차이를
포함해 **run당 $0.025**, 최대 6회 **$0.15**를 expected cost로 둔다.

| 범위 | Expected | Hard cap |
| --- | ---: | ---: |
| Condition B, 최대 3 runs | $0.075 | $0.30 |
| Condition C, 최대 3 runs | $0.075 | $0.30 |
| Combined | **$0.15** | **$0.60** |

Frozen token ceiling을 Standard short-context 최고 단가로 모두 사용하는 계산상 maximum은 run당 $0.156, 6회
$0.936이다. 그 금액은 승인받지 않는다. Runner는 다음 request의 보수적 maximum이 남은 condition 또는 combined cap을
넘으면 새 request를 시작하지 않고 `budget-exceeded`로 중단한다.

## 승인 뒤 먼저 구현할 무과금 guard

1. Candidate, task order, B→C gate, frozen hashes, 새 output root와 $0.30/$0.60 cap을 별도 immutable plan으로 고정한다.
2. Plan의 `approvalStatus`가 approved가 아니면 credential을 읽기 전에 거부한다.
3. Output root가 이미 존재하거나 비어 있지 않으면 credential을 읽기 전에 거부한다.
4. B 세 건은 deterministic order로 실행한다. Provider/model/hash/cap/timeout 오류가 발생하면 즉시 전체를 중단한다.
5. B 하나라도 first-pass 또는 final invalid이면 세 B 결과를 봉인하고 C는 한 건도 시작하지 않는다.
6. B 세 건이 모두 통과한 경우에만 C 세 건을 같은 순서로 실행한다. C 오류나 invalid result에서도 남은 요청을 시작하지
   않는다.
7. 매 run 뒤 model identity, call count, token ceiling, actual spend와 evidence file을 확인한다.
8. Mocked B failure stop, all-B-success→C sequence, mid-C stop, budget boundary와 credential-before-guard rejection을 테스트한다.
9. Focused tests, current full-suite safety-guard 상태, generated/package/MCP checks가 확인된 guard checkpoint를
   commit·push한 뒤에만 API를 실행한다.

Guard 구현은 public API, knowledge content, evaluator oracle 또는 acceptance threshold를 바꾸지 않는다. 새 candidate hash가
필요한 behavior change가 발견되면 이 Gate를 실행하지 않고 다시 제안한다.

## Smoke 통과 조건

다음을 모두 충족해야 통과한다.

1. B/C 6개 result의 resolved model이 정확히 `gpt-5.6-terra`다.
2. 각 result가 expected primary recipe를 검색하고 exact recipe payload를 읽은 뒤 3 model calls 안에 제출한다.
3. B/C 6개 모두 first submission과 final result가 valid하며 repair round는 0이다.
4. 각 task의 required actions, runtime functions와 frozen validations가 모두 통과한다.
5. Box plot은 Tukey/outlier/color/legend contract와 non-empty Canvas evidence를 충족한다.
6. Composition은 horizontal gap, child replacement, slot identity와 multi-panel Canvas evidence를 충족한다.
7. Renderer parity는 Canvas/SVG/PNG pixelRatio 2/one-page vector PDF와 logical-dimension equality를 충족한다.
8. B structured read와 C local MCP read가 동일 candidate recipe source를 사용한다.
9. Condition/combined spend cap, token/call/time limits와 sanitized evidence contract를 모두 지킨다.

하나라도 실패하면 evidence를 그대로 봉인하고 full rerun이나 benefit claim을 제안하지 않는다. 모두 성공해도 3-task
single repetition은 correctness 또는 efficiency 개선을 일반화할 근거가 아니므로, 전체 비교는 별도 Gate가 필요하다.

## 승인 효과

Gate K를 명시적으로 승인하면 다음 범위만 허용한다.

1. 위 smoke-only guard의 무과금 구현·검증과 remote checkpoint
2. Checkpoint 확인 뒤 최대 B 3회와, B 세 건이 모두 통과할 때만 C 3회
3. Combined **$0.60 hard cap** 안의 Responses API 실행
4. Sanitized result/evidence 작성과 별도 review 요청

제안서 작성만으로는 API 실행이 허용되지 않는다. 사용자의 명시적 승인 전에는 credential을 읽지 않는다.

## 계속 차단되는 범위

- Frozen 24-task full B/C rerun
- Correctness/efficiency benefit claim
- Historical paid-plan hash 변경
- PR preparation, Ready 전환과 merge
- Package publish, docs deployment와 release
- Roadmap 5.3 closeout

## 공식 근거

- Model: <https://developers.openai.com/api/docs/models/gpt-5.6-terra>
- Pricing: <https://developers.openai.com/api/docs/pricing>
- Approved unpaid evidence: [`GATE_J.md`](./GATE_J.md)
- Frozen benchmark contract: [`../phase0/BENCHMARK_CONTRACT.md`](../phase0/BENCHMARK_CONTRACT.md)
