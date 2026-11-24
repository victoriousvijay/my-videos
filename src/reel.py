"""Glow-silhouette beat-flash reel, built from reference/template.json.
Usage: python3 src/reel.py [out.mp4] [--frames t1,t2,...]  (--frames dumps PNGs only)
"""
import json, subprocess, sys, os
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
from rembg import new_session, remove

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, FPS = 1080, 1920, 30
T = json.load(open(f"{ROOT}/reference/template.json"))
CAPTION = T["text"]["caption"]["text"]
# (clip file, source start sec, out start, out end) — cut points follow the reference bars
SEGMENTS = [
    ("clips/clip1.mp4", 2.8, 0.00, 1.83),
    ("clips/clip2.mp4", 1.5, 1.83, 4.23),
    ("clips/clip3.mp4", 6.0, 4.23, 6.53),
    ("clips/clip4.mp4", 3.5, 6.53, 8.30),
]
DUR = SEGMENTS[-1][3]
FLASHES = T["flashes_absolute"]
GLOW = np.array([190, 255, 120], np.float32)  # green-yellow halo like the reference

session = new_session("u2net_human_seg")
rng = np.random.default_rng(7)
N = 140
P = np.c_[rng.uniform(0, W, N), rng.uniform(0, H, N), rng.uniform(1.5, 4.5, N),
          rng.uniform(20, 90, N), rng.uniform(0.25, 0.6, N)]  # x, y, radius, fall px/s, alpha


def is_flash(t):
    return any(a - 1e-3 <= t < b - 1e-3 for a, b in FLASHES)


def read_segment(path, start, dur):
    cmd = ["ffmpeg", "-v", "error", "-ss", str(start), "-t", str(dur), "-i", f"{ROOT}/{path}",
           "-vf", f"fps={FPS},scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H}",
           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    raw = subprocess.run(cmd, capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def grade(f):
    x = f.astype(np.float32) / 255
    x = np.clip((x - 0.5) * 1.12 + 0.5, 0, 1) * 0.82          # moodier, slightly darker
    x[..., 2] *= 0.95                                         # warm tilt
    return x * 255


def silhouette(f, x):
    small = Image.fromarray(f).resize((W // 2, H // 2))
    m = np.array(remove(small, session=session, only_mask=True), np.float32) / 255
    m = cv2.resize(m, (W, H))
    m = cv2.GaussianBlur((m > 0.5).astype(np.float32), (0, 0), 2)
    halo = cv2.GaussianBlur(cv2.dilate(m, np.ones((15, 15))), (0, 0), 22)
    halo = np.clip(halo * 1.6 - m, 0, 1)[..., None]
    x = x * (1 - halo * 0.25) + GLOW * halo * 0.9
    return x * (1 - m[..., None]) + 255 * m[..., None]


def particles(x, t):
    out = x.copy()
    for px, py, r, v, a in P:
        y = (py + v * t) % H
        xx = px + 6 * np.sin(t * 1.3 + py)
        cv2.circle(out, (int(xx), int(y)), int(r), (25, 22, 20), -1, cv2.LINE_AA)
    return x + (out - x) * 0.45


FONT = ImageFont.truetype("/usr/share/fonts/opentype/inter/InterDisplay-Medium.otf", 32)


def caption_layer():
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    y = int(T["text"]["caption"]["y_frac"] * H)
    d.text((W / 2 + 1, y + 2), CAPTION, font=FONT, fill=(0, 0, 0, 120), anchor="mm")
    d.text((W / 2, y), CAPTION, font=FONT, fill=(243, 233, 198, 255), anchor="mm")
    a = np.array(img, np.float32)
    return a[..., :3], a[..., 3:] / 255


CAP_RGB, CAP_A = caption_layer()


def render(t, f):
    x = grade(f)
    if is_flash(t):
        x = silhouette(f, x)
    x = particles(x, t)
    x = x * (1 - CAP_A) + CAP_RGB * CAP_A
    return np.clip(x, 0, 255).astype(np.uint8)


def frames():
    for path, src, a, b in SEGMENTS:
        seg = read_segment(path, src, b - a + 0.2)
        n = round(b * FPS) - round(a * FPS)
        for i in range(n):
            t = (round(a * FPS) + i) / FPS
            yield t, seg[min(i, len(seg) - 1)]


def main():
    args = sys.argv[1:]
    if "--frames" in args:
        want = [float(v) for v in args[args.index("--frames") + 1].split(",")]
        os.makedirs(f"{ROOT}/out/preview", exist_ok=True)
        for t, f in frames():
            if any(abs(t - w) < 0.5 / FPS for w in want):
                Image.fromarray(render(t, f)).save(f"{ROOT}/out/preview/t{t:.2f}.jpg", quality=90)
        return
    out = args[0] if args else f"{ROOT}/out/reel.mp4"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
                            "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-i", f"{ROOT}/reference/bgm.m4a",
                            "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "veryfast", "-crf", "18",
                            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-t", str(DUR),
                            "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    for t, f in frames():
        enc.stdin.write(render(t, f).tobytes())
    enc.stdin.close()
    enc.wait()
    print("wrote", out)


if __name__ == "__main__":
    main()
