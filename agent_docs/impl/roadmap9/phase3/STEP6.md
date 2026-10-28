# STEP6 — Prepared source 데이터 제품 통합

## 진행 상태

- [x] [전체 실행 승인](../AUTHORIZATION.json)과 [G-DATA](G-DATA.json)의 구체 계약 적용
- [x] 비동기 prepareDataUpdate와 동기 applyDataUpdate, Full/Basic 경계
- [x] CSV/JSON 원본 receipt, live source resource, explicit identity 및 offline 복원
- [x] Parameter URL·computed multi-root closure, atomic 실패와 stale/abort/ABA 거부
- [x] Source revision, manual detach, facet/repeat/concat 소비자 연결
- [x] Current·타입·문서·실행 액션 카드 동기화
- [x] Installed Node20/22/24: 동일 archive의 Node193·tutorial65·qualification7 묶음 통과
- [x] 전체 render272·browser299, built150pages·LLM1210 및 문서 browser 검증
- [x] AT-16 공개 실행 49사례의 independent expected와 actual/diff 기록
- [x] 최종 전체 coverage·normal: 6,592 tests, 0 failures, 입력 hash 변화 없음
- [x] Realistic: 29files/275tests 모두 통과, runtime·타입·fixture·발견한 test SHA 불변
- [x] 검증 evidence와 구현 checkpoint `ed0eff54` commit/push
- [x] Main 통합 `19d14da4` 및 clean 로컬 필수 검사
- [ ] CI package 크기 한도 수정 후 exact-commit STEP-013 종료 기록

현재 구현 계약은 [CORE](../../../contract/current/CORE.md#applydataupdate), 설계 경계는
[PUBLIC](data/PUBLIC.md), 저장 검증은 [STATE](data/STATE.md)가 소유한다.
기존 [STEP3](STEP3.md)의 parameter 제품 checkpoint를 이번 데이터 source 검증으로 덮어쓰지 않는다.

## 통합 중 해결한 결함

- 준비한 revision plan을 실제 적용에 재사용해 긴 dependency chain의 재귀 overflow와
  이미 점유된 revision ID의 재배정을 막았다.
- 원본 text를 semantic receipt에 보존하면서 child primitive trace에는 길이를 기록한다.
- Facet source를 직접 rows로 고친 뒤 이전 source binding이 다시 채택되던 경로를 제거했다.
- Opaque handle의 내부 type brand를 작성 옵션 인벤토리로 세지 않으며, 실제 public 실행을
  lifecycle recipe에 넣었다. 잘못된 참조는 숨기지 않고 실제 dataset과 일치하는 logical ID만
  cross-process fingerprint에서 정규화한다.
- 액션 관계와 카드·타입 예제의 누락을 보강했다. Malformed-action matrix는 wrapper 진입 후
  복제본 대신 원래 receiver에서 replay하여 exact-base 계약을 보존한다.
- Worktree의 untracked dependency symlink 때문에 coverage receipt 생성이 실패하던 문제를
  symlink 자체의 identity hash와 회귀 시험으로 수정했다.

첫 전체 coverage 실행은 6591개 중 6588pass/3fail이었다. 실패는 current coverage marker,
matrix receiver, typed snippet 문맥이며 관련 수정 후 집중 검사는 통과했다.
동일 실행의 source coverage는 line96.00/branch93.59/function98.80%, critical floors215개를
충족했지만 실패 aggregate를 최종 성공으로 표시하지 않는다. 원본 log와 수정 후 전체 결과를
별도로 보존한다. 첫 realistic 실행의 worktree cache 부재도 보존하고, 50개 pinned cache hash를
검증한 뒤 지원 환경변수로 경로를 명시하여 재실행했다.

## 재현

```sh
node scripts/qualify-expression.js
npm run test:coverage
npm test
npm run test:realistic
npm run test:browser
npm run test:render
npm run docs:verify
npm run package:pack
node scripts/package-consumer.js .artifacts/release/ggaction-0.0.26.tgz
```

AT-16 실행기는 공개 createComputedData와 registry 조회를 사용하며 30개 함수, typed/null/missing,
lazy evaluation, field와 fieldPath 구분, parameter, 날짜/DST, hostile input과 getter를 검증한다.
각 호출·기대값·실제값·빈 diff와 source hash를 `.artifacts/acceptance/expressions.json`에 기록한다.
원래 review/verify.mjs는 과거 결함을 재현하는 역사적 자료이므로 현재 인수 시험으로 재사용하지 않는다.

최종 normal/coverage는 각각 6,592passed,0failed이며 coverage는 line95.98/branch93.60/function98.80%,
critical floors215개를 충족한다. Realistic 전체275개는 약49분56초에 통과했고 stable811개 입력의
SHA256은 `81280858e868afdcdd965b2b276dcd0542fbad9384c0793c8bc4f5811ee72799`다.

이 checkpoint의 source package는 696 entries, packed1035817/unpacked4828104bytes,
SHA256 `e7a1b5aad141ab5f10e24a71b85283911e5b456f060ec6f7949e554eee57ccd7`다.
실제 크기의 1000-byte 올림으로 한도1036000/4829000을 정했다. Full/Basic gzip은
523989/303780bytes, 한도525000/305000이며 SVG 한도25000은 유지한다.
검증 환경은 Node22.23.1/Ruby3.2.11이고 CI의 Ruby3.2.6과 구별한다.

STEP-014/015 통계·달력과 STEP-016 조건부 dataflow 및 STEP-017 이후 범위는 계속 남아 있다.
이 문서나 하나의 체크포인트가 전체 Roadmap9 또는 STEP-077 완료를 뜻하지 않는다.

## STEP-013 종료 증거 계획

최종 source commit을 고정한 뒤 clean receipt의 `ci-coverage`, `suite-unit`, `suite-contracts`,
`expression-acceptance`, `metadata-check`, `docs-verify`, `package-check`를 모아 completion validator로
검사한다. 제품 통합의 전체 normal/realistic/render/browser/installed matrix와 frozen input hash는
추가 artifact로 보존한다. 현재 dirty working-tree receipt를 clean commit 증거로 바꾸지 않는다.
CI는 exact commit을 대조하고, 앞선 parameter commit의 CI20jobs 성공과 이번 DATA 검증을 구분한다.

후속 통계 통합과 CI package 크기 실패/수정은 [STEP7](STEP7.md)에 기록한다.
