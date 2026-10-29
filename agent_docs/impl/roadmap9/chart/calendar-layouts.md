# Calendar cell과 month boundary

## 진행 상태

- [x] STEP024/AT25/OR19 및 기존 날짜 owner 대조
- [x] 기존 전체 승인 범위와 순수 kernel 계약 기록
- [x] civil-day 집계와 year/week/day cell kernel·독립 oracle
- [ ] 공개 Calendar action·원본 갱신·전체 소비자 계약과 구현
- [ ] 타입·문서·실데이터·renderer·설치 및 최종 checkpoint

[AUTHORIZATION.json](../AUTHORIZATION.json)의 `remainingApproval`을 재사용한다. 사용자에게 남은
설계·시각 Gate 승인을 다시 요청하지 않는다. Root는 Contour `2a7549a0b` 종료 후 독립 Calendar
kernel·oracle 진행을 지시했다. 공개 연결 전 최신 통합 checkpoint를 병합한다.

## 순수 계산 계약

`normalizeCalendarOptions`와 `layoutCalendarDays`는 명시 `start/end`(strict YYYY-MM-DD),
`timeZone`(UTC/IANA), `weekStartsOn`(0–6), `aggregate`(count/sum/mean/median/min/max),
`missing`(empty/omit)을 받는다. 필수 선택을 데이터에서 추측하지 않는다. points는
`{date,value?}`의 own-data 배열이며 date는 epoch milliseconds 또는 strict ISO다.
count에는 value를 받지 않고 다른 집계에는 finite value가 필요하다.

날짜 파싱은 기존 `parseDataDateValue(format:'iso')`, civil 투영은 `calendarParts`,
날짜 범위·경계 검증은 `calendarDay`를 재사용한다. 새로운 DST/모호 시간 정책을 만들지 않는다.
날짜 범위 밖·존재하지 않는 civil date·잘못된 값·getter·sparse는 오류다. 잘못된 행을 버리지 않는다.
동일 civil day의 행은 지정 집계로 합치며 sourceIndices를 원본 순서대로 유지한다.
`empty`는 `value:null, sourceIndices:[]`인 셀을 만들고 `omit`은 없는 날을 생성하지 않는다.

Gregorian UTC surrogate의 day ordinal만 정수 날짜 계산에 사용한다. Zoned instant에 24h를
누적하지 않는다. 각 year의 Jan1 이전 week anchor와 weekStartsOn으로 week/weekday를 정하며,
yearIndex는 범위의 year 순서다. 부분 범위·빈 입력에도 명시 범위의 year frame을 보존한다.
Day identity는 civil YYYY-MM-DD이고 output은 civil-date 순서다. 모든 입력은 보존한다.

Month boundary는 실제 emitted cell square의 directed edge union이다. missing:omit의 islands와
holes를 임의로 연결하지 않는다. Contour와 동일한 cancel/stitch/containment 계산을
`grammar/gridBoundary.js`로 이동해 공유하고 별도 outline 알고리즘을 복제하지 않는다.
월 결과는 year/month, cell keys, normalized bounds와 closed polygons를 가진다. 후행 label은 이
bounds를 frame에 투영하므로 임의 pixel 위치를 저장하지 않는다.

기존 generated item 한도로 point/day 수를 제한하고 calendar boundary 계산·point 파싱·집계·edge
처리의 누적 work를 사전 검사한다. 순수 kernel은 프로그램, I/O, trace, renderer를 읽지 않는다.

## 검증 계획

독립 Gregorian arithmetic과 literal anchors로 2024년 366일/2월 29일, 1900/2000 leap rule,
연말/54-week frame, weekStartsOn 전체7값, NY spring/fall DST와 skipped civil day를 검증한다.
독립 polygon area/perimeter·cell occupancy oracle로 month union·hole·island·omit/empty를 검증한다.
중복 날짜 집계6종, 0/음수/overflow, 입력 순서 변경, 빈 입력, descriptor 및 budget 오류도 포함한다.
새 owner에 기존 grammar floor95/90/100을 적용하고 Contour 회귀를 함께 실행한다.

공개 `createCalendarPlot`/편집·resource schema·source revision·selection·resize·week/day/month label,
font/paint/effects·모든 backend·scene/codec·composition·타입/문서/설치는 다음 공개 연결 범위다.
현재 이 기록은 공개 API 구현 완료나 전체 STEP077 종료를 의미하지 않는다.

## 순수 kernel checkpoint 검증

Calendar/Contour kernel22개, 기존 날짜·Contour source/mark 회귀81개, source/discovery27개,
Contour renderer10개가 통과했다. 새 Calendar owner2개는 lines/branches/functions100%,
공유 gridBoundary는100/96.72/100이며 기존 grammar floor95/90/100을 적용했다.
초기 두 실패는 oracle 호출 wrapper가 getter를 먼저 읽은 시험과 skipped-day 오류 문구였다.
생산 코드 수정 없이 실제 경계를 직접 호출하고 명시 오류 의미를 검증해 회복했다.
Discovery의 신규 파일 미등록도 canonical calendar capability에 연결해 회복했다.

Node20.20.2/22.23.1/24.22.1 package dry-run은 모두882 entries/5,881,526unpacked,
packed1,278,849/1,276,103/1,278,849였다. ceiling은 최소1000bytes 단위
882/1,279,000/5,882,000으로 조정한다. private 계산 checkpoint이며 공개 surface는 그대로다.
전체 installed·docs build는 공개 Calendar final에서 한 번 실행한다.
