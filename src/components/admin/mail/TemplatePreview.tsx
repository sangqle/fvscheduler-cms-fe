'use client';

import * as React from 'react';
import { RefreshCw, Save } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { WorkspacePicker } from '@/components/admin/mail/WorkspacePicker';
import { useMailPreview, useMailVariables } from '@/hooks/useAdminMail';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { apiErrorMessage } from '@/lib/api/auth';
import { declaredGroups, renderDraft, unsupportedPebble } from '@/lib/admin/mail';
import { cn } from '@/lib/utils';
import type { MailContextGroup, MailContextInput } from '@/types/admin';

type Source = 'sample' | 'workspace' | 'account';

/**
 * `draft`: dựng tại trình duyệt theo nội dung đang gõ, đổi theo từng ký tự. `saved`: server render
 * bản đang phát hành. Hai bản trả lời hai câu hỏi khác nhau ("tôi vừa sửa ra cái gì" và "người nhận
 * đang thấy cái gì"), nên chúng là hai lựa chọn song song chứ không phải một cái thay cái kia.
 */
type Mode = 'draft' | 'saved';

/** `split`: nửa hàng cạnh ô soạn. `full`: một mình trên bề ngang trang. */
export type PreviewPane = 'split' | 'full';

/**
 * Bề cao khung thư dưới `xl`, nơi khối này nằm trong một trang cuộn bình thường: không có chiều cao
 * nào để chia nên phải chốt số, và chỗ được cấp mới thật sự khác nhau. `split` còn ô soạn ở trên nên
 * chỉ cần vừa một mail ngắn; `full` chiếm cả trang một mình nên cao thêm. Đi bằng prop chứ không
 * đoán bằng breakpoint: chỉ trang gọi mới biết nó đang xếp kiểu nào.
 */
const FRAME_HEIGHT: Record<PreviewPane, string> = {
  split: 'h-[44rem]',
  full: 'h-[52rem]',
};

/**
 * Từ `xl` cột xem trước của `TemplateEditorScreen` đã cao đúng bằng màn hình ở cả hai kiểu, nên khung
 * thư nuốt phần cột còn thừa thay vì chốt số: chốt cao hơn cột thì phần thò ra khỏi khối dính không
 * cuộn tới được. `min-h-64` là sàn để nó không bị bóp còn vài pixel khi bảng biến tự do và cảnh báo
 * "chưa lưu" cùng bung ra, lúc đó `CardContent` cuộn chứ khung thư không co thêm.
 */
const FRAME_FILL = 'xl:h-auto xl:min-h-64 xl:flex-1';

/**
 * Nhịp chờ trước khi dựng lại bản nháp. Đủ ngắn để cảm giác là "theo kịp lúc gõ", đủ dài để một câu
 * gõ liền mạch chỉ tốn một lần nạp lại iframe thay vì một lần mỗi ký tự.
 */
const DRAFT_DEBOUNCE_MS = 300;

/**
 * Hai bản xem trước cho cùng một template.
 *
 * **Bản nháp** dựng ngay tại trình duyệt từ nội dung đang gõ. Nó phải nằm ở client vì đường lưu của
 * module này sinh một version bất biến mỗi lần ghi: không thể lưu mỗi nhịp gõ chỉ để nhờ server
 * render. Đổi lại nó chỉ thay được `{{ tenBien }}`; `{% include %}`, `{% if %}` và mọi biểu thức
 * khác giữ nguyên văn, và khối này nói thẳng ra thay vì để người soạn tưởng chúng đã chạy.
 *
 * **Bản đã lưu** là `POST /preview` cũ: server render đúng version đang phát hành, chạy đủ Pebble và
 * đọc được ngữ cảnh thật của một workspace hoặc tài khoản. Nó không gửi gì và không ghi gì.
 */
