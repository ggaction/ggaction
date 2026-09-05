# Phase 4 W1/W2 — Area와 독립적인 시리즈 배치

V1에서 승인한 11개 표현의 공개 구현을 완료했다. Package gzip 상한은 그대로이며 B 검토가 남아 있다.
Phase 4 전체 완료나 X 승인을 뜻하지 않는다. Rose/Radial·theta order(V2), midpoint(V3)는 구현하지 않았다.

## 공개 결과와 계층

```javascript
const p = chart().createCanvas({ width: 1000, height: 700, margin: 150 })
  .createData({ values: [
    { x: 0, value: 2, series: 'a', region: 'north' },
    { x: 1, value: 4, series: 'a', region: 'north' },
    { x: 0, value: 1, series: 'b', region: 'south' },
    { x: 1, value: 2, series: 'b', region: 'south' }
  ] })
  .createAreaPlot({ x: 'x', y: 'value', groupBy: 'series', color: 'region', layout: 'stack' });
const shares = p.layoutSeries({ mode: 'fill' });
const overlay = shares.layoutSeries({ mode: 'overlay' });
```

첫 결과의 y domain은 [0,6], shares는 [0,1], overlay는 [0,4]다. 원본 행에는 변화가 없다.
`createAreaPlot`은 createAreaMark → encodeGroup → 위치/range → layoutSeries → color → guide의
wrapped child를 합성한다. 별도 facade recipe, baseline용 가짜 행/field, renderer의 통계 추론을 저장하지 않는다.

- `createAreaPlot`: full 전용. Simple baseline(기본 0), 수평/log baseline, crossing ribbon, missing break,
  overlay/stack/fill/diverging/center. 두 endpoint 모두 datum인 조합, range+baseline, 잘못된 nested role는 거부한다.
- `layoutSeries`: full Area/Bar와 Basic Bar. Layer의 `layout.mode`가 유일한 canonical owner다.
  기존 color.layout·measure.stack·offset 호출은 해당 owner로 위임하며, mode 생략 color 편집은 기존 배치를 보존한다.
- `encodeGroup`: Bar까지 확장하고 scalar/tuple 시리즈를 지원한다. Color는 Area series 또는 Bar cell에서
  별도로 결정한다. Color domain을 재정렬해도 source-first-appearance 시리즈 위치는 바뀌지 않는다.
- Group→stack은 활성 offset과 padding config를 제거한다. 자동 생성했고 참조가 없는 offset scale만 삭제한다.
  명시적 scale 또는 다른 consumer의 scale은 보존한다. Group으로 돌아오면 현재 group에서 offset을 재생성한다.

정확한 생성·편집 API, 기본값, 오류 조건은 [Area 계약](../chart/area.md),
[Current charts](../../../contract/current/COMPLETE_CHARTS.md),
[Current encodings](../../../contract/current/ENCODINGS.md)에 있다.
현재 direct actions는 179, 남은 Planned actions는 Rose/Radial 2개다.

## 수치·시각 결과

[실행 예제](../../../../examples/area-layout/program.js)와 [입력/표시 호출](../../../../examples/area-layout/targets.json),
[manifest](../../../../test/charts/area-layout/manifest.js)가 11개 결과를 재현한다.
[실행 결과 JSON](implementation-v1-results.json)은 원본 V1 승인 `ee9daf0c`의 **graphic hash와 pixel hash**를
현재 primitive와 public 결과에 모두 대조한다. 당시 [승인 결과](visual-v1-results.json)는 수정하지 않았다.

11개 모두 semanticSpec, concrete graphics와 순서, Canvas 명령, 표시 호출/top-level trace,
동일 실행 decoded PNG pixels, SVG 문자열, PDF vector streams가 일치한다. Plot ink와 기대색 조건도 통과한다.
승인된 pair는 `.artifacts/test/png/charts/series-layout/area-layout/`으로 승격했고 review subtree는 삭제했다.

## 소비자·호환 경계

| 경로 | 확인한 동작 |
| --- | --- |
| Endpoint/data | field/datum 양쪽 bound가 domain에 포함됨. Source null 유지, break의 실제 sourceIndices 보존 |
| Raw Area layout | aligned unique grid, baseline 0, 비음수 stack/fill/center, signed diverging, zero-total fill. 보간/가짜 행 없음 |
| Rematerialization | baseline/range/scale/Canvas 편집, endpoint 제거/복원, shared scale/guide와 highlighting 재적용 |
| Bar | 색 없는 scalar/tuple group, aggregate/quantitative cell color, histogram, 양 방향 offset/stack, 생성 scale 정리 |
| Selection | 실제 Bar materialization과 같은 cell/endpoint math. 음수 시작 explicit domain에서도 baseline 0과 일치 |
| Legacy | color.layout·measure.stack·offset → canonical assignment. 기존 serialized centered Area materialization 호환 |
| Unsupported | Area group, horizontal center, 두 field ribbon 누적, Bar center, Horizon의 layoutSeries, 비정렬/중복 Area grid |
| Density | KDE와 categorical placement는 기존 transform이 소유하고 canonical layout만 공유 |
| Types/package | full/Basic 경계, strict positive/negative 역할, range+baseline 배타성, datum pair, required mode, encodeLayout alias 없음 |
| Discovery/docs | area chart → 실제 createAreaPlot, mark 의도는 createAreaMark 유지. 173 user-facing actions 직접 실행 시나리오 |

