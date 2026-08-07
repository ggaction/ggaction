# Layout-Safe Recipe Smoke Analysis

## 판정

Gate Q smoke는 **failed**다. Condition B의 세 task 중 `composed-dashboard`와 `renderer-parity`는 first-pass/final
valid였지만 `cars-box-plot`은 exact recipe를 읽은 뒤 마지막 model call을 추가 current-doc 검색에 사용해 프로그램을
제출하지 않았다. 계획된 all-B-valid guard가 Condition C 전체를 차단했다.

```text
B box plot        → search → exact recipe read → extra docs search → no submission
B composition     → search → exact two-recipe read → submit → valid
B renderer parity → search → exact recipe read → submit → four renderers valid
                                                        ↓
                                            B all-valid gate failed
                                                        ↓
                                                 C runs: 0
```

Gate O의 composition layout correction은 실제 model run에서도 성공했다. 반면 Box의 explicit Canvas correction만으로는
read 뒤 submit 전환이 안정화되지 않았다. Provider, model identity, search ranking, token, timeout과 spend guard는 공통 실패
원인이 아니다.

## 실행 요약

| 항목 | 결과 |
| --- | ---: |
| Condition B runs | 3 / 3 |
| Condition C runs | 0 / 3, guard가 차단 |
| B first-pass / final valid | 2 / 3 |
| Model calls | 9 |
| Total tokens | 22,997 |
| Actual spend | **$0.0561248** / approved $0.60 |
| Resolved model | 모두 `gpt-5.6-terra` |
| Provider/model/timeout/budget failure | 0 |
| Stop reason | `condition-b-not-first-pass-valid` |

## Task별 증거

### `cars-box-plot`

- Search top 1: `recipe:box-plot`
- Exact read: `recipe:box-plot`, 4,291 bytes
- Call sequence: `search_ggaction → read_ggaction → search_docs`
- 마지막 query: `Canvas renderer import function render Canvas ggaction`
- Model calls / total tokens / cost: 3 / 6,533 / $0.0102540
- Result: first-pass false, final false, `invalid-program`
- Validation: `no-valid-submission`

Exact recipe에는 640×400 Canvas와 margin, `chart`/`render` import, DOM Canvas context, `createBoxPlot`, post-facade
`encodeColor`, redundant legend 제거가 모두 들어 있었다. Evaluation instruction도 explicit 640×400 Canvas, requested renderer
import와 `buildChart(datasets)` export를 직접 요구한다. 따라서 실패는 Canvas 크기나 renderer 함수가 payload에 없어서가 아니다.

Gate N과 Gate Q 모두 model이 search와 exact read 뒤 남은 마지막 call을 renderer 문서 검색에 사용했다. Gate Q query는 Gate
N보다 import/function 확인에 집중됐지만 call pattern과 `no-valid-submission`은 동일하다. 현재 Condition B instruction은 exact
recipe read 뒤 추가 **structured** search/read만 금지하고 current-doc tools는 계속 사용 가능하다고 명시한다. Direct recipe와
evaluation wrapper가 서로 다른 source shape인 상태에서 model은 제출보다 current-doc 확인을 선택할 수 있고, 3-call envelope에는
그 뒤 제출 기회가 없다.

즉 explicit Canvas correction은 필요한 knowledge 품질 개선이었지만 반복 실패의 충분한 correction은 아니었다. 같은 candidate를
추가 paid retry하는 것은 이 구조를 바꾸지 않고 model 변동성에 비용을 거는 방식이므로 권장하지 않는다.

### `composed-dashboard`

- Search top 1: `recipe:composition`; dependency `recipe:rose-chart`는 search 결과 4위
- Exact parallel reads: `recipe:composition` 4,692 bytes, `recipe:rose-chart` 4,522 bytes
- Call sequence: `search_ggaction → read_ggaction × 2 in one response → submit_program`
- Model calls / total tokens / time-to-valid / cost: 3 / 9,096 / 17,731ms / $0.0267781
- Result: first-pass true, final true, repair 0
- Frozen validations: **6 / 6**
- Renderer evidence: non-empty multi-panel Canvas

Program은 primitive rose child, 24px horizontal gap, slot-preserving replacement와 replacement bar를 모두 materialize했다. Gate
N의 `Legend layout requires more right-margin space.` 오류는 재현되지 않았다. Gate O의 explicit legend-space/disabled-legend
정책이 실제 model 조합에서도 충분했다.

### `renderer-parity`

- Search top 1 / exact read: `recipe:scatterplot`
- Call sequence: `search_ggaction → read_ggaction → submit_program`
- Model calls / total tokens / time-to-valid / cost: 3 / 7,368 / 12,716ms / $0.0190927
- Result: first-pass true, final true, repair 0
- Frozen validations: **7 / 7**
- Renderer evidence: Browser Canvas, SVG, PNG pixelRatio 2와 one-page vector PDF 모두 valid

