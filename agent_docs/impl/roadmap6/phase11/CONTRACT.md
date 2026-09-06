# Roadmap 6 Phase 11 A — Integration discovery and closeout contract

## 기준과 승인

- Baseline/source ref: `d012d6a1f6714254aaa9f96761d4e2f0654026e6`.
- 범위: R6-P11-W1, W2, W4와 D20, 그리고 Roadmap 6 전체 원장 closeout.
- [전체 실행·0.0.13 릴리즈 승인](../APPROVAL.md)이 Phase 11 A/X와 필요한 card/package/browser 한도 조정에 적용된다.
- 새 chart 의미, action, renderer 또는 시각 결과를 추가하지 않는다. 이번 변경은 이미 Current인 surface를 정확히
  분류하고 실제 실행과 대조하는 discovery 계약이다.

## 현재 불일치

1. 234개 direct action card는 exposure layer와 domain만 기록한다. H0–H4 authoring role이 없어 완성 차트와
   mark, style, extension primitive가 검색 결과에서 같은 층위로 보인다.
2. 상위 action이 실제로 호출하는 public child와 생성 후 사용할 편집 action을 card가 설명하지 않는다.
   `selectMarks`와 `editMarkSelection` 같은 lifecycle 연결도 이름 검색에 의존한다.
3. Basic/default package 지원, option의 단위, selector/auto 추론, deferred completion이 서로 다른 개념인데 현재
   `signature`, `resources`, prose에 흩어져 machine-readable하게 구분되지 않는다.
4. Roadmap 6 원장에는 Phase 6–10과 해당 finding이 여전히 planned/proposed로 남아 현재 source와 어긋난다.

## Action-card schema v3

Collection과 개별 card의 `schemaVersion`을 3으로 올린다. 기존 v2 필드는 그대로 유지하고 모든 direct card에
다음 필드를 필수로 추가한다.

```ts
type AuthoringRole = "H0" | "H1" | "H2" | "H3" | "H4";
type EntryPoint = "default" | "basic";
type InferenceStrategy =
  | "explicit"
  | "explicit-or-current"
  | "explicit-current-unique-or-error"
  | "documented-auto"
  | "documented-default";
type CompletionState = "complete" | "deferred" | "contextual" | "not-applicable";

interface ActionCardV3 extends ActionCardV2 {
  authoringRoles: readonly AuthoringRole[];
  wraps: readonly string[];
  editableVia: readonly string[];
  supports: { entryPoints: readonly EntryPoint[] };
  units: readonly {
    path: string;
    unit: "logical-pixel" | "degree" | "angle" | "ratio" | "probability" |
      "count" | "calendar-unit" | "temporal-input" | "data-value" | "band-fraction";
  }[];
  inference: readonly {
    input: string;
    strategy: InferenceStrategy;
  }[];
  completionRequirements: {
    state: CompletionState;
    requires: readonly string[];
    allowsEmpty: boolean;
  };
}
```

- 배열은 stable order와 unique value를 가진다. `wraps`/`editableVia`는 존재하는 direct action 이름만 참조한다.
- `supports.entryPoints`는 runtime export와 matching declaration이 모두 있는 package entry만 기록한다.
  `extension`은 action 집합이 아니라 extension authoring 도구 entry이므로 action 지원 값으로 쓰지 않는다.
- 빈 `wraps`, `editableVia`, `units`, `inference`는 “없음/해당 없음”을 뜻하며 누락을 뜻하지 않는다.
- Card당 UTF-8 JSON 한도는 실제 증가량을 측정한 뒤 최소 여유로 조정한다. 전체 artifact, browser bundle과 installed
  package도 기존 release 검증에서 실제 값을 기록한다.

## H0–H4 분류

- H0: complete chart와 multi-chart composition 결정을 한 호출로 소유하는 facade.
- H1: 통계·집계·reference·composite 분석 layer를 소유하는 action. 통계 plot facade는 H0과 H1을 함께 가진다.
- H2: dataset, mark, encoding, scale, coordinate처럼 chart 의미와 mapping을 직접 정의하는 action.
- H3: 기존 resource의 style/layout/guide/selection/lifecycle을 편집하는 action. 의미 encoding editor는 H2와 H3을
  함께 가질 수 있다.
- H4: `editSemantic`, `createGraphics`, `editGraphics` extension primitive만 해당한다.

분류는 action 이름의 prefix 하나로 결정하지 않는다. Domain 기반 기본값과 사람이 검토한 예외 목록을 한 생성 source에
두고, 허용 vocabulary·미분류 0·H4 exact set을 contract test로 고정한다. Internal wrapped action은 기존
`ACTION_INDEX.json.internal` category 전체 집합과 runtime registry를 다시 대조하며 direct card로 승격하지 않는다.

## `wraps`와 `editableVia`

- `wraps`는 한 action trace의 **immediate direct public child**만 기록한다. Internal materializer branch를 따라 내려가
  incidental rematerialization action을 수집하거나 모든 transitive descendant를 펼치지 않는다. 따라서 H0 facade의
  명시적 child action과 H2→H4 primitive 경계가 보이고 rematerializer 세부 구현은 card payload를 오염시키지 않는다.
