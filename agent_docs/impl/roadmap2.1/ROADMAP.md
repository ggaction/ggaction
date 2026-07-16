# Roadmap 2.1 — External Evaluation Corrections

## 목표

Roadmap 2.1은 `ggaction@0.0.2` 외부 평가에서 확인된 F-001~F-007을 공개 문서가 약속한 동작을
기준으로 수정하는 corrective hardening roadmap이다. Roadmap 3의 신규 기능 개발과 분리하며, 기존 public
signature를 유지하고 재현 하나만 통과시키는 특수 처리 대신 공유 capability의 원인을 수정한다.

평가 근거는 다음 위치에 있다.

```text
/Users/hj/Desktop/ggaction_test/0.0.2/reports/final.md
/Users/hj/Desktop/ggaction_test/0.0.2/findings
/Users/hj/Desktop/ggaction_test/0.0.2/reproductions
```

## 진행 상태

- [x] External report, F-001~F-007과 executable reproductions 검토
- [x] `ggaction@0.0.2`에서 F-001~F-007 독립 재현
- [x] 현재 source, tests, types와 public docs의 원인 후보 대조
- [x] F-007 — 음수·0 aggregate bar baseline과 domain 수정
- [ ] F-001 — ranged/aggregate bar 기본 width와 materialization completion 수정
- [ ] F-002A — horizontal ranged-area color dispatch 수정
- [ ] F-002B — horizontal error-band boundary direct-path composition 수정
- [ ] F-003 — standalone size legend eligibility와 guide inference 수정
- [ ] F-004 — interval-aware temporal tick formatting 수정
- [ ] F-005 — `createDerivedData` public input/type/documentation contract 보강
- [ ] F-006 — public state inspection schema와 runnable docs 보강
- [ ] 전체 외부 reproduction, ggaction suite, docs/browser/render/package verification 통과
- [ ] Roadmap 2.1 closeout와 corrective release candidate evidence 작성

## 공통 실행 규칙

각 finding은 하나의 작은 conceptual change로 구현하고 다음 순서를 반복한다.

```text
현재 최소 재현을 failure oracle로 고정
→ 공유 원인 수정
→ 최소 재현에서 파생된 repository regression 추가
→ 관련 family matrix 실행
→ 전체 ggaction test/coverage/browser/render/docs/package 실행
→ 외부 F-001~F-007 reproductions 전체 재실행
→ commit과 push
```

정상 결과를 만들 수 있는 documented 조합은 정상 동작으로 복구한다. 지원할 수 없는 조합은 state를 바꾸기
전에 해결 가능한 validation error를 내며, empty graphic이나 잘못된 geometry를 성공으로 반환하지 않는다.

## F-007 — Negative and zero aggregate bar baseline

### 재현과 원인

- 재현됨: mixed-sign grouped bar의 zero value가 non-zero height를 가지며, all-negative에서 `-9`가 `-2`보다
  짧다. `zero: true`도 mixed-sign 결과를 바꾸지 않는다.
- `src/materialization/bars/grouped.js`가 baseline을 `yScale.domain[0]`으로 고정한다.
- `src/materialization/bars/aggregate.js`도 overlay baseline으로 measure-domain 하한을 사용한다.
- `src/grammar/seriesLayout.js`의 group/overlay domain input은 값만 반환해 semantic baseline `0`을 scale
  resolution에 포함하지 않는다.
- 결과적으로 scale-domain policy와 rectangle endpoint policy가 분리되어 같은 layout 의미를 공유하지 않는다.

### 수정 범위

- group/overlay partition의 semantic endpoint를 공통 series-layout policy가 `{ start: 0, end: value }`로 소유한다.
- automatic domain은 group/overlay endpoint에 포함된 0을 사용한다. `zero: false`는 scale resolver가 별도로
  zero를 강제하지 않는다는 뜻이며, bar layout 자체의 semantic baseline을 제거하지 않는다.
- grouped와 overlay materializer는 domain 하한이 아니라 같은 resolved baseline `0`을 사용한다.
- explicit domain 또는 scale type이 baseline 0을 표현할 수 없으면 extrapolated/clipped bar를 만들지 않고
  preflight validation error를 낸다.
- transformed scale, reversed range, vertical group/overlay와 지원되는 horizontal overlay에도 같은 policy를 적용한다.

### 회귀 테스트

- positive-only, mixed-sign, all-negative, exact-zero × group/overlay/diverging numeric matrix.
- zero item은 zero size 또는 명시적 omission, 음수/양수는 0의 반대 방향, absolute magnitude ordering 검사.
- auto domain, `zero: true/false`, explicit domain과 incompatible transformed scale 검사.
- Canvas resize, `editScale`, color/layout rematerialization 뒤 endpoint 관계 유지.
- 이전 program과 caller-owned input 불변성.

