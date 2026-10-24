# 균등 2D bin 소속 정책 검증

## 승인과 경계

- 원격 설계 Gate `d6cef4fe`, ROOT의 전체 제안 직접 검토와 인간의 기존 in-scope 향후 설계 승인에 근거한다.
- `assignment:'edges'`는 기존 경계 비교/저장 결과를 보존한다. 새 `step`만 provenance에 저장한다.
- 공개 옵션/편집/derived validation/Basic/heatmap은 pure `grammar/bin2d.js`의 같은 정책을 사용한다.
- Renderer, 원본 행, 검증 허용오차, package entry/byte 한도는 바꾸지 않았다.
- 현재 P의 활성 런타임55c8, 실제 School 번역/controls, admission/집계는 이 구현에서 변경하지 않았다.

## 수치 및 lifecycle

기존 집중 검사에 더해 경계0.6, 충분히 아래인0.6-1e-12, 정확한 edge와 final endpoint,
두 축 독립 소속, 음수/0/양수/중복, finite filtering, member index/row-major order, 단일 bin,
최대 축/grid 한도, overflow step/차이 fallback 및 representable/subnormal edge를 검사한다.
Create/edit/default 복구/no-op/실패 atomic, caller/이전 프로그램 불변, strict persistence,
원본 revision, downstream recompute, facet replay, Basic/direct derived와 high-level heatmap
분해 동일을 포함한다. 옵션 union은 action-card 생성기의 기존 literal enum 처리를 사용하며
root/Basic entry에서 공개 `Bin2DAssignment` type도 내보낸다.

## 실제 원본 데이터의 PRIVATE 수치 증거

번역 workspace의 `reports/v13-source1125-step-numeric-qualification-v1.json`:

- 원본2474행 그대로, 필터2462행.
- 실제 새 GG 구현483 cells와 원본483 cells의 **각 count 전체** exact 일치, 차이0.
- 원본/native binary bounds를 모두 보존했으며 최대 차이1.7763568394002505e-15.
- 원본 필터행 member index2462개가 정확히 한 번씩 등장한다.
- 이 결과는 full-chart native/실제 School 저작/입장/집계가 아니다. 별도 Canvas replay 충돌은 미해결이다.

## 실행 증거

- 최초 focused50/50 PASS.
- 첫 전체 normal5635/5640: enum alias의 생성기 해석2건과 미동기화 inspection/provenance/snippet3건 실패 보존.
- 두 번째 전체 normal5641/5642: 변경된 문서 제목을 가리키던 기존 contextual snippet ID1건만 실패.
  예제 코드 SHA를 유지하고 제목 참조만 새 signature에 맞췄다.
- 세 번째 전체 normal5641/5642: 별도 동시 작업 Gate 문서의 용어 검사1건만 실패. 해당 owner가 문서를
  중립 용어로 고쳤고, 이 파일은 bin 구현 commit에 포함하지 않는다.
- 최종 현재 입력 전체 normal **5642/5642 PASS(exit0)**, `.artifacts/test/bin2d-assignment-normal-v4.log`.
- 실제 packed package consumer 전체 PASS(exit0), `.artifacts/test/bin2d-assignment-package-v1.log`.
  Node/MCP/기존 및 새 TypeScript positive·negative/Basic/튜토리얼/browser bundle 한도를 통과했다.
- Chromium Canvas·SVG DPR1/2 **2/2 PASS(exit0)**, `.artifacts/test/bin2d-assignment-browser-v1.log`.
  양 backend에서 default와 explicit edges는 SVG/PNG bytes가 정확히 같고, step의 경계 셀 이동은
  실제 PNG에서 다르며 3개 cell 및 strict persistence graphic equality를 유지한다.
- 실제 테스트 archive SHA256 `85be3254c97c37658291d32838a36f5e5d630a0984c25319bc68569217626cf8`,
  624files /900605packed bytes /4268387unpacked bytes. 기존 한도902000/4272000과 entry624를 유지했다.

모든 큰 작업은 번역 workspace의 storage supervisor를 사용했다. 실패 로그는
`.artifacts/test/bin2d-assignment-normal-v1.log`와 `normal-v2.log`로 보존하며 덮어쓰지 않는다.
새 candidate package/docs와 전체 기존 accepted cohort 검증 후 quiet runtime 전환은 ROOT가 소유한다.
공개 이슈266은 최종 registry 검증 이전에는 종료하지 않는다.

## 구현 revision provenance

구현 checkpoint는 `20ca9113d40bb16b09e58eeaf83550733042342c`이며,
현재 source checksum은 `sha256:443978a6b9b70f861b9e31b68c6efbe6a1117f6ec3ec4306efbf4d8e45e0df24`다.
후속 metadata는 이 실제 source commit과 checksum을 가리킨다. 설계 Gate를 구현된 runtime source로 사용하지 않는다.

구현 commit 이후 새 provenance로 전체 docs 검사152/152 PASS(exit0),
`.artifacts/test/bin2d-assignment-metadata-docs-v1.log`에 보존했다.
