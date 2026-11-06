# 배포 전 문서 전체 점검 — 2026-11-06

## 진행 상태

- [x] 사용자 지시: "알려진 한계로 기록하고 배포. 그전에 … docs가 최신을 잘 반영하는지 총체 점검 후 수정 후 반영". [승인 기록](RELEASE_APPROVAL_20261106.json)
- [x] 6개 영역 독립 점검(읽기 전용, 예제 실행 포함): 그래프·route·flow·hierarchy·partition / 지도 / 데이터·파라미터·영속화 / 애니메이션·인터랙션·라이브 / 새 차트 계열 / 전체 개요·CHANGELOG.
- [x] 지적 반영과 문서 시험 253개 통과.
- [ ] 전체 검증 묶음(시험·realistic·coverage·browser·render·설치본) 후 commit, 후보 재검증.

v0.0.26 이후 바뀐 공개 범위: action 298 → 380(추가 82, 제거 0), package entry 4개 추가(`interaction`, `graph`, `animation`, `live`).

## 고친 것

- **사실과 다른 문장**: "interactive legends 미지원"(supported-features, legends), "키보드·focus 미제공"(accessibility), "tooltip·animation·event·지도 미지원"(errors-and-recovery), 없는 package `@ggaction/transition`(rendering), "session은 click/brush/lasso binding 하나"(interaction), route update union이 다섯 action뿐이라는 문장(edge-routes, 계약 EDGE_ROUTES.md:62·109, 생성 reference 원본), "static snapshot library, not streaming"(data-updates).
- **실행이 실패하던 예제**: `sortBy`의 없는 `fieldType` 2건, `getDatasetSchema` 시그니처, dispose된 executor를 재사용하던 route update 예제, 아무것도 맞히지 못하던 interaction hit 예제(y 200 → 191).
- **빠진 설명**: graph plot·OHLC·waterfall·pyramid 용량 한도, OHLC·waterfall overlay의 Y scale 공유 조건, route 기본 work budget(1천만)과 실제 실패 크기, v1/v2 host 옵션과 worker 분기, v2 route가 붙은 뒤 직접 편집이 실패한다는 안내(graph·flow·hierarchy·interaction `moveNode`), hierarchy·partition에서 encoding/legend 불가, partition path-run, Geo의 `polygonWinding` 편집·clip 기본값·`rotateDeg` 의미·shape/point의 `interpolation`·join/LOD 한도·type 변경 시 fit 유지, live의 기본값·옵션·save/load 범위·dispose 동작, animation `createAnimationPlayer`·interrupt 옵션, interaction 상태·이벤트 목록·기본 우선순위(resize/reorder 60), image mark API 절과 image resource 요청 필드·삭제, font 교체·삭제, `setMarkVisibility` 데이터 쪽 절, 분할 API의 실제 slice 길이(1,024행 묶음 + GC)와 첫 slice의 인자 복사.
- **성능 기대치**: `performance.md`에 "Keep large updates responsive", "Geographic camera cost", "Known limits" 절 추가. edge-routes에 "Known performance limits" 절. CHANGELOG에 "Known limitations".
- **개요·탐색**: README(기능 목록, entry 설명, browser-safe 문장, 문서 링크), getting-started·compatibility entry 표(4개 entry), index(TypeScript 문장), API index(계층·네트워크·지도, 특화 plot, 인터랙션·애니메이션·라이브 묶음), chart picker("Specialized chart families" 절), supported-features(계열·데이터·좌표·그래픽·애니메이션·인터랙션·라이브·선택 grain), typescript(DOM/WebWorker, entry별 타입), llms-index, troubleshooting(이미지·폰트·route 준비), version(v0.0.26에서의 이전 안내), gallery 필터 tag(새 계열 42개), nav 제목("Interaction Sessions").
- **MCP 지식**: `unsupported.geo/animation/interaction` 메시지를 "resolver는 계획하지 않으며 해당 API를 쓰라"로 고침. 문서 검색에서 지도·tooltip·animation 검색이 실제 API 페이지로 간다. llm-authoring 문장 수정.
- **CHANGELOG**: Unreleased 밖에 있던 bullet 2개, 중복, 분류 없음 → entry·계열·데이터·외형·호환성·수정·알려진 한계로 재구성. 새 action 이름은 모두 이름으로 남긴다(시험이 확인).
- **코드·타입**: `LiveChart.setData`가 타입에 있는 `easing`을 무시하던 문제 수정. `ErrorCode`에 실제로 쓰는 `prepared-data-required` 추가. INTERACTION 계약의 이벤트 목록·기본 우선순위, GEOMETRY 계약의 capacity 문장 수정.

## 남긴 것 (이유)

- `release_baseline.json`은 v0.0.13 유지: `docs/README.md`의 release 절차가 "이전 baseline을 migration 비교용으로 유지"로 정한다. 대신 version 페이지에 v0.0.26에서의 이전 안내를 추가했다.
- MCP resolver가 지도·애니메이션·인터랙션 과제를 실제로 계획하도록 taxonomy를 확장하는 일은 이번 범위 밖이다(메시지만 사실에 맞춤).
- 홈 gallery 묶음, 지리 choropleth tutorial 절, nav 재배치, partition tutorial 생성 코드 들여쓰기, 생성 recipe의 오류 메시지 정규식, HIERARCHY 계약 시그니처 표기는 낮은 우선순위로 남긴다.
