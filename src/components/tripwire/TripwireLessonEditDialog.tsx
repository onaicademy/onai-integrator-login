import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/utils/apiClient';

interface TripwireLessonEditDialogProps {
  open: boolean;
  onClose: () => void;
  lesson?: {
    id: number;
    title: string;
    description?: string;
    tip?: string;
    duration_minutes?: number;
  } | null;
  moduleId: number;
  onSave?: () => void;
}

export function TripwireLessonEditDialog({ 
  open, 
  onClose, 
  lesson, 
  moduleId,
  onSave 
}: TripwireLessonEditDialogProps) {
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
    console.log('🔥 TripwireLessonEditDialog открыт:', { open, lesson, moduleId });
    
    if (lesson && lesson.id) {
      setTitle(lesson.title);
      setDescription(lesson.description || '');
      setTip(lesson.tip || '');
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
      const videoRes = await api.get(`/api/tripwire/videos/${lessonId}`);  // ✅ FIXED: removed /lesson/
      if (videoRes?.video?.public_url) {
        setVideoUrl(videoRes.video.public_url);
        console.log('✅ Видео загружено:', videoRes.video.public_url);
      }
    } catch (error) {
      console.log('ℹ️ Видео не найдено для урока:', lessonId);
    }
    
    try {
      // Загрузить материалы
      const materialsRes = await api.get(`/api/tripwire/materials/${lessonId}`);
      if (materialsRes?.materials) {
        setMaterials(materialsRes.materials);
        console.log('✅ Материалы загружены:', materialsRes.materials.length);
      }
    } catch (error) {
      console.log('ℹ️ Материалы не найдены для урока:', lessonId);
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
        await api.put(`/api/tripwire/lessons/${lesson.id}`, {
          title,
          description: description || '',
          tip: tip || '',
        });
        
        setUploadProgress(30);
        console.log('✅ Основные данные урока обновлены');
        
        // Загрузить новое видео, если выбрано
        if (videoFile) {
          // 🗑️ УДАЛЯЕМ СТАРОЕ ВИДЕО ИЗ BUNNY (если есть)
          if (videoUrl) {
            setUploadStatus('🗑️ Удаляем старое видео из Bunny...');
            try {
              // Извлечь bunny_video_id из URL (формат: https://video.onai.academy/{videoId}/playlist.m3u8)
              const bunnyVideoId = videoUrl.split('/')[3];
              
              if (bunnyVideoId && bunnyVideoId !== 'playlist.m3u8') {
                console.log(`🗑️ Удаляем старое видео из Bunny: ${bunnyVideoId}`);
                await api.delete(`/api/stream/video/${bunnyVideoId}`);
                console.log('✅ Старое видео удалено из Bunny');
              }
            } catch (error) {
              console.warn('⚠️ Не удалось удалить старое видео из Bunny:', error);
              // Продолжаем даже если удаление не удалось
            }
          }
          
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
                const loadedMB = (e.loaded / (1024 * 1024)).toFixed(1);
                const totalMB = (e.total / (1024 * 1024)).toFixed(1);
                const percentComplete = Math.round((e.loaded / e.total) * 100);
                setUploadProgress(percentComplete);
                setUploadStatus(`📹 Загружено: ${loadedMB} MB / ${totalMB} MB (${percentComplete}%)`);
                console.log(`📊 Upload progress: ${loadedMB} MB / ${totalMB} MB (${percentComplete}%)`);
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
            
            const uploadApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            xhr.open('POST', `${uploadApiUrl}/api/stream/upload`);
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
          onSave();
        }
        
        // ✅ ЗАКРЫВАЕМ диалог сразу после сохранения
        setIsUploading(false);
        onClose();
        
        return;
      }

      // РЕЖИМ СОЗДАНИЯ
      setUploadStatus('📝 Создаём урок в базе данных...');
      
      const lessonRes = await api.post('/api/tripwire/lessons', {
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

          await api.post('/api/tripwire/materials/upload', formData);
        }
      }

      setUploadStatus('✅ Урок создан!');
      setUploadProgress(100);
      
      // ✅ Перезагружаем данные НОВОГО урока
      await loadLessonData(newLessonId);
      
      if (onSave) {
        onSave();
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

  const handleMaterialSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('🖱️ [TRACER] Upload Materials Button Clicked');
    console.log('🔍 [DEBUG] Current savedLessonId:', savedLessonId);
    console.log('🔍 [DEBUG] Current lesson:', lesson);
    
    const files = Array.from(e.target.files || []);
    if (files.length === 0) {
      console.log('⚠️ [DEBUG] No files selected');
      return;
    }
    
    console.log('📄 Файлы выбраны:', files.map(f => f.name));

    // ✅ КРИТИЧЕСКАЯ ПРОВЕРКА: Есть ли lessonId?
    if (!savedLessonId) {
      console.error('🚨 [CRITICAL] Materials upload attempted without lessonId!');
      console.error('🚨 [FIX NEEDED] Lesson:', lesson);
      console.error('🚨 [FIX NEEDED] ModuleId:', moduleId);
      alert('❌ ОШИБКА: ID урока не найден!\n\nСохраните урок сначала (вкладка "Основное" → "Сохранить изменения")');
      return;
    }

    // Если урок уже сохранён, загружаем материалы сразу
    if (savedLessonId) {
      setUploadingMaterial(true);
      
      try {
        for (const file of files) {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('lessonId', savedLessonId.toString());
          formData.append('display_name', file.name);

          await api.post('/api/tripwire/materials/upload', formData);
        }
        
        // ✅ Перезагружаем материалы
        await loadLessonData(savedLessonId);
        alert('✅ Материалы загружены!');
      } catch (error: any) {
        console.error('❌ Ошибка загрузки материалов:', error);
        alert(`❌ Ошибка: ${error.message}`);
      } finally {
        setUploadingMaterial(false);
      }
      
      return;
    }

    // Если урок ещё не сохранён, добавляем в очередь
    const newMaterials = files.map(file => ({
      file,
      display_name: file.name,
      file_size: file.size,
    }));

    setMaterials(prev => [...prev, ...newMaterials]);
    console.log('📚 Материалы добавлены в очередь:', newMaterials.length);
  };

  const removeMaterial = (index: number) => {
    setMaterials(prev => prev.filter((_, i) => i !== index));
  };

  const deleteMaterial = async (materialId: number, index: number) => {
    if (!confirm('Удалить материал?')) return;

    try {
      await api.delete(`/api/tripwire/materials/${materialId}`);
      removeMaterial(index);
      alert('✅ Материал удален');
    } catch (error: any) {
      console.error('❌ Ошибка удаления материала:', error);
      alert(`Ошибка: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0A0A0A] border-[#00FF88]/30"
      >
        <DialogHeader>
          <DialogTitle className="text-white font-bold" style={{ fontFamily: '"Space Grotesk", sans-serif' }}>
            {lesson ? 'Редактировать урок' : 'Создать урок'}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {lesson ? 'Измените данные урока' : 'Заполните информацию о новом уроке'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-[#1a1a24] border border-[#00FF88]/20">
            <TabsTrigger 
              value="basic" 
              className="text-white data-[state=active]:bg-[#00FF88] data-[state=active]:text-black"
            >
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
                className="bg-[#1a1a24] border-[#00FF88]/20 text-white focus:border-[#00FF88] focus:ring-[#00FF88]"
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
                className="bg-[#1a1a24] border-[#00FF88]/20 text-white focus:border-[#00FF88] focus:ring-[#00FF88]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tip" className="text-white">💡 Совет по уроку</Label>
              <Textarea
                id="tip"
                value={tip}
                onChange={(e) => setTip(e.target.value)}
                placeholder="Полезный совет или рекомендация для студента"
                rows={3}
                className="bg-[#1a1a24] border-[#00FF88]/20 text-white placeholder:text-gray-500 focus:border-[#00FF88] focus:ring-[#00FF88]"
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
                  id="video-upload-tripwire"
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
          <TabsContent value="materials" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-white">Загрузить материалы</Label>
              <div 
                onClick={() => materialInputRef.current?.click()}
                className="border-2 border-dashed border-[#00FF88]/30 rounded-lg p-8 text-center hover:border-[#00FF88]/50 transition-colors cursor-pointer"
              >
                <input
                  ref={materialInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.md"
                  onChange={handleMaterialSelect}
                  disabled={uploadingMaterial}
                  className="hidden"
                  id="material-upload-tripwire"
                />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-[#00FF88]" />
                  <p className="text-sm text-gray-300">Нажмите для выбора файлов</p>
                  <p className="text-xs text-gray-500 mt-2">PDF, DOC, PPT, XLS, ZIP, TXT, MD (макс. 50MB)</p>
              </div>

              {materials.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Label className="text-white">Материалы ({materials.length})</Label>
                  {materials.map((material, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-[#1a1a24] border border-[#00FF88]/20 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-[#00FF88]" />
                        <div>
                          <p className="text-sm text-white font-medium">{material.display_name}</p>
                          <p className="text-xs text-gray-500">
                            {((material.file_size_bytes || material.file_size || material.file?.size || 0) / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => material.id ? deleteMaterial(material.id, index) : removeMaterial(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

