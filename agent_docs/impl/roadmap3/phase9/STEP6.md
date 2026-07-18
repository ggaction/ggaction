# STEP 6 — Text Mark, Encoding, and Focused Editing

## 진행 상태

- [x] Semantic text mark and completeness policy
- [x] `createTextMark` layer inference
- [x] Field/value `encodeText` and deterministic formatting
- [x] `editTextMark` typography and graphical offsets
- [x] Text materialization and renderer-schema parity

Text content는 exactly one field/value source를 가진다. Position은 explicit encoding 또는 compatible source layer에서
추론해 semantic state에 저장한다. Concrete text item은 final content, x/y, typography, alignment, rotation과 opacity를
모두 가진다.
