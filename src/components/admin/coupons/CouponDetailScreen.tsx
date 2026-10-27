'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Heading } from '@/components/ui/Heading';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { ErrorState, NotFoundState, isNotFound } from '@/components/admin/shared/QueryState';
import { CouponConfigCard } from '@/components/admin/coupons/CouponConfigCard';
import { CouponDetailSkeleton } from '@/components/admin/coupons/CouponSkeletons';
import { CouponFormDialog } from '@/components/admin/coupons/CouponFormDialog';
import { CouponStats } from '@/components/admin/coupons/CouponStats';
import { DeleteCouponDialog } from '@/components/admin/coupons/DeleteCouponDialog';
import { RedemptionTable } from '@/components/admin/coupons/RedemptionTable';
import { ToggleCouponDialog } from '@/components/admin/coupons/ToggleCouponDialog';
import { useAdminCoupon, useCouponRedemptions } from '@/hooks/useAdminCoupons';
import { useAdminPlans } from '@/hooks/useAdminPlans';
import { toInt, useReturnHref, useUrlState } from '@/hooks/useUrlState';
import { apiErrorMessage } from '@/lib/api/auth';
import { normalizeCouponCode } from '@/lib/admin/coupons';
import { COUPON_STATE } from '@/lib/admin/labels';
import { formatVnDateTime } from '@/lib/admin/time';
import type { AdminCoupon } from '@/types/admin';

const DEFAULT_SIZE = 20;

/** Chi tiết một mã: bộ đếm, cấu hình, sổ lượt dùng; sửa, bật / tắt và xóa ở đầu màn. `?page=&size=` phân trang sổ. */
export function CouponDetailScreen({ code: rawCode }: { code: string }) {
  // Backend đọc mã như mã gõ tay; chuẩn hóa ở đây để `/coupons/nam10` dùng chung cache với `NAM10`.
  const code = normalizeCouponCode(rawCode);
  const { get, set } = useUrlState();
  const backHref = useReturnHref('/coupons');
  const { showToast } = useToast();
  const page = toInt(get('page'), 0);
  const size = toInt(get('size'), DEFAULT_SIZE) || DEFAULT_SIZE;

  const query = useAdminCoupon(code);
  const ledger = useCouponRedemptions(code, { page, size });
  const { data: plans } = useAdminPlans();

  const [editOpen, setEditOpen] = React.useState(false);
  // Ảnh chụp lúc mở form: dữ liệu query sống đổi identity mỗi lần refetch nền và sẽ xóa phần đang gõ.
  const [editing, setEditing] = React.useState<AdminCoupon | null>(null);
  const [toggleOpen, setToggleOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Link `?page=` cũ quá số trang của sổ: kéo về trang cuối còn dữ liệu.
  const totalPages = ledger.data?.totalPages;
  const isPlaceholder = ledger.isPlaceholderData;
  React.useEffect(() => {
    if (isPlaceholder || totalPages === undefined) return;
    if (page > 0 && page >= totalPages) set({ page: totalPages > 1 ? totalPages - 1 : undefined });
  }, [isPlaceholder, totalPages, page, set]);

  // Màn lỗi / 404 chỉ khi chưa có dữ liệu. Một lần tải lại hỏng mà bản cũ còn trong cache thì chỉ cảnh
  // báo ở dưới header: thay cả màn là tháo luôn dialog sửa đang mở và mất phần admin đang gõ.
  const coupon = query.data;
  if (!coupon) {
    if (query.error) {
      if (isNotFound(query.error)) {
        return (
          <NotFoundState
            title="Không tìm thấy mã giảm giá này"
            description={`Không có mã ${code}. Mã có thể đã bị xóa.`}
            backHref={backHref}
            backLabel="Về danh sách mã giảm giá"
          />
        );
      }
      return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
    }
    return <CouponDetailSkeleton />;
  }

  const state = COUPON_STATE[coupon.state];

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      showToast({ title: 'Đã chép mã', variant: 'success', duration: 2000 });
    } catch {
      showToast({ title: 'Không chép được, hãy bôi đen để chép tay', variant: 'warning' });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button variant="link" size="sm" className="self-start" asChild>
          <Link href={backHref}>
            <ArrowLeft className="size-4" />
            Mã giảm giá
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Heading level="2">
                <span className="font-mono">{coupon.code}</span>
              </Heading>
              <Button variant="ghost" size="icon-sm" aria-label="Chép mã" onClick={copyCode}>
                <Copy className="size-4" />
              </Button>
              <EnumBadge meta={state} />
              <Text variant="caption" muted>
                {state.hint}
              </Text>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span>Giảm {coupon.percentOff}%</span>
              <span>· Tạo {formatVnDateTime(coupon.createdAt)}</span>
              <span>· Sửa lần cuối {formatVnDateTime(coupon.updatedAt)}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(coupon);
                setEditOpen(true);
              }}
            >
              <Pencil className="size-4" />
              Sửa
            </Button>
            <Button variant="outline" size="sm" onClick={() => setToggleOpen(true)}>
              {coupon.active ? <PowerOff className="size-4" /> : <Power className="size-4" />}
              {coupon.active ? 'Tắt mã' : 'Bật mã'}
            </Button>
            <Button variant="destructive-outline" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              Xóa
            </Button>
          </div>
        </div>
      </div>

      {query.error && (
        <Alert variant="warning">
          <AlertDescription className="flex flex-col items-start gap-2">
            {isNotFound(query.error) ? (
              <>
                <span>
                  Mã này không còn tồn tại, có thể đã bị xóa ở nơi khác. Thông tin dưới đây là bản đọc lần trước.
                </span>
                <Button variant="outline" size="sm" asChild>
                  <Link href={backHref}>Về danh sách mã giảm giá</Link>
                </Button>
              </>
            ) : (
              <>
                <span>
                  Không làm mới được mã: {apiErrorMessage(query.error, 'máy chủ không trả lời.')} Thông tin dưới
                  đây là bản đọc lần trước.
                </span>
                <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}>
                  {query.isFetching && <Spinner size="sm" />}
                  Thử lại
                </Button>
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <CouponStats coupon={coupon} />
      <CouponConfigCard coupon={coupon} plans={plans} />

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <Heading level="3">Sổ lượt dùng</Heading>
          <Text variant="caption" muted>
            Mỗi workspace một dòng · HELD đang giữ chỗ, LAPSED là checkout bỏ dở, REDEEMED đã thanh toán
          </Text>
        </div>
        {ledger.error ? (
          <ErrorState error={ledger.error} onRetry={() => void ledger.refetch()} />
        ) : (
          <RedemptionTable
            page={ledger.data}
            isLoading={ledger.isPending}
            pageIndex={page}
            pageSize={size}
            onPageChange={(p) => set({ page: p })}
            onPageSizeChange={(s) => set({ size: s, page: 0 })}
            plans={plans}
          />
        )}
      </section>

      {editing && <CouponFormDialog open={editOpen} coupon={editing} onOpenChange={setEditOpen} />}
      <ToggleCouponDialog coupon={coupon} open={toggleOpen} onOpenChange={setToggleOpen} />
      <DeleteCouponDialog
        coupon={coupon}
        ledgerCount={ledger.data?.totalElements}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onRetire={() => {
          setDeleteOpen(false);
          setToggleOpen(true);
        }}
      />
    </div>
  );
}
