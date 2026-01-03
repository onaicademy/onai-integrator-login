/**
 * Date Range Picker Component
 * Facebook-style date range selector with presets
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar, X } from 'lucide-react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import 'react-day-picker/dist/style.css';

interface DateRangePickerProps {
  onRangeSelect: (start: string | null, end: string | null) => void;
  currentRange: { start: string | null; end: string | null };
}

const PRESETS = [
  { label: 'Последние 7 дней', days: 7 },
  { label: 'Последние 14 дней', days: 14 },
  { label: 'Последние 30 дней', days: 30 },
  { label: 'Последние 60 дней', days: 60 },
  { label: 'Последние 90 дней', days: 90 },
];

export function DateRangePicker({ onRangeSelect, currentRange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const handlePreset = (days: number) => {
    const end = new Date();
    const start = subDays(end, days - 1);
    onRangeSelect(
      format(start, 'yyyy-MM-dd'),
      format(end, 'yyyy-MM-dd')
    );
    setOpen(false);
  };

  const handleCustomRange = () => {
    if (range?.from && range?.to) {
      onRangeSelect(
        format(range.from, 'yyyy-MM-dd'),
        format(range.to, 'yyyy-MM-dd')
      );
      setOpen(false);
    }
  };

  const handleClear = () => {
    onRangeSelect(null, null);
    setRange(undefined);
    setOpen(false);
  };

  const getRangeLabel = () => {
    if (!currentRange.start || !currentRange.end) return 'Выбрать диапазон';
    return `${format(new Date(currentRange.start), 'd MMM', { locale: ru })} - ${format(new Date(currentRange.end), 'd MMM yyyy', { locale: ru })}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={currentRange.start && currentRange.end ? 'default' : 'outline'}
          size="sm"
          className={
            currentRange.start && currentRange.end
              ? 'bg-[#00FF88] text-black hover:bg-[#00cc88]'
              : 'border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800'
          }
        >
          <Calendar className="w-3 h-3 mr-1" />
          {getRangeLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-black/95 border-[#00FF88]/20" align="end">
        <div className="flex">
          {/* Presets Sidebar */}
          <div className="w-48 border-r border-[#00FF88]/10 p-3 space-y-1">
            <p className="text-xs font-bold text-gray-400 mb-2">Быстрый выбор</p>
            {PRESETS.map((preset) => (
              <button
                key={preset.days}
                onClick={() => handlePreset(preset.days)}
                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#00FF88]/10 rounded transition"
              >
                {preset.label}
              </button>
            ))}
            {currentRange.start && currentRange.end && (
              <button
                onClick={handleClear}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded transition flex items-center gap-2"
              >
                <X className="w-3 h-3" />
                Сбросить
              </button>
            )}
          </div>

          {/* Calendar */}
          <div className="p-3">
            <p className="text-xs font-bold text-gray-400 mb-2">Кастомный диапазон</p>
            <DayPicker
              mode="range"
              selected={range}
              onSelect={setRange}
              numberOfMonths={2}
              locale={ru}
              className="text-white"
              classNames={{
                months: 'flex gap-4',
                month: 'space-y-4',
                caption: 'flex justify-center pt-1 relative items-center text-white',
                caption_label: 'text-sm font-medium',
                nav: 'space-x-1 flex items-center',
                nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                nav_button_previous: 'absolute left-1',
                nav_button_next: 'absolute right-1',
                table: 'w-full border-collapse space-y-1',
                head_row: 'flex',
                head_cell: 'text-gray-500 rounded-md w-9 font-normal text-[0.8rem]',
                row: 'flex w-full mt-2',
                cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-[#00FF88]/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-800 rounded',
                day_selected: 'bg-[#00FF88] text-black hover:bg-[#00FF88] hover:text-black focus:bg-[#00FF88] focus:text-black',
                day_today: 'bg-gray-800 text-white',
                day_outside: 'text-gray-600 opacity-50',
                day_disabled: 'text-gray-600 opacity-50',
                day_range_middle: 'aria-selected:bg-[#00FF88]/20 aria-selected:text-white',
                day_hidden: 'invisible',
              }}
            />
            <div className="mt-3 flex justify-end">
              <Button
                onClick={handleCustomRange}
                disabled={!range?.from || !range?.to}
                size="sm"
                className="bg-[#00FF88] text-black hover:bg-[#00cc88]"
              >
                Применить
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
