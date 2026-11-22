// usage: node src/render.js <page.html> <out.mp4> <audio> [--preview t1,t2,t3]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

(async () => {
  const [page_, out, audio, flag, times] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto('file://' + path.resolve(page_));
  await page.waitForFunction(() => window.renderAt);
  await page.evaluate(() => window.ready);
  const { FPS, DUR } = await page.evaluate(() => window.META);

  if (flag === '--preview') {
    for (const t of times.split(',').map(Number)) {
      const d = await page.evaluate(t => window.renderAt(t), t);
      fs.writeFileSync(path.join(out, `frame_${t}s.jpg`), Buffer.from(d.split(',')[1], 'base64'));
    }
    await browser.close(); return;
  }

  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-shortest',
    '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const N = Math.round(FPS * DUR);
  for (let i = 0; i < N; i++) {
    const d = await page.evaluate(t => window.renderAt(t), i / FPS);
    if (!ff.stdin.write(Buffer.from(d.split(',')[1], 'base64')))
      await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
})();
