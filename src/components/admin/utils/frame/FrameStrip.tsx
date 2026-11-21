'use client';

import * as React from 'react';
import { ClipboardPaste, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';
import { computeLayout, drawFrame, effectiveLook, exportSizeFor, frameErrorImage, frameReady } from '@/lib/frame/engine';
import { getImage, selectFrame, type FrameToolState } from '@/lib/frame/store';
import type { FrameBatchSettings, FrameLook, ImageFrame, SourceImage } from '@/types/imageFrame';

const TILE_HEIGHT = 96;

interface ThumbProps {
  frame: ImageFrame;
  look: FrameLook;
  batch: FrameBatchSettings;
  images: ReadonlyMap<string, SourceImage>;
  index: number;
  selected: boolean;
}

const FrameThumb = React.memo(function FrameThumb({ frame, look, batch, images, index, selected }: ThumbProps) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  // `images` đổi khi có ảnh được giải mã hoặc thay, nên là phụ thuộc để vẽ lại.
  const size = React.useMemo(() => exportSizeFor(frame, look, batch, getImage), [frame, look, batch, images]); // eslint-disable-line react-hooks/exhaustive-deps
  const cssW = Math.max(1, Math.round((TILE_HEIGHT * size.W) / size.H));

  React.useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const d = window.devicePixelRatio || 1;
    const ch = Math.round(TILE_HEIGHT * d);
    const cw = Math.max(1, Math.round((ch * size.W) / size.H));
    c.width = cw;
    c.height = ch;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const layout = computeLayout(frame, look, size.W, size.H, batch.allowUpscale, getImage);
    drawFrame(
      ctx,
      frame,
      look,
      layout,
      ch / size.H,
      (_i, im) => (im.thumb ? { src: im.thumb, w: im.thumb.width, h: im.thumb.height } : null),
      false,
      getImage,
    );
  }, [frame, look, batch, size, images]);

  return (
    <button
      type="button"
      onClick={() => selectFrame(frame.id)}
      aria-label={`Khung ${index + 1}`}
      aria-pressed={selected}
      className={cn(
        'relative shrink-0 rounded-xl border-2 bg-muted p-0.5 transition-colors',
        selected ? 'border-primary' : 'border-transparent hover:border-border',
      )}
    >
      <canvas ref={ref} className="block rounded-lg" style={{ width: cssW, height: TILE_HEIGHT }} />
      <span className="absolute left-1.5 top-1.5 rounded-md bg-foreground/70 px-1.5 text-[11px] font-bold text-background">
        {index + 1}
      </span>
      {frame.override && (
        <span title="Khung có thiết lập riêng" className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-warning ring-2 ring-card" />
      )}
    </button>
  );
});

interface FrameStripProps {
  state: FrameToolState;
  coarse: boolean;
  onPick: () => void;
  onPaste: () => void;
  onSamples: () => void;
}

/** Dải khung: ảnh nhỏ đã đóng khung của từng khung, đánh số, bấm để chọn. */
export function FrameStrip({ state, coarse, onPick, onPaste, onSamples }: FrameStripProps) {
  const n = state.frames.length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{n ? `Các khung (${n})` : 'Các khung'}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={onPick}>
            <Plus /> Thêm ảnh
          </Button>
          <Button size="sm" variant="outline" onClick={onPaste}>
            <ClipboardPaste /> Dán ảnh
          </Button>
          <Button size="sm" variant="ghost" onClick={onSamples}>
            <Sparkles /> Ảnh mẫu
          </Button>
        </div>
      </div>
      <div className="flex min-h-[108px] items-end gap-2 overflow-x-auto pb-1">
        {state.frames.map((f, i) => {
          const bad = frameErrorImage(f, getImage);
          if (bad) {
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => selectFrame(f.id)}
                aria-pressed={f.id === state.selectedFrameId}
                className={cn(
                  'relative flex h-[100px] w-[84px] shrink-0 items-center justify-center rounded-xl border-2 bg-destructive-soft px-1.5 pt-4 text-center text-[11px] text-destructive-deep',
                  f.id === state.selectedFrameId ? 'border-primary' : 'border-transparent',
                )}
              >
                <span className="absolute left-1.5 top-1.5 rounded-md bg-foreground/70 px-1.5 text-[11px] font-bold text-background">{i + 1}</span>
                Không đọc được {bad.name}
              </button>
            );
          }
          if (!frameReady(f, getImage)) return <Skeleton key={f.id} className="h-24 w-14 shrink-0" />;
          return (
            <FrameThumb
              key={f.id}
              frame={f}
              look={effectiveLook(state.look, f)}
              batch={state.batch}
              images={state.images}
              index={i}
              selected={f.id === state.selectedFrameId}
            />
          );
        })}
        {Array.from({ length: state.decoding }, (_, i) => (
          <Skeleton key={`decoding-${i}`} className="h-24 w-14 shrink-0" />
        ))}
      </div>
      {n > 0 && (
        <p className="text-xs text-muted-foreground">
          {coarse
            ? 'Chạm một khung để chỉnh · tối đa 40 ảnh mỗi lô'
            : 'Bấm một khung để chỉnh · ⌘V/Ctrl+V để dán thêm · kéo thả nhiều file vào trang · tối đa 40 ảnh mỗi lô'}
        </p>
      )}
    </div>
  );
}
