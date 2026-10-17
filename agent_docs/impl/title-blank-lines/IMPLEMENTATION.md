# 제목의 빈 hard line materialization 수정

## 범위와 근거

기존 `LEGEND_AND_TITLE.md` 계약은 title/subtitle의 명시적 hard line과 빈 줄의 간격 예약을 이미 지원한다. 기존 layout은 줄 위치를 올바르게 계산하지만, materializer가 빈 문자열을 text primitive에 전달하여 renderer의 non-empty text 검증에 실패했다. 이는 새 공개 API나 시각적 설계가 아니라 기존 지원 동작의 복원이다. 변경 전 테스트는 빈 graphic item을 기대하면서 그 프로그램을 실제 SVG로 렌더하지 않아 문제를 놓쳤다.

## 변경

- reading block과 semantic 문자열은 유지한다. leading/interior/trailing 빈 줄의 원래 line index, lineHeight, 전체 예약 높이를 보존한다.
- 기존 title layout 모듈의 순수 helper가 실제로 칠할 줄과 그 원래 좌표만 선택한다. 일반 title action과 facet parent materializer가 이를 함께 사용한다.
- 빈 text primitive를 만들지 않는다. visible line 수 변화와 scalar/collection 전환을 기존 재조정 경로로 처리한다.
- 전체 문자열이 빈 hard line으로만 구성되면 state 변경 전에 거절한다. 일반 single-line 및 nonblank multiline 좌표와 style은 유지한다.
- 공개 선언의 설명, 기존 Current 계약, 공개 문서와 생성 결과를 동기화한다. 새 option, persisted schema, renderer 분기나 모듈은 없다.

## 검증

- focused title/layout 테스트: 34/34 통과. 네 edge, title/subtitle leading/interior/trailing 빈 줄, 원래 좌표와 줄 간격, wrapping/lineHeight, Canvas 편집 수렴, persistence, facet parent, invalid edit atomicity, nonblank literal geometry와 실제 SVG 출력을 검사했다.
- 전체 unit: 2974/2974 통과.
- 전체 contracts: 532/532 통과.
- 전체 docs: 120/120 통과.
- 설치 package consumer: 통과. 실제 설치한 artifact에서 빈 줄 title/subtitle의 SVG/PNG/persistence를 별도로 검사했다. Package 예산과 browser entry smoke check도 기존 한도 내에서 통과했다.

## 통합 상태

이 feature checkpoint를 검증하고 push하되 현재 번역 실행의 stable runtime은 변경하지 않는다. 진행 중인 기존 runtime 재검증이 끝난 뒤 parent가 다음 통합 checkpoint와 문서 snapshot/pin을 함께 갱신한다. 영향을 받은 번역은 실패 상태를 보존하며 검증 전 성공으로 세지 않는다. 배포나 package publish는 수행하지 않는다.
