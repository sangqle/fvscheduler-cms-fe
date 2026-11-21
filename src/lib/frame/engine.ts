/**
 * Bộ vẽ khung ảnh: bố cục, cỡ xuất và vẽ canvas. Hàm thuần, không phụ thuộc React, dùng chung cho
 * xem trước và xuất ảnh để xem trước khớp ảnh xuất.
 *
 * Luật độ nét (yêu cầu cứng): ảnh xuất vẽ từ file gốc giải mã đủ độ phân giải, canvas đúng số điểm
 * ảnh xuất, thu nhỏ từng nấc một nửa, không phóng to ngầm, hệ số 1 thì tọa độ nguyên và không nội suy.
 */
import type {
  DrawSource,
  FrameBatchSettings,
  FrameLayout,
  FrameLook,
  FrameRect,
  FrameSize,
  ImageFrame,
  FrameSlot,
  SourceImage,
} from '@/types/imageFrame';

export const MAX_IMAGES = 40;
export const CAROUSEL_MAX = 20;
export const PREVIEW_LONG_EDGE = 1400;
export const THUMB_LONG_EDGE = 320;
/** Trần diện tích canvas an toàn trên mọi máy (iOS 17 trở xuống: 4096×4096). */
export const CANVAS_AREA_CAP = 16_777_216;
export const ERR_DECODE = 'Không đọc được ảnh này. Hãy chụp màn hình dạng PNG hoặc mở bằng Safari.';

export const RATIO_PRESETS: Record<'4:5' | '3:4' | '2:3' | '1:1', [number, number]> = {
  '4:5': [4, 5],
  '3:4': [3, 4],
  '2:3': [2, 3],
  '1:1': [1, 1],
};

export const DEFAULT_LOOK: FrameLook = {
  ratio: '4:5',
  customW: 16,
  customH: 10,
  orientation: 'portrait',
  bgKind: 'solid',
  bgColor: '#000000',
  gradFrom: '#3a2a4a',
  gradTo: '#000000',
  gradAngle: 180,
  padding: 4,
  gap: 3,
  radiusAuto: true,
  radius: 4,
  shadow: false,
  overflow: false,
};

export const DEFAULT_BATCH: FrameBatchSettings = {
  perFrame: 1,
  allowUpscale: false,
  size: 'standard',
  format: 'png',
};

export type ImageLookup = (id: string) => SourceImage | undefined;

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

export function effectiveLook(base: FrameLook, frame: ImageFrame | null | undefined): FrameLook {
  return frame?.override ? { ...base, ...frame.override } : base;
}

export function frameReady(frame: ImageFrame, getImage: ImageLookup): boolean {
  return frame.slots.every((s) => getImage(s.imageId)?.status === 'ready');
}

export function frameErrorImage(frame: ImageFrame, getImage: ImageLookup): SourceImage | null {
  for (const s of frame.slots) {
    const im = getImage(s.imageId);
    if (im?.status === 'error') return im;
  }
  return null;
}

// ---------- Tỉ lệ và cỡ xuất ----------

export function ratioWH(look: FrameLook): { w: number; h: number } {
  if (look.ratio === 'custom') {
    const w = look.customW > 0 ? look.customW : 1;
    const h = look.customH > 0 ? look.customH : 1;
    return { w, h };
  }
  const [p, q] = RATIO_PRESETS[look.ratio] ?? RATIO_PRESETS['4:5'];
  const a = Math.min(p, q);
  const b = Math.max(p, q);
  return look.orientation === 'landscape' ? { w: b, h: a } : { w: a, h: b };
}

/** Làm tròn để ảnh không bao giờ cao hơn tỉ lệ đích (ảnh dọc) hay dẹt hơn tỉ lệ đích (ảnh ngang). */
export function roundToRatio(W: number, H: number, r: number): { W: number; H: number } {
  const EPS = 1e-6;
  if (Math.abs(r - 1) < 1e-9) {
    const s = Math.max(1, Math.round(Math.max(W, H)));
    return { W: s, H: s };
  }
  if (r < 1) {
    const h = Math.max(1, Math.round(H));
    return { W: Math.max(1, Math.ceil(h * r - EPS)), H: h };
  }
  const w = Math.max(1, Math.round(W));
  return { W: w, H: Math.max(1, Math.ceil(w / r - EPS)) };
}

