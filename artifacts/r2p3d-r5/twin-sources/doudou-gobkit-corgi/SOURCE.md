# Gobkit Corgi source — PLI R5

- Upstream repository: `Ariescar/gobkit-free-assets`
- Upstream path: `animal/Corgi.glb`
- Upstream Git blob: `5e76b79fe002de2158309d56fdd02402de69f8af`
- License: **CC0 1.0 Universal**
- Provider: Gobkit / Alsomind Tech Co., Ltd.
- Imported: 2026-10-03
- Purpose: breed-correct demo Corgi geometry source for the PLI `doudou` demo twin.
- Original binary: `Corgi.glb` (stored byte-for-byte from upstream).
- Derived source: `Corgi.obj` applies only the upstream mesh-node -90° X world transform; topology is otherwise unchanged.
- PLI product output continues through the in-repo deterministic pipeline: subdivision → normalize → UV unwrap → demo-template coat painting → PLI 16-joint skin weights → 12 PLI motion clips → GLB.

This source replaces the Jack-Russell-derived geometry ceiling for the demo Corgi.
It does **not** claim reconstruction or validation of a real pet identity.
