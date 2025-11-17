import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileIcon, Trash2 } from 'lucide-react';
import { api } from '@/utils/apiClient';

interface Material {
  id?: string;
  filename: string;
  display_name: string;
  file_url?: string;
  file_size_bytes?: number;
  file?: File;
  uploading?: boolean;
}

interface MaterialsManagerProps {
  lessonId: number | null;
  onLessonCreated?: (lessonId: number) => void;
  moduleId: number;
  onMaterialsChange?: (materials: Material[]) => void;
}

export function MaterialsManager({ lessonId, onLessonCreated, moduleId, onMaterialsChange }: MaterialsManagerProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  
  // ✅ Экспортируем материалы наружу при изменении
  useEffect(() => {
    onMaterialsChange?.(materials);
  }, [materials, onMaterialsChange]);

  // Загрузить существующие материалы
  useEffect(() => {
    if (lessonId) {
      loadMaterials();
    }
  }, [lessonId]);

  const loadMaterials = async () => {
    try {
      const res = await api.get(`/api/materials/${lessonId}`);
      setMaterials(res.materials || []);
    } catch (error) {
      console.error('Ошибка загрузки материалов:', error);
    }
  };

  // Добавить новый материал в очередь
  const handleAddMaterial = (file: File) => {
    const newMaterial: Material = {
      filename: file.name,
      display_name: file.name.replace(/\.[^/.]+$/, ''), // Без расширения
      file,
      uploading: false
    };
    setMaterials([...materials, newMaterial]);
  };

  // Изменить название
  const handleRename = (index: number, newName: string) => {
    const updated = [...materials];
    updated[index].display_name = newName;
    setMaterials(updated);
  };

  // Удалить из очереди
  const handleRemoveFromQueue = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  // Удалить загруженный материал
  const handleDeleteUploaded = async (materialId: string, index: number) => {
    if (!confirm('Удалить материал?')) return;
    
    try {
      await api.delete(`/api/materials/${materialId}`);
      setMaterials(materials.filter((_, i) => i !== index));
      alert('✅ Материал удален');
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('❌ Ошибка удаления');
    }
  };

  // ✅ handleUploadAll удалена - загрузка теперь через LessonEditDialog

  return (
    <div className="space-y-4">
      {/* Drag-n-drop зона */}
      <div className="border-2 border-dashed border-gray-800 rounded-lg p-8 text-center hover:border-[#00ff00]/50 transition-colors bg-[#0a0a0f]">
        <input
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt,.md"
          onChange={(e) => {
            Array.from(e.target.files || []).forEach(handleAddMaterial);
            e.target.value = '';
          }}
          className="hidden"
          id="materials-upload"
        />
        <label htmlFor="materials-upload" className="cursor-pointer">
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-400">
            Нажмите или перетащите файлы
          </p>
          <p className="text-xs text-gray-500 mt-1">
            PDF, DOCX, PPTX, ZIP, TXT, MD (макс 50MB)
          </p>
        </label>
      </div>

      {/* Список материалов */}
      {materials.length > 0 && (
        <Card className="p-4 bg-[#1a1a24] border-gray-800">
          <div className="space-y-3">
            {materials.map((material, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 border border-gray-800 rounded-lg bg-black/40"
              >
                <FileIcon className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                
                <div className="flex-1 space-y-2">
                  {/* Название для отображения */}
                  <div>
                    <Label className="text-xs text-gray-400">Название материала</Label>
                    <Input
                      value={material.display_name}
                      onChange={(e) => handleRename(index, e.target.value)}
                      placeholder="Введите название"
                      disabled={!!material.id}
                      className="bg-[#0a0a0f] border-gray-700 text-white mt-1"
                    />
                  </div>
                  
                  {/* Имя файла */}
                  <p className="text-xs text-gray-500">
                    Файл: {material.filename}
                    {material.file_size_bytes && (
                      <> • {(material.file_size_bytes / 1024 / 1024).toFixed(2)} MB</>
                    )}
                  </p>

                  {/* Статус */}
                  {material.uploading && (
                    <p className="text-xs text-blue-400">⏳ Загрузка...</p>
                  )}
                  {material.id && (
                    <p className="text-xs text-[#00ff00]">✅ Загружено</p>
                  )}
                </div>

                {/* Кнопка удаления */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => 
                    material.id 
                      ? handleDeleteUploaded(material.id, index)
                      : handleRemoveFromQueue(index)
                  }
                  disabled={material.uploading}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* ✅ Кнопка "Загрузить все материалы" удалена - загрузка через кнопку "Создать урок" */}
        </Card>
      )}
    </div>
  );
}

