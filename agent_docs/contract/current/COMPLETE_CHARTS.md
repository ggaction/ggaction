# Complete chart facades

기존 mark·encoding·guide owner를 조합하는 full `ggaction` 전용 H0다. Basic에는 추가하지 않는다.
새 chart state나 compiler를 만들지 않는다. Canvas와 materialized source data는 먼저 작성한다.
Data는 explicit/current/unique, coordinate는 explicit/bound/unique/family default 순으로 선택하며 모호하면 오류다.
새 mark에 resolved data를 명시해 다른 mark의 encoding을 우연히 상속하지 않는다.
Guide 생략/{}는 자기 layer의 compatible guide를 확보하고 false는 이번 확보만 생략한다.
기존 guide를 삭제하거나 충돌하는 resource를 덮지 않는다. 모든 실패는 caller와 이전 program/trace를 보존한다.

## `createPiePlot`

`createPiePlot({ id?, data?, coordinate?, category, value?, aggregate?, color?, arc?, guides? })`.
Default id는 `piePlot`, lifecycle은 Aggregate create-only다.

- Category: field string 또는 `{ field, fieldType?: "nominal" | "ordinal", scale? }`. 숫자 shorthand도 nominal이다.
  Scale은 `{id?, type?:"band", domain?, range?, reverse?}`만 지원한다. Explicit domain은 모든 source category를 포함한다.
- Aggregate: value 없음은 count. Value field를 주면 `aggregate:"sum"`을 반드시 함께 쓴다. Sum-without-value와 count+value는 오류다.
  Sum은 중복 category의 nonnegative finite weights를 합친다. Invalid weight와 all-zero denominator는 오류다.
- Color: 생략은 category, false는 field color 생략, field string 또는 `{field, fieldType?:nominal|ordinal, scale?, palette?}`.
  다른 field는 각 final slice 안에서 유일해야 한다. Scalar `arc.fill`과 함께 쓰면 오류다.
- Arc: `{innerRadius?, padAngle?, fill?, opacity?, stroke?, strokeWidth?}`. InnerRadius는 availableRadius의 [0,1) 비율,
  padAngle은 nonnegative degrees, opacity는 [0,1]. Stroke는 create에서 string만 지원한다.
  기본은 innerRadius 0, padAngle 0, opacity 1, white stroke width 1. Optional undefined는 생략과 같다.
- Guides: `{axes?:false, grid?:false, legend?:false|PieLegendOptions}` 또는 false.
  Categorical color legend만 생성한다. Count/gradient legend와 color 외 channels는 거부한다.
  Color가 없는데 legend를 요청하면 오류다. Zero-total category의 sector는 생략하지만 color-domain legend에는 남을 수 있다.
- Effects: `createArcMark → encodeTheta → encodeColor? → guide fulfillment`의 wrapped child trace다.
  Semantic은 raw source binding과 theta/category/aggregate/weight/color/scale/coordinate, graphic은 concrete sector paths다.
  별도 slice-share cache나 derived aggregate dataset을 생성하지 않는다.
- Editing: `editArcMark`, `encodeTheta`, `encodeColor`, `removeEncoding`, scale·legend editor가 소유한다.
  Count/sum reassignment, Canvas resize와 supported sector selection은 같은 lower 경로로 동작한다.
- Donut은 `arc.innerRadius`로 작성한다. `createDonutPlot` alias는 없다. Labels와 새 theta-order API는 이 계약에 포함하지 않는다.

### Formal values — `createPiePlot`

- Implemented: `createPiePlot(options: CreatePiePlotOptions): ChartProgram`.
- Required: category. Value를 지정하면 aggregate sum이 필수다. 알려지지 않은 key, 잘못된 역할/weight/style,
  이미 존재하는 mark id와 foreign guide/coordinate/scale 충돌은 오류다.
- Proposed (NOT IMPLEMENTED): No proposal in this action contract. Labels와 별도 ordering action은 future capability다.

### Value coverage — `createPiePlot`

- ✅ Covered: shortest count, explicit sum, numeric categories, 0/invalid weights, donut geometry, scalar color opt-out,
  wrong roles/options/styles/guides, guide reuse/conflicts, prior program/caller immutability, lower edits/resize.
- ✅ Covered: 세 canonical public/primitive의 semanticSpec·graphicSpec·draw order·Canvas calls·decoded PNG pixels.
- Evidence: `test/unit/actions/charts/pie-plot.test.js`, `test/charts/pie-plot/{primitive,public}.test.js`,
  `test/charts/pie-plot/{png,vector}.render.js`, `examples/pie-plot/program.js`, `scripts/package-consumer.js`.
