# Phase 5 W2 C2 — Hidden categorical title의 geometry 제외

기준 `9ecb134be97a65958d40d99389cdbdddb199da24`, 결과는 이 문서를 포함한 commit이다. [전체 승인](../APPROVAL.md)과 [계약](CONTRACT_W2_HIDDEN_CATEGORICAL.md) 아래 [#101](https://github.com/ggaction/ggaction/issues/101)을 수정·검증했다. W2 전체와 실제0.0.13 릴리즈는 미완료다.

## 문제와 구현

Categorical top/bottom grid는 titleVisible:false여도 제목 font height와 title-gap을 사용했고 inline은 빈20px prefix를 유지했다. Legacy-bottom border 역시 숨긴 제목 font를 포함했다. Color/series×edge/legacy×horizontal title-position14cases에서 hidden font만1000으로 바꾸면6spurious overflow와2geometry 변경이 발생했다. 수정 뒤14cases 모두 graphicSpec이 바뀌지 않는다.

Grid는 visible title일 때만 height/gap/inline prefix를 배정한다. Legacy-bottom의 visible sample anchors는 유지하고 hidden border의 위쪽을 item top에서 계산한다. Stored title/style/inferred mode는 보존하며 복원 시 현재 설정으로 재배치한다. 복원 검사에서 legacy-bottom이 visible title 실제 Canvas bounds를 검사하지 않던 오류도 찾아 추가 검증했다. Valid visible-title geometry와 renderer는 바꾸지 않았다.

## Primitive와 관찰 가능한 변화

Public 수정 전에 `.artifacts/roadmap6-authoring/hidden-categorical-targets.mjs`의 literal primitive를 작성·렌더링하고 top PNG를 확인했다. Stable paired source는 `test/contracts/hidden-categorical-layout.test.js`다. Target call은 `base().createLegend({ position, border: true }).editLegend({ title: false })`이다.

Canvas1000×800/margin250, 두 categoryA/B의 default color legend에서 hidden border height61→36, top border y193→218, bottom label y589→564가 된다. Top sample y230과 legacy anchors는 그대로다. Primitive/public full graphicSpec와 actual order, 같은 실행의 decoded PNG pixels가 일치한다. TitlePosition:left로 숨긴 제목의 배치를 바꿔도 visible grid는 같으며 font1000 저장도 visible output을 바꾸지 않는다.

## 검증

| Evidence | Result |
| --- | --- |
| Focused hidden/bottom/combined regression | 16/16 PASS |
| Literal primitive/public contract | 1test,top/bottom2variants;graphics/order/PNG PASS |
| Original hidden-font audit | 14cases 모두 unchanged;기존6errors/2changes 제거 |
| Real Cars | 392rows,20color/series×edge/legacy×border cases;filter/Canvas replay PASS |
| Normal | 2888/2888 PASS |
| Source coverage | lines95.41%,branches92.26%,functions99%;85critical floors PASS |
| Representative existing PNG | 13/13 PASS |
| Packed Node/types/SVG/PNG/PDF/MCP/tutorials | PASS |
| Same final artifact Chromium | Canvas/SVG1/1 PASS |
| Docs generate/preflight/build/built | PASS;125pages |
| Catalog/navigation/documentation closeout | 21/21 PASS |

[Package 원장](package-hidden-categorical-results.json)의 SHA-256은 `160707f584b59a282b78828984a3fc4264d53e08286b0cd5dee0a2c1ff479cc4`다. Entries452,packed509510,unpacked2435827,gzip Full253780/Basic140032/SVG6437. Basic이 기존140000ceiling을32bytes 초과해 전체 승인 범위에서141000으로 조정하고 README/current architecture를 동기화했다. Full254000/SVG25000 및 package452/510000/2500000 한도는 유지한다. 현재0.0.12는 개발 checkpoint version이다.

Runtime 변경 후 normal과 PNG를 통과했다. 이후 Basic ceiling/README 수정과 docs regeneration 뒤 package/coverage/browser 및 built docs를 검증했다. 초기 primitive script의 public API 호출 형태 오류는 script를 수정해 실제 render 후에만 geometry 기준으로 사용했다. 초기 복원 test는 legacy visible-text bounds 누락을 발견하는 회귀가 되었으며 validation-array 호출 오류는 후속 focused tests 전에 바로잡았다.

## 남은 범위

C2의 실제 occupied bounds 기준 정렬과 큰 sample/font의 grid spacing, 전체 kind×edge matrix는 계속 진행한다. W3 final-item labels/reference/format, W4 themes, W5 fitting, Phases6–11과 실제0.0.13 릴리즈도 남아 있다. Hidden title 수정만으로 W2를 완료로 기록하지 않는다.
