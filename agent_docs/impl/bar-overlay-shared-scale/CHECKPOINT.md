# Overlay bar shared measure scale correction

## 진행 상태

- [x] 기존 공개 horizontal/vertical overlay bar + 다른 field의 rule 재현
- [x] Overlay measure의 final aggregate 값과 일반 quantitative consumer domain 합집합 유지
- [x] Group/stack/fill/diverging의 기존 충돌 검사, zero baseline, 부모 불변성 보존
- [x] Explicit/auto domain, count aggregate, action 순서, resize, save/import 검증
- [x] Focused15, unit3042, contracts533, docs120, package/installed consumer 통과
- [ ] Stable 실행 checkpoint 통합 및 영향 chart 재검증

## 범위와 승인

2026-10-16 번역 중 확인한 기존 공개 overlay bar + mean rule 조합의 scale-policy
오류를 수정한다. 부모 작업이 기존 compatibility 계약을 확인하여 bug fix를 지시했다.
새 공개 API, persisted schema, layout default, renderer 또는 macro architecture는 바꾸지 않는다.
Stable7971cc4c는 그대로 두었다. 별도 미해결 설계 Gate는 없다.

## 변경과 증거

Overlay는 measure 값을 이동하거나 stack하지 않는다. 따라서 같은 quantitative measure
scale의 일반 rule/point/line은 다른 raw field여도 호환된다. 기존 policy owner에서 overlay에만
호환성을 인정하며 final aggregate 값과 direct consumer 값의 합집합으로 auto domain을 정한다.
일반 series policy를 제거하거나 raw extent만 사용하지 않아 count와 zero baseline 의미를 유지한다.
다른 layout은 기존 동일-field/constant 조건과 충돌 검사를 유지한다.

8개 새 회귀와 인접7개 binned-bar 회귀가 통과했다. Unit3042, contracts533, docs120과
installed-package consumer가 통과했다. Package는565 entries / 793,065 packed bytes /
3,894,715 unpacked bytes로 기존 예산 안이다. Canonical encoding 계약과 영어 series color
문서 및 생성 LLM 문서를 동기화했다. 렌더는 SVG 구조를 확인했으며 차트 픽셀은 보지 않았다.
