'use client';

import * as React from 'react';
import { Copy, Eraser, ScanSearch } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable, type ColumnDef } from '@/components/ui/DataTable';
import { Spinner } from '@/components/ui/Spinner';
import { Text } from '@/components/ui/Text';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/ToastProvider';
import { Field } from '@/components/admin/shared/Field';
import { ErrorState } from '@/components/admin/shared/QueryState';
import { RawId } from '@/components/admin/shared/RawId';
import { useDecodeIds } from '@/hooks/useAdminIds';
import { MAX_DECODE_IDS, parseDecodeIds } from '@/lib/admin/ids';
import type { AdminDecodedId } from '@/types/admin';

/**
 * `POST /api/admin/ids/decode`: dán id mờ khách hàng gửi tới, nhận lại khóa số để chạy SQL.
 *
 * Ba điều của endpoint quyết định màn này:
 * 1. **Id không nằm trên URL.** Không `?ids=`, không query key mang id: chuỗi mờ là thứ duy nhất
 *    chặn giữa một URL bị lộ và một khóa đọc được, nên nó chỉ đi trong body.
 * 2. **Id sai không làm hỏng cả lô.** Vẫn `200`, dòng đó mang `error`, nên bảng trộn chung dòng
 *    ra số với dòng báo lỗi thay vì bắt dán lại từ đầu.
 * 3. **Không có kiểm tra tồn tại.** Ra số không có nghĩa là bản ghi còn sống; câu trả lời cuối
 *    cùng vẫn là truy vấn SQL của người vận hành.
 */
export function DecodeIdsCard() {
  const { showToast } = useToast();
  const decode = useDecodeIds();
  const [raw, setRaw] = React.useState('');

  const ids = React.useMemo(() => parseDecodeIds(raw), [raw]);
  const tooMany = ids.length > MAX_DECODE_IDS;
  const results = decode.data ?? [];
  const decoded = results.filter((r) => r.rawId != null);
  const failed = results.length - decoded.length;
  // Sau lần bấm đầu tiên thì khối kết quả ở lại: đang tải là khung xương, lỗi tải là `ErrorState`.
  const showResults = decode.isPending || decode.isSuccess || decode.isError;

  async function copy(text: string, title: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast({ title, variant: 'success', duration: 2000 });
    } catch {
      showToast({ title: 'Không chép được, hãy bôi đen để chép tay', variant: 'warning' });
    }
  }

  function submit() {
    if (!ids.length || tooMany || decode.isPending) return;
    decode.mutate({ ids });
  }

  function reset() {
    setRaw('');
    decode.reset();
  }

  const columns: ColumnDef<AdminDecodedId>[] = [
    {
      id: 'id',
      header: 'Id mờ',
      className: 'min-w-[16vw]',
      cell: (r) => <span className="break-all font-mono text-xs">{r.id}</span>,
    },
    {
      id: 'type',
      header: 'Loại',
      className: 'min-w-[10vw]',
      cell: (r) =>
        r.type ? (
          <Badge variant="outline" mono size="sm">
            {r.type}
          </Badge>
        ) : (
          // Backend cố tình trả cùng một câu cho mọi kiểu sai: nói rõ sai ở đâu là chấm bài giúp
          // người đang dò id giả.
          <Text variant="caption" className="text-destructive">
            {r.error ?? 'Không giải mã được'}
          </Text>
        ),
    },
    {
      id: 'rawId',
      header: 'rawId',
      className: 'w-40',
      cell: (r) =>
        r.rawId == null ? (
          <RawId value={null} />
        ) : (
          <span className="flex items-center gap-1">
            <RawId value={r.rawId} />
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Chép rawId ${r.rawId}`}
              title="Chép rawId"
              onClick={() => void copy(String(r.rawId), 'Đã chép rawId')}
            >
              <Copy className="size-3.5" />
            </Button>
          </span>
        ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Giải mã id mờ</CardTitle>
        <CardDescription>
          Đổi id mờ khách gửi tới (wk…, bk…, ac…) thành khóa số. Endpoint không kiểm tra
          bản ghi có tồn tại hay không: id của một bản ghi đã xóa vẫn ra số.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Field
          id="decode-ids"
          label="Danh sách id"
          hint={`Ngăn nhau bằng xuống dòng, dấu phẩy hoặc khoảng trắng, id trùng chỉ tính một lần. Tối đa ${MAX_DECODE_IDS} id mỗi lượt, Ctrl/⌘ + Enter để chạy.`}
          error={tooMany ? `Tối đa ${MAX_DECODE_IDS} id mỗi lượt, đang có ${ids.length}. Bỏ bớt rồi chạy làm nhiều lượt.` : undefined}
        >
          <Textarea
            id="decode-ids"
            mono
            rows={6}
            error={tooMany}
            placeholder={'wkNN0TC1ZMG8NMMP\nmbC07EE23QZA81YB\nac0NM0TGYDZX4MA0'}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                submit();
              }
            }}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={submit} disabled={!ids.length || tooMany || decode.isPending}>
            {decode.isPending ? <Spinner size="sm" /> : <ScanSearch className="size-4" />}
            Giải mã
          </Button>
          {(raw || showResults) && (
            <Button variant="ghost" onClick={reset} disabled={decode.isPending}>
              <Eraser className="size-4" />
              Xóa
            </Button>
          )}
          <Text variant="caption" muted>
            {ids.length ? `${ids.length} id đang chờ` : 'Chưa có id nào'}
          </Text>
        </div>

        {showResults && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Text variant="caption" muted>
                {decode.isPending
                  ? 'Đang giải mã…'
                  : `${results.length} id · ${decoded.length} ra khóa số${failed ? ` · ${failed} không hợp lệ` : ''}`}
              </Text>
              {decoded.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  // Dạng dán thẳng vào `WHERE id IN (…)`, thứ người vận hành làm ngay sau đó.
                  onClick={() => void copy(decoded.map((r) => r.rawId).join(', '), `Đã chép ${decoded.length} rawId`)}
                >
                  <Copy className="size-4" />
                  Chép {decoded.length} rawId
                </Button>
              )}
            </div>
            {decode.isError ? (
              <ErrorState error={decode.error} onRetry={submit} />
            ) : (
              <DataTable
                columns={columns}
                data={results}
                // Dòng kết quả không mang định danh nào ngoài chính chuỗi đã gửi lên, và
                // `parseDecodeIds` đã bỏ trùng nên chuỗi đó là duy nhất trong một lượt.
                rowKey={(r) => r.id}
                isLoading={decode.isPending}
                skeletonRows={Math.min(ids.length || 3, 8)}
                emptyMessage="Chưa giải mã id nào"
                mobileCards
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
