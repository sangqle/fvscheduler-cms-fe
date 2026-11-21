'use client';

import * as React from 'react';
import {
  Archive,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  ClipboardPaste,
  Combine,
  Crosshair,
  ImagePlus,
  LayoutGrid,
  RotateCcw,
  Scissors,
  Share2,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ColorSwatchPicker, type ColorSwatch } from '@/components/ui/ColorSwatchPicker';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Slider } from '@/components/ui/Slider';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { cn } from '@/lib/utils';
import {
  constrainMove,
  effectiveLook,
  frameErrorImage,
  frameReady,
  maxScaleFor,
  ratioWH,
  type FrameView,
} from '@/lib/frame/engine';
import { PLATFORM_CHECKED_AT, platformFits } from '@/lib/frame/platforms';
import {
  deleteFrame,
  getImage,
  mergeWithNext,
  moveFrame,
  needsReflowConfirm,
  reflowAll,
  resetOverride,
  resetSlotPosition,
  selectSlot,
  selectedFrame,
  setBatch,
  setLook,
  setScope,
  splitFrame,
  swapSlots,
  updateSlot,
  type FrameToolState,
} from '@/lib/frame/store';
import type {
  FrameBgKind,
  FrameExportFormat,
  FrameExportSize,
  FrameOrientation,
  FrameRatioId,
  FrameScope,
} from '@/types/imageFrame';
import type { FrameExporter } from './useFrameExport';

const RATIO_OPTIONS = [
  { value: '4:5', label: '4:5' },
  { value: '3:4', label: '3:4' },
  { value: '2:3', label: '2:3' },
  { value: '1:1', label: '1:1' },
  { value: 'custom', label: 'Tùy chỉnh' },
];

const SWATCHES: ColorSwatch[] = [
  { hex: '#000000', label: 'Đen' },
  { hex: '#18181B', label: 'Than' },
  { hex: '#3F3F46', label: 'Xám đậm' },
  { hex: '#FFFFFF', label: 'Trắng' },
  { hex: '#F4F1EA', label: 'Kem' },
  { hex: '#A020C0', label: 'Tím' },
  { hex: '#1E3A8A', label: 'Xanh đậm' },
];

const SIZE_NOTES: Record<FrameExportSize, string> = {
  standard: 'Ngang 1440, cạnh dài tối đa 2048 · nét nhất cho Threads, Instagram.',
  large: 'Cạnh dài 2048 · nét nhất cho Facebook; Threads sẽ thu về 1440 ngang.',
  native: 'Giữ 100% điểm ảnh gốc · để lưu trữ; Threads và Facebook sẽ tự thu nhỏ.',
};

const FORMAT_NOTES: Record<FrameExportFormat, string> = {
  png: 'Không mất chi tiết, nên dùng cho ảnh giao diện. Chép ảnh luôn là PNG.',
  jpeg: 'Nhẹ hơn, nhưng chữ và biểu tượng màu có thể nhòe nhẹ. Chép ảnh vẫn là PNG.',
};

const pct = (v: number) => `${String(+v.toFixed(1)).replace('.', ',')}%`;

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="overline" muted>
      {children}
    </Text>
  );
}

function Note({ children, warn }: { children: React.ReactNode; warn?: boolean }) {
  return <p className={cn('text-xs leading-normal', warn ? 'text-warning-deep' : 'text-muted-foreground')}>{children}</p>;
}

function Field({ label, note, children }: { label: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-foreground">{label}</p>
      {children}
      {note ? <Note>{note}</Note> : null}
    </div>
  );
}

function CheckRow({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-foreground">
      <Checkbox checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5" />
      <span>{children}</span>
    </label>
  );
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <input
      type="color"
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 w-10 cursor-pointer rounded-md border border-border bg-card p-0.5"
    />
  );
}

interface FramePanelProps {
  state: FrameToolState;
  view: FrameView | null;
  exporter: FrameExporter;
  coarse: boolean;
  onReplacePick: () => void;
  onReplacePaste: () => void;
}

