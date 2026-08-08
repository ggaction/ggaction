# Roadmap 5.3 Phase 6 — Gate T Paired Confirmation Analysis

## 결론

Gate T는 exact 12 runs를 안전하게 완료했고 Gate S에서 발견한 retrieval·accounting·submission 보존 결함과 composition
routing 실패도 닫았다. 그러나 correctness는 **8 / 12**였고 bottom multi-legend task가 A/B/C/D 모두 실패했다. 따라서
confirmation acceptance는 실패이며 full benchmark, PR/merge 또는 LLM-friendly benefit claim으로 넘어가지 않는다.

## Immutable execution identity

| 항목 | 값 |
| --- | --- |
| Candidate | `ce24e1b9da7c8603f7d0da9cf390b8adb914a406` |
| Gate record | `233896bcdbc3847194ada076c4db4d31dfdf2980` |
| Approval SHA-256 | `959662f4ac23d890a18d9976098b022e431eaeb1e148904c9013c6f7da24e635` |
| Corpus SHA-256 | `aaac35d26f5ea022743a0cf9cb07312136ff8cd14a32ede7d36a9f267454e59c` |
| Documentation SHA-256 | `6a0b2c6994df000486a94da588f43a9cd7c2666ea64999717252df6eb8f8cd4e` |
| Installed package SHA-256 | `fcbf44166872bfcef99d8dcb317f6fe4c726a88354c2019ac6f22c46346855f3` |
| Structured surface SHA-256 | `825789ee27ec3e2c6ce3e112232d138cf7cdbf1e93be96283c320ad9c80b6527` |
| Manifest SHA-256 | `62f114ef8cce7b5e51187e27bea637ae34f5917d59b5f5841c622e2a461ff508` |
| Results SHA-256 | `249255ed5a17d6fdb7d21ea646b796d7262108f0419f1e8416e6e07f7a386f68` |
| Summary SHA-256 | `cc5c1dc30ebc4e468326c76418ddcef2d1866223313f5b289c9bdb887eda7fb1` |

Raw artifacts는 `.artifacts/llm-eval/paired-pilot/r53-p6-t-20260808/`에 보존한다. 이 문서는 raw result나
summary를 새 규칙으로 다시 계산해 과거 결과를 바꾸지 않는다.

## Result matrix

| Task | A docs | B direct | C MCP | D docs + MCP |
| --- | ---: | ---: | ---: | ---: |
| Sized scatter | pass | pass | pass | pass |
| Bottom color + opacity legends | fail | fail | fail | fail |
| Horizontal line + histogram composition | pass | pass | pass | pass |

- Completed runs: **12 / 12**
- Valid programs: **8 / 12**
- Estimated spend: **$0.3774452 / $3.00**
- Provider, timeout, model mismatch, usage와 cap failure: **0**
- Retrieval success: **12 / 12**
- Attempted knowledge calls는 각 run에서 `executed + rejected`와 일치했고 executed call은 승인 ceiling 이하였다.
- 각 submission source, SHA, runtime error와 validation evidence가 별도 artifact로 보존됐다.

Scatter와 composition은 모든 condition에서 통과했다. Gate S composition correction은 provider 환경에서도 확인됐지만,
legend가 전 condition에서 실패했으므로 성공한 두 task만으로 transport/product efficiency를 일반화하지 않는다.

## Bottom multi-legend root cause

### 1. Public docs의 executable-looking example이 claimed geometry를 만족하지 않았다

Condition A는 exact `/api/legends/#bottom-multi-legend-row` route를 읽고 문서의 640×400 Canvas, 120px bottom margin,
52px offset, five-sample opacity block을 그대로 사용했다. Program은 build됐지만 두 block의 합산 너비가 540px plot에 맞지
않아 opacity block이 다음 row로 wrap됐다. Strict oracle은 left-to-right order, title/symbol alignment, inter-block gap와 plot
offset을 정확히 실패시켰다.

기존 focused test는 config와 item count만 확인했고 “one bottom row” geometry를 strict oracle로 검증하지 않았다. 따라서
Gate S correction 문서의 “실제로 materialize한다”는 표현은 build 성공만 뜻했고 claimed one-row 결과를 입증하지 못했다.

### 2. Recipe가 bottom creation에 안전하지 않은 post-edit 순서를 가르쳤다

