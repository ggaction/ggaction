# Roadmap 6 Phase 1 — 실행 증거

아래 결과는 이 branch에서 실행한 검증이다. 기준 감사는 수정하지 않는다. Phase의 완료·승인 상태는
[GATES.md](GATES.md)가 소유하며, 구현 완료가 다음 Gate의 승인을 뜻하지 않는다.

## W1 — Bar pair-role와 temporal 선언

- 변경: `createBarPlot({ x: "value", y: "category" })`가 category y를 먼저 작성한 뒤 기존 x position
  owner의 mean 추론을 사용한다. 세로는 기존 x→y 순서를 유지한다. 공통 bar category predicate를 재사용한다.
- 호환성: 기존 explicit mean lower chain과 semantic/graphic output이 동일하다. Canvas resize와 mark opacity
  edit 뒤에도 동일하고 입력 options·source program을 바꾸지 않는다. 새로운 visual target은 없다.
- 타입: temporal y category와 time scale을 허용한다. category의 aggregate/stack 및 band scale을 허용하지 않는다.
- 변경 전 새 regression: 3 실패 / 기존 10 통과. 변경 후 focused bar + grammar tests: 14/14 통과.
- `node --test test/unit/actions/charts/*.test.js`: 45/45 통과.
- `npm run test:contracts`: 255/255 통과. 61개 nested scale path의 259개 literal 조합을 실제 실행하며,
  추가된 `createBarPlot.y.scale.type = time`을 명시적으로 확인한다.
- `npm run test:package`: exit 0. 설치된 package의 strict TypeScript positive/negative, root/basic import,
  browser bundle, renderer entry와 MCP consumer를 확인했다.
- 문서: Current BASIC_CHARTS, public basic charts와 action reference source, generated reference/search/LLM/types를 동기화했다.
- 원장: B07 구현·검증 완료. B01의 facade 실패 P35는 교정했지만 P37 lower measure-first는 D14 / R6-P2-W5의
  incomplete-authoring 계약에 남긴다. B01 전체와 Phase 1 X를 완료로 표시하지 않는다.
- 재현 환경: Node 22.23.1 / npm 10.9.8 / macOS arm64. Temp/cache/browser 경로는 이 저장소의
  `.artifacts/repository-study/` 하위로 고정했다. 실행 로그는 `.artifacts/roadmap6-authoring/bar-*.log`에 있다.

## W2 — Definition-only data 소비

- 기준 commit: `89ba9824` (W1), remote branch `codex/roadmap6-hierarchical-actions`.
- 변경: 공통 `requireMaterializedDataset` selector를 facade/ordinary mark data 선택에 적용했다.
  Explicit/current ID의 값이 없으면 해당 ID, materialized values, value-producing data action을 설명하는 Error를 낸다.
- B05 before: Scatter/Point가 `undefined.length` TypeError, 일부 lower mark는 빈 collection을 만들고 후속 소비까지 지연했다.
  After: chart 8종·mark 9종의 explicit/current 선택에서 같은 precondition을 적용하며 원래 program 전체와 trace를 보존한다.
- 유지: `createDerivedData`의 provenance-only 정의, internal rebind, 명시한 materialized source의 우선순위,
  `filterData` 결과 소비, materialized empty array. 자동 실행과 임의 source fallback을 추가하지 않았다.
- 새 regression 변경 전: 2 실패 / 1 통과. 변경 후 `npm run test:unit`: 1,567/1,567 통과.
- `npm run test:contracts`: 255/255 통과.
- 문서: Current CORE/MARKS/BASIC_CHARTS, source-and-derived/action-reference와 generated reference/search/LLM 동기화.
  Runtime definition-only 경계를 변경하지 않아 public declaration 변경과 새 visual target은 없다.
- 원장: B05 구현·검증 완료, Phase 1 X 검토 대기. 로그는 `.artifacts/roadmap6-authoring/derived-*.log`.

## W3 — stroke:false 정합성

- 기준 commit: `d1c0262d` (W2). Runtime을 변경하지 않고 private shared `FilledMarkStroke` alias로 Point/Bar의
  create/edit와 Scatter point·Bar/Histogram bar appearance 선언을 정합화했다. 새 public export는 없다.
- 변경 전 strict TS probe: runtime이 허용하는 5개 Point/Bar/facade 호출을 잘못 거부했다. Rect는 이미 통과했다.
- 변경 후 package consumer: root/basic의 positive 호출, true/numeric stroke·unknown option negative,
  Area/Arc creation의 기존 false 거부를 포함하여 `npm run test:package` exit 0.
- Runtime 회귀: Point/Bar/Rect의 create/edit convergence, false outline width 0, 위치 완성·resize 후 유지,
  facade forwarding, 잘못된 입력의 immutable failure. Focused mark tests 38/38 통과.
- `npm run test:contracts`: 255/255 통과. Current BASIC_CHARTS/MARKS, public marks/action reference,
  generated cards/actions/signatures/types/search/LLM 동기화. 기존 render 동작만 검증하므로 V는 적용 대상 없음.
- 원장: B06 구현·검증 완료, Phase 1 X 검토 대기. 로그는 `.artifacts/roadmap6-authoring/stroke-*.log`.

## W4 — MCP chart closure와 phrase 우선순위

- 기준 commit: `de1fd0ec` (W3). B02는 `chart.area.baseline`, B03는 `chart.strip.placement`를 unresolved로
  명시한다. Strip chart intent를 raw Tick intent에서 분리해 Point scaffold를 선택한다. 새 public chart API를 만들지 않는다.
- Area의 secondary position, Strip의 measure/category/constant placement는 이 generic template가 결정하지 않는다.
  비어 있거나 위치 없는 scaffold는 완료 결과가 아니다. Raw Area/Tick mark 요청은 기존 lower operation으로 유지한다.
- B04: `radial bar chart`와 `polar area chart`의 겹친 일반 Bar/Area phrase만 shadow한다.
  `radial bar chart and bar chart`처럼 독립적으로 요청한 두 chart는 모두 생성한다.
- 새 chart alias가 regression의 lower Point dependency를 대신 선택하지 않도록 기존 canonical dependency builder를 재사용했다.
- 감사의 7개 query를 `node agent_docs/impl/roadmap6/audit/mcp-execution.mjs`로 재실행: Pie arc 3, Density area 1,
  Rose arc 2, Radial arc 2, Radar line 1. Area 0과 Strip unpositioned points 3은 각각 위 unresolved를 보고한다.
  Radial의 Cartesian layer는 1→0이다. 원본 감사 파일은 유지하고 replay artifact에 기록했다.
- D01의 positive-minimum radius 문제는 여기서 고치지 않았다. Rose/Radial의 최소값 항목 누락은 Phase 4에 남는다.
  영구 closure regression은 value 0을 포함한 데이터로 유효한 zero-radius/slice omission과 nonempty geometry를 확인한다.
- `compact-task-resolver.test.js`: 20/20 통과. 7 packet 실행, mark grain·coordinate·필수 encoding·불필요 layer,
  raw-mark 구분, bounded fallback, strict TypeScript template와 deterministic closure를 검증한다.
- `npm run test:contracts`: 258/258 통과. `npm run test:package`: exit 0 (installed MCP/direct byte equality 포함).
- 문서: architecture의 packet v4/의미 경계, MCP public 설명, generated taxonomy/search/LLM 동기화.
  추가 모델 호출 없음. B02/B03/B04 교정·검증 완료, 새로운 완성 chart는 F05/F08/F04 owner에 남는다.
