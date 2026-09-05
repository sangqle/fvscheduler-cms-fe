import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

// ---- Primitive wrappers (shadcn Table pattern) ----

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-11 px-4 text-left align-middle text-xs font-medium uppercase tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('px-4 py-4 align-middle text-foreground', className)} {...props} />
  );
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />;
}

// ---- Generic DataTable ----

export interface ColumnDef<TRow> {
  /** Unique key — used as React key */
  id: string;
  /** Column header label */
  header: React.ReactNode;
  /** Renders the cell for a given row */
  cell: (row: TRow) => React.ReactNode;
  /** Optional extra className on <th> and <td> */
  className?: string;
  /** Loading-row placeholder for this column — defaults to a generic full-width bar when omitted. */
  skeleton?: React.ReactNode;
}

/** Default rows-per-page choices for the built-in pagination footer. */
export const DEFAULT_PAGE_SIZE_OPTIONS = [20, 30, 40, 50];

/** Minimum time the skeleton stays visible once shown, in ms — a query that resolves in a
 * handful of ms swaps skeleton→data so fast it reads as a flicker rather than a load. */
const MIN_SKELETON_MS = 200;

/** Holds the skeleton visible for at least `minMs` after it first appears, even if `isLoading`
 * flips back to `false` sooner. Re-showing (`isLoading` true again before the hold elapses)
 * cancels the pending hide and restarts the hold. */
function useMinSkeletonDuration(isLoading: boolean, minMs = MIN_SKELETON_MS) {
  const [visible, setVisible] = React.useState(isLoading);
  const shownAt = React.useRef<number | null>(isLoading ? Date.now() : null);

  React.useEffect(() => {
    if (isLoading) {
      shownAt.current = Date.now();
      setVisible(true);
      return;
    }
    const elapsed = shownAt.current == null ? minMs : Date.now() - shownAt.current;
    const remaining = Math.max(0, minMs - elapsed);
    if (remaining === 0) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(timer);
  }, [isLoading, minMs]);

  return visible;
}

interface DataTableProps<TRow> {
  columns?: ColumnDef<TRow>[];
  data: TRow[];
  rowKey: (row: TRow) => string | number;
  isLoading?: boolean;
  /** Skeleton row count while loading */
  skeletonRows?: number;
  emptyMessage?: string;
  /** Thay dòng chữ `emptyMessage` bằng một khối tự vẽ (vd `EmptyState` kèm nút hành động). */
  emptyContent?: React.ReactNode;
  className?: string;
  /** When provided, rows become clickable */
  onRowClick?: (row: TRow) => void;
  /** Opt a specific row out of `onRowClick` — no pointer cursor, no hover highlight, no click handler. */
  isRowDisabled?: (row: TRow) => boolean;
  /** Extra className applied per row (both the table `<tr>` and the mobile card wrapper) — e.g. to highlight the row being edited. */
  rowClassName?: (row: TRow) => string | undefined;
  /** Show the built-in client-side pagination footer. */
  paginated?: boolean;
  /** Initial rows per page (default 20). */
  defaultPageSize?: number;
  /** Rows-per-page options shown in the selector (default 20/30/40/50). */
  pageSizeOptions?: number[];
  /** Row key whose detail content is expanded below it (pairs with renderExpanded). */
  expandedKey?: string | number | null;
  /** Renders a full-width detail row beneath the row whose key === expandedKey. */
  renderExpanded?: (row: TRow) => React.ReactNode;
  /**
   * Below the `sm` breakpoint, render each row as a stacked label/value card
   * (label = column header, value = cell) instead of the horizontally-scrolling
   * table. The table is restored from `sm:` up. Opt-in, off by default.
   */
  mobileCards?: boolean;
  /**
   * Thay thẻ mobile mặc định (nhãn/giá trị xếp chồng) bằng một thẻ **tự vẽ**, khi thứ tự đọc trên
   * phone không phải là "từng cột một" mà là một bố cục riêng (tên + số tiền cùng dòng, hành động
   * xuống dưới…). Chỉ có tác dụng cùng `mobileCards`; bảng ở `md+` vẫn dùng `columns` như cũ.
   *
   * Khung ngoài (viền dưới, hiệu ứng vào, `rowClassName`, click hàng, phân trang) vẫn do bảng lo —
   * thẻ chỉ cần lo phần bên trong, **kể cả padding**.
   */
  renderMobileCard?: (row: TRow) => React.ReactNode;
  /** Khung xương của một thẻ `renderMobileCard` khi đang tải — bỏ trống thì rơi về skeleton theo cột. */
  mobileCardSkeleton?: React.ReactNode;
  /**
   * Alternate body renderer. When provided, the table (and `mobileCards`) body is
   * replaced by `renderGrid(pageData)` — e.g. a responsive card grid — while the
   * pagination footer is reused unchanged. `columns` is ignored in this mode. Pair
   * with `paginated` (+ `manualPagination` for server-side paging).
   */
  renderGrid?: (rows: TRow[]) => React.ReactNode;
  /**
   * Server-side (controlled) pagination. When true, the table renders `data` as the
   * current page (no client slicing) and delegates page/size state to the parent via
   * `pageIndex`/`pageCount`/`totalRows` + `onPageChange`/`onPageSizeChange`. Pair with
   * `paginated` to show the footer.
   */
  manualPagination?: boolean;
  /** Controlled current page (0-based) — used when `manualPagination`. */
  pageIndex?: number;
  /** Total page count from the server — used when `manualPagination`. */
  pageCount?: number;
  /** Total row count across all pages, for the range label — used when `manualPagination`. */
  totalRows?: number;
  /** Page-change handler — used when `manualPagination`. */
  onPageChange?: (page: number) => void;
  /** Rows-per-page change handler — used when `manualPagination`. */
  onPageSizeChange?: (size: number) => void;
}

