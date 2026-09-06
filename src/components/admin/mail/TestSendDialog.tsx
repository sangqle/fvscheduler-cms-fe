'use client';

import * as React from 'react';
import { Send, TriangleAlert } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/ToastProvider';
import { Field } from '@/components/admin/shared/Field';
import { CustomVariableInputs, contextVariables } from '@/components/admin/mail/MailContextFields';
import { WorkspacePicker } from '@/components/admin/mail/WorkspacePicker';
import { useMailTemplate, useMailTestSend } from '@/hooks/useAdminMail';
import { apiErrorMessage } from '@/lib/api/auth';
import { explainProblem, validationProblems } from '@/lib/admin/mail';
import { ApiError } from '@/types/api';

type Source = 'sample' | 'workspace' | 'account';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Một địa chỉ, đi thẳng không qua hàng đợi. Nhận cùng bộ ngữ cảnh với xem trước (`MailTestSendInput`
 * mở rộng `MailPreviewInput`). Template `PARTIAL` bị backend từ chối 409.
 */
export function TestSendDialog({
  templateCode,
  templateName,
  onOpenChange,
}: {
  /** null = đóng. */
  templateCode: string | null;
  templateName?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { showToast } = useToast();
  const send = useMailTestSend(templateCode ?? '');
  const template = useMailTemplate(templateCode);
  const [to, setTo] = React.useState('');
  const [source, setSource] = React.useState<Source>('sample');
  const [workspaceId, setWorkspaceId] = React.useState('');
  const [accountId, setAccountId] = React.useState('');
  const [variables, setVariables] = React.useState<Record<string, string>>({});
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [problems, setProblems] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!templateCode) return;
    setTo('');
    setSource('sample');
    setWorkspaceId('');
    setAccountId('');
    setVariables({});
    setSubmitted(false);
    setServerError(null);
    setProblems([]);
  }, [templateCode]);

  const custom = template.data?.customVariables ?? [];
  const needsWorkspace = (template.data?.requiredContext ?? []).includes('WORKSPACE');
  const emailError = EMAIL.test(to.trim()) ? undefined : 'Nhập một địa chỉ email hợp lệ.';

  function submit() {
    setSubmitted(true);
    setServerError(null);
    setProblems([]);
    if (emailError || !templateCode) return;
    send.mutate(
      {
        to: to.trim(),
        workspaceId: source === 'workspace' ? workspaceId.trim() || undefined : undefined,
        accountId: source === 'account' ? accountId.trim() || undefined : undefined,
        variables: contextVariables(custom, variables),
      },
      {
        onSuccess: (result) => {
          showToast({
            title: `Đã gửi thử tới ${result.to}`,
            description: `SES nhận với id ${result.providerMessageId}.`,
            variant: 'success',
          });
          onOpenChange(false);
        },
        onError: (e) => {
          setProblems(validationProblems(e));
          const message = apiErrorMessage(e, 'Không gửi được. Vui lòng thử lại.');
          // 500 = SES từ chối. Không tự gửi lại: mail này không qua hàng đợi nên mỗi lần bấm là một
          // lần gọi thật, thử lại ngầm có thể thành hai mail.
          if (e instanceof ApiError && e.status === 500) {
            showToast({ title: `Máy chủ mail từ chối gửi thử: ${message}`, variant: 'error' });
          }
          setServerError(message);
        },
      },
    );
  }

  return (
    <Dialog open={templateCode !== null} onOpenChange={(o) => !send.isPending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="primary">
            <Send />
          </DialogIcon>
          <div className="min-w-0">
            <DialogTitle>Gửi thử</DialogTitle>
            <DialogDescription>
              Gửi thẳng, không vào hàng đợi, không lưu nhật ký{templateName ? ` · ${templateName}` : ''}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>
                {serverError}
                {problems.length > 0 && (
                  <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4">
                    {problems.map((p) => (
                      <li key={p}>{explainProblem(p)}</li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Field id="test-send-to" label="Gửi tới" error={submitted ? emailError : undefined}>
            <Input
              id="test-send-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="ban@framevis.com"
              autoComplete="off"
              error={submitted && !!emailError}
              disabled={send.isPending}
            />
          </Field>

          <Field
            label="Lấy ngữ cảnh từ"
            hint={
              source === 'sample'
                ? 'Dữ liệu mẫu trong catalog biến, không đụng tới dữ liệu thật.'
                : 'Biến của nhóm ngữ cảnh sẽ lấy từ bản ghi thật này.'
            }
          >
            <div className="flex flex-col gap-2">
              <SegmentedControl
                size="sm"
                aria-label="Nguồn ngữ cảnh"
                value={source}
                onValueChange={(v) => setSource(v as Source)}
                disabled={send.isPending}
                options={[
                  { value: 'sample', label: 'Dữ liệu mẫu' },
                  { value: 'workspace', label: 'Workspace thật' },
                  { value: 'account', label: 'Tài khoản thật' },
                ]}
              />
              {source === 'workspace' && (
                <WorkspacePicker
                  id="test-send-workspace"
                  value={workspaceId}
                  onChange={setWorkspaceId}
                  disabled={send.isPending}
                />
              )}
              {source === 'account' && (
                <Input
                  id="test-send-account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  placeholder="ac8AA109MXP1XRBY"
                  aria-label="Id tài khoản lấy ngữ cảnh"
                  autoComplete="off"
                  disabled={send.isPending}
                  className="font-mono"
                />
              )}
            </div>
          </Field>

          {needsWorkspace && source !== 'workspace' && (
            <Text variant="caption" muted>
              Template này khai ngữ cảnh WORKSPACE. Chọn một workspace thật thì mới thấy đúng nội dung mail
              người nhận sẽ đọc.
            </Text>
          )}

          {templateCode && template.isPending && <Skeleton className="h-16 w-full" />}

          {custom.length > 0 && (
            <Field
              label="Biến của template"
              badge={
                <Badge variant="secondary" size="sm">
                  {custom.length} tùy chọn
                </Badge>
              }
              hint="Bỏ trống thì biến render nguyên dạng [tên biến], khác với chiến dịch là bắt buộc điền."
            >
              <CustomVariableInputs
                names={custom}
                values={variables}
                onChange={(key, value) => setVariables((prev) => ({ ...prev, [key]: value }))}
                disabled={send.isPending}
                placeholder="Bỏ trống để xem dạng [tên biến]"
              />
            </Field>
          )}

          {/* Test-send không ghi dòng nào: không có `mail_message`, nên cũng không có người nhận nào
              được lưu lại. API cũng không cho biết backend có đang bật chuyển hướng dev hay không,
              vì vậy nói "có thể", không nói chắc. */}
          <Alert variant="warning">
            <TriangleAlert className="size-4" />
            <AlertDescription>
              Đây là gửi thật qua SES: mail không vào hàng đợi, không sinh dòng nào trong outbox, và
              không tự động thử lại nếu thất bại. Nếu backend đang chạy ở môi trường dev, mail có thể bị
              chuyển hướng sang một địa chỉ cấu hình sẵn thay vì địa chỉ trên.
            </AlertDescription>
          </Alert>
        </DialogBody>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={send.isPending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={send.isPending}>
            {send.isPending ? <Spinner size="sm" /> : <Send className="size-4" />}
            Gửi thử
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
