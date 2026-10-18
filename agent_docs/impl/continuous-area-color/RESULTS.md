# 면적 정량 색상 구현 검증

## 진행 상태

- [x] 승인 범위 구현 및 현재 계약·타입 설명·예제·문서 동기화
- [x] 기존 색상 계산 재사용, 시리즈 내 유한 숫자 상수 검증과 원자적 거부
- [x] 실제 Area 척도 소비자와 gradient·sample symbols·discretized interval 범례 연결
- [x] 승인 목표와 같은 회차 Chromium RGBA 281,600바이트 정확 일치
- [x] 독립 primitive와 graphicSpec·그리기 순서·SVG·Canvas 호출·RGBA·PNG 정확 일치
- [x] 전체 unit 3,299 / contracts 574 / docs 120 / charts 618 통과
- [x] 브라우저 독립 Canvas/SVG 및 설치 패키지·타입·Node SVG/PNG/PDF 통과
- [ ] 별도 새 버전 릴리스 및 실제 데이터셋 번역 runtime 동기화

구현 소스 revision: `7da7a0cc` (후속 evidence/documentation-only commit은 같은 소스 검증을 보존한다).
패키지 consumer의 로컬 후보 tarball SHA-256: `fdd470a4f799589b547092241ceef06d5c0dd199548cacec442ba023e04e517d`.
이는 registry 배포 증거가 아니다. 번역은 여전히 기존 공개 0.0.19를 사용한다.

## 검증 명령

```sh
npm run test:unit
npm run test:contracts
npm run test:docs
npm run test:charts
npm run test:package
node --test test/browser/continuous-area-color.browser.js
node --test test/charts/continuous-area-color/png.render.js
node agent_docs/impl/continuous-area-color/verify-approved-target.mjs
```

세부 실행 로그는 로컬 `.artifacts/continuous-area-*.log`이며 실패했던 검사 기록도 보존한다.
초기 계약 검사에서 새 예제의 primitive test/graphic hierarchy 등록 누락을 발견해 보완했다.
패키지 크기는 기존 제한을 유지하고, 기존 esbuild 압축 목록에 Area materializer만 추가했다.
기존 스트로크·다른 마크의 색상·범주형 면적 전체 회귀를 포함한다.

## 호환성과 한계

새 액션·옵션·semantic key·저장 schema·renderer primitive를 만들지 않았다.
Basic은 원래 Area 생성 API가 없으므로 추가하지 않았으며, Full의 Area와 Basic의 기존 Point 경로를 각각 검증했다.

모든 시리즈는 기존 group/tuple identity를 사용한다. 수평·ranged·missing-break와 다섯 layout,
legacy centered assignment, outline/opacity, 현재 domain/range/색상 척도, 색상 재할당/제거,
실제 범례, 데이터 revision, Canvas, 선택·강조, 저장/복원은 같은 기존 owner를 사용한다.
자동 quantile은 시리즈당 한 값으로 계산하여 경로 길이가 가중치로 작용하지 않는다.
Density 데이터에 없는 원본 필드는 복구하지 않으며, 변환 후에도 존재하는 일정한 정량 필드만 허용한다.
시리즈 내 색상이 달라지거나 temporal/aggregate/unknown을 요청하면 거부한다.

이미지를 사람이/모델이 시각 검사했다는 주장은 하지 않는다. 프로그램·geometry·DOM·픽셀 바이트 비교 증거만 사용했다.
