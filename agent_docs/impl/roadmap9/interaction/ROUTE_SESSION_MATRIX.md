# Route와 현재 session의 교차 검증

## 진행 상태

- [x] STEP041 / STEP070 / AT80·81·82 원문과 Current 차이 확인
- [x] 네 bundling 방법의 공개 player→current frame→selection→source revision matrix
- [x] 별도 geographic GeoLine의 seam·clip·backside와 명시 interpolation 차이
- [x] 동일 runtime archive의 신규 설치 사례 2개 × Node20/22/24
- [x] 재현 가능한 증거 저장 (현재 checkpoint에 함께 commit/push)

기존 AUTHORIZATION remainingApproval을 재사용한다. 이 checkpoint는 runtime·public API·저장
schema 변경이 없는 검증 추가다. Native GraphRoute의 world/screen 의미와 GeoLine의 geographic
원본 의미를 서로 다른 capability cell로 유지한다. geographic GraphRoute binding을 새로 구현했다고
주장하지 않는다. 전체 STEP041/062/070/074/077 완료를 의미하지 않는다.

## 실제 기존 owner와 적용 범위

- GraphRoute는 `bundleGraphEdges`의 hierarchical / force-directed / density / edge-path이다.
  완성된 route와 node layout을 public `planTransition` / `createAnimationPlayer`가 읽는다.
  샘플마다 solver를 다시 실행하지 않는다. 기존 AT80 presentation은 원 canonical resource를 보존한다.
- Geographic line은 `createGeoLineMark`의 `source-segment` / 명시 `great-circle`이다.
  기존 native projection stream이 seam, horizon, clip extent를 처리하고 typed camera가 같은 owner를
  재사용한다. 기본 `source-segment`를 great-circle로 오해하지 않는다.
- 새 canonical 공개 소비자는 `scripts/consumers/fixtures/node/interaction-animation.mjs`의
  `four-route-player-lifecycle` / `geographic-route-seam-current-hit`이며 normal suite는
  `test/unit/animation/route-session.test.js`에서 같은 사례를 실행한다. 테스트는 roadmap을 import하지 않는다.

## 인수 cell

| Cell | 독립 기대 | 실제 검증 |
|---|---|---|
| 4 bundling methods × seek25/50/75 | native plot origin의 literal 선형 이동 결과와 같은 scene | 완료 native program으로 별도 materialize한 scene과 exact 비교 |
| current-frame interruption | 원 captured frame 객체에서 시작, 75%→원본으로50% 뒤37.5% 위치 | public player의 객체 동일성과 native scene equality |
| overlap hit/keyboard | 원 typed key, body/arrow 중복0, 현재 위치의 실제 painted item | explicit focus→현재 anchor inspect와 후보 집합 검증 |
| 임시 unbundle→새 player frame | preview 해제, 원 canonical/history 불변 | public command와 player.seek 후 frame/preview 상태 검증 |
| source reorder/revision | 동일 edge keys, route revision+1, 이전 generation payload 읽기0 | native reviseData→session update→새 authentic revision frame의 exact lineage |
| selection/codec | 한 history transaction, 새 원본 codec 동일, old native 불변 | activate/deserialize/serialized snapshot 비교 |
| Geo dateline | ±180°에 분리된 두 part가 같은 원 key, 중앙 pixel chord hit0 | longitude170→-170 source의 현재 rotate0에서 x353/47/200 literal queries |
| Geo clip/backside | clip 밖 및 지구 뒷면 hit0 | 같은 원본/카메라의 current frame에서 실제 selection index 질의 |
| Geo interrupt | current rotate0 객체에서 다시 시작,25% 뒤 rotate-5 | 별도 native editProjection scene과 exact equality |
| Geo interpolation | great-circle midpoint 위도 atan(sqrt(2)), source-segment pi/4 | 각 모드에서 해당 midpoint hit1 및 반대 위치 hit0 |

## 최초 실패와 해석

- Stale frame 시험의 첫 command envelope에 accessor를 넣으면 기존 own-data 검사가 payload 접근 없이
  먼저 거부한다. Envelope data property 안의 frame Proxy로 고쳐 실제 stale-payload 접근0을 검사했다.
  검증 규칙이나 runtime을 완화하지 않았다.
- Great-circle midpoint의 첫 기대를 기본 source-segment에 적용해 실패했다. Current의 명시
  `interpolation:'great-circle'`을 사용하고 두 모드의 서로 다른 독립 수치 기대를 나란히 고정했다.
  원본 longitude/latitude를 바꾸거나 오차 한도를 늘리지 않았다.

## 남은 통합 의무

AT81의 현재 world/screen GraphRoute와 geographic GeoLine cell은 위처럼 각각 검증한다.
원 edge-bundling 계약의 geographic route 표현이 별도 GraphRoute binding을 요구하는지는 parent에게
현재 source/계약 차이를 전달했다. 해당 역할·schema를 추측해 추가하지 않는다. GeoText·guide·timeline의
최신 shared proof와 합산 및 AT82 worker/cache/sizeclass/SLO는 각 owner/최종 STEP070·074 matrix에서
닫아야 한다. 이 test-only checkpoint 때문에 이미 통과한 runtime coverage·렌더러·번들·문서 전수를
반복하지 않는다. 같은 고정 archive SHA가 기존 runtime을 그대로 검증함을 기록한다.

## 검증 기록

[기계 판독 증거](route-session-evidence/summary.json)에 최초 실패와 최종 결과를 분리했다.
최종 source 2/2, package·discovery·sharding 27/27, 같은 `3093eefd…62cda` archive의
Node20/22/24 각각 2/2가 통과했다. 설치 harness의 첫 두 실패는 기존 optional-peer setup을
빠뜨린 원인이었으며 canonical setup을 사용한 뒤 같은 archive로 통과했다.
Runtime 여섯 owner의 hash가 이전 642개 coverage 증거와 모두 같고 source·declarations·package
입력은 바뀌지 않았다. 이 checkpoint에는 새 전체 coverage·renderer·문서 sweep을 주장하지 않는다.
