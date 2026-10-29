# 저장된 배치 편집

## `editLayout`

- Signature: `editLayout({ target?, order?, options?, node? })`.
- Full chart-authoring action이며 hierarchy, graph와 calendar layout이 같은 facade를 공유한다. 명시 target, current eligible layout, 유일한 layout 순으로 선택하고 ambiguity/missing은 오류다. Scoped target은 기존 composition 프로토콜을 따른다.
- layout의 기존 method는 유지한다. options는 해당 method의 저장된 options에 부분 병합한다. method 변경, empty edit, explicit undefined, unknown fields는 거부한다. Graph는 nonempty options 또는 아래 단일 node patch를 요구하며 hierarchy 전용 order를 받지 않는다.
- Hierarchy order와 method별 옵션은 [HIERARCHY.md](HIERARCHY.md#layouthierarchy), graph method별 옵션은 [GRAPHS.md](GRAPHS.md#layoutgraph), dag/cyclic flow 옵션은 [FLOWS.md](FLOWS.md#layoutflow)와 [calendar 옵션](CALENDAR.md#layout-lifecycle-and-composition)이 소유한다. Radial tree를 vertical/horizontal로 바꾸면 radius/startAngle/sweep를 제거한다.
- 완성된 layout과 모든 기존 plot consumer를 검증한 뒤 `editSemantic`으로 next revision을 기록한다. Hierarchy plot은 기존 wrapped materialization을 명시 호출한다. Graph layout은 numeric resource를 만들고, flow layout이면 node/link/label consumer를 preflight한 뒤 각각 wrapped materialization으로 갱신한다. Canvas 배치와 source layout intent는 독립적이다.
- 실패 시 이전 program·입력·trace는 그대로 유지한다. Codec 복원은 저장된 결과와 exact input binding을 검증하고 layout solver를 재실행하지 않는다. Calendar 복원은 source와 저장된 cell/month 결과를 bounded 결정적 검산으로 확인하며 결과를 대체하지 않는다. Layout 제거는 공통 `removeResource` dependency 계약을 따른다.

- `node:{key:RowKey,x:number,y:number}`는 현재 graph node 하나를 이동한다. Fixed는 해당 positions, force는 해당 pinned 항목을 갱신하며 나머지와 dormant source 좌표를 보존한다. x/y는 layout-local finite 좌표다. options/order와 동시 지정할 수 없고 circular/flow/hierarchy/calendar는 거부한다. Force는 기존 deterministic solver를 다시 계산하므로 다른 unpinned node도 움직일 수 있다. Route·GraphPlot·label·selection 소비자를 기존 revision closure로 갱신한다.
- Node evidence: `test/unit/interaction-node-move.test.js` 및 graph-coordinate-revisions 회귀.

### Formal values — `editLayout`

- Implemented: `editLayout(options: TargetedOptions<EditLayoutOptions>): ChartProgram`.
- Planned: 이 action의 추가 값 없음.
- Proposed (NOT IMPLEMENTED): layout method conversion.

### Value coverage — `editLayout`

- ✅ Covered: explicit/current/unique/ambiguous targets, hierarchy/graph dispatch, partial edits, immutable failure, exact revisions, composition scope and stored restoration.
- Evidence: `test/unit/resources/hierarchy-resources.test.js`, `test/unit/resources/graph-layouts.test.js`, `test/contracts/hierarchy-types.test.js`, `test/contracts/observed-graph-types.test.js`.
