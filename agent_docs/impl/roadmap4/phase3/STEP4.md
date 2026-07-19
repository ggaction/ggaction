# Step 4 — Phase 3 closeout

## 진행 상태

- [x] strict declarations와 runtime/package surface 동기화
- [x] Current action contract와 inventory 동기화
- [x] public docs와 generated references 동기화
- [x] full tests, coverage, render와 packed-package consumer
- [ ] P3-Exit 사용자 승인

P3-B 사용자 승인 전에는 시작하지 않는다.

## Closeout 결과

- `ThetaEncodingOptions`, `ThetaScaleOptions`, `StrokeWidthEncodingOptions`,
  `StrokeWidthScaleOptions`를 package root에서 strict type으로 export한다.
- Installed-package consumer가 weighted theta와 field-driven stroke width를 runtime과 TypeScript에서 직접 사용한다.
- `encodeTheta`와 `encodeStrokeWidth`는 `ACTION_INDEX` Current에 각각 정확히 한 번 존재하고 Planned action이나
  capability에는 남지 않는다.
- Planned encoding 문서의 이전 `encodeStrokeWidth` compatibility signature를 제거하고 Current contract를
  유일한 owner로 유지한다.
- `test/contracts/roadmap4-phase3-closeout.test.js`가 inventory, declarations, docs와 두 visual pair를 고정한다.
- Renderer는 새 action 이름을 알지 않고 기존 concrete path/line을 계속 소비한다.
