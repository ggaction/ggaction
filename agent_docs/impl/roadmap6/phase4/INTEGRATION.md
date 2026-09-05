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
4. Nested legend 타입이 facade의 position 역할보다 넓었다. Cartesian은 x/y, Pie·measured radial은 theta, 선언된 quantitative/temporal Line·Area·Density와 Parallel은 scale/values로 구분했다. 일반 lower legend 타입과 runtime은 바꾸지 않았다. Positive/negative strict 타입 검사 1/1, 생성 문서 동기화와 normal 2,748/2,748 통과. 관련 실제 데이터 사례 보완은 계속 진행한다.

로그: `.artifacts/roadmap6-authoring/phase4-integration-*.log`. 후속 검증은 아래 기록을 따른다.

## 시나리오 보완과 최종 통합 진행

- 첫 realistic 전체 결과는 **203/212, 실패 9**다. 실패를 숨기지 않고 초기 로그를 보존했다. 새 기능의 옵션·literal 목록, direct-root 생성 recipe, midpoint·order·측정 반지름 실행 사례를 보완했다.
- 사용자 액션 175개의 direct-root smoke 호출을 모두 실행한다. 새 Rose/Radial Bar는 count/sum, disk/hole, lower mark edit를 조합한다.
- 자동차·국가·영화의 pinned 실제 데이터에 두 facade × 5개 변형 × 3개 데이터셋 **30개**를 추가했다. 기존 45개와 합쳐 75개가 통과했다. Category별 원본 count/sum, 비어 있지 않은 모든 sector, hole 제외 면적/반지름 길이의 독립 수식과 domain/Canvas edit 후 위치를 검사한다.
- Cartesian 720개와 statistical 460개 projection에 midpoint reset과 가능한 legend order를 실제 top-level 호출로 추가했다. Direct encoding matrix에 두 측정 방식 × count/sum을 넣었다. Guide/scale은 실제 Arc consumer의 createScale/editScale 뒤 기존 Point guide lifecycle로 진행한다. 서로 다른 역할의 scale·coordinate에는 명시적 ID를 쓴다.
- 옵션 검사기의 `?: never`/undefined-only 경로를 제외했다. 유효한 union branch는 유지한다. 제거된 네 경로는 Line·Parallel·Area·Density facade의 불가능한 legend order.channel뿐이며 양성/음성 검사가 있다. 최신 inventory는 사용자 액션 175, 전체 paths 5,533, required paths 4,762, redacted arrays 771, literal requirements 2,567, 총 ledger requirements 7,683이다.
- Scenario 보완 뒤 **normal 2,748/2,748**, 전체 renderer **205/205**. 승인 gallery **168 variants**, active review **0 variants**의 생성과 browser 검사도 통과했다.
- 수정된 타입을 포함한 [최종 개발 패키지](package-integration-results.json) 설치 검증과 같은 tarball Chromium **1/1**이 통과했다. SHA-256 `09b665efe60d178a8af18fcb75b147f3fa9146eef58878cd360d5ebfbd5b82f7`, 443 entries, packed 496,324, unpacked 2,369,138 bytes. Full/Basic/SVG gzip은 246,966/136,900/6,437 bytes다. 이는 개발 검증이며 0.0.13 릴리즈가 아니다.

초기 fixture 초안의 잘못된 radialMapping:auto와 sqrt type, 겹친 기본 theta/coordinate ID를 실제 계약에 맞춰 수정했다. 검사 목적으로 runtime 계약을 느슨하게 바꾸지 않았다. 최종 전체 realistic 재실행과 X 대조가 남아 있으므로 아직 Phase 완료가 아니다.

마지막 focused 검사에서 inventory 7/7, facade scale 2/2, guide/scale 2/2를 통과했다. Guide projection의 모든 required createScale/editScale paths와 literals가 최소 5회·3개 실제 데이터셋 기준을 충족한다. 앞선 corrected 실행의 Cartesian 720개 projection·75개 facade·direct encoding 검사와 final 실행의 statistical 460개 projection도 통과했다. 모든 초기 실패의 수정 확인 후 전체 realistic을 다시 실행한다.

## Source-owned 라벨 통합 수정

Measured radial의 label/filter/highlight/composition 소비자 대조에서 두 runtime 버그를 발견했다.

1. [#80](https://github.com/ggaction/ggaction/issues/80): 같은 측정값 두 개가 있는 category의 label이 합계보다 공통 raw field를 먼저 읽었다. `[1,1]`의 sum이 2 대신 1로 표시되고, singleton count도 원본 값으로 표시될 수 있었다. Bar의 최종 measure endpoint와 measured Arc의 radius aggregate를 우선한다. Category label의 의미는 그대로다.
2. [#81](https://github.com/ggaction/ggaction/issues/81): source-owned Bar text를 독립적인 raw scale consumer로 계산했다. Count Bar resize가 policy 충돌로 실패하고 fill stack의 domain에 원본 값이 섞일 수 있었다. 해당 layout mark가 소유한 text는 독립 consumer에서 제외하며 다른 mark의 compatibility 검사는 유지한다.

`radial-plots.test.js`, `text-mark.test.js`, `series-layout.test.js`의 집중 검사는 **40/40**이다. 앞선 진행 메시지의 51은 집계 오류이며 실제 로그의 40으로 정정했다. 두 radial facade의 aggregate label·filter·highlight·scale/Canvas edit와 concat child layout을 검사한다. Arc facet은 현재 미지원이며 atomic error를 검사한다. Generic data revision·새 percent/source label API·facet 확장을 이번 수정으로 구현했다고 주장하지 않는다.

마지막 문서 편집 뒤 generated LLM 문서가 늦게 갱신되어 첫 normal은 2,753/2,754였다. 재생성 후 **2,754/2,754**, coverage **95.16/91.70/98.79%와 critical floors 74개**, renderer **205/205**, browser **63/63**을 통과했다. 새 source 기준 Jekyll build와 built pages **125개**도 통과했다. 실행 로그는 `.artifacts/roadmap6-authoring/phase4-labels-*.log`다.

[라벨 수정 후 동일 tarball 설치 결과](package-labels-results.json)가 앞선 개발 패키지를 대체한다. SHA-256 `4eaa9a4a34cecc7b4bb40529324b70d03dfdb9f1a22aa697f86f8a362ca1abcf`, entries 443, packed 496,519, unpacked 2,369,885 bytes. Full/Basic/SVG gzip **247,052/136,936/6,437**로 승인된 249,000/138,000/25,000 한도 안이다. Node·types·MCP·tutorial·bundle 검사와 **이 파일 그대로** 설치한 Chromium 1/1을 통과했다. 실제 registry release는 아직 수행하지 않았다.

현재 실행 중인 full realistic은 라벨 수정 전에 시작했으므로 그 결과만으로 수정 후 전체 검증이라고 기록하지 않는다. 종료 후 수정된 source를 고정해 최종 검증한다. Built docs browser와 Phase X 대조도 완료 후 별도로 기록한다.