### 호환성과 문서

Public signature 변경은 없다. Positive-only aggregate bar의 auto-domain과 geometry는 zero baseline을 포함하도록
달라질 수 있으므로 observable corrective change로 release notes에 기록한다. Scale 문서에는 aggregate bar의
semantic zero endpoint가 `zero` option보다 우선하며, incompatible explicit domain은 오류라는 규칙을 명시한다.

## F-001 — Ranged bar silent empty output

### 재현과 원인

- 재현됨: category + `encodeYRange` 직후 rect count가 0이고 `encodeBarWidth` 뒤에만 row count와 같아진다.
- `src/actions/marks/bar/materialize.js`는 aggregate/ranged grain에 stored `barWidth`가 없으면 length를 0으로
  만든다.
- `src/materialization/marks.js`도 같은 조건을 materialization eligibility로 사용한다.
- 그러나 `src/grammar/bars/geometry.js`에는 이미 canonical `{ band: 0.72 }` default가 있어 completion policy만
  이를 소비하지 않는 상태다. 같은 원인은 width를 생략한 aggregate bar에도 적용된다.

### 수정 범위

- complete aggregate/ranged bar는 explicit width가 없어도 canonical default width로 materialize한다.
- `canMaterializeBar`, `rematerializeBarMark`와 concrete width resolution이 하나의 completion/default policy를
  공유한다.
- `encodeBarWidth`는 필수 completion action이 아니라 default를 override하는 appearance action으로 유지한다.

### 회귀 테스트

- vertical category + `encodeYRange`, horizontal category + `encodeXRange`의 shortest valid chain.
- width 없는 aggregate bar도 complete encoding 직후 non-empty인지 검사.
- default `{ band: 0.72 }`와 후속 `{ band }`/`{ pixels }` override geometry 비교.
- Canvas resize, scale edit, color edit 뒤 cardinality와 width 유지.
- incomplete encoding은 empty pending mark를 허용하되 complete mark가 silent empty가 되지 않는지 구분한다.

### 호환성과 문서

Signature 변경 없이 문서가 이미 암시한 default 동작을 복구한다. Encodings/bar reference에 default width가
aggregate와 ranged grain 모두에 적용되고 `encodeBarWidth`는 override임을 명시한다.

## F-002 — Horizontal error-band composition

### 재현과 원인

- 재현됨: statistical/explicit horizontal band + grouped overlay color는 density-only stack error, explicit
  horizontal boundaries는 line-x compatibility error를 낸다. Vertical control은 통과한다.
- Color subproblem: `src/actions/encodings/color.js`의 ranged-area 판정이 `y2`만 검사해 horizontal `x2`를 일반
  area layout companion 경로로 잘못 보낸다.
- Boundary subproblem: `createErrorBandBoundary`가 ordinary line encodings를 조립하지만 explicit source에는
  interval-transform provenance가 없다. Horizontal quantitative x/y boundary가 public ordinary-line 제한에 막힌다.
- `canMaterializeLine`은 quantitative pair를 처리할 수 있으므로 concrete line renderer가 아니라 authoring
  eligibility/provenance 경계의 문제다.

### 수정 범위

- F-002A: area range orientation을 판정하는 pure helper를 하나 두고 color layout validation과 companion dispatch가
  `x2`/`y2`를 대칭적으로 사용한다.
- F-002B: generated composite boundary에 일반화된 internal direct-path role/provenance를 기록하고 line position
  policy가 이 capability를 명시적으로 허용한다. Error-band ID나 field name을 검사하는 특수 처리는 두지 않는다.
- Boundary는 owning band의 data, coordinate, scales, grouping과 curve를 계속 공유하고 trace에서 wrapped line
  component로 남는다.

### 회귀 테스트

- statistical/explicit × vertical/horizontal × grouped/ungrouped matrix.
- color 없음/동일 group overlay color의 area path count, fill, scale와 semantic stack absence 검사.
- `boundaries: false`/default/object와 quantitative/temporal independent position 검사.
- lower/upper boundary path count, shared scale, grouping, curve와 concrete commands 검사.
- failed preflight의 program/input 불변성과 기존 vertical output 보존.

### 호환성과 문서

Public signature 변경은 없다. 문서화된 horizontal 조합을 복구하며, error-band page에 horizontal color + boundary
runnable example을 추가한다. Internal direct-path role은 public ordinary-line capability로 노출하지 않는다.

## F-003 — Standalone point-size legend

### 재현과 원인

