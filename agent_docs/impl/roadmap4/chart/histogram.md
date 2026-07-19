# Basic Histogram

## 목적

Bar mark와 atomic `encodeHistogram`을 shortest `{ field }` 호출로 묶는다.

## 후보 API

```javascript
program.createHistogram({
  id?, data?, coordinate?, field,
  maxBins?, binStep?, binBoundaries?, stack?, xScale?, yScale?,
  color?,
  bar?: { fill?, opacity?, stroke?, strokeWidth? },
  guides?: false | CreateGuidesOptions
});
```

Bin option 세 종류는 existing `encodeHistogram`처럼 mutually exclusive다. Color layout은 histogram의
existing default stack/fill policy를 재사용한다. Facade가 x/y count encoding을 별도로 복제하지 않는다.

## Shortest chain과 hierarchy

```javascript
program.createHistogram({ field: "Displacement" });
```

`createBarMark → encodeHistogram → optional encodeColor → createGuides` 순서다.

## 저장 결과와 오류

Bin definition, x/y scale, stack과 color는 existing semantic state에만 저장된다. Invalid field, mutually
exclusive bin options, empty valid extent와 incompatible explicit domain은 partial bar를 남기지 않고 거부한다.
