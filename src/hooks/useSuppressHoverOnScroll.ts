'use client';

import * as React from 'react';

/** Bao lâu sau lần `scroll` cuối thì tự nhả khoá, nếu con trỏ không hề nhúc nhích. */
const DEFAULT_DELAY = 100;

/**
 * Tắt ripple `:hover` khi cuộn.
 *
 * Con trỏ đứng yên trong khi nội dung trượt bên dưới ⇒ browser vẫn cập nhật `:hover` cho từng
 * phần tử lần lượt đi qua nó. Với một lưới dày như khối "Thời gian chụp" ở bước 2 của wizard tạo
 * lịch hẹn (~25–30 `Button`, mỗi cái có `transition-colors` + đổi nền khi hover), hàng loạt fade
 * 150ms chồng nhau suốt lúc cuộn — nhìn ra là cả vùng nhấp nháy.
 *
 * Hook gắn lớp `is-scrolling` lên phần tử cuộn trong lúc nó đang cuộn; rule
 * `.is-scrolling * { pointer-events: none }` trong `globals.css` cắt hover của **phần tử con**
 * (container vẫn nhận sự kiện, nên bánh xe và thanh cuộn không đổi hành vi).
 *
 * Khoá được nhả ngay khi con trỏ **đổi toạ độ thật**, nên không nuốt click: muốn bấm gì thì phải
 * rê chuột tới, mà rê chuột là nhả. Không dùng `pointermove` trần được — sau mỗi lần cuộn Chrome
 * bắn một `pointermove` tổng hợp (giữ nguyên `clientX`/`clientY`) chỉ để cập nhật `:hover`, nhả
 * theo sự kiện đó thì hook thành vô dụng. Timeout `delay` là lưới an toàn cho trường hợp cuộn
 * bằng bàn phím / kéo thanh cuộn, khi chẳng có `pointermove` nào tới cả.
 *
 * Trả về một **callback ref**, không nhận `RefObject` để tự đọc: vùng cuộn trong dialog nằm dưới
 * Radix `Presence`, tức nó bị gỡ khỏi DOM mỗi lần đóng và dựng lại node MỚI mỗi lần mở, trong khi
 * component bọc vẫn mounted suốt. Một `useEffect` đọc `ref.current` sẽ thấy `null` ở lần mount đầu
 * (dialog mở sau đó) và ôm node cũ đã detach ở những lần mở tiếp theo. Callback ref thì chạy đúng
 * mỗi lần node vào/ra DOM.
 *
 * @param externalRef Ref của caller, nếu nơi gọi còn cần chính node đó cho việc khác (vd.
 *   `bodyRef.current.scrollTo()`); hook ghi node vào đây luôn nên không phải hợp nhất ref thủ công.
 */
export function useSuppressHoverOnScroll<T extends HTMLElement>(
  externalRef?: React.RefObject<T | null>,
  delay: number = DEFAULT_DELAY,
): React.RefCallback<T> {
  // Đọc qua ref để `delay` đổi không làm callback ref đổi danh tính (đổi là React gỡ/gắn lại node).
  const delayRef = React.useRef(delay);
  delayRef.current = delay;
  const detachRef = React.useRef<(() => void) | null>(null);

  return React.useCallback(
    (node: T | null) => {
      detachRef.current?.();
      detachRef.current = null;

      if (externalRef) {
        (externalRef as React.MutableRefObject<T | null>).current = node;
      }
      if (!node) return;
      // Không có hover thật thì không có ripple để chặn. Bỏ qua luôn trên thiết bị cảm ứng —
      // ở đó cuộn CHÍNH LÀ một chuỗi `pointermove`, nếu vẫn chạy thì class bị gắn/gỡ mỗi frame
      // và cái style-recalc đó mới là thứ gây giật.
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

      let timer: ReturnType<typeof setTimeout> | undefined;
      // Toạ độ con trỏ lần cuối — để phân biệt pointermove thật với pointermove tổng hợp sau cuộn.
      let lastX = Number.NaN;
      let lastY = Number.NaN;
      // Máy lai (laptop có màn cảm ứng) vẫn khớp media query trên; theo dõi loại con trỏ đang dùng
      // để một cú vuốt bằng ngón tay không kích hoạt khoá. Tự đảo lại khi người dùng quay về chuột.
      let suppressible = true;

      const release = () => {
        clearTimeout(timer);
        node.classList.remove('is-scrolling');
      };
      const handleScroll = () => {
        if (!suppressible) return;
        node.classList.add('is-scrolling');
        clearTimeout(timer);
        timer = setTimeout(release, delayRef.current);
      };
      const handlePointerMove = (e: PointerEvent) => {
        suppressible = e.pointerType === 'mouse';
        if (!suppressible) {
          release();
          return;
        }
        if (e.clientX === lastX && e.clientY === lastY) return;
        lastX = e.clientX;
        lastY = e.clientY;
        release();
      };

      node.addEventListener('scroll', handleScroll, { passive: true });
      node.addEventListener('pointermove', handlePointerMove, { passive: true });
      // Không `return` hàm dọn dẹp: React 19 coi đó là cleanup ref và sẽ thôi gọi lại ref với
      // `null`. Giữ nó trong `detachRef` để cả React 18 lẫn 19 đều dọn đúng một lần.
      detachRef.current = () => {
        node.removeEventListener('scroll', handleScroll);
        node.removeEventListener('pointermove', handlePointerMove);
        clearTimeout(timer);
        node.classList.remove('is-scrolling');
      };
    },
    [externalRef],
  );
}
