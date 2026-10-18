# 0.0.20 통합

## 진행 상태

- [x] #218/#219의 기존 공개 계약·독립 시각 목표에 대한 승인 기록
- [x] 각각 구현·검증·동기화된 feature checkpoint를 commit/push
- [x] 기능 checkpoint unit3309/contracts574/docs120/charts620 및 설치패키지/브라우저/동회차 primitive 비교 통과
- [x] 문서150pages build/links/assets 및320·390·768px/search/keyboard/Axe/no-JS 로컬 검증
- [x] 0.0.20 버전·knowledge·Context7 version entry·정확한 source fingerprint 준비
- [x] 혼합 mark의 continuous legend inference 회귀를 공개0.0.19와 독립 재현 후 수정
- [x] 첫 원격 CI의 package 상한 초과를 보존하고 기존 compaction 범위로 보완
- [ ] 최종 source/metadata PR CI 전체 통과 및 main merge
- [ ] 승인된 정확한 annotated tag의 protected release workflow 성공
- [ ] 실제 registry artifact 동일성·설치·문서 배포 및 번역 runtime 동기화

PR: https://github.com/ggaction/ggaction/pull/228
기능별 증거는 `../continuous-area-color/RESULTS.md`, `../bootstrap-mean-ci/RESULTS.md`가 소유한다.

첫 CI39121048401의 package24/macOS/Firefox 등 실패는 같은842497>842000packedbytes 상한에서 발생했다.
해당 로그는 `.artifacts/release-0.0.20-ci-*-job.log`로 보존한다. 상한을 늘리지 않고 기존 package-only
esbuild compaction에 이미 변경한 Area series owner를 추가했다. 수정 뒤 로컬 0.0.20 후보는
591entries/839987packed/4074029unpacked다. 최종 원격 플랫폼 검증은 대기 중이다.

별도로 `continuous Point + categorical Area`의 기존 legend 추론이 새 Area eligibility 때문에 모호해지는
실제 회귀를 발견했다. 공개0.0.19에서는 성공하고 초기 후보에서는 실패함을 재현했다.
기존 공통 continuous color selector에서 정량/시간형 color 필드만 eligible로 판단하도록 수정하여
categorical mark가 실제 연속 척도 소비자를 가리지 않게 했다. 반대 조합인 categorical Point +
quantitative Area도 검사하며 target을 임의 선택하지 않는다. 관련63개 집중 검사가 통과했다.

새 runtime source commit은08cf5a45이며 현재 fingerprint는
`6e87a7533f9c704a422f5578f5a4370375ae9cdba93e0f42ac7f7f1dbe3c54f1`다.
준비된 문서 metadata의 release 표시는 publish를 대신하지 않는다. 실제 registry/배포 검증 전에는
사용자 보고나 번역 pipeline에서 공개0.0.20가 사용된 것으로 기록하지 않는다.


두 번째 CI39121507363은 package archive와 Windows/macOS/Firefox/WebKit/coverage/docs를 통과한 뒤
Node20 browser bundle에서416480>416000을 발견했다. 로컬 Node20.20.2로 동일 Full416480/Basic204183을
독립 재현했다. Node22 측정415595/203811과 지원 Node20의 gzip 구현 차이가 있어 Node22만의 통과를
최종 근거로 삼지 않았다. 수정한8owners에 기존 compaction을 추가한 실험은 Full415596/Basic203810으로
효과가 없어 되돌렸고 실패/실험 로그를 보존했다. 새 기능의 실제 코드 증가에 맞춰 버전0.0.20의
bounded bundle budget만 최소1000bytes 단위417000/205000으로 갱신한다(Full+0.24%, Basic+0.49%).
SVG25000, archive842000/4087000/591entries, 데이터·경로·통계 한도와 모든 수치/시각 오차 기준은 유지한다.
이것은 새 release의 측정된 코드 예산이며 기능·알고리즘을 생략하거나 측정기를 바꾸지 않는다.

세 번째 CI39122526026은 package20/22/24, 두 플랫폼, Firefox/WebKit, coverage, documentation,
일반 test와 realistic1–5/7을 통과했다. realistic6의 단일 실패는 이전 공개 옵션 inventory 고정값이었다.
공개0.0.19 선언과 새 선언을 같은 생성기로 비교하여 bootstrap method의8개 데이터 정의 위치에
samples/seed/type 경로24개가 추가되고 삭제는0임을 확인했다. 직접 관찰 가능한3위치의9경로와
bootstrap literal3개가 실제 coverage requirement12개를 더한다. 나머지15경로는 기존 trace의
배열 요약 정책에 따라 부모 옵션으로 증명하며 예외 정책을 변경하지 않는다.
검사는 새 개수뿐 아니라8개 위치의 정확한 집합·관찰 방식과9개 직접 경로·3개 literal 요구를 검증한다.
로컬 비교와 실패/재검사 로그는 `.artifacts/release/0.0.20-option-inventory-*`에 보존한다.