- Smoke/generated lifecycle corpus의 모든 direct action occurrence에서 같은 projection을 수집한다. Card가 주장한 edge가
  실제 trace에 없거나, corpus에서 관측한 direct child edge가 card에서 빠지면 실패한다.
- `editableVia`는 그 action이 만든/선택한 stable owner를 이후 직접 바꾸거나 제거하는 public action만 기록한다.
  `ACTION_INDEX.lifecycle/update`, exact action 존재, 생성→편집→재materialization fixture를 함께 대조한다.
- Aggregate facade는 모든 transitive editor를 나열하지 않는다. Facade가 감싼 child가 `wraps`로 먼저 연결되고 각
  child card가 자기 `editableVia`를 소유한다. 예외적으로 facade 전체를 원자적으로 편집하는 action만 facade card에 둔다.

## 지원, 단위, 추론과 완성

- `supports.entryPoints`는 default/basic program declaration의 exact method set과 runtime prototype method set을 각각
  비교한다. Primitive와 advanced action을 Basic으로 과장하지 않는다.
- `units`는 숫자라는 이유만으로 추측하지 않는다. Current contract가 정한 logical pixel, fixed degree,
  explicit degrees-or-radians angle, ratio/probability,
  count, calendar/temporal input, data value와 band fraction만 option path에 연결한다. `innerRadius` ratio와
  `padAngle` degree, temporal input의 `auto|year|timestamp`를 서로 다른 단위로 유지한다.
- `inference`는 output ID 같은 단순 식별자를 제외한다. Optional target/data/source/coordinate/scale selector의
  explicit→current→unique→error, explicit/current, 명시 전용, `"auto"`, documented default를 구분한다. Type에
  `undefined`가 있다는 사실만으로 추론을 주장하지 않고 Current 계약과 executable ambiguity/error case가 있어야 한다.
- `completionRequirements.state="complete"`는 호출 자체가 완성된 의도 결과를 소유할 때, `deferred`는 유효한 owner를
  저장하지만 후속 역할이 있어야 geometry가 생길 때, `contextual`은 기존 resource에 적용되는 action일 때 사용한다.
  `not-applicable`은 H4 primitive처럼 domain completion을 주장하지 않는 경우다.
- `createBoxPlot`과 `createGradientPlot`은 `deferred`, 필요한 x/y 역할과 source/canvas를 `requires`에 기록한다.
  Empty dataset/view가 계약상 유효한 action만 `allowsEmpty:true`다. Nonempty graphic을 completion의 보편 판정으로 쓰지 않는다.

## W2 실행 검증

- 같은 action inventory에서 H0 시작 facade, 공개 child chain, H2 시작 chain과 H3 edit를 연결한 matrix를 생성한다.
  모든 H0 card는 실제 primitive/public equivalence 또는 기존 stable chart evidence에 도달해야 한다.
- 234 direct action, runtime registered direct+internal partition, strict declarations, Current anchors, generated public docs,
  schema/card, task resolver와 MCP resource를 함께 검사한다.
- Generated lifecycle와 realistic corpus는 action/card option coverage, child trace, immutable failure, completion과 legitimate
  empty 판정을 실행한다. Canvas/SVG/PNG/PDF renderer는 기존 concrete `graphicSpec`만 소비하는 경계를 유지한다.
- Fresh packed tarball에서 default/basic/extension, cards/schema/task resolver, MCP stdio와 renderer entry를 실행한다.
  Package SHA-256, packed/unpacked bytes, browser gzip과 MCP cold-start를 결과 문서에 기록한다.

## W4 원장과 closeout

- `PROPOSALS.json`의 Phase 6–10, work package, gate와 finding 처분을 실제 Phase 결과 ref에 맞춘다. Phase 11 X 전에는
  Phase 11과 D20을 completed로 표시하지 않는다.
- 승인 범위 B01–B08, D01–D20, F01–F19는 X에서 모두 `implemented-verified` 또는 명시적인 Current 제한/제외 처분과
  evidence를 가져야 한다. F20은 scope decision의 excluded 상태로만 보존한다.
- Planned direct action/capability 0, unresolved hidden deferral 0, stale active pointer 0을 확인한다. Roadmap 완료 시
  `activeRoadmap`/`activePhase`를 null로 바꾸고 last-completed owner를 Roadmap 6 Phase 11로 이동한다.
- 이 단계에는 새 시각 target이 없어 V Gate가 필요하지 않다. 기존 시각 evidence를 재실행하되 새 appearance 승인을
  주장하지 않는다.

## 종료 검증

- Focused schema/generator/relationship/type/MCP tests 뒤 unit, contracts, charts, docs, browser, realistic, coverage,
  package consumer와 release-candidate 검증을 실행한다.
- Source, generated artifacts, docs와 package가 byte/check 모드에서 일치해야 한다. 카드 관계 assertion이 실제 trace나
  Current contract보다 넓으면 metadata를 줄이거나 실행 evidence를 보강하며 추정으로 통과시키지 않는다.
- 검증된 source와 closeout을 각각 commit/push하고 [GATES.md](GATES.md)에 exact remote ref와 실제 결과를 기록한다.
