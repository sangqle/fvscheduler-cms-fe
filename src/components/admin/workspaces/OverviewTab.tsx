'use client';

import * as React from 'react';
import { Ban, CalendarPlus, Info, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { InfoTip } from '@/components/ui/InfoTip';
import { MeterBar } from '@/components/ui/MeterBar';
import { Text } from '@/components/ui/Text';
import { EnumBadge } from '@/components/admin/shared/EnumBadge';
import { KeyValue, KeyValueList } from '@/components/admin/shared/KeyValue';
import { ReadOnlyHint } from '@/components/admin/shared/ReadOnlyHint';
import { GrantDialog } from '@/components/admin/workspaces/GrantDialog';
import { ExtendDialog } from '@/components/admin/workspaces/ExtendDialog';
import { CancelDialog } from '@/components/admin/workspaces/CancelDialog';
import { useAdminPlans } from '@/hooks/useAdminPlans';
import { LIMIT_LABEL, SUBSCRIPTION_SOURCE, SUBSCRIPTION_STATUS } from '@/lib/admin/labels';
import { relativeDays } from '@/lib/admin/time';
import { formatCurrency, formatDateTime, shortId } from '@/lib/utils';
import type { AdminPlan, AdminWorkspaceDetail } from '@/types/admin';

function planPriceLine(plan: AdminPlan | undefined): string {
  if (!plan) return '';
  const m = plan.monthlySalePrice ?? plan.monthlyListPrice;
  const y = plan.yearlySalePrice ?? plan.yearlyListPrice;
  return [m !== null ? `${formatCurrency(m)}/tháng` : null, y !== null ? `${formatCurrency(y)}/năm` : null]
    .filter(Boolean)
    .join(' · ');
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
      <CardTitle className="text-sm">{children}</CardTitle>
      {hint}
    </CardHeader>
  );
}