Canvas와 PNG는 Gate K/N artifact와 같은 SHA-256을 유지한다. Renderer knowledge와 immutable-program flow는 이번
candidate에서도 회귀하지 않았다.

## Gate O/P evidence와 실제 model 결과의 관계

Gate P의 mocked Box flow는 exact recipe read 다음에 model이 submit한다고 고정해 payload가 valid program을 만들 수 있음을
검증했다. 실제 model run은 그 가정 전 단계인 **tool 선택**에서 다시 이탈했다. 따라서 Gate P evidence는 recipe source의
실행 가능성을 증명하지만 실제 model이 마지막 call을 submit에 쓰는 충분조건은 아니다.

Composition은 failure-lock, corrected recipe, mocked B/C와 실제 B가 모두 같은 방향으로 통과했다. 이 부분의 correction은
통합 후보로 유지할 수 있다. 그러나 Gate Q 전체 통과 조건은 세 B task 모두 first-pass/final valid였으므로 full rerun과
correctness/efficiency benefit claim은 계속 차단한다.

## 다음 선택지와 추천

이 결과의 승인만으로 다음 correction이나 paid retry 권한은 생기지 않는다.

1. **추천 — direct recipe의 submission contract를 명시한다.** Exact recipe payload에 evaluator 전용 코드를 넣는 대신,
   host-neutral program builder와 renderer snippet의 역할을 더 분명히 구분하고, structured read가 complete source를 반환한 뒤에는
   current-doc fallback보다 작성·제출을 우선한다는 LLM-facing instruction을 둔다. 실제 사용자도 따를 수 있는 정책이므로
   evaluation-only tool 차단보다 의미가 있다.
2. **대안 — recipe payload에 machine-readable completion signal을 추가한다.** 예를 들어 task에 필요한 program/runtime surface가
   완결됐음을 명시하면 routing policy가 추가 검색 허용 여부를 결정할 수 있다. Knowledge schema와 MCP payload 계약 변경이므로
   별도 public-contract 결정을 먼저 받아야 한다.
3. **비추천 — 같은 candidate를 그대로 재실행한다.** 두 번 연속 같은 read→docs-search 패턴이 관측됐으므로 원인 분리 없이
   반복하면 재현성보다 운에 의존한다.
4. **비추천 — Condition B에서 current-doc tool을 evaluator만 강제로 숨긴다.** 제출률은 높일 수 있지만 실제 LLM 사용 환경과
   평가 조건을 다르게 만들어 기존 A/B/C 비교 의미를 약화한다.

추천안의 무과금 acceptance는 direct Box task에서 search 1회, exact recipe read 1회 뒤 추가 docs search 없이 submission-ready
source를 만들 수 있다는 payload/instruction contract와 mocked B/C로 구성한다. 실제 model retry는 그 correction과 새 candidate
hash를 별도 승인한 뒤에만 제안한다.

## 봉인된 증거

Evidence root: `.artifacts/llm-eval/layout-safe-smoke-5606b1d5/`

- Files: 13
- Evidence-tree digest: `9e912e774e4fe21167d7fb289e5ba33207715d63f768179095be583cbe971108`
- B result JSONL: `f2e47d7993c5727465c266c6082fc1e514ef39c125bdbc038999837e7480f0f4`
- Box trace: `26307b6a6c689e3f0014f48794a02db0c456f91df85dbb51335bb80c7e335b0e`
- Composition trace: `376bf339366bd0741e8ee107e042c82ddeac204cc586b8eab7783232178544c3`
- Composition program: `af2b2f5c71ff0ded7f02d9935f43091d7e777e0a10f7bcf0ffbb9305cfe9271a`
- Renderer-parity trace: `a4a09211f57bc5abde72774a652ae505117dd04a8e6e06102be21cf176a13048`
- Renderer-parity program: `5827d49b1dca0ec73f97531fdc423e75183a0433422ccd5539b68f5ee9a649cb`
- Renderer-parity Canvas/PNG: `a29fcaeb61658720d27e92040a4095f61a9b9a94496e6d0d02a39ecfe615c45d`
- Renderer-parity SVG: `2551972832acaa8c5c54e7eaed8775d6e80d77b9e170826d33554374fb159a6f`
- Renderer-parity PDF: `f528a6592b508259f1ee9a446c8cb17cb3223d5bf6e6f834abfdb1e210dfad86`
- Sensitive credential-pattern scan: 0 matches
- Raw response, authorization와 reasoning text는 sanitized trace/result에 저장하지 않음
- Condition C artifact directory: absent

Submitted source는 raw artifact root에만 보존하며 분석 문서에 복제하지 않는다.
