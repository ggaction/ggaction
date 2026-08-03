# STEP 1 — Close the Roadmap 5 Capability Surface

## 진행 상태

- [x] Time unit, category ordering, moving windows, Tick/Angle와 center area stable chart 확인
- [x] `moving-window-operations`와 `center-stacked-area`를 Planned inventory에서 제거
- [x] Center area public program과 primitive semantic/graphic/renderer exact equivalence 확인
- [x] Docs images, action/reference/signature/search/LLM output 재생성
- [x] Installed JavaScript/TypeScript consumer와 package size guard 확인
- [x] Normal 2,015개와 render 133개 cumulative suite 통과
- [ ] R5-Exit checkpoint commit/push와 Gate review 전환

Review package와 승인 상태는 [`GATE_EXIT.md`](./GATE_EXIT.md)에 기록한다.

## Closeout evidence

- Stable public chart: `examples/centered-area-stream/program.js`
- Stable capability slice: `test/charts/centered-area-stream/`
- Approved artifact: `.artifacts/test/png/charts/center-stacked-area/centered-area-stream/jobs-center-stack/`
- Center PNG: `1380 × 840`, SHA-256
  `ef370669089a899a8d2096e219c955bfb8d0999cf000d41c3d526dbfe80ddeb2`
- Normal suite: 2,015/2,015
- Renderer suite: 133/133; approved gallery 128 variants, active review gallery 0 variants
- Package: 410 entries, 379,274 packed bytes, 1,794,457 unpacked bytes

## Remaining boundary

R5-Exit 승인 뒤 문서-only 상태 전환으로 Roadmap 5를 completed 처리하고 active pointer를 해제한다. PR, merge,
release, publish와 docs deployment는 별도 권한이다.
