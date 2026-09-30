# Pixel Oracle

`scripts/blind-ui/pixel_oracle.py` — classical, non-AI image statistics.

## Output fields

```json
{
  "width": 1080,
  "height": 2400,
  "mean_luma": 0.82,
  "warm_pixel_ratio": 0.61,
  "cool_accent_ratio": 0.043,
  "white_surface_ratio": 0.19,
  "dark_surface_ratio": 0.12,
  "edge_density": 0.087,
  "center_contrast": 0.23,
  "phash": "0101...",
  "sha256": "…",
  "negative_distance": { "ssim": 0.41, "phash_hamming": 23, "mse": 0.09 }
}
```

## Classifiers (deterministic, documented in tokens)

- **warm**: `r≥g≥b` with `(r−b)/(r+1) > 0.03`, or the warm cream / warm neutral
  / warm charcoal families (± small tolerances).
- **cool accent**: `b>r` and `(b−r)/(b+1) > 0.05`, or the twin-accent family.
- **light card**: near-pure-white surfaces (`min channel > 245/255`, saturation
  < 0.08) — cream canvas is NOT counted as a white card.

## Today pixel contract

`warm_pixel_ratio ≥ 0.35`, `cool_accent_ratio ≤ 0.12`,
`white_surface_ratio ≤ 0.45` (ROI-normalized, method recorded per run).

## Negative distance

Multi-scale SSIM + pHash hamming vs the `KNOWN_BAD_2026_09_29` baseline. It
catches "code claims refactor, pixels barely changed" without asserting
"different = better".
