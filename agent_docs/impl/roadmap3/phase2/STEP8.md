# STEP 8 — Public Polar Position Actions

## 진행 상태

- [ ] `encodeTheta`
- [ ] `encodeR`
- [ ] `encodePointRadius`
- [ ] Order-independent shortest calls
- [ ] Invalid, ambiguous와 atomic failure tests

`encodePointRadius`는 existing `encodeRadius`를 wrapped child로 호출하는 additive alias다. `encodeTheta`와
`encodeR`은 어느 순서로 호출해도 같은 complete semantic, scale와 graphic state를 만든다.
