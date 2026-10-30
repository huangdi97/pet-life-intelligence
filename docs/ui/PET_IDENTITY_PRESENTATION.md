# PET_IDENTITY_PRESENTATION — R5.6 宠物身份与 Pet Twin 呈现规范

> Authority: canonical v3.4-R1 master + L2 Feature Inventory + `PLI_VISUAL_SYSTEM_R5.md` + R5.5 implementation master.
> Status: SOURCE DESIGN CLOSED / RUNTIME VISUAL ACCEPTANCE PENDING.
> Scope: Web / Android-Mobile / Mini. This document replaces the old v0.2-only presentation note; it does not replace the canonical master.

## 1. Product principle

PLI 的中心不是“健康数据”或“AI 功能”，而是一只持续存在的具体宠物。

Identity presentation follows:

`PET → NOW → CHANGE → ATTENTION → ACTION → MEMORY`

The pet identity must be visually present before utilities. Owner surfaces must never default to a letter-avatar, generic dashboard tile or engineering 3D viewer.

## 2. Capability-aware visual priority

### Capable Web / Android

1. Confirmed individual high-fidelity Pet Twin when available and runtime-ready.
2. Real pet media when the Twin is unavailable, loading, rejected or inappropriate for the surface.
3. Species visual as an honest fallback.
4. Letter fallback only for compact badges where no visual asset exists; never as the primary Hero.

### Mini

1. Real pet media.
2. Species visual.
3. Honest Twin status/version summary with route guidance to Web/Android for interactive 3D.
4. Letter fallback only for compact badges.

Mini must not fake a local high-fidelity Twin runtime.

## 3. High-fidelity Twin contract

Product-capable Twin surfaces require:

- `representation = high-fidelity-glb-twin`;
- runtime-origin manifest;
- continuous skinned mesh;
- UV + baseColor/PBR material;
- real skeleton and supported motion clips;
- real rotate / zoom / reset where interaction is exposed;
- front / side / rear Review cameras that change the real camera;
- graceful media/species fallback if runtime fails.

Procedural primitives are engineering/fallback only and must not be the normal owner Hero.

## 4. Surface-specific presentation

### Today

Pet/Twin is the first visual focus. It lives in the Warm Living Field with restrained food/water/activity/sleep anchors. The page must read as “what is happening with my pet now”, not as a 3D model viewer.

### Pet World

Identity comes before the six life domains. Name, species/breed/age summary and current-life context remain adjacent to the pet presence. The screen must not become a feature menu.

### Life View

The Twin dominates the spatial composition. State anchors, pose controls and camera controls are secondary. The surface is a Twin Space, not a dark Viewer card.

### Twin Review

Use the Neutral Identity Studio: light neutral background, large readable Twin, front/side/rear, zoom/reset and identity-only language. Health/social/task content does not belong here.

### Lists / Assistant / Quick Log

Use compact PetAvatar / pet media. These provide identity context, not a second Hero.

## 5. Demo and identity honesty

Current demo assets may use product-template morphology/coat traits.

Until real pet media and explicit owner validation exist:

`REAL_PET_IDENTITY_VALIDATION = NOT_YET_OBSERVED`

Do not describe a demo template as a scan, reconstruction or observation of the real pet. Generated/template traits must be labeled through provenance metadata and owner-safe explanatory copy.

## 6. Provenance vocabulary

Allowed owner-facing concepts:

- 主人记录 / 上传照片
- 设备记录
- 专业人员记录
- AI 整理 / 生成候选
- 示例素材 / 模板生成
- 已通过你的确认
- 等待你的确认

Avoid provider/model IDs, raw asset IDs, raw enum values and internal pipeline names in primary owner copy.

## 7. Visual legibility requirements

At normal phone Hero scale the identity must retain:

- readable head / ears / muzzle;
- readable body silhouette;
- separated legs/paws where applicable;
- coat/marking contrast sufficient for Review;
- grounded shadow rather than floating;
- no giant decorative geometry competing with the pet.

Machine geometry/manifest checks may prove the asset exists; they may not prove breed recognition, likeness, warmth or visual approval.

## 8. Failure and fallback

A 3D failure must not become an empty black rectangle.

Fallback order:

`Twin runtime failure → real pet media → species visual → compact neutral fallback`

Owner copy must explain degraded capability without exposing WebGL/provider internals.

## 9. Accessibility

- Hero pet link/control has an explicit accessible label.
- Review front/side/rear exposes selected state.
- Zoom/reset are named actions with >=44dp mobile targets.
- Identity is not encoded only through coat color.
- Reduced motion does not remove the information needed to understand the pet state.

## 10. Acceptance

Machine acceptance may verify runtime origin, asset metadata, camera movement, layout and state semantics.

Human Visual Acceptance alone determines:

- whether the dog visually reads as the intended Corgi-like demo;
- whether the cat renders plausibly;
- whether the Twin feels integrated into a living product;
- whether individual likeness is acceptable.

Until fresh final runtime evidence is explicitly approved:

`HUMAN_VISUAL_ACCEPTANCE = PENDING`
