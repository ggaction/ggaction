# Phase 2 — A package 검증과 구현 acceptance

이 문서는 A 검토 시점의 baseline과 구현 acceptance를 보존한다. 기준은
`bbc8a3fc256c9afa877f696ed6ade1f51ffb7522`이며 구현 후의 실제 결과는 [RESULTS.md](RESULTS.md)가 소유한다.
승인할 public delta와 범위는 [CONTRACT_REVIEW.md](CONTRACT_REVIEW.md)가 소유한다.

## 이번 package에서 실행한 검증

| 검증 | 실제 결과 |
| --- | --- |
| Phase 1 승인 기록 뒤 navigation test | 7/7, exit 0; 승인 기록 commit `bbc8a3fc`에 반영 |
| `node agent_docs/impl/roadmap6/phase2/baseline.probes.mjs` | 43/43 관측과 저장 JSON 일치; 모든 input program/trace 불변 |
| 아래 12개 기존 test file | 100/100, fail/skip 0 |
| Review local routes/anchors | `agent-docs-navigation.test.js` 7/7, exit 0 |
| 원장 | 47 findings / 46 work packages / 12 phases, Phase 1 X approved, Phase 2 A는 미승인 |
| `git diff --check` | whitespace 오류 없음 |

Baseline probe의 rejected는 예상한 현재 동작을 재현했다는 뜻이며 버그 수정 성공을 뜻하지 않는다.
Probe는 source tree와 source/types diff를 검사해 다른 runtime에서 frozen baseline을 덮어쓰지 못하게 한다.
`--record`는 해당 review snapshot을 새로 쓰는 용도이며 일반 검증은 flag 없이 실행한다.
Probe 수정 중 Rule 참조 호출에 필요한 explicit fieldType을 보완했고, 최종 43건 전체를 다시 실행했다.
Baseline JSON과 source는 git에 포함한다. `.artifacts`의 로컬 로그만으로 원격 재현을 대신하지 않는다.

```sh
node --test \
  test/unit/actions/charts/basic-chart-facades.test.js \
  test/unit/actions/charts/bar-histogram-facades.test.js \
  test/unit/actions/guides/guide-collection-actions.test.js \
  test/unit/actions/encodings/line-series-encodings.test.js \
  test/unit/actions/encodings/line-series-lifecycle.test.js \
  test/unit/actions/encodings/grouped-bar-width-encoding.test.js \
  test/unit/actions/marks/edit-line-mark.test.js \
  test/unit/actions/error-bands/edit-error-band.test.js \
  test/unit/actions/regression/create-regression.test.js \
  test/unit/actions/regression/edit-regression.test.js \
  test/unit/actions/data/time-unit-data.test.js \
  test/unit/actions/encodings/temporal-x-encoding.test.js

node agent_docs/impl/roadmap6/phase2/baseline.probes.mjs
node --test test/contracts/agent-docs-navigation.test.js
git diff --check
```

기존 test 로그: `.artifacts/roadmap6-authoring/phase2-baseline-focused.log`.
Temp/cache/browser는 이 저장소 `.artifacts/repository-study/` 아래를 사용한다.

누적 suite 2,329/2,329, contracts 259/259, focused render 2/2, installed consumer exit 0은
[승인된 Phase 1 결과](../phase1/REVIEW.md)에 있는 검증이다. Phase 2 package에서 source/types/runtime를
변경하지 않았으므로 이를 baseline으로 참조하고 새 구현 결과로 세지 않는다. 이번 A 준비에서 새 visual
primitive, public target render, 새 API runtime/TypeScript 검증, full browser/coverage/docs build는 실행하지 않았다.

검토 package commit: `e06b57db5624a5b0d66cea425cff4aa5f5f4caad`, 위 remote branch에 push했다.

## 구현 acceptance matrix — A 검토 시점의 요구사항

각 행은 최소 acceptance이며, 구현하면서 실제 source owner를 따라 필요한 negative case를 추가한다.
통과·승인된 것으로 미리 표시하지 않는다. 테스트는 최종적으로 capability-oriented `test/`에 두고
완료된 roadmap의 executable source를 product test가 import하지 않게 한다.

