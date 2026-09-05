# R6-P1-X — 기존 오류 교정 결과 검토

상태: **ready-for-review**. Phase 1의 W1–W5 구현·검증은 끝났으며 사용자 결과 승인은 아직 없다.
이 검토는 F01–F19의 새 API나 시각 target을 승인하는 절차가 아니다.

## 정확한 코드와 범위

- 검증한 source commit: [`d72e7062fd2e0fb378b2b93843eeeb84baa2e28e`](https://github.com/ggaction/ggaction/commit/d72e7062fd2e0fb378b2b93843eeeb84baa2e28e).
- Remote: `origin`, branch `codex/roadmap6-hierarchical-actions`.
- 검토 package commit: `a7d2ec5afc450b46d7b9a4caf96c6f42e54d5641`, remote push 확인.
- 기준 구현 전 commit: `064ef4ff8c22ce2c083dde5f5dd908464c8e6304`.
- 범위: Bar facade 추론·temporal 타입, definition-only data 소비 오류, Point/Bar stroke 타입,
  MCP의 미완성 chart 안내와 phrase 중첩, internal action inventory.
- 수정은 각각 독립적으로 검증하고 commit/push했다. 상세 결과는 [RESULTS.md](RESULTS.md)에 있다.

| 작업 | Commit | 결과 |
| --- | --- | --- |
| W1 / B01 facade, B07 | `89ba982416cecfc4c016a6ee29e0da3f49d66288` | 가로 shorthand mean 추론과 temporal y type 정합성 |
| W2 / B05 | `d1c0262d3ee19bd3c4a780e0b6548c7989a9be19` | chart/mark 공통 materialized-data precondition |
| W3 / B06 | `de1fd0ecb57fe83522280cff241b40d54522f004` | Point/Bar와 facade의 stroke:false 타입·문서 정합성 |
| W4 / B02–B04 | `2e8db0e40788d8380ac4afaea36f7845ef1fda5a` | Area/Strip unresolved, Polar phrase의 중첩 일반 chart 제거 |
| W5 / B08 | `d72e7062fd2e0fb378b2b93843eeeb84baa2e28e` | direct 173 + internal 111 = wrapped 284의 전체 집합 검사 |

## 사용자가 확인할 동작

다음은 위 source commit의 package가 구현한 공개 API다. 동일한 source에서 각 결과는 독립적으로 생성된다.

```javascript
import { chart } from "ggaction";

const base = chart().createCanvas({
  width: 800, height: 600,
  margin: { top: 80, right: 100, bottom: 100, left: 180 }
})
  .createData({ id: "rows", values: [
    { category: "A", value: 2, when: "2025-01-01" },
    { category: "A", value: 4, when: "2025-01-01" },
    { category: "B", value: 3, when: "2025-02-01" }
  ] });

const horizontal = base.createBarPlot({ x: "value", y: "category" });
// 이전: aggregate가 없다는 오류. 현재: A=3, B=3인 가로 평균 Bar.

const temporal = base.createBarPlot({
  x: { field: "value", aggregate: "sum" },
  y: { field: "when", fieldType: "temporal", scale: { type: "time" } }
});
// 기존 runtime 지원에 TypeScript 선언도 맞춘다.

const noOutline = base.createBarPlot({
  x: "category", y: "value", bar: { stroke: false }
});
// Runtime의 기존 false 지원을 TypeScript와 문서도 허용한다.

const pending = base.createDerivedData({
  id: "pending", source: "rows",
  transform: [{ type: "filter", field: "category", oneOf: ["A"] }]
});
// pending.createScatterPlot({ x: "value", y: "value" })는
// pending dataset의 materialized values가 필요하다는 Error를 낸다.
// 정의 저장은 성공하며 자동 transform 실행과 source fallback은 하지 않는다.
```

MCP의 `area chart`는 `chart.area.baseline`, `strip plot`은 `chart.strip.placement`를 unresolved로 보고한다.
Scaffold 실행이 성공하거나 Point item이 존재하는 것만으로 완성 chart라고 안내하지 않는다.
`radial bar chart`는 Polar arc만 생성한다. `radial bar chart and bar chart`는 두 요청을 모두 유지한다.
Raw `area mark`와 `tick mark`는 독립된 lower operation이다.

## 실행한 검증

검증 환경은 Node 22.23.1 / npm 10.9.8 / macOS arm64다. 임시 파일·npm cache·Playwright browser는
저장소 `.artifacts/repository-study/` 아래 경로를 사용했다.

| 검증 | 실제 결과 |
| --- | --- |
| `npm test` — unit/contracts/charts/gates/docs | **2,329/2,329**, 실패·skip 0 |
| 최종 `npm run test:contracts` | **259/259** |
| W4 `npm run test:package` | exit 0, strict positive/negative·installed MCP/direct byte equality 포함 |
| `node scripts/run-tests.js render chart:jobs-horizontal-grouped-bar chart:cars-temporal-bar-line` | **2/2**, plot-region ink와 같은 실행의 primitive/public PNG equality |
| `node scripts/generate-action-catalog.js --check` | exit 0 |
| 원래 MCP 감사의 7개 query 재실행 | B02/B03 미해결 명시, B04 extra Cartesian layer 0 |
| 이 문서의 예제와 추적 원장 검증 | 예제 실행 성공, 47개 finding/46개 work package 양방향 연결 일치, F20 제외 유지 |

W4 이후 W5는 package에 포함되지 않는 internal manifest/문서와 테스트만 바꿨다. 따라서 설치 소비자에서
검증한 runtime·declarations·cards·resolver는 최종 source와 같다. 전체 browser/realistic/coverage sweep와
Jekyll 배포 build는 이번 교정에서 별도 실행하지 않았다. 배포·PR·package publish는 이 검토의 대상이 아니다.

새 시각 디자인은 없다. W1의 성공 출력은 기존 explicit mean lower chain과 semantic/graphic parity가 있으며
resize·style edit 뒤에도 일치한다. W3는 runtime을 바꾸지 않는다. W2/W4/W5는 validation·discovery·inventory다.
따라서 R6-P1-V는 현재 교정 범위에 적용 대상 없음이며, V 승인을 받았다고 기록하지 않는다.
기존 렌더 쌍의 재현 source는 각 chart의 `manifest.js`와 `png.render.js`에 있다.

## 닫지 않은 항목과 다음 경계

- **B01 전체는 아직 미완료다.** Facade 실패는 고쳤지만 감사 P37의 lower measure-first 작성은
  D14 / R6-P2-W5에서 incomplete intent 계약과 함께 처리한다. 원장 양쪽 연결을 보완했다.
- B02/B03는 거짓 완료 안내를 고쳤다. 완성 Area, Strip/Rug는 F05/F08에서 구현한다.
- B04는 불필요한 Cartesian layer를 제거했다. D01의 positive-minimum radius와 Rose/Radius-length 의미는 Phase 4에 남는다.
- B05–B08은 이번 교정 범위의 구현·검증을 마쳤다. F01–F19와 D 항목을 완료나 Current로 승격하지 않았다.
- R6-P1-X 승인 뒤 Phase 2 A package로 넘어간다. 이후 API·기본값 변경·시각 target은 해당 Gate에서 확정한다.

승인 요청의 근거는 [`agent_docs/impl/AGENTS.md`](../../AGENTS.md)의
“Treat Gates as hard execution boundaries. Add intermediate Gates for independent public decisions, findings,
or visual targets and stop at the first unapproved Gate.”다. 사용자의 “밀자” 지시는 Phase 1 A 실행 승인으로
이미 반영했으며 다시 묻지 않는다. 여기서 검토하는 것은 그 실행 결과와 명시적으로 남긴 후속 범위다.
