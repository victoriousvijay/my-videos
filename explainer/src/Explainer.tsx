import React from 'react';
import {
  AbsoluteFill, Audio, Img, Loop, OffthreadVideo, interpolate, interpolateColors, spring,
  staticFile, useCurrentFrame, useVideoConfig, Easing,
} from 'remotion';
import timeline from '../public/timeline.json';
import '@fontsource/inter/500.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/900.css';
import '@fontsource/instrument-serif/400-italic.css';

const FPS = 30;
const CORAL = '#F0866A';
const SANS = 'Inter, sans-serif';
const SERIF = '"Instrument Serif", serif';
type Chunk = (typeof timeline.chunks)[number];
const SCENES = timeline.scenes;
const sceneEnd = (i: number) => (i + 1 < SCENES.length ? SCENES[i + 1].start : timeline.duration);
const chunksOf = (id: string) => timeline.chunks.filter((c) => c.scene === id);

// background palette per scene: [glow, base]
const PAL: Record<string, [string, string]> = {
  hook: ['#6b2a22', '#160909'], reference: ['#5a2531', '#120810'], breakdown: ['#4a2a78', '#0e0818'],
  clips: ['#1f6b45', '#06140d'], finds: ['#5a2a7a', '#0d0718'], glow: ['#7a5a1c', '#161005'],
  polish: ['#6b2a22', '#160909'], nope: ['#3a2a30', '#0b0809'], count: ['#7a5a1c', '#161005'],
  final: ['#7a2a3a', '#16080b'],
};

const ease = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});

const Background: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  let i = SCENES.findIndex((s, k) => t >= s.start && t < sceneEnd(k));
  if (i < 0) i = t < SCENES[0].start ? 0 : SCENES.length - 1;
  const cur = PAL[SCENES[i].id];
  const prev = PAL[SCENES[Math.max(i - 1, 0)].id];
  const k = ease(t, SCENES[i].start - 0.2, SCENES[i].start + 0.4);
  const glow = interpolateColors(k, [0, 1], [prev[0], cur[0]]);
  const base = interpolateColors(k, [0, 1], [prev[1], cur[1]]);
  return (
    <AbsoluteFill style={{background: base}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 90% 45% at 50% 42%, ${glow} 0%, transparent 70%)`}} />
      {/* floor */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 1300, bottom: 0,
        background: `linear-gradient(180deg, ${glow}55 0%, ${base} 30%, #000 100%)`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 1298, height: 3, background: `${glow}`, opacity: 0.5, filter: 'blur(2px)'}} />
      <Particles />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
    </AbsoluteFill>
  );
};

const rand = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const Particles: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {Array.from({length: 70}).map((_, i) => {
        const size = 3 + rand(i) * 9;
        const x = rand(i + 50) * 1080 + Math.sin(f / 50 + i) * 20;
        const y = ((rand(i + 99) * 2100 - f * (0.4 + rand(i + 7) * 1.2)) % 2100 + 2100) % 2100 - 90;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(f / 25 + i * 3));
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: size, height: size, borderRadius: '50%',
          background: i % 4 === 0 ? '#ffb4c8' : '#fff', opacity: tw * (size > 9 ? 0.35 : 0.7), filter: `blur(${size > 8 ? 3 : 0.5}px)`}} />;
      })}
    </>
  );
};

// ---------- captions: word-by-word, next word ghosted, accents in italic serif coral
const Captions: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const ci = timeline.chunks.findIndex((c, i) => t >= c.start - 0.05 && (i + 1 >= timeline.chunks.length || t < timeline.chunks[i + 1].start - 0.05));
  if (ci < 0) return null;
  const c: Chunk = timeline.chunks[ci];
  if (t > c.end + 1.2 && ci === timeline.chunks.length - 1) return null;
  const spoken = c.words.filter((w) => t >= w.t).length;
  return (
    <div style={{position: 'absolute', top: 240, left: 60, right: 60, textAlign: 'center', lineHeight: 1.15}}>
      {c.words.map((w, i) => {
        if (i > spoken) return null;
        const ghost = i === spoken;
        const p = ghost ? 0 : ease(t, w.t, w.t + 0.18);
        return (
          <span key={i} style={{display: 'inline-block', margin: '0 12px',
            fontFamily: w.accent ? SERIF : SANS, fontStyle: w.accent ? 'italic' : 'normal',
            fontWeight: w.accent ? 400 : 700, fontSize: w.accent ? 78 : 60,
            color: ghost ? 'rgba(255,255,255,0.22)' : w.accent ? CORAL : '#fff',
            transform: `translateY(${(1 - p) * 18}px)`, opacity: ghost ? 1 : 0.2 + 0.8 * p,
            textShadow: '0 4px 24px rgba(0,0,0,0.5)'}}>{w.w}</span>
        );
      })}
    </div>
  );
};