/** Chuẩn: ngang 1440, cạnh dài tối đa 2048. Lớn: cạnh dài 2048. */
export function presetSize(wh: { w: number; h: number }, mode: 'standard' | 'large'): FrameSize {
  const r = wh.w / wh.h;
  let W: number;
  let H: number;
  if (mode === 'large') {
    if (r <= 1) {
      H = 2048;
      W = H * r;
    } else {
      W = 2048;
      H = W / r;
    }
  } else {
    W = 1440;
    H = W / r;
    if (H > 2048) {
      H = 2048;
      W = H * r;
    }
  }
  return { ...roundToRatio(W, H, r), capped: false };
}

/** Gốc: khung vừa đủ để ảnh (hoặc ảnh thấp hơn trong cặp) được vẽ đúng 100% điểm ảnh gốc. */
export function nativeSize(frame: ImageFrame, look: FrameLook, getImage: ImageLookup): FrameSize {
  const wh = ratioWH(look);
  const r = wh.w / wh.h;
  const p = look.padding / 100;
  const g = look.gap / 100;
  const ims = frame.slots.map((s) => getImage(s.imageId)).filter((im): im is SourceImage => im?.status === 'ready');
  if (!ims.length) return presetSize(wh, 'standard');
  let cw: number;
  let ch: number;
  let gg = 0;
  if (ims.length === 1) {
    cw = ims[0].width;
    ch = ims[0].height;
  } else {
    ch = Math.min(ims[0].height, ims[1].height);
    cw = (ch * ims[0].width) / ims[0].height + (ch * ims[1].width) / ims[1].height;
    gg = g;
  }
  let W: number;
  let H: number;
  if (r <= 1) {
    W = Math.max(cw / Math.max(1 - 2 * p - gg, 0.05), ch / Math.max(1 / r - 2 * p, 0.05));
    H = W / r;
  } else {
    H = Math.max(ch / Math.max(1 - 2 * p, 0.05), cw / Math.max(r - 2 * p - gg, 0.05));
    W = H * r;
  }
  let s = roundToRatio(Math.ceil(W - 1e-6), Math.ceil(H - 1e-6), r);
  let capped = false;
  if (s.W * s.H > CANVAS_AREA_CAP) {
    const k = Math.sqrt(CANVAS_AREA_CAP / (s.W * s.H)) * 0.999;
    s = roundToRatio(Math.floor(s.W * k), Math.floor(s.H * k), r);
    capped = true;
  }
  return { ...s, capped };
}

export function exportSizeFor(frame: ImageFrame, look: FrameLook, batch: FrameBatchSettings, getImage: ImageLookup): FrameSize {
  return batch.size === 'native' ? nativeSize(frame, look, getImage) : presetSize(ratioWH(look), batch.size);
}

// ---------- Bố cục (tính theo điểm ảnh xuất) ----------

