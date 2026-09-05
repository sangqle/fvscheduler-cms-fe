'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { DateRange, Matcher } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/Calendar';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

const DATE_FMT = 'dd/MM/yyyy';

function buildDisabled(min?: Date, max?: Date): Matcher[] {
  const matchers: Matcher[] = [];
  if (min) matchers.push({ before: min });
  if (max) matchers.push({ after: max });
  return matchers;
}

export interface DatePickerProps {
  value?: Date;
  onChange: (date?: Date) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: Date;
  max?: Date;
  error?: boolean;
  /** date-fns pattern for the trigger label. Defaults to `dd/MM/yyyy`; pass e.g. `EEEE, dd/MM/yyyy`
   * to show the weekday (add `capitalize` via `className` since the vi locale lowercases it). */
  formatStr?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Chọn ngày',
  disabled,
  min,
  max,
  error,
  formatStr = DATE_FMT,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={error || undefined}
          className={cn(
            'w-full justify-start font-normal',
            !value && 'text-muted-foreground',
            error && 'border-destructive',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          {value ? format(value, formatStr, { locale: vi }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
          weekStartsOn={1}
          defaultMonth={value}
          disabled={buildDisabled(min, max)}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

export interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range?: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  min?: Date;
  max?: Date;
  error?: boolean;
  className?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Chọn khoảng ngày',
  disabled,
  min,
  max,
  error,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const isMobile = useIsMobile();

  const label = value?.from
    ? value.to
      ? `${format(value.from, DATE_FMT, { locale: vi })} – ${format(value.to, DATE_FMT, { locale: vi })}`
      : format(value.from, DATE_FMT, { locale: vi })
    : null;

  const selectToday = () => {
    const today = new Date();
    onChange({ from: today, to: today });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-invalid={error || undefined}
          className={cn(
            'w-full justify-start font-normal',
            !label && 'text-muted-foreground',
            error && 'border-destructive',
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          {label ?? placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] overflow-x-auto p-0">
        <Calendar
          mode="range"
          selected={value}
          onSelect={onChange}
          weekStartsOn={1}
          defaultMonth={value?.from}
          disabled={buildDisabled(min, max)}
          numberOfMonths={isMobile ? 1 : 2}
          autoFocus
        />
        <div className="border-t border-border p-2">
          <Button type="button" variant="ghost" size="sm" onClick={selectToday}>
            Hôm nay
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