// ---------- mascot: original coral blob with a spark antenna
const Mascot: React.FC = () => {
  const f = useCurrentFrame();
  const t = f / FPS;
  const scene = [...SCENES].reverse().find((s) => t >= s.start)?.id ?? 'hook';
  const bob = Math.sin(f / 8) * 10;
  const squash = 1 + Math.sin(f / 4) * 0.03;
  const blink = f % 90 < 4 ? 0.1 : 1;
  const hearts = scene === 'final';
  const wow = scene === 'breakdown' || scene === 'count';
  const sad = scene === 'nope';
  const x = scene === 'final' ? 540 - 110 : 150;
  const enter = spring({frame: f - 5, fps: FPS, config: {damping: 12}});
  return (
    <div style={{position: 'absolute', left: x, top: 1400 + bob + (1 - enter) * 500, width: 220, height: 220,
      transform: `scale(${squash}, ${2 - squash})`, transition: 'left 0.3s'}}>
      <svg viewBox="0 0 220 220" width={220} height={220}>
        <ellipse cx={110} cy={212} rx={70} ry={10} fill="rgba(0,0,0,0.45)" />
        <line x1={110} y1={40} x2={110} y2={14} stroke="#E8735A" strokeWidth={6} strokeLinecap="round" />
        <path d="M110 0 L115 10 L126 12 L117 19 L120 30 L110 24 L100 30 L103 19 L94 12 L105 10 Z" fill="#FFD27A"
          transform={`rotate(${f * 3} 110 15)`} />
        <defs>
          <radialGradient id="body" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#FFB49C" /><stop offset="60%" stopColor="#EE7E63" /><stop offset="100%" stopColor="#B8503D" />
          </radialGradient>
        </defs>
        <path d="M110 40 C170 40 196 82 196 130 C196 180 160 204 110 204 C60 204 24 180 24 130 C24 82 50 40 110 40 Z" fill="url(#body)" />
        <ellipse cx={30} cy={140} rx={14} ry={22} fill="#E8735A" transform={`rotate(${-20 + Math.sin(f / 6) * 15} 30 140)`} />
        <ellipse cx={190} cy={140} rx={14} ry={22} fill="#E8735A" transform={`rotate(${20 - Math.sin(f / 6) * 15} 190 140)`} />
        {hearts ? (
          <>
            {[80, 140].map((cx) => (
              <path key={cx} d={`M${cx} ${128} l-15 -15 a9 9 0 0 1 15 -10 a9 9 0 0 1 15 10 Z`} fill="#FF3D6E"
                transform={`scale(${1 + Math.sin(f / 4) * 0.08})`} style={{transformOrigin: `${cx}px 118px`}} />
            ))}
          </>
        ) : (
          <>
            <ellipse cx={82} cy={115} rx={15} ry={20 * blink} fill="#fff" />
            <ellipse cx={138} cy={115} rx={15} ry={20 * blink} fill="#fff" />
            <circle cx={86} cy={119} r={8 * blink} fill="#1b0f12" />
            <circle cx={142} cy={119} r={8 * blink} fill="#1b0f12" />
          </>
        )}
        <ellipse cx={62} cy={148} rx={12} ry={7} fill="#FF8FA0" opacity={0.6} />
        <ellipse cx={158} cy={148} rx={12} ry={7} fill="#FF8FA0" opacity={0.6} />
        {wow ? <ellipse cx={110} cy={160} rx={10} ry={13} fill="#3a1414" />
          : sad ? <path d="M95 168 Q110 156 125 168" stroke="#3a1414" strokeWidth={5} fill="none" strokeLinecap="round" />
          : <path d="M94 156 Q110 174 126 156" stroke="#3a1414" strokeWidth={5} fill="none" strokeLinecap="round" />}
      </svg>
    </div>
  );
};

