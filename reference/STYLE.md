# Reference edit style ("glow silhouette flash" reel)

Source: `reference.mp4` (720x1280, 30 fps, 12.3 s). Machine-readable timings: `template.json`. Music: `bgm.m4a`. Key frames: `frames/`.

## Structure
| # | Time | Content |
|---|------|---------|
| 1 | 0.00–1.83 | Clip 1 (night bridge, subject dancing) |
| 2 | 1.83–4.23 | Clip 2 (rainy street) |
| 3 | 4.23–6.53 | Clip 3 (car window) |
| 4 | 6.53–8.30 | Clip 4 (tram) |
| 5 | 8.30–12.30 | Outro: clip 4 continues, darkened ~65%, IG logo + handle centered |

Cuts are **hard cuts** on the bar (~2.33 s each), no slide/zoom transitions.

## Main effect: glowing white silhouette flash
- The person is segmented (rotoscope mask) and filled **solid white** with a soft **green-yellow outer glow** (~15–25 px blur), background stays visible.
- It flickers on beats: same 9-hit pattern every clip (offsets from clip start, sec):
  `0.17, 0.34 | 0.84, 0.97 | 1.20 | 1.40, 1.57 | 2.07, 2.20` — each hit ~3–4 frames (0.07–0.13 s).
- Light **dust/rain/particle overlay** across the whole frame (small dark specks, also visible on the white fill).

## Text
- Top caption, centered, small, cream (#F3E9C6), y ≈ 17.5% of height: *"Me after playing my role in everyone's life"* — stays the whole video, dims in outro.
- Small Instagram glyph top-right (x ≈ 89%, y ≈ 26%), flickers to IG gradient on flashes; tiny handle under it.
- Outro: big IG logo center with animated pink/orange/purple gradient, handle in bold condensed caps below.

## Audio
- BGM only (`bgm.m4a`, beat-heavy); flashes are synced to its kicks. Gaps/silence at 8.07–8.67 and 9.83–10.52 (drop before outro).
- No separate SFX layer detected — the "hits" are in the music itself.

## How to apply to new clips
1. Trim each user clip to ~2.33 s (best moment, subject full-body, dark/night look preferred).
2. Scale/crop to 1080x1920 (9:16), 30 fps.
3. Segment the person per frame (e.g. rembg / MediaPipe selfie segmentation) → white fill + glow on flash frames from the pattern.
4. Add particle overlay, caption, IG corner icon; outro with darken + logo + handle.
5. Lay `bgm.m4a` (or the user's song, re-beat-mapped) and export H.264/AAC.
