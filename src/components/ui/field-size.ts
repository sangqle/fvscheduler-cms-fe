export type FieldSize = 'sm' | 'md' | 'lg';

// ĐỔI CHIỀU CAO THÌ DÙNG `size`, ĐỪNG NHÉT `h-*` VÀO `className` — 32/36/44px, **một cỡ ở mọi bề
// ngang**. Cần 44px thì `size="lg"`, không phải `className="h-11"`.
//
// Trước đây mỗi bậc là một *cặp* phone-first (`md` = `h-10 sm:h-9`) để phone có vùng chạm to hơn.
// Cặp đó đã bỏ: hộp to lên trên phone trong khi padding/gap giữ nguyên làm cả màn đọc ra thô, mà
// vùng chạm 36px vẫn nằm trong tầm ngón tay. Bỏ luôn được cái bẫy đi kèm — `tailwind-merge` coi
// `h-11` và `sm:h-9` là hai key khác nhau nên một override `className="h-11"` chỉ ăn ở phone rồi
// tụt về 36px từ 640px trở lên. Giờ không còn bậc `sm:` nào cho chiều cao nên override *có* ăn —
// nhưng vẫn dùng `size`: một `className="h-11"` lạc giữa feature là một cỡ không ai đổi được từ
// design system.
//
// ⚠️ Bẫy đó VẪN CÒN với chữ: `FIELD_FONT` là cặp `text-base sm:text-sm` (xem dưới). Một
// `className="text-sm"` trần trên `Input` chỉ đè nửa phone, và kéo iOS auto-zoom quay lại.
export const FIELD_HEIGHT: Record<FieldSize, string> = {
  sm: 'h-8',
  md: 'h-9',
  lg: 'h-11',
};

export const FIELD_MIN_HEIGHT: Record<FieldSize, string> = {
  sm: 'min-h-8',
  md: 'min-h-9',
  lg: 'min-h-11',
};

// Floors at 16px (`text-base`) on phone — iOS Safari auto-zooms on focus for any
// text input/select with a computed font-size below that. Đây là **bậc `sm:` duy nhất còn lại**
// trong file này, và nó tồn tại vì một hạn chế của trình duyệt, không phải vì thẩm mỹ.
//
// CHỈ dùng cho control gõ được thật: `<input>`, `<textarea>`, `<select>` (Input, CurrencyInput,
// Textarea, SelectNative). Thứ khác thì dùng TRIGGER_FONT — xem lý do ở dưới.
export const FIELD_FONT: Record<FieldSize, string> = {
  sm: 'text-base sm:text-[13px]',
  md: 'text-base sm:text-sm',
  lg: 'text-base sm:text-[15px]',
};

// Chữ cho control **không** gõ được: trigger của Radix `Select`, dòng option của `Combobox`, nút mở
// picker — chúng là `<button>`, iOS Safari không bao giờ auto-zoom trên `<button>` nên sàn 16px của
// FIELD_FONT không có lý do tồn tại ở đây; nó chỉ làm phone trông thô (13px → 16px là +23%) và làm
// `size` mất nghĩa về typography (sm/md/lg cùng tụt về 16px).
//
// Một cỡ ở mọi bề ngang, khớp đúng thang chữ của `Button`, nên một `Select` và một `Combobox`
// (trigger của nó vốn là `Button`) đứng cạnh nhau trong cùng form không lệch cỡ chữ trên phone.
// Vùng chạm vẫn do FIELD_HEIGHT lo — cao lên trên phone là đúng, chữ to lên thì không.
export const TRIGGER_FONT: Record<FieldSize, string> = {
  sm: 'text-[13px]',
  md: 'text-sm',
  lg: 'text-[15px]',
};

export const FIELD_RADIUS: Record<FieldSize, string> = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-lg',
};

export const FIELD_PADDING_X: Record<FieldSize, string> = {
  sm: 'px-3',
  md: 'px-3',
  lg: 'px-4',
};

// Đệm cho addon dính mép ô nhập (`https://`, `.chonanh.vn`, `@`, `₫`). Chỉ đệm phía mép ngoài,
// phía giáp chữ người dùng gõ để 0 — nhãn phải nằm sát nội dung như một tiền tố thật, chứ không
// trôi ra xa thành một ô riêng. Khoảng thở phía trong do `px-1` của `<input>` lo.
export const FIELD_ADDON_PADDING: Record<FieldSize, { leading: string; trailing: string }> = {
  sm: { leading: 'pl-2.5', trailing: 'pr-2.5' },
  md: { leading: 'pl-3', trailing: 'pr-3' },
  lg: { leading: 'pl-4', trailing: 'pr-4' },
};

export const FIELD_SIZE_CLASSES: Record<FieldSize, string> = {
  sm: `${FIELD_HEIGHT.sm} ${FIELD_RADIUS.sm} ${FIELD_PADDING_X.sm} ${FIELD_FONT.sm}`,
  md: `${FIELD_HEIGHT.md} ${FIELD_RADIUS.md} ${FIELD_PADDING_X.md} ${FIELD_FONT.md}`,
  lg: `${FIELD_HEIGHT.lg} ${FIELD_RADIUS.lg} ${FIELD_PADDING_X.lg} ${FIELD_FONT.lg}`,
};

/** Như {@link FIELD_SIZE_CLASSES} nhưng dùng {@link TRIGGER_FONT} — cho trigger `<button>`. */
export const TRIGGER_SIZE_CLASSES: Record<FieldSize, string> = {
  sm: `${FIELD_HEIGHT.sm} ${FIELD_RADIUS.sm} ${FIELD_PADDING_X.sm} ${TRIGGER_FONT.sm}`,
  md: `${FIELD_HEIGHT.md} ${FIELD_RADIUS.md} ${FIELD_PADDING_X.md} ${TRIGGER_FONT.md}`,
  lg: `${FIELD_HEIGHT.lg} ${FIELD_RADIUS.lg} ${FIELD_PADDING_X.lg} ${TRIGGER_FONT.lg}`,
};
