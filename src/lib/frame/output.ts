/**
 * Xuất khung ảnh: vẽ lại ở đúng cỡ xuất từ ảnh gốc, ra blob PNG/JPEG, tải, chép, chia sẻ, nén zip.
 * Zip dùng kiểu lưu thẳng (không nén) tự viết: PNG/JPEG đã nén sẵn nên nén thêm không được gì, và
 * không phải thêm gói.
 */
import type { FrameBatchSettings, FrameExportFormat, FrameLook, FrameSize, ImageFrame } from '@/types/imageFrame';
import {
  computeLayout,
  decodeFile,
  drawFrame,
  exportSizeFor,
  type DecodedSource,
  type ImageLookup,
} from '@/lib/frame/engine';

export function mimeOf(format: FrameExportFormat): string {
  return format === 'jpeg' ? 'image/jpeg' : 'image/png';
}

function dateStamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

export function exportFileName(index: number, format: FrameExportFormat): string {
  return `khung-anh-${dateStamp()}-${String(index + 1).padStart(2, '0')}.${format === 'jpeg' ? 'jpg' : 'png'}`;
}

export function zipFileName(): string {
  return `khung-anh-${dateStamp()}.zip`;
}

/** Vẽ khung ở đúng số điểm ảnh xuất, từ ảnh gốc giải mã đủ độ phân giải. Người gọi tự giải phóng canvas. */
export async function renderExport(
  frame: ImageFrame,
  look: FrameLook,
  batch: FrameBatchSettings,
  getImage: ImageLookup,
): Promise<{ canvas: HTMLCanvasElement; size: FrameSize }> {
  const size = exportSizeFor(frame, look, batch, getImage);
  const layout = computeLayout(frame, look, size.W, size.H, batch.allowUpscale, getImage);
  const canvas = document.createElement('canvas');
  canvas.width = size.W;
  canvas.height = size.H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ canvas.');
  const sources: DecodedSource[] = [];
  try {
    for (const s of frame.slots) {
      const im = getImage(s.imageId);
      if (!im) throw new Error('Thiếu ảnh nguồn của khung.');
      sources.push(await decodeFile(im.file));
    }
    drawFrame(ctx, frame, look, layout, 1, (i) => sources[i] ?? null, true, getImage);
  } finally {
    sources.forEach((s) => s.close());
  }
  return { canvas, size };
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Không tạo được file ảnh (ảnh quá lớn cho trình duyệt này?).'))),
      type,
      quality,
    );
  });
}

export async function exportBlob(
  frame: ImageFrame,
  look: FrameLook,
  batch: FrameBatchSettings,
  getImage: ImageLookup,
  type: string,
): Promise<Blob> {
  const out = await renderExport(frame, look, batch, getImage);
  try {
    return await canvasToBlob(out.canvas, type, type === 'image/jpeg' ? 0.92 : undefined);
  } finally {
    out.canvas.width = 0;
    out.canvas.height = 0;
  }
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function canShareFiles(): boolean {
  try {
    if (typeof navigator === 'undefined' || !navigator.share || !navigator.canShare) return false;
    const probe = new File([new Uint8Array([137, 80, 78, 71])], 'probe.png', { type: 'image/png' });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function canCopyImage(): boolean {
  return typeof window !== 'undefined' && 'ClipboardItem' in window && !!navigator.clipboard?.write;
}

/**
 * Chép PNG vào clipboard. `ClipboardItem` phải tạo ngay trong cú bấm, với Promise của blob, để Safari
 * không mất quyền của cú bấm trong lúc vẽ. Trình duyệt không nhận Promise thì chờ blob rồi ghi lại.
 */
export async function copyPngToClipboard(blobPromise: Promise<Blob>) {
  blobPromise.catch(() => undefined);
  try {
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blobPromise })]);
  } catch {
    const blob = await blobPromise;
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  }
}

// ---------- Zip kiểu lưu thẳng ----------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export async function zipStore(files: { name: string; blob: Blob }[], date = new Date()): Promise<Blob> {
  const enc = new TextEncoder();
  const dosTime = ((date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2)) & 0xffff;
  const dosDate = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  const parts: BlobPart[] = [];
  const central: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = new Uint8Array(await f.blob.arrayBuffer());
    const crc = crc32(data);
    const size = data.length;
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // tên file UTF-8
    lv.setUint16(8, 0, true); // lưu thẳng
    lv.setUint16(10, dosTime, true);
    lv.setUint16(12, dosDate, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    parts.push(local, f.blob);
    const cen = new Uint8Array(46 + name.length);
    const cv = new DataView(cen.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, dosTime, true);
    cv.setUint16(14, dosDate, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, name.length, true);
    cv.setUint32(42, offset, true);
    cen.set(name, 46);
    central.push(cen);
    offset += local.length + size;
  }
  const cdSize = central.reduce((s, x) => s + x.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, cdSize, true);
  ev.setUint32(16, offset, true);
  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

export function formatBytes(n: number | null | undefined): string {
  if (n == null) return '';
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / 1048576).toFixed(1).replace('.', ',')} MB`;
}
