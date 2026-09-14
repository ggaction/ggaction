# 0.0.16 전체 개선 구현 및 릴리즈

## 진행 상태

- [x] v0.0.15 기준 감사와 구현 범위 확인
- [ ] 31개 항목 구현 및 계약 동기화
- [ ] 통합·패키지·문서·realistic·coverage·브라우저·렌더 검증
- [ ] PR 정상 통합 및 0.0.16 exact candidate 릴리즈

## 승인 근거와 경계

사용자의 2026-09-14 요청: “싹다 고치고, 0.0.16으로 릴리즈”. 직전 31개 항목 보고서의 수정과 기능 방향, main 통합 및 0.0.16 공개 릴리즈를 범위로 삼는다. 반복 확인하지 않는다. 아직 구체화되지 않은 package 설치 정책과 versioned persistence/source revision 등 중요한 공개 계약은 검토 가능한 명세와 검증 자료를 완성해 root AGENTS의 material-decision 규칙에 따라 다룬다. 일반 오류 수정과 독립 작업은 계속 진행한다. 기존 승인·보호 규칙을 우회하지 않는다.

## 항목별 추적

| 번호 | 항목 | 상태 | 검증 |
| --- | --- | --- | --- |
| 01 | 함수가 포함된 데이터는 외부에서 저장 후 변경할 수 있다 | 구현·검증 완료 | 입력/타입/renderer 82개 통과; 통합 검사 및 영향 계약 재검증 |
| 02 | 희소 데이터 배열이 통과한 뒤 엉뚱한 그래픽 오류를 낸다 | 구현·검증 완료 | 입력/타입/renderer 82개 통과; 통합 검사 및 영향 계약 재검증 |
| 03 | createAxes가 명시한 좌표계·채널 선택을 무시한다 | 구현·검증 완료 | 3×3 family/ID assertion, 이종 channel 및 기존 axis lifecycle; 관련 계약 45개 통과 |
| 04 | 세 저수준 primitive는 알 수 없는 최상위 옵션을 조용히 버린다 | 구현·검증 완료 | 입력/타입/renderer 82개 통과; 통합 검사 및 영향 계약 재검증 |
| 05 | PNG만 renderer 옵션 검증 정책이 다르다 | 구현·검증 완료 | 입력/타입/renderer 82개 통과; 통합 검사 및 영향 계약 재검증 |
| 06 | createData TypeScript 선언이 런타임보다 지나치게 넓다 | 구현·검증 완료 | 입력/타입/renderer 82개 통과; 통합 검사 및 영향 계약 재검증 |
| 07 | MCP가 복합 요청의 일부를 누락하고도 미해결 사항이 없다고 말한다 | 진행 전 | — |
| 08 | focused scale editor 6개의 padding 단위가 잘못 생성된다 | 구현·검증 완료 | canonical scale unit registry; 카드·계층·문서·패키지 15개 통과 |
| 09 | MCP requiredOptions가 필수 옵션과 예제에 등장한 옵션을 혼합한다 | 진행 전 | — |
| 10 | 현재 아키텍처 문서에 존재하지 않는 구현 경로가 남아 있다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 11 | 테마가 무관한 액션에도 전체 그래픽을 순회한다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 12 | preview가 관계없는 원본 데이터까지 다시 복사한다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 13 | 긴 trace의 append 비용이 누적된다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 14 | SVG가 매번 전체 graphicSpec을 직렬화·해시한다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 15 | 최소 산점도 번들이 예산 상한에 거의 도달했다 | 진행 전 | — |
| 16 | 브라우저 전용 사용자도 MCP·네이티브 렌더 의존성을 설치한다 | 구현·검증 완료 | renderer/package/MCP 38개, docs/package 33개, 실제 bare→optional 설치·Full/Basic/타입/전체 package consumer 통과 |
| 17 | 런타임 성능 회귀를 검출하는 공식 workload가 필요하다 | 구현·검증 완료 | 불변성·trace·theme·SVG·경로 91개 및 패키지·discovery 통과; 공식 13 workload 측정 |
| 18 | 실제 폰트와 저작용 text bounds 차이를 줄일 선택지가 필요하다 | 진행 전 | — |
| 19 | 릴리즈의 단일 순차 검증 경로가 약 59분 걸린다 | 진행 전 | — |
| 20 | realistic 테스트가 main의 필수 merge check에 포함되지 않는다 | 진행 전 | — |
| 21 | 자동 검증이 Ubuntu·Chromium에 집중되어 있다 | 진행 전 | — |
| 22 | 실패한 렌더·문서 테스트의 진단 artifact를 자동 보존해야 한다 | 진행 전 | — |
| 23 | 높은 coverage를 보완할 공통 음성 계약·교차층 테스트가 필요하다 | 진행 전 | — |
| 24 | 실행 계약과 생성 메타데이터의 의미 원본을 좁혀야 한다 | 진행 전 | — |
| 25 | MCP 평가는 실행 성공과 요구 충족을 분리해야 한다 | 진행 전 | — |
| 26 | 원본 데이터의 불변 revision을 유지한 갱신 흐름 | 진행 전 | — |
| 27 | 저장·복원을 위한 버전 있는 snapshot/recipe 경계 | 진행 전 | — |
| 28 | 구조화된 진단과 실제 한도 안내 | 진행 전 | — |
| 29 | PNG/PDF 메모리 출력과 비동기 비용 경계 | 구현·검증 완료 | renderer/package/MCP 38개, docs/package 33개, 실제 bare→optional 설치·Full/Basic/타입/전체 package consumer 통과 |
| 30 | 접근성 보조 출력을 최종 시각적 데이터 단위와 연결한다 | 진행 전 | — |
| 31 | 릴리즈 준비를 하나의 검토 가능한 변경으로 생성한다 | 진행 전 | — |

