# Phase 3 — Step 12: Histogram 최종 통합

## 목표

Phase 3에서 구현한 Chart API만으로 완성된 histogram을 작성하는 공개 예제를
제공하고, 문서·브라우저·PNG 결과를 하나의 end-to-end vertical slice로 검증한다.

## 진행 상태

- [x] 최종 user-facing action chain 고정
- [x] Centered title과 전체 guide 결과 acceptance test
- [x] 브라우저용 cars histogram example
- [x] 고해상도 PNG regression과 문서 이미지
- [x] Histogram tutorial과 탐색 경로
- [x] 사용자 문서와 LLM reference 최종 정리
- [x] 전체 테스트와 브라우저 직접 검증
- [x] Phase 3 goal 완료 처리

## 최종 프로그램

```javascript
chart()
  .createCanvas({ width, height, margin })
  .createData({ id: "cars", values: rows })
  .createBarMark({ id: "bars" })
  .encodeHistogram({
    field: "Displacement",
    maxBins: 10,
    xScale: { nice: true, zero: false }
  })
  .encodeColor({
    field: "Origin",
    scale: { palette: "tableau10" }
  })
  .createGuides()
  .createTitle({
    text: "Displacement distribution",
    subtitle: "by country",
    align: "center"
  });
```

`program.js`에는 위 user-facing chain을 직접 보존한다. Browser entry는 data fetch와
Canvas render만 담당하며, test 전용 assertion이나 primitive helper를 넣지 않는다.

## 검증 범위

- Bar, bin/count/zero-stack semantic state
- Concrete stacked rect
- Bin-aligned axes와 horizontal grid
- Bottom-centered categorical legend
- Plot-bound-centered title과 subtitle
- Action trace의 최상위 호출 순서
- Browser Canvas와 2× PNG 출력

## 제외 범위

- 새로운 histogram API 또는 title API
- Interactive controls
- Tooltip과 animation
- 새로운 renderer

## 검증 결과

- 전체 unit/acceptance test 266개 통과
- PNG render test 9개 통과
- 2× PNG가 `864×920`으로 생성되는 것 확인
- 브라우저 Canvas가 `432×460`으로 렌더링되는 것 확인
- Browser status `406 cars binned`, console/page error 없음
- Centered title, horizontal grid, bottom-centered legend 직접 확인
