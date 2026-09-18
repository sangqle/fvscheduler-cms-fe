'use client';

import * as React from 'react';
import { CheckCircle2, Copy, ListFilter, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Kicker } from '@/components/ui/Kicker';
import { SlideOver } from '@/components/ui/SlideOver';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { KeyValue, KeyValueList } from '@/components/admin/shared/KeyValue';
import { AFFILIATE_URL_KEYS } from '@/components/admin/affiliate/affiliateTabs';
import { MarkPayoutPaidDialog } from '@/components/admin/affiliate/MarkPayoutPaidDialog';
import { PayoutCommissionList } from '@/components/admin/affiliate/PayoutCommissionList';
import { ReferrerCodeActions } from '@/components/admin/affiliate/ReferrerCodeActions';
import { RejectPayoutDialog } from '@/components/admin/affiliate/RejectPayoutDialog';
import { useUrlState } from '@/hooks/useUrlState';
import { AFFILIATE_PAYOUT_STATUS } from '@/lib/admin/labels';
import { formatCurrency, formatDateTime, shortId } from '@/lib/utils';
import type { AdminAffiliatePayoutRow } from '@/types/admin';

/**
 * Drawer một yêu cầu rút tiền, dựng hoàn toàn từ dòng danh sách (không có GET theo id). Thứ tự đọc
 * bám đúng việc admin làm: chép thông tin chuyển khoản, đối chiếu các dòng hoa hồng, rồi mới đánh dấu
 * đã trả hoặc từ chối ở footer. Chỉ `REQUESTED` mới xử lý được, hai trạng thái kia là điểm cuối.
 */
