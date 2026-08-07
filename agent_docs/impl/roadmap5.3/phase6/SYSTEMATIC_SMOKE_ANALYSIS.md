# Systematic Recipe Smoke Analysis

## 판정

Gate K smoke는 **failed**다. Condition B의 세 task 중 `renderer-parity`만 first-pass/final valid였고,
`cars-box-plot`과 `composed-dashboard`는 exact primary recipe를 읽은 뒤에도 runtime error가 발생했다. Gate K guard는
계획대로 C 전체를 시작하지 않았다.

```text
B box plot       → exact recipe read → unsupported color option → failed
B composition    → exact recipe read → invented createRoseChart → failed
B renderer parity→ exact recipe read → Canvas/SVG/PNG/PDF valid → passed
                                     ↓
                         B all-valid gate failed
                                     ↓
                              C runs: 0
```

Search ranking, structured read transport, provider, model identity, budget와 renderer runtime은 이번 실패의 공통 원인이 아니다.
공통 원인은 **recipe가 실행 가능한 최소 예제를 제공하더라도 해당 frozen task의 변형을 완성하는 데 필요한 exact flow까지
닫혀 있지 않은 것**이다.

## 실행 요약

| 항목 | 결과 |
| --- | ---: |
| Condition B runs | 3 / 3 |
| Condition C runs | 0 / 3, guard가 차단 |
| B first-pass / final valid | 1 / 1 |
| Model calls | 9 |
| Total tokens | 20,991 |
| Actual spend | **$0.0534576** / approved $0.60 |
| Resolved model | 모두 `gpt-5.6-terra` |
| Provider/timeout/budget failure | 0 |
| Stop reason | `condition-b-not-first-pass-valid` |

## Task별 증거

### `cars-box-plot`

- Search top 1: `recipe:box-plot`
- Exact read: `recipe:box-plot`
- Call sequence: `search_ggaction → read_ggaction → submit_program`
- Model calls / total tokens / cost: 3 / 6,575 / $0.0150212
- Result: first-pass false, final false, `runtime-error`
- Exact error: `Unknown createBoxPlot option "color".`

Recipe의 generated `exampleSource`는 유효한 기본 `createBoxPlot({ x, y, guides })`를 보여주지만, task가 요구한 category
color 변형은 보여주지 않는다. Step inventory에도 `encodeColor`가 없고, `createBoxPlot({ color })`가 금지된 option이라는
pitfall도 없다. 반면 연결된 실제 Cars example은 정확히 다음 흐름을 이미 사용한다.

```javascript
.createBoxPlot({ x, y, guides: { legend: false } })
.encodeColor({
  target: "boxPlot",
  field: "Origin",
  fieldType: "nominal",
  scale: { palette: "tableau10" }
})
```

즉 public example에는 정답이 있지만, model이 읽은 exact recipe payload에는 그 정답이 포함되지 않았다. Model은
scatterplot의 `color` shorthand와 비슷한 형태를 추측해 box facade option 안에 넣었다.

### `composed-dashboard`

- Search top 1: `recipe:composition`
- Exact read: `recipe:composition`
- Search 결과에는 `recipe:rose-chart`도 5위로 존재
- Call sequence: `search_ggaction → read_ggaction → submit_program`
- Model calls / total tokens / cost: 3 / 7,547 / $0.0239596
- Result: first-pass false, final false, `runtime-error`
- Exact error: `createRoseChart is not a function`

Composition recipe의 generated `exampleSource`는 scatter와 bar child를 `hconcat`하고 `editCompositionLayout`을 호출하지만,
실제 `replaceCompositionChild` 실행은 포함하지 않는다. Rose child의 `createArcMark → encodeTheta → encodeR → encodeColor`
flow도 포함하지 않는다. `createRoseChart`는 현재 action inventory 173개 어디에도 없는 API다.

연결된 program-composition example에는 실제 `replaceCompositionChild`가 있고, 별도 rose-chart recipe에는 정확한 primitive
flow가 있다. 그러나 model이 선택한 한 개의 composition payload에는 두 정보가 함께 닫혀 있지 않았다. 세 model-call
envelope에서 model은 composition recipe 하나만 읽은 뒤 rose facade를 추측했다.

### `renderer-parity`

- Search top 1: `recipe:scatterplot`
- Exact read: `recipe:scatterplot`
- Call sequence: `search_ggaction → read_ggaction → submit_program`
- Model calls / total tokens / time-to-valid / cost: 3 / 6,869 / 9,660 ms / $0.0144768
- Result: first-pass true, final true, repair 0
- Frozen validations: **7 / 7**
- Runtime functions: `chart`, `render`, `renderToSVG`, `renderToPNG`, `renderToPDF`
- Renderer evidence: Canvas, SVG, PNG pixelRatio 2와 one-page vector PDF 모두 valid

