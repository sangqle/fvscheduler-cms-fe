'use client';

import * as React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Database,
  ExternalLink,
  FileX,
  Info,
  Paperclip,
  Stethoscope,
  Trash2,
  UserX,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SlideOver } from '@/components/ui/SlideOver';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { KeyValue, KeyValueList } from '@/components/admin/shared/KeyValue';
import { BookingStatusBadge } from '@/components/admin/workspaces/BookingStatusBadge';
import {
  BOOKING_NOTE_AUDIENCE,
  BOOKING_PAYMENT_KIND,
  BOOKING_PAYMENT_STATUS,
  BOOKING_PAYMENT_STATUS_LONG,
  CLIENT_ALBUM_ROLE,
} from '@/lib/admin/labels';
import { bookingLabel, bookingStaffing, sumOf } from '@/lib/admin/booking';
import { cn, formatCurrency, formatDateTime, shortId } from '@/lib/utils';
import type { AdminBookingRow } from '@/types/admin';
import type { BookingNote, BookingSession } from '@/types/booking';

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** `11/09 08:30` — ngày giờ ngắn cho danh sách trong drawer, năm đã có ở header. */
function dayTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Section({
  title,
  hint,
  children,
  className,
}: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('flex flex-col gap-3 rounded-2xl border border-border bg-card p-4', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <h4 className="text-sm font-bold text-foreground">{title}</h4>
        {hint}
      </div>
      {children}
    </section>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <Text variant="caption" muted className="font-mono" as="span">
      {children}
    </Text>
  );
}

/** Ô thông tin nền mờ, dùng cho câu giải thích cuối một khối. */
function Note({ children, intent = 'muted' }: { children: React.ReactNode; intent?: 'muted' | 'info' }) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-xl p-2.5 text-[11px] leading-snug',
        intent === 'info' ? 'bg-info/10 text-info-deep' : 'bg-muted text-muted-foreground',
      )}
    >
      <Info className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/**
 * Cặp "số lưu sẵn" và "cộng từ danh sách bên dưới".
 *
 * Cố ý **không cờ, không màu phán xét**: màn này để người vận hành đặt hai con số cạnh nhau và tự
 * trừ, không phải để app tuyên bố dữ liệu của tenant sai. Lệch nhau hay không là câu người đọc kết
 * luận, sau khi nhìn cả hai.
 */
function StoredVsSum({
  storedValue,
  storedKey,
  sumLabel,
  sumValue,
  sumKey,
}: {
  storedValue: number;
  storedKey: string;
  sumLabel: string;
  sumValue: number;
  sumKey: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: 'Hệ thống lưu sẵn', value: storedValue, key: storedKey },
        { label: sumLabel, value: sumValue, key: sumKey },
      ].map((tile) => (
        <div key={tile.key} className="flex flex-col gap-0.5 rounded-xl border border-border p-2.5">
          <span className="text-[11px] text-muted-foreground">{tile.label}</span>
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(tile.value)}
          </span>
          <span className="font-mono text-[10px] text-muted-foreground">{tile.key}</span>
        </div>
      ))}
    </div>
  );
}

function CopyChip({ label, value }: { label: string; value: string }) {
  const { showToast } = useToast();
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-2.5 py-1.5">
      <span className="font-mono text-[11px] text-muted-foreground">{label}</span>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            showToast({ title: `Đã chép ${label}`, variant: 'success', duration: 2000 });
          } catch {
            showToast({ title: 'Không chép được, hãy bôi đen để chép tay', variant: 'warning' });
          }
        }}
        className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-foreground hover:text-primary"
      >
        {value}
        <Copy className="size-2.5" />
      </button>
    </div>
  );
}

