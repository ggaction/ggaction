# Gate R5-P4-V — Directional Tick and Point Primitive

## Gate state

`planned`

## Review target

Phase 4 public implementation 전에 고정하는 unrotated Tick, field-rotated Tick과 field-rotated triangle point의
three-panel primitive visual target이다. Eight compass directions share identical x/y anchors across panels.

## Approval effect

승인하면 이 concrete geometry를 보존하면서 Tick lifecycle와 point/Tick `encodeAngle` public flow 구현을 시작한다.

## Work blocked before approval

- `createTickMark`, `editTickMark`와 Tick materialization
- Point/Tick `encodeAngle` and `removeEncoding({ channel: "angle" })`
- Strict declarations, Current contract와 stable public example promotion
