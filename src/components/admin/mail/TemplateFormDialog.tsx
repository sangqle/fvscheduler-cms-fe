'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MailPlus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
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
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { Field } from '@/components/admin/shared/Field';
import { ChipListEditor, ToggleChip } from '@/components/admin/mail/ChipListEditor';
import { useCreateMailTemplate } from '@/hooks/useAdminMail';
import { apiErrorMessage } from '@/lib/api/auth';
import { MAIL_CATEGORY_OPTIONS, MAIL_CONTEXT_GROUPS } from '@/lib/admin/labels';
import { TEMPLATE_NAME_MAX, explainProblem, validateTemplateCode, validationProblems } from '@/lib/admin/mail';
import type { MailCategory, MailContextGroup } from '@/types/admin';

const EMPTY_BODY = '<h1>Tiêu đề</h1>\n<p>Nội dung…</p>\n';

/**
 * Tạo template mới (POST /templates). Mã không đổi được sau khi tạo; nội dung chi tiết soạn ở
 * trang riêng, ở đây chỉ cần đủ để bản v1 biên dịch được.
 */
export function TemplateFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const create = useCreateMailTemplate();

  const [code, setCode] = React.useState('');
  const [name, setName] = React.useState('');
  const [category, setCategory] = React.useState<MailCategory>('ANNOUNCEMENT');
  const [context, setContext] = React.useState<MailContextGroup[]>(['WORKSPACE']);
  const [customVariables, setCustomVariables] = React.useState<string[]>([]);
  const [subject, setSubject] = React.useState('');
  const [html, setHtml] = React.useState(EMPTY_BODY);
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [problems, setProblems] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!open) return;
    setCode('');
    setName('');
    setCategory('ANNOUNCEMENT');
    setContext(['WORKSPACE']);
    setCustomVariables([]);
    setSubject('');
    setHtml(EMPTY_BODY);
    setSubmitted(false);
    setServerError(null);
    setProblems([]);
  }, [open]);

  const partial = category === 'PARTIAL';
  const codeError = validateTemplateCode(code);
  const nameError = name.trim() ? undefined : 'Nhập tên template.';
  const subjectError = partial || subject.trim() ? undefined : 'Nhập tiêu đề mail.';
  const invalid = !!codeError || !!nameError || !!subjectError || !html.trim();

  function submit() {
    setSubmitted(true);
    setServerError(null);
    setProblems([]);
    if (invalid) return;
    create.mutate(
      {
        code: code.trim(),
        name: name.trim(),
        description: null,
        category,
        requiredContext: context,
        subjectTemplate: subject,
        htmlBody: html,
        customVariables,
      },
      {
        onSuccess: (t) => {
          showToast({
            title: `Đã tạo template ${t.code}`,
            description: 'Bản v1 đã phát hành. Soạn nội dung rồi lưu là sinh v2.',
            variant: 'success',
          });
          onOpenChange(false);
          router.push(`/mail/templates/${t.code}`);
        },
        onError: (e) => {
          setProblems(validationProblems(e));
          setServerError(apiErrorMessage(e, 'Không tạo được template. Vui lòng thử lại.'));
        },
      },
    );
  }

  function toggleContext(group: MailContextGroup) {
    setContext((prev) => (prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !create.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="flex-row items-start gap-3 pr-8 text-left">
          <DialogIcon tone="primary">
            <MailPlus />
          </DialogIcon>
          <div className="min-w-0">
            <DialogTitle>Tạo template</DialogTitle>
            <DialogDescription>Lưu là sinh version mới, hai replica nhận ngay, không cần restart</DialogDescription>
          </div>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          {serverError && (
            <Alert variant="destructive">
              <AlertDescription>
                {serverError}
                {problems.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {problems.map((p, i) => (
                      <li
                        key={`${i}-${p}`}
                        className="flex flex-col items-start gap-0.5 rounded-lg border border-destructive/40 bg-card px-3 py-2"
                      >
                        <span className="text-sm font-medium text-foreground">{explainProblem(p)}</span>
                        <code className="font-mono text-[11px] text-muted-foreground">{p}</code>
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          <Field
            id="template-code"
            label="Code"
            hint="Chữ thường, số và gạch ngang · không đổi được sau khi tạo, đây là định danh trong mọi route"
            error={submitted ? codeError : undefined}
          >
            <Input
              id="template-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toLowerCase())}
              placeholder="feature-announcement-2026-09"
              className="font-mono"
              autoComplete="off"
              error={submitted && !!codeError}
            />
          </Field>

          <Field id="template-name" label="Tên" error={submitted ? nameError : undefined}>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={TEMPLATE_NAME_MAX}
              placeholder="Thông báo tính năng nhật ký hoạt động"
              error={submitted && !!nameError}
            />
          </Field>

          <Field label="Loại" hint={MAIL_CATEGORY_OPTIONS.find((o) => o.value === category)?.hint}>
            <SegmentedControl
              aria-label="Loại template"
              value={category}
              onValueChange={(v) => setCategory(v as MailCategory)}
              options={MAIL_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </Field>

          <Field
            label="Ngữ cảnh cần"
            hint="COMMON luôn có · cần WORKSPACE thì chiến dịch phải gửi theo workspaceIds"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <ToggleChip label="COMMON" active disabled onToggle={() => {}} />
              {MAIL_CONTEXT_GROUPS.map((g) => (
                <ToggleChip
                  key={g.value}
                  label={g.value}
                  active={context.includes(g.value)}
                  onToggle={() => toggleContext(g.value)}
                />
              ))}
            </div>
          </Field>

          <Field label="Biến tự do" hint="Phải khai tường minh, không suy ra từ nội dung">
            <ChipListEditor values={customVariables} onChange={setCustomVariables} disabled={create.isPending} />
          </Field>

          <Field
            id="template-subject"
            label="Tiêu đề"
            hint={
              partial
                ? 'Partial không có tiêu đề, nó chỉ là mảnh được include vào template khác'
                : 'Văn bản thuần, không escape HTML'
            }
            error={submitted ? subjectError : undefined}
          >
            <Input
              id="template-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="{{ featureName }} đã có trên Framevis"
              className="font-mono"
              disabled={partial}
              error={submitted && !!subjectError}
            />
          </Field>

          <Field id="template-html" label="Thân HTML">
            <Textarea
              id="template-html"
              rows={6}
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              className="font-mono"
            />
          </Field>

          <Text variant="caption" muted>
            Pebble tự escape HTML và không tắt được · biến sai hoặc cú pháp hỏng bị chặn ngay lúc lưu kèm số
            dòng
          </Text>
        </DialogBody>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Hủy
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending && <Spinner size="sm" />}
            Tạo template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
