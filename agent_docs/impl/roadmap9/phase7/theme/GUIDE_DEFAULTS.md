# Native guide 색 복원

## 진행 상태

- [x] Cartesian/named/Polar/Parallel 축·격자와 범례의 native 기본값 복원
- [x] 명시한 동일 기본색·Basic·theme-before-create·codec 보존
- [x] Nested concat/facet의 child/shared-guide snapshot 소유권 보존
- [x] Stroke sample fill 의존성과 GradientPlot density 범례의 별도 역할 연결
- [x] 집중 검사·Current·문서·설치본과 실측 package 경계 검증
- [ ] STEP-033의 Flow 연결·guide geometry/palette token·provenance
- [ ] STEP-034/035 responsive layout·nested facet/shared guide의 나머지 계약

기준은 `f5c4ccda7`다. 기존 마지막 theme 제거가 generic light token으로 가이드 색을 되돌려,
native 축·범례와 다른 값을 남기는 결함을 수정한다. 각 family의 기존 default owner를 읽으며
별도 prior-style snapshot이나 새로운 공개 API/저장 schema를 만들지 않는다. 명시한 색은 native
기본값과 같아도 기존 override owner로 보존한다. GradientPlot density 범례의 title/label/border는
각 역할에 따라 바뀌고, density paint와 통계 결과는 그대로 유지된다.

Composition root는 자신의 Canvas/title/header/native guide만 다시 조정한다. Child와 collected guide는
이미 해당 child에서 결정된 snapshot이므로 부모에서 다시 색을 바꾸지 않는다. 이는 nested concat 안의
facet(shared legend, outer axes), 서로 다른 좌표계와 명시 범례 스타일의 codec 왕복으로 확인한다.

Stroke gradient/interval 범례는 먼저 대상 mark 색을 갱신한 뒤 기존 sample fill 정책을 재사용한다.
전체 범례를 다시 배치하는 중간 시도는 label baseline/위치를 바꾸어 회귀에서 실패했다. 최종 구현은
색 의존성만 `editGraphics`로 갱신하여 geometry를 보존한다. 최초 실패 로그를 통과 결과로 세지 않는다.

새 18개와 기존 theme/parallel/GradientPlot을 합친 118개 집중 검사가 통과했다. 새 guide-default owner는
97.22/96.83/100 line/branch/function coverage이며 95/90/100 floor를 유지한다. 기존 공개 unit 예제 중
active theme가 없는 88개에 대해 apply→remove 후 graphicSpec 완전 일치를 확인했고, 같은 검사를 기존
theme contract에 넣었다. Boundary/discovery/coverage-policy 40개, package 7개, docs 172개도 통과했다.

Node20 source-free 설치에서는 공개 package import만 사용해 동일 18개를 실행한다. 실제 bundle은
Full 602,826 / Basic 351,086 / SVG 19,199 gzip bytes다. 새 private default owner로 package는 824 entries,
5,569,000 unpacked bytes이며 Node20 packed 1,212,890 bytes다. 기존 한도에서 넘은 항목만 각각
824 / 5,570,000 / 1,213,000 bytes 및 Full603,000/Basic352,000으로 조정했다.

Commands, source/log hashes, 고정 tar와 설치 결과는 `guide-defaults-evidence/summary.json`에 보존한다.
이 checkpoint는 native reset과 ownership 수리다. 전체 corpus·whole source coverage·3개 Node 전체
설치 또는 신규 pixel parity 검증을 했다고 주장하지 않으며, 후속 token과 responsive 의무를 닫지 않는다.
