/**
 * Khung ảnh mạng xã hội (Tiện ích › Khung ảnh). Công cụ chạy hoàn toàn trong trình duyệt nên không có
 * DTO backend: đây là kiểu dữ liệu của bộ vẽ canvas và store phía client.
 */

export type FrameRatioId = '4:5' | '3:4' | '2:3' | '1:1' | 'custom';
export type FrameOrientation = 'portrait' | 'landscape';
export type FrameBgKind = 'solid' | 'gradient' | 'blur';
export type FrameExportSize = 'standard' | 'large' | 'native';
export type FrameExportFormat = 'png' | 'jpeg';
export type FrameScope = 'batch' | 'frame';

/** Thiết lập chỉnh riêng được cho từng khung (ghi đè thiết lập chung). */
export interface FrameLook {
  ratio: FrameRatioId;
  customW: number;
  customH: number;
  orientation: FrameOrientation;
  bgKind: FrameBgKind;
  bgColor: string;
  gradFrom: string;
  gradTo: string;
  gradAngle: number;
  /** % cạnh ngắn của khung, mỗi cạnh. */
  padding: number;
  /** % cạnh ngắn của khung, giữa hai ảnh trong cặp. */
  gap: number;
  /** Tự động: chỉ bo ảnh dọc kiểu điện thoại (W/H < 0,6), khoảng 4% cạnh ngắn của ảnh. */
  radiusAuto: boolean;
  /** % cạnh ngắn của ảnh, khi tắt tự động. */
  radius: number;
  shadow: boolean;
  /** Cho kéo ảnh ra ngoài mép khung (phần tràn bị cắt) và cho hai ảnh đè nhau. */
  overflow: boolean;
}

/** Thiết lập chỉ có ở cấp lô. */
export interface FrameBatchSettings {
  /** Chỉ áp cho ảnh thêm vào sau đó. */
  perFrame: 1 | 2;
  allowUpscale: boolean;
  size: FrameExportSize;
  format: FrameExportFormat;
}

export type SourceImageStatus = 'decoding' | 'ready' | 'error';

export interface SourceImage {
  id: string;
  name: string;
  file: File;
  status: SourceImageStatus;
  /** Kích thước gốc (điểm ảnh), có sau khi giải mã. */
  width: number;
  height: number;
  /** Bản thu nhỏ cạnh dài ~1400px cho khung xem trước. Ảnh gốc chỉ giải mã lúc xuất. */
  preview: HTMLCanvasElement | null;
  /** Bản thu nhỏ cạnh dài ~320px cho dải khung và nền mờ. */
  thumb: HTMLCanvasElement | null;
}

/** Một ô ảnh trong khung. `ox`/`oy` là độ lệch so với vị trí tự động, theo tỉ lệ khung (0..1). */
export interface FrameSlot {
  imageId: string;
  ox: number;
  oy: number;
  /** Hệ số nhân so với cỡ tự khớp. */
  scale: number;
}

export interface ImageFrame {
  id: string;
  slots: FrameSlot[];
  override: Partial<FrameLook> | null;
  /** Khung đơn do lần tự ghép đôi để lại, ảnh dọc kế tiếp sẽ lấp vào. */
  awaitingPair: boolean;
  /** Đã bị kéo, thu phóng, tách, ghép, đổi thứ tự, thay ảnh: "Xếp lại cả lô" phải hỏi trước. */
  edited: boolean;
}

export interface FrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameSize {
  W: number;
  H: number;
  /** Cỡ Gốc vượt trần canvas nên đã hạ xuống. */
  capped: boolean;
}

export interface FrameLayout {
  W: number;
  H: number;
  safe: FrameRect;
  /** Vị trí tự động của từng ảnh, trước khi áp `ox`/`oy`/`scale`. */
  bases: FrameRect[];
  /** Vị trí thật để vẽ. `native` = điểm ảnh xuất trên mỗi điểm ảnh gốc (1 là đúng 100%). */
  rects: (FrameRect & { native: number })[];
  /** Ảnh bị giữ ở 100% điểm ảnh gốc vì không phóng to ngầm. */
  limitedByNative: boolean;
}

/** Ảnh chọn để vẽ, kèm kích thước nguồn thật của nó. */
export interface DrawSource {
  src: CanvasImageSource;
  w: number;
  h: number;
}