/** CMS-02: gói hiện tại + 3 nút ghi, quota, ghi đè, chủ sở hữu, số liệu, feature. */
export function OverviewTab({ ws }: { ws: AdminWorkspaceDetail }) {
  const { data: plans } = useAdminPlans();
  const plan = plans?.find((p) => p.code === ws.subscription.planCode);
  const [dialog, setDialog] = React.useState<'grant' | 'extend' | 'cancel' | null>(null);
  const hasLive = ws.subscription.status !== 'NONE';
  const sub = ws.subscription;

  const quotaKeys = Array.from(new Set([...Object.keys(ws.entitlement.limits), ...ws.entitlement.unlimitedKeys]));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <SectionTitle>Gói hiện tại</SectionTitle>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold text-foreground">{sub.planName ?? 'Chưa từng có gói'}</span>
                <EnumBadge meta={SUBSCRIPTION_STATUS[sub.status]} />
                {sub.source && <EnumBadge meta={SUBSCRIPTION_SOURCE[sub.source]} />}
              </div>
              {sub.planCode && (
                <span className="font-mono text-xs text-muted-foreground">
                  {sub.planCode}
                  {plan && ` · ${planPriceLine(plan)}`}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setDialog('grant')}>
                <Sparkles className="size-4" />
                Cấp gói / Đưa vào trial
              </Button>
              <Button size="sm" variant="outline" disabled={!hasLive} onClick={() => setDialog('extend')}>
                <CalendarPlus className="size-4" />
                Gia hạn
              </Button>
              <Button size="sm" variant="destructive-outline" disabled={!hasLive} onClick={() => setDialog('cancel')}>
                <Ban className="size-4" />
                Hủy gói
              </Button>
            </div>
          </div>
          <KeyValueList>
            <KeyValue label="Bắt đầu">{sub.startsAt ? <span className="font-mono text-xs">{formatDateTime(sub.startsAt)}</span> : '—'}</KeyValue>
            <KeyValue label="Hết hạn">
              {sub.expiresAt ? (
                <span className="font-mono text-xs">
                  {formatDateTime(sub.expiresAt)} <span className="text-muted-foreground">· {relativeDays(sub.expiresAt)}</span>
                </span>
              ) : (
                '—'
              )}
            </KeyValue>
            <KeyValue label="Chế độ workspace">
              {ws.entitlement.readOnly ? 'Chỉ đọc' : 'Đầy đủ'}{' '}
              <span className="font-mono text-xs text-muted-foreground">entitlement.readOnly = {String(ws.entitlement.readOnly)}</span>
            </KeyValue>
          </KeyValueList>
        </CardContent>
      </Card>

      <Card>
        <SectionTitle>Chủ sở hữu</SectionTitle>
        <CardContent className="flex flex-col gap-2 text-sm">
          <span className="font-semibold">{ws.owner.displayName}</span>
          <span className="text-muted-foreground">{ws.owner.email ?? 'Chưa có tài khoản đăng nhập'}</span>
          <span className="font-mono text-xs text-muted-foreground">accountId {ws.owner.accountId ? shortId(ws.owner.accountId) : '—'}</span>
          <span className="font-mono text-xs text-muted-foreground">membershipId {shortId(ws.owner.membershipId)}</span>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle hint={<Text variant="caption" muted>entitlement.limits + usage · tính lúc đọc</Text>}>
          Quota · usage / limit
        </SectionTitle>
        <CardContent className="flex flex-col gap-4">
          {quotaKeys.length === 0 && <Text variant="body-sm" muted>Gói không mang giới hạn nào.</Text>}
          {quotaKeys.map((key) => {
            const unlimited = ws.entitlement.unlimitedKeys.includes(key);
            const limit = unlimited ? null : ws.entitlement.limits[key];
            const usage = ws.usage[key];
            const override = ws.limitOverrides.find((o) => o.limitKey === key);
            const full = limit !== null && usage !== undefined && usage >= limit;
            return (
              <div key={key} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{LIMIT_LABEL[key] ?? key}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{key}</span>
                    {usage === undefined && <InfoTip content="Chưa đo tại đây: số liệu này đếm ở dịch vụ khác." />}
                  </span>
                  <span className="font-mono text-xs">
                    {usage ?? '–'} / {limit === null ? 'Không giới hạn' : limit}
                  </span>
                </div>
                {limit !== null && usage !== undefined && (
                  <MeterBar max={limit} size="sm" segments={[{ value: Math.min(usage, limit), className: full ? 'bg-warning' : 'bg-primary' }]} />
                )}
                <Text variant="caption" muted>
                  {override ? `Ghi đè ${override.value ?? '∞'}` : 'Theo gói'}
                  {full ? ' · đã chạm giới hạn, ERP chặn tạo mới' : limit !== null && usage !== undefined ? ` · còn ${limit - usage}` : ''}
                </Text>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <SectionTitle>Số liệu</SectionTitle>
        <CardContent className="grid grid-cols-2 gap-3">
          {[
            [ws.stats.bookings, 'Booking'],
            [ws.stats.clients, 'Khách hàng'],
            [ws.counts.activeMembers, 'Thành viên hoạt động'],
            [ws.counts.activeBranches, 'Chi nhánh hoạt động'],
          ].map(([v, l]) => (
            <div key={String(l)} className="flex flex-col">
              <span className="font-mono text-xl font-semibold text-foreground">{v}</span>
              <span className="text-xs text-muted-foreground">{l}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <SectionTitle hint={<ReadOnlyHint>Chỉ đọc · chưa có endpoint ghi ở v1</ReadOnlyHint>}>Ghi đè theo workspace</SectionTitle>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Text variant="caption" muted className="font-mono">limitOverrides · {ws.limitOverrides.length}</Text>
            {ws.limitOverrides.length === 0 && <Text variant="body-sm" muted>Không có.</Text>}
            {ws.limitOverrides.map((o) => (
              <div key={o.limitKey} className="rounded-lg border border-border p-2.5 text-sm">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-semibold">{o.limitKey}</span>
                  <span>{o.value ?? '∞'}</span>
                </div>
                <Text variant="caption" muted className="mt-1">{o.note ?? '—'}</Text>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Text variant="caption" muted className="font-mono">itemOverrides · {ws.itemOverrides.length}</Text>
            {ws.itemOverrides.length === 0 && <Text variant="body-sm" muted>Không có.</Text>}
            {ws.itemOverrides.map((o) => (
              <div key={o.itemCode} className="rounded-lg border border-border p-2.5 text-sm">
                <div className="flex items-center justify-between font-mono text-xs">
                  <span className="font-semibold">{o.itemCode}</span>
                  <span className={o.enabled ? 'text-success-deep' : 'text-destructive-deep'}>{o.enabled ? 'enabled' : 'disabled'}</span>
                </div>
                <Text variant="caption" muted className="mt-1">{o.note ?? '—'}</Text>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <SectionTitle hint={<Text variant="caption" muted className="font-mono">entitlement.features</Text>}>Tính năng được mở</SectionTitle>
        <CardContent className="flex flex-wrap gap-1.5">
          {ws.entitlement.features.length === 0 && (
            <Text variant="body-sm" muted className="inline-flex items-center gap-1.5">
              <Info className="size-3.5" /> Không có feature nào
            </Text>
          )}
          {ws.entitlement.features.map((f) => (
            <Badge key={f} variant="outline" size="sm" mono>
              {f}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <GrantDialog ws={ws} open={dialog === 'grant'} onOpenChange={(o) => setDialog(o ? 'grant' : null)} />
      <ExtendDialog ws={ws} open={dialog === 'extend'} onOpenChange={(o) => setDialog(o ? 'extend' : null)} />
      <CancelDialog ws={ws} open={dialog === 'cancel'} onOpenChange={(o) => setDialog(o ? 'cancel' : null)} />
    </div>
  );
}
