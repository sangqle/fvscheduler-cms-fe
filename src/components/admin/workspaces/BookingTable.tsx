"use client";

import * as React from "react";
import { ChevronRight, Copy, FileX, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { useToast } from "@/components/ui/ToastProvider";
import { RawId } from "@/components/admin/shared/RawId";
import { BookingStatusBadge } from "@/components/admin/workspaces/BookingStatusBadge";
import { BOOKING_PAYMENT_STATUS } from "@/lib/admin/labels";
import { bookingLabel, bookingStaffing } from "@/lib/admin/booking";
import {
  cn,
  formatCurrency,
  formatDate,
  formatDateTime,
  shortId,
} from "@/lib/utils";
import type { AdminBookingRow } from "@/types/admin";

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function CopyId({ id }: { id: string }) {
  const { showToast } = useToast();
  return (
    <button
      type="button"
      title={id}
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(id);
          showToast({
            title: "Đã chép bookingId",
            variant: "success",
            duration: 2000,
          });
        } catch {
          showToast({
            title: "Không chép được, hãy bôi đen để chép tay",
            variant: "warning",
          });
        }
      }}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {shortId(id)}
      <Copy className="size-2.5" />
    </button>
  );
}

/** Cột tiền: mono, canh phải, không xuống dòng. Một chỗ duy nhất để ba cột tiền không lệch nhau. */
function Money({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        "block whitespace-nowrap text-right font-mono text-xs tabular-nums",
        className,
      )}
    >
      {formatCurrency(value)}
    </span>
  );
}

