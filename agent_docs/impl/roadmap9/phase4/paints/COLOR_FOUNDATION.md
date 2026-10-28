# 공유 paint 색상 계산 준비

## 진행 상태

- [x] P1/P2 revision `06e9eba8` 및 전체 구현 승인 정본 `PUBLIC_APPROVALS_20261028.json`/`AUTHORIZATION.json` 재사용
- [x] 기존 continuous scale 색상 계산을 순수 공유 owner로 이동
- [x] 새 structured paint/effect용 명시 RGBA 파싱과 opacity 결합 계산
- [x] 수치 literal, 불변성, 잘못된 문법, inherited getter, 자원 한도와 기존 허용값 보존 회귀
- [ ] P1 pattern/radial의 공개 fill·materializer·renderer·consumer 연결
- [ ] P2 outline/shadow 및 모든 공개 계약·rendered equivalence·설치 소비자 완료

이 checkpoint는 공개 paint 연결의 내부 준비다. `FillPaint`, 공개 action, concrete schema,
문서 지원표를 아직 확장하지 않으며 STEP017 또는 Roadmap9 완료를 뜻하지 않는다.

## 소유권

`src/grammar/color.js`는 RGB/HSL 채널 계산과 색상 읽기의 단독 owner다. 기존
`grammar/scales/color.js`는 기존 continuous 입력 정책을 명시적으로 호출하며 RGB/HSL 결과와
기존 accepted syntax를 유지한다. 새 `parsePaintColor`는 승인된 hex 네 형식, comma RGB/RGBA/HSL/HSLA,
148개 표준 named colors와 transparent만 받고 frozen `{r,g,b,a}`를 반환한다. CSS host lookup,
`currentColor`, variable, 다른 함수, 비유한 수와 범위를 벗어난 channel/alpha는 오류다.
RGB의 percentage/number 혼용도 새 paint 경계에서는 거부하지만 legacy continuous의 기존 허용은 유지한다.

Hue는 deg/grad/rad/turn을 공통 RGB 계산으로 보내며 큰 finite hue는 주기를 먼저 줄인다.
`paintColorCSS`는 명시 opacity를 alpha에 정확히 한 번 곱한 concrete 문자열을 반환한다.
표준 named-color 표는 고정 데이터이며 새 runtime 의존성을 만들지 않는다. Own key 조회를 사용하여
프로토타입의 getter를 실행하지 않는다. 색상 문자열 길이는 공통 work 한도 아래에서 검사한다.

## 검증

정확한 원 로그와 hash는 `color-evidence/manifest.json`을 따른다.

- Node22 focused 50/50, 새 owner line/branch/function 100/100/100
- Node20 및 Node24 기존 scale+새 parser 각각 46/46
- source/package boundary·discovery·critical policy 40/40
- Critical family `paint-color`는 95/90/100으로 기존 grammar 기준 이상 유지

패키지 측정과 최종 체크는 같은 evidence manifest에 기록한다. 기존 palette interpolation,
solid fill 및 linear gradient의 선언/저장 모양은 변경하지 않는다. 공개 연결 후 필요한 실제
5 datasets/3 recipes, Canvas/SVG/PNG/PDF, codec/scene/replay/selection 증거는 이 내부 검사를
대체 근거로 사용하지 않고 후속 P1/P2에서 추가한다.

패키지 실측은739 entries, Node22 packed1,097,682bytes, Node20/24 packed1,100,756bytes,
unpacked5,062,143bytes다. 기존738/1,098,000/5,054,000 한도는 초과했으며 실패 로그를 보존한다.
새 owner 한 개와 최소1,000byte 올림에 맞춰739/1,101,000/5,063,000으로 제한한다.
설치 artifact에서 측정한 Full/Basic gzip534,744/312,645bytes는 기존537,000/315,000 이내다.
Package 계약7/7 및 최종 critical policy7/7도 통과했다. 통합 시 다른 branch의 caps를 그대로
복사하지 않고 함께 실측한다.
