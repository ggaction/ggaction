# Task-Closed Recipe Smoke Analysis

## 판정

Gate N smoke는 **failed**다. Condition B의 세 task 중 `renderer-parity`만 first-pass/final valid였다.
`cars-box-plot`은 exact recipe를 읽고도 마지막 model call을 추가 문서 검색에 사용해 제출하지 않았고,
`composed-dashboard`는 exact primary/dependency recipe를 모두 읽어 존재하는 API만 사용했지만 replacement bar의 자동
레전드에 필요한 오른쪽 여백을 확보하지 못했다. 계획된 all-B-valid guard가 Condition C 전체를 차단했다.

```text
B box plot        → search → exact recipe read → extra docs search → no submission
B composition     → search → exact two-recipe read → submit → legend margin error
B renderer parity → search → exact recipe read → submit → four renderers valid
                                                        ↓
                                            B all-valid gate failed
                                                        ↓
                                                 C runs: 0
```

이번 correction은 Gate K의 guessed API 두 건을 없앴지만 task-closed payload를 실제 제출까지 안정적으로 전환하지는 못했다.
Search ranking, structured read transport, provider, model identity, timeout과 budget은 공통 실패 원인이 아니다.

## 실행 요약

| 항목 | 결과 |
| --- | ---: |
| Condition B runs | 3 / 3 |
| Condition C runs | 0 / 3, guard가 차단 |
| B first-pass / final valid | 1 / 1 |
| Model calls | 9 |
| Total tokens | 22,544 |
| Actual spend | **$0.0516704** / approved $0.60 |
| Resolved model | 모두 `gpt-5.6-terra` |
| Provider/model/timeout/budget failure | 0 |
| Stop reason | `condition-b-not-first-pass-valid` |

## Task별 증거

### `cars-box-plot`

- Search top 1: `recipe:box-plot`
- Exact read: `recipe:box-plot`, 3,943 bytes
- Call sequence: `search_ggaction → read_ggaction → search_docs`
- 마지막 query: `Canvas renderer createCanvas width height margins render ggaction`
- Model calls / total tokens / cost: 3 / 6,436 / $0.0096989
- Result: first-pass false, final false, `invalid-program`
- Validation: `no-valid-submission`

읽은 recipe에는 Gate K의 문제였던 `createBoxPlot({ color })` 금지, post-facade `encodeColor`, redundant legend 제거와
정확한 Browser Canvas `render(program, context)` 예시가 모두 들어 있었다. 즉 이번 실패는 box action 지식이 빠진 것이
아니다. 하지만 evaluation은 `buildChart(datasets)`를 반환하도록 요구하고 recipe example은 DOM Canvas까지 직접 렌더하는
public snippet이다. Model은 두 정보를 연결해 제출하는 대신 마지막 호출을 current-doc 보충 검색에 사용했다.

Condition B instruction은 structured search/read 반복은 금지하지만 current-doc tool은 계속 노출한다. 세 call envelope에서
search와 read 뒤 남은 한 번이 다른 tool call이면 후속 제출 기회가 없다. 따라서 delivered payload closure와 별도로
**read 뒤 submit 전환**을 검증해야 한다.

### `composed-dashboard`

- Search top 1: `recipe:composition`; search 결과의 `recipe:rose-chart`는 3위
- Exact parallel reads: `recipe:composition` 4,126 bytes, `recipe:rose-chart` 4,522 bytes
- Call sequence: `search_ggaction → read_ggaction × 2 in one response → submit_program`
- Model calls / total tokens / cost: 3 / 9,021 / $0.0268898
- Result: first-pass false, final false, `runtime-error`
- Exact error: `Legend layout requires more right-margin space.`

Program은 `createRoseChart`를 추측하지 않고 `createArcMark → encodeTheta → encodeR → encodeColor`를 사용했고,
`hconcat`, 24px gap, `editCompositionLayout`과 slot-targeted `replaceCompositionChild`도 정확히 작성했다. Gate K의 API와
dependency-read 문제는 교정됐다.

실패는 replacement bar가 `cause` color legend를 자동 생성하면서 Canvas right margin을 24px만 둔 데서 발생한다. 동일
chain을 독립 실행해 scatter와 rose child는 통과하고 replacement bar만 같은 right-margin error를 내는 것을 확인했다.
Composition recipe의 replacement example은 `guides.legend: false`를 쓰고 rose recipe는 right margin 210px을 쓰지만,
model은 task에 맞춘 bar에 둘 중 어느 정책도 적용하지 않았다. 즉 multi-recipe source가 API flow를 닫아도 **child별 guide
layout feasibility**까지 닫히지는 않았다.

