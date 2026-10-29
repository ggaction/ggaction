# OHLC native vertical slice

상태: OHLC 공개 수직 구현 검증 완료. source a657a9fe7에 문서를 고정했고, 195개 성공+CHANGELOG 누락 1개 보완 후 owner1개 성공, built175/LLM1503 및 320/390/768px browser 검증을 보존했다. 기존 `resolveOHLCValues`가 가격 유효성의 단일 소유자이며 STEP050 합산 admission과 최종074는 아직 열려 있다. `AUTHORIZATION.json`의 remainingApproval(남은077 전체 공개 API·저장·아키텍처·시각 결정 승인)을 이 구체안에 적용한다. 새 질문 없이 구현·검증한다.

`createOHLCPlot({id?,data?,coordinate?,x,low,high,open,close,yScale?,invalid?,doji?,width?,body?,stem?,labels?,color?,clip?,guides?})`와 `editOHLCPlot({target?,...patch})`는 Full에만 제공한다. x는 기존 field/fieldType/scale/temporalUnit 계약, 가격 네 필드는 명시 문자열이다. yScale은 기존 quantitative position scale 옵션이다. 기본 scale ID는 `<id>-x`, `<id>-y`이며 같은 의미의 기존 척도를 공유하려면 ID를 명시한다.

semantic `layer.encoding.x/y/y2`가 x/low/high 및 스케일을, `layer.ohlc={open,close,invalid,doji,labels}`가 나머지 가격 의미를 소유한다. `markConfigs[id].ohlcPlot`은 width/body/stem/labels/clip만 저장한다. primitive는 기존 Line(고저선·doji), Rect(몸통), Text(선택적 가격 label)이며 동일 행의 모든 primitive가 typed row key와 하나의 논리 item identity를 공유한다. 문자열 가격/순서/index를 identity로 사용하지 않는다.

기본값: invalid:error, doji:line, labels:false, clip:true. close>open은 상승색(#16a34a), 하락은 #dc2626이며 flat은 수평 doji 선이다. doji:none은 zero-height body를 확대하지 않는다. stem/body stroke #334155,width1,opacity1. Body upFill/downFill은 기존 FillPaint, outline/shadow는 기존 effect owner를 쓴다. color field가 있으면 body fill을 해당 공통 스케일로 대체한다. 위치와 가격을 바꾸지 않는다.

width는 기존 Bar width 정책(band/pixels/interval)을 재사용한다. categorical x 기본 band.72, quantitative/temporal x 기본 pixels5이며 temporal interval은 기존 UTC interval+명시 covering domain 규칙이다. input order를 보존하며 duplicate x는 같은 위치에 겹치되 typed key는 별개다. invalid:omit-row는 가격 네 값의 잘못된 행 전체를 geometry/domain/labels/selection에서 동일하게 제외한다. 유효 행의 x/color 오류는 숨기지 않는다.

labels는 content(open/close/low/high),format 및 기존 font/effects,offset을 갖고 기본 close/auto/offset6이다. 고저선 상단 위에서 textBaseline:bottom으로 배치하며 common font metric/identity를 사용한다. clip 정책은 명시적이다. 외부 렌더러·금융 형식·자동 데이터 정렬 의존을 만들지 않는다.

검증 계획: 독립 literal OHLC/invalid/flat geometry → 동일 primitive/public pair → create/edit/source reorder/scale/Canvas/facet/nested/labels/highlight/hit/codec → Canvas/SVG/PNG/PDF/scene/offline → 실제 데이터·source-free installed/types/Basic exclusion/docs. 첫 child 전 complete candidate 검증, renderer는 graphicSpec만 읽는다. 아래 evidence는 OHLC 소유 범위에만 적용한다. Waterfall 및 STEP050 합산·074 전체 요구를 완료로 집계하지 않는다.

Outlined stem/doji roles use an explicit open M→L Path with the exact original endpoints; removing the outline restores the ordinary Line. The common outline renderer owns appearance; no line-specific renderer schema is added.


## Consumer evidence

- `test/unit/ohlc-plot.test.js` 15 cases: typed row identity, rebind/revise/remove, color/scale/coordinate/Canvas, conditional scope exclusion, theme/font, whole-row filter/highlight/hit, facet/nested, codec and preflight. Grammar/materialization literal cases 6; independent primitive pairs 3.
- Renderer slice 6, browser 3 variants at 1×/2×; same-run role effect pairs for 10 consumers including OHLC stem/body/label through Canvas/SVG/PNG/PDF. Original Line-outline failure is preserved; the exact open Path lowering fixes it without new renderer schema.
- Real financial source: **one** pinned `tt-stock-prices` table, AAPL/ADBE/AMZN/MSFT/NVDA as five series, three recipes each plus one provenance assertion = 16 cases. This does **not** count as five independent source tables. Any broader independent-source distribution obligation remains at STEP074.
- Shared direct ranged-marks recipe explicitly maps the existing interval positions to low/open and high/close, sharing its original x/y scales. This is a generic API trace witness, not financial-source evidence; no fabricated price rows are introduced.
- Same final archive `f9d4ee5554380e09794b782486f12409adb45021b1800e7155b2a84ca2db4457`: Node20/22/24 each passed three source-free public cases, strict types, optional peers and five browser entry bundles. Full-only authoring remains absent from Basic.
- Four new critical owners: line100%, branch≥94.05%, functions100%; focused20 tests at this source. The later additional shared-paint consumer test passes without runtime changes. No new full coverage/installed sweep is claimed.
- Package measured on Node20/22/24: 1016 entries, 6,607,952 unpacked bytes; max packed1,454,234 before equal-length README ceiling text update. Final CHANGELOG-synchronized Node22 archive is1,451,466 packed/6,608,235 unpacked; conservative measured caps1016/1,455,000/6,609,000. Browser max Full716,468/Basic383,535; caps716,500/383,600.

`editOHLCPlot` owns price field and role appearance changes; generic Cartesian position authoring is not used for splitting its four price roles. Existing `editXScale`/`editYScale`/`editColorScale`, guides and coordinate consumers retain their shared owners. STEP050 final aggregate admission remains an explicit integration obligation; this checkpoint does not relax that policy.
