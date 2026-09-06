'use client';

import * as React from 'react';
import { Braces, ChevronDown, ChevronRight, Lock, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Tooltip } from '@/components/ui/Tooltip';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { VariableCatalogDialog } from '@/components/admin/mail/VariableCatalogDialog';
import { useMailVariables } from '@/hooks/useAdminMail';
import { declaredGroups } from '@/lib/admin/mail';
import { cn } from '@/lib/utils';
import type { MailContextGroup } from '@/types/admin';

/**
 * Biến dùng được của template đang soạn. Nhóm chưa khai vẫn bấm được, nhưng hỏi trước khi chèn:
 * chèn lén một biến ngoài ngữ cảnh chỉ dời lỗi sang lúc lưu (422 "unknown variable").
 *
 * Dải ngang ngay trên ô soạn, không còn là một cột riêng: cột phải cũ ăn một phần ba bề ngang mà
 * khung xem trước mới là thứ cần chỗ đó. Xếp ngang rồi cho xuống dòng nên nó tốn một hai dòng
 * thay vì cả một cột.
 */
export function VariablePanel({
  requiredContext,
  customVariables,
  onInsert,
  onRequestGroup,
  onInsertFooter,
}: {
  requiredContext: MailContextGroup[];
  customVariables: string[];
  onInsert: (name: string) => void;
  /** Người soạn đồng ý khai thêm nhóm ngữ cảnh để dùng biến của nhóm đó. */
  onRequestGroup: (group: MailContextGroup) => void;
  /** Chèn `{% include "footer-vi" %}`: cùng loại thao tác "chèn vào chỗ con trỏ" nên ở cùng dải. */
  onInsertFooter: () => void;
}) {
  const { data, isPending, error, refetch } = useMailVariables();
  const [asking, setAsking] = React.useState<{ group: MailContextGroup; name: string } | null>(null);
  const [catalogOpen, setCatalogOpen] = React.useState(false);
  const stripId = React.useId();

  /*
   * Mở hay gập theo mặc định là chuyện của bề ngang nên để CSS giữ, state chỉ giữ lựa chọn người
   * dùng đã bấm. Hỏi bề ngang bằng `useMediaQuery` thì lần render đầu (server lẫn client) luôn trả
   * false, dải hiện ra gập rồi bung ngay sau hydrate, đẩy ô soạn cùng cả phần dưới trang tụt xuống.
   *
   * Ngưỡng đo bề ngang của chính dải này (`@container`, mở từ 32rem) chứ không của màn hình: cột
   * soạn rộng nhất lúc bố cục còn xếp dọc (~1000px ở 1279) rồi tụt còn ~443px ngay khi hàng chia đôi
   * ở `xl`, nên mọi ngưỡng theo viewport đều bung dải đúng lúc nó vừa hết chỗ.
   */
  const [override, setOverride] = React.useState<boolean | null>(null);
  const stripRef = React.useRef<HTMLDivElement>(null);

  const declared = declaredGroups(requiredContext);
  // Nhóm đã khai bằng đường khác (chip "Ngữ cảnh cần" ở khối Danh tính) thì câu hỏi treo lại không
  // còn nghĩa gì.
  const prompt = asking && !declared.has(asking.group) ? asking : null;

  function toggle() {
    // Chưa bấm lần nào thì trạng thái thật nằm trong CSS: hỏi DOM ngay lúc bấm (không có
    // `offsetParent` là đang `display:none`) để lần bấm đầu lật đúng chiều ở mọi bề ngang.
    setOverride(override === null ? !stripRef.current?.offsetParent : !override);
  }

  function pick(group: MailContextGroup, name: string) {
    if (declared.has(group)) {
      onInsert(name);
      return;
    }
    setAsking({ group, name });
  }

  function confirmGroup() {
    if (!prompt) return;
    onRequestGroup(prompt.group);
    onInsert(prompt.name);
    setAsking(null);
  }

  return (
    <div className="@container flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={override ?? undefined}
          aria-controls={stripId}
          onClick={toggle}
        >
          {/* Chưa bấm lần nào thì chiều mũi tên cũng do bề ngang quyết định, nên nó đi bằng cùng
              một breakpoint với thân dải thay vì một giá trị JS đoán trước. */}
          <ChevronRight className={cn('size-4', override === null ? '@lg:hidden' : override && 'hidden')} />
          <ChevronDown
            className={cn('size-4', override === null ? 'hidden @lg:block' : !override && 'hidden')}
          />
          Biến dùng được
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Text variant="caption" muted>
            Bấm để chèn vào chỗ con trỏ trong thân HTML
          </Text>
          <Button variant="ghost" size="sm" onClick={() => setCatalogOpen(true)}>
            <Braces className="size-3.5" />
            Catalog biến
          </Button>
          <Button variant="outline" size="sm" onClick={onInsertFooter}>
            <Plus className="size-3.5" />
            Chèn chân trang chung
          </Button>
        </div>
      </div>

      <div
        id={stripId}
        ref={stripRef}
        className={cn(
          'flex-col gap-2',
          override === null ? 'hidden @lg:flex' : override ? 'flex' : 'hidden',
        )}
      >
        {isPending && <Skeleton className="h-10 w-full" />}
        {error && <ErrorState error={error} onRetry={() => void refetch()} />}
        {data?.length === 0 && (
          <Text variant="caption" muted>
            Catalog biến đang rỗng, chỉ dùng được biến tự do khai ở khối Danh tính.
          </Text>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {data?.map((group) => {
            const usable = declared.has(group.group);
            return (
              <div key={group.group} className="flex flex-wrap items-center gap-1.5">
                <Badge variant={usable ? 'info' : 'muted'} size="sm" mono>
                  {group.group}
                </Badge>
                {group.group === 'COMMON' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Lock className="size-2.5" />
                    luôn có
                  </span>
                ) : !usable ? (
                  <span className="text-[11px] text-muted-foreground">chưa khai ở template này</span>
                ) : null}
                {group.variables.map((v) => (
                  <VariableChip
                    key={v.name}
                    name={v.name}
                    tip={`${v.description} · ví dụ ${v.sample}`}
                    dimmed={!usable}
                    onPick={() => pick(group.group, v.name)}
                  />
                ))}
              </div>
            );
          })}

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" size="sm" mono>
              Biến tự do
            </Badge>
            {customVariables.length === 0 ? (
              <Text variant="caption" muted>
                Chưa khai biến tự do nào. Tên lạ trong nội dung là 422 lúc lưu.
              </Text>
            ) : (
              <>
                {customVariables.map((name) => (
                  <VariableChip
                    key={name}
                    name={name}
                    tip="Biến tự do của template này, chiến dịch phải gửi giá trị lúc tạo"
                    onPick={() => onInsert(name)}
                  />
                ))}
                <Text variant="caption" muted>
                  Chiến dịch phải cung cấp đủ, thiếu là 422 lúc tạo
                </Text>
              </>
            )}
          </div>
        </div>

        {/* Dải xếp ngang nên câu hỏi không nhét vừa trong nhóm nữa; nó tự nêu tên nhóm ở tiêu đề. */}
        {prompt && (
          <Alert variant="info">
            <AlertTitle>Thêm nhóm {prompt.group} vào ngữ cảnh bắt buộc?</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-2">
              <span>
                <code className="font-mono">{prompt.name}</code> chỉ hợp lệ khi template khai nhóm này,
                không thì lưu trả 422. Khai {prompt.group} cũng ràng chiến dịch phải gửi theo đúng nhóm
                đó.
              </span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={confirmGroup}>
                  Thêm nhóm rồi chèn
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setAsking(null)}>
                  Để sau
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>

      <VariableCatalogDialog open={catalogOpen} onOpenChange={setCatalogOpen} />
    </div>
  );
}

function VariableChip({
  name,
  tip,
  dimmed,
  onPick,
}: {
  name: string;
  /** Mô tả + ví dụ. Đi bằng `Tooltip` chứ không `title`: `title` không hiện với bàn phím lẫn cảm ứng. */
  tip?: string;
  /** Nhóm chưa khai: mờ đi nhưng vẫn bấm được, bấm là hỏi có khai nhóm không. */
  dimmed?: boolean;
  onPick: () => void;
}) {
  return (
    <Tooltip content={tip}>
      <Badge variant={dimmed ? 'muted' : 'secondary'} size="sm" mono="plain" interactive asChild>
        <button type="button" onClick={onPick}>
          {name}
        </button>
      </Badge>
    </Tooltip>
  );
}
