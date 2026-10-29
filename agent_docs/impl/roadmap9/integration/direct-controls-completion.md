# 직접 필터·정렬 통합

## 진행 상태

- [x] 기존 전체 승인과 source `9e0b47f1b`의 두 runtime owner 보존
- [x] STEP059·routes·중첩 responsive main `7a34a6417`에 통합
- [x] 집중93·owner coverage134·계약28·실제데이터16·browser17
- [x] 동일 tar Node20·22·24 각각 theme90·runtime23·strict types/optional peers/5bundles
- [x] 문서191·source pin191·built170pages/1454LLM·전체320/390/768px browser
- [x] 검증한 동일 source와 기록의 main 반영 (`8a2f0e1ed`)
- [ ] STEP060 잔여 기능·STEP074·077 인수

기존 filterMarks/removeMarkFilter와 orderCategories/removeCategoryOrder를 interaction session의
원자적 명령으로 연결한다. Source row 순서와 final-item 의미, scoped owner와 기존 trace를 보존한다.
공개 API의 정본은 Current INTERACTION/ENCODINGS이며 [원 STEP060](../interaction/STEP060.md)의
후행 linked filter·legend·parameter·context·annotation·drag/focus/navigation 의무를 유지한다.

Source `a9e706a70`에서 두 runtime owner는 incoming과 byte-identical이다. source 충돌 없이 기존
region/route source를 보존하고 생성 문서는 합산 원문에서 재생성했다. 핵심 두 owner coverage는
각각100/99.12/100와98.17/93.48/100이다. 초기 좁은 coverage 선택을 전체 기준 충족으로 세지 않는다.

같은 archive SHA256 `0d5d00fa4742505b2b278c3fec258193766a96f241816b79fccd437d1aa8bde4`의
980entries/1404760packed/6403942unpacked를 검증했다. Node20/24 Full688008gzip에 최소 상한688100을
적용했고 다섯 entry의 budget을 명시 검사했다. source pin 후 repack은 byte-identical하다.
[검증 기록](direct-controls-completion-evidence/summary.json)이 로그·source hash·설치 결과를 소유한다.

일반 renderer source/primitive schema는 바뀌지 않았다. 기존 renderer 증거를 재사용하며 새 native
출력 지원을 주장하지 않는다. 공통27은 앞선 routes main의 근거이고 이번에는 final-grain16개를 실행했다.
전체 coverage·STEP060 전체·STEP074·077 완료는 아직 아니다.