export function slotRect(base: FrameRect, slot: Pick<FrameSlot, 'ox' | 'oy' | 'scale'>, W: number, H: number): FrameRect {
  const w = base.w * slot.scale;
  const h = base.h * slot.scale;
  const cx = base.x + base.w / 2 + slot.ox * W;
  const cy = base.y + base.h / 2 + slot.oy * H;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

export function clampRect(r: FrameRect, W: number, H: number): FrameRect {
  let { x, y, w, h } = r;
  if (w > W + 1e-6 || h > H + 1e-6) {
    const k = Math.min(W / w, H / h);
    const cx = x + w / 2;
    const cy = y + h / 2;
    w *= k;
    h *= k;
    x = cx - w / 2;
    y = cy - h / 2;
  }
  return { x: clamp(x, 0, Math.max(0, W - w)), y: clamp(y, 0, Math.max(0, H - h)), w, h };
}

export function overlaps(a: FrameRect, b: FrameRect): boolean {
  return a.x < b.x + b.w - 0.5 && a.x + a.w > b.x + 0.5 && a.y < b.y + b.h - 0.5 && a.y + a.h > b.y + 0.5;
}

export function computeLayout(
  frame: ImageFrame,
  look: FrameLook,
  W: number,
  H: number,
  allowUpscale: boolean,
  getImage: ImageLookup,
): FrameLayout {
  const minSide = Math.min(W, H);
  const pad = (look.padding / 100) * minSide;
  const gap = (look.gap / 100) * minSide;
  const safe = { x: pad, y: pad, w: Math.max(1, W - 2 * pad), h: Math.max(1, H - 2 * pad) };
  const out: FrameLayout = { W, H, safe, bases: [], rects: [], limitedByNative: false };
  if (!frameReady(frame, getImage)) return out;
  const ims = frame.slots.map((s) => getImage(s.imageId) as SourceImage);
  if (ims.length === 1) {
    const im = ims[0];
    const fit = Math.min(safe.w / im.width, safe.h / im.height);
    let s = fit;
    if (!allowUpscale && fit > 1) {
      s = 1;
      out.limitedByNative = true;
    }
    const bw = im.width * s;
    const bh = im.height * s;
    out.bases.push({ x: safe.x + (safe.w - bw) / 2, y: safe.y + (safe.h - bh) / 2, w: bw, h: bh });
  } else {
    const [a, b] = ims;
    const ar = a.width / a.height + b.width / b.height;
    const hFit = Math.max(1, Math.min((safe.w - gap) / ar, safe.h));
    let hh = hFit;
    // Cặp ảnh cao bằng nhau; ảnh thấp hơn là mốc 100% để không ảnh nào bị phóng to ngầm.
    const cap = Math.min(a.height, b.height);
    if (!allowUpscale && hFit > cap) {
      hh = cap;
      out.limitedByNative = true;
    }
    const wa = (hh * a.width) / a.height;
    const wb = (hh * b.width) / b.height;
    const total = wa + gap + wb;
    const x0 = safe.x + (safe.w - total) / 2;
    const y0 = safe.y + (safe.h - hh) / 2;
    out.bases.push({ x: x0, y: y0, w: wa, h: hh }, { x: x0 + wa + gap, y: y0, w: wb, h: hh });
  }
  out.rects = out.bases.map((b, i) => {
    let r = slotRect(b, frame.slots[i], W, H);
    if (!look.overflow) r = clampRect(r, W, H);
    return { ...r, native: r.w / ims[i].width };
  });
  return out;
}

/** Dữ liệu một khung đang hiện trên khung xem trước, dùng cho kéo và thu phóng. */
export interface FrameView {
  frame: ImageFrame;
  look: FrameLook;
  size: FrameSize;
  layout: FrameLayout;
}

/** Ràng buộc một lần kéo: hít đường gióng, không ra khỏi khung, không đè ảnh kia (khi tắt cho tràn). */
export function constrainMove(
  view: FrameView,
  i: number,
  ox: number,
  oy: number,
  opts: { snapPx?: number } = {},
): { ox: number; oy: number; snapX: number | null; snapY: number | null } {
  const { W, H } = view.size;
  const base = view.layout.bases[i];
  const slot = view.frame.slots[i];
  const w = base.w * slot.scale;
  const h = base.h * slot.scale;
  let cx = base.x + base.w / 2 + ox * W;
  let cy = base.y + base.h / 2 + oy * H;
  let snapX: number | null = null;
  let snapY: number | null = null;
  if (opts.snapPx) {
    const thr = opts.snapPx;
    const s = view.layout.safe;
    if (Math.abs(cx - W / 2) < thr) {
      cx = W / 2;
      snapX = W / 2;
    } else if (Math.abs(cx - w / 2 - s.x) < thr) {
      cx = s.x + w / 2;
      snapX = s.x;
    } else if (Math.abs(cx + w / 2 - (s.x + s.w)) < thr) {
      cx = s.x + s.w - w / 2;
      snapX = s.x + s.w;
    }
    if (Math.abs(cy - H / 2) < thr) {
      cy = H / 2;
      snapY = H / 2;
    } else if (Math.abs(cy - h / 2 - s.y) < thr) {
      cy = s.y + h / 2;
      snapY = s.y;
    } else if (Math.abs(cy + h / 2 - (s.y + s.h)) < thr) {
      cy = s.y + s.h - h / 2;
      snapY = s.y + s.h;
    }
  }
  if (!view.look.overflow) {
    cx = w <= W ? clamp(cx, w / 2, W - w / 2) : W / 2;
    cy = h <= H ? clamp(cy, h / 2, H - h / 2) : H / 2;
    const other = view.frame.slots.length === 2 ? view.layout.rects[1 - i] : undefined;
    if (other && overlaps({ x: cx - w / 2, y: cy - h / 2, w, h }, other)) {
      const prev = clampRect(slotRect(base, slot, W, H), W, H);
      const keepY = { x: cx - w / 2, y: prev.y, w, h };
      const keepX = { x: prev.x, y: cy - h / 2, w, h };
      if (!overlaps(keepY, other)) {
        cy = prev.y + h / 2;
        snapY = null;
      } else if (!overlaps(keepX, other)) {
        cx = prev.x + w / 2;
        snapX = null;
      } else {
        cx = prev.x + w / 2;
        cy = prev.y + h / 2;
        snapX = null;
        snapY = null;
      }
    }
  }
  return { ox: (cx - base.x - base.w / 2) / W, oy: (cy - base.y - base.h / 2) / H, snapX, snapY };
}

/** Hệ số thu phóng lớn nhất còn nằm trong khung và không đè ảnh kia. */
export function maxScaleFor(view: FrameView, i: number): number {
  const base = view.layout.bases[i];
  if (!base) return 1;
  const { W, H } = view.size;
  const slot = view.frame.slots[i];
  let hi = Math.min(W / base.w, H / base.h);
  const other = view.frame.slots.length === 2 ? view.layout.rects[1 - i] : undefined;
  if (other) {
    const fits = (s: number) => !overlaps(clampRect(slotRect(base, { ...slot, scale: s }, W, H), W, H), other);
    if (!fits(hi)) {
      let lo = Math.min(slot.scale, hi);
      if (!fits(lo)) return lo;
      for (let n = 0; n < 24; n++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) lo = mid;
        else hi = mid;
      }
      return lo;
    }
  }
  return hi;
}

