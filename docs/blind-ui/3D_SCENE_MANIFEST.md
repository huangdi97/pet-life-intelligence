# 3D Scene Manifest

The 3D pet-twin stage exposes a runtime manifest (test/debug builds only) so a
blind agent can prove the pet is **really 3D** without looking at pixels.

## Schema

See `packages/visual-contract/schema/twin-contract.schema.json`.

```json
{
  "ready": true,
  "representation": "procedural-twin | procedural-demo-stage",
  "fallbackUsed": false,
  "assetVersion": "demo-v1 | <twin version>",
  "meshCount": 9,
  "skinnedMeshCount": 0,
  "skeleton": true,
  "animationClips": ["Idle", "Sit", "Walk", "Run", "Eat", "Drink", "Sleep"],
  "wireframe": false,
  "materialMode": "pbr",
  "baseColorTexture": true,
  "camera": { "fov": 38, "distance": 4.6, "yaw": 0.35, "pitch": 0.28, "radius": 4.6 },
  "screenBounds": { "x": 82, "y": 138, "width": 226, "height": 310 },
  "activeClip": "Idle",
  "availableClips": ["Idle", "Sit", "Walk", "Run", "Eat", "Drink", "Sleep"],
  "playbackState": "playing",
  "reducedMotion": false,
  "pose": "Idle",
  "poseSource": "AMBIENT | REPRESENTATIVE",
  "poseConfidence": 0.3
}
```

## Hooks

- **Web**: `window.__PLI_3D_MANIFEST__` refreshed in the render loop by
  `apps/web/components/three/pet3d-viewer.tsx`. Playwright reads it directly.
- **Mobile**: the WebView page (`apps/mobile/scripts/pet-stage-entry.ts`)
  exposes `__PLI_GET_MANIFEST`/`__PLI_REQUEST_MANIFEST` and posts
  `{type:"manifest"}`; `Pet3DViewer` prints `[plimanifest] <json>` to
  logcat so the Android extractor can build `3d.json`.

## Gates

- `wireframe` must be `false` in production visual mode.
- `fallbackUsed=false` on web (real WebGL). On the Android emulator without
  WebGL the stage **honestly** reports `ready=false`/`fallbackUsed=true` and
  renders the labeled 2.5D fallback — that is truthful, not FAKE_3D.
- FAKE_3D detector: a `pet-twin` element implemented as a static image while
  `manifest.ready=true` → FAIL.
- Rotation gate: Life View camera yaw before/after drag must differ (A≠B).

## Motion / pose truth

`poseSource` distinguishes `AMBIENT` (cosmetic breathing), `REPRESENTATIVE`
(pose derived from the most recent real event) and `OBSERVED`. Health inference
never drives a pose.
