# Format6 full-frame 구현 채택

상태: approved. Root는 기존 `AUTHORIZATION.json#remainingApproval` 범위에서
[구체안](batch-frame-format6-proposal.md)을 전체 검토한 뒤 채택했다. 정확한 검토 revision은
`d103dc9c0a256c27347e7b91d2bc2c196b408c41`이며35개 reject·실제1k numeric 저장 oracle·
엄격한 public overload TS 검증을 포함한다. 이 metadata 기록은 검토 source를 바꾸지 않는다.
사용자에게 같은 범위의 승인을 재요청하지 않는다.

## 채택한 결정

- 명시 format6, scene3, 완전히 materialized된 immutable plain numeric arrays와 circle-batch.
  한 batch는1..10000row이며 연속 run을 순서대로 나눈다. 원100k는 논리100k로 계산한다.
- 공통 primitive validator·authoring·4renderer 직접 소비. 기존 editable4/graphic1은 additive
  primitive vocabulary 확장으로 유지하고 unknown type은 구 reader에서 strict 거부한다.
- 기존 columns@2/envelope1과 schema별 numeric projection을 재사용한다. Full payload hash,
  모든 declared length/finite/cell/logical work의 preflight와 기존 quota를 유지한다. Offline native 권한0.
- 기존 v3–v5의 반환과 정상 저장 bytes를 유지한다. 동적 format과 deserialize는 Any union으로
  정확히 선언하고 version6 narrowing을 docs/contracts/consumer fixtures에 반영한다.
- Player representation을 유지하고 교차 interrupt를 원자적으로 거부한다. Batch→legacy 암묵
  downgrade와 새 eager adapter API를 추가하지 않는다. Legacy가 필요한 caller는 legacy mode를 선택한다.

## 구현과 검증 의무

별도 product branch/worktree에서 compiler 및 decoded cell 변경이 포함된
`edb67604f5252982d457588388faec8876778292`를 기준으로 시작한다. 기존 persistence codec 변경을
보존한다. 공개 stub만 있는 중간 checkpoint는 만들지 않고 coherent consumer 전체 연결 후 검증한다.

모든4renderer의 paint/좌표, native hit, offline, rebase, timeline, lifetime, 기존 mode bytes와
원1k/10k/100k full-frame SLO 및100cycle 의무를 유지한다. Timer 안에서 current row geometry/
identity/meaning을 완성하고 검산한다. 복잡한 paint의 기존 fallback 지원과 최종성능 의무도 유지한다.
대형 원100k는 root가 단일 슬롯을 배정한 뒤 실행한다. 이 채택 기록은 제품 구현이나 SLO 완료를
뜻하지 않으며, PR/publish/deploy 권한을 추가하지 않는다.