/** Mốc thời gian đặt cạnh đúng khóa tháng sinh ra nó: lệch giữa hai bên mới là thứ đáng nhìn. */
function DiagnosticRow({ stamp, stampValue, month, monthValue }: { stamp: string; stampValue: string | null; month: string; monthValue: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { key: stamp, value: stampValue ? formatDateTime(stampValue) : 'null' },
        { key: month, value: monthValue ?? 'null' },
      ].map((cell) => (
        <div key={cell.key} className="flex items-center justify-between gap-2 rounded-lg bg-muted px-2.5 py-1.5">
          <span className="font-mono text-[11px] text-muted-foreground">{cell.key}</span>
          <span
            className={cn(
              'font-mono text-[11px] tabular-nums',
              cell.value === 'null' ? 'text-muted-foreground/70' : 'text-foreground',
            )}
          >
            {cell.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Ghi chú cắt ở 3 dòng rồi mở tại chỗ: một ghi chú dài không được đẩy cả drawer xuống. */
function NoteCard({ note }: { note: BookingNote }) {
  const [open, setOpen] = React.useState(false);
  const audience = BOOKING_NOTE_AUDIENCE[note.audience];
  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-border p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {audience.label && (
          <Badge variant={audience.variant} size="sm" mono={false}>
            {audience.label}
          </Badge>
        )}
        <span className="text-xs font-medium text-foreground">{note.createdBy?.displayName ?? 'Không rõ tác giả'}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{dayTime(note.createdAt)}</span>
      </div>
      <p className={cn('text-xs leading-relaxed text-foreground', !open && 'line-clamp-3')}>{note.content}</p>
      <Button variant="link" size="sm" className="self-start" onClick={() => setOpen((v) => !v)}>
        {open ? 'Thu gọn' : 'Xem thêm'}
        {open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
      </Button>
    </li>
  );
}

function SessionCard({ session, index, isMirrorSource }: { session: BookingSession; index: number; isMirrorSource: boolean }) {
  return (
    <li className={cn('flex flex-col gap-2 rounded-xl border p-2.5', isMirrorSource ? 'border-primary/40 bg-primary-50' : 'border-border')}>
      <div className="flex items-start gap-2.5">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-secondary font-mono text-[11px] font-semibold text-secondary-foreground">
          {session.seq ?? index + 1}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-xs font-semibold text-foreground">{session.name ?? `Buổi ${session.seq ?? index + 1}`}</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {dayTime(session.startAt)} → {hhmm(session.endAt)} · room {session.roomId ? shortId(session.roomId) : 'null'} ·
            shift {session.shiftId ? shortId(session.shiftId) : 'null'}
          </span>
        </span>
        {isMirrorSource && (
          <span className="shrink-0 text-[10px] text-primary">nguồn của bản sao cấp trên</span>
        )}
      </div>
      {(session.shootingLocation?.label || session.note) && (
        <p className="text-[11px] leading-snug text-muted-foreground">
          {session.shootingLocation?.label}
          {session.shootingLocation?.label && session.note ? ' · ghi chú: ' : ''}
          {session.note}
        </p>
      )}
      {session.slots.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {session.slots.map((slot) => (
            <li key={slot.id}>
              {slot.member ? (
                <Badge variant="secondary" size="sm" mono={false} className="gap-1.5">
                  {slot.member.displayName ?? shortId(slot.member.id)}
                  {slot.role?.code && <span className="font-mono text-[9.5px] opacity-75">{slot.role.code}</span>}
                </Badge>
              ) : (
                <Badge variant="warning" size="sm" mono={false} className="gap-1.5">
                  <UserX className="size-2.5" />
                  Chưa ai nhận
                  {slot.role?.code && <span className="font-mono text-[9.5px] opacity-75">{slot.role.code}</span>}
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Panel chi tiết một booking: nửa `booking` của tenant xếp cạnh nửa `admin` của CMS.
 *
 * Nguyên tắc của màn này là **đặt số lưu sẵn ngay trên danh sách sinh ra nó** — `contractTotal`
 * trên `items[]`, `paidAmount` trên `payments[]`, `costTotal` trên `freelancers[]` — chứ không phán
 * xét hộ. Dòng đã tombstone không còn nửa tenant nên các con số đứng một mình.
 */
export function BookingDrawer({
  row,
  open,
  onClose,
  onPrev,
  onNext,
  position,
  total,
}: {
  row: AdminBookingRow | null;
  open: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  /** Vị trí 1-based trong trang đang xem. */
  position: number;
  total: number;
}) {
  const booking = row?.booking ?? null;
  const meta = row?.admin;
  const label = row ? bookingLabel(row) : null;

  return (
    <SlideOver open={open} onOpenChange={(o) => !o && onClose()} title={`Booking ${meta?.id ?? ''}`}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-foreground">
              {booking ? label?.text : `#${meta?.rawId ?? ''}`}
            </h3>
            {booking ? (
              <BookingStatusBadge status={booking.status} />
            ) : (
              <Badge variant="muted" size="sm">
                <Trash2 className="size-2.5" />
                ĐÃ XÓA
              </Badge>
            )}
            {meta && (
              <Badge variant={BOOKING_PAYMENT_STATUS[meta.totals.paymentStatus].variant} size="sm" mono={false}>
                {BOOKING_PAYMENT_STATUS_LONG[meta.totals.paymentStatus]}
              </Badge>
            )}
          </div>
          {meta && (
            <Text variant="caption" muted className="mt-1">
              <span className="font-mono">{shortId(meta.id)}</span>
              {booking ? (
                <>
                  {' · '}Tạo {formatDateTime(booking.createdAt)}
                  {booking.createdByMembership?.displayName && ` bởi ${booking.createdByMembership.displayName}`}
                  {' · '}Sửa {formatDateTime(booking.updatedAt)}
                </>
              ) : (
                meta.deletedAt && <> · Xóa {formatDateTime(meta.deletedAt)}</>
              )}
            </Text>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Booking trước" onClick={onPrev} disabled={position <= 1}>
            <ChevronUp className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Booking sau" onClick={onNext} disabled={position >= total}>
            <ChevronDown className="size-4" />
          </Button>
          <span className="px-1 font-mono text-[11px] tabular-nums text-muted-foreground">
            {position} / {total}
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Đóng" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-5">
        {!row || !meta ? null : booking ? (
          <LiveBody row={row} />
        ) : (
          <DeletedBody row={row} />
        )}
      </div>
    </SlideOver>
  );
}

/** Nửa tenant còn sống: mọi khối đều có danh sách nguồn để đặt cạnh con số lưu sẵn. */
function LiveBody({ row }: { row: AdminBookingRow }) {
  const booking = row.booking!;
  const meta = row.admin;
  const first = booking.sessions[0];
  const itemsSum = sumOf(booking.items, (i) => i.unitPriceSnapshot);
  const paymentsSum = sumOf(booking.payments, (p) => p.amount);
  const freelancerSum = sumOf(booking.freelancers, (f) => f.amount);
  const staffing = bookingStaffing(booking);

  return (
    <div className="flex flex-col gap-3">
      <Section title="Booking này">
        <KeyValueList>
          <KeyValue label="Ngày chụp">
            <span className="font-mono text-xs">{formatDateTime(booking.startAt)} → {hhmm(booking.endAt)}</span>{' '}
            <span className="text-xs text-muted-foreground">· bản sao của buổi 1, xem khối Buổi chụp</span>
          </KeyValue>
          <KeyValue label="Chi nhánh">
            <span className="font-mono text-xs">{booking.branchId ? shortId(booking.branchId) : '—'}</span>
          </KeyValue>
          <KeyValue label="Phòng · Ca">
            <span className="font-mono text-xs">
              {booking.roomId ? shortId(booking.roomId) : 'null'} · {booking.shiftId ? shortId(booking.shiftId) : 'null'}
            </span>{' '}
            <span className="text-xs text-muted-foreground">· cũng là bản sao của buổi 1</span>
          </KeyValue>
          <KeyValue label="Địa điểm">
            {booking.shootingLocation?.label ?? '—'}
            {booking.shootingLocation?.mapUrl && (
              <>
                {' '}
                <a
                  href={booking.shootingLocation.mapUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Mở bản đồ
                  <ExternalLink className="size-3" />
                </a>
              </>
            )}
          </KeyValue>
          <KeyValue label="Người tạo">
            {booking.createdByMembership?.displayName ?? '—'}
            {booking.createdByMembership?.status && (
              <span className="text-xs text-muted-foreground"> · {booking.createdByMembership.status}</span>
            )}
          </KeyValue>
          <KeyValue label="Lãi gộp">
            {booking.grossProfit == null ? (
              '—'
            ) : (
              <>
                <span className="font-mono text-xs font-semibold">{formatCurrency(booking.grossProfit)}</span>{' '}
                <span className="font-mono text-[11px] text-muted-foreground">
                  grossProfit = contractTotal − costTotal
                </span>
              </>
            )}
          </KeyValue>
          <KeyValue label="extInfo">
            <span className="font-mono text-xs text-muted-foreground">
              {booking.extInfo && Object.keys(booking.extInfo).length > 0
                ? JSON.stringify(booking.extInfo)
                : '{} rỗng'}
            </span>
          </KeyValue>
        </KeyValueList>
      </Section>

      <Section title="Khách hàng">
        {booking.client ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">{booking.client.name ?? '—'}</span>
            <span className="font-mono text-xs text-muted-foreground">{booking.client.phone ?? '—'}</span>
            <span className="text-xs text-muted-foreground">{booking.client.email ?? '—'}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {shortId(booking.client.id)}
              {booking.client.branchId && ` · chi nhánh ${shortId(booking.client.branchId)}`}
            </span>
          </div>
        ) : (
          <Text variant="body-sm" muted>
            Booking không gắn khách hàng nào.
          </Text>
        )}
      </Section>

      <Section title="Dòng dịch vụ" hint={<Hint>booking.items[]</Hint>}>
        <StoredVsSum
          storedValue={meta.totals.contractTotal}
          storedKey="admin.totals.contractTotal"
          sumLabel={`Cộng ${booking.items.length} dòng bên dưới`}
          sumValue={itemsSum}
          sumKey="Σ items[].unitPriceSnapshot"
        />
        {booking.items.length === 0 ? (
          <Text variant="body-sm" muted>
            Booking chưa có dòng dịch vụ nào.
          </Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-1.5 pr-2 font-medium">nameSnapshot</th>
                  <th className="py-1.5 pr-2 font-medium">itemType</th>
                  <th className="py-1.5 pr-2 text-right font-medium">listPrice</th>
                  <th className="py-1.5 text-right font-medium">Giá chốt</th>
                </tr>
              </thead>
              <tbody>
                {booking.items.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-2 text-foreground">{item.nameSnapshot ?? '—'}</td>
                    <td className="py-2 pr-2">
                      <Badge variant="outline" size="sm" mono>
                        {item.itemType}
                      </Badge>
                    </td>
                    <td className="py-2 pr-2 text-right font-mono tabular-nums text-muted-foreground">
                      {item.listPrice == null ? 'null' : formatCurrency(item.listPrice)}
                    </td>
                    <td className="py-2 text-right font-mono font-semibold tabular-nums text-foreground">
                      {item.unitPriceSnapshot == null ? 'null' : formatCurrency(item.unitPriceSnapshot)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section title="Phiếu thu" hint={<Hint>payments[]</Hint>}>
        <StoredVsSum
          storedValue={meta.totals.paidAmount}
          storedKey="paidAmount"
          sumLabel={`Cộng ${booking.payments.length} phiếu`}
          sumValue={paymentsSum}
          sumKey="Σ payments[]"
        />
        {booking.payments.length === 0 ? (
          <Text variant="body-sm" muted>
            Chưa có phiếu thu nào.
          </Text>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {booking.payments.map((p) => (
              <li key={p.id} className="flex items-center gap-2.5 rounded-xl border border-border p-2.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-xs font-medium text-foreground">{BOOKING_PAYMENT_KIND[p.kind]}</span>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {p.kind} · {p.paidAt ? dayTime(p.paidAt) : 'chưa ghi ngày'}
                  </span>
                </span>
                <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                  {formatCurrency(p.amount)}
                </span>
                {p.fileKey && <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-label="có chứng từ" />}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Buổi chụp" hint={<Hint>sessions[] · nguồn thật của lịch</Hint>}>
        <ul className="flex flex-col gap-2">
          {booking.sessions.map((s, i) => (
            <SessionCard
              key={s.id}
              session={s}
              index={i}
              // Buổi 1 được tô nền tint để đối chiếu thẳng với khối "Booking này": một bản sao cũ
              // sai sẽ lộ ngay tại đây.
              isMirrorSource={i === 0 && !!first}
            />
          ))}
        </ul>
        <Note>
          <span className="font-mono">booking.startAt</span>, <span className="font-mono">endAt</span>,{' '}
          <span className="font-mono">roomId</span>, <span className="font-mono">shiftId</span> ở cấp trên chỉ chép lại
          buổi 1.
        </Note>
      </Section>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Section title="Nhân sự thuê ngoài" hint={<Hint>freelancers[]</Hint>}>
          <StoredVsSum
            storedValue={meta.totals.costTotal}
            storedKey="costTotal"
            sumLabel={`Cộng ${booking.freelancers.length} người`}
            sumValue={freelancerSum}
            sumKey="Σ freelancers[]"
          />
          {booking.freelancers.length === 0 ? (
            <Text variant="body-sm" muted>
              Không thuê ngoài ai.
            </Text>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {booking.freelancers.map((f) => (
                <li key={f.costId} className="flex items-center gap-2.5 rounded-xl border border-border p-2.5">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-xs font-medium text-foreground">{f.name ?? '—'}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {f.phone ?? '—'}
                      {f.role && ` · ${f.role}`}
                    </span>
                  </span>
                  <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                    {f.amount == null ? '—' : formatCurrency(f.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Note>
            Người thuê ngoài không có tài khoản trong hệ thống, khác hẳn <span className="font-mono">slots[]</span> ở
            khối Buổi chụp ({staffing.assigned}/{staffing.total} chỗ đã có người).
          </Note>
        </Section>

        <Section title="Album khách" hint={<Hint>clientAlbums[]</Hint>}>
          {booking.clientAlbums.length === 0 ? (
            <Text variant="body-sm" muted>
              Chưa gắn album nào.
            </Text>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {booking.clientAlbums.map((a) => (
                <li
                  key={a.albumId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border p-2.5"
                >
                  <span className="font-mono text-xs text-foreground">{shortId(a.albumId)}</span>
                  <Badge variant="secondary" size="sm" mono>
                    {CLIENT_ALBUM_ROLE[a.role]}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
          <Note>API chỉ trả id và vai trò, không có tên album.</Note>
        </Section>
      </div>

      <Section title="Ghi chú" hint={<Hint>notes[] · mới nhất trước</Hint>}>
        {booking.notes.length === 0 ? (
          <Text variant="body-sm" muted>
            Chưa có ghi chú nào.
          </Text>
        ) : (
          <ul className="flex flex-col gap-2">
            {booking.notes.map((n) => (
              <NoteCard key={n.id} note={n} />
            ))}
          </ul>
        )}
      </Section>

      <DiagnosticsSection row={row} withStartAt />
      <TechnicalIdsSection row={row} />
    </div>
  );
}

/** Dòng đã tombstone: chỉ còn nửa `admin`, nên các con số đứng một mình. */
function DeletedBody({ row }: { row: AdminBookingRow }) {
  const meta = row.admin;
  const tiles: { label: string; value: number; key: string }[] = [
    { label: 'Giá trị hợp đồng', value: meta.totals.contractTotal, key: 'contractTotal' },
    { label: 'Đã thu', value: meta.totals.paidAmount, key: 'paidAmount' },
    { label: 'Còn lại', value: meta.totals.outstandingAmount, key: 'outstandingAmount' },
    { label: 'Chi phí', value: meta.totals.costTotal, key: 'costTotal' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-2.5 rounded-2xl border border-dashed border-muted-foreground/50 bg-card p-3.5 text-xs leading-relaxed text-foreground">
        <FileX className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>
          Booking này đã bị xóa mềm nên <span className="font-mono">booking = null</span>: không còn tên, khách hàng,
          dòng dịch vụ, phiếu thu, buổi chụp, nhân sự hay ghi chú để hiển thị. Xóa booking là tombstone cả cây con.
          Những gì còn lại đều nằm ở nửa <span className="font-mono">admin</span>, đủ để tra rollup và đối chiếu trong DB.
        </span>
      </p>

      <Section title="Bốn cột tổng hợp còn lưu" hint={<Hint>admin.totals</Hint>}>
        <div className="grid grid-cols-2 gap-2">
          {tiles.map((t) => (
            <div key={t.key} className="flex flex-col gap-0.5 rounded-xl border border-border p-2.5">
              <span className="text-[11px] text-muted-foreground">{t.label}</span>
              <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(t.value)}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{t.key}</span>
            </div>
          ))}
        </div>
        <Note>
          Ở dòng còn sống, mỗi con số này đứng ngay trên danh sách sinh ra nó. Ở đây không còn{' '}
          <span className="font-mono">items[]</span>, <span className="font-mono">payments[]</span> hay{' '}
          <span className="font-mono">freelancers[]</span> để đặt cạnh, nên chúng đứng một mình: đó là giá trị lưu tại
          thời điểm xóa.
        </Note>
      </Section>

      <Section title="Người xóa">
        <KeyValueList>
          <KeyValue label="Thời điểm">
            <span className="font-mono text-xs">{meta.deletedAt ? formatDateTime(meta.deletedAt) : '—'}</span>
          </KeyValue>
          <KeyValue label="deletedByMembershipId">
            <span className="font-mono text-xs">
              {meta.deletedByMembershipId ? shortId(meta.deletedByMembershipId) : '—'}
            </span>
          </KeyValue>
        </KeyValueList>
      </Section>

      <DiagnosticsSection row={row} withStartAt={false} />
      <TechnicalIdsSection row={row} />
    </div>
  );
}

function DiagnosticsSection({ row, withStartAt }: { row: AdminBookingRow; withStartAt: boolean }) {
  const meta = row.admin;
  return (
    <Section
      title="Chẩn đoán"
      hint={
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Stethoscope className="size-3" aria-hidden />
          không phải dữ liệu nghiệp vụ
        </span>
      }
    >
      {withStartAt && row.booking && (
        <DiagnosticRow stamp="startAt" stampValue={row.booking.startAt} month="revenueMonth" monthValue={meta.revenueMonth} />
      )}
      <DiagnosticRow stamp="confirmedAt" stampValue={meta.confirmedAt} month="signedMonth" monthValue={meta.signedMonth} />
      <DiagnosticRow
        stamp="completedAt"
        stampValue={meta.completedAt}
        month="recognitionMonth"
        monthValue={meta.recognitionMonth}
      />
      {!withStartAt && (
        <DiagnosticRow stamp="revenueMonth" stampValue={null} month="revenueMonth" monthValue={meta.revenueMonth} />
      )}
      <Note>
        {withStartAt
          ? 'Mỗi khóa tháng đặt cạnh đúng cái mốc sinh ra nó, vì lệch giữa hai bên mới là thứ đáng nhìn.'
          : 'Không còn startAt để đặt cạnh revenueMonth, nên khóa tháng ở đây chỉ đọc được một chiều.'}
      </Note>
    </Section>
  );
}

function TechnicalIdsSection({ row }: { row: AdminBookingRow }) {
  const meta = row.admin;
  const chips: { label: string; value: number | string | null | undefined }[] = [
    { label: 'rawId', value: meta.rawId },
    { label: 'rawBranchId', value: meta.rawBranchId },
    { label: 'rawClientId', value: meta.rawClientId },
    { label: 'rawRoomId', value: meta.rawRoomId },
    { label: 'rawShiftId', value: meta.rawShiftId },
    { label: 'rawCreatedBy', value: meta.rawCreatedByMembershipId },
    { label: 'rawDeletedBy', value: meta.rawDeletedByMembershipId },
    { label: 'id opaque', value: meta.id },
  ];
  return (
    <Section
      title="Id kỹ thuật"
      hint={
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Database className="size-3" aria-hidden />
          khóa chính trong DB · dùng để chạy SQL đối chiếu
        </span>
      }
    >
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {chips
          .filter((c) => c.value != null)
          .map((c) => (
            <CopyChip key={c.label} label={c.label} value={String(c.value)} />
          ))}
      </div>
      <Note intent="info">
        Id thô <b className="font-semibold">không gọi API được</b>, mọi URL vẫn phải dùng id opaque. Chúng chỉ để dán vào
        câu SQL khi cần đối chiếu thẳng trong DB. Trường nào null thì không hiện ô.
      </Note>
    </Section>
  );
}
