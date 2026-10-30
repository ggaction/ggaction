# 겹친 간선 후보와 임시 펼침

## 진행 상태

- [x] STEP041 / edge-bundling 통합 조건 / AT80 원문 확인
- [x] 기존 remainingApproval 재사용 및 구체 공개 흐름 기록
- [x] 현재 후보 keyboard 순환과 native activation
- [x] native/current graph의 선택 간선만 일시 펼침
- [x] 준비 lease·취소·수정·history 불변 및 실제 tooltip/브라우저
- [x] 4renderer·원본 데이터·동일 설치 archive·문서 동기화

원본은 `study/coverage-expansion-2026-10-27/roadmap/tasks/STEP-041-bundling-consumers.ko.md` 및
`roadmap/contracts/edge-bundling.ko.md`의 통합 종료 조건이다. 모든 원 간선 후보 보존, 정렬된 후보 배열,
선택 간선만 presentation overlay로 펼침, keyboard 후보 순환을 요구한다. 가짜 junction node나 저장
canonical route 변경은 금지한다. 기존 AUTHORIZATION remainingApproval과 부모의 지속 구현 지시를
재사용한다. 새 승인 질문은 하지 않는다. 아래는 이 checkpoint의 구체 선택이며 정확한 공개 계약은 Current INTERACTION에 함께 기록한다.

## 공개 흐름

- 기존 `inspect` 결과의 실제 `candidates` 순서를 유지한다. `focus.move`에 `nextCandidate`와
  `previousCandidate`를 더해 마지막 inspect의 현재 frameVersion 후보를 configured keyboard targets 및
  현재 painted native item과 교차한다. 동일 logical item의 body/arrow는 이미 hit owner에서 한 번만 남는다.
  끝에서 처음으로 순환하고 focus가 후보에 없으면 각각 첫/마지막 후보부터 시작한다. 현재 후보가 없으면
  no-op이다. 새 임의 hit 좌표나 hidden 항목을 만들지 않는다. PageDown/PageUp이 이 이동에 대응한다.
- `dispatch({type:'unbundleEdge',target,itemKey})`는 명시 GraphPlot의 현재 표시 간선 키 하나를 펼친다.
  `itemKey:null`은 일시 표시를 해제한다. `target`은 기존 root/child scope를 쓰며 새 선택 상태를 저장하지
  않는다. 키는 원 native graph membership 및 실제 현재 painted edge body와 일치해야 한다.
- 일시 결과는 기존 `state.previewFrame` / `previewAssets`에 놓고 host가 같은 renderer 경로로 그린다.
  `animationFrame` 또는 native baseline은 취소 기준으로 유지한다. program/trace/layout/route/selection/
  revision/history는 바꾸지 않는다. 실제 native 선택은 기존 `activate` 또는 `select` command가 소유한다.
- 단일 선택만 유지하며 다른 키는 baseline에서 새로 만든다. 새 frame/source/native edit, 명시 해제,
  editing gesture 시작, unmount/destroy에서 복원/해제한다. 준비 중에는 이전 화면과 자산을 유지하고
  exact current tags로만 게시한다. stale/abort/dispose 결과는 기존 preparation owner가 처리한다.
- source 변경 후 같은 key를 자동 펼치지 않는다. tooltip은 기존 safe HTML host recipe의 설명/fields와
  session focus를 읽으며 별도 library DOM widget이나 hidden 선택 저장소를 추가하지 않는다.

## 소유와 권한

현재 animation frame은 기존 flat proof와 `createGraphPresentationFrame`의 forward 계산을 사용한다.
정적 native graph는 Full builtin의 class-scoped registration-once read-only 준비 경계에서 기존
`projectGraphAnimationState`를 재사용한다. Interaction entry는 Full/native policy assembly를 import하지
않고 Basic/미등록/파생 constructor에 native graph 권한을 암묵적으로 주지 않는다. 새 public registry나
persisted schema는 없다. Exact native program/source role/graph·layout·route refs를 보존한 private
presentation frame만 허용하며, 외부 clone/일반 scene을 authentic 의미로 승격하지 않는다.

렌더러는 같은 concrete scene/graphicSpec만 읽는다. 선택 간선 body/arrow만 native unbundled geometry로
대체하고 나머지 nodes/edges/labels·clip·offset·opacity·drawing order를 보존한다. 현재 animation meanings와
실제 baseline geometry가 다르면 오류로 닫으며 pixel 역추론을 하지 않는다. Body/arrow 원 identity는
그대로이고 새 graph node/edge/resource를 만들지 않는다.

## 검증 계획

원문 숫자 fixture A/B/C와 parallel/overlap 간선을 사용한다. 후보 정렬과 순환, keyboard activate,
선택 간선만 변경, canonical codec 동일, current endpoint attachment, negative/nested transform,
clip/opacity zero, source removal·revision, 준비 실패/취소·late lease dispose, reentry/destroy를 검증한다.
독립 native unbundled geometry와 4renderer를 비교하고 실제 Canvas/SVG keyboard/tooltip·DPR1/2 및
같은 설치 tar 소비자를 기록한다. AT81의 모든 geo/interrupt 조합과 전체077 완료는 별도 합산 의무다.

## 현재 검증과 남은 범위

새 source 회귀11개를 포함한 관련 interaction/animation642/642 및 타입·패키지·발견·shard·소스 경계55/55가 통과했다. 여섯 변경 owner는 line97.89–100%, branch91.89–100%, function100%로 기존 95/90/100 기준을 모두 충족했다. 전체 저장소 전수 검사 결과로 주장하지 않는다.

Canonical 실제 데이터 runner의 5 pinned datasets×3recipes와 집계16/16, 실제 문서 HTML을 공유한 Canvas/SVG×DPR1/2 browser4개(파일 전체16/16), 정적/현재 의미의 선택 body+arrow4backend 독립 native 비교가 통과했다. 마지막 복원 알림 수리 뒤 unit/coverage와 최종 archive browser를 별도 검증한다.

수명 감사에서 focus/history가 바뀌지 않는 요청이 presentation만 복원하고 host 알림을 생략하던 결함을 고쳤다. 복원 이벤트는 프로그램/revision/history를 바꾸지 않으며 invalid 명령·stale frame은 기존 화면을 보존한다. 빈 후보·leave·empty undo/reset·동일 parameter 설정과 active editing preview 반례를 고정했다.

최종 같은 archive의 Node20/22/24 집중 소비자와 source-free browser4가 통과했다. 전체 문서232 중229 통과/3 실패 원본을 보존하고, 검색 실측 상한1084000과 런타임 참조 재생성 뒤 해당 소유31/31을 통과했다. built186pages/1598LLM 및320·390·768·1440폭 Axe0/overflow0를 확인했다. AT81의 모든 Geo/interrupt 조합 및 STEP041/062/070/077 전체 완료를 이 체크포인트만으로 선언하지 않는다.

최종 source는 `117c64e4d0474a1bf725e11f34302a494f46b9b7`이며 상세 입력·archive·검증·최초 실패는 [machine evidence](edge-presentation-evidence/summary.json)에 있다. 최종 canonical 재포장은 같은 SHA256 `3093eefd9dc4d8d4b6d81437c42ad6e1e6dc3c574a02ec87707a941479e62cda`이다. 공개 배포/게시/PR은 하지 않았다.
