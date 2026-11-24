"""Builds voiceover (Kokoro TTS, one take per caption chunk so chunk timings are exact),
synth background music + SFX, and public/timeline.json for the Remotion comp."""
import json, os, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

HERE = os.path.dirname(os.path.abspath(__file__))
MODEL = sys.argv[1]  # dir holding kokoro.onnx + voices.bin
SR = 24000
VOICE, SPEED = "am_michael", 1.12

# scene -> list of caption chunks; *word* = accent (italic serif, coral)
SCRIPT = [
    ("hook",      ["*Claude* can now", "edit your *reels*."]),
    ("reference", ["You send it", "one *reference* video,", "and it breaks down", "*everything.*"]),
    ("breakdown", ["Every *cut.*", "Every *transition.*", "Every single *beat.*"]),
    ("clips",     ["Then you drop", "your *raw* clips."]),
    ("finds",     ["It *finds* you", "in every frame,", "cuts you *out,*"]),
    ("glow",      ["and makes you *glow,*", "right on the *beat.*"]),
    ("polish",    ["It grades the *colors,*", "adds the *captions,*", "and syncs the *music.*"]),
    ("nope",      ["No *timeline.*", "No *keyframes.*", "No editing *app.*"]),
    ("count",     ["One *reference.*", "Four *clips.*", "One *prompt.*"]),
    ("final",     ["And your reel", "is ready to *post.*"]),
]

k = Kokoro(f"{MODEL}/kokoro.onnx", f"{MODEL}/voices.bin")


def trim(a, thr=0.01):
    idx = np.where(np.abs(a) > thr)[0]
    return a[max(idx[0] - 240, 0): idx[-1] + 480] if len(idx) else a


vo, t = [], 0.45
vo.append(np.zeros(int(SR * t)))
chunks, scenes = [], []
for scene, lines in SCRIPT:
    s0 = t
    for i, text in enumerate(lines):
        a, _ = k.create(text.replace("*", ""), voice=VOICE, speed=SPEED, lang="en-us")
        a = trim(a)
        d = len(a) / SR
        words = text.split()
        weights = np.array([len(w.strip("*")) + 2 for w in words], float)
        edges = np.concatenate([[0], np.cumsum(weights) / weights.sum()]) * d
        chunks.append({"start": round(t, 3), "end": round(t + d, 3), "scene": scene,
                       "words": [{"w": w.strip("*"), "accent": w.startswith("*"),
                                  "t": round(t + edges[j], 3)} for j, w in enumerate(words)]})
        gap = 0.12 if i < len(lines) - 1 else 0.38
        vo += [a, np.zeros(int(SR * gap))]
        t += d + gap
    scenes.append({"id": scene, "start": round(s0, 3)})
tail = 1.6
vo.append(np.zeros(int(SR * tail)))
total = t + tail
vo = np.concatenate(vo).astype(np.float32)

# ---- music: 100 bpm, Am-F-C-G pad + soft kick/hat, 44.1k stereo
MSR = 44100
n = int(total * MSR)
tt = np.arange(n) / MSR
bpm, beat = 100, 60 / 100
mus = np.zeros(n)
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
for bar in range(int(total / (beat * 4)) + 1):
    t0 = bar * beat * 4
    i0, i1 = int(t0 * MSR), min(int((t0 + beat * 4) * MSR), n)
    if i0 >= n: break
    seg = tt[i0:i1] - t0
    env = np.minimum(seg / 0.4, 1) * np.minimum((beat * 4 - seg) / 0.4, 1)
    for m in chords[bar % 4]:
        f = 440 * 2 ** ((m - 69) / 12)
        mus[i0:i1] += 0.05 * env * (np.sin(2 * np.pi * f * seg) + 0.3 * np.sin(2 * np.pi * f * 2.003 * seg))
    fb = 440 * 2 ** ((chords[bar % 4][0] - 12 - 69) / 12)
    mus[i0:i1] += 0.07 * env * np.sin(2 * np.pi * fb * seg)
rng = np.random.default_rng(1)
for b in range(int(total / beat)):
    i0 = int(b * beat * MSR)
    L = min(int(0.25 * MSR), n - i0)
    if L <= 0: break
    s = np.arange(L) / MSR
    mus[i0:i0 + L] += 0.35 * np.sin(2 * np.pi * (50 + 90 * np.exp(-s * 30)) * s) * np.exp(-s * 12)
    j0 = int((b + 0.5) * beat * MSR)
    Lh = min(int(0.05 * MSR), n - j0)
    if Lh > 0:
        h = rng.standard_normal(Lh); h = np.diff(np.r_[0, h])
        mus[j0:j0 + Lh] += 0.04 * h * np.exp(-np.arange(Lh) / MSR * 80)
mus *= np.minimum(tt / 1.0, 1) * np.minimum((total - tt) / 1.5, 1)

# ---- SFX: whoosh at each scene start, pop at every chunk start
sfx = np.zeros(n)
for sc in scenes:
    i0 = int(max(sc["start"] - 0.25, 0) * MSR); L = min(int(0.5 * MSR), n - i0)
    w = rng.standard_normal(L); s = np.arange(L) / L
    # crude band sweep: moving-average lowpass with shrinking window
    out = np.convolve(w, np.ones(12) / 12, "same") - np.convolve(w, np.ones(60) / 60, "same")
    sfx[i0:i0 + L] += 0.25 * out * np.sin(np.pi * s) ** 2
for c in chunks:
    i0 = int(c["start"] * MSR); L = min(int(0.06 * MSR), n - i0)
    s = np.arange(L) / MSR
    sfx[i0:i0 + L] += 0.08 * np.sin(2 * np.pi * 900 * s * (1 - s * 6)) * np.exp(-s * 70)

vo44 = np.interp(np.arange(n) / MSR, np.arange(len(vo)) / SR, vo, right=0)
# duck music under voice
envv = np.convolve(np.abs(vo44), np.ones(4410) / 4410, "same")
duck = 1 - 0.55 * np.clip(envv / (envv.max() * 0.3), 0, 1)
mix = vo44 * 1.0 + mus * duck * 0.8 + sfx
mix = mix / np.abs(mix).max() * 0.9
os.makedirs(f"{HERE}/public", exist_ok=True)
sf.write(f"{HERE}/public/audio.wav", np.stack([mix, mix], 1).astype(np.float32), MSR)
json.dump({"duration": round(total, 3), "fps": 30, "bpm": bpm, "chunks": chunks, "scenes": scenes},
          open(f"{HERE}/public/timeline.json", "w"), indent=1)
print("duration", round(total, 2), "chunks", len(chunks))
