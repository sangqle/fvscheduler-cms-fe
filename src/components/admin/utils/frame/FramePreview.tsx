'use client';

import * as React from 'react';
import { ClipboardPaste, ImagePlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { ERR_DECODE, constrainMove, drawFrame, frameErrorImage, type FrameView } from '@/lib/frame/engine';
import { FEED_MAX_TALL_RATIO } from '@/lib/frame/platforms';
import {
  deleteFrame,
  getImage,
  resetSlotPosition,
  selectSlot,
  selectedFrame,
  updateSlot,
  type FrameToolState,
} from '@/lib/frame/store';

interface FramePreviewProps {
  state: FrameToolState;
  view: FrameView | null;
  coarse: boolean;
  onPick: () => void;
  onPaste: () => void;
  onSamples: () => void;
}

interface Fit {
  w: number;
  h: number;
  /** Điểm ảnh CSS trên mỗi điểm ảnh xuất. */
  cs: number;
}

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

/** Vùng 4:5 ở giữa mà feed Facebook/Threads hiện ra khi khung cao hơn 4:5, và phần ảnh bị che. */
function feedArea(view: FrameView, fit: Fit) {
  const { W, H } = view.size;
  const visH = W / FEED_MAX_TALL_RATIO;
  const top = (H - visH) / 2;
  let hidTop = 0;
  let hidBot = 0;
  view.layout.rects.forEach((r) => {
    hidTop = Math.max(hidTop, clamp(top - r.y, 0, r.h));
    hidBot = Math.max(hidBot, clamp(r.y + r.h - (top + visH), 0, r.h));
  });
  const label =
    hidTop > 0.5 || hidBot > 0.5
      ? `Feed Facebook/Threads chỉ hiện phần 4:5 giữa hai đường này: che ${Math.round(hidTop)}px trên và ${Math.round(hidBot)}px dưới của ảnh chụp màn hình`
      : 'Feed Facebook/Threads chỉ hiện phần 4:5 giữa hai đường này: hiện chỉ che nền';
  return { top: top * fit.cs, bottom: (H - top - visH) * fit.cs, label };
}

/**
 * Khung xem trước: canvas vẽ bằng chính hàm vẽ của ảnh xuất (theo cỡ khung × devicePixelRatio, từ bản
 * thu nhỏ), lớp DOM phủ trên để kéo từng ảnh, bàn phím, đường gióng và vùng feed.
 */
export function FramePreview({ state, view, coarse, onPick, onPaste, onSamples }: FramePreviewProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });

  React.useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const fit = React.useMemo<Fit | null>(() => {
    if (!view || box.w <= 0 || box.h <= 0) return null;
    const maxW = Math.max(120, box.w - 32);
    const maxH = Math.max(120, box.h - 32);
    const r = view.size.W / view.size.H;
    let w = maxW;
    let h = w / r;
    if (h > maxH) {
      h = maxH;
      w = h * r;
    }
    const cw = Math.floor(w);
    return { w: cw, h: Math.floor(h), cs: cw / view.size.W };
  }, [view, box]);

  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c || !view || !fit) return;
    const d = window.devicePixelRatio || 1;
    const pw = Math.max(1, Math.round(fit.w * d));
    const ph = Math.max(1, Math.round(fit.h * d));
    if (c.width !== pw || c.height !== ph) {
      c.width = pw;
      c.height = ph;
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    drawFrame(
      ctx,
      view.frame,
      view.look,
      view.layout,
      pw / view.size.W,
      (_i, im) => (im.preview ? { src: im.preview, w: im.preview.width, h: im.preview.height } : null),
      false,
      getImage,
    );
  }, [view, fit]);

  // Sự kiện con trỏ có thể tới trước lần render kế tiếp, nên đọc view/fit mới nhất qua ref.
  const latest = React.useRef({ view, fit });
  React.useLayoutEffect(() => {
    latest.current = { view, fit };
  });

  const dragRef = React.useRef<{ i: number; id: number; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = React.useState<number | null>(null);
  const [guides, setGuides] = React.useState<{ x: number | null; y: number | null }>({ x: null, y: null });

  const onPointerDown = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const v = latest.current.view;
    const slot = v?.frame.slots[i];
    if (!v || !slot) return;
    if (state.selectedSlot !== i) selectSlot(i);
    dragRef.current = { i, id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: slot.ox, oy: slot.oy };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // không bắt được con trỏ thì vẫn kéo được khi con trỏ còn trên ảnh
    }
    e.currentTarget.focus({ preventScroll: true });
    setDragging(i);
    e.preventDefault();
  };

  const onPointerMove = (i: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const { view: v, fit: f } = latest.current;
    if (!d || d.id !== e.pointerId || d.i !== i || !v || !f) return;
    const ox = d.ox + (e.clientX - d.sx) / f.cs / v.size.W;
    const oy = d.oy + (e.clientY - d.sy) / f.cs / v.size.H;
    const res = constrainMove(v, i, ox, oy, { snapPx: 8 / f.cs });
    updateSlot(v.frame.id, i, { ox: res.ox, oy: res.oy });
    setGuides({ x: res.snapX, y: res.snapY });
  };

  const onPointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.id !== e.pointerId) return;
    dragRef.current = null;
    setDragging(null);
    setGuides({ x: null, y: null });
  };

  const onKeyDown = (i: number) => (e: React.KeyboardEvent<HTMLDivElement>) => {
    const v = latest.current.view;
    const slot = v?.frame.slots[i];
    if (!v || !slot) return;
    const step = e.shiftKey ? 0.05 : 0.005;
    let dx = 0;
    let dy = 0;
    if (e.key === 'ArrowLeft') dx = -step;
    else if (e.key === 'ArrowRight') dx = step;
    else if (e.key === 'ArrowUp') dy = -step;
    else if (e.key === 'ArrowDown') dy = step;
    else return;
    e.preventDefault();
    if (state.selectedSlot !== i) selectSlot(i);
    const res = constrainMove(v, i, slot.ox + dx, slot.oy + dy);
    updateSlot(v.frame.id, i, { ox: res.ox, oy: res.oy });
  };

  const frame = selectedFrame(state);
  const bad = frame ? frameErrorImage(frame, getImage) : null;
  const feed = view && fit && view.size.W / view.size.H < FEED_MAX_TALL_RATIO - 0.003 ? feedArea(view, fit) : null;
  const frameNo = view ? state.frames.indexOf(view.frame) + 1 : 0;

  return (
    <div
      ref={wrapRef}
      className="relative flex h-[min(72vh,820px)] min-h-[340px] touch-pan-y items-center justify-center overflow-hidden rounded-xl bg-muted"
    >
      {!state.frames.length && !state.decoding && (
        <EmptyState
          icon={<ImagePlus />}
          title={coarse ? 'Chọn hoặc dán ảnh chụp màn hình' : 'Dán, kéo thả hoặc chọn ảnh chụp màn hình'}
          description={
            coarse
              ? 'Chọn ảnh từ máy, hoặc bấm Dán ảnh để lấy ảnh vừa chép · tối đa 40 ảnh mỗi lô'
              : '⌘V hoặc Ctrl+V để dán ảnh vừa chụp · kéo thả nhiều file vào trang · tối đa 40 ảnh mỗi lô'
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={onPick}>
                <ImagePlus /> Chọn ảnh
              </Button>
              <Button size="sm" variant="outline" onClick={onPaste}>
                <ClipboardPaste /> Dán ảnh
              </Button>
              <Button size="sm" variant="ghost" onClick={onSamples}>
                <Sparkles /> Dùng ảnh mẫu
              </Button>
            </div>
          }
        />
      )}

      {!state.frames.length && state.decoding > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" /> Đang đọc ảnh…
        </div>
      )}

      {frame && bad && (
        <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
          <p className="text-sm text-destructive">
            {bad.name}: {ERR_DECODE}
          </p>
          <Button size="sm" variant="outline" onClick={() => deleteFrame(frame.id)}>
            Xóa khung này
          </Button>
        </div>
      )}

      {view && fit && (
        <div className="relative shadow-pop" style={{ width: fit.w, height: fit.h }}>
          <canvas ref={canvasRef} className="block" style={{ width: fit.w, height: fit.h }} />
          <div className="absolute inset-0">
            {feed && (
              <>
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 border-b-2 border-dashed border-info bg-info/20"
                  style={{ height: feed.top }}
                />
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 border-t-2 border-dashed border-info bg-info/20"
                  style={{ height: feed.bottom }}
                />
              </>
            )}
            {guides.x != null && (
              <div className="pointer-events-none absolute inset-y-0 w-px bg-primary" style={{ left: guides.x * fit.cs }} />
            )}
            {guides.y != null && (
              <div className="pointer-events-none absolute inset-x-0 h-px bg-primary" style={{ top: guides.y * fit.cs }} />
            )}
            {view.layout.rects.map((r, i) => (
              <div
                key={i}
                role="button"
                tabIndex={0}
                aria-label={`Ảnh ${i === 0 ? 'A' : 'B'} trong khung ${frameNo}. Kéo hoặc dùng phím mũi tên để di chuyển, bấm đúp để căn giữa lại.`}
                className={cn(
                  'absolute touch-none select-none rounded-sm outline-none ring-inset focus-visible:ring-2 focus-visible:ring-ring',
                  dragging === i ? 'cursor-grabbing' : 'cursor-grab',
                  view.frame.slots.length > 1 && state.selectedSlot === i ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-primary/70',
                )}
                style={{
                  left: r.x * fit.cs,
                  top: r.y * fit.cs,
                  width: r.w * fit.cs,
                  height: r.h * fit.cs,
                  WebkitTouchCallout: 'none',
                }}
                onPointerDown={onPointerDown(i)}
                onPointerMove={onPointerMove(i)}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onDoubleClick={() => resetSlotPosition(view.frame.id, i)}
                onKeyDown={onKeyDown(i)}
              />
            ))}
            {feed && (
              // Nằm trong dải bị che phía trên: chính là phần feed không hiện, nên nhãn không đè lên phần ảnh còn thấy.
              <div className="pointer-events-none absolute left-1.5 right-1.5 top-1 rounded-md bg-foreground/80 px-2 py-1 text-[11px] leading-snug text-background">
                {feed.label}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
