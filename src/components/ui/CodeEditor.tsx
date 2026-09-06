'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Trình soạn mã HTML + Pebble: đánh số dòng, tô cú pháp, nhảy tới dòng lỗi. Không phải WYSIWYG và
 * cố tình không dùng thư viện editor nào: nội dung ở đây là template mail vài chục dòng, đổi lại
 * ta giữ được toàn bộ màu bằng token của design system thay vì kéo theo một theme mang màu cứng.
 *
 * Kỹ thuật: một `<pre>` đã tô màu nằm dưới, một `<textarea>` chữ trong suốt nằm trên, hai lớp
 * dùng CHUNG font, cỡ chữ, line-height và padding nên con trỏ luôn rơi đúng chữ. Vì vậy mã
 * **không xuống dòng tự động** (`whitespace-pre` + cuộn ngang): cho wrap thì số dòng ở máng trái
 * lệch khỏi dòng thật ngay khi có một dòng dài.
 */

export type CodeTokenKind =
  | 'text'
  | 'tag'
  | 'attr'
  | 'string'
  | 'comment'
  | 'entity'
  /** `{{ bien }}` */
  | 'expr'
  /** `{% if %}`, `{% include %}` */
  | 'stmt';

export interface CodeToken {
  kind: CodeTokenKind;
  text: string;
}

/**
 * Chỉ đổi MÀU, không đổi `font-weight` hay `font-style`: hai lớp phải khớp từng pixel, mà chữ đậm
 * hoặc nghiêng có thể đổi bề rộng glyph ở một số font mono và làm con trỏ trôi khỏi chữ.
 */
const TOKEN_CLASS: Record<CodeTokenKind, string> = {
  text: '',
  tag: 'text-info-deep',
  attr: 'text-warning-deep',
  string: 'text-success-deep',
  comment: 'text-muted-foreground',
  entity: 'text-primary-600',
  expr: 'rounded-sm bg-primary/10 text-primary-700',
  stmt: 'rounded-sm bg-warning-soft text-warning-deep',
};

const MASTER =
  /(\{#[\s\S]*?#\}|\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|&[a-zA-Z#0-9]+;)/g;

const IN_TAG = /(\{\{[\s\S]*?\}\})|("[^"]*"|'[^']*')|([a-zA-Z_:][\w:.-]*)(?=\s*=)/g;

function push(out: CodeToken[], kind: CodeTokenKind, text: string) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.kind === kind) last.text += text;
  else out.push({ kind, text });
}

/** Trong một thẻ, biến Pebble nằm lọt trong chuỗi nháy kép vẫn phải nổi lên như biến. */
function pushQuoted(out: CodeToken[], quoted: string) {
  let cursor = 0;
  for (const m of quoted.matchAll(/\{\{[\s\S]*?\}\}/g)) {
    push(out, 'string', quoted.slice(cursor, m.index));
    push(out, 'expr', m[0]);
    cursor = m.index + m[0].length;
  }
  push(out, 'string', quoted.slice(cursor));
}

function tokenizeTag(out: CodeToken[], tag: string) {
  let cursor = 0;
  for (const m of tag.matchAll(IN_TAG)) {
    push(out, 'tag', tag.slice(cursor, m.index));
    if (m[1]) push(out, 'expr', m[1]);
    else if (m[2]) pushQuoted(out, m[2]);
    else push(out, 'attr', m[3]);
    cursor = m.index + m[0].length;
  }
  push(out, 'tag', tag.slice(cursor));
}

/** Tách mã thành các đoạn đã phân loại; dùng chung cho ô soạn và khối chỉ đọc. */
export function tokenizeHtml(code: string): CodeToken[] {
  const out: CodeToken[] = [];
  let cursor = 0;
  for (const m of code.matchAll(MASTER)) {
    push(out, 'text', code.slice(cursor, m.index));
    const chunk = m[0];
    if (chunk.startsWith('{#')) push(out, 'comment', chunk);
    else if (chunk.startsWith('{{')) push(out, 'expr', chunk);
    else if (chunk.startsWith('{%')) push(out, 'stmt', chunk);
    else if (chunk.startsWith('<!--')) push(out, 'comment', chunk);
    else if (chunk.startsWith('&')) push(out, 'entity', chunk);
    else tokenizeTag(out, chunk);
    cursor = m.index + chunk.length;
  }
  push(out, 'text', code.slice(cursor));
  return out;
}

function Highlighted({ code }: { code: string }) {
  const tokens = React.useMemo(() => tokenizeHtml(code), [code]);
  return (
    <>
      {tokens.map((t, i) =>
        t.kind === 'text' ? (
          <React.Fragment key={i}>{t.text}</React.Fragment>
        ) : (
          <span key={i} className={TOKEN_CLASS[t.kind]}>
            {t.text}
          </span>
        ),
      )}
      {/* Dòng trắng cuối để con trỏ ở cuối file vẫn có chỗ đứng trong lớp tô màu. */}
      {'\n'}
    </>
  );
}

/** Điều khiển bằng lệnh, dành cho việc chỉ state không làm nổi (xem `scrollToLine`). */
export interface CodeEditorHandle {
  /** Cuộn dòng (1-based) vào tầm nhìn ngay lúc gọi, kể cả khi dòng đó đang được tô sẵn. */
  scrollToLine: (line: number) => void;
}

