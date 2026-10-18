# 명시적 bootstrap 구간 정밀도 수정 — #229

## 진행 상태

- [x] 공개 0.0.20 / c219b993에서 finite 양수 구간이 0폭으로 변하는 독립 재현
- [x] 원인: 새 bootstrap 결과에도 기존 stableDecimal 12자리 반올림 적용
- [x] 승인된 #219의 정확한 Number/R7 계산을 유지하는 최소 수정
- [x] API·transform 저장 형태·RNG·추출 순서·한도는 변경하지 않음
- [x] 정상/t/오차/표준편차/중앙값 IQR의 기존 출력 경계는 유지
- [x] 독립 literal 및 summary 대조·binary scaling·그룹 순서·singleton·edit/revise/persistence·IntervalPlot/ErrorBand 소비자 35개 집중 검증
- [x] 단위3314·계약574·문서120·차트620 = 정상4628개 모두 통과
- [x] 설치 package consumer·bootstrap 브라우저1·primitive PNG1 및 문서150페이지 build 통과
- [x] 문서 전체320·390·768px·검색·키보드·접근성 browser 검사 통과
- [ ] 새 버전 원격 CI의 전체 실제 corpus·coverage·플랫폼 검증
- [ ] 원격 PR 검증·통합·새 버전 배포와 실제 registry 확인
- [ ] 번역 runtime/문서 전환 및 기존 출력 호환성 검증

승인 범위는 [기존 #219 승인 기록](../bootstrap-mean-ci/approval-evidence.json)의
정확한 shared stream / JavaScript Number / R7 수치 계약이다. 새 API나 미결정
설계를 도입하지 않고, 새 bootstrap 소비자에 남아 있던 기존 반올림으로 인한
정밀도 손실을 수정한다. 원래 구현과 현재 문서의 ‘bootstrap에도 기존 반올림’
설명은 이 수치 오류와 함께 바로잡는다. 다른 통계 방식의 과거 출력을 바꾸지 않는다.

## 재현과 근거

공개 0.0.20의 관측값 1, 1.0000000000001, 1.0000000000002,
1.0000000000003, 1.0000000000004 / seed1 / 1000 samples / level0.95에서
summary의 mean/lower/upper는 각각 1.0000000000002 / 1.00000000000008 /
1.0000000000003397이다. interval은 세 값 모두 1로 반올림했다.
새 회귀 검사는 이 literal을 정확히 고정하고 양수 폭과 두 소비자의 정밀값을 검사한다.

번역 작업공간의 `tmp/total1500-bootstrap-interval-precision-published20.test.mjs`는
동일 회귀 4개를 실제 설치된 공개 패키지로 실행한다. 최종 올바른 harness에서
4개 모두 수치 차이로 실패했다. 라이브러리 수정 뒤 집중 35개는 모두 통과했다.
초기 harness의 guides 옵션/x 문자열/단일 면적점 오류는 별도 로그로 보존하고,
최종 재현 결과와 혼동하지 않는다. 차트 픽셀/VLM은 검사하지 않았다.

현재 번역은 공개 0.0.20 / 고정 문서로 수행한 1,212개까지 보존한다.
진행 중 chart1264는 반올림 없는 Summary 경로로 완료했으며, 수정된 미배포 checkout을
번역 runtime으로 소급 사용하지 않는다. 새 버전 전환은 실제 registry와 호환성
확인 후 별도 checkpoint에서만 한다.

## 0.0.21 후보 checkpoint

수정 source commit은 f5c420de, 버전이 포함된 runtime commit은891d9345다.
문서/LLM 산출물은 `prepare-release.js 0.0.21`을 runtime commit 후 다시 실행해
contract `c2450e35c268baaf95a21d55b0d53161f1a0c76b2cd1821217a75c30d00de5ea`에
결합했다. API/type/변환 schema의 추가·삭제는 없다.
로컬 archive는591files/840093packed/4074366unpackedbytes로 기존 예산을 유지했다.
설치 consumer의 실제 archive SHA256은
`ee5c565ef5c98192c5630971df06d624e8d9d99c3e4da6809cb1f05693d46bcb`다.
이는 로컬 후보이며 실제 npm registry 공개 archive라고 주장하지 않는다.

단위 회귀 초기 harness 오류와 첫 docs build의 시스템 Ruby2.6/Bundler 누락도
로그로 보존했다. 올바른 complete ErrorBand 입력과 설치된 Ruby3.2 환경으로
수정 후 필요한 검사를 다시 실행했다. 통계·좌표 허용오차나 자원 한도는 늘리지 않았다.
1212families/8780programs의 frozen SVG를 이 후보의 실제591파일로 순차 비교 중이며,
원본 코드/데이터/참조와 후보 입력별 hash를 별도 checkpoint에 고정했다.

첫 PR CI39146868417의 Node24 archive는842045>842000으로45bytes 초과했다.
로그를 보존하고 실행 코드나 예산 대신 CHANGELOG의 같은 수정 설명만 간결하게 줄였다.
Node24.21.0 재검사는841982/842000, Node22는840035/842000으로 통과했다.
새 로컬 archive SHA256은
`4ef2bae7646299ff49e729eab62db51e09bf388580ee1ba2c9229b46a34c15ce`다.
이전 archive의 추출591파일은 보존했으며, 두 후보의 차이가 CHANGELOG 한 파일뿐임을
실제 hash로 검사했다. 실행/타입/JSON과 나머지590파일은 모두 바이트 동일하다.
따라서 진행 중 순차 렌더의 실행 입력은 그대로다. 실제 registry identity는 아직 대기 중이다.
