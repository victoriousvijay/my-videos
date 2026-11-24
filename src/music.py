# Original beat-synced lo-fi track for claude-reel (100 BPM, drop at 2.4s). usage: python3 src/music.py out.wav
import sys, wave, numpy as np
SR, DUR, B, DROP = 44100, 19.6, 0.6, 2.4
N = int(SR * DUR); rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N)
def add(sig, t0, gain=1.0, pan=0.0):
    i = int(t0 * SR); j = min(N, i + len(sig))
    if i >= N or j <= i: return
    L[i:j] += sig[:j - i] * gain * (1 - pan) ; R[i:j] += sig[:j - i] * gain * (1 + pan)
tt = lambda d: np.arange(int(d * SR)) / SR
def smooth(x, k): return np.convolve(x, np.ones(k) / k, 'same')
def kick():
    t = tt(.45); f = 45 + 110 * np.exp(-t * 30); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) + 0.3 * rng.standard_normal(len(t)) * np.exp(-t * 120)
def clap():
    t = tt(.25); n = rng.standard_normal(len(t)); n = n - smooth(n, 6)
    env = sum(np.exp(-np.clip(t - d, 0, None) * 40) * (t >= d) for d in (0, .012, .024))
    return n * env * 0.5
def hat(d=.05):
    t = tt(d); n = rng.standard_normal(len(t)); n = n - smooth(n, 3); return n * np.exp(-t * 70) * .35
def ep(f, d, decay=2.5):
    t = tt(d); return (np.sin(2*np.pi*f*t) + .25*np.sin(4*np.pi*f*t) + .08*np.sin(6*np.pi*f*t)) * np.exp(-t*decay) * np.minimum(1, t*200)
def pad(fs, d):
    t = tt(d); s = sum(np.sin(2*np.pi*f*t*(1+dt)) for f in fs for dt in (-.003, 0, .003))
    return s * np.minimum(1, t / .4) * np.minimum(1, (d - t) / .4) / (len(fs) * 3)
def whoosh(d=.5):
    t = tt(d); n = smooth(rng.standard_normal(len(t)), 8); return n * np.sin(np.pi * t / d) ** 2 * .6
def impact():
    t = tt(1.4); return np.sin(2*np.pi*48*t) * np.exp(-t*2.5) * .9 + smooth(rng.standard_normal(len(t)), 4) * np.exp(-t*9) * .4
def riser(d):
    t = tt(d); n = smooth(rng.standard_normal(len(t)), 5); sw = np.sin(2*np.pi*np.cumsum(200 + 900*(t/d)**2)/SR)
    return (n * .35 + sw * .12) * (t / d) ** 2
def pop(f=1300):
    t = tt(.08); return np.sin(2*np.pi*np.cumsum(f*np.exp(-t*12))/SR) * np.exp(-t*45) * .5
nf = lambda m: 440 * 2 ** ((m - 69) / 12)
CH = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]  # Fmaj7 Em7 Dm7 Cmaj7
# pad throughout, chord every 4 beats from 0
for k in range(9):
    t0 = k * 2.4; ch = CH[k % 4]; add(pad([nf(m) for m in ch], 2.5), t0, .22)
# drums + bass + arp
for b in range(40):
    t0 = DROP + b * B
    if t0 > 18.6: break
    breakdown = 12 <= t0 < 15.6
    ch = CH[int(t0 / 2.4) % 4]
    if not breakdown:
        add(kick(), t0, .9)
        if b % 2: add(clap(), t0, .55, .1)
        add(ep(nf(ch[0] - 24), .55, 4) * 1.0, t0, .5)
    for h in range(2):
        add(hat(), t0 + h * B / 2, .25 if breakdown else .45, -.3 if h else .3)
    for a in range(2):
        m = ch[(b * 2 + a) % 4] + (24 if breakdown else 12)
        add(ep(nf(m), .5, 6), t0 + a * B / 2, .14, .4 if a else -.4)
# transitions / sfx
for T in (2.4, 15.6): add(impact(), T, .9)
for T in (4.55, 8.1, 11.7): add(whoosh(), T, .7)
add(riser(2.1), .3, .9); add(riser(1.2), 14.4, .9)
for T in (3.0, 5.4, 6.0, 6.6, 9.0, 9.6, 12.6, 13.8): add(pop(), T, .35)
for i in range(11): add(hat(.02), 5.6 + i * .09, .35, (-1) ** i * .3)   # typing clicks
for i in range(9): add(hat(.02), 16.2 + i * .09, .35)
fade = np.minimum(1, (DUR - np.arange(N) / SR) / 1.0)
st = np.stack([L * fade, R * fade], 1); st /= np.abs(st).max() * 1.12
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
