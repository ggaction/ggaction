# 평균 백분위 bootstrap 구현 검증

## 진행 상태

- [x] 승인된 비가중 평균 CI method 객체·seed/RNG·R7 수학·한도 구현
- [x] summary/interval 생성·focused edit·source revision·저장/복원 및 원자적 거부 검증
- [x] 독립 수치 목표 5개 그룹의 mean/lower/upper 정확 일치
- [x] 독립 Area/Line primitive와 그래픽·SVG·실제 Canvas 호출/RGBA·PNG 정확 일치
- [x] 승인된 원래 SVG와 같은 회차 Chromium RGBA 281,600바이트 정확 일치
- [x] 전체 unit 3,309 / contracts 574 / docs 120 / charts 620 통과
- [x] 실제 브라우저 Canvas/SVG, 설치 패키지 JavaScript·TypeScript·MCP 소비자 통과
- [x] 문서150pages build/links/assets와 전체320·390·768px responsive containment, search·keyboard·Axe·no-JS 검증 통과
- [ ] 별도 새 버전 출판 및 번역 runtime 동기화
- [ ] 관련 실제 소스만 seed1 참조 동결·원본 traversal 증명·학교 모델 재번역

구현 source revision: `84e86de2`; 후속 evidence/docs-only 변경은 같은 구현을 보존한다.
로컬 설치 패키지 후보 SHA-256: `b63acb37623ce33ec4b410f7a9b8f1d53a996ddff29b8e076572899571d4d5da`.
패키지591entries/840526packed/4081316unpacked, 설치 bundle gzip Full415565/Basic203788/SVG7325bytes로 기존 상한을 유지했다.
후보 검증은 registry 출판이 아니다. 번역 runtime은 아직 공개0.0.19다.

## 재현

```sh
npm run test:unit
npm run test:contracts
npm run test:docs
npm run test:charts
npm run test:package
node --test test/browser/bootstrap-mean-ci.browser.js
node --test test/charts/bootstrap-mean-ci/png.render.js
node agent_docs/impl/bootstrap-mean-ci/verify-approved-target.mjs
npm run docs:preflight
npm run docs:build
npm run test:docs:built
npm run test:docs:browser
```

로컬 문서 도구는 Ruby3.3.12(의존성 lock 해석 성공)이며 기본 shell Ruby2.6.10 실패 기록을 보존했다.
CI의 pinned Ruby3.2.6 검증은 원격 통합에서 별도로 수행한다.
로그는 `.artifacts/bootstrap-mean-*.log`에 있다. 첫 문서 검사에서 검색 index의 기존833000bytes 상한을 초과했다.
상한·검색어·URL은 유지하고 summary excerpt 최대232→224글자만 줄여829461bytes로 만들었으며 전체 실제 사이트 브라우저 검증을 통과했다.

## 계약과 소비자

- 시드 필수1..2147483646, samples1..10000/default1000, level은 기존0..1 열린 구간/default.95.
- field/samples/seed별 action 내부 독립 stream. 그룹/행 원래 순서를 보존하고 lower/upper/복수 level에 같은 정렬된 표본 평균을 재사용한다.
- singleton은 samples개 draw를 실제 소모하고 empty는 소모하지 않는다. 출력 순서나 추가 mean은 결과를 바꾸지 않는다.
- 기존30,000 groups/64 outputs를 유지한다. unique stream의 총 resampling draws는 계산 전50,000,000까지 허용하고 초과를 거부한다. 경계 실계산·재사용·입력 불변성까지 검사했다.
- 기존 transform method에 정상화한 객체만 저장하며 cache/RNG state는 semantic schema에 추가하지 않는다. 원본 데이터를 변경하지 않는다.
- weighted, regression, median/IQR, 다른 facade CI vocabulary, implicit seed, bootstrap 문자열과 unknown key를 거부한다. Basic은 원래 summary/interval 생성 API가 없다.
- 기존 normal/student-t, interval의12-decimal 경계 및 모든 renderer의 backend-neutral graphic 소비를 보존한다.

원래 `target-evidence.json`/`variant.json`은 공개0.0.19 거부와 독립 목표의 역사적 기록으로 남긴다.
승인 PNG는 `.artifacts/test/png/charts/bootstrap-mean-ci/bootstrap-mean-ci/skewed-five-groups/approved-target.png`로 이관했다.
안정된 테스트와 예제는 Gate/구현 기록을 import하지 않는다. 사람이/모델이 차트 픽셀을 시각 검사했다는 주장은 하지 않는다.
