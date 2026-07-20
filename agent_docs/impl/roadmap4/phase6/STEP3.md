# Step 3 — Gradient-profile semantic lifecycle

## 진행 상태

- [x] pure profile grammar와 canonical transform registry
- [x] internal wrapped profile-data component와 trace hierarchy
- [x] requested/resolved provenance와 caller ownership
- [x] category order, shared extent/range와 center calculation
- [x] value sample→resolved scale→item-local stop materialization
- [x] immutable revision, direct consumer rebind와 orphan release
- [ ] filter source와 facet child-local replay

Profile은 raw source를 직접 참조하며 colors/paint를 저장하지 않는다. Category당 한 row와 one-strip item grain을
보존한다.

## 실행 순서

1. Existing density grammar의 kernel/bandwidth/extent 계산을 재사용해 category partition별 sample vector를 계산한다.
2. Requested `"auto"` intent와 revision에서 해결된 bandwidth/extent/density range를 분리해 provenance에 저장한다.
3. Stable owner에 namespaced generated dataset/layer/scale/graphic IDs를 할당한다.
4. Statistical edit는 항상 raw source를 직접 읽는 새 revision을 만들고 모든 direct consumer를 재연결한 뒤 orphan만 제거한다.
5. Filtered source와 facet child가 같은 canonical profile materializer를 replay하는지 검증한다.

## 완료 조건

- Profile semantic state에는 palette, paint endpoint, concrete color 또는 backend object가 없음
- Category first-appearance order, shared extent와 global intensity domain이 deterministic함
- Repeated create/edit가 derived-on-derived chain이나 orphan resource를 만들지 않음
- Previous program, caller rows/options와 sibling/facet child가 구조적으로 불변임
