'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FlaskConical,
  MailX,
  Megaphone,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogIcon,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { StatCard } from '@/components/ui/StatCard';
import { Text } from '@/components/ui/Text';
import { Textarea } from '@/components/ui/Textarea';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/ToastProvider';
import { Field } from '@/components/admin/shared/Field';
import {
  CustomVariableInputs,
  campaignVariables,
  missingVariables,
} from '@/components/admin/mail/MailContextFields';
import { ContextChips, CustomVariableChips, VersionChip } from '@/components/admin/mail/mailDisplay';
import { useCreateMailCampaign, useMailTemplate, useMailTemplates } from '@/hooks/useAdminMail';
import { apiErrorMessage } from '@/lib/api/auth';
import { isSendableTemplate } from '@/lib/admin/labels';
import { CAMPAIGN_NAME_MAX, explainProblem, parseIdList, validationProblems } from '@/lib/admin/mail';
import { cn } from '@/lib/utils';
import type { CreateCampaignInput, CreateCampaignResult } from '@/types/admin';

type Mode = 'workspace' | 'account';
type Step = 1 | 2 | 3;

/** Id mờ luôn là 2 ký tự tag + 14 ký tự base32; tag cho biết id thuộc loại nào. */
const ID_TAG: Record<Mode, string> = { workspace: 'wk', account: 'ac' };
const ID_LENGTH = 16;

/** 422 của `variables` gắn vào bước 3; các lỗi khác vẫn ở khối lỗi chung đầu dialog. */
const VARIABLE_PROBLEM = /^(missing|unknown) variable: /;

const STEPS = ['Chọn template', 'Chọn người nhận', 'Điền biến và chạy thử'] as const;

const STEP_HINT: Record<Step, string> = {
  1: 'Chỉ template đang bật và không phải PARTIAL mới tạo chiến dịch được',
  2: 'Mail gửi tới chủ workspace, hoặc thẳng tới tài khoản, chọn một kiểu',
  3: 'Chạy thử đếm trước người nhận mà không chèn dòng nào',
};

/**
 * Tạo và xếp hàng chiến dịch (POST /campaigns). Đây là thao tác không rút lại được, nên chia ba
 * bước và **bắt buộc** chạy thử (`dryRun`) khớp đúng dữ liệu đang nhập trước khi cho gửi thật.
 */
