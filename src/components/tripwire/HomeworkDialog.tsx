import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/utils/apiClient';
import { CheckCircle2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HomeworkDialogProps {
  open: boolean;
  onClose: () => void;
  lessonId: string;
  userId: string; // UUID из users таблицы
  onSubmitSuccess?: () => void;
}

export function HomeworkDialog({ 
  open, 
  onClose, 
  lessonId, 
  userId,
  onSubmitSuccess 
}: HomeworkDialogProps) {
  const [homeworkText, setHomeworkText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [existingHomework, setExistingHomework] = useState<any>(null);
  const { toast } = useToast();

  // Загрузить существующее ДЗ при открытии
  useEffect(() => {
    if (open && userId && lessonId) {
      loadExistingHomework();
    }
  }, [open, userId, lessonId]);

  const loadExistingHomework = async () => {
    try {
      const response = await api.get(`/api/tripwire/homework/${lessonId}?user_id=${userId}`);
      if (response?.homework) {
        setExistingHomework(response.homework);
        setHomeworkText(response.homework.homework_text || '');
      } else {
        setExistingHomework(null);
        setHomeworkText('');
      }
    } catch (error) {
      console.error('Ошибка загрузки ДЗ:', error);
    }
  };

  const handleSubmit = async () => {
    if (!homeworkText.trim()) {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, введите текст домашнего задания',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post(`/api/tripwire/homework/${lessonId}`, {
        user_id: userId,
        homework_text: homeworkText.trim(),
      });

      if (response?.success) {
        setIsSuccess(true);
        
        // Показываем success screen на 3 секунды
        setTimeout(() => {
          setIsSuccess(false);
          setHomeworkText('');
          onClose();
          onSubmitSuccess?.();
        }, 3000);
      }
    } catch (error: any) {
      console.error('Ошибка отправки ДЗ:', error);
      toast({
        title: 'Ошибка отправки',
        description: error.message || 'Не удалось отправить домашнее задание',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !isSuccess) {
      setHomeworkText('');
      setIsSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl bg-[#0a0a0f] border border-[#00FF88]/20 text-white p-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            // ✅ SUCCESS SCREEN
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center p-8 sm:p-12 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#00FF88]/20 flex items-center justify-center mb-6"
              >
                <CheckCircle2 className="w-12 h-12 sm:w-14 sm:h-14 text-[#00FF88]" />
              </motion.div>
              
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl sm:text-3xl font-bold text-[#00FF88] mb-4"
              >
                Домашнее задание принято!
              </motion.h3>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-gray-300 text-base sm:text-lg mb-2"
              >
                Спасибо, что приняли участие в модуле.
              </motion.p>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-[#00FF88] text-sm sm:text-base font-medium"
              >
                Можете нажать кнопку "Завершить урок"
              </motion.p>
            </motion.div>
          ) : (
            // 📝 FORM SCREEN
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader className="px-6 py-4 border-b border-[#00FF88]/20 bg-[#0a0a0f]">
                <DialogTitle className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#00FF88]/10 flex items-center justify-center">
                    <Send className="w-5 h-5 text-[#00FF88]" />
                  </div>
                  {existingHomework ? 'Редактировать домашнее задание' : 'Сдать домашнее задание'}
                </DialogTitle>
              </DialogHeader>

              <div className="px-6 py-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Ваш ответ
                  </label>
                  <Textarea
                    value={homeworkText}
                    onChange={(e) => setHomeworkText(e.target.value)}
                    placeholder="Опишите выполненную работу, приложите ссылки на результаты..."
                    className="min-h-[200px] bg-black/40 border-[#00FF88]/20 text-white placeholder:text-gray-500 focus:border-[#00FF88]/50 focus:ring-[#00FF88]/20"
                    disabled={isSubmitting}
                  />
                </div>

                {existingHomework && (
                  <div className="text-xs text-gray-400">
                    Последнее обновление: {new Date(existingHomework.updated_at).toLocaleString('ru-RU')}
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-[#00FF88]/20 flex gap-3">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1 border-gray-700 hover:bg-gray-800 text-gray-300 hover:text-white"
                  disabled={isSubmitting}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-[#00FF88] hover:bg-[#00cc88] text-black font-semibold"
                  disabled={isSubmitting || !homeworkText.trim()}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-pulse">Отправка...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {existingHomework ? 'Обновить' : 'Отправить'}
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
