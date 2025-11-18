import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';

interface ModuleEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description?: string }) => Promise<void>;
  module?: {
    id: number;
    title: string;
    description?: string;
  } | null;
  courseId: number;
}

export function ModuleEditDialog({ open, onClose, onSave, module, courseId }: ModuleEditDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔍 ДИАГНОСТИКА
  useEffect(() => {
    console.log('=======================================');
    console.log('🔥 ModuleEditDialog render');
    console.log('🔥 open:', open);
    console.log('🔥 module:', module);
    console.log('🔥 courseId:', courseId);
    console.log('=======================================');
  }, [open, module, courseId]);

  useEffect(() => {
    if (module) {
      setTitle(module.title);
      setDescription(module.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
  }, [module, open]);

  const handleSubmit = async () => {
    console.log('🔥 ModuleEditDialog handleSubmit вызван');
    console.log('🔥 title:', title);
    console.log('🔥 description:', description);
    
    if (!title.trim()) {
      console.log('❌ Название пустое - отмена сохранения');
      return;
    }

    setLoading(true);
    try {
      console.log('📤 Вызываем onSave...');
      await onSave({ title, description });
      console.log('✅ onSave завершён успешно');
      onClose();
    } catch (error) {
      console.error('❌ Ошибка сохранения модуля:', error);
      alert(`Ошибка: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#0a0a0f] border border-[#00ff00]/20 shadow-2xl shadow-[#00ff00]/10 max-w-2xl"
        style={{ zIndex: 10001 }}
      >
        {/* Header with green accent */}
        <DialogHeader className="relative pb-4 border-b border-[#00ff00]/10">
          <div className="absolute -top-2 -right-2 w-20 h-20 bg-[#00ff00]/5 rounded-full blur-2xl" />
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00ff00]/20 to-[#00cc00]/10 border border-[#00ff00]/30 flex items-center justify-center">
              <span className="text-[#00ff00] text-xl">📦</span>
            </div>
            {module ? 'Редактировать модуль' : 'Создать новый модуль'}
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-base ml-[52px]">
            {module ? 'Измените данные модуля и сохраните изменения' : 'Заполните информацию для создания модуля курса'}
          </DialogDescription>
        </DialogHeader>

        {/* Form */}
        <div className="space-y-5 py-6">
          {/* Title Input */}
          <div className="space-y-2.5">
            <Label htmlFor="title" className="text-white font-semibold flex items-center gap-2">
              <span className="text-[#00ff00]">●</span>
              Название модуля
              <span className="text-red-400 text-sm">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Основы автоматизации"
              className="bg-[#18181b] border-gray-800 text-white h-12 text-base focus:border-[#00ff00]/50 focus:ring-1 focus:ring-[#00ff00]/30 transition-all placeholder:text-gray-500"
            />
          </div>

          {/* Description Textarea */}
          <div className="space-y-2.5">
            <Label htmlFor="description" className="text-white font-semibold flex items-center gap-2">
              <span className="text-[#00ff00]/60">○</span>
              Описание модуля
              <span className="text-gray-500 text-sm font-normal">(опционально)</span>
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите содержание модуля, цели обучения и ключевые темы..."
              rows={5}
              className="bg-[#18181b] border-gray-800 text-white text-base focus:border-[#00ff00]/50 focus:ring-1 focus:ring-[#00ff00]/30 transition-all resize-none placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-500 flex items-center gap-1.5">
              <span>💡</span>
              Хорошее описание помогает студентам понять, что они изучат в этом модуле
            </p>
          </div>
        </div>

        {/* Footer with buttons */}
        <DialogFooter className="border-t border-[#00ff00]/10 pt-4 gap-3">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={loading}
            className="border-gray-700 hover:border-gray-600 hover:bg-gray-800/50 text-white px-6"
          >
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !title.trim()}
            className="bg-gradient-to-r from-[#00ff00] to-[#00cc00] text-black hover:from-[#00e66c] hover:to-[#00b84f] font-semibold px-8 shadow-lg shadow-[#00ff00]/20 hover:shadow-[#00ff00]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Сохранение...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                ✓ Сохранить модуль
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

