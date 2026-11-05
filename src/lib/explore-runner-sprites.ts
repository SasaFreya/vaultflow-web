import { Texture, Rectangle } from 'pixi.js';

const FRAME_W = 16;
const FRAME_H = 20;
const FRAMES = 4;

/** 程序化 4 帧行走精灵表 */
export function createRunnerTextures(hue: number): Texture[] {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_W * FRAMES;
  canvas.height = FRAME_H;
  const ctx = canvas.getContext('2d')!;

  for (let f = 0; f < FRAMES; f++) {
    const ox = f * FRAME_W;
    const bob = f % 2 === 0 ? 0 : 1;
    ctx.fillStyle = `#${hue.toString(16).padStart(6, '0')}`;
    ctx.beginPath();
    ctx.roundRect(ox + 4, 6 + bob, 8, 10, 3);
    ctx.fill();
    ctx.fillStyle = '#ffccbc';
    ctx.beginPath();
    ctx.arc(ox + 8, 4 + bob, 4, 0, Math.PI * 2);
    ctx.fill();
    const leg = f % 2 === 0 ? 0 : 2;
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(ox + 5, 14 + bob, 2, 4 + leg);
    ctx.fillRect(ox + 9, 14 + bob, 2, 4 - leg);
  }

  const base = Texture.from(canvas);
  return Array.from(
    { length: FRAMES },
    (_, i) =>
      new Texture({
        source: base.source,
        frame: new Rectangle(i * FRAME_W, 0, FRAME_W, FRAME_H),
      }),
  );
}

export const RUNNER_FRAME_MS = 120;
