'use client';

import * as React from 'react';
import type { FrameBatchSettings } from '@/types/imageFrame';
import { releaseCanvas, type FrameView } from '@/lib/frame/engine';
import { canvasToBlob, renderExport } from '@/lib/frame/output';
import { getImage } from '@/lib/frame/store';

export interface MeasuredSize {
  png?: number;
  jpg?: number;
  error?: string;
}

/**
 * Dung lượng thật của khung đang chọn: vẽ lại ở đúng cỡ xuất rồi lấy blob của chính trình duyệt này
 * (PNG của Chrome to hơn trình duyệt khác). Chạy sau một khoảng chờ, bỏ kết quả cũ. `null` = đang tính.
 */
export function useMeasuredSize(view: FrameView | null, version: number, batch: FrameBatchSettings): MeasuredSize | null {
  const key = view ? `${version}|${view.frame.id}|${batch.format}|${batch.size}|${batch.allowUpscale}` : '';
  const [result, setResult] = React.useState<{ key: string; value: MeasuredSize } | null>(null);
  const latest = React.useRef({ view, batch });

  React.useLayoutEffect(() => {
    latest.current = { view, batch };
  });

  React.useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const t = window.setTimeout(async () => {
      const { view: v, batch: b } = latest.current;
      if (!v) return;
      try {
        const out = await renderExport(v.frame, v.look, b, getImage);
        const png = await canvasToBlob(out.canvas, 'image/png');
        const jpg = b.format === 'jpeg' ? await canvasToBlob(out.canvas, 'image/jpeg', 0.92) : null;
        releaseCanvas(out.canvas);
        if (!cancelled) setResult({ key, value: { png: png.size, jpg: jpg?.size } });
      } catch (e) {
        if (!cancelled) setResult({ key, value: { error: e instanceof Error ? e.message : String(e) } });
      }
    }, 650);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [key]);

  return result && result.key === key ? result.value : null;
}