export function CreateCampaignDialog({
  open,
  onOpenChange,
  initialTemplateCode,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTemplateCode?: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  // Dialog này mount sẵn ở ba nơi và phần lớn thời gian đang đóng, chỉ nạp danh sách khi mở.
  const templates = useMailTemplates({ active: true }, { enabled: open });
  // Hai mutation riêng để nút "Chạy thử" và nút gửi thật có trạng thái pending độc lập.
  const dryRun = useCreateMailCampaign();
  const create = useCreateMailCampaign();

  const [step, setStep] = React.useState<Step>(1);
  const [templateCode, setTemplateCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [modeChoice, setModeChoice] = React.useState<Mode>('workspace');
  // Mỗi kiểu người nhận giữ ô dán riêng. Dùng chung một ô thì id tài khoản đã dán vẫn còn nguyên khi
  // template ép về workspace, rồi đi lên body dưới khóa `workspaceIds`: backend chỉ trả 400 trống
  // trơn ("Invalid id in request body"), không chỉ ra dòng nào sai.
  const [rawIds, setRawIds] = React.useState<Record<Mode, string>>({ workspace: '', account: '' });
  const [variables, setVariables] = React.useState<Record<string, string>>({});
  const [estimate, setEstimate] = React.useState<{ signature: string; result: CreateCampaignResult } | null>(null);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [problems, setProblems] = React.useState<string[]>([]);

  // Danh sách chỉ có metadata; `customVariables` chỉ nằm ở endpoint chi tiết nên phải nạp thêm.
  const detail = useMailTemplate(open && templateCode ? templateCode : null);
  const row = (templates.data?.content ?? []).find((t) => t.code === templateCode);
  const custom = detail.data?.customVariables ?? [];
  const requiredContext = detail.data?.requiredContext ?? row?.requiredContext ?? [];
  const needsWorkspace = requiredContext.includes('WORKSPACE');
  const templateName = detail.data?.name ?? row?.name ?? '';
  const version = detail.data?.currentVersion ?? row?.currentVersion;
  // Template cần ngữ cảnh WORKSPACE thì gửi theo tài khoản chắc chắn 422: suy ra kiểu người nhận
  // thay vì đồng bộ bằng effect, vì effect chạy sau render nên có đúng một nhịp mà lựa chọn cũ vẫn
  // còn hiệu lực. Ô dán id của mỗi kiểu tách riêng nên id không bao giờ lẫn sang body sai khóa.
  const mode: Mode = needsWorkspace ? 'workspace' : modeChoice;

  React.useEffect(() => {
    if (!open) return;
    setStep(1);
    setTemplateCode(initialTemplateCode ?? '');
    setName('');
    setModeChoice('workspace');
    setRawIds({ workspace: '', account: '' });
    setVariables({});
    setEstimate(null);
    setServerError(null);
    setProblems([]);
  }, [open, initialTemplateCode]);

  const options = React.useMemo(
    () =>
      (templates.data?.content ?? [])
        .filter(isSendableTemplate)
        .map((t) => ({
          value: t.code,
          label: t.name,
          description: `${t.code} · v${t.currentVersion}`,
          keywords: t.code,
        })),
    [templates.data],
  );

  const ids = parseIdList(rawIds[mode]);
  // Chỉ soi tag và độ dài, không soi bảng chữ base32: đây là gợi ý cho người dán nhầm cột id, không
  // phải bản sao của bộ giải mã phía backend, chặt hơn backend là chặn nhầm id hợp lệ.
  const malformed = ids.filter((id) => id.length !== ID_LENGTH || !id.toLowerCase().startsWith(ID_TAG[mode]));
  const missing = missingVariables(custom, variables);

  const variableProblems = problems.filter((p) => VARIABLE_PROBLEM.test(p));
  const otherProblems = problems.filter((p) => !VARIABLE_PROBLEM.test(p));

  // `initialTemplateCode` có thể trỏ vào một template đã tắt hoặc PARTIAL (nó không nằm trong danh
  // sách chọn nhưng vẫn nạp được chi tiết); chặn tại đây thay vì để backend trả 409.
  const notSendable = Boolean(detail.data && !isSendableTemplate(detail.data));

  const done: Record<Step, boolean> = {
    1: Boolean(templateCode && name.trim() && detail.data && !notSendable),
    2: ids.length > 0 && malformed.length === 0,
    3: missing.length === 0,
  };

  /**
   * Kết quả chạy thử chỉ đúng với đúng bộ dữ liệu đã chạy. Ký hiệu này dựng từ danh sách biến của
   * template (không phải từ `variables`) nên thứ tự khóa ổn định, đổi một ô là số cũ hết hiệu lực.
   */
  const signature = JSON.stringify([
    templateCode,
    name.trim(),
    mode,
    ids,
    custom.map((v) => (variables[v] ?? '').trim()),
  ]);
  const ready = estimate?.signature === signature ? estimate.result : null;
  const stale = Boolean(estimate) && !ready;

  function payload(dry: boolean): CreateCampaignInput {
    return {
      templateCode,
      name: name.trim(),
      workspaceIds: mode === 'workspace' ? ids : undefined,
      accountIds: mode === 'account' ? ids : undefined,
      variables: campaignVariables(custom, variables),
      dryRun: dry,
    };
  }

  function handleError(e: unknown) {
    setProblems(validationProblems(e));
    setServerError(apiErrorMessage(e, 'Không tạo được chiến dịch. Vui lòng thử lại.'));
  }

  function clearErrors() {
    setServerError(null);
    setProblems([]);
  }

  /** Ca duy nhất của 422 biến: một admin khác lưu version mới trong lúc dialog này đang mở. */
  function reloadVariables() {
    clearErrors();
    setEstimate(null); // số cũ đếm theo danh sách biến cũ
    void detail.refetch();
  }

  function runDryRun() {
    clearErrors();
    if (!done[1] || !done[2] || !done[3]) return;
    const forSignature = signature;
    dryRun.mutate(payload(true), {
      onSuccess: (result) => setEstimate({ signature: forSignature, result }),
      onError: handleError,
    });
  }

  function submit() {
    clearErrors();
    if (!ready) return;
    create.mutate(payload(false), {
      onSuccess: (result) => {
        showToast({
          title: `Đã xếp hàng ${result.queued} mail`,
          description: `Chiến dịch chạy ${result.templateCode} v${result.templateVersion}, đã ghim version này.`,
          variant: 'success',
        });
        onOpenChange(false);
        // `campaignCode` vắng hẳn khỏi JSON của một lần chạy thử; lần gửi thật luôn có, nhưng vẫn chặn.
        if (result.campaignCode) router.push(`/mail/campaigns/${result.campaignCode}`);
      },
      onError: handleError,
    });
  }

  const busy = dryRun.isPending || create.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="primary">
            <Megaphone />
          </DialogIcon>
          <div className="min-w-0">
            <DialogTitle>Tạo chiến dịch</DialogTitle>
            <DialogDescription>
              Bước {step}/3 · {STEP_HINT[step]}
            </DialogDescription>
          </div>
        </DialogHeader>

        <StepRow current={step} />

        <DialogBody className="flex flex-col gap-4 pt-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>
                {serverError}
                {otherProblems.length > 0 && (
                  <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4">
                    {otherProblems.map((p) => (
                      <li key={p}>{explainProblem(p, 'campaign')}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <>
              <Field
                id="campaign-template"
                label="Template"
                hint="Chỉ liệt kê template đang bật và không phải PARTIAL · version chốt tại lúc tạo"
              >
                {templates.isPending ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Combobox
                    id="campaign-template"
                    options={options}
                    value={templateCode || null}
                    onChange={(v) => {
                      setTemplateCode(String(v));
                      setVariables({});
                      setEstimate(null); // số cũ thuộc về template cũ
                      clearErrors();
                    }}
                    placeholder="Chọn template"
                    searchPlaceholder="Tìm theo tên hoặc mã template"
                    emptyText="Không có template nào khớp"
                    className="w-full"
                  />
                )}
              </Field>

              {templates.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {apiErrorMessage(templates.error, 'Không tải được danh sách template.')}
                  </AlertDescription>
                </Alert>
              )}

              {!templates.isPending && !templates.error && options.length === 0 && (
                <Alert variant="warning">
                  <AlertDescription>
                    Chưa có template nào gửi được. Một template chỉ chạy chiến dịch khi đang bật và không
                    phải PARTIAL.
                  </AlertDescription>
                </Alert>
              )}

              {templateCode && detail.isPending && <Skeleton className="h-24 w-full" />}

              {templateCode && detail.error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {apiErrorMessage(detail.error, 'Không tải được nội dung template.')}
                  </AlertDescription>
                </Alert>
              )}

              {notSendable && (
                <Alert variant="warning">
                  <AlertDescription>
                    Template này đang tắt hoặc là PARTIAL nên không tạo chiến dịch được (409). Chọn một
                    template khác, hoặc bật nó lên trong trình soạn template.
                  </AlertDescription>
                </Alert>
              )}

              {detail.data && (
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{detail.data.name}</span>
                    <Badge variant="secondary" size="sm" mono>
                      {detail.data.code}
                    </Badge>
                    <VersionChip version={detail.data.currentVersion} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Text variant="caption" muted>
                      Ngữ cảnh
                    </Text>
                    <ContextChips groups={detail.data.requiredContext} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Text variant="caption" muted>
                      Biến phải điền
                    </Text>
                    <CustomVariableChips names={detail.data.customVariables} />
                  </div>
                </div>
              )}

              <Field
                id="campaign-name"
                label="Tên chiến dịch (nội bộ)"
                hint={`Nhãn để nhận ra đợt gửi trong danh sách, KHÔNG phải tiêu đề mail. Tiêu đề lấy từ template. Tối đa ${CAMPAIGN_NAME_MAX} ký tự.`}
              >
                <Input
                  id="campaign-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={CAMPAIGN_NAME_MAX}
                  placeholder="Thông báo tính năng nhật ký hoạt động 09/2026"
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <Field
                label="Kiểu người nhận"
                hint={
                  needsWorkspace
                    ? 'Template này khai ngữ cảnh WORKSPACE nên chỉ gửi theo workspace được, lựa chọn theo tài khoản đã bị ẩn.'
                    : mode === 'workspace'
                      ? 'Mỗi workspace quy về chủ của nó. Workspace đã xóa mềm hoặc không còn chủ có email thì bị bỏ qua.'
                      : 'Mail đi thẳng tới các tài khoản này. Tài khoản không có email bị bỏ qua.'
                }
              >
                {/* Ẩn hẳn thay vì khoá: lý do khoá nằm trong tooltip thì bàn phím và cảm ứng không đọc được. */}
                <SegmentedControl
                  size="sm"
                  aria-label="Kiểu người nhận"
                  value={mode}
                  onValueChange={(v) => setModeChoice(v as Mode)}
                  options={
                    needsWorkspace
                      ? [{ value: 'workspace', label: 'Theo workspace (gửi tới chủ workspace)' }]
                      : [
                          { value: 'workspace', label: 'Theo workspace (gửi tới chủ workspace)' },
                          { value: 'account', label: 'Theo tài khoản' },
                        ]
                  }
                />
              </Field>

              <Field
                id="campaign-ids"
                label="Danh sách id"
                badge={
                  <Badge variant={ids.length > 0 ? 'info' : 'muted'} size="sm">
                    {ids.length} id
                  </Badge>
                }
                hint={`Mỗi dòng một id, dán từ bảng tính cũng được. Id trùng nhau chỉ tính một lần. Id bắt đầu bằng ${ID_TAG[mode]} và dài ${ID_LENGTH} ký tự.`}
              >
                <div className="flex flex-col gap-2">
                  <Textarea
                    id="campaign-ids"
                    rows={5}
                    value={rawIds[mode]}
                    onChange={(e) => setRawIds((prev) => ({ ...prev, [mode]: e.target.value }))}
                    placeholder={
                      mode === 'workspace'
                        ? 'wk8AA109MXP1XRBY\nwkNN0TC1ZMG8NMMP'
                        : 'ac8AA109MXP1XRBY\nacNN0TC1ZMG8NMMP'
                    }
                    error={malformed.length > 0}
                    className="font-mono"
                  />
                  {malformed.length > 0 && (
                    <Alert variant="warning">
                      <AlertDescription className="flex flex-col gap-1">
                        <span>
                          {malformed.length} id không đúng dạng, sửa hoặc bỏ khỏi danh sách rồi mới chạy
                          thử được:
                        </span>
                        <ul className="flex flex-col gap-0.5">
                          {malformed.slice(0, 8).map((id) => (
                            <li key={id}>
                              <code className="font-mono text-xs break-all">{id}</code>
                            </li>
                          ))}
                        </ul>
                        {malformed.length > 8 && <span>và {malformed.length - 8} id khác.</span>}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </Field>

              <Text variant="caption" muted>
                Một tài khoản đứng tên nhiều workspace chỉ nhận một mail.
              </Text>
            </>
          )}

          {step === 3 && (
            <>
              {variableProblems.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription className="flex flex-col items-start gap-2">
                    <span>
                      Danh sách biến của template đã đổi sau khi mở hộp thoại này. Tải lại rồi điền theo
                      version mới.
                    </span>
                    <ul className="flex list-disc flex-col gap-0.5 pl-4">
                      {variableProblems.map((p) => (
                        <li key={p}>{explainProblem(p, 'campaign')}</li>
                      ))}
                    </ul>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={reloadVariables}
                      disabled={busy || detail.isFetching}
                    >
                      {detail.isFetching ? <Spinner size="sm" /> : <RefreshCw className="size-4" />}
                      Tải lại danh sách biến của template
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {custom.length > 0 ? (
                <Field
                  label="Biến của template"
                  badge={
                    <Badge variant="warning" size="sm">
                      {custom.length} bắt buộc
                    </Badge>
                  }
                  hint="Giá trị dùng chung cho mọi người nhận. Thiếu một biến hoặc thừa một biến đều là 422."
                >
                  <CustomVariableInputs
                    names={custom}
                    values={variables}
                    onChange={(key, value) => setVariables((prev) => ({ ...prev, [key]: value }))}
                    disabled={busy}
                    placeholder="Giá trị gửi cho mọi người nhận"
                  />
                </Field>
              ) : (
                <Text variant="caption" muted>
                  Version này không khai biến tự do nào, chạy thử luôn được.
                </Text>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" onClick={runDryRun} disabled={busy || missing.length > 0}>
                  {dryRun.isPending ? <Spinner size="sm" /> : <FlaskConical className="size-4" />}
                  {ready ? 'Chạy thử lại' : 'Chạy thử (không ghi)'}
                </Button>
                {stale && (
                  <Text variant="caption" muted>
                    Dữ liệu đã đổi sau lần chạy thử, chạy lại để lấy số mới.
                  </Text>
                )}
              </div>

              {ready && (
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <StatCard
                      label="Sẽ gửi"
                      value={ready.queued}
                      icon={<Send />}
                      intent="success"
                      emphasizeValue
                    />
                    <StatCard
                      label="Bỏ qua vì trùng"
                      value={ready.skippedDuplicate}
                      icon={<Users />}
                      intent="warning"
                      emphasizeValue
                    />
                    <StatCard
                      label="Bỏ qua vì không có email"
                      value={ready.skippedNoEmail}
                      icon={<MailX />}
                      intent="info"
                      emphasizeValue
                    />
                  </div>
                  <Text variant="caption" muted>
                    Template {ready.templateCode} v{ready.templateVersion} sẽ được ghim cho đợt gửi này.
                    Chạy thử không chèn dòng nào.
                  </Text>
                  {ready.queued === 0 && (
                    <Alert variant="info">
                      <AlertDescription>
                        Không có người nhận hợp lệ. Chiến dịch vẫn tạo được, nó sẽ ở trạng thái DONE với 0
                        người nhận.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {ready && (
                <Alert variant="warning">
                  <AlertDescription>
                    Xếp hàng gửi {ready.queued} mail bằng template {templateName}
                    {version ? ` v${version}` : ''}. Mail đã gửi không thể rút lại; bạn chỉ có thể hủy phần
                    chưa gửi.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </DialogBody>

        <DialogFooter className="pt-4 sm:justify-between">
          <div className="flex">
            {step > 1 && (
              <Button
                variant="ghost"
                onClick={() => {
                  clearErrors();
                  setStep((s) => (s - 1) as Step);
                }}
                disabled={busy}
              >
                <ArrowLeft className="size-4" />
                Quay lại
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Hủy
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => {
                  clearErrors();
                  setStep((s) => (s + 1) as Step);
                }}
                disabled={!done[step]}
              >
                Tiếp tục
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Tooltip
                content={ready ? undefined : 'Chạy thử thành công với đúng dữ liệu đang nhập rồi mới gửi được'}
              >
                <span className="inline-flex">
                  <Button onClick={submit} disabled={busy || !ready}>
                    {create.isPending ? <Spinner size="sm" /> : <Send className="size-4" />}
                    {ready ? `Xếp hàng gửi ${ready.queued} mail` : 'Xếp hàng gửi'}
                  </Button>
                </span>
              </Tooltip>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Chỉ báo vị trí trong wizard; điều hướng nằm ở hàng nút dưới chân dialog. */
function StepRow({ current }: { current: Step }) {
  return (
    <ol className="flex shrink-0 items-center gap-2">
      {STEPS.map((label, index) => {
        const n = index + 1;
        const state = n < current ? 'done' : n === current ? 'current' : 'todo';
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                state === 'current' && 'bg-primary text-primary-foreground',
                state === 'done' && 'bg-success-soft text-success-deep',
                state === 'todo' && 'bg-secondary text-muted-foreground',
              )}
            >
              {state === 'done' ? <Check className="size-3.5" /> : n}
            </span>
            <span
              className={cn(
                'hidden truncate text-xs font-semibold sm:block',
                state === 'todo' ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {label}
            </span>
            {n < STEPS.length && <span className="h-px min-w-2 flex-1 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
