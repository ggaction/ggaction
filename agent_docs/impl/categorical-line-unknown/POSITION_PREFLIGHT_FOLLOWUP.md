# 첫 position의 unknown color 검증 보완

## 진행 상태

- [x] 544cf406의 별도 실제 package에서 첫 theta assignment가 잘못 허용됨을 재현했다.
- [x] 기존 사용자 승인과 이 기능의 이미 승인된 unsupported-grain 계약을 그대로 적용했다.
- [x] 기존 Line position policy에서 공유 color consumer validator로 proposed encoding을 사전 검사한다.
- [x] theta/radius/bin/aggregate/parallel 첫 assignment와 기존 direct Cartesian 순서의 focused31개를 검증했다.
- [x] 문서·생성물·전체 normal·설치 package 및 renderer 검증을 완료한다.
- [ ] 새 checkpoint를 저장하고 새 package/docs/현재 cohort 호환성 증명으로 로컬 적용한다.

## 기존 증명과 이번 보완

544cf406은 전체4816normal, public installed consumers와 현재1275families/9278programs의 exact native
SVG 호환성 검사를 통과했다. 그 결과는 원래 commit/archive에 묶어 보존한다. 이는 새 기능의 모든
불완전 authoring 순서가 검증됐다는 주장이 아니다. 이후 별도 probe에서 categorical unknown color가
있는 incomplete Line에 첫 theta가 허용되는 상태를 발견하여 로컬 활성화를 보류했다. 현재 활성 runtime은
ffd3295e이며 어떤 School request도 추가하지 않았다.

새 public option, 기본값, persisted field, renderer 또는 state boundary는 추가하지 않는다.
Line position policy가 기존 scalar/coordinate action의 첫 상태 변경 전에 현재 color scale과 proposed
position을 동일한 shared consumer policy로 검사한다. 정상적인 미완성 direct X/Y 순서는 유지하며
unsupported theta/radius/bin/aggregate는 partial state에서도 거부한다. 기존 승인 범위의 bug fix이므로
APPROVAL.json의 직접 사용자 지시를 재사용하고 같은 승인을 다시 묻지 않는다.

새 position-policy source로 staged packed852034bytes가 기존852000을 초과한 실제 실패를 보존했다.
수정한 해당 Line policy에만 기존 공식 package compactor를 추가해 한도를 유지할 수 있는지 검사한다.
기능·원본·수치/픽셀 오차를 줄이거나 넓혀 통과시키지 않는다. 544cf406의 EVIDENCE.json을 덮어쓰지 않고
새 검증 결과를 별도 evidence로 기록한다.

최종 normal4817/4817, focused31, public installed consumer(Full/Basic의 첫 partial position 거부 포함)와
native PNG/PDF primitive의 tolerance0 비교를 통과했다. Line policy를 공식 compactor 대상으로 추가한
뒤 package602entries, packed851802/unpacked4119146bytes로 기존 한도를 유지한다.
정확한 source/log/installed bundle binding은 `EVIDENCE_POSITION_PREFLIGHT.json`에 기록한다.
현재 source0702의 private body는 source1484mark vertices, raw500/선택494행과 10개 clipped point를
보존하며 geometry3462scalar의 최대 관측 차이는2.8421709430404007e-13이다. 이는 guide·전체 source·School
번역 완료 증명은 아니며 이전544epoch의 진단 자료로만 보존한다.
