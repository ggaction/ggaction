# 레이블 기준 제목 간격 구현

## 진행 상태

- [x] 원격 Gate `c2c6cdfba1df97d085f55a4da19878da55c07412` 확정
- [x] 인간의 기존 전체 승인과 ROOT의 정확한 설계·시각 목표 승인 확인
- [x] bin 작업자의 clean package/docs 읽기 종료 및 I 편집 freeze 해제 확인
- [x] 하나의 저장 의도와 Cartesian create/edit/replay/persistence 구현
- [x] focused/cumulative/default 호환·normal·packed·browser·docs 검증
- [x] coherent commit/push와 실제 결과·제한 기록

Gate 상태: **approved**. ROOT 승인 기록은 번역 workspace의
`reports/v13-axis-title-label-relative-offset-root-approval-v1.json`이며 원격 Gate의 여섯
정확한 파일 SHA와 사용자 “지금까지 모든 질문, 앞으로 할 모든 질문 승인함”을 결합한다.
원래 Gate 원문과 primitive reference는 바꾸지 않는다. 추적 이슈는
[축 제목의 레이블 기준 간격](https://github.com/ggaction/ggaction/issues/267)이다.

활성 번역 package/config/controls/School 기록·카운터는 이 구현에서 바꾸지 않는다.
새 package 채택은 ROOT의 별도 호환·runtime Gate 뒤에 진행한다.

## 구현 경계

`AxisTitleOffset`은 기존 title offset에 숫자와 닫힌 labels/gap 의도를 함께 표현한다.
순수 validator와 inferred-or-relative 의존 판정을 공유하고 기존 geometry/text bounds를 사용한다.
실제 local distance는 저장하지 않으며 full/focused/named/Basic complete surface,
source/facet/data/Canvas/typography replay와 persistence를 검증한다. 동시 label/title 편집은
기존 whole-axis facade의 최종 상태로 검사하고 last-label 단독 제거는 거부한다.

원격 proposed source의 `headers:false`는 기존 public 문법이 아니었다. 원격 원문·실패를
유지하고 stable executable fixture에서는 기존 `headers.labelMap`의 빈 문자열로 같은
header 없음 상태를 표현한다. 시각 목표와 네 exact anchor는 변경하지 않았다.

## 확인한 결과

- Node22.23.1 focused unit20/20, structural/type/card contracts37/37, executable documentation82/82 통과.
- 같은 최종 runtime 입력의 전체 normal5664/5664, browser4/4 통과.
- 네 독립 panel의 numeric-reference/public pair:1016×302, title Y159.5,
  exact X13.0166015625/7.455078125/7.455078125/13.0166015625. 실제 plot ink1562, decoded RGBA 차이0.
- 설치한 canonical Node22 package의 Node179cases, Full/Basic TypeScript, tutorial,
  MCP, browser bundle 일곱 그룹 모두 통과.
- 문서 build150pages/1132 selective LLM artifacts와 모든 페이지의320/390/768px
  browser containment·interaction 통과. Ruby3.3.12의 기존 설치 toolchain을 명시적으로 사용했다.

## 실패 보존 및 한계

초기 normal의 source ownership·fixture discovery·문서 snippet 등록 세 실패는 보호 검사를
완화하지 않고 각각 canonical owner/정적 import/실제 snippet 등록으로 수정했다. 원래 실행
기록은 번역 workspace에 남아 있다.

최초 installed bundle은 Full452644/Basic231356으로 기존452000/231000을 초과했다.
필수 validation과 geometry를 유지하고 ROOT의 별도 정확한 검토를 거쳐 기존1000byte
단위453000/232000으로만 기준을 갱신했다. SVG25000 및 수치·픽셀·오류·coverage·parameter/storage
기준은 유지한다.

Node24.22.1의 실제 canonical archive903474bytes가 기존902000을 초과한 실패는 보존했다.
Node22 archive901292bytes와624개 entry의 경로·내용 SHA·크기·mode·type·link가 정확히 같고,
압축 archive bytes만 다른 것을 독립 비교했다. 해당 환경의 설치 consumer 최종 결과는
후속 항목에 기록한다.

Node24.22.1의 fresh 실제 설치 consumer도 일곱 그룹과 Node179cases 모두 통과했다.
ROOT의 별도 archive 비교 검토 후 packed cap만 기존1000byte 단위904000으로 갱신했고,
624entries/4272000unpacked는 유지했다. 두 실행 환경의 archive·모든 실패 로그·정확한 tree
inventory를 별도 보존했다. Linux/Windows 원격 release matrix와 실제 registry publication은
최종 통합 release 소유자의 후속 검증 범위다.

이미지 VLM/사람의 그림 검사는 수행하지 않았다. 픽셀 동등성과 수치·공개 패키지 검증은
자동 증거이며 새 registry publication, 활성 번역 runtime 채택, 전체 원본 차트 번역 완료를
의미하지 않는다.

## 검증한 소스 checkpoint

구현과 검증 입력은 `d99614f99c8d43b68af44e5bd5cf3e2e6b7c34b0`으로 commit/push했다.
번역 workspace의 `reports/v13-axis-title-label-relative-offset-implementation-qualified-v1.json`
(SHA256 `4cdf2afe0d9754c58f8da6168f6ea1a5cd01e763081d64ce397d417923a60ed6`)이
62개 변경 파일·11개 runtime/type 입력과 각 실제 검사 로그를 결합한다.
이후 문서 provenance만 clean source commit을 가리키도록 재생성한다.
