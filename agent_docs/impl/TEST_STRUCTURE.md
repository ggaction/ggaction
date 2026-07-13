# 테스트 구조

## 목적

이 문서는 현재 test tree의 책임과 새 test를 배치하는 규칙을 정의한다. 테스트는 구현
Phase나 source filename을 기계적으로 복제하지 않고, 실패가 의미하는 contract가 한눈에
드러나도록 구성한다.

## 진행 상태

- [x] 공통 support와 test source 분리
- [x] Unit test를 reusable capability별로 정리
- [x] 기계적으로 검증 가능한 architecture contract 분리
- [x] 차트별 public/primitive/reference/render vertical slice 정리
- [x] 일반 test와 고비용 render test discovery 분리
- [x] Generated artifact를 source tree 밖으로 이동
- [x] Package script와 architecture documentation 갱신

## 현재 구조

```text
test/
├─ unit/
│  ├─ core/
│  ├─ grammar/{layout,scales,schemas,transforms}/
│  ├─ actions/{canvas,coordinates,data,encodings,guides,marks,primitives,regression,scales}/
│  ├─ materialization/
│  └─ renderers/
├─ contracts/
├─ charts/<chart>/
│  ├─ primitive.program.js
│  ├─ primitive.test.js
│  ├─ public.test.js
│  ├─ semantic.test.js          # 필요한 경우
│  ├─ reference-values.js       # 필요한 경우
│  ├─ reference-values.test.js  # 필요한 경우
│  └─ png.render.js
├─ docs/
└─ support/
   ├─ data.js
   ├─ canvas.js
   ├─ png.js
   └─ artifacts.js

.artifacts/test/png/            # gitignored generated output
```

## 배치 규칙

### Unit

하나의 reusable capability를 좁게 검증한다. Source file 하나당 test file 하나를 강제하지
않고, core state, grammar calculation, action behavior, materialization, renderer처럼 실패
책임이 같은 test를 모은다. Phase 번호나 chart 개발 순서를 이름에 넣지 않는다.

### Contracts

여러 package나 source category를 가로지르는 architecture invariant를 검증한다. Selector,
public package boundary, graphical editor와 renderer의 shared validation, materialization
plan ordering/deduplication은 반드시 실행 가능한 contract test로 유지한다. 문서만으로
강제하지 않는다.

### Charts

한 차트의 end-to-end contract를 한 directory에서 읽을 수 있게 한다.

- Public chain의 유일한 원본은 `examples/<chart>/program.js`이며 `public.test.js`가 이를
  import한다.
- `primitive.program.js`는 raw primitive call을 숨기지 않는 executable oracle이다.
- Public과 primitive 결과는 concrete `graphicSpec`, order, renderer calls가 같아야 한다.
- 통계 expected values는 production materializer를 호출하지 않는 독립 reference 계산으로
  만든다.
- 구현 과정의 STEP별 program이나 snapshot은 최종 vertical slice에 남기지 않는다.

### Support와 artifacts

둘 이상의 suite에서 재사용하는 Canvas spy, PNG inspection, data loading 같은 test
infrastructure만 `test/support/`에 둔다. 차트 전용 계산을 범용 fixture로 올리지 않는다.
Generated PNG는 test source와 섞지 않고 `.artifacts/test/png/`에 쓰며 commit하지 않는다.

### Documentation site

Markdown test는 local link와 anchor, navigation, tutorial/public program action flow,
public action declaration/reference parity, chart image manifest, LLM bundle freshness를
검증한다. CI는 여기에 Jekyll build, built HTML link/asset 검사와 Chromium desktop/mobile
smoke test를 추가한다. Browser screenshot은 `.artifacts/docs/`에만 생성한다.

Chart documentation image는 canonical public program에서 생성하지만 OS별 text
rasterization 차이 때문에 PNG bytes를 직접 비교하지 않는다. Source/data/renderer hash
manifest와 concrete image dimensions를 함께 검증한다.

## Discovery와 실행

`.test.js`는 일반 fast suite, `.render.js`는 고비용 PNG regression이다. Node의 directory
자동 discovery는 executable program과 support module까지 실행할 수 있으므로 사용하지
않고 package script가 대상 glob을 명시한다.

```text
npm run test:unit
npm run test:contracts
npm run test:charts
npm run test:docs
npm run test:docs:built
npm run test:docs:browser
npm test
npm run test:coverage
npm run test:render
```

일반 suite와 render suite는 독립적으로 실패 원인을 좁힐 수 있어야 하며, 최종 변경은
coverage gate와 render regression을 모두 통과해야 한다.