// ---------- Vẽ ----------

type RoundRectCtx = CanvasRenderingContext2D & {
  roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
};

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  const c = ctx as RoundRectCtx;
  if (typeof c.roundRect === 'function') {
    c.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function releaseCanvas(c: unknown) {
  if (c instanceof HTMLCanvasElement) {
    c.width = 0;
    c.height = 0;
  }
}

function radiusPct(look: FrameLook, im: SourceImage): number {
  if (look.radiusAuto) return im.width / im.height < 0.6 ? 4 : 0;
  return look.radius;
}

/** Thu nhỏ từng nấc một nửa tới khi còn dưới 2 lần cỡ đích, để chữ trong ảnh không răng cưa. */
export function downscaleSource(src: CanvasImageSource, sw: number, sh: number, tw: number, th: number): DrawSource {
  let cur: CanvasImageSource = src;
  let cw = sw;
  let ch = sh;
  while (cw / 2 >= tw && ch / 2 >= th && cw > 2 && ch > 2) {
    const nw = Math.max(1, Math.round(cw / 2));
    const nh = Math.max(1, Math.round(ch / 2));
    const c = document.createElement('canvas');
    c.width = nw;
    c.height = nh;
    const x = c.getContext('2d');
    if (!x) break;
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(cur, 0, 0, cw, ch, 0, 0, nw, nh);
    if (cur !== src) releaseCanvas(cur);
    cur = c;
    cw = nw;
    ch = nh;
  }
  return { src: cur, w: cw, h: ch };
}

function drawBackground(ctx: CanvasRenderingContext2D, frame: ImageFrame, look: FrameLook, Wd: number, Hd: number, getImage: ImageLookup) {
  if (look.bgKind === 'gradient') {
    const a = ((look.gradAngle % 360) * Math.PI) / 180;
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    const half = Math.abs((Wd / 2) * dx) + Math.abs((Hd / 2) * dy);
    const g = ctx.createLinearGradient(Wd / 2 - dx * half, Hd / 2 - dy * half, Wd / 2 + dx * half, Hd / 2 + dy * half);
    g.addColorStop(0, look.gradFrom);
    g.addColorStop(1, look.gradTo);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, Wd, Hd);
    return;
  }
  if (look.bgKind === 'blur') {
    const im = frame.slots[0] ? getImage(frame.slots[0].imageId) : undefined;
    const thumb = im?.thumb;
    if (thumb && thumb.width && thumb.height) {
      // Không dùng ctx.filter (Safari không có): thu rất nhỏ rồi phóng lên là ra mờ, mọi trình duyệt như nhau.
      const tw = Math.max(6, Math.round(Wd / 32));
      const th = Math.max(6, Math.round(Hd / 32));
      const t = document.createElement('canvas');
      t.width = tw;
      t.height = th;
      const tc = t.getContext('2d');
      const m = document.createElement('canvas');
      m.width = tw * 4;
      m.height = th * 4;
      const mc = m.getContext('2d');
      if (tc && mc) {
        tc.imageSmoothingEnabled = true;
        tc.imageSmoothingQuality = 'high';
        const s = Math.max(tw / thumb.width, th / thumb.height);
        const dw = thumb.width * s;
        const dh = thumb.height * s;
        tc.drawImage(thumb, (tw - dw) / 2, (th - dh) / 2, dw, dh);
        mc.imageSmoothingEnabled = true;
        mc.imageSmoothingQuality = 'high';
        mc.drawImage(t, 0, 0, m.width, m.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(m, 0, 0, Wd, Hd);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, 0, Wd, Hd);
        releaseCanvas(t);
        releaseCanvas(m);
        return;
      }
    }
  }
  ctx.fillStyle = look.bgKind === 'blur' ? '#000000' : look.bgColor || '#000000';
  ctx.fillRect(0, 0, Wd, Hd);
}

