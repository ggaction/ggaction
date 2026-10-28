# STEP7 — Prepared source와 통계 파이프라인 통합

## 진행 상태

- [x] 공개 pivot·degree-2 LOESS·calendar-day completion을 DATA/parameter main에 통합
- [x] 원본 갱신→computed→pivot→calendar 및 LOESS 분기의 값·lineage·선택·offline 복원 회귀
- [x] 공개 선언·Current·문서·실행 snippet·액션 카드의 독립 추가 내용 보존
- [x] 통계/자원/parameter unit393개와 독립 통계18쌍 검증
- [x] Installed Node20/22/24: 동일 archive의 Node196·tutorial68·qualification7 모두 통과
- [x] 문서164개, built150pages·LLM1218개와 desktop/mobile browser 검사
- [x] action-card route 누락의 fail-closed 검증 및 생성 의존 순서 수정
- [x] 최종 source commit의 clean checks와 인증한 원격 CI coverage; [STEP8](STEP8.md)
- [x] STEP-013/014/015 개별 종료 receipt 및 completion validator; [STEP8](STEP8.md)

## 통합 계약과 검증

각 기능의 계약은 [pivot](statistics/PIVOT_PUBLIC.md), [LOESS](statistics/LOESS_PUBLIC.md),
[calendar](calendar/CALENDAR_PUBLIC.md), [prepared source](data/PUBLIC.md)에 있다. 이 통합은
새 시각 대상이나 공개 옵션을 추가하지 않는다. 별도 calendar chart 표시는 STEP-024의 범위다.

`test/unit/resources/prepared-statistics.test.js`는 원본 9행과 parameter URL을 가진 program을
직렬화/복원한 뒤 새 URL의 bytes를 준비·적용한다. computed y+10, 그룹 pivot, 달력 채움,
quadratic LOESS와 final-item selection이 함께 갱신되는지 검사한다. 기대 pivot 합은
41/86/185, 빈 날짜는0이며 LOESS는 x²+12다. 잘못된 pivot 열을 전달하면 원본 program은
바뀌지 않는다. 기존 단위·수치 기대값을 구현 출력으로 다시 만드는 방식은 사용하지 않았다.

집중 unit393/393, independent statistical originals/revisions18/18이 통과했다. 최초 전체
contracts683개에서 action-card route 관련2개가 실패했다. 문서 reference link를 생성하기 전에
cards를 만들던 순서를 수정하고, card/map 양쪽 route가 빠져도 실패하게 했다. 수정 후 관련
계약19/19가 통과했다. 최종 clean 전체 계약 실행은 아래 종료 검증에 남긴다.

최초 문서 검사3개 실패는 search size와 merge 중 누락된 canonical snippet 등록3개였다.
원본 두 branch의 실행 사례를 모두 복원했고 최종 문서164개가 통과했다. 검색 payload는
863078bytes, 한도865000이다. Installed tutorial68에는 pivot·LOESS·calendar 및 DATA/parameter
실행 예제가 모두 포함된다. 중단한 최초 package matrix는 성공 evidence로 사용하지 않았다.

## 패키지와 CI

통합 archive는701entries, packed1042710/unpacked4856313bytes,
SHA256 `432b9cce9d2017770452934f84526ea56d52fc36e14c85ad9fcf45cd9331d06c`다.
Node20.20.2/22.23.1/24.22.1 모두 정확히 같은 archive를 설치했다. 최종 재패킹 hash도 같다.
Full/Basic gzip526996/304841bytes, 한도529000/307000이며 SVG 한도25000은 유지한다.

앞선 DATA commit19d14da4는 수정 없는 checkout에서 unit/contracts/AT16/metadata/package/docs를
모두 통과했다. 그러나 원격 CI40704966161에서 패키지 압축 크기가1038073bytes(Windows1038063),
로컬1035817보다 약2.3KB 커서 cap1036000을 넘었다. 이 실패를 runtime 성공으로 바꿔 기록하지
않는다. 이번 통합 한도1047000은 통합 실측값과 관측한 CI 차이를 포함한다. 파일 수·unpacked
한도·browser bundle 제한도 별도로 유지한다. 최종 CI 성공 여부는 아직 확인 대상이다.

원본 로그·failed attempts·정확한 archive·각 runtime 소비자 결과·DATA clean receipts는
[통합 evidence](statistics/integration-evidence/files.json)에 SHA256과 함께 보존한다.
STEP-016 조건부 dataflow, 이후 paint/image/hierarchy 및 전체 STEP-077 범위는 계속 남아 있다.

## Clean 종료 검사 중 문서 한도 동기화

`2810a8e2`의 clean unit은 통과했으나 전체 contracts684개 중 문서 한도표1개가 실패했다.
README와 SECOND_ARCHITECTURE의 Full/Basic cap을 runtime 검사와 동기화하고 관련10개를
재검증했다. 실패 원본은 `integration-evidence/clean-attempt-2810a8e2/`에 보존한다.
수정 뒤에는 새 commit으로 clean receipts를 다시 생성한다. STEP-014/015의 필수 검사 목록도
원격coverage, unit/contracts, 통계CLI, metadata/package/installed, browser/render/docs로 명시한다.
