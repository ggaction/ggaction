# 0.0.25 통합 릴리즈

## 진행 상태

- [x] 최신 GitHub branch/PR/issue 및 공개 0.0.24 확인
- [x] overlay/composition branch와 보안 PR #275를 별도 통합 branch에 병합
- [ ] 통합 baseline 검증과 테스트 감사
- [x] #274 categorical overflow summary symbol
- [ ] #271 interval color/stroke + size + ordinal shape 단일 범례
- [ ] 새 기능과 기존 composition/guide lifecycle 회귀 보강
- [ ] 정확한 source provenance, 공개 타입/계약/문서 및 LLM 생성물 동기화
- [ ] 전체 source/coverage/realistic/browser/render/package/docs/platform CI
- [ ] main 병합, annotated tag, 동일 candidate의 npm/GitHub/Pages 배포 및 공개 해시 검증

## 승인과 범위

2026-10-26 사용자는 새 branch/PR/issue를 모두 반영하고 정리하며, 테스트를 다시 점검한 뒤
새 릴리즈를 게시하라고 요청했다. 구현·통합·PR·패키지/문서 배포를 포함하는 요청이다.
기존 [번역 지원 API의 포괄 승인](../facet-content-flow/PROPOSAL.md#승인과-범위)을
같은 source-neutral 범례 기능 확장에 재사용한다. 공개 기본값, 기존 저장 프로그램과
semantic/graphic/renderer 경계를 유지한다. 별도 모델 서비스 호출과 원본 corpus admission은
이 저장소 릴리즈와 구별한다. 실행 증거가 없는 외부 fidelity 성공을 선언하지 않는다.

## 동결한 통합 입력

- main / v0.0.24: `fd5c4073fc80295c513bd099ac0ff0aa83059371`.
- `codex/overlay-composition-v025`: `23847e1c630bef7f05688d973c267e4cbf8c3188`.
  기존 승인된 overlay, independent layer, adjacent/shared scales, scoped atomic edits,
  guide ownership/visibility/position, text alignment/overrides, immutable computation 재사용을 포함한다.
- PR #275 / fast-uri 3.1.9: `583e8e6a7f3a813d5935c7cfe69057c2b79589a3`.
- PR #270 및 닫힌 #265–269/#272/#273은 이미 main에 포함되어 있다.
- #258 native content-flow는 0.0.23에서 출시되었다. 원본 family의 외부 번역 검증은 여전히
  별도 증거가 필요하므로, issue의 오래된 진행 설명만 보고 코드를 재구현하거나 완료 처리하지 않는다.

## 범례 계약

### #274

기존 `overflow`에 선택적인 `summarySymbol: "first-hidden"`를 추가한다.
Categorical line-only sample recipe에서 최종 정렬 domain의 첫 숨겨진 값으로 기존 색/선/opacity
mapping을 평가하고 summary row에 한 개의 sample을 그린다. 실제 domain/data/labels는 바꾸지
않는다. 생략은 기존 text-only summary이고 숨겨진 값이 없으면 추가 sample도 없다.
다른 legend family/recipe는 이 opt-in을 명확히 거부한다. 생성, 편집, reset, order/scale/data,
resize, persistence, shared layout 및 실제 painted symbol 개수를 검증한다.

### #271

`combine: "color-size-shape"`는 한 Cartesian Point owner의 동일 field/grain에 연결된
interval color 또는 stroke, interval size, ordinal shape를 하나의 block으로 표현한다.
`channels`는 `["color","size","shape"]` 또는 `["stroke","size","shape"]`이며 hue owner가
둘 다 있으면 명시 선택한다. 두 interval scale의 threshold 경계가 같아야 한다.
기존 `color-size`와 `size-shape`의 의미·기본값은 바꾸지 않는다.

Ordinal shape는 interval bin으로 재해석하지 않는다. 각 interval에 한 개씩 대응하는 오름차순
finite `values`를 명시하게 하여 모호한 shape 대표값을 추측하지 않는다. 각 실제 sample value를
세 원래 scale로 평가하고 interval labels를 유지한다. 기존 Point shape materializer를 사용하여
면적/shape geometry를 일치시키며 stroke/fill ownership과 opacity도 유지한다.
Mapped size/shape/hue를 고정 symbol override로 덮어쓰지 않는다. 잘못된 value 개수, interval
소속, field/grain, owner와 scale 변경은 원자적으로 거부한다.

## 테스트 검토 기준

검사 개수나 높은 coverage만으로 완전성을 주장하지 않는다. Literal expected values와 독립
geometry/paint 근거, immutable edit/restore, 부정 입력, 동일 최종 상태의 경로 수렴, packed
consumer와 browser/renderer parity를 검증한다. 새 옵션 때문에 기존 exhaustive literal witness가
줄어들지 않게 inventory를 확인한다. Coverage 기준/critical floors를 유지하고 실패를 skip하지
않는다. 실제 파일/압축 예산을 넘으면 측정값과 원인을 기록하며 무관한 한도는 바꾸지 않는다.

## #274 구현 checkpoint

- Full stroke와 Basic color line sample, 44개 series/906개 numeric row 보존, 29 labels + summary와 30 painted samples, final order/scale/resize/restore/reset/atomic rejection을 확인했다. 독립 추가 line primitive와 PNG bytes도 일치한다.
- 관련 22개 검사가 통과했다. 전체 baseline은 6,237개 중 runtime 6,236개 성공, stale action-card 1개 실패였으며 재생성 후 해당 검사가 통과했다.
- 새 grammar module 1개에 맞춰 package entry cap만 649→650으로 조정했다. 두 legend action-card budget은 새 typed policy를 담는 실제 크기에 맞춰 각각 40/50 bytes만 확장했고 전체 package bytes/coverage floor는 유지했다.
