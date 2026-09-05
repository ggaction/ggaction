# Phase 4 통합 검증 기록

W1–W5 구현 기준은 `082e6cc7`이다. [전체 실행·0.0.13 릴리즈 승인](../APPROVAL.md)을 적용한다. 이 기록은 진행 중인 통합 검증이며 Phase 완료 기록이 아니다.

## 현재 통과한 검사

- Normal: W5 최종 2,748/2,748. [W5 결과](RESULTS_W5.md).
- Coverage: exit 0. Lines 95.16%, branches 91.69%, functions 98.79%; critical floors 74개 통과.
- 같은 검증 tarball의 Chromium 설치 소비자: 1/1 통과. SHA-256 `51d15921c3d82dcf6a65cb322132884483741418bd176d136fc0035dde6b0d75`이며 다시 pack한 파일을 사용하지 않았다.
- 문서 source 47/47, Jekyll build, built pages 125개 links/assets 검사 통과.
- 검색 수정 뒤 desktop 검색·keyboard·Axe·no-JS와 모든 페이지의 320/390/768px browser 검사를 exit 0으로 완료했다.

## 발견한 통합 문제

1. Ruby 3.3/Bundler 2.4.19의 현재 macOS 플랫폼 `arm64-darwin-25`가 lockfile에서 빠져 frozen preflight가 실패했다. 플랫폼 한 줄만 추가했으며 gem 버전은 그대로다.
2. 새 `createRosePlot`의 검색 intent `rose chart`가 기존 Rose recipe 키워드와 동점이었다. 알파벳 순으로 액션 참조가 먼저 나와 기존 사용자 경로 검사가 실패했다. 같은 점수에서는 제목에도 검색어가 들어간 결과를 먼저 보여 준다. 실제 액션 이름 검색의 우선순위는 유지하며 browser 검사에 `createRosePlot` 경로를 추가했다.
3. Realistic/generated 검사에서 새 direct 액션 2개, midpoint·범례 order·radial mapping의 옵션 목록과 실행 증거가 누락됐다. 전체 실행의 실패를 보존하며 필요한 생성 시나리오와 exact inventory를 함께 보완한다. 숫자나 hash 갱신만으로 누락된 동작 증거를 완료 처리하지 않는다.

로그: `.artifacts/roadmap6-authoring/phase4-integration-*.log`. Realistic 전체와 renderer 전체 및 최종 원장 대조는 아직 진행 중이다.
