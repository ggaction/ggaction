# Paid Smoke Attempt 3 — Valid v3 Result

## Immutable identity

| Item | Value |
| --- | --- |
| Execution approval | R54-P5-D, approval checkpoint `f2f19438` |
| Product candidate | `6ed5af76c80e56c5a3cde833c5a702de183e4d7a` |
| Plan | `evaluation/compact-authoring-paid-smoke-v3/PLAN.json` |
| Plan SHA-256 | `261a53c96913eededc7bbed898abc38104d223508701eba7c0f2daf5ebd01d37` |
| Final result | `evaluation/compact-authoring-paid-smoke-v3/results/RESULT.json` |
| Final result SHA-256 | `197a1c567aa34d5b054928586a58bd621eb2f369317f3ad1051f7801a667a15c` |
| Final progress | `evaluation/compact-authoring-paid-smoke-v3/results/IN_PROGRESS.json` |
| Final progress SHA-256 | `73f9322c3c07defb8a26e280ae2abfa7fbf70611359c9f6d1520ce714e353c62` |
| Credential reads | 1 |
| Automatic retries | 0 |

## Exact outcome

Attempt 3은 runner/provider error나 budget stop 없이 fixed 16 task-runs를 모두 완료했다. 실패 9건을 success로
재분류하지 않고 exact result를 보존한다.

| Metric | Result |
| --- | ---: |
| Completed task-runs | 16 / 16 |
| Strict pass | 7 / 16 |
| Billed model calls | 42 / 48 maximum |
| Input tokens | 47,468 |
| Cached input tokens | 9,300 |
| Cache-write tokens | 19,097 |
| Output tokens | 9,926 |
| Reasoning tokens | 7,053 |
| Total tokens | 57,394 |
| Spend | `$0.2068565` |

| Task | A docs | B direct | C MCP | D fallback |
| --- | ---: | ---: | ---: | ---: |
| Histogram | fail | fail | fail | fail |
| Regression layers | fail | pass | pass | pass |
| PDF + JPG | fail | pass | pass | fail |
| 3D + JPEG | fail | pass | pass | fail |

| Condition | Pass | Calls | Input | Output | Cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| A — public docs | 0 / 4 | 12 | 14,443 | 4,008 | `$0.0752905` |
| B — compact direct | 3 / 4 | 9 | 9,407 | 1,979 | `$0.0421389` |
| C — compact MCP | 3 / 4 | 10 | 11,745 | 2,276 | `$0.0477780` |
| D — MCP-first/docs fallback | 1 / 4 | 11 | 11,873 | 1,663 | `$0.0416491` |

## Causal failure classification

### 1. Authoring prerequisite closure가 task packet에 없었다 — 4 failures

Histogram A는 package-level `Canvas`와 `createData`를 발명했다. B/C/D는 compact packet의 exact histogram action과 renderer는
사용했지만 `createData({ rows })`를 발명해 모두 실패했다. Packet의 `authoring`은 imports, `chart()` initialization과 selected
domain steps만 제공하고 prerequisite인 `createCanvas`와 `createData`의 exact signature/call pattern을 제공하지 않는다.
Evaluator가 요구한 exported function wrapper는 benchmark context이고 product packet에 그대로 고정할 일반 API 지식은 아니다.
확실한 product gap은 wrapper 자체가 아니라 model이 caller data를 `values` option에 결합할 수 있는 prerequisite closure가
없다는 점이다.

### 2. Public docs route가 submit contract를 닫지 못했다 — 3 additional failures

Regression A는 관련 페이지를 읽고도 current aggregate action을 찾지 못해 supported task를 unsupported로 제출했다. 두
unsupported A task는 capability 의미는 맞게 판단했지만 canonical unresolved IDs 대신 `JPG`, `3d`, `jpeg`를 제출했다. Public
docs에는 exact bootstrap과 machine-readable unsupported identity를 한 bounded read로 함께 얻는 route가 없다. 동시에
`submit_result` schema는 canonical ID vocabulary를 설명하지 않으면서 evaluator는 exact ID를 요구한다. 따라서 이 실패는 docs
delivery와 evaluation contract 양쪽의 closure gap이다.

### 3. D가 terminal unsupported와 documentation-needed를 구분하지 않았다 — 2 failures

두 unsupported D task는 correct canonical IDs와 reason을 받은 뒤 곧바로 submit했다. Route validator feedback 뒤 resource를
읽었지만 3-call limit을 이미 사용해 다시 submit하지 못했다. Current packet의 `unresolved`는 이미 결론 난 unsupported capability와
추가 선택/문서가 필요한 상태를 한 배열에 섞는다. Harness는 둘 모두에 문서 read를 강제하면서 canonical packet에는 required URI를
반환하지 않는다. 따라서 이 실패는 단순 URI 누락뿐 아니라 terminal decision에도 추가 호출을 요구한 routing semantics 문제다.

## Interpretation boundary

- Attempt 3는 처음으로 complete, billable, valid A/B/C/D smoke다. Attempt 1/2와 합산하거나 대체하지 않는다.
- B와 C가 같은 3 / 4를 통과해 direct/local-MCP byte parity가 실제 authoring에서도 유지된다는 작은 positive signal은 있다.
- 한 repetition에서 B/C call·token·time 차이를 transport 효과로 일반화하지 않는다.
- Histogram common failure와 D route failure 때문에 candidate는 integration 또는 full paid evaluation 대상으로 승격하지 않는다.
- v3 corpus, oracle, evaluator, model limits와 result는 결과 확인 뒤 수정하지 않는다. 새 semantics는 별도 versioned candidate와
  v4 routing oracle로만 검증한다.

## Next decision

Candidate를 causal repair할지 현재 negative result로 non-integration closeout할지는 [`GATE_E.md`](./GATE_E.md)가 소유한다.
새 credential read, external call, same-plan retry와 additional spend는 별도 승인 전까지 차단한다.
