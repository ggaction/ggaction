# STEP 6 — F-009 Tutorial Portability and F-010 Capability Drift

## 진행 상태

- [x] Complete consumer example 12개 fresh-consumer 기준선 재현
- [x] Public package import와 explicit data acquisition으로 tutorial 수정
- [x] Checkout 밖 build/render/data-status 회귀 추가
- [x] Central capability source와 focused documentation 대조 구현
- [x] Rect, arc, bar highlight, continuous legend와 complete-axis smoke 고정

Complete example은 repository checkout 없이 문서의 준비 단계와 공개 package만으로 실행돼야 한다. Central
overview/reference와 focused page는 동일 capability source 또는 build-time contract로 충돌을 방지한다.

## F-009 결과

- 평가의 기존 8개 tutorial은 저장소 상대 import 때문에 fresh Vite module transform 전에 실패했고,
  Polar 3개는 제공되지 않은 상대 JSON을 읽어 404와 빈 Canvas를 만들었다.
- 11개 complete program은 모두 `ggaction` package import와 Vite `public/` 데이터 배치 절차를 사용한다.
  데이터 URL과 파일명은 각 코드 바로 앞에 있으며 모든 fetch는 JSON 변환 전에 HTTP status를 검사한다.
- Package consumer는 생성한 exact tarball을 checkout 밖 임시 project에 설치한다. 문서의 11개 JavaScript
  block을 원문 그대로 추출해 Vite production build한 뒤 Browser에서 각 data response가 2xx이고,
  console/page error가 없으며 Canvas에 실제 ink가 있는지 확인한다.
- Getting Started의 inline example까지 포함하면 평가가 분류한 complete consumer example 12개 모두 같은
  public-package 실행 경계를 갖는다. Repository example은 별도 링크로 남고 consumer code로 위장하지 않는다.

## F-009 검증

- `npm run test:package`: installed package Node/TypeScript/PNG와 tutorial consumer 11개 통과
- `npm run test:docs -- documentation`: 15개 통과
- `npm test`: 1,534개 통과

## F-010 결과

- 평가 snapshot의 여섯 충돌은 runtime 실패가 아니라 중앙 position/action/appearance/legend/axis 문서의
  수동 target 목록과 오래된 limitation 문구에서 재현됐다. Focused rect, arc, selection, color와 axis 문서의
  동작은 현재 source와 일치했다.
- `docs/_data/action_capabilities.json`이 position mark/field-type, color mode, highlight grain,
  legend family와 complete-axis create/edit surface의 canonical registry다. Overview, focused page와 action
  reference의 여섯 표는 `docs:capabilities`가 이 registry에서 생성한다.
- `docs:capabilities:check`는 생성 표가 수동 편집되거나 registry보다 뒤처지면 실패한다. Primary position
  행은 runtime `POSITION_FIELD_COMPATIBILITY`와 exact 비교하고, highlight mark 집합은 실제 selection
  policy registry와 비교한다.
- Public smoke는 discrete/ranged rect, aggregate-theta arc, aggregate-bar highlight, aggregate-bar gradient
  legend와 grouped `editXAxis`/`editYAxis`를 실행한다. 따라서 지원 기능과 반대되는 limitation 문구가 다시
  들어가거나 runtime capability가 사라지면 docs suite가 실패한다.

## F-010 검증

- `npm run docs:capabilities:check`: generated surface clean
- `npm run test:docs`: 26개 통과, capability smoke 6개 포함
