'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { SlideOver } from '@/components/ui/SlideOver';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Tooltip } from '@/components/ui/Tooltip';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { KeyValue, KeyValueList } from '@/components/admin/shared/KeyValue';
import { ErrorState, NotFoundState, isNotFound } from '@/components/admin/shared/QueryState';
import { MarkPaidDialog } from '@/components/admin/orders/MarkPaidDialog';
import { useAdminOrder } from '@/hooks/useAdminOrders';
import { useAdminPlans } from '@/hooks/useAdminPlans';
import { useAdminWorkspace } from '@/hooks/useAdminWorkspaces';
import { BILLING_PERIOD, ORDER_STATUS, SUBSCRIPTION_STATUS, isOrderPayable } from '@/lib/admin/labels';
import { relativeDays } from '@/lib/admin/time';
import { formatCurrency, formatDateTime, shortId } from '@/lib/utils';

/** CMS-06: drawer phải, nút Mark paid chỉ bật với PENDING / EXPIRED. */
export function OrderDrawer({ orderCode, onClose }: { orderCode: string | null; onClose: () => void }) {
  const query = useAdminOrder(orderCode);
  const order = query.data;
  const { data: plans } = useAdminPlans();
  const plan = plans?.find((p) => p.code === order?.planCode);
  const wsQuery = useAdminWorkspace(order?.workspace.id ?? '');
  const [markPaidOpen, setMarkPaidOpen] = React.useState(false);

  const payable = order ? isOrderPayable(order.status) : false;
  const planInactive = plan ? !plan.isActive : false;

  return (
    <SlideOver open={!!orderCode} onOpenChange={(o) => !o && onClose()} title={`Đơn hàng ${orderCode ?? ''}`}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-bold">{orderCode}</span>
            {order && <EnumBadge meta={ORDER_STATUS[order.status]} />}
          </div>
          {order && (
            <Text variant="caption" muted className="mt-1">
              Workspace{' '}
              <Link href={`/workspaces/${order.workspace.id}`} className="font-medium text-primary hover:underline">
                {order.workspace.name}
              </Link>
              {order.createdBy?.email && ` · Tạo bởi ${order.createdBy.email}`} · <span className="font-mono">{shortId(order.workspace.id)}</span>
            </Text>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" aria-label="Đóng" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {query.isPending && orderCode && (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}
        {query.error &&
          (isNotFound(query.error) ? (
            <NotFoundState title="Không tìm thấy đơn hàng" description={`${orderCode} không tồn tại.`} backHref="/orders" backLabel="Về danh sách đơn hàng" />
          ) : (
            <ErrorState error={query.error} onRetry={() => void query.refetch()} />
          ))}
        {order && (
          <div className="flex flex-col gap-5">
            <KeyValueList>
              <KeyValue label="Gói">
                {order.planName} <span className="font-mono text-xs text-muted-foreground">{order.planCode}</span>
                {plan && (
                  <span className={planInactive ? 'ml-1 text-xs text-destructive-deep' : 'ml-1 text-xs text-success-deep'}>
                    · {planInactive ? 'đã ngừng bán' : 'đang bán'}
                  </span>
                )}
              </KeyValue>
              <KeyValue label="Chu kỳ · số tiền">
                {BILLING_PERIOD[order.billingPeriod]} · <span className="font-mono">{formatCurrency(order.amount)}</span>
              </KeyValue>
              <KeyValue label="Tạo lúc"><span className="font-mono text-xs">{formatDateTime(order.createdAt)}</span></KeyValue>
              <KeyValue label="Thanh toán lúc"><span className="font-mono text-xs">{order.paidAt ? formatDateTime(order.paidAt) : '—'}</span></KeyValue>
              <KeyValue label="sepayTxId">
                {order.sepayTxId ? <span className="font-mono text-xs">{order.sepayTxId}</span> : <span className="text-xs text-muted-foreground">— chưa khớp giao dịch nào</span>}
              </KeyValue>
              <KeyValue label="Gói hiện tại của workspace">
                {wsQuery.data ? (
                  <span className="inline-flex items-center gap-1.5">
                    <EnumBadge meta={SUBSCRIPTION_STATUS[wsQuery.data.subscription.status]} />
                    {wsQuery.data.subscription.expiresAt && (
                      <span className="text-xs text-muted-foreground">{relativeDays(wsQuery.data.subscription.expiresAt)}</span>
                    )}
                  </span>
                ) : (
                  <Skeleton className="h-4 w-24" />
                )}
              </KeyValue>
            </KeyValueList>

            {order.status === 'EXPIRED' && (
              <Text variant="caption" muted className="inline-flex items-start gap-1.5 rounded-lg bg-muted p-3">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  Đơn đã tự đóng sau 24 giờ (EXPIRED). Vẫn xác nhận được nếu khách chuyển khoản trễ: mark-paid nhận cả PENDING lẫn
                  EXPIRED. Điều kiện duy nhất lúc xác nhận: gói {order.planCode} còn đang bán.
                </span>
              </Text>
            )}

            <div className="flex flex-col gap-1.5">
              <Text variant="caption" muted className="font-mono">
                rawPayload{payable && ' · manualMarkPaid sẽ được ghép vào đây sau khi xác nhận'}
              </Text>
              <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-[11.5px] leading-relaxed text-foreground">
                {JSON.stringify(order.rawPayload ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      {order && (
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
          <Text variant="caption" muted className="hidden sm:block">
            Nút chỉ bật với PENDING / EXPIRED · PAID / CANCELED vô hiệu
          </Text>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            <Tooltip content={!payable ? `Đơn ${order.status} không thể xác nhận tay` : planInactive ? 'Gói đã ngừng bán, backend sẽ từ chối (409)' : undefined}>
              <span>
                <Button variant="success" disabled={!payable || planInactive} onClick={() => setMarkPaidOpen(true)}>
                  <CheckCircle2 className="size-4" />
                  Xác nhận đã thanh toán
                </Button>
              </span>
            </Tooltip>
          </div>
          <MarkPaidDialog order={order} open={markPaidOpen} onOpenChange={setMarkPaidOpen} />
        </div>
      )}
    </SlideOver>
  );
}
