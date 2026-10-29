# STEP-069 저장된 상호작용의 독립 복원

## 진행 상태

- [x] 원 카드와 static delivery 계약, 기존 domain별 fresh-process/renderer 소비자 감사
- [x] 기존 전체 승인 `AUTHORIZATION.json`과 parent의 동일 범위 확인 재사용
- [x] partition·graph·geo·font·image가 함께 있는 저장본의 source-free fresh-process 복원
- [x] 선택·focus intent·layout/projection revision·lineage·clip의 독립 기대값
- [x] 새 session의 편집·undo/redo와 SVG/Canvas/PNG/PDF 같은 run 검증
- [ ] exact archive Node 20/22/24와 증거 checkpoint
- [ ] 공개 animation bundle/player가 준비된 뒤 current-frame/offline 시간표 결합
- [ ] AT-54/55/89 전체 후행 matrix 종료

## 범위와 소유자

원 [STEP-069](../../../../study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-069-export-restore.ko.md)의 static delivery 셀을 먼저 채운다. 기존 개별 domain 소비자는 이미 저장·복원과 네 렌더러를 검사하지만, native session으로 편집한 partition/graph/geo와 포함된 이미지·폰트를 하나의 nested composition 저장본에서 새 프로세스로 재개하는 셀은 비어 있다.

새 공개 API나 codec schema는 추가하지 않는다. `scripts/consumers/fixtures/node/static-delivery.mjs`가 실제 공개 action chain과 literal 기대값을 함께 소유하며 기존 node manifest로 설치 소비자에 등록한다. 폰트 bytes/등록/측정은 기존 `fonts.mjs`의 exported fixture를 재사용한다. renderer와 scene의 기존 authentic preparation을 사용한다. production 계산이나 parser를 복제하지 않는다.

부모가 검증한 동일 `ecbd493db25236a7410057f261a8a8a9516bcb74930f5e907ec179a638803629` archive를 source checkout 밖에 설치한다. fresh child는 library import 전에 fetch/HTTP/HTTPS/socket/TLS/DNS 출구를 거부한다. 초기 저장본만 전달하고 함수/DOM/session/renderer handle을 직렬화하지 않는다. 복원 후 font/image bytes에서 renderer handle을 새로 준비한다.

## 기대값과 실패 경계

- named child scope마다 독립 선택, typed graph node key, partition focus intent, projection parameters/revision, row/resource lineage를 유지한다.
- partition focus/graph move/Geo viewport를 session command로 변경한다. 저장본을 다시 읽는 fresh session은 history/focus/preview가 비어 있고 persistent 선택과 domain intent만 유지한다.
- 새 session에서 같은 native command를 다시 적용하고 undo/redo한다. unknown typed node key와 잘못된 viewport 입력은 program/trace/history를 바꾸지 않는다.
- SVG의 embedded font/image/clip, Canvas와 PNG decoded pixels, PDF embedded/vector content, materialized scene/identity를 원본과 복원본에서 비교한다. PDF byte-level metadata를 geometry 동일성으로 오해하지 않는다.
- raw JSON 변조(unknown resource revision/asset hash)와 알려지지 않은 action target를 닫힌 오류로 검사한다. 최초 실패는 evidence에 보존한다.

## 남은 통합

이 checkpoint는 static native delivery만 증명한다. 공개 animation 시간표/plan envelope, reduced-motion/current-frame player 결합 및 최종 AT-53/54/55/89 전체 완료는 후행이다. 기존 independent renderer·domain·gesture 증거는 관련 입력이 변하지 않은 셀에서만 재사용한다. publish/deploy/PR 권한을 뜻하지 않는다.

## Static native 판정

- `static-delivery/interacted-native-offline-four-formats`: 동일 ecbd archive의 checkout 밖 설치본에서 Node 20/22/24 각각 통과했다. 각 실행이 별도 child process를 만들며 library import 전에 표준 네트워크 API를 막는다. 실제 호출 수는 0이며 guard 자체의 fetch/HTTP/socket negative probe도 실행한다. OS 전체의 network namespace를 격리했다는 주장은 아니다.
- fresh process에서 `serializeProgram(deserializeProgram(saved)) === saved`, public inspection/items/accessibility/CanvasScene 전체 동일성, scoped selection 3개, typed graph row lineage, native revision과 projection literal을 확인했다. transient focus/history를 저장하지 않으며 새 session에서 focus와 replay command를 재구성했다.
- Canvas=PNG decoded RGBA exact, SVG exact, PDF decompressed content stream hashes exact, prepared CanvasScene RGBA exact. PDF는 이미지용 XObject와 폰트/텍스트를 포함하며 전체 차트 screenshot으로 대체하지 않는다. 이미지의 바깥 clip·안쪽 red·바깥 white 픽셀 4개와 836×180 크기를 독립 literal로 확인했다. 원본 PNG를 직접 시각 확인했다.
- 해시/revision 변조, missing typed node key, 0 scale이 닫힌 오류이며 입력 program/trace/history 불변이다. 빈 선택은 성공 상태로 저장하고 undo로 원래 선택을 복구한다.
- renderer/library/types 변경은 0이다. 정확 API는 기존 Current를 그대로 사용한다. 전체 docs/TypeScript/5 bundle은 parent combined `02acd3ea5`의 동일 archive 증거를 재사용한다. 이번 체크포인트가 전체 runtime/realistic/coverage sweep 또는 animation 전달의 완료라는 주장은 아니다.

| 소비자 | 이 변경의 상태 |
|---|---|
| refs/revision/materialization | passed — 저장된 graph/layout/projection/selection 및 nested child 참조 비교, invalid revision 거부 |
| source rows/identity | passed — number 1/string 1 분리, source data/index/revision/typed rowKey literal, original/fresh 전체 equality |
| inspection/accessibility | passed — native final items와 selectedBy/childPath equality |
| scene | passed — CanvasScene 구조 및 실제 준비/그리기 equality |
| codec | passed — editable payload exact roundtrip와 asset bytes/hash 검증 |
| Canvas/PNG/SVG/PDF | passed — 같은 원본·복원·재편집 run 비교 |
| types/public docs/package exports | unchanged — parent의 동일 archive 3Node types 및 bundle 증거 재사용 |
| browser gesture | unchanged — B/C1/C2와 각 native gesture owner의 실제 입력 증거 재사용; 이 셀은 fresh-process delivery |
| animation/current-frame time export | pending — 공개 player/plan/codec 통합 뒤 AT-54/55 후행 |
| release/전체077 | pending — 별도 qualification과 권한 범위 유지 |