Scatterplot recipe에는 root Canvas, SVG, PNG와 PDF의 exact import/call pitfalls가 들어 있다. Task가 요구한 renderer 변형이
한 payload 안에서 닫혀 있었기 때문에 model이 guessed API 없이 완성했다. 이 성공은 failure analysis의 반대 사례다.

## Gate J offline evidence와 실제 smoke의 차이

Gate J의 두 evidence는 각각 사실이지만 서로 다른 것을 검증했다.

1. **33/33 generated source execution**은 각 recipe의 canonical 최소 source 자체가 실행됨을 검증했다.
2. **24/24 recipe-backed task programs**는 사람이 작성한 task별 program을 primary recipe ID와 연결해 evaluator와 renderer를
   검증했다.

두 번째 program은 model이 읽는 generated `exampleSource`를 task prompt에 맞게 변형한 결과가 아니다. 예를 들어 offline
box builder는 이미 `.encodeColor({ target: "boxPlot" })`를 사용했고, offline composition builder는 별도 rose helper와
실제 replacement flow를 직접 조합했다. 따라서 24/24는 evaluator/oracle과 최종 chart feasibility를 입증했지만,
**top-1 recipe payload만으로 같은 task 변형을 작성할 수 있다는 closure**를 입증하지 않았다.

Gate K는 이 남은 간극을 실제 model 호출로 처음 분리했다. Offline 24/24를 LLM 성능 개선으로 해석하지 않았던 Gate J의
claim boundary는 유지되며, 앞으로는 `executable recipe`와 `task-closed recipe payload`를 별도 기준으로 다뤄야 한다.

## 다음 correction에서 필요한 것

이번 결과만 승인하면 correction 구현 권한은 생기지 않는다. 다음 제안은 최소한 다음을 기계적으로 고정해야 한다.

1. Frozen task의 required actions와 task-specific variant가 top-1 recipe payload의 steps, exact source 또는 explicit
   dependency 안에 존재하는지 검사한다.
2. Box plot처럼 facade마다 option shape가 다른 경우, task에서 자주 요구하는 supported post-facade encoding과 대표적인
   guessed option을 같은 payload에 명시한다.
3. Composition처럼 여러 chart family가 필요한 task는 다음 중 하나를 명시적으로 결정한다.
   - primary composition recipe가 complete child construction과 replacement source까지 포함하는 task-closed bundle을 제공
   - bounded multi-resource read를 허용하고 exact dependency IDs와 read order를 제공
4. Public example에 이미 존재하는 정확한 flow가 generated recipe source에서 빠지지 않도록 recipe source와 linked example의
   variant coverage를 검사한다.
5. Offline task evidence는 별도 builder에 recipe ID만 붙이는 대신, 실제 delivered payload가 task-required flow를 포함한다는
   coverage matrix를 추가한다.

존재하지 않는 `createRoseChart` facade를 새로 만들거나 `createBoxPlot({ color })`를 호환 option으로 받아들이는 방식은
추천하지 않는다. 이는 knowledge gap을 public API 확장으로 감추며 현재 scope와 architecture 경계를 불필요하게 바꾼다.

## 봉인된 증거

Evidence root: `.artifacts/llm-eval/systematic-recipe-smoke-a44d3d4e/`

- Files: 14
- Evidence-tree digest: `7c354effa4e9204eb0ef08cf543a2f9082ee412710d8c59c891182fb691e913f`
- B result JSONL: `82f2b33583715147fb220a063b0e450031cb72af3cbf975a42edaff474e87c30`
- Box trace: `ba4025274b047f573dcd4dcc6ca4bf86c65b6cb8670a6bdd746fe9dc3e504df5`
- Composition trace: `60abcaea0b0653d849f3381f132a122662c0737fe50024cf08e553160905012e`
- Renderer-parity trace: `67618fa48e6b934bf47ea92b05e8ab68432f72e85c9cc640c8d754df61606f5c`
- Renderer-parity Canvas/PNG: `a29fcaeb61658720d27e92040a4095f61a9b9a94496e6d0d02a39ecfe615c45d`
- Renderer-parity SVG: `2551972832acaa8c5c54e7eaed8775d6e80d77b9e170826d33554374fb159a6f`
- Renderer-parity PDF: `f528a6592b508259f1ee9a446c8cb17cb3223d5bf6e6f834abfdb1e210dfad86`
- Sanitized result/trace/validation credential, raw-response와 reasoning-text scan: passed
- Condition C artifact directory: absent

Submitted source는 raw artifact root에만 보존하며 result review 문서나 sanitized trace에 복제하지 않는다.
