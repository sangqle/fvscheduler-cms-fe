/**
 * Store cấp module của công cụ khung ảnh (`useSyncExternalStore`, không phải Zustand). Ảnh và khung sống
 * qua lần đổi tab và lần chuyển sang trang admin khác, mất khi tải lại trang, đóng tab hoặc đăng xuất.
 * Thiết lập chung và thiết lập lô nhớ trong `localStorage`. Ảnh không bao giờ được lưu bền hay gửi đi.
 *
 * Mỗi thay đổi thay object `state` mới (bản sao nông), nên React luôn thấy snapshot đổi.
 */
import { useSyncExternalStore } from 'react';
import type {
  FrameBatchSettings,
  FrameLook,
  FrameScope,
  FrameSlot,
  ImageFrame,
  SourceImage,
} from '@/types/imageFrame';
import {
  DEFAULT_BATCH,
  DEFAULT_LOOK,
  ERR_DECODE,
  MAX_IMAGES,
  decodeForPreview,
  releaseCanvas,
} from '@/lib/frame/engine';

export interface FrameToolState {
  look: FrameLook;
  batch: FrameBatchSettings;
  images: ReadonlyMap<string, SourceImage>;
  frames: ImageFrame[];
  selectedFrameId: string | null;
  selectedSlot: number;
  scope: FrameScope;
  /** Số ảnh mới đang chờ giải mã (chưa nằm trong khung nào). */
  decoding: number;
  /** Tăng mỗi lần nội dung đổi; không tăng khi chỉ đổi lựa chọn. */
  version: number;
}

export interface FrameNotice {
  title: string;
  description?: string;
  variant: 'default' | 'success' | 'error' | 'warning' | 'info';
}

const INITIAL: FrameToolState = {
  look: DEFAULT_LOOK,
  batch: DEFAULT_BATCH,
  images: new Map(),
  frames: [],
  selectedFrameId: null,
  selectedSlot: 0,
  scope: 'batch',
  decoding: 0,
  version: 0,
};

let state: FrameToolState = INITIAL;
const listeners = new Set<() => void>();
const noticeListeners = new Set<(n: FrameNotice) => void>();

function commit(patch: Partial<FrameToolState>, changed = true) {
  state = { ...state, ...patch, version: changed ? state.version + 1 : state.version };
  listeners.forEach((l) => l());
  syncUnloadGuard();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function getFrameState(): FrameToolState {
  return state;
}

export function useFrameTool(): FrameToolState {
  return useSyncExternalStore(subscribe, getFrameState, () => INITIAL);
}

export function getImage(id: string): SourceImage | undefined {
  return state.images.get(id);
}

export function selectedFrame(s: FrameToolState = state): ImageFrame | null {
  return s.frames.find((f) => f.id === s.selectedFrameId) ?? null;
}

export function onFrameNotice(cb: (n: FrameNotice) => void) {
  noticeListeners.add(cb);
  return () => {
    noticeListeners.delete(cb);
  };
}

function notify(n: FrameNotice) {
  noticeListeners.forEach((l) => l(n));
}

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- Thiết lập nhớ trong localStorage ----------

const LS_KEY = 'framevis-admin:khung-anh:v1';
let hydrated = false;

function pick<T extends object>(obj: unknown, defaults: T): Partial<T> {
  const out: Partial<T> = {};
  if (!obj || typeof obj !== 'object') return out;
  const src = obj as Record<string, unknown>;
  for (const k of Object.keys(defaults) as (keyof T & string)[]) {
    if (k in src && typeof src[k] === typeof defaults[k]) out[k] = src[k] as T[typeof k];
  }
  return out;
}

export function hydrateSettings() {
  if (hydrated || typeof window === 'undefined') return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { look?: unknown; batch?: unknown };
    const look = { ...DEFAULT_LOOK, ...pick(parsed.look, DEFAULT_LOOK) };
    const batch = { ...DEFAULT_BATCH, ...pick(parsed.batch, DEFAULT_BATCH) };
    if (batch.perFrame !== 1 && batch.perFrame !== 2) batch.perFrame = 1;
    commit({ look, batch }, false);
  } catch {
    // không đọc được thì chạy với mặc định
  }
}

