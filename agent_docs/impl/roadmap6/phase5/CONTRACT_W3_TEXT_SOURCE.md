# W3 A — 명시적 Text source

상태: approved. [전체 실행 승인](../APPROVAL.md)을 적용한다. W3 전체 완료가 아닌 final-item label의 source 선택 기반이다.

## 공개 결정과 근거

- `createTextMark({ source: "bars", ... })`로 기존 point/bar/rule/rect/arc를 지정한다. Explicit ID가 current mark/data보다 우선하며, 같은 dataset의 여러 마크나 다른 dataset의 마크도 구별한다.
- `source`와 `data`는 동시에 지정할 수 없다. Source-owned label의 dataset은 source가 소유하고, explicit `data`는 독립 위치를 인코딩하는 기존 계약이다.
- Source 생략 시 기존 current/unique compatible inference를 유지한다. Ambiguity 오류는 explicit source 또는 independent data를 안내한다.
- Explicit source는 생성되어 data가 연결된 eligible mark면 위치 인코딩이 미완성이어도 허용한다. Text content와 appearance를 저장하고 source가 완성될 때 기존 dependency plan으로 materialize한다. 완성 전에는 label item을 만들지 않는다.
- Source capability와 readiness는 materialization capability owner가 소유한다. Named lookup은 shared selector를 사용한다. Renderer나 별도 label registry를 추가하지 않는다.
- `source`는 생성 옵션이다. `editTextMark`는 기존 appearance-only 계약을 유지한다. Invalid/missing/unsupported source, data/source 동시 지정은 immutable rejection한다.

## 검증

- Five source families, incomplete/complete authoring order, explicit/current/data precedence, multiple marks, final-item count와 동일 source의 inferred/explicit concrete parity.
- Canvas/scale/filter/source-style replay, constant/field content, rejected request의 원본 보존.
- TypeScript positive/negative, installed artifact의 runtime/type, 기존 chart 회귀와 누적 normal/coverage, docs generation/build.
- Geometry 정책은 기존 source anchor를 그대로 재사용한다. 신규 시각 배치를 추가하지 않으므로 독립 primitive target 변경은 없다.

## 후속 범위

W3의 `createMarkLabels` category/aggregate/share, 정확한 percent denominator, reference line/band, annotation, 공통 formatter와 rotation 단위 정리는 별도 계약·구현으로 계속한다. W4 theme와 W5 fitting도 남는다.
