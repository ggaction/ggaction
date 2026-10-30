# Cartesian typed animation 검증

소스는 `ea543c62f`이며 공개 함수 원형은 바뀌지 않는다. 승인은
[remainingApproval](../../AUTHORIZATION.json#remainingApproval), 현재 지원 범위는
[ANIMATION](../../../../contract/current/ANIMATION.md)이 소유한다.

## 범위와 결과

- 실제 final item identity·row lineage에 대응하는 rule, range/band rect, aggregate/ranged/centered bar,
  histogram, ordered line/area의 값·scale·geometry를 준비한다. Native 집계/bin/stack/wiggle은 준비에만
  사용하고 매 frame의 shape는 기존 path/rectangle/bar geometry owner가 만든다.
- Graph `350b72e55` 및 flat frame provenance를 함께 보존했다. 현재 frame의 의미 vector만 유지하며
  이전 plan을 다시 보존하지 않는다. 다른 정책/행 grid/appearance와 미지원 배치는 명시 crossfade다.
- Animation182/182와 critical29개의 기존95/90/100 바닥, 실제 데이터20/20, 네 renderer7/7,
  source/package/discovery/native bar 회귀63/63, 경계/타입14/14가 통과했다.
- `test/support/animation-cartesian-frame.js`의 같은6 variants를 실제 Browser Canvas/SVG(DPR1/2),
  native PNG/PDF로 확인했다. Log rectangle의 중간 값, step/smooth path, 닫힌 area, bar와 histogram
  내부 literal pixel 및 양끝 native PNG 동일성을 검사한다. Histogram resize의 Canvas 배경은 기존
  crossfade이므로 그 PDF 전체가 vector라고 주장하지 않는다.
- 동일 archive `2179358c355a2786344f5292bbc701bee209319dc2fd7134f2a0b4ad1b29656f`를
  Node20/22/24에 설치해 각각 공개8runtime·strict 타입·실행 문서 snippet·6entry browser bundle을
  검증했다. 별도 fresh process의 network guard와 정확 scene/offline 재생을 포함한다.
- Full/Basic/animation/interaction gzip 실측 최대774093/422288/200273/128607에 맞춰 최소 상한을
  774100/422300/200300/128700으로 조정했다. SVG/graph 기존 상한은 유지했다.
- Package실측은1141entries, 최대1630635packed/7381995unpacked다. 이 branch의 focused 자격이며
  전체 release/STEP074/077 sweep 또는 package publish 증거가 아니다.

## 최초 실패와 수리

Graph 성공 경로의 Cartesian null 누락은 동일 vector 길이를 보존하도록 수리했다. Incomplete line은
identity를 해석하기 전에 native 준비 상태를 확인한다. 렌더 fixture의 area 기본 opacity와 histogram
옵션 오류는 fixture만 바로잡았고 최초 로그를 보존했다. 실제 자료의 row reorder는 원행·값을 유지하며
기존 category domain을 명시해 typed domain 의미가 같도록 했다. 실제 categorical domain이 달라지는
별도 단위 검사는 계속 crossfade를 요구한다.

첫 package 검사는 이전1125entries 상한에서 실패했다. 첫 animation bundle harness는 잘못된
chart/render import를 만들어 실패했으며 peer350의 실제 animation namespace import를 재사용했다.
문서231개 중 검색 상한2개가 실패했고 실측1080845bytes에1080900cap을 적용한 owning31개가
통과했다. 나머지229개를 다시 실행한 것으로 세지 않는다.

원본과 tar를 직접 바이트 비교하면 canonical pack의 명시 JS/JSON 압축 때문에 다르다. 최초 비교는
별도 JSON에 보존했다. source pin 후 absolute destination으로 canonical repack한 결과 동일 SHA임을
검증했으며, metadata-only 문서 변경은 설치 artifact를 바꾸지 않았다.

## 재현

`COMMANDS.md`, 설치 실행기 `qualify-package.mjs.txt`, 원본 로그 gzip과 JSON receipts를 함께 보존한다.
`qualification.json`의 render artifact hash는 gitignored 출력의 확인값이며 원 프로그램으로 재생성한다.

## 최종 문서 및 Basic 보충

source pin18/18, built186페이지/1598LLM artifacts, 전체페이지320/390/768px 브라우저가 통과했다.
Basic은 현재 공개 bar/line/range·band rect/histogram5종을 source Node20/22/24에서 별도1검사씩
확인했다. 처음 보충 fixture가 Full 전용 rule/area 작성 함수를 호출한 실패와, y field 변경을 같은
aggregate identity로 가정한 실패를 보존했다. 최종 fixture는 Basic 공개 범위만 사용하고 같은 field의
명시 domain 변경으로 값·scale 보간을 확인한다. 새 공개 API나 runtime 수정은 없다.
