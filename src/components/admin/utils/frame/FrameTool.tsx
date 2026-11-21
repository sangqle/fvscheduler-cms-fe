'use client';

import * as React from 'react';
import { Copy, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/utils';
import {
  CAROUSEL_MAX,
  computeLayout,
  effectiveLook,
  exportSizeFor,
  frameErrorImage,
  frameReady,
  ratioWH,
  releaseCanvas,
  type FrameView,
} from '@/lib/frame/engine';
import { canvasToBlob, formatBytes, renderExport } from '@/lib/frame/output';
import { makeSampleFiles } from '@/lib/frame/samples';
import {
  addFiles,
  clearAll,
  getFrameState,
  getImage,
  hydrateSettings,
  onFrameNotice,
  selectedFrame,
  setBatch,
  setLook,
  startReplace,
  useFrameTool,
} from '@/lib/frame/store';
import { FramePanel } from './FramePanel';
import { FramePreview } from './FramePreview';
import { FrameStrip } from './FrameStrip';
import { useFrameExport } from './useFrameExport';
import { readClipboardImages, useFrameInput } from './useFrameInput';
import { useMeasuredSize } from './useMeasuredSize';

const ACCEPT = 'image/png,image/jpeg,image/webp';

/**
 * Tab "Khung ảnh": đặt ảnh chụp màn hình vào khung đúng tỉ lệ mạng xã hội để feed hiện trọn ảnh.
 * Chạy hoàn toàn trong trình duyệt, ảnh không rời máy. Spec: `docs/specs/utils-frame.md`.
 */
export function FrameTool() {
  const state = useFrameTool();
  const { showToast } = useToast();
  const exporter = useFrameExport();
  const { dropActive } = useFrameInput();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const replaceRef = React.useRef<HTMLInputElement>(null);
  const [coarse, setCoarse] = React.useState(false);

  React.useEffect(() => {
    hydrateSettings();
    setCoarse(window.matchMedia?.('(pointer: coarse)').matches ?? false);
  }, []);

  React.useEffect(() => onFrameNotice((n) => showToast(n)), [showToast]);

  // Chỉ ở dev: cửa cho kiểm thử tự động trên trình duyệt (thêm ảnh mẫu, đổi thiết lập, so điểm ảnh ở cỡ Gốc).
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __khung?: unknown };
    w.__khung = {
      getState: getFrameState,
      clearAll,
      addSamples: async () => addFiles(await makeSampleFiles()),
      exportInfo: async (i = 0) => {
        const s = getFrameState();
        const f = s.frames[i];
        if (!f) return null;
        const look = effectiveLook(s.look, f);
        const out = await renderExport(f, look, s.batch, getImage);
        const blob = await canvasToBlob(out.canvas, 'image/png');
        const layout = computeLayout(f, look, out.size.W, out.size.H, s.batch.allowUpscale, getImage);
        releaseCanvas(out.canvas);
        return { W: out.size.W, H: out.size.H, bytes: blob.size, rects: layout.rects };
      },
      setBatch,
      setLook,
      /** So từng điểm ảnh vùng giữa của mỗi ảnh vẽ đúng 100% với chính ảnh gốc vẽ lên canvas sRGB. */
      pixelCheck: async (i = 0) => {
        const s = getFrameState();
        const f = s.frames[i];
        if (!f) return null;
        const look = effectiveLook(s.look, f);
        const out = await renderExport(f, look, s.batch, getImage);
        const layout = computeLayout(f, look, out.size.W, out.size.H, s.batch.allowUpscale, getImage);
        const octx = out.canvas.getContext('2d');
        const results = [];
        for (let k = 0; k < f.slots.length; k++) {
          const r = layout.rects[k];
          const im = getImage(f.slots[k].imageId);
          if (!octx || !im || Math.abs(r.native - 1) >= 1e-3) {
            results.push({ slot: k, native: r?.native, skipped: true });
            continue;
          }
          const ref = document.createElement('canvas');
          ref.width = im.width;
          ref.height = im.height;
          const rctx = ref.getContext('2d');
          const bmp = await createImageBitmap(im.file);
          rctx?.drawImage(bmp, 0, 0);
          bmp.close();
          // Bỏ 10% mỗi mép để tránh góc bo và bóng.
          const ix = Math.round(im.width * 0.1);
          const iy = Math.round(im.height * 0.1);
          const w = im.width - 2 * ix;
          const h = im.height - 2 * iy;
          const a = octx.getImageData(Math.round(r.x) + ix, Math.round(r.y) + iy, w, h).data;
          const b = rctx?.getImageData(ix, iy, w, h).data;
          let maxDiff = 0;
          let over2 = 0;
          if (b) {
            for (let p = 0; p < a.length; p++) {
              const dlt = Math.abs(a[p] - b[p]);
              if (dlt > maxDiff) maxDiff = dlt;
              if (dlt > 2) over2++;
            }
          }
          releaseCanvas(ref);
          results.push({ slot: k, native: r.native, compared: w * h, maxDiff, over2 });
        }
        releaseCanvas(out.canvas);
        return { W: out.size.W, H: out.size.H, results };
      },
    };
    return () => {
      delete w.__khung;
    };
  }, []);

  const frame = selectedFrame(state);
  const view = React.useMemo<FrameView | null>(() => {
    if (!frame || !frameReady(frame, getImage) || frameErrorImage(frame, getImage)) return null;
    const look = effectiveLook(state.look, frame);
    const size = exportSizeFor(frame, look, state.batch, getImage);
    return { frame, look, size, layout: computeLayout(frame, look, size.W, size.H, state.batch.allowUpscale, getImage) };
    // `state.images` đổi khi ảnh được giải mã hoặc thay: phụ thuộc để tính lại.
  }, [frame, state.look, state.batch, state.images]); // eslint-disable-line react-hooks/exhaustive-deps

  const measure = useMeasuredSize(view, state.version, state.batch);

  const pickFiles = () => fileRef.current?.click();
  const pasteFromButton = async (replace: boolean) => {
    try {
      const files = await readClipboardImages();
      if (!files.length) {
        showToast({ title: 'Clipboard không có ảnh', variant: 'error' });
        return;
      }
      if (replace) startReplace(files[0]);
      else addFiles(files);
    } catch (e) {
      showToast({ title: 'Không đọc được clipboard', description: e instanceof Error ? e.message : String(e), variant: 'error' });
    }
  };
  const addSamples = async () => addFiles(await makeSampleFiles());

  const bytes = measure ? (state.batch.format === 'jpeg' ? measure.jpg : measure.png) : undefined;
  const fmt = state.batch.format === 'jpeg' ? 'JPEG' : 'PNG';
  const sizeText = !view ? '' : measure?.error ? 'không tính được dung lượng' : measure ? formatBytes(bytes) : 'đang tính dung lượng…';
  const copyLabel = exporter.busy.copy ? 'Đang chép…' : measure && !measure.error ? `Chép ảnh · PNG ${formatBytes(measure.png)}` : 'Chép ảnh';

  const notes: { text: string; warn?: boolean }[] = [];
  if (view) {
    if (view.layout.limitedByNative) {
      notes.push({ text: 'Ảnh gốc nhỏ hơn khung nên đang giữ nguyên cỡ để không nhòe. Bật "Cho phóng to ảnh nhỏ" nếu muốn ảnh to hơn.' });
    }
    view.layout.rects.forEach((r, i) => {
      if (r.native > 1.0005) notes.push({ text: `Ảnh ${i ? 'B' : 'A'} đang phóng to ${Math.round(r.native * 100)}% điểm ảnh gốc, có thể nhòe.`, warn: true });
    });
    if (view.size.capped) notes.push({ text: `Cỡ Gốc vượt giới hạn canvas nên đã hạ về ${view.size.W}×${view.size.H}.`, warn: true });
    if (view.look.overflow) notes.push({ text: 'Đang bật cho tràn khung: phần ảnh ra ngoài khung sẽ bị cắt.', warn: true });
  }
  if (bytes && bytes > 8 * 1048576) {
    notes.push({ text: 'File quá 8 MB, vượt giới hạn của Threads và Instagram: thử cỡ Chuẩn trước, rồi mới tới JPEG.', warn: true });
  }
  const n = state.frames.length;
  if (n > CAROUSEL_MAX) notes.push({ text: `Lô có ${n} khung: carousel Threads, Instagram, LinkedIn tối đa ${CAROUSEL_MAX} ảnh.`, warn: true });
  if (n >= 2) {
    notes.push({ text: 'Bài nhiều ảnh trên Facebook luôn cắt ô lưới; muốn hiện trọn hãy đăng từng ảnh. Threads hiện trọn khi mọi ảnh cùng tỉ lệ.' });
    const ratios = new Set(
      state.frames.map((f) => {
        const wh = ratioWH(effectiveLook(state.look, f));
        return (wh.w / wh.h).toFixed(4);
      }),
    );
    if (ratios.size > 1) notes.push({ text: 'Các khung trong lô đang có tỉ lệ khác nhau.', warn: true });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <Card padding="sm" className="min-w-0">
          <CardContent standalone className="flex flex-col gap-3">
            <FramePreview
              state={state}
              view={view}
              coarse={coarse}
              onPick={pickFiles}
              onPaste={() => void pasteFromButton(false)}
              onSamples={() => void addSamples()}
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">{view ? `${view.size.W}×${view.size.H} · ${fmt} · ${sizeText}` : ''}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" disabled={!view || exporter.busy.copy} onClick={exporter.copy}>
                  {exporter.busy.copy ? <Spinner size="sm" /> : <Copy />} {copyLabel}
                </Button>
                <Button size="sm" disabled={!view || exporter.busy.download} onClick={() => void exporter.download()}>
                  {exporter.busy.download ? <Spinner size="sm" /> : <Download />} {exporter.busy.download ? 'Đang xuất…' : 'Tải xuống'}
                </Button>
                {exporter.support.share && (
                  <Button size="sm" variant="outline" disabled={!view || exporter.busy.share} onClick={() => void exporter.share()}>
                    {exporter.busy.share ? <Spinner size="sm" /> : <Share2 />} Chia sẻ
                  </Button>
                )}
              </div>
            </div>

            {notes.length > 0 && (
              <div className="flex flex-col gap-1">
                {notes.map((note) => (
                  <p key={note.text} className={cn('text-xs leading-normal', note.warn ? 'text-warning-deep' : 'text-muted-foreground')}>
                    {note.text}
                  </p>
                ))}
              </div>
            )}

            <FrameStrip state={state} coarse={coarse} onPick={pickFiles} onPaste={() => void pasteFromButton(false)} onSamples={() => void addSamples()} />
          </CardContent>
        </Card>

        {/* Desktop: bảng thiết lập tự cuộn bên trong để khung xem trước luôn trong tầm mắt khi chỉnh. */}
        <Card padding="sm" className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
          <CardContent standalone>
            <FramePanel
              state={state}
              view={view}
              exporter={exporter}
              coarse={coarse}
              onReplacePick={() => replaceRef.current?.click()}
              onReplacePaste={() => void pasteFromButton(true)}
            />
          </CardContent>
        </Card>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = '';
          addFiles(files);
        }}
      />
      <input
        ref={replaceRef}
        type="file"
        accept={ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) startReplace(file);
        }}
      />

      {dropActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center border-4 border-dashed border-primary bg-primary/10 text-lg font-bold text-primary">
          Thả để thêm ảnh
        </div>
      )}
    </>
  );
}