Structured recipe의 primary example은 top legend 두 개를 기본 spacing으로 생성한 뒤 마지막에
`editLegendLayout(...)`을 호출한다. B/C/D는 이 순서를 bottom task에 옮겨 첫 `createLegend`에는 안전한 offset을 주지 않고
마지막 edit에만 52px을 지정했다. ggaction action chain은 즉시 실행되므로 첫 create에서 x-axis title collision이 발생해
뒤의 edit는 실행될 수 없다.

세 condition 모두 repair에서 bottom margin과 마지막 edit offset을 70–110px까지 늘렸지만 failing create call을 바꾸지
않아 같은 runtime error를 반복했다. 기존 error는 어느 operation에 offset을 설정해야 하는지 알려주지 않았다.

### 3. Width와 clearance는 서로 다른 제약인데 guidance가 하나만 설명했다

- `offset`과 bottom margin은 x-axis guides를 피하고 Canvas 안에 row를 담는다.
- `count`, `columns`, plot width와 label widths는 여러 block이 같은 row에 들어가는지를 결정한다.

기존 docs/recipe는 첫 항목만 부분적으로 설명했고 52px을 일반적인 safe value처럼 제시했다. Actual Cars fields에서는
`count: 3`, explicit three-column color block과 larger offset이 함께 필요하다. Local strict-oracle probe에서
640×400, bottom margin 120, offset 69, color columns 3, opacity count 3 조합은 모든 legend validation을 통과했다.

### 4. Benchmark repair feedback가 geometry를 설명하지 않았다

Runtime failure는 같은 한 줄 error만 반환했고 validation failure는 `failed-validation:<id>` 목록만 반환했다. Model은
block bounds, wrap 여부, current gap 또는 failing operation을 볼 수 없어 같은 source를 다시 제출했다. Oracle 자체는
잘못된 row를 정확히 거부했지만, repair loop의 diagnostic payload가 부족했다.

## Required unpaid corrections

1. Public bottom-row example을 actual Cars-sized geometry에서도 one row와 strict oracle을 만족하는 options로 고친다.
2. Recipe에 creation-time placement, immediate chain execution, width/count/columns와 clearance/margin의 독립 제약을 명시한다.
3. Collision error가 현재 failing create/edit call에 offset을 적용해야 함을 말하도록 고친다.
4. Claimed public example을 frozen task의 exact strict oracle로 실행하는 contract test를 추가한다.
5. Benchmark validation feedback에 measured block/plot geometry를 추가하되 oracle 기준은 약화하지 않는다.
6. Generated knowledge, docs search, llms artifacts와 current contract를 동기화하고 complete unpaid suite를 다시 실행한다.

## Decision boundary

Gate T raw 결과와 비용은 수정하지 않는다. 위 unpaid corrections가 complete suite에서 검증되고 새 candidate가 고정되기 전에는
credential read나 external model call을 하지 않는다. 이후에도 같은 task의 provider confirmation은 새 비용 Gate와 별도 사용자
승인이 필요하다.

## Unpaid correction completion

Correction code candidate는 `5be79c124dd46404566d882532c51b41f7b4a44b`로 고정했다.

| Commit | Correction |
| --- | --- |
| `32eee952` | Bottom-row public example을 offset 69, color columns 3, opacity count 3으로 수정하고 actual Cars strict-oracle regression 추가 |
| `96740b3e` | Failed legend validation에 block bounds, aligned rows, gaps와 repair direction을 bounded diagnostic으로 전달 |
| `8e07c254` | Separate color+opacity multi-legend intent를 structured direct/MCP search 1위로 고정 |
| `5be79c12` | Docs-only search를 bottom/top multi-legend section으로 edge-aware routing |

무과금 검증 결과:

- `npm test`: **2,174 / 2,174 pass**
- `npm run test:docs`: **45 / 45 pass**
- Focused evaluator, paired repair, search와 MCP contracts: pass
- `knowledge:check`, `docs:search:check`, installed-package MCP check: pass
- Installed-package MCP direct payload와 protocol transport byte equality: pass
- Corrected 640×400 actual-Cars program은 legend count/position/order/title/symbol/label-gap/inter-block-gap/plot-offset를 모두 pass
- Mock paired repair는 count 5 submission을 strict oracle로 reject하고 measured geometry를 다음 call에 전달한 뒤 count 3만 pass
- Credential read / external model call / additional spend: **0 / 0 / $0**

Gate T의 성공 task를 다시 소비하지 않고 bottom multi-legend만 A/B/C/D 한 번씩 확인하는 새 비용 Gate가 다음 경계다.