새 shape나 renderer를 추가하지 않았다. Axis/grid/legend, transforms, PNG/PDF/SVG는 기존 owner를 재사용한다.
실패한 요청은 caller 입력과 이전 semantic/graphic/config/context/trace를 변경하지 않는다.

## 검증 중 함께 교정한 불일치

- Ordinal offset scale consumer가 series 대신 주축 category를 읽어 막대가 사라지던 경로를 고쳤다.
- 색상 domain 재할당이 offset 순서까지 바꾸던 잔여 coupling을 제거했다.
- Bar selection이 독립적인 legacy stack 계산과 축 domain 시작값을 사용하던 중복을 없앴다.
- Area endpoint 제거 후 미완성 intent의 scale consumer가 완료 상태를 요구하던 경로를 정리했다.
- ErrorBand owner-edit 렌더 예제가 semantic color와 fill owner를 동시에 요구하던 기존 충돌을 수정했다.
  승인된 이미지는 유지하고 마지막 concrete fill override를 `editGraphics` 호출로 명시했다.
  이 lower override는 영구 semantic fill 설정이 아니며 이후 rematerialization에서는 encoding이 다시 적용된다.
- 공통 range preflight에서 Rule 지원이 빠져 temporal Rule range가 거부되던 회귀를 복구했다.
  5개 실제 데이터셋에서 양쪽 datum range 네 경로도 직접 실행하도록 coverage recipe를 확장했다.
- 새 API가 이미 구현되었는데 검색·types·catalog·시나리오가 미구현 상태를 안내하던 부분을 동기화했다.

## 검증 기록

실행 명령·수치·남은 실패는 아래 최종 기록과 [B 검토](BUNDLE_REVIEW.md), [package 결과](package-results.json)에 기록한다.
검증 로그는 `.artifacts/roadmap6-authoring/area-layout-*.log`에 있다.

| 검사 | 최종 결과 |
| --- | --- |
| `npm test` | 2,646/2,646, fail/skip/cancel 0 |
| `npm run test:coverage` | 95.05% lines / 91.35% branches / 98.79% functions, 74 critical floors 통과 |
| `npm run test:render` | 183/183, 157 approved variant gallery와 빈 review gallery 검증 |
| `npm run test:browser` | 59/59, 실제 브라우저와 canonical 새 Area 예제 포함 |
| strict Area endpoint/role + selection/scenario/type consumer 집중 검사 | 53/53; 정상 누적에는 새 회귀 3개를 추가해 2,646건 |
| docs generate/build/built | generated freshness 정상 suite 통과, built 125페이지 검증 |
| docs browser | desktop search와 전체 페이지 320/390/768px 검증 통과. 이후 문서 링크 교정은 재build/built 검사 |
| approved V1 replay | 11개 public/primitive와 원본 승인 graphic/pixel hashes 모두 일치 |
| installed package | Node/MCP/types/tutorial 통과, Full/Basic gzip guard 실패. 같은 tarball 세 엔트리 수치 별도 기록 |

확장 `npm run test:realistic`의 전체 실행은 **201/212, 실패 11**이었다. 이를 전체 통과로 기록하지 않는다.
실패 원인은 새 action/recipe/option 인벤토리 집계, Rule range preflight 누락, 새 Area recipe의 부정확한
lifecycle:edit 주장이다. 실행 가능한 Rule 범위와 datum coverage를 복구하고, 생성만 한 예제의 메타데이터를
관측된 create로 맞췄다. 다음 **실패가 있었던 6개 모듈의 38개 테스트**는 교정 후 해당 실행에서 모두 통과했다.

| 재검증 모듈 | 통과 |
| --- | ---: |
| generated-lifecycle-scenarios | 3/3 |
| generated-scenario-feature-coverage | 7/7 |
| realistic-encoding-coverage-recipes | 2/2 |
| realistic-lifecycle-factor-effects | 2/2 |
| realistic-scenario-generation-isolation | 3/3 — strict 216/360의 descriptor/state/process parity와 RSS 한도 포함 |
| realistic-scenario-generator | 21/21 — 마지막 실행 84.7초, rejectedCandidates=0 유지 |

전체 확장 suite를 다시 실행한 수치로 합산하지 않았다. 이후 shared automatic offset의 다른 Point consumer
보존과 datum-primary axis title 증거를 강화한 Area/series unit 두 모듈은 19/19로 재검증했다.
[시각 검토 화면](../../../../.artifacts/roadmap6-authoring/area-layout-review.html)에서 11개 결과와 실제 호출을 볼 수 있다.

## 고정 source

- 구현·초기 검증 commit: `9815917a971ee289363eb00d10f10ea4d4e22cb4`, 원격 push/ref 일치 확인.
- src tree: `2535f80d95c1e0ed0a60636efacc67f7a4cf0c1e`.
- types tree: `c018ae44f997254e0cf3227dde4116b30e479659`.
- knowledge tree: `32e938d5c31a88afd74566399b11ad5d354339b5`.
- 이후 차이는 테스트 인벤토리/증거 강화와 검토 기록이다. Packaged runtime/types/knowledge와 tarball은 그대로다.

## 남은 범위

Full/Basic의 기존 gzip 상한 초과를 [R6-P4-B](BUNDLE_REVIEW.md)에서 별도로 검토한다.
상한을 올리지 않았고 package 전체 통과로 기록하지 않는다. W3–W5와 V2/V3/X는 남아 있으며 F20은 제외 상태다.
배포·publish·PR은 수행하지 않았다.