### `renderer-parity`

- Search top 1 / exact read: `recipe:scatterplot`
- Call sequence: `search_ggaction → read_ggaction → submit_program`
- Model calls / total tokens / time-to-valid / cost: 3 / 7,087 / 7,298ms / $0.0150817
- Result: first-pass true, final true, repair 0
- Frozen validations: **7 / 7**
- Renderer evidence: Browser Canvas, SVG, PNG pixelRatio 2와 one-page vector PDF 모두 valid

Canvas와 PNG는 Gate K 성공 artifact와 같은 SHA-256을 가진다. Renderer knowledge와 immutable-program flow는 새 candidate에서도
회귀하지 않았다.

## Gate M 무과금 evidence가 놓친 경계

Gate M의 24/24 delivered-payload closure는 exact recipe payload 안에 필요한 action, trap warning, executable source와 bounded
dependency가 존재함을 증명했다. Offline 24/24 chart도 최종 program feasibility를 증명했다. 그러나 다음 두 전환은 직접
실행하지 않았다.

1. Model이 exact read 뒤 남은 call을 반드시 `submit_program`에 쓰는가.
2. Model이 여러 valid snippets를 task-specific child size와 guide layout까지 일관되게 합성하는가.

따라서 Gate M의 evidence는 그대로 유효하지만 실제 model success의 충분조건은 아니었다. 이 smoke가 그 남은 경계를
분리했다.

## 다음 correction 후보

이 결과의 승인만으로 아래 correction 구현 권한은 생기지 않는다.

1. Recipe에 Browser snippet뿐 아니라 `buildChart(datasets)`처럼 host-neutral한 complete-program template를 제공해 wrapper와
   renderer 역할을 다시 찾지 않게 한다.
2. Structured recipe read 뒤 payload가 task-closed로 표시되면 current-doc fallback보다 program 작성이 우선이라는 completion
   signal을 knowledge와 tool description에 명시한다. 단순히 evaluator에서 tool을 숨기는 방식은 실제 사용자 환경과 달라질
   수 있으므로 별도 비교 결정이 필요하다.
3. Composition recipe에 색상 legend를 가진 좁은 child의 명시적 정책을 넣는다: 충분한 margin을 잡거나 task에 불필요한
   legend를 끈다.
4. Offline closure에 generated child program의 guide-layout materialization까지 포함해 API 존재 여부뿐 아니라 실제 Canvas
   공간 제약을 검사한다.

자동 margin 확장이나 public action option 추가는 library behavior를 바꾸는 더 큰 결정이다. 이번 evidence만으로는 먼저
knowledge/template와 layout-feasibility guard를 교정하는 편이 범위가 작고 원인에 직접 대응한다.

## 봉인된 증거

Evidence root: `.artifacts/llm-eval/task-closed-smoke-622286f9/`

- Files: 13
- Evidence-tree digest: `008e29a9e4dc8a78882a7aa98c6aa75217e1c6d000054cd0a9727e8b7da1a1d8`
- B result JSONL: `bb9bec324fca4d06d49e7b5aaf371633176cf410f96ec86f38796a69d6b90bd9`
- Box trace: `ac3294e8d45ceb23aa0d20cf2b5441e432d7515c692035a4a11ac7756806dc7e`
- Composition trace: `2c72af3803fb325ffd161695cad993f31211d3fe624db7177a786f88e3748eb9`
- Renderer-parity trace: `3381c670a341d7ea211ae58991f9eb9395182db2bbe8dccac4a10ef0df2099d7`
- Renderer-parity Canvas/PNG: `a29fcaeb61658720d27e92040a4095f61a9b9a94496e6d0d02a39ecfe615c45d`
- Renderer-parity SVG: `2551972832acaa8c5c54e7eaed8775d6e80d77b9e170826d33554374fb159a6f`
- Renderer-parity PDF: `f528a6592b508259f1ee9a446c8cb17cb3223d5bf6e6f834abfdb1e210dfad86`
- Exact credential scan: 0 matches
- Raw response, authorization와 reasoning text는 sanitized trace/result에 저장하지 않음
- Condition C artifact directory: absent

Submitted source는 raw artifact root에만 보존하며 분석 문서에 복제하지 않는다.
