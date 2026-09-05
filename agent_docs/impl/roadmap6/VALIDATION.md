# Roadmap 6 — 검증과 Gate 증거

이 문서는 미래 구현의 acceptance plan이다. 이 기준을 작성했다는 사실은 테스트 통과를 뜻하지 않는다.
현재 계획 패키지의 실제 검증 기록은 [PLAN_VALIDATION.md](PLAN_VALIDATION.md)에 별도로 기록한다.
기준 감사는 [audit/README.md](audit/README.md)에 고정되어 있다.

## 검증할 세 가지 계약

1. **의미:** field/type/aggregate/group/normalization/method/units와 final grain이 사용자 의도와 일치한다.
2. **계층:** H0가 lower owner를 실제 호출하고, H2에서 시작해도 H3 편집까지 같은 결과에 도달한다.
3. **실행 표면:** runtime/type/contract/card/MCP/package가 같은 supported matrix를 설명한다.

현재 테스트를 모두 통과했다고 계층의 사용성까지 완성됐다고 판단하지 않는다.
반대로 정상인 role-specific default를 숫자가 다르다는 이유만으로 실패 처리하지 않는다.

## 공통 consumer matrix

각 새 facade·mark·encoding·layout은 다음 셀에 supported / unsupported with reason / N/A를 명시한다.
전부 지원한다고 선언할 필요는 없지만 빈 셀을 남겨서는 안 된다.

| 축 | 필수 비교 | 통과 기준 |
| --- | --- | --- |
| 진입 층위 | H0 complete, H1 layer, H2 mark/encoding, H3 edit | 같은 의도에 하위 독립 경로 존재 |
| 입력 역할 | horizontal/vertical, Cartesian/Polar/Parallel 중 실제 적용 범위 | role union과 runtime 일치 |
| Type | nominal/ordinal/quantitative/temporal, explicit/omitted | 정확한 지원·오류, any로 회피하지 않음 |
| Grain | raw row, grouped summary, final series/item, transform output | item/key/label/selection의 의미 일치 |
| Style | create/edit, constant/field, inherited/explicit | normalization과 conflict 정책 일치 |
| Lifecycle | create/edit/assign/remove/recreate | existence 규칙·idempotence·cleanup |
| 작성 순서 | geometry-first/style-first, category-first/measure-first | compatible intent의 semantic/graphic 수렴 |
| Resource 선택 | explicit/current/unique/ambiguous | 임의 첫 항목 선택 없음 |
| Data | original/derived/materialized/definition-only/new revision | provenance·ownership·consumer validation |
| Edit propagation | Canvas/scale/data/group/layout/filter/theme | 관련 consumer만 명시적으로 재생성 |
| Shared resource | 같은 scale/guide의 복수 mark | 일부만 stale하게 남지 않음 |
| Selection | raw/final item, empty, highlight, removal | identity와 current topology 일치 |
| Labels | raw field/aggregate/share, explicit source, layout replay | anchor·content·분모 일치 |
| Empty/error | invalid input, valid incomplete intent, legitimate empty view | 서로 다른 상태의 명확한 completion |
| Render | Canvas/SVG/PNG/PDF | concrete graphic 소비와 적용 범위 기록 |
| Package | default/basic/extension, browser/Node | 합의된 entry·bundle·runtime boundary 유지 |
| Discovery | exact action, chart intent, mark intent, combined intent | 올바른 complete chain 또는 unresolved |

## Numeric oracle

| 항목 | 고정할 independent oracle |
| --- | --- |
| Bar B01/B07 | category/measure 축을 바꾸어도 aggregate 값과 final group key 동일 |
| Pie | count/sum 분모, angle share 합, zero/missing 처리 |
| Rose | equal θ에서 θ(r²−r0²)/2 비율이 값 비율과 동일 |
| Radial bar | radius-length r−r0와 값 비율. Rose oracle와 구분 |
| Area | data-space baseline/lower/upper의 scale mapping과 closure |
| Stack | group/normalized/centered/diverging의 start/end·분모·negative policy |
| CI | [1,2,3] normal upper 3.131606527612, Student-t upper 4.48413771175라는 baseline 차이 |
| ECDF | ties [1,1,2,4]에서 0.5/0.75/1, monotone·0..1·declared weights |
| Label | final Bar/Pie item마다 하나, percentage의 분모는 partition 결과와 같음 |
| Diverging | asymmetric domain에서도 midpoint가 neutral mapping |
| Endpoint chart | start/end role과 concrete point/rule endpoints 일치 |
| Beeswarm | feasible case glyph intersection 0, measure coordinate 불변, slot bounds |
| Raincloud | density·summary·raw sample의 membership과 slot ownership 일치 |
| Facet/repeat | cell key/order/full-vs-observed 조합, shared domain과 legend 설명 일치 |

