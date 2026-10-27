# my-videos — lyric reels pipeline

Every request in this repo = make a lyric video from an mp3 in the repo.

## Default output
- 9:16, 1080x1920, 24 fps, H.264 (`-preset veryfast`), AAC audio from the song
- Instagram safe area: keep all text 220 px from top, 320 px from bottom
- Output to `out/<song-name>.mp4` and commit + push it

## Default style (unless the prompt says otherwise)
- Minimal ink-line drawings on a dark background, warm glow
- Lyrics in short 2–3 word chunks, current word highlighted
- Smooth fade/slide transitions, no clutter

## How to build
1. Get exact word timings from the audio (whisper / forced alignment against the given lyrics). Never guess timings.
2. Build the animation as an HTML canvas page in `src/`.
3. Render frames headless (Playwright/Puppeteer) → ffmpeg → mp4 with the song as audio.
4. Before the full render, save 3 preview frames to `out/preview/` and commit them if asked for a preview ("pehle 3 frames dikhao").
5. If a render is long, render in parts and concat with ffmpeg.

## Change requests
Short Hinglish edits ("captions bade karo", "background dark karo") → change only that, re-render, commit the new mp4.
