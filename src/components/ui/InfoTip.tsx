'use client';

import * as React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip, type TooltipProps } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';

/**
 * Dấu chấm hỏi nhỏ đứng cạnh một nhãn/chỉ số, hover (hoặc focus) ra tooltip giải thích **con số
 * này từ đâu ra** — trục thời gian nào, cộng những gì, và vì sao nó không so trực tiếp được với
 * con số đứng cạnh. Sinh ra cho trang Tài chính, nơi ba chỉ số cùng đơn vị tiền nhưng đo trên ba
 * trục khác nhau; dùng được cho mọi KPI cần chú thích nguồn gốc.
 *
 * Là một `<button>` thật để bàn phím focus được (Radix mở tooltip khi focus). Vì vậy **đừng đặt
 * nó bên trong một phần tử bấm được khác** (button lồng button là HTML sai) — với hàng vừa bấm
 * được vừa cần giải thích, để phần giải thích ở sublabel.
 */
export interface InfoTipProps {
  /** Nội dung giải thích. Falsy → không render gì. */
  content: React.ReactNode;
  side?: TooltipProps['side'];
  className?: string;
  /** Nhãn cho screen reader; mặc định đủ dùng cho mọi chỉ số. */
  label?: string;
}

export function InfoTip({ content, side, className, label = 'Giải thích chỉ số' }: InfoTipProps) {
  if (!content) return null;
  return (
    <Tooltip
      side={side}
      content={<span className="block max-w-[280px] font-normal leading-relaxed">{content}</span>}
    >
      <button
        type="button"
        aria-label={label}
        className={cn(
          // -my-0.5 để icon không nống chiều cao hàng nhãn nó đứng cạnh.
          '-my-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/55 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        <HelpCircle className="h-3.5 w-3.5" />
      </button>
    </Tooltip>
  );
}