Oracle는 구현 함수 자체를 다시 호출하여 expected를 만드는 방식으로 작성하지 않는다.
Rounding/tolerance는 수학·renderer 차이에 맞춰 먼저 선언한다. CI 수치의 차이를 하나로 억지 통일하지 않는다.

## B01–B08 교정 acceptance

- B01: shortest vertical/horizontal, explicit aggregate, lower order permutation. 기존 mean 결과 유지.
- B02: area chart provider가 baseline/range를 실제 완성하거나 unresolved를 반환. valid rows에서 item0를 성공으로 표시하지 않음.
- B03: strip/rug/mark-only intent 구분, 위치와 item grain 확인.
- B04: radial-bar 요청에서 Cartesian Bar extra layer0, correct Polar coordinate.
- B05: definition-only 생성 자체는 유지, 소비 시 materialized-data domain error와 immutable failure.
- B06: Point/Bar false positive type, Rect 비교, Area/Arc의 현행 거부를 잘못 지원으로 바꾸지 않음.
- B07: temporal category가 두 방향의 runtime/type에서 동일 지원, invalid role negative type.
- B08: registered = direct ∪ internal; direct∩internal=∅; duplicate/orphan/missing0.

Baseline probe는 관측용이다. 수정 뒤에도 과거 오류가 계속 발생해야 통과하는 회귀 테스트로 복사하지 않는다.
실제 regression tests에는 새로운 기대 결과와 기존 호환 사례를 함께 넣는다.

## 계층과 immutable edit oracle

각 facade마다 다음 두 프로그램을 같은 input으로 만든다.

~~~text
A: H0 facade → H3 style edit → data/scale/Canvas edit
B: explicit H1/H2 chain → same H3 style edit → same edits
~~~

- 의미 있는 inferred decisions와 resource 관계가 같다.
- Concrete graphics와 render 순서가 같다. Trace 자체는 H0 wrapper가 있으므로 byte-equality 대신
  실제 child subsequence와 semantic ownership을 검증한다.
- 내부 ID가 facade 정책상 다르면 명시적으로 선언한 identity correspondence를 사용한다.
  임의 ID 정규화로 ownership 오류를 지우지 않는다.
- 이전 program snapshot·trace·caller-owned rows가 그대로다.
- 고의로 후반 consumer를 incompatible하게 만든 edit도 이전 상태를 전혀 바꾸지 않는다.
- 반복 desired-state assignment와 edit/remove/recreate가 documented lifecycle에 맞게 수렴한다.
- 의미 없는 raw semantic mutation으로 child trace를 우회하지 않는다.

## Visual target과 renderer 증거

저장소의 [roadmap 지침](../AGENTS.md)과 [chart cycle](../CHART_DEVELOPMENT_CYCLE.md)을 따른다.

1. Chart contract의 exact target public chain과 입력·dimension을 확정한다.
2. 기존 action으로 가능한 부분은 재사용하고, 아직 없는 부분만 세 primitive로 표현한다.
3. Primitive source와 rendered image를 같이 보여주고 해당 variant V 승인을 기록한다.
4. 승인 뒤 public flow를 구현하고 같은 manifest에서 두 프로그램을 실행한다.
5. Plot-region ink와 same-run decoded primitive/public PNG pixel equality를 검사한다.
6. Concrete structure와 Canvas calls, SVG/PDF에서 의미에 해당하는 geometry/text를 검증한다.
7. 승인된 source pair를 capability-oriented chart test owner로 옮긴다.

현재 검토 경로는 .artifacts/test/png/review/<chart>/<variant>/, 승인된 결과 경로는
.artifacts/test/png/charts/<capability>/<chart>/<variant>/다. Artifact는 gitignored지만 입력·프로그램·manifest·
expectations와 재현 명령은 commit한다. variant.json은 capability/chart/variant identity와 exact call을 포함하고,
완료된 roadmap/Phase/Gate identity를 영구 executable metadata로 남기지 않는다.

SVG/Canvas/PNG/PDF의 서로 다른 rasterizer pixels가 같아야 한다고 주장하지 않는다.
Same-run pixel equality는 동일 raster pipeline의 primitive/public 비교이며, renderer 간 검증은 같은 concrete
geometry, text, clipping, z-order와 contract-supported 결과를 비교한다.
아직 없는 public action을 V 이전에 실행했다고 기록하지 않는다.

## MCP와 discovery