- 재현됨: size-only point에서 explicit/inferred `createLegend`가 실패하고 `createGuides()`는 size guide를
  조용히 생략한다. Color+shape가 추가된 composite control만 성공한다.
- `createLegend` point candidate가 shape와 color 계열 scale을 전제로 한다.
- `createSizeLegend`의 point resolver도 color+shape를 eligibility로 요구한다.
- `createGuides`의 legend applicability predicate에 standalone size가 없다.

### 수정 범위

- `point + quantitative size.scale`을 standalone size-legend의 canonical eligibility로 정의한다.
- Explicit `channels: ["size"]` dispatch를 categorical fallback보다 먼저 처리한다.
- Omitted target은 unique eligible point만 추론하고 복수 후보는 명확한 ambiguity error를 유지한다.
- `createLegend`, `createSizeLegend`, `createGuides`가 같은 internal resolver/applicability predicate를 사용한다.
- Existing color+shape+size composite dispatch와 layout은 그대로 유지하고 explicit size-only 요청과 구분한다.

### 회귀 테스트

- size-only explicit target/channels/count, unique inferred target, automatic `createGuides`.
- multiple size points의 omitted-target ambiguity와 explicit-target success.
- size-only + unrelated legend candidate, color+shape+size composite와 `channels: ["size"]` override.
- equal-area radius ordering, label ordering, default count 5와 Canvas resize/rematerialization.

### 호환성과 문서

Additive behavior이며 signature 변경은 없다. Existing composite call은 유지한다. Legend page에 standalone size
example과 omitted/explicit target 규칙을 추가한다.

## F-004 — Temporal axis duplicate labels

### 재현과 원인

- 재현됨: month/day span에서 distinct tick positions가 중복 문자열로 표시되고 hour control은 정상이다.
- `timeTicks`는 calendar interval을 선택하지만 `formatTimeTick`은 선택 interval을 받지 않고 전체 domain span만
  사용한다. Tick generation과 formatting 사이에 precision contract가 없다.

### 수정 범위

- Pure temporal tick plan이 values와 selected calendar interval을 함께 소유하게 한다. 기존 `timeTicks` consumer는
  values wrapper로 유지할 수 있다.
- Auto formatter는 selected interval 또는 실제 tick spacing보다 낮은 precision을 선택하지 않는다.
- Axis labels와 temporal continuous legend가 같은 formatter contract를 사용한다.
- Explicit format string은 현재 우선순위와 결과를 유지한다.

### 회귀 테스트

- year/month/day/hour/minute/second span의 distinct auto labels.
- UTC year/month boundary, leap day, 서로 다른 month length, reversed/single-value domain.
- explicit `%Y`, `%Y-%m`, `%Y-%m-%d` 보존.
- Canvas resize와 axis rematerialization 뒤 text 안정성, temporal legend 대조군.

### 호환성과 문서

Public option/signature 변경은 없다. Auto label text만 더 구체적으로 바뀌는 corrective behavior다. Axis 문서에
auto format이 selected tick interval을 구별할 최소 precision을 사용한다고 명시한다.

## F-005 — `createDerivedData` input contract

### 재현과 원인

- 재현됨: docs에는 배열/schema 예제가 없고 object input은 non-empty-array error, array input은 성공한다.
- Runtime은 `validateDatasetTransforms`의 discriminated validators를 사용하지만 `createDerivedData` declaration은
  `ActionOptions = Record<string, unknown>`이다.
- ACTION_INDEX는 이 action을 intentional user-facing immutable create-only resource로 분류하므로 public 목록에서
  조용히 제거하는 것보다 advanced direct action으로 계약을 완성하는 편이 호환성이 높다.

### 수정 범위

- `CreateDerivedDataOptions`와 documented public `DatasetTransform` discriminated union을 선언한다.
- `transform`은 non-empty readonly array임을 타입과 문서에서 일치시킨다.
- Action reference와 data API page에 runnable filter example, 지원 transform 표, provenance-only effect와 대응
  high-level actions를 설명한다.
- Internal/generated transform discriminant는 public authoring vocabulary와 분리하고 runtime accepted schema와
  contract inventory의 차이를 명시적으로 정리한다.

### 회귀 테스트

- Documented filter example의 JavaScript 실행과 TypeScript strict compile.
- 각 documented transform branch의 최소 valid value와 invalid discriminant/type mismatch.
- Empty/object transform runtime error와 non-empty array success.
- Transform array와 nested caller-owned objects 불변성.
- ACTION_INDEX/current contract/generated catalog/reference/LLM docs consistency.

### 호환성과 문서