## 검증 checkpoint

첫 checkpoint는 입력 소유권·dense row·primitive/renderer 옵션·Full/Basic row 타입이다. 해당 테스트와 현재 계약 및 생성 문서를 함께 검증한 뒤 commit/push한다. 다음 checkpoint를 완료로 기록해도 전체 릴리즈 완료와 구분한다.

### 입력 경계 checkpoint

- `input-boundaries-tests.log`: 82/82 통과.
- 일반 suite 3,677개 중 새 generic signature로 영향을 받은 계약·메타데이터 기대 9개를 발견해 수정했다. 수정 후 해당 85개 중 84개 통과, 마지막 package 크기 한도는 추가 renderer validator 및 row 타입의 실제 unpacked 크기 3,550,202 bytes에 맞춰 3,555,000으로 조정하고 package suite를 재검증했다. 파일 개수 상한은 공유 validator 1개 추가에 맞춰 522다. 브라우저 gzip 상한은 유지한다.
- `docs:generate` 완료, generic action의 발견·카드·provenance·realistic type inventory를 동기화했다.
- 다른 26개 항목과 최종 통합·릴리즈는 아직 완료하지 않았다.

### Axis assertion checkpoint

명시한 좌표계 ID/type과 이종 channel option을 하위 axis action 전에 검증한다. Cartesian 생략 추론과 기존 Polar/Parallel flow는 보존한다. `axes-validation-tests.log`, `axes-validation-contracts.log`, `axes-validation-package.log` 및 docs 생성 결과를 확인했다.

### Scale metadata checkpoint

Scale의 band padding 단위를 grammar registry에서 공유한다. Parallel을 포함한 모든 create/edit scale 카드가 band-fraction을 표시하는지 검증했다. `scale-metadata-tests.log` 15/15와 docs 생성을 확인했다. 공개 계약 Gate 전체 승인도 DECISIONS에 기록했다.

### Immutable performance checkpoint

Owned subtree 재사용, data-only theme fast path, persistent trace children, immutable SVG hash cache를 도입했다. 공개 Array trace·순서·ID·직렬화와 mutable renderer input의 재계산을 보존한다. `benchmark:runtime`은 환경 및 7개 sample을 남기고 같은 환경 baseline 대비 회귀를 검출한다. 실제 10k themed data 50개 추가 median 0.63ms, SVG 반복 14.83ms, trace 16k append 71.41ms를 기록했다. 감사의 각각 467.94/22.53/218.61ms보다 낮다. 서로 다른 실행의 측정이라 절대 성능 보장으로 취급하지 않는다. Architecture의 오래된 ranged encoding 경로를 고치고 현재 source link test를 추가했다.

### Optional backends and memory output checkpoint

PNG/PDF Buffer API와 async PNG encoding을 추가하고 파일 출력이 같은 경로를 사용하게 했다. Optional peer 누락 상태에서 browser/entry import·명확한 오류를 실제 tarball 설치로 검증한 뒤 두 peer를 설치해 Node/MCP/type/tutorial/브라우저 bundle 전체 consumer를 통과했다. Package 상한은 backend loader 1개 및 API/type/docs 증가를 위해 523 files/3,565,000 unpacked bytes로 맞췄으며 packed/gzip 상한은 유지한다. Browser full/basic gzip 358,817/174,478 bytes로 통과했으나 항목 15의 여유 확보는 아직 남아 있다.
