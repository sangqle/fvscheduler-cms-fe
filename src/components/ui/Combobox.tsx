'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { LoadMoreSentinel } from '@/components/ui/LoadMoreSentinel';
import { useAutoLoadMore } from '@/hooks/useAutoLoadMore';
import { cn } from '@/lib/utils';
import {
  FIELD_HEIGHT,
  FIELD_MIN_HEIGHT,
  FIELD_FONT,
  TRIGGER_FONT,
  type FieldSize,
} from '@/components/ui/field-size';

export interface ComboboxOption {
  value: number | string;
  label: string;
  description?: string;
  /**
   * Chuỗi chỉ để TÌM, không hiển thị — cho lựa chọn cần khớp cả từ khóa kỹ thuật (khóa quyền
   * `finance:delete`…) mà không in khóa đó ra dòng mô tả.
   */
  keywords?: string;
}

interface ComboboxProps {
  /** Đặt lên nút mở — để một `<Label htmlFor>` bên ngoài trỏ được vào trường này. */
  id?: string;
  /**
   * Tên cho trình đọc màn hình khi trường **không có `<Label>` nhìn thấy được** — thanh lọc là ca
   * điển hình (cả hàng chỉ có giá trị đang chọn, không có nhãn nào). Không khai báo prop này thì
   * `aria-label` truyền vào bị rơi im lặng: JSX không kiểm kiểu thuộc tính có gạch nối, nên
   * TypeScript vẫn cho qua trong khi component không hề nhận.
   */
  'aria-label'?: string;
  options: ComboboxOption[];
  value: number | string | null | undefined;
  onChange: (value: number | string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  size?: FieldSize;
  /**
   * Cho phép **gõ giá trị mới** thay vì chỉ chọn trong danh sách: chuỗi tìm kiếm không trùng nhãn
   * option nào sẽ hiện thêm một dòng "Thêm «…»" (và Enter cũng nhận), `onChange` trả về đúng chuỗi
   * đã gõ. Danh sách option lúc này đóng vai **gợi ý**, không phải tập giá trị đóng.
   *
   * Chỉ dùng khi giá trị **chính là** nhãn (vd. tên vai trò tự do) — với option đánh khoá bằng id
   * thì một giá trị tự do sẽ không map ngược lại được nhãn nào.
   */
  allowCustom?: boolean;
  /** Nhãn của dòng thêm giá trị mới. Mặc định: `Thêm "<chuỗi đang gõ>"`. */
  customLabel?: (query: string) => string;
  /**
   * Giới hạn ký tự của ô tìm kiếm. Chỉ có nghĩa khi `allowCustom` — chặn ngay tại chỗ gõ để một giá
   * trị tự do không vượt giới hạn của backend rồi mới bị 400.
   */
  maxLength?: number;
  /**
   * Nguồn `options` là dữ liệu phân trang (`useInfiniteQuery`): cuộn tới cuối danh sách sẽ tự nạp
   * trang kế. Vì tìm kiếm lọc phía client, khi đang gõ mà còn trang chưa tải, component sẽ tự rút
   * hết các trang còn lại để kết quả tìm không bỏ sót option chưa nạp.
   */
  loadMore?: {
    hasNextPage: boolean | undefined;
    isFetchingNextPage: boolean;
    fetchNextPage: () => void;
  };
}

export function Combobox({
  id,
  'aria-label': ariaLabel,
  options,
  value,
  onChange,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  emptyText = 'Không có kết quả',
  className,
  disabled,
  size = 'md',
  allowCustom,
  customLabel = (q) => `Thêm “${q}”`,
  maxLength,
  loadMore,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const listRef = React.useRef<HTMLDivElement | null>(null);
  const hasNextPage = loadMore?.hasNextPage;
  const isFetchingNextPage = loadMore?.isFetchingNextPage ?? false;
  const fetchNextPage = loadMore?.fetchNextPage;
  const sentinelRef = useAutoLoadMore({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage: fetchNextPage ?? (() => {}),
    // Đệm tính theo list của dropdown (max-h-60), không phải viewport.
    root: listRef,
    rootMargin: '96px',
  });

  // Đang gõ tìm mà còn trang chưa tải → rút hết các trang còn lại (mỗi lần một trang,
  // effect tự chạy lại khi trang mới về) để bộ lọc client không bỏ sót option.
  const draining = !!search.trim() && !!hasNextPage;
  React.useEffect(() => {
    if (open && draining && !isFetchingNextPage) fetchNextPage?.();
  }, [open, draining, isFetchingNextPage, fetchNextPage]);

  const matched = options.find((o) => o.value === value);
  // Ở chế độ `allowCustom` giá trị chính là nhãn, nên một giá trị tự gõ (không có trong options)
  // vẫn hiện được nguyên văn trên trigger thay vì rơi về placeholder.
  const selectedLabel =
    matched?.label ?? (allowCustom && typeof value === 'string' && value.trim() ? value : null);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.description?.toLowerCase().includes(q) ||
        o.keywords?.toLowerCase().includes(q),
    );
  }, [options, search]);

  // Chỉ mời "Thêm" khi chuỗi đang gõ chưa trùng nhãn nào — trùng thì chọn option có sẵn là đủ.
  const customQuery = search.trim();
  const showCustom =
    !!allowCustom &&
    customQuery.length > 0 &&
    !options.some((o) => o.label.toLowerCase() === customQuery.toLowerCase());

  function handleSelect(opt: ComboboxOption) {
    onChange(opt.value);
    setOpen(false);
    setSearch('');
  }

  function handleCustom() {
    onChange(customQuery);
    setOpen(false);
    setSearch('');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          size={size}
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
            {selectedLabel ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-0"
        align="start"
        sideOffset={4}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-border px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            className={cn(
              'flex w-full bg-transparent py-2 placeholder:text-muted-foreground focus:outline-none',
              FIELD_HEIGHT[size],
              FIELD_FONT[size],
            )}
            placeholder={searchPlaceholder}
            value={search}
            maxLength={maxLength}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && showCustom) {
                e.preventDefault();
                handleCustom();
              }
            }}
          />
        </div>

        {/* Options list */}
        <div ref={listRef} className="max-h-60 overflow-y-auto p-1">
          {showCustom && (
            <button
              type="button"
              onClick={handleCustom}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left font-medium text-primary transition-colors hover:bg-accent',
                FIELD_MIN_HEIGHT[size],
                // Dòng option là `<button>` — TRIGGER_FONT, không phải sàn 16px của ô gõ ở trên.
                TRIGGER_FONT[size],
              )}
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">{customLabel(customQuery)}</span>
            </button>
          )}
          {filtered.length === 0 ? (
            showCustom || draining ? null : (
              <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
            )
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground',
                  FIELD_MIN_HEIGHT[size],
                  TRIGGER_FONT[size],
                  opt.value === value && 'bg-accent text-accent-foreground',
                )}
              >
                <Check
                  className={cn(
                    'h-4 w-4 shrink-0',
                    opt.value === value ? 'opacity-100' : 'opacity-0',
                  )}
                />
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{opt.label}</span>
                  {opt.description && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {opt.description}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
          {hasNextPage && <LoadMoreSentinel ref={sentinelRef} isFetching={isFetchingNextPage} />}
        </div>
      </PopoverContent>
    </Popover>
  );
}