- 기존 7개 감사 질의를 baseline regression fixture로 보존한다.
- 새 chart마다 exact name·보통 표현·combined requirement·비슷하지만 unsupported인 요청을 추가한다.
- Specific intent shadow, chart/mark/layer 구분, unrequested extra action0를 검사한다.
- Packet을 실제 synthetic data로 실행하여 coordinate, required channels, final grain/item count와 의미를 검사한다.
- Legitimate empty는 explicit contract가 있어야 한다. Nonempty만 검사하여 wrong chart를 통과시키지 않는다.
- Cards의 wraps/editableVia/units/supports가 actual runtime/trace에 맞는지 검증한다.
- Default packet size, read-only local MCP, no browser dependency leakage라는 현재 경계를 유지한다.
- 새 correctness corpus와 추가 조합 시나리오를 사용한다. 기존 평가 결과를 새 효율 개선 증거라고 부르지 않는다.
- 이번 로드맵에 유료 모델 호출은 필수가 아니다. 필요하다면 모델·corpus·비용·hard cap을 별도 결정한다.

## Type와 package/docs

Positive type cases와 negative @ts-expect-error cases는 실제 runtime boundary를 반영한다.
Bar horizontal/temporal, false style, discriminated role options, mutually exclusive content/anchor modes,
unknown option, invalid target/mode를 우선한다. 넓은 any·index signature로 통과시키지 않는다.

각 conceptual change는 source/tests/types/Current/index/card/public docs/examples/generated artifacts를 함께 검증한다.
기존 source-owned catalog generator를 사용하고 generated catalog를 손으로 고치지 않는다.
신규 API를 basic entry에 넣는 것은 자동 결정이 아니다. Browser import와 현재 size ceilings를 확인한다.

## 검증 명령과 실행 범위

현재 저장소에 존재하는 commands를 사용한다. 정확한 focused test 파일은 구현 owner에 맞춰 선택한다.

~~~sh
node --test test/contracts/agent-docs-navigation.test.js
npm run contracts:catalog:check
npm run contracts:cards:check
npm run test:unit
npm run test:contracts
npm run test:charts
npm run test:render
npm run test:browser
npm run test:realistic
npm run test:docs
npm run test:package
npm run package:check
npm run package:bundle
~~~

매 documentation edit마다 전체 renderer/package suite를 반복하지 않는다.
Focused 검증으로 시작하고 public behavior·geometry·package 경계에 영향을 준 범위에만 누적 검증을 넓힌다.
실행한 명령·exit code·counts·commit을 기록하고, 실행하지 않은 검증은 미실행으로 쓴다.
CI나 기존 테스트 결과를 현재 변경의 검증 결과로 재사용하지 않는다.

## 현재 source owner를 찾는 경로

| 목적 | 현재 소유권 출발점 |
| --- | --- |
| Facade와 Bar 교정 | [charts](../../../src/actions/charts/), [position policies](../../../src/actions/encodings/position/policies/) |
| Group/appearance/layout | [encodings](../../../src/actions/encodings/) |
| Data/transform | [data actions](../../../src/actions/data/), [grammar](../../../src/grammar/) |
| Axis/legend/text | [guides](../../../src/actions/guides/), [marks](../../../src/actions/marks/) |
| Cross-consumer edit | [materialization](../../../src/materialization/) |
| Theme/layout | [theme](../../../src/theme/), [layout](../../../src/layout/) |
| Types | [program declarations](../../../types/program.d.ts) |
| Discovery | [knowledge](../../../knowledge/), [action index](../../contract/ACTION_INDEX.json) |
| Macro boundary | [SECOND_ARCHITECTURE](../../SECOND_ARCHITECTURE.md) |

새 module/file 이름은 public contract가 확정된 뒤 현재 source organization에 맞춰 결정한다.
Roadmap 문서가 제품의 executable dependency가 되어서는 안 된다.

## Gate evidence와 closeout

Ready-for-review package에는 exact verified source commit과 remote ref, 실행 가능한 public/source chain,
semantic 결과, focused/누적 test, compatibility/docs 영향, 시각 대상이면 실제 image가 있어야 한다.
승인 근거가 없으면 approved로 기록하지 않는다.

Phase 종료 시 assigned action/capability는 Current 또는 명시적 처분을 가져야 한다.
이미 승인된 Planned는 구현하여 Current로 옮기거나 사용자 결정에 따라 Maybe Future/삭제를 기록한다.
아직 승인되지 않은 Proposed는 그 상태와 후속 판단 이유를 유지한다.
최종 X는 명시적 구현 범위의 closure를 확인하며 PR/merge/publish/deploy 승인과 구분한다.
