# STEP 2 — Apply Compatible Dependency and Security Updates

## 진행 상태

- [x] `npm outdated`와 production/full audit 기준선 확인
- [x] Compatible direct dependency revisions 적용
- [x] Patched transitive PostCSS resolution 적용
- [x] Major deferrals 기록
- [x] Normal, coverage, package, browser와 renderer compatibility 검증

## 실행 계약

- `@napi-rs/canvas`: `1.0.2` → compatible `1.0.3`
- Playwright: `1.61.1` → compatible `1.62.1`
- PostCSS: vulnerable `<=8.5.22` resolution을 patched compatible revision으로 갱신
- `es-module-lexer` 2와 Vite 8은 major이므로 Phase 4에서 연기

Production audit 0뿐 아니라 full audit 0을 목표로 한다. Native PNG/PDF output, browser consumer, generated docs와
package artifact가 기존 contract를 그대로 통과하지 않으면 해당 update를 채택하지 않는다.

## 검증 결과

- Installed resolutions: `@napi-rs/canvas@1.0.3`, `playwright@1.62.1`, `postcss@8.5.25`
- `npm audit --omit=dev`와 full `npm audit`: vulnerabilities 0
- `npm test`: 2,060/2,060 pass
- `npm run test:coverage`: 94.75% lines, 90.25% branches, 98.5% functions; 71 critical floors pass
- `npm run test:package`: installed runtime, types, native adapters, tutorials와 browser entries pass
- `npm run test:browser`: 53/53 pass
- `npm run test:render`: 136/136 pass and both galleries verified
- Vite 8과 `es-module-lexer` 2는 major compatibility work로 명시적으로 연기한다.
