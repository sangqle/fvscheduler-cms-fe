import * as React from 'react';
import { cn, getInitials } from '@/lib/utils';
import { getAvatarColor } from '@/lib/avatar';

const sizeClasses = {
  sm: 'h-8 w-8 text-xs', // 32px
  md: 'h-10 w-10 text-sm', // 40px
  lg: 'h-12 w-12 text-base', // 48px
  xl: 'h-13.5 w-13.5 text-lg', // 54px
} as const;

export type AvatarSize = keyof typeof sizeClasses;

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Full name — used for initials, the hash color, and the image alt text. */
  name: string;
  /** Optional avatar image; falls back to initials when absent. */
  src?: string | null;
  size?: AvatarSize;
  /** Hiện chấm trạng thái góc dưới-phải. */
  status?: 'online';
  /**
   * `dashed` = người **không thuộc** workspace (cộng tác viên thuê ngoài): viền đứt tông `warning`
   * thay vì nền đặc theo hash tên. Chỉ nhìn avatar đã biết đây không phải member, không cần đọc chip.
   */
  variant?: 'solid' | 'dashed';
  /**
   * `square` = ô bo góc thay vì hình tròn — dùng cho **vật**, không phải người (album, workspace,
   * chi nhánh). Tròn là quy ước của "một con người"; để một album cũng tròn thì hàng danh sách trộn
   * người với vật đọc không ra cái nào là cái nào.
   */
  shape?: 'circle' | 'square';
}

/**
 * Initials avatar. Fallback background is a stable hash color from the token
 * palette (see lib/avatar), so each person keeps a consistent on-brand color.
 */
export function Avatar({
  name,
  src,
  size = 'md',
  status,
  variant = 'solid',
  shape = 'circle',
  className,
  ...props
}: AvatarProps) {
  const dashed = variant === 'dashed' && !src;
  const circle = (
    <span
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center overflow-hidden font-semibold',
        shape === 'square' ? 'rounded-lg' : 'rounded-full',
        dashed
          ? // Nền **đục** (`warning-soft`), không phải `bg-warning/15`: `AvatarGroup` và các dải
            // avatar xếp chồng sẽ để lộ avatar nằm dưới xuyên qua một nền trong suốt.
            'border border-dashed border-warning bg-warning-soft text-warning-deep'
          : cn('text-white', src ? 'bg-secondary' : getAvatarColor(name)),
        sizeClasses[size],
        className,
      )}
      {...(status ? {} : props)}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );

  if (!status) return circle;

  return (
    <span className="relative inline-flex" {...props}>
      {circle}
      <span className="absolute bottom-0 right-0 h-3.25 w-3.25 rounded-full border-[2.5px] border-card bg-success" />
    </span>
  );
}

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLSpanElement> {
  names: string[];
  /** Số avatar tối đa trước khi gộp thành "+N". */
  max?: number;
  size?: AvatarSize;
  /**
   * Cho dải xuống dòng khi hết bề ngang thay vì tràn ra ngoài. Mọi avatar (kể cả cái đầu mỗi dòng)
   * đều mang `-ml-2.5`, và khối cha bù lại bằng `pl-2.5`: nhờ vậy cái đầu dòng nào cũng sát mép
   * trái, còn các cái sau vẫn chồng lên nhau đúng 10px. Không có cách CSS nào khác biết được "đây
   * là cái đầu của dòng thứ hai" để chỉ bỏ margin cho riêng nó.
   */
  wrap?: boolean;
}

/**
 * Dải avatar xếp chồng. Thẻ gốc là `<span>` chứ không phải `<div>` (cùng lý do với `Badge`): một
 * dải ê-kíp thường nằm trong `<button>` của hàng danh sách, mà `<button>` chỉ chứa được phrasing
 * content — một `<div>` ở đó làm DOM server và client lệch nhau. `inline-flex` giữ nguyên hình.
 */
export function AvatarGroup({
  names,
  max = 3,
  size = 'sm',
  wrap = false,
  className,
  ...props
}: AvatarGroupProps) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;

  return (
    <span
      className={cn('inline-flex items-center', wrap && 'flex-wrap gap-y-1 pl-2.5', className)}
      {...props}
    >
      {shown.map((name, i) => (
        <Avatar
          key={`${name}-${i}`}
          name={name}
          title={name}
          size={size}
          className={cn('ring-2 ring-card', (wrap || i > 0) && '-ml-2.5')}
        />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            '-ml-2.5 inline-flex items-center justify-center rounded-full bg-secondary font-semibold text-muted-foreground ring-2 ring-card',
            sizeClasses[size],
          )}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
