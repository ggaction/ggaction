# 축별 facet 간격 검증 기록

## 상태

- 설계 remote Gate: `83712245` (`codex/release1400`, ROOT 검토/기존 인간 승인 재사용).
- 구현·공개 계약·생성물과 아래 검증을 함께 통과했다. 설치 runtime/registry/번역 집계를 변경하지 않았다.
- 현재 P의 활성 runtime은 기존 candidate `2f6bf496`다. 이 변경을 사용한 실제 School source는 없다.

## 구현 경계

`core/facetGap.js` 한 곳이 기존 numeric spacing 검증과 닫힌 facet pair를 검증한다.
`layout/composition.js`는 기존 numeric validator export를 재노출한다. Core→layout 의존은 없다.
숫자는 기존 표현/오류/계산을 유지하고 객체만 축별 clearance/overflow 상세를 추가한다.
Facet/grid/repeat의 layout, content packing과 저장 복원은 같은 owner를 사용한다.
Concat은 숫자만 받으며 renderer는 여전히 concrete graphicSpec만 읽는다.

검증 과정에서 기존 scalar와 object에 동일하게 나타난 parent-title data revision 오류를
수정했다. 기존 seed child에는 title graphic이 없는데 부모 title 의미/config가 unit revision에
남아 rematerializeTitle을 호출했다. Revision용 template에서 기존 removeTitle action으로
부모 제목만 분리하고, 부모 조립 때 원래 semantic title과 parent title config/graphic을
복원한다. 제목을 child에 복제하거나 오류를 무시하지 않는다.

## 보존한 검사 결과

- 기존 composition/content/core-state/plot-spacing/header 회귀: 31 PASS.
- 새 pure layout·public action·lifecycle·persistence·PNG/PDF 등 focused: 33 PASS.
- 설치된 실제 packed package의 TypeScript consumer: 기존 사례와 새 FacetGap positive/negative PASS.
- Chromium browser: 4 PASS. DPR1/2에서 scalar와 equal pair의 SVG, PNG bytes와 decoded pixels가
  정확히 같다. 비대칭 plot 원점 네 개와 16개 문자 bounds, 저장 복원도 검사했다. 이미지 육안 검사는 없다.
- 첫 full normal: 5620/5627 PASS, 7 FAIL. 실패 로그를 그대로 남겼다. 초기 package entry cap,
  source boundary, 부모 제목 lifecycle, 미동기화 generated metadata/기존 snippet hash 검사였다.
- 최종 full normal: 5630/5630 PASS(exit0), `.artifacts/test/facet-axis-gaps-normal-v2.log`.
- 전체 설치 package consumer: PASS(exit0), `.artifacts/test/facet-axis-gaps-package-consumer-v1.log`.

테스트 owner:

- `test/unit/layout/facet-axis-gaps.test.js`
- `test/unit/actions/composition/facet-axis-gaps.test.js`
- `test/browser/facet-axis-gaps.browser.js`
- `scripts/consumers/fixtures/facet-axis-gaps.ts` 및 기존 types consumer의 fixture 연결

큰 검사는 모두 번역 프로젝트의 storage supervisor를 통과했다. 최초 전체 실패 로그는
`.artifacts/test/facet-axis-gaps-normal-v1.log`에 남아 있으며 새로운 성공으로 덮어쓰지 않았다.

## Package inventory와 한도

번역 workspace의 `reports/v13-facet-axis-gaps-package-inventory-v1.json`은 활성 candidate의
623개 package 경로가 모두 남고 새 `src/core/facetGap.js` 하나만 추가됐음을 검증했다.
Entry cap만 ROOT가 승인한 624로 바꾸었다. Path allowlist, 보안 검사와 byte 한도는 그대로다.
초기 canonical 측정은 624 files /900079 packed bytes /4266320 unpacked bytes다.
기존 한도 902000 /4272000 아래이며 한도를 올리지 않았다. 최종 CHANGELOG 동기화 후 실제 전체 package consumer archive는 900137 packed /4266561
unpacked bytes이며 SHA256 `94fcb5460d1c1d6c59f7e0da9e3b6544b7473c870966330df6477986c2947171`다. 동일 byte 한도 아래다.

## 후속 경계

소스·테스트·Current 계약·공개 문서·생성물을 함께 verified commit/push한다.
구현 checkpoint는 `0b717e7ed2e9bc6f455cfc7b98288785b9ad2223`이며, 후속 metadata는
이 실제 source commit과 contract checksum
`sha256:310e928037990f408f8ee790dcdd0e5c9455b8f645554a58e91ef8e34a8f7e06`을
가리킨다. 설계 Gate commit을 구현된 runtime의 source commit으로 쓰지 않는다.
Commit 후 전체 docs 검사도 152/152 PASS(exit0),
`.artifacts/test/facet-axis-gaps-docs-after-commit-v1.log`에 보존했다.
새 package/docs와 기존 전체 accepted 프로그램의 호환 검증이 끝나기 전에는 P runtime을
활성화하지 않는다. 0999/0557은 별도 native/source/protocol qualification과 실제 School
normal/cold/final 검증 전까지 미집계다. 공개 이슈의 released 처리는 1400 registry release 이후다.
