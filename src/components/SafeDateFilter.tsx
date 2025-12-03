/**
 * Safe Date Filter Component
 * 🎯 ARCHITECT APPROVED: No react-day-picker, only safe presets + native inputs
 * 
 * Избегаем проблем с Calendar/Popover/Invariant failed
 */

import { useState } from 'react';
import { Calendar, Settings } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface DateRange {
  from: Date;
  to: Date;
}

interface SafeDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type PresetKey = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export function SafeDateFilter({ value, onChange }: SafeDateFilterProps) {
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey>('month');
  const [customFrom, setCustomFrom] = useState(format(value.from, 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(value.to, 'yyyy-MM-dd'));

  const presets = [
    {
      key: 'today' as PresetKey,
      label: 'Сегодня',
      getValue: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        return { from: today, to: endOfDay };
      },
    },
    {
      key: 'yesterday' as PresetKey,
      label: 'Вчера',
      getValue: () => {
        const yesterday = subDays(new Date(), 1);
        yesterday.setHours(0, 0, 0, 0);
        const endOfYesterday = subDays(new Date(), 1);
        endOfYesterday.setHours(23, 59, 59, 999);
        return { from: yesterday, to: endOfYesterday };
      },
    },
    {
      key: 'week' as PresetKey,
      label: 'Эта неделя',
      getValue: () => ({
        from: startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday
        to: endOfWeek(new Date(), { weekStartsOn: 1 }),
      }),
    },
    {
      key: 'month' as PresetKey,
      label: 'Этот месяц',
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      key: 'all' as PresetKey,
      label: 'Весь период',
      getValue: () => ({
        from: new Date(2024, 0, 1), // 1 января 2024
        to: new Date(),
      }),
    },
  ];

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    onChange(range);
    setActivePreset(preset.key);
  };

  const handleCustomApply = () => {
    const fromDate = new Date(customFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(customTo);
    toDate.setHours(23, 59, 59, 999);

    onChange({ from: fromDate, to: toDate });
    setActivePreset('all'); // Reset active preset
    setIsCustomDialogOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Preset Pills */}
      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
        {presets.map((preset) => (
          <button
            key={preset.key}
            onClick={() => handlePresetClick(preset)}
            className={`
              px-3 py-1.5 rounded-md text-xs font-['JetBrains_Mono'] transition-all
              ${
                activePreset === preset.key
                  ? 'bg-[#00FF94] text-black shadow-[0_0_10px_rgba(0,255,148,0.3)]'
                  : 'text-white hover:bg-white/10'
              }
            `}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Range Dialog */}
      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/5 border-white/10 hover:border-[#00FF94]/50 text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            <span className="font-['JetBrains_Mono'] text-xs">Кастом</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-[#0A0A0A] border-white/20">
          <DialogHeader>
            <DialogTitle className="font-['Space_Grotesk'] text-white">
              Выберите диапазон дат
            </DialogTitle>
            <DialogDescription className="font-['JetBrains_Mono'] text-gray-400">
              Используйте нативные инпуты для выбора дат
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* From Date */}
            <div className="space-y-2">
              <label className="text-sm font-['Space_Grotesk'] text-white">
                С какого числа:
              </label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                           text-white font-['JetBrains_Mono'] text-sm
                           focus:border-[#00FF94] focus:outline-none transition-colors"
              />
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label className="text-sm font-['Space_Grotesk'] text-white">
                По какое число:
              </label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                min={customFrom}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                           text-white font-['JetBrains_Mono'] text-sm
                           focus:border-[#00FF94] focus:outline-none transition-colors"
              />
            </div>

            {/* Preview */}
            <div className="pt-4 border-t border-white/10">
              <p className="text-xs text-gray-400 font-['JetBrains_Mono']">
                Выбранный период:{' '}
                <span className="text-[#00FF94]">
                  {format(new Date(customFrom), 'dd MMM yyyy', { locale: ru })} -{' '}
                  {format(new Date(customTo), 'dd MMM yyyy', { locale: ru })}
                </span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCustomDialogOpen(false)}
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              Отмена
            </Button>
            <Button
              onClick={handleCustomApply}
              className="bg-[#00FF94] hover:bg-[#00FF94]/80 text-black font-['JetBrains_Mono']"
            >
              Применить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Current Range Display */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
        <Calendar className="w-3.5 h-3.5 text-[#00FF94]" />
        <span className="text-xs font-['JetBrains_Mono'] text-white">
          {format(value.from, 'dd MMM', { locale: ru })} -{' '}
          {format(value.to, 'dd MMM yyyy', { locale: ru })}
        </span>
      </div>
    </div>
  );
}

