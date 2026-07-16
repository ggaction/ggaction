# Roadmap 2 — Phase 9 Step 4: Point Highlight Primitive

## 목표

Future selection actions 없이 Cars grouped top-point highlight를 raw primitive/config operations로 만들고 Gate A에서 승인받는다.

## 진행 상태

- [x] Independent Origin-grouped maximum Horsepower selected rows
- [x] Exact selected/unselected point IDs and stable tie order
- [x] Accent color, diamond, size, opacity and logical offset target
- [x] Complement dimming and selected-last child order
- [x] Axes/legend/title integration without selection-aware public actions
- [x] Primitive program, reference values, manifest and exact future call chain
- [x] Canvas and `primitive.png` checks
- [x] Gate A user confirmation
- [x] Gate candidate commit and push

## Gate A

Confirm that all three selected points remain data-positioned, visibly emphasized and front-most while the complete
scatterplot context remains readable.

### Gate A candidate

- Selected rows: USA `pontiac grand prix` (230), Japan `datsun 280-zx` (132), Europe `peugeot 604sl` (133).
- Selected recipe: red diamond, white 1.5px outline, area multiplier 5.5, opacity 1 and logical offset `(7, -7)`.
- Complement opacity: 0.18. Selected children are the final three collection children.
- Artifact: `.artifacts/test/png/roadmap2/mark-selection/points-grouped-max/primitive.png`.
- Manifest: `test/gates/mark-selection-points/variants/manifest.js`.
- The gallery stores the exact future `highlightMarks({ select: ... })` chain and intentionally has no user-facing
  program before approval.

### Approval result

2026-07-16 user confirmation approved the candidate without visual changes. STEP5 uses this primitive as the exact
public semantic/graphic/renderer/pixel target.

## 완료 조건

Independent selected rows and concrete point properties/order define the approved future public output.