| 범위 | Positive oracle | 실패·호환성 oracle | 수명주기 / 후속 consumer |
| --- | --- | --- | --- |
| W1 완성 facade | 9개 관련 owner의 자동/explicit/false matrix; Scatter→Line에 guide 한 벌 | 다른 scale/coordinate/family/symbol recipe는 conflict; explicit style 충돌; no first-match | resize, shared scale domain edit, guide title/style 보존 |
| W1 부분 guide | line-only/ticks-only/labels-only의 가능한 상태에서 missing component만 생성 | low-level repeated create는 여전히 오류; unsupported child option 유지 | existing component semantic/config/graphic 불변, actual child trace |
| W1 deferred owner | Box/Gradient 위치 전 items 0, 완료 후 생성; Box omitted guide 0 | invalid pair 즉시 거부, duplicate completion guide 없음 | 뒤늦은 position, composite edit, rematerialization |
| W2 단일 group | country 4 series, continent 2 color; field width/opacity 각각 series 1값 | series 내부 2값, missing/null/non-scalar/negative width 거부 | group/color 순서 교환, reassign, createLinePlot lower-chain 일치 |
| W2 tuple group | country/scenario 8 series; single array는 single field와 동일 | `[]`, 중복 field, field+fields, delimiter collision, number/string/boolean 구별 | group 배열 입력 불변, semantic fields path, tuple→single→tuple, group removal |
| W2 path family | Cartesian direct/temporal aggregate/binned/Polar Line; ordinary ranged Area | centered/stack/fill·density·horizon·statistical owned group의 unsupported tuple 명시 | pathOrder, category/order, scale edit, width/dash/opacity/color legend, selection/highlight |
| W2 implicit 호환 | 기존 group 없는 color-only/dash-only와 same-field 조합 결과 유지 | 서로 다른 implicit color/dash에는 explicit group 요구 | style가 분석 partition을 바꿔선 안 되는 예제는 explicit group으로 고정 |
| W3 Line width/opacity | constant와 field mode 모두 지원; field→value→field 수렴 | value+field, constant fieldType/scale, invalid ranges, ambiguous target | 해당 channel legend만 정리, shared scale 다른 consumer 유지, highlight replay |
| W3 Scalar 충돌 | field 없는 Point/Line/Rule 편집과 생성 style lower parity | Line width/opacity, Point opacity, Rule field width/dash/opacity scalar edit 오류 | 실패 전 program/options/trace deep equality; 대안 encode value 성공 |
| W3 Scatter radius | radius 0/5, 생략 default; root/basic와 lower encodePointRadius 일치 | radius+size, negative/nonfinite/unknown option 거부 | basic 실제 child 등록, installed TS/runtime, root alias/removal 유지 |
| W3 Rule facade | createRuleMark scalar fields와 editRuleMark의 실제 encoder child 조합 | empty edit, non-Rule/ambiguous target, invalid style/field 충돌 | incomplete Rule에도 config 보존, 위치 완성 후 style, resize, ErrorBar owner 구분 |
| W3 ErrorBand | remove color→constant fill→fill:false→field color, truthful encoding/legend | field-active scalar fill와 constant-active encodeColor 거부; unknown reset sentinel 거부 | statistics revision/owned boundaries/curve/opacity 편집과 resize 뒤 유지; 다른 legend 보존 |
| W4 groupBy:false | Regression false=기존 explicit undefined 결과; JSON 전후 동일 | explicit undefined JS 호환, omitted inference, editor undefined 오류 유지 | Density/Horizon도 표의 false·omitted·edit preserve, stale group/color/selection 검증 |
| W4 temporal | `[1000,2000]` year/auto/timestamp exact UTC 값; temporal binding 전 경로 | non-temporal unit, invalid year/date/timestamp/string/false, wrong scale literal | scale domain/mark geometry/encoding selector/guide formatting 일치, unit reassignment와 shared scale |
| W4 transform input | TimeUnit/Horizon의 input mode와 normalized output timestamp | output collision/invalid unit/range 기존 validation 유지 | generated owned bindings 재해석 방지, raw-field selector 원본 보존, serialization |
| W4 분석 defaults | numeric color nominal, Bar mean, ordinal numeric explicit override | schema unknown-key 기존 거부; mean→sum 자동 변경 없음 | semantic/child args/cards에 실제 default 설명, old explicit aggregate unchanged |
| W5 incomplete Bar | 양방향 measure/category 순서 × band/pixel width 순서 수렴 | missing field/invalid width 즉시 오류; complete invalid role pair; histogram에 width 조용히 무시 금지 | resize, remove/reassign positions, Box range 예외, histogram pending count, no placeholder items |

### Trace·불변성·실행 증거

- 성공·실패 모두 source program과 caller arrays/options를 보존한다. Selection이나 guide가 사용하는
  의미를 파괴하는 교체는 사전 검증하거나 동일 owner의 atomic lifecycle로 처리한다.
- Thin facade는 기존 wrapped child actions를 호출한다. 동일한 normalization/math를 새 facade에 복제하지 않는다.
- 서로 다른 action 순서의 trace는 같을 필요가 없다. 의미·graphic 수렴과 실제 trace 계층을 각각 검사한다.
- Primitive 숫자/좌표 oracle는 product materializer를 그대로 호출해서 만들지 않는다. 독립 source partition,
  축 domain, style 값과 explicit lower chain을 구분해 사용한다.

### Types·metadata·package

- `editRuleMark` direct 등록, 필요한 internal wrapped method 등록, direct/internal 전체집합 guard.
- New tuple union positive/negative, temporalUnit의 temporal-only discriminated union, false opt-out,
  ErrorBand `fill:false`, Scatter radius와 Rule style 선언을 설치된 package에서 검증한다.
- Root/basic에서 이미 허용된 method는 같은 동작을 제공한다. Basic `encodePointRadius` 추가와 내부 alias
  등록을 실제 bundling/runtime에서 확인한다. Root-only Rule/statistics/opacity를 basic에 잘못 노출하지 않는다.
- Current/API/card v2/options/reference/LLM/MCP snippet 일치와 false completion 부재.
  Role·support·units 설명을 먼저 맞추되 전수 machine schema 변경은 D20 owner에 남긴다.
- 변경에 필요한 unit/contracts/consumer 검증 뒤 `npm test`, `npm run test:contracts`,
  `npm run test:package`, 해당 render pairs를 실행한다. 새 실패나 미해결 근거 없이 같은 전체 검증을 반복하지 않는다.

### Visual과 X

V1은 새 group/appearance series, V2는 explicit temporal meaning을 검토한다. 하위 reference와 출력 동등한
교정만 V N/A가 가능하며 구현 결과로 입증한다. 새 Line opacity field variant도 V1 style matrix에 포함한다.
승인 target마다 단일 manifest·source·actual image·plot ink, 같은 실행의 decoded pixel equality와 concrete
graphic parity를 보관한다. X에는 verified commit, 실행한 명령/결과, 남은 finding/work package를 기록한다.
V/X의 명시적 승인이 없는데 Phase 2를 completed로 표시하지 않는다.
