# Roadmap 5.3 Phase 6 — Gate S Paired Pilot Analysis

## 결론

Gate S는 exact 12 runs를 안전하게 완료했지만 correctness는 **5 / 12**였고, harness observability에도 결함이 있었다.
따라서 이 pilot은 provider·비용 guard가 작동한다는 증거와 correction 입력으로만 보존한다. MCP가 docs보다 효율적이거나
정확하다는 product benefit은 이 결과에서 주장하지 않는다.

## Immutable execution identity

| 항목 | 값 |
| --- | --- |
| Candidate | `7b9e4f484aa653bf806b3a70a4e5df9cbe57e850` |
| Gate record | `d08ae9f280d7de80cc4f5966755372ada213def0` |
| Approval SHA-256 | `4c825c0546e947221af0173bd13d644a407274dc1e64999c1255244341a3e4f5` |
| Corpus SHA-256 | `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c` |
| Documentation SHA-256 | `bf57efce712d92a145485290d2ae9b6576620e56c418352829fa7ef1029908ba` |
| Installed package SHA-256 | `2751c4b86ac8c08d5853b81fe20cf23ddb8a32b6251415079b3683b1bbe533f2` |
| Structured surface SHA-256 | `825789ee27ec3e2c6ce3e112232d138cf7cdbf1e93be96283c320ad9c80b6527` |
| Manifest SHA-256 | `57af8987165035ef355688788420c52f780315f01af03ce8fc0622f75ebb8795` |
| Results SHA-256 | `1645cb11974ad1800f399273f18510c99030aa04017095ab39e3deb49be67922` |
| Summary SHA-256 | `0a19007ab5d3cfde1a92aef1a73a1a1580261a0bb712c73be0a2d440957d702a` |

Raw artifacts는 `.artifacts/llm-eval/paired-pilot/r53-p6-s-20260808/`에 보존한다. 이 문서는 raw result나 summary를
새 규칙으로 다시 써서 과거 결과를 바꾸지 않는다.

## Result matrix

| Task | A docs | B direct | C MCP | D docs + MCP |
| --- | ---: | ---: | ---: | ---: |
| Sized scatter | pass | pass | pass | pass |
| Bottom color + opacity legends | fail | fail | fail | fail |
| Horizontal line + histogram composition | fail | pass | fail | fail |

- Completed runs: **12 / 12**
- Valid programs: **5 / 12**
- Model calls: **55**
- Total tokens: **201,637**
- Estimated spend: **$0.3886566 / $3.00**
- Unreported-cost upper bound: **$0**
- Provider, timeout, model mismatch and safety stop: **0**

성공 pair가 task 하나뿐이므로 B/C, A/C와 A/D efficiency 수치는 일반화할 수 없다.

## Root causes

### 1. Harness observability and fairness

- Condition A의 docs search/read 결과는 route를 반환했지만 structured `kind:id`가 아니라는 이유로 retrieval failure로
  집계됐다.
- Maximum knowledge calls가 model prompt에 보이지 않았다. Attempted call은 총 37회로 theoretical executed ceiling 36을
  넘었지만 rejected call과 실제 실행 call이 분리되지 않았다.
- 매 repair가 같은 `program.mjs`를 덮어썼고 trace는 runtime error 내용을 숨겨 repair progression을 재구성할 수 없었다.
- A/B/C/D adapter가 top result, inline `primaryResource`, supplementary docs의 사용 순서를 충분히 구체적으로 설명하지 않았다.

### 2. Composition retrieval and authoring

- `compose grouped time series and histogram horizontally`에서 개별 chart 단어가 강하게 매칭되어 line-chart가 structured
  search 1위가 됐다. Composition recipe는 default top six에도 들지 못했다.
- 모든 recipe의 일반 alternative에 있는 `composing`이 검색 신호를 오염했다.
- B는 두 번째 검색에서 composition을 찾아 `hconcat`으로 성공했지만 A/C/D는 `group` option,
  `chart().concat(...)`, `composeCharts` 같은 비공개 API를 추측했다.

### 3. Bottom multi-legend guidance

- B/C/D는 bottom margin을 210–230px까지 늘렸지만 legend `offset`을 충분히 주지 않아 x-axis title과 계속 충돌했다.
- 기존 runtime error는 “more bottom-margin space”라고만 말해 잘못된 repair를 반복시켰다. Bottom margin은 legend를 담고,
  offset이 plot·x-axis title과 legend 사이 거리를 만든다는 구분이 public docs와 recipe에 없었다.
- A는 task-specific legend route를 읽지 못한 채 지원되지 않는 `createLegend({ scale: ... })`를 추측했다.

## Unpaid corrections

| Commit | Correction |
| --- | --- |
| `d1dc9d64` | Docs retrieval accounting, attempted/executed/rejected calls, visible call budget, exact per-submission programs/errors, condition-specific retrieval guidance |
| `19446ef3` | Compound composition-layout intent boost for structured and docs search, with facet exclusion and paraphrase locks |
| `02d437cc` | Executable bottom two-legend example, offset-aware runtime repair error, composition API warning, synchronized generated knowledge/docs |

Corrected search는 실패 문장과 paraphrases에서 composition을 1위로 반환한다. Corrected legend example은 640×400 Canvas,
120px bottom margin과 동일한 52px offset을 가진 color/opacity block을 실제로 materialize한다. 수정된 harness는 각 submission
source와 bounded runtime error를 별도 artifact로 보존한다.

## Decision boundary

위 correction은 기존 Gate S 통계를 소급 변경하지 않는다. Complete unpaid suite와 exact package/docs/MCP artifact를 새
candidate에서 고정한 뒤에만 동일한 3 tasks × A/B/C/D confirmation pilot을 별도 비용 Gate로 제안할 수 있다. 그 전에는
credential read, external model call, PR preparation, merge, publish, deployment와 release가 모두 차단된다.
