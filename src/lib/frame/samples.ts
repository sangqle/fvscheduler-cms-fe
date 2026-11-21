/**
 * Ảnh mẫu để thử công cụ khi chưa có ảnh chụp màn hình: hai màn phone 1179×2556 (sáng, tối) và một
 * màn desktop 2880×1800. Viền hồng quanh mép ảnh giúp thấy ngay ảnh có bị cắt hay không.
 */
import { releaseCanvas, roundRectPath } from '@/lib/frame/engine';
import { canvasToBlob } from '@/lib/frame/output';

function sampleCanvas(kind: 'phone' | 'desktop', variant: number): HTMLCanvasElement {
  const phone = kind === 'phone';
  const W = phone ? 1179 : 2880;
  const H = phone ? 2556 : 1800;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  if (!x) return c;
  const dark = variant % 2 === 1;
  const bg = dark ? '#101014' : '#f6f6f9';
  const card = dark ? '#1d1d24' : '#ffffff';
  const fg = dark ? '#f1f1f5' : '#17171c';
  const mu = dark ? '#9b9ba8' : '#6b6b76';
  const accents = ['#a020c0', '#2563eb', '#0f766e', '#ea580c', '#db2777', '#4f46e5'];
  const font = (wt: number, px: number) => `${wt} ${px}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif`;
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);
  if (phone) {
    x.fillStyle = fg;
    x.font = font(600, 50);
    x.fillText('9:41', 110, 118);
    x.fillRect(W - 190, 82, 92, 42);
    x.fillStyle = bg;
    x.fillRect(W - 184, 88, 80, 30);
    x.fillStyle = fg;
    x.fillRect(W - 182, 90, 60, 26);
    x.font = font(800, 92);
    x.fillText(variant ? 'Lịch hẹn tuần này' : 'Album khách', 64, 330);
    x.fillStyle = mu;
    x.font = font(500, 44);
    x.fillText(variant ? '6 buổi chụp · 2 chờ xác nhận' : 'Chọn ảnh đẹp nhất cho khách', 64, 400);
    for (let i = 0; i < 6; i++) {
      const y = 470 + i * 300;
      x.fillStyle = card;
      roundRectPath(x, 48, y, W - 96, 262, 40);
      x.fill();
      x.fillStyle = accents[(i + variant) % accents.length];
      roundRectPath(x, 84, y + 36, 190, 190, 32);
      x.fill();
      x.fillStyle = fg;
      x.font = font(700, 54);
      x.fillText(`Buổi chụp #${i + 1} · Studio Q${i + 1}`, 310, y + 108);
      x.fillStyle = mu;
      x.font = font(400, 42);
      x.fillText(`Thứ ${i + 2} · ${String(i + 8).padStart(2, '0')}:00 · 120 ảnh · đã giao`, 310, y + 176);
    }
    x.fillStyle = card;
    x.fillRect(0, H - 250, W, 250);
    ['Lịch', 'Album', 'Khách', 'Tôi'].forEach((t, i) => {
      const cx = 150 + i * 293;
      x.fillStyle = i === (variant ? 0 : 1) ? accents[0] : mu;
      roundRectPath(x, cx - 36, H - 210, 72, 72, 18);
      x.fill();
      x.font = font(600, 36);
      x.textAlign = 'center';
      x.fillText(t, cx, H - 96);
      x.textAlign = 'left';
    });
    x.fillStyle = fg;
    roundRectPath(x, W / 2 - 200, H - 36, 400, 14, 7);
    x.fill();
  } else {
    x.fillStyle = card;
    x.fillRect(0, 0, 520, H);
    x.fillStyle = accents[0];
    x.font = font(800, 64);
    x.fillText('Framevis', 64, 130);
    ['Tổng quan', 'Lịch hẹn', 'Album khách', 'Khách hàng', 'Báo cáo', 'Cài đặt'].forEach((t, i) => {
      x.fillStyle = i === 2 ? (dark ? '#2a2a33' : '#f3e8f8') : card;
      roundRectPath(x, 32, 220 + i * 110, 456, 86, 20);
      x.fill();
      x.fillStyle = i === 2 ? accents[0] : fg;
      x.font = font(600, 40);
      x.fillText(t, 72, 276 + i * 110);
    });
    x.fillStyle = fg;
    x.font = font(800, 76);
    x.fillText('Album khách', 600, 150);
    x.fillStyle = mu;
    x.font = font(400, 40);
    x.fillText('Tháng 11/2026 · 48 album · 3.214 ảnh đã chọn', 600, 220);
    for (let i = 0; i < 8; i++) {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const X = 600 + col * 560;
      const Y = 300 + row * 700;
      x.fillStyle = card;
      roundRectPath(x, X, Y, 520, 640, 36);
      x.fill();
      x.fillStyle = accents[(i + variant) % accents.length];
      roundRectPath(x, X + 24, Y + 24, 472, 400, 24);
      x.fill();
      x.fillStyle = fg;
      x.font = font(700, 44);
      x.fillText(`Album #${i + 101}`, X + 32, Y + 500);
      x.fillStyle = mu;
      x.font = font(400, 34);
      x.fillText(`${40 + i * 7} ảnh · đã chọn ${10 + i}`, X + 32, Y + 560);
    }
  }
  x.strokeStyle = '#ff2d87';
  x.lineWidth = 6;
  x.strokeRect(3, 3, W - 6, H - 6);
  x.fillStyle = '#ff2d87';
  x.font = font(700, phone ? 30 : 36);
  x.fillText('mép ảnh', 18, H - 18);
  return c;
}

export async function makeSampleFiles(): Promise<File[]> {
  const specs: ['phone' | 'desktop', number][] = [
    ['phone', 0],
    ['phone', 1],
    ['desktop', 0],
  ];
  const files: File[] = [];
  for (const [kind, v] of specs) {
    const c = sampleCanvas(kind, v);
    const b = await canvasToBlob(c, 'image/png');
    releaseCanvas(c);
    files.push(new File([b], `mau-${kind}-${v + 1}.png`, { type: 'image/png' }));
  }
  return files;
}