/** Bảng thiết lập: khung (chung hoặc riêng), khung đang chọn, lô ảnh, xuất. */
export function FramePanel({ state, view, exporter, coarse, onReplacePick, onReplacePaste }: FramePanelProps) {
  const { showToast } = useToast();
  const [confirmReflow, setConfirmReflow] = React.useState(false);
  const f = selectedFrame(state);
  const idx = f ? state.frames.indexOf(f) : -1;
  const look = state.scope === 'frame' && f ? effectiveLook(state.look, f) : state.look;
  const wh = ratioWH(look);
  const fits = platformFits(wh.w / wh.h);
  const scopeKey = `${state.scope}-${f?.id ?? 'none'}`;

  const fReady = !!f && frameReady(f, getImage) && !frameErrorImage(f, getImage);
  const pair = !!f && f.slots.length === 2;
  const slotIndex = f && state.selectedSlot < f.slots.length ? state.selectedSlot : 0;
  const slot = f?.slots[slotIndex];
  const next = idx >= 0 ? state.frames[idx + 1] : undefined;
  const canMerge =
    !!f && !pair && !!next && next.slots.length === 1 && fReady && frameReady(next, getImage) && !frameErrorImage(next, getImage);
  const anyReady = state.frames.some((x) => frameReady(x, getImage) && !frameErrorImage(x, getImage));

  const zoomView = view && f && view.frame.id === f.id ? view : null;
  const zoomMax = zoomView && slot
    ? zoomView.look.overflow
      ? 400
      : Math.max(31, Math.round(slot.scale * 100), Math.floor(maxScaleFor(zoomView, slotIndex) * 100))
    : 100;
  const rect = zoomView?.layout.rects[slotIndex];
  const nativePct = rect ? Math.round(rect.native * 100) : 100;
  const upscaled = !!rect && rect.native > 1.0005;

  const onZoom = (value: number) => {
    if (!zoomView || !f || !slot) return;
    let s = value / 100;
    if (!zoomView.look.overflow) s = Math.min(s, maxScaleFor(zoomView, slotIndex));
    s = Math.max(0.3, s);
    const scaled: FrameView = {
      ...zoomView,
      frame: { ...zoomView.frame, slots: zoomView.frame.slots.map((x, j) => (j === slotIndex ? { ...x, scale: s } : x)) },
    };
    const res = constrainMove(scaled, slotIndex, slot.ox, slot.oy);
    updateSlot(f.id, slotIndex, { scale: s, ox: res.ox, oy: res.oy });
  };

  const applyHex = (raw: string) => {
    let v = raw.trim();
    if (!v.startsWith('#')) v = `#${v}`;
    if (/^#[0-9a-f]{6}$/i.test(v)) setLook('bgColor', v.toLowerCase());
    else showToast({ title: 'Mã màu phải có dạng #RRGGBB', variant: 'error' });
  };

  const onPerFrame = (n: 1 | 2) => {
    if (n === state.batch.perFrame) return;
    setBatch('perFrame', n);
    if (state.frames.length) {
      showToast({ title: 'Áp cho ảnh thêm sau', description: 'Muốn áp cho cả lô, bấm "Xếp lại cả lô".', variant: 'info' });
    }
  };

  const prepared = exporter.prepared;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4">
        <SectionTitle>Thiết lập khung</SectionTitle>

        <Field
          label="Áp cho"
          note={
            state.scope === 'frame'
              ? f?.override
                ? 'Khung này đang có thiết lập riêng.'
                : 'Thay đổi tiếp theo sẽ tạo thiết lập riêng cho khung này.'
              : 'Thay đổi áp cho mọi khung chưa có thiết lập riêng.'
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              size="sm"
              aria-label="Áp thiết lập cho"
              value={state.scope}
              onValueChange={(v) => setScope(v as FrameScope)}
              options={[
                { value: 'batch', label: 'Cả lô' },
                { value: 'frame', label: f ? `Khung ${idx + 1}` : 'Khung đang chọn', disabled: !f },
              ]}
            />
            {f?.override && state.scope === 'frame' && (
              <Button size="sm" variant="ghost" onClick={() => resetOverride(f.id)}>
                <RotateCcw /> Dùng lại thiết lập chung
              </Button>
            )}
          </div>
        </Field>

        <Field label="Tỉ lệ khung">
          <SegmentedControl
            size="sm"
            fullWidth
            aria-label="Tỉ lệ khung"
            value={look.ratio}
            onValueChange={(v) => setLook('ratio', v as FrameRatioId)}
            options={RATIO_OPTIONS}
          />
          {look.ratio === 'custom' && (
            <div className="flex items-center gap-2">
              <Input
                key={`cw-${scopeKey}`}
                size="sm"
                type="number"
                min={0.1}
                max={100}
                step={0.01}
                aria-label="Tỉ lệ ngang"
                defaultValue={look.customW}
                containerClassName="w-24"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n > 0 && n <= 100) setLook('customW', n);
                }}
              />
              <span className="text-muted-foreground">:</span>
              <Input
                key={`ch-${scopeKey}`}
                size="sm"
                type="number"
                min={0.1}
                max={100}
                step={0.01}
                aria-label="Tỉ lệ dọc"
                defaultValue={look.customH}
                containerClassName="w-24"
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n > 0 && n <= 100) setLook('customH', n);
                }}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Hướng</span>
            <SegmentedControl
              size="sm"
              aria-label="Hướng khung"
              value={look.orientation}
              disabled={look.ratio === 'custom' || look.ratio === '1:1'}
              onValueChange={(v) => setLook('orientation', v as FrameOrientation)}
              options={[
                { value: 'portrait', label: 'Dọc' },
                { value: 'landscape', label: 'Ngang' },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {fits.map(({ rule, fit, label }) => (
              <Badge key={rule.name} size="sm" variant={fit === 'ok' ? 'success' : fit === 'maybe' ? 'warning' : 'destructive'} title={rule.tip}>
                {fit === 'ok' ? '✓' : fit === 'maybe' ? '?' : '✗'} {label}
              </Badge>
            ))}
          </div>
          <Note>Ảnh đơn trong feed · ✓ hiện trọn, ✗ bị cắt, ? chưa chắc · tra cứu {PLATFORM_CHECKED_AT}</Note>
        </Field>

        <Field label="Nền">
          <SegmentedControl
            size="sm"
            fullWidth
            aria-label="Kiểu nền"
            value={look.bgKind}
            onValueChange={(v) => setLook('bgKind', v as FrameBgKind)}
            options={[
              { value: 'solid', label: 'Màu trơn' },
              { value: 'gradient', label: 'Gradient' },
              { value: 'blur', label: 'Mờ từ ảnh' },
            ]}
          />
          {look.bgKind === 'solid' && (
            <div className="flex flex-col gap-2">
              <ColorSwatchPicker aria-label="Màu nền" colors={SWATCHES} value={look.bgColor} onChange={(hex) => setLook('bgColor', hex.toLowerCase())} />
              <div className="flex items-center gap-2">
                <ColorInput value={look.bgColor} label="Chọn màu nền khác" onChange={(v) => setLook('bgColor', v)} />
                <Input
                  key={`hex-${scopeKey}-${look.bgColor}`}
                  size="sm"
                  aria-label="Mã màu nền"
                  defaultValue={look.bgColor.toUpperCase()}
                  containerClassName="w-28"
                  onBlur={(e) => applyHex(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyHex(e.currentTarget.value);
                  }}
                />
              </div>
            </div>
          )}
          {look.bgKind === 'gradient' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <ColorInput value={look.gradFrom} label="Màu đầu" onChange={(v) => setLook('gradFrom', v)} />
                <span className="text-muted-foreground">→</span>
                <ColorInput value={look.gradTo} label="Màu cuối" onChange={(v) => setLook('gradTo', v)} />
              </div>
              <Slider aria-label="Góc gradient" value={look.gradAngle} min={0} max={345} step={15} unit="°" onValueChange={(v) => setLook('gradAngle', v)} />
            </div>
          )}
          {look.bgKind === 'blur' && <Note>Nền làm mờ từ ảnh đầu tiên trong khung, phủ tối nhẹ để ảnh nổi lên.</Note>}
        </Field>

        <Field label="Lề">
          <Slider aria-label="Lề" value={look.padding} min={0} max={20} step={0.5} formatValue={pct} onValueChange={(v) => setLook('padding', v)} />
        </Field>
        <Field label="Khoảng giữa 2 ảnh">
          <Slider aria-label="Khoảng giữa 2 ảnh" value={look.gap} min={0} max={10} step={0.5} formatValue={pct} onValueChange={(v) => setLook('gap', v)} />
        </Field>
        <Field label="Bo góc" note="Bo góc che mất phần góc của ảnh.">
          <Slider
            aria-label="Bo góc"
            value={look.radius}
            min={0}
            max={15}
            step={0.5}
            disabled={look.radiusAuto}
            formatValue={(v) => (look.radiusAuto ? 'Tự động' : pct(v))}
            onValueChange={(v) => setLook('radius', v)}
          />
          <CheckRow checked={look.radiusAuto} onChange={(v) => setLook('radiusAuto', v)}>
            Tự động: chỉ bo ảnh điện thoại, vừa góc màn hình thật
          </CheckRow>
        </Field>
        <CheckRow checked={look.shadow} onChange={(v) => setLook('shadow', v)}>
          Đổ bóng (thấy rõ trên nền sáng)
        </CheckRow>
        <CheckRow checked={look.overflow} onChange={(v) => setLook('overflow', v)}>
          Cho tràn khung: kéo ảnh ra ngoài mép, phần tràn bị cắt
        </CheckRow>
      </section>

      {f && (
        <section className="flex flex-col gap-3 border-t border-border pt-4">
          <SectionTitle>
            {`Khung ${idx + 1}/${state.frames.length}`}
            {pair ? ` · ảnh ${slotIndex === 0 ? 'A' : 'B'}` : ''}
          </SectionTitle>
          {pair && (
            <SegmentedControl
              size="sm"
              aria-label="Ảnh đang chỉnh"
              value={String(slotIndex)}
              onValueChange={(v) => selectSlot(Number(v))}
              options={[
                { value: '0', label: 'Ảnh A' },
                { value: '1', label: 'Ảnh B' },
              ]}
            />
          )}
          {zoomView && slot && (
            <Field label="Thu phóng">
              <Slider aria-label="Thu phóng" value={Math.round(slot.scale * 100)} min={30} max={zoomMax} step={1} unit="%" onValueChange={onZoom} />
              <Note warn={upscaled}>
                {upscaled
                  ? `Đang phóng to ${nativePct}% điểm ảnh gốc, có thể nhòe.`
                  : `Ảnh được vẽ ở ${nativePct}% điểm ảnh gốc trong khung ${zoomView.size.W}×${zoomView.size.H}.`}
              </Note>
            </Field>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={!fReady} onClick={() => resetSlotPosition(f.id, slotIndex)}>
              <Crosshair /> Căn giữa lại
            </Button>
            <Button size="sm" variant="outline" onClick={onReplacePick}>
              <ImagePlus /> Thay ảnh
            </Button>
            <Button size="sm" variant="outline" onClick={onReplacePaste}>
              <ClipboardPaste /> Dán để thay
            </Button>
            <Button size="sm" variant="outline" disabled={!pair} onClick={() => swapSlots(f.id)}>
              <ArrowLeftRight /> Đổi chỗ
            </Button>
            <Button size="sm" variant="outline" disabled={!pair} onClick={() => splitFrame(f.id)}>
              <Scissors /> Tách
            </Button>
            <Button size="sm" variant="outline" disabled={!canMerge} onClick={() => mergeWithNext(f.id)}>
              <Combine /> Ghép với khung sau
            </Button>
            <Button size="icon-sm" variant="outline" aria-label="Đưa khung lên trước" disabled={idx <= 0} onClick={() => moveFrame(f.id, -1)}>
              <ArrowLeft />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              aria-label="Đưa khung ra sau"
              disabled={idx >= state.frames.length - 1}
              onClick={() => moveFrame(f.id, 1)}
            >
              <ArrowRight />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => deleteFrame(f.id)}>
              <Trash2 /> Xóa khung
            </Button>
          </div>
          <Note>Kéo ảnh trên khung xem trước để đổi vị trí · phím mũi tên dịch 0,5% (giữ Shift 5%) · bấm đúp để căn giữa lại.</Note>
        </section>
      )}

      <section className="flex flex-col gap-3 border-t border-border pt-4">
        <SectionTitle>Lô ảnh</SectionTitle>
        <Field
          label="Ảnh mỗi khung, áp cho ảnh thêm sau"
          note='Chế độ 2 ảnh chỉ tự ghép ảnh dọc; ảnh ngang luôn đứng riêng. Ghép tay bằng "Ghép với khung sau".'
        >
          <SegmentedControl
            size="sm"
            aria-label="Ảnh mỗi khung"
            value={String(state.batch.perFrame)}
            onValueChange={(v) => onPerFrame(v === '2' ? 2 : 1)}
            options={[
              { value: '1', label: '1 ảnh' },
              { value: '2', label: '2 ảnh cạnh nhau' },
            ]}
          />
        </Field>
        <CheckRow checked={state.batch.allowUpscale} onChange={(v) => setBatch('allowUpscale', v)}>
          Cho phóng to ảnh nhỏ (có thể nhòe)
        </CheckRow>
        <div>
          <Button
            size="sm"
            variant="outline"
            disabled={!state.frames.length}
            onClick={() => (needsReflowConfirm() ? setConfirmReflow(true) : reflowAll())}
          >
            <LayoutGrid /> Xếp lại cả lô
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-border pt-4">
        <SectionTitle>Xuất</SectionTitle>
        <Field label="Cỡ" note={SIZE_NOTES[state.batch.size]}>
          <SegmentedControl
            size="sm"
            fullWidth
            aria-label="Cỡ xuất"
            value={state.batch.size}
            onValueChange={(v) => setBatch('size', v as FrameExportSize)}
            options={[
              { value: 'standard', label: 'Chuẩn' },
              { value: 'large', label: 'Lớn' },
              { value: 'native', label: 'Gốc' },
            ]}
          />
        </Field>
        <Field label="Định dạng" note={FORMAT_NOTES[state.batch.format]}>
          <SegmentedControl
            size="sm"
            aria-label="Định dạng"
            value={state.batch.format}
            onValueChange={(v) => setBatch('format', v as FrameExportFormat)}
            options={[
              { value: 'png', label: 'PNG' },
              { value: 'jpeg', label: 'JPEG' },
            ]}
          />
        </Field>
        <div>
          <Button size="sm" variant="outline" disabled={!anyReady || !!exporter.busy.zip} onClick={exporter.zipAll}>
            {exporter.busy.zip ? <Spinner size="sm" /> : <Archive />} {exporter.busy.zip ?? 'Tải tất cả (.zip)'}
          </Button>
        </div>
        {coarse && <Note>Trên iPhone, file zip nằm trong app Tệp và phải giải nén trước khi đăng; nên dùng Chia sẻ.</Note>}
        {exporter.support.share && (
          <div className="flex flex-col gap-2">
            <div>
              <Button size="sm" variant="outline" disabled={!anyReady || !!exporter.busy.prepare} onClick={exporter.prepareShare}>
                {exporter.busy.prepare ? <Spinner size="sm" /> : <Share2 />} {exporter.busy.prepare ?? 'Chuẩn bị chia sẻ tất cả'}
              </Button>
            </div>
            {prepared &&
              (prepared.version !== state.version ? (
                <Note warn>Thiết lập đã đổi sau khi chuẩn bị, hãy chuẩn bị lại.</Note>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {prepared.batches.map((batch, i) => {
                    const start = prepared.batches.slice(0, i).reduce((s, b) => s + b.length, 0) + 1;
                    const end = start + batch.length - 1;
                    return (
                      <Button key={start} size="sm" onClick={() => exporter.shareBatch(batch)}>
                        <Share2 /> {batch.length === 1 ? `Chia sẻ ảnh ${start}` : `Chia sẻ ảnh ${start}-${end}`}
                      </Button>
                    );
                  })}
                </div>
              ))}
            <Note>
              Trên iPhone: Chia sẻ rồi chọn &quot;Lưu ảnh&quot; để đưa vào app Ảnh. Chia sẻ nhiều ảnh thẳng vào app Threads hoặc Facebook chưa
              được kiểm chứng.
            </Note>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmReflow}
        onOpenChange={setConfirmReflow}
        onCancel={() => setConfirmReflow(false)}
        title="Xếp lại cả lô?"
        description='Các khung sẽ được dựng lại theo thứ tự ảnh và chế độ "Ảnh mỗi khung" hiện tại. Vị trí đã kéo, thu phóng, tách, ghép, đổi thứ tự và thiết lập riêng của từng khung sẽ mất.'
        confirmLabel="Xếp lại"
        variant="warning"
        onConfirm={() => {
          reflowAll();
          setConfirmReflow(false);
        }}
      />
    </div>
  );
}
