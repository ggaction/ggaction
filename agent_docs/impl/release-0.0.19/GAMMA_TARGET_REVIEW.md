# Gamma 목표 입력의 정수화 보정

Gate: **approved**. 사용자는2026-10-17에 원격 `4f2f985c`의 보정된 그림과
18개 정확한 색상값에 대해 **“보정된 목표 승인하고 계속 구현”**으로 명시 승인했다.
#169의 public API·계산법·기존 색상 정책은 바꾸지 않는다.
기존 검토 그림의 이상적인 실수 endpoint를 실제 공개 API로 입력할 수 있는 두
8bit 색상으로 명시하여 primitive 목표를 보정한다. 다른27개 기능은 계속 구현한다.

## 발견과 결정

- [기존 목표](targets/color-math-ideal-reference.svg)는 H=0→120, S=1,
  L=.2→.8이라는 정수화 이전의 실수 cubehelix endpoint에서 직접 계산했다.
- 기존 public color range는 입력 색을8bit RGB로 정규화한다. 이 정책을 바꾸면
  gamma1의 기존 결과가 변하므로 **그대로 유지**한다.
- 정확한 공개 range는 `['#75190b','#90f2a4']`다. 이 바이트를 독립적으로
  역변환한 endpoint는 H=359.91131155362626/S=.9971265231069638/L=.20023511872546734와
  H=120.15734226531444/S=.9993891368856703/L=.8000787823234881이다.
- shortest hue와 saturation은 기존 t, lightness만 t**gamma로 보간한다. 예전 이상적
  입력과 결과가 RGB 최대1 다르지만 **허용 오차를 넓히지 않는다**. 정확한 공개
  입력에서 계산한 새 primitive와 public 출력의18개 RGB sample을 정확히 비교한다.
- 예전 gamma1/t=.75의R122는 새 입력에서121이다. gamma2.2/t=.125의G34는35,
  t=.75의B23은24다. 이 차이는 새 gamma 함수의 오류가 아니라 검토 입력의 차이다.

## 정확한 public 호출과 독립 증거

```js
program.editColorScale({
  range: ['#75190b', '#90f2a4'],
  interpolate: 'cubehelix',
  gamma: 2.2
});
```

[보정한 목표7](targets/color-math.svg)에서 위 두 줄이 gamma1/2.2이며 아래 pow 줄은
변경하지 않았다. [18개 기대값과 계수](targets/gamma-quantized-input.json),
[재현 소스](render-targets.mjs), [manifest](targets/manifest.json)를 함께 검토한다.
소스는 runtime color helper 없이3×3 Gaussian elimination으로 endpoint를 독립
역산한다. 별도 작성된18개 기대값과 모두 byte-exact 일치하고 Chromium153 실제
렌더·텍스트 경계 검사를 통과했다. 에이전트가 이미지 픽셀을 눈/VLM으로 보지 않았다.

이미 승인한 gamma API와 기본 동작 유지 결정은 그대로다. 변경된 시각 목표의
확인은 `agent_docs/impl/AGENTS.md`의 “A changed target requires renewed
confirmation” 요구에 따라 받았다. 이 승인은 수정된 목표의 구현·검증 경계를
열며 #169의 구현 완료나 검증 통과를 의미하지 않는다.
