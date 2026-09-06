'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CircleX, Copy, CornerDownRight, History, Megaphone, Save, Send } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Heading } from '@/components/ui/Heading';
import { Input } from '@/components/ui/Input';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { CodeEditor, type CodeEditorHandle } from '@/components/ui/CodeEditor';
import { Textarea } from '@/components/ui/Textarea';
import { Tooltip } from '@/components/ui/Tooltip';
import { useToast } from '@/components/ui/ToastProvider';
import { Field } from '@/components/admin/shared/Field';
import { ErrorState, NotFoundState, isNotFound } from '@/components/admin/shared/QueryState';
import { ChipListEditor, ToggleChip } from '@/components/admin/mail/ChipListEditor';
import { CreateCampaignDialog } from '@/components/admin/mail/CreateCampaignDialog';
import { TemplateFlags } from '@/components/admin/mail/mailDisplay';
import { TemplatePreview } from '@/components/admin/mail/TemplatePreview';
import { TestSendDialog } from '@/components/admin/mail/TestSendDialog';
import { VariablePanel } from '@/components/admin/mail/VariablePanel';
import { VersionConflictDialog } from '@/components/admin/mail/VersionConflictDialog';
import { VersionHistory } from '@/components/admin/mail/VersionHistory';
import { mailKeys, useMailTemplate, useUpdateMailTemplate } from '@/hooks/useAdminMail';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useUrlState } from '@/hooks/useUrlState';
import { apiErrorMessage } from '@/lib/api/auth';
import { MAIL_CATEGORY_OPTIONS, MAIL_CONTEXT_GROUPS, isSendableTemplate } from '@/lib/admin/labels';
import {
  FOOTER_INCLUDE,
  TEMPLATE_DESCRIPTION_MAX,
  TEMPLATE_NAME_MAX,
  concurrentVersion,
  explainProblem,
  insertAtCursor,
  insertVariable,
  lineCount,
  offsetOfLine,
  problemLine,
  validationProblems,
} from '@/lib/admin/mail';
import { cn, formatDateTime } from '@/lib/utils';
import type { AdminMailTemplate, AdminMailTemplateVersion, MailCategory, MailContextGroup } from '@/types/admin';

interface FormState {
  name: string;
  description: string;
  category: MailCategory;
  requiredContext: MailContextGroup[];
  subjectTemplate: string;
  htmlBody: string;
  customVariables: string[];
}

const EDITOR_ROWS = 24;

/** `edit` và `preview` không phải nửa của `split`: cột đơn được trọn ~1160px thay vì ~520px. */
type ViewMode = 'edit' | 'split' | 'preview';

const VIEW_MODES: readonly ViewMode[] = ['edit', 'split', 'preview'];

/** Mặc định thì **vắng mặt** khỏi URL, cùng quy ước với `?tab=` của `MailScreen`. */
const DEFAULT_VIEW: ViewMode = 'split';

function parseView(raw: string | undefined): ViewMode {
  return VIEW_MODES.includes(raw as ViewMode) ? (raw as ViewMode) : DEFAULT_VIEW;
}

function initial(t: AdminMailTemplate): FormState {
  return {
    name: t.name,
    description: t.description ?? '',
    category: t.category,
    // COMMON luôn có trong response nhưng không sửa được, nên nó không nằm trong form.
    requiredContext: t.requiredContext.filter((g) => g !== 'COMMON'),
    subjectTemplate: t.subjectTemplate,
    htmlBody: t.htmlBody,
    customVariables: t.customVariables,
  };
}

function sameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v) => b.includes(v));
}

/**
 * Soạn template. Lưu là INSERT một version mới rồi trỏ con trỏ sang đó, nên không có nút "hoàn tác
 * trên server": bản cũ vẫn nguyên và chiến dịch đang chạy vẫn render bằng version nó đã ghim.
 *
 * Bố cục: trang tràn hết bề ngang (`isFullWidthRoute`), một thanh công cụ dính đỉnh vùng cuộn mang
 * công tắc bố cục, lịch sử version và nút Lưu. Chúng phải dính vì cột nội dung dài cỡ 1400px: đặt ở
 * đầu trang thì cuộn xuống một đoạn là mất, mà lịch sử version chính là lối vào của khôi phục, của
 * dialog 409 và của nút "Xem".
 */
