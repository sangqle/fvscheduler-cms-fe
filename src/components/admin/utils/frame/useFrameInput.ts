'use client';

import * as React from 'react';
import { addFiles } from '@/lib/frame/store';

let pasteSeq = 0;
const extOf = (type: string) => (type.split('/')[1] || 'png').replace('jpeg', 'jpg');

/** Lấy file ảnh từ clipboard hoặc từ cú thả. Ảnh dán thường tên `image.png`, đổi tên cho dễ phân biệt. */
export function imageFilesFrom(dt: DataTransfer | null): File[] {
  if (!dt) return [];
  const files = Array.from(dt.files ?? []).filter(
    (f) => (f.type || '').startsWith('image/') || /\.(png|jpe?g|webp|heic|heif|gif|avif)$/i.test(f.name || ''),
  );
  if (!files.length && dt.items) {
    for (const it of Array.from(dt.items)) {
      if (it.kind !== 'file') continue;
      const f = it.getAsFile();
      if (f && (f.type || '').startsWith('image/')) files.push(f);
    }
  }
  return files.map((f) =>
    f.name && f.name !== 'image.png' ? f : new File([f], `anh-dan-${++pasteSeq}.${extOf(f.type || 'image/png')}`, { type: f.type || 'image/png' }),
  );
}

/** Nút "Dán ảnh": đọc clipboard bằng API (điện thoại không có ⌘V khi không có ô nhập). */
export async function readClipboardImages(): Promise<File[]> {
  if (!navigator.clipboard?.read) {
    throw new Error('Trình duyệt không cho đọc clipboard bằng nút. Hãy dùng ⌘V/Ctrl+V hoặc chọn file.');
  }
  const items = await navigator.clipboard.read();
  const files: File[] = [];
  for (const item of items) {
    const type = item.types.find((t) => t === 'image/png') ?? item.types.find((t) => t.startsWith('image/'));
    if (!type) continue;
    const blob = await item.getType(type);
    files.push(new File([blob], `anh-dan-${++pasteSeq}.${extOf(type)}`, { type }));
  }
  return files;
}

/**
 * Dán (⌘V/Ctrl+V) ở bất kỳ đâu trên trang khi focus không nằm trong ô nhập, và kéo thả nhiều file vào
 * trang. Chỉ nghe trong lúc tab Khung ảnh đang mở.
 */
export function useFrameInput(): { dropActive: boolean } {
  const [dropActive, setDropActive] = React.useState(false);

  React.useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) return;
      const files = imageFilesFrom(e.clipboardData);
      if (!files.length) return;
      e.preventDefault();
      addFiles(files);
    };
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types ?? []).includes('Files');
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth += 1;
      setDropActive(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDropActive(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDropActive(false);
      addFiles(imageFilesFrom(e.dataTransfer));
    };
    document.addEventListener('paste', onPaste);
    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragover', onOver);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      document.removeEventListener('paste', onPaste);
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  return { dropActive };
}