/**
 * Vẽ một khung. `k` = điểm ảnh canvas cho mỗi điểm ảnh xuất (xuất: 1, xem trước: nhỏ hơn 1).
 * `getSrc` trả ảnh dùng để vẽ ô thứ `i`: ảnh gốc khi xuất, bản thu nhỏ khi xem trước.
 */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: ImageFrame,
  look: FrameLook,
  layout: FrameLayout,
  k: number,
  getSrc: (i: number, im: SourceImage) => DrawSource | null,
  isExport: boolean,
  getImage: ImageLookup,
) {
  const Wd = layout.W * k;
  const Hd = layout.H * k;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  drawBackground(ctx, frame, look, Wd, Hd, getImage);
  const frameMin = Math.min(Wd, Hd);
  layout.rects.forEach((r, i) => {
    const im = getImage(frame.slots[i].imageId);
    if (!im) return;
    const src = getSrc(i, im);
    if (!src) return;
    let x = r.x * k;
    let y = r.y * k;
    let w = r.w * k;
    let h = r.h * k;
    let exact = false;
    if (isExport && Math.abs(r.native - 1) < 1e-3) {
      // Hệ số đúng 1: tọa độ nguyên, không nội suy, mỗi điểm ảnh gốc ứng đúng một điểm ảnh xuất.
      exact = true;
      x = Math.round(x);
      y = Math.round(y);
      w = im.width;
      h = im.height;
    }
    const rad = (radiusPct(look, im) / 100) * Math.min(w, h);
    if (look.shadow) {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 0.03 * frameMin;
      ctx.shadowOffsetY = 0.012 * frameMin;
      ctx.fillStyle = '#000000';
      roundRectPath(ctx, x, y, w, h, rad);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    if (rad > 0.25) {
      roundRectPath(ctx, x, y, w, h, rad);
      ctx.clip();
    }
    if (exact) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src.src, x, y);
    } else {
      const d = downscaleSource(src.src, src.w, src.h, w, h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(d.src, 0, 0, d.w, d.h, x, y, w, h);
      if (d.src !== src.src) releaseCanvas(d.src);
    }
    ctx.restore();
  });
}

// ---------- Giải mã ----------

export interface DecodedSource extends DrawSource {
  close: () => void;
}

export async function decodeFile(file: Blob): Promise<DecodedSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      const b = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      return { src: b, w: b.width, h: b.height, close: () => b.close() };
    } catch {
      // thử đường <img> bên dưới
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.decoding = 'async';
  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(ERR_DECODE));
      img.src = url;
    });
  } catch (e) {
    URL.revokeObjectURL(url);
    throw e;
  }
  if (!img.naturalWidth) {
    URL.revokeObjectURL(url);
    throw new Error(ERR_DECODE);
  }
  return { src: img, w: img.naturalWidth, h: img.naturalHeight, close: () => URL.revokeObjectURL(url) };
}

export function scaledCopy(src: CanvasImageSource, sw: number, sh: number, longEdge: number): HTMLCanvasElement {
  const k = Math.min(1, longEdge / Math.max(sw, sh));
  const tw = Math.max(1, Math.round(sw * k));
  const th = Math.max(1, Math.round(sh * k));
  const d = downscaleSource(src, sw, sh, tw, th);
  const c = document.createElement('canvas');
  c.width = tw;
  c.height = th;
  const x = c.getContext('2d');
  if (x) {
    x.imageSmoothingEnabled = true;
    x.imageSmoothingQuality = 'high';
    x.drawImage(d.src, 0, 0, d.w, d.h, 0, 0, tw, th);
  }
  if (d.src !== src) releaseCanvas(d.src);
  return c;
}

/** Giải mã một lần lúc nhập: lấy kích thước gốc, dựng bản xem trước và ảnh nhỏ, rồi bỏ bản đầy đủ. */
export async function decodeForPreview(file: Blob): Promise<{ width: number; height: number; preview: HTMLCanvasElement; thumb: HTMLCanvasElement }> {
  const full = await decodeFile(file);
  try {
    const preview = scaledCopy(full.src, full.w, full.h, PREVIEW_LONG_EDGE);
    const thumb = scaledCopy(preview, preview.width, preview.height, THUMB_LONG_EDGE);
    return { width: full.w, height: full.h, preview, thumb };
  } finally {
    full.close();
  }
}
