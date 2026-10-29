# 공통 실데이터 시나리오 통합 검증

상태는 [status.json](status.json)이 소유한다. 이 체크포인트는 runtime
`e56b8e4c16afe328947bd9840f3412a014874c98`와 기록된 test fixture 입력을 검증한다.
Roadmap9 전체 또는 STEP-077 완료를 의미하지 않는다.

단일 Y 의미를 공유할 수 없는 기존 실행 사례를 독립 child panel로 배치했다. 원본 행과
공개 action 실행 의무는 유지한다. 최종 패널은 data-mark3·statistical43·derived15·regression12·
miscellaneous9개다. Horizon의 원래 source 행/category/group은 유지하고, 두 점 이상인
전체 cohort를 명시했다. singleton/constant 그룹의 Density는 기존 owner의 명시 bandwidth를
재사용한다. 정확한 옵션·행 근거는 압축된 panel proof와 five-builder 기록에 보존한다.

복합 child의 직접 action trace와 원본 dataset을 재귀적으로 확인한다. 실제 합성을 수행하는
resource·polar lifecycle의 compose 선언을 실행과 맞췄고,31개 lifecycle×각3개 실제 dataset의
모든 factor 단독 변형에서 선언/관측 feature 및 최종/일시 효과가 일치함을 확인했다.

색상·통계 계약은 실제 dataset5종에서100개 차트를 실행했다. Palette 계약은184개 required
path를235개 공개 차트 실행으로 검증하며, 각 path의5회/3dataset 및 palette 이름3종 의무를
유지한다. 새 Calendar는 가장 관측이 많은 실제 연도를 명시 선택하고 정확한 row index/hash를
다시 계산한다. Contour는 원본 측정을 보존한 명시 affine 좌표를 사용한다. OHLC의 interval
role과 Waterfall의 양수 delta 투영은 palette API 실행 사례이며 금융·가산 분석 증거가 아니다.

Canonical generator/isolation24개가 통과했다.216·360개 descriptor의 isolated/reference 결과,
불변성, 상태 parity가 일치하며 실행 중 입력 변경은0개다. Child heap224MiB, child/reference
RSS448MiB, combined512MiB 한도를 유지했다. 최대 child295370752, combined380682240,
reference381632512 bytes였다.

기존 단위·차트·브라우저·설치 결과는 [runtime 증거](../conditional-domain-evidence/status.json)를
참조한다. 같은 archive `3bb1d1e85d6e29a65f81b70760fc2dff2cf6a52335cbaa90b9a7afc16e35058d`의
1059개 packed 입력과 현재 파일의 SHA256 차이는0개다. Node20/22/24 각각278개 설치 실행 결과를
이 범위에서 재사용한다. 새 global release coverage 또는 전수 realistic suite 성공으로 확대하지 않는다.

앞선 생성 실패, cache 환경 누락, 잘못된 feature 선언, palette 부족과 수리 전 로그를 보존했다.
`generation-owning-repair-5`는 encoding4개만 통과한 실패 run이며 전체 성공 근거로 집계하지 않는다.
이전 `combined-integration-evidence/final`은 source6f의 과거 baseline으로 표시했다.

재현 명령은 다음과 같다. Dataset cache는 고정 원본을 먼저 준비한 경로를 지정한다.

```sh
GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT=/absolute/path/to/tidytuesday \
node scripts/run-tests.js realistic \
  contracts/realistic-scenario-generation-isolation.test.js \
  contracts/realistic-scenario-generator.test.js

GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT=/absolute/path/to/tidytuesday \
node scripts/run-tests.js realistic contracts/realistic-data-color-contracts.test.js

GGACTION_TEST_TIDYTUESDAY_CACHE_ROOT=/absolute/path/to/tidytuesday \
node scripts/run-tests.js realistic contracts/realistic-lifecycle-factor-effects.test.js
```