export interface CodeEditorProps {
  id?: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  /** Số dòng nhìn thấy; chiều cao suy từ đây chứ không đặt cứng từ nơi gọi. */
  rows?: number;
  placeholder?: string;
  error?: boolean;
  /** Theo dõi con trỏ để nơi gọi biết ô này đang được thao tác (chèn biến vào đúng chỗ). */
  onSelect?: React.ReactEventHandler<HTMLTextAreaElement>;
  /** Dòng đang có lỗi (1-based): tô nền cả dòng, đánh dấu ở máng số và cuộn tới. */
  highlightLine?: number;
  /** Ref phụ cho `CodeEditorHandle`; `ref` chính vẫn là chiếc `<textarea>` để nơi gọi đặt con trỏ. */
  handleRef?: React.Ref<CodeEditorHandle>;
  disabled?: boolean;
  'aria-label'?: string;
  'aria-describedby'?: string;
  /** Chỉ để layout (`w-full`, `flex-1`…), không dùng để đổi cỡ hay màu. */
  className?: string;
}

const LINE_HEIGHT = 1.6;
const PAD_Y = '0.5rem';

export const CodeEditor = React.forwardRef<HTMLTextAreaElement, CodeEditorProps>(function CodeEditor(
  {
    id,
    value,
    onChange,
    readOnly,
    rows = 16,
    placeholder,
    error,
    onSelect,
    highlightLine,
    handleRef,
    disabled,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    className,
  },
  ref,
) {
  const areaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const preRef = React.useRef<HTMLPreElement | null>(null);
  const gutterRef = React.useRef<HTMLDivElement | null>(null);

  const assignRef = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      areaRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  const lines = React.useMemo(() => value.split('\n').length, [value]);

  // Cuộn dòng lỗi vào tầm nhìn: người dùng bấm "tới dòng 12" thì phải thấy dòng 12 ngay.
  const scrollToLine = React.useCallback((line: number) => {
    const el = areaRef.current;
    if (!el || !line) return;
    const lineHeightPx = Number.parseFloat(getComputedStyle(el).lineHeight);
    if (!Number.isFinite(lineHeightPx)) return;
    const top = (line - 1) * lineHeightPx;
    if (top < el.scrollTop || top > el.scrollTop + el.clientHeight - lineHeightPx) {
      el.scrollTop = Math.max(0, top - el.clientHeight / 3);
    }
  }, []);

  // Bấm lại đúng nút "Tới dòng 12" không đổi `highlightLine`, nên effect dưới không chạy lần hai và
  // `focus()` cũng vô hiệu (ô đang được focus sẵn). Vì vậy nơi gọi cần cuộn được bằng lệnh.
  React.useImperativeHandle(handleRef, () => ({ scrollToLine }), [scrollToLine]);

  // Lỗi 422 tự tô một dòng khi người dùng chưa bấm gì: dòng đó vẫn phải tự trôi vào tầm nhìn.
  React.useEffect(() => {
    if (highlightLine) scrollToLine(highlightLine);
  }, [highlightLine, scrollToLine]);

  function syncScroll(event: React.UIEvent<HTMLTextAreaElement>) {
    const el = event.currentTarget;
    if (preRef.current) {
      preRef.current.scrollTop = el.scrollTop;
      preRef.current.scrollLeft = el.scrollLeft;
    }
    if (gutterRef.current) gutterRef.current.scrollTop = el.scrollTop;
  }

  const layer = 'm-0 whitespace-pre px-3 font-mono text-[13px] leading-[1.6] tracking-normal';

  return (
    <div
      className={cn(
        'relative flex overflow-hidden rounded-lg border bg-card',
        error ? 'border-destructive ring-2 ring-destructive/15' : 'border-input',
        disabled && 'opacity-50',
        className,
      )}
      style={{ height: `calc(${rows} * ${LINE_HEIGHT} * 13px + 2 * ${PAD_Y})` }}
    >
      <div
        ref={gutterRef}
        aria-hidden
        className="shrink-0 select-none overflow-hidden border-r border-border bg-secondary/40 px-2 font-mono text-[13px] leading-[1.6] text-muted-foreground"
        style={{ paddingTop: PAD_Y, paddingBottom: PAD_Y }}
      >
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              'text-right tabular-nums',
              highlightLine === i + 1 && 'bg-destructive/15 text-destructive-deep',
            )}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div className="relative min-w-0 flex-1">
        {highlightLine !== undefined && highlightLine <= lines && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bg-destructive/10"
            style={{
              top: `calc(${PAD_Y} + ${highlightLine - 1} * ${LINE_HEIGHT} * 13px)`,
              height: `calc(${LINE_HEIGHT} * 13px)`,
            }}
          />
        )}
        <pre
          ref={preRef}
          aria-hidden
          className={cn('pointer-events-none absolute inset-0 overflow-hidden text-foreground', layer)}
          style={{ paddingTop: PAD_Y, paddingBottom: PAD_Y }}
        >
          <Highlighted code={value} />
        </pre>
        <textarea
          id={id}
          ref={assignRef}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onScroll={syncScroll}
          onSelect={onSelect}
          readOnly={readOnly}
          disabled={disabled}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          className={cn(
            'absolute inset-0 h-full w-full resize-none overflow-auto border-0 bg-transparent text-transparent caret-foreground outline-none selection:bg-primary/25 placeholder:text-muted-foreground',
            layer,
          )}
          style={{ paddingTop: PAD_Y, paddingBottom: PAD_Y }}
        />
      </div>
    </div>
  );
});

/** Bản chỉ đọc, dùng cho xem lại nội dung một version cũ. */
export function CodeBlock({ code, className }: { code: string; className?: string }) {
  return (
    <pre
      className={cn(
        'm-0 overflow-auto whitespace-pre rounded-lg border border-border bg-card p-3 font-mono text-[13px] leading-[1.6] text-foreground',
        className,
      )}
    >
      <Highlighted code={code} />
    </pre>
  );
}
