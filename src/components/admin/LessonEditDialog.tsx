import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '@/utils/apiClient';
import { MaterialsManager } from './MaterialsManager';

interface LessonEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { title: string; description?: string; duration_minutes?: number }) => Promise<void>;
  lesson?: {
    id: number;
    title: string;
    description?: string;
    duration_minutes?: number;
  } | null;
  moduleId: number;
}

export function LessonEditDialog({ open, onClose, onSave, lesson, moduleId }: LessonEditDialogProps) {
  // Основное
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tip, setTip] = useState('');
  // ✅ duration убран - будет автоматически из метаданных видео
  
  // Видео
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  
  // ✅ Progress Bar для единой загрузки
  const [uploadProgress, setUploadProgress] = useState(0); // 0-100%
  const [uploadStatus, setUploadStatus] = useState(''); // Текущий статус
  const [isUploading, setIsUploading] = useState(false); // Флаг загрузки
  
  // Материалы (из MaterialsManager)
  const [materials, setMaterials] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [savedLessonId, setSavedLessonId] = useState<number | null>(null);

  // 🔍 ДИАГНОСТИКА
  useEffect(() => {
    console.log('=======================================');
    console.log('🔥 LessonEditDialog render');
    console.log('🔥 open:', open);
    console.log('🔥 lesson:', lesson);
    console.log('🔥 moduleId:', moduleId);
    console.log('🔥 savedLessonId:', savedLessonId);
    console.log('🔥 Вкладки "Видео" и "Материалы":', savedLessonId ? 'РАЗБЛОКИРОВАНЫ ✅' : 'ЗАБЛОКИРОВАНЫ ❌');
    console.log('=======================================');
  }, [open, lesson, moduleId, savedLessonId]);

  useEffect(() => {
    if (lesson && lesson.id) {
      setTitle(lesson.title);
      setDescription(lesson.description || '');
      setTip((lesson as any).tip || ''); // ✅ Загружаем совет
      // duration удален - загружается автоматически
      setSavedLessonId(lesson.id);
      // ✅ ИСПРАВЛЕНО: загружаем данные только если lesson.id валидный
      if (typeof lesson.id === 'number' && lesson.id > 0) {
        loadLessonData(lesson.id);
      }
    } else {
      setTitle('');
      setDescription('');
      setTip(''); // ✅ Очищаем совет
      // duration удален - загружается автоматически
      setVideoFile(null);
      setVideoUrl('');
      setSavedLessonId(null);
    }
  }, [lesson, open]);

  const loadLessonData = async (lessonId: number) => {
    // ✅ ИСПРАВЛЕНО: проверка на валидный lessonId
    if (!lessonId || typeof lessonId !== 'number' || lessonId <= 0) {
      console.log('⚠️ loadLessonData: невалидный lessonId', lessonId);
      return;
    }
    
    // Загрузить видео
    try {
      const videoRes = await api.get(`/api/videos/lesson/${lessonId}`);
      if (videoRes?.video) {
        setVideoUrl(videoRes.video.video_url);
      }
    } catch (error) {
      console.log('Видео не найдено для урока', lessonId);
    }
    
    // Материалы загружаются через MaterialsManager
  };

  // ✅ ПЕРЕРАБОТАННАЯ ФУНКЦИЯ: Единая загрузка урока с progress bar
  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('❌ Заполните название урока!');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // ========================================
      // РЕЖИМ РЕДАКТИРОВАНИЯ: Обновить существующий урок
      // ========================================
      if (lesson && lesson.id) {
        setUploadStatus('💾 Сохраняем изменения...');
        console.log('💾 Обновляем урок:', lesson.id, { title, description });
        
        await api.put(`/api/lessons/${lesson.id}`, {
          title: title,
          description: description || '',
          tip: tip || '', // ✅ Совет по уроку
        });
        
        setUploadProgress(100);
        setUploadStatus('✅ Изменения сохранены!');
        
        console.log('✅ Урок обновлен');
        
        // Вызываем onSave для обновления родительской страницы
        if (onSave) {
          await onSave({ title, description });
        }
        
        setTimeout(() => {
          setIsUploading(false);
          onClose();
        }, 1000);
        
        return;
      }

      // ========================================
      // РЕЖИМ СОЗДАНИЯ: Создать новый урок
      // ========================================
      setUploadStatus('📝 Создаём урок в базе данных...');

      // ШАГ 1: Создать урок в БД (10%)
      console.log('📝 Создаём урок:', { title, description });
      
      const lessonRes = await api.post('/api/lessons', {
        title: title || 'Новый урок',
        description: description || '',
        tip: tip || '', // ✅ Совет по уроку
        // duration_minutes удален - будет автоматически из метаданных видео
        module_id: moduleId
      });

      // ✅ Исправление: backend может вернуть { lesson: {...} } или { data: { lesson: {...} } }
      console.log('🔍 Backend response:', lessonRes);
      const createdLesson = lessonRes.lesson || lessonRes.data?.lesson || lessonRes;
      const newLessonId = createdLesson.id;

      if (!newLessonId) {
        console.error('❌ Backend не вернул ID урока. Response:', lessonRes);
        throw new Error('Backend не вернул ID урока. Response: ' + JSON.stringify(lessonRes));
      }

      setSavedLessonId(newLessonId);
      setUploadProgress(10);
      console.log('✅ Урок создан с ID:', newLessonId);

      // ========================================
      // ШАГ 2: Загрузить видео (10% → 50%)
      // ========================================
      if (videoFile) {
        setUploadStatus('📹 Загружаем видео на Cloudflare R2...');
        console.log('📹 Загружаем видео:', videoFile.name);
        
        const formData = new FormData();
        formData.append('video', videoFile);

        await api.post(`/api/videos/upload/${newLessonId}`, formData);
        
        setUploadProgress(50);
        console.log('✅ Видео загружено');
      } else {
        setUploadProgress(50);
      }

      // ========================================
      // ШАГ 3: Загрузить материалы (50% → 90%)
      // ========================================
      const materialsToUpload = materials.filter(m => !m.id && m.file);
      if (materialsToUpload.length > 0) {
        const totalMaterials = materialsToUpload.length;

        for (let i = 0; i < totalMaterials; i++) {
          const material = materialsToUpload[i];
          const percent = 50 + Math.floor(((i + 1) / totalMaterials) * 40);
          setUploadProgress(percent);
          setUploadStatus(`📚 Загружаем материал ${i + 1}/${totalMaterials}: ${material.display_name}`);
          
          console.log(`📤 Загружаем материал ${i + 1}/${totalMaterials}:`, material.display_name);

          const formData = new FormData();
          formData.append('file', material.file);
          formData.append('lessonId', newLessonId.toString());
          formData.append('display_name', material.display_name);

          await api.post('/api/materials/upload', formData);
          console.log(`✅ Материал загружен: ${material.display_name}`);
        }

        setUploadProgress(90);
      } else {
        setUploadProgress(90);
      }

      // ========================================
      // ШАГ 4: Финализация (90% → 100%)
      // ========================================
      setUploadStatus('✅ Завершаем создание урока...');
      setUploadProgress(100);
      
      console.log('✅ Урок полностью создан:', newLessonId);

      // Закрыть диалог и обновить список
      setTimeout(() => {
        setIsUploading(false);
        
        // ✅ НЕ вызываем onSave - урок уже создан выше!
        // onSave вызовет handleSaveLesson который создаст ДУБЛИКАТ урока!
        
        // Просто закрыть диалог - список обновится автоматически в onClose
        onClose();
        
        console.log('✅ Диалог закрыт, урок создан с ID:', newLessonId);
      }, 1000);

    } catch (error: any) {
      console.error('❌ Ошибка создания урока:', error);
      setUploadStatus(`❌ Ошибка: ${error.message}`);
      alert(`Ошибка создания урока: ${error.message}`);
      setIsUploading(false);
    }
  };

  // ✅ НОВАЯ ЛОГИКА: Только ВЫБОР файла (НЕ загрузка!)
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('📹 Видео выбрано:', file.name, file.size, 'bytes');
    setVideoFile(file);
  };

  // ✅ НОВАЯ ФУНКЦИЯ: Загрузка видео ПОСЛЕ создания урока (с progress bar)
  const uploadVideoFile = async (lessonId: number) => {
    if (!videoFile) return;
    
    setUploadingVideo(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('video', videoFile);

      console.log('📤 Загружаем видео на Cloudflare R2...');
      console.log('  - Файл:', videoFile.name);
      console.log('  - Размер:', (videoFile.size / 1024 / 1024).toFixed(2), 'MB');
      console.log('  - Lesson ID:', lessonId);
      
      // Симуляция progress (т.к. fetch не поддерживает onUploadProgress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      const res = await api.post(`/api/videos/upload/${lessonId}`, formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      const newVideoUrl = 
        res.data?.video?.video_url ||
        res.video?.video_url ||
        res.data?.url ||
        null;
      
      if (newVideoUrl) {
        setVideoUrl(newVideoUrl);
        console.log('✅ Видео загружено:', newVideoUrl);
      } else {
        throw new Error('Backend не вернул URL видео');
      }
      
    } catch (error: any) {
      console.error('❌ Ошибка загрузки видео:', error);
      throw error;
    } finally {
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  // Материалы теперь управляются через MaterialsManager

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto bg-black border-border/30"
        style={{ zIndex: 10001 }}
      >
        <DialogHeader>
          <DialogTitle className="text-white">
            {lesson ? 'Редактировать урок' : 'Создать урок'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {lesson ? 'Измените данные урока' : 'Заполните информацию о новом уроке'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#1a1a24] border border-gray-800">
            <TabsTrigger value="basic" className="text-white data-[state=active]:bg-[#00ff00] data-[state=active]:text-black">
              Основное
            </TabsTrigger>
            <TabsTrigger 
              value="video"
              className="text-white data-[state=active]:bg-[#00ff00] data-[state=active]:text-black"
            >
              Видео
            </TabsTrigger>
            <TabsTrigger 
              value="materials"
              className="text-white data-[state=active]:bg-[#00ff00] data-[state=active]:text-black"
            >
              Материалы
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Основное */}
          <TabsContent value="basic" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white">Название урока *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Введите название урока"
                className="bg-[#1a1a24] border-gray-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white">Описание</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Введите описание урока"
                rows={4}
                className="bg-[#1a1a24] border-gray-800 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tip" className="text-white">💡 Совет по уроку</Label>
              <Textarea
                id="tip"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                placeholder="Полезный совет или рекомендация для студента (отображается на странице урока)"
                rows={3}
                className="bg-[#1a1a24] border-gray-800 text-white placeholder:text-gray-500"
              />
            </div>

            {/* ✅ Длительность убрана - будет автоматически из метаданных видео */}

            {/* ✅ Progress Bar для единой загрузки */}
            {isUploading && (
              <div className="mt-4 space-y-2 p-4 bg-[#1a1a24] border border-[#00ff00]/30 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white">{uploadStatus}</span>
                  <span className="text-[#00ff00] font-bold">{uploadProgress}%</span>
                </div>
                
                {/* Progress bar */}
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 via-purple-500 to-[#00ff00] h-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                
                {/* Детальный статус */}
                <div className="text-xs text-gray-400 space-y-1 pt-2">
                  {uploadProgress >= 10 && <div className="flex items-center gap-2"><span className="text-[#00ff00]">✅</span> Урок создан в базе данных</div>}
                  {uploadProgress >= 50 && <div className="flex items-center gap-2"><span className="text-[#00ff00]">✅</span> Видео загружено на Cloudflare R2</div>}
                  {uploadProgress >= 90 && <div className="flex items-center gap-2"><span className="text-[#00ff00]">✅</span> Материалы загружены в Supabase Storage</div>}
                  {uploadProgress === 100 && <div className="flex items-center gap-2 text-[#00ff00] font-medium animate-pulse">🎉 Готово! Переходим к уроку...</div>}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={onClose} disabled={isUploading}>
                Отмена
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!title || !title.trim() || isUploading}
                className="bg-[#00ff00] text-black hover:bg-[#00cc00] font-semibold flex-1"
              >
                {isUploading ? (
                  <>⏳ Загрузка {uploadProgress}%...</>
                ) : lesson ? (
                  <>💾 Сохранить изменения</>
                ) : (
                  <>🚀 Создать урок и загрузить все материалы</>
                )}
              </Button>
            </div>
            
            {videoFile && !savedLessonId && (
              <div className="mt-3 p-3 bg-[#00ff00]/10 border border-[#00ff00]/30 rounded-lg">
                <p className="text-sm text-[#00ff00] font-medium">
                  📹 Видео выбрано: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  После нажатия "Создать и загрузить видео" урок будет создан и видео начнет загружаться.
                </p>
              </div>
            )}
            
            {savedLessonId && (
              <div className="mt-3 p-3 bg-[#00ff00]/10 border border-[#00ff00]/30 rounded-lg">
                <p className="text-sm text-[#00ff00] font-medium">
                  ✅ Урок создан! Можете загрузить видео и материалы на соответствующих вкладках.
                </p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Видео */}
          <TabsContent value="video" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Загрузить видео (MP4, MOV, AVI)</Label>
              <div className="border-2 border-dashed border-gray-800 rounded-lg p-8 text-center hover:border-[#00ff00]/50 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  disabled={uploadingVideo}
                  className="hidden"
                  id="video-upload"
                />
                <label htmlFor="video-upload" className="cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-400">
                    {uploadingVideo ? 'Загрузка видео...' : videoFile ? `Выбрано: ${videoFile.name}` : 'Нажмите для выбора видео'}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    {videoFile ? `Размер: ${(videoFile.size / 1024 / 1024).toFixed(2)} MB` : 'Максимальный размер: 3GB'}
                  </p>
                </label>
              </div>

              {uploadingVideo && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Загрузка видео...</span>
                    <span className="text-[#00ff00]">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-[#00ff00] h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {videoUrl && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#00ff00]">✅ Видео загружено</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!confirm('Удалить текущее видео? Вы сможете загрузить новое.')) return;
                        
                        try {
                          console.log('🗑️ Удаление видео для урока:', savedLessonId);
                          
                          if (savedLessonId) {
                            // ✅ Вызываем API для удаления видео из БД и R2
                            await api.delete(`/api/videos/lesson/${savedLessonId}`);
                            console.log('✅ Видео удалено из БД и R2');
                          }
                          
                          // Очистить локальное состояние
                          setVideoUrl('');
                          setVideoFile(null);
                          
                          alert('✅ Видео успешно удалено!');
                        } catch (error: any) {
                          console.error('❌ Ошибка удаления видео:', error);
                          alert(`❌ Ошибка удаления: ${error.message}`);
                        }
                      }}
                      className="text-red-400 hover:text-red-300 border-red-400/30 hover:border-red-400/50"
                    >
                      🗑️ Удалить видео
                    </Button>
                  </div>
                  <video controls className="w-full rounded-lg border border-gray-800">
                    <source src={videoUrl} />
                  </video>
                  <p className="text-xs text-gray-500">
                    💡 Удалите текущее видео, чтобы загрузить новое
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: Материалы */}
          <TabsContent value="materials" className="py-4">
            <MaterialsManager
              lessonId={savedLessonId}
              onLessonCreated={(id) => setSavedLessonId(id)}
              moduleId={moduleId}
              onMaterialsChange={(newMaterials) => setMaterials(newMaterials)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