export function TemplatePreview({
  code,
  currentVersion,
  customVariables,
  draftSubject,
  draftHtml,
  draftCustomVariables,
  draftContext,
  dirty,
  canSave,
  saving,
  onSaveAndPreview,
  pane,
}: {
  code: string;
  currentVersion: number;
  /** Biến tự do của **bản đã lưu**: server render đúng bản đó, không phải form đang sửa. */
  customVariables: string[];
  /** Ba prop dưới đây là form đang sửa, nguồn của bản nháp. */
  draftSubject: string;
  draftHtml: string;
  draftCustomVariables: string[];
  /** `requiredContext` của form (không gồm `COMMON`): quyết định lấy giá trị mẫu của nhóm nào. */
  draftContext: MailContextGroup[];
  dirty: boolean;
  canSave: boolean;
  saving: boolean;
  onSaveAndPreview: () => void;
  /** Chỗ trang cấp cho khối này, quyết định bề cao khung thư. */
  pane: PreviewPane;
}) {
  const preview = useMailPreview(code);
  const variables = useMailVariables();
  const [mode, setMode] = React.useState<Mode>('draft');
  const [source, setSource] = React.useState<Source>('sample');
  const [workspaceId, setWorkspaceId] = React.useState('');
  const [accountId, setAccountId] = React.useState('');
  const [values, setValues] = React.useState<Record<string, string>>({});

  /** Biến tự do đang hiện ô nhập: bản nháp đọc theo form, bản đã lưu đọc theo version trên server. */
  const shownCustom = mode === 'draft' ? draftCustomVariables : customVariables;

  const buildContext = React.useCallback((): MailContextInput => {
    const variables: Record<string, string> = {};
    for (const name of customVariables) {
      const v = values[name]?.trim();
      // Bỏ trống thì không gửi key: server tự điền placeholder `[tên]`, khác hẳn lúc tạo chiến dịch.
      if (v) variables[name] = v;
    }
    return {
      workspaceId: source === 'workspace' && workspaceId ? workspaceId : undefined,
      accountId: source === 'account' && accountId.trim() ? accountId.trim() : undefined,
      variables: Object.keys(variables).length > 0 ? variables : undefined,
    };
  }, [accountId, customVariables, source, values, workspaceId]);

  // Chạy lại khi bản phát hành đổi (vừa lưu xong), nhưng giữ nguyên ngữ cảnh người dùng đã chọn:
  // đọc qua ref để hiệu ứng không phụ thuộc từng ký tự gõ trong ô giá trị thử.
  const contextRef = React.useRef(buildContext);
  React.useEffect(() => {
    contextRef.current = buildContext;
  }, [buildContext]);

  const run = preview.mutate;
  React.useEffect(() => {
    run(contextRef.current());
  }, [run, code, currentVersion]);

  /** Giá trị mẫu của đúng những nhóm form đã khai; `declaredGroups` tự cộng `COMMON`. */
  const samples = React.useMemo(() => {
    const groups = declaredGroups(draftContext);
    const map: Record<string, string> = {};
    for (const group of variables.data ?? []) {
      if (!groups.has(group.group)) continue;
      for (const v of group.variables) map[v.name] = v.sample;
    }
    return map;
  }, [variables.data, draftContext]);

  const draftValues = React.useMemo(() => {
    const map: Record<string, string> = { ...samples };
    // Biến tự do bỏ trống rơi về `[tên]` y như server, để bản nháp và bản đã lưu đọc ra giống nhau.
    for (const name of draftCustomVariables) map[name] = values[name]?.trim() || `[${name}]`;
    return map;
  }, [samples, draftCustomVariables, values]);

  const settledHtml = useDebouncedValue(draftHtml, DRAFT_DEBOUNCE_MS);
  const settledSubject = useDebouncedValue(draftSubject, DRAFT_DEBOUNCE_MS);

  const draft = React.useMemo(
    () => ({
      subject: renderDraft(settledSubject, draftValues),
      html: renderDraft(settledHtml, draftValues),
    }),
    [settledSubject, settledHtml, draftValues],
  );

  const unsupported = React.useMemo(
    () => unsupportedPebble(settledSubject, settledHtml),
    [settledSubject, settledHtml],
  );

  /** Đang trong nhịp chờ debounce: khung thư còn là bản của ký tự trước. */
  const settling = mode === 'draft' && (settledHtml !== draftHtml || settledSubject !== draftSubject);
  const shown = mode === 'draft' ? draft : preview.data;
  const savedPending = mode === 'saved' && preview.isPending;
  const savedIdle = mode === 'saved' && !preview.data && !preview.isPending && !preview.error;
  const frame = cn(FRAME_HEIGHT[pane], FRAME_FILL);

  return (
    // Từ `xl` thẻ cao đúng bằng cột đã cấp (`h-full`) và chia dọc: header giữ nguyên cỡ, phần thân ăn
    // hết chỗ còn lại. `overflow-hidden` để góc bo không bị khung thư vuông đè lên.
    <Card padding="sm" className="xl:flex xl:h-full xl:flex-col xl:overflow-hidden">
      <CardHeader className="gap-3 xl:shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle size="md">Xem trước</CardTitle>
          <div className="flex items-center gap-2">
            {settling && <Spinner size="sm" />}
            {mode === 'draft' ? (
              <Badge variant={dirty ? 'warning' : 'muted'} size="sm" mono="plain">
                {dirty ? `bản nháp, chưa lưu` : `trùng v${currentVersion}`}
              </Badge>
            ) : (
              <Badge variant="secondary" size="sm" mono="plain">
                v{currentVersion} đang phát hành
              </Badge>
            )}
          </div>
        </div>

        <SegmentedControl
          size="sm"
          aria-label="Bản để xem trước"
          value={mode}
          onValueChange={(v) => setMode(v as Mode)}
          options={[
            { value: 'draft', label: 'Bản nháp' },
            { value: 'saved', label: `Bản đã lưu v${currentVersion}` },
          ]}
        />

        {mode === 'draft' ? (
          <Text variant="caption" muted>
            Dựng thẳng trong trình duyệt theo nội dung đang gõ, dùng giá trị mẫu của catalog. Cần ngữ
            cảnh thật của một workspace hay tài khoản thì lưu rồi xem bản đã lưu.
          </Text>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2">
              <SegmentedControl
                size="sm"
                aria-label="Nguồn ngữ cảnh xem trước"
                value={source}
                onValueChange={(v) => setSource(v as Source)}
                options={[
                  { value: 'sample', label: 'Dữ liệu mẫu' },
                  { value: 'workspace', label: 'Workspace thật' },
                  { value: 'account', label: 'Tài khoản thật' },
                ]}
              />
              {source === 'workspace' && (
                <div className="flex min-w-52 flex-1 flex-col gap-1">
                  <Label htmlFor="preview-workspace">Lấy ngữ cảnh từ workspace</Label>
                  <WorkspacePicker id="preview-workspace" value={workspaceId} onChange={setWorkspaceId} />
                </div>
              )}
              {source === 'account' && (
                <div className="flex min-w-52 flex-1 flex-col gap-1">
                  <Label htmlFor="preview-account">Lấy ngữ cảnh từ tài khoản</Label>
                  <Input
                    id="preview-account"
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    placeholder="ac8AA109MXP1XRBY"
                    className="font-mono"
                  />
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => preview.mutate(buildContext())}
                disabled={preview.isPending}
              >
                {preview.isPending ? <Spinner size="sm" /> : <RefreshCw className="size-3.5" />}
                Xem lại
              </Button>
            </div>

            {source === 'account' && (
              <Text variant="caption" muted>
                Dán id tài khoản, ở đây chưa có ô tìm theo tên. Để trống cả hai nguồn thì mọi biến
                ACCOUNT và WORKSPACE dùng giá trị mẫu của catalog.
              </Text>
            )}
          </>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3 xl:min-h-0 xl:flex-1 xl:overflow-y-auto">
        {shownCustom.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <Label>Giá trị thử cho biến tự do</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {shownCustom.map((name) => (
                <div key={name} className="flex min-w-0 flex-col gap-1">
                  <Label htmlFor={`preview-var-${name}`} className="font-mono">
                    {name}
                  </Label>
                  <Input
                    id={`preview-var-${name}`}
                    size="sm"
                    value={values[name] ?? ''}
                    onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                    placeholder={`[${name}]`}
                  />
                </div>
              ))}
            </div>
            <Text variant="caption" muted>
              Để trống thì chỗ đó render đúng chuỗi <code className="font-mono">[tên biến]</code>, không
              phải lỗi.{' '}
              {mode === 'draft'
                ? 'Danh sách này là biến tự do của form đang sửa.'
                : `Danh sách này là biến tự do của v${currentVersion}, không phải của form đang sửa.`}
            </Text>
          </div>
        )}

        {mode === 'draft' && unsupported.length > 0 && (
          <Alert variant="warning">
            <AlertDescription className="flex flex-col items-start gap-1">
              <span>
                Bản nháp dựng ở trình duyệt nên {unsupported.length} thẻ Pebble dưới đây chưa chạy, chúng
                đang hiện nguyên văn trong khung thư. Lưu rồi xem bản đã lưu để thấy kết quả thật.
              </span>
              <span className="font-mono text-xs">{unsupported.slice(0, 6).join('  ·  ')}</span>
            </AlertDescription>
          </Alert>
        )}

        {mode === 'saved' && dirty && (
          <Alert variant="warning">
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>
                Bản này là v{currentVersion} trên server, chưa có thay đổi bạn đang gõ. Xem thay đổi ngay
                thì chuyển sang tab Bản nháp, còn muốn đúng bản server thì lưu.
              </span>
              <Button size="sm" onClick={onSaveAndPreview} disabled={!canSave}>
                {saving ? <Spinner size="sm" /> : <Save className="size-4" />}
                Lưu và xem trước
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {mode === 'saved' && preview.error && (
          <Alert variant="destructive">
            <AlertDescription>
              {apiErrorMessage(preview.error, 'Không render được bản xem trước.')}
            </AlertDescription>
          </Alert>
        )}

        {savedPending && <Skeleton className={cn('w-full', frame)} />}

        {savedIdle && (
          <Text variant="caption" muted>
            Chưa có bản render nào, bấm Xem lại để chạy.
          </Text>
        )}

        {shown && !savedPending && (
          // Khung giả lập hộp thư: 600px là bề ngang mọi trình đọc mail đều dựng được. Chuỗi
          // `min-h-0` chạy suốt từ đây xuống khung thư: thiếu một mắt thôi là `min-height: auto`
          // của flex item giữ nguyên chiều cao nội dung và `flex-1` không co lại được.
          <div className="flex min-h-0 flex-col rounded-lg border border-border bg-muted p-3 xl:flex-1">
            <div className="mx-auto flex min-h-0 w-full max-w-150 flex-1 flex-col">
              <div className="flex shrink-0 flex-col gap-0.5 rounded-t-lg border border-border bg-card px-3 py-2">
                <Text variant="caption" muted>
                  Tiêu đề
                </Text>
                <p className="text-sm font-semibold">{shown.subject || '—'}</p>
              </div>
              {/*
                sandbox rỗng: template do admin nhập vẫn là HTML lạ với trang này, không cho chạy gì.
                Vì thế cũng không đọc được chiều cao nội dung bên trong để tự co: dưới `xl` khung chốt
                một cỡ và cho kéo cao thêm. Từ `xl` nó đã cao hết cột nên `resize-none`, tay kéo ở đó
                chỉ tổ phá chiều cao vừa tính ra.
              */}
              <div
                className={cn(
                  'w-full resize-y overflow-auto rounded-b-lg border border-t-0 border-border bg-card xl:resize-none',
                  frame,
                )}
              >
                {/*
                  `key` theo chế độ: đổi tab là đổi hẳn tài liệu, để React dựng iframe mới thay vì
                  thay `srcDoc` trên khung cũ và giữ lại chỗ đang cuộn của bản kia.

                  `h-full`: bề cao nằm ở khung ngoài để tay kéo `resize-y` co giãn đúng khung thư,
                  thay vì chừa một mảng trống dưới một iframe cao cố định.
                */}
                <iframe
                  key={mode}
                  title={mode === 'draft' ? `Xem trước bản nháp ${code}` : `Xem trước ${code}`}
                  sandbox=""
                  srcDoc={shown.html}
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>
        )}

        <Text variant="caption" muted>
          Xem trước không gửi gì và chạy được với mọi loại, kể cả PARTIAL. Chân trang lấy bản hiện hành của
          partial, không ghim theo version của template cha.
        </Text>
      </CardContent>
    </Card>
  );
}