function saveSettings(look: FrameLook, batch: FrameBatchSettings) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ look, batch }));
  } catch {
    // không lưu được thì thôi, chỉ là tiện lợi
  }
}

// ---------- Cảnh báo khi rời trang ----------

let unloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;
function syncUnloadGuard() {
  if (typeof window === 'undefined') return;
  const need = state.frames.length > 0;
  if (need && !unloadHandler) {
    unloadHandler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', unloadHandler);
  } else if (!need && unloadHandler) {
    window.removeEventListener('beforeunload', unloadHandler);
    unloadHandler = null;
  }
}

// ---------- Lựa chọn và thiết lập ----------

export function selectFrame(id: string) {
  commit({ selectedFrameId: id, selectedSlot: 0 }, false);
}

export function selectSlot(i: number) {
  commit({ selectedSlot: i }, false);
}

export function setScope(scope: FrameScope) {
  if (scope === 'frame' && !selectedFrame()) return;
  commit({ scope }, false);
}

/** Sửa thiết lập chung, hoặc thiết lập riêng của khung đang chọn khi "Áp cho" là khung đó. */
export function setLook<K extends keyof FrameLook>(key: K, value: FrameLook[K]) {
  const f = selectedFrame();
  if (state.scope === 'frame' && f) {
    commit({
      frames: state.frames.map((x) => (x.id === f.id ? { ...x, override: { ...(x.override ?? {}), [key]: value }, edited: true } : x)),
    });
    return;
  }
  const look = { ...state.look, [key]: value };
  commit({ look });
  saveSettings(look, state.batch);
}

export function resetOverride(frameId: string) {
  commit({ frames: state.frames.map((x) => (x.id === frameId ? { ...x, override: null } : x)) });
}

export function setBatch<K extends keyof FrameBatchSettings>(key: K, value: FrameBatchSettings[K]) {
  const batch = { ...state.batch, [key]: value };
  commit({ batch });
  saveSettings(state.look, batch);
}

// ---------- Thêm ảnh, giải mã, xếp vào khung ----------

const queue: string[] = [];
const selectOnPlace = new Set<string>();
const replaceTargets = new Map<string, { frameId: string; slot: number }>();
let pumping = false;

const newSlot = (imageId: string): FrameSlot => ({ imageId, ox: 0, oy: 0, scale: 1 });

function releaseImage(images: Map<string, SourceImage>, id: string) {
  const im = images.get(id);
  if (!im) return;
  releaseCanvas(im.preview);
  releaseCanvas(im.thumb);
  images.delete(id);
}

/** Ảnh dọc mới lấp vào khung đơn đang chờ ghép; ảnh ngang luôn đứng riêng. */
function placeImage(frames: ImageFrame[], im: SourceImage, perFrame: 1 | 2): { frames: ImageFrame[]; frameId: string; slot: number } {
  const portrait = im.status === 'ready' && im.width / im.height < 1;
  const last = frames[frames.length - 1];
  if (perFrame === 2 && portrait && last && last.awaitingPair && last.slots.length === 1) {
    const merged: ImageFrame = { ...last, slots: [...last.slots, newSlot(im.id)], awaitingPair: false };
    return { frames: [...frames.slice(0, -1), merged], frameId: merged.id, slot: 1 };
  }
  const f: ImageFrame = { id: uid(), slots: [newSlot(im.id)], override: null, awaitingPair: perFrame === 2 && portrait, edited: false };
  return { frames: [...frames, f], frameId: f.id, slot: 0 };
}