const columns: ColumnDef<AdminBookingRow>[] = [
  {
    id: "rawId",
    header: "rawId",
    className: "w-16",
    cell: (r) => <RawId value={r.admin.rawId} />,
  },
  {
    id: "booking",
    header: "Booking",
    className: "min-w-[10vw]",
    cell: (r) => {
      const label = bookingLabel(r);
      return (
        <span className="flex flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-1.5">
            {r.booking ? (
              <>
                <span className="text-[13px] font-semibold text-foreground">
                  {label.text}
                </span>
                {label.fromClient && (
                  <Badge variant="outline" size="sm" mono={false}>
                    tên khách
                  </Badge>
                )}
              </>
            ) : (
              <span className="font-mono text-[13px] font-bold text-foreground">
                #{r.admin.rawId}
              </span>
            )}
            {r.admin.deletedAt && (
              <Badge variant="muted" size="sm">
                <Trash2 className="size-2.5" />
                ĐÃ XÓA
              </Badge>
            )}
          </span>
          <span className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
            <CopyId id={r.admin.id} />
          </span>
        </span>
      );
    },
  },
  {
    id: "shootAt",
    header: "Ngày chụp",
    className: "w-36",
    // Dòng đã tombstone không còn ngày chụp, khách hay trạng thái: ba ô trống cạnh nhau nói ít hơn
    // hẳn một ô nét đứt viết rõ vì sao trống.
    colSpan: (r) => (r.booking ? 1 : 3),
    cell: (r) =>
      r.booking ? (
        <span className="flex flex-col">
          <span className="font-mono text-xs tabular-nums text-foreground">
            {formatDate(r.booking.startAt)}
          </span>
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {hhmm(r.booking.startAt)} → {hhmm(r.booking.endAt)}
          </span>
        </span>
      ) : (
        <span className="flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/50 px-2.5 py-1.5">
          <FileX
            className="size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
          <span className="text-[11px] leading-snug text-foreground">
            Xóa lúc{" "}
            <b className="font-mono">
              {r.admin.deletedAt ? formatDateTime(r.admin.deletedAt) : "—"}
            </b>{" "}
            · cả cây con tombstone nên không còn ngày chụp, khách hay trạng thái
          </span>
        </span>
      ),
  },
  {
    id: "client",
    header: "Khách hàng",
    className: "min-w-[9vw]",
    cell: (r) =>
      r.booking?.client && (
        <span className="flex flex-col">
          <span className="text-[13px] text-foreground">
            {r.booking.client.name ?? "—"}
          </span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {r.booking.client.phone ?? "—"}
          </span>
        </span>
      ),
  },
  {
    id: "status",
    header: "Trạng thái",
    cell: (r) => r.booking && <BookingStatusBadge status={r.booking.status} />,
  },
  {
    id: "contract",
    header: "Hợp đồng",
    className: "text-right",
    cell: (r) => (
      <Money
        value={r.admin.totals.contractTotal}
        className="font-semibold text-foreground"
      />
    ),
  },
  {
    id: "paid",
    header: "Đã thu",
    className: "text-right",
    cell: (r) => (
      <Money
        value={r.admin.totals.paidAmount}
        className="text-muted-foreground"
      />
    ),
  },
  {
    id: "outstanding",
    header: "Còn lại",
    className: "text-right",
    cell: (r) => {
      const value = r.admin.totals.outstandingAmount;
      // Trả dư là xanh dương chứ không cam hay đỏ: khách trả thừa là chuyện bình thường, chỉ cần
      // nhìn ra chứ không cần cảnh báo.
      if (value >= 0)
        return <Money value={value} className="text-foreground" />;
      return (
        <span className="flex flex-col items-end gap-px">
          <Money value={value} className="font-semibold text-info-deep" />
          <Badge variant="info" size="sm" mono={false}>
            trả dư
          </Badge>
        </span>
      );
    },
  },
  {
    id: "paymentStatus",
    header: "Thu",
    cell: (r) => {
      const meta = BOOKING_PAYMENT_STATUS[r.admin.totals.paymentStatus];
      return (
        <Badge variant={meta.variant} size="sm" mono={false}>
          {meta.label}
        </Badge>
      );
    },
  },
  {
    id: "crew",
    header: "Nhân sự",
    cell: (r) => {
      if (!r.booking) return <span className="text-muted-foreground">—</span>;
      const { assigned, total } = bookingStaffing(r.booking);
      if (total > 0 && assigned === 0) {
        return (
          <Badge variant="warning" size="sm" mono="plain" className="gap-1">
            {assigned}/{total}
            <span className="font-sans font-semibold">trống</span>
          </Badge>
        );
      }
      return (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {assigned}/{total}
        </span>
      );
    },
  },
  {
    id: "sessions",
    header: "Buổi",
    className: "w-14",
    cell: (r) =>
      r.booking ? (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {r.booking.sessions.length}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "open",
    header: "",
    className: "w-10",
    cell: () => (
      <span className="flex justify-end text-muted-foreground">
        <ChevronRight className="size-4" aria-hidden />
      </span>
    ),
  },
];

/**
 * Bảng booking của một workspace. Bấm hàng nào cũng mở drawer chi tiết hàng đó.
 *
 * Dòng đã xóa **không** bị làm mờ: đây chính là thứ người ta bật công tắc `includeDeleted` để xem,
 * làm mờ thì mất luôn công dụng của cái công tắc. Cái tách nó khỏi dòng sống là rail xám đậm bên
 * trái, nhãn ĐÃ XÓA và ô nét đứt, không phải độ mờ.
 */
export function BookingTable({
  rows,
  isLoading,
  onOpen,
  openedId,
  page,
  pageCount,
  totalRows,
  pageSize,
  onPageChange,
  onPageSizeChange,
  emptyContent,
}: {
  rows: AdminBookingRow[];
  isLoading: boolean;
  onOpen: (row: AdminBookingRow) => void;
  openedId: string | null;
  page: number;
  pageCount: number;
  totalRows: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  emptyContent?: React.ReactNode;
}) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      rowKey={(r) => r.admin.id}
      isLoading={isLoading}
      onRowClick={onOpen}
      rowClassName={(r) =>
        cn(
          r.admin.deletedAt &&
            "border-l-[3px] border-l-muted-foreground bg-muted/40",
          openedId === r.admin.id && "bg-primary-50",
        )
      }
      mobileCards
      paginated
      manualPagination
      pageIndex={page}
      pageCount={pageCount}
      totalRows={totalRows}
      defaultPageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      emptyContent={emptyContent}
    />
  );
}