export function TemplateEditorScreen({ code }: { code: string }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const query = useMailTemplate(code);
  const update = useUpdateMailTemplate();
  const { get, set } = useUrlState();
  /**
   * "Chia đôi" chỉ có nghĩa từ `xl`: ở đúng 1024px hai cột còn ~364px mỗi bên, hẹp hơn cả cột thư
   * 600px mà khung xem trước dựng quanh. `useMediaQuery` trả `false` ở server và ở lần render đầu
   * bên client, nên lần vẽ đầu rơi vào "Soạn": một trạng thái hợp lệ (ô soạn ăn trọn bề ngang, thanh
   * chọn vẫn sáng đúng một ô) chứ không phải một bố cục hỏng cần vá lại sau khi hydrate.
   */
  const splitFits = useMediaQuery('(min-width: 1280px)');
  const storedView = parseView(get('view'));
  const view: ViewMode = storedView === 'split' && !splitFits ? 'edit' : storedView;

  const [form, setForm] = React.useState<FormState | null>(null);
  const [saveError, setSaveError] = React.useState<unknown>(null);
  const [conflictVersion, setConflictVersion] = React.useState<number | null>(null);
  const [testSendOpen, setTestSendOpen] = React.useState(false);
  const [campaignOpen, setCampaignOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const htmlRef = React.useRef<HTMLTextAreaElement | null>(null);
  const htmlScroll = React.useRef<CodeEditorHandle | null>(null);
  /** Dòng bị 422 chỉ ra, tô lại trong trình soạn cho tới khi người dùng gõ tiếp. */
  const [errorLine, setErrorLine] = React.useState<number | undefined>(undefined);
  /** Chưa đụng vào ô HTML thì `selectionStart` là 0; chèn ở cuối tự nhiên hơn là chèn lên đầu file. */
  const htmlTouched = React.useRef(false);
  const seeded = React.useRef<string | null>(null);

  const template = query.data;
  // Nạp form ĐÚNG MỘT LẦN cho mỗi code: refetch (sau 409, sau khi cửa sổ lấy lại focus) không được
  // đè lên chữ đang gõ. Lưu xong thì `save()` tự nạp lại từ bản vừa lưu.
  React.useEffect(() => {
    if (template && seeded.current !== template.code) {
      seeded.current = template.code;
      setForm(initial(template));
    }
  }, [template]);

  if (query.error && !template) {
    if (isNotFound(query.error)) {
      return (
        <NotFoundState
          title="Không tìm thấy template này"
          description={`Mã ${code} không có trong danh sách. Mã template phân biệt hoa thường và không đổi được sau khi tạo.`}
          backHref="/mail"
          backLabel="Về email hệ thống"
        />
      );
    }
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }

  if (!template || !form) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const nextVersion = template.currentVersion + 1;
  const partial = form.category === 'PARTIAL';
  const problems = validationProblems(saveError);
  const dirty =
    form.name !== template.name ||
    form.description !== (template.description ?? '') ||
    form.category !== template.category ||
    form.subjectTemplate !== template.subjectTemplate ||
    form.htmlBody !== template.htmlBody ||
    !sameSet(form.requiredContext, template.requiredContext.filter((g) => g !== 'COMMON')) ||
    !sameSet(form.customVariables, template.customVariables);

  function patch(next: Partial<FormState>) {
    setForm((prev) => (prev ? { ...prev, ...next } : prev));
  }

  function setView(next: ViewMode) {
    set({ view: next === DEFAULT_VIEW ? undefined : next });
  }

  /**
   * Danh sách lỗi 422 và nội dung vừa khôi phục đều rơi vào cột soạn. Nếu cột đó đang ẩn thì thao
   * tác coi như không xảy ra, nên kéo nó ra trước. Về mặc định chứ không cứng `edit`: dưới `xl`
   * mặc định tự rút thành `edit`, còn từ `xl` thì giữ luôn khung xem trước bên cạnh.
   */
  function revealEditor() {
    if (view === 'preview') setView(DEFAULT_VIEW);
  }

  function toggleContext(group: MailContextGroup) {
    if (!form) return;
    patch({
      requiredContext: form.requiredContext.includes(group)
        ? form.requiredContext.filter((g) => g !== group)
        : [...form.requiredContext, group],
    });
  }

  function addContext(group: MailContextGroup) {
    if (!form || form.requiredContext.includes(group)) return;
    patch({ requiredContext: [...form.requiredContext, group] });
  }

  function focusHtml(caret: number) {
    requestAnimationFrame(() => {
      const el = htmlRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(caret, caret);
      // `focus()` chỉ cuộn vừa đủ để ô lộ ra, mà thanh công cụ dính đang che mất dải trên cùng của
      // nó. `scroll-margin-top` không cứu được vì trình duyệt nhắm vào `<textarea>` bên trong
      // CodeEditor chứ không phải khối bọc mà ta gắn class được.
      el.scrollIntoView({ block: 'center' });
      htmlTouched.current = true;
    });
  }

  /** `null` khi ô HTML chưa được đụng tới: helper sẽ chèn ở cuối thay vì lên đầu file. */
  function htmlTarget() {
    return htmlTouched.current ? htmlRef.current : null;
  }

  function applyInsert({ next, caret }: { next: string; caret: number }) {
    patch({ htmlBody: next });
    focusHtml(caret);
  }

  function insertFooter() {
    if (form) applyInsert(insertAtCursor(htmlTarget(), form.htmlBody, FOOTER_INCLUDE));
  }

  function insertVariableAtCursor(name: string) {
    if (form) applyInsert(insertVariable(htmlTarget(), form.htmlBody, name));
  }

  /**
   * Đặt con trỏ vào dòng lỗi, tô nó lại rồi cuộn tới. Phải cuộn bằng lệnh: bấm lại đúng nút "Tới
   * dòng N" thì `errorLine` không đổi nên React bỏ qua, mà ô đang được focus sẵn cũng không tự cuộn.
   */
  function goToLine(line: number) {
    if (!form) return;
    setErrorLine(line);
    const el = htmlRef.current;
    if (el) {
      const caret = offsetOfLine(form.htmlBody, line);
      el.focus();
      el.setSelectionRange(caret, caret);
      // Cùng lý do với `focusHtml`: canh giữa để dòng lỗi không nằm khuất dưới thanh công cụ dính.
      el.scrollIntoView({ block: 'center' });
      htmlTouched.current = true;
    }
    htmlScroll.current?.scrollToLine(line);
  }

  function restore(v: AdminMailTemplateVersion) {
    patch({
      subjectTemplate: v.subjectTemplate,
      htmlBody: v.htmlBody,
      customVariables: v.customVariables,
    });
    setHistoryOpen(false);
    revealEditor();
    showToast({
      title: `Đã nạp nội dung v${v.version} vào trình soạn`,
      description: `Chưa ghi gì lên server. Bấm "Lưu thành v${nextVersion}" thì nội dung này thành một version MỚI, v${v.version} vẫn nguyên.`,
    });
  }

  function save() {
    if (!form) return;
    setSaveError(null);
    update.mutate(
      {
        code,
        input: {
          name: form.name.trim(),
          description: form.description.trim() || null,
          category: form.category,
          requiredContext: form.requiredContext,
          subjectTemplate: form.subjectTemplate,
          htmlBody: form.htmlBody,
          customVariables: form.customVariables,
        },
      },
      {
        onSuccess: (saved) => {
          setForm(initial(saved));
          showToast({
            title: `Đã lưu thành v${saved.currentVersion}`,
            description: 'Bản trước giữ nguyên; chiến dịch đang chạy vẫn render bằng version nó đã ghim.',
            variant: 'success',
          });
        },
        onError: (e) => {
          // 409 có số version hiện hành: hỏi người dùng chứ tuyệt đối không tự PUT lại.
          const conflict = concurrentVersion(e);
          if (conflict !== undefined) {
            setConflictVersion(conflict);
            return;
          }
          setSaveError(e);
          // Lỗi nào có số dòng thì tô ngay dòng đó, khỏi bắt người dùng bấm thêm một nhịp.
          setErrorLine(validationProblems(e).map(problemLine).find((n) => n !== undefined));
          revealEditor();
        },
      },
    );
  }

  function reloadAfterConflict() {
    void queryClient.invalidateQueries({ queryKey: mailKeys.versions(code) });
    void query.refetch().then(() => setConflictVersion(null));
  }

  /**
   * Bản nháp sống sót sau khi tải lại dữ liệu, nhưng nó chỉ nằm trong tab này: chép ra ngoài là lối
   * thoát duy nhất nếu người dùng lỡ đóng tab hoặc F5 trình duyệt trước khi lưu được.
   */
  async function copyDraft() {
    if (!form) return;
    const draft = [form.subjectTemplate.trim() && `Tiêu đề: ${form.subjectTemplate}`, form.htmlBody]
      .filter(Boolean)
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(draft);
      showToast({ title: 'Đã chép nội dung đang soạn', variant: 'success', duration: 2000 });
    } catch {
      showToast({ title: 'Không chép được, hãy bôi đen trong ô soạn để chép tay', variant: 'warning' });
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      showToast({ title: 'Đã chép mã template', variant: 'success', duration: 2000 });
    } catch {
      showToast({ title: 'Không chép được, hãy bôi đen để chép tay', variant: 'warning' });
    }
  }

  // Dưới `xl` không có ô "Chia đôi" nào để chọn, nên nó cũng không được có mặt trong thanh chọn.
  const viewOptions = [
    { value: 'edit', label: 'Soạn' },
    ...(splitFits ? [{ value: 'split', label: 'Chia đôi' }] : []),
    { value: 'preview', label: 'Xem trước' },
  ];

  const campaignBlocked = !isSendableTemplate(template)
    ? template.category === 'PARTIAL'
      ? 'PARTIAL không tạo chiến dịch được, nó chỉ để include vào template khác. Server trả 409.'
      : 'Template đang tắt, bật lên rồi mới tạo chiến dịch được. Server trả 409.'
    : undefined;
  // Gửi thử KHÔNG kiểm cờ active, chỉ chặn PARTIAL: gửi bản nháp vào hộp thư mình trước khi bật là
  // đúng luồng của backend (test-send bỏ qua `active`, chỉ tạo chiến dịch mới kiểm).
  const testSendBlocked =
    template.category === 'PARTIAL'
      ? 'PARTIAL không gửi riêng được, nó chỉ là mảnh được include. Server trả 409.'
      : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Button variant="link" size="sm" className="self-start" asChild>
          <Link href="/mail">
            <ArrowLeft className="size-4" />
            Email hệ thống
          </Link>
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Heading level="2">{template.name}</Heading>
              <Badge variant={template.active ? 'success' : 'muted'} size="sm">
                {template.active ? 'Đang bật' : 'Đã tắt'}
              </Badge>
              <TemplateFlags template={{ active: true, category: template.category }} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <Badge variant="secondary" size="sm" mono="plain" interactive asChild>
                <button type="button" onClick={copyCode} aria-label={`Chép mã template ${code}`}>
                  {code}
                  <Copy className="size-3" />
                </button>
              </Badge>
              <span>· đang phát hành v{template.currentVersion}</span>
              <span>· sửa lần cuối {formatDateTime(template.updatedAt)}</span>
            </div>
          </div>
          {/*
            Chỉ "Lịch sử version" xuống thanh công cụ dính, hai nút này ở lại đây: thanh đó đã mang
            công tắc bố cục ba ô cùng Hoàn tác và Lưu, `lg:flex-nowrap` nên thêm hai nút nữa là nó
            tràn ngang chứ không xuống hàng. Gửi thử và Tạo chiến dịch cũng không phải thứ cần với
            tay tới giữa lúc đang gõ.
          */}
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* Nút disabled không nhận hover, nên tooltip bám vào span bọc ngoài. */}
            <Tooltip content={testSendBlocked}>
              <span className="inline-flex">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={Boolean(testSendBlocked)}
                  onClick={() => setTestSendOpen(true)}
                >
                  <Send className="size-4" />
                  Gửi thử
                </Button>
              </span>
            </Tooltip>
            <Tooltip content={campaignBlocked}>
              <span className="inline-flex">
                <Button size="sm" disabled={Boolean(campaignBlocked)} onClick={() => setCampaignOpen(true)}>
                  <Megaphone className="size-4" />
                  Tạo chiến dịch
                </Button>
              </span>
            </Tooltip>
          </div>
        </div>
      </div>

      {/*
        Thanh công cụ dính đỉnh vùng cuộn. `main` là vùng cuộn duy nhất của app nên `top-0` bám đúng
        mép trên nhìn thấy được, và `-mx-4 sm:-mx-6` trả nó về sát hai mép của `main`. Cao 53px = đệm
        8+8 + hàng cao 36px (thanh chọn `size="sm"`: khay 4px + tab 32px, cao hơn nút `sm` 32px nên
        chính nó quyết định chiều cao hàng) + viền 1px. `xl:top-14` của cột xem trước đo theo con số
        này; đổi cỡ bất kỳ control nào trong hàng là phải đo lại cả hai.
      */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 lg:flex-nowrap">
          {/* `me-auto` ghim công tắc ở mép trái để phần còn lại dồn về mép phải quanh nút Lưu. */}
          <SegmentedControl
            size="sm"
            aria-label="Bố cục màn soạn"
            className="me-auto shrink-0"
            value={view}
            onValueChange={(v) => setView(v as ViewMode)}
            options={viewOptions}
          />
          {/* Bản rút gọn của câu ở chân khối Nội dung: một thanh ngang không chứa nổi cả câu. */}
          <Text variant="caption" muted className="hidden min-w-0 truncate md:block">
            Lưu sinh v{nextVersion}, v{template.currentVersion} giữ nguyên
          </Text>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            aria-label="Lịch sử version"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="size-4" />
            <span className="hidden lg:inline">Lịch sử version</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => {
              setForm(initial(template));
              setSaveError(null);
            }}
            disabled={!dirty || update.isPending}
          >
            Hoàn tác
          </Button>
          <Button size="sm" className="shrink-0" onClick={save} disabled={!dirty || update.isPending}>
            {update.isPending ? <Spinner size="sm" /> : <Save className="size-4" />}
            Lưu thành v{nextVersion}
          </Button>
        </div>
      </div>

      {/* Tải lại hỏng nhưng bản cũ còn trong cache: cảnh báo thay vì thay cả màn bằng ErrorState. */}
      {query.error && (
        <Alert variant="warning">
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>
              Không làm mới được template: {apiErrorMessage(query.error, 'máy chủ không trả lời.')} Nội dung
              dưới đây là bản đọc lần trước.
            </span>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()} disabled={query.isFetching}>
              {query.isFetching && <Spinner size="sm" />}
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/*
        Chia đôi từ `xl` chứ không `lg`, và 45/55 chứ không đều nhau: ở đúng 1024px chia đôi cho ra
        ~364px mỗi bên, còn khung thư thì dựng quanh cột 600px nên bên phải mới là bên cần chỗ. Ở 1440
        hai cột ra ~515px và ~629px. Dưới `xl` công tắc bố cục gánh phần việc này.

        Cả hai cột LUÔN mount, chỉ ẩn/hiện bằng `hidden`: tháo `CodeEditor` là mất vị trí con trỏ và
        chỗ đang cuộn trong một template 900 dòng, tháo `TemplatePreview` là ném đi một lượt render đã
        xin của server. `flex-45`/`flex-55` chia phần dư nên cột nào còn lại một mình cũng tự ăn trọn
        bề ngang.

        `min-h` khớp chiều cao cột phải: form ngắn hơn màn hình thì hàng không được thấp hơn cột dính,
        không thì nó thò ra ngoài đáy hàng và `sticky` cũng hết chỗ trượt.
      */}
      <div className="flex flex-col gap-4 xl:min-h-[calc(100dvh-137px)] xl:flex-row">
        <div className={cn('flex min-w-0 flex-col gap-4 xl:flex-45', view === 'preview' && 'hidden')}>
          <Card padding="sm">
            <CardHeader className="gap-1">
              <CardTitle size="md">Danh tính</CardTitle>
              <Text variant="caption" muted className="font-mono">
                PUT /api/admin/mail/templates/{code}
              </Text>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {/* Không có ô `code` ở đây: mã bất biến sau khi tạo, mà một ô disabled vừa trông như
                  sửa được vừa rơi khỏi thứ tự tab nên người dùng bàn phím không đọc nổi. Mã nằm ở
                  tiêu đề màn, kèm nút chép. */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  id="editor-name"
                  label="Tên"
                  hint="Tên nội bộ để nhận ra trong danh sách, không phải tiêu đề mail"
                >
                  {/* Khoá cả form trong lúc PUT chạy: `onSuccess` nạp lại từ bản vừa lưu, nên chữ gõ
                      xen giữa sẽ bị nuốt mà không báo gì. */}
                  <Input
                    id="editor-name"
                    value={form.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    maxLength={TEMPLATE_NAME_MAX}
                    disabled={update.isPending}
                  />
                </Field>
                <Field
                  label="Loại"
                  hint={MAIL_CATEGORY_OPTIONS.find((o) => o.value === form.category)?.hint}
                >
                  <SegmentedControl
                    aria-label="Loại template"
                    value={form.category}
                    onValueChange={(v) => patch({ category: v as MailCategory })}
                    options={MAIL_CATEGORY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                    disabled={update.isPending}
                  />
                </Field>
              </div>

              <Field id="editor-description" label="Mô tả" hint="Ghi chú nội bộ, không xuất hiện trong mail">
                <Textarea
                  id="editor-description"
                  rows={2}
                  autoResize
                  value={form.description}
                  onChange={(e) => patch({ description: e.target.value })}
                  maxLength={TEMPLATE_DESCRIPTION_MAX}
                  disabled={update.isPending}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  label="Ngữ cảnh cần"
                  hint="Cần WORKSPACE thì chiến dịch phải gửi theo workspaceIds"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ToggleChip label="COMMON" active disabled onToggle={() => {}} />
                    {MAIL_CONTEXT_GROUPS.map((g) => (
                      <ToggleChip
                        key={g.value}
                        label={g.value}
                        active={form.requiredContext.includes(g.value)}
                        disabled={update.isPending}
                        onToggle={() => toggleContext(g.value)}
                      />
                    ))}
                  </div>
                </Field>
                <Field
                  label={`Biến tự do khai cho v${nextVersion}`}
                  hint="Phải khai tường minh, không suy ra từ nội dung"
                >
                  <ChipListEditor
                    values={form.customVariables}
                    onChange={(customVariables) => patch({ customVariables })}
                    disabled={update.isPending}
                  />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card padding="sm">
            <CardHeader className="gap-1">
              <CardTitle size="md">Nội dung</CardTitle>
              <Text variant="caption" muted>
                Pebble · tự escape HTML · không tắt được
              </Text>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field
                id="editor-subject"
                label="Tiêu đề"
                hint={
                  partial
                    ? 'Partial không có tiêu đề, nó chỉ là mảnh được include vào template khác'
                    : 'Tiêu đề là văn bản thuần, không escape HTML'
                }
              >
                <Input
                  id="editor-subject"
                  value={form.subjectTemplate}
                  disabled={partial || update.isPending}
                  onChange={(e) => patch({ subjectTemplate: e.target.value })}
                  className="font-mono"
                />
              </Field>

              <VariablePanel
                requiredContext={form.requiredContext}
                customVariables={form.customVariables}
                onInsert={insertVariableAtCursor}
                onRequestGroup={addContext}
                onInsertFooter={insertFooter}
              />

              <Field
                id="editor-html"
                label="Thân HTML"
                badge={
                  <Badge variant="secondary" size="sm" mono="plain">
                    {lineCount(form.htmlBody)} dòng
                  </Badge>
                }
              >
                <CodeEditor
                  id="editor-html"
                  ref={htmlRef}
                  handleRef={htmlScroll}
                  rows={EDITOR_ROWS}
                  value={form.htmlBody}
                  onChange={(htmlBody) => {
                    setErrorLine(undefined);
                    patch({ htmlBody });
                  }}
                  onSelect={() => {
                    htmlTouched.current = true;
                  }}
                  highlightLine={errorLine}
                  disabled={update.isPending}
                  aria-label="Thân HTML của template"
                />
              </Field>

              <Text variant="caption" muted>
                Một mail là một template độc lập. Muốn có chân trang chung thì tự chèn{' '}
                <code className="font-mono">{FOOTER_INCLUDE}</code> vào đúng chỗ, hệ thống không tự ghép giúp
                bạn. Include luôn lấy bản hiện hành của partial lúc gửi.
              </Text>

              {problems.length > 0 && <SaveProblems problems={problems} onGoToLine={goToLine} />}

              {saveError !== null && problems.length === 0 && (
                <Alert variant="destructive">
                  <CircleX className="size-4" />
                  <AlertTitle>Chưa lưu được</AlertTitle>
                  <AlertDescription>
                    {apiErrorMessage(saveError, 'Không lưu được template. Vui lòng thử lại.')} Không có version
                    mới nào được ghi, v{template.currentVersion} vẫn là bản đang phát hành.
                  </AlertDescription>
                </Alert>
              )}

              {/* Câu đầy đủ ở lại đây; thanh công cụ chỉ mang bản rút gọn của nó. */}
              <div className="border-t border-border pt-3">
                <Text variant="caption" muted>
                  Lưu sẽ sinh <b>v{nextVersion}</b> và trỏ bản phát hành sang đó, kể cả khi bạn chỉ đổi mỗi
                  cái tên. v{template.currentVersion} giữ nguyên, chiến dịch đang chạy vẫn render bằng nó.
                </Text>
              </div>
            </CardContent>
          </Card>
        </div>

        {/*
          Cột xem trước dính lại trong lúc cột trái cuộn, chỉ từ `xl` vì dưới đó nó nằm dưới ô soạn chứ
          không cạnh. `top-14` (56px) nhét mép trên xuống dưới thanh công cụ cao 53px, chừa 3px để viền
          trên và góc bo của thẻ không bị cắt cụt; `h-` trừ đi 137px = topbar 57px + 56px đó + đệm dưới
          24px của `main`. `h-` chứ không `max-h-`: khung thư bên trong tràn theo chiều cao cột, mà một
          cột `max-h-` vẫn cao theo nội dung nên không có con số nào để tràn theo. `self-start` để cột
          không bị kéo cao bằng cột trái, nếu không thì `sticky` hết chỗ trống để trượt trong.
        */}
        <div
          className={cn(
            'min-w-0 xl:sticky xl:top-14 xl:h-[calc(100dvh-137px)] xl:flex-55 xl:self-start',
            view === 'edit' && 'hidden',
          )}
        >
          <TemplatePreview
            code={code}
            currentVersion={template.currentVersion}
            customVariables={template.customVariables}
            draftSubject={form.subjectTemplate}
            draftHtml={form.htmlBody}
            draftCustomVariables={form.customVariables}
            draftContext={form.requiredContext}
            dirty={dirty}
            canSave={dirty && !update.isPending}
            saving={update.isPending}
            onSaveAndPreview={save}
            pane={view === 'split' ? 'split' : 'full'}
          />
        </div>
      </div>

      <VersionHistory
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        code={code}
        currentVersion={template.currentVersion}
        onRestore={restore}
      />
      <VersionConflictDialog
        version={conflictVersion}
        reloading={query.isFetching}
        onReload={reloadAfterConflict}
        onCopyDraft={copyDraft}
        onOpenChange={(o) => !o && setConflictVersion(null)}
      />
      <TestSendDialog
        templateCode={testSendOpen ? code : null}
        templateName={template.name}
        onOpenChange={setTestSendOpen}
      />
      <CreateCampaignDialog open={campaignOpen} onOpenChange={setCampaignOpen} initialTemplateCode={code} />
    </div>
  );
}

/**
 * 422 trả `data` là danh sách MỌI lỗi cùng lúc, nên phải hiện đủ từng dòng: gộp thành một câu là
 * bắt người soạn lưu năm lần để moi ra năm lỗi. Giữ nguyên chuỗi gốc bên cạnh bản dịch vì tiền tố
 * backend ổn định và người vận hành có khi cần đọc đúng nó.
 */
function SaveProblems({ problems, onGoToLine }: { problems: string[]; onGoToLine: (line: number) => void }) {
  return (
    <Alert variant="destructive">
      <CircleX className="size-4" />
      <AlertTitle>Chưa lưu được · 422</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <span>
          {problems.length} lỗi cần sửa. Không có version mới nào được ghi, bản đang phát hành vẫn nguyên.
        </span>
        <ul className="flex flex-col gap-2">
          {problems.map((p, i) => {
            const line = problemLine(p);
            return (
              <li
                key={`${i}-${p}`}
                className="flex flex-col items-start gap-1 rounded-lg border border-destructive/40 bg-card px-3 py-2"
              >
                <span className="text-sm font-medium text-foreground">{explainProblem(p)}</span>
                <code className="font-mono text-[11px] text-muted-foreground">{p}</code>
                {line !== undefined && (
                  <Button variant="outline" size="sm" onClick={() => onGoToLine(line)}>
                    <CornerDownRight className="size-3.5" />
                    Tới dòng {line}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <span>
          Kiểm tra chạy ngay lúc lưu nên chuỗi <code className="font-mono">{'{{ }}'}</code> gõ sai không bao giờ
          tới hộp thư khách.
        </span>
      </AlertDescription>
    </Alert>
  );
}