export function addFiles(files: File[]): { rejected: string[] } {
  const list = files.filter(Boolean);
  const room = Math.max(0, MAX_IMAGES - state.images.size);
  const accepted = list.slice(0, room);
  const rejected = list.slice(room).map((f) => f.name || 'ảnh dán');
  if (rejected.length) {
    notify({ title: `Tối đa ${MAX_IMAGES} ảnh mỗi lô`, description: `Đã bỏ: ${rejected.join(', ')}`, variant: 'error' });
  }
  if (!accepted.length) return { rejected };
  const images = new Map(state.images);
  accepted.forEach((file, i) => {
    const id = uid();
    images.set(id, { id, name: file.name || 'anh-dan.png', file, status: 'decoding', width: 0, height: 0, preview: null, thumb: null });
    queue.push(id);
    if (i === 0) selectOnPlace.add(id);
  });
  commit({ images, decoding: state.decoding + accepted.length });
  void pump();
  return { rejected };
}

export function startReplace(file: File) {
  const f = selectedFrame();
  if (!f || !file) return;
  const id = uid();
  const images = new Map(state.images);
  images.set(id, { id, name: file.name || 'anh-thay.png', file, status: 'decoding', width: 0, height: 0, preview: null, thumb: null });
  replaceTargets.set(id, { frameId: f.id, slot: state.selectedSlot });
  queue.push(id);
  commit({ images }, false);
  void pump();
}

function finishReplace(images: Map<string, SourceImage>, next: SourceImage, target: { frameId: string; slot: number }) {
  const f = state.frames.find((x) => x.id === target.frameId);
  if (next.status !== 'ready' || !f || !f.slots[target.slot]) {
    releaseImage(images, next.id);
    commit({ images }, false);
    if (next.status === 'error') notify({ title: 'Không thay được ảnh', description: ERR_DECODE, variant: 'error' });
    return;
  }
  releaseImage(images, f.slots[target.slot].imageId);
  const frames = state.frames.map((x) =>
    x.id === f.id ? { ...x, slots: x.slots.map((s, i) => (i === target.slot ? { ...s, imageId: next.id } : s)), edited: true } : x,
  );
  commit({ images, frames });
  notify({ title: 'Đã thay ảnh', description: 'Giữ nguyên vị trí và thu phóng.', variant: 'success' });
}

async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    while (queue.length) {
      const id = queue.shift() as string;
      const im = state.images.get(id);
      if (!im) continue;
      let next: SourceImage;
      try {
        const d = await decodeForPreview(im.file);
        next = { ...im, status: 'ready', width: d.width, height: d.height, preview: d.preview, thumb: d.thumb };
      } catch {
        next = { ...im, status: 'error' };
      }
      if (!state.images.has(id)) {
        releaseCanvas(next.preview);
        releaseCanvas(next.thumb);
        continue;
      }
      const images = new Map(state.images);
      images.set(id, next);
      const target = replaceTargets.get(id);
      if (target) {
        replaceTargets.delete(id);
        finishReplace(images, next, target);
      } else {
        const placed = placeImage(state.frames, next, state.batch.perFrame);
        const select = selectOnPlace.delete(id) || !state.selectedFrameId;
        commit({
          images,
          frames: placed.frames,
          decoding: Math.max(0, state.decoding - 1),
          ...(select ? { selectedFrameId: placed.frameId, selectedSlot: placed.slot } : {}),
        });
      }
      await new Promise((r) => setTimeout(r, 0));
    }
  } finally {
    pumping = false;
  }
}

// ---------- Sửa khung ----------

function mapFrame(frameId: string, fn: (f: ImageFrame) => ImageFrame) {
  return state.frames.map((x) => (x.id === frameId ? fn(x) : x));
}

export function updateSlot(frameId: string, i: number, patch: Partial<FrameSlot>) {
  commit({ frames: mapFrame(frameId, (x) => ({ ...x, slots: x.slots.map((s, j) => (j === i ? { ...s, ...patch } : s)), edited: true })) });
}

export function resetSlotPosition(frameId: string, i: number) {
  updateSlot(frameId, i, { ox: 0, oy: 0, scale: 1 });
}