export function DataTable<TRow>({
  columns = [],
  data,
  rowKey,
  isLoading = false,
  skeletonRows = 5,
  emptyMessage = 'Không có dữ liệu',
  emptyContent,
  className,
  onRowClick,
  isRowDisabled,
  rowClassName,
  paginated = false,
  defaultPageSize = 20,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  expandedKey = null,
  renderExpanded,
  mobileCards = false,
  renderMobileCard,
  mobileCardSkeleton,
  renderGrid,
  manualPagination = false,
  pageIndex = 0,
  pageCount = 1,
  totalRows = 0,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<TRow>) {
  const showSkeleton = useMinSkeletonDuration(isLoading);
  const [internalPageSize, setInternalPageSize] = React.useState(defaultPageSize);
  const [internalPage, setInternalPage] = React.useState(0);

  // In manual (server-side) mode the parent owns page/size and `data` is already the
  // current page; otherwise the table slices `data` client-side from its own state.
  const pageSize = manualPagination ? defaultPageSize : internalPageSize;
  const totalPages = manualPagination
    ? Math.max(1, pageCount)
    : Math.max(1, Math.ceil(data.length / pageSize));
  const currentPage = manualPagination ? pageIndex : internalPage;
  const safePage = Math.min(Math.max(currentPage, 0), totalPages - 1);

  // Keep the internal page in range when the data set shrinks (client mode only).
  React.useEffect(() => {
    if (!manualPagination && internalPage > totalPages - 1) setInternalPage(totalPages - 1);
  }, [manualPagination, internalPage, totalPages]);

  const pageData =
    paginated && !manualPagination
      ? data.slice(safePage * pageSize, safePage * pageSize + pageSize)
      : data;
  const totalCount = manualPagination ? totalRows : data.length;
  const rangeStart = totalCount === 0 ? 0 : safePage * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize + pageSize, totalCount);

  function goToPage(next: number) {
    const clamped = Math.min(Math.max(next, 0), totalPages - 1);
    if (manualPagination) onPageChange?.(clamped);
    else setInternalPage(clamped);
  }
  function changePageSize(next: number) {
    if (manualPagination) {
      onPageSizeChange?.(next);
    } else {
      setInternalPageSize(next);
      setInternalPage(0);
    }
  }

  // "Go to page" input — kept in sync with the active page, committed on Enter/blur.
  const [pageInput, setPageInput] = React.useState(String(safePage + 1));
  React.useEffect(() => {
    setPageInput(String(safePage + 1));
  }, [safePage]);

  function commitPageInput() {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(safePage + 1));
      return;
    }
    const clamped = Math.min(Math.max(parsed, 1), totalPages);
    goToPage(clamped - 1);
    setPageInput(String(clamped));
  }

  const tableEl = (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => (
            <TableHead key={col.id} className={col.className}>
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>

      <TableBody>
        {showSkeleton ? (
          Array.from({ length: skeletonRows }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              {columns.map((col) => (
                <TableCell key={col.id} className={col.className}>
                  {col.skeleton ?? <div className="h-4 w-full animate-pulse rounded bg-muted" />}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : data.length === 0 ? (
          <TableRow className="animate-content-in motion-reduce:animate-none hover:bg-transparent">
            <TableCell
              colSpan={columns.length}
              className={emptyContent ? 'p-0' : 'py-16 text-center text-muted-foreground'}
            >
              {emptyContent ?? emptyMessage}
            </TableCell>
          </TableRow>
        ) : (
          pageData.map((row, i) => {
            const key = rowKey(row);
            const isExpanded =
              renderExpanded != null && expandedKey != null && key === expandedKey;
            const clickable = !!onRowClick && !isRowDisabled?.(row);
            return (
              <React.Fragment key={key}>
                <TableRow
                  onClick={clickable ? () => onRowClick!(row) : undefined}
                  className={cn(
                    'animate-content-in motion-reduce:animate-none',
                    clickable && 'cursor-pointer',
                    !clickable && onRowClick && 'hover:bg-transparent',
                    isExpanded && 'border-b-0',
                    rowClassName?.(row),
                  )}
                  style={{ animationDelay: `${Math.min(i, 8) * 20}ms` }}
                >
                  {columns.map((col) => (
                    <TableCell key={col.id} className={col.className}>
                      {col.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
                {isExpanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={columns.length} className="p-0">
                      {renderExpanded!(row)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  // Phone + tablet-portrait view: each row becomes a stacked label/value card inside the same frame.
  const mobileListEl = (
    <div className="flex flex-col md:hidden">
      {showSkeleton ? (
        Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} className="border-b border-border last:border-0">
            {renderMobileCard && mobileCardSkeleton ? (
              mobileCardSkeleton
            ) : (
              <div className="flex flex-col gap-2 p-4">
                {columns.map((col) => (
                  <div key={col.id} className="flex items-start justify-between gap-3">
                    {col.header ? (
                      <span className="shrink-0 pt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {col.header}
                      </span>
                    ) : null}
                    <div className={cn('min-w-0', col.header ? 'flex flex-1 flex-col items-end' : 'flex-1')}>
                      {col.skeleton ?? <div className="h-4 w-full animate-pulse rounded bg-muted" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))
      ) : data.length === 0 ? (
        <div
          className={cn(
            'animate-content-in motion-reduce:animate-none',
            !emptyContent && 'py-16 text-center text-muted-foreground',
          )}
        >
          {emptyContent ?? emptyMessage}
        </div>
      ) : (
        pageData.map((row, i) => {
          const key = rowKey(row);
          const isExpanded =
            renderExpanded != null && expandedKey != null && key === expandedKey;
          const clickable = !!onRowClick && !isRowDisabled?.(row);
          return (
            <div
              key={key}
              className={cn(
                'animate-content-in motion-reduce:animate-none border-b border-border last:border-0',
                rowClassName?.(row),
              )}
              style={{ animationDelay: `${Math.min(i, 8) * 20}ms` }}
            >
              <div
                onClick={clickable ? () => onRowClick!(row) : undefined}
                className={cn(
                  !renderMobileCard && 'flex flex-col gap-2 p-4',
                  clickable && 'cursor-pointer transition-colors hover:bg-muted/50',
                )}
              >
                {renderMobileCard
                  ? renderMobileCard(row)
                  : columns.map((col) => {
                      const content = col.cell(row);
                      if (content == null || content === false || content === '') return null;
                      return (
                        <div key={col.id} className="flex items-start justify-between gap-3">
                          {col.header ? (
                            <span className="shrink-0 pt-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {col.header}
                            </span>
                          ) : null}
                          <div
                            className={cn(
                              'min-w-0 text-sm text-foreground',
                              // With a header, hug the value fully to the right — works for text
                              // and for flex/inline cells (client, service, crew) alike.
                              col.header
                                ? 'flex flex-1 flex-col items-end text-right *:max-w-full'
                                : 'flex-1',
                            )}
                          >
                            {content}
                          </div>
                        </div>
                      );
                    })}
              </div>
              {isExpanded && <div className="px-4 pb-4">{renderExpanded!(row)}</div>}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className={cn(renderGrid ? 'flex flex-col gap-4' : 'rounded-xl border border-border bg-card', className)}>
      {renderGrid ? (
        renderGrid(pageData)
      ) : mobileCards ? (
        <>
          {mobileListEl}
          <div className="hidden md:block">{tableEl}</div>
        </>
      ) : (
        tableEl
      )}

      {paginated && !showSkeleton && totalCount > 0 && (
        <div className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-border', renderGrid ? 'pt-4' : 'px-4 py-3')}>
          {/* Rows per page */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Số dòng mỗi trang</span>
            <Select value={String(pageSize)} onValueChange={(value) => changePageSize(Number(value))}>
              {/* `size="sm"` (32px + 13px) chứ không phải `className="h-8 text-[13px]"`: cỡ ô
                  pager là một quyết định của design system, không phải của cái bảng này. */}
              <SelectTrigger size="sm" className="w-20 px-2.5" aria-label="Số dòng mỗi trang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page navigation */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-sm tabular-nums text-muted-foreground">
              {rangeStart}–{rangeEnd} trên {totalCount}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => goToPage(safePage - 1)}
                disabled={safePage <= 0}
                aria-label="Trang trước"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span>Trang</span>
                <Input
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value.replace(/[^\d]/g, ''))}
                  onBlur={commitPageInput}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitPageInput();
                      e.currentTarget.blur();
                    }
                  }}
                  inputMode="numeric"
                  aria-label="Số trang"
                  className="h-8 w-12 px-1 text-center tabular-nums"
                />
                <span className="whitespace-nowrap">/ {totalPages}</span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => goToPage(safePage + 1)}
                disabled={safePage >= totalPages - 1}
                aria-label="Trang sau"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