export function PayoutDrawer({
  payout,
  open,
  onClose,
  onUpdated,
}: {
  payout: AdminAffiliatePayoutRow | null;
  open: boolean;
  onClose: () => void;
  /** Dòng backend trả về sau mark-paid / reject, thay ảnh chụp đang hiện. */
  onUpdated: (row: AdminAffiliatePayoutRow) => void;
}) {
  const { set } = useUrlState();
  const { showToast } = useToast();
  const [dialog, setDialog] = React.useState<'paid' | 'reject' | null>(null);
  // Id của yêu cầu vừa nhận 409: nó đã được xử lý ở nơi khác. Không có GET theo id, và dưới bộ lọc
  // REQUESTED dòng đó rời danh sách nên ảnh chụp REQUESTED không bao giờ được thay: phải tự tắt nút.
  const [conflictId, setConflictId] = React.useState<string | null>(null);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ title: `Đã chép ${label}`, variant: 'success', duration: 2000 });
    } catch {
      showToast({ title: 'Không chép được, hãy bôi đen để chép tay', variant: 'warning' });
    }
  }

  const stale = payout?.status === 'REQUESTED' && conflictId === payout.id;
  const requested = payout?.status === 'REQUESTED' && !stale;
  const who = payout ? (payout.referrerEmail ?? shortId(payout.referrerAccountId)) : '';

  return (
    <SlideOver open={open} onOpenChange={(o) => !o && onClose()} title={`Yêu cầu rút tiền ${payout?.id ?? ''}`}>
      {payout && (
        <>
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-lg font-bold">{formatCurrency(payout.amount)}</span>
                <EnumBadge meta={AFFILIATE_PAYOUT_STATUS[payout.status]} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                <span>Yêu cầu rút tiền của {who}</span>
                <span>·</span>
                {/* Cùng kiểu chép id mờ ở đầu màn workspace / chiến dịch: nút chữ nằm trong dòng meta. */}
                <button
                  type="button"
                  onClick={() => void copy(payout.id, 'id yêu cầu')}
                  className="inline-flex items-center gap-1 font-mono hover:text-foreground"
                  title="Chép id yêu cầu"
                >
                  {payout.id} <Copy className="size-3" />
                </button>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" aria-label="Đóng" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-6">
              <section className="flex flex-col gap-2">
                <Kicker tone="muted" as="h4">
                  Chuyển khoản tới
                </Kicker>
                <Card padding="sm">
                  <CardContent standalone>
                    <KeyValueList>
                      <KeyValue label="Ngân hàng">
                        <span className="font-medium">{payout.bankName}</span>
                      </KeyValue>
                      <KeyValue label="Số tài khoản">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono font-semibold">{payout.bankAccountNumber}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Chép số tài khoản"
                            onClick={() => void copy(payout.bankAccountNumber, 'số tài khoản')}
                          >
                            <Copy className="size-3.5" />
                          </Button>
                        </span>
                      </KeyValue>
                      <KeyValue label="Chủ tài khoản">
                        <span className="font-medium">{payout.bankAccountHolder}</span>
                      </KeyValue>
                      <KeyValue label="Số tiền">
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono font-semibold">{formatCurrency(payout.amount)}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Chép số tiền, chỉ chữ số"
                            onClick={() => void copy(String(payout.amount), 'số tiền')}
                          >
                            <Copy className="size-3.5" />
                          </Button>
                        </span>
                      </KeyValue>
                    </KeyValueList>
                  </CardContent>
                </Card>
                <Text variant="caption" muted>
                  Ảnh chụp tài khoản ngân hàng lúc người giới thiệu gửi yêu cầu: họ sửa ngân hàng sau đó cũng không đổi nơi nhận tiền
                  của yêu cầu này.
                </Text>
              </section>

              <KeyValueList>
                <KeyValue label="Người giới thiệu">
                  {payout.referrerEmail && <span className="mr-1.5">{payout.referrerEmail}</span>}
                  <span className="font-mono text-xs text-muted-foreground">{payout.referrerAccountId}</span>
                </KeyValue>
                <KeyValue label="Số lượt hoa hồng">
                  {/* `REJECTED` từ danh sách đếm sống ra 0; chỉ thân trả về của reject mang số đã gom. */}
                  {payout.status !== 'REJECTED' ? (
                    <span className="font-mono text-xs">{payout.commissionCount}</span>
                  ) : payout.commissionCount > 0 ? (
                    <>
                      <span className="font-mono text-xs">{payout.commissionCount}</span>
                      <span className="ml-1 text-xs text-muted-foreground">· đã gom trước khi từ chối</span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </KeyValue>
                <KeyValue label="Gửi lúc">
                  <span className="font-mono text-xs">{formatDateTime(payout.createdAt)}</span>
                </KeyValue>
                <KeyValue label="Xử lý lúc">
                  <span className="font-mono text-xs">{payout.processedAt ? formatDateTime(payout.processedAt) : '—'}</span>
                </KeyValue>
                <KeyValue label="Xử lý bởi">
                  {payout.processedBy ? (
                    <span className="font-mono text-xs" title={payout.processedBy}>
                      {shortId(payout.processedBy)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </KeyValue>
                <KeyValue label="Mã giao dịch">
                  {payout.reference ? (
                    <span className="font-mono text-xs">{payout.reference}</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </KeyValue>
                {payout.status !== 'REQUESTED' && (
                  <KeyValue label={payout.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú'}>
                    {payout.note ? (
                      <span className="whitespace-pre-line">{payout.note}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </KeyValue>
                )}
              </KeyValueList>

              <section className="flex flex-col gap-2">
                <Kicker tone="muted" as="h4">
                  Mã giới thiệu
                </Kicker>
                <Text variant="caption" muted>
                  Không xem được mã đang bật hay đã khóa: cả hai thao tác đều an toàn khi bấm lại.
                </Text>
                <div className="flex flex-wrap items-center gap-2">
                  <ReferrerCodeActions accountId={payout.referrerAccountId} email={payout.referrerEmail} />
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() =>
                      set({
                        tab: 'commissions',
                        [AFFILIATE_URL_KEYS.referrer]: payout.referrerAccountId,
                        [AFFILIATE_URL_KEYS.inPayout]: undefined,
                      })
                    }
                  >
                    <ListFilter className="size-3.5" />
                    Xem mọi hoa hồng của người này
                  </Button>
                </div>
              </section>

              <PayoutCommissionList
                payout={payout}
                onOpenInTab={() =>
                  set({
                    tab: 'commissions',
                    [AFFILIATE_URL_KEYS.inPayout]: payout.id,
                    [AFFILIATE_URL_KEYS.referrer]: undefined,
                  })
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-6">
            <Text variant="caption" muted className={requested ? 'hidden lg:block' : undefined}>
              {requested
                ? 'Chuyển khoản xong rồi mới đánh dấu đã trả'
                : stale
                  ? 'Yêu cầu này đã được xử lý ở nơi khác · trạng thái trên đây đã cũ, xem lại trong danh sách'
                  : `Chỉ yêu cầu REQUESTED mới xử lý được · yêu cầu này đã ${payout.status === 'PAID' ? 'trả' : 'bị từ chối'}`}
            </Text>
            <div className="ml-auto flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Đóng
              </Button>
              {requested && (
                <>
                  <Button variant="destructive-outline" onClick={() => setDialog('reject')}>
                    <XCircle className="size-4" />
                    Từ chối
                  </Button>
                  <Button variant="success" onClick={() => setDialog('paid')}>
                    <CheckCircle2 className="size-4" />
                    Đã chuyển khoản
                  </Button>
                </>
              )}
            </div>
          </div>

          <MarkPayoutPaidDialog
            payout={payout}
            open={dialog === 'paid'}
            onOpenChange={(o) => setDialog(o ? 'paid' : null)}
            onDone={onUpdated}
            onConflict={() => setConflictId(payout.id)}
          />
          <RejectPayoutDialog
            payout={payout}
            open={dialog === 'reject'}
            onOpenChange={(o) => setDialog(o ? 'reject' : null)}
            onDone={onUpdated}
            onConflict={() => setConflictId(payout.id)}
          />
        </>
      )}
    </SlideOver>
  );
}
