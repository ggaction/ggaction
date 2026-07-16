# Roadmap 2 — Phase 10 Step 2: Common Scale Grammar

## 목표

Renderer와 program state를 모르는 pure scale grammar에서 transformed mapping, type-specific validation,
domain policy와 tick primitives를 구현한다.

## 진행 상태

- [x] Canonical scale type families and compatibility matrix
- [x] Log mapping/base/domain validation and nice/tick primitives
- [x] Sign-preserving pow and sqrt specialization
- [x] Symlog mapping/constant and zero-crossing fixtures
- [x] UTC-only time normalization contract lock
- [x] Band/point/ordinal responsibility primitives
- [x] Clamp/reverse/unknown pure policy helpers
- [x] Independent numeric fixtures and invariants
- [x] STEP status, conceptual commits and pushes

## 구현 결과

- `src/grammar/scales/transformed.js`가 complete type vocabulary와 semantic role compatibility의 canonical
  pure owner다. Category position과 discrete appearance는 각각 band/point/ordinal role로 분리된다.
- Log는 positive/negative single-sign domain, configurable base, power nice bounds와 power ticks를 지원한다.
  Pow는 sign-preserving exponent, sqrt는 fixed 0.5 specialization, symlog는 configurable linear-region constant를
  사용한다.
- Mapping은 transformed proportion에 clamp를 적용하고 final range reverse와 explicit unknown fallback을
  deterministic하게 처리한다. Semantic domain은 policy 적용으로 수정되지 않는다.
- Existing UTC time normalization/tick tests와 Phase 10 contract guard가 temporal token 하나를 고정한다.
- `test/unit/grammar/scales/transformed.test.js`는 production action/mark/guide 없이 family, parameters, positive/
  negative/zero mappings, domain precedence, ticks, policies와 frozen output을 검증한다.

## 검증

- `node --test test/unit/grammar/scales/transformed.test.js`
- `npm run test:unit` — 706 tests

## 완료 조건

Every transformed mapping and invalid boundary is proven independently from actions, marks, guides and pixels.