// ---------- building blocks
const Float: React.FC<{x: number; y: number; ry?: number; rx?: number; delay?: number; f: number; children: React.ReactNode; z?: number; out?: number}> =
  ({x, y, ry = -10, rx = 6, delay = 0, f, children, z = 1, out}) => {
    const s = spring({frame: f - delay, fps: FPS, config: {damping: 14, mass: 0.8}});
    const o = out !== undefined ? ease(f, out, out + 8, 1, 0) : 1;
    const fl = Math.sin((f + delay * 7) / 22) * 10;
    return (
      <div style={{position: 'absolute', left: x, top: y + fl + (1 - s) * 260, zIndex: z, opacity: Math.min(s * 1.4, 1) * o,
        transform: `perspective(1600px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${0.6 + 0.4 * s})`, transformOrigin: 'center'}}>
        {children}
      </div>
    );
  };

const Phone: React.FC<{w?: number; children: React.ReactNode; border?: string}> = ({w = 420, children, border = '#2a2a2e'}) => (
  <div style={{width: w, height: w * 16 / 9, borderRadius: w * 0.09, overflow: 'hidden', border: `8px solid ${border}`,
    boxShadow: '0 40px 90px rgba(0,0,0,0.7), 0 0 0 2px rgba(255,255,255,0.06)', background: '#000', position: 'relative'}}>
    {children}
  </div>
);

const Window: React.FC<{w: number; h: number; title: string; children?: React.ReactNode}> = ({w, h, title, children}) => (
  <div style={{width: w, height: h, borderRadius: 22, background: 'linear-gradient(180deg,#1c1a1f,#111014)', overflow: 'hidden',
    boxShadow: '0 40px 90px rgba(0,0,0,0.7), inset 0 0 0 2px rgba(255,255,255,0.07)', position: 'relative'}}>
    <div style={{height: 46, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', background: '#0c0b0e'}}>
      {['#ff5f57', '#febc2e', '#28c840'].map((c) => <div key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />)}
      <div style={{marginLeft: 14, color: '#9a96a0', fontFamily: SANS, fontSize: 22, fontWeight: 500}}>{title}</div>
    </div>
    {children}
  </div>
);

const Chip: React.FC<{text: string; bg: string; color?: string; f: number; at: number; x: number; y: number; rot?: number}> =
  ({text, bg, color = '#111', f, at, x, y, rot = -6}) => {
    const s = spring({frame: f - at, fps: FPS, config: {damping: 9, stiffness: 160}});
    if (f < at) return null;
    return (
      <div style={{position: 'absolute', left: x, top: y, transform: `rotate(${rot}deg) scale(${s})`, zIndex: 20,
        background: bg, color, fontFamily: SANS, fontWeight: 900, fontSize: 38, padding: '12px 26px', borderRadius: 12,
        boxShadow: '0 14px 30px rgba(0,0,0,0.5)', letterSpacing: 1, whiteSpace: 'nowrap'}}>{text}</div>
    );
  };

const BigWord: React.FC<{text: string; f: number; at: number; y?: number; size?: number; out?: number}> = ({text, f, at, y = 820, size = 150, out}) => {
  if (f < at || (out !== undefined && f >= out)) return null;
  const s = spring({frame: f - at, fps: FPS, config: {damping: 10, stiffness: 140}});
  return (
    <div style={{position: 'absolute', top: y, left: 0, right: 0, textAlign: 'center', zIndex: 30, transform: `scale(${0.5 + 0.5 * s})`, opacity: s}}>
      <span style={{fontFamily: SANS, fontWeight: 900, fontSize: size, letterSpacing: -2,
        background: 'linear-gradient(180deg,#FFE7A3 0%,#F5B842 55%,#C97A16 100%)', WebkitBackgroundClip: 'text', color: 'transparent',
        filter: 'drop-shadow(0 10px 30px rgba(245,184,66,0.45))'}}>{text}</span>
    </div>
  );
};

const ReelVideo: React.FC = () => (
  <Loop durationInFrames={249}><OffthreadVideo src={staticFile('reel.mp4')} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} /></Loop>
);
const Clip: React.FC<{n: number; from?: number}> = ({n, from = 30}) => (
  <OffthreadVideo src={staticFile(`clip${n}.mp4`)} startFrom={from} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} />
);

