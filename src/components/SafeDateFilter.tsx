/**
 * Safe Date Filter Component - ULTRA SIMPLE VERSION
 * 🎯 ARCHITECT APPROVED: NO Radix UI, NO Dialog, NO Popover
 * 
 * Только чистый HTML + Tailwind для исключения Invariant failed
 */

import { useState } from 'react';
import { Calendar, Settings, X } from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';

interface DateRange {
  from: Date;
  to: Date;
}

interface SafeDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

type PresetKey = 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom';

export function SafeDateFilter({ value, onChange }: SafeDateFilterProps) {
  console.log('📅 SafeDateFilter: Render started', { value });
  
  const [activePreset, setActivePreset] = useState<PresetKey>('month');
  const [showCustomInputs, setShowCustomInputs] = useState(false);
  const [customFrom, setCustomFrom] = useState(format(value.from, 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(value.to, 'yyyy-MM-dd'));
  
  console.log('📅 SafeDateFilter State:', { activePreset, showCustomInputs, customFrom, customTo });

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
    setShowCustomInputs(false); // Закрываем кастомные инпуты
  };

  const handleCustomClick = () => {
    setShowCustomInputs(!showCustomInputs);
    setActivePreset('custom');
  };

  const handleCustomApply = () => {
    const fromDate = new Date(customFrom);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(customTo);
    toDate.setHours(23, 59, 59, 999);

    onChange({ from: fromDate, to: toDate });
    setShowCustomInputs(false);
  };

  return (
    <div className="relative">
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

        {/* Custom Button */}
        <button
          onClick={handleCustomClick}
          className={`
            px-3 py-1.5 rounded-lg text-xs font-['JetBrains_Mono'] transition-all
            flex items-center gap-2 border
            ${
              activePreset === 'custom'
                ? 'bg-[#00FF94] text-black border-[#00FF94]'
                : 'bg-white/5 border-white/10 hover:border-[#00FF94]/50 text-white'
            }
          `}
        >
          <Settings className="w-4 h-4" />
          Кастом
        </button>

        {/* Current Range Display */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
          <Calendar className="w-3.5 h-3.5 text-[#00FF94]" />
          <span className="text-xs font-['JetBrains_Mono'] text-white">
            {format(value.from, 'dd MMM', { locale: ru })} -{' '}
            {format(value.to, 'dd MMM yyyy', { locale: ru })}
          </span>
        </div>
      </div>

      {/* Custom Date Inputs (Conditional Render - NO DIALOG!) */}
      {showCustomInputs && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[400px]
                        bg-[#0A0A0A] border border-white/20 rounded-xl p-6
                        shadow-[0_0_40px_rgba(0,255,148,0.2)]">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-['Space_Grotesk'] text-white font-bold">
              Выберите диапазон дат
            </h3>
            <button
              onClick={() => setShowCustomInputs(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Date Inputs */}
          <div className="space-y-4">
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

          {/* Actions */}
          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => setShowCustomInputs(false)}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg
                         text-white font-['JetBrains_Mono'] text-sm
                         hover:bg-white/10 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleCustomApply}
              className="flex-1 px-4 py-2 bg-[#00FF94] rounded-lg
                         text-black font-['JetBrains_Mono'] text-sm font-bold
                         hover:bg-[#00FF94]/80 transition-colors
                         shadow-[0_0_20px_rgba(0,255,148,0.3)]"
            >
              Применить
            </button>
          </div>
        </div>
      )}

      {/* Backdrop for closing custom inputs */}
      {showCustomInputs && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowCustomInputs(false)}
        />
      )}
    </div>
  );
}
