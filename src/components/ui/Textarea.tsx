import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Viền đỏ + quầng đỏ khi trường có lỗi. */
  error?: boolean;
  /** Hiện bộ đếm ký tự ở góc dưới-phải. Nên đi kèm `maxLength`. */
  showCount?: boolean;
  /** Tự giãn chiều cao theo nội dung, không sinh thanh cuộn. `rows` thành sàn chứ không phải trần. */
  autoResize?: boolean;
  /**
   * Chữ mono cho ô nhập dữ liệu máy đọc (id mờ, mã, khóa): một cột chữ đều bề ngang thì mắt bắt
   * được ký tự lệch, còn `l`/`1` và `O`/`0` không lẫn vào nhau lúc dò một id dán sai.
   */
  mono?: boolean;
}

// `useLayoutEffect` cảnh báo khi chạy trên server. Primitive này nằm trong form phía client,
// nhưng vẫn dùng bản isomorphic để một lần render trên server không nhả warning.
const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, error, showCount, autoResize, mono, maxLength, value, defaultValue, onChange, ...props },
    ref,
  ) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
    const [length, setLength] = React.useState(() => {
      if (typeof value === 'string') return value.length;
      if (typeof defaultValue === 'string') return defaultValue.length;
      return 0;
    });

    React.useEffect(() => {
      if (typeof value === 'string') setLength(value.length);
    }, [value]);

    // Ref của `register()` (React Hook Form) hay ref người gọi truyền vào vẫn phải nhận được node,
    // nên gộp với ref nội bộ dùng cho phép đo chiều cao.
    const assignRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      },
      [ref],
    );

    // Hạ về `auto` trước để `scrollHeight` đo lại từ đầu, nếu không ô chỉ giãn ra chứ không co lại
    // khi xóa bớt chữ. Cộng thêm viền vì `box-sizing: border-box`: `scrollHeight` không tính viền,
    // đặt đúng bằng nó sẽ hụt 2px và làm thanh cuộn hiện lại.
    const fitToContent = React.useCallback(() => {
      const el = innerRef.current;
      if (!el) return;
      el.style.height = 'auto';
      const cs = window.getComputedStyle(el);
      const borders = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
      el.style.height = `${el.scrollHeight + borders}px`;
    }, []);

    // Không khai báo dependency: cần chạy sau *mọi* lần render để bắt cả `reset()` của React Hook
    // Form, thứ ghi thẳng giá trị vào DOM chứ không bắn sự kiện `change`.
    useIsomorphicLayoutEffect(() => {
      if (autoResize) fitToContent();
    });

    // Đổi bề ngang thì chữ ngắt dòng khác đi, chiều cao phải đo lại.
    React.useEffect(() => {
      if (!autoResize) return;
      window.addEventListener('resize', fitToContent);
      return () => window.removeEventListener('resize', fitToContent);
    }, [autoResize, fitToContent]);

    const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (event) => {
      setLength(event.target.value.length);
      onChange?.(event);
    };

    const textareaEl = (
      <textarea
        aria-invalid={error || undefined}
        className={cn(
          // `text-base` (16px) trên điện thoại rồi mới về `text-sm` từ `sm:` — cùng ngưỡng với
          // FIELD_FONT: dưới 16px iOS Safari tự phóng to trang khi focus, làm lệch cả layout.
          'flex min-h-20 w-full resize-none rounded-lg border border-input bg-card px-3 py-2.5 text-base text-foreground transition-colors placeholder:text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm sm:placeholder:text-xs',
          error &&
            'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/15',
          mono && 'font-mono tracking-tight',
          // Chừa chỗ cho bộ đếm, nếu không dòng cuối chui xuống dưới nó.
          showCount && 'pb-7',
          // Chiều cao do JS đặt; để `overflow` mặc định thì thanh cuộn kịp nháy một nhịp giữa hai
          // lần đo.
          autoResize && 'overflow-hidden',
          className,
        )}
        ref={assignRef}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        {...props}
      />
    );

    if (!showCount) return textareaEl;

    return (
      <div className="relative w-full">
        {textareaEl}
        <div className="pointer-events-none absolute bottom-2 right-2 rounded px-1 font-mono text-xs text-muted-foreground">
          {length}
          {maxLength ? `/${maxLength}` : null}
        </div>
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