// ---------- scenes (f = frame within scene, at[] = chunk starts within scene, in frames)
type SP = {f: number; at: number[]; dur: number};

const Hook: React.FC<SP> = ({f, at}) => (
  <>
    <Float f={f} x={330} y={520} ry={-14} delay={0}><Phone><ReelVideo /></Phone></Float>
    <Chip text="AI EDITED" bg="#C6FF3D" f={f} at={at[1]} x={600} y={1180} rot={-5} />
  </>
);

const Reference: React.FC<SP> = ({f, at}) => {
  const segs = ['#ff5d8f', '#5dd6ff', '#c6ff3d', '#ffb13d', '#a07bff', '#ff5d8f', '#5dd6ff', '#c6ff3d'];
  const split = at[2] !== undefined ? ease(f, at[3] ?? at[2], (at[3] ?? at[2]) + 12) : 0;
  return (
    <Float f={f} x={110} y={560} ry={8} rx={6}>
      <Window w={860} h={620} title="reference.mp4">
        <div style={{position: 'absolute', left: 30, top: 76, width: 800, height: 380, borderRadius: 14,
          background: 'radial-gradient(ellipse at 50% 60%, #6b2a22, #1a0b0b)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: 0, height: 0, borderLeft: '70px solid rgba(255,255,255,0.9)', borderTop: '42px solid transparent', borderBottom: '42px solid transparent', marginLeft: 20,
            transform: `scale(${1 + Math.sin(f / 6) * 0.05})`}} />
        </div>
        <div style={{position: 'absolute', left: 30, top: 490, width: 800, height: 90, display: 'flex', gap: 6 + split * 22}}>
          {segs.map((c, i) => {
            const s = ease(f, at[1] + i * 3, at[1] + i * 3 + 10);
            return <div key={i} style={{flex: 1 + (i % 3), background: c, borderRadius: 8, opacity: s, transform: `scaleY(${s}) translateY(${split * (i % 2 ? -14 : 14)}px)`}} />;
          })}
        </div>
      </Window>
    </Float>
  );
};

const Breakdown: React.FC<SP> = ({f, at}) => {
  const beatF = (60 / timeline.bpm) * FPS;
  const pulse = Math.exp(-((f % beatF) / beatF) * 5);
  return (
    <>
      <div style={{position: 'absolute', left: 140, top: 640, width: 800, height: 300, display: 'flex', alignItems: 'center', gap: 10}}>
        {Array.from({length: 32}).map((_, i) => {
          const h = 40 + Math.abs(Math.sin(i * 1.7 + f / 5)) * 180 * (0.5 + pulse * 0.6);
          return <div key={i} style={{flex: 1, height: h, borderRadius: 6, background: i % 2 ? CORAL : '#ff9f7f', opacity: ease(f, i, i + 8)}} />;
        })}
      </div>
      <Chip text="✂ CUTS" bg="#5dd6ff" f={f} at={at[0]} x={130} y={1020} rot={-7} />
      <Chip text="⇄ TRANSITIONS" bg="#ff4fa3" color="#fff" f={f} at={at[1]} x={470} y={1090} rot={5} />
      <Chip text="♪ BEATS" bg="#C6FF3D" f={f} at={at[2]} x={300} y={1190} rot={-3} />
      <BigWord text="EVERY BEAT" f={f} at={at[2] + 8} y={470} size={130} />
    </>
  );
};

const Clips: React.FC<SP> = ({f}) => (
  <>
    {[1, 2, 3, 4].map((n, i) => (
      <Float key={n} f={f} delay={i * 5} x={60 + i * 235} y={600 + (i % 2) * 70} ry={-18 + i * 12} rx={4} z={i}>
        <Phone w={230}><Clip n={n} from={45} /></Phone>
      </Float>
    ))}
  </>
);

