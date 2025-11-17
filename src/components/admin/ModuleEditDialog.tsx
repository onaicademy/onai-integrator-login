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
    if (!title.trim()) return;

    setLoading(true);
    try {
      await onSave({ title, description });
      onClose();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="bg-black border-border/30"
        style={{ zIndex: 10001 }}
      >
        <DialogHeader>
          <DialogTitle className="text-white">
            {module ? 'Редактировать модуль' : 'Создать модуль'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {module ? 'Измените данные модуля' : 'Заполните информацию о новом модуле'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white">Название модуля *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название модуля"
              className="bg-[#1a1a24] border-gray-800 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Введите описание модуля"
              rows={4}
              className="bg-[#1a1a24] border-gray-800 text-white"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !title.trim()}
            className="bg-neon text-black hover:bg-neon/90"
          >
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

