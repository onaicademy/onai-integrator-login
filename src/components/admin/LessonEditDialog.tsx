import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
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
  onVideoUploaded?: () => void; // Callback после загрузки видео
}

export function LessonEditDialog({ open, onClose, onSave, lesson, moduleId, onVideoUploaded }: LessonEditDialogProps) {
  // Основное
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tip, setTip] = useState('');
  
  // Видео
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  
  // Progress Bar
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  // Материалы
  const [materials, setMaterials] = useState<any[]>([]);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const materialInputRef = useRef<HTMLInputElement>(null);
  
  const [savedLessonId, setSavedLessonId] = useState<number | null>(null);

  useEffect(() => {
    console.log('🔥 LessonEditDialog открыт:', { open, lesson, moduleId });
    
    if (lesson && lesson.id) {
      setTitle(lesson.title);
      setDescription(lesson.description || '');
      setTip((lesson as any).tip || '');
      setSavedLessonId(lesson.id);
      
      if (typeof lesson.id === 'number' && lesson.id > 0) {
        loadLessonData(lesson.id);
      }
    } else {
      // Режим создания
      setTitle('');
      setDescription('');
      setTip('');
      setVideoFile(null);
      setVideoUrl('');
      setSavedLessonId(null);
      setMaterials([]);
    }
  }, [lesson, open]);

  const loadLessonData = async (lessonId: number) => {
    if (!lessonId || typeof lessonId !== 'number' || lessonId <= 0) {
      console.log('⚠️ loadLessonData: невалидный lessonId', lessonId);
      return;
    }
    
    try {
      // Загрузить видео
      const videoRes = await api.get(`/api/videos/lesson/${lessonId}`);
      if (videoRes?.video?.video_url) {
        setVideoUrl(videoRes.video.video_url);
        console.log('✅ Видео загружено:', videoRes.video.video_url);
      }
    } catch (error) {
      console.log('ℹ️ Видео не найдено для урока:', lessonId);
    }
    
    // Материалы загружаются через MaterialsManager
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('❌ Заполните название урока!');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // РЕЖИМ РЕДАКТИРОВАНИЯ
      if (lesson && lesson.id) {
        setUploadStatus('💾 Сохраняем изменения...');
        setUploadProgress(10);
        
        // Обновить урок
        await api.put(`/api/lessons/${lesson.id}`, {
          title,
          description: description || '',
          tip: tip || '',
        });
        
        setUploadProgress(30);
        console.log('✅ Основные данные урока обновлены');
        
        // Загрузить новое видео, если выбрано
        if (videoFile) {
          setUploadStatus('📹 Загружаем новое видео в Bunny Stream...');
          const durationSeconds = await getVideoDuration(videoFile);
          
          const formData = new FormData();
          formData.append('lessonId', lesson.id.toString());
          formData.append('title', title);
          formData.append('duration_seconds', durationSeconds.toString());
          formData.append('video', videoFile);
          
          // ✅ Используем XMLHttpRequest для прогресс-бара
          await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
              if (e.lengthComputable) {
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                const adjustedPercent = 30 + Math.round(percentComplete * 0.6); // 30-90%
                setUploadProgress(adjustedPercent);
                setUploadStatus(`📹 Загрузка видео... ${percentComplete}%`);
                console.log(`📊 Upload progress: ${percentComplete}%`);
              }
            });

            xhr.addEventListener('load', () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                console.log('✅ Видео загружено в Bunny Stream! Начинается обработка...');
                setUploadProgress(90);
                setUploadStatus('✅ Загружено! Обработка началась...');
                resolve(JSON.parse(xhr.responseText));
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            });

            xhr.addEventListener('error', () => {
              reject(new Error('Network error during video upload'));
            });
            
            xhr.open('POST', 'http://localhost:3000/api/stream/upload');
            xhr.send(formData);
          });
        } else {
          setUploadProgress(60);
        }
        
        setUploadStatus('✅ Изменения сохранены!');
        setUploadProgress(100);
        
        // ✅ Перезагружаем данные урока ПЕРЕД закрытием
        await loadLessonData(lesson.id);
        
        if (onSave) {
          await onSave({ title, description });
        }
        
        // ✅ ЗАКРЫВАЕМ диалог сразу после сохранения
        setIsUploading(false);
        onClose();
        
        return;
      }

      // РЕЖИМ СОЗДАНИЯ
      setUploadStatus('📝 Создаём урок в базе данных...');
      
      const lessonRes = await api.post('/api/lessons', {
        title: title || 'Новый урок',
        description: description || '',
        tip: tip || '',
        module_id: moduleId
      });

      const createdLesson = lessonRes.lesson || lessonRes.data?.lesson || lessonRes;
      const newLessonId = createdLesson.id;

      if (!newLessonId) {
        throw new Error('Backend не вернул ID урока');
      }

      setSavedLessonId(newLessonId);
      setUploadProgress(10);
      console.log('✅ Урок создан с ID:', newLessonId);

      // Загрузить видео
      if (videoFile) {
        setUploadStatus('📹 Загружаем видео в Bunny Stream...');
        const durationSeconds = await getVideoDuration(videoFile);
        
        const formData = new FormData();
        formData.append('lessonId', newLessonId.toString());
        formData.append('title', title);
        formData.append('duration_seconds', durationSeconds.toString());
        formData.append('video', videoFile);

        const uploadResult = await api.post('/api/stream/upload', formData);
        console.log('✅ Видео загружено в Bunny Stream:', uploadResult);
        setUploadProgress(50);
      } else {
        setUploadProgress(50);
      }

      // Загрузить материалы
      const materialsToUpload = materials.filter(m => !m.id && m.file);
      if (materialsToUpload.length > 0) {
        const totalMaterials = materialsToUpload.length;

        for (let i = 0; i < totalMaterials; i++) {
          const material = materialsToUpload[i];
          const percent = 50 + Math.floor(((i + 1) / totalMaterials) * 40);
          setUploadProgress(percent);
          setUploadStatus(`📚 Загружаем материал ${i + 1}/${totalMaterials}: ${material.display_name}`);

          const formData = new FormData();
          formData.append('file', material.file);
          formData.append('lessonId', newLessonId.toString());
          formData.append('display_name', material.display_name);

          await api.post('/api/materials/upload', formData);
        }
      }

      setUploadStatus('✅ Урок создан!');
      setUploadProgress(100);
      
      // ✅ Перезагружаем данные НОВОГО урока
      await loadLessonData(newLessonId);
      
      if (onSave) {
        await onSave({ title, description });
      }

      // ✅ ЗАКРЫВАЕМ диалог сразу после создания
      setIsUploading(false);
      onClose();

    } catch (error: any) {
      console.error('❌ Ошибка:', error);
      setUploadStatus(`❌ Ошибка: ${error.message}`);
      alert(`Ошибка: ${error.message}`);
      setIsUploading(false);
    }
  };

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration);
        resolve(duration);
      };
      
      video.onerror = () => {
        window.URL.revokeObjectURL(video.src);
        resolve(0);
      };
      
      video.src = URL.createObjectURL(file);
    });
  };

  // ✅ ИСПРАВЛЕНО: Только сохраняем файл в state, НЕ загружаем
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🖱️ [TRACER] Video File Selected');
    
    const file = e.target.files?.[0];
    if (!file) {
      console.log('⚠️ [DEBUG] No file selected');
      return;
    }
    
    console.log('📹 Видео выбрано (в памяти):', file.name);
    setVideoFile(file);
    
    // Показываем информацию о выбранном файле
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`📦 Размер: ${sizeMB} MB`);
    console.log(`ℹ️ Видео будет загружено при нажатии "Сохранить изменения"`);
  };

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
            <TabsTrigger value="basic" className="text-white data-[state=active]:bg-[#00FF88] data-[state=active]:text-black">
              Основное
            </TabsTrigger>
            <TabsTrigger 
              value="video"
              className="text-white data-[state=active]:bg-[#00FF88] data-[state=active]:text-black"
            >
              Видео
            </TabsTrigger>
            <TabsTrigger 
              value="materials"
              className="text-white data-[state=active]:bg-[#00FF88] data-[state=active]:text-black"
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

            {/* Progress Bar */}
            {isUploading && (
              <div className="mt-4 space-y-2 p-4 bg-[#1a1a24] border border-[#00FF88]/30 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-white">{uploadStatus}</span>
                  <span className="text-[#00FF88] font-bold">{uploadProgress}%</span>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-[#00FF88] h-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                
                <div className="text-xs text-gray-400 space-y-1 pt-2">
                  {uploadProgress >= 10 && <div className="flex items-center gap-2"><span className="text-[#00FF88]">✅</span> Урок создан в базе данных</div>}
                  {uploadProgress >= 50 && <div className="flex items-center gap-2"><span className="text-[#00FF88]">✅</span> Видео загружено на сервер</div>}
                  {uploadProgress >= 90 && <div className="flex items-center gap-2"><span className="text-[#00FF88]">✅</span> Материалы загружены</div>}
                  {uploadProgress === 100 && <div className="flex items-center gap-2 text-[#00FF88] font-medium animate-pulse">🎉 Готово!</div>}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={onClose} 
                disabled={isUploading}
                className="border-[#00FF88]/30 text-white hover:bg-[#00FF88]/10"
              >
                Отмена
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={!title || !title.trim() || isUploading}
                className="bg-[#00FF88] text-black hover:bg-[#00cc88] font-semibold flex-1"
              >
                {isUploading ? (
                  <>⏳ Загрузка {uploadProgress}%...</>
                ) : lesson ? (
                  <>💾 Сохранить изменения</>
                ) : (
                  <>🚀 Создать урок</>
                )}
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: Видео */}
          <TabsContent value="video" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Загрузить видео (MP4, MOV, AVI)</Label>
              <div 
                onClick={() => videoInputRef.current?.click()}
                className="border-2 border-dashed border-[#00FF88]/30 rounded-lg p-8 text-center hover:border-[#00FF88]/50 transition-colors cursor-pointer"
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  disabled={uploadingVideo}
                  className="hidden"
                  id="video-upload-main"
                />
                <Upload className="h-8 w-8 mx-auto mb-2 text-[#00FF88]" />
                <p className="text-sm text-gray-300">
                  {videoFile ? `Выбрано: ${videoFile.name}` : 'Нажмите для выбора видео'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {videoFile ? `Размер: ${(videoFile.size / 1024 / 1024).toFixed(2)} MB` : 'Максимальный размер: 3GB'}
                </p>
              </div>

              {videoUrl && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#00FF88]">✅ Видео загружено</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!confirm('Удалить текущее видео?')) return;
                        
                        try {
                          if (savedLessonId) {
                            // ✅ Используем новый Bunny Stream DELETE роут
                            await api.delete(`/api/stream/lesson/${savedLessonId}`);
                            console.log('✅ Видео удалено из Bunny Stream и БД');
                          }
                          setVideoUrl('');
                          setVideoFile(null);
                          alert('✅ Видео удалено!');
                          
                          // Перезагружаем данные урока
                          if (savedLessonId) {
                            await loadLessonData(savedLessonId);
                          }
                        } catch (error: any) {
                          console.error('❌ Ошибка удаления видео:', error);
                          alert(`❌ Ошибка: ${error.message}`);
                        }
                      }}
                      className="text-red-400 hover:text-red-300 border-red-400/30 hover:border-red-400/50"
                    >
                      🗑️ Удалить
                    </Button>
                  </div>
                  <video controls className="w-full rounded-lg border border-[#00FF88]/30">
                    <source src={videoUrl} />
                  </video>
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