const Finds: React.FC<SP> = ({f, at}) => {
  const cut = f >= (at[2] ?? 999);
  const scan = (f * 14) % 760;
  const lock = ease(f, at[1] ?? 20, (at[1] ?? 20) + 10);
  const box = {l: interpolate(lock, [0, 1], [40, 120]), t: interpolate(lock, [0, 1], [60, 170]), r: interpolate(lock, [0, 1], [40, 120]), b: interpolate(lock, [0, 1], [40, 60])};
  return (
    <Float f={f} x={310} y={500} ry={-8}>
      <Phone w={460}>
        <Img src={staticFile(cut ? 'glow.jpg' : 'noglow.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
        {!cut && <div style={{position: 'absolute', left: 0, right: 0, top: scan, height: 4, background: '#5dd6ff', boxShadow: '0 0 30px #5dd6ff'}} />}
        <div style={{position: 'absolute', left: box.l, top: box.t, right: box.r, bottom: box.b, border: '4px solid #ff3d6e', borderRadius: 10, opacity: f > 4 ? 1 : 0}}>
          <div style={{position: 'absolute', top: -46, left: -4, background: '#ff3d6e', color: '#fff', fontFamily: SANS, fontWeight: 900, fontSize: 24, padding: '6px 12px', borderRadius: 6}}>
            {cut ? 'CUTOUT ✓' : `PERSON ${Math.min(99, 60 + Math.floor(f * 1.5))}%`}
          </div>
        </div>
      </Phone>
    </Float>
  );
};

const Glow: React.FC<SP> = ({f, at}) => {
  const beatF = (60 / timeline.bpm) * FPS;
  const ph = (f % beatF) / beatF;
  return (
    <>
      <div style={{position: 'absolute', left: 540 - 320, top: 520, width: 640, height: 900, borderRadius: '50%',
        border: '6px solid rgba(255,231,163,0.6)', transform: `scale(${0.8 + ph * 0.5})`, opacity: 1 - ph, filter: 'blur(1px)'}} />
      <Float f={f} x={310} y={500} ry={6}><Phone w={460} border="#6b5a2a"><ReelVideo /></Phone></Float>
      <BigWord text="ON BEAT" f={f} at={at[1] ?? 40} y={1230} size={140} />
    </>
  );
};

const Polish: React.FC<SP> = ({f, at}) => (
  <>
    <Float f={f} x={330} y={520} ry={-10}><Phone><ReelVideo /></Phone></Float>
    <Chip text="COLOR GRADE" bg="#ffb13d" f={f} at={at[0]} x={110} y={700} rot={-8} />
    <Chip text="CAPTIONS" bg="#a07bff" color="#fff" f={f} at={at[1]} x={640} y={880} rot={6} />
    <Chip text="♪ MUSIC SYNC" bg="#C6FF3D" f={f} at={at[2]} x={150} y={1100} rot={-4} />
  </>
);

const Strike: React.FC<{f: number; at: number}> = ({f, at}) => {
  const p = ease(f, at + 6, at + 14);
  return <div style={{position: 'absolute', left: -20, top: '50%', height: 10, width: `${p * 110}%`, background: '#ff3d4f', borderRadius: 5,
    transform: 'rotate(-12deg)', transformOrigin: 'left', boxShadow: '0 0 20px #ff3d4f', zIndex: 5}} />;
};
const Nope: React.FC<SP> = ({f, at}) => (
  <>
    <Float f={f} x={90} y={500} ry={10} delay={0}>
      <Window w={620} h={300} title="Timeline">
        {[0, 1, 2].map((r) => <div key={r} style={{position: 'absolute', left: 20, right: 20, top: 70 + r * 72, height: 52, display: 'flex', gap: 6}}>
          {Array.from({length: 6}).map((_, i) => <div key={i} style={{flex: 1 + ((i + r) % 3), background: ['#5dd6ff', '#ff4fa3', '#C6FF3D'][r], opacity: 0.75, borderRadius: 6}} />)}
        </div>)}
        <Strike f={f} at={at[0]} />
      </Window>
    </Float>
    <Float f={f} x={380} y={860} ry={-12} delay={at[1] - 6}>
      <Window w={600} h={240} title="Keyframes">
        {Array.from({length: 8}).map((_, i) => <div key={i} style={{position: 'absolute', left: 50 + i * 68, top: 120 + (i % 2) * 30, width: 30, height: 30, background: '#ffb13d', transform: 'rotate(45deg)'}} />)}
        <Strike f={f} at={at[1]} />
      </Window>
    </Float>
    <Float f={f} x={160} y={1150} ry={8} delay={at[2] - 6}>
      <Window w={560} h={200} title="EditorPro 2026">
        <div style={{position: 'absolute', left: 30, top: 80, color: '#77737c', fontFamily: SANS, fontSize: 30, fontWeight: 700}}>214 tools · 3 hrs · 1 headache</div>
        <Strike f={f} at={at[2]} />
      </Window>
    </Float>
  </>
);

const Count: React.FC<SP> = ({f, at}) => (
  <>
    <BigWord text="1 REFERENCE" f={f} at={at[0]} out={at[1]} y={700} size={120} />
    <BigWord text="4 CLIPS" f={f} at={at[1]} out={at[2]} y={700} size={150} />
    <BigWord text="1 PROMPT" f={f} at={at[2]} y={700} size={150} />
    {f >= at[2] && (
      <Float f={f - at[2]} x={140} y={940} ry={0} rx={8}>
        <Window w={800} h={170} title="Claude">
          <div style={{position: 'absolute', left: 30, top: 74, color: '#e8e4ea', fontFamily: 'monospace', fontSize: 28}}>
            {'> edit my clips like this reel'.slice(0, Math.floor((f - at[2]) * 1.4))}<span style={{opacity: f % 20 < 10 ? 1 : 0}}>▌</span>
          </div>
        </Window>
      </Float>
    )}
  </>
);

const Final: React.FC<SP> = ({f}) => {
  const views = Math.floor(interpolate(f, [10, 70], [0, 2130663], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.quad)}));
  return (
    <>
      {Array.from({length: 40}).map((_, i) => {
        const y = ((f * (6 + rand(i) * 8) + rand(i + 3) * 400) % 1500) + 380;
        return <div key={i} style={{position: 'absolute', left: rand(i + 9) * 1080, top: y - 400, width: 10, height: 26, borderRadius: 3,
          background: ['#C6FF3D', '#ff4fa3', '#ffb13d', '#5dd6ff'][i % 4], transform: `rotate(${f * 8 + i * 40}deg)`, opacity: 0.9}} />;
      })}
      <Float f={f} x={330} y={500} ry={-6}><Phone><ReelVideo /></Phone></Float>
      <div style={{position: 'absolute', left: 300, top: 470, zIndex: 25, opacity: ease(f, 8, 16),
        display: 'flex', alignItems: 'center', gap: 14, background: '#0d0c0f', border: '3px solid #ff2d2d', borderRadius: 12, padding: '10px 22px'}}>
        <div style={{width: 46, height: 32, borderRadius: 8, background: '#ff2d2d', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: 0, height: 0, borderLeft: '14px solid #fff', borderTop: '9px solid transparent', borderBottom: '9px solid transparent', marginLeft: 3}} />
        </div>
        <span style={{color: '#fff', fontFamily: SANS, fontWeight: 900, fontSize: 40}}>{views.toLocaleString('en-US')}</span>
      </div>
      <Chip text="READY TO POST ✓" bg="#C6FF3D" f={f} at={30} x={560} y={1260} rot={-5} />
    </>
  );
};

const MAP: Record<string, React.FC<SP>> = {hook: Hook, reference: Reference, breakdown: Breakdown, clips: Clips, finds: Finds, glow: Glow, polish: Polish, nope: Nope, count: Count, final: Final};

export const Explainer: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <Background />
      {SCENES.map((s, i) => {
        const start = i === 0 ? 0 : s.start - 0.1;
        const end = sceneEnd(i) - 0.1;
        if (t < start || (i < SCENES.length - 1 && t >= end)) return null;
        const f = frame - Math.round(start * FPS);
        const at = chunksOf(s.id).map((c) => Math.round((c.start - start) * FPS));
        const dur = Math.round((end - start) * FPS);
        const out = ease(frame, Math.round(end * FPS) - 6, Math.round(end * FPS), 1, 0);
        const Comp = MAP[s.id];
        return <AbsoluteFill key={s.id} style={{opacity: i < SCENES.length - 1 ? out : 1}}><Comp f={f} at={at} dur={dur} /></AbsoluteFill>;
      })}
      <Mascot />
      <Captions />
      <Audio src={staticFile('audio.wav')} />
    </AbsoluteFill>
  );
};