Method와 runtime signature는 유지하고 types/docs를 구체화하는 additive change다. 기존 high-level data actions를
ordinary path로 계속 권장하며 `createDerivedData`는 advanced provenance assembly로 분류한다.

## F-006 — Public state inspection schema

### 재현과 원인

- 재현됨: generated public docs에는 `graphicSpec.objects`와 `semanticSpec.layers` exact access path가 없지만 runtime
  state에는 존재한다.
- Runtime과 declaration에는 top-level shape가 있으나 concept docs가 의미 설명에 머물러 executable inspection
  path와 stable/generated ID 경계를 설명하지 않는다.

### 수정 범위

- ChartProgram concept page에 explicit user IDs를 사용하는 runnable JS/TS inspection example을 추가한다.
- `semanticSpec.datasets/layers/scales/coordinates`, `graphicSpec.objects/order`, object `items/children`,
  `trace.children`의 의미와 stability boundary를 표로 정리한다.
- User-chosen semantic IDs와 system/generated graphic IDs를 구분하고 generated component ID에 대한 과도한
  장기 의존을 경고한다.
- Troubleshooting에서 renderer success와 mark cardinality/finite geometry 검사를 구분한다.

### 회귀 테스트

- Docs example의 JS 실행과 TypeScript compile.
- Point/bar/line에서 documented cardinality path가 actual state와 일치.
- Generated LLM docs에 canonical paths와 stability warning 포함.
- Jekyll build, links/search, desktop/mobile docs smoke test.

### 호환성과 문서

Runtime/API 변경은 없다. 이미 public인 state의 inspection contract와 stability 범위를 문서화한다.

## 공유 근본 원인

1. **Completion/eligibility가 여러 곳에 분산됨** — F-001의 bar completion, F-003의 legend dispatch와 guide
   applicability가 서로 다른 predicate를 사용한다. 각 capability마다 한 canonical resolver를 둔다.
2. **Orientation을 한쪽 channel 존재 여부로 판정함** — F-002의 `y2`-only check처럼 vertical 성공 경로가 horizontal
   contract를 대신하고 있다. Range orientation을 pure helper와 matrix test로 소유한다.
3. **Semantic layout endpoint와 concrete geometry가 분리됨** — F-007에서 scale domain과 bar baseline이 다른
   policy를 사용한다. Layout partition이 endpoint를 소유하고 scale/materializer가 함께 소비해야 한다.
4. **Silent incomplete output을 성공으로 취급함** — F-001 empty rect, F-003 omitted guide, F-007 wrong baseline은
   renderer 성공만으로 검출되지 않는다. Complete semantic resource의 cardinality와 value-to-geometry invariant를
   회귀 테스트에 추가한다.
5. **Tests가 positive/vertical/composite happy path에 편향됨** — F-002, F-003, F-007은 orientation, standalone
   eligibility와 signed-data matrix가 빠져 있었다. Public family마다 sign/orientation/unique-vs-ambiguous 축을 검토한다.
6. **Public name은 있으나 executable input/output shape가 없음** — F-005와 F-006은 action/state 이름을 문서화했지만
   runnable schema가 없다. Canonical reference는 signature, minimal example, state effect와 inspection path를 함께
   제공한다.

## 구현 순서

1. **F-007**: 잘못된 데이터 의미를 먼저 수정하고 bar baseline/domain invariant를 고정한다.
2. **F-001**: 같은 bar family에서 default completion과 silent-empty invariant를 고정한다.
3. **F-002A → F-002B**: orientation helper를 먼저 만든 뒤 color와 boundary composition을 각각 독립 commit으로
   수정한다.
4. **F-003**: legend eligibility를 canonical resolver로 통합한다.
5. **F-004**: temporal tick plan과 auto formatter precision을 통합한다.
6. **F-005 → F-006**: types/input contract와 state-output discoverability를 별도 conceptual changes로 보강한다.
7. **Closeout**: external reproductions의 기존 failure assertions를 새 version expectation으로 반전해 검증하고,
   package/docs/browser/PNG evidence와 corrective release candidate를 준비한다. 실제 publish는 별도 승인 전 실행하지
   않는다.

## 완료 조건

- F-001~F-007 최소 재현이 documented expected behavior로 반전된다.
- 각 finding에서 파생된 regression이 repository test suite에 존재한다.
- 전체 unit/contract/chart/docs/browser/render/package/coverage suite가 통과한다.
- External reproduction 전체를 매 finding 뒤 재실행한 기록이 남는다.
- Public types, action contract, generated catalog, docs와 runtime behavior가 일치한다.
- Roadmap 2.1의 corrective work는 Roadmap 3 신규 feature inventory에 섞이지 않는다.
