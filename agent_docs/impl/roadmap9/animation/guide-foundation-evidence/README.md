# Guide 준비 기반 검증

이 기록은 [GUIDES 설계](../GUIDES.md)의 private 준비 체크포인트다. 공개 animation 여섯 API,
plan payload, 현재 frame provenance에는 아직 연결하지 않았으며 STEP061/062/077 완료 증거가 아니다.
승인 근거는 [remainingApproval](../../AUTHORIZATION.json#remainingApproval)다.

- Native axis/grid의 기존 계산을 순수 geometry·tick value·item association 소유자로 공유했다.
  Hit의 namespace 순회도 공유하며 호출자가 기존 검증과 work budget을 유지한다.
- Typed raw value와 명시 owner/namespace/line role로 가이드를 대응한다. 표시 문자열이나
  배열 순서로 서로 다른 값을 연결하지 않으며 중복 값은 ambiguity로 분리한다.
- 독립 준비·기존 hit/guide 회귀 95/95, 변경 소유자 커버리지 99.47/95.17/100,
  canonical critical floor 7개가 통과했다. Boundary/package/documentation 계약 23/23,
  최종 한도 동기화 후 package/documentation 10/10이 통과했다.
- 같은 `bcb9d46d…f66d614` tar를 Node 20/22/24에 설치해 기존 공개 guide 6개 사례,
  optional peers, 공개 entry 6개 bundle을 검증했다. 이는 새 public guide animation 증거가 아니다.
- Package 실측 최댓값은 1,151 entries / 1,643,284 packed / 7,430,625 unpacked bytes다.
  한도는 1,151 / 1,644,000 / 7,431,000으로 맞췄다. Basic 422,320과 interaction 128,881
  gzip bytes가 이전 한도를 초과하여 각각 422,400과 128,900으로 최소 교정했다.

최종 `25f72806…81edf142` tar는 README의 현재 Basic 한도만 달라진다. 전체 tar member의
SHA 비교로 나머지 1,150개가 동일함을 확인해 위 설치·bundle 증거를 재사용했다.
최종 README tar를 다시 설치했다고 주장하지 않는다. `guide-package-readme-proof.json` 참조.

최초 kernel/투영/pack/설치/cap 실패는 로그와 JSON으로 보존했다. 설치의 첫 실패는 실행
fixture가 참조한 기존 example support 파일의 누락이었다. 같은 tar로 support 복사를 추가하여
통과했다. 초기 import 추출 script가 범위 밖 import formatting을 바꾼 것은 clean baseline으로
그 변경만 복원한 뒤 scoped 추출을 다시 실행했으며 최종 기록에는 그 범위 밖 변경이 없다.

남은 의무는 공개 planner/sample/current frame/strict offline 연결, 네 renderer의 중간 프레임,
title·legend·Parallel·reflow·boundary grid와 timeline이다. 공유 animation seam은 Geo 및
appearance version owner의 안정 ref를 받아 한 번에 결합한다.

정확한 파일 hashes는 `source-hashes.json`, 실행 결과는 `qualification.json`, 명령은
`COMMANDS.md`와 `installed-runner.mjs.txt`를 따른다. Gzip 로그는 최초 실패와 최종 결과를 구분한다.