export function deleteFrame(frameId: string) {
  const idx = state.frames.findIndex((f) => f.id === frameId);
  if (idx < 0) return;
  const images = new Map(state.images);
  state.frames[idx].slots.forEach((s) => releaseImage(images, s.imageId));
  const frames = state.frames.filter((f) => f.id !== frameId);
  const nf = frames[Math.min(idx, frames.length - 1)];
  commit({ images, frames, selectedFrameId: nf ? nf.id : null, selectedSlot: 0, scope: nf ? state.scope : 'batch' });
}

export function clearAll() {
  const images = new Map(state.images);
  [...images.keys()].forEach((id) => releaseImage(images, id));
  queue.length = 0;
  commit({ images, frames: [], selectedFrameId: null, selectedSlot: 0, scope: 'batch', decoding: 0 });
}

const resetPos = (s: FrameSlot): FrameSlot => ({ ...s, ox: 0, oy: 0, scale: 1 });

export function splitFrame(frameId: string) {
  const idx = state.frames.findIndex((f) => f.id === frameId);
  const f = state.frames[idx];
  if (!f || f.slots.length !== 2) return;
  const mk = (s: FrameSlot): ImageFrame => ({ id: uid(), slots: [resetPos(s)], override: f.override ? { ...f.override } : null, awaitingPair: false, edited: true });
  const f1 = mk(f.slots[0]);
  const f2 = mk(f.slots[1]);
  const frames = [...state.frames];
  frames.splice(idx, 1, f1, f2);
  commit({ frames, selectedFrameId: f1.id, selectedSlot: 0 });
}

export function mergeWithNext(frameId: string) {
  const idx = state.frames.findIndex((f) => f.id === frameId);
  const f = state.frames[idx];
  const next = state.frames[idx + 1];
  if (!f || !next || f.slots.length !== 1 || next.slots.length !== 1) return;
  const m: ImageFrame = {
    id: uid(),
    slots: [resetPos(f.slots[0]), resetPos(next.slots[0])],
    override: f.override ? { ...f.override } : null,
    awaitingPair: false,
    edited: true,
  };
  const frames = [...state.frames];
  frames.splice(idx, 2, m);
  commit({ frames, selectedFrameId: m.id, selectedSlot: 0 });
}

export function swapSlots(frameId: string) {
  const f = state.frames.find((x) => x.id === frameId);
  if (!f || f.slots.length !== 2) return;
  commit({
    frames: mapFrame(frameId, (x) => ({ ...x, slots: [resetPos(x.slots[1]), resetPos(x.slots[0])], edited: true })),
    selectedSlot: 1 - state.selectedSlot,
  });
}

export function moveFrame(frameId: string, dir: -1 | 1) {
  const i = state.frames.findIndex((f) => f.id === frameId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= state.frames.length) return;
  const frames = [...state.frames];
  [frames[i], frames[j]] = [frames[j], { ...frames[i], edited: true }];
  commit({ frames });
}

/** Có khung nào đã chỉnh tay (kéo, thu phóng, tách, ghép, đổi thứ tự, thay ảnh, thiết lập riêng) không. */
export function needsReflowConfirm(): boolean {
  return state.frames.some((f) => f.edited || f.override);
}

/** Dựng lại toàn bộ khung theo thứ tự ảnh và chế độ "Ảnh mỗi khung" hiện tại. */
export function reflowAll() {
  const ims = state.frames.flatMap((f) => f.slots.map((s) => state.images.get(s.imageId))).filter((im): im is SourceImage => !!im);
  let frames: ImageFrame[] = [];
  ims.forEach((im) => {
    frames = placeImage(frames, im, state.batch.perFrame).frames;
  });
  commit({ frames, selectedFrameId: frames[0]?.id ?? null, selectedSlot: 0 });
  notify({ title: 'Đã xếp lại cả lô', variant: 'success' });
}
