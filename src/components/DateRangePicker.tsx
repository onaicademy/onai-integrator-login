/**
 * DateRangePicker Component
 * Facebook Ads Manager стиль: Пресеты + Кастомный диапазон
 */

import { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>(value);

  const presets = [
    {
      label: 'Сегодня',
      getValue: () => ({
        from: new Date(),
        to: new Date(),
      }),
    },
    {
      label: 'Последние 7 дней',
      getValue: () => ({
        from: subDays(new Date(), 6),
        to: new Date(),
      }),
    },
    {
      label: 'Последние 30 дней',
      getValue: () => ({
        from: subDays(new Date(), 29),
        to: new Date(),
      }),
    },
    {
      label: 'Этот месяц',
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    onChange(range);
    setTempRange(range);
    setIsOpen(false);
  };

  const handleApply = () => {
    onChange(tempRange);
    setIsOpen(false);
  };

  const handleReset = () => {
    const defaultRange = {
      from: startOfMonth(new Date()),
      to: new Date(),
    };
    onChange(defaultRange);
    setTempRange(defaultRange);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-['JetBrains_Mono'] bg-white/5 hover:bg-white/10 
                     border-white/20 hover:border-[#00FF94]/50 text-white transition-all"
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-[#00FF94]" />
          {format(value.from, 'dd MMM', { locale: ru })} -{' '}
          {format(value.to, 'dd MMM yyyy', { locale: ru })}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0 bg-[#0A0A0A] border-white/20"
        align="end"
      >
        <div className="flex">
          {/* Пресеты (как в FB Ads) */}
          <div className="border-r border-white/10 p-3 space-y-1">
            <div className="text-xs font-['Space_Grotesk'] text-gray-400 uppercase tracking-wider mb-2">
              Быстрый выбор
            </div>
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handlePresetClick(preset)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-['JetBrains_Mono']
                           text-white hover:bg-white/10 transition-colors"
              >
                {preset.label}
              </button>
            ))}
            <div className="pt-2 border-t border-white/10 mt-2">
              <button
                onClick={handleReset}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-['JetBrains_Mono']
                           text-[#00FF94] hover:bg-[#00FF94]/10 transition-colors flex items-center gap-2"
              >
                <X className="w-3 h-3" />
                Сбросить
              </button>
            </div>
          </div>

          {/* Календарь */}
          <div className="p-3">
            <Calendar
              mode="range"
              selected={{
                from: tempRange.from,
                to: tempRange.to,
              }}
              onSelect={(range) => {
                if (range?.from) {
                  setTempRange({
                    from: range.from,
                    to: range.to || range.from, // Fallback to from if to is undefined
                  });
                }
              }}
              numberOfMonths={2}
              className="rounded-md"
            />
            <div className="flex items-center justify-between pt-3 border-t border-white/10 mt-3">
              <div className="text-xs font-['JetBrains_Mono'] text-gray-400">
                {format(tempRange.from, 'dd MMM yyyy', { locale: ru })} -{' '}
                {format(tempRange.to, 'dd MMM yyyy', { locale: ru })}
              </div>
              <Button
                onClick={handleApply}
                size="sm"
                className="bg-[#00FF94] hover:bg-[#00FF94]/80 text-black font-['JetBrains_Mono']"
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

