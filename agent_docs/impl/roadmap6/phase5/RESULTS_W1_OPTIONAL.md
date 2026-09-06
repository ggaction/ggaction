# Phase 5 W1 A2 — 축 optional component 정렬 결과

[W1 A2 계약](CONTRACT_W1.md#a2--cartesianpolar-optional-component-정렬)을 구현했다. 기준은 `5c9c79df452735e08c7e487ad7bb8870e6b72516`, 결과는 이 문서를 추가한 commit이다. W1 A3 Parallel과 W2–W5는 남아 있다.

## 동작과 migration

Cartesian/Polar complete create의 `line`, `ticksAndLabels`, `title`은 false로 생성 생략이 가능하다. 모두 false는 빈 축을 만들지 않고 오류다. Group 내부 ticks/labels는 스타일 객체 계약을 유지하며 한 component만 필요하면 group을 생략하고 focused create를 사용한다.

Polar complete edit는 Cartesian과 동일하게 false로 기존 line/ticks/labels/group/title을 제거한다. Group 제거는 둘 다 존재해야 하고 개별 지시와 혼합할 수 없다. 마지막 구성요소를 제거하면 기존 전체 remove owner가 semantic/config/layout을 정리한다. Shared component cleanup은 `src/actions/guides/axes/components.js`가 소유한다. Grid·mark·scale은 유지하며 replay로 제거한 component가 되살아나지 않는다.

[#83](https://github.com/ggaction/ggaction/issues/83): 빈 chart에서 `editRadialAxis({angle:45})`가 `{layout:{angle:45}}`를 만들던 오류를 재현하고 수정했다. Angle edit는 existing component를 요구하며 angle과 제거를 함께 지정하면 유지되는 component만 이동한다.

Theta complete 생성은 과거 무시하던 angle을 runtime/type에서 거부한다. Radial만 이 결정을 갖는다. Facade guide 재사용은 disabled component를 생성하지 않고 existing component를 false로 선언하면 conflict다. 편집·제거를 create 요청에 숨기지 않는다.

## 검증

로그 prefix: `.artifacts/roadmap6-authoring/phase5-axis-optional-`. Repository 내부 tmp/npm/browser cache를 사용했다.

| 검사 | 결과 |
| --- | --- |
| `npm test` | 2,786/2,786, 실패·skip 0 |
| 기존 관련 검사 | axis/component/Polar/facade 65/65 |
| 새 optional 검사 | 14/14; 4 family × 7 nonempty 조합, 비활성 child trace 없음, 개별 제거·복원·replay, 마지막 정리, 실패 불변성 |
| Facade/type 집중 검사 | 36/36; Cartesian/Polar의 line/group/title opt-out과 existing conflict, root/Basic type |
| Coverage | lines 95.29%, branches 91.91%, functions 98.89%; critical floors 74개 통과 |
| 기존 Polar PNG | 1/1; geometry/default 회귀 없음 |
| Node 패키지 | [package-axis-optional-results.json](package-axis-optional-results.json), Node/renderers/types/MCP/tutorial/bundle PASS |
| 같은 tarball Chromium | 1/1; component 제거 후 Canvas/SVG, 마지막 axis state 정리 |
| 최종 public docs source | 47/47; 생성 freshness·capability/type/reference 검사 |
| Built docs | preflight·build·125개 page link/asset 검사와 desktop search/keyboard/Axe/no-JS·전 page 320/390/768px PASS |
| 최종 문구 보완 뒤 | 재생성·재빌드 후 125개 static 검사와 바뀐 3 page × 3 viewport의 문구·containment·browser error 검사 PASS |
| 내부 기록 | action catalog·agent docs navigation 18/18 PASS |

실제 public option inventory는 183 user-facing action, 4,822 required option path, 2,680 path literal, 174 family literal, 5 lifecycle이며 총 7,864 feature requirement다. Theta angle의 top-level 1개와 nested 4개 path가 제거되었고 false literal 111개가 기존 nested facade signature까지 반영됐다. 전체 realistic corpus의 이 새 literal 분포 완료를 주장하지 않으며 Phase 5 통합 때 재검증한다.

Artifact SHA-256는 `fc925c8622b449e909f8757fd6ae18c45e9edeccd291d6186c65670a70203042`다. 444 entries, packed 497,993 / unpacked 2,385,136 bytes. Full/Basic/SVG gzip 247,314 / 137,356 / 6,437 bytes로 기존 한도를 유지한다. 0.0.12 개발 artifact이며 최종 0.0.13 릴리즈가 아니다.

최초 누적 검사 이후 새 focused test의 grid 보존 단언을 실제 `radialGridCircles` 이름과 nonempty 사전 조건으로 보강하고 14/14를 다시 통과시켰다. 잘못된 graphic ID의 undefined 동등성을 증거로 남기지 않았다. 최종 문서 표는 Radial 축 angle과 Radial title position을 구분한다.

## 남은 작업

W1 A3 Parallel dimension axis의 public 생성·field 편집·제거·복원, W2–W5와 Phase 5 전체 통합이 남았다. 이번 변경은 기존 concrete geometry에서 선택한 구성요소를 생략·제거하므로 새로운 visual primitive target은 N/A다. Finding D07/F17 전체를 닫지 않는다.
