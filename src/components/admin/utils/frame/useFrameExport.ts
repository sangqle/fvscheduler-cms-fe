'use client';

import * as React from 'react';
import { useToast } from '@/components/ui/ToastProvider';
import { effectiveLook, frameErrorImage, frameReady } from '@/lib/frame/engine';
import {
  canCopyImage,
  canShareFiles,
  copyPngToClipboard,
  downloadBlob,
  exportBlob,
  exportFileName,
  mimeOf,
  zipFileName,
  zipStore,
} from '@/lib/frame/output';
import { getFrameState, getImage, selectedFrame } from '@/lib/frame/store';
import type { ImageFrame } from '@/types/imageFrame';

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const tick = () => new Promise((r) => setTimeout(r, 0));
const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

export interface FrameExportBusy {
  copy: boolean;
  download: boolean;
  share: boolean;
  /** Nhãn tiến độ khi đang xuất zip. */
  zip: string | null;
  /** Nhãn tiến độ khi đang chuẩn bị chia sẻ tất cả. */
  prepare: string | null;
}

export interface PreparedShare {
  version: number;
  batches: File[][];
}

/** Các thao tác xuất: chép, tải, chia sẻ một khung; tải zip và chia sẻ cả lô (hai bước). */
export function useFrameExport() {
  const { showToast } = useToast();
  const [busy, setBusy] = React.useState<FrameExportBusy>({ copy: false, download: false, share: false, zip: null, prepare: null });
  const [prepared, setPrepared] = React.useState<PreparedShare | null>(null);
  const [support, setSupport] = React.useState({ copy: false, share: false });

  React.useEffect(() => {
    setSupport({ copy: canCopyImage(), share: canShareFiles() });
  }, []);

  const patch = React.useCallback((p: Partial<FrameExportBusy>) => setBusy((b) => ({ ...b, ...p })), []);

  const blobFor = (f: ImageFrame, type: string) => {
    const s = getFrameState();
    return exportBlob(f, effectiveLook(s.look, f), s.batch, getImage, type);
  };
  const nameFor = (f: ImageFrame) => {
    const s = getFrameState();
    return exportFileName(s.frames.indexOf(f), s.batch.format);
  };
  const exportable = () => getFrameState().frames.filter((f) => frameReady(f, getImage) && !frameErrorImage(f, getImage));
  const currentReady = () => {
    const f = selectedFrame();
    return f && frameReady(f, getImage) && !frameErrorImage(f, getImage) ? f : null;
  };

  const copy = () => {
    const f = currentReady();
    if (!f) return;
    if (!canCopyImage()) {
      showToast({ title: 'Trình duyệt không cho chép ảnh', description: 'Hãy dùng Tải xuống.', variant: 'error' });
      return;
    }
    patch({ copy: true });
    // Tạo Promise của blob và gọi clipboard.write ngay trong cú bấm (xem copyPngToClipboard).
    copyPngToClipboard(blobFor(f, 'image/png'))
      .then(() => showToast({ title: 'Đã chép ảnh PNG', description: 'Dán thẳng vào ô soạn bài Threads hoặc Facebook.', variant: 'success' }))
      .catch((e) => showToast({ title: 'Không chép được ảnh', description: errMsg(e), variant: 'error' }))
      .finally(() => patch({ copy: false }));
  };

  const download = async () => {
    const f = currentReady();
    if (!f) return;
    patch({ download: true });
    try {
      const b = await blobFor(f, mimeOf(getFrameState().batch.format));
      const name = nameFor(f);
      downloadBlob(b, name);
      showToast({ title: `Đã tải ${name}`, variant: 'success' });
    } catch (e) {
      showToast({ title: 'Không xuất được ảnh', description: errMsg(e), variant: 'error' });
    } finally {
      patch({ download: false });
    }
  };

  const share = async () => {
    const f = currentReady();
    if (!f) return;
    patch({ share: true });
    try {
      const b = await blobFor(f, mimeOf(getFrameState().batch.format));
      await navigator.share({ files: [new File([b], nameFor(f), { type: b.type })] });
    } catch (e) {
      if (!isAbort(e)) showToast({ title: 'Không chia sẻ được', description: errMsg(e), variant: 'error' });
    } finally {
      patch({ share: false });
    }
  };

  const zipAll = async () => {
    const frames = exportable();
    if (!frames.length) return;
    const skipped = getFrameState().frames.length - frames.length;
    try {
      const files: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < frames.length; i++) {
        patch({ zip: `Đang xuất ${i + 1}/${frames.length}` });
        const b = await blobFor(frames[i], mimeOf(getFrameState().batch.format));
        files.push({ name: nameFor(frames[i]), blob: b });
        await tick();
      }
      patch({ zip: 'Đang nén…' });
      downloadBlob(await zipStore(files), zipFileName());
      showToast({
        title: `Đã tải ${frames.length} khung trong một file zip`,
        description: skipped ? `Bỏ qua ${skipped} khung có ảnh lỗi.` : undefined,
        variant: 'success',
      });
    } catch (e) {
      showToast({ title: 'Không xuất được', description: errMsg(e), variant: 'error' });
    } finally {
      patch({ zip: null });
    }
  };

  /** Bước 1 của "Chia sẻ tất cả": dựng sẵn file, vì quyền chia sẻ chỉ còn 5 giây sau cú bấm. */
  const prepareShare = async () => {
    const frames = exportable();
    if (!frames.length) return;
    const version = getFrameState().version;
    try {
      const files: File[] = [];
      for (let i = 0; i < frames.length; i++) {
        patch({ prepare: `Đang chuẩn bị ${i + 1}/${frames.length}` });
        const b = await blobFor(frames[i], mimeOf(getFrameState().batch.format));
        files.push(new File([b], nameFor(frames[i]), { type: b.type }));
        await tick();
      }
      // Chrome nhận tối đa 10 file và 50 MB mỗi lần chia sẻ.
      const batches: File[][] = [];
      let cur: File[] = [];
      let bytes = 0;
      for (const file of files) {
        if (cur.length && (cur.length >= 10 || bytes + file.size > 50 * 1048576)) {
          batches.push(cur);
          cur = [];
          bytes = 0;
        }
        cur.push(file);
        bytes += file.size;
      }
      if (cur.length) batches.push(cur);
      setPrepared({ version, batches });
    } catch (e) {
      showToast({ title: 'Không chuẩn bị được', description: errMsg(e), variant: 'error' });
    } finally {
      patch({ prepare: null });
    }
  };

  /** Bước 2: gọi navigator.share ngay trong cú bấm. */
  const shareBatch = async (batch: File[]) => {
    try {
      await navigator.share({ files: batch });
    } catch (e) {
      if (!isAbort(e)) showToast({ title: 'Không chia sẻ được', description: errMsg(e), variant: 'error' });
    }
  };

  return { busy, prepared, support, copy, download, share, zipAll, prepareShare, shareBatch };
}

export type FrameExporter = ReturnType<typeof useFrameExport>;
